// git pull [<remote>] [<branch>] = fetch + merge of the tracked remote branch (fast-forward when possible).
import { fetchRemote, getRemote } from '../remote.js';
import { requireNoOp, requireCommit } from './_shared.js';

export default {
  name: 'pull',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    requireNoOp(ctx);
    requireCommit(ctx);
    if (!desk.branch) ctx.fail('error.pullDetached', {});
    const upstream = state.branches[desk.branch] && state.branches[desk.branch].upstream;
    const remoteName = ctx.args[0] || (upstream ? upstream.split('/')[0] : 'origin');
    const branch = ctx.args[1] || (upstream && !ctx.args[0] ? upstream.slice(remoteName.length + 1) : desk.branch);
    const remote = getRemote(state, remoteName);
    if (!remote.branches[branch]) ctx.fail('error.unknownRemoteBranch', { name: `${remoteName}/${branch}` });
    const refs = fetchRemote(state, remoteName);
    ctx.emit('fetch.done', { remote: remoteName, refs });
    const ref = `${remoteName}/${branch}`;
    if (!state.branches[desk.branch].upstream && remoteName === 'origin') state.branches[desk.branch].upstream = ref;
    const before = desk.head;
    ctx.run('merge', [ref], {}, { desk: desk.id });
    ctx.emit('pull.done', { desk: desk.id, ref, from: before, to: desk.head });
    if (desk.op) return ctx.explain('explain.pull.conflict', { ref, branch: desk.branch, file: (desk.files.find((f) => f.status === 'conflict') || {}).path || '' });
    if (before === desk.head) return ctx.explain('explain.pull.upToDate', { ref, branch: desk.branch });
    return ctx.explain('explain.pull', { ref, branch: desk.branch });
  },
};
