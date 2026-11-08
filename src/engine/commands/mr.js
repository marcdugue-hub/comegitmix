// Merge requests (MR), on the hosting site. Two ways to act, same result:
//   - a click on the site:  { name: 'mr', args: ['approve' | 'merge' | 'close' | 'open', id], options }
//     (text form in content: parseWebAction('approve MR !42'); `open` takes { source, target, title?, … })
//   - the GitLab command line `glab mr …` (parse.js): create | list | view | approve | merge | close,
//     where the MR is given by its number or by its source branch (glab: "123" or "patch-1").
import { approveMr, mergeMr, openMr, findMr, getRemote } from '../remote.js';

const LIVE = ['open', 'approved'];

/** The MR named by a number (42, "42", "!42") or by its source branch; the live one first. */
export function resolveMr(state, ref) {
  if (ref === undefined || ref === null || ref === '') return null;
  const num = Number(String(ref).replace(/^!/, ''));
  if (Number.isInteger(num) && num > 0) return findMr(state, num).mr;
  const all = Object.values(state.remotes || {}).flatMap((r) => r.mrs || []).filter((m) => m.source === ref);
  return all.find((m) => LIVE.includes(m.status)) || all[all.length - 1] || null;
}

/** `glab mr approve|merge|close|view` without a number: the live MR of the current branch, as glab does. */
function target(ctx, ref) {
  const want = ref !== undefined && ref !== null && ref !== '' ? ref : ctx.desk.branch;
  const mr = resolveMr(ctx.state, want);
  if (!mr) {
    if (ref === undefined || ref === null || ref === '') ctx.fail('error.mrNoneForBranch', { branch: ctx.desk.branch || '' });
    ctx.fail('error.unknownMr', { id: String(ref).replace(/^!/, '') });
  }
  return mr.id;
}

function create(ctx) {
  const state = ctx.state;
  const o = ctx.options;
  const source = o.source || ctx.desk.branch;
  if (!source) ctx.fail('error.pushDetached', {});
  const remote = getRemote(state, 'origin');
  const targetBranch = o.target || 'main';
  if (!remote.branches[source]) {
    // glab pushes the branch first with --fill (or --push); otherwise it must already be online
    if (o.fill || o.push) ctx.run('push', ['origin', source], { u: true });
    else ctx.fail('error.mrPushFirst', { branch: source });
  }
  const live = (remote.mrs || []).find((m) => m.source === source && m.target === targetBranch && LIVE.includes(m.status));
  if (live) ctx.fail('error.mrAlreadyOpen', { id: live.id, branch: source });
  // no --title: like `glab mr create --fill`, the title is the message of the branch's last commit
  const tip = state.commits[state.branches[source] ? state.branches[source].tip : remote.branches[source].tip] || {};
  const given = typeof o.title === 'string' && o.title ? o.title : '';
  const mr = openMr(state, {
    source, target: targetBranch,
    title: given || tip.msg || (tip.msgKey ? '' : source),
    titleKey: given || tip.msg ? null : tip.msgKey || null,
    titleParams: given || tip.msg ? null : tip.msgParams || null,
  });
  ctx.emit('mr.opened', { id: mr.id, source: mr.source, target: mr.target });
  return ctx.explain('explain.mr.create', { id: mr.id, source: mr.source, target: mr.target });
}

export default {
  name: 'mr',
  run(ctx) {
    const [action, id] = ctx.args;
    const state = ctx.state;
    const cli = Boolean(ctx.command.cli);
    if (action === 'create') return create(ctx);
    if (action === 'list') {
      ctx.markReadOnly();
      const mrs = Object.values(state.remotes || {}).flatMap((r) => (r.mrs || []).map((m) => ({ ...m, remote: r.name })));
      const live = mrs.filter((m) => LIVE.includes(m.status));
      ctx.output({ kind: 'mrs', mrs: live });
      return ctx.explain(live.length ? 'explain.mr.list' : 'explain.mr.list.none', { n: live.length, ids: live.map((m) => `!${m.id}`).join(', ') });
    }
    if (action === 'view') {
      ctx.markReadOnly();
      const { mr } = findMr(state, target(ctx, id));
      ctx.output({ kind: 'mr', mr });
      return ctx.explain(`explain.mr.view.${mr.status}`, { id: mr.id, source: mr.source, target: mr.target });
    }
    if (action === 'open') {
      const mr = openMr(state, { id, ...ctx.options });
      ctx.emit('mr.opened', { id: mr.id, source: mr.source, target: mr.target });
      ctx.equivalent({ key: 'equiv.mr.open', params: { id: mr.id } });
      return ctx.explain('explain.mr.open', { id: mr.id, source: mr.source, target: mr.target });
    }
    const num = cli ? target(ctx, id) : id;
    if (action === 'approve') {
      const mr = approveMr(state, num);
      ctx.emit('mr.approved', { id: mr.id });
      if (!cli) ctx.equivalent({ key: 'equiv.mr.approve', params: { id: mr.id } });
      return ctx.explain('explain.mr.approve', { id: mr.id, target: mr.target });
    }
    if (action === 'merge') {
      const { mr, commit } = mergeMr(state, num);
      ctx.emit('mr.merged', { id: mr.id, commit, source: mr.source, target: mr.target });
      if (!cli) ctx.equivalent({ key: 'equiv.mr.merge', params: { id: mr.id } });
      return ctx.explain('explain.mr.merge', { id: mr.id, source: mr.source, target: mr.target });
    }
    if (action === 'close') {
      const { mr } = findMr(state, num);
      if (!mr) ctx.fail('error.unknownMr', { id: num });
      if (!LIVE.includes(mr.status)) ctx.fail('error.mrClosed', { id: mr.id, status: mr.status });
      mr.status = 'closed';
      ctx.emit('mr.closed', { id: mr.id });
      return ctx.explain('explain.mr.close', { id: mr.id });
    }
    return ctx.fail('error.unknownSubcommand', { command: cli ? 'glab mr' : 'mr', sub: action || '' });
  },
};
