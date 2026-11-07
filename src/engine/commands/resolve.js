// Scene action: resolve a conflicted file. { name: 'resolve', args: [path, side] | [desk, path, side] }
// side: 'ours' | 'theirs' | 'both', or one of the two branch names of the conflict.
// The file leaves the conflict status and becomes M; then git add + git commit (or rebase --continue).
import { findFile, getDesk } from '../state.js';
import { normalizeSide, resolveFile } from '../conflicts.js';
import { fail } from './_shared.js';

export default {
  name: 'resolve',
  run(ctx) {
    let desk = ctx.desk;
    let [path, side] = ctx.args;
    if (ctx.args.length >= 3) {
      desk = getDesk(ctx.state, ctx.args[0]);
      if (!desk) fail('error.unknownDesk', { path: ctx.args[0] });
      [, path, side] = ctx.args;
    }
    side = side || ctx.options.side;
    if (!path || !side) fail('error.missingArgument', { command: 'resolve' });
    const f = findFile(desk, path);
    if (!f) fail('error.unknownFile', { file: path });
    if (!f.conflict) fail('error.notInConflict', { file: path });
    const s = normalizeSide(f, side);
    if (!s) fail('error.invalidSide', { side, ours: f.conflict.oursLabel, theirs: f.conflict.theirsLabel });
    resolveFile(ctx.state, desk, path, s);
    const label = s === 'ours' ? f.conflict.oursLabel : s === 'theirs' ? f.conflict.theirsLabel : 'both';
    if (s === 'both') ctx.equivalent({ key: 'equiv.edit', params: { file: path } });
    else ctx.equivalent({ command: `git checkout --${s} ${path}` });
    ctx.emit('conflict.resolved', { desk: desk.id, path, side: s, label });
    ctx.explain(s === 'both' ? 'explain.resolve.both' : 'explain.resolve', { file: path, side: label });
  },
};
