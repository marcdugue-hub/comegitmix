# SANDBOX — the sandbox (priority no. 1)

The sandbox is the heart of the software: a **simulated, visible Git** where you try everything, make mistakes safely and understand what each command does. Missions and puzzles reuse its building blocks. Reference mockups: `maquettes/A3-Sandbox.dc.html` (scene, clickable file tree, index per desk), `A4-Diff.dc.html` (diff).

## 1. Screen

```
┌ Header: logo · Comegitmix · Mission | Puzzle | Sandbox · FR | EN ──────────────────────────────────┐
├ Left panel (368 px) ──────────────┬ Scene (4 zones) ──────────────────────────────────────────────┤
│ Start: "Two AI assistants" ▾      │ ① In Git      upstream · origin (MR) · local                  │
│ ┌ terminal ─────────────────────┐ │ ② The lanes   branches, commits, chips, HEAD                  │
│ │ rpt-client (main) $ _     │ │ ③ The index   one strip per desk (+ stash)                    │
│ └───────────────────────────────┘ │ ④ On your machine  one folder per worktree, file tree         │
│ What just happened                │                                                               │
│ Palette (6 groups)                │                                                               │
│ History (clickable timeline)      │                                                               │
│ Undo · Redo · Reset               │                                                               │
└───────────────────────────────────┴───────────────────────────────────────────────────────────────┘
```

