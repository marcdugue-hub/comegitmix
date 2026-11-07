// git blame <file> — read only: who (human or AI) wrote each line of the last committed version.
import { commitTree, firstParentChain } from '../state.js';
import { fail, requireCommit } from './_shared.js';

export default {
  name: 'blame',
  readOnly: true,
  run(ctx) {
    const desk = ctx.desk;
    const path = ctx.args[0];
    if (!path) fail('error.missingArgument', { command: 'git blame' });
    requireCommit(ctx);
    const tree = commitTree(ctx.state, desk.head);
    if (!(path in tree)) fail('error.unknownFile', { file: path });
    const chain = firstParentChain(ctx.state, desk.head);
    const lines = tree[path].split('\n').map((text, i) => {
      let owner = chain[0];
      for (const id of chain) {
        const t = ctx.state.commits[id].tree;
        if (path in t && t[path].split('\n').includes(text)) owner = id;
        else break;
      }
      return { n: i + 1, text, commit: owner, author: ctx.state.commits[owner].author };
    });
    ctx.output({ kind: 'blame', path, lines });
    ctx.emit('blame.shown', { desk: desk.id, path });
    ctx.explain('explain.blame', { file: path, ai: lines.filter((l) => l.author === 'ai').length, n: lines.length });
  },
};
