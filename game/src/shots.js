// Deterministic screenshot scenes. When the game is opened with
// ?shot=start|play|boss|win, it builds a fixed scene from a fixed seed
// and freezes on one frame, so a headless capture always shows the same
// picture. The live game never reads this module's scenes.

import { HEARTH, TOWERS } from './config.js';
import { PLOTS } from './world.js';
import { buildTower, upgradeTower } from './towers.js';
import { makeEnemy, startWave } from './enemies.js';
import { mulberry32 } from './random.js';

function place(state, plotIndex, kind, level) {
  const plot = PLOTS[plotIndex];
  const t = buildTower(state, plot, kind);
  if (t && level >= 2) upgradeTower(state, t);
  return t;
}

export function applyShot(state, shot) {
  const rng = mulberry32(20261116);
  state.rng = rng;
  state.screen = 'playing';
  state.paused = false;
  state.time = 4.2; // fixed clock so flames and snow sit still
  // Unlimited embers while staging the scene; each shot sets the
  // display value it wants afterwards.
  state.embers = 99999;

  if (shot === 'start') {
    // Title screen over a quiet, pre-built hearth.
    state.screen = 'title';
    place(state, 4, 'brazier', 1);
    place(state, 7, 'lantern', 1);
    state.embers = 150;
    return;
  }

  if (shot === 'play') {
    // Mid-game, wave 4 in full swing: towers built, wraiths on the paths.
    state.waves.wave = 4;
    state.waves.inProgress = true;
    state.score = 2840;
    state.warmth = 82;
    state.kills = 61;
    place(state, 0, 'brazier', 2);
    place(state, 3, 'mortar', 1);
    place(state, 4, 'brazier', 1);
    place(state, 6, 'lantern', 2);
    place(state, 8, 'mortar', 1);
    place(state, 10, 'brazier', 1);
    state.embers = 214;
    const defs = [
      ['shiver', 0, 0.62], ['shiver', 0, 0.45], ['rime', 0, 0.3],
      ['wisp', 1, 0.5], ['shiver', 1, 0.35], ['rime', 1, 0.2],
      ['shiver', 2, 0.66], ['wisp', 2, 0.5], ['rime', 2, 0.38],
      ['shiver', 2, 0.24],
    ];
    for (const [kind, gate, frac] of defs) {
      const e = makeEnemy(kind, gate, 1.18, rng);
      // Walk the enemy part-way along its path.
      const path = state.paths[gate];
      const target = path[Math.min(2, path.length - 1)];
      e.x = path[0].x + (target.x - path[0].x) * frac;
      e.y = path[0].y + (target.y - path[0].y) * frac;
      e.wp = 2;
      e.hp = e.hpMax * (0.55 + rng() * 0.4);
      state.enemies.push(e);
    }
    // A few fireballs mid-flight.
    state.towers.projectiles.push(
      { x: 330, y: 300, tx: 300, ty: 330, speed: 420, damage: 13, splash: 0, kind: 'brazier', arc: 0, t: 0 },
      { x: 700, y: 420, tx: 730, ty: 380, speed: 300, damage: 36, splash: 58, kind: 'mortar', arc: 1, arcH: 30, t: 0.4 },
    );
    state.banner = { title: 'WAVE 4', sub: 'The frost thickens', life: 2.2 };
    return;
  }

  if (shot === 'boss') {
    // Wave 10: the Frost King walks in with his court.
    state.waves.wave = 10;
    state.waves.inProgress = true;
    state.score = 12480;
    state.warmth = 61;
    state.kills = 214;
    place(state, 0, 'brazier', 2);
    place(state, 1, 'mortar', 2);
    place(state, 3, 'mortar', 1);
    place(state, 4, 'brazier', 2);
    place(state, 6, 'lantern', 2);
    place(state, 7, 'brazier', 1);
    place(state, 8, 'mortar', 2);
    place(state, 10, 'lantern', 1);
    place(state, 11, 'brazier', 2);
    state.embers = 342;
    const boss = makeEnemy('boss', 1, 1.8, rng);
    boss.x = 640;
    boss.y = 120;
    boss.wp = 2;
    boss.hp = boss.hpMax * 0.72;
    state.enemies.push(boss);
    for (const [kind, gate, fx, fy] of [
      ['rime', 0, 200, 400], ['shiver', 0, 240, 360], ['wisp', 1, 700, 180],
      ['rime', 2, 1050, 320], ['shiver', 2, 1000, 400], ['wisp', 2, 950, 200],
    ]) {
      const e = makeEnemy(kind, gate, 1.8, rng);
      e.x = fx;
      e.y = fy;
      e.wp = 2;
      e.hp = e.hpMax * (0.6 + rng() * 0.3);
      state.enemies.push(e);
    }
    state.banner = { title: 'THE FROST KING', sub: 'Wave 10 — hold the hearth', life: 2.6 };
    return;
  }

  if (shot === 'win') {
    // Victory screen: the hearth endures, dawn on the horizon.
    state.screen = 'end';
    state.victory = true;
    state.gameOver = false;
    state.waves.wave = 10;
    state.score = 16840;
    state.kills = 268;
    state.warmth = 58;
    place(state, 0, 'brazier', 2);
    place(state, 4, 'brazier', 2);
    place(state, 6, 'lantern', 2);
    place(state, 8, 'mortar', 2);
    state.embers = 410;
    return;
  }
}
