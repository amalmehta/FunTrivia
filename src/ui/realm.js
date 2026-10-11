// Realm view: a panorama with a trail of five landmarks, the realm's guide,
// and how much of its lore the player has collected.

import { loadRealm, realmCssVars } from "../realms.js";
import { LEVELS_PER_REALM, isLevelOpen, BUILDINGS } from "../engine.js";
import * as store from "../state.js";
import { realmScene, TRAIL } from "../art/scene.js";
import { icon } from "../art/icons.js";
import { $, $$, esc, modal } from "./dom.js";
import { startLevel } from "./quiz.js";
import { sfx } from "./sound.js";

const starRow = (n, size = 16) => [0, 1, 2].map((i) => `<span class="st ${i < n ? "on" : ""}">${icon("star", { size })}</span>`).join("");

export async function renderRealm(app, main, id) {
  const s = app.state;
  if (!store.openRealmIds(s).includes(id)) return app.go("#/map");
  const realm = await loadRealm(id);
  const prog = s.progress[id] ?? Array(LEVELS_PER_REALM).fill(0);
  const learned = realm.questions.filter((q) => s.codex[q.id]?.correct).length;
  const stars = store.realmStars(s, id);
  const building = BUILDINGS.find((b) => b.realm === id);
  const nextLevel = prog.findIndex((p) => p === 0);

  main.style.cssText = realmCssVars(realm);
  main.innerHTML = `
    <a href="#/map" class="back-link">${icon("back", { size: 18 })} World map</a>
    <section class="realm-stage realm-tint"><div class="stage-inner">
      ${realmScene(realm, { dark: app.dark() })}
      <div class="realm-title"><div class="realm-emblem">${icon(realm.icon, { size: 34 })}</div>
        <div><h1>${realm.name}</h1><p>${realm.topic}</p></div></div>
      ${realm.landmarks.map((lm, i) => {
        const [fx, fy] = TRAIL[i];
        const open = isLevelOpen(prog, i);
        const guardian = i === LEVELS_PER_REALM - 1;
        return `<button class="landmark ${open ? "open" : "locked"} ${prog[i] ? "cleared" : ""} ${guardian ? "guardian" : ""} ${i === nextLevel ? "next" : ""}" data-level="${i}" style="left:${fx * 100}%;top:${fy * 100}%" ${open ? "" : "aria-disabled=\"true\""} aria-label="Landmark ${i + 1}: ${esc(lm.name)}${open ? `, ${prog[i]} stars` : ", locked"}">
          <span class="lm-pin">${guardian ? icon("trophy", { size: 22 }) : `<b>${i + 1}</b>`}</span>
          <span class="lm-card"><b>${esc(lm.name)}</b><span class="stars">${open ? starRow(prog[i], 13) : `${icon("lock", { size: 13 })} Clear landmark ${i}`}</span></span>
        </button>`;
      }).join("")}
    </div></section>
    <section class="realm-info">
      <article class="card guide realm-tint">
        <div class="guide-portrait">${icon(realm.icon, { size: 40 })}</div>
        <div><h3>${esc(realm.guide.name)} <small>${esc(realm.guide.title)}</small></h3>
        <blockquote>“${esc(realm.guide.greeting)}”</blockquote><p>${esc(realm.intro)}</p></div>
      </article>
      <div class="realm-side">
        <article class="card stat"><h4>Stars</h4><div class="big">${stars}<small>/15</small></div><div class="meter realm-tint"><i style="width:${(stars / 15) * 100}%"></i></div></article>
        <article class="card stat"><h4>Lore learned</h4><div class="big">${learned}<small>/30</small></div><div class="meter realm-tint"><i style="width:${(learned / 30) * 100}%"></i></div>
          <a class="small-link" href="#/codex/${id}">Open in Codex →</a></article>
        <article class="card stat"><h4>Haven</h4><p class="muted">${building.name}: tier ${s.buildings[building.id] ?? 0} of 3</p><a class="small-link" href="#/haven">Visit your Haven →</a></article>
      </div>
    </section>`;

  // On narrow screens the panorama scrolls sideways; start it at the next landmark.
  const stage = $(".realm-stage", main);
  const target = $(".landmark.next", main);
  if (target && stage.scrollWidth > stage.clientWidth) stage.scrollLeft = target.offsetLeft - stage.clientWidth / 2;

  $$(".landmark", main).forEach((b) => {
    b.onclick = () => {
      const i = +b.dataset.level;
      if (!isLevelOpen(prog, i)) { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
      sfx.tap();
      landmarkIntro(app, realm, i, prog[i], s.best[id]?.[i] ?? 0);
    };
  });
}

function landmarkIntro(app, realm, i, stars, best) {
  const lm = realm.landmarks[i];
  const guardian = i === LEVELS_PER_REALM - 1;
  const tiers = ["Easy", "Easy · Medium", "Medium", "Medium · Hard", "Hard"][i];
  const m = modal(`
    <div class="lm-intro realm-tint ${guardian ? "guardian" : ""}" style="${realmCssVars(realm)}">
      <div class="lm-banner">${realmScene(realm, { dark: true, trail: false })}<div class="lm-banner-ico">${guardian ? icon("trophy", { size: 36 }) : icon(realm.icon, { size: 36 })}</div></div>
      <div class="lm-body">
        <div class="eyebrow">${guardian ? "Guardian challenge" : `Landmark ${i + 1} of 5`} · ${tiers}</div>
        <h2>${esc(lm.name)}</h2>
        <p class="lore">${esc(lm.lore)}</p>
        ${guardian ? `<p class="guardian-note">${icon("heart", { size: 16 })} The guardian is the realm's hardest test. Defeat it to claim the realm.</p>` : ""}
        <div class="lm-meta"><span>6 questions</span><span>3 hearts</span><span>Best: ${best || "—"}</span><span class="stars">${starRow(stars)}</span></div>
        <div class="ob-actions"><button class="btn ghost" data-close>Not yet</button><button class="btn primary" id="lm-go" autofocus>${stars ? "Play again" : "Begin"}</button></div>
      </div>
    </div>`, { cls: "wide" });
  $("#lm-go", m.root).onclick = () => { m.close(); startLevel(app, realm, i); };
}
