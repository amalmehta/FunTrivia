// Save data: shape, persistence, and the rules for applying a finished round.
// Storage is injected so tests can run without a browser.

import {
  ACHIEVEMENTS, LEVELS_PER_REALM, gemsFor, levelFromXp, isRealmOpen, nextStreak, dayKey,
} from "./engine.js";
import { REALMS } from "./realms.js";

const KEY = "funtrivia.save.v1";

export function freshState() {
  return {
    version: 1,
    onboarded: false,
    player: { name: "Traveler" },
    prefs: { favorites: [], pace: "standard", theme: "system", sound: true, reduceMotion: false, showFacts: true },
    xp: 0,
    gems: 0,
    progress: {}, // realmId -> [stars per landmark]
    best: {}, // realmId -> [best score per landmark]
    codex: {}, // questionId -> { realm, correct, at }
    echoes: [], // question ids answered wrong and not yet re-answered right
    buildings: {}, // buildingId -> tier
    achievements: {}, // id -> day earned
    stats: { bestCombo: 0, dailies: 0, echoesCleared: 0, answered: 0, correct: 0 },
    daily: { lastDone: null },
    streak: { count: 0, lastDay: null },
    feedback: [],
  };
}

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return freshState();
    const saved = JSON.parse(raw);
    const base = freshState();
    return { ...base, ...saved, prefs: { ...base.prefs, ...saved.prefs }, stats: { ...base.stats, ...saved.stats } };
  } catch {
    return freshState();
  }
}

export function save(state, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: play on without saving */ }
}

// ---------- derived values ----------

export const realmStars = (state, id) => (state.progress[id] ?? []).reduce((a, b) => a + b, 0);
export const totalStars = (state) => REALMS.reduce((sum, r) => sum + realmStars(state, r.id), 0);
// A realm stays open once the player has played it, even if favorites change later.
export const openRealmIds = (state) =>
  REALMS.filter((r) => state.progress[r.id] || isRealmOpen(r.id, REALMS, state.prefs.favorites, totalStars(state))).map((r) => r.id);

export function statSummary(state) {
  const all = REALMS.map((r) => state.progress[r.id] ?? []);
  return {
    cleared: all.flat().filter((s) => s > 0).length,
    perfects: all.flat().filter((s) => s === 3).length,
    guardians: all.filter((p) => (p[LEVELS_PER_REALM - 1] ?? 0) > 0).length,
    fullRealms: all.filter((p) => p.reduce((a, b) => a + b, 0) === LEVELS_PER_REALM * 3).length,
    openRealms: openRealmIds(state).length,
    buildings: Object.values(state.buildings).filter((t) => t > 0).length,
    codex: Object.keys(state.codex).length,
    streak: state.streak.count,
    ...state.stats,
  };
}

// ---------- applying results ----------

/** Record answers into the Codex and Echoes; returns how many echoes were cleared. */
function recordAnswers(state, answers) {
  let cleared = 0;
  const today = dayKey();
  for (const a of answers) {
    const prev = state.codex[a.id];
    state.codex[a.id] = { realm: a.realm, correct: a.correct || !!prev?.correct, at: today };
    state.stats.answered++;
    if (a.correct) state.stats.correct++;
    const inEchoes = state.echoes.includes(a.id);
    if (a.correct && inEchoes) {
      state.echoes = state.echoes.filter((id) => id !== a.id);
      cleared++;
    } else if (!a.correct && !inEchoes) {
      state.echoes.push(a.id);
    }
  }
  state.stats.echoesCleared += cleared;
  return cleared;
}

function touchStreak(state) {
  const today = dayKey();
  state.streak = { count: state.streak.lastDay ? nextStreak(state.streak.count, state.streak.lastDay, today) : 1, lastDay: today };
}

function finish(state, before, xpGain, gemGain) {
  const lvlBefore = levelFromXp(state.xp).level;
  state.xp += xpGain;
  state.gems += gemGain;
  const lvlAfter = levelFromXp(state.xp).level;
  const openBefore = before.open;
  const newlyOpen = openRealmIds(state).filter((id) => !openBefore.includes(id));
  const summary = statSummary(state);
  const newAchievements = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.test(summary));
  for (const a of newAchievements) state.achievements[a.id] = dayKey();
  return { xp: xpGain, gems: gemGain, levelUp: lvlAfter > lvlBefore ? lvlAfter : null, newlyOpen, newAchievements };
}

/**
 * Apply a finished landmark round. kind is "level" | "daily" | "echoes".
 * result: { realm, level, stars, score, bestCombo, answers: [{ id, realm, correct }] }
 * Mutates and returns rewards.
 */
export function applyRound(state, kind, result) {
  const before = { open: openRealmIds(state) };
  touchStreak(state);
  state.stats.bestCombo = Math.max(state.stats.bestCombo, result.bestCombo ?? 0);
  recordAnswers(state, result.answers);
  const xpGain = Math.round(result.score / 4) + 10 * (result.stars ?? 0);
  let gemGain = 0;
  let firstClear = false;

  if (kind === "level") {
    const prog = (state.progress[result.realm] ??= Array(LEVELS_PER_REALM).fill(0));
    const best = (state.best[result.realm] ??= Array(LEVELS_PER_REALM).fill(0));
    const old = prog[result.level];
    firstClear = old === 0 && result.stars > 0;
    const improvedBy = Math.max(0, result.stars - old);
    prog[result.level] = Math.max(old, result.stars);
    best[result.level] = Math.max(best[result.level], result.score);
    gemGain = gemsFor(result.stars, { firstClear, improvedBy: firstClear ? 0 : improvedBy });
  } else if (kind === "daily") {
    const fresh = state.daily.lastDone !== dayKey();
    state.daily.lastDone = dayKey();
    if (fresh) state.stats.dailies++;
    const right = result.answers.filter((a) => a.correct).length;
    gemGain = fresh ? 10 + 5 * right : 0;
  } else if (kind === "echoes") {
    gemGain = 3 * result.answers.filter((a) => a.correct).length;
  }
  return { ...finish(state, before, xpGain, gemGain), firstClear };
}

export function build(state, buildingId, cost) {
  state.gems -= cost;
  state.buildings[buildingId] = (state.buildings[buildingId] ?? 0) + 1;
  const summary = statSummary(state);
  const newAchievements = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.test(summary));
  for (const a of newAchievements) state.achievements[a.id] = dayKey();
  return newAchievements;
}
