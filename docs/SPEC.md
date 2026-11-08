# SPEC — Comegitmix

## 1. Promise
In a few minutes, understand visually what each Git command does, and why these commands matter when you have an AI work on several topics at once. Every command has a **visible effect** on four zones.

## 2. Screen (desktop first, 1440×900 reference)
```
┌ Header: logo-petit.png · Comegitmix · tabs Mission | Puzzle | Sandbox · progress · FR | EN ─────────┐
├ Left panel (368 px) ─────┬ Scene (1012 px) ─────────────────────────────────────────────────────────┤
│ depends on the mode      │ ① In Git          repositories: upstream, origin, local (.git)          │
│                          │ ② The lanes       branches: horizontal coloured lanes                   │
│                          │ ③ The index       staged files, per folder                              │
│                          │ ④ On your machine folders = worktrees, files, statuses                  │
└──────────────────────────┴──────────────────────────────────────────────────────────────────────────┘
```
Reference measurements: `maquettes/Main.dc.html` (inside the scene: ① y0–176, ② y192–484, ③ y500–560, ④ y576–796). They are indicative: rendering adapts to the width (see `docs/DESIGN.md`).

### Home
Three cards — Mission, Puzzle, Sandbox — in the order of the mockup, plus a **Resume** card when saved progress exists.

### Zone ① In Git
- Cards: `upstream` (the original project), `origin` (your online copy, the fork), "Local repository · .git".
- **Progressive** reveal: at first only the local repository is active. `origin` appears locked and dashed, then `upstream` with the fork (see the reveal table in `docs/CONTENT.md`).
- `fork`, `pull`, `push` arrows between the cards, animated when run.
- **MR card** (from mission 6 on) inside the `origin` card: number (`!42`), title, `source → target`, number of comments and a status chip ("Open · in review" terracotta outline, "Approved" sage, "Merged" charcoal). Before the `fetch`, the MR's lane is drawn dashed and faded with the chip "MR !42 · online only".
- The local repository shows commits, branches, desks, and the note "a single .git, shared by all desks".

### Zone ② The lanes
- One lane per branch. `main` in black, at the bottom. The others above, in colour.
- Commits: circles; the tip is filled with the lane's colour.
- Head chip: branch name, plus `HEAD` if a desk has it open. Short message under the commit.
- Remote chip: `origin/main`, dashed, next to `main`.
- **Preview before running**: the upcoming lane or wire is drawn dashed.
- Each lane open in a desk is linked to its tile in zone ④ by a dashed wire in its colour.

### Zone ③ The index
- One strip **per desk** (corrected from mockups A1 to A3), aligned with its tile in zone ④, listing the *staged* files (`add`) with their letter. Two chips maximum then "+n"; "nothing staged" when empty. Same opacity as the tile (100 % / 60 %) and an edge in the lane's colour.
- Show the path: modified file → staged (index) → commit (lane).

### Zone ④ On your machine
- One tile per **worktree**. The original folder is the main worktree (it holds the real `.git/`). The others hold a `.git` file that points to it.
- Tile: folder name, branch, 3 to 5 files with status (modified, staged), colour band on the left.
- **Active desk at 100 %, others at 60 %** (tile and wire). The active one carries "You are here".
- A branch without a folder exists only in zone ② (no wire down).

