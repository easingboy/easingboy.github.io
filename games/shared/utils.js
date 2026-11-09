/*
 * web/games/shared/utils.js
 * 极简工具函数：localStorage 存档、震动 fallback、返回主页
 *
 * 使用方式（在 index.html 中）：
 *   <script src="../shared/utils.js"></script>
 *   然后 window.GameUtils.saveStats(...)  等等
 *
 * 或者在游戏 script 里：
 *   const { saveStats, loadStats, vibrate } = window.GameUtils;
 */
(function (global) {
  'use strict';

  /**
   * 读取存档
   * @param {string} key
   * @param {*} defaultValue 若不存在或解析失败时返回的值
   */
  function loadStats(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[GameUtils] loadStats error:', e);
      return defaultValue;
    }
  }

  /**
   * 保存存档
   */
  function saveStats(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[GameUtils] saveStats error:', e);
    }
  }

  /**
   * 移除存档
   */
  function clearStats(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) { /* ignore */ }
  }

  /**
   * 极短震动（fallback：不支持时静默）
   * @param {number} ms
   */
  function vibrate(ms = 15) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* ignore */ }
  }

  /**
   * 数值格式化（补零到 n 位）
   */
  function pad(n, len = 2) { return String(n).padStart(len, '0'); }

  /**
   * 随机整数 [min, max]
   */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 数组打乱（Fisher-Yates）
   */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  global.GameUtils = {
    loadStats,
    saveStats,
    clearStats,
    vibrate,
    pad,
    randInt,
    shuffle,
  };
})(window);
