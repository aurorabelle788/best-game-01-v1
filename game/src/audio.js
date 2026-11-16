// Procedural WebAudio sound: no audio files, every effect is a small
// oscillator or filtered-noise burst. Sound starts only after the player's
// first gesture (browsers block audio before that). M toggles mute.

let ctx = null;
let master = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, vol, filterFreq) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
}

export const sfx = {
  shoot() {
    tone(720, 0.07, 'square', 0.05, 420);
  },
  mortar() {
    noise(0.18, 0.12, 900);
    tone(180, 0.16, 'sine', 0.1, 70);
  },
  hit() {
    tone(240, 0.05, 'triangle', 0.06, 160);
  },
  kill() {
    tone(520, 0.09, 'sine', 0.09, 880);
    tone(780, 0.12, 'sine', 0.06, 1180);
  },
  build() {
    tone(330, 0.08, 'triangle', 0.1, 495);
    tone(495, 0.1, 'triangle', 0.08, 660);
  },
  upgrade() {
    tone(440, 0.08, 'sine', 0.09, 660);
    tone(660, 0.1, 'sine', 0.09, 990);
  },
  sell() {
    tone(600, 0.08, 'sine', 0.07, 300);
  },
  hearthHit() {
    tone(110, 0.25, 'sawtooth', 0.14, 55);
    noise(0.2, 0.1, 400);
  },
  horn() {
    tone(196, 0.5, 'sawtooth', 0.1, 196);
    tone(294, 0.5, 'sawtooth', 0.07, 294);
  },
  flare() {
    noise(0.5, 0.2, 2400);
    tone(880, 0.4, 'sine', 0.08, 1760);
  },
  stoke() {
    noise(0.3, 0.1, 1200);
    tone(392, 0.2, 'sine', 0.08, 587);
  },
  click() {
    tone(900, 0.04, 'square', 0.04, 700);
  },
  deny() {
    tone(160, 0.12, 'square', 0.08, 120);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(f, 0.25, 'sine', 0.1), i * 140);
    });
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => {
      setTimeout(() => tone(f, 0.3, 'triangle', 0.09), i * 180);
    });
  },
};
