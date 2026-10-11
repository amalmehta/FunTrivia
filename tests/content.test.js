// Checks every realm's question bank for shape problems a typo could cause.
import { test } from "node:test";
import assert from "node:assert/strict";
import { REALMS, loadRealm } from "../src/realms.js";

for (const meta of REALMS) {
  test(`${meta.name}: lore and 30 well-formed questions`, async () => {
    const r = await loadRealm(meta.id);
    assert.equal(r.id, meta.id);
    assert.ok(r.intro && r.guide?.name && r.guide?.greeting);
    assert.equal(r.landmarks.length, 5);
    for (const lm of r.landmarks) assert.ok(lm.name && lm.lore);
    assert.equal(r.questions.length, 30);
    assert.deepEqual([1, 2, 3].map((t) => r.questions.filter((q) => q.tier === t).length), [10, 10, 10]);
    const ids = new Set();
    for (const q of r.questions) {
      assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
      ids.add(q.id);
      assert.ok(q.id.startsWith(`${meta.id}-`), q.id);
      assert.ok(q.q.trim().length > 8, q.id);
      assert.equal(q.choices.length, 4, q.id);
      assert.equal(new Set(q.choices.map((c) => c.toLowerCase().trim())).size, 4, `${q.id} has duplicate choices`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.id);
      assert.ok(q.fact.trim().length > 20, `${q.id} needs a fact`);
    }
  });
}

test("no two realms share a question text", async () => {
  const all = (await Promise.all(REALMS.map((r) => loadRealm(r.id)))).flatMap((r) => r.questions.map((q) => q.q.toLowerCase()));
  assert.equal(new Set(all).size, all.length);
});
