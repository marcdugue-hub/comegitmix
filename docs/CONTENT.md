# CONTENT — missions, challenges, progression

> The final playable text lives in `content/` (Markdown, format in `docs/AUTHORING.md`). This document keeps the teaching intent. In case of discrepancy, `content/` rules.

Common thread: a human and their AI assistant (the brand's duo) prepare a **client report**. The AI must work on several topics without overwriting the human's work. Tone: clear, no needless jargon, one idea per sentence. Narrative text is written in `content/`, one file per language (`.fr.md` / `.en.md`, French fallback); FR first, then EN.

## Missions (≈ 2 minutes each, 7 missions)
All missions are open; the order below is the **recommended** order, shown in the game, never enforced.

| # | Title | Idea to get across | Commands |
|---|---|---|---|
| 1 | A first snapshot | A commit is a snapshot of the project. The index chooses what goes into the snapshot. | `status`, `add`, `commit` |
| 2 | A lane for the AI | The AI works on its own lane, without touching `main`. | `branch`, `switch`, `diff` |
| 3 | Two assistants, one project | Several desks (worktrees) on the same repository: each has its branch, its files, its index. A single `.git`. | `worktree add`, `worktree list` |
| 4 | Review before accepting | See what the AI did, then keep or undo. | `log`, `diff`, `merge`, `revert`, `restore`, `reset` |
| 5 | Share with the team | The local repository, your online copy (fork) and the original project. | `fork`, `push`, `fetch`, `pull` |
| 6 | Review an MR | Review an assistant's work proposed online (MR), first by switching branch, then in a worktree, and compare. | `fetch`, `stash`, `switch`, `diff A...B`, approve/merge (site), `worktree add <path> <branch>`, `worktree remove`, `pull` |
| 7 | A readable history | Clean up before sharing, tidy up, remove a finished desk. | `rebase -i`, squash, `cherry-pick`, `stash`, `worktree remove` |

Mission 3 is the one in `maquettes/Main.dc.html`: "Two assistants, one project", shown there as mission 3/6 (the mockup predates mission 6), command `git worktree add ../rpt-ia-stats -b ia/chiffres`.

### Mission 3 in detail (model for the others)
1. *The starting point*: a folder `rpt-client`, branch `main`, 2 commits. → step done when the initial state is shown.
2. *A second desk for the "figures" AI*: `git worktree add ../rpt-ia-stats -b ia/chiffres`. Predicate: worktree `rpt-ia-stats` on branch `ia/chiffres`.
3. *A third desk for the "summary" AI*: `git worktree add ../rpt-ia-resume -b ia/resume`.
4. *See where things stand*: `git worktree list`. Predicate: last command = `worktree list`.
End message: "Three folders, a single history. Each moves forward on its lane without disturbing the others."

The other missions follow this model (3 to 5 steps, one command per step, one predicate per step, one "remember" sentence). They are written in `content/missions/` (format in `docs/AUTHORING.md`).

## Puzzle challenges (≈ 1 minute each)
1. Put a file into the snapshot: `add` (which file do we stage?).
2. Save the snapshot: `commit`.
3. Open a lane for an idea: `branch` / `switch`.
4. Merge 3 "wip" commits into one (`rebase -i HEAD~3`, squash) — see `maquettes/A2-Puzzle.dc.html`.
5. Bring back a finished lane: `merge`.
6. Undo without rewriting history: `revert`.
7. Move your branch back: `reset`.
8. Take a single commit from another lane: `cherry-pick`.
9. Put your changes aside: `stash`.
10. One more folder for the AI, without a new repository: `worktree add`.
Each challenge: start state, goal state, 4 proposals, one "remember" sentence. Written in `content/puzzles/`. Challenges 11 and 12 are described below.

## Progression table (palette and zone ①)
This table is not a lock: every mission is playable at any time. It says which commands each mission introduces; within a mission, the palette shows the commands of that row and the rows above, and zone ① shows the listed repositories.

| Commands introduced | When | Zone ① visible |
|---|---|---|
| status, add, commit | mission 1 | local |
| branch, switch, diff | mission 2 | local |
| worktree add / list | mission 3 | local |
| log, merge, revert, restore, reset | mission 4 | local |
| fork, push, fetch, pull | mission 5 | local + origin + upstream |
| stash, worktree remove, approve / merge an MR | mission 6 | local + origin (MR card) |
| rebase, squash, cherry-pick | mission 7 | everything |
Sandbox: everything is available, zone ① is shown in full (but `origin`/`upstream` can be hidden with a toggle).

## Diff in missions and challenges (addition)
- **Mission 2** (A lane for the AI): after the AI's `commit`, `git diff main ia/<topic>` opens the diff screen in "between two lanes" mode. Idea: "see what the AI changed without changing anything".
- **Mission 3**: step 3 of the panel ("Review its work with diff") opens `A4-Diff`; step 4 follows ("Merge what is good"). Steps 1 and 2 remain the two `worktree add`.
- **Mission 4** (Review before accepting): the three modes — `git diff` (my changes), `git diff --staged` (staged), `git diff main ia/…` (between two lanes) — then `merge` or `revert`. Show that a **U** file does not appear in `git diff` until it is staged (`git add`).
- **Extra challenge** (11): "Which diff shows what will go into the next commit?" (answer: `git diff --staged`).
- **File tree interaction** to introduce from mission 1: "click `intro.md` to say you worked on it: it becomes M; `git add` stages it; `git commit` takes a snapshot of it".
- Sample data: `data/diff-examples.json`.

## Conflicts in missions and challenges
Rule: same file changed on both sides = conflict (`docs/SANDBOX.md` §7.1). A mission or puzzle that wants the player to see the conflicting lines provides a `conflict` block with both versions (format in `docs/AUTHORING.md`); without it, the diff screen shows the "scenario does not detail the content" message.

## Mission 6 — Review an MR (addition)
Mockups: `maquettes/A5-MR-Branche.dc.html` (part A), `A6-MR-Worktree.dc.html` (part B), `A7-MR-Comparer.dc.html` (review screen). Content: `content/missions/` (mission 6 and its review screen 6b).

Situation: an AI assistant has pushed `ia/graphiques` and opened **MR !42** towards `main`. You are in `rpt-client` with two files in **M** (your work in progress). The mission has two parts, played one after the other; an "A · On a branch / B · In a worktree" selector at the top of the panel switches between them.

**Part A — on a branch (7 steps)**: `git status` → `git stash` (the M files disappear, a "stash · 1" chip appears on the local .git card in zone ①) → `git fetch origin` (the MR's lane becomes solid, chip `origin/ia/graphiques`) → `git switch ia/graphiques` (**your folder's content changes**, the wire goes to the blue lane with an elbow) → `git diff main...ia/graphiques` (review card, link to the diff screen) → approve on the site (the MR card becomes "Approved") → `git switch main && git stash pop` (back, the M files return).
Takeaway: "It works, but your desk was disturbed for the whole review."

**Part B — in a worktree (6 steps)**: `git fetch origin` → `git worktree add ../revue-mr-42 ia/graphiques` (new tile; your desk goes to 60 % **but its M files stay**) → `git diff main...ia/graphiques` → approve then merge on the site (`origin/main` moves ahead, dashed) → `git worktree remove ../revue-mr-42` (the tile disappears, the branch stays) → `git pull` (local main moves up to the merge, the M files are still there).
Takeaway: "Your work never moved."

**Comparison screen (A7)**: the two step lists side by side, with the desk's state for each step (intact / work put away / folder changed / work back). Boxes: when to choose which, the "branch already open in another desk" trap (Git refuses; go and review in that desk, `git worktree list` shows it), and MR = PR.

Teaching: the panel line **"Your work in progress: on your desk / put away in the stash"** is the central indicator. Each step shows "What just happened". You can go back and click a step to jump to it.

Added Puzzle challenge (12): "You have work in progress and need to review an MR without touching it. Which command?" → `git worktree add ../revue ia/graphiques`.
