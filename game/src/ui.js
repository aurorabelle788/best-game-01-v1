// The interface: the top bar (wave, score, embers, warmth), the bottom
// shop (three towers, two abilities, pause, speed, mute), the selected
// tower panel, the wave banners, and the title / pause / victory / defeat
// screens. This module also owns the clickable rectangles, so main.js can
// route a click to the shop before it reaches the map.

import { ABILITIES, HEARTH, SCORE, TOWERS, VIEW, WAVES } from './config.js';
import { towerStats } from './towers.js';

export const SHOP_Y = 648;
export const TOP_H = 56;

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function layoutUi(state) {
  const cards = [];
  const keys = ['brazier', 'mortar', 'lantern'];
  keys.forEach((kind, i) => {
    cards.push({ kind, rect: rect(16 + i * 156, SHOP_Y + 8, 148, 56) });
  });
  const ui = {
    cards,
    flare: rect(496, SHOP_Y + 8, 128, 56),
    stoke: rect(632, SHOP_Y + 8, 128, 56),
    pause: rect(1000, SHOP_Y + 8, 76, 56),
    speed: rect(1084, SHOP_Y + 8, 76, 56),
    mute: rect(1168, SHOP_Y + 8, 96, 56),
    startWave: rect(540, 470, 200, 44),
    titleStart: rect(490, 470, 300, 56),
    restart: rect(490, 500, 300, 56),
  };
  if (state.selectedTower) {
    const t = state.selectedTower;
    const stats = towerStats(t.kind, t.level);
    ui.towerPanel = rect(472, SHOP_Y - 64, 336, 56);
    ui.upgrade = rect(480, SHOP_Y - 56, 150, 40);
    ui.sell = rect(640, SHOP_Y - 56, 150, 40);
    ui.upgradeCost = t.level >= 2 ? null : TOWERS[t.kind].upgrade.cost;
  }
  return ui;
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = 'rgba(8,12,28,0.85)';
  ctx.fillRect(0, 0, VIEW.w, TOP_H);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('EMBERKEEP', 16, 29);
  ctx.fillStyle = '#c9d2e8';
  ctx.font = '15px sans-serif';
  ctx.fillText(`WAVE ${Math.min(state.waves.wave + (state.waves.inProgress ? 0 : 0), WAVES)} / ${WAVES}`, 170, 30);
  if (state.waves.inProgress) {
    ctx.fillStyle = '#ff8a5c';
    ctx.fillText('— under attack', 260, 30);
  }

  // Score, centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`SCORE ${state.score.toLocaleString()}`, 640, 22);
  ctx.fillStyle = '#8b98b8';
  ctx.font = '13px sans-serif';
  ctx.fillText(`BEST ${Math.max(state.best, state.score).toLocaleString()}`, 640, 44);

  // Embers, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`◆ ${state.embers}`, 1000, 29);
  // Warmth bar.
  const frac = state.warmth / HEARTH.warmthMax;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 1020, 18, 150, 20, 10);
  ctx.fill();
  ctx.fillStyle = frac > 0.35 ? '#ff9a3c' : '#ff5a4a';
  if (frac > 0) {
    roundRect(ctx, 1020, 18, 150 * frac, 20, 10);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`WARMTH ${Math.ceil(state.warmth)}`, 1095, 29);
  ctx.textAlign = 'left';
}

function drawShopCard(ctx, card, state) {
  const def = TOWERS[card.kind];
  const selected = state.selectedTowerKind === card.kind;
  const afford = state.embers >= def.cost;
  const r = card.rect;
  ctx.fillStyle = selected ? 'rgba(255,179,71,0.28)' : 'rgba(20,28,56,0.9)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffb347' : 'rgba(120,140,200,0.5)';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.stroke();
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(r.x + 20, r.y + 18, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.short, r.x + 36, r.y + 14);
  ctx.fillStyle = '#8b98b8';
  ctx.font = '12px sans-serif';
  ctx.fillText(def.blurb, r.x + 36, r.y + 32);
  ctx.fillStyle = afford ? '#ffd98a' : '#ff7a6a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`◆ ${def.cost}   [${def.key}]`, r.x + 12, r.y + 48);
}

function drawAbilityButton(ctx, r, label, sub, ready, frac, hotkey) {
  ctx.fillStyle = ready ? 'rgba(20,28,56,0.9)' : 'rgba(20,28,56,0.55)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = ready ? '#7fd4ff' : 'rgba(120,140,200,0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.stroke();
  if (!ready) {
    ctx.fillStyle = 'rgba(127,212,255,0.25)';
    roundRect(ctx, r.x, r.y, r.w * frac, r.h, 8);
    ctx.fill();
  }
  ctx.fillStyle = ready ? '#e8ecf5' : '#8b98b8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + 10, r.y + 16);
  ctx.fillStyle = '#8b98b8';
  ctx.font = '11px sans-serif';
  ctx.fillText(sub, r.x + 10, r.y + 34);
  ctx.fillStyle = '#7fd4ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`[${hotkey}]`, r.x + r.w - 8, r.y + 48);
  ctx.textAlign = 'left';
}

