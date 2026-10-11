// Codex: every fact the player has uncovered, by realm, plus achievements.

import { REALMS, REGIONS, loadRealm, realmCssVars } from "../realms.js";
import { ACHIEVEMENTS } from "../engine.js";
import * as store from "../state.js";
import { icon } from "../art/icons.js";
import { $, esc } from "./dom.js";
import { startEchoes } from "./quiz.js";

export async function renderCodex(app, main, tab) {
  const s = app.state;
  const open = new Set(store.openRealmIds(s));
  const realms = await Promise.all(REALMS.map((r) => loadRealm(r.id)));
  const current = tab && (tab === "achievements" || REALMS.some((r) => r.id === tab)) ? tab : "all";
  const learnedIn = (r) => r.questions.filter((q) => s.codex[q.id]).length;
  const totalLearned = Object.keys(s.codex).length;

  const chips = [`<a href="#/codex/all" class="chip tab ${current === "all" ? "on" : ""}">All lore <b>${totalLearned}</b></a>`]
    .concat(REGIONS.map((g) => realms.filter((r) => r.region === g.id).map((r) =>
      `<a href="#/codex/${r.id}" class="chip tab realm-chip ${current === r.id ? "on" : ""} ${open.has(r.id) ? "" : "dim"}" style="${realmCssVars(r)}">${icon(r.icon, { size: 14 })} ${r.name} <b>${learnedIn(r)}/30</b></a>`).join("")))
    .concat(`<a href="#/codex/achievements" class="chip tab ${current === "achievements" ? "on" : ""}">${icon("trophy", { size: 14 })} Achievements <b>${Object.keys(s.achievements).length}/${ACHIEVEMENTS.length}</b></a>`);

  let body;
  if (current === "achievements") {
    body = `<div class="ach-grid">${ACHIEVEMENTS.map((a) => {
      const got = s.achievements[a.id];
      return `<article class="card ach ${got ? "got" : ""}"><div class="ach-ico">${icon("trophy", { size: 28 })}</div><div><h3>${a.name}</h3><p>${a.desc}</p>${got ? `<small>Earned ${got}</small>` : ""}</div></article>`;
    }).join("")}</div>`;
  } else {
    const list = current === "all" ? realms : realms.filter((r) => r.id === current);
    body = list.map((r) => {
      const entries = r.questions.filter((q) => s.codex[q.id]);
      if (current === "all" && !entries.length) return "";
      return `<section class="codex-realm realm-tint" style="${realmCssVars(r)}">
        <h2>${icon(r.icon, { size: 22 })} ${r.name} <small>${entries.length} of 30 discovered</small></h2>
        <div class="meter"><i style="width:${(entries.length / 30) * 100}%"></i></div>
        <div class="lore-grid">${r.questions.map((q) => {
          const e = s.codex[q.id];
          if (!e) return current === "all" ? "" : `<article class="lore unknown"><b>???</b><p>Answer this question in ${esc(r.name)} to reveal its lore.</p></article>`;
          return `<article class="lore ${e.correct ? "" : "echo"}"><div class="lore-q">${esc(q.q)}</div>
            <div class="lore-a">${e.correct ? icon("star", { size: 14 }) : icon("echo", { size: 14 })} ${esc(q.choices[q.answer])}</div>
            <p>${esc(q.fact)}</p>${e.correct ? "" : `<small class="echo-tag">Still echoing: answer it right in Echoes review</small>`}</article>`;
        }).join("")}</div></section>`;
    }).join("") || `<div class="empty card">${icon("scroll", { size: 40 })}<h3>Your Codex is empty</h3><p>Every question you answer writes a page of lore here. Head to the <a href="#/map">world map</a> and clear your first landmark.</p></div>`;
  }

  main.innerHTML = `
    <section class="page-head"><div><h1>The Codex</h1><p class="lede">Every question you meet becomes a page of lore. Missed ones echo until you master them.</p></div>
      ${s.echoes.length ? `<button class="btn primary" id="cx-echo">${icon("echo", { size: 18 })} Review ${s.echoes.length} echo${s.echoes.length === 1 ? "" : "es"}</button>` : ""}</section>
    <nav class="chip-row">${chips.join("")}</nav>
    ${body}`;
  $("#cx-echo", main) && ($("#cx-echo", main).onclick = () => startEchoes(app));
}
