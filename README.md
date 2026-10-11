# FunTrivia

A trivia adventure for the browser and the Mac. You explore nine realms of knowledge on an illustrated map, clear landmarks, defeat each realm's guardian and build up your own Haven, learning a new fact with every question.

![World map](docs/screenshots/World%20Map.jpg)

| A realm's trail of landmarks | A question, with the lore it teaches |
|---|---|
| ![Realm trail](docs/screenshots/Realm%20Trail.jpg) | ![Question](docs/screenshots/Question.jpg) |
| **Rewards after every landmark** | **Your Haven grows as you learn** |
| ![Results](docs/screenshots/Results.jpg) | ![Haven](docs/screenshots/Haven.jpg) |
| **The Codex at night** | **The world map at night** |
| ![Codex](docs/screenshots/Codex%20Night.jpg) | ![World map at night](docs/screenshots/World%20Map%20Night.jpg) |

```mermaid
flowchart LR
  A[Pick favorite realms] --> B[World map]
  B --> C[Realm: 5 landmarks]
  C --> D[Six-question round]
  D --> E[Stars, XP, gems, lore]
  E --> F[Fog lifts on new realms]
  E --> G[Build up your Haven]
  D -- missed --> H[Echoes review]
  F --> B
```

**Mac app:**

![FunTrivia on the Mac](docs/screenshots/Mac%20App.jpg)

**Play in the browser:** `npm start`, then open http://localhost:5173
**Build the Mac app:** `mac/build.sh` makes `build/FunTrivia.app` and `build/FunTrivia.dmg`

- [How to set up, run and play](docs/INSTRUCTIONS.md)
- [System design](docs/SYSTEM-DESIGN.md)
- [What's where](docs/FILE-STRUCTURE.md)
