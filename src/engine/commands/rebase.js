// git rebase <upstream> | rebase -i <base> (plan) | --continue | --abort
// Interactive plan: command.options.plan = [{ id, action: pick|reword|squash|fixup|drop, msg? }] (in the new order)
// or a list of actions ['pick','squash',…] applied to the commits oldest first;
// otherwise state.rebasePlan (set by @rebase-plan, consumed), otherwise "pick the first, squash the rest".
import { isAncestor, commitTree, setDeskTree, commitsBetween, firstParentChain, deskLabel } from '../state.js';
import { fail, rev, requireNoOp, requireCommit, moveHead, requireCleanForRewrite, runReplay, continueReplay, abortOp } from './_shared.js';

const ACTIONS = new Set(['pick', 'reword', 'squash', 'fixup', 'drop']);

function buildPlan(ctx, commits) {
  let plan = ctx.options.plan || ctx.state.rebasePlan || null;
  if (typeof plan === 'string') plan = plan.split(',').map((s) => s.trim()).filter(Boolean);
  if (!plan) return commits.map((id, i) => ({ id, action: i === 0 ? 'pick' : 'squash' }));
  if (!Array.isArray(plan) || !plan.length) fail('error.rebasePlanInvalid', { n: commits.length });
  if (typeof plan[0] === 'string') {
    if (plan.length !== commits.length) fail('error.rebasePlanInvalid', { n: commits.length });
    return plan.map((action, i) => {
      if (!ACTIONS.has(action)) fail('error.rebasePlanInvalid', { n: commits.length });
      return { id: commits[i], action };
    });
  }
  const ids = new Set(commits);
  const seen = new Set();
  for (const step of plan) {
    if (!step || !ids.has(step.id) || seen.has(step.id) || !ACTIONS.has(step.action)) fail('error.rebasePlanInvalid', { n: commits.length });
    seen.add(step.id);
  }
  if (seen.size !== ids.size) fail('error.rebasePlanInvalid', { n: commits.length });
  return plan.map((s) => ({ id: s.id, action: s.action, msg: typeof s.msg === 'string' ? s.msg : undefined }));
}

function start(ctx, desk, ontoId, steps, extra) {
  desk.op = {
    type: 'rebase', branch: desk.branch, origHead: desk.head, onto: ontoId,
    old: steps.map((s) => s.id), remaining: steps, replayed: [], current: null, squashed: 0, dropped: 0, ...extra,
  };
  ctx.emit('op.started', { desk: desk.id, op: 'rebase', onto: ontoId });
  moveHead(ctx, desk, ontoId, { reason: 'rebase' });
  setDeskTree(desk, commitTree(ctx.state, ontoId), 'hard');
  const op = desk.op;
  runReplay(ctx, desk);
  return op;
}

function conflictFile(desk) {
  const f = desk.files.find((x) => x.status === 'conflict');
  return f ? f.path : '';
}

function explainDone(ctx, op) {
  if (!op.finished) return ctx.explain('explain.rebase.conflict', { name: op.ontoLabel, file: conflictFile(ctx.desk) });
  if (op.interactive) {
    if (op.squashed) return ctx.explain('explain.squash', { n: op.squashed + 1, branch: op.branch });
    return ctx.explain('explain.rebase.interactive', { branch: op.branch, n: op.replayed.length });
  }
  return ctx.explain('explain.rebase', { branch: op.branch || op.origHead, name: op.ontoLabel, n: op.replayed.length });
}

export default {
  name: 'rebase',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.desk;
    const o = ctx.options;
    if (o.abort) {
      abortOp(ctx, desk, 'rebase');
      return ctx.explain('explain.rebase.abort', {});
    }
    if (o.continue) {
      if (!desk.op || desk.op.type !== 'rebase') fail('error.noOperation', { op: 'rebase' });
      const op = desk.op;
      continueReplay(ctx, desk);
      return explainDone(ctx, op);
    }
    requireNoOp(ctx);
    requireCommit(ctx);
    requireCleanForRewrite(ctx);
    const interactive = Boolean(o.i || o.interactive);
    if (!ctx.args[0]) fail('error.missingArgument', { command: interactive ? 'git rebase -i' : 'git rebase' });
    const target = rev(ctx, ctx.args[0]);
    const label = ctx.args[0];
    if (interactive) {
      const commits = commitsBetween(state, target.id, desk.head);
      if (!commits.length) fail('error.nothingToRebase', {});
      const chain = new Set(firstParentChain(state, desk.head));
      if (commits.some((c) => !chain.has(c) || state.commits[c].parents.length > 1) || !isAncestor(state, target.id, desk.head)) {
        fail('error.rebaseMerges', {});
      }
      const steps = buildPlan(ctx, commits);
      state.rebasePlan = null;
      return explainDone(ctx, start(ctx, desk, target.id, steps, { interactive: true, oursLabel: label, theirsLabel: deskLabel(desk), ontoLabel: label }));
    }
    if (desk.head === target.id || isAncestor(state, target.id, desk.head)) {
      ctx.markReadOnly();
      return ctx.explain('explain.rebase.upToDate', { name: label });
    }
    if (isAncestor(state, desk.head, target.id)) {
      moveHead(ctx, desk, target.id, { reason: 'fast-forward' });
      setDeskTree(desk, commitTree(state, target.id), 'hard');
      return ctx.explain('explain.rebase.ff', { name: label, branch: deskLabel(desk) });
    }
    const commits = commitsBetween(state, target.id, desk.head).filter((c) => state.commits[c].parents.length < 2);
    const steps = commits.map((id) => ({ id, action: 'pick' }));
    return explainDone(ctx, start(ctx, desk, target.id, steps, { interactive: false, oursLabel: label, theirsLabel: deskLabel(desk), ontoLabel: label }));
  },
};
