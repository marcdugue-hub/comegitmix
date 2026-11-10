# Comegitmix documentation — index

Reading order for a new session (clarification or implementation):

| # | Document | Content |
|---|---|---|
| 0 | `CLAUDE.md` | brief, fixed decisions, definition of done |
| 1 | `docs/CONSTITUTION.md` | **short non-negotiable rules**, each linked to the ADR that justifies it |
| 2 | `docs/SPEC.md` | product: 4-zone screen, three modes, file tree, FR/EN, accessibility |
| 3 | `docs/SANDBOX.md` | **the sandbox in detail (priority no. 1)** |
| 4 | `docs/GIT-MODEL.md` | simulated engine: state, commands, files and statuses, diff, MR |
| 5 | `docs/AUTHORING.md` | **missions, puzzles and sandbox starts written in Markdown** and interpreted by the game |
| 6 | `docs/ARCHITECTURE.md` | code layout, flow, routes, persistence, hosting, tests |
| 7 | `docs/DESIGN.md` | brand, tokens, lanes, tiles, status letters, diff screen |
| 8 | `docs/CONTENT.md` | teaching intent of the 8 missions and 19 puzzles (final text lives in `content/`) |
| 9 | `docs/ROADMAP.md` | build order and criteria per milestone |
| 10 | `docs/adr/` | decision records (`NNNN-title.md`: Context / Decision / Consequences) |

Materials:
- `content/` — all playable content in Markdown (table of contents `content/index.md`, 8 missions + 1 review screen, 19 puzzles, sandbox starts, file contents `files.<lang>.md`), one file per language (`.fr.md` / `.en.md`).
- `maquettes/` — visual reference (direction A: `Main`, `A2` to `A7`). B* and C* = discarded exploration. Published with the repository.
- `data/commands.json` — command catalogue; `data/diff-examples.json` — diff examples; `data/scenarios/*.json` — old format, replaced by `content/` (kept as a reference for the state shape).
- `src/i18n/`, `src/styles/tokens.css`, `assets/`.
- `design-system/` — brand reference, read-only, private (git-ignored, never published, never used at runtime).

Next session: **implementation**, following ROADMAP (sandbox first).
