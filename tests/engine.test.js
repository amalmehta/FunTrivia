import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/engine.js";
import { REALMS } from "../src/realms.js";

const fakeRealm = {
  questions: [3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]
    .map((tier, i) => ({ id: `q${i}`, tier, q: "?", choices: ["a", "b", "c", "d"], answer: 0, fact: "" })),
};

test("levels go from easy to hard in five slices of six", () => {
  const tiers = [0, 1, 2, 3, 4].map((l) => E.levelQuestions(fakeRealm, l).map((q) => q.tier));
  assert.deepEqual(tiers[0], [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(tiers[1], [1, 1, 1, 1, 2, 2]);
  assert.deepEqual(tiers[2], [2, 2, 2, 2, 2, 2]);
  assert.deepEqual(tiers[3], [2, 2, 3, 3, 3, 3]);
  assert.deepEqual(tiers[4], [3, 3, 3, 3, 3, 3]);
  const ids = new Set([0, 1, 2, 3, 4].flatMap((l) => E.levelQuestions(fakeRealm, l).map((q) => q.id)));
  assert.equal(ids.size, 30);
});

test("prepareQuestion keeps the correct answer pointing at the same text", () => {
  const q = { choices: ["Mars", "Venus", "Earth", "Jupiter"], answer: 2 };
  for (let s = 0; s < 50; s++) {
    const p = E.prepareQuestion(q, E.seededRng(s));
    assert.equal(p.choices[p.answer], "Earth");
    assert.deepEqual([...p.choices].sort(), [...q.choices].sort());
  }
});

test("seeded rng is deterministic", () => {
  const a = E.seededRng("x"), b = E.seededRng("x");
  assert.equal(a(), b());
});

test("scoring rewards difficulty, speed and combos; wrong answers score 0", () => {
  assert.equal(E.scoreAnswer({ correct: false, tier: 3 }), 0);
  const base = E.scoreAnswer({ correct: true, tier: 1, pace: "relaxed" });
  assert.equal(base, 100);
  assert.ok(E.scoreAnswer({ correct: true, tier: 3, pace: "relaxed" }) > base);
  assert.ok(E.scoreAnswer({ correct: true, tier: 1, timeLeft: 10, timeLimit: 12, pace: "swift" }) > E.scoreAnswer({ correct: true, tier: 1, timeLeft: 1, timeLimit: 12, pace: "swift" }));
  assert.ok(E.scoreAnswer({ correct: true, combo: 4, pace: "relaxed" }) > base);
});

test("stars: 6 right = 3, 5 = 2, 4 = 1, 3 or fewer = 0", () => {
  assert.deepEqual([6, 5, 4, 3, 0].map((c) => E.starsFor(c, 6)), [3, 2, 1, 0, 0]);
});

test("XP curve is increasing and levelFromXp inverts it", () => {
  for (let n = 1; n < 30; n++) assert.ok(E.xpToReach(n + 1) > E.xpToReach(n));
  assert.equal(E.levelFromXp(0).level, 1);
  assert.equal(E.levelFromXp(E.xpToReach(5)).level, 5);
  assert.equal(E.levelFromXp(E.xpToReach(5) - 1).level, 4);
});

test("favorites start open; same-region realms unveil first", () => {
  const order = E.unlockOrder(REALMS, ["cosmos"]);
  assert.equal(order.length, 8);
  assert.deepEqual(order.slice(0, 2).map((o) => o.id).sort(), ["lab", "wilds"]);
  assert.ok(E.isRealmOpen("cosmos", REALMS, ["cosmos"], 0));
  assert.ok(!E.isRealmOpen(order[0].id, REALMS, ["cosmos"], order[0].cost - 1));
  assert.ok(E.isRealmOpen(order[0].id, REALMS, ["cosmos"], order[0].cost));
});

test("levels open in order", () => {
  assert.ok(E.isLevelOpen(undefined, 0));
  assert.ok(!E.isLevelOpen([0, 0, 0, 0, 0], 1));
  assert.ok(E.isLevelOpen([1, 0, 0, 0, 0], 1));
});

test("building needs both landmarks cleared and gems", () => {
  const b = E.BUILDINGS[0];
  assert.equal(E.canBuild(b, 0, [0, 0, 0, 0, 0], 999).ok, false);
  assert.equal(E.canBuild(b, 0, [1, 0, 0, 0, 0], 0).ok, false);
  assert.equal(E.canBuild(b, 0, [1, 0, 0, 0, 0], 30).ok, true);
  assert.equal(E.canBuild(b, 3, [3, 3, 3, 3, 3], 999).ok, false);
});

test("daily questions are the same for a given day", () => {
  const realms = [{ id: "a", ...fakeRealm }];
  assert.deepEqual(E.dailyQuestions(realms, "2026-10-11").map((q) => q.id), E.dailyQuestions(realms, "2026-10-11").map((q) => q.id));
  assert.equal(E.dailyQuestions(realms, "2026-10-11").length, 6);
});

test("streaks grow on consecutive days and reset after a gap", () => {
  assert.equal(E.nextStreak(3, "2026-10-10", "2026-10-11"), 4);
  assert.equal(E.nextStreak(3, "2026-10-11", "2026-10-11"), 3);
  assert.equal(E.nextStreak(3, "2026-10-08", "2026-10-11"), 1);
});
