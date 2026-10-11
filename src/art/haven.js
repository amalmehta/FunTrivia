// The Haven: the player's hilltop home. Nine plots, one per realm; each
// building grows through three tiers as the player builds it up.

import { BUILDINGS, seededRng } from "../engine.js";
import { ridge } from "./shapes.js";
import { realmById } from "../realms.js";
import { glyph } from "./icons.js";

export const HAVEN_W = 1200;
export const HAVEN_H = 700;

// back row → front row
export const PLOTS = [
  [330, 300], [600, 270], [870, 300],
  [230, 440], [600, 420], [970, 440],
  [380, 590], [600, 600], [820, 590],
];

const WARM = "hsl(44 100% 72%)";

function structure(b, tier, x, y) {
  const r = realmById[b.realm];
  const roof = `hsl(${r.light[0]} ${r.light[1]}% ${r.light[2]}%)`;
  const roofHi = `hsl(${r.light[0]} ${r.light[1]}% ${Math.min(80, r.light[2] + 14)}%)`;
  if (tier === 0) {
    return `<g class="plot empty"><ellipse cx="${x}" cy="${y}" rx="70" ry="22" class="plot-ground"/><ellipse cx="${x}" cy="${y}" rx="58" ry="16" class="plot-dash"/>
      <path d="M${x - 4},${y - 4}v-40" class="sign-post"/><rect x="${x - 26}" y="${y - 58}" width="52" height="22" rx="4" class="sign"/>
      <g transform="translate(${x - 8} ${y - 55}) scale(.33)" fill="none" stroke="${roof}" stroke-width="4">${glyph(r.icon)}</g></g>`;
  }
  const w = [0, 70, 96, 120][tier], h = [0, 46, 72, 96][tier];
  let s = `<ellipse cx="${x}" cy="${y + 2}" rx="${w * 0.75}" ry="${w * 0.2}" class="plot-ground"/>`;
  // main hall: front face + side face for depth
  s += `<path d="M${x - w / 2},${y}v-${h}h${w}v${h}z" class="wall"/>`;
  s += `<path d="M${x + w / 2},${y}v-${h}l${w * 0.22},-${w * 0.12}v${h}z" class="wall-side"/>`;
  s += `<path d="M${x - w / 2 - 6},${y - h}L${x},${y - h - w * 0.45}L${x + w / 2 + 6},${y - h}z" fill="${roof}"/>`;
  s += `<path d="M${x},${y - h - w * 0.45}L${x + w / 2 + 6},${y - h}l${w * 0.22},-${w * 0.12}L${x + w * 0.22},${y - h - w * 0.57}z" fill="${roofHi}" opacity=".85"/>`;
  s += `<path d="M${x - 9},${y}v-18a9,9 0 0 1 18,0v18z" class="door"/>`;
  const wins = tier === 1 ? [-0.3, 0.3] : [-0.34, 0, 0.34];
  for (const fx of wins) if (fx !== 0 || tier < 2) s += `<rect x="${x + fx * w - 5}" y="${y - h * 0.72}" width="10" height="14" rx="5" fill="${WARM}" class="glow-win"/>`;
  if (tier >= 2) {
    // side tower
    const tx = x - w / 2 - 14;
    s += `<rect x="${tx - 14}" y="${y - h - 34}" width="28" height="${h + 34}" class="wall"/><path d="M${tx - 18},${y - h - 34}L${tx},${y - h - 70}L${tx + 18},${y - h - 34}z" fill="${roof}"/>`;
    s += `<rect x="${tx - 4}" y="${y - h - 18}" width="8" height="12" rx="4" fill="${WARM}" class="glow-win"/>`;
  }
  if (tier >= 3) {
    const tx = x + w / 2 + 18;
    s += `<rect x="${tx - 12}" y="${y - h - 20}" width="24" height="${h + 20}" class="wall"/><path d="M${tx - 16},${y - h - 20}L${tx},${y - h - 60}L${tx + 16},${y - h - 20}z" fill="${roof}"/>`;
    // banner with the realm emblem
    s += `<path d="M${x - 20},${y - h + 6}h40v40l-20,-10l-20,10z" fill="${roof}" stroke="${roofHi}" stroke-width="2"/>`;
    s += `<g transform="translate(${x - 13} ${y - h + 10}) scale(.55)" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${glyph(r.icon)}</g>`;
    // flag
    const fx = x, fy = y - h - w * 0.45;
    s += `<path d="M${fx},${fy}v-34" class="sign-post"/><path d="M${fx},${fy - 34}q14,-6 26,2q-12,6 -26,6z" fill="${roof}" class="flag"/>`;
  }
  return `<g class="plot built tier-${tier}">${s}</g>`;
}