function drawSmallButton(ctx, r, label, enabled) {
  ctx.fillStyle = enabled ? 'rgba(20,28,56,0.9)' : 'rgba(20,28,56,0.5)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,140,200,0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.stroke();
  ctx.fillStyle = enabled ? '#e8ecf5' : '#8b98b8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textAlign = 'left';
}

function drawTowerPanel(ctx, state, ui) {
  const t = state.selectedTower;
  const def = TOWERS[t.kind];
  const stats = towerStats(t.kind, t.level);
  const r = ui.towerPanel;
  ctx.fillStyle = 'rgba(8,12,28,0.92)';
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 1.5;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.stroke();
  ctx.fillStyle = '#e8ecf5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${def.name}  ·  Lv ${t.level}  ·  dmg ${stats.damage}  ·  range ${stats.range}`, r.x + 12, r.y + 16);
  ctx.fillStyle = '#8b98b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Click the tower again to deselect. Upgrade and sell below.', r.x + 12, r.y + 38);

  const upLabel = t.level >= 2 ? 'MAX LEVEL' : `UPGRADE ◆ ${def.upgrade.cost}`;
  const canUp = t.level < 2 && state.embers >= def.upgrade.cost;
  drawSmallButton(ctx, ui.upgrade, upLabel, canUp);
  const refund = Math.floor(t.invested * def.sellBack);
  drawSmallButton(ctx, ui.sell, `SELL +${refund}`, true);
}

