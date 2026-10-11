// Geometry helpers shared by the map and the realm scenes.

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
export function smoothClosed(pts, tension = 1) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

/** Organic island outline around (cx, cy). Returns { d, radiusAt(angle) }. */
export function blob(rng, cx, cy, rx, ry, { points = 22, wobble = 0.28 } = {}) {
  const radii = [];
  const phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = 1 + wobble * (0.5 * Math.sin(a * 2 + phases[0]) + 0.3 * Math.sin(a * 5 + phases[1]) + 0.2 * Math.sin(a * 9 + phases[2])) + (rng() - 0.5) * wobble * 0.5;
    radii.push(r);
  }
  const pts = radii.map((r, i) => {
    const a = (i / points) * Math.PI * 2;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
  const radiusAt = (a) => {
    const t = ((a / (Math.PI * 2)) * points + points) % points;
    const i = Math.floor(t), f = t - i;
    return radii[i] * (1 - f) + radii[(i + 1) % points] * f;
  };
  const inside = (x, y, margin = 0.85) => {
    const a = Math.atan2((y - cy) / ry, (x - cx) / rx);
    const dist = Math.hypot((x - cx) / rx, (y - cy) / ry);
    return dist < radiusAt((a + Math.PI * 2) % (Math.PI * 2)) * margin;
  };
  return { d: smoothClosed(pts), inside };
}

/** A ridgeline filled down to the bottom edge. */
export function ridge(rng, { width, height, base, amp, step = 16, freq = 1, jag = 0.15 }) {
  const ph = [rng() * 9, rng() * 9, rng() * 9];
  let d = `M0,${height}`;
  for (let x = 0; x <= width + step; x += step) {
    const t = x / width;
    const y = base
      - amp * (0.55 * Math.sin(t * 6.28 * freq + ph[0]) + 0.3 * Math.sin(t * 6.28 * freq * 2.3 + ph[1]) + 0.15 * Math.sin(t * 6.28 * freq * 5.1 + ph[2]))
      - amp * jag * (rng() - 0.5);
    d += `L${x},${y.toFixed(1)}`;
  }
  return d + `L${width + step},${height}Z`;
}

/** Height of a ridge-like curve at x, deterministic (for placing objects on hills). */
export function hillY(x, width, base, amp, seed) {
  const t = x / width;
  return base - amp * (0.6 * Math.sin(t * 6.28 + seed) + 0.4 * Math.sin(t * 13 + seed * 2));
}
