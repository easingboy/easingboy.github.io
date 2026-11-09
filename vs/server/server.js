/**
 * 生物战争（三路自动塔防）联机对战 - WebSocket 服务器
 *
 * 与五子棋服务器不同：本游戏是【实时制】——单位会自己前进、战斗，由引擎 tick 驱动。
 * 如果像五子棋那样只转发"部署指令"让双方浏览器各跑一份，两边的帧率/网络延迟不同，
 * 单位位置与战斗结果会迅速发散。因此这里采用【服务器权威模拟】：
 *   - 服务器加载同一份游戏引擎（从 web/vs/index.html 里提取 vs-engine 脚本），跑唯一的对局；
 *   - 客户端只做两件事：把玩家的部署意图发给服务器、渲染服务器广播回来的状态快照。
 * 这样双方看到的棋盘必然一致，服务器也不用重写任何规则代码。
 *
 * 部署约定与站内其它联机服务（gobang-ws / fillcup-ws）保持一致：
 * 监听 127.0.0.1、路径 /vs-ws/、ALLOWED_ORIGINS 校验来源、提供 /health 健康检查。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { WebSocketServer } = require('ws');

// ---- 加载游戏引擎（与浏览器、测试脚本用的是同一份规则代码）----
const htmlPath = path.resolve(__dirname, '../index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const engineMatch = html.match(/<script id="vs-engine">([\s\S]*?)<\/script>/);
if (!engineMatch) throw new Error('未能从 web/vs/index.html 提取 vs-engine 脚本');
const engineContext = vm.createContext({});
vm.runInContext(engineMatch[1] + '\nglobalThis.api={VsGame,MATCH_SECONDS};', engineContext);
const { VsGame, MATCH_SECONDS } = engineContext.api;

const TICK_MS = 50;                 // 模拟步长 50ms（20Hz）
const DT = TICK_MS / 1000;

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}
function broadcast(room, obj) {
  room.players.forEach((p) => send(p, obj));
}
function opponentOf(room, ws) {
  return room.players.find((p) => p && p !== ws) || null;
}

/** 只广播渲染必需的最小状态，避免每帧传大量无用字段 */
function stateMessage(room) {
  const g = room.game;
  return {
    type: 'state',
    time: +g.time.toFixed(3),
    remaining: g.remaining,
    matchSeconds: g.matchSeconds,
    finished: g.finished,
    winner: g.winner,
    players: {
      A: { energy: g.players.A.energy, baseHp: g.players.A.baseHp, cooldowns: { ...g.players.A.cooldowns } },
      B: { energy: g.players.B.energy, baseHp: g.players.B.baseHp, cooldowns: { ...g.players.B.cooldowns } }
    },
    entities: g.entities.map((e) => ({
      id: e.id, owner: e.owner, cardId: e.cardId, kind: e.kind, lane: e.lane,
      pos: +e.pos.toFixed(3), hp: e.hp, maxHp: e.maxHp
    })),
    tracers: g.tracers.map((t) => ({ fromPos: t.fromPos, toPos: t.toPos, lane: t.lane, at: t.at }))
  };
}

