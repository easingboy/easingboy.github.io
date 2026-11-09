/**
 * 五子棋联机对战 - WebSocket 中转服务器
 *
 * 设计原则：服务器只做"房间管理 + 消息转发"，不做棋局逻辑判断
 * （谁能不能落子、有没有赢，全部交给双方浏览器里已有的游戏逻辑处理，
 * 服务器只负责把 A 发的消息转给 B，反之亦然）。
 * 这样可以完全复用 index.html 里现成的棋盘规则代码，不用在服务器重写一份。
 */
const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;
const wss = new WebSocket.Server({ port: PORT });

// roomId -> { players: [ws|null, ws|null] }  数组下标即 颜色-1（0=黑，1=白）
const rooms = new Map();

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function getOpponent(room, ws) {
  return room.players.find((p) => p && p !== ws) || null;
}

wss.on('connection', (ws) => {
  ws.room = null;
  ws.color = 0;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (msg.type === 'join') {
      const roomId = String(msg.room || '').slice(0, 20);
      if (!roomId) return;

      let room = rooms.get(roomId);
      if (!room) {
        room = { players: [null, null] };
        rooms.set(roomId, room);
      }

      // 两个位置都已被占用（且都还连着），房间已满
      if (room.players[0] && room.players[1]) {
        send(ws, { type: 'full' });
        return;
      }

      const slot = room.players[0] ? 1 : 0;
      room.players[slot] = ws;
      ws.room = roomId;
      ws.color = slot + 1; // 1=黑 2=白

      const opponent = getOpponent(room, ws);
      send(ws, { type: 'joined', color: ws.color, opponentPresent: !!opponent });
      if (opponent) {
        send(opponent, { type: 'opponent_joined' });
      }
      return;
    }

    // 其余消息类型必须已加入房间才处理，直接原样转发给对方，不做校验
    if (!ws.room) return;
    const room = rooms.get(ws.room);
    if (!room) return;
    const opponent = getOpponent(room, ws);
    if (!opponent) return;

    if (msg.type === 'move') {
      send(opponent, { type: 'move', x: msg.x, y: msg.y });
    } else if (msg.type === 'undo') {
      // 把被撤销那一步的坐标+颜色也转发出去，供接收方精确定位要删除的历史记录，
      // 而不是想当然地删除自己 history 数组的最后一条（并发落子/悔棋时两者可能不是同一条）
      send(opponent, { type: 'undo', x: msg.x, y: msg.y, c: msg.c });
    } else if (msg.type === 'restart') {
      send(opponent, { type: 'restart' });
    }
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const room = rooms.get(ws.room);
    if (!room) return;

    const idx = room.players.indexOf(ws);
    if (idx !== -1) room.players[idx] = null;

    const opponent = getOpponent(room, ws);
    if (opponent) {
      send(opponent, { type: 'opponent_left' });
    }

    // 两人都离开后清理房间，避免内存泄漏
    if (!room.players[0] && !room.players[1]) {
      rooms.delete(ws.room);
    }
  });
});

console.log(`[gobang-ws] listening on ws://127.0.0.1:${PORT}`);
