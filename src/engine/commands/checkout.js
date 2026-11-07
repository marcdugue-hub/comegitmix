// git checkout <b> | checkout -b <b> | checkout <commit> | checkout -- <f> | checkout --ours/--theirs <f>
// Accepted with a note: "today we write git switch / git restore".
import { resolveRev, findFile } from '../state.js';
import { fail, requireNoOp } from './_shared.js';
import { switchTo, switchCreate, detach } from './switch.js';
import { restoreFiles, resolveSide } from './restore.js';

export default {
  name: 'checkout',
  run(ctx) {
    const o = ctx.options;
    const desk = ctx.desk;
    if (o.ours || o.theirs) return resolveSide(ctx, desk, ctx.args, o.ours ? 'ours' : 'theirs');
    const first = ctx.args[0];
    const isFile = first && !ctx.state.branches[first] && !resolveRev(ctx.state, desk, first)
      && (findFile(desk, first) || desk.files.some((f) => f.path.startsWith(`${first}/`)) || first === '.');
    if (o['--'] || isFile) {
      const done = restoreFiles(ctx, desk, ctx.args, { staged: false, worktree: true });
      ctx.warn('warn.checkoutLegacy', { modern: `git restore ${ctx.args.join(' ')}` });
      return ctx.explain(done.length ? 'explain.restore' : 'explain.restore.nothing', { file: ctx.args[0], n: done.length });
    }
    requireNoOp(ctx);
    if (typeof o.b === 'string' || typeof o.B === 'string') {
      const name = typeof o.b === 'string' ? o.b : o.B;
      switchCreate(ctx, name, first, typeof o.B === 'string');
      return ctx.warn('warn.checkoutLegacy', { modern: `git switch -c ${name}${first ? ` ${first}` : ''}` });
    }
    if (o.b === true || o.B === true) fail('error.missingArgument', { command: 'git checkout -b' });
    if (!first) fail('error.missingArgument', { command: 'git checkout' });
    if (ctx.state.branches[first] || (ctx.state.remoteRefs && ctx.state.remoteRefs[`origin/${first}`])) {
      switchTo(ctx, first);
      return ctx.warn('warn.checkoutLegacy', { modern: `git switch ${first}` });
    }
    return detach(ctx, first);
  },
};
