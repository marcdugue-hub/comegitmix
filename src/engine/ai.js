// "Make the AI work" (docs/SANDBOX.md §4, docs/AUTHORING.md §7). Pure and deterministic: no randomness.
//
// Commands (objects, not Git):
//   { name: 'ai', args: [] | [desk], options: { files?: [paths], commit?: true, message?: string } }
//     The AI changes 1 to 3 files of the desk (or `files`, which may name new files), then by default stages
//     exactly those files and makes a commit marked AI. `message` is the commit message (the UI passes the
//     "what the AI did" text in the current language); without it the commit uses msgKey 'msg.aiWork' {files}.
//     result.output = { kind: 'ai', desk, files, textIndex, commit } — textIndex is a deterministic integer the UI
//     uses to pick a text from content/ai-work.<lang>.md (items[textIndex % items.length]) unless the step has ai-text.
//   { name: 'assistant', options: { topic? } }  "New assistant": git worktree add ../rpt-ia-<topic> -b ia/<topic>, then ai.
//   { name: 'ai-mr', args: [] | [desk], options: { title? } }  "The AI opens an MR": push the desk branch to origin, open an MR to main.

import { getDesk, deskFiles, setFile, editedContent, initialContent, deskTree, setDeskTree, folderName } from './state.js';
import { createCommit } from './commands/_shared.js';
import { openMr, publishBranch, getRemote } from './remote.js';

/** Topics proposed by "New assistant", in order (identifiers, not displayed text). */
export const AI_TOPICS = ['resume', 'chiffres', 'graphiques', 'sources', 'intro', 'plan', 'annexes', 'relecture'];

/**
 * Files the AI will change on a desk (deterministic): 1 to 3 tracked, editable files.
 * `seed` varies the choice from one call to the next (state.seq.ai).
 */
export function pickAiFiles(desk, seed) {
  const candidates = deskFiles(desk)
    .filter((f) => f.status !== 'conflict' && f.work !== null && f.base !== null)
    .map((f) => f.path)
    .sort();
  if (!candidates.length) return [];
  const n = Math.min(candidates.length, 1 + (seed % 3));
  const start = (seed * 7) % candidates.length;
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(candidates[(start + i) % candidates.length]);
  return out.sort();
}

function aiWork(ctx, desk, { files = null, commit = true, message = '' } = {}) {
  const state = ctx.state;
  state.seq.ai = (state.seq.ai || 0) + 1;
  const seed = state.seq.ai;
  const paths = files && files.length ? [...files] : pickAiFiles(desk, seed);
  if (!paths.length) ctx.fail('error.aiNothingToDo', { path: desk.path });
  for (const p of paths) {
    const f = deskFiles(desk).find((x) => x.path === p);
    if (f && f.status === 'conflict') ctx.fail('error.conflictChooseFirst', { file: p });
    if (f && f.work === null) ctx.fail('error.fileDeleted', { file: p });
    state.seq.edit += 1;
    const work = f ? editedContent(f.work, state.seq.edit, p) : initialContent(p);
    setFile(desk, p, { work });
  }
  let id = null;
  if (commit) {
    if (!desk.head && !desk.branch) ctx.fail('error.noCommitYet', {});
    if (desk.op) ctx.fail('error.operationInProgress', { op: desk.op.type });
    for (const p of paths) {
      const f = deskFiles(desk).find((x) => x.path === p);
      setFile(desk, p, { index: f.work });
    }
    const tree = deskTree(desk, 'index');
    id = createCommit(ctx, desk, {
      tree, parents: desk.head ? [desk.head] : [], msg: message || '', msgKey: message ? null : 'msg.aiWork', msgParams: message ? null : { files: paths.join(', ') }, author: 'ai',
    });
    setDeskTree(desk, tree, 'soft');
  }
  ctx.emit('ai.worked', { desk: desk.id, files: paths, commit: id });
  ctx.output({ kind: 'ai', desk: desk.id, files: paths, textIndex: seed - 1, commit: id });
  ctx.equivalent({ key: 'equiv.aiWork', params: { files: paths.join(', ') } });
  ctx.explain(commit ? 'explain.ai.commit' : 'explain.ai.work', { files: paths.join(', '), n: paths.length, branch: desk.branch || desk.head || '' });
  return { files: paths, commit: id };
}

export const aiCommand = {
  name: 'ai',
  run(ctx) {
    const desk = ctx.args[0] ? getDesk(ctx.state, ctx.args[0]) : ctx.desk;
    if (!desk) ctx.fail('error.unknownDesk', { path: ctx.args[0] });
    const o = ctx.options;
    const files = Array.isArray(o.files) ? o.files : typeof o.files === 'string' ? o.files.split(/[\s,]+/).filter(Boolean) : null;
    aiWork(ctx, desk, { files, commit: o.commit !== false, message: typeof o.message === 'string' ? o.message : '' });
  },
};

export const assistantCommand = {
  name: 'assistant',
  run(ctx) {
    const state = ctx.state;
    const used = (t) => state.branches[`ia/${t}`] || state.worktrees.some((w) => w.path === `rpt-ia-${t}`);
    const topic = ctx.options.topic || AI_TOPICS.find((t) => !used(t)) || `${AI_TOPICS[0]}-${Object.keys(state.branches).length}`;
    const main = state.worktrees.find((w) => w.main);
    const folder = `${folderName(main.path)}-ia-${topic}`.replace(/^rpt-client-ia-/, 'rpt-ia-');
    ctx.run('worktree', ['add', `../${folder}`], { b: `ia/${topic}` }, { desk: main.id });
    const desk = getDesk(state, folder);
    aiWork(ctx, desk, { commit: true, message: typeof ctx.options.message === 'string' ? ctx.options.message : '' });
    ctx.equivalent({ command: `git worktree add ../${folder} -b ia/${topic}` });
  },
};

export const aiMrCommand = {
  name: 'ai-mr',
  run(ctx) {
    const state = ctx.state;
    const desk = ctx.args[0] ? getDesk(state, ctx.args[0]) : ctx.desk;
    if (!desk) ctx.fail('error.unknownDesk', { path: ctx.args[0] });
    if (!desk.branch) ctx.fail('error.pushDetached', {});
    getRemote(state, 'origin');
    publishBranch(state, 'origin', desk.branch);
    const target = ctx.options.target || 'main';
    const title = typeof ctx.options.title === 'string' ? ctx.options.title : '';
    const mr = openMr(state, { source: desk.branch, target, title, titleKey: title ? null : 'mr.aiTitle', titleParams: title ? null : { branch: desk.branch } });
    ctx.emit('push.done', { remote: 'origin', branch: desk.branch, ref: `origin/${desk.branch}`, to: state.branches[desk.branch].tip });
    ctx.emit('mr.opened', { id: mr.id, source: mr.source, target: mr.target });
    ctx.equivalent({ command: `git push -u origin ${desk.branch}` });
    ctx.explain('explain.mr.aiOpen', { id: mr.id, branch: desk.branch, target });
  },
};
