// Synthesized sound effects (Web Audio): no audio files to load.

let ctx = null;
let enabled = true;
export const setSound = (on) => { enabled = on; };

function tone(freq, { at = 0, dur = 0.15, type = "sine", gain = 0.12, slide = 0 } = {}) {
  if (!enabled) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  tap: () => tone(660, { dur: 0.05, type: "triangle", gain: 0.05 }),
  correct: (combo = 0) => {
    const base = 523 * Math.pow(2, Math.min(combo, 6) / 12);
    tone(base, { dur: 0.12, type: "triangle" });
    tone(base * 1.5, { at: 0.08, dur: 0.22, type: "triangle" });
  },
  wrong: () => { tone(196, { dur: 0.28, type: "sawtooth", gain: 0.05, slide: 0.7 }); },
  tick: () => tone(1200, { dur: 0.03, type: "square", gain: 0.02 }),
  star: (i) => tone(784 * Math.pow(2, i * 4 / 12), { dur: 0.3, type: "sine", gain: 0.1 }),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.35, type: "triangle", gain: 0.09 })),
  unlock: () => [392, 523, 784].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.5, type: "sine", gain: 0.08 })),
  build: () => { tone(220, { dur: 0.1, type: "square", gain: 0.04 }); tone(330, { at: 0.12, dur: 0.1, type: "square", gain: 0.04 }); tone(660, { at: 0.24, dur: 0.3, type: "triangle", gain: 0.08 }); },
};
