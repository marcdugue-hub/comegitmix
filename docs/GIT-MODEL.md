# GIT-MODEL — the simulation engine

A **pedagogical** simulation, not Git. Pure module, no DOM: `src/engine/`. Tested with `node --test`.

## 1. Facts to respect (Git truth)
- A repository has **a single `.git`**, shared by all worktrees.
- A **worktree** = an additional working folder with its own HEAD, index and files. It is **not** a copy of the repository. The **clone** is the copy.
- The original folder is the **main worktree** (`.git` is a folder). The others have a `.git` file that points to it.
- A branch can be checked out in **only one** worktree at a time.
- A commit belongs to the repository, not to a worktree. A branch is a pointer to a commit.
- `worktree remove` refuses if the folder has unsaved changes.
- `push` is rejected if the remote branch has moved ahead (you must `pull`/`fetch` + integrate).

## 2. State (serialisable JSON)
```jsonc
{
  "commits": { "c1": { "id": "c1", "parents": [], "msg": "First draft", "author": "human", "files": ["rapport.md"] } },
  "branches": { "main": { "tip": "c1" } },          // name -> { tip }
  "remotes": {                                       // optional, depending on the mode
    "origin":   { "branches": { "main": { "tip": "c1" } }, "forkOf": "upstream" },
    "upstream": { "branches": { "main": { "tip": "c1" } } }
  },
  "worktrees": [
    { "id": "w1", "path": "rpt-client", "main": true,
      "branch": "main", "head": "c1",               // branch null = detached HEAD
      "index": ["chiffres.md"],                      // staged files
      "files": { "chiffres.md": "modified", "notes.md": "clean" } } // clean | modified | new | conflict
  ],
  "active": "w1",
  "stash": [],
  "visibleRepos": ["local"]                          // local | origin | upstream (progressive reveal)
}
```
- `author`: `"human"` or `"ai"` (used to colour / label the AI's commits).
- Hash: short deterministic ids (`c1`, `c2`… or 7 characters derived from a counter) for stable tests.

## 3. API
```js
apply(state, command) -> { state, events, explanation, error }
```
- `state`: new object (immutable, never mutate the input).
- `events`: ordered list for the animation, e.g. `{ type: 'commit.created', id, branch }`, `{ type: 'lane.forked', from, name }`, `{ type: 'worktree.added', path }`.
- `explanation`: **i18n key** + parameters (`{ key: 'explain.worktree.add', params: {...} }`), never text.
- `error`: `{ key: 'error.branchInUse', params }` or `null`. On error, `state` is unchanged.
- `command`: `{ name: 'worktree', args: ['add', '../rpt-ia-stats', '-b', 'ia/chiffres'] }`; a parser `parse("git ...")` produces this object, the interface can also build it from menus.
- `preview(state, command) -> events` to draw the dashed preview without applying.
- `check(state, predicate) -> boolean` for step validation (declarative predicates, see §5).

## 4. Commands and visible effects
| Command | Effect on the state | Visual effect |
|---|---|---|
| `init` | before: `noGit` (setup `@no-git`, every other git command fails with `error.notARepo`); after: a repository, files U, `main` unborn | the "No Git repository yet" card becomes the `.git` card |
| `status` | read | highlights modified / staged files |
| `diff` | read | highlights the changed lines of the file |
| `log` | read | walks the commits of the active desk's lane |
| `blame` | read | colours each line by author (human / AI) |
| `add <f>` | `files[f]` → added to `index` | the file slides from ④ to ③ |
| `commit -m` | new commit, the branch moves ahead, `index` emptied | a circle appears on the lane, tip moves |
| `restore <f>` | file brought back to the last commit's state | the file becomes "clean" again |
| `stash` / `stash pop` | puts aside / brings back the changes | files "stored" in a stack |
| `branch <n>` | new branch on HEAD | new lane, dashed then solid, forks off |
| `switch <n>` | changes the active desk's branch (refused if open elsewhere) | HEAD moves, tile changes colour |
| `merge <n>` | fast-forward if possible, otherwise a 2-parent merge commit | the lanes join |
| `rebase <n>` | replays the commits on the target | circles shift to the end of the other lane |
| `rebase -i HEAD~N` / squash | merges N commits into one | N circles compress into 1 |
| `cherry-pick <c>` | copies a commit onto the current branch | a circle is cloned onto another lane |
| `reset [--soft/--hard]` | moves the branch (and index/files) | the tip moves back; orphan commits fade |
| `revert <c>` | new commit that undoes | "inverse" circle added |
| `fork` | creates `origin` (copy of `upstream`) | `origin` card activates, `fork` arrow |
| `gh repo create <name>` | creates an empty `origin` on GitHub, not linked (`pending`: push/fetch fail with `error.noRemote`) | `origin` card "Created on GitHub, empty" |
| `remote add origin <url>` | links a `pending` origin (refused if nothing was created) | card "Linked, but still empty" |
| `gh repo create --source=. --push` | creates, links and pushes the current branch (`-u`) | `origin/main` chip appears |
| `fetch` | updates `origin/*` without touching local branches | remote chips move ahead |
| `pull` | `fetch` + merge/ff | chips and lane move ahead |
| `push` | moves the remote branch ahead (rejected if behind) | animated arrow local → origin |
| `worktree add <path> [-b <n>]` | new worktree (and branch if `-b`) | new tile in ④, dashed wire to its lane |
| `worktree list` | read | list of folders and their branches |
| `worktree remove <path>` | removes the folder (refused if changes) | tile disappears, the lane stays |

## 5. Scenario predicates (declarative)
Used by step validation in `content/` (the readable phrases are listed in `docs/AUTHORING.md`): `branchExists`, `branchTipIs`, `worktreeExists`, `worktreeOnBranch`, `commitCount`, `fileStatus`, `indexContains`, `remoteTipIs`, `lastCommandWas`, `noOrphan`, `commitMsgMatches`. Each predicate is a named function in `src/engine/predicates.js`; add missing ones as needed.

## 6. Played errors (at least)
- `error.branchInUse` — branch already open in another desk (`switch`, `worktree add`).
- `error.pushRejected` — the remote has moved ahead.
- `error.worktreeDirty` — `worktree remove` with changes.
- `error.nothingToCommit`, `error.unknownCommand`, `error.mergeConflict`.

### 6.1 Conflicts
Rule (fixed, not configurable): a merge, rebase, cherry-pick, `pull` or `stash pop` produces a conflict when **the same file was changed on both sides** since the common ancestor. There is no line-level detection. The file's status becomes `conflict` (letter **!**) and the operation stays "in progress" until resolution (`add` + `commit`, `rebase --continue`) or `--abort`.
- If the scenario provides a `conflict` block for that file (both versions, see `docs/AUTHORING.md`), the engine keeps both contents so the diff screen can show them and resolve them (keep one, the other, or both).
- Otherwise the file has no detailed content; `diff` returns the entry with `rows: []` and `conflictUndetailed: true` so the screen shows the "scenario does not detail the content" message. The sandbox is always in this case.

## 7. Tests (`tests/unit/engine.test.js`)
At least one test per command, plus: a single `.git` (the model has only one set of commits), one branch = one desk, `apply` does not alter its input, JSON round-trip serialisation, squash of 3 commits → 1 commit, the errors above, the conflict rule (same file both sides → conflict; different files → no conflict).

## 8. Files: statuses, tree, content (added after mockups A1 to A4)
This section **replaces** the `files: { "chiffres.md": "modified" }` shape of §2.

```jsonc
"files": [
  { "path": "chapitres",        "kind": "dir" },
  { "path": "chapitres/ch1.md", "kind": "file", "status": "clean", "staged": false },
  { "path": "plan.md",          "kind": "file", "status": "M",     "staged": false,
    "base": "…content at last commit…", "work": "…content in the folder…", "index": null },
  { "path": "nouveau-1.md",     "kind": "file", "status": "U",     "staged": false }
]
```
- `status`: `clean` | `M` (modified) | `U` (new, untracked) | `D` (deleted, planned) | `conflict`. A staged file has `staged: true`; the display shows the letter **A** if `status = U`, otherwise **M**.
- `base` / `index` / `work`: the three versions of the content (last commit, index, folder). **The diff is computed from them** (see below). Scenarios may provide exact contents (`@content`); otherwise contents come from the file content library `content/files.<lang>.md` (`src/engine/library.js`, set by the UI for the current language; edits replace prose lines in order, replace or append table/CSV rows by key, then write a numbered fallback line so two edits never collide), and, for a file without entry or without a library, from a stable generic generator (one line changed on each "work"). See [ADR 0013](adr/0013-init-github-and-file-contents.md).
- Each desk has **its own** `files` and `index`: a desk's commit only includes its own index.

### New simulation commands (not real Git commands)
| Engine command | Effect |
|---|---|
| `touch <worktree> <path>` | simulates "I worked on this file": `clean → M` (generates `work` ≠ `base`) |
| `create <worktree> <folder-path?>` | creates `nouveau-N.md` with `status: U` (in the given folder or at the root) |
| `add <path>` | `staged: true` (the file enters the active desk's index); `restore --staged` removes it |
| `commit` | staged files become `clean`, `base` = `index` |
These actions match the file-tree clicks (cycle: `touch` → `add` → `commit`/`restore`).

### Diff
`diff(state, { mode, worktreeId, a?, b? }) -> { from, to, files: [{ path, letter, staged, rows[], adds, dels }] }`
- `mode: "branches"`: `git diff <a> <b>` (contents from `a` to `b`, new files as **A**).
- `mode: "work"`: `git diff` (index → folder). **U files are not part of it**: the diff still returns the entry with `rows: []` and `untracked: true` so the screen can explain why.
- `mode: "staged"`: `git diff --staged` (last commit → index).
- `rows[]`: `{ lk, rk, ln, rn, lt, rt }` with `lk/rk ∈ ctx|del|add|empty|fold` (see `data/diff-examples.json`). A line diff algorithm (LCS) is enough; fold beyond 3 lines of context (`fold`).
- Extra predicates for scenarios: `fileStatus`, `hasStaged`, `diffShown(mode)`.

## 9. Merge requests (MR / PR) — mission 6
```jsonc
"remotes": { "origin": { "branches": { "main": {"tip":"c3"}, "ia/graphiques": {"tip":"c6"} },
  "mrs": [ { "id": 42, "title": "mr.42.title", "source": "ia/graphiques", "target": "main", "status": "open", "comments": 2 } ] } }
```
- `status`: `open` → `approved` → `merged` (or `closed`).
- "Site" actions (not Git commands): `approve MR !<id>`, `merge MR !<id>`. Merging creates a merge commit on the target **on origin**; local branches do not move before `fetch`/`pull`.
- `fetch`: copies the remote branches as `origin/<name>` (dashed chips), without touching local branches or folders.
- `switch <b>` when `<b>` only exists as `origin/<b>`: creates the local branch that tracks it (Git's behaviour).
- `worktree add <path> <existing-branch>` (without `-b`): opens an existing branch in a new folder; refused with `error.branchInUse` if it is already open elsewhere.
- `diff A...B` (three dots): changes in B since the common ancestor with A — this is what an MR shows. `diff A..B` / `diff A B`: direct difference.
- `stash` / `stash pop`: per desk; `switch` is refused if M files would conflict (option: play this error to motivate the stash).
- `pull` with M files unrelated to the merged files: allowed, the M files stay.
- Added predicates: `mrStatus`, `remoteBranchFetched`, `stashCount`, `worktreeRemoved`, `workIntact(worktree)`.
