# src/engine — the pedagogical Git simulation

Pure ES modules: no DOM, no language, no randomness, no clock. Same commands in → same state out.
Rules of the simulation: `docs/GIT-MODEL.md`; conflicts: `docs/adr/0005-file-level-conflicts.md`.

| File | Role |
|---|---|
| `state.js` | state shape, creation, clone/serialise, history helpers (`ancestors`, `mergeBase`, `resolveRev`…), file model, limits |
| `parse.js` | `"git …"` text → command object; suggestions for misspelled commands |
| `apply.js` | `apply`, `applyAll`, `preview`, command registry (`registerCommand`) |
| `commands/*.js` | one handler per command; `commands/index.js` lists them; `commands/_shared.js` holds reusable building blocks |
| `diff.js` | line diff (LCS) and the diff screen modes |
| `conflicts.js` | three-way merge of trees, conflict marking, resolution |
| `remote.js`, `ai.js`, `setup.js`, `predicates.js`, `equivalence.js`, `to-setup.js` | added by other modules on top of this core (see "Extending") |

## 1. State shape

Plain JSON (round-trips through `JSON.stringify`). Never mutate a state you did not create: `apply` returns a new one.

```jsonc
{
  "version": 1,
  "seq": { "commit": 5, "desk": 2, "stash": 1, "edit": 7 },  // counters for deterministic ids / generated content
  "author": "human",                       // author of the next commits ("human" | "ai"); setup's @author sets it
  "commits": {                             // THE single .git: every commit of the repository, shared by all desks
    "c3": {
      "id": "c3",
      "parents": ["c2"],                   // 0 (root), 1, or 2 (merge: [ours, theirs])
      "msg": "plan",                       // free text typed by the player/author ("" when msgKey is used)
      "msgKey": null, "msgParams": null,   // engine-generated message: i18n key, e.g. "msg.merge" {name, into}, "msg.revert" {msg, msgKey, id}
      "author": "human",                   // "human" | "ai"
      "files": ["plan.md"],                // paths changed compared with the first parent
      "tree": { "plan.md": "…", "chapitres/ch1.md": "…" }   // full snapshot: path -> content
    }
  },
  "branches": { "main": { "tip": "c3", "upstream": null } },   // local lanes; upstream e.g. "origin/main"
  "remoteRefs": { "origin/main": { "tip": "c3" } },  // fetched remote branches (dashed chips). Filled by remote.js
  "remotes": {},                           // online repositories (origin, upstream, MRs…). Owned by remote.js, see GIT-MODEL §2/§9
  "worktrees": [                           // desks, in display order; worktrees[0] is the original folder
    {
      "id": "w1",                          // stable id (w1, w2…), never reused while alive
      "path": "rapport-client",            // folder name (no "../")
      "main": true,                        // original folder: holds .git (the others point to it)
      "branch": "main",                    // null = detached HEAD
      "head": "c3",                        // null = no commit yet (unborn branch)
      "files": [ /* tree entries, see below */ ],
      "stash": [ /* entries, last = top, see below */ ],
      "op": null,                          // operation in progress, see below
      "resolutions": [ { "path": "plan.md", "side": "theirs", "sideLabel": "ia/resume", "oursLabel": "main", "theirsLabel": "ia/resume" } ]
    }
  ],
  "active": "w1",                          // active desk (100 % opacity); typed commands act on it
  "visibleRepos": ["local"],               // progressive reveal: local | origin | upstream
  "conflictBlocks": [ { "path": "plan.md", "first": "main", "second": "ia/resume", "firstText": "…", "secondText": "…" } ],
  "rebasePlan": null                       // ["pick","squash",…] from @rebase-plan, consumed by the next `rebase -i`
}
```

Invariants: one set of `commits` for the whole repository (no desk holds commits); a branch name appears as `branch` of at most one desk; when a desk is attached and no rebase is running, `branches[desk.branch].tip === desk.head`.

