// Layered "poster" panoramas, one per realm: sky, celestial body, hazy ridges,
// the realm's signature buildings in silhouette, and a winding trail of landmarks.

import { seededRng } from "../engine.js";
import { ridge, hillY } from "./shapes.js";

export const SCENE_W = 1200;
export const SCENE_H = 600;

// Where the five landmarks sit on the trail (fractions of the scene).
export const TRAIL = [
  [0.1, 0.86], [0.3, 0.74], [0.5, 0.82], [0.7, 0.7], [0.88, 0.58],
];

const c = (h, s, l, a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;
const WARM = "hsl(44 100% 72%)";

function palette(realm, dark) {
  const h = realm.light[0];
  const night = dark || realm.id === "cosmos";
  return night
    ? { h, night, skyTop: c(h, 55, 8), skyMid: c(h + 10, 45, 18), skyLow: c(h + 25, 50, 34), orb: c(h + 30, 30, 92),
        layers: [c(h, 30, 30), c(h, 32, 23), c(h, 36, 16), c(h, 40, 10)], mist: c(h, 40, 60, 0.12) }
    : { h, night, skyTop: c(h, 55, 60), skyMid: c(h + 15, 65, 76), skyLow: c(h + 35, 85, 88), orb: c(h + 40, 100, 94),
        layers: [c(h, 30, 74), c(h, 32, 58), c(h, 38, 40), c(h, 45, 22)], mist: c(h + 20, 80, 96, 0.35) };
}

// ---------- signature silhouettes (drawn standing on y = ground) ----------

const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${WARM}" class="glow-win"/>`;

const BUILD = {
  cosmos: (x, g, f) => `
    <rect x="${x - 40}" y="${g - 90}" width="80" height="90" fill="${f}"/>
    <path d="M${x - 50},${g - 90}a50,50 0 0 1 100,0z" fill="${f}"/>
    <rect x="${x - 8}" y="${g - 150}" width="16" height="70" fill="${f}" transform="rotate(-35 ${x} ${g - 110})"/>
    ${win(x - 22, g - 60, 10, 18)}${win(x + 12, g - 60, 10, 18)}
    <rect x="${x + 70}" y="${g - 50}" width="40" height="50" fill="${f}"/><path d="M${x + 64},${g - 50}a26,24 0 0 1 52,0z" fill="${f}"/>`,
  lab: (x, g, f) => `
    <path d="M${x - 30},${g}L${x - 22},${g - 200}L${x},${g - 280}L${x + 22},${g - 200}L${x + 30},${g}z" fill="${f}"/>
    <circle cx="${x}" cy="${g - 214}" r="12" fill="${WARM}" class="glow-win"/>
    ${win(x - 6, g - 150, 12, 24)}${win(x - 6, g - 90, 12, 24)}
    <path d="M${x + 50},${g}v-80h40v80z M${x + 46},${g - 80}h48l-24,-30z" fill="${f}"/>${win(x + 64, g - 60, 12, 16)}
    <path d="M${x - 90},${g}v-60h34v60z" fill="${f}"/><circle cx="${x - 73}" cy="${g - 82}" r="9" fill="none" stroke="${f}" stroke-width="5"/>`,
  wilds: (x, g, f, rng) => {
    let s = "";
    for (let i = 0; i < 9; i++) {
      const tx = x - 160 + i * 40 + rng() * 20, th = 70 + rng() * 90;
      s += i % 3 === 1
        ? `<rect x="${tx - 3}" y="${g - th * 0.5}" width="6" height="${th * 0.5}" fill="${f}"/><circle cx="${tx}" cy="${g - th * 0.6}" r="${th * 0.32}" fill="${f}"/>`
        : `<path d="M${tx},${g - th}L${tx + th * 0.22},${g}L${tx - th * 0.22},${g}z" fill="${f}"/>`;
    }
    return s + `<path d="M${x - 10},${g}q30,-60 70,-30q-30,10 -40,30z" fill="${f}"/>`;
  },
  myth: (x, g, f) => {
    let s = `<path d="M${x - 110},${g - 120}h220l-110,-50z" fill="${f}"/><rect x="${x - 112}" y="${g - 124}" width="224" height="10" fill="${f}"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${x - 100 + i * 38}" y="${g - 114}" width="14" height="114" fill="${f}"/>`;
    s += `<path d="M${x + 150},${g}l6,-90l22,-6l8,96z M${x + 196},${g}l4,-60l16,0l4,60z" fill="${f}"/>`;
    return s + `<circle cx="${x}" cy="${g - 138}" r="7" fill="${WARM}" class="glow-win"/>`;
  },
  history: (x, g, f) => {
    let s = `<rect x="${x - 130}" y="${g - 80}" width="260" height="80" fill="${f}"/>`;
    for (let i = 0; i < 13; i++) s += `<rect x="${x - 130 + i * 20}" y="${g - 92}" width="10" height="12" fill="${f}"/>`;
    for (const tx of [x - 140, x + 110]) s += `<rect x="${tx}" y="${g - 150}" width="30" height="150" fill="${f}"/><path d="M${tx - 6},${g - 150}h42l-21,-40z" fill="${f}"/>${win(tx + 10, g - 120, 10, 18)}`;
    s += `<rect x="${x - 25}" y="${g - 190}" width="50" height="110" fill="${f}"/><path d="M${x - 31},${g - 190}h62l-31,-50z" fill="${f}"/>`;
    s += `<path d="M${x},${g - 240}v-30l22,8l-22,8" fill="${f}"/>${win(x - 6, g - 160, 12, 22)}`;
    return s + `<path d="M${x - 18},${g}v-30a18,18 0 0 1 36,0v30z" fill="${WARM}" opacity=".55"/>`;
  },
  geography: (x, g, f) => `
    <path d="M${x - 20},${g}L${x - 13},${g - 170}h26L${x + 20},${g}z" fill="${f}"/>
    <rect x="${x - 18}" y="${g - 196}" width="36" height="26" fill="${f}"/><path d="M${x - 22},${g - 196}h44l-22,-22z" fill="${f}"/>
    <rect x="${x - 10}" y="${g - 192}" width="20" height="16" fill="${WARM}" class="glow-win"/>
    <path d="M${x},${g - 184}L${x + 260},${g - 230}L${x + 260},${g - 140}z" fill="${WARM}" opacity=".18" class="beam"/>
    <path d="M${x - 160},${g}q14,-40 28,-40h50l18,40z" fill="${f}"/><path d="M${x - 120},${g - 40}v-60l40,50z" fill="${f}"/>`,
  music: (x, g, f) => {
    let s = "";
    const hs = [90, 130, 170, 210, 170, 130, 90];
    hs.forEach((h, i) => { s += `<rect x="${x - 84 + i * 24}" y="${g - h}" width="16" height="${h}" rx="8" fill="${f}"/>`; });
    s += `<rect x="${x - 100}" y="${g - 40}" width="200" height="40" fill="${f}"/>`;
    s += `<path d="M${x + 140},${g}v-100h40v100z M${x + 134},${g - 100}h52l-26,-46z" fill="${f}"/><circle cx="${x + 160}" cy="${g - 78}" r="9" fill="${WARM}" class="glow-win"/>`;
    return s;
  },
  lit: (x, g, f) => {
    let s = `<rect x="${x - 60}" y="${g - 160}" width="120" height="160" fill="${f}"/><path d="M${x - 72},${g - 160}h144l-72,-50z" fill="${f}"/>`;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) s += win(x - 40 + k * 32, g - 140 + r * 42, 14, 24);
    s += `<g class="float-book"><path d="M${x + 150},${g - 210}q20,-12 40,0q20,-12 40,0v24q-20,-12 -40,0q-20,-12 -40,0z" fill="${f}"/></g>`;
    return s + `<g class="float-book slow"><path d="M${x - 200},${g - 170}q14,-9 28,0q14,-9 28,0v17q-14,-9 -28,0q-14,-9 -28,0z" fill="${f}"/></g>`;
  },
  art: (x, g, f) => {
    let s = `<rect x="${x - 110}" y="${g - 100}" width="220" height="100" fill="${f}"/><path d="M${x - 70},${g - 100}a70,70 0 0 1 140,0z" fill="${f}"/>`;
    s += `<rect x="${x - 6}" y="${g - 190}" width="12" height="26" fill="${f}"/>`;
    for (let i = 0; i < 5; i++) s += `<path d="M${x - 96 + i * 42},${g}v-56a14,14 0 0 1 28,0v56z" fill="${WARM}" opacity=".5"/>`;
    s += `<path d="M${x + 150},${g}l20,-120l20,120z M${x + 140},${g - 70}h60" fill="${f}" stroke="${f}" stroke-width="5"/>`;
    return s + `<rect x="${x + 146}" y="${g - 118}" width="48" height="40" fill="${f}"/>`;
  },
};

