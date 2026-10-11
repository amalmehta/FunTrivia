// App shell: loads the save, applies preferences, draws the top bar, and routes
// between views (#/map, #/realm/<id>, #/haven, #/codex). Quizzes run as an
// overlay on top of whatever view started them.

import * as store from "./state.js";
import { levelFromXp, titleFor } from "./engine.js";
import { loadAllRealms } from "./realms.js";
import { icon } from "./art/icons.js";
import { $, esc, modalIsOpen, closeModal } from "./ui/dom.js";
import { setSound } from "./ui/sound.js";
import { setReducedMotion } from "./ui/fx.js";
import { renderMap } from "./ui/map.js";
import { renderRealm } from "./ui/realm.js";
import { renderHaven } from "./ui/haven.js";
import { renderCodex } from "./ui/codex.js";
import { openSettings } from "./ui/settings.js";
import { mountFeedback } from "./ui/feedback.js";
import { runOnboarding } from "./ui/onboarding.js";

const app = {
  state: store.load(),
  save() { store.save(this.state); },
  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  dark() {
    const t = this.state.prefs.theme;
    return t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  },
  applyPrefs() {
    const p = this.state.prefs;
    if (p.theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = p.theme;
    document.documentElement.classList.toggle("reduce-motion", p.reduceMotion);
    setSound(p.sound);
    setReducedMotion(p.reduceMotion);
  },
  refreshHud,
  route: () => route(),
};
window.funTrivia = app; // handy for debugging in the console

function refreshHud() {
  const s = app.state;
  const lv = levelFromXp(s.xp);
  $("#hud").innerHTML = `
    <a href="#/map" class="brand" aria-label="FunTrivia home">${icon("compass", { size: 26 })}<span>Fun<b>Trivia</b></span></a>
    <nav class="nav">
      <a href="#/map" data-nav="map">${icon("map", { size: 18 })}<span>World</span></a>
      <a href="#/haven" data-nav="haven">${icon("castle", { size: 18 })}<span>Haven</span></a>
      <a href="#/codex" data-nav="codex">${icon("scroll", { size: 18 })}<span>Codex</span></a>
    </nav>
    <div class="hud-stats">
      <div class="player" title="${lv.into} / ${lv.span} XP to next level">
        <div class="lvl-badge">${lv.level}</div>
        <div class="player-meta"><div class="player-name">${esc(s.player.name)} <span>· ${titleFor(lv.level)}</span></div>
        <div class="xpbar"><i style="width:${(lv.progress * 100).toFixed(1)}%"></i></div></div>
      </div>
      <div class="pill" title="Stars earned">${icon("star", { size: 16 })}<b>${store.totalStars(s)}</b></div>
      <div class="pill gem" title="Gems: spend them in your Haven">${icon("gem", { size: 16 })}<b id="gem-count">${s.gems}</b></div>
      ${s.streak.count > 1 ? `<div class="pill streak" title="Days in a row">${icon("bolt", { size: 16 })}<b>${s.streak.count}</b></div>` : ""}
      <button class="icon-btn" id="settings-btn" aria-label="Settings (⌘,)" title="Settings (⌘,)">${icon("gear", { size: 20 })}</button>
    </div>`;
  $("#settings-btn").onclick = () => openSettings(app);
  const view = (location.hash.split("/")[1] || "map").replace("realm", "map");
  $(`[data-nav="${view}"]`)?.classList.add("active");
}

async function route() {
  if (!app.state.onboarded) return;
  const [, view = "map", arg] = location.hash.split("/");
  const main = $("#view");
  main.className = `view view-${view}`;
  main.style.cssText = "";
  window.scrollTo(0, 0);
  refreshHud();
  if (view === "realm" && arg) await renderRealm(app, main, arg);
  else if (view === "haven") await renderHaven(app, main);
  else if (view === "codex") await renderCodex(app, main, arg);
  else await renderMap(app, main);
}

// ⌘, (Ctrl+, elsewhere) opens Settings, like a Mac app.
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === ",") {
    e.preventDefault();
    if (!modalIsOpen()) openSettings(app);
  }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (app.state.prefs.theme === "system") route(); });
addEventListener("hashchange", () => { closeModal(); route(); });

(async function boot() {
  app.applyPrefs();
  mountFeedback(app);
  await loadAllRealms();
  document.body.classList.remove("booting");
  if (!app.state.onboarded) {
    await runOnboarding(app);
    app.state.onboarded = true;
    app.save();
  }
  route();
})();
