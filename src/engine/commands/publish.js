// Setup-only actions (directives of docs/AUTHORING.md §3.2), exposed as commands so they go through apply():
//   { name: 'publish', args: ['origin' | 'upstream'] }  -> @remote <name>
//   { name: 'online-only', args: [branch] }             -> @online-only <branch>
import { publishAll, onlineOnly } from '../remote.js';

export const publish = {
  name: 'publish',
  run(ctx) {
    const name = ctx.args[0] || 'origin';
    publishAll(ctx.state, name);
    ctx.emit('remote.published', { name });
  },
};

export const onlineOnlyCmd = {
  name: 'online-only',
  run(ctx) {
    onlineOnly(ctx.state, ctx.args[0]);
    ctx.emit('branch.deleted', { name: ctx.args[0], tip: null });
  },
};
