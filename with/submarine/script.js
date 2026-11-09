// ===== 潜水艇模拟器主逻辑 =====

// 状态定义
const STATE = {
  FLOATING: 'floating',
  HOVERING: 'hovering',
  SINKING:  'sinking',
  BOTTOM:   'bottom',
};

// 状态对应的中文名
const STATE_NAMES = {
  [STATE.FLOATING]: '漂浮',
  [STATE.HOVERING]: '悬浮',
  [STATE.SINKING]:  '下沉',
  [STATE.BOTTOM]:   '沉底',
};

// 状态对应的浮力描述
const BUOYANCY_NAMES = {
  [STATE.FLOATING]: '正浮力',
  [STATE.HOVERING]: '中性浮力',
  [STATE.SINKING]:  '负浮力',
  [STATE.BOTTOM]:   '强负浮力',
};

// 状态对应的深度范围（百分比，相对于海洋容器高度）
// 海洋容器高度480px，海底60px，水面40px
// 可用范围：40px ~ 420px（去掉海底60px和水面40px）
// 以百分比表示：8% ~ 78%（留出潜水艇自身高度）
const STATE_DEPTH = {
  [STATE.FLOATING]: { min: 2, max: 8 },
  [STATE.HOVERING]: { min: 30, max: 50 },
  [STATE.SINKING]:  { min: 55, max: 68 },
  [STATE.BOTTOM]:   { min: 72, max: 76 },
};

// 当前状态
let currentState = STATE.FLOATING;
let leftWater = 0;
let rightWater = 0;
let animationFrameId = null;
let currentDepthPercent = 5;
let targetDepthPercent = 5;
let isAnimating = false;

// DOM 元素
const submarineWrapper = document.getElementById('submarineWrapper');
const statusBadge = document.getElementById('statusBadge');
const tankLeftWater = document.getElementById('tankLeftWater');
const tankRightWater = document.getElementById('tankRightWater');
const leftSlider = document.getElementById('leftSlider');
const rightSlider = document.getElementById('rightSlider');
const leftPercent = document.getElementById('leftPercent');
const rightPercent = document.getElementById('rightPercent');
const leftMiniWater = document.getElementById('leftMiniWater');
const rightMiniWater = document.getElementById('rightMiniWater');
const infoState = document.getElementById('infoState');
const infoDepth = document.getElementById('infoDepth');
const infoWater = document.getElementById('infoWater');
const infoBuoyancy = document.getElementById('infoBuoyancy');
const bubblesContainer = document.getElementById('bubblesContainer');
const propeller = document.getElementById('propeller');
const periscope = document.getElementById('periscope');

// 快捷按钮
const btnFloat  = document.getElementById('btnFloat');
const btnHover  = document.getElementById('btnHover');
const btnSink   = document.getElementById('btnSink');
const btnBottom = document.getElementById('btnBottom');

// ===== 工具函数 =====

/**
 * 根据注水量计算状态
 */
function calcStateFromWater(left, right) {
  const avg = (left + right) / 2;
  if (avg <= 10) return STATE.FLOATING;
  if (avg <= 45) return STATE.HOVERING;
  if (avg <= 80) return STATE.SINKING;
  return STATE.BOTTOM;
}

/**
 * 获取目标深度（百分比）
 */
function getTargetDepth(state) {
  const range = STATE_DEPTH[state];
  return (range.min + range.max) / 2;
}

/**
 * 更新滑块背景渐变
 */
function updateSliderBackground(slider, value) {
  slider.style.setProperty('--val', `${value}%`);
  slider.style.background = `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${value}%, rgba(255,255,255,0.1) ${value}%)`;
}

/**
 * 更新状态徽章
 */
function updateStatusBadge(state) {
  statusBadge.textContent = STATE_NAMES[state];
  statusBadge.className = 'status-badge';
  const classMap = {
    [STATE.FLOATING]: 'floating',
    [STATE.HOVERING]: 'hovering',
    [STATE.SINKING]:  'sinking',
    [STATE.BOTTOM]:   'bottom',
  };
  statusBadge.classList.add(classMap[state]);
}

/**
 * 更新信息面板
 */
