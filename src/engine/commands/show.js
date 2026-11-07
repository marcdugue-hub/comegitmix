// git show [<commit>] — read only: the commit and what it changed.
import { commitTree } from '../state.js';
import { diffTrees } from '../diff.js';
import { rev, requireCommit } from './_shared.js';

export default {
  name: 'show',
  readOnly: true,
  run(ctx) {
    requireCommit(ctx);
    const label = ctx.args[0] || 'HEAD';
    const id = rev(ctx, label).id;
    const c = ctx.state.commits[id];
    const files = diffTrees(commitTree(ctx.state, c.parents[0] || null), c.tree);
    ctx.output({ kind: 'show', commit: { id, parents: c.parents, msg: c.msg, msgKey: c.msgKey || null, msgParams: c.msgParams || null, author: c.author }, files });
    ctx.emit('commit.shown', { id });
    ctx.explain('explain.show', { id, n: files.length });
  },
};
