// Emberkeep — bootstrap, state machine and the game loop. The game is a
// tower defence: build on plots, hold the hearth for ten waves, beat the
// Frost King. States: title -> playing <-> paused -> end (victory/defeat).

import { ABILITIES, HEARTH, SCORE, TOWERS, VIEW, WAVES } from './config.js';
import { createInput } from './input.js';
import { ensureAudio, isMuted, sfx, toggleMute } from './audio.js';
import { PLOTS, PATHS } from './world.js';
import { createWaves, startWave, updateEnemies } from './enemies.js';
import {
  buildTower, castFlare, castStoke, createTowers, sellTower,
  updateProjectiles, updateTowers, upgradeTower,
} from './towers.js';
import { addShake, burst, createFx, emberRise, floatText, initSnow, updateFx } from './particles.js';
import {
  drawBackground, drawEnemies, drawFx, drawHearth, drawPaths, drawPlots,
  drawProjectiles, drawScenery, drawTowers,
} from './render.js';
import { SHOP_Y, TOP_H, drawEnd, drawPaused, drawTitle, drawUi, layoutUi, routeClick } from './ui.js';
import { applyShot } from './shots.js';
import { mulberry32 } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);

function loadBest() {
  try {
    return Number(localStorage.getItem('emberkeep-best') || 0) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem('emberkeep-best', String(score));
  } catch (e) {
    // Private mode: the best score just lives for the session.
  }
}

function createState() {
  const state = {
    screen: 'title', // title | playing | end
    paused: false,
    speed: 1,
    muted: isMuted(),
    time: 0,
    warmth: HEARTH.warmthMax,
    embers: HEARTH.startEmbers,
    score: 0,
    best: loadBest(),
    kills: 0,
    gameOver: false,
    victory: false,
    waves: createWaves(),
    enemies: [],
    towers: createTowers(),
    fx: createFx(),
    rng: mulberry32((Date.now() ^ 0x9e3779b9) >>> 0),
    paths: PATHS,
    selectedTowerKind: null,
    selectedTower: null,
    hoverPlot: null,
    banner: null,
    abilities: {
      flare: { cooldownLeft: 0, cooldown: ABILITIES.flare.cooldown },
      stoke: { cooldownLeft: 0, cooldown: ABILITIES.stoke.cooldown },
    },
  };

  state.onTowerBuilt = (t) => {
    sfx.build();
    burst(state.fx, t.plot.x, t.plot.y - 10, '#ffb347', 14, 90, 3, 0.5);
    floatText(state.fx, t.plot.x, t.plot.y - 34, TOWERS[t.kind].name, '#ffd98a', 14);
  };
  state.onTowerUpgraded = (t) => {
    sfx.upgrade();
    burst(state.fx, t.plot.x, t.plot.y - 10, '#ffd98a', 18, 110, 3, 0.6);
    floatText(state.fx, t.plot.x, t.plot.y - 34, 'UPGRADED', '#ffd98a', 14);
  };
  state.onTowerSold = (t, refund) => {
    sfx.sell();
    floatText(state.fx, t.plot.x, t.plot.y - 34, `+${refund} ◆`, '#ffd98a', 14);
  };
  state.onTowerFired = (t) => {
    if (t.kind === 'mortar') sfx.mortar();
    else sfx.shoot();
  };
  state.onHit = () => sfx.hit();
  state.onSplash = (x, y, r) => {
    burst(state.fx, x, y, '#ff7a3c', 16, 140, 4, 0.5);
    burst(state.fx, x, y, '#ffb347', 10, 90, 3, 0.4);
  };
  state.onEnemyKilled = (e) => {
    sfx.kill();
    burst(state.fx, e.x, e.y, e.color, 12, 110, 3, 0.5);
    burst(state.fx, e.x, e.y, '#ffb347', 6, 70, 2, 0.4);
    floatText(state.fx, e.x, e.y - 18, `+${e.reward} ◆`, '#ffd98a', 13);
  };
  state.onBossSplit = (e) => {
    sfx.horn();
    addShake(state.fx, 10);
    state.banner = { title: "THE KING'S CROWN BREAKS", sub: 'He rises again — finish him!', life: 2.4 };
    burst(state.fx, e.x, e.y, '#7fd4ff', 30, 180, 4, 0.8);
  };
  state.onHearthHit = (e) => {
    sfx.hearthHit();
    addShake(state.fx, 7);
    emberRise(state.fx, HEARTH.x, HEARTH.y, 6);
    floatText(state.fx, HEARTH.x, HEARTH.y - 60, `-${e.damage} warmth`, '#ff7a6a', 15);
  };
  state.onFlare = () => {
    sfx.flare();
    addShake(state.fx, 6);
    burst(state.fx, HEARTH.x, HEARTH.y, '#ffb347', 40, 260, 4, 0.7);
    burst(state.fx, HEARTH.x, HEARTH.y, '#ff7a3c', 24, 200, 3, 0.6);
  };
  state.onStoke = () => {
    sfx.stoke();
    emberRise(state.fx, HEARTH.x, HEARTH.y, 16);
    floatText(state.fx, HEARTH.x, HEARTH.y - 60, '+12 warmth', '#ffd98a', 15);
  };
  state.onWaveCleared = (wave) => {
    const bonus = 25 + 5 * wave;
    state.embers += bonus;
    state.score += SCORE.waveClear;
    if (wave >= WAVES) {
      state.victory = true;
      state.score += Math.ceil(state.warmth) * SCORE.winWarmth;
      state.best = Math.max(state.best, state.score);
      saveBest(state.best);
      state.screen = 'end';
      sfx.victory();
      return;
    }
    sfx.horn();
    state.banner = { title: `WAVE ${wave} CLEARED`, sub: `+${bonus} embers  ·  +${SCORE.waveClear} score`, life: 2.2 };
    state.waves.betweenTimer = 8;
  };
  state.onBossSpawned = () => {
    state.banner = { title: 'THE FROST KING', sub: 'Wave 10 — hold the hearth', life: 2.6 };
  };
  return state;
}

