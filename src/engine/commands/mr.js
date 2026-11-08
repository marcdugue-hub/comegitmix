// Site actions on a merge request (not Git): { name: 'mr', args: ['approve' | 'merge' | 'close' | 'open', id], options }
// open: options { source, target, title?, titleKey?, titleParams?, comments?, remote? }. Text form: parseWebAction('approve MR !42').
import { approveMr, mergeMr, openMr, findMr } from '../remote.js';

export default {
  name: 'mr',
  run(ctx) {
    const [action, id] = ctx.args;
    const state = ctx.state;
    if (action === 'open') {
      const mr = openMr(state, { id, ...ctx.options });
      ctx.emit('mr.opened', { id: mr.id, source: mr.source, target: mr.target });
      ctx.equivalent({ key: 'equiv.mr.open', params: { id: mr.id } });
      return ctx.explain('explain.mr.open', { id: mr.id, source: mr.source, target: mr.target });
    }
    if (action === 'approve') {
      const mr = approveMr(state, id);
      ctx.emit('mr.approved', { id: mr.id });
      ctx.equivalent({ key: 'equiv.mr.approve', params: { id: mr.id } });
      return ctx.explain('explain.mr.approve', { id: mr.id, target: mr.target });
    }
    if (action === 'merge') {
      const { mr, commit } = mergeMr(state, id);
      ctx.emit('mr.merged', { id: mr.id, commit, source: mr.source, target: mr.target });
      ctx.equivalent({ key: 'equiv.mr.merge', params: { id: mr.id } });
      return ctx.explain('explain.mr.merge', { id: mr.id, source: mr.source, target: mr.target });
    }
    if (action === 'close') {
      const { mr } = findMr(state, id);
      if (!mr) ctx.fail('error.unknownMr', { id });
      mr.status = 'closed';
      ctx.emit('mr.closed', { id: mr.id });
      return ctx.explain('explain.mr.close', { id: mr.id });
    }
    return ctx.fail('error.unknownSubcommand', { command: 'mr', sub: action || '' });
  },
};
