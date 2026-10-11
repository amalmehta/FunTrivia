// Haven view: spend gems to raise one building per realm, three tiers each.

import { BUILDINGS, BUILD_TIERS, canBuild, buildRequirement } from "../engine.js";
import { realmById, realmCssVars } from "../realms.js";
import * as store from "../state.js";
import { havenScene } from "../art/haven.js";
import { icon } from "../art/icons.js";
import { $, $$, toast } from "./dom.js";
import { sfx } from "./sound.js";
import { confetti } from "./fx.js";

const TIER_NAMES = ["Empty plot", "Humble", "Grand", "Legendary"];

export async function renderHaven(app, main) {
  const s = app.state;
  const open = new Set(store.openRealmIds(s));
  const built = BUILDINGS.reduce((n, b) => n + (s.buildings[b.id] ?? 0), 0);

  main.innerHTML = `
    <section class="page-head"><div><h1>Your Haven</h1>
      <p class="lede">A home that grows with what you learn. Clear landmarks to earn gems and the right to build. ${built} of ${BUILDINGS.length * BUILD_TIERS} tiers raised.</p></div>
      <div class="pill gem big">${icon("gem", { size: 20 })}<b>${s.gems}</b> gems</div></section>
    <section class="haven-stage">${havenScene(s.buildings)}</section>
    <section class="build-grid">${BUILDINGS.map((b) => {
      const r = realmById[b.realm];
      const tier = s.buildings[b.id] ?? 0;
      const check = canBuild(b, tier, s.progress[b.realm], s.gems);
      const req = tier < BUILD_TIERS ? buildRequirement(tier + 1) : null;
      const locked = !open.has(b.realm);
      return `<article class="card build realm-tint ${locked ? "locked" : ""}" style="${realmCssVars(r)}" data-b="${b.id}">
        <div class="build-ico">${icon(r.icon, { size: 26 })}</div>
        <div class="build-body"><h3>${b.name}</h3><small>${r.name}</small>
          <div class="tiers">${Array.from({ length: BUILD_TIERS }, (_, i) => `<i class="${i < tier ? "on" : ""}"></i>`).join("")}<span>${TIER_NAMES[tier]}</span></div>
          ${req ? `<p class="req">${icon("gem", { size: 13 })} ${req.gems} · clear ${req.landmarks} landmark${req.landmarks > 1 ? "s" : ""}</p>` : `<p class="req done">Fully built</p>`}</div>
        <button class="btn ${check.ok ? "primary" : ""}" data-build="${b.id}" ${check.ok ? "" : "disabled"} title="${locked ? "Realm still in fog" : check.reason ?? ""}">${tier ? "Upgrade" : "Build"}</button>
      </article>`;
    }).join("")}</section>`;

  const doBuild = (id) => {
    const b = BUILDINGS.find((x) => x.id === id);
    const tier = s.buildings[id] ?? 0;
    const check = canBuild(b, tier, s.progress[b.realm], s.gems);
    if (!check.ok) return toast(check.reason);
    const ach = store.build(s, id, check.req.gems);
    app.save();
    sfx.build();
    if (tier + 1 === BUILD_TIERS) confetti({ origin: [0.5, 0.4] });
    toast(`${icon("castle", { size: 16 })} <b>${b.name}</b> is now ${TIER_NAMES[tier + 1]}!`);
    for (const a of ach) toast(`${icon("trophy", { size: 16 })} Achievement: <b>${a.name}</b>`, { kind: "gold" });
    app.route();
  };
  $$("[data-build]", main).forEach((btn) => (btn.onclick = () => doBuild(btn.dataset.build)));
  // clicking a plot in the scene scrolls to its card
  $(".haven-svg", main).addEventListener("click", (e) => {
    const p = e.target.closest(".haven-plot");
    if (!p) return;
    const c = $(`[data-b="${p.dataset.building}"]`, main);
    c.scrollIntoView({ behavior: "smooth", block: "center" });
    c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash");
  });
}
