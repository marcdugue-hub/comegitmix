// Building blocks shared by the command handlers (and by remote.js / ai.js / setup.js).

import {
  EngineError, resolveRev, commitTree, commitNumber, setDeskTree, deskFiles, dirtyFiles, deskTree,
  deskLabel, isValidBranchName, deskOnBranch, findFile, unresolvedConflicts,
} from '../state.js';
import { changedPaths, threeWay, applyMergeResult, clearConflicts } from '../conflicts.js';

export function fail(key, params = {}) {
  throw new EngineError(key, params);
}

export function requireNoOp(ctx, desk = ctx.desk) {
  if (desk.op) fail('error.operationInProgress', { op: desk.op.type });
}

export function requireCommit(ctx, desk = ctx.desk) {
  if (!desk.head) fail('error.noCommitYet', {});
}

export function rev(ctx, text, desk = ctx.desk) {
  if (text === undefined || text === null || text === '') fail('error.missingArgument', { command: ctx.name });
  const r = resolveRev(ctx.state, desk, text);
  if (!r) fail('error.unknownRevision', { rev: text });
  return r;
}

/** Next free commit id (c1, c2…), unique across local and remote commits. */
export function nextCommitId(state) {
  let n = state.seq.commit;
  const taken = (id) => state.commits[id] || Object.values(state.remotes || {}).some((r) => r.commits && r.commits[id]);
  for (const id of Object.keys(state.commits)) n = Math.max(n, commitNumber(id));
  do n += 1; while (taken(`c${n}`));
  state.seq.commit = n;
  return `c${n}`;
}

/** Moves a desk's HEAD (and its branch when attached and moveBranch). */
export function moveHead(ctx, desk, id, { moveBranch = true, reason = 'move' } = {}) {
  const from = desk.head;
  desk.head = id;
  if (desk.branch && moveBranch) {
    const prev = ctx.state.branches[desk.branch];
    ctx.state.branches[desk.branch] = { upstream: null, ...(prev || {}), tip: id };
    if (!prev || prev.tip !== id) ctx.emit('branch.moved', { name: desk.branch, from: prev ? prev.tip : null, to: id, reason });
  }
  ctx.emit('head.moved', { desk: desk.id, from, to: id, branch: desk.branch });
}

/** Creates a commit on a desk: the desk HEAD and its branch move to it. */
export function createCommit(ctx, desk, { tree, parents, msg = '', msgKey = null, msgParams = null, author = null }) {
  const state = ctx.state;
  const id = nextCommitId(state);
  const first = parents[0] || null;
  const who = author || ctx.options.author || ctx.opts.author || state.author || 'human';
  state.commits[id] = {
    id, parents: [...parents], msg: msg || '', msgKey, msgParams, author: who,
    files: changedPaths(commitTree(state, first), tree), tree: { ...tree },
  };
  const created = desk.branch && !state.branches[desk.branch];
  moveHead(ctx, desk, id, { reason: 'commit' });
  if (created) ctx.emit('lane.forked', { name: desk.branch, at: id, from: null });
  ctx.emit('commit.created', { id, branch: desk.branch, desk: desk.id, parents: [...parents], author: who });
  return id;
}

/** Files changed in the folder that a move from `fromTree` to `toTree` would overwrite. */
export function overwritten(desk, fromTree, toTree) {
  const touched = new Set(changedPaths(fromTree, toTree));
  return dirtyFiles(desk)
    .filter((f) => {
      if (f.base === null && f.index === null) return f.path in toTree && toTree[f.path] !== f.work;
      return touched.has(f.path);
    })
    .map((f) => f.path);
}

/** Moves a desk to another commit as `git switch` does: changed files are carried along. */
export function checkoutCommit(ctx, desk, id, branch) {
  const from = { branch: desk.branch, head: desk.head };
  const blocked = overwritten(desk, commitTree(ctx.state, desk.head), commitTree(ctx.state, id));
  if (blocked.length) fail('error.switchWouldOverwrite', { files: blocked.join(', '), file: blocked[0], n: blocked.length });
  desk.branch = branch;
  desk.head = id;
  setDeskTree(desk, commitTree(ctx.state, id), 'carry');
  ctx.emit('desk.switched', { desk: desk.id, from, to: { branch, head: id } });
}

export function validateNewBranch(ctx, name, { force = false } = {}) {
  if (!name || name === true) fail('error.missingArgument', { command: ctx.name });
  if (!isValidBranchName(name)) fail('error.invalidBranchName', { name });
  if (ctx.state.branches[name] && !force) fail('error.branchExists', { name });
}

export function createBranch(ctx, name, at, from = null, upstream = null) {
  ctx.state.branches[name] = { tip: at, upstream };
  ctx.emit('lane.forked', { name, at, from });
}

export function requireBranchFree(ctx, name, except = null) {
  const other = deskOnBranch(ctx.state, name);
  if (other && other !== except) fail('error.branchInUse', { name, path: other.path });
}

/** Tracked changes would block an operation that rewrites the folder. */
export function requireCleanForRewrite(ctx, desk = ctx.desk) {
  const dirty = deskFiles(desk).filter((f) => f.status !== 'clean' && !(f.base === null && f.index === null));
  if (dirty.length) fail('error.rebaseDirty', { files: dirty.map((f) => f.path).join(', '), file: dirty[0].path, n: dirty.length });
}

