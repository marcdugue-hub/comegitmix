# DESIGN — Comegitmix

Reference: `design-system/` (brand "Le Sens de l'IA", read its `SKILL.md`; private, git-ignored, never used at runtime) and `maquettes/` direction A (`Main.dc.html`, `A2-Puzzle.dc.html`, `A3-Sandbox.dc.html`). In case of discrepancy, **the mockup rules for appearance, this document for the rules**.

## 1. Tokens (`src/styles/tokens.css`)
| Role | Value |
|---|---|
| Charcoal (text, `main`) | `#28201c` |
| Orange (accent, action) | `#E9722D` |
| Deep sky (text accent on light) | `#4aadcc` |
| Sky wash | `#B6E1ED` |
| Cream (background) | `#f7ede1` |
| Linen (cards) | `#ede5d6` |
| Sage / light sage | `#CDD0AB` / `#DFE2C5` |
| Secondary text | `#5f544c` (the brand grey `#7a6e65` is too pale for text) |
| Annotation | `#c4551a` |

**Colours added for the lanes** (as in the mockups): dark sage `#8A9456`, sage `#C9D08F`. Lane colour cycle, excluding `main`: orange `#E9722D`, sky `#4aadcc`, dark sage `#8A9456`, sage `#C9D08F`, then repeat. Never use `#84D0E4` for text on a light background. No colour outside this document.

## 2. Typography
Cormorant Garamond (headings, 300; emphasis in italics), DM Sans (interface), DM Mono (commands, files, hashes), Caveat **only** for annotations. All text stays **horizontal**. No emoji. Fonts are self-hosted in `assets/fonts/` (no third-party font service at runtime).

## 3. Brand (hard rules, see design-system/SKILL.md)
Brand: "Le Sens de l'IA". Logo only as PNG (`assets/logo-petit.png`, `assets/duo-rond.png`), never redrawn. No robot, no circuit, no blue-violet gradient. A discreet watercolour wash background is allowed. Use the illustrations in `assets/` as in the mockups.

## 4. Icons
Lucide (inline SVG or files in `assets/icons/`, copied into the repository), 1.5 px stroke, charcoal colour. Provide a single `icon(name)` table so they can be replaced later by hand-drawn icons.

## 5. Lane layout (algorithm)
- The scene has a lane zone of fixed height; commit width = `clamp(...)` depending on the number of commits to display (horizontal scale, internal horizontal scrolling beyond 14 commits).
- `main` at the bottom (charcoal). The other lanes are stacked above, **the outermost (top) one forks earliest, with the steepest slope, and ends furthest right**: this avoids any crossing.
- An inner lane must end before the x-coordinate of an outer lane's connector.
- Fork as a curve (Bézier) or a gentle diagonal; commits r = 11–14 px; tip filled with the lane's colour.
- Chip (branch name, `HEAD`) to the right of the tip.
- Connector: dashed vertical line, from the tip down to the folder tile, x of the tip = centre of the tile. If two connectors still cross, fall back to an orthogonal path (elbow).
- Preview: same path, dashed, 60 % opacity.
- Lane without a desk: no connector.

## 6. Folder tiles (zone ④)
250×170 px (reference), 3 per row in 1012 px; beyond that, wrap or scroll. Lane-colour band on the left, folder name in DM Mono, branch, files with status dots (modified = orange, staged = sky, clean = grey). Main tile: label "original folder · contains .git". Other tiles: note ".git → points to the original folder".
**Opacity: active 100 %, others 60 %** (tile + wire + associated index strip). 200 ms transition.

## 7. Animations
Short (≤ 600 ms), explanatory (a circle appears, a file slides from one zone to another). `prefers-reduced-motion` → fade. No looping decorative animation.

## 8. Components to build
Header, language toggle, mode tabs, home cards, mission panel, command card, command palette, scene (4 zones), lane/commit/chip, folder tile, index strip, repository card, duo speech bubble, "Remember" card, progress bar, stars.

## 9. File tree and status letters (zone ④, zone ③)
- File row: 26 px high, chevron (folders only), icon, name in DM Mono 13 px, letter badge on the right (20×20, radius 5, DM Mono 12 px 500). Square `+` button of 20 px on folder rows; tile header: `+` 22 px.
- Colours: tokens `--statut-M-*`, `--statut-U-*`, `--statut-A-*` (see `tokens.css`). Secondary text ≥ 4.5:1: check `#1a6a88` on `#dff1f7`, `#55612a` on `#DFE2C5`, `#c4551a` on 16 % orange background.
- Conflict letter **!**: terracotta, built from existing colours only (e.g. the "removed" colours of §10), see `docs/SANDBOX.md` §7.1.
- Active tile: 2 px border in the lane colour, "here" label in the lane colour. Inactive tile: 1 px border, 60 % opacity. Tile "to be created": dashed sky, 55 % opacity, not interactive.
- Fixed-height list (116 px) with vertical scrolling for open folders; tile 250×184 px.
- Zone ③: 250×36 strip per desk, 4 px left edge in the lane colour, `letter + name` chips (2 maximum, then "+n").
- Connectors from zone ① → ④: repeating vertical gradient (3 px solid, 9 px empty); opacity = that of the desk.

## 10. Diff screen
Reference: `maquettes/A4-Diff.dc.html`.
- In the scene (1012×796): header card (y 0–128) with the 3 mode tabs, the two compared ends (chips in the lane colour) joined by an arrow, the command in a charcoal chip, the total `+N` / `−N` and an explanatory sentence; file list on the left (264 px) with letters, `+a −d` counts and legend; viewer on the right (732 px) with a **Side by side / Unified** toggle, column headers, numbered lines, `+` / `−` sign, folded lines, colour legend and the Caveat annotation "nothing is changed: we are only looking".
- Colours: removed = background `#f6dccd` text `#8a3510`; added = background `#DFE2C5` text `#3f4a1a`; context white; fold `#f7f3ea` italic. Never colour alone: the `+` / `−` sign is always written.
- The left panel keeps the mission context (steps, command, palette where `diff` is available).
- Conflicted file without a `conflict` block: the viewer shows the "scenario does not detail the content" message instead of the lines (see `docs/SANDBOX.md` §7.1).
- No word-level highlighting in v1 (possible later).
