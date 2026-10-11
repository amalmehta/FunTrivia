// Pure game rules: no DOM, no storage. Everything here is unit-tested.

export const LEVELS_PER_REALM = 5;
export const QUESTIONS_PER_LEVEL = 6;
export const HEARTS = 3;

export const PACES = {
  relaxed: { name: "Relaxed", seconds: 0, mult: 1, blurb: "No timer. Take all the time you like." },
  standard: { name: "Standard", seconds: 25, mult: 1.2, blurb: "25 seconds per question, small speed bonus." },
  swift: { name: "Swift", seconds: 12, mult: 1.5, blurb: "12 seconds. Big bonus for quick answers." },
};

// ---------- randomness ----------

export function seededRng(seed) {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- levels ----------

/**
 * The questions for one landmark. Questions are ordered easy → hard and cut
 * into 5 slices of 6, so level 1 is all easy, level 5 (the guardian) all hard.
 */
export function levelQuestions(realm, level) {
  const ordered = realm.questions
    .map((q, i) => ({ q, i }))
    .sort((a, b) => a.q.tier - b.q.tier || a.i - b.i)
    .map((x) => x.q);
  return ordered.slice(level * QUESTIONS_PER_LEVEL, (level + 1) * QUESTIONS_PER_LEVEL);
}

/** Shuffle choices so the correct answer moves around; keeps `answer` right. */
export function prepareQuestion(q, rng = Math.random) {
  const order = shuffle(q.choices.map((_, i) => i), rng);
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

// ---------- scoring ----------

const TIER_POINTS = { 1: 100, 2: 150, 3: 200 };

/** Points for one answer. combo = correct answers in a row before this one. */
export function scoreAnswer({ correct, tier = 1, timeLeft = 0, timeLimit = 0, combo = 0, pace = "standard" }) {
  if (!correct) return 0;
  const base = TIER_POINTS[tier] ?? 100;
  const speed = timeLimit > 0 ? Math.round(60 * Math.max(0, Math.min(1, timeLeft / timeLimit))) : 0;
  const comboBonus = 25 * Math.min(combo, 6);
  return Math.round((base + speed + comboBonus) * (PACES[pace]?.mult ?? 1));
}

/** 3 hearts, 6 questions: 6 right = 3 stars, 5 = 2, 4 = 1, fewer = not cleared. */
export function starsFor(correct, total = QUESTIONS_PER_LEVEL) {
  const wrong = total - correct;
  if (wrong >= HEARTS) return 0;
  return HEARTS - wrong;
}

export function gemsFor(stars, { firstClear = false, improvedBy = 0 } = {}) {
  if (stars === 0) return 2; // a consolation shard for trying
  return 5 * stars + (firstClear ? 15 : 0) + 10 * improvedBy + (stars === 3 ? 5 : 0);
}

// ---------- player level ----------

/** Total XP needed to reach player level n (level 1 = 0 XP). */
export function xpToReach(n) {
  return 75 * (n - 1) * n + 100 * (n - 1);
}

export function levelFromXp(xp) {
  let n = 1;
  while (xpToReach(n + 1) <= xp) n++;
  const from = xpToReach(n), to = xpToReach(n + 1);
  return { level: n, into: xp - from, span: to - from, progress: (xp - from) / (to - from) };
}

const TITLES = ["Wanderer", "Seeker", "Apprentice", "Scholar", "Lorekeeper", "Loremaster", "Sage", "Archsage", "Mythwright", "Worldshaper"];
export function titleFor(level) {
  return TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))];
}

// ---------- unlocking ----------

/**
 * Favorite realms start open. The rest open one at a time as total stars grow,
 * nearest first: realms sharing a region with a favorite come before others.
 * Returns [{ id, cost }] for the locked realms, in unlock order.
 */
export function unlockOrder(realms, favorites) {
  const favRegions = new Set(realms.filter((r) => favorites.includes(r.id)).map((r) => r.region));
  const rest = realms.filter((r) => !favorites.includes(r.id));
  const near = rest.filter((r) => favRegions.has(r.region));
  const far = rest.filter((r) => !favRegions.has(r.region));
  return [...near, ...far].map((r, i) => ({ id: r.id, cost: 6 * (i + 1) }));
}

export function isRealmOpen(id, realms, favorites, totalStars) {
  if (favorites.includes(id)) return true;
  const entry = unlockOrder(realms, favorites).find((e) => e.id === id);
  return !!entry && totalStars >= entry.cost;
}

