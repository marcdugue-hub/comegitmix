// git reset [--soft|--mixed|--hard] [<commit>] | git reset <file> (= restore --staged)
import { resolveRev, commitTree, setDeskTree, findFile, deskLabel } from '../state.js';
import { clearConflicts } from '../conflicts.js';
import { fail, rev, requireCommit, moveHead } from './_shared.js';
import { restoreFiles } from './restore.js';

export default {
  name: 'reset',
  run(ctx) {
    const desk = ctx.desk;
    const o = ctx.options;
    const mode = o.hard ? 'hard' : o.soft ? 'soft' : 'mixed';
    const args = ctx.args.filter((a) => a !== '--');
    const looksLikeFile = (a) => !resolveRev(ctx.state, desk, a) && (findFile(desk, a) || a === '.');
    if (args.length && (o['--'] || args.every(looksLikeFile)) && !o.hard && !o.soft) {
      const fileArgs = args[0] && resolveRev(ctx.state, desk, args[0]) && args.length > 1 ? args.slice(1) : args;
      const done = restoreFiles(ctx, desk, fileArgs, { staged: true, worktree: false });
      return ctx.explain(done.length ? 'explain.restore.staged' : 'explain.restore.nothing', { file: fileArgs[0], n: done.length });
    }
    requireCommit(ctx);
    if (desk.op && mode !== 'hard') fail('error.operationInProgress', { op: desk.op.type });
    const label = args[0] || 'HEAD';
    const target = rev(ctx, label);
    if (desk.op) {
      ctx.emit('op.aborted', { desk: desk.id, op: desk.op.type });
      desk.op = null;
    }
    const from = desk.head;
    moveHead(ctx, desk, target.id, { reason: 'reset' });
    if (mode === 'hard') clearConflicts(desk);
    setDeskTree(desk, commitTree(ctx.state, target.id), mode);
    ctx.explain(`explain.reset.${mode}`, { rev: label, branch: deskLabel(desk), id: target.id, from });
  },
};
