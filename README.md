# Comegitmix

Understand Git by playing. A small, visual serious game that shows what Git commands really do — especially the ones that let an AI work on several topics in parallel (branches, worktrees, merge requests). Made for people who are not developers but work with developers. French and English.

A game by **Le Sens de l'IA**.

**Play online:** https://marcdugue-hub.github.io/comegitmix/

## Three modes
- **Mission** — seven guided stories (2 to 5 minutes each) with the human / AI duo.
- **Puzzle** — quick challenges: a starting situation, a goal, find the right command.
- **Sandbox** — free play: type commands or click in the scene, undo, start again. Nothing can break.

The screen always shows four zones, top to bottom: what Git remembers, the lanes (one per branch), the index (one per desk), and the folders on your computer (worktrees, all sharing a single `.git`).

## Run locally
No build, no runtime dependency: plain HTML, CSS and ES modules served as static files.

```sh
npm start            # serves the game at http://localhost:8080 (needs Python 3)
```

Any static server works, including under a sub-path (all paths are relative).

## Tests
```sh
npm install                          # dev dependency only: Playwright
npx playwright install chromium      # first time only
npm test                             # unit tests (node --test)
npm run content:check                # checks every file in content/
npm run test:e2e                     # end-to-end tests (Playwright, Chromium)
```

## Documentation
- [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) — the non-negotiable rules; [`docs/adr/`](docs/adr/) — why.
- [`docs/INDEX.md`](docs/INDEX.md) — reading order of the specifications.
- [`docs/AUTHORING.md`](docs/AUTHORING.md) — how to write missions, puzzles and sandbox starts in `content/` (Markdown, no code).
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — what is done and what is next.

## Licence
© Le Sens de l'IA. All rights reserved, unless Marc decides otherwise.

The fonts in `assets/fonts/` (Cormorant Garamond, DM Sans, DM Mono, Caveat) are distributed under the SIL Open Font License; their licence files are next to them.