/** A level is playable once the one before it is cleared. */
export function isLevelOpen(realmProgress, level) {
  if (level === 0) return true;
  return (realmProgress?.[level - 1] ?? 0) > 0;
}

// ---------- Haven (the player's growing home) ----------

export const BUILDINGS = [
  { id: "greenhouse", realm: "wilds", name: "Living Greenhouse" },
  { id: "alembic", realm: "lab", name: "Alembic Workshop" },
  { id: "telescope", realm: "cosmos", name: "Star Tower" },
  { id: "shrine", realm: "myth", name: "Shrine of Tales" },
  { id: "keep", realm: "history", name: "Chronicle Keep" },
  { id: "maproom", realm: "geography", name: "Cartographer's Lodge" },
  { id: "bandstand", realm: "music", name: "Echo Bandstand" },
  { id: "library", realm: "lit", name: "Quill Library" },
  { id: "studio", realm: "art", name: "Gallery Studio" },
];

export const BUILD_TIERS = 3;
/** Cost in gems for building tier t (1..3), and the landmarks of its realm that must be cleared. */
export function buildRequirement(tier) {
  return { gems: [0, 30, 70, 140][tier], landmarks: [0, 1, 3, 5][tier] };
}

export function canBuild(building, currentTier, realmProgress, gems) {
  if (currentTier >= BUILD_TIERS) return { ok: false, reason: "Fully built" };
  const req = buildRequirement(currentTier + 1);
  const cleared = (realmProgress ?? []).filter((s) => s > 0).length;
  if (cleared < req.landmarks) return { ok: false, reason: `Clear ${req.landmarks} landmark${req.landmarks > 1 ? "s" : ""} in this realm`, req };
  if (gems < req.gems) return { ok: false, reason: `Needs ${req.gems} gems`, req };
  return { ok: true, req };
}

// ---------- daily expedition ----------

export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Six questions from the open realms, the same for everyone on a given day. */
export function dailyQuestions(openRealms, day) {
  const rng = seededRng(`daily:${day}`);
  const pool = openRealms.flatMap((r) => r.questions.map((q) => ({ ...q, realm: r.id })));
  return shuffle(pool, rng).slice(0, QUESTIONS_PER_LEVEL);
}

// ---------- achievements ----------

export const ACHIEVEMENTS = [
  { id: "first-step", name: "First Step", desc: "Clear your first landmark.", test: (s) => s.cleared >= 1 },
  { id: "flawless", name: "Flawless", desc: "Earn 3 stars on a landmark.", test: (s) => s.perfects >= 1 },
  { id: "guardian", name: "Guardian's Bane", desc: "Defeat a realm's guardian (landmark 5).", test: (s) => s.guardians >= 1 },
  { id: "combo5", name: "Unbroken Chain", desc: "Answer 5 in a row correctly.", test: (s) => s.bestCombo >= 5 },
  { id: "explorer", name: "Explorer", desc: "Open 5 realms.", test: (s) => s.openRealms >= 5 },
  { id: "builder", name: "Builder", desc: "Raise your first Haven building.", test: (s) => s.buildings >= 1 },
  { id: "scholar", name: "Scholar", desc: "Collect 50 lore entries in the Codex.", test: (s) => s.codex >= 50 },
  { id: "daily", name: "Daily Devotion", desc: "Finish a daily expedition.", test: (s) => s.dailies >= 1 },
  { id: "streak3", name: "Kindled", desc: "Play 3 days in a row.", test: (s) => s.streak >= 3 },
  { id: "echoes", name: "Echo Hunter", desc: "Clear 10 missed questions in Echoes review.", test: (s) => s.echoesCleared >= 10 },
  { id: "conqueror", name: "Realm Conqueror", desc: "Earn all 15 stars in one realm.", test: (s) => s.fullRealms >= 1 },
  { id: "worldshaper", name: "Worldshaper", desc: "Defeat every guardian.", test: (s) => s.guardians >= 9 },
];

/** Advances a play streak: same day keeps it, next day grows it, a gap resets it. */
export function nextStreak(streak, lastDay, today) {
  if (lastDay === today) return streak;
  const diff = Math.round((Date.parse(today) - Date.parse(lastDay)) / 86400000);
  return diff === 1 ? streak + 1 : 1;
}
