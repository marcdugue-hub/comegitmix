// Scene action (not Git): "I worked on this file". { name: 'touch', args: [path] | [desk, path], options: { content? } }
// clean -> M (generated content, or options.content). Also used by setup (@work, @content).
import { findFile, getDesk, setFile, editedContent } from '../state.js';
import { fail } from './_shared.js';

export function deskAndPath(ctx) {
  if (ctx.args.length >= 2) {
    const desk = getDesk(ctx.state, ctx.args[0]);
    if (!desk) fail('error.unknownDesk', { path: ctx.args[0] });
    return { desk, path: ctx.args[1] };
  }
  return { desk: ctx.desk, path: ctx.args[0] };
}

export default {
  name: 'touch',
  run(ctx) {
    const { desk, path } = deskAndPath(ctx);
    if (!path) fail('error.missingArgument', { command: 'touch' });
    const f = findFile(desk, path);
    const content = typeof ctx.options.content === 'string' ? ctx.options.content : null;
    if (!f) {
      if (content === null) fail('error.unknownFile', { file: path });
      setFile(desk, path, { base: null, index: null, work: content });
      ctx.equivalent({ key: 'equiv.newFile', params: { file: path } });
      return ctx.explain('explain.create', { file: path });
    }
    if (f.status === 'conflict') fail('error.conflictChooseFirst', { file: path });
    if (f.work === null) fail('error.fileDeleted', { file: path });
    let work = content;
    if (work === null) {
      ctx.state.seq.edit += 1;
      work = editedContent(f.work, ctx.state.seq.edit, path);
    }
    setFile(desk, path, { work });
    ctx.equivalent({ key: 'equiv.edit', params: { file: path } });
    ctx.explain('explain.touch', { file: path });
  },
};