### Tree entries (`desk.files`, GIT-MODEL §8)
Sorted by path segments; folders are rebuilt automatically from file paths.
```jsonc
{ "path": "chapitres", "kind": "dir", "dirty": true }          // dirty = contains a changed file (coloured dot)
{ "path": "plan.md", "kind": "file",
  "status": "M",          // clean | M | U | D | conflict   (derived, do not set by hand)
  "staged": true,         // in the desk index (derived). Display: U+staged -> letter A; otherwise M in blue
  "base": "…",            // content at the desk's last commit (null = not in the commit)
  "index": "…",           // content in the desk index (null = not in the index)
  "work": "…",            // content in the folder (null = deleted)
  "conflict": null }      // or { oursLabel, theirsLabel, ours, theirs, detailed, resolved: null|'ours'|'theirs'|'both', added }
```
Derivation (`refreshFile`): unresolved conflict → `conflict`; `base === null` → `U` (staged when `index !== null`); `work === null` → `D`; otherwise `M` when `work` or `index` differs from `base`, else `clean`; `staged = index !== base`. A resolved but not yet added conflict shows `M`.
The **index of a desk** is `stagedPaths(desk)` (files with `staged: true`); each desk has its own.
Generated content is language-neutral (`# plan.md`, `plan.md · 1`…); each `touch` changes one line (`· r<n>`).

### Stash entries (per desk)
`{ id: "s1", branch, head, msg, files: [{ path, base, index, work }] }` — `desk.stash[desk.stash.length - 1]` is `stash@{0}`.

### Operations in progress (`desk.op`)
- merge: `{ type: 'merge', theirs, theirsLabel, oursLabel, origHead }`
- cherry-pick / revert: `{ type, source, theirsLabel, oursLabel, origHead }`
- rebase: `{ type: 'rebase', branch, origHead, onto, ontoLabel, oursLabel, theirsLabel, interactive, old: [ids], remaining: [steps], replayed: [ids], current, squashed, dropped }`
Labels: `oursLabel` is the receiving lane (first side of a `conflict` block), `theirsLabel` the incoming one. For a rebase, the receiving lane is the target (`git rebase main` → ours = `main`).

## 2. API

```js
import { apply, applyAll, preview, registerCommand } from './apply.js';
import { parse, parseLine } from './parse.js';
import { createState } from './state.js';
import { diff, lineDiff } from './diff.js';
```

### `apply(state, command, opts?) → result`
- `command`: text (`'git commit -m "x"'`, parsed with `parse`) or object `{ name, args: [], options: {}, desk? }`.
  `desk` (id or folder name) runs the command on that desk without activating it (scene clicks on another tile); otherwise the active desk.
- `opts.lenient` (setup mode): `commit` with nothing staged saves the whole folder (including U files) and allows empty commits.
- `opts.author`: author for created commits (`'human' | 'ai'`), else `state.author`.
- `result`:
  ```js
  {
    state,         // new state; the SAME object as the input for read-only commands and on error
    events,        // ordered animation events (§4)
    explanation,   // { key: 'explain.…', params } or null
    error,         // { key: 'error.…', params } or null. On error, state === input
    warning,       // { key, params } or null: a played situation that is not a failure (conflict: key 'error.mergeConflict'; detached HEAD; checkout note)
    output,        // structured data for read commands: { kind: 'status'|'log'|'diff'|'worktrees'|'branches'|'stash'|'blame'|'show'|'ls'|'help'|'created', … }
    equivalent,    // scene actions: { command: 'git add plan.md' } or { key: 'equiv.edit', params } — what the terminal shows
    explanations   // only for sequences ('a && b'): one per step
  }
  ```
- A conflict is **not** an error: the state changes (files become `conflict`, `desk.op` is set) and `warning.key === 'error.mergeConflict'`. Predicates such as `error conflict` should test `error?.key ?? warning?.key`.
- Limits (`LIMITS` in state.js: 8 branches, 4 desks, 40 visible commits): checked after every command; exceeding gives `error.limitBranches|limitDesks|limitCommits` with `{ max }`.