// ---------- the scene ----------

export function realmScene(realm, { dark = false, trail = true } = {}) {
  const W = SCENE_W, H = SCENE_H;
  const rng = seededRng(`scene:${realm.id}`);
  const p = palette(realm, dark);
  const id = `s-${realm.id}`;

  let stars = "";
  if (p.night) {
    for (let i = 0; i < 140; i++) {
      const r = rng() < 0.08 ? 1.8 : 0.6 + rng() * 0.8;
      stars += `<circle cx="${(rng() * W).toFixed(0)}" cy="${(rng() * H * 0.55).toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.3 + rng() * 0.7).toFixed(2)}" ${rng() < 0.25 ? `class="twinkle" style="animation-delay:${(rng() * 4).toFixed(1)}s"` : ""}/>`;
    }
  }
  const orbX = 180 + rng() * 820, orbY = p.night ? 110 : 150;
  const orb = p.night
    ? `<circle cx="${orbX}" cy="${orbY}" r="120" fill="url(#${id}-glow)"/><circle cx="${orbX}" cy="${orbY}" r="34" fill="${p.orb}"/><circle cx="${orbX + 13}" cy="${orbY - 8}" r="30" fill="${p.skyTop}" opacity=".85"/>`
    : `<circle cx="${orbX}" cy="${orbY}" r="220" fill="url(#${id}-glow)"/><circle cx="${orbX}" cy="${orbY}" r="48" fill="${p.orb}"/>`;

  // clouds (day) or aurora ribbon (night)
  let sky2 = "";
  if (p.night) {
    sky2 = `<path d="M-50,${190 + rng() * 40} C300,${80 + rng() * 60} 600,${260} 1250,${120 + rng() * 40}" stroke="hsl(${p.h + 60} 80% 65% / .22)" stroke-width="46" fill="none" filter="url(#${id}-blur)" class="aurora"/>`;
  } else {
    for (let i = 0; i < 5; i++) {
      const cx = rng() * W, cy = 60 + rng() * 160, s = 0.6 + rng() * 0.8;
      sky2 += `<g class="drift" style="animation-duration:${60 + rng() * 60}s;animation-delay:-${rng() * 60}s" opacity=".75"><ellipse cx="${cx}" cy="${cy}" rx="${70 * s}" ry="${16 * s}" fill="#fff"/><ellipse cx="${cx + 25 * s}" cy="${cy - 10 * s}" rx="${40 * s}" ry="${18 * s}" fill="#fff"/></g>`;
    }
  }

  const r1 = ridge(rng, { width: W, height: H, base: 300, amp: 70, freq: 1.2, jag: 0.3 });
  const r2 = ridge(rng, { width: W, height: H, base: 360, amp: 50, freq: 1.8, jag: 0.2 });
  const ground = 430;
  const builder = BUILD[realm.id] ?? BUILD.history;
  const sig = builder(W * 0.62, ground + 8, p.layers[2], rng);
  const r3 = ridge(rng, { width: W, height: H, base: ground + 10, amp: 18, freq: 1, jag: 0.05 });

  // foreground: rolling hill with the trail
  const fg = `M0,${H}L0,${hillY(0, W, 520, 20, 1)}` + Array.from({ length: 61 }, (_, i) => `L${i * 20},${hillY(i * 20, W, 520, 20, 1).toFixed(1)}`).join("") + `L${W},${H}Z`;
  const tp = TRAIL.map(([fx, fy]) => [fx * W, fy * H]);
  let trailPath = `M${-20},${H * 0.95}`;
  let prev = [-20, H * 0.95];
  for (const pt of tp) {
    const mx = (prev[0] + pt[0]) / 2;
    trailPath += `C${mx},${prev[1]} ${mx},${pt[1]} ${pt[0]},${pt[1]}`;
    prev = pt;
  }

  // foreground flourishes: grass tufts / sparkles
  let tufts = "";
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = hillY(x, W, 520, 20, 1) + 10 + rng() * 60;
    tufts += `<path d="M${x},${y}l-4,-12M${x},${y}l0,-15M${x},${y}l4,-11" stroke="${p.layers[3]}" stroke-width="2" stroke-linecap="round"/>`;
  }
  let motes = "";
  for (let i = 0; i < 18; i++) {
    motes += `<circle cx="${(rng() * W).toFixed(0)}" cy="${(320 + rng() * 260).toFixed(0)}" r="${(1.5 + rng() * 2).toFixed(1)}" fill="${WARM}" class="mote" style="animation-delay:-${(rng() * 8).toFixed(1)}s;animation-duration:${(6 + rng() * 6).toFixed(1)}s"/>`;
  }

  return `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${realm.name} landscape">
  <defs>
    <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyTop}"/><stop offset=".55" stop-color="${p.skyMid}"/><stop offset="1" stop-color="${p.skyLow}"/></linearGradient>
    <radialGradient id="${id}-glow"><stop offset="0" stop-color="${p.orb}" stop-opacity=".7"/><stop offset="1" stop-color="${p.orb}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.skyLow}" stop-opacity="0"/><stop offset="1" stop-color="${p.skyLow}" stop-opacity=".55"/></linearGradient>
    <filter id="${id}-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="${id}-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
  ${stars}${orb}${sky2}
  <path d="${r1}" fill="${p.layers[0]}"/>
  <rect y="250" width="${W}" height="200" fill="url(#${id}-haze)"/>
  <path d="${r2}" fill="${p.layers[1]}"/>
  <ellipse cx="${W / 2}" cy="${ground - 10}" rx="${W * 0.7}" ry="40" fill="${p.mist}" filter="url(#${id}-blur)"/>
  <g class="sig" transform="translate(${W * 0.62} ${ground + 8}) scale(1.4) translate(${-W * 0.62} ${-(ground + 8)})">${sig}</g>
  <path d="${r3}" fill="${p.layers[2]}"/>
  <path d="${fg}" fill="${p.layers[3]}"/>
  ${tufts}
  ${trail ? `<path d="${trailPath}" fill="none" stroke="${WARM}" stroke-opacity=".28" stroke-width="16" stroke-linecap="round"/><path d="${trailPath}" fill="none" stroke="${WARM}" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" class="trail-dash"/>` : ""}
  ${motes}
  <rect width="${W}" height="${H}" filter="url(#${id}-grain)" opacity=".9"/>
</svg>`;
}
