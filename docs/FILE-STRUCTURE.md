# What's Where

```
FunTrivia/
├── index.html            Page shell: top bar, view container, toasts; loads src/main.js
├── styles/main.css       All styling: theme tokens (day and night), layout, every view, animations
├── src/
│   ├── main.js           App shell: loads the save, applies settings, top bar, router, ⌘, shortcut
│   ├── engine.js         Pure game rules: levels, scoring, stars, XP, unlocking, Haven costs, daily, achievements
│   ├── state.js          Save data shape, localStorage load/save, applying a finished round
│   ├── realms.js         The nine realms and three regions: names, topics, map positions, colors
│   ├── art/
│   │   ├── icons.js      Hand-drawn SVG glyphs (realm emblems, stars, hearts, UI icons)
│   │   ├── shapes.js     Geometry helpers: smooth blobs for islands, ridgelines for mountains
│   │   ├── map.js        The illustrated world map (continents, fog, routes, compass, ship, clouds)
│   │   ├── scene.js      Layered realm panoramas with signature buildings and the landmark trail
│   │   └── haven.js      The Haven hillside and its buildings at each tier
│   └── ui/
│       ├── onboarding.js First-run flow (name → favorite realms → pace) and the realm picker
│       ├── map.js        World view: map plus Daily Expedition, Echoes and next-unveiling cards
│       ├── realm.js      Realm view: panorama, landmark pins, guide, landmark intro dialog
│       ├── quiz.js       The quiz overlay and results screen (levels, daily, echoes)
│       ├── haven.js      Haven view: building cards and upgrades
│       ├── codex.js      Codex view: lore by realm, echoes, achievements
│       ├── settings.js   Settings dialog
│       ├── feedback.js   Feedback tab and dialog
│       ├── dom.js        DOM helpers: escaping, modals, toasts
│       ├── sound.js      Synthesized sound effects (Web Audio)
│       └── fx.js         Confetti, counting numbers, floating "+120" labels
├── data/realms/          One file per realm: intro, guide, 5 landmarks, 30 questions with facts
│   ├── cosmos.js  wilds.js  lab.js          (The Azure Reaches: science)
│   ├── history.js geography.js myth.js      (The Ember Lands: the human story)
│   └── music.js   lit.js    art.js          (The Violet Isles: the arts)
├── tests/                Node test runner suites (engine, state, content)
├── scripts/serve.js      Zero-dependency static server used by `npm start`
├── docs/
│   ├── INSTRUCTIONS.md   Setup, running, and how to play
│   ├── SYSTEM-DESIGN.md  Architecture, flows, data, decisions, testing, limits
│   ├── FILE-STRUCTURE.md This file
│   └── screenshots/      Images used by the README
├── package.json          `npm start` and `npm test`; no dependencies
└── FunTrivia.md          The project brief and changelog
```

## Common changes

- **Add or fix a question:** edit the realm's file in `data/realms/`. Keep 10 questions per tier, then run `npm test`.
- **Add a realm:**
  1. Add an entry to `REALMS` in `src/realms.js` with its region, color, icon and map position.
  2. Add `data/realms/<id>.js`.
  3. Add a building to `BUILDINGS` in `src/engine.js`.
  4. Add a plot in `src/art/haven.js`.
  5. Add a scene builder in `src/art/scene.js`.
- **Tune difficulty or rewards:** everything is in `src/engine.js`. The tests show the intended behavior.
