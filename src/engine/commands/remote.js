// git remote [-v]: lists the online repositories (read only).
// git remote add <name> <url>: links a repository already created online (gh repo create, or the site).
import { REMOTE_NAMES } from '../remote.js';

function add(ctx) {
  const state = ctx.state;
  const [, name, url] = ctx.args;
  if (!name || !url) ctx.fail('error.missingArgument', { command: 'remote add' });
  if (!REMOTE_NAMES.includes(name)) ctx.fail('error.unknownRemote', { name });
  const remote = (state.remotes || {})[name];
  if (remote && !remote.pending) ctx.fail('error.remoteExists', { name });
  if (!remote) ctx.fail('error.remoteNotCreated', { name, url });
  delete remote.pending;
  remote.url = url;
  if (!state.visibleRepos.includes(name)) state.visibleRepos.push(name);
  ctx.emit('remote.linked', { name, url });
  ctx.explain('explain.remote.add', { name, url });
}

export default {
  name: 'remote',
  run(ctx) {
    const sub = ctx.args[0];
    if (sub === 'add') return add(ctx);
    if (sub !== undefined) ctx.fail('error.remoteSubcommand', { sub });
    ctx.markReadOnly();
    const remotes = Object.values(ctx.state.remotes || {}).filter((r) => !r.pending)
      .map((r) => ({ name: r.name, url: r.url || null, forkOf: r.forkOf || null, branches: Object.keys(r.branches).sort() }));
    ctx.output({ kind: 'remotes', remotes, verbose: Boolean(ctx.options.v || ctx.options.verbose) });
    ctx.emit('remote.listed', { names: remotes.map((r) => r.name) });
    ctx.explain(remotes.length ? 'explain.remote' : 'explain.remote.none', { n: remotes.length, names: remotes.map((r) => r.name).join(', ') });
  },
};
