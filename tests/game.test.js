'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../game.js');
const rowBoard = row => [row, ...g.emptyBoard().slice(1)];
const occupied = board => board.flat().filter(Boolean).length;
const blocked = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]];

test('初始 4×4 棋盘，两枚数字，分数为零；重开不共享状态', () => {
  const state = g.newGame(() => 0);
  assert.equal(state.board.length, 4);
  assert.ok(state.board.every(row => row.length === 4));
  assert.equal(occupied(state.board), 2);
  assert.equal(state.score, 0);
  assert.equal(state.status, 'playing');
  state.board[0][0] = 512;
  const fresh = g.newGame(() => 0);
  assert.equal(fresh.board[0][0], 2);
  assert.equal(fresh.score, 0);
});

test('压缩空格，单回合禁止链式合并，合并结果累计计分', () => {
  for (const [input, line, score] of [
    [[0, 2, 0, 2], [4, 0, 0, 0], 4],
    [[2, 2, 2, 2], [4, 4, 0, 0], 8],
    [[2, 2, 4, 0], [4, 4, 0, 0], 4],
    [[4, 4, 4, 0], [8, 4, 0, 0], 8]
  ]) assert.deepEqual(g.mergeLine(input), { line, score });
});

test('左右合并从目标边缘开始，不修改原棋盘', () => {
  const board = rowBoard([2, 2, 2, 0]);
  const copy = structuredClone(board);
  assert.deepEqual(g.move(board, 'left'), { board: rowBoard([4, 2, 0, 0]), score: 4, moved: true });
  assert.deepEqual(g.move(board, 'right'), { board: rowBoard([0, 0, 2, 4]), score: 4, moved: true });
  assert.deepEqual(board, copy);
});

test('上下正确合并多列并累计分数', () => {
  const board = [[2, 4, 0, 0], [2, 4, 0, 0], [2, 4, 0, 0], [0, 0, 0, 0]];
  assert.deepEqual(g.move(board, 'up'), {
    board: [[4, 8, 0, 0], [2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], score: 12, moved: true
  });
  assert.deepEqual(g.move(board, 'down'), {
    board: [[0, 0, 0, 0], [0, 0, 0, 0], [2, 4, 0, 0], [4, 8, 0, 0]], score: 12, moved: true
  });
});

test('随机生成只占空位，覆盖 2/4 分界及满盘', () => {
  const samples = [0.999, 0.9];
  const board = rowBoard([8, 0, 0, 0]);
  const next = g.spawnTile(board, () => samples.shift());
  assert.equal(next[3][3], 4);
  assert.equal(next[0][0], 8);
  assert.equal(occupied(next), 2);
  assert.equal(occupied(board), 1);
  assert.equal(g.spawnTile(g.emptyBoard(), () => 0)[0][0], 2);
  assert.deepEqual(g.spawnTile(blocked, () => { throw Error('不应生成'); }), blocked);
});

test('无效回合不生成数字；有效合并只生成一个数字并累计得分', () => {
  const state = { board: rowBoard([2, 0, 0, 0]), score: 10, status: 'playing' };
  assert.deepEqual(g.playTurn(state, 'left', () => { throw Error('不应采样'); }), state);
  const next = g.playTurn({ ...state, board: rowBoard([2, 2, 0, 0]) }, 'left', () => 0);
  assert.equal(occupied(next.board), 2);
  assert.equal(next.board[0][0], 4);
  assert.equal(next.board.flat().reduce((sum, value) => sum + value, 0), 6);
  assert.equal(next.score, 14);
});

test('空位、横向合并、纵向合并可继续，满盘无合法移动才失败', () => {
  assert.equal(g.getStatus(g.emptyBoard()), 'playing');
  assert.equal(g.getStatus(blocked), 'lost');
  const horizontal = structuredClone(blocked);
  horizontal[0][1] = 2;
  assert.equal(g.getStatus(horizontal), 'playing');
  const vertical = structuredClone(blocked);
  vertical[1][0] = 2;
  assert.equal(g.getStatus(vertical), 'playing');
  for (const direction of ['left', 'right', 'up', 'down']) assert.equal(g.move(blocked, direction).moved, false);
});

test('合成 1024 胜利，累计得分，终局停止移动', () => {
  const state = { board: rowBoard([512, 512, 0, 0]), score: 12, status: 'playing' };
  const won = g.playTurn(state, 'left', () => 0);
  assert.equal(won.status, 'won');
  assert.equal(won.score, 1036);
  assert.equal(won.board[0][0], 1024);
  assert.strictEqual(g.playTurn(won, 'right'), won);
});

test('填入最后一个空位后失败，重开清零', () => {
  const board = structuredClone(blocked);
  board[0] = [0, 2, 4, 2];
  const lost = g.playTurn({ board, score: 20, status: 'playing' }, 'left', () => 0.95);
  assert.equal(lost.status, 'lost');
  assert.strictEqual(g.playTurn(lost, 'up'), lost);
  const fresh = g.newGame(() => 0);
  assert.equal(fresh.status, 'playing');
  assert.equal(fresh.score, 0);
  assert.equal(occupied(fresh.board), 2);
});

test('穷举四格 0/2/4/8 组合，四方向移动数字总和守恒', () => {
  const values = [0, 2, 4, 8];
  const sum = board => board.flat().reduce((total, value) => total + value, 0);
  for (let code = 0; code < 256; code += 1) {
    const board = rowBoard(Array.from({ length: 4 }, (_, i) => values[(code >> (2 * i)) & 3]));
    for (const direction of ['left', 'right', 'up', 'down']) assert.equal(sum(g.move(board, direction).board), sum(board));
  }
});
