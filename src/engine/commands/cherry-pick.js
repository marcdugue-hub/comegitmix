// git cherry-pick <commit> | --continue | --abort
import { commitTree, setDeskTree, deskLabel } from '../state.js';
import { changedPaths } from '../conflicts.js';
import { fail, rev, requireNoOp, requireCommit, createCommit, mergeInto, conflictWarning, abortOp } from './_shared.js';

export default {
  name: 'cherry-pick',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    if (o.abort) {
      abortOp(ctx, desk, 'cherry-pick');
      return ctx.explain('explain.cherryPick.abort', {});
    }
    if (o.continue) {
      if (!desk.op || desk.op.type !== 'cherry-pick') fail('error.noOperation', { op: 'cherry-pick' });
      return ctx.run('commit', [], {});
    }
    requireNoOp(ctx);
    requireCommit(ctx);
    const label = ctx.args[0];
    const src = rev(ctx, label);
    const c = state.commits[src.id];
    if (c.parents.length > 1) fail('error.cherryPickMerge', { rev: label });
    const headTree = commitTree(state, desk.head);
    const result = mergeInto(ctx, desk, commitTree(state, c.parents[0] || null), c.tree, deskLabel(desk), label);
    if (result.conflicts.length) {
      desk.op = { type: 'cherry-pick', source: c.id, theirs: c.id, theirsLabel: label, oursLabel: deskLabel(desk), origHead: desk.head };
      ctx.emit('op.started', { desk: desk.id, op: 'cherry-pick', source: c.id });
      conflictWarning(ctx, desk, result.conflicts, 'cherry-pick');
      return ctx.explain('explain.cherryPick.conflict', { rev: label, file: result.conflicts[0].path });
    }
    if (!changedPaths(headTree, result.tree).length) fail('error.cherryPickEmpty', { rev: label });
    const id = createCommit(ctx, desk, { tree: result.tree, parents: [desk.head], msg: c.msg, msgKey: c.msgKey, msgParams: c.msgParams, author: c.author });
    setDeskTree(desk, result.tree, 'carry');
    ctx.emit('commit.copied', { source: c.id, id, branch: desk.branch });
    ctx.explain('explain.cherryPick', { rev: label, branch: deskLabel(desk), id });
  },
};
