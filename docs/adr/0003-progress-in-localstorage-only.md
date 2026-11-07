# 0003 — Progress in localStorage only

Date: 2026-11-07 · Status: Accepted

## Context
Players need their progress kept between visits. Options discussed: localStorage, JSON export/import, share-by-link (`?s=` encoding the sandbox state).

## Decision
- Progress and preferences (language, details mode) are stored in the browser's `localStorage`.
- **No** JSON export/import: it adds interface weight for little value.
- **No** share-by-link, now or later.

## Consequences
- Progress is per browser and lost if the user clears site data; this is accepted.
- No serialisation format to keep stable for external use; the stored state carries a version number so the game can reset it safely when the format changes.
