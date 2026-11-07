// git worktree add <path> [-b <new>] [<branch|commit>] | list | remove [--force] <path> | prune
// Game convention: the new folder becomes the active desk (the player "goes" there).
import { folderName, getDesk, makeDesk, setDeskTree, commitTree, resolveRev, deskFiles } from '../state.js';
import { fail, rev, requireCommit, validateNewBranch, createBranch, requireBranchFree } from './_shared.js';

function nextDeskId(state) {
  let n = state.seq.desk;
  do n += 1; while (state.worktrees.some((w) => w.id === `w${n}`));
  state.seq.desk = n;
  return `w${n}`;
}

function add(ctx) {
  const state = ctx.state;
  const desk = ctx.desk;
  const o = ctx.options;
  const target = ctx.args[1];
  if (!target) fail('error.missingArgument', { command: 'git worktree add' });
  const path = folderName(target);
  if (state.worktrees.some((w) => w.path === path)) fail('error.worktreeExists', { path });
  requireCommit(ctx);
  const newName = typeof o.b === 'string' ? o.b : typeof o.B === 'string' ? o.B : null;
  if (o.b === true || o.B === true) fail('error.missingArgument', { command: 'git worktree add -b' });
  const what = ctx.args[2];
  let branch = null;
  let head = null;
  if (newName) {
    validateNewBranch(ctx, newName, { force: typeof o.B === 'string' });
    if (state.branches[newName]) requireBranchFree(ctx, newName);
    head = what ? rev(ctx, what).id : desk.head;
    createBranch(ctx, newName, head, what || desk.branch);
    branch = newName;
  } else if (what && state.branches[what]) {
    requireBranchFree(ctx, what);
    branch = what;
    head = state.branches[what].tip;
  } else if (what && state.remoteRefs && state.remoteRefs[`origin/${what}`]) {
    validateNewBranch(ctx, what);
    head = state.remoteRefs[`origin/${what}`].tip;
    createBranch(ctx, what, head, `origin/${what}`, `origin/${what}`);
    branch = what;
  } else if (what) {
    const r = resolveRev(state, desk, what);
    if (!r) fail('error.unknownRevision', { rev: what });
    head = r.id;
    if (!o.detach && !o.d) ctx.warn('warn.detachedHead', { id: r.id });
  } else if (state.branches[path]) {
    requireBranchFree(ctx, path);
    branch = path;
    head = state.branches[path].tip;
  } else {
    validateNewBranch(ctx, path);
    head = desk.head;
    createBranch(ctx, path, head, desk.branch);
    branch = path;
  }
  const w = makeDesk(nextDeskId(state), path, false, branch, head);
  setDeskTree(w, commitTree(state, head), 'hard');
  state.worktrees.push(w);
  const from = state.active;
  state.active = w.id;
  ctx.emit('worktree.added', { id: w.id, path, branch, head });
  ctx.emit('desk.activated', { id: w.id, from });
  if (branch) ctx.explain('explain.worktree.add', { path, branch });
  else ctx.explain('explain.worktree.addDetached', { path, id: head });
}

function remove(ctx) {
  const state = ctx.state;
  const target = ctx.args[1];
  if (!target) fail('error.missingArgument', { command: 'git worktree remove' });
  const w = getDesk(state, target);
  if (!w) fail('error.unknownDesk', { path: folderName(target) });
  if (w.main) fail('error.worktreeMain', { path: w.path });
  const dirty = deskFiles(w).filter((f) => f.status !== 'clean');
  if ((dirty.length || w.op) && !(ctx.options.force || ctx.options.f)) {
    fail('error.worktreeDirty', { path: w.path, files: dirty.map((f) => f.path).join(', '), n: dirty.length });
  }
  state.worktrees = state.worktrees.filter((x) => x.id !== w.id);
  if (state.active === w.id) {
    state.active = state.worktrees.find((x) => x.main).id;
    ctx.emit('desk.activated', { id: state.active, from: w.id });
  }
  ctx.emit('worktree.removed', { id: w.id, path: w.path, branch: w.branch });
  ctx.explain('explain.worktree.remove', { path: w.path, branch: w.branch || w.head });
}

export default {
  name: 'worktree',
  run(ctx) {
    const sub = ctx.args[0];
    if (sub === 'add') return add(ctx);
    if (sub === 'remove' || sub === 'rm') return remove(ctx);
    if (sub === 'list') {
      ctx.markReadOnly();
      ctx.output({
        kind: 'worktrees',
        worktrees: ctx.state.worktrees.map((w) => ({ id: w.id, path: w.path, main: w.main, branch: w.branch, head: w.head, active: w.id === ctx.state.active })),
      });
      ctx.emit('worktree.listed', { ids: ctx.state.worktrees.map((w) => w.id) });
      return ctx.explain('explain.worktree.list', { n: ctx.state.worktrees.length });
    }
    if (sub === 'prune') {
      ctx.markReadOnly();
      return ctx.explain('explain.worktree.prune', {});
    }
    if (!sub) fail('error.missingArgument', { command: 'git worktree' });
    return fail('error.unknownSubcommand', { command: 'git worktree', sub });
  },
};
