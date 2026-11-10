(function (root) {
  'use strict';
  const SIZE = 4;
  const emptyBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  function mergeLine(line) {
    const values = line.filter(Boolean);
    const result = [];
    let score = 0;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] === values[i + 1]) {
        result.push(values[i] * 2);
        score += values[i] * 2;
        i += 1;
      } else result.push(values[i]);
    }
    while (result.length < SIZE) result.push(0);
    return { line: result, score };
  }

  function move(board, direction) {
    if (!['left', 'right', 'up', 'down'].includes(direction)) throw new RangeError('Invalid direction');
    const result = emptyBoard();
    let score = 0;
    for (let line = 0; line < SIZE; line += 1) {
      const coordinates = Array.from({ length: SIZE }, (_, offset) => {
        const position = direction === 'right' || direction === 'down' ? SIZE - 1 - offset : offset;
        return direction === 'left' || direction === 'right' ? [line, position] : [position, line];
      });
      const merged = mergeLine(coordinates.map(([r, c]) => board[r][c]));
      score += merged.score;
      coordinates.forEach(([r, c], i) => { result[r][c] = merged.line[i]; });
    }
    return { board: result, score, moved: result.some((row, r) => row.some((value, c) => value !== board[r][c])) };
  }

  function spawnTile(board, random = Math.random) {
    const result = board.map(row => row.slice());
    const spaces = [];
    board.forEach((row, r) => row.forEach((value, c) => { if (!value) spaces.push([r, c]); }));
    if (spaces.length) {
      const [r, c] = spaces[Math.floor(random() * spaces.length)];
      result[r][c] = random() < 0.9 ? 2 : 4;
    }
    return result;
  }

  function getStatus(board) {
    if (board.some(row => row.some(value => value >= 1024))) return 'won';
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (!board[r][c] || (r < SIZE - 1 && board[r][c] === board[r + 1][c]) ||
            (c < SIZE - 1 && board[r][c] === board[r][c + 1])) return 'playing';
      }
    }
    return 'lost';
  }

  function newGame(random = Math.random) {
    return { board: spawnTile(spawnTile(emptyBoard(), random), random), score: 0, status: 'playing' };
  }

  function playTurn(state, direction, random = Math.random) {
    if (state.status !== 'playing') return state;
    const moved = move(state.board, direction);
    if (!moved.moved) return { ...state, status: getStatus(state.board) };
    const board = spawnTile(moved.board, random);
    return { board, score: state.score + moved.score, status: getStatus(board) };
  }

  const api = { emptyBoard, mergeLine, move, spawnTile, getStatus, newGame, playTurn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Game1024 = api;
})(globalThis);
