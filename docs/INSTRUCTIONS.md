# Setting Up and Playing FunTrivia

## Set up

You need [Node.js](https://nodejs.org) 18 or newer. There is nothing to install, because FunTrivia has no dependencies.

```bash
cd FunTrivia
npm start
```

Then open **http://localhost:5173**. To use another port, run `PORT=8080 npm start`.

The game has to be served over HTTP because it uses ES modules, so opening `index.html` straight from Finder won't work. Any static file server will do; `npm start` uses the small built-in one in `scripts/serve.js`.

The display fonts (Cinzel and Inter) load from Google Fonts. Offline, the game falls back to system fonts and still works.

## Build the Mac app

You need Xcode, or its command line tools, on macOS 13 or newer.

```bash
mac/build.sh
```

This writes two things to `build/`:
- `FunTrivia.app`, a universal app for Apple silicon and Intel
- `FunTrivia.dmg`, a disk image with a drag-to-Applications shortcut

To build only the app, run `mac/build.sh --no-dmg`.

Open the DMG and drag FunTrivia into Applications, or run the app straight from `build/`.

**Signing.** The script signs with `$SIGN_IDENTITY` if it's set. Otherwise it uses the first code-signing identity in your keychain, and if there is none, an ad-hoc signature. Either way the app runs on the Mac that built it. On other Macs, Gatekeeper blocks it until it is notarized with an Apple Developer ID. Until then, someone on another Mac can right-click the app and choose **Open** the first time.

**Using the Mac app:**
- **Settings…** (⌘,) is in the FunTrivia menu.
- The View menu has **Reload** (⌘R) and **Enter Full Screen** (⌃⌘F).
- **Help → FunTrivia Help** opens this guide in your browser.
- Progress is saved by the app, separately from any browser.

Test the built app with:

```bash
mac/test.sh
```

It runs the app invisibly and needs no screen access. It checks that the game boots with no errors and that saved data survives a relaunch, then renders a demo world. It saves snapshots to `build/` as `Snapshot Launch.png` and `Snapshot World Map.png`.

## Run the tests

```bash
npm test
```

The tests cover the game rules (`tests/engine.test.js`), saving and rewards (`tests/state.test.js`), and the shape of every realm's question bank (`tests/content.test.js`).

## How to play

1. **Make your world.** On first launch, enter a name, pick up to three favorite realms and choose a pace. Your favorites start unveiled. Every other realm is hidden in fog.
2. **Pick a realm** on the world map. Each realm has a trail of **5 landmarks**. They run from easy to hard, and the 5th is the realm's **guardian**.
3. **Clear a landmark** by answering its 6 questions. You have **3 hearts**, and each wrong answer costs one.
   - 6 right earns ★★★, 5 right earns ★★ and 4 right earns ★.
   - Losing all 3 hearts leaves the landmark uncleared.
   - Clearing a landmark opens the next one.
4. **Learn as you go.** After every answer you see a short fact, which is saved to the **Codex**. Questions you miss become **Echoes** and come back in review until you get them right.
5. **Lift the fog.** Every star counts toward unveiling the next realm. Realms next to your favorites unveil first.
6. **Build your Haven.** Spend gems to raise one building per realm, with three tiers each. Each tier also needs a number of landmarks cleared in that realm.
7. **Daily Expedition.** Each day brings six questions from across your open realms. Everyone gets the same set that day, and the first run each day pays bonus gems.

### Scoring

| Earned by | Points |
|---|---|
| A correct answer | 100 easy, 150 medium, 200 hard |
| Answering fast (Standard and Swift paces) | Up to +60 |
| Each answer in your current streak | +25, up to 6 |
| Pace multiplier | Relaxed ×1, Standard ×1.2, Swift ×1.5 |

XP and gems come from your score and stars. Your player level and title (Wanderer → Worldshaper) rise with XP.

### Keyboard

| Key | Action |
|---|---|
| `1`–`4` or `A`–`D` | Pick an answer |
| `Enter` | Next question |
| `Esc` | Leave a round, or close a dialog |
| `⌘ ,` (Ctrl , on Windows/Linux) | Settings |

### Settings

Open Settings with the gear button or **⌘,**. It holds everything you can change:

- your name
- pace
- favorite realms
- theme: System, Day or Night
- reduce motion
- sound effects
- whether to show the fact after each answer
- reset progress

### Feedback

The small **Feedback** tab on the right edge saves notes in this browser. **Copy all** puts them on the clipboard so you can paste them into an email or issue.

## Where your progress lives

Everything is saved in your browser's `localStorage` under the key `funtrivia.save.v1`. Clearing site data, or **Settings → Reset all progress**, starts you over.
