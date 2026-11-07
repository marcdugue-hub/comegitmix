# 0004 — Markdown content with English structure

Date: 2026-11-07 · Status: Accepted · Refines: [0000](0000-founding-decisions.md) §13

## Context
Narrative content lives in `content/**/*.md`, one file per language. The first draft of the format used French keys with English aliases, which doubled the checker's work for no benefit.

## Decision
- One file per language: `name.fr.md` and `name.en.md`, steps aligned one to one; if a language is missing, fall back to French.
- **Every structural token is English, in both FR and EN files, with no aliases**: front-matter keys, step keys, section headings, fenced block names, directives, validation expressions, error codes, site actions, table-of-contents sections. Only text shown to the player is in the file's language.
- The "what the AI did" texts used by the sandbox are generic lines stored in `content/`, unless a mission provides its own text.
- English translations are written by the implementation agent; Marc tests them in the game.

## Consequences
- FR and EN files have identical structure, which `content:check` can verify line by line.
- The full syntax lives in `docs/AUTHORING.md`.
