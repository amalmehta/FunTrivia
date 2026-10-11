// The quiz overlay: one round of six questions with hearts, combo, timer,
// a fact reveal after every answer, and a results screen with rewards.

import { REALMS, realmById, realmCssVars, loadRealm } from "../realms.js";
import {
  HEARTS, PACES, LEVELS_PER_REALM, levelQuestions, prepareQuestion, scoreAnswer, starsFor,
  dailyQuestions, dayKey, levelFromXp, titleFor,
} from "../engine.js";
import * as store from "../state.js";
import { realmScene } from "../art/scene.js";
import { icon } from "../art/icons.js";
import { $, $$, el, esc, toast } from "./dom.js";
import { sfx } from "./sound.js";
import { confetti, countUp, floatText, motionReduced } from "./fx.js";

let active = null;

export function startLevel(app, realm, level) {
  const qs = levelQuestions(realm, level).map((q) => ({ ...prepareQuestion(q), realm: realm.id }));
  run(app, { kind: "level", realm, level, questions: qs, title: realm.landmarks[level].name,
    eyebrow: level === LEVELS_PER_REALM - 1 ? `${realm.name} · Guardian` : `${realm.name} · Landmark ${level + 1}` });
}

export function startDaily(app, openRealms) {
  const qs = dailyQuestions(openRealms, dayKey()).map((q) => prepareQuestion(q));
  run(app, { kind: "daily", questions: qs, title: "Daily Expedition", eyebrow: dayKey() });
}

export async function startEchoes(app) {
  const ids = app.state.echoes.slice(0, 6);
  if (!ids.length) return toast("No echoes to review. Nicely done!");
  const realms = await Promise.all(REALMS.map((r) => loadRealm(r.id)));
  const all = Object.fromEntries(realms.flatMap((r) => r.questions.map((q) => [q.id, { ...q, realm: r.id }])));
  const qs = ids.map((id) => all[id]).filter(Boolean).map((q) => prepareQuestion(q));
  run(app, { kind: "echoes", questions: qs, title: "Echoes", eyebrow: "Review what you missed" });
}

