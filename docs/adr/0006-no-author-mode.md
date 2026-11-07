# 0006 — No author mode, no in-game editing

Date: 2026-11-07 · Status: Accepted · Supersedes part of: [0000](0000-founding-decisions.md) §13

## Context
The draft planned a hidden author page (`#/auteur`) to reload content and list errors, and possibly an in-game editor. Marc will ask the agent to write new content rather than author it himself, and GitHub Pages cannot save files anyway.

## Decision
- No author mode and no in-game editor.
- `npm run content:check` is the only content validator.
- Content changes go through commits (or merge requests) on GitHub.

## Consequences
Less code and no hidden route to maintain. Revisit if non-developers start authoring content.
