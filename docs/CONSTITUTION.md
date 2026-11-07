# Constitution

Non-negotiable rules for anyone (human or agent) working on Comegitmix. Each rule links to the decision that justifies it; the rationale lives there, not here. Changing a rule requires a new ADR.

## Product
1. Comegitmix is an **interactive serious game**: the player types commands or clicks in the scene, a simulation computes the new state, the scene reacts. Never a slideshow of "Next" screens. — [SPEC](SPEC.md)
2. The audience is not developers: every Git term is explained in plain words where it appears. — [SPEC](SPEC.md)
3. The engine is a **pedagogical simulation** of Git, not a reimplementation. — [GIT-MODEL](GIT-MODEL.md)
4. The founding game and visual decisions (three modes, four zones, lanes, worktree folders, one shared `.git`, index per desk, diff screen, mission 6) hold. — [ADR 0000](adr/0000-founding-decisions.md)
5. The sandbox is built first. — [ROADMAP](ROADMAP.md)

## Technology
6. Static hosting, vanilla ES modules, no build step, no runtime dependency; fonts and icons are copied into the repo. — [ADR 0001](adr/0001-static-hosting-vanilla-no-build.md)
7. Every path is relative; the game is served by GitHub Pages from `main`. — [ADR 0002](adr/0002-github-pages-relative-paths.md)
8. Progress lives in `localStorage` only; no export, no share-by-link. — [ADR 0003](adr/0003-progress-in-localstorage-only.md)
9. No analytics. — [ADR 0010](adr/0010-product-defaults.md)

## Content and language
10. Narrative content is Markdown in `content/`, one file per language, with English structural tokens and no aliases. — [ADR 0004](adr/0004-markdown-content-english-structure.md)
11. Conflicts are file-level; content detail comes only from `conflict` blocks. — [ADR 0005](adr/0005-file-level-conflicts.md)
12. No author mode, no in-game editing; `content:check` is the validator. — [ADR 0006](adr/0006-no-author-mode.md)
13. English for docs, code, comments, identifiers and commits. The game is FR/EN with **no hard-coded text**: UI strings in `src/i18n/`, narrative in `content/`. — [ADR 0007](adr/0007-english-project-language.md)

## Brand
14. Brand: "Le Sens de l'IA". Logo as PNG only, text always horizontal, no emoji, no robots/circuits/blue-purple gradients, Lucide icons, colours only from `docs/DESIGN.md`. — [DESIGN](DESIGN.md)
15. `design-system/` is never committed; `maquettes/` and `design-system/` are never modified. — [ADR 0009](adr/0009-private-design-system.md)

## Quality and workflow
16. Before every push: `npm test`, `npm run content:check` and `npm run test:e2e` pass locally. Never push with a failing suite; report instead. — [ADR 0008](adr/0008-local-playwright-e2e.md)
17. After each finished step with green suites, the agent commits and pushes to `main` without asking. — [ADR 0008](adr/0008-local-playwright-e2e.md)
18. A change of decision is recorded as a new ADR in `docs/adr/`, then reflected here and in the specs.