async function run(app, round) {
  active?.destroy();
  const pace = app.state.prefs.pace;
  const limit = PACES[pace].seconds;
  const R = { ...round, i: 0, hearts: round.kind === "level" ? HEARTS : Infinity, score: 0, combo: 0, bestCombo: 0, answers: [], pace, limit };
  const realmsFull = Object.fromEntries((await Promise.all(REALMS.map((r) => loadRealm(r.id)))).map((r) => [r.id, r]));

  const root = el(`<div class="quiz" role="dialog" aria-modal="true" aria-label="${esc(R.title)}">
    <div class="quiz-bg"></div>
    <header class="quiz-top">
      <button class="icon-btn" id="q-quit" aria-label="Leave round">${icon("close", { size: 20 })}</button>
      <div class="quiz-title"><small>${esc(R.eyebrow)}</small><b>${esc(R.title)}</b></div>
      <div class="quiz-stats">
        ${R.kind === "level" ? `<div class="hearts" aria-label="Hearts">${Array.from({ length: HEARTS }, () => `<span class="heart">${icon("heart", { size: 22 })}</span>`).join("")}</div>` : ""}
        <div class="score" aria-live="polite"><span id="q-score">0</span></div>
      </div>
    </header>
    <div class="pips">${R.questions.map(() => `<i></i>`).join("")}</div>
    <main class="quiz-main"><div class="q-card"></div></main>
  </div>`);
  document.body.append(root);
  document.body.classList.add("quiz-open");
  requestAnimationFrame(() => root.classList.add("in"));

  let timer = null, deadline = 0, answered = false, bgRealm = null;
  const card = $(".q-card", root);

  const setBackdrop = (rid) => {
    if (rid === bgRealm) return;
    bgRealm = rid;
    const r = realmsFull[rid];
    root.style.cssText = realmCssVars(r);
    $(".quiz-bg", root).innerHTML = realmScene(r, { dark: true, trail: false });
  };

  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") { e.preventDefault(); return quit(); }
    if (root.classList.contains("finished")) return;
    if (!answered) {
      const n = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
      if (n >= 0 && e.key.length === 1) { e.preventDefault(); choose(n); }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); $("#q-next", root)?.click();
    }
  };
  document.addEventListener("keydown", onKey, true);

  const destroy = () => {
    clearInterval(timer);
    document.removeEventListener("keydown", onKey, true);
    document.body.classList.remove("quiz-open");
    root.classList.remove("in");
    setTimeout(() => root.remove(), 300);
    if (active?.root === root) active = null;
  };
  active = { root, destroy };

  function quit() {
    if (R.answers.length && !root.classList.contains("finished") && !confirm("Leave this round? Progress in this round will be lost.")) return;
    destroy();
    app.route();
  }
  $("#q-quit", root).onclick = quit;

  function show() {
    answered = false;
    const q = R.questions[R.i];
    const r = realmById[q.realm];
    setBackdrop(q.realm);
    const tierName = ["", "Easy", "Medium", "Hard"][q.tier];
    card.className = "q-card enter";
    card.innerHTML = `
      <div class="q-meta"><span class="chip realm-chip" style="${realmCssVars(r)}">${icon(r.icon, { size: 14 })} ${r.name}</span>
        <span class="chip tier t${q.tier}">${tierName}</span><span class="q-count">${R.i + 1} / ${R.questions.length}</span></div>
      ${limit ? `<div class="timer"><i></i></div>` : ""}
      <h2 class="q-text">${esc(q.q)}</h2>
      <div class="choices">${q.choices.map((c, k) => `<button class="choice" data-k="${k}"><kbd>${"ABCD"[k]}</kbd><span>${esc(c)}</span></button>`).join("")}</div>
      <div class="reveal" hidden></div>`;
    void card.offsetWidth;
    card.classList.remove("enter");
    $$(".choice", card).forEach((b) => (b.onclick = () => choose(+b.dataset.k)));
    $$(".pips i", root).forEach((p, k) => p.classList.toggle("now", k === R.i));
    if (limit) {
      deadline = performance.now() + limit * 1000;
      const bar = $(".timer i", card);
      let lastSec = limit;
      clearInterval(timer);
      timer = setInterval(() => {
        const left = Math.max(0, deadline - performance.now());
        bar.style.width = `${(left / (limit * 1000)) * 100}%`;
        bar.parentElement.classList.toggle("low", left < 5000);
        const sec = Math.ceil(left / 1000);
        if (sec < lastSec && sec <= 3 && sec > 0) sfx.tick();
        lastSec = sec;
        if (left <= 0) choose(-1);
      }, 50);
    }
  }

  function choose(k) {
    if (answered) return;
    answered = true;
    clearInterval(timer);
    const q = R.questions[R.i];
    const correct = k === q.answer;
    const timeLeft = limit ? Math.max(0, (deadline - performance.now()) / 1000) : 0;
    const pts = scoreAnswer({ correct, tier: q.tier, timeLeft, timeLimit: limit, combo: R.combo, pace: R.pace });
    R.answers.push({ id: q.id, realm: q.realm, correct });
    $$(".pips i", root)[R.i].className = correct ? "ok" : "bad";
    const buttons = $$(".choice", card);
    buttons.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add("right"); });
    if (correct) {
      R.combo++; R.bestCombo = Math.max(R.bestCombo, R.combo);
      R.score += pts;
      buttons[k].classList.add("picked");
      sfx.correct(R.combo);
      floatText(buttons[k], `+${pts}`, "good");
      countUp($("#q-score", root), R.score, { ms: 500 });
    } else {
      R.combo = 0;
      if (k >= 0) buttons[k].classList.add("wrong");
      card.classList.add("shake");
      sfx.wrong();
      if (R.kind === "level") {
        R.hearts--;
        const h = $$(".heart:not(.lost)", root).pop();
        h?.classList.add("lost");
      }
    }
    const out = R.kind === "level" && R.hearts <= 0;
    const last = R.i === R.questions.length - 1 || out;
    const comboMsg = correct && R.combo >= 3 ? `<span class="combo">${icon("bolt", { size: 14 })} ${R.combo} in a row!</span>` : "";
    const rv = $(".reveal", card);
    rv.hidden = false;
    rv.className = `reveal ${correct ? "good" : "bad"}`;
    rv.innerHTML = `
      <div class="verdict">${correct ? "Correct!" : k < 0 ? "Time's up!" : "Not quite."} ${comboMsg}</div>
      ${app.state.prefs.showFacts ? `<p class="fact">${icon("scroll", { size: 16 })} <span>${esc(q.fact)}</span></p>` : ""}
      <button class="btn primary" id="q-next">${out ? "See results" : last ? "Finish" : "Next question"} <kbd>↵</kbd></button>`;
    $("#q-next", card).onclick = () => { if (last) finish(); else { R.i++; show(); } };
    setTimeout(() => $("#q-next", card)?.focus({ preventScroll: true }), 30);
  }

  function finish() {
    root.classList.add("finished");
    const right = R.answers.filter((a) => a.correct).length;
    const stars = R.kind === "level" ? (R.hearts > 0 ? starsFor(right, R.questions.length) : 0) : 0;
    const lvlBefore = levelFromXp(app.state.xp);
    const rewards = store.applyRound(app.state, R.kind, { realm: R.realm?.id, level: R.level, stars, score: R.score, bestCombo: R.bestCombo, answers: R.answers });
    app.save();
    app.refreshHud();
    const lvlAfter = levelFromXp(app.state.xp);
    const cleared = R.kind !== "level" || stars > 0;
    const isLevel = R.kind === "level";
    const hasNext = isLevel && stars > 0 && R.level < LEVELS_PER_REALM - 1;
    const guardianWin = isLevel && stars > 0 && R.level === LEVELS_PER_REALM - 1;

    card.className = "q-card results";
    card.innerHTML = `
      <div class="res-head">
        <div class="eyebrow">${isLevel ? (cleared ? (guardianWin ? "Guardian defeated!" : "Landmark cleared!") : "The path is blocked…") : R.kind === "daily" ? "Expedition complete" : "Echoes answered"}</div>
        <h2>${esc(R.title)}</h2>
        ${isLevel ? `<div class="res-stars">${[0, 1, 2].map((i) => `<span class="big-star ${i < stars ? "on" : ""}" style="--d:${i * 0.25}s">${icon("star", { size: 64, stroke: 2 })}</span>`).join("")}</div>` : ""}
        <p class="muted">${right} of ${R.questions.length} correct · best streak ${R.bestCombo}${isLevel && !cleared ? " · lose all 3 hearts and the landmark stays uncleared. Try again!" : ""}</p>
        ${guardianWin ? `<blockquote class="guardian-quote">“${esc(R.realm.guide.name)} bows: the realm of ${esc(R.realm.topic)} honors you.”</blockquote>` : ""}
      </div>
      <div class="res-grid">
        <div class="res-tile"><small>Score</small><b id="r-score">0</b></div>
        <div class="res-tile"><small>XP</small><b id="r-xp">0</b></div>
        <div class="res-tile gem"><small>Gems</small><b id="r-gems">0</b></div>
      </div>
      <div class="xp-line"><span>Level ${lvlAfter.level} · ${titleFor(lvlAfter.level)}</span><div class="xpbar big"><i style="width:${lvlAfter.level > lvlBefore.level ? 0 : lvlBefore.progress * 100}%"></i></div></div>
      <div class="res-news"></div>
      <div class="res-review">${R.answers.map((a, i) => `<span class="${a.correct ? "ok" : "bad"}" title="${esc(R.questions[i].q)}">${a.correct ? "✓" : "✗"}</span>`).join("")}</div>
      <div class="ob-actions">
        <button class="btn ghost" id="r-back">${isLevel ? "Back to realm" : "Back to map"}</button>
        ${isLevel ? `<button class="btn ${hasNext ? "" : "primary"}" id="r-retry">Retry</button>` : ""}
        ${hasNext ? `<button class="btn primary" id="r-next">Next landmark →</button>` : ""}
      </div>`;
    countUp($("#r-score", card), R.score);
    countUp($("#r-xp", card), rewards.xp, { prefix: "+" });
    countUp($("#r-gems", card), rewards.gems, { prefix: "+" });
    setTimeout(() => { const bar = $(".xp-line .xpbar i", card); if (bar) bar.style.width = `${lvlAfter.progress * 100}%`; }, 300);
    if (isLevel) [0, 1, 2].forEach((i) => i < stars && setTimeout(() => sfx.star(i), 300 + i * 250 * (motionReduced() ? 0 : 1)));

    const news = [];
    if (rewards.levelUp) news.push(`<div class="news lvl">${icon("trophy", { size: 18 })} Level up! You are now level ${rewards.levelUp}: <b>${titleFor(rewards.levelUp)}</b></div>`);
    for (const id of rewards.newlyOpen) news.push(`<div class="news unveil" style="${realmCssVars(realmById[id])}">${icon("map", { size: 18 })} The fog lifts: <b>${realmById[id].name}</b> is unveiled!</div>`);
    for (const a of rewards.newAchievements) news.push(`<div class="news ach">${icon("trophy", { size: 18 })} Achievement: <b>${a.name}</b> · ${a.desc}</div>`);
    $(".res-news", card).innerHTML = news.join("");

    if (cleared && (stars === 3 || guardianWin || rewards.levelUp || R.kind !== "level")) {
      setTimeout(() => { sfx.fanfare(); confetti(); }, 500);
    } else if (cleared) setTimeout(() => sfx.fanfare(), 600);
    if (rewards.newlyOpen.length) setTimeout(() => sfx.unlock(), 1400);

    $("#r-back", card).onclick = () => { destroy(); app.go(isLevel ? `#/realm/${R.realm.id}` : "#/map"); };
    $("#r-retry", card) && ($("#r-retry", card).onclick = () => { destroy(); startLevel(app, R.realm, R.level); });
    $("#r-next", card) && ($("#r-next", card).onclick = () => { destroy(); app.route(); startLevel(app, R.realm, R.level + 1); });
    setTimeout(() => ($("#r-next", card) ?? $("#r-back", card)).focus(), 50);
  }

  show();
}
