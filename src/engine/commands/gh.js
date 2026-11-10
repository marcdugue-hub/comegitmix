// GitHub's command line: `gh repo create [<name>] [--public|--private] [--source=.] [--push]` (parse.js).
//   without --source: creates an empty repository on GitHub; the local repository does not know it yet
//                     (origin is "pending": `git remote add origin <url>` links it);
//   with --source=.:  creates it AND adds it as origin; with --push, also pushes the current branch (-u).
import { makeRemote, publishBranch, remoteUrl } from '../remote.js';
import { folderName } from '../state.js';

export default {
  name: 'gh',
  run(ctx) {
    const state = ctx.state;
    const [area, action, given] = ctx.args;
    if (area !== 'repo' || action !== 'create') ctx.fail('error.ghOnlyRepoCreate', {});
    const o = ctx.options;
    const remoteName = typeof o.remote === 'string' && o.remote ? o.remote : 'origin';
    if (remoteName !== 'origin') ctx.fail('error.unknownRemote', { name: remoteName });
    const main = state.worktrees.find((w) => w.main) || ctx.desk;
    const name = given || folderName(main.path);
    if (state.remotes.origin) ctx.fail('error.ghRepoExists', { name });
    const linked = Boolean(o.source);
    if (linked && state.noGit) ctx.fail('error.notARepo', {});
    if (o.push && !linked) ctx.fail('error.ghPushNeedsSource', {});
    if (o.push && !ctx.desk.head) ctx.fail('error.noCommitYet', {});
    const remote = makeRemote('origin');
    remote.url = remoteUrl(name);
    remote.repoName = name;
    if (!linked) remote.pending = true;
    state.remotes.origin = remote;
    if (!state.visibleRepos.includes('origin')) state.visibleRepos.push('origin');
    ctx.emit('remote.created', { name: 'origin', repo: name, linked });
    if (o.push) {
      const branch = ctx.desk.branch;
      publishBranch(state, 'origin', branch);
      state.branches[branch].upstream = `origin/${branch}`;
      ctx.emit('push.done', { remote: 'origin', branch, ref: `origin/${branch}`, from: null, to: state.branches[branch].tip, forced: false });
      return ctx.explain('explain.gh.createPush', { name, branch, url: remote.url });
    }
    ctx.explain(linked ? 'explain.gh.createLinked' : 'explain.gh.create', { name, url: remote.url });
  },
};