// 用"带漂移补偿的 setTimeout"代替 setInterval：Node 的 setInterval 会累积事件循环延迟，
// 实际间隔常在 50~70ms 之间抖动，客户端收到的快照忽快忽慢，看起来就不流畅。
// 这里每次都按"应到时刻"校正下一次的等待时间，让广播间隔尽量稳定在 TICK_MS。
function startRoomLoop(room) {
  if (room.timer) return;
  let expected = Date.now() + TICK_MS;
  const step = () => {
    room.game.tick(DT);
    broadcast(room, stateMessage(room));
    if (room.game.finished) { stopRoomLoop(room); return; }
    const drift = Date.now() - expected; // 本次超出的时间（>0 表示慢了）
    expected += TICK_MS;
    room.timer = setTimeout(step, Math.max(0, TICK_MS - drift));
  };
  room.timer = setTimeout(step, TICK_MS);
}
function stopRoomLoop(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

/**
 * 创建服务器实例。
 * @param {object} opts
 * @param {number} opts.port 监听端口（默认 3003，避开 gobang-ws 3001 与 fillcup-ws 3002）
 * @param {string} opts.host 监听地址（默认 127.0.0.1，只由本机 Nginx 反代）
 * @param {string[]} opts.allowedOrigins 允许的来源（必须带协议+域名，与前端页面一致）
 * @param {string} opts.path WebSocket 路径（默认 /vs-ws/）
 */
function createVsServer({ port = 3003, host = '127.0.0.1', allowedOrigins = [], path: wsPath = '/vs-ws/' } = {}) {
  const origins = new Set(allowedOrigins);
  const rooms = new Map();

  // 健康检查：容器内其它服务或运维脚本可用 GET /health 探测
  const server = http.createServer((req, res) => {
    const ok = req.url === '/health';
    res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(ok ? { ok: true, rooms: rooms.size } : { error: 'not_found' }));
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });

  // 只接受指定路径、且来源在白名单内的连接，避免被任意站点拿去滥用
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== wsPath || !origins.has(req.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.side = null;
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (e) { return; }

      if (msg.type === 'join') {
        const roomId = String(msg.room || '').slice(0, 20).toUpperCase();
        if (!roomId) return;
        let room = rooms.get(roomId);
        if (!room) {
          const matchSeconds = Number(msg.matchSeconds) > 0 ? Number(msg.matchSeconds) : MATCH_SECONDS;
          room = { players: [null, null], game: new VsGame({ matchSeconds }), timer: null };
          rooms.set(roomId, room);
        }
        if (room.players[0] && room.players[1]) { send(ws, { type: 'full' }); return; }

        const slot = room.players[0] ? 1 : 0;
        room.players[slot] = ws;
        ws.roomId = roomId;
        ws.side = slot === 0 ? 'A' : 'B';

        const opponent = opponentOf(room, ws);
        send(ws, {
          type: 'joined', side: ws.side, room: roomId,
          matchSeconds: room.game.matchSeconds,
          opponentPresent: !!opponent
        });
        send(ws, stateMessage(room)); // 先给一份当前局面，避免开局白屏
        if (opponent) send(opponent, { type: 'opponent_joined' });
        if (room.players[0] && room.players[1]) startRoomLoop(room); // 双方到齐才开始模拟
        return;
      }

      if (!ws.roomId || !ws.side) return;
      const room = rooms.get(ws.roomId);
      if (!room) return;

      if (msg.type === 'deploy') {
        // 权威执行：只有服务器推进对局，客户端不自己跑规则
        const r = room.game.deploy(ws.side, msg.cardId, msg.lane, msg.col === undefined ? null : msg.col);
        if (!r.ok) send(ws, { type: 'reject', reason: r.reason, cardId: msg.cardId });
        else broadcast(room, stateMessage(room)); // 立刻同步一次，让操作手感跟手
        return;
      }

      if (msg.type === 'restart') {
        room.game = new VsGame({ matchSeconds: room.game.matchSeconds });
        stopRoomLoop(room);
        broadcast(room, stateMessage(room));
        if (room.players[0] && room.players[1]) startRoomLoop(room);
        return;
      }
    });

    ws.on('close', () => {
      if (!ws.roomId) return;
      const room = rooms.get(ws.roomId);
      if (!room) return;
      const idx = room.players.indexOf(ws);
      if (idx !== -1) room.players[idx] = null;
      stopRoomLoop(room); // 有人掉线就暂停对局，等重连后继续
      const opponent = opponentOf(room, ws);
      if (opponent) send(opponent, { type: 'opponent_left' });

      if (!room.players[0] && !room.players[1]) {
        stopRoomLoop(room);
        rooms.delete(ws.roomId);
      }
    });

    ws.on('error', () => {});
  });

  // 心跳：清理半开连接
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false;
      ws.ping();
    }
  }, 15000);
  heartbeat.unref();

  const ready = new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const close = async () => {
    clearInterval(heartbeat);
    for (const room of rooms.values()) stopRoomLoop(room);
    for (const ws of wss.clients) ws.terminate();
    await new Promise((resolve) => wss.close(resolve));
    await new Promise((resolve) => server.close(resolve));
  };

  return { server, wss, rooms, ready, close };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3003);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const instance = createVsServer({ port, host: process.env.HOST || '127.0.0.1', allowedOrigins });
  instance.ready.then(() => {
    console.log(`[vs-ws] listening on ws://${process.env.HOST || '127.0.0.1'}:${instance.server.address().port}/vs-ws/`);
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });

  let closing = false;
  const stop = () => { if (closing) return; closing = true; instance.close().then(() => process.exit(0)); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { createVsServer };
