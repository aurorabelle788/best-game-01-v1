// Towers: the braziers, mortars and lanterns the Keeper builds on plots.
// A tower picks the enemy furthest along its path within range (the one
// closest to the hearth), fires on its rate, and can be upgraded once or
// sold back. Lanterns are auras: no projectile, they slow and burn
// everything inside their ring.

import { TOWERS } from './config.js';
import { damageEnemy } from './enemies.js';

let nextTowerId = 1;

export function createTowers() {
  return {
    list: [], // {id, kind, plot, level, invested, cooldown}
    projectiles: [], // {x, y, tx, ty, target, speed, damage, splash, kind, arc}
  };
}

export function towerStats(kind, level) {
  const def = TOWERS[kind];
  if (level >= 2) {
    return { ...def, ...def.upgrade, level: 2 };
  }
  return { ...def, level: 1 };
}

export function buildTower(state, plot, kind) {
  const def = TOWERS[kind];
  if (state.embers < def.cost) return null;
  if (plot.tower) return null;
  state.embers -= def.cost;
  const tower = {
    id: nextTowerId++,
    kind,
    plot,
    level: 1,
    invested: def.cost,
    cooldown: 0,
  };
  plot.tower = tower;
  state.towers.list.push(tower);
  state.onTowerBuilt && state.onTowerBuilt(tower);
  return tower;
}

export function upgradeTower(state, tower) {
  const def = TOWERS[tower.kind];
  if (tower.level >= 2) return false;
  if (state.embers < def.upgrade.cost) return false;
  state.embers -= def.upgrade.cost;
  tower.invested += def.upgrade.cost;
  tower.level = 2;
  state.onTowerUpgraded && state.onTowerUpgraded(tower);
  return true;
}

export function sellTower(state, tower) {
  const def = TOWERS[tower.kind];
  const refund = Math.floor(tower.invested * def.sellBack);
  state.embers += refund;
  tower.plot.tower = null;
  const i = state.towers.list.indexOf(tower);
  if (i >= 0) state.towers.list.splice(i, 1);
  state.onTowerSold && state.onTowerSold(tower, refund);
  return refund;
}

export function updateTowers(state, dt, time) {
  const { towers, enemies } = state;
  for (const t of towers.list) {
    const stats = towerStats(t.kind, t.level);
    t.cooldown -= dt;
    if (t.kind === 'lantern') {
      // Aura: slow and burn everything in the ring.
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - t.plot.x, e.y - t.plot.y);
        if (d <= stats.range + e.radius) {
          e.slowUntil = time + 0.25;
          e.slowFactor = 1 - stats.slow;
          e.burnUntil = time + 0.5;
          e.burnDps = Math.max(e.burnDps, stats.burn);
        }
      }
      continue;
    }
    if (t.cooldown > 0) continue;
    // Pick the target furthest along. Reached enemies count too — they
    // are at the hearth ring, and the towers nearest the hearth must be
    // able to finish them off.
    let best = null;
    let bestScore = -1;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - t.plot.x, e.y - t.plot.y);
      if (d > stats.range + e.radius) continue;
      const score = e.wp * 1000 + (1 - d / (stats.range + 1));
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (!best) continue;
    t.cooldown = 1 / stats.rate;
    towers.projectiles.push({
      x: t.plot.x,
      y: t.plot.y - 14,
      target: best,
      tx: best.x,
      ty: best.y,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      splash: stats.splash || 0,
      kind: t.kind,
      arc: t.kind === 'mortar' ? 1 : 0,
      t: 0,
    });
    state.onTowerFired && state.onTowerFired(t);
  }
}

export function updateProjectiles(state, dt) {
  const { towers, enemies } = state;
  for (let i = towers.projectiles.length - 1; i >= 0; i--) {
    const p = towers.projectiles[i];
    p.t += dt;
    // Track a living target; otherwise fly to the last known spot.
    if (p.target && !p.target.dead) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    }
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= step + 6) {
      // Impact.
      if (p.splash > 0) {
        for (const e of enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.splash + e.radius) {
            damageEnemy(state, e, p.damage);
          }
        }
        state.onSplash && state.onSplash(p.tx, p.ty, p.splash);
      } else if (p.target && !p.target.dead) {
        damageEnemy(state, p.target, p.damage);
        state.onHit && state.onHit(p.target);
      }
      towers.projectiles.splice(i, 1);
      continue;
    }
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
    // Mortar shells arc: they rise then fall onto the target.
    if (p.arc) p.arcH = Math.sin(Math.min(1, p.t * 2.2) * Math.PI) * 46;
  }
}

// The flare: a nova that hits every enemy on the field.
export function castFlare(state, time) {
  const a = state.abilities.flare;
  if (a.cooldownLeft > 0) return false;
  a.cooldownLeft = a.cooldown;
  for (const e of state.enemies) {
    if (e.dead) continue;
    damageEnemy(state, e, a.damage);
    e.burnUntil = time + 3;
    e.burnDps = Math.max(e.burnDps, a.burn);
  }
  state.onFlare && state.onFlare();
  return true;
}

export function castStoke(state) {
  const a = state.abilities.stoke;
  if (a.cooldownLeft > 0) return false;
  if (state.embers < a.cost) return false;
  if (state.warmth >= 100) return false;
  state.embers -= a.cost;
  state.warmth = Math.min(100, state.warmth + a.heal);
  a.cooldownLeft = a.cooldown;
  state.onStoke && state.onStoke();
  return true;
}
