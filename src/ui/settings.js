// Settings (⌘,): every preference in one place.

import { PACES } from "../engine.js";
import * as store from "../state.js";
import { icon } from "../art/icons.js";
import { $, $$, esc, modal, toast } from "./dom.js";
import { realmPicker, bindPicker } from "./onboarding.js";

export function openSettings(app) {
  const s = app.state;
  const favs = [...s.prefs.favorites];
  const seg = (name, value, options) => `<div class="seg" role="radiogroup" data-seg="${name}">${options.map(([v, label]) =>
    `<button type="button" role="radio" aria-checked="${v === value}" class="${v === value ? "on" : ""}" data-v="${v}">${label}</button>`).join("")}</div>`;
  const toggle = (name, on, label, hint) => `<label class="toggle-row"><span><b>${label}</b><small>${hint}</small></span><input type="checkbox" data-toggle="${name}" ${on ? "checked" : ""}><i></i></label>`;

  const m = modal(`
    <header class="modal-head"><h2>${icon("gear", { size: 22 })} Settings</h2><button class="icon-btn" data-close aria-label="Close">${icon("close", { size: 18 })}</button></header>
    <div class="settings">
      <section><h3>Traveler</h3><label class="field"><span>Name</span><input id="set-name" maxlength="24" value="${esc(s.player.name)}"></label></section>
      <section><h3>Pace</h3>${seg("pace", s.prefs.pace, Object.entries(PACES).map(([k, p]) => [k, p.name]))}<p class="hint" id="pace-hint">${PACES[s.prefs.pace].blurb}</p></section>
      <section><h3>Favorite realms</h3><p class="hint">Favorites are always unveiled, and realms next to them unveil first. Realms you have already played stay open.</p><div class="picker compact">${realmPicker(favs)}</div></section>
      <section><h3>Appearance</h3>${seg("theme", s.prefs.theme, [["system", "System"], ["light", "Day"], ["dark", "Night"]])}
        ${toggle("reduceMotion", s.prefs.reduceMotion, "Reduce motion", "Calmer screens: no confetti, drifting clouds or shakes.")}</section>
      <section><h3>Sound & learning</h3>
        ${toggle("sound", s.prefs.sound, "Sound effects", "Chimes for answers, stars and building.")}
        ${toggle("showFacts", s.prefs.showFacts, "Show lore after each answer", "A short fact to learn after every question.")}</section>
      <section><h3>Keyboard</h3><dl class="keys"><dt><kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd></dt><dd>Pick an answer</dd><dt><kbd>↵</kbd></dt><dd>Next question</dd><dt><kbd>Esc</kbd></dt><dd>Leave a round / close</dd><dt><kbd>⌘</kbd><kbd>,</kbd></dt><dd>Settings</dd></dl></section>
      <section class="danger"><h3>Progress</h3><p class="hint">Saved in this browser only (${store.totalStars(s)} stars, ${s.gems} gems, ${Object.keys(s.codex).length} lore entries).</p>
        <button class="btn danger" id="set-reset">Reset all progress…</button></section>
    </div>`, { cls: "settings-modal", onClose: () => app.route() });

  const root = m.root;
  const persist = () => { app.save(); app.applyPrefs(); };
  $("#set-name", root).oninput = (e) => { s.player.name = e.target.value.trim() || "Traveler"; persist(); };
  $$("[data-seg]", root).forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    s.prefs[g.dataset.seg] = b.dataset.v;
    $$("[data-v]", g).forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    if (g.dataset.seg === "pace") $("#pace-hint", root).textContent = PACES[b.dataset.v].blurb;
    persist();
  }));
  $$("[data-toggle]", root).forEach((t) => (t.onchange = () => { s.prefs[t.dataset.toggle] = t.checked; persist(); }));
  bindPicker($(".picker", root), favs, 3, () => {
    if (favs.length) { s.prefs.favorites = [...favs]; persist(); }
    else toast("Keep at least one favorite realm.");
  });
  $("#set-reset", root).onclick = () => {
    if (!confirm("Erase all stars, gems, buildings and lore and start over? This cannot be undone.")) return;
    const feedback = s.feedback;
    app.state = Object.assign(store.freshState(), { feedback });
    app.save();
    location.hash = "";
    location.reload();
  };
}
