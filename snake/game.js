(function (root) {
  'use strict';
  const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const same = (a, b) => a.x === b.x && a.y === b.y;

  function spawnFood(snake, size, random = Math.random) {
    const occupied = new Set(snake.map(cell => cell.y * size + cell.x));
    const free = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!occupied.has(y * size + x)) free.push({ x, y });
      }
    }
    return free.length ? free[Math.floor(random() * free.length)] : null;
  }

  function newGame(random = Math.random, size = 20) {
    const center = Math.floor(size / 2);
    const snake = [0, 1, 2].map(offset => ({ x: center - offset, y: center }));
    return { size, snake, food: spawnFood(snake, size, random), direction: 'right', nextDirection: 'right', score: 0, status: 'ready' };
  }

  function turn(state, direction) {
    if (!vectors[direction] || !['ready', 'playing'].includes(state.status)) return state;
    // Accept at most one turn per tick, so fast key presses cannot reverse into the neck.
    if (state.nextDirection !== state.direction) return state;
    const [dx, dy] = vectors[state.direction];
    const [nx, ny] = vectors[direction];
    if (dx + nx === 0 && dy + ny === 0) return state;
    return { ...state, nextDirection: direction };
  }

  function togglePause(state) {
    if (state.status === 'ready' || state.status === 'paused') return { ...state, status: 'playing' };
    if (state.status === 'playing') return { ...state, status: 'paused' };
    return state;
  }

  function tick(state, random = Math.random) {
    if (state.status !== 'playing') return state;
    const direction = state.nextDirection;
    const [dx, dy] = vectors[direction];
    const head = { x: state.snake[0].x + dx, y: state.snake[0].y + dy };
    const eating = state.food !== null && same(head, state.food);
    // The tail vacates its cell unless eating; entering that cell is legal.
    const body = eating ? state.snake : state.snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= state.size || head.y >= state.size || body.some(cell => same(cell, head))) {
      return { ...state, status: 'lost' };
    }
    const snake = [head, ...state.snake];
    if (!eating) snake.pop();
    const food = eating ? spawnFood(snake, state.size, random) : state.food;
    return { ...state, snake, food, direction, nextDirection: direction, score: state.score + (eating ? 10 : 0), status: food === null ? 'won' : 'playing' };
  }

  const api = { newGame, spawnFood, turn, togglePause, tick };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SnakeGame = api;
})(globalThis);
