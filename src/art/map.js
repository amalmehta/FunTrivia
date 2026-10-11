// The illustrated world map: an ocean, three continents (one per region),
// scattered mountains and forests, sea routes, a compass rose, drifting clouds,
// and fog that hides realms the player hasn't opened yet.
// Colors come from CSS variables so the map has a day and a night look.

import { seededRng } from "../engine.js";
import { REALMS, REGIONS, realmCssVars } from "../realms.js";
import { blob } from "./shapes.js";
import { glyph } from "./icons.js";

export const MAP_W = 1600;
export const MAP_H = 1000;

const CONTINENTS = {
  azure: { cx: 390, cy: 300, rx: 260, ry: 215 },
  ember: { cx: 1170, cy: 285, rx: 250, ry: 200 },
  violet: { cx: 810, cy: 720, rx: 290, ry: 165 },
};

function mountain(x, y, s) {
  return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><path d="M-18,0L0,-26L18,0z" class="mt"/><path d="M0,-26L18,0H4L-3,-10z" class="mt-shade"/><path d="M0,-26L-6,-17L-2,-18L1,-14L5,-18z" class="mt-snow"/></g>`;
}
function tree(x, y, s) {
  return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="1" rx="6" ry="2" class="tree-sh"/><path d="M0,-16L7,0H-7z" class="tree"/></g>`;
}

/**
 * state: { open: Set<realmId>, costs: {realmId: stars}, stars: {realmId: n}, totalStars }
 */
