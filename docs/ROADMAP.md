# ROADMAP

Build order (Marc's priority: the sandbox comes first):
1. **Sandbox** (`docs/SANDBOX.md`, criteria §11), built in this order:
   1. Engine (+ `setup.js` that replays a git-setup block, useful from the first tests).
   2. Static scene.
   3. Complete sandbox, including the "Conflict ready to resolve" start.
   4. Playwright setup (`tests/e2e/`, Chromium) with a first sandbox scenario.
   5. **Enable GitHub Pages** (manually, root of `main`) once the sandbox is playable.
2. Markdown content reader + `npm run content:check` (`docs/AUTHORING.md`).
3. Missions (including step-by-step and the review screen) from `content/missions`.
4. Puzzles from `content/puzzles`.
5. FR/EN (including EN translation of the remaining narrative content) and finishing touches.
The milestones below keep their content; the order above takes precedence.

After each finished step: run `npm test`, `npm run content:check` and `npm run test:e2e` locally; if all three pass, commit and push to `main`. Never push with a failing test.

## Milestone 1 — Engine (`src/engine/`)
Deliverables: `state.js`, `parse.js`, `apply.js`, `predicates.js`, `conflicts.js`, `tests/unit/engine.test.js`.
Criteria: `npm test` passes; every command in `docs/GIT-MODEL.md` §4 has a test; the input is never mutated; errors of §6 played, including the conflict rule (§6.1).

## Milestone 2 — Static scene
Deliverables: `index.html`, `src/styles/`, `src/render/` (zones ①–④, SVG lanes, tiles).
Criteria: loading the mission 3 start renders the same scene as `maquettes/Main.dc.html` (4 zones, lanes without crossings, dashed wires, active 100 % / others 60 %, one index per desk).

## Milestone 3 — Sandbox
Deliverables: palette, arguments through menus, typed input, undo/redo/reset, event animations, "More details" mode, sandbox starts (including "Conflict ready to resolve").
Criteria: `docs/SANDBOX.md` §11; all commands playable; errors played with an explanation.

## Milestone 3 bis — Playwright
Deliverables: `playwright.config.js` (Chromium only, starts the local server), `npm run test:e2e`, Playwright as a dev dependency only, first spec in `tests/e2e/` covering a sandbox scenario. No CI: run locally.
Criteria: `npm run test:e2e` passes locally; GitHub Pages enabled afterwards.

## Milestone 4 — Mission
Deliverables: panel, steps, hints, recommended order (no locking), `localStorage` save, seven missions.
Criteria: mission 3 playable end to end; progressive zone ①; e2e test of one full mission.

## Milestone 5 — Puzzle
Deliverables: twelve challenges, goal state shown dashed, stars, "Remember".

## Milestone 6 — FR / EN and finishing touches
Deliverables: all strings in `src/i18n/`, fr/en key alignment test, browser-language detection on first launch, accessibility (SPEC §5), `prefers-reduced-motion`, e2e tests of the home screen and the FR/EN toggle.
Criteria: no hard-coded string (test that scans `src/`), instant toggle, contrasts OK.

## Definition of done (v1)
See `CLAUDE.md`. At each milestone: clean commit, the three test suites green, a short ADR in `docs/adr/` when a choice was not covered by the docs.

## Additions (file tree and diff)
- **Milestone 1**: add `touch`, `create`, M/U/A statuses, three content versions and `diff()` (GIT-MODEL §8) with tests (diff between two lanes, `diff` without U files, `--staged`, click cycle).
- **Milestone 2**: interactive file tree (expandable folders, +, letters) and one index per desk, compared with `maquettes/A3-Sandbox.dc.html`.
- **Milestone 1 (continued)**: MR on origin, site actions, `diff A...B`, `worktree add` on an existing branch (GIT-MODEL §9).
- **Milestone 4 (continued)**: step-by-step mode and mission 6, compared with `maquettes/A5`, `A6`, `A7`.
- **Milestone 3**: diff screen (3 modes × 2 views), reachable from the `diff` command and the "diff" link of M files; conflict screen (with a `conflict` block, or the "not detailed" message).