export function havenScene(buildings) {
  let plots = "";
  BUILDINGS.forEach((b, i) => {
    const [x, y] = PLOTS[i];
    plots += `<g class="haven-plot" data-building="${b.id}" tabindex="0" role="button" aria-label="${b.name}, tier ${buildings[b.id] ?? 0} of 3">${structure(b, buildings[b.id] ?? 0, x, y)}</g>`;
  });
  return `<svg class="haven-svg" viewBox="0 0 ${HAVEN_W} ${HAVEN_H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your Haven">
    <defs>
      <linearGradient id="hv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-sky1)"/><stop offset="1" style="stop-color:var(--hv-sky2)"/></linearGradient>
      <linearGradient id="hv-hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-hill1)"/><stop offset="1" style="stop-color:var(--hv-hill2)"/></linearGradient>
    </defs>
    <rect width="${HAVEN_W}" height="${HAVEN_H}" fill="url(#hv-sky)"/>
    ${backdrop()}
    <path d="M0,260 C200,200 350,240 520,210 S900,190 1200,240 V700 H0Z" class="hv-far"/>
    <path d="M0,330 C150,250 420,230 600,225 S1050,250 1200,320 V700 H0Z" fill="url(#hv-hill)"/>
    <path d="M60,700 C120,520 300,360 600,340 S1080,520 1140,700Z" class="hv-terrace"/>
    <path d="M600,700 C590,640 610,560 600,500 S590,380 600,300" class="hv-road"/>
    ${trees()}
    ${plots}
  </svg>`;
}

function backdrop() {
  const rng = seededRng("haven-sky");
  let clouds = "";
  for (let i = 0; i < 5; i++) {
    const x = rng() * HAVEN_W, y = 40 + rng() * 120, k = 0.6 + rng() * 0.8;
    clouds += `<g class="hv-cloud" style="animation-duration:${70 + rng() * 60}s;animation-delay:-${(rng() * 70).toFixed(0)}s"><g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)})"><ellipse rx="80" ry="18"/><ellipse cx="26" cy="-14" rx="44" ry="22"/><ellipse cx="-28" cy="-6" rx="34" ry="16"/></g></g>`;
  }
  return `<circle cx="940" cy="110" r="150" class="hv-sun-glow"/><circle cx="940" cy="110" r="42" class="hv-sun"/>
    ${clouds}
    <path d="${ridge(rng, { width: HAVEN_W, height: HAVEN_H, base: 215, amp: 60, freq: 1.4, jag: 0.4 })}" class="hv-mtn"/>
    <path d="${ridge(rng, { width: HAVEN_W, height: HAVEN_H, base: 240, amp: 30, freq: 2.2, jag: 0.3 })}" class="hv-mtn2"/>`;
}

function trees() {
  const rng = seededRng("haven-trees");
  const spots = [];
  for (let i = 0; i < 70; i++) {
    const x = rng() * HAVEN_W, y = 250 + rng() * 440;
    if (PLOTS.some(([px, py]) => Math.abs(px - x) < 110 && py - y < 150 && y - py < 40)) continue;
    if (Math.abs(x - 600) < 40) continue; // keep the road clear
    if (x > 140 && x < 1060 && y > 330) continue; // keep the terrace open
    spots.push([x, y, 0.7 + (y - 250) / 440 * 0.9]);
  }
  return spots.sort((a, b) => a[1] - b[1]).map(([x, y, k]) => rng() < 0.5
    ? `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)})"><ellipse cy="2" rx="12" ry="4" class="hv-tree-sh"/><path d="M0,-44L14,0H-14z" class="hv-pine"/></g>`
    : `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${k.toFixed(2)})"><ellipse cy="2" rx="14" ry="4" class="hv-tree-sh"/><rect x="-2.5" y="-16" width="5" height="16" class="hv-trunk"/><circle cy="-26" r="15" class="hv-leaf"/><circle cx="-5" cy="-30" r="7" class="hv-leaf-hi"/></g>`).join("");
}