export function drawUi(ctx, state, ui, time) {
  drawTopBar(ctx, state);

  // Shop bar.
  ctx.fillStyle = 'rgba(8,12,28,0.85)';
  ctx.fillRect(0, SHOP_Y, VIEW.w, VIEW.h - SHOP_Y);
  for (const card of ui.cards) drawShopCard(ctx, card, state);
  const flareReady = state.abilities.flare.cooldownLeft <= 0;
  const flareFrac = 1 - state.abilities.flare.cooldownLeft / ABILITIES.flare.cooldown;
  drawAbilityButton(ctx, ui.flare, 'Stoked Flare', flareReady ? 'nova: 90 fire' : `${Math.ceil(state.abilities.flare.cooldownLeft)}s`, flareReady, flareFrac, 'Space');
  const stokeReady = state.abilities.stoke.cooldownLeft <= 0 && state.embers >= ABILITIES.stoke.cost && state.warmth < 100;
  const stokeFrac = 1 - state.abilities.stoke.cooldownLeft / ABILITIES.stoke.cooldown;
  drawAbilityButton(ctx, ui.stoke, 'Stoke Hearth', stokeReady ? '25◆ → +12 warm' : `${Math.ceil(state.abilities.stoke.cooldownLeft)}s`, stokeReady, stokeFrac, 'Q');
  drawSmallButton(ctx, ui.pause, state.paused ? '▶' : '❚❚', true);
  drawSmallButton(ctx, ui.speed, state.speed === 2 ? '×2' : '×1', true);
  drawSmallButton(ctx, ui.mute, state.muted ? '✕' : '♪', true);

  if (state.selectedTower) drawTowerPanel(ctx, state, ui);

  // Build phase: countdown + early start.
  if (!state.waves.inProgress && !state.gameOver && !state.victory && state.screen === 'playing' && state.waves.wave < WAVES) {
    const r = ui.startWave;
    ctx.fillStyle = 'rgba(8,12,28,0.8)';
    roundRect(ctx, r.x - 90, r.y - 34, 380, 84, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 1.5;
    roundRect(ctx, r.x - 90, r.y - 34, 380, 84, 10);
    ctx.stroke();
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.waves.wave === 0 ? 'The night is coming.' : `Wave ${state.waves.wave} cleared.`, 640, r.y - 14);
    ctx.fillStyle = '#8b98b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Next wave in ${Math.ceil(state.waves.betweenTimer)}s — start early for +10 embers`, 640, r.y + 8);
    drawSmallButton(ctx, r, `START WAVE ${state.waves.wave + 1}`, true);
    ctx.textAlign = 'left';
  }

  // Wave banner.
  if (state.banner && state.banner.life > 0) {
    const frac = Math.min(1, state.banner.life / 0.4);
    const alpha = Math.min(1, state.banner.life);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 6;
    ctx.strokeText(state.banner.title, 640, 200);
    ctx.fillText(state.banner.title, 640, 200);
    if (state.banner.sub) {
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '18px sans-serif';
      ctx.strokeText(state.banner.sub, 640, 244);
      ctx.fillText(state.banner.sub, 640, 244);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}

function drawOverlay(ctx, lines, accent) {
  ctx.fillStyle = 'rgba(5,8,20,0.78)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  let y = 150;
  for (const line of lines) {
    ctx.fillStyle = line.color || '#e8ecf5';
    ctx.font = line.font || '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line.text, 640, y);
    y += line.gap || 34;
  }
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, state, ui) {
  drawOverlay(ctx, [
    { text: 'EMBERKEEP', font: 'bold 64px sans-serif', color: '#ffb347', gap: 70 },
    { text: 'The Last Hearth', font: 'italic 24px serif', color: '#c9d2e8', gap: 48 },
    { text: 'Frost wraiths crawl out of the dark to snuff the fire.', color: '#e8ecf5' },
    { text: 'Build braziers, mortars and lanterns. Hold the hearth for 10 waves.', color: '#e8ecf5' },
    { text: 'If the warmth reaches zero, the night wins.', color: '#ff9a8a', gap: 48 },
    { text: 'Click a tower card (or press 1 / 2 / 3), then click a plot to build.', color: '#8b98b8' },
    { text: 'SPACE flare  ·  Q stoke the hearth  ·  P pause  ·  F speed  ·  M mute', color: '#8b98b8', gap: 44 },
    { text: state.best > 0 ? `BEST SCORE ${state.best.toLocaleString()}` : 'No keeper has held the hearth yet.', color: '#ffd98a' },
  ]);
  drawSmallButton(ctx, ui.titleStart, 'LIGHT THE HEARTH', true);
}

export function drawPaused(ctx, ui) {
  drawOverlay(ctx, [
    { text: 'PAUSED', font: 'bold 48px sans-serif', color: '#ffb347', gap: 60 },
    { text: 'The wraiths wait. The fire does not.', color: '#c9d2e8' },
  ]);
  drawSmallButton(ctx, ui.restart, 'RESUME  [P]', true);
}

export function drawEnd(ctx, state, ui) {
  if (state.victory) {
    const bonus = Math.ceil(state.warmth) * SCORE.winWarmth;
    drawOverlay(ctx, [
      { text: 'THE HEARTH ENDURES', font: 'bold 46px sans-serif', color: '#ffd98a', gap: 60 },
      { text: 'Dawn breaks. The Frost King is ash, and the fire still burns.', color: '#e8ecf5', gap: 44 },
      { text: `SCORE ${state.score.toLocaleString()}  ·  warmth bonus +${bonus}  ·  ${state.kills} wraiths banished`, color: '#c9d2e8' },
      { text: `BEST ${Math.max(state.best, state.score).toLocaleString()}`, color: '#ffd98a', gap: 48 },
    ]);
  } else {
    drawOverlay(ctx, [
      { text: 'THE FIRE DIES', font: 'bold 46px sans-serif', color: '#ff7a6a', gap: 60 },
      { text: 'The hearth goes cold. The night takes the valley.', color: '#e8ecf5', gap: 44 },
      { text: `You held ${state.waves.wave} of ${WAVES} waves  ·  SCORE ${state.score.toLocaleString()}  ·  ${state.kills} wraiths banished`, color: '#c9d2e8' },
      { text: `BEST ${Math.max(state.best, state.score).toLocaleString()}`, color: '#ffd98a', gap: 48 },
    ]);
  }
  drawSmallButton(ctx, ui.restart, 'PLAY AGAIN  [R]', true);
}

// Route a click. Returns a command string the game acts on, or null when
// the click belongs to the map (plot / tower picking).
export function routeClick(state, ui, x, y) {
  if (state.screen === 'title') {
    if (inside(ui.titleStart, x, y)) return 'start';
    return null;
  }
  if (state.screen === 'end') {
    if (inside(ui.restart, x, y)) return 'restart';
    return null;
  }
  if (state.paused) {
    if (inside(ui.restart, x, y)) return 'resume';
    return null;
  }
  for (const card of ui.cards) {
    if (inside(card.rect, x, y)) return `pick:${card.kind}`;
  }
  if (inside(ui.flare, x, y)) return 'flare';
  if (inside(ui.stoke, x, y)) return 'stoke';
  if (inside(ui.pause, x, y)) return 'pause';
  if (inside(ui.speed, x, y)) return 'speed';
  if (inside(ui.mute, x, y)) return 'mute';
  if (state.selectedTower) {
    if (inside(ui.upgrade, x, y)) return 'upgrade';
    if (inside(ui.sell, x, y)) return 'sell';
  }
  if (!state.waves.inProgress && state.waves.wave < WAVES) {
    if (inside(ui.startWave, x, y)) return 'startWave';
  }
  return null;
}
