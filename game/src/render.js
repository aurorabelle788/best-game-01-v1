// Rendering: everything the player sees on the canvas — the night map,
// the hearth's fire, the paths, the plots, the towers, the wraiths, the
// projectiles and the particles. The HUD and the menus live in ui.js.

import { HEARTH, TOWERS, VIEW } from './config.js';
import { PATHS, PLOTS, SCENERY } from './world.js';
import { towerStats } from './towers.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBackground(ctx, time) {
  // Night sky gradient.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, '#0b1026');
  g.addColorStop(0.55, '#141b38');
  g.addColorStop(1, '#1c2444');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 70; i++) {
    const x = (i * 173.3) % VIEW.w;
    const y = (i * 97.7) % 260;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.7 + i));
    ctx.globalAlpha = 0.25 + 0.45 * tw;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Moon.
  ctx.fillStyle = '#e8ecf5';
  ctx.beginPath();
  ctx.arc(1150, 62, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9d2e8';
  ctx.beginPath();
  ctx.arc(1140, 54, 7, 0, Math.PI * 2);
  ctx.arc(1158, 70, 5, 0, Math.PI * 2);
  ctx.fill();

  // Snow ground.
  ctx.fillStyle = '#232c52';
  ctx.fillRect(0, 120, VIEW.w, VIEW.h - 120);
  // Soft drifts.
  ctx.fillStyle = 'rgba(210,220,245,0.06)';
  for (const d of SCENERY.drifts) {
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPaths(ctx) {
  for (const path of PATHS) {
    ctx.strokeStyle = '#3a4470';
    ctx.lineWidth = 30;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.strokeStyle = '#4a5578';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    // Dashes down the middle: the trampled snow.
    ctx.strokeStyle = 'rgba(220,228,250,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 16]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Gate markers: dark mouths where the wraiths come from.
  for (const path of PATHS) {
    const p = path[0];
    ctx.fillStyle = '#05070f';
    ctx.beginPath();
    ctx.arc(Math.max(6, Math.min(VIEW.w - 6, p.x)), Math.max(6, Math.min(VIEW.h - 6, p.y)), 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5f6f9e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(Math.max(6, Math.min(VIEW.w - 6, p.x)), Math.max(6, Math.min(VIEW.h - 6, p.y)), 16, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawScenery(ctx) {
  // Pines.
  for (const p of SCENERY.pines) {
    ctx.fillStyle = '#0e1a2e';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 26 * p.s);
    ctx.lineTo(p.x - 13 * p.s, p.y + 8 * p.s);
    ctx.lineTo(p.x + 13 * p.s, p.y + 8 * p.s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#16263f';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 16 * p.s);
    ctx.lineTo(p.x - 10 * p.s, p.y + 12 * p.s);
    ctx.lineTo(p.x + 10 * p.s, p.y + 12 * p.s);
    ctx.closePath();
    ctx.fill();
  }
  // Rocks.
  for (const r of SCENERY.rocks) {
    ctx.fillStyle = '#2c3554';
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,228,250,0.25)';
    ctx.beginPath();
    ctx.ellipse(r.x - r.r * 0.2, r.y - r.r * 0.25, r.r * 0.55, r.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlots(ctx, state, hoverPlot) {
  for (const plot of PLOTS) {
    const built = !!plot.tower;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, 24, 0, Math.PI * 2);
    if (built) {
      ctx.fillStyle = '#2e3a63';
      ctx.fill();
      ctx.strokeStyle = '#5f6f9e';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const hover = hoverPlot === plot;
      ctx.fillStyle = hover ? 'rgba(255,179,71,0.25)' : 'rgba(120,140,200,0.12)';
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffb347' : 'rgba(160,175,220,0.5)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (hover && state.selectedTowerKind) {
        ctx.fillStyle = 'rgba(255,179,71,0.9)';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', plot.x, plot.y);
      }
    }
  }
}

function drawFlame(ctx, x, y, size, time, seed) {
  const flick = Math.sin(time * 9 + seed) * 0.12 + Math.sin(time * 17 + seed * 2) * 0.08;
  const h = size * (1 + flick);
  // Outer flame.
  const g = ctx.createRadialGradient(x, y, 1, x, y, size * 1.1);
  g.addColorStop(0, 'rgba(255,220,120,0.95)');
  g.addColorStop(0.45, 'rgba(255,150,50,0.85)');
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + size * 0.75, y - size * 0.2, x + size * 0.35, y + size * 0.35);
  ctx.quadraticCurveTo(x, y + size * 0.55, x - size * 0.35, y + size * 0.35);
  ctx.quadraticCurveTo(x - size * 0.75, y - size * 0.2, x, y - h);
  ctx.fill();
  // Hot core.
  ctx.fillStyle = 'rgba(255,244,200,0.95)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.05, size * 0.28, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHearth(ctx, state, time) {
  const { x, y } = HEARTH;
  // Warm glow that breathes with the fire and dims as warmth falls.
  const warmthFrac = state.warmth / 100;
  const glowR = 130 + 40 * warmthFrac + Math.sin(time * 2.2) * 6;
  const g = ctx.createRadialGradient(x, y, 10, x, y, glowR);
  g.addColorStop(0, `rgba(255,170,60,${0.4 * warmthFrac + 0.08})`);
  g.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Stone ring.
  ctx.fillStyle = '#3d4a6b';
  ctx.beginPath();
  ctx.arc(x, y, HEARTH.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a3350';
  ctx.beginPath();
  ctx.arc(x, y, HEARTH.radius - 8, 0, Math.PI * 2);
  ctx.fill();
  // Stones around the rim.
  ctx.fillStyle = '#55648f';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * (HEARTH.radius - 3), y + Math.sin(a) * (HEARTH.radius - 3), 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The fire itself, sized by warmth.
  const fireSize = 14 + 16 * warmthFrac;
  drawFlame(ctx, x, y + 4, fireSize, time, 1);
  drawFlame(ctx, x - 12, y + 8, fireSize * 0.55, time, 3);
  drawFlame(ctx, x + 12, y + 8, fireSize * 0.55, time, 5);

  // Warmth ring: a thin arc that drains as the hearth is chewed.
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, HEARTH.radius + 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = warmthFrac > 0.35 ? '#ffb347' : '#ff5a4a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, HEARTH.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * warmthFrac);
  ctx.stroke();
}

function drawTowerShape(ctx, tower, time) {
  const { x, y } = tower.plot;
  const stats = towerStats(tower.kind, tower.level);
  if (tower.kind === 'brazier') {
    // Stone base + iron bowl + flame.
    ctx.fillStyle = '#4a5578';
    ctx.beginPath();
    ctx.arc(x, y + 8, 15, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#2e3a63';
    ctx.fillRect(x - 15, y + 6, 30, 6);
    ctx.fillStyle = '#6b7ba6';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFlame(ctx, x, y - 6, 13 + tower.level * 3, time, tower.id);
  } else if (tower.kind === 'mortar') {
    // Cauldron on legs, glowing mouth.
    ctx.strokeStyle = '#3a2c22';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 12);
    ctx.lineTo(x - 17, y + 20);
    ctx.moveTo(x + 12, y + 12);
    ctx.lineTo(x + 17, y + 20);
    ctx.stroke();
    ctx.fillStyle = '#5b4636';
    ctx.beginPath();
    ctx.arc(x, y + 2, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e2118';
    ctx.beginPath();
    ctx.arc(x, y - 2, 13, 0, Math.PI * 2);
    ctx.fill();
    drawFlame(ctx, x, y - 4, 9 + tower.level * 2, time, tower.id * 2);
  } else {
    // Lantern: post + glowing lamp + light ring.
    ctx.strokeStyle = '#3d4a6b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 14);
    ctx.lineTo(x, y - 14);
    ctx.stroke();
    const lg = ctx.createRadialGradient(x, y - 16, 2, x, y - 16, 26);
    lg.addColorStop(0, 'rgba(180,230,255,0.95)');
    lg.addColorStop(1, 'rgba(127,212,255,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x, y - 16, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(x, y - 16, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e3a63';
    ctx.fillRect(x - 9, y - 24, 18, 4);
  }
  // Level pips.
  if (tower.level >= 2) {
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath();
    ctx.arc(x + 14, y - 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5b12';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2', x + 14, y - 18);
  }
}

export function drawTowers(ctx, state, time, selectedTower) {
  // Range ring for the selected tower.
  if (selectedTower) {
    const stats = towerStats(selectedTower.kind, selectedTower.level);
    ctx.fillStyle = 'rgba(255,179,71,0.07)';
    ctx.strokeStyle = 'rgba(255,179,71,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(selectedTower.plot.x, selectedTower.plot.y, stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const t of state.towers.list) {
    drawTowerShape(ctx, t, time);
  }
}

function drawEnemyShape(ctx, e, time) {
  const flash = e.flash > 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.kind === 'shiver') {
    // Small shivering blob with icicle teeth.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.radius, e.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : e.dark;
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.lineTo(-3, 12);
    ctx.lineTo(0, 6);
    ctx.lineTo(3, 12);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#12203a';
    ctx.beginPath();
    ctx.arc(-4, -3, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'rime') {
    // Armoured brute: heavy plates and horns.
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.moveTo(-e.radius, 4);
    ctx.lineTo(-e.radius * 0.7, -e.radius * 0.9);
    ctx.lineTo(e.radius * 0.7, -e.radius * 0.9);
    ctx.lineTo(e.radius, 4);
    ctx.lineTo(e.radius * 0.6, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.6, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : e.dark;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.8, -e.radius * 0.6);
    ctx.lineTo(-e.radius * 1.15, -e.radius * 1.25);
    ctx.lineTo(-e.radius * 0.4, -e.radius * 0.95);
    ctx.closePath();
    ctx.moveTo(e.radius * 0.8, -e.radius * 0.6);
    ctx.lineTo(e.radius * 1.15, -e.radius * 1.25);
    ctx.lineTo(e.radius * 0.4, -e.radius * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.arc(-5, -4, 2.6, 0, Math.PI * 2);
    ctx.arc(5, -4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'wisp') {
    // A drifting wisp: a pale flame with a tail.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, e.radius * 0.8, e.radius * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : e.dark;
    ctx.beginPath();
    ctx.ellipse(0, e.radius * 0.8, e.radius * 0.45, e.radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#12203a';
    ctx.beginPath();
    ctx.arc(-3.5, -2, 2, 0, Math.PI * 2);
    ctx.arc(3.5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // The Frost King: a tall crowned figure, slow and terrible.
    const sway = Math.sin(time * 1.4 + e.wobble) * 2;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.9, e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.75, -e.radius * 0.5);
    ctx.lineTo(e.radius * 0.75, -e.radius * 0.5);
    ctx.lineTo(e.radius * 0.9, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : e.dark;
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.55, -e.radius * 0.5);
    ctx.lineTo(-e.radius * 0.4, -e.radius * 1.25);
    ctx.lineTo(-e.radius * 0.15, -e.radius * 0.7);
    ctx.lineTo(0, -e.radius * 1.35);
    ctx.lineTo(e.radius * 0.15, -e.radius * 0.7);
    ctx.lineTo(e.radius * 0.4, -e.radius * 1.25);
    ctx.lineTo(e.radius * 0.55, -e.radius * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7fd4ff';
    ctx.beginPath();
    ctx.arc(-8 + sway, -8, 3, 0, Math.PI * 2);
    ctx.arc(8 + sway, -8, 3, 0, Math.PI * 2);
    ctx.fill();
    // Frost aura.
    ctx.strokeStyle = 'rgba(127,212,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 8 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Health bar, only when hurt.
  if (e.hp < e.hpMax) {
    const w = Math.max(26, e.radius * 2);
    const frac = Math.max(0, e.hp / e.hpMax);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = e.kind === 'boss' ? '#ff5a4a' : '#7fd4ff';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * frac, 5);
  }
  // Slowed tint.
  if (e.slowFactor < 1) {
    ctx.strokeStyle = 'rgba(127,212,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawEnemies(ctx, state, time) {
  for (const e of state.enemies) {
    if (e.dead) continue;
    drawEnemyShape(ctx, e, time);
  }
}

export function drawProjectiles(ctx, state, time) {
  for (const p of state.towers.projectiles) {
    const y = p.y - (p.arcH || 0);
    if (p.kind === 'mortar') {
      ctx.fillStyle = '#2e2118';
      ctx.beginPath();
      ctx.arc(p.x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      ctx.arc(p.x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(p.x, y, 1, p.x, y, 9);
      g.addColorStop(0, 'rgba(255,240,180,1)');
      g.addColorStop(0.5, 'rgba(255,150,50,0.9)');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawFx(ctx, fx, time) {
  // Snow, behind everything else in this layer.
  ctx.fillStyle = 'rgba(235,240,255,0.8)';
  for (const s of fx.snow) {
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(s.y * 0.05 + s.x));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Particles.
  for (const p of fx.particles) {
    const frac = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, frac);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * frac + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating text.
  for (const t of fx.texts) {
    const frac = t.life / t.maxLife;
    ctx.globalAlpha = Math.max(0, frac);
    ctx.fillStyle = t.color;
    ctx.font = `bold ${t.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
