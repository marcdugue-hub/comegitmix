// git revert <commit> | --continue | --abort : a new commit that undoes another one.
import { commitTree, setDeskTree, deskLabel } from '../state.js';
import { changedPaths } from '../conflicts.js';
import { fail, rev, requireNoOp, requireCommit, createCommit, mergeInto, conflictWarning, abortOp } from './_shared.js';

export default {
  name: 'revert',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    if (o.abort) {
      abortOp(ctx, desk, 'revert');
      return ctx.explain('explain.revert.abort', {});
    }
    if (o.continue) {
      if (!desk.op || desk.op.type !== 'revert') fail('error.noOperation', { op: 'revert' });
      return ctx.run('commit', [], {});
    }
    requireNoOp(ctx);
    requireCommit(ctx);
    const label = ctx.args[0];
    const src = rev(ctx, label);
    const c = state.commits[src.id];
    if (c.parents.length > 1) fail('error.revertMerge', { rev: label });
    const headTree = commitTree(state, desk.head);
    const result = mergeInto(ctx, desk, c.tree, commitTree(state, c.parents[0] || null), deskLabel(desk), label);
    if (result.conflicts.length) {
      desk.op = { type: 'revert', source: c.id, theirs: null, theirsLabel: label, oursLabel: deskLabel(desk), origHead: desk.head };
      ctx.emit('op.started', { desk: desk.id, op: 'revert', source: c.id });
      conflictWarning(ctx, desk, result.conflicts, 'revert');
      return ctx.explain('explain.revert.conflict', { rev: label, file: result.conflicts[0].path });
    }
    if (!changedPaths(headTree, result.tree).length) fail('error.nothingToCommit', {});
    const id = createCommit(ctx, desk, { tree: result.tree, parents: [desk.head], msgKey: 'msg.revert', msgParams: { msg: c.msg, msgKey: c.msgKey, id: c.id } });
    setDeskTree(desk, result.tree, 'carry');
    ctx.emit('commit.reverted', { source: c.id, id, branch: desk.branch });
    ctx.explain('explain.revert', { rev: label, id, branch: deskLabel(desk) });
  },
};
