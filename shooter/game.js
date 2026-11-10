(function (root) {
  'use strict';
  const WIDTH = 480;
  const HEIGHT = 680;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const hit = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

  function newGame() {
    return {
      player: { x: WIDTH / 2, y: HEIGHT - 80, w: 28, h: 34 },
      bullets: [], enemies: [], enemyBullets: [], bursts: [],
      lives: 3, score: 0, wave: 1, time: 0,
      fireCooldown: 0, spawnCooldown: 0.5, invulnerable: 0, status: 'ready'
    };
  }

  function togglePause(state) {
    if (state.status === 'ready' || state.status === 'paused') return { ...state, status: 'playing' };
    if (state.status === 'playing') return { ...state, status: 'paused' };
    return state;
  }

  function step(state, input = {}, dt = 1 / 60, random = Math.random) {
    if (state.status !== 'playing') return state;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    if (!dt) return state;
    const next = {
      ...state, player: { ...state.player },
      bullets: state.bullets.map(b => ({ ...b })),
      enemies: state.enemies.map(e => ({ ...e })),
      enemyBullets: state.enemyBullets.map(b => ({ ...b })),
      bursts: state.bursts.map(b => ({ ...b, life: b.life - dt })).filter(b => b.life > 0),
      time: state.time + dt, invulnerable: Math.max(0, state.invulnerable - dt)
    };
    next.wave = Math.floor(next.time / 20) + 1;
    const p = next.player;
    if (input.target) {
      p.x = input.target.x;
      p.y = input.target.y;
    } else {
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const scale = dx && dy ? Math.SQRT1_2 : 1;
      p.x += dx * 300 * scale * dt;
      p.y += dy * 300 * scale * dt;
    }
    p.x = clamp(p.x, p.w / 2 + 4, WIDTH - p.w / 2 - 4);
    p.y = clamp(p.y, p.h / 2 + 4, HEIGHT - p.h / 2 - 4);

    next.fireCooldown -= dt;
    if (next.fireCooldown <= 0) {
      next.bullets.push({ x: p.x, y: p.y - 23, w: 5, h: 18 });
      next.fireCooldown += 0.16;
    }
    next.bullets.forEach(b => { b.y -= 620 * dt; });
    next.enemyBullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
    next.spawnCooldown -= dt;
    if (next.spawnCooldown <= 0) {
      const heavy = random() < 0.22;
      const size = heavy ? 44 : 30;
      next.enemies.push({
        x: size + random() * (WIDTH - 2 * size), y: -size,
        w: size, h: size, hp: heavy ? 3 : 1, maxHp: heavy ? 3 : 1,
        value: heavy ? 300 : 100, speed: (heavy ? 52 : 85) + Math.min(next.wave, 15) * 9,
        vx: (random() - 0.5) * 60, fire: 1 + random() * 1.5
      });
      next.spawnCooldown += Math.max(0.28, 0.95 - next.wave * 0.055);
    }
    next.enemies.forEach(e => {
      e.y += e.speed * dt;
      e.x += e.vx * dt;
      if (e.x < e.w / 2 || e.x > WIDTH - e.w / 2) {
        e.x = clamp(e.x, e.w / 2, WIDTH - e.w / 2);
        e.vx *= -1;
      }
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 0 && e.y < HEIGHT - 60) {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const speed = 145 + Math.min(next.wave, 15) * 7;
        next.enemyBullets.push({ x: e.x, y: e.y + e.h / 2, w: 8, h: 8, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
        e.fire = Math.max(0.7, 2.3 - next.wave * 0.08);
      }
    });

    next.bullets = next.bullets.filter(b => {
      if (b.y < -20) return false;
      const enemy = next.enemies.find(e => e.hp > 0 && hit(b, e));
      if (!enemy) return true;
      enemy.hp -= 1;
      if (enemy.hp === 0) {
        next.score += enemy.value;
        next.bursts.push({ x: enemy.x, y: enemy.y, life: 0.4 });
      }
      return false;
    });
    let damaged = false;
    next.enemies = next.enemies.filter(e => {
      if (e.hp <= 0 || e.y > HEIGHT + e.h) return false;
      if (!hit(p, e)) return true;
      damaged = true;
      next.bursts.push({ x: e.x, y: e.y, life: 0.4 });
      return false;
    });
    next.enemyBullets = next.enemyBullets.filter(b => {
      if (b.y < -20 || b.y > HEIGHT + 20 || b.x < -20 || b.x > WIDTH + 20) return false;
      if (!hit(p, b)) return true;
      damaged = true;
      return false;
    });
    if (damaged && next.invulnerable === 0) {
      next.lives = Math.max(0, next.lives - 1);
      next.invulnerable = 1.5;
      next.bursts.push({ x: p.x, y: p.y, life: 0.4 });
      if (next.lives === 0) next.status = 'lost';
    }
    return next;
  }

  const api = { WIDTH, HEIGHT, newGame, togglePause, step, hit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShooterGame = api;
})(globalThis);
