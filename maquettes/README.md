# Comegitmix — mockups (v1)

Sources of the Design canvas "Comegitmix — maquettes" (Claude).

- `Main.dc.html` · A1 mission (AI and worktrees), "Editorial notebook" direction
- `A2-Puzzle.dc.html`, `A3-Sandbox.dc.html` · puzzle (squash) and sandbox, direction A
- `A4-Diff.dc.html` · diff screen
- `A5-MR-Branche.dc.html`, `A6-MR-Worktree.dc.html`, `A7-MR-Comparer.dc.html` · mission 6, review an MR (on a branch, in a worktree, comparison)
- `B1-Mission.dc.html`, `B2-Puzzle.dc.html`, `B3-Sandbox.dc.html` · direction B "Workshop" (VS Code feel, dark background) — discarded
- `C1-Branches.dc.html`, `C2-Worktrees.dc.html`, `C3-Worktrees-v2.dc.html` · variants to compare (branches, worktrees) — exploration
- `canvas.json` · position of the screens on the canvas
- `assets/` · `duo-rond.png` (round logo without e-mail), `logo-petit.png` (header)

Notes
- `.dc.html` is the canvas format: these files display in Claude (artifact), not by double-clicking. Images are referenced through `/_blob/…`; the original files are in `assets/`.
- All text goes through a `dict()` dictionary (fr / en) in each file, with a FR / EN toggle: reuse as is for the code.
- The mockups are published with the repository. The brand design system ("Le Sens de l'IA") lives in `../design-system/`, which is private (git-ignored, not published).
- Colours added for the lanes: dark sage #8A9456 (human branch), light sage #C9D08F.
