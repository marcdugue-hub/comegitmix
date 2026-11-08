// git push [-u] [--force | --force-with-lease] [<remote> [<branch>]]
// Rejected (error.pushRejected) when the remote branch has moved ahead, unless forced.
import { getRemote, copyCommits, ancestorsIn } from '../remote.js';
import { requireCommit } from './_shared.js';

export default {
  name: 'push',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    const upstream = desk.branch && state.branches[desk.branch] ? state.branches[desk.branch].upstream : null;
    const remoteName = ctx.args[0] || (upstream ? upstream.split('/')[0] : 'origin');
    let branch = ctx.args[1] || desk.branch;
    if (branch === 'HEAD') branch = desk.branch;
    const remote = getRemote(state, remoteName);
    requireCommit(ctx);
    if (!branch || !state.branches[branch]) ctx.fail(branch ? 'error.unknownBranch' : 'error.pushDetached', { name: branch || '' });
    const tip = state.branches[branch].tip;
    const prev = remote.branches[branch] ? remote.branches[branch].tip : null;
    const force = Boolean(o.force || o.f || o['force-with-lease']);
    const ref = `${remoteName}/${branch}`;
    if (prev === tip) {
      if (o.u || o['set-upstream']) state.branches[branch].upstream = ref;
      if (!(o.u || o['set-upstream'])) ctx.markReadOnly();
      return ctx.explain('explain.push.upToDate', { ref, branch });
    }
    copyCommits(state.commits, remote.commits, tip);
    const ahead = !prev || ancestorsIn(remote.commits, tip).has(prev);
    if (!ahead && !force) ctx.fail('error.pushRejected', { ref, branch });
    remote.branches[branch] = { tip };
    if (remoteName === 'origin' || state.remoteRefs[ref]) state.remoteRefs[ref] = { tip };
    if (o.u || o['set-upstream'] || !state.branches[branch].upstream) state.branches[branch].upstream = ref;
    ctx.emit('push.done', { remote: remoteName, branch, ref, from: prev, to: tip, forced: !ahead });
    if (!ahead) {
      ctx.warn('warn.forcePush', { ref });
      return ctx.explain('explain.push.force', { ref, branch });
    }
    ctx.explain(prev ? 'explain.push' : 'explain.push.new', { ref, branch });
  },
};
