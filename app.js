(function () {
  'use strict';
  const game = window.Game1024;
  const board = document.getElementById('board');
  const result = document.getElementById('result');
  const again = document.getElementById('again');
  const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  let state;
  let gesture = null;
  const tiles = Array.from({ length: 16 }, () => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    board.appendChild(tile);
    return tile;
  });

  function render() {
    state.board.flat().forEach((value, i) => {
      tiles[i].textContent = value || '';
      tiles[i].dataset.value = value;
      tiles[i].setAttribute('aria-label', `第 ${Math.floor(i / 4) + 1} 行，第 ${i % 4 + 1} 列：${value || '空'}`);
    });
    document.getElementById('score').textContent = state.score;
    result.hidden = state.status === 'playing';
    let message = '当前得分：' + state.score;
    if (!result.hidden) {
      const won = state.status === 'won';
      const title = won ? '漂亮，1024！' : '这局到这里了';
      const description = won ? '你成功合成了 1024。' : '没有可移动的数字了，再来一次吧。';
      document.getElementById('result-title').textContent = title;
      document.getElementById('result-description').textContent = description;
      message = title + '。' + description + ' 最终得分：' + state.score;
      again.focus({ preventScroll: true });
    }
    document.getElementById('announcement').textContent = message;
  }

  function restart(focus = true) {
    state = game.newGame();
    gesture = null;
    render();
    if (focus) board.focus({ preventScroll: true });
  }

  function turn(direction) {
    if (state.status !== 'playing') return;
    state = game.playTurn(state, direction);
    render();
  }

  document.addEventListener('keydown', event => {
    if (!keys[event.key] || event.altKey || event.ctrlKey || event.metaKey ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault();
    turn(keys[event.key]);
  });
  board.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || state.status !== 'playing') return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    gesture = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  board.addEventListener('pointercancel', () => { gesture = null; });
  board.addEventListener('lostpointercapture', () => { gesture = null; });
  document.getElementById('restart').addEventListener('click', () => restart());
  again.addEventListener('click', () => restart());
  restart(false);
})();