const state = createState();
initSnow(state.fx, mulberry32(777), 130);

function startGame() {
  const fresh = createState();
  // Keep the best score and the snow across restarts.
  fresh.best = state.best;
  fresh.fx = state.fx;
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
  initSnow(state.fx, mulberry32(777), 130);
  state.screen = 'playing';
  state.waves.betweenTimer = 5;
  state.banner = { title: 'NIGHT 1', sub: 'The wraiths are coming — build!', life: 2.4 };
  sfx.horn();
  announce('Emberkeep. Wave 1 begins soon. Build towers on the plots.');
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function plotAt(x, y) {
  if (y > SHOP_Y - 70 || y < TOP_H) return null;
  for (const p of PLOTS) {
    if (Math.hypot(x - p.x, y - p.y) <= 26) return p;
  }
  return null;
}

function towerAt(x, y) {
  for (const t of state.towers.list) {
    if (Math.hypot(x - t.plot.x, y - t.plot.y) <= 26) return t;
  }
  return null;
}

function handleClick(x, y) {
  ensureAudio();
  const ui = layoutUi(state);
  const cmd = routeClick(state, ui, x, y);
  if (cmd) {
    sfx.click();
    if (cmd === 'start') return startGame();
    if (cmd === 'restart') return startGame();
    if (cmd === 'resume') {
      state.paused = false;
      return;
    }
    if (cmd.startsWith('pick:')) {
      const kind = cmd.slice(5);
      state.selectedTowerKind = state.selectedTowerKind === kind ? null : kind;
      state.selectedTower = null;
      return;
    }
    if (cmd === 'flare') {
      if (!castFlare(state, state.time)) sfx.deny();
      return;
    }
    if (cmd === 'stoke') {
      if (!castStoke(state)) sfx.deny();
      return;
    }
    if (cmd === 'pause') {
      state.paused = !state.paused;
      return;
    }
    if (cmd === 'speed') {
      state.speed = state.speed === 1 ? 2 : 1;
      return;
    }
    if (cmd === 'mute') {
      state.muted = toggleMute();
      return;
    }
    if (cmd === 'upgrade') {
      if (state.selectedTower && !upgradeTower(state, state.selectedTower)) sfx.deny();
      return;
    }
    if (cmd === 'sell') {
      if (state.selectedTower) {
        sellTower(state, state.selectedTower);
        state.selectedTower = null;
      }
      return;
    }
    if (cmd === 'startWave') {
      if (!state.waves.inProgress && state.waves.wave < WAVES) {
        state.embers += 10;
        floatText(state.fx, 640, 540, '+10 ◆ early start', '#ffd98a', 14);
        startWave(state.waves, state.waves.wave + 1, state.rng);
        state.banner = { title: `WAVE ${state.waves.wave}`, sub: '', life: 1.8 };
        sfx.horn();
      }
      return;
    }
    return;
  }

  // Map clicks: build on a plot, or select a tower.
  if (state.screen !== 'playing' || state.paused) return;
  const tower = towerAt(x, y);
  if (tower) {
    state.selectedTower = state.selectedTower === tower ? null : tower;
    state.selectedTowerKind = null;
    return;
  }
  const plot = plotAt(x, y);
  if (plot) {
    if (plot.tower) {
      state.selectedTower = plot.tower;
      state.selectedTowerKind = null;
      return;
    }
    if (state.selectedTowerKind) {
      const built = buildTower(state, plot, state.selectedTowerKind);
      if (!built) sfx.deny();
      return;
    }
    // Clicking an empty plot with no tower picked: hint at the shop.
    floatText(state.fx, plot.x, plot.y - 30, 'Pick a tower below first', '#c9d2e8', 13);
    return;
  }
  state.selectedTower = null;
}

function handleKeys() {
  if (input.consumeKey('enter') && state.screen === 'title') return startGame();
  if (input.consumeKey('r') && state.screen === 'end') return startGame();
  if (input.consumeKey('p') || input.consumeKey('escape')) {
    if (state.screen === 'playing') state.paused = !state.paused;
    return;
  }
  if (state.screen !== 'playing' || state.paused) return;
  if (input.consumeKey('1')) {
    state.selectedTowerKind = state.selectedTowerKind === 'brazier' ? null : 'brazier';
    state.selectedTower = null;
  }
  if (input.consumeKey('2')) {
    state.selectedTowerKind = state.selectedTowerKind === 'mortar' ? null : 'mortar';
    state.selectedTower = null;
  }
  if (input.consumeKey('3')) {
    state.selectedTowerKind = state.selectedTowerKind === 'lantern' ? null : 'lantern';
    state.selectedTower = null;
  }
  if (input.consumeKey(' ')) {
    if (!castFlare(state, state.time)) sfx.deny();
  }
  if (input.consumeKey('q')) {
    if (!castStoke(state)) sfx.deny();
  }
  if (input.consumeKey('f')) state.speed = state.speed === 1 ? 2 : 1;
  if (input.consumeKey('m')) state.muted = toggleMute();
}

function update(dt) {
  state.time += dt;
  if (state.banner && state.banner.life > 0) state.banner.life -= dt;
  for (const a of Object.values(state.abilities)) {
    if (a.cooldownLeft > 0) a.cooldownLeft -= dt;
  }
  if (state.screen !== 'playing' || state.paused) return;

  // Between waves: count down, then launch the next one.
  if (!state.waves.inProgress && !state.gameOver && state.waves.wave < WAVES) {
    state.waves.betweenTimer -= dt;
    if (state.waves.betweenTimer <= 0) {
      startWave(state.waves, state.waves.wave + 1, state.rng);
      state.banner = { title: `WAVE ${state.waves.wave}`, sub: state.waves.wave === WAVES ? 'The Frost King comes' : '', life: 1.8 };
      sfx.horn();
    }
  }

  updateEnemies(state, dt, state.time);
  updateTowers(state, dt, state.time);
  updateProjectiles(state, dt);

  // The hearth's fire sheds embers while it burns.
  if (Math.random() < dt * 6) emberRise(state.fx, HEARTH.x, HEARTH.y, 1);

  if (state.gameOver && state.screen !== 'end') {
    state.victory = false;
    state.best = Math.max(state.best, state.score);
    saveBest(state.best);
    state.screen = 'end';
    sfx.defeat();
    announce('The fire dies. Game over.');
  }
}

function render() {
  ctx.save();
  ctx.translate(state.fx.shakeX, state.fx.shakeY);
  drawBackground(ctx, state.time);
  drawPaths(ctx);
  drawScenery(ctx);
  const hover = state.screen === 'playing' && !state.paused ? plotAt(input.mouseX, input.mouseY) : null;
  drawPlots(ctx, state, hover);
  drawHearth(ctx, state, state.time);
  drawTowers(ctx, state, state.time, state.selectedTower);
  drawEnemies(ctx, state, state.time);
  drawProjectiles(ctx, state, state.time);
  drawFx(ctx, state.fx, state.time);
  ctx.restore();

  const ui = layoutUi(state);
  if (state.screen === 'playing' || state.paused) {
    drawUi(ctx, state, ui, state.time);
    if (state.paused) drawPaused(ctx, ui);
  } else if (state.screen === 'title') {
    drawTitle(ctx, state, ui);
  } else if (state.screen === 'end') {
    drawEnd(ctx, state, ui);
  }
}

// Resize the canvas to the window while keeping the 1280x720 view.
function fit() {
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.style.width = `${Math.floor(VIEW.w * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.h * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

// Screenshot mode: a frozen, deterministic frame for the dossier.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(state, shot);
  // Staging the scene fires build/upgrade effects; clear them so the
  // capture shows the game, not its construction noise.
  state.fx.texts.length = 0;
  state.fx.particles.length = 0;
  updateFx(state.fx, 0);
  render();
} else {
  let last = performance.now();
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const click = input.consumeClick();
    if (click) handleClick(click.x, click.y);
    handleKeys();
    updateFx(state.fx, dt);
    update(dt * state.speed);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
