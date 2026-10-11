import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "../src/state.js";

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const answers = (realm, pattern) => pattern.map((ok, i) => ({ id: `${realm}-0${i + 1}`, realm, correct: !!ok }));

test("save and load round-trip, and bad data falls back to a fresh save", () => {
  const st = memory();
  const s = S.freshState();
  s.gems = 42;
  S.save(s, st);
  assert.equal(S.load(st).gems, 42);
  st.setItem("funtrivia.save.v1", "{not json");
  assert.equal(S.load(st).gems, 0);
});

test("clearing a landmark records stars, gems, codex and echoes", () => {
  const s = S.freshState();
  s.prefs.favorites = ["cosmos"];
  const r = S.applyRound(s, "level", { realm: "cosmos", level: 0, stars: 2, score: 600, bestCombo: 4, answers: answers("cosmos", [1, 1, 1, 0, 1, 1]) });
  assert.equal(s.progress.cosmos[0], 2);
  assert.equal(r.firstClear, true);
  assert.ok(r.gems > 0 && r.xp > 0);
  assert.equal(Object.keys(s.codex).length, 6);
  assert.deepEqual(s.echoes, ["cosmos-04"]);
  assert.ok(r.newAchievements.some((a) => a.id === "first-step"));
});

test("replaying never lowers stars; answering an echo right clears it", () => {
  const s = S.freshState();
  s.prefs.favorites = ["cosmos"];
  S.applyRound(s, "level", { realm: "cosmos", level: 0, stars: 3, score: 900, answers: answers("cosmos", [1, 1, 1, 1, 1, 0]) });
  S.applyRound(s, "level", { realm: "cosmos", level: 0, stars: 1, score: 300, answers: answers("cosmos", [1, 1, 1, 1, 0, 1]) });
  assert.equal(s.progress.cosmos[0], 3);
  assert.deepEqual(s.echoes, ["cosmos-05"]);
  assert.equal(s.stats.echoesCleared, 1);
});

test("earning stars unveils the next realm", () => {
  const s = S.freshState();
  s.prefs.favorites = ["cosmos"];
  assert.deepEqual(S.openRealmIds(s), ["cosmos"]);
  let unveiled = [];
  for (let l = 0; l < 2; l++) unveiled.push(...S.applyRound(s, "level", { realm: "cosmos", level: l, stars: 3, score: 900, answers: [] }).newlyOpen);
  assert.equal(S.totalStars(s), 6);
  assert.equal(unveiled.length, 1);
  assert.ok(["lab", "wilds"].includes(unveiled[0]));
});

test("daily expedition pays gems once per day", () => {
  const s = S.freshState();
  const a = S.applyRound(s, "daily", { score: 500, answers: answers("lab", [1, 1, 0, 1, 1, 1]) });
  const b = S.applyRound(s, "daily", { score: 500, answers: answers("lab", [1, 1, 1, 1, 1, 1]) });
  assert.ok(a.gems > 0);
  assert.equal(b.gems, 0);
  assert.equal(s.stats.dailies, 1);
});

test("building spends gems and raises the tier", () => {
  const s = S.freshState();
  s.gems = 50;
  const ach = S.build(s, "telescope", 30);
  assert.equal(s.gems, 20);
  assert.equal(s.buildings.telescope, 1);
  assert.ok(ach.some((a) => a.id === "builder"));
});
