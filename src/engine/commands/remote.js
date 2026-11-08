// git remote [-v]: lists the online repositories (read only).
export default {
  name: 'remote',
  readOnly: true,
  run(ctx) {
    const remotes = Object.values(ctx.state.remotes || {}).map((r) => ({ name: r.name, forkOf: r.forkOf || null, branches: Object.keys(r.branches).sort() }));
    ctx.output({ kind: 'remotes', remotes, verbose: Boolean(ctx.options.v || ctx.options.verbose) });
    ctx.emit('remote.listed', { names: remotes.map((r) => r.name) });
    ctx.explain(remotes.length ? 'explain.remote' : 'explain.remote.none', { n: remotes.length, names: remotes.map((r) => r.name).join(', ') });
  },
};
