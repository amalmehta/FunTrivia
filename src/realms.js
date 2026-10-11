// Realm metadata: names, topics, map placement and colors.
// Colors follow the "related share a hue family" rule: each region is one hue
// family, and realms inside it are spread far enough apart to tell at a glance.

export const REGIONS = [
  { id: "azure", name: "The Azure Reaches", subtitle: "Realms of Science", hue: 195 },
  { id: "ember", name: "The Ember Lands", subtitle: "Realms of the Human Story", hue: 25 },
  { id: "violet", name: "The Violet Isles", subtitle: "Realms of the Arts", hue: 295 },
];

// light / dark: [hue, saturation %, lightness %]
export const REALMS = [
  { id: "wilds", name: "Verdant Wilds", topic: "Animals & Nature", region: "azure", icon: "leaf",
    light: [162, 62, 34], dark: [162, 55, 52], x: 300, y: 300 },
  { id: "lab", name: "Alchemist's Spire", topic: "Science & the Human Body", region: "azure", icon: "flask",
    light: [192, 80, 36], dark: [192, 70, 56], x: 470, y: 205 },
  { id: "cosmos", name: "Starfall Observatory", topic: "Space & Astronomy", region: "azure", icon: "planet",
    light: [224, 68, 50], dark: [224, 85, 70], x: 450, y: 390 },
  { id: "myth", name: "Myth Hollow", topic: "Mythology & Legends", region: "ember", icon: "trident",
    light: [6, 70, 46], dark: [6, 80, 66], x: 1070, y: 250 },
  { id: "history", name: "Chronicle Citadel", topic: "World History", region: "ember", icon: "tower",
    light: [26, 85, 44], dark: [26, 90, 62], x: 1250, y: 180 },
  { id: "geography", name: "Compass Coast", topic: "Geography", region: "ember", icon: "compass",
    light: [44, 90, 36], dark: [44, 85, 58], x: 1240, y: 360 },
  { id: "music", name: "Echo Vale", topic: "Music", region: "violet", icon: "note",
    light: [266, 55, 52], dark: [266, 75, 74], x: 650, y: 740 },
  { id: "lit", name: "Inkwell Archive", topic: "Literature", region: "violet", icon: "book",
    light: [296, 48, 42], dark: [296, 55, 68], x: 820, y: 650 },
  { id: "art", name: "Canvas Heights", topic: "Art & Architecture", region: "violet", icon: "palette",
    light: [326, 65, 48], dark: [326, 75, 70], x: 960, y: 780 },
];

export const realmById = Object.fromEntries(REALMS.map((r) => [r.id, r]));

export function hsl([h, s, l], a = 1) {
  return a === 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${a})`;
}

/** CSS custom properties for a realm, emitted for both themes. */
export function realmCssVars(realm) {
  return `--rc-l:${hsl(realm.light)};--rc-d:${hsl(realm.dark)};--rh:${realm.light[0]};`;
}

// Content (lore + questions) is loaded lazily per realm.
const cache = {};
export async function loadRealm(id) {
  if (!cache[id]) {
    const mod = await import(`../data/realms/${id}.js`);
    cache[id] = { ...realmById[id], ...mod.default };
  }
  return cache[id];
}
export const loadAllRealms = () => Promise.all(REALMS.map((r) => loadRealm(r.id)));
