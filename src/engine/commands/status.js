// git status — read only.
import { deskFiles, stagedPaths } from '../state.js';

export default {
  name: 'status',
  readOnly: true,
  run(ctx) {
    const desk = ctx.desk;
    const files = deskFiles(desk)
      .filter((f) => f.status !== 'clean')
      .map((f) => ({ path: f.path, status: f.status, staged: f.staged }));
    const branch = desk.branch ? ctx.state.branches[desk.branch] : null;
    ctx.output({
      kind: 'status',
      desk: desk.id,
      branch: desk.branch,
      head: desk.head,
      detached: !desk.branch,
      upstream: branch ? branch.upstream || null : null,
      op: desk.op ? desk.op.type : null,
      files,
      staged: stagedPaths(desk),
    });
    ctx.emit('status.shown', { desk: desk.id, paths: files.map((f) => f.path) });
    if (desk.op) ctx.explain('explain.status.op', { op: desk.op.type, n: files.length });
    else if (!files.length) ctx.explain('explain.status.clean', { branch: desk.branch || desk.head });
    else ctx.explain('explain.status', { n: files.length, staged: stagedPaths(desk).length });
  },
};
