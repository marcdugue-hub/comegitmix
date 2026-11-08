// git fetch [<remote>] [--all]: updates the remote-tracking refs (origin/<b>) without touching branches or folders.
import { fetchRemote, getRemote } from '../remote.js';

export default {
  name: 'fetch',
  run(ctx) {
    const state = ctx.state;
    const names = ctx.options.all ? Object.keys(state.remotes).sort() : [ctx.args[0] || 'origin'];
    if (!names.length) ctx.fail('error.noRemote', { name: 'origin' });
    const refs = [];
    for (const name of names) {
      getRemote(state, name);
      refs.push(...fetchRemote(state, name));
    }
    ctx.emit('fetch.done', { remote: names.join(', '), refs });
    if (!refs.length) {
      ctx.markReadOnly();
      return ctx.explain('explain.fetch.upToDate', { remote: names.join(', ') });
    }
    ctx.explain('explain.fetch', { remote: names.join(', '), n: refs.length, refs: refs.map((r) => r.ref).join(', ') });
  },
};
