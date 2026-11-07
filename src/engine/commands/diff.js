// git diff | diff --staged | diff <a> <b> | diff <a>..<b> | diff <a>...<b> | diff <a> | diff -- <file>
import { resolveRev, findFile } from '../state.js';
import { diff as computeDiff } from '../diff.js';
import { fail } from './_shared.js';

export default {
  name: 'diff',
  readOnly: true,
  run(ctx) {
    const desk = ctx.desk;
    const o = ctx.options;
    const isFile = (a) => !resolveRev(ctx.state, desk, a) && !/\.\./.test(a) && (findFile(desk, a) || desk.files.some((f) => f.path.startsWith(`${a}/`)));
    const revs = [];
    const paths = [];
    for (const a of ctx.args) {
      if (isFile(a)) paths.push(a.replace(/\/$/, ''));
      else revs.push(a);
    }
    let query;
    let key;
    let params = {};
    if (o.staged) {
      query = { mode: 'staged' };
      key = 'explain.diff.staged';
    } else if (!revs.length) {
      query = { mode: 'work' };
      key = 'explain.diff.work';
    } else if (revs.length === 1 && revs[0].includes('...')) {
      const [a, b] = revs[0].split('...');
      query = { mode: 'branches', a: a || 'HEAD', b: b || 'HEAD', threeDot: true };
      key = 'explain.diff.threeDot';
      params = { a: a || 'HEAD', b: b || 'HEAD' };
    } else if (revs.length === 1 && revs[0].includes('..')) {
      const [a, b] = revs[0].split('..');
      query = { mode: 'branches', a: a || 'HEAD', b: b || 'HEAD' };
      key = 'explain.diff.branches';
      params = { a: a || 'HEAD', b: b || 'HEAD' };
    } else if (revs.length === 1) {
      query = { mode: 'branches', a: revs[0] };
      key = 'explain.diff.folder';
      params = { a: revs[0] };
    } else {
      query = { mode: 'branches', a: revs[0], b: revs[1] };
      key = 'explain.diff.branches';
      params = { a: revs[0], b: revs[1] };
    }
    const paths2 = paths.length ? paths.flatMap((p) => (findFile(desk, p) ? [p] : desk.files.filter((f) => f.kind === 'file' && f.path.startsWith(`${p}/`)).map((f) => f.path))) : null;
    const result = computeDiff(ctx.state, { ...query, worktreeId: desk.id, paths: paths2 });
    if (result.error) fail(result.error.key, result.error.params);
    ctx.output({ kind: 'diff', ...result });
    ctx.emit('diff.shown', { desk: desk.id, mode: result.mode, threeDot: result.threeDot, files: result.files.map((f) => f.path) });
    const untracked = result.files.filter((f) => f.untracked).map((f) => f.path);
    if (!result.files.length) ctx.explain(`${key}.empty`, params);
    else ctx.explain(key, { ...params, n: result.files.length, untracked: untracked.join(', ') });
  },
};