## 2. Choosing a starting point
On first launch (and through the "Start ▾" menu) a dialog offers the starts listed in the Sandbox section of `content/index.md` (files `content/sandbox/*.md`, see `docs/AUTHORING.md`, sandbox start format):
- **Empty**: one folder, a few files, no commit.
- **Solo**: three commits on `main`, two modified files.
- **Two AI assistants**: the state of mockup A3 (your folder + two AI desks).
- **Team**: `upstream`, your fork `origin`, an open MR, a colleague who has pushed.
- **Conflict ready to resolve**: two lanes changed the same file; the next step is a `git merge` that produces the conflict (to be validated on screen by Marc).
- **From a finished mission**: the final state of any mission already played.
- **Paste a start**: a pasted ` ```git-setup ` block (format in `docs/AUTHORING.md`).

## 3. Acting: three ways, always the same command
Every action, however it is triggered, **displays the equivalent Git command** in the terminal before running it. You learn the command by clicking.

### 3.1 Typing in the terminal
- Prompt: `<active folder> (<branch>) $`. `/` focuses the terminal.
- Autocompletion (Tab): commands, options, branches, files, folders, commit ids. History ↑ ↓.
- `help` or `?`: list of commands; `help <command>`: short card.
- Unknown or misspelled command: human message + suggestion ("Did you mean `git switch`?").

### 3.2 Clicking in the palette
6 groups (Prepare, Lanes, Rewrite, Share, In parallel, Read). A click fills the terminal with a **template** and opens pickers for the arguments (list of branches, modified files, commits, message field). Confirming runs it.

### 3.3 Manipulating the scene directly
| Where | Action | Command shown |
|---|---|---|
| File (zone ④) | click: clean → M → staged → clean; U → A → U | `(you edit the file)`, `git add <f>`, `git commit`/`git restore --staged <f>` as appropriate |
| File, hover | trash icon → status **D** (deleted) | `rm <f>` |
| Folder | click: open / close | — |
| `+` on a tile or a folder | new **U** file | `(new file)` |
| Tile | click: becomes the active desk (100 %, others 60 %) | `cd ../<folder>` |
| Commit (circle) | popover: message, author (human / AI), files, actions "see the diff", "cherry-pick here", "go back here (reset)", "undo this commit (revert)", "open in a new desk" | matching command |
| Branch chip | menu: open here (switch), merge into the current branch, rebase onto…, compare (diff), open in a new desk, delete | matching command |
| MR card (zone ①) | approve, merge, see the diff | "site" action |
| Index chip | remove from the index | `git restore --staged <f>` |
| Stash chip | bring back / delete | `git stash pop` / `git stash drop` |

## 4. Making an AI work (the game's theme)
- On every tile whose branch starts with `ia/`: a **"Make the AI work"** button. The AI modifies 1 to 3 files (M, animation) then makes a commit marked AI. A "without commit" option leaves the files in M (you can then review them with `git diff`). The "what the AI did" text is picked from a small list of generic texts kept in `content/` (never hard-coded), unless a mission provides its own text.
- **"New assistant"** button: picks a topic (`ia/<topic>`), creates the branch and the desk (`git worktree add ../rpt-ia-<topic> -b ia/<topic>`), then makes it work.
- **"The AI opens an MR"** button (if `origin` is visible): pushes the branch and creates an MR.
- AI commits are visible in `log` and `blame` (colour and "AI" label).

## 5. The outside world (zone ①)
- "Show online repositories" toggle (`origin`, `upstream`). Hidden by default in the Empty start.
- **"A colleague pushes"** button: adds a commit to `origin/main` (not fetched yet) — used to trigger a rejected `push` and then a `pull`.
- `fork`: creates `origin` from `upstream`.
- MR: cards on `origin`, statuses open → approved → merged; merge = merge commit on `origin/main`.

## 6. Recognised commands (subset)
| Group | Accepted forms |
|---|---|
| Prepare | `git status`, `git add <f>…`, `git add .`, `git add -A`, `git restore <f>`, `git restore --staged <f>`, `git commit -m "<msg>"`, `git commit -am "<msg>"`, `git commit --amend`, `git stash`, `git stash push`, `git stash list`, `git stash pop`, `git stash apply`, `git stash drop`, `rm <f>` |
| Lanes | `git branch`, `git branch <name> [<start>]`, `git branch -d/-D <name>`, `git switch <name>`, `git switch -c <name>`, `git switch --detach <commit>`, `git checkout <name>` / `git checkout -b <name>` (accepted, with a note: "today we write `git switch`"), `git merge <name>`, `git merge --no-ff <name>`, `git merge --abort`, `git rebase <name>`, `git rebase --continue/--abort` |
| Rewrite | `git rebase -i HEAD~<n>` (opens the interactive editor §7.2), `git cherry-pick <commit>`, `git reset [--soft|--mixed|--hard] <commit|HEAD~n>`, `git revert <commit>` |
| Share | `git fetch [origin]`, `git pull`, `git push`, `git push -u origin <b>`, `git push --force-with-lease` (after rewriting; warning), `fork` (button) |
| In parallel | `git worktree add <path> -b <branch>`, `git worktree add <path> <branch>`, `git worktree list`, `git worktree remove <path>`, `git worktree prune` |
| Read | `git diff`, `git diff --staged`, `git diff <a> <b>`, `git diff <a>...<b>`, `git log`, `git log --oneline`, `git log --graph`, `git blame <f>`, `git show <commit>` |
| Shell | `cd ../<folder>` (changes the active desk), `ls`, `clear`, `help` |

Out of scope (clear message): `git init` (the repository already exists), `git clone` (explained in the Team start), tags, submodules, hooks, config.

## 7. Situations to play
### 7.1 Conflicts
- Simulated rule, fixed (not configurable, no line-level detection): a conflict occurs when both sides changed **the same file** since their common ancestor.
- The file gets the letter **!** (conflict, terracotta red); the scene shows the lane "being merged" as dashed.
- Resolution screen (same layout as the diff):
  - If the mission or puzzle provides a `conflict` block describing both versions (see `docs/AUTHORING.md`), the screen shows two columns "your version" / "theirs" and three buttons **Keep mine / Keep theirs / Keep both**.
  - Otherwise — and **always in the sandbox** — clicking "diff" on the conflicted file shows the message: "This scenario does not detail the content; in a real project Git would show you the conflicting lines." This is a limit of the scenario, not of Git. The three buttons remain available.
  - Then `git add <f>` and `git commit` (or `git rebase --continue`). `git merge --abort` goes back.

### 7.2 Interactive rebase
`git rebase -i HEAD~n` opens a small editor: one row per commit with a `pick / squash / reword / drop` selector and handles to reorder. Confirming replays; circles compress or move (animation).

### 7.3 Played Git errors (with a human explanation)
Branch already open in another desk; rejected `push` (behind); `worktree remove` with changes; `switch` that would overwrite changes; nothing to commit; detached HEAD (warning, HEAD chip on a commit); deleting an unmerged branch (`-d` refuses, `-D` forces); `push --force` on a shared branch (strong warning).

## 8. Understanding
- **What just happened**: 1 to 2 sentences generated by the engine (i18n key `explain.*`), plus a "Why?" link that expands a longer explanation.
- **Beginner / More details** toggle: by default the raw text output of commands is hidden. In More details mode, commit ids and the text output of commands (`status`, `log`, `worktree list`) appear in an inset, mapped to the scene (hovering a line highlights the element).
- **Diff screen**: opened by `git diff…`, by the "diff" link of M files, or from a commit / a chip.
- **Log view**: `git log` opens a chronological list next to the lanes (hover = highlight of the commit).
- **Animations**: short (≤ 600 ms), they describe the movement (the file slides from ④ to ③, a circle appears, lanes join). Reduced under `prefers-reduced-motion`.

## 9. History and undo
- Each successful command creates a **snapshot of the state**; the history timeline lists the commands (icon + short text). Clicking an entry returns to that state; playing a new command cuts off what followed.
- **Undo** (Ctrl/Cmd+Z), **Redo** (Ctrl/Cmd+Shift+Z), **Reset** (back to the chosen start, with confirmation).
- The session is saved automatically in the browser (`localStorage`); "New session" restarts from a start.
- **Copy as start**: produces the equivalent ` ```git-setup ` block (to write a mission or a puzzle), copied to the clipboard.

## 10. Display limits
- Up to **8 branches**, **4 desks** (worktrees) and about **40 commits**; beyond that, a message and an offer to hide some.
- Tiles: 3 per row at 1012 px; with 4 desks, reduced width (≈ 236 px); long names truncated with a tooltip.
- Lanes: horizontal scrolling beyond ~14 commits, auto-follow of the latest commit; "hide merged lanes" option.
- Desks: the wire to the lane follows the rule of `docs/DESIGN.md` §5 (falls back to an elbow if needed, as in A5 when a folder changes branch).

## 11. Sandbox acceptance criteria
1. Every command in §6 works from the terminal, the palette and (when it exists) direct manipulation, and shows the same command.
2. The four zones update on every command; a single `.git`; one index and one stash per desk.
3. "Make the AI work", "New assistant", "A colleague pushes" and the MR work.
4. Conflict → resolution → commit playable end to end (including the "Conflict ready to resolve" start).
5. Undo/Redo/Reset without inconsistency (test: replaying the history gives the same state).
6. "Copy as start" then "Paste a start" gives back the same state.
7. Instant FR/EN, no hard-coded text.
