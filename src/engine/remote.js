// Online repositories (origin, upstream), remote-tracking refs and merge requests (docs/GIT-MODEL.md §2, §9).
// Pure helpers working on a draft state; the command handlers live in commands/{fetch,pull,push,remote,fork,mr,colleague,publish}.js.
//
// Shape (state.remotes[name]):
//   { name, commits: { id: commit },            // full copy of the online repository ("the clone is the copy")
//     branches: { main: { tip } },
//     forkOf: 'upstream' | null,
//     mrs: [ { id, title, titleKey, titleParams, source, target, status: open|approved|merged|closed, comments, commit } ] }
// Local view of a remote: state.remoteRefs['origin/main'] = { tip } (dashed chips), updated by fetch / push / pull.

import { EngineError, ancestors, editedContent, initialContent, commitNumber, byCommitOrder, deskFiles } from './state.js';
import { threeWay, changedPaths } from './conflicts.js';
import { nextCommitId } from './commands/_shared.js';

export const REMOTE_NAMES = ['origin', 'upstream'];

function fail(key, params = {}) {
  throw new EngineError(key, params);
}

export function makeRemote(name, forkOf = null) {
  return { name, commits: {}, branches: {}, forkOf, mrs: [] };
}

export function getRemote(state, name, { required = true } = {}) {
  const r = (state.remotes || {})[name] || null;
  if (!r && required) fail('error.noRemote', { name });
  return r;
}

/** Ids reachable from `id` inside a commit map. */
export function ancestorsIn(commits, id) {
  const seen = new Set();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c) || !commits[c]) continue;
    seen.add(c);
    for (const p of commits[c].parents) stack.push(p);
  }
  return seen;
}

/** Copies every commit reachable from `tip` from one map into another. Returns the copied ids. */
export function copyCommits(from, to, tip) {
  const copied = [];
  for (const id of ancestorsIn(from, tip)) {
    if (!to[id]) {
      to[id] = structuredClone(from[id]);
      copied.push(id);
    }
  }
  return copied.sort(byCommitOrder);
}

/** Pushes a local branch to a remote as-is (no checks). Used by setup and by push. */
export function publishBranch(state, remoteName, branch) {
  const remote = state.remotes[remoteName];
  const tip = state.branches[branch].tip;
  copyCommits(state.commits, remote.commits, tip);
  remote.branches[branch] = { tip };
  if (remoteName === 'origin') {
    state.remoteRefs[`origin/${branch}`] = { tip };
    if (!state.branches[branch].upstream) state.branches[branch].upstream = `origin/${branch}`;
  }
}

/**
 * Setup `@remote <name>`: creates (or updates) the online repository with the current state of every local branch.
 * For origin, the remote-tracking refs (origin/<b>) and upstreams are set, as after a push.
 */
export function publishAll(state, name) {
  if (!REMOTE_NAMES.includes(name)) fail('error.unknownRemote', { name });
  if (!state.remotes[name]) state.remotes[name] = makeRemote(name);
  for (const b of Object.keys(state.branches).sort()) publishBranch(state, name, b);
  return state.remotes[name];
}

/** `fork`: origin becomes a copy of upstream; the local repository now knows origin. */
export function forkRemote(state, from = 'upstream', to = 'origin') {
  const src = getRemote(state, from);
  if (state.remotes[to]) fail('error.remoteExists', { name: to });
  const r = makeRemote(to, from);
  r.commits = structuredClone(src.commits);
  r.branches = structuredClone(src.branches);
  state.remotes[to] = r;
  if (to === 'origin') {
    for (const [b, ref] of Object.entries(r.branches)) {
      state.remoteRefs[`origin/${b}`] = { tip: ref.tip };
      copyCommits(r.commits, state.commits, ref.tip);
      if (state.branches[b] && !state.branches[b].upstream) state.branches[b].upstream = `origin/${b}`;
    }
  }
  if (!state.visibleRepos.includes(to)) state.visibleRepos.push(to);
  return r;
}

