// The map: three winding paths from the dark gates to the hearth, the
// build plots beside them, and the scenery (pines, stones, snowdrifts).
// Paths are waypoint polylines; enemies walk them segment by segment.

import { HEARTH, VIEW } from './config.js';

export const GATES = [
  { name: 'West Gate', x: 0, y: 360 },
  { name: 'North Gate', x: 640, y: 0 },
  { name: 'East Gate', x: 1280, y: 360 },
];

// Each path ends a little short of the hearth centre: enemies stop at the
// stone ring and chew the warmth from there.
export const PATHS = [
  // West: in from the left, a dip south, then up to the hearth.
  [
    { x: -20, y: 360 }, { x: 170, y: 360 }, { x: 170, y: 545 },
    { x: 400, y: 545 }, { x: 400, y: 360 }, { x: 560, y: 360 },
  ],
  // North: down from the top, a jog east, then in to the hearth.
  [
    { x: 640, y: -20 }, { x: 640, y: 150 }, { x: 860, y: 150 },
    { x: 860, y: 300 }, { x: 720, y: 300 }, { x: 720, y: 360 },
  ],
  // East: in from the right, a rise north, then down to the hearth.
  [
    { x: 1300, y: 360 }, { x: 1110, y: 360 }, { x: 1110, y: 175 },
    { x: 880, y: 175 }, { x: 880, y: 360 }, { x: 720, y: 360 },
  ],
];

// Build plots: fixed circles near the paths. Towers only go on plots, so
// the player plans around the paths instead of walling them off.
export const PLOTS = [
  { x: 255, y: 290 }, { x: 255, y: 440 }, { x: 330, y: 545 },
  { x: 470, y: 470 }, { x: 470, y: 250 }, { x: 560, y: 200 },
  { x: 720, y: 220 }, { x: 800, y: 400 }, { x: 800, y: 520 },
  { x: 960, y: 290 }, { x: 960, y: 440 }, { x: 1040, y: 545 },
];

// Scenery, placed once with a fixed seed so the map never changes.
export const SCENERY = (() => {
  const pines = [];
  const rocks = [];
  const drifts = [];
  let s = 1234567;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const nearPath = (x, y) => {
    for (const path of PATHS) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + t * dx;
        const py = a.y + t * dy;
        if (Math.hypot(x - px, y - py) < 46) return true;
      }
    }
    return false;
  };
  const nearHearth = (x, y) => Math.hypot(x - HEARTH.x, y - HEARTH.y) < 120;
  const nearPlot = (x, y) => PLOTS.some((p) => Math.hypot(x - p.x, y - p.y) < 44);
  for (let i = 0; i < 90; i++) {
    const x = 20 + rnd() * (VIEW.w - 40);
    const y = 20 + rnd() * (VIEW.h - 40);
    if (nearPath(x, y) || nearHearth(x, y) || nearPlot(x, y)) continue;
    if (rnd() < 0.62) pines.push({ x, y, s: 0.7 + rnd() * 0.7 });
    else if (rnd() < 0.6) rocks.push({ x, y, r: 5 + rnd() * 9 });
    else drifts.push({ x, y, rx: 18 + rnd() * 34, ry: 6 + rnd() * 10 });
  }
  return { pines, rocks, drifts };
})();

// Distance from a point to the nearest path, used to keep floating text
// and particles out of the way (not needed by gameplay).
export function distToPath(x, y) {
  let best = Infinity;
  for (const path of PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
    }
  }
  return best;
}
