(function () {
  'use strict';
  const game = window.SnakeGame;
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const pause = document.getElementById('pause');
  const start = document.getElementById('start');
  const announcement = document.getElementById('announcement');
  const labels = { ready: '准备出发', playing: '正在前进', paused: '已暂停', lost: '本局结束', won: '占满棋盘！' };
  const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
  let state = game.newGame();
  let best = 0;
  let gesture = null;
  try { best = Number(localStorage.getItem('snake-best')) || 0; } catch { /* Storage can be unavailable for local files. */ }

  function render() {
    const cell = canvas.width / state.size;
    ctx.fillStyle = '#1b2c21';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#26382a';
    ctx.lineWidth = 1;
    for (let i = 1; i < state.size; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
    }
    if (state.food) {
      ctx.fillStyle = '#ed9b64';
      ctx.beginPath(); ctx.arc((state.food.x + .5) * cell, (state.food.y + .5) * cell, cell * .3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5c28c';
      ctx.fillRect((state.food.x + .48) * cell, (state.food.y + .12) * cell, cell * .08, cell * .18);
    }
    state.snake.forEach((part, i) => {
      ctx.fillStyle = i === 0 ? '#d4efab' : (i % 2 === 0 ? '#8bb56c' : '#9dc77b');
      ctx.fillRect(part.x * cell + 2, part.y * cell + 2, cell - 4, cell - 4);
    });
    const head = state.snake[0];
    const vertical = state.direction === 'up' || state.direction === 'down';
    const forward = state.direction === 'up' || state.direction === 'left' ? .3 : .7;
    ctx.fillStyle = '#263e25';
    for (const side of [.3, .7]) {
      const x = head.x + (vertical ? side : forward);
      const y = head.y + (vertical ? forward : side);
      ctx.fillRect(x * cell - 2, y * cell - 2, 4, 4);
    }
    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem('snake-best', String(best)); } catch { /* Gameplay works without storage. */ }
    }
    document.getElementById('score').textContent = state.score;
    document.getElementById('best').textContent = best;
    document.getElementById('status').textContent = labels[state.status];
    pause.disabled = !['playing', 'paused'].includes(state.status);
    pause.innerHTML = state.status === 'paused' ? '继续 <kbd>SPACE</kbd>' : '暂停 <kbd>SPACE</kbd>';
    overlay.hidden = state.status === 'playing';
    if (!overlay.hidden) {
      const text = {
        ready: ['下一口，会更长。', '吃掉橙色食物，避开墙壁和自己。', '开始游戏'],
        paused: ['歇一口气。', '准备好了，就继续前进。', '继续游戏'],
        lost: ['这次，差一点。', `本局得分 ${state.score}，再试试另一条路线。`, '再来一局'],
        won: ['你占满了整个世界！', `最终得分 ${state.score}，漂亮的一局。`, '再来一局']
      }[state.status];
      document.getElementById('overlay-title').textContent = text[0];
      document.getElementById('overlay-text').textContent = text[1];
      start.textContent = text[2] + ' →';
    }
  }

  function update(next) {
    const previous = state;
    state = next;
    render();
    if (previous.status !== state.status || previous.score !== state.score) {
      announcement.textContent = labels[state.status] + '，得分 ' + state.score;
    }
    if (previous.status !== state.status && ['lost', 'won'].includes(state.status)) start.focus({ preventScroll: true });
  }

  function resume() {
    if (state.status === 'lost' || state.status === 'won') state = game.newGame();
    update(game.togglePause(state));
    if (state.status === 'playing') canvas.focus({ preventScroll: true });
  }

  function steer(direction) { update(game.turn(state, direction)); }
  start.addEventListener('click', resume);
  pause.addEventListener('click', resume);
  document.getElementById('restart').addEventListener('click', () => {
    update(game.togglePause(game.newGame()));
    canvas.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('click', () => steer(button.dataset.direction));
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (keys[event.key] || keys[event.key.toLowerCase()]) {
      event.preventDefault(); steer(keys[event.key] || keys[event.key.toLowerCase()]);
    } else if (event.code === 'Space' && event.target.tagName !== 'BUTTON') {
      event.preventDefault(); if (!event.repeat) resume();
    }
  });
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  canvas.addEventListener('pointercancel', () => { gesture = null; });
  canvas.addEventListener('lostpointercapture', () => { gesture = null; });
  function autoPause() { if (state.status === 'playing') update(game.togglePause(state)); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('blur', autoPause);
  setInterval(() => { if (state.status === 'playing') update(game.tick(state)); }, 140);
  render();
})();
