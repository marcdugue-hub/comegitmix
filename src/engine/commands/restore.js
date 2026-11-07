// git restore <f> | git restore --staged <f> | --staged --worktree | --ours/--theirs <f>
import { setFile } from '../state.js';
import { normalizeSide, resolveFile } from '../conflicts.js';
import { fail } from './_shared.js';
import { selectFiles } from './add.js';

export function restoreFiles(ctx, desk, args, { staged, worktree }) {
  if (!args.length) fail('error.missingArgument', { command: ctx.name === 'checkout' ? 'git checkout' : 'git restore' });
  const files = selectFiles(ctx, desk, args);
  const done = [];
  for (const f of files) {
    if (f.status === 'conflict') {
      if (args.includes('.')) continue;
      fail('error.conflictChooseFirst', { file: f.path });
    }
    if (worktree && f.base === null && f.index === null) {
      if (args.includes('.')) continue;
      fail('error.restoreUntracked', { file: f.path });
    }
    const before = f.status + f.staged;
    if (staged) setFile(desk, f.path, { index: f.base });
    if (worktree) setFile(desk, f.path, { work: f.index });
    if (f.status + f.staged !== before) done.push(f.path);
  }
  return done;
}

export function resolveSide(ctx, desk, args, side) {
  if (!args.length) fail('error.missingArgument', { command: 'git restore' });
  const files = selectFiles(ctx, desk, args);
  for (const f of files) {
    if (!f.conflict) fail('error.notInConflict', { file: f.path });
    resolveFile(ctx.state, desk, f.path, normalizeSide(f, side));
  }
  ctx.explain('explain.resolve', { file: files[0].path, side: side === 'ours' ? files[0].conflict.oursLabel : files[0].conflict.theirsLabel });
}

export default {
  name: 'restore',
  run(ctx) {
    const o = ctx.options;
    if (o.ours || o.theirs) return resolveSide(ctx, ctx.desk, ctx.args, o.ours ? 'ours' : 'theirs');
    const staged = Boolean(o.staged || o.S);
    const worktree = Boolean(o.worktree || o.W || !staged);
    const done = restoreFiles(ctx, ctx.desk, ctx.args, { staged, worktree });
    const file = done[0] || ctx.args[0];
    if (!done.length) ctx.explain('explain.restore.nothing', { file });
    else if (staged && worktree) ctx.explain('explain.restore.both', { file, n: done.length });
    else if (staged) ctx.explain('explain.restore.staged', { file, n: done.length });
    else ctx.explain('explain.restore', { file, n: done.length });
  },
};
