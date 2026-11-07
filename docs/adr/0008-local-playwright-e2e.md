# 0008 — Local Playwright end-to-end tests, no CI

Date: 2026-11-07 · Status: Accepted

## Context
Unit tests (`node --test`) cover the engine, but the game is mostly interaction: clicks, animations, language toggle, mission flow. The agent pushes to `main` without asking, so the push gate must be trustworthy.

## Decision
- Playwright, **Chromium only**, as a development dependency: `npm run test:e2e`, tests in `tests/e2e/`. It serves the game statically and plays at least: home screen, FR/EN toggle, one complete mission, one sandbox scenario.
- Three suites gate every push: `npm test`, `npm run content:check`, `npm run test:e2e`. All must pass locally; otherwise nothing is pushed and Marc is told.
- No GitHub Actions for now.

## Consequences
- Tests run only on the developer's machine; Firefox/WebKit can be added later if needed.
- Playwright is never loaded by the game ([0001](0001-static-hosting-vanilla-no-build.md)).