### Others
- `applyAll(state, commands, opts) → { state, results, error, index }` stops at the first error.
- `preview(state, command) → events` (nothing applied).
- `parse(text) → { name, args, options, git, raw, text }` or `{ error }`. `a && b` → `{ name: 'sequence', commands }` (applied atomically). Options: `-m "x"` → `{ m: 'x' }`, `-am` → `{ a: true, m }`, `-b/-B/-c/-C/-n` take a value, `--cached` → `staged`, `--x=y` → `{ x: 'y' }`, everything after `--` is an argument (`options['--'] = true`). Unknown commands → `error.unknownCommand(.suggest)` with `{ input, suggestion }`; out-of-scope (`init`, `clone`, `tag`…) → `error.outOfScope.<name>`.
- `diff(state, { mode, worktreeId?, a?, b?, threeDot?, paths? })` → `{ mode, from, to, threeDot, files: [{ path, letter, staged, rows, adds, dels, untracked?, conflict?, conflictUndetailed?, ours?, theirs? }] }` or `{ error }`.
  `mode`: `work` (index → folder; U files listed with `untracked: true`, `rows: []`), `staged` (last commit → index), `branches` (`a` → `b`; `threeDot` = from the merge base; no `b` = the folder), `conflict` (only conflicted files). Rows: `{ lk, rk, ln, rn, lt, rt }`, `lk/rk ∈ ctx|del|add|empty|fold`; a fold row is `{ lk: 'fold', rk: 'fold', n }` (3 lines of context, folds of 2+ lines). Conflict entries: letter `!`; with a matching `conflictBlocks` entry the rows compare the two versions, otherwise `rows: []` and `conflictUndetailed: true`.
- state.js helpers: `createState({ folder, branch, author, visibleRepos })`, `clone`, `serialize/deserialize`, `getDesk(state, idOrPath)`, `activeDesk`, `resolveRev(state, desk, 'HEAD~2' | 'main' | 'origin/main' | 'c4')`, `ancestors`, `isAncestor`, `mergeBase`, `commitsBetween(state, from, to)`, `reachableCommits`, `findFile`, `setFile`, `setDeskTree(desk, tree, 'hard'|'mixed'|'soft'|'carry')`, `stagedPaths`, `deskTree(desk, 'base'|'index'|'work')`, `initialContent`, `editedContent`.

## 3. Commands

Git (typed or from the palette): `status`, `add <f…>|.|-A`, `commit -m|-am|--amend|--allow-empty`, `restore [--staged] [--worktree] <f>` (`--ours/--theirs` resolves), `rm <f>` / `git rm <f>`, `stash [push|pop|apply|drop|list] [stash@{n}]`, `branch [<n> [<start>]] | -d/-D <n>`, `switch <b> | -c <b> [<start>] | --detach <rev>` (a branch known only as `origin/<b>` becomes a tracking branch), `checkout` (same, plus `-b`, `-- <f>`, `--ours/--theirs`; warning `warn.checkoutLegacy`), `merge <rev> [--no-ff] | --abort | --continue`, `rebase <rev> | -i <base> | --continue | --abort`, `cherry-pick <rev> | --continue | --abort`, `revert <rev> | --continue | --abort`, `reset [--soft|--mixed|--hard] [<rev>]` / `reset <f>`, `worktree add <path> [-b <n>] [<branch|rev>] | list | remove [--force] <path> | prune`, `diff [--staged] [<a> [<b>]] [<a>..<b>] [<a>...<b>] [<f>]`, `log [<rev>]`, `blame <f>`, `show [<rev>]`.

Interactive rebase plan: `options.plan` = `[{ id, action, msg? }]` (any order = new order; actions `pick|reword|squash|fixup|drop`) or `['pick','squash',…]` (oldest first); else `state.rebasePlan`; else pick the first and squash the rest.

`worktree add` makes the new folder the **active desk** (game convention, mission 6 B2). Without `-b` and without a branch, the branch is named after the folder (as Git does).

