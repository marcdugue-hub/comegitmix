// Scene action (not Git): "A colleague pushes". { name: 'colleague', args: [branch = 'main'], options: { message?, files?: [paths], remote? } }
// The commit lands on <remote>/<branch> online only: run git fetch / git pull to see it locally.
import { colleaguePush } from '../remote.js';

export default {
  name: 'colleague',
  run(ctx) {
    const branch = ctx.args[0] || 'main';
    const o = ctx.options;
    const files = Array.isArray(o.files) ? o.files : typeof o.files === 'string' ? o.files.split(',').filter(Boolean) : null;
    const { id, files: paths } = colleaguePush(ctx.state, { remote: o.remote || 'origin', branch, message: typeof o.message === 'string' ? o.message : '', files });
    ctx.emit('colleague.pushed', { remote: o.remote || 'origin', branch, commit: id, files: paths });
    ctx.equivalent({ key: 'equiv.colleague', params: { branch } });
    ctx.explain('explain.colleague', { branch, ref: `${o.remote || 'origin'}/${branch}`, files: paths.join(', ') });
  },
};
