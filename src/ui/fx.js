// Visual flourishes: confetti bursts and counting numbers.

let reduced = false;
export const setReducedMotion = (on) => { reduced = on; };
export const motionReduced = () => reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;

export function confetti({ colors = ["#f6c453", "#ef7d57", "#7bdcb5", "#8ab4ff", "#d68cff"], count = 140, origin = [0.5, 0.35] } = {}) {
  if (motionReduced()) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  document.body.append(cv);
  const dpr = devicePixelRatio || 1;
  const W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr);
  const g = cv.getContext("2d");
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (8 + Math.random() * 10) * dpr;
    return { x: W * origin[0], y: H * origin[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
      w: (6 + Math.random() * 6) * dpr, h: (3 + Math.random() * 5) * dpr, c: colors[(Math.random() * colors.length) | 0], life: 1 };
  });
  let frame = 0;
  (function step() {
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (frame > 60) p.life -= 0.012;
      g.save(); g.globalAlpha = Math.max(0, p.life); g.translate(p.x, p.y); g.rotate(p.r);
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    frame++;
    if (frame < 200) requestAnimationFrame(step); else cv.remove();
  })();
}

export function countUp(node, to, { ms = 900, prefix = "", suffix = "" } = {}) {
  if (motionReduced()) { node.textContent = prefix + to + suffix; return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    node.textContent = prefix + Math.round(to * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

/** Floating "+120" style label rising from an element. */
export function floatText(anchor, text, cls = "") {
  const r = anchor.getBoundingClientRect();
  const n = document.createElement("div");
  n.className = `float-text ${cls}`;
  n.textContent = text;
  n.style.left = `${r.left + r.width / 2}px`;
  n.style.top = `${r.top}px`;
  document.body.append(n);
  setTimeout(() => n.remove(), 1300);
}