Scene and shell actions (objects; not real Git):
| Command | Effect | `equivalent` |
|---|---|---|
| `{ name: 'touch', args: [path] \| [desk, path], options: { content? } }` | "I worked on it": new content (generated, or exact `content`); missing file + `content` → new U file | `equiv.edit` |
| `{ name: 'create', args: [] \| [folder] \| [desk, folder], options: { path?, prefix?, content?, status? } }` | new `nouveau-N.md` (U); `status: 'clean'` creates a tracked unchanged file (setup `@files`); `output.path` gives the path | `equiv.newFile` |
| `{ name: 'click', args: [path] \| [desk, path] }` | click cycle: clean → M → staged → clean; U → A → U | `equiv.edit`, `git add f`, `git restore --staged --worktree f`, `git restore --staged f` |
| `{ name: 'resolve', args: [path, side] \| [desk, path, side] }` | side `ours`/`theirs`/`both` or a branch name: the file becomes M (then `git add` + `git commit` / `rebase --continue`) | `git checkout --ours f` / `equiv.edit` |
| `cd <folder>` | changes the active desk | — |
| `ls`, `help`, `clear` | read only (`ui` event for help/clear) | — |

`fetch`, `pull`, `push`, `remote`, `fork` are parsed but answer `error.notAvailable` until `remote.js` registers them.

## 4. Events (for animations)
Explicit (emitted by handlers): `commit.created {id, branch, desk, parents, author}`, `lane.forked {name, at, from}`, `branch.moved {name, from, to, reason: commit|reset|fast-forward|rebase|abort|move}`, `branch.deleted {name, tip}`, `head.moved {desk, from, to, branch}`, `desk.switched {desk, from:{branch,head}, to:{branch,head}}`, `merge.fastForward {desk, into, name, from, to}`, `lanes.joined {from, into, commit}`, `conflict {desk, op, files}`, `conflict.resolved {desk, path, side, label}`, `op.started {desk, op}`, `op.finished {desk, op, commit}`, `op.aborted {desk, op}`, `rebase.done {desk, branch, from:[old ids], to:[new ids], onto, squashed, dropped}`, `commit.copied {source, id, branch}`, `commit.reverted {source, id, branch}`, `stash.pushed|stash.popped|stash.applied {desk, id, paths}`, `stash.dropped {desk, id}`, `worktree.added {id, path, branch, head}`, `worktree.removed {id, path, branch}`, `worktree.listed`, `desk.activated {id, from}`, `status.shown`, `diff.shown {desk, mode, threeDot, files}`, `log.shown {desk, ids}`, `blame.shown`, `commit.shown`, `ui {action}`.
Automatic (computed by `apply` from before/after): `file.created {desk, path, status, staged}`, `file.removed {desk, path}`, `file.status {desk, path, from, to, stagedFrom, staged}`, `index.added {desk, path}` (slide ④ → ③), `index.removed {desk, path}`, `commits.orphaned {ids}` (fade), `commits.restored {ids}`, `desk.activated` (if not already emitted).

## 5. Extending: add a command
1. Create `src/engine/commands/<name>.js` exporting `{ name, aliases?, readOnly?, run(ctx) }` (or put several handlers in a module such as `remote.js`).
2. Add it to the array in `commands/index.js`, or call `registerCommand(handler)` from your module (imported once before use).
3. If it is a Git subcommand unknown to the parser, call `addKnownCommand(name)` from `parse.js` (fetch/pull/push/remote are already known; `fork` is a shell word).
4. Add its `explain.*` / `error.*` keys to both `src/i18n/en.json` and `fr.json`.

`run(ctx)` works on a **draft** (a deep copy): mutate `ctx.state` / `ctx.desk` freely; throw with `ctx.fail(key, params)` (the draft is discarded). `ctx` offers: `state`, `desk`, `args`, `options`, `command`, `opts`, `emit(type, data)`, `explain(key, params)`, `warn(key, params)`, `output(data)`, `equivalent(value)`, `markReadOnly()`, `run(name, args, options, { desk })` (run another command on the same draft). After `run`, statuses and folders are refreshed, limits checked and automatic events added.
Reusable blocks in `commands/_shared.js`: `createCommit(ctx, desk, { tree, parents, msg, msgKey, msgParams, author })`, `moveHead`, `checkoutCommit`, `createBranch`, `validateNewBranch`, `requireBranchFree`, `mergeInto` (three-way into a desk, marks conflicts), `conflictWarning`, `abortOp`, `rev`, `nextCommitId` (unique across `state.commits` and `state.remotes[*].commits`).
