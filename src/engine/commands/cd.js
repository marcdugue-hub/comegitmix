// Shell: cd ../<folder> — changes the active desk.
import { getDesk, folderName } from '../state.js';
import { fail } from './_shared.js';

export default {
  name: 'cd',
  run(ctx) {
    const target = ctx.args[0];
    if (!target || target === '..' || target === '.') fail('error.missingArgument', { command: 'cd' });
    const w = getDesk(ctx.state, target);
    if (!w) fail('error.unknownDesk', { path: folderName(target) });
    if (ctx.state.active === w.id) return ctx.explain('explain.cd.already', { path: w.path });
    const from = ctx.state.active;
    ctx.state.active = w.id;
    ctx.emit('desk.activated', { id: w.id, from });
    ctx.explain('explain.cd', { path: w.path, branch: w.branch || w.head });
  },
};