export function worldMap(state) {
  const rng = seededRng("world-map");
  let lands = "", deco = "", labels = "";

  for (const region of REGIONS) {
    const k = CONTINENTS[region.id];
    const b = blob(rng, k.cx, k.cy, k.rx, k.ry, { points: 26, wobble: 0.3 });
    lands += `<g class="land land-${region.id}">
      <path d="${b.d}" class="shallows" transform="translate(0 0)"/>
      <path d="${b.d}" class="coast-shadow" transform="translate(6 10)"/>
      <path d="${b.d}" class="ground"/>
      <path d="${b.d}" class="ground-inner" transform="translate(${k.cx * 0.06} ${k.cy * 0.06}) scale(0.94)"/>
    </g>`;
    // islets
    for (let i = 0; i < 4; i++) {
      const a = rng() * 6.28, d = 1.2 + rng() * 0.25;
      const ib = blob(rng, k.cx + Math.cos(a) * k.rx * d, k.cy + Math.sin(a) * k.ry * d, 18 + rng() * 22, 12 + rng() * 14, { points: 10, wobble: 0.35 });
      lands += `<g class="land land-${region.id}"><path d="${ib.d}" class="shallows"/><path d="${ib.d}" class="ground"/></g>`;
    }
    // mountains and forests, kept away from realm medallions
    const realmsHere = REALMS.filter((r) => r.region === region.id);
    const items = [];
    for (let i = 0; i < 70; i++) {
      const x = k.cx + (rng() - 0.5) * k.rx * 2, y = k.cy + (rng() - 0.5) * k.ry * 2;
      if (!b.inside(x, y, 0.82)) continue;
      if (realmsHere.some((r) => Math.hypot(r.x - x, r.y - y) < 85)) continue;
      items.push([y, rng() < 0.45 ? mountain(x, y, 0.8 + rng() * 0.9) : tree(x, y, 0.8 + rng() * 0.6)]);
    }
    deco += items.sort((a, b2) => a[0] - b2[0]).map((i) => i[1]).join("");
    const labelY = region.id === "violet" ? k.cy + k.ry + 50 : k.cy - k.ry - 30;
    labels += `<text x="${k.cx}" y="${labelY}" class="region-label">${region.name}</text><text x="${k.cx}" y="${labelY + 24}" class="region-sub">${region.subtitle}</text>`;
  }

  // sea routes: realms within a region, plus voyages between regions
  const route = (a, b, bend = 0.18, cls = "route") => {
    const mx = (a.x + b.x) / 2 - (b.y - a.y) * bend, my = (a.y + b.y) / 2 + (b.x - a.x) * bend;
    return `<path d="M${a.x},${a.y}Q${mx},${my} ${b.x},${b.y}" class="${cls}"/>`;
  };
  const R = Object.fromEntries(REALMS.map((r) => [r.id, r]));
  let routes = "";
  for (const [a, b] of [["wilds", "lab"], ["lab", "cosmos"], ["wilds", "cosmos"], ["myth", "history"], ["history", "geography"], ["myth", "geography"], ["music", "lit"], ["lit", "art"]]) routes += route(R[a], R[b], 0.12);
  for (const [a, b] of [["cosmos", "music"], ["lab", "myth"], ["geography", "art"]]) routes += route(R[a], R[b], 0.2, "route sea");

  // ocean texture: wave glyphs
  let waves = "";
  for (let i = 0; i < 90; i++) {
    const x = rng() * MAP_W, y = rng() * MAP_H;
    if (REGIONS.some((g) => { const k = CONTINENTS[g.id]; return Math.hypot((x - k.cx) / (k.rx * 1.35), (y - k.cy) / (k.ry * 1.35)) < 1; })) continue;
    waves += `<path d="M${x.toFixed(0)},${y.toFixed(0)}q6,-5 12,0t12,0" class="wave"/>`;
  }

  // realm medallions
  let nodes = "";
  for (const r of REALMS) {
    const open = state.open.has(r.id);
    const stars = state.stars[r.id] ?? 0;
    const pct = stars / 15;
    const arc = 2 * Math.PI * 46;
    nodes += `<g class="realm-node ${open ? "open" : "locked"}" data-realm="${r.id}" style="${realmCssVars(r)}" transform="translate(${r.x} ${r.y})" tabindex="${open ? 0 : -1}" role="button" aria-label="${r.name}, ${r.topic}${open ? `, ${stars} of 15 stars` : ", locked"}">
      <ellipse cx="0" cy="44" rx="40" ry="9" class="node-shadow"/>
      <circle r="52" class="node-halo"/>
      <circle r="46" class="node-ring-bg"/>
      <circle r="46" class="node-ring" stroke-dasharray="${(arc * pct).toFixed(1)} ${arc.toFixed(1)}" transform="rotate(-90)"/>
      <circle r="38" class="node-disc"/>
      <circle r="38" class="node-sheen"/>
      <g transform="translate(-19 -19) scale(.8)" class="node-glyph" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${glyph(r.icon)}</g>
      <g class="node-label" transform="translate(0 74)"><rect x="${-(r.name.length * 5.6 + 18)}" y="-16" width="${r.name.length * 11.2 + 36}" height="30" rx="15"/><text y="5">${r.name}</text></g>
      ${open ? `<text y="104" class="node-stars">★ ${stars}/15</text>` : `<g class="node-lock"><g transform="translate(-11 50) scale(.46)" fill="none" stroke-width="3.4">${glyph("lock")}</g><text y="104" class="node-stars">${state.costs[r.id] ?? "?"} ★ to unveil</text></g>`}
    </g>`;
    if (!open) {
      let fog = "";
      for (let i = 0; i < 7; i++) fog += `<circle cx="${r.x + (rng() - 0.5) * 120}" cy="${r.y + (rng() - 0.5) * 80}" r="${40 + rng() * 30}"/>`;
      nodes = `<g class="fog" filter="url(#fogblur)">${fog}</g>` + nodes;
    }
  }

  // compass rose
  const compass = `<g transform="translate(130 860)" class="compass">
    <circle r="62" class="c-ring"/><circle r="52" class="c-ring thin"/>
    ${[0, 90, 180, 270].map((a) => `<path d="M0,-58L9,0L0,58L-9,0z" transform="rotate(${a})" class="c-pt"/>`).join("")}
    ${[45, 135].map((a) => `<path d="M0,-40L6,0L0,40L-6,0z" transform="rotate(${a})" class="c-pt2"/>`).join("")}
    <path d="M0,-58L9,0H-9z" class="c-north"/><text y="-70" class="c-n">N</text></g>`;

  // a little ship sailing between continents
  const ship = `<g class="ship"><g transform="translate(640 470)"><path d="M-22,0h44l-8,12h-28z" class="ship-hull"/><path d="M0,-2v-34l18,28z" class="ship-sail"/><path d="M-2,-4v-26l-14,22z" class="ship-sail"/></g></g>`;

  // clouds drifting over the sea
  let clouds = "";
  for (let i = 0; i < 6; i++) {
    const y = 80 + rng() * 820, s = 0.7 + rng() * 0.9;
    clouds += `<g class="map-cloud" style="animation-duration:${90 + rng() * 80}s;animation-delay:-${rng() * 120}s"><g transform="translate(0 ${y.toFixed(0)}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="0" rx="90" ry="22"/><ellipse cx="30" cy="-14" rx="50" ry="24"/><ellipse cx="-30" cy="-8" rx="40" ry="18"/></g></g>`;
  }

  return `<svg class="world" viewBox="0 0 ${MAP_W} ${MAP_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World map of realms">
  <defs>
    <radialGradient id="ocean" cx="50%" cy="45%" r="75%"><stop offset="0" style="stop-color:var(--ocean-1)"/><stop offset="1" style="stop-color:var(--ocean-2)"/></radialGradient>
    <filter id="fogblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .3  0 0 0 0 .2  0 0 0 .08 0"/></filter>
    <radialGradient id="vignette" cx="50%" cy="50%" r="72%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <radialGradient id="sheen" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#ocean)"/>
  ${waves}
  ${lands}
  ${routes}
  ${deco}
  ${labels}
  ${ship}
  ${compass}
  ${nodes}
  ${clouds}
  <rect width="${MAP_W}" height="${MAP_H}" filter="url(#paper)"/>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#vignette)" pointer-events="none"/>
  <rect x="14" y="14" width="${MAP_W - 28}" height="${MAP_H - 28}" class="map-frame" rx="10"/>
</svg>`;
}
