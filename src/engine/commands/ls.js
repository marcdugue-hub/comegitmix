// Shell: ls — lists the active folder (read only).
export default {
  name: 'ls',
  readOnly: true,
  run(ctx) {
    const top = ctx.desk.files.filter((f) => !f.path.includes('/')).map((f) => ({ path: f.path, kind: f.kind, status: f.status || null }));
    ctx.output({ kind: 'ls', desk: ctx.desk.id, entries: top });
    ctx.explain('explain.ls', { path: ctx.desk.path, n: top.length });
  },
};
