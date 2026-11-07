// Scene action (not Git): the "+" button drops a new file.
// { name: 'create', args: [] | [folder] | [desk, folder], options: { path?, prefix?, content?, status? } }
// Default name: "<prefix>-N.md" (prefix "nouveau"), the lowest free N in that folder. Status U.
// options.status 'clean' creates a tracked, unchanged file (used by setup: @files).
import { findFile, getDesk, setFile, initialContent } from '../state.js';
import { fail } from './_shared.js';

export default {
  name: 'create',
  run(ctx) {
    let desk = ctx.desk;
    let folder = null;
    if (ctx.args.length >= 2) {
      desk = getDesk(ctx.state, ctx.args[0]);
      if (!desk) fail('error.unknownDesk', { path: ctx.args[0] });
      folder = ctx.args[1];
    } else if (ctx.args.length === 1) {
      const asDesk = !ctx.args[0].includes('/') && ctx.state.worktrees.find((w) => w.id === ctx.args[0] || w.path === ctx.args[0]);
      if (asDesk) desk = asDesk;
      else folder = ctx.args[0];
    }
    folder = folder ? folder.replace(/^\.\//, '').replace(/\/$/, '') : '';
    let path = ctx.options.path;
    if (!path) {
      const prefix = ctx.options.prefix || 'nouveau';
      let n = 1;
      const at = (k) => (folder ? `${folder}/${prefix}-${k}.md` : `${prefix}-${k}.md`);
      while (findFile(desk, at(n))) n += 1;
      path = at(n);
    }
    if (findFile(desk, path)) fail('error.fileExists', { file: path });
    if (desk.files.some((f) => f.kind === 'file' && f.path.startsWith(`${path}/`))) fail('error.fileExists', { file: path });
    const content = typeof ctx.options.content === 'string' ? ctx.options.content : initialContent(path);
    if (ctx.options.status === 'clean') setFile(desk, path, { base: content, index: content, work: content });
    else setFile(desk, path, { base: null, index: null, work: content });
    ctx.equivalent({ key: 'equiv.newFile', params: { file: path } });
    ctx.output({ kind: 'created', desk: desk.id, path });
    ctx.explain('explain.create', { file: path });
  },
};
