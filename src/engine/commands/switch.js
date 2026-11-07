// git switch <b> | switch -c <b> [<start>] | switch --detach <rev>
import { resolveRev } from '../state.js';
import { fail, rev, requireNoOp, requireCommit, validateNewBranch, createBranch, requireBranchFree, checkoutCommit } from './_shared.js';

export function switchTo(ctx, name) {
  const state = ctx.state;
  const desk = ctx.desk;
  if (!name || name === true) fail('error.missingArgument', { command: 'git switch' });
  if (state.branches[name]) {
    if (desk.branch === name) return ctx.explain('explain.switch.already', { name });
    requireBranchFree(ctx, name, desk);
    checkoutCommit(ctx, desk, state.branches[name].tip, name);
    return ctx.explain('explain.switch', { name });
  }
  const remote = state.remoteRefs && state.remoteRefs[`origin/${name}`];
  if (remote) {
    validateNewBranch(ctx, name);
    createBranch(ctx, name, remote.tip, `origin/${name}`, `origin/${name}`);
    checkoutCommit(ctx, desk, remote.tip, name);
    return ctx.explain('explain.switch.track', { name, remote: `origin/${name}` });
  }
  if (resolveRev(state, desk, name)) fail('error.switchNeedsDetach', { rev: name });
  return fail('error.unknownBranch', { name });
}

export function switchCreate(ctx, name, start, force = false) {
  const desk = ctx.desk;
  requireCommit(ctx);
  validateNewBranch(ctx, name, { force });
  if (force && ctx.state.branches[name]) requireBranchFree(ctx, name, desk);
  const at = start ? rev(ctx, start).id : desk.head;
  createBranch(ctx, name, at, start || desk.branch);
  checkoutCommit(ctx, desk, at, name);
  ctx.explain('explain.switch.create', { name });
}

export function detach(ctx, text) {
  const desk = ctx.desk;
  requireCommit(ctx);
  const r = rev(ctx, text || 'HEAD');
  checkoutCommit(ctx, desk, r.id, null);
  ctx.warn('warn.detachedHead', { id: r.id });
  ctx.explain('explain.switch.detach', { rev: text || 'HEAD', id: r.id });
}

export default {
  name: 'switch',
  run(ctx) {
    requireNoOp(ctx);
    const o = ctx.options;
    if (typeof o.c === 'string' || typeof o.C === 'string' || o.create) {
      const name = typeof o.c === 'string' ? o.c : typeof o.C === 'string' ? o.C : o.create;
      return switchCreate(ctx, name, ctx.args[0], typeof o.C === 'string');
    }
    if (o.c === true || o.C === true) fail('error.missingArgument', { command: 'git switch -c' });
    if (o.detach || o.d) return detach(ctx, ctx.args[0]);
    return switchTo(ctx, ctx.args[0]);
  },
};
