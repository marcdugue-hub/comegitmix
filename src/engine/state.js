// Pure state model of the pedagogical Git simulation.
// No DOM, no language, no randomness, no clock: the same commands always give the same state.
// The shape is documented in src/engine/README.md.

import { libraryInitial, libraryEdit } from './library.js';

export const STATE_VERSION = 1;

/** Display limits (docs/SANDBOX.md §10). */
export const LIMITS = Object.freeze({ branches: 8, desks: 4, commits: 40 });

/** Error thrown inside command handlers; apply() turns it into `{ error: { key, params } }`. */
export class EngineError extends Error {
  constructor(key, params = {}) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

export function fail(key, params = {}) {
  throw new EngineError(key, params);
}

// ---------------------------------------------------------------------------
// Creation, cloning, serialisation
// ---------------------------------------------------------------------------

/**
 * A fresh repository: one main desk (the original folder, holding `.git`),
 * on an unborn branch (no commit yet), with no file.
 */
export function createState({ folder = 'rpt-client', branch = 'main', author = 'human', visibleRepos = ['local'] } = {}) {
  return {
    version: STATE_VERSION,
    seq: { commit: 0, desk: 1, stash: 0, edit: 0 },
    author,
    commits: {},
    branches: {},
    remoteRefs: {},
    remotes: {},
    worktrees: [makeDesk('w1', folderName(folder), true, branch, null)],
    active: 'w1',
    visibleRepos: [...visibleRepos],
    stash: [], // one stash per repository, shared by every desk (it lives in .git), newest last
    conflictBlocks: [],
    rebasePlan: null,
  };
}

export function makeDesk(id, path, main, branch, head) {
  return { id, path, main, branch, head, files: [], op: null, resolutions: [] };
}

/** Deep copy (the state is plain JSON). */
export function clone(value) {
  return structuredClone(value);
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Names and desks
// ---------------------------------------------------------------------------

/** "../rpt-ia-resume/" -> "rpt-ia-resume". */
export function folderName(p) {
  const parts = String(p).replace(/\\/g, '/').split('/').filter((s) => s && s !== '.' && s !== '..');
  return parts.length ? parts[parts.length - 1] : String(p);
}

export function basename(p) {
  const parts = String(p).split('/');
  return parts[parts.length - 1];
}

export function getDesk(state, ref) {
  if (ref == null) return activeDesk(state);
  const byId = state.worktrees.find((w) => w.id === ref);
  if (byId) return byId;
  const name = folderName(ref);
  return state.worktrees.find((w) => w.path === name) || null;
}

export function activeDesk(state) {
  return state.worktrees.find((w) => w.id === state.active) || state.worktrees[0];
}

export function deskOnBranch(state, name) {
  return state.worktrees.find((w) => w.branch === name) || null;
}

const BRANCH_NAME = /^(?!\/)(?!.*\/\/)(?!.*\.\.)(?!.*\/$)(?!.*\.lock$)(?!-)[A-Za-z0-9._\/-]+$/;

export function isValidBranchName(name) {
  return typeof name === 'string' && BRANCH_NAME.test(name) && name !== 'HEAD' && !name.startsWith('origin/') && !name.startsWith('upstream/');
}

// ---------------------------------------------------------------------------
// Commits and history
// ---------------------------------------------------------------------------

export function commitTree(state, id) {
  return id ? state.commits[id].tree : {};
}

export function commitNumber(id) {
  const n = parseInt(String(id).replace(/^\D+/, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function byCommitOrder(a, b) {
  return commitNumber(a) - commitNumber(b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Set of ids reachable from `id` (including it). */
export function ancestors(state, id) {
  const seen = new Set();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c) || !state.commits[c]) continue;
    seen.add(c);
    for (const p of state.commits[c].parents) stack.push(p);
  }
  return seen;
}

/** True when `a` is `b` or one of its ancestors. */
export function isAncestor(state, a, b) {
  if (!a) return true;
  return ancestors(state, b).has(a);
}

/** Best common ancestor of a and b (deterministic), or null. */
export function mergeBase(state, a, b) {
  if (!a || !b) return null;
  const A = ancestors(state, a);
  const common = [...ancestors(state, b)].filter((c) => A.has(c));
  const best = common.filter((c) => !common.some((o) => o !== c && ancestors(state, o).has(c)));
  best.sort(byCommitOrder);
  return best.length ? best[best.length - 1] : null;
}

/** Commits reachable from `to` but not from `from`, oldest first, merge commits included. */
export function commitsBetween(state, from, to) {
  const exclude = ancestors(state, from);
  return [...ancestors(state, to)].filter((c) => !exclude.has(c)).sort(byCommitOrder);
}

/** First-parent chain from `id`, newest first. */
export function firstParentChain(state, id) {
  const out = [];
  let c = id;
  while (c && state.commits[c]) {
    out.push(c);
    c = state.commits[c].parents[0] || null;
  }
  return out;
}

/** Every commit still visible: reachable from a branch, a desk HEAD, a remote ref, a stash or an operation. */
export function reachableCommits(state) {
  const roots = [];
  for (const b of Object.values(state.branches)) roots.push(b.tip);
  for (const r of Object.values(state.remoteRefs || {})) roots.push(r.tip);
  for (const s of state.stash || []) roots.push(s.head);
  for (const w of state.worktrees) {
    roots.push(w.head);
    if (w.op) roots.push(w.op.origHead, w.op.theirs);
  }
  const seen = new Set();
  for (const r of roots) if (r) for (const c of ancestors(state, r)) seen.add(c);
  return seen;
}

/**
 * Resolves a revision as typed by the player:
 * HEAD, HEAD~2, HEAD^, main, ia/essai~1, origin/main, c4.
 * Returns { id, branch, remote, label } or null.
 */
export function resolveRev(state, desk, rev) {
  if (typeof rev !== 'string' || !rev) return null;
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(rev.trim());
  const name = m[1];
  const suffix = m[2];
  let id = null;
  let branch = null;
  let remote = null;
  if (name === 'HEAD' || name === '@') {
    id = desk ? desk.head : null;
  } else if (state.branches[name]) {
    id = state.branches[name].tip;
    branch = name;
  } else if (state.remoteRefs && state.remoteRefs[name]) {
    id = state.remoteRefs[name].tip;
    remote = name;
  } else if (state.commits[name]) {
    id = name;
  } else {
    return null;
  }
  if (!id) return null;
  const re = /([~^])(\d*)/g;
  let s;
  while ((s = re.exec(suffix))) {
    const n = s[2] === '' ? 1 : parseInt(s[2], 10);
    if (s[1] === '~') {
      for (let i = 0; i < n; i += 1) {
        id = state.commits[id] && state.commits[id].parents[0];
        if (!id) return null;
      }
    } else {
      if (n === 0) continue;
      id = state.commits[id] && state.commits[id].parents[n - 1];
      if (!id) return null;
    }
  }
  const exact = suffix === '';
  return { id, branch: exact ? branch : null, remote: exact ? remote : null, label: rev.trim() };
}

/** The name shown for a desk's position: its branch, or the short commit id when detached. */
export function deskLabel(desk) {
  return desk.branch || desk.head || 'HEAD';
}

// ---------------------------------------------------------------------------
// Generated file content (deterministic): the content library when one is set (library.js), else generic lines
// ---------------------------------------------------------------------------

export function initialContent(path) {
  const fromLibrary = libraryInitial(path);
  if (fromLibrary !== null) return fromLibrary;
  const name = basename(path);
  const lines = [`# ${name}`, ''];
  for (let i = 1; i <= 6; i += 1) lines.push(`${name} · ${i}`);
  return lines.join('\n');
}

/** Changes one line of `content`; `rev` makes each edit unique. */
export function editedContent(content, rev, path) {
  const fromLibrary = libraryEdit(content, rev, path);
  if (fromLibrary !== null) return fromLibrary;
  const name = basename(path);
  const lines = (content == null || content === '' ? initialContent(path) : content).split('\n');
  const slots = Math.max(1, lines.length - 2);
  const slot = 2 + ((rev - 1) % slots);
  const line = `${name} · ${slot - 1} · r${rev}`;
  if (slot < lines.length) lines[slot] = line;
  else lines.push(line);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Files of a desk (docs/GIT-MODEL.md §8)
// ---------------------------------------------------------------------------

export function findFile(desk, path) {
  return desk.files.find((f) => f.kind === 'file' && f.path === path) || null;
}

export function deskFiles(desk) {
  return desk.files.filter((f) => f.kind === 'file');
}

/** Recomputes `status` and `staged` from the three contents (and the conflict marker). */
export function refreshFile(f) {
  const { base, index, work } = f;
  if (f.conflict && !f.conflict.resolved) {
    f.status = 'conflict';
    f.staged = false;
    return f;
  }
  if (base === null) {
    f.status = 'U';
    f.staged = index !== null;
  } else if (work === null) {
    f.status = 'D';
    f.staged = index !== base;
  } else {
    f.staged = index !== base;
    f.status = work !== base || index !== base ? 'M' : 'clean';
  }
  if (f.conflict && f.conflict.resolved && !f.conflict.added && f.status === 'clean') f.status = 'M';
  return f;
}

/** Creates or updates a file entry. Missing keys keep their current value. */
export function setFile(desk, path, contents) {
  let f = findFile(desk, path);
  if (!f) {
    f = { path, kind: 'file', status: 'clean', staged: false, base: null, index: null, work: null, conflict: null };
    desk.files.push(f);
  }
  for (const k of ['base', 'index', 'work']) if (k in contents) f[k] = contents[k] === undefined ? null : contents[k];
  if ('conflict' in contents) f.conflict = contents.conflict;
  refreshFile(f);
  return f;
}

export function removeFile(desk, path) {
  desk.files = desk.files.filter((f) => !(f.kind === 'file' && f.path === path));
}

function comparePaths(a, b) {
  const A = a.split('/');
  const B = b.split('/');
  for (let i = 0; i < Math.min(A.length, B.length); i += 1) {
    if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1;
  }
  return A.length - B.length;
}

/** Drops empty entries, refreshes statuses, rebuilds folder entries and sorts the tree. */
export function refreshDesk(desk) {
  const files = desk.files.filter((f) => f.kind === 'file' && !(f.base === null && f.index === null && f.work === null && !f.conflict));
  for (const f of files) refreshFile(f);
  const dirs = new Map();
  for (const f of files) {
    const parts = f.path.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      const d = parts.slice(0, i).join('/');
      const dirty = dirs.get(d) || false;
      dirs.set(d, dirty || f.status !== 'clean');
    }
  }
  const dirEntries = [...dirs.entries()].map(([path, dirty]) => ({ path, kind: 'dir', dirty }));
  desk.files = [...dirEntries, ...files].sort((a, b) => comparePaths(a.path, b.path));
  return desk;
}

/** Content map of the desk: 'base' (last commit), 'index' or 'work' (folder). */
export function deskTree(desk, which) {
  const out = {};
  for (const f of deskFiles(desk)) if (f[which] !== null) out[f.path] = f[which];
  return out;
}

export function stagedPaths(desk) {
  return deskFiles(desk).filter((f) => f.staged).map((f) => f.path);
}

export function dirtyFiles(desk) {
  return deskFiles(desk).filter((f) => f.status !== 'clean');
}

/** Files with tracked changes (anything but clean and untracked U). */
export function trackedChanges(desk) {
  return deskFiles(desk).filter((f) => f.status !== 'clean' && !(f.status === 'U' && !f.staged));
}

export function unresolvedConflicts(desk) {
  return deskFiles(desk).filter((f) => f.status === 'conflict');
}

/**
 * Sets the desk on `tree` as its last commit.
 * mode 'hard': folder and index match the tree (untracked U files are kept).
 * mode 'mixed': index matches the tree, folder kept.
 * mode 'soft': only the base changes.
 * mode 'carry': like a switch: clean files follow the tree, changed files are carried along.
 */
export function setDeskTree(desk, tree, mode) {
  const paths = new Set([...deskFiles(desk).map((f) => f.path), ...Object.keys(tree)]);
  for (const p of paths) {
    const f = findFile(desk, p);
    const t = p in tree ? tree[p] : null;
    if (!f) {
      setFile(desk, p, { base: t, index: t, work: t });
      continue;
    }
    const untracked = f.base === null && f.index === null;
    if (mode === 'hard') {
      if (untracked && t === null) continue;
      setFile(desk, p, { base: t, index: t, work: t, conflict: null });
    } else if (mode === 'mixed') {
      setFile(desk, p, { base: t, index: t, conflict: null });
    } else if (mode === 'soft') {
      setFile(desk, p, { base: t });
    } else {
      if (f.status === 'clean') setFile(desk, p, { base: t, index: t, work: t });
      else if (untracked) continue;
      else setFile(desk, p, { base: t, index: f.staged ? f.index : t });
    }
  }
  refreshDesk(desk);
}

/** Normalises every desk (statuses, folders, order). */
export function refreshState(state) {
  for (const w of state.worktrees) refreshDesk(w);
  return state;
}

/** Number of commits shown on the lanes. */
export function visibleCommitCount(state) {
  return reachableCommits(state).size;
}
