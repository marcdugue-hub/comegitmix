// Scene action: click on a file of the tree (docs/SANDBOX.md §3.3).
// clean -> M (you edit it) -> staged (git add) -> clean (git restore --staged --worktree)
// U -> A (git add) -> U (git restore --staged)
// result.equivalent tells the interface which command to show.
import { findFile } from '../state.js';
import { fail } from './_shared.js';
import { deskAndPath } from './touch.js';

export default {
  name: 'click',
  run(ctx) {
    const { desk, path } = deskAndPath(ctx);
    if (!path) fail('error.missingArgument', { command: 'click' });
    const f = findFile(desk, path);
    if (!f) fail('error.unknownFile', { file: path });
    const extra = { desk: desk.id };
    if (f.status === 'conflict') fail('error.conflictChooseFirst', { file: path });
    if (f.status === 'clean') {
      ctx.run('touch', [path], {}, extra);
      return ctx.equivalent({ key: 'equiv.edit', params: { file: path } });
    }
    if (!f.staged) {
      ctx.run('add', [path], {}, extra);
      return ctx.equivalent({ command: `git add ${path}` });
    }
    if (f.status === 'U') {
      ctx.run('restore', [path], { staged: true }, extra);
      return ctx.equivalent({ command: `git restore --staged ${path}` });
    }
    ctx.run('restore', [path], { staged: true, worktree: true }, extra);
    return ctx.equivalent({ command: `git restore --staged --worktree ${path}` });
  },
};
