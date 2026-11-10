(function () {
  'use strict';
  const game = window.ShooterGame;
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const pause = document.getElementById('pause');
  const start = document.getElementById('start');
  const keys = new Set();
  const heldDirections = new Set();
  const pointerDirections = new Map();
  const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  const score = document.getElementById('score');
  let state = game.newGame();
  let best = 0;
  let gesture = null;
  let target = null;
  let lastTime = null;
  let accumulator = 0;
  try { best = Number(localStorage.getItem('shooter-best')) || 0; } catch { /* Local storage is optional. */ }
  const stars = Array.from({ length: 55 }, (_, i) => ({ x: (i * 137 + 31) % game.WIDTH, y: (i * 173 + 19) % game.HEIGHT, speed: 12 + i % 3 * 15 }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function plane(x, y, size, color, enemy = false) {
    ctx.save(); ctx.translate(x, y);
    if (enemy) ctx.rotate(Math.PI);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * .62); ctx.lineTo(size * .16, -size * .08);
    ctx.lineTo(size * .55, size * .32); ctx.lineTo(size * .55, size * .5);
    ctx.lineTo(size * .14, size * .28); ctx.lineTo(size * .12, size * .57);
    ctx.lineTo(-size * .12, size * .57); ctx.lineTo(-size * .14, size * .28);
    ctx.lineTo(-size * .55, size * .5); ctx.lineTo(-size * .55, size * .32);
    ctx.lineTo(-size * .16, -size * .08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = enemy ? '#5c3733' : '#233e56';
    ctx.fillRect(-size * .06, -size * .25, size * .12, size * .3);
    if (!enemy) {
      ctx.fillStyle = '#f3b474';
      ctx.beginPath(); ctx.moveTo(-3, size * .55); ctx.lineTo(0, size * .9); ctx.lineTo(3, size * .55); ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#101c2b'; ctx.fillRect(0, 0, game.WIDTH, game.HEIGHT);
    ctx.strokeStyle = '#1b2b3e'; ctx.lineWidth = 1;
    for (let x = 0; x < game.WIDTH; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, game.HEIGHT); ctx.stroke();
    }
    for (let y = -48; y < game.HEIGHT; y += 48) {
      const offset = reducedMotion ? 0 : state.time * 20 % 48;
      ctx.beginPath(); ctx.moveTo(0, y + offset); ctx.lineTo(game.WIDTH, y + offset); ctx.stroke();
    }
    stars.forEach(star => {
      ctx.fillStyle = '#6a819955';
      ctx.fillRect(star.x, (star.y + (reducedMotion ? 0 : state.time * star.speed)) % game.HEIGHT, 2, 2);
    });
    ctx.fillStyle = '#a8def9';
    state.bullets.forEach(b => ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h));
    ctx.fillStyle = '#f3b174';
    state.enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); });
    state.enemies.forEach(e => {
      plane(e.x, e.y, e.w, e.maxHp > 1 ? '#c98072' : '#dfaa81', true);
      if (e.maxHp > 1) {
        ctx.fillStyle = '#503c3c'; ctx.fillRect(e.x - 15, e.y - e.h * .7, 30, 3);
        ctx.fillStyle = '#eab59b'; ctx.fillRect(e.x - 15, e.y - e.h * .7, 30 * e.hp / e.maxHp, 3);
      }
    });
    if (!state.invulnerable || reducedMotion || Math.floor(state.invulnerable * 10) % 2 === 0) {
      plane(state.player.x, state.player.y, 34, '#b5dbed');
    }
    if (state.invulnerable > 0) {
      ctx.strokeStyle = '#98cee7'; ctx.beginPath(); ctx.arc(state.player.x, state.player.y, 26, 0, Math.PI * 2); ctx.stroke();
    }
    state.bursts.forEach(b => {
      ctx.strokeStyle = `rgba(239,176,113,${b.life / .4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, reducedMotion ? 16 : 8 + (1 - b.life / .4) * 30, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    });
  }

  function updateHud(previous) {
    score.textContent = String(state.score).padStart(6, '0');
    document.getElementById('wave').textContent = String(state.wave).padStart(2, '0');
    const lives = document.getElementById('lives');
    lives.textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '▰' : '▱').join(' ');
    lives.setAttribute('aria-label', `剩余 ${state.lives} 格生命`);
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('shooter-best', String(best)); } catch { /* Game works without storage. */ }
    }
    document.getElementById('best').textContent = best;
    overlay.hidden = state.status === 'playing';
    pause.disabled = !['playing', 'paused'].includes(state.status);
    pause.innerHTML = state.status === 'paused' ? '继续 <kbd>SPACE</kbd>' : '暂停 <kbd>SPACE</kbd>';
    document.getElementById('flight-status').textContent = { ready: 'STANDBY', playing: 'AUTO FIRE / ONLINE', paused: 'FLIGHT PAUSED', lost: 'MISSION COMPLETE' }[state.status];
    if (!overlay.hidden) {
      const text = {
        ready: ['空域，交给你了。', '驾驶战机，避开弹幕，击落来袭敌机。', '开始飞行 →'],
        paused: ['稍作盘旋。', '战场已暂停，准备好了就继续。', '继续飞行 →'],
        lost: ['这一次，也很精彩。', `最终得分 ${state.score}，坚持到了第 ${state.wave} 波。`, '再次出击 →']
      }[state.status];
      document.getElementById('overlay-title').textContent = text[0];
      document.getElementById('overlay-text').textContent = text[1];
      start.textContent = text[2];
    }
    if (!previous || state.status !== previous.status || state.lives !== previous.lives || state.wave !== previous.wave) {
      document.getElementById('announcement').textContent = `${{ ready: '准备开始', playing: '飞行中', paused: '已暂停', lost: '游戏结束' }[state.status]}，第 ${state.wave} 波，剩余 ${state.lives} 格生命，得分 ${state.score}`;
    }
    if (previous && previous.status !== 'lost' && state.status === 'lost') start.focus({ preventScroll: true });
  }

  function clearInput() {
    keys.clear(); heldDirections.clear(); pointerDirections.clear(); target = null; gesture = null;
  }

  function change(next) {
    const previous = state;
    state = next;
    accumulator = 0; lastTime = null;
    clearInput(); updateHud(previous); draw();
    if (state.status === 'playing') canvas.focus({ preventScroll: true });
  }
  function resume() { change(game.togglePause(state.status === 'lost' ? game.newGame() : state)); }
  start.addEventListener('click', resume);
  pause.addEventListener('click', resume);
  document.getElementById('restart').addEventListener('click', () => change(game.togglePause(game.newGame())));
  function directionOf(event) { return directions[event.key] || directions[event.key.toLowerCase()]; }
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    const direction = directionOf(event);
    if (direction) { event.preventDefault(); keys.add(event.key); target = null; }
    else if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
      event.preventDefault(); if (!event.repeat) resume();
    }
  });
  document.addEventListener('keyup', event => { keys.delete(event.key); });
  function position(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * game.WIDTH / rect.width, y: (event.clientY - rect.top) * game.HEIGHT / rect.height };
  }
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || state.status !== 'playing') return;
    const point = position(event);
    gesture = { id: event.pointerId, dx: state.player.x - point.x, dy: state.player.y - point.y };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const point = position(event);
    target = { x: point.x + gesture.dx, y: point.y + gesture.dy };
  });
  function endDrag() { gesture = null; target = null; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  document.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      pointerDirections.set(event.pointerId, button.dataset.direction);
      target = null;
      button.setPointerCapture(event.pointerId);
    });
    const release = event => { pointerDirections.delete(event.pointerId); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', event => {
      if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); heldDirections.add(button.dataset.direction); target = null; }
    });
    button.addEventListener('keyup', () => heldDirections.delete(button.dataset.direction));
    button.addEventListener('blur', () => heldDirections.delete(button.dataset.direction));
  });
  function autoPause() { clearInput(); if (state.status === 'playing') change(game.togglePause(state)); }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

  function frame(now) {
    if (lastTime === null) lastTime = now;
    accumulator += Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (state.status === 'playing') {
      const input = { target };
      keys.forEach(key => { const direction = directions[key] || directions[key.toLowerCase()]; if (direction) input[direction] = true; });
      heldDirections.forEach(direction => { input[direction] = true; });
      pointerDirections.forEach(direction => { input[direction] = true; });
      const previous = state;
      while (accumulator >= 1 / 60 && state.status === 'playing') {
        state = game.step(state, input, 1 / 60);
        accumulator -= 1 / 60;
      }
      if (state !== previous) updateHud(previous);
    } else accumulator = 0;
    draw(); requestAnimationFrame(frame);
  }
  updateHud(); draw(); requestAnimationFrame(frame);
})();
