'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../snake/game.js');
const playing = () => g.togglePause(g.newGame(() => 0));

test('开局三格蛇、零分、等待开始；食物不与蛇重叠', () => {
  const state = g.newGame(() => 0);
  assert.equal(state.snake.length, 3);
  assert.equal(state.score, 0);
  assert.equal(state.status, 'ready');
  assert.ok(!state.snake.some(cell => cell.x === state.food.x && cell.y === state.food.y));
  assert.strictEqual(g.tick(state), state);
});

test('每步前进一步、尾部移走、未吃食物不加分，输入状态不变', () => {
  const state = playing();
  const copy = structuredClone(state);
  const next = g.tick(state);
  assert.deepEqual(next.snake[0], { x: state.snake[0].x + 1, y: state.snake[0].y });
  assert.equal(next.snake.length, 3);
  assert.equal(next.score, 0);
  assert.deepEqual(next.snake[1], state.snake[0]);
  assert.deepEqual(state, copy);
});

test('吃食物后增长一格、加十分、重新生成食物且不占蛇身', () => {
  const state = playing();
  state.food = { x: 11, y: 10 };
  const next = g.tick(state, () => 0.999);
  assert.equal(next.score, 10);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], state.food);
  assert.ok(!next.snake.some(cell => cell.x === next.food.x && cell.y === next.food.y));
});

test('禁止反向及一帧内多次转弯，下一帧可继续转向', () => {
  const state = playing();
  assert.strictEqual(g.turn(state, 'left'), state);
  assert.strictEqual(g.turn(state, 'diagonal'), state);
  const queued = g.turn(state, 'up');
  assert.strictEqual(g.turn(queued, 'left'), queued);
  const next = g.tick(queued);
  assert.deepEqual(next.snake[0], { x: 10, y: 9 });
  assert.equal(g.turn(next, 'left').nextDirection, 'left');
});

test('四个边界均会结束游戏；结束后不再移动或转向', () => {
  for (const [direction, x, y] of [['right', 19, 10], ['left', 0, 10], ['up', 10, 0], ['down', 10, 19]]) {
    const state = { ...playing(), snake: [{ x, y }], direction, nextDirection: direction };
    const lost = g.tick(state);
    assert.equal(lost.status, 'lost');
    assert.strictEqual(g.tick(lost), lost);
    assert.strictEqual(g.turn(lost, 'up'), lost);
  }
});

test('撞到自己的中间身体会失败', () => {
  const state = { ...playing(), snake: [
    { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 },
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 1 }
  ], direction: 'right', nextDirection: 'down' };
  assert.equal(g.tick(state).status, 'lost');
});

test('允许进入同一步正在移走的尾格', () => {
  const state = { ...playing(), snake: [
    { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }
  ], direction: 'up', nextDirection: 'right' };
  const next = g.tick(state);
  assert.equal(next.status, 'playing');
  assert.deepEqual(next.snake[0], { x: 2, y: 1 });
  assert.equal(next.snake.length, 4);
});

test('暂停不移动、不接受方向，恢复后正常移动；重开独立状态', () => {
  const state = playing();
  const paused = g.togglePause(state);
  assert.equal(paused.status, 'paused');
  assert.strictEqual(g.tick(paused), paused);
  assert.strictEqual(g.turn(paused, 'up'), paused);
  assert.equal(g.tick(g.togglePause(paused)).status, 'playing');
  state.snake[0].x = 0;
  state.score = 100;
  const fresh = g.newGame(() => 0);
  assert.equal(fresh.score, 0);
  assert.equal(fresh.snake.length, 3);
  assert.equal(fresh.snake[0].x, 10);
});

test('食物生成覆盖全部空位边界，满盘不会死循环或采样', () => {
  const body = [{ x: 0, y: 0 }];
  assert.deepEqual(g.spawnFood(body, 2, () => 0), { x: 1, y: 0 });
  assert.deepEqual(g.spawnFood(body, 2, () => 0.999), { x: 1, y: 1 });
  assert.equal(g.spawnFood([{ x: 0, y: 0 }], 1, () => { throw Error('不应采样'); }), null);
});

test('吃掉最后一个空格的食物时胜利', () => {
  const state = { size: 2, snake: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    food: { x: 1, y: 0 }, direction: 'up', nextDirection: 'right', score: 0, status: 'playing' };
  const next = g.tick(state);
  assert.equal(next.status, 'won');
  assert.equal(next.food, null);
  assert.equal(next.snake.length, 4);
  assert.equal(next.score, 10);
  assert.strictEqual(g.tick(next), next);
});
