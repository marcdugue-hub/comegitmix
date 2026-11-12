# ARCHITECTURE — code layout

HTML + CSS + native JavaScript modules (ES modules), **no framework, no build step, no runtime dependency**, served by **static hosting**.

## 0. What "static hosting, no build, no runtime dependency" means
- **Static hosting**: the server only hands out files as they are (HTML, CSS, JS, Markdown, images). There is no application server, no database, no account. It does **not** mean the game is static: it is a highly interactive serious game. Everything interactive — the pedagogical Git simulation engine, the SVG lanes, clicks, step validation — runs **in the browser**, in JavaScript.
- **No build step**: the files in the repository are exactly the files the browser loads. No compiler, bundler or transpiler sits in between; editing a file and reloading the page is enough.
- **No runtime dependency**: the game loads no third-party library or service while it runs. Lucide icons and fonts are copied into the repository (`assets/`). Development tools (Playwright for end-to-end tests) are dev dependencies only and are never shipped to the player.

Locally, `npm start` serves the folder and the game opens on `index.html`.

## 1. File tree
```
index.html
.nojekyll                 tells GitHub Pages to serve files as they are (no Jekyll processing of .md files)
package.json              scripts: start, test, content:check, test:e2e
playwright.config.js      e2e configuration (Chromium only, starts the local server)
content/                  missions, puzzles, sandbox starts in Markdown (docs/AUTHORING.md)
data/
  commands.json           command catalogue (groups, icons, order of introduction)
  diff-examples.json      diff examples (reference)
  scenarios/*.json        OLD format (reference for the state shape) — replaced by content/
src/
  main.js                 startup: loads i18n + content, mounts the interface, starts the router
  boot-guard.js           classic script (not a module): replaces the blank page with an explained FR/EN
                          panel when the game cannot start (file://, blocked file, old browser, timeout);
                          its strings are in i18n/boot-strings.js
  router.js               hash routes (§3)
  store.js                application state, history (undo/redo), local save
  engine/                 PURE ENGINE (no DOM) — tested with node --test
    state.js              creation, cloning, serialisation of the state
    parse.js              "git …" → { name, args, options }; suggestions (edit distance)
    apply.js              apply(state, command) → { state, events, explanation, error }
    commands/*.js         one command per file (add, commit, switch, merge, rebase, worktree…)
    diff.js               line diff (LCS), modes lanes / changes / staged
    conflicts.js          simulated detection ("same file changed on both sides") and resolution
    remote.js             origin / upstream / fork / fetch / pull / push / MR
    ai.js                 "make the AI work", colleague who pushes
    setup.js              replays a git-setup block (commands + @ directives)
    predicates.js         success conditions (readable phrases from docs/AUTHORING.md)
    equivalence.js        shape comparison of two states (typed-answer puzzles)
    to-setup.js           history → git-setup block ("Copy as start")
  content/                CONTENT READER (pure, tested)
    markdown.js           safe mini-Markdown (paragraphs, bold, italic, code, links, lists)
    frontmatter.js        key: value header
    mission.js            .md → mission object (parts, steps, end)
    puzzle.js             .md → puzzle object (choice or typed, computed goal)
    sandbox.js            .md → start
    summary.js            content/index.md → ordered lists
    doc.js                command card .md → { title, summary, syntax, see, sections }
    docs-topics.js        card list, groups, official links, typed command → card
    loader.js             fetches files for the current language, French fallback
    validate.js           errors with file:line (used by the check script and the tests)
  render/                 DRAWING (DOM + one SVG)
    scene.js              assembles the 4 zones
    zone-git.js           repository cards, MR, arrows
    lanes-layout.js       pure computation of lane positions (tested) — rules of docs/DESIGN.md §5
    zone-lanes.js         SVG drawing of lanes, commits, chips, wires
    zone-index.js         index strips, one per desk (the stash is on the local .git card, zone-git.js)
    zone-disk.js          tiles, file tree, status letters
    diff-screen.js        diff screen (3 modes × 2 views)
    conflict-screen.js    conflict resolution screen (with a conflict block, or the "not detailed" message)
    log-view.js           log view
    animate.js            animations from the engine's events
  ui/
    shell.js              header, tabs, language toggle
    home.js               home: three mode cards + Resume
    sandbox-panel.js      terminal, palette, history, buttons
    mission-panel.js      steps, command card, duo, parts, step-by-step
    puzzle-panel.js       statement, choice or typed answer, stars
    terminal.js           input, autocompletion, history
    pickers.js            argument pickers
    popovers.js           context menus (commit, chip, MR)
    rebase-editor.js      interactive rebase editor
    icons.js              table of Lucide icons as SVG (replaceable later)
  i18n/ fr.json en.json i18n.js
  styles/ tokens.css base.css components.css scene.css
scripts/check-content.mjs  content checker (CLI) — the only content validator
tests/
  unit/                    node --test: engine.*.test.js, content.*.test.js, layout.test.js, i18n.test.js
  e2e/                     Playwright (*.spec.js), Chromium only
assets/                    logo, duo, icons, fonts
```
`design-system/` is private: git-ignored, never published, and nothing in the game uses it at runtime.

