// Shape comparison of two states (typed-answer puzzles, docs/AUTHORING.md §5).
// Two states are equivalent when they have the same branches pointing to the same-shaped history, the same desks
// (folder, branch, file statuses, index, stash size) and the same remote refs / MR statuses — ignoring commit ids,
// commit messages and generated file contents.

import { deskFiles } from './state.js';

function commitSignatures(state) {
  const memo = new Map();
  const all = { ...Object.fromEntries(Object.values(state.remotes || {}).flatMap((r) => Object.entries(r.commits || {}))), ...state.commits };
  const sig = (id) => {
    if (!id) return null;
    if (memo.has(id)) return memo.get(id);
    const c = all[id];
    if (!c) return `?${id}`;
    memo.set(id, '…');
    const s = JSON.stringify([c.parents.map(sig), [...c.files].sort(), Object.keys(c.tree).sort(), c.author]);
    memo.set(id, s);
    return s;
  };
  return sig;
}

/** Canonical, id-free description of a state. */
export function shape(state) {
  const sig = commitSignatures(state);
  const sorted = (o) => Object.keys(o || {}).sort();
  return {
    branches: sorted(state.branches).map((b) => [b, sig(state.branches[b].tip)]),
    remoteRefs: sorted(state.remoteRefs).map((r) => [r, sig(state.remoteRefs[r].tip)]),
    remotes: sorted(state.remotes).map((n) => {
      const r = state.remotes[n];
      return [n, sorted(r.branches).map((b) => [b, sig(r.branches[b].tip)]), (r.mrs || []).map((m) => [m.id, m.source, m.target, m.status])];
    }),
    desks: state.worktrees.map((w) => ({
      path: w.path,
      branch: w.branch,
      head: sig(w.head),
      active: state.active === w.id,
      op: w.op ? w.op.type : null,
      stash: w.stash.length,
      files: deskFiles(w).map((f) => [f.path, f.status, f.staged]),
    })),
  };
}

/** True when both states have the same shape. */
export function equivalent(a, b) {
  return JSON.stringify(shape(a)) === JSON.stringify(shape(b));
}

/** First differing part of the shapes, for messages and tests: null when equivalent. */
export function difference(a, b) {
  const A = shape(a);
  const B = shape(b);
  for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) return k;
  return null;
}
