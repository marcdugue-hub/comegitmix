// rm <f> (shell: the file is deleted in the folder) | git rm <f> (deletion also staged).
import { removeFile, setFile } from '../state.js';
import { fail } from './_shared.js';
import { selectFiles } from './add.js';

export default {
  name: 'rm',
  run(ctx) {
    const desk = ctx.desk;
    if (!ctx.args.length) fail('error.missingArgument', { command: ctx.command.git ? 'git rm' : 'rm' });
    const files = selectFiles(ctx, desk, ctx.args);
    for (const f of files) {
      if (f.status === 'conflict') fail('error.conflictChooseFirst', { file: f.path });
      if (f.base === null) removeFile(desk, f.path);
      else setFile(desk, f.path, ctx.command.git ? { work: null, index: null } : { work: null });
    }
    ctx.explain(ctx.command.git ? 'explain.rm.git' : 'explain.rm', { file: files[0].path, n: files.length });
  },
};
