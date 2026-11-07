// git stash [push] | stash list | stash pop | stash apply | stash drop  (one stash per desk)
import { deskFiles, setFile, removeFile, commitTree, findFile, deskLabel } from '../state.js';
import { findBlock } from '../conflicts.js';
import { fail, conflictWarning } from './_shared.js';

function pickEntry(ctx, desk) {
  if (!desk.stash.length) fail('error.stashEmpty', {});
  const ref = ctx.args[1];
  let i = desk.stash.length - 1;
  if (ref) {
    const m = /^stash@\{(\d+)\}$/.exec(ref) || /^(\d+)$/.exec(ref);
    if (!m || Number(m[1]) >= desk.stash.length) fail('error.unknownStash', { ref });
    i = desk.stash.length - 1 - Number(m[1]);
  }
  return i;
}

function push(ctx, desk) {
  if (deskFiles(desk).some((f) => f.status === 'conflict')) fail('error.conflictUnresolved', { file: deskFiles(desk).find((f) => f.status === 'conflict').path });
  const changes = deskFiles(desk).filter((f) => f.status !== 'clean' && !(f.base === null && f.index === null));
  if (!changes.length) fail('error.nothingToStash', {});
  if (!desk.head) fail('error.noCommitYet', {});
  ctx.state.seq.stash += 1;
  const entry = {
    id: `s${ctx.state.seq.stash}`,
    branch: desk.branch,
    head: desk.head,
    msg: typeof ctx.options.m === 'string' ? ctx.options.m : null,
    files: changes.map((f) => ({ path: f.path, base: f.base, index: f.index, work: f.work })),
  };
  desk.stash.push(entry);
  for (const f of changes) {
    if (f.base === null) removeFile(desk, f.path);
    else setFile(desk, f.path, { index: f.base, work: f.base });
  }
  ctx.emit('stash.pushed', { desk: desk.id, id: entry.id, paths: entry.files.map((f) => f.path) });
  ctx.explain('explain.stash.push', { n: entry.files.length, files: entry.files.map((f) => f.path).join(', ') });
}

function bringBack(ctx, desk, drop) {
  const i = pickEntry(ctx, desk);
  const entry = desk.stash[i];
  const blocked = entry.files.filter((ef) => {
    const f = findFile(desk, ef.path);
    return f && f.status !== 'clean';
  }).map((ef) => ef.path);
  if (blocked.length) fail('error.stashWouldOverwrite', { files: blocked.join(', '), file: blocked[0], n: blocked.length });
  const headTree = commitTree(ctx.state, desk.head);
  const conflicts = [];
  for (const ef of entry.files) {
    const cur = ef.path in headTree ? headTree[ef.path] : null;
    if (cur !== ef.base && cur !== ef.work) {
      const oursLabel = deskLabel(desk);
      const block = findBlock(ctx.state, ef.path, oursLabel, 'stash');
      conflicts.push({ path: ef.path });
      setFile(desk, ef.path, {
        base: cur, index: cur, work: cur !== null ? cur : ef.work,
        conflict: { oursLabel, theirsLabel: 'stash', ours: cur, theirs: ef.work, detailed: Boolean(block), resolved: null, added: false },
      });
      continue;
    }
    setFile(desk, ef.path, { base: cur, index: ef.base === null ? ef.index : cur, work: ef.work });
  }
  if (conflicts.length) {
    conflictWarning(ctx, desk, conflicts, 'stash');
    ctx.explain('explain.stash.conflict', { file: conflicts[0].path });
    return;
  }
  if (drop) desk.stash.splice(i, 1);
  ctx.emit(drop ? 'stash.popped' : 'stash.applied', { desk: desk.id, id: entry.id, paths: entry.files.map((f) => f.path) });
  ctx.explain(drop ? 'explain.stash.pop' : 'explain.stash.apply', { n: entry.files.length, files: entry.files.map((f) => f.path).join(', ') });
}

export default {
  name: 'stash',
  run(ctx) {
    const desk = ctx.desk;
    const sub = ctx.args[0] || 'push';
    if (sub === 'push' || sub === 'save') return push(ctx, desk);
    if (sub === 'pop') return bringBack(ctx, desk, true);
    if (sub === 'apply') return bringBack(ctx, desk, false);
    if (sub === 'drop') {
      const i = pickEntry(ctx, desk);
      const [entry] = desk.stash.splice(i, 1);
      ctx.emit('stash.dropped', { desk: desk.id, id: entry.id });
      return ctx.explain('explain.stash.drop', { n: entry.files.length });
    }
    if (sub === 'list') {
      ctx.markReadOnly();
      ctx.output({ kind: 'stash', desk: desk.id, entries: [...desk.stash].reverse().map((e, n) => ({ ref: `stash@{${n}}`, ...e })) });
      return ctx.explain('explain.stash.list', { n: desk.stash.length });
    }
    return fail('error.unknownSubcommand', { command: 'git stash', sub });
  },
};