function updateInfoPanel(state, depthPercent, avgWater) {
  infoState.textContent = STATE_NAMES[state];
  const depthM = Math.round(depthPercent * 1.0);
  infoDepth.textContent = `${depthM} m`;
  infoWater.textContent = `${Math.round(avgWater)}%`;
  infoBuoyancy.textContent = BUOYANCY_NAMES[state];

  // 颜色
  const colorMap = {
    [STATE.FLOATING]: '#4ade80',
    [STATE.HOVERING]: '#60a5fa',
    [STATE.SINKING]:  '#fb923c',
    [STATE.BOTTOM]:   '#f87171',
  };
  infoState.style.color = colorMap[state];
  infoBuoyancy.style.color = colorMap[state];
}

/**
 * 更新快捷按钮激活状态
 */
function updateActiveButton(state) {
  [btnFloat, btnHover, btnSink, btnBottom].forEach(btn => btn.classList.remove('active'));
  const btnMap = {
    [STATE.FLOATING]: btnFloat,
    [STATE.HOVERING]: btnHover,
    [STATE.SINKING]:  btnSink,
    [STATE.BOTTOM]:   btnBottom,
  };
  if (btnMap[state]) btnMap[state].classList.add('active');
}

/**
 * 更新潜水艇位置（平滑动画）
 */
function animateSubmarinePosition() {
  const diff = targetDepthPercent - currentDepthPercent;
  if (Math.abs(diff) < 0.05) {
    currentDepthPercent = targetDepthPercent;
    submarineWrapper.style.top = `${currentDepthPercent}%`;
    isAnimating = false;
    return;
  }
  // 缓动
  currentDepthPercent += diff * 0.04;
  submarineWrapper.style.top = `${currentDepthPercent}%`;
  animationFrameId = requestAnimationFrame(animateSubmarinePosition);
}

/**
 * 设置潜水艇目标深度并启动动画
 */
function setTargetDepth(depthPercent) {
  targetDepthPercent = depthPercent;
  if (!isAnimating) {
    isAnimating = true;
    animateSubmarinePosition();
  }
}

/**
 * 更新螺旋桨速度（根据状态）
 */
function updatePropellerSpeed(state) {
  const speedMap = {
    [STATE.FLOATING]: '1.2s',
    [STATE.HOVERING]: '0.6s',
    [STATE.SINKING]:  '0.3s',
    [STATE.BOTTOM]:   '2s',
  };
  propeller.style.animationDuration = speedMap[state];
}

/**
 * 更新潜望镜（漂浮时伸出）
 */
function updatePeriscope(state) {
  if (state === STATE.FLOATING) {
    periscope.style.transform = 'translateX(-50%) translateY(-8px)';
  } else {
    periscope.style.transform = 'translateX(-50%) translateY(0)';
  }
}

// ===== 气泡系统 =====

let bubbleInterval = null;

function createBubble(x, y, size) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.left = `${x}%`;
  bubble.style.top = `${y}%`;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;
  const duration = 2 + Math.random() * 3;
  bubble.style.animationDuration = `${duration}s`;
  bubble.style.animationDelay = `${Math.random() * 0.5}s`;
  bubblesContainer.appendChild(bubble);
  setTimeout(() => bubble.remove(), (duration + 0.5) * 1000);
}

function startBubbles(state) {
  if (bubbleInterval) clearInterval(bubbleInterval);

  const rateMap = {
    [STATE.FLOATING]: 0,
    [STATE.HOVERING]: 300,
    [STATE.SINKING]:  150,
    [STATE.BOTTOM]:   600,
  };

  const rate = rateMap[state];
  if (rate === 0) return;

  bubbleInterval = setInterval(() => {
    // 在潜水艇附近产生气泡
    const subLeft = 50 + (Math.random() - 0.5) * 20;
    const subTop = currentDepthPercent + 5 + Math.random() * 5;
    const size = 3 + Math.random() * 6;
    createBubble(subLeft, subTop, size);
  }, rate);
}

// ===== 水舱气泡 =====

