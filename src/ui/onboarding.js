// First-run flow: name → favorite realms → pace. The answers shape the world:
// favorites start unveiled and nearby realms unveil first.

import { REALMS, REGIONS, realmCssVars } from "../realms.js";
import { PACES } from "../engine.js";
import { icon } from "../art/icons.js";
import { worldMap } from "../art/map.js";
import { el, esc, $, $$ } from "./dom.js";
import { sfx } from "./sound.js";

export function realmPicker(selected, max = 3) {
  return REGIONS.map((g) => `
    <div class="pick-region"><h4 style="--rh:${g.hue}">${g.name}<small>${g.subtitle}</small></h4><div class="pick-grid">
    ${REALMS.filter((r) => r.region === g.id).map((r) => `
      <button type="button" class="pick-realm realm-tint ${selected.includes(r.id) ? "on" : ""}" data-pick="${r.id}" style="${realmCssVars(r)}" aria-pressed="${selected.includes(r.id)}">
        <span class="pick-ico">${icon(r.icon, { size: 30 })}</span><b>${r.name}</b><small>${r.topic}</small>
      </button>`).join("")}</div></div>`).join("") + `<p class="pick-note">Pick up to ${max}.</p>`;
}

export function bindPicker(root, selected, max, onChange) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    const id = b.dataset.pick;
    const i = selected.indexOf(id);
    if (i >= 0) selected.splice(i, 1);
    else if (selected.length < max) selected.push(id);
    else { selected.shift(); selected.push(id); }
    $$("[data-pick]", root).forEach((x) => { const on = selected.includes(x.dataset.pick); x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    sfx.tap();
    onChange?.();
  });
}

export function runOnboarding(app) {
  return new Promise((resolve) => {
    const s = app.state;
    const favs = [...s.prefs.favorites];
    let pace = s.prefs.pace;
    const root = el(`<div class="onboard">
      <div class="onboard-map" aria-hidden="true">${worldMap({ open: new Set(), costs: {}, stars: {} })}</div>
      <div class="onboard-card" role="dialog" aria-modal="true" aria-labelledby="ob-title"></div></div>`);
    document.body.append(root);
    const card = $(".onboard-card", root);

    const steps = [
      () => {
        card.innerHTML = `<div class="ob-step">1 of 3</div>
          <h1 id="ob-title">A world of knowledge awaits</h1>
          <p class="lede">Nine realms lie hidden under the fog. Each answer you get right lights another corner of the map. Every landmark you clear teaches you something new.</p>
          <label class="field"><span>What should the realms call you?</span><input id="ob-name" maxlength="24" value="${esc(s.player.name === "Traveler" ? "" : s.player.name)}" placeholder="Traveler" autofocus></label>
          <div class="ob-actions"><button class="btn primary" id="ob-next">Continue</button></div>`;
        const go = () => { s.player.name = $("#ob-name", card).value.trim() || "Traveler"; next(); };
        $("#ob-next", card).onclick = go;
        $("#ob-name", card).onkeydown = (e) => { if (e.key === "Enter") go(); };
        setTimeout(() => $("#ob-name", card)?.focus(), 60);
      },
      () => {
        card.innerHTML = `<div class="ob-step">2 of 3</div>
          <h1 id="ob-title">Where does your curiosity lead, ${esc(s.player.name)}?</h1>
          <p class="lede">Choose the realms you love. They start unveiled; the realms next to them unveil first as you earn stars.</p>
          <div class="picker">${realmPicker(favs)}</div>
          <div class="ob-actions"><button class="btn ghost" id="ob-back">Back</button><button class="btn primary" id="ob-next" ${favs.length ? "" : "disabled"}>Continue</button></div>`;
        bindPicker($(".picker", card), favs, 3, () => { $("#ob-next", card).disabled = !favs.length; });
        $("#ob-back", card).onclick = () => show(0);
        $("#ob-next", card).onclick = next;
      },
      () => {
        card.innerHTML = `<div class="ob-step">3 of 3</div>
          <h1 id="ob-title">Choose your pace</h1>
          <p class="lede">You can change this any time in Settings (⌘,).</p>
          <div class="pace-grid">${Object.entries(PACES).map(([k, p]) => `
            <button class="pace ${k === pace ? "on" : ""}" data-pace="${k}">${icon(k === "relaxed" ? "leaf" : k === "standard" ? "compass" : "bolt", { size: 28 })}<b>${p.name}</b><small>${p.blurb}</small></button>`).join("")}</div>
          <div class="ob-actions"><button class="btn ghost" id="ob-back">Back</button><button class="btn primary" id="ob-next">Unveil my world</button></div>`;
        card.onclick = (e) => {
          const b = e.target.closest("[data-pace]");
          if (!b) return;
          pace = b.dataset.pace;
          $$("[data-pace]", card).forEach((x) => x.classList.toggle("on", x === b));
        };
        $("#ob-back", card).onclick = () => show(1);
        $("#ob-next", card).onclick = () => {
          s.prefs.favorites = favs;
          s.prefs.pace = pace;
          sfx.unlock();
          root.classList.add("out");
          setTimeout(() => { root.remove(); resolve(); }, 600);
        };
      },
    ];
    let at = 0;
    const show = (i) => { at = i; card.classList.remove("in"); void card.offsetWidth; steps[i](); card.classList.add("in"); };
    const next = () => show(at + 1);
    show(0);
  });
}
