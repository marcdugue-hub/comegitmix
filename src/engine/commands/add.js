// git add <path…> | git add . | git add -A
import { findFile, deskFiles, setFile } from '../state.js';
import { fail } from './_shared.js';

/** Expands "." / folders / paths into file entries of the desk. */
export function selectFiles(ctx, desk, args, { all = false } = {}) {
  const files = deskFiles(desk);
  if (all || args.includes('.') || args.includes('*')) return files;
  const out = [];
  for (const a of args) {
    const p = a.replace(/^\.\//, '').replace(/\/$/, '');
    const f = findFile(desk, p);
    if (f) {
      out.push(f);
      continue;
    }
    const inside = files.filter((x) => x.path.startsWith(`${p}/`));
    if (!inside.length) fail('error.unknownFile', { file: a });
    out.push(...inside);
  }
  return out;
}

export default {
  name: 'add',
  run(ctx) {
    const desk = ctx.desk;
    const all = Boolean(ctx.options.A || ctx.options.all);
    if (!all && !ctx.args.length) fail('error.missingArgument', { command: 'git add' });
    const files = selectFiles(ctx, desk, ctx.args, { all });
    const blocked = files.find((f) => f.status === 'conflict');
    if (blocked) fail('error.conflictChooseFirst', { file: blocked.path });
    const changed = [];
    for (const f of files) {
      if (f.conflict && f.conflict.resolved) {
        f.conflict = { ...f.conflict, added: true };
        setFile(desk, f.path, { index: f.work });
        changed.push(f.path);
        continue;
      }
      if (f.index === f.work) continue;
      setFile(desk, f.path, { index: f.work });
      changed.push(f.path);
    }
    if (!changed.length) ctx.explain('explain.add.nothing', {});
    else if (changed.length === 1) ctx.explain('explain.add', { file: changed[0] });
    else ctx.explain('explain.add.many', { n: changed.length, files: changed.join(', ') });
  },
};