/** Removes local commits that nothing points to any more (setup only). */
function pruneUnreachable(state) {
  const roots = [];
  for (const b of Object.values(state.branches)) roots.push(b.tip);
  for (const r of Object.values(state.remoteRefs)) roots.push(r.tip);
  for (const w of state.worktrees) {
    roots.push(w.head);
    for (const s of w.stash) roots.push(s.head);
    if (w.op) roots.push(w.op.origHead, w.op.theirs);
  }
  const keep = new Set();
  for (const r of roots) if (r) for (const c of ancestors(state, r)) keep.add(c);
  for (const id of Object.keys(state.commits)) if (!keep.has(id)) delete state.commits[id];
}

/** Setup `@online-only <branch>`: pushed to origin, then deleted locally (with its origin/<b> ref, not fetched yet). */
export function onlineOnly(state, branch) {
  if (!state.branches[branch]) fail('error.unknownBranch', { name: branch });
  const desk = state.worktrees.find((w) => w.branch === branch);
  if (desk) fail('error.branchCheckedOut', { name: branch, path: desk.path });
  if (!state.remotes.origin) state.remotes.origin = makeRemote('origin');
  publishBranch(state, 'origin', branch);
  delete state.branches[branch];
  delete state.remoteRefs[`origin/${branch}`];
  pruneUnreachable(state);
}

/** Files changed on the local side since `base` (committed on the branch or changed in a desk). */
function locallyTouched(state, branch, base) {
  const out = new Set();
  const local = state.branches[branch];
  if (local) {
    const from = base ? state.commits[base] || null : null;
    const fromTree = from ? from.tree : {};
    const tip = state.commits[local.tip];
    if (tip) for (const p of changedPaths(fromTree, tip.tree)) out.add(p);
  }
  for (const w of state.worktrees) for (const f of deskFiles(w)) if (f.status !== 'clean') out.add(f.path);
  return out;
}

/**
 * A colleague pushes a commit to <remote>/<branch> (not fetched).
 * Without `files`: the commit changes one file that was not changed locally since the common base, chosen
 * deterministically (the most recently changed such file on the remote branch, then alphabetical), so a later
 * pull does not conflict. With `files`: those paths are changed (or created).
 */
export function colleaguePush(state, { remote: remoteName = 'origin', branch = 'main', message = '', msgKey = null, files = null } = {}) {
  const remote = getRemote(state, remoteName);
  const ref = remote.branches[branch];
  if (!ref) fail('error.unknownRemoteBranch', { name: `${remoteName}/${branch}` });
  const tip = remote.commits[ref.tip];
  const tree = { ...tip.tree };
  let paths = files && files.length ? [...files] : null;
  if (!paths) {
    const local = state.branches[branch];
    let base = null;
    if (local) {
      const mine = ancestors(state, local.tip);
      const theirs = [...ancestorsIn(remote.commits, ref.tip)].filter((c) => mine.has(c)).sort(byCommitOrder);
      base = theirs.length ? theirs[theirs.length - 1] : null;
    }
    const touched = locallyTouched(state, branch, base);
    const lastChange = (p) => {
      let best = -1;
      for (const id of ancestorsIn(remote.commits, ref.tip)) if (remote.commits[id].files.includes(p)) best = Math.max(best, commitNumber(id));
      return best;
    };
    const candidates = Object.keys(tree).filter((p) => !touched.has(p))
      .sort((a, b) => lastChange(b) - lastChange(a) || (a < b ? -1 : a > b ? 1 : 0));
    paths = [candidates.length ? candidates[0] : 'notes.md'];
  }
  for (const p of paths) {
    state.seq.edit += 1;
    tree[p] = p in tree ? editedContent(tree[p], state.seq.edit, p) : initialContent(p);
  }
  const id = nextCommitId(state);
  remote.commits[id] = {
    id, parents: [ref.tip], msg: message || '', msgKey: message ? null : (msgKey || 'msg.colleague'), msgParams: message ? null : {},
    author: 'human', colleague: true, files: changedPaths(tip.tree, tree), tree,
  };
  ref.tip = id;
  return { id, files: paths };
}

