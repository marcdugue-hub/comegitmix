// git init — turns the folder into a Git repository: the .git folder appears, on an unborn `main`.
// Before it (state.noGit, setup directive @no-git), every other git command fails with error.notARepo (apply.js).
export default {
  name: 'init',
  run(ctx) {
    const state = ctx.state;
    if (!state.noGit) {
      ctx.markReadOnly();
      return ctx.explain('explain.init.again', { path: ctx.desk.path });
    }
    delete state.noGit;
    ctx.emit('repo.initialized', { desk: ctx.desk.id, branch: ctx.desk.branch });
    ctx.explain('explain.init', { path: ctx.desk.path, branch: ctx.desk.branch || 'main', n: ctx.desk.files.filter((f) => f.kind === 'file').length });
  },
};
