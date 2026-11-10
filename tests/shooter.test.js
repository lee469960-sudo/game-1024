'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../shooter/game.js');
const playing = () => ({ ...g.togglePause(g.newGame()), fireCooldown: 10, spawnCooldown: 10 });
const enemy = (overrides = {}) => ({ x: 240, y: 200, w: 30, h: 30, hp: 1, maxHp: 1, value: 100, speed: 0, vx: 0, fire: 10, ...overrides });
const bullet = (overrides = {}) => ({ x: 240, y: 210, w: 5, h: 18, ...overrides });

test('开局等待开始、三格生命、空弹幕；重开独立状态', () => {
  const state = g.newGame();
  assert.equal(state.status, 'ready');
  assert.equal(state.lives, 3);
  assert.equal(state.score, 0);
  assert.equal(state.wave, 1);
  assert.deepEqual(state.enemies, []);
  assert.strictEqual(g.step(state), state);
  state.player.x = 0;
  state.score = 300;
  assert.equal(g.newGame().player.x, 240);
  assert.equal(g.newGame().score, 0);
});

test('移动速度、斜向速度归一化、四周边界和触摸目标限制', () => {
  const state = playing();
  const straight = g.step(state, { right: true }, 0.05);
  assert.equal(straight.player.x, state.player.x + 15);
  const diagonal = g.step(state, { right: true, up: true }, 0.05);
  assert.ok(Math.abs(Math.hypot(diagonal.player.x - state.player.x, diagonal.player.y - state.player.y) - 15) < 1e-9);
  const topLeft = g.step(state, { target: { x: -999, y: -999 } });
  const bottomRight = g.step(state, { target: { x: 999, y: 999 } });
  assert.equal(topLeft.player.x, 18);
  assert.equal(topLeft.player.y, 21);
  assert.equal(bottomRight.player.x, 462);
  assert.equal(bottomRight.player.y, 659);
});

test('自动射击及冷却，子弹向上移动', () => {
  const state = { ...playing(), fireCooldown: 0 };
  const fired = g.step(state);
  assert.equal(fired.bullets.length, 1);
  assert.ok(fired.bullets[0].y < state.player.y);
  const later = g.step(fired);
  assert.equal(later.bullets.length, 1);
  assert.ok(later.bullets[0].y < fired.bullets[0].y);
});

test('普通敌机一发击落并得 100 分，不重复计分', () => {
  const state = { ...playing(), enemies: [enemy()], bullets: [bullet(), bullet()] };
  const next = g.step(state);
  assert.equal(next.score, 100);
  assert.equal(next.enemies.length, 0);
  assert.equal(next.bullets.length, 1);
  assert.equal(next.bursts.length, 1);
  assert.equal(g.step(next).score, 100);
});

test('重型敌机需三发，击落后得 300 分', () => {
  let state = { ...playing(), enemies: [enemy({ hp: 3, maxHp: 3, value: 300 })] };
  for (let i = 0; i < 3; i += 1) {
    state = g.step({ ...state, bullets: [bullet()] });
    assert.equal(state.score, i === 2 ? 300 : 0);
  }
  assert.equal(state.enemies.length, 0);
});

test('敌机生成覆盖类型和边界，向下移动并向玩家射击', () => {
  for (const [sample, maxHp] of [[0, 3], [0.999, 1]]) {
    const next = g.step({ ...playing(), spawnCooldown: 0 }, {}, 1 / 60, () => sample);
    assert.equal(next.enemies.length, 1);
    assert.equal(next.enemies[0].maxHp, maxHp);
    assert.ok(next.enemies[0].x >= next.enemies[0].w / 2);
    assert.ok(next.enemies[0].x <= g.WIDTH - next.enemies[0].w / 2);
  }
  const state = { ...playing(), enemies: [enemy({ x: 200, speed: 80, fire: 0 })] };
  const next = g.step(state);
  assert.ok(next.enemies[0].y > 200);
  assert.equal(next.enemyBullets.length, 1);
  assert.ok(next.enemyBullets[0].vx > 0);
  assert.ok(next.enemyBullets[0].vy > 0);
});

test('同帧多发命中只扣一格生命，短暂无敌避免连续掉血', () => {
  const state = playing();
  const shot = { ...state.player, vx: 0, vy: 0, w: 8, h: 8 };
  const next = g.step({ ...state, enemyBullets: [shot, { ...shot }] });
  assert.equal(next.lives, 2);
  assert.equal(next.enemyBullets.length, 0);
  assert.ok(next.invulnerable > 0);
  const protectedState = g.step({ ...next, enemyBullets: [{ ...shot }] });
  assert.equal(protectedState.lives, 2);
  assert.ok(protectedState.invulnerable < next.invulnerable);
});

test('敌机撞击扣生命、清除敌机；最后一格耗尽结束且不可继续', () => {
  const state = playing();
  const lost = g.step({ ...state, lives: 1, enemies: [enemy({ x: state.player.x, y: state.player.y })] });
  assert.equal(lost.lives, 0);
  assert.equal(lost.status, 'lost');
  assert.equal(lost.enemies.length, 0);
  assert.strictEqual(g.step(lost, { left: true }), lost);
  assert.strictEqual(g.togglePause(lost), lost);
});

test('暂停冻结计时、子弹及敌机，恢复继续', () => {
  const state = { ...playing(), bullets: [bullet()], enemies: [enemy()] };
  const paused = g.togglePause(state);
  assert.equal(paused.status, 'paused');
  assert.strictEqual(g.step(paused, { right: true }), paused);
  const resumed = g.step(g.togglePause(paused));
  assert.equal(resumed.status, 'playing');
  assert.ok(resumed.time > state.time);
});

test('每 20 秒提高波次，生成间隔随波次缩短', () => {
  const first = g.step({ ...playing(), spawnCooldown: 0 }, {}, 0.02, () => 0.5);
  const nextWave = g.step({ ...playing(), time: 19.99, spawnCooldown: 0 }, {}, 0.02, () => 0.5);
  assert.equal(nextWave.wave, 2);
  assert.ok(nextWave.spawnCooldown < first.spawnCooldown);
  assert.ok(nextWave.enemies[0].speed > first.enemies[0].speed);
});

test('清理离场物体及过期爆炸，避免实体积累', () => {
  const state = { ...playing(), bullets: [bullet({ y: -30 })], enemies: [enemy({ y: 800 })],
    enemyBullets: [{ x: 500, y: 800, w: 8, h: 8, vx: 0, vy: 100 }], bursts: [{ x: 0, y: 0, life: 0.001 }] };
  const next = g.step(state);
  assert.equal(next.bullets.length, 0);
  assert.equal(next.enemies.length, 0);
  assert.equal(next.enemyBullets.length, 0);
  assert.equal(next.bursts.length, 0);
});

test('模拟不修改输入状态，过大时间步受限，零和无效时间不推进', () => {
  const state = { ...playing(), bullets: [bullet()], enemies: [enemy()] };
  const snapshot = structuredClone(state);
  g.step(state, { left: true }, 100);
  assert.deepEqual(state, snapshot);
  assert.equal(g.step(state, {}, 100).time, 0.05);
  for (const dt of [0, -1, NaN, Infinity]) assert.strictEqual(g.step(state, {}, dt), state);
});