/** Opens a merge request on a remote (origin by default). */
export function openMr(state, { remote: remoteName = 'origin', id, source, target = 'main', title = '', titleKey = null, titleParams = null, comments = 0 }) {
  const remote = getRemote(state, remoteName);
  if (!remote.branches[source]) fail('error.unknownRemoteBranch', { name: `${remoteName}/${source}` });
  if (!remote.branches[target]) fail('error.unknownRemoteBranch', { name: `${remoteName}/${target}` });
  let num = Number(id);
  if (!Number.isInteger(num) || num <= 0) num = remote.mrs.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  if (remote.mrs.some((m) => m.id === num)) fail('error.mrExists', { id: num });
  const mr = { id: num, title: title || '', titleKey, titleParams, source, target, status: 'open', comments: Number(comments) || 0, commit: null };
  remote.mrs.push(mr);
  return mr;
}

export function findMr(state, id, remoteName = null) {
  const names = remoteName ? [remoteName] : Object.keys(state.remotes || {});
  for (const n of names) {
    const r = state.remotes[n];
    const mr = r && r.mrs.find((m) => m.id === Number(id));
    if (mr) return { remote: r, mr };
  }
  return { remote: null, mr: null };
}

export function approveMr(state, id) {
  const { mr } = findMr(state, id);
  if (!mr) fail('error.unknownMr', { id });
  if (mr.status === 'merged' || mr.status === 'closed') fail('error.mrClosed', { id, status: mr.status });
  mr.status = 'approved';
  return mr;
}

/** Merges an approved MR on the remote: a merge commit on the target branch (local branches do not move). */
export function mergeMr(state, id) {
  const { remote, mr } = findMr(state, id);
  if (!mr) fail('error.unknownMr', { id });
  if (mr.status === 'merged' || mr.status === 'closed') fail('error.mrClosed', { id, status: mr.status });
  if (mr.status !== 'approved') fail('error.mrNotApproved', { id });
  const t = remote.branches[mr.target];
  const s = remote.branches[mr.source];
  if (!t || !s) fail('error.unknownRemoteBranch', { name: `${remote.name}/${!t ? mr.target : mr.source}` });
  if (ancestorsIn(remote.commits, t.tip).has(s.tip)) {
    mr.status = 'merged';
    return { mr, commit: null };
  }
  const A = ancestorsIn(remote.commits, t.tip);
  const common = [...ancestorsIn(remote.commits, s.tip)].filter((c) => A.has(c)).sort(byCommitOrder);
  const base = common.length ? common[common.length - 1] : null;
  const result = threeWay(base ? remote.commits[base].tree : {}, remote.commits[t.tip].tree, remote.commits[s.tip].tree);
  if (result.conflicts.length) fail('error.mrConflict', { id, file: result.conflicts[0].path });
  const cid = nextCommitId(state);
  remote.commits[cid] = {
    id: cid, parents: [t.tip, s.tip], msg: '', msgKey: 'msg.mrMerge', msgParams: { id: mr.id, name: mr.source, into: mr.target },
    author: 'human', files: changedPaths(remote.commits[t.tip].tree, result.tree), tree: result.tree,
  };
  t.tip = cid;
  mr.status = 'merged';
  mr.commit = cid;
  return { mr, commit: cid };
}

/** `git fetch <remote>`: copies the remote branches as <remote>/<b> refs. Returns [{ ref, from, to }] of changed refs. */
export function fetchRemote(state, remoteName = 'origin') {
  const remote = getRemote(state, remoteName);
  const changed = [];
  for (const [b, ref] of Object.entries(remote.branches).sort(([a], [c]) => (a < c ? -1 : 1))) {
    copyCommits(remote.commits, state.commits, ref.tip);
    const name = `${remoteName}/${b}`;
    const prev = state.remoteRefs[name] ? state.remoteRefs[name].tip : null;
    if (prev !== ref.tip) {
      state.remoteRefs[name] = { tip: ref.tip };
      changed.push({ ref: name, from: prev, to: ref.tip });
    }
  }
  return changed;
}

/** Parses a site action as written in content: "approve MR !42", "merge MR !42". Returns a command object or null. */
export function parseWebAction(text) {
  const m = /^\s*(approve|merge|close) MR !(\d+)\s*$/.exec(String(text));
  if (!m) return null;
  return { name: 'mr', args: [m[1], Number(m[2])], options: {}, text: String(text).trim() };
}
