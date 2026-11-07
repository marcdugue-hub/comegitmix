# 0009 — `design-system/` stays private

Date: 2026-11-07 · Status: Accepted

## Context
`design-system/` holds the full "Le Sens de l'IA" brand system (charter, original drawings, portrait, UI kits, ~20 MB). The repository is public ([0002](0002-github-pages-relative-paths.md)). The game does not use this folder at runtime.

## Decision
- `design-system/` is listed in `.gitignore` and never committed or published.
- What the game needs (logo, duo illustration, icons) is copied into `assets/`; colours and type live in `src/styles/tokens.css`.
- `maquettes/` are published: they show only what the game shows.

## Consequences
An agent working from a fresh clone has no `design-system/`; `docs/DESIGN.md` must stay self-sufficient for building the game.
