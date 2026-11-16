// Enemies: the frost wraiths. Each walks its path's waypoints, weaves a
// little if it is a wisp, and when it reaches the hearth ring it stops and
// chews warmth until it is killed or the hearth dies. Waves are built from
// WAVE_DEFS: a shuffled spawn queue dealt out on an interval.

import { ENEMIES, HEARTH, WAVE_DEFS } from './config.js';
import { PATHS } from './world.js';
import { mulberry32 } from './random.js';

let nextId = 1;

export function makeEnemy(kind, pathIndex, hpScale, rng) {
  const def = ENEMIES[kind];
  const path = PATHS[pathIndex];
  return {
    id: nextId++,
    kind,
    name: def.name,
    x: path[0].x,
    y: path[0].y,
    pathIndex,
    wp: 1, // next waypoint
    hp: def.hp * hpScale,
    hpMax: def.hp * hpScale,
    speed: def.speed * (0.92 + rng() * 0.16),
    reward: def.reward,
    damage: def.damage,
    radius: def.radius,
    color: def.color,
    dark: def.dark,
    slowUntil: 0,
    slowFactor: 1,
    burnUntil: 0,
    burnDps: 0,
    attackTimer: 0,
    wobble: rng() * Math.PI * 2,
    wobbleSpeed: kind === 'wisp' ? 3.2 : 0,
    flash: 0, // hit flash timer
    dead: false,
    reached: false,
  };
}

export function createWaves() {
  return {
    wave: 0, // waves cleared
    spawning: false,
    spawnQueue: [],
    spawnTimer: 0,
    interval: 1,
    betweenTimer: 0, // countdown to the next wave once the field is clear
    inProgress: false,
    bossSpawned: false,
  };
}

// Build the spawn queue for wave n (1-based): kinds shuffled, dealt from
// the three gates round-robin so no gate is ever empty.
export function startWave(waves, n, rng) {
  const def = WAVE_DEFS[n - 1];
  const kinds = [];
  for (let i = 0; i < def.shiver; i++) kinds.push('shiver');
  for (let i = 0; i < def.rime; i++) kinds.push('rime');
  for (let i = 0; i < def.wisp; i++) kinds.push('wisp');
  for (let i = 0; i < (def.boss || 0); i++) kinds.push('boss');
  // Shuffle, but keep the boss last so it walks in behind its escort.
  const boss = kinds.filter((k) => k === 'boss');
  const rest = kinds.filter((k) => k !== 'boss');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const queue = [...rest, ...boss];
  waves.wave = n;
  waves.spawnQueue = queue.map((kind, i) => ({
    kind,
    gate: i % 3,
    delay: i * def.interval,
  }));
  waves.spawnTimer = 0;
  waves.interval = def.interval;
  waves.spawning = true;
  waves.inProgress = true;
  waves.betweenTimer = 0;
  waves.hpScale = def.hpScale;
  return def;
}

export function updateEnemies(state, dt, time) {
  const { enemies, waves, rng } = state;
  // Deal the spawn queue.
  if (waves.spawning) {
    waves.spawnTimer += dt;
    while (waves.spawnQueue.length > 0 && waves.spawnQueue[0].delay <= waves.spawnTimer) {
      const s = waves.spawnQueue.shift();
      enemies.push(makeEnemy(s.kind, s.gate, waves.hpScale, rng));
      if (s.kind === 'boss') state.onBossSpawned && state.onBossSpawned();
    }
    if (waves.spawnQueue.length === 0) waves.spawning = false;
  }

  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    // Burn damage over time.
    if (e.burnUntil > time && e.burnDps > 0) {
      e.hp -= e.burnDps * dt;
      if (e.hp <= 0) {
        killEnemy(state, e, 'burn');
        continue;
      }
    }
    // Slow expiry.
    if (e.slowUntil < time) e.slowFactor = 1;

    if (e.reached) {
      // The hearth fire burns whatever reaches the ring: nothing that
      // gets here is immortal, but it still bites while it burns.
      e.hp -= 8 * dt;
      if (e.hp <= 0) {
        killEnemy(state, e, 'burn');
        continue;
      }
      // Chew the hearth: one bite per second.
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = 1;
        state.warmth -= e.damage;
        state.onHearthHit && state.onHearthHit(e);
        if (state.warmth <= 0) {
          state.warmth = 0;
          state.gameOver = true;
        }
      }
      continue;
    }

    // Walk the path.
    const path = PATHS[e.pathIndex];
    const target = path[e.wp];
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.hypot(dx, dy);
    const speed = e.speed * e.slowFactor;
    const step = speed * dt;
    if (dist <= step) {
      e.x = target.x;
      e.y = target.y;
      e.wp++;
      if (e.wp >= path.length) {
        // Reached the ring: stop and attack.
        e.reached = true;
        e.attackTimer = 0.4;
        continue;
      }
    } else {
      e.x += (dx / dist) * step;
      e.y += (dy / dist) * step;
    }
    // Wisps weave sideways as they walk.
    if (e.wobbleSpeed > 0) {
      e.wobble += dt * e.wobbleSpeed;
      e.x += Math.cos(e.wobble) * 14 * dt;
      e.y += Math.sin(e.wobble) * 10 * dt;
    }
  }

  // Remove the dead.
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead) enemies.splice(i, 1);
  }

  // Wave cleared: nothing spawning and nothing alive.
  if (waves.inProgress && !waves.spawning && enemies.length === 0) {
    waves.inProgress = false;
    state.onWaveCleared && state.onWaveCleared(waves.wave);
  }
}

export function killEnemy(state, e, cause) {
  if (e.dead) return;
  // The Frost King has two acts: the first killing blow only breaks his
  // crown — he revives at half health and bursts into shiverlings. No
  // reward is paid until the final blow.
  if (e.kind === 'boss' && !e.splitDone && cause !== 'spawn') {
    e.splitDone = true;
    e.hp = e.hpMax * 0.5;
    e.flash = 0.2;
    state.onBossSplit && state.onBossSplit(e);
    for (let i = 0; i < 3; i++) {
      const m = makeEnemy('shiver', e.pathIndex, state.waves.hpScale, state.rng);
      m.x = e.x + (state.rng() - 0.5) * 60;
      m.y = e.y + (state.rng() - 0.5) * 60;
      m.wp = e.wp;
      state.enemies.push(m);
    }
    return;
  }
  e.dead = true;
  state.embers += e.reward;
  state.score += 10;
  state.kills++;
  state.onEnemyKilled && state.onEnemyKilled(e, cause);
  // The Frost King's final death scatters the last of his court.
  if (e.kind === 'boss' && cause !== 'spawn') {
    for (let i = 0; i < 4; i++) {
      const m = makeEnemy('shiver', e.pathIndex, state.waves.hpScale, state.rng);
      m.x = e.x + (state.rng() - 0.5) * 80;
      m.y = e.y + (state.rng() - 0.5) * 80;
      m.wp = e.wp;
      state.enemies.push(m);
    }
  }
}

export function damageEnemy(state, e, amount) {
  if (e.dead) return;
  e.hp -= amount;
  e.flash = 0.09;
  if (e.hp <= 0) killEnemy(state, e, 'hit');
}

// Seeded rng for the live game (set by main.js).
export function freshRng(seed) {
  return mulberry32(seed);
}
