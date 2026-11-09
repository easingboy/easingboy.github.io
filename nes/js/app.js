(function () {
  'use strict';

  var Ctl = jsnes.Controller;
  var BTN = {
    A: Ctl.BUTTON_A, B: Ctl.BUTTON_B,
    SELECT: Ctl.BUTTON_SELECT, START: Ctl.BUTTON_START,
    UP: Ctl.BUTTON_UP, DOWN: Ctl.BUTTON_DOWN,
    LEFT: Ctl.BUTTON_LEFT, RIGHT: Ctl.BUTTON_RIGHT,
    TURBO_A: Ctl.BUTTON_TURBO_A, TURBO_B: Ctl.BUTTON_TURBO_B
  };

  /* ---------- 按键配置：默认值 + Cookie 覆盖 ---------- */
  var ACTIONS = [
    ['UP', '上'], ['DOWN', '下'], ['LEFT', '左'], ['RIGHT', '右'],
    ['A', 'A'], ['B', 'B'], ['TURBO_A', '连发 A'], ['TURBO_B', '连发 B'],
    ['SELECT', 'Select'], ['START', 'Start']
  ];

  var DEFAULT_KEYS = {
    'p1.UP': 'KeyW', 'p1.DOWN': 'KeyS', 'p1.LEFT': 'KeyA', 'p1.RIGHT': 'KeyD',
    'p1.A': 'KeyK', 'p1.B': 'KeyJ', 'p1.TURBO_A': 'KeyI', 'p1.TURBO_B': 'KeyU',
    'p1.SELECT': 'KeyC', 'p1.START': 'KeyB',
    'p2.UP': 'ArrowUp', 'p2.DOWN': 'ArrowDown', 'p2.LEFT': 'ArrowLeft', 'p2.RIGHT': 'ArrowRight',
    'p2.A': 'Period', 'p2.B': 'Comma', 'p2.TURBO_A': 'Slash', 'p2.TURBO_B': 'Semicolon',
    'p2.SELECT': 'ShiftRight', 'p2.START': 'Enter',
    save: 'KeyQ', load: 'KeyE'
  };

  var COOKIE_NAME = 'nes_keys';

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function allUnique(map) {
    var seen = {};
    return Object.keys(map).every(function (k) {
      if (seen[map[k]]) return false;
      seen[map[k]] = true;
      return true;
    });
  }

  function loadBindings() {
    var result = Object.assign({}, DEFAULT_KEYS);
    try {
      var saved = JSON.parse(readCookie(COOKIE_NAME));
      if (saved && typeof saved === 'object') {
        var merged = Object.assign({}, DEFAULT_KEYS);
        Object.keys(saved).forEach(function (k) {
          if (k in DEFAULT_KEYS && typeof saved[k] === 'string' && /^\w{1,20}$/.test(saved[k])) {
            merged[k] = saved[k];
          }
        });
        if (allUnique(merged)) result = merged;
      }
    } catch (err) { /* Cookie 损坏时使用默认值 */ }
    return result;
  }

  // 只保存与默认值不同的项；返回 Cookie 是否真的写入成功
  function saveBindings() {
    var diff = {};
    Object.keys(DEFAULT_KEYS).forEach(function (k) {
      if (bindings[k] !== DEFAULT_KEYS[k]) diff[k] = bindings[k];
    });
    var empty = Object.keys(diff).length === 0;
    document.cookie = COOKIE_NAME + '=' + encodeURIComponent(JSON.stringify(diff)) +
      '; path=/; SameSite=Lax; max-age=' + (empty ? 0 : 31536000);
    return empty || readCookie(COOKIE_NAME) !== null;
  }

  var bindings = loadBindings();
  var codeMap = {};

  function rebuildMap() {
    codeMap = {};
    Object.keys(bindings).forEach(function (slot) { codeMap[bindings[slot]] = slot; });
  }
  rebuildMap();

  var KEY_NAMES = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'Enter', NumpadEnter: '小键盘 Enter', Space: 'Space', Tab: 'Tab', Backspace: '⌫',
    ShiftLeft: '左 Shift', ShiftRight: '右 Shift',
    ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl',
    AltLeft: '左 Alt', AltRight: '右 Alt',
    MetaLeft: '左 Cmd', MetaRight: '右 Cmd',
    Slash: '/', Period: '.', Comma: ',', Semicolon: ';', Quote: '\'',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Minus: '-', Equal: '=', Backquote: '`'
  };

  function keyLabel(code) {
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    var m = /^Key([A-Z])$/.exec(code) || /^Digit(\d)$/.exec(code);
    if (m) return m[1];
    m = /^Numpad(.+)$/.exec(code);
    return m ? '小键盘 ' + m[1] : code;
  }

  function slotName(slot) {
    if (slot === 'save') return '存档';
    if (slot === 'load') return '读档';
    var act = ACTIONS.filter(function (a) { return a[0] === slot.slice(3); })[0];
    return '玩家' + slot.charAt(1) + ' ' + act[1];
  }

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('screen');
  var tip = $('tip');
  var select = $('rom-select');
  var toastEl = $('toast');

  /* ---------- 画面 ---------- */
  var ctx = canvas.getContext('2d');
  var image = ctx.createImageData(256, 240);
  var buf32 = new Uint32Array(image.data.buffer);

  function onFrame(frame) {
    for (var i = 0; i < buf32.length; i++) buf32[i] = 0xFF000000 | frame[i];
    ctx.putImageData(image, 0, 0);
  }

  /* ---------- 声音：环形缓冲 + ScriptProcessor ---------- */
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;
  var muted = false;
  var RING = 8192;
  var ringL = new Float32Array(RING);
  var ringR = new Float32Array(RING);
  var wr = 0;
  var rd = 0;

  if (AudioCtx) {
    audioCtx = new AudioCtx();
    var proc = audioCtx.createScriptProcessor(1024, 0, 2);
    proc.onaudioprocess = function (e) {
      var l = e.outputBuffer.getChannelData(0);
      var r = e.outputBuffer.getChannelData(1);
      if (wr - rd > RING) rd = wr - RING / 2;
      for (var i = 0; i < l.length; i++) {
        if (rd < wr) {
          l[i] = ringL[rd % RING];
          r[i] = ringR[rd % RING];
          rd++;
        } else {
          l[i] = 0;
          r[i] = 0;
        }
      }
    };
    proc.connect(audioCtx.destination);
  }

  function onAudioSample(l, r) {
    if (muted) return;
    ringL[wr % RING] = l;
    ringR[wr % RING] = r;
    wr++;
  }

  function resumeAudio() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  /* ---------- 模拟器与主循环 ---------- */
  var nes = new jsnes.NES({
    onFrame: onFrame,
    onAudioSample: onAudioSample,
    sampleRate: audioCtx ? audioCtx.sampleRate : 44100
  });

  var STEP = 1000 / 60.0988;
  var running = false;
  var last = 0;
  var acc = 0;

  function tick(t) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (!last) last = t;
    acc += Math.min(t - last, 100);
    last = t;
    try {
      for (var n = 0; acc >= STEP && n < 2; n++) {
        nes.frame();
        acc -= STEP;
      }
    } catch (err) {
      running = false;
      showTip('运行出错：' + err.message);
      return;
    }
    if (acc > STEP) acc = 0;
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    acc = 0;
    requestAnimationFrame(tick);
  }

  function stop() { running = false; }

  function showTip(msg) {
    tip.firstElementChild.textContent = msg;
    tip.classList.remove('hidden');
  }

  function hideTip() { tip.classList.add('hidden'); }

  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1500);
  }

  /* ---------- 存档：IndexedDB，仅保存在本机浏览器 ---------- */
  var romKey = null;

  function hashROM(bytes) {
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193);
    }
    return 'rom-' + bytes.length + '-' + (h >>> 0).toString(16);
  }

  function idb(mode, fn) {
    return new Promise(function (resolve, reject) {
      var open = indexedDB.open('nes-player', 1);
      open.onupgradeneeded = function () { open.result.createObjectStore('saves'); };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        var db = open.result;
        var tx = db.transaction('saves', mode);
        var req = fn(tx.objectStore('saves'));
        tx.oncomplete = function () { db.close(); resolve(req.result); };
        tx.onerror = tx.onabort = function () { db.close(); reject(tx.error); };
      };
    });
  }

  function saveState() {
    if (!romKey) { toast('请先载入游戏'); return; }
    var key = romKey;
    var record = { time: Date.now(), data: nes.toJSON() };
    idb('readwrite', function (s) { return s.put(record, key); })
      .then(function () { toast('已存档'); })
      .catch(function () { toast('存档失败'); });
  }

  function loadState() {
    if (!romKey) { toast('请先载入游戏'); return; }
    var key = romKey;
    idb('readonly', function (s) { return s.get(key); })
      .then(function (record) {
        if (key !== romKey) return;
        if (!record) { toast('没有存档'); return; }
        nes.fromJSON(record.data);
        wr = rd = 0;
        toast('已读档');
      })
      .catch(function () { toast('读档失败'); });
  }

  /* ---------- ROM 加载 ---------- */
  function toBinaryString(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return s;
  }

  function runROM(buffer) {
    stop();
    romKey = null;
    var bytes = new Uint8Array(buffer);
    try {
      nes.loadROM(toBinaryString(bytes));
    } catch (err) {
      showTip('ROM 无效或暂不支持：' + err.message);
      return;
    }
    romKey = hashROM(bytes);
    wr = rd = 0;
    hideTip();
    start();
  }

  function loadFromURL(url) {
    stop();
    showTip('正在载入...');
    fetch(encodeURI(url))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then(runROM)
      .catch(function (err) {
        showTip('ROM 加载失败：' + err.message + '（需通过 http 服务访问，且文件存在于 ' + url + '）');
      });
  }

  function loadGames(games) {
    var first = null;
    Object.keys(games).forEach(function (group) {
      var og = document.createElement('optgroup');
      og.label = group;
      games[group].forEach(function (g) {
        var op = document.createElement('option');
        op.textContent = g[0];
        op.value = g[1];
        og.appendChild(op);
        if (!first) first = g[1];
      });
      select.appendChild(og);
    });
    if (first) {
      select.value = first;
      loadFromURL(first);
    } else {
      showTip('games.json 里还没有游戏，可点击文件夹图标载入本地 ROM');
    }
  }

  fetch('games.json')
    .then(function (res) { return res.json(); })
    .then(loadGames)
    .catch(function () { showTip('读取 games.json 失败，可点击文件夹图标载入本地 ROM'); });

  select.addEventListener('change', function () {
    select.blur();
    if (select.value) loadFromURL(select.value);
  });

  var fileInput = $('rom-file');
  $('btn-open').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var f = fileInput.files[0];
    if (!f) return;
    f.arrayBuffer().then(runROM);
    fileInput.value = '';
  });

  /* ---------- 工具栏按钮 ---------- */
  $('btn-restart').addEventListener('click', function () {
    if (nes.rom || running) {
      nes.reloadROM();
      wr = rd = 0;
    }
  });

  $('btn-sound').addEventListener('click', function () {
    muted = !muted;
    this.classList.toggle('active-icon', !muted);
    wr = rd = 0;
    resumeAudio();
  });

  var fsBtn = $('btn-full');
  var root = document.documentElement;
  var requestFS = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!requestFS) {
    fsBtn.style.display = 'none';
  } else {
    fsBtn.addEventListener('click', function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        requestFS.call(root);
      }
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (type) {
      document.addEventListener(type, function () {
        var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
        root.classList.toggle('is-fs', on);
        if (on) {
          updateFsScale();
          wakeScaleBar();
        } else {
          root.classList.remove('fs-int');
          builtN = -1;
        }
      });
    });
  }

  /* ---------- 全屏缩放：1X … NX / 最大 ---------- */
  var scaleBar = $('fs-scale');
  var fsScale = 'max';
  var builtN = -1;
  var idleTimer = 0;

  function fsMaxN() {
    var r = canvas.parentNode.getBoundingClientRect();
    return Math.floor(Math.min(r.width / 256, r.height / 240));
  }

  function updateFsScale() {
    if (!root.classList.contains('is-fs')) return;
    var n = fsMaxN();
    if (n !== builtN) {
      builtN = n;
      scaleBar.textContent = '';
      for (var i = 1; i <= n; i++) {
        var b = document.createElement('button');
        b.textContent = i + 'X';
        b.setAttribute('data-scale', i);
        scaleBar.appendChild(b);
      }
      var m = document.createElement('button');
      m.textContent = '最大';
      m.setAttribute('data-scale', 'max');
      scaleBar.appendChild(m);
    }
    var cur = fsScale === 'max' ? 'max' : Math.min(fsScale, n);
    if (!cur) cur = 'max';
    root.classList.toggle('fs-int', cur !== 'max');
    if (cur !== 'max') root.style.setProperty('--fs-n', cur);
    Array.prototype.forEach.call(scaleBar.children, function (b) {
      b.classList.toggle('active', b.getAttribute('data-scale') === String(cur));
    });
  }

  function wakeScaleBar() {
    scaleBar.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (scaleBar.matches(':hover')) { wakeScaleBar(); return; }
      scaleBar.classList.add('idle');
    }, 2500);
  }

  scaleBar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var v = b.getAttribute('data-scale');
    fsScale = v === 'max' ? 'max' : +v;
    b.blur();
    updateFsScale();
  });

  ['mousemove', 'pointerdown', 'touchstart'].forEach(function (type) {
    document.addEventListener(type, function () {
      if (root.classList.contains('is-fs')) wakeScaleBar();
    }, { passive: true });
  });

  window.addEventListener('resize', updateFsScale);

  /* ---------- 键盘 ---------- */
  var held = {};

  function press(btn, el, player) {
    player = player || 1;
    held[player + ':' + btn] = true;
    nes.buttonDown(player, btn);
    if (el) el.classList.add('active_btn');
  }

  function release(btn, el, player) {
    player = player || 1;
    held[player + ':' + btn] = false;
    nes.buttonUp(player, btn);
    if (el) el.classList.remove('active_btn');
  }

  function releaseAll() {
    Object.keys(held).forEach(function (k) {
      if (!held[k]) return;
      var p = k.split(':');
      release(+p[1], null, +p[0]);
    });
  }

  function isSystemSlot(slot) { return slot === 'save' || slot === 'load'; }

  document.addEventListener('keydown', function (e) {
    resumeAudio();
    if (dlgOpen()) { onDialogKey(e); return; }
    var slot = codeMap[e.code];
    if (!slot) return;
    if (isSystemSlot(slot)) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (!e.repeat) (slot === 'save' ? saveState : loadState)();
      return;
    }
    e.preventDefault();
    if (!e.repeat) press(BTN[slot.slice(3)], null, +slot.charAt(1));
  });

  document.addEventListener('keyup', function (e) {
    if (dlgOpen()) { e.preventDefault(); return; }
    var slot = codeMap[e.code];
    if (!slot || isSystemSlot(slot)) return;
    e.preventDefault();
    release(BTN[slot.slice(3)], null, +slot.charAt(1));
  });

  window.addEventListener('blur', releaseAll);

  /* ---------- 按键设置面板 ---------- */
  var dlg = $('keys-dialog');
  var keysBody = $('keys-body');
  var keysShared = $('keys-shared');
  var keysHint = $('keys-hint');
  var HINT_DEFAULT = '点击按键格，再按下新按键即可修改；Esc 取消。橙色为已修改，下方小字是默认值。';
  var listening = null;
  var resumeOnClose = false;

  function dlgOpen() { return !dlg.hidden; }

  function makeCell(slot) {
    var b = document.createElement('button');
    b.className = 'key-cell';
    b.setAttribute('data-slot', slot);
    return b;
  }

  function buildDialog() {
    ACTIONS.forEach(function (a) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.textContent = a[1];
      tr.appendChild(th);
      ['p1', 'p2'].forEach(function (p) {
        var td = document.createElement('td');
        td.appendChild(makeCell(p + '.' + a[0]));
        tr.appendChild(td);
      });
      keysBody.appendChild(tr);
    });
    [['save', '存档'], ['load', '读档']].forEach(function (s) {
      var label = document.createElement('span');
      label.textContent = s[1];
      keysShared.appendChild(label);
      keysShared.appendChild(makeCell(s[0]));
    });
  }

  function renderDialog() {
    Array.prototype.forEach.call(dlg.querySelectorAll('.key-cell'), function (cell) {
      var slot = cell.getAttribute('data-slot');
      var changed = bindings[slot] !== DEFAULT_KEYS[slot];
      cell.classList.toggle('changed', changed);
      cell.classList.toggle('listening', slot === listening);
      cell.textContent = slot === listening ? '按下按键…' : keyLabel(bindings[slot]);
      if (changed && slot !== listening) {
        var small = document.createElement('small');
        small.textContent = '默认 ' + keyLabel(DEFAULT_KEYS[slot]);
        cell.appendChild(small);
      }
    });
  }

  function setHint(msg) { keysHint.textContent = msg || HINT_DEFAULT; }

  function persist(prefix) {
    rebuildMap();
    setHint(saveBindings() ? prefix : prefix + '（Cookie 不可用，仅本次有效）');
    renderDialog();
  }

  function assign(slot, code) {
    var other = codeMap[code];
    if (other === slot) { setHint('键位未变'); return; }
    var msg = '已修改：' + slotName(slot) + ' → ' + keyLabel(code);
    if (other) {
      bindings[other] = bindings[slot];
      msg += '；' + slotName(other) + ' 与其交换，改为 ' + keyLabel(bindings[other]);
    }
    bindings[slot] = code;
    persist(msg);
  }

  function onDialogKey(e) {
    if (e.code === 'Escape') {
      e.preventDefault();
      if (listening) { listening = null; setHint(); renderDialog(); }
      else closeDialog();
      return;
    }
    if (!listening || !e.code || e.code === 'Unidentified') return;
    e.preventDefault();
    var slot = listening;
    listening = null;
    assign(slot, e.code);
  }

  function openDialog() {
    releaseAll();
    resumeOnClose = running;
    stop();
    listening = null;
    setHint();
    renderDialog();
    dlg.hidden = false;
  }

  function closeDialog() {
    listening = null;
    dlg.hidden = true;
    if (resumeOnClose) start();
  }

  buildDialog();

  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { closeDialog(); return; }
    var cell = e.target.closest('.key-cell');
    if (!cell) return;
    listening = cell.getAttribute('data-slot');
    setHint();
    renderDialog();
  });

  $('btn-keys').addEventListener('click', openDialog);
  $('keys-close').addEventListener('click', closeDialog);
  $('keys-reset').addEventListener('click', function () {
    bindings = Object.assign({}, DEFAULT_KEYS);
    listening = null;
    persist('已恢复默认按键');
  });

  /* ---------- 配色主题：Cookie 记住选择 ---------- */
  var THEMES = [
    ['famicom', '红白机经典'],
    ['nes-gray', '红白机灰机身'],
    ['mono', '黑白极简'],
    ['night', '黑红夜间'],
    ['classic', '经典蓝（原版）']
  ];
  var THEME_COOKIE = 'nes_theme';
  var themeIdx = 0;

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', THEMES[themeIdx][0]);
  }

  (function () {
    var saved = readCookie(THEME_COOKIE);
    THEMES.forEach(function (t, i) { if (t[0] === saved) themeIdx = i; });
    applyTheme();
  })();

  $('btn-theme').addEventListener('click', function () {
    themeIdx = (themeIdx + 1) % THEMES.length;
    applyTheme();
    document.cookie = THEME_COOKIE + '=' + THEMES[themeIdx][0] + '; path=/; SameSite=Lax; max-age=31536000';
    toast('配色 ' + (themeIdx + 1) + '/' + THEMES.length + '：' + THEMES[themeIdx][1]);
  });

  /* ---------- 触控：A / B / Select / Start ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-btn]'), function (el) {
    var btn = BTN[el.getAttribute('data-btn')];
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      resumeAudio();
      el.setPointerCapture(e.pointerId);
      press(btn, el);
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      el.addEventListener(type, function () { release(btn, el); });
    });
  });

  /* ---------- 触控：方向键（8 向，可滑动） ---------- */
  var dpad = $('dpad');
  var dirBtns = {};
  Array.prototype.forEach.call(dpad.querySelectorAll('[data-dir]'), function (el) {
    dirBtns[el.getAttribute('data-dir')] = el;
  });
  var dirMap = { up: BTN.UP, down: BTN.DOWN, left: BTN.LEFT, right: BTN.RIGHT };
  var dirState = { up: false, down: false, left: false, right: false };
  var dpadPointer = null;
  var TAN_22_5 = 0.4142;

  function setDir(name, on) {
    if (dirState[name] === on) return;
    dirState[name] = on;
    if (on) press(dirMap[name], dirBtns[name]);
    else release(dirMap[name], dirBtns[name]);
  }

  function updateDpad(e) {
    var r = dpad.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    var dead = r.width * 0.12;
    var ax = Math.abs(dx);
    var ay = Math.abs(dy);
    setDir('left', dx < -dead && ax > ay * TAN_22_5);
    setDir('right', dx > dead && ax > ay * TAN_22_5);
    setDir('up', dy < -dead && ay > ax * TAN_22_5);
    setDir('down', dy > dead && ay > ax * TAN_22_5);
  }

  function endDpad() {
    dpadPointer = null;
    Object.keys(dirState).forEach(function (n) { setDir(n, false); });
  }

  dpad.addEventListener('pointerdown', function (e) {
    if (dpadPointer !== null) return;
    e.preventDefault();
    resumeAudio();
    dpadPointer = e.pointerId;
    dpad.setPointerCapture(e.pointerId);
    updateDpad(e);
  });
  dpad.addEventListener('pointermove', function (e) {
    if (e.pointerId === dpadPointer) updateDpad(e);
  });
  ['pointerup', 'pointercancel'].forEach(function (type) {
    dpad.addEventListener(type, function (e) {
      if (e.pointerId === dpadPointer) endDpad();
    });
  });

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();
