// Particles, floating text, screen shake and the falling snow: all the
// juice. Nothing here touches gameplay; it only makes the game feel alive.

export function createFx() {
  return {
    particles: [], // {x, y, vx, vy, life, maxLife, size, color, gravity, kind}
    texts: [], // {x, y, text, life, maxLife, color, size}
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    snow: [], // {x, y, speed, drift, size}
  };
}

export function initSnow(fx, rng, count) {
  fx.snow = [];
  for (let i = 0; i < count; i++) {
    fx.snow.push({
      x: rng() * 1280,
      y: rng() * 720,
      speed: 18 + rng() * 30,
      drift: (rng() - 0.5) * 14,
      size: 1 + rng() * 2.2,
    });
  }
}

export function burst(fx, x, y, color, n, speed, size, life) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    fx.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - speed * 0.25,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      gravity: 60,
      kind: 'spark',
    });
  }
}

export function emberRise(fx, x, y, n) {
  for (let i = 0; i < n; i++) {
    fx.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 12,
      vy: -(24 + Math.random() * 36),
      life: 0.9 + Math.random() * 0.8,
      maxLife: 1.4,
      size: 1.5 + Math.random() * 2,
      color: Math.random() < 0.5 ? '#ffb347' : '#ff7a3c',
      gravity: -30,
      kind: 'ember',
    });
  }
}

export function floatText(fx, x, y, text, color, size) {
  fx.texts.push({ x, y, text, life: 1.1, maxLife: 1.1, color, size: size || 15 });
}

export function addShake(fx, amount) {
  fx.shake = Math.min(14, fx.shake + amount);
}

export function updateFx(fx, dt) {
  for (const s of fx.snow) {
    s.y += s.speed * dt;
    s.x += s.drift * dt + Math.sin(s.y * 0.02) * 6 * dt;
    if (s.y > 724) {
      s.y = -4;
      s.x = Math.random() * 1280;
    }
    if (s.x < -4) s.x = 1284;
    if (s.x > 1284) s.x = -4;
  }
  for (let i = fx.particles.length - 1; i >= 0; i--) {
    const p = fx.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      fx.particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = fx.texts.length - 1; i >= 0; i--) {
    const t = fx.texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) fx.texts.splice(i, 1);
  }
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - dt * 26);
    fx.shakeX = (Math.random() - 0.5) * fx.shake;
    fx.shakeY = (Math.random() - 0.5) * fx.shake;
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
}
