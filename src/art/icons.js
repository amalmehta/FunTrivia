// Hand-drawn emblem glyphs on a 48×48 grid. Stroke uses currentColor.

const G = {
  leaf: `<path d="M10 38C10 20 22 9 40 8c0 18-10 30-28 30z"/><path d="M10 38L30 18M18 30h8M22 26v-7"/>`,
  flask: `<path d="M19 6h10M21 6v13L9 38a3 3 0 0 0 3 4h24a3 3 0 0 0 3-4L27 19V6"/><path d="M13 31h22"/><circle cx="21" cy="36" r="1.6"/><circle cx="28" cy="34" r="1.1"/>`,
  planet: `<circle cx="24" cy="24" r="10"/><path d="M7 30c-3 5 4 7 17 2s20-12 17-17c-1.5-2.5-6-2.4-11-.6"/><path d="M38 8l1 2.5 2.5 1-2.5 1L38 15l-1-2.5-2.5-1 2.5-1z"/>`,
  trident: `<path d="M24 44V10M14 8v8a10 10 0 0 0 20 0V8M24 4l-3 6h6z"/><path d="M14 8l-2 3M34 8l2 3M19 36h10"/>`,
  tower: `<path d="M14 44V18h20v26M12 18V9h4v4h4V9h8v4h4V9h4v9"/><path d="M20 44v-8a4 4 0 0 1 8 0v8M22 25h4"/>`,
  compass: `<circle cx="24" cy="24" r="17"/><path d="M24 11l5 13-5 13-5-13z"/><path d="M24 4v4M24 40v4M4 24h4M40 24h4"/>`,
  note: `<path d="M18 36V10l20-4v26"/><circle cx="13" cy="36" r="5"/><circle cx="33" cy="32" r="5"/><path d="M18 17l20-4"/>`,
  book: `<path d="M24 12c-5-4-12-4-18-2v28c6-2 13-2 18 2 5-4 12-4 18-2V10c-6-2-13-2-18 2z"/><path d="M24 12v28M11 17h7M11 23h7M30 17h7"/>`,
  palette: `<path d="M24 6C13 6 5 14 5 24s8 18 17 18c3 0 4-2 3-4-1.5-3 0-6 4-6h5c5 0 9-4 9-9C43 13 35 6 24 6z"/><circle cx="15" cy="22" r="2.6"/><circle cx="21" cy="14" r="2.6"/><circle cx="30" cy="14" r="2.6"/><circle cx="36" cy="22" r="2.6"/>`,
  star: `<path d="M24 5l5.6 12 13 1.5-9.7 8.8 2.7 12.8L24 33.6 12.4 40.1l2.7-12.8L5.4 18.5l13-1.5z"/>`,
  heart: `<path d="M24 41S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24z"/>`,
  gem: `<path d="M14 8h20l8 11-18 23L6 19z"/><path d="M6 19h36M18 8l-4 11 10 23 10-23-4-11"/>`,
  lock: `<rect x="11" y="21" width="26" height="20" rx="3"/><path d="M16 21v-6a8 8 0 0 1 16 0v6M24 29v5"/>`,
  map: `<path d="M5 11l12-5 14 5 12-5v31l-12 5-14-5-12 5z"/><path d="M17 6v31M31 11v31"/>`,
  castle: `<path d="M6 42V22h6v-6h6v6h12v-6h6v6h6v20z"/><path d="M6 22v-5h3v3h3M36 22v-5h3v3h3M20 42v-8a4 4 0 0 1 8 0v8M24 16V6l7 3-7 3"/>`,
  scroll: `<path d="M12 8h22a4 4 0 0 1 4 4v28H16a4 4 0 0 1-4-4z"/><path d="M12 8a4 4 0 0 0-4 4v4h4M38 40a4 4 0 0 0 4-4v-2H20v2a4 4 0 0 1-4 4M18 16h14M18 22h14M18 28h10"/>`,
  sun: `<circle cx="24" cy="24" r="8"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M10 38l4-4M34 14l4-4"/>`,
  gear: `<circle cx="24" cy="24" r="6"/><path d="M24 4l3 6 6-2 1 6 6 2-3 6 3 6-6 2-1 6-6-2-3 6-3-6-6 2-1-6-6-2 3-6-3-6 6-2 1-6 6 2z"/>`,
  chat: `<path d="M8 10h32v22H22l-9 7v-7H8z"/><path d="M15 19h18M15 25h11"/>`,
  trophy: `<path d="M15 6h18v10a9 9 0 0 1-18 0zM15 10H8a7 7 0 0 0 7 9M33 10h7a7 7 0 0 1-7 9M24 25v8M16 42h16l-2-9H18z"/>`,
  echo: `<path d="M10 24a14 14 0 0 1 24-10M38 24a14 14 0 0 1-24 10"/><path d="M34 6v8h-8M14 42v-8h8"/>`,
  bolt: `<path d="M27 4L10 27h12l-3 17 18-24H25z"/>`,
  close: `<path d="M12 12l24 24M36 12L12 36"/>`,
  back: `<path d="M30 10L16 24l14 14"/>`,
  sound: `<path d="M8 18h8l10-8v28l-10-8H8z"/><path d="M32 17a9 9 0 0 1 0 14M36 12a15 15 0 0 1 0 24"/>`,
};

export function icon(name, { size = 24, stroke = 2.4, cls = "" } = {}) {
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[name] ?? ""}</svg>`;
}

/** Raw glyph markup for embedding inside a larger SVG. */
export const glyph = (name) => G[name] ?? "";
