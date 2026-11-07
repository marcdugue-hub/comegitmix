// git branch | git branch <name> [<start>] | git branch -d/-D <name>
import { isAncestor } from '../state.js';
import { fail, rev, requireCommit, validateNewBranch, createBranch } from './_shared.js';

export default {
  name: 'branch',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    if (o.d || o.D || o.delete) {
      if (!ctx.args.length) fail('error.missingArgument', { command: 'git branch -d' });
      for (const name of ctx.args) {
        const b = state.branches[name];
        if (!b) fail('error.unknownBranch', { name });
        const holder = state.worktrees.find((w) => w.branch === name);
        if (holder) fail('error.branchCheckedOut', { name, path: holder.path });
        if (!o.D && !isAncestor(state, b.tip, desk.head)) fail('error.branchNotMerged', { name });
        delete state.branches[name];
        ctx.emit('branch.deleted', { name, tip: b.tip });
      }
      return ctx.explain(o.D ? 'explain.branch.forceDelete' : 'explain.branch.delete', { name: ctx.args[0] });
    }
    if (!ctx.args.length) {
      ctx.markReadOnly();
      const branches = Object.keys(state.branches).sort().map((name) => {
        const holder = state.worktrees.find((w) => w.branch === name);
        return { name, tip: state.branches[name].tip, desk: holder ? holder.id : null, current: desk.branch === name };
      });
      ctx.output({ kind: 'branches', branches });
      return ctx.explain('explain.branch.list', { n: branches.length });
    }
    const [name, start] = ctx.args;
    requireCommit(ctx);
    validateNewBranch(ctx, name);
    const at = start ? rev(ctx, start).id : desk.head;
    createBranch(ctx, name, at, start || desk.branch);
    ctx.explain('explain.branch', { name });
  },
};
