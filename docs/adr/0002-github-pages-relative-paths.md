# 0002 — GitHub Pages with relative paths

Date: 2026-11-07 · Status: Accepted

## Context
The game needs a free, simple host. A VPS was the fallback if GitHub Pages caused problems; with [0001](0001-static-hosting-vanilla-no-build.md) it does not.

## Decision
- Repository: `github.com/marcdugue-hub/comegitmix`, public (required by free GitHub Pages).
- Pages serves the root of `main`, with no workflow and no build.
- Every path in the game (scripts, styles, `content/`, `assets/`) is **relative**, so the game works under `/comegitmix/` or any other address.
- Pages is enabled manually once the sandbox is playable; until then nothing is published.

## Consequences
- Moving to another host (VPS, brand site) needs no code change.
- Everything in the repository is public, hence [0009](0009-private-design-system.md).
