# 0000 — Founding game and visual decisions

Date: 2026-11-07 · Status: Accepted · Decided by: Marc Dugué

## Context
Before implementation, a design phase produced mockups (`maquettes/`) and fourteen decisions validated by Marc. They are grouped here so later ADRs can reference them.

## Decision
1. Three modes: **Mission** (guided story with the human/screen duo, 10–15 min), **Puzzle** (short challenges), **Sandbox** (free play).
2. Visual direction **A "editorial notebook"** only. Direction B (dark) is dropped.
3. Screen in four zones, top to bottom: ① In Git, ② Lanes, ③ Index, ④ On your computer.
4. Branches are **thick horizontal parallel lanes**; `main` is black, at the bottom.
5. Worktrees are **folders in zone ④**, each tied to its lane by a dotted line in the lane's colour. No other representation.
6. Active desk at **100 %** opacity, the others at **60 %**.
7. The index belongs to **each worktree** (the mockups show only one: fix in code).
8. A worktree is **not** a copy of the repository: one shared `.git`. A clone is a copy. The original folder is the main worktree. A lane with no folder is a branch with no worktree.
9. **Interactive file tree** (zone ④): click a file to say you worked on it; click a folder to open it; a **+** button (on the desk or a folder) drops a new file. Status letters follow IDEs: **M** modified, **U** untracked, **A** staged new file; a modified then staged file keeps its M, in blue. Click cycle: clean → M → staged → clean; U → A → U. A folder with changes carries a coloured dot.
10. **Index per desk**: each desk has its band in zone ③, aligned with its tile, listing staged files (2 chips max then "+n").
11. **Diff screen** (`maquettes/A4-Diff.dc.html`): full scene screen, three modes — between two lanes (`git diff main ia/resume`), my changes (`git diff`), staged (`git diff --staged`); two views — side by side and unified. Removed in light terracotta, added in light sage. A U file does not appear in `git diff` (show and explain it). A "diff" link appears on M files.
12. **Mission 6 "Review an MR"** (7 missions in total): part A on a branch (stash, fetch, switch, diff, approve, switch + stash pop), part B in a worktree (fetch, worktree add, diff, approve/merge, worktree remove, pull), then a summary screen. Step-by-step missions: clickable steps, Previous, scene recomputed from the initial state. MR card inside the `origin` card. Mockups A5, A6, A7.
13. **Markdown content**: missions, puzzles and sandbox starts are `content/**/*.md` files (one per language) read by the game (format: `docs/AUTHORING.md`), so Marc can change them without touching code. A checker (`npm run content:check`) reports errors with file and line. (Author mode: see [0006](0006-no-author-mode.md).)
14. FR/EN with instant toggle; UI strings in `src/i18n/fr.json` and `en.json`, narrative text in `content/`; **no hard-coded text**.

## Consequences
These decisions shape the spec (`docs/SPEC.md`), the sandbox (`docs/SANDBOX.md`) and the definition of done. Changing one requires a new ADR.