export function requireResolved(ctx, desk = ctx.desk) {
  const open = unresolvedConflicts(desk);
  if (open.length) fail('error.conflictUnresolved', { file: open[0].path, files: open.map((f) => f.path).join(', '), n: open.length });
  const notAdded = deskFiles(desk).filter((f) => f.conflict && f.conflict.resolved && !f.conflict.added);
  if (notAdded.length) fail('error.conflictNotAdded', { file: notAdded[0].path, files: notAdded.map((f) => f.path).join(', '), n: notAdded.length });
}

/**
 * Three-way merges `theirsTree` (with ancestor `baseTree`) into the desk.
 * Without conflict: returns { tree, conflicts: [] } and touches nothing.
 * With conflicts: writes the result into the desk (conflict statuses) and returns the conflicts.
 */
export function mergeInto(ctx, desk, baseTree, theirsTree, oursLabel, theirsLabel) {
  const headTree = commitTree(ctx.state, desk.head);
  const result = threeWay(baseTree, headTree, theirsTree);
  const paths = new Set([...changedPaths(headTree, result.tree), ...result.conflicts.map((c) => c.path)]);
  const staged = deskFiles(desk).filter((f) => f.staged);
  const blocked = [...new Set([
    ...dirtyFiles(desk).filter((f) => paths.has(f.path)).map((f) => f.path),
    ...staged.map((f) => f.path),
  ])];
  if (blocked.length) fail('error.mergeWouldOverwrite', { files: blocked.join(', '), file: blocked[0], n: blocked.length });
  if (result.conflicts.length) applyMergeResult(ctx.state, desk, headTree, result, oursLabel, theirsLabel);
  return result;
}

export function conflictWarning(ctx, desk, conflicts, op) {
  const files = conflicts.map((c) => c.path);
  ctx.emit('conflict', { desk: desk.id, op, files });
  ctx.warn('error.mergeConflict', { file: files[0], files: files.join(', '), n: files.length });
}

/** Restores the desk to the commit it had before an operation (merge, rebase, cherry-pick, revert). */
export function abortOp(ctx, desk, type) {
  if (!desk.op || (type && desk.op.type !== type)) fail('error.noOperation', { op: type || 'merge' });
  const orig = desk.op.origHead;
  if (desk.op.type === 'rebase' && desk.op.branch) desk.branch = desk.op.branch;
  moveHead(ctx, desk, orig, { reason: 'abort' });
  setDeskTree(desk, commitTree(ctx.state, orig), 'hard');
  clearConflicts(desk);
  ctx.emit('op.aborted', { desk: desk.id, op: desk.op.type });
  desk.op = null;
}

// --------------------------------------------------------------------------
// Replay (rebase, interactive rebase)
// --------------------------------------------------------------------------

function commitStep(ctx, desk, step, tree) {
  const op = desk.op;
  const c = ctx.state.commits[step.id];
  if ((step.action === 'squash' || step.action === 'fixup') && op.replayed.length) {
    const prevId = op.replayed.pop();
    const prev = ctx.state.commits[prevId];
    const id = createCommit(ctx, desk, { tree, parents: prev.parents, msg: prev.msg, msgKey: prev.msgKey, msgParams: prev.msgParams, author: prev.author });
    op.replayed.push(id);
    op.squashed += 1;
  } else {
    const msg = step.action === 'reword' && typeof step.msg === 'string' ? step.msg : c.msg;
    const msgKey = step.action === 'reword' && typeof step.msg === 'string' ? null : c.msgKey;
    const id = createCommit(ctx, desk, { tree, parents: desk.head ? [desk.head] : [], msg, msgKey, msgParams: msgKey ? c.msgParams : null, author: c.author });
    op.replayed.push(id);
  }
  setDeskTree(desk, tree, 'hard');
}

/** Replays desk.op.remaining; stops at the first conflict. Returns true when finished. */
export function runReplay(ctx, desk) {
  const op = desk.op;
  while (op.remaining.length) {
    const step = op.remaining.shift();
    if (step.action === 'drop') {
      op.dropped += 1;
      continue;
    }
    const c = ctx.state.commits[step.id];
    const parentTree = commitTree(ctx.state, c.parents[0] || null);
    const headTree = commitTree(ctx.state, desk.head);
    const result = threeWay(parentTree, headTree, c.tree);
    if (result.conflicts.length) {
      op.current = step;
      applyMergeResult(ctx.state, desk, headTree, result, op.oursLabel, op.theirsLabel);
      conflictWarning(ctx, desk, result.conflicts, 'rebase');
      return false;
    }
    commitStep(ctx, desk, step, result.tree);
  }
  ctx.emit('rebase.done', { desk: desk.id, branch: op.branch, from: op.old, to: [...op.replayed], onto: op.onto, squashed: op.squashed, dropped: op.dropped });
  op.finished = true;
  desk.op = null;
  return true;
}

/** Commits the step stopped on a conflict, then goes on. */
export function continueReplay(ctx, desk) {
  requireResolved(ctx, desk);
  const op = desk.op;
  const tree = deskTree(desk, 'index');
  clearConflicts(desk);
  if (op.current) commitStep(ctx, desk, op.current, tree);
  op.current = null;
  return runReplay(ctx, desk);
}

export { deskLabel, findFile, commitTree, deskTree };