#### Interactive file tree
- Each tile shows a real tree: folders first, then files. Click a folder = it opens or closes (rotating chevron). Scrolling list area inside the tile.
- **Click a file = "I worked on it"**, cycling: clean → **M** (modified, orange) → staged (blue letter, the file enters the desk's index) → clean. For a **U** file: U → **A** (staged) → U.
- **+ button** in the tile header (drops at the root) and on each folder row (drops inside). The new file is named `nouveau-N.md`, shows **U**, and the target folder opens. Any clicked file makes its desk active.
- Letters (as in VS Code): **M** modified (`#c4551a` on light orange), **U** new untracked (`#55612a` on light sage), **A** staged (`#1a6a88` on light sky). A folder with changes shows a dot in the most "urgent" colour (M, then U, then staged). A legend of the letters sits under the "On your machine" label.
- M files carry a **diff** link that opens the diff screen.
- A desk "to be created" (dashed) is not interactive.

#### Diff screen
See `docs/DESIGN.md` § Diff screen. Entry: the `diff` command (mission, puzzle, sandbox) or the "diff" link of an M file. Default mode depends on context (between two lanes in mission 3 step 3; my changes when opened from an M file).

## 3. Modes

### 3.1 Mission (guided story, 10 to 15 min)
- Seven missions (`docs/CONTENT.md`), each with 3 to 5 steps (mission 6: two parts and a review screen).
- **All missions are open**; a recommended order is shown, nothing is locked.
- Left panel: number and duration, title, speech bubble of the duo (human/screen), step list (done / current / upcoming), "Your next command" card (command, one-sentence explanation, **Run** and **Hint** buttons), command palette (commands introduced so far / not yet introduced).
- The player clicks the suggested command or types it. A step is validated by a **predicate on the state** (written in `content/`, see `docs/AUTHORING.md`), never by text comparison.
- Each run shows "what just happened" in one or two sentences and animates the zones.
- Saved: current mission, steps done, missions completed.

### 3.1 bis "Step by step" missions
Some missions (6) show a complete procedure: the step list is clickable (jump to a step), a **Previous** button goes back, and the scene is **recomputed from the initial state + the steps done** (replay, not undo). The panel shows the line "Your work in progress" and the "What just happened" box. "Site" steps (approve, merge an MR) have no `$`: they are presented as an action on GitLab/GitHub.

### 3.2 Puzzle (quick challenges)
- Twelve challenges. Each: statement, **start state**, **goal state** (shown dashed in sky blue), 4 proposed commands of which one is correct.
- **Check** and **Skip** buttons. Score from 1 to 3 stars depending on attempts; optional timer.
- After validation, the engine applies the command and the result is **seen**, then a "Remember" card.
- Puzzles are always open.

### 3.3 Sandbox (free play)
Detailed in `docs/SANDBOX.md`. In short:
- Palette grouped as: *Prepare* (add, commit, stash, restore), *Lanes* (branch, switch, merge, rebase), *Rewrite* (squash, cherry-pick, reset, revert), *Share* (fork, fetch, pull, push), *In parallel* (worktree add / list / remove), *Read* (status, diff, log, blame).
- "Terminal" area: last command, one-sentence result, **Undo** (history stack), **Reset**.
- Arguments through menus (branch, file, number of commits) or typed.
- Typical Git errors are played (branch already open in another desk, rejected `push`, conflict) with a human explanation.

### 3.4 Terminal and clicks, in every mode
The terminal and clicking are both always available; whatever the trigger, the **Git command is always displayed**. There is no "no terminal" mode. The raw text output of commands (`git status`, `git log`…) is hidden by default and shown only in **More details** mode, which exists in the sandbox only (see `docs/SANDBOX.md` §8, ADR 0012).

## 4. FR / EN toggle
- FR | EN button in the header, immediate effect.
- First launch: follows the browser language (French if the browser is in French, English otherwise); after that, the toggle choice is remembered.
- All interface strings come from `src/i18n/{fr,en}.json` (stable keys); narrative text comes from `content/` (one file per language, French fallback). Git commands, file names and branch names stay as they are. Sample commit messages are translatable too.

## 5. Accessibility and robustness
- Full keyboard support, real `button`/`a` elements, `aria-label` on icons, text summary of the scene (hidden list of lanes and folders).
- Text contrast ≥ 4.5:1. Never convey information by colour alone (the branch name is always written).
- `prefers-reduced-motion`: fades instead of animations.
- Minimum width 1100 px; below that, a "better on a large screen" message (mobile out of scope for v1).

## 5 bis. Content
Missions, puzzles and sandbox starts are described in Markdown in `content/` and interpreted by the game: see `docs/AUTHORING.md`. They are edited in the repository (commits / merge requests), never inside the game. The sandbox is detailed in `docs/SANDBOX.md`, the code layout in `docs/ARCHITECTURE.md`.

## 6. Out of scope for v1
Real Git, accounts, multiplayer, mobile, hand-drawn art, dark theme, progress export/import, share-by-link, analytics, in-game content editing.
