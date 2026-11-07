// git log [<rev>] [--oneline] [--graph] — read only, newest first.
import { ancestors, byCommitOrder } from '../state.js';
import { rev } from './_shared.js';

export default {
  name: 'log',
  readOnly: true,
  run(ctx) {
    const desk = ctx.desk;
    if (!desk.head && !ctx.args[0]) {
      ctx.output({ kind: 'log', head: null, commits: [] });
      return ctx.explain('explain.log.empty', {});
    }
    const start = ctx.args[0] ? rev(ctx, ctx.args[0]).id : desk.head;
    const ids = [...ancestors(ctx.state, start)].sort(byCommitOrder).reverse();
    const commits = ids.map((id) => {
      const c = ctx.state.commits[id];
      return { id, parents: c.parents, msg: c.msg, msgKey: c.msgKey || null, msgParams: c.msgParams || null, author: c.author, files: c.files };
    });
    ctx.output({ kind: 'log', head: start, oneline: Boolean(ctx.options.oneline), graph: Boolean(ctx.options.graph), commits });
    ctx.emit('log.shown', { desk: desk.id, ids });
    ctx.explain('explain.log', { n: ids.length, branch: ctx.args[0] || desk.branch || desk.head });
  },
};
