# Comegitmix — agent entry point

A small, light, visual **interactive serious game** that explains what Git commands do, especially those that let an AI work on several topics in parallel (branches, worktrees, merge requests). Audience: people who are not developers but work with developers. Brand: "Le Sens de l'IA".

## Read first
1. `docs/CONSTITUTION.md` — non-negotiable rules. Obey them.
2. `docs/INDEX.md` — reading order of the specs.
3. `docs/adr/` — why each rule exists.

Marc's priority: **the sandbox** comes before missions and puzzles.

## Where things are
- `docs/` specs, `docs/adr/` decisions.
- `content/` missions, puzzles, sandbox starts (Markdown, format in `docs/AUTHORING.md`).
- `src/` game code; `src/i18n/` UI strings; `src/styles/tokens.css` design tokens.
- `data/commands.json`, `data/diff-examples.json`; `data/scenarios/*.json` legacy state shapes (reference only).
- `assets/` logo, duo illustration, icons.
- `maquettes/` reference mockups (`.dc.html`, rendered in Claude; read the source for measurements). B* and C* are explorations.
- `design-system/` brand system: local only, git-ignored, read-only.
- `tests/unit/` unit tests (`node --test`), `tests/e2e/` Playwright.

## Commands
- `npm start` — serve the game at http://localhost:8080
- `npm test` · `npm run content:check` · `npm run test:e2e`

## Definition of done
All three suites pass; sandbox meets `docs/SANDBOX.md` §11; all `content/` playable; three modes playable in FR and EN; four zones, 100 %/60 % opacity, one `.git`; clickable tree with M/U/A letters, folders, + button; index per desk; diff screen in three modes and two views; mission 6 playable in two parts with its summary; no hard-coded text; no runtime dependency; works served statically.

## Working with Marc
Marc writes in French; answer in French, but everything written in the repo is in English. Explain technical terms in plain words.
