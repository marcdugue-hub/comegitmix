# 0010 — Product defaults

Date: 2026-11-07 · Status: Accepted

## Context
Several product questions had defaults in the draft docs; Marc settled them.

## Decision
- **Home**: three cards (Mission, Puzzle, Sandbox) in the mockup's order, plus "Resume" when progress exists.
- **Unlocking**: everything is open; missions show a recommended order but are not locked.
- **Input**: terminal and clicks both available; the Git command is always shown. No "no terminal" mode.
- **Raw output** of `git status` / `git log`: hidden by default, shown in "More details" mode.
- **Initial language**: follows the browser (French if the browser is French, English otherwise), then remembers the toggle.
- **Sandbox**: limits of 8 branches, 4 desks, about 40 commits; starts include "Conflict ready to resolve".
- **"Make the AI work"**: touches 1 to 3 files ([0004](0004-markdown-content-english-structure.md) for its texts).
- **Visuals**: colours from `docs/DESIGN.md` and the mockups; illustrations from `assets/` as in the mockups; Lucide for other icons. Hand-drawn icons may replace them later through the icon table.
- **No analytics**.

## Consequences
These are reflected in `docs/SPEC.md` and `docs/SANDBOX.md`.
