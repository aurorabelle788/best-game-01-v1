// Emberkeep — balance and content tables. One place for every number the
// designers tune: the hearth, the three tower kinds, the four enemy kinds,
// the ten waves, the two abilities, and the score. No other file hard-codes
// a balance number; it reads it from here.

export const VIEW = { w: 1280, h: 720 };

export const HEARTH = {
  x: 640,
  y: 360,
  radius: 46, // stone ring
  hitRadius: 74, // enemies stop here and chew the warmth
  warmthMax: 100,
  startEmbers: 200,
};

export const WAVES = 10;

// Waves are hand-tuned, not generated: each lists what spawns, in what
// order, and how fast. hpScale grows with the wave so late waves stay
// threatening even against upgraded towers.
export const WAVE_DEFS = [
  { shiver: 6, rime: 0, wisp: 0, interval: 1.6, hpScale: 1.0 },
  { shiver: 8, rime: 2, wisp: 0, interval: 1.5, hpScale: 1.05 },
  { shiver: 8, rime: 3, wisp: 3, interval: 1.4, hpScale: 1.1 },
  { shiver: 10, rime: 4, wisp: 4, interval: 1.3, hpScale: 1.18 },
  { shiver: 10, rime: 6, wisp: 6, interval: 1.2, hpScale: 1.32 },
  { shiver: 14, rime: 7, wisp: 10, interval: 1.1, hpScale: 1.42 },
  { shiver: 14, rime: 9, wisp: 12, interval: 1.0, hpScale: 1.52 },
  { shiver: 14, rime: 10, wisp: 12, interval: 0.95, hpScale: 1.62 },
  { shiver: 12, rime: 10, wisp: 12, interval: 0.9, hpScale: 1.68 },
  { shiver: 0, rime: 4, wisp: 6, boss: 1, interval: 1.0, hpScale: 1.6 },
];

export const TOWERS = {
  brazier: {
    key: '1',
    name: 'Brazier',
    short: 'Brazier',
    blurb: 'Fire bolts',
    cost: 60,
    range: 135,
    damage: 15,
    rate: 1.7, // shots per second
    projectileSpeed: 420,
    color: '#ffb347',
    upgrade: { cost: 50, damage: 28, range: 150, rate: 1.9 },
    sellBack: 0.7,
  },
  mortar: {
    key: '2',
    name: 'Bellows Mortar',
    short: 'Mortar',
    blurb: 'Splash fire',
    cost: 120,
    range: 175,
    damage: 40,
    rate: 0.55,
    splash: 58,
    projectileSpeed: 300,
    color: '#ff7a3c',
    upgrade: { cost: 100, damage: 65, range: 190, rate: 0.62, splash: 74 },
    sellBack: 0.7,
  },
  lantern: {
    key: '3',
    name: 'Frostward Lantern',
    short: 'Lantern',
    blurb: 'Slow + burn',
    cost: 90,
    range: 125,
    damage: 0, // aura, no projectile
    burn: 5, // damage per second inside the aura
    slow: 0.42, // enemies move at 58% speed
    rate: 0, // aura ticks continuously
    color: '#7fd4ff',
    upgrade: { cost: 80, burn: 9, range: 140, slow: 0.56 },
    sellBack: 0.7,
  },
};

export const ENEMIES = {
  shiver: {
    name: 'Shiverling',
    hp: 32,
    speed: 58,
    reward: 6,
    damage: 5, // warmth lost when it reaches the hearth
    radius: 13,
    color: '#a8c8e8',
    dark: '#5f7fa8',
  },
  rime: {
    name: 'Rimebound',
    hp: 130,
    speed: 30,
    reward: 12,
    damage: 12,
    radius: 19,
    color: '#c9d6e8',
    dark: '#7d90a8',
  },
  wisp: {
    name: 'Wisp',
    hp: 48,
    speed: 74,
    reward: 9,
    damage: 7,
    radius: 12,
    color: '#cfe8ff',
    dark: '#8fb8d8',
  },
  boss: {
    name: 'Frost King',
    hp: 1400,
    speed: 19,
    reward: 300,
    damage: 40,
    radius: 34,
    color: '#dfe9f5',
    dark: '#8ba3c0',
  },
};

export const ABILITIES = {
  flare: {
    key: 'Space',
    name: 'Stoked Flare',
    blurb: 'Nova: 90 fire to all',
    damage: 90,
    burn: 12, // per second for 3 s after the nova
    cooldown: 25,
  },
  stoke: {
    key: 'Q',
    name: 'Stoke Hearth',
    blurb: '25 embers -> +12 warmth',
    cost: 25,
    heal: 12,
    cooldown: 10,
  },
};

export const SCORE = {
  kill: 10,
  waveClear: 100,
  winWarmth: 5, // per warmth left, on victory
};
