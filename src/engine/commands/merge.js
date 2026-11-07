// git merge <b> | --no-ff | --abort | --continue
import { isAncestor, mergeBase, commitTree, setDeskTree, deskLabel } from '../state.js';
import {
  fail, rev, requireNoOp, requireCommit, moveHead, createCommit, overwritten, mergeInto, conflictWarning, abortOp,
} from './_shared.js';

export default {
  name: 'merge',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    if (o.abort) {
      abortOp(ctx, desk, 'merge');
      return ctx.explain('explain.merge.abort', {});
    }
    if (o.continue) {
      if (!desk.op || desk.op.type !== 'merge') fail('error.noOperation', { op: 'merge' });
      return ctx.run('commit', [], {});
    }
    requireNoOp(ctx);
    requireCommit(ctx);
    const label = ctx.args[0];
    const target = rev(ctx, label);
    const into = deskLabel(desk);
    if (isAncestor(state, target.id, desk.head)) {
      ctx.markReadOnly();
      return ctx.explain('explain.merge.upToDate', { name: label, into });
    }
    const headTree = commitTree(state, desk.head);
    const theirsTree = commitTree(state, target.id);
    if (isAncestor(state, desk.head, target.id) && !o['no-ff']) {
      const blocked = overwritten(desk, headTree, theirsTree);
      if (blocked.length) fail('error.mergeWouldOverwrite', { files: blocked.join(', '), file: blocked[0], n: blocked.length });
      const from = desk.head;
      moveHead(ctx, desk, target.id, { reason: 'fast-forward' });
      setDeskTree(desk, theirsTree, 'carry');
      ctx.emit('merge.fastForward', { desk: desk.id, into, name: label, from, to: target.id });
      return ctx.explain('explain.merge.ff', { name: label, into });
    }
    const base = mergeBase(state, desk.head, target.id);
    const result = mergeInto(ctx, desk, commitTree(state, base), theirsTree, into, label);
    if (result.conflicts.length) {
      desk.op = { type: 'merge', theirs: target.id, theirsLabel: label, oursLabel: into, origHead: desk.head };
      ctx.emit('op.started', { desk: desk.id, op: 'merge', name: label });
      conflictWarning(ctx, desk, result.conflicts, 'merge');
      return ctx.explain('explain.merge.conflict', { name: label, into, file: result.conflicts[0].path, n: result.conflicts.length });
    }
    const msg = typeof o.m === 'string' ? o.m : '';
    const id = createCommit(ctx, desk, {
      tree: result.tree, parents: [desk.head, target.id], msg, msgKey: msg ? null : 'msg.merge', msgParams: msg ? null : { name: label, into },
    });
    setDeskTree(desk, result.tree, 'carry');
    ctx.emit('lanes.joined', { from: label, into, commit: id });
    ctx.explain('explain.merge', { name: label, into });
  },
};