## 2. Flow
1. The interface sends a **command** (typed text, palette click, scene manipulation) to the `store`.
2. The `store` calls `engine.apply(state, command)`. On error: the state does not change, the panel shows the explanation of the error.
3. Otherwise: the new state is pushed onto the history, `events` are passed to `animate.js`, then `scene.js` redraws.
4. Mission and Puzzle modes are **layers** on top of the same store: they decide which commands the palette offers, check success conditions after each command (`predicates.js`) and drive the panel.

Rule: the engine knows neither the DOM nor the language (it returns i18n keys + parameters). Rendering never modifies the state.

## 3. Routes
| Hash | Screen |
|---|---|
| `#/` | home: three mode cards, Resume when progress exists |
| `#/mission/<id>` (`?part=B&step=3`) | mission |
| `#/puzzle/<id>` | puzzle |
| `#/sandbox` (`?start=<id>`) | sandbox |
| `#/docs`, `#/docs/<id>` | command cards (opened in a new tab from the header and from terminal errors) |
The language is a global setting (FR | EN button), not a route. Hash routes need no server configuration, which suits static hosting.

## 4. Persistence (browser)
`localStorage` only, key `comegitmix:v1`: language, missions completed, puzzle stars, current sandbox session (history of commands, not the full state). Reads and writes are guarded (try/catch); the game works without them. No export/import, no share-by-link, no server, no analytics.

## 5. Hosting (GitHub Pages)
- Repository `github.com/marcdugue-hub/comegitmix` (public), served by GitHub Pages **from the root of `main`**.
- The site lives under a sub-path (`/comegitmix/`), so **every path is relative**: `./src/main.js`, `fetch('content/…')`, `assets/…` — never a leading `/`.
- A `.nojekyll` file at the root makes Pages serve the `.md` files of `content/` as they are.
- Pages is enabled manually once the sandbox is playable. Whatever is pushed to `main` is then live.
- `maquettes/` are published with the repository; `design-system/` is not (git-ignored).
- If the modules cannot run (page opened from `file://`, company proxy blocking a file, old browser), `src/boot-guard.js` shows the likely causes instead of a blank page; `main.js` calls `comegitmixBoot.ready()` once the game is on screen.

## 6. Tests
Three suites, all run locally (no CI for now):
- `npm test` — `node --test tests/unit/`.
- `npm run content:check` — `scripts/check-content.mjs` on every file of `content/`.
- `npm run test:e2e` — Playwright, **Chromium only**, in `tests/e2e/`. Playwright is a dev dependency only (first time: `npx playwright install chromium`). `playwright.config.js` starts the local static server.

Minimum coverage:
- Engine: one test per command, played errors, a single `.git`, one branch = one desk, `apply` does not modify its input, replaying the history = same state, conflicts (same-file rule), MR.
- Content: every file in `content/` passes `validate.js`; FR/EN aligned; every start replays; every puzzle solution reaches the goal.
- Layout: `lanes-layout.js` has no crossings on typical cases (2 to 8 branches).
- i18n: same keys in fr and en; no hard-coded text in `src/ui` and `src/render` (a test that looks for displayed string literals).
- End to end (Playwright): at least the home screen, the FR/EN toggle, one full mission, one sandbox scenario.