function createTankBubble(container) {
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    position: absolute;
    width: ${2 + Math.random() * 3}px;
    height: ${2 + Math.random() * 3}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    left: ${10 + Math.random() * 80}%;
    bottom: 0;
    animation: bubbleRise ${1 + Math.random() * 1.5}s linear forwards;
  `;
  container.appendChild(bubble);
  setTimeout(() => bubble.remove(), 2500);
}

let tankBubbleInterval = null;

function startTankBubbles(leftVal, rightVal) {
  if (tankBubbleInterval) clearInterval(tankBubbleInterval);
  const avgFill = (leftVal + rightVal) / 2;
  if (avgFill < 5) return;

  const tankLeftBubbles = document.getElementById('tankLeftBubbles');
  const tankRightBubbles = document.getElementById('tankRightBubbles');

  tankBubbleInterval = setInterval(() => {
    if (leftVal > 5) createTankBubble(tankLeftBubbles);
    if (rightVal > 5) createTankBubble(tankRightBubbles);
  }, 400);
}

// ===== 主更新函数 =====

function updateAll() {
  const avg = (leftWater + rightWater) / 2;
  const newState = calcStateFromWater(leftWater, rightWater);

  // 更新水舱视觉
  tankLeftWater.style.height = `${leftWater}%`;
  tankRightWater.style.height = `${rightWater}%`;
  leftMiniWater.style.width = `${leftWater}%`;
  rightMiniWater.style.width = `${rightWater}%`;
  leftPercent.textContent = `${Math.round(leftWater)}%`;
  rightPercent.textContent = `${Math.round(rightWater)}%`;
  updateSliderBackground(leftSlider, leftWater);
  updateSliderBackground(rightSlider, rightWater);

  // 更新状态
  if (newState !== currentState) {
    currentState = newState;
    updateStatusBadge(newState);
    updateActiveButton(newState);
    updatePropellerSpeed(newState);
    updatePeriscope(newState);
    startBubbles(newState);
    startTankBubbles(leftWater, rightWater);
  }

  // 更新深度
  const targetDepth = getTargetDepth(currentState);
  setTargetDepth(targetDepth);

  // 更新信息面板
  updateInfoPanel(currentState, currentDepthPercent, avg);
}

// ===== 事件绑定 =====

leftSlider.addEventListener('input', (e) => {
  leftWater = parseFloat(e.target.value);
  updateAll();
});

rightSlider.addEventListener('input', (e) => {
  rightWater = parseFloat(e.target.value);
  updateAll();
});

// 快捷按钮
function setWaterLevels(left, right, duration = 0) {
  // 平滑过渡滑块值
  const startLeft = leftWater;
  const startRight = rightWater;
  const startTime = performance.now();
  const animDuration = 800;

  function animateSliders(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / animDuration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    leftWater = startLeft + (left - startLeft) * ease;
    rightWater = startRight + (right - startRight) * ease;

    leftSlider.value = leftWater;
    rightSlider.value = rightWater;
    updateAll();

    if (progress < 1) {
      requestAnimationFrame(animateSliders);
    }
  }

  requestAnimationFrame(animateSliders);
}

btnFloat.addEventListener('click', () => setWaterLevels(0, 0));
btnHover.addEventListener('click', () => setWaterLevels(45, 45));
btnSink.addEventListener('click', () => setWaterLevels(75, 75));
btnBottom.addEventListener('click', () => setWaterLevels(100, 100));

// ===== 背景气泡（装饰） =====

function createAmbientBubbles() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const x = 5 + Math.random() * 90;
      const y = 20 + Math.random() * 70;
      const size = 2 + Math.random() * 5;
      createBubble(x, y, size);
    }, i * 600);
  }
}

setInterval(createAmbientBubbles, 5000);
createAmbientBubbles();

// ===== 潜水艇轻微摇摆动画 =====

let swayAngle = 0;
let swayDirection = 1;

function animateSway() {
  swayAngle += 0.02 * swayDirection;
  if (Math.abs(swayAngle) > 1.5) swayDirection *= -1;

  const sub = document.getElementById('submarine');
  if (currentState === STATE.HOVERING) {
    sub.style.transform = `rotate(${swayAngle * 0.5}deg)`;
  } else if (currentState === STATE.FLOATING) {
    sub.style.transform = `rotate(${swayAngle * 0.3}deg) translateY(${Math.sin(Date.now() / 800) * 2}px)`;
  } else {
    sub.style.transform = `rotate(${swayAngle * 0.2}deg)`;
  }

  requestAnimationFrame(animateSway);
}

animateSway();

// ===== 初始化 =====

function init() {
  updateStatusBadge(STATE.FLOATING);
  updateActiveButton(STATE.FLOATING);
  updatePropellerSpeed(STATE.FLOATING);
  updatePeriscope(STATE.FLOATING);
  updateSliderBackground(leftSlider, 0);
  updateSliderBackground(rightSlider, 0);
  updateInfoPanel(STATE.FLOATING, 5, 0);
  submarineWrapper.style.top = `${STATE_DEPTH[STATE.FLOATING].min + 2}%`;
  currentDepthPercent = STATE_DEPTH[STATE.FLOATING].min + 2;
  targetDepthPercent = currentDepthPercent;
}

init();
