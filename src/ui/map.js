// World view: the illustrated map plus quick-start cards (daily expedition,
// echoes review, next realm to unveil).

import { REALMS, realmById, loadRealm } from "../realms.js";
import { unlockOrder, dayKey } from "../engine.js";
import * as store from "../state.js";
import { worldMap } from "../art/map.js";
import { icon } from "../art/icons.js";
import { $, esc, toast } from "./dom.js";
import { startDaily, startEchoes } from "./quiz.js";
import { sfx } from "./sound.js";

export async function renderMap(app, main) {
  const s = app.state;
  const open = new Set(store.openRealmIds(s));
  const order = unlockOrder(REALMS, s.prefs.favorites);
  const costs = Object.fromEntries(order.map((o) => [o.id, o.cost]));
  const stars = Object.fromEntries(REALMS.map((r) => [r.id, store.realmStars(s, r.id)]));
  const total = store.totalStars(s);
  const nextLocked = order.find((o) => !open.has(o.id));
  const dailyDone = s.daily.lastDone === dayKey();
  const hour = new Date().getHours();
  const greet = hour < 5 ? "The stars are out" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  main.innerHTML = `
    <section class="map-hero">
      <div><h1>${greet}, ${esc(s.player.name)}.</h1>
      <p class="lede">${open.size} of 9 realms unveiled · ${total} stars · ${Object.keys(s.codex).length} lore entries</p></div>
    </section>
    <section class="map-wrap"><div class="map-frame-wrap">${worldMap({ open, costs, stars })}</div></section>
    <section class="cards">
      <article class="card quest ${dailyDone ? "done" : ""}">
        <div class="card-ico sun">${icon("sun", { size: 28 })}</div>
        <div><h3>Daily Expedition</h3><p>${dailyDone ? "Done for today. A new route opens at midnight." : "Six questions from across your realms. Same route for everyone today. Bonus gems!"}</p></div>
        <button class="btn ${dailyDone ? "ghost" : "primary"}" id="daily-btn">${dailyDone ? "Replay" : "Set out"}</button>
      </article>
      <article class="card quest">
        <div class="card-ico echo">${icon("echo", { size: 28 })}</div>
        <div><h3>Echoes <span class="count">${s.echoes.length}</span></h3><p>${s.echoes.length ? "Questions you missed echo back here until you answer them right." : "No echoes. Questions you miss will come back here so you can learn them."}</p></div>
        <button class="btn" id="echo-btn" ${s.echoes.length ? "" : "disabled"}>Review</button>
      </article>
      <article class="card quest">
        <div class="card-ico fog">${icon("lock", { size: 28 })}</div>
        ${nextLocked
          ? `<div><h3>Next unveiling: ${realmById[nextLocked.id].name}</h3><p>${Math.max(0, nextLocked.cost - total)} more star${nextLocked.cost - total === 1 ? "" : "s"} to lift the fog.</p>
             <div class="meter"><i style="width:${Math.min(100, (total / nextLocked.cost) * 100)}%"></i></div></div>`
          : `<div><h3>The whole world is unveiled</h3><p>Hunt for 3-star clears and defeat every guardian.</p></div>`}
      </article>
    </section>`;

  const svg = $(".world", main);
  const enter = (node) => {
    const id = node.dataset.realm;
    if (open.has(id)) { sfx.tap(); app.go(`#/realm/${id}`); }
    else toast(`${icon("lock", { size: 16 })} <b>${realmById[id].name}</b> is hidden in fog. Earn ${costs[id] - total} more ★ to unveil it.`);
  };
  svg.addEventListener("click", (e) => { const n = e.target.closest(".realm-node"); if (n) enter(n); });
  svg.addEventListener("keydown", (e) => { const n = e.target.closest(".realm-node"); if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); enter(n); } });
  $("#daily-btn", main).onclick = async () => startDaily(app, await Promise.all([...open].map(loadRealm)));
  $("#echo-btn", main).onclick = () => startEchoes(app);
}
