# 0001 — Static hosting, vanilla JS, no build, no runtime dependency

Date: 2026-11-07 · Status: Accepted

## Context
The game is highly interactive: a Git simulation engine, animated SVG lanes, clickable file trees, step validation. It must stay light, easy to host and maintainable by AI agents over time. Marc asked to confirm this does not limit interactivity.

## Decision
- **Static hosting**: the server only sends files as they are; it runs no code. All interactivity runs in the visitor's browser, in JavaScript.
- **Vanilla ES modules, no build**: the JavaScript we write is exactly what the browser runs. No framework (React, Svelte…), no bundler, no compilation step.
- **No runtime dependency**: the game loads no third-party library. The simulation engine, SVG rendering and Markdown reader are written for the project. Lucide icons and fonts are copied into the repository (no CDN, no Google Fonts call).
- Development-only tools (Playwright, see [0008](0008-local-playwright-e2e.md)) are allowed; they are never shipped.

## Consequences
- `index.html` served by any static server (`npm start`) is the whole game.
- We write and test our own small modules (engine, renderer, Markdown subset parser).
- No dependency updates or supply-chain risk at runtime.
