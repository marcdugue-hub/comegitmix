// Site action (shell word): fork [<source> [<fork>]] — origin becomes your online copy of upstream.
import { forkRemote } from '../remote.js';

export default {
  name: 'fork',
  run(ctx) {
    const from = ctx.args[0] || 'upstream';
    const to = ctx.args[1] || 'origin';
    forkRemote(ctx.state, from, to);
    ctx.emit('fork.created', { from, to });
    ctx.equivalent({ key: 'equiv.fork', params: { from, to } });
    ctx.explain('explain.fork', { from, to });
  },
};
