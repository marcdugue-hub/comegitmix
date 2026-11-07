import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { createState, getDesk, stagedPaths, commitsBetween, reachableCommits } from '../../src/engine/state.js';
import { baseRepo, play, run, work, status, file } from './_engine-helpers.js';

const head = (s, desk = null) => getDesk(s, desk).head;

test('status: read only, lists changed files', () => {
  const s = play(baseRepo(), work('plan.md')).state;
  const r = run(s, 'git status');
  assert.equal(r.state, s);
  assert.deepEqual(r.output.files, [{ path: 'plan.md', status: 'M', staged: false }]);
  assert.equal(r.explanation.key, 'explain.status');
  assert.equal(run(baseRepo(), 'git status').explanation.key, 'explain.status.clean');
});

test('add: file, folder, "." ; the file enters the desk index', () => {
  let s = play(baseRepo(), [...work('plan.md', 'chapitres/ch1.md'), { name: 'create', args: [] }]).state;
  const r = run(s, 'git add plan.md');
  assert.equal(status(r.state, 'plan.md'), 'M+');
  assert.ok(r.events.some((e) => e.type === 'index.added' && e.path === 'plan.md'));
  assert.deepEqual(r.explanation, { key: 'explain.add', params: { file: 'plan.md' } });
  s = play(s, ['git add .']).state;
  assert.deepEqual(stagedPaths(getDesk(s)).sort(), ['chapitres/ch1.md', 'nouveau-1.md', 'plan.md']);
  assert.equal(status(s, 'nouveau-1.md'), 'A');
  assert.equal(run(s, 'git add nope.md').error.key, 'error.unknownFile');
  assert.equal(run(s, 'git add').error.key, 'error.missingArgument');
});

test('commit: new commit, branch moves, index emptied; errors', () => {
  const s = play(baseRepo(), [...work('plan.md', 'intro.md'), 'git add plan.md']).state;
  const before = head(s);
  const r = run(s, 'git commit -m "plan v2"');
  const id = head(r.state);
  assert.notEqual(id, before);
  assert.equal(r.state.branches.main.tip, id);
  assert.deepEqual(r.state.commits[id].parents, [before]);
  assert.deepEqual(r.state.commits[id].files, ['plan.md']);
  assert.equal(r.state.commits[id].author, 'human');
  assert.equal(status(r.state, 'plan.md'), 'clean');
  assert.equal(status(r.state, 'intro.md'), 'M', 'unstaged file is not committed');
  assert.ok(r.events.some((e) => e.type === 'commit.created' && e.id === id && e.branch === 'main'));
  assert.equal(run(baseRepo(), 'git commit -m "x"').error.key, 'error.nothingToCommit');
  assert.equal(run(s, 'git commit').error.key, 'error.commitMessageMissing');
});

test('commit -am, --amend, AI author', () => {
  let s = play(baseRepo(), work('plan.md')).state;
  s = play(s, ['git commit -am "ai work"'], { author: 'ai' }).state;
  const id = head(s);
  assert.equal(s.commits[id].author, 'ai');
  s = play(s, [...work('intro.md'), 'git add intro.md', 'git commit --amend -m "better"']).state;
  const amended = head(s);
  assert.notEqual(amended, id);
  assert.equal(s.commits[amended].msg, 'better');
  assert.deepEqual(s.commits[amended].parents, s.commits[id].parents);
  assert.ok(!reachableCommits(s).has(id));
});

test('restore: folder, --staged, and new files', () => {
  const s = play(baseRepo(), [...work('plan.md'), 'git add plan.md', { name: 'create', args: [] }]).state;
  const r1 = run(s, 'git restore --staged plan.md');
  assert.equal(status(r1.state, 'plan.md'), 'M');
  const r2 = run(r1.state, 'git restore plan.md');
  assert.equal(status(r2.state, 'plan.md'), 'clean');
  assert.equal(run(s, 'git restore nouveau-1.md').error.key, 'error.restoreUntracked');
  const r3 = run(play(s, ['git add nouveau-1.md']).state, 'git restore --staged nouveau-1.md');
  assert.equal(status(r3.state, 'nouveau-1.md'), 'U');
});

test('rm: shell rm marks D; git rm stages the deletion', () => {
  const s = baseRepo();
  assert.equal(status(play(s, ['rm intro.md']).state, 'intro.md'), 'D');
  const g = play(s, ['git rm intro.md', 'git commit -m "drop intro"']).state;
  assert.equal(file(g, 'intro.md'), null);
  assert.ok(!('intro.md' in g.commits[head(g)].tree));
});

test('stash push / list / pop / apply / drop (one stash per desk)', () => {
  const s = play(baseRepo(), work('plan.md', 'intro.md')).state;
  const r = run(s, 'git stash');
  assert.equal(status(r.state, 'plan.md'), 'clean');
  assert.equal(getDesk(r.state).stash.length, 1);
  assert.ok(r.events.some((e) => e.type === 'stash.pushed'));
  assert.equal(run(r.state, 'git stash list').output.entries.length, 1);
  const p = run(r.state, 'git stash pop');
  assert.equal(status(p.state, 'plan.md'), 'M');
  assert.equal(status(p.state, 'intro.md'), 'M');
  assert.equal(getDesk(p.state).stash.length, 0);
  assert.equal(file(p.state, 'plan.md').work, file(s, 'plan.md').work);
  const a = run(r.state, 'git stash apply');
  assert.equal(getDesk(a.state).stash.length, 1);
  assert.equal(getDesk(play(r.state, ['git stash drop']).state).stash.length, 0);
  assert.equal(run(baseRepo(), 'git stash').error.key, 'error.nothingToStash');
  assert.equal(run(baseRepo(), 'git stash pop').error.key, 'error.stashEmpty');
  const two = play(r.state, ['git worktree add ../other -b ia/o']).state;
  assert.equal(getDesk(two).stash.length, 0, 'the other desk has its own stash');
});

test('branch: create, list, delete (-d refuses unmerged, -D forces)', () => {
  let s = baseRepo();
  const r = run(s, 'git branch ia/resume');
  assert.equal(r.state.branches['ia/resume'].tip, head(s));
  assert.equal(getDesk(r.state).branch, 'main', 'branch does not switch');
  assert.ok(r.events.some((e) => e.type === 'lane.forked' && e.name === 'ia/resume'));
  assert.equal(run(r.state, 'git branch ia/resume').error.key, 'error.branchExists');
  assert.equal(run(r.state, 'git branch "bad name"').error.key, 'error.invalidBranchName');
  assert.equal(run(r.state, 'git branch').output.branches.length, 2);
  s = play(r.state, ['git switch ia/resume', ...work('resume.md'), 'git commit -am "r"', 'git switch main']).state;
  assert.equal(run(s, 'git branch -d ia/resume').error.key, 'error.branchNotMerged');
  assert.equal(run(s, 'git branch -d main').error.key, 'error.branchCheckedOut');
  const d = run(s, 'git branch -D ia/resume');
  assert.equal(d.state.branches['ia/resume'], undefined);
  assert.ok(d.events.some((e) => e.type === 'commits.orphaned'));
});

test('switch: existing branch, -c, --detach, carries changes, refuses overwrite', () => {
  let s = play(baseRepo(), ['git switch -c ia/x', ...work('resume.md'), 'git commit -am "r"', 'git switch main']).state;
  assert.equal(getDesk(s).branch, 'main');
  const r = run(s, 'git switch ia/x');
  assert.equal(getDesk(r.state).branch, 'ia/x');
  assert.equal(file(r.state, 'resume.md').work, s.commits[s.branches['ia/x'].tip].tree['resume.md']);
  assert.ok(r.events.some((e) => e.type === 'desk.switched'));
  const carried = run(play(s, work('plan.md')).state, 'git switch ia/x');
  assert.equal(status(carried.state, 'plan.md'), 'M');
  assert.equal(run(play(s, work('resume.md')).state, 'git switch ia/x').error.key, 'error.switchWouldOverwrite');
  const d = run(s, 'git switch --detach HEAD~1');
  assert.equal(getDesk(d.state).branch, null);
  assert.equal(d.warning.key, 'warn.detachedHead');
  assert.equal(run(s, 'git switch nope').error.key, 'error.unknownBranch');
  assert.equal(run(s, 'git switch main').explanation.key, 'explain.switch.already');
});

test('switch to a fetched remote branch creates a tracking branch', () => {
  const s = baseRepo();
  const withRemote = { ...s, remoteRefs: { 'origin/ia/graphiques': { tip: s.branches.main.tip } } };
  const r = run(withRemote, 'git switch ia/graphiques');
  assert.equal(r.error, null);
  assert.equal(r.state.branches['ia/graphiques'].upstream, 'origin/ia/graphiques');
  assert.equal(getDesk(r.state).branch, 'ia/graphiques');
});

test('checkout: accepted with a note', () => {
  const s = play(baseRepo(), ['git branch ia/x']).state;
  const r = run(s, 'git checkout ia/x');
  assert.equal(getDesk(r.state).branch, 'ia/x');
  assert.equal(r.warning.key, 'warn.checkoutLegacy');
  const b = run(s, 'git checkout -b ia/y');
  assert.equal(getDesk(b.state).branch, 'ia/y');
  const f = run(play(s, work('plan.md')).state, 'git checkout -- plan.md');
  assert.equal(status(f.state, 'plan.md'), 'clean');
});

test('merge: fast-forward, three-way, up to date, --no-ff', () => {
  const s = play(baseRepo(), ['git switch -c ia/resume', ...work('resume.md'), 'git commit -am "r"', 'git switch main']).state;
  const ff = run(s, 'git merge ia/resume');
  assert.equal(ff.state.branches.main.tip, s.branches['ia/resume'].tip);
  assert.equal(ff.explanation.key, 'explain.merge.ff');
  assert.ok(ff.events.some((e) => e.type === 'merge.fastForward'));
  const noff = run(s, 'git merge --no-ff ia/resume');
  assert.equal(noff.state.commits[noff.state.branches.main.tip].parents.length, 2);
  const diverged = play(s, [...work('plan.md'), 'git commit -am "p"']).state;
  const m = run(diverged, 'git merge ia/resume');
  const tip = m.state.commits[m.state.branches.main.tip];
  assert.deepEqual(tip.parents, [diverged.branches.main.tip, s.branches['ia/resume'].tip]);
  assert.equal(tip.msgKey, 'msg.merge');
  assert.equal(tip.tree['resume.md'], s.commits[s.branches['ia/resume'].tip].tree['resume.md']);
  assert.equal(tip.tree['plan.md'], diverged.commits[diverged.branches.main.tip].tree['plan.md']);
  assert.ok(m.events.some((e) => e.type === 'lanes.joined'));
  assert.equal(run(m.state, 'git merge ia/resume').explanation.key, 'explain.merge.upToDate');
  assert.equal(run(play(diverged, work('resume.md')).state, 'git merge ia/resume').error.key, 'error.mergeWouldOverwrite');
  const keep = run(play(diverged, work('intro.md')).state, 'git merge ia/resume');
  assert.equal(status(keep.state, 'intro.md'), 'M', 'unrelated changes stay');
});

test('rebase: replays commits onto the target', () => {
  const s = play(baseRepo(), [
    'git switch -c ia/chiffres', ...work('resume.md'), 'git commit -am "c1"', ...work('resume.md'), 'git commit -am "c2"',
    'git switch main', ...work('plan.md'), 'git commit -am "p"', 'git switch ia/chiffres',
  ]).state;
  const old = commitsBetween(s, s.branches.main.tip, s.branches['ia/chiffres'].tip);
  const r = run(s, 'git rebase main');
  assert.equal(r.error, null);
  const now = commitsBetween(r.state, r.state.branches.main.tip, r.state.branches['ia/chiffres'].tip);
  assert.equal(now.length, 2);
  assert.ok(now.every((id) => !old.includes(id)));
  assert.equal(r.state.commits[now[0]].parents[0], s.branches.main.tip);
  assert.ok(r.events.some((e) => e.type === 'rebase.done'));
  assert.ok(r.events.some((e) => e.type === 'commits.orphaned'));
  assert.equal(r.explanation.key, 'explain.rebase');
  assert.equal(run(play(s, work('plan.md')).state, 'git rebase main').error.key, 'error.rebaseDirty');
  assert.equal(run(r.state, 'git rebase main').explanation.key, 'explain.rebase.upToDate');
});

test('rebase -i HEAD~3: default plan squashes 3 commits into 1', () => {
  const s = play(baseRepo(), ['git switch -c ia/chiffres', ...[1, 2, 3].flatMap(() => [...work('resume.md'), 'git commit -am "wip"'])], { author: 'ai' }).state;
  const tipTree = s.commits[s.branches['ia/chiffres'].tip].tree;
  const r = run(s, 'git rebase -i HEAD~3');
  assert.equal(r.error, null);
  const only = commitsBetween(r.state, r.state.branches.main.tip, r.state.branches['ia/chiffres'].tip);
  assert.equal(only.length, 1);
  assert.deepEqual(r.state.commits[only[0]].tree, tipTree);
  assert.equal(r.state.commits[only[0]].author, 'ai');
  assert.equal(r.explanation.key, 'explain.squash');
});

test('rebase -i with an explicit plan (drop, reword) and with state.rebasePlan', () => {
  const s = play(baseRepo(), ['git switch -c ia/x', ...work('resume.md'), 'git commit -am "a"', ...work('intro.md'), 'git commit -am "b"']).state;
  const ids = commitsBetween(s, s.branches.main.tip, s.branches['ia/x'].tip);
  const r = run(s, { name: 'rebase', args: ['HEAD~2'], options: { i: true, plan: [{ id: ids[0], action: 'reword', msg: 'A!' }, { id: ids[1], action: 'drop' }] } });
  const now = commitsBetween(r.state, r.state.branches.main.tip, r.state.branches['ia/x'].tip);
  assert.equal(now.length, 1);
  assert.equal(r.state.commits[now[0]].msg, 'A!');
  const p = run({ ...s, rebasePlan: ['pick', 'pick'] }, 'git rebase -i HEAD~2');
  assert.equal(commitsBetween(p.state, p.state.branches.main.tip, p.state.branches['ia/x'].tip).length, 2);
  assert.equal(p.state.rebasePlan, null);
  assert.equal(run(s, { name: 'rebase', args: ['HEAD~2'], options: { i: true, plan: ['pick'] } }).error.key, 'error.rebasePlanInvalid');
});

test('cherry-pick copies one commit onto the current branch', () => {
  const s = play(baseRepo(), [
    'git switch -c ia/essai', ...work('resume.md'), 'git commit -am "typo"', ...work('intro.md'), 'git commit -am "attempt"', 'git switch main',
  ]).state;
  const src = s.commits[s.branches['ia/essai'].tip].parents[0];
  const r = run(s, 'git cherry-pick ia/essai~1');
  const tip = r.state.commits[r.state.branches.main.tip];
  assert.equal(tip.msg, 'typo');
  assert.deepEqual(tip.files, ['resume.md']);
  assert.equal(tip.tree['resume.md'], s.commits[src].tree['resume.md']);
  assert.equal(tip.tree['intro.md'], s.commits[s.branches.main.tip].tree['intro.md'], 'the attempt is not copied');
  assert.ok(r.events.some((e) => e.type === 'commit.copied' && e.source === src));
  assert.equal(run(r.state, 'git cherry-pick ia/essai~1').error.key, 'error.cherryPickEmpty');
});

test('reset --soft / --mixed / --hard and reset <file>', () => {
  const s = play(baseRepo(), [...work('plan.md'), 'git commit -am "a1"', ...work('plan.md'), 'git commit -am "a2"']).state;
  const target = s.commits[s.commits[head(s)].parents[0]].parents[0];
  const mixed = run(s, 'git reset HEAD~2');
  assert.equal(mixed.state.branches.main.tip, target);
  assert.equal(status(mixed.state, 'plan.md'), 'M');
  assert.equal(mixed.explanation.key, 'explain.reset.mixed');
  assert.ok(mixed.events.some((e) => e.type === 'commits.orphaned' && e.ids.length === 2));
  assert.equal(status(run(s, 'git reset --soft HEAD~2').state, 'plan.md'), 'M+');
  const hard = run(s, 'git reset --hard HEAD~2');
  assert.equal(status(hard.state, 'plan.md'), 'clean');
  assert.equal(file(hard.state, 'plan.md').work, s.commits[target].tree['plan.md']);
  const unstage = run(play(s, [...work('intro.md'), 'git add intro.md']).state, 'git reset intro.md');
  assert.equal(status(unstage.state, 'intro.md'), 'M');
});

test('revert adds an inverse commit', () => {
  const s = play(baseRepo(), [...work('intro.md'), 'git commit -am "bad"']).state;
  const bad = head(s);
  const r = run(s, 'git revert HEAD');
  const tip = r.state.commits[head(r.state)];
  assert.deepEqual(tip.parents, [bad]);
  assert.equal(tip.msgKey, 'msg.revert');
  assert.equal(tip.tree['intro.md'], s.commits[s.commits[bad].parents[0]].tree['intro.md']);
  assert.ok(r.events.some((e) => e.type === 'commit.reverted' && e.source === bad));
});

test('worktree add (-b, existing branch, default name), list, remove', () => {
  const s = baseRepo();
  const r = run(s, 'git worktree add ../rapport-ia-chiffres -b ia/chiffres');
  const w = getDesk(r.state, 'rapport-ia-chiffres');
  assert.equal(w.branch, 'ia/chiffres');
  assert.equal(w.main, false);
  assert.equal(w.head, head(s));
  assert.equal(r.state.active, w.id, 'the new folder becomes the active desk');
  assert.ok(r.events.some((e) => e.type === 'worktree.added' && e.path === 'rapport-ia-chiffres'));
  assert.deepEqual(r.explanation, { key: 'explain.worktree.add', params: { path: 'rapport-ia-chiffres', branch: 'ia/chiffres' } });
  assert.equal(getDesk(r.state, 'rapport-client').files.filter((f) => f.kind === 'file').length, w.files.filter((f) => f.kind === 'file').length);

  const ex = play(s, ['git branch ia/graphiques']).state;
  const e = run(ex, 'git worktree add ../revue-mr-42 ia/graphiques');
  assert.equal(getDesk(e.state, 'revue-mr-42').branch, 'ia/graphiques');
  assert.equal(run(ex, 'git worktree add ../revue -b ia/graphiques').error.key, 'error.branchExists');
  assert.equal(getDesk(run(s, 'git worktree add ../revue').state, 'revue').branch, 'revue');
  assert.equal(run(r.state, 'git worktree add ../rapport-ia-chiffres -b z').error.key, 'error.worktreeExists');

  const list = run(r.state, 'git worktree list');
  assert.deepEqual(list.output.worktrees.map((x) => [x.path, x.branch]), [['rapport-client', 'main'], ['rapport-ia-chiffres', 'ia/chiffres']]);

  const dirty = play(r.state, work('plan.md')).state;
  assert.equal(run(dirty, 'git worktree remove ../rapport-ia-chiffres').error.key, 'error.worktreeDirty');
  const rm = run(r.state, 'git worktree remove ../rapport-ia-chiffres');
  assert.equal(rm.state.worktrees.length, 1);
  assert.ok(rm.state.branches['ia/chiffres'], 'the lane stays');
  assert.equal(rm.state.active, 'w1');
  assert.equal(run(r.state, 'git worktree remove ../rapport-client').error.key, 'error.worktreeMain');
  assert.equal(run(dirty, 'git worktree remove --force ../rapport-ia-chiffres').error, null);
});

test('each desk has its own index: a commit only takes its own desk index', () => {
  const s = play(baseRepo(), [
    'git worktree add ../ia -b ia/x', ...work('resume.md'), 'git add resume.md', 'cd rapport-client', ...work('plan.md'), 'git add plan.md',
  ]).state;
  const r = run(s, 'git commit -m "mine"');
  assert.deepEqual(r.state.commits[head(r.state)].files, ['plan.md']);
  assert.equal(status(r.state, 'resume.md', 'ia'), 'M+');
});

test('diff command: modes and three dots; read only', () => {
  const s = play(baseRepo(), ['git switch -c ia/resume', ...work('resume.md'), 'git commit -am "r"', 'git switch main', ...work('plan.md'), { name: 'create', args: [] }]).state;
  const w = run(s, 'git diff');
  assert.equal(w.state, s);
  assert.equal(w.output.mode, 'work');
  assert.ok(w.events.some((e) => e.type === 'diff.shown' && e.mode === 'work'));
  assert.equal(run(s, 'git diff --staged').output.mode, 'staged');
  const b = run(s, 'git diff main ia/resume');
  assert.deepEqual(b.output.files.map((f) => [f.path, f.letter]), [['resume.md', 'M']]);
  const t = run(s, 'git diff main...ia/resume');
  assert.equal(t.output.threeDot, true);
  assert.equal(t.explanation.key, 'explain.diff.threeDot');
  assert.equal(run(s, 'git diff main nope').error.key, 'error.unknownRevision');
  assert.deepEqual(run(s, 'git diff plan.md').output.files.map((f) => f.path), ['plan.md']);
});

test('log, blame, show: read only outputs', () => {
  const s = play(baseRepo(), [...work('resume.md'), 'git commit -am "ai"'], { author: 'ai' }).state;
  const l = run(s, 'git log --oneline');
  assert.equal(l.output.commits.length, 3);
  assert.equal(l.output.commits[0].id, head(s));
  const b = run(s, 'git blame resume.md');
  assert.ok(b.output.lines.some((x) => x.author === 'ai'));
  assert.ok(b.output.lines.some((x) => x.author === 'human'));
  const sh = run(s, 'git show HEAD');
  assert.deepEqual(sh.output.files.map((f) => f.path), ['resume.md']);
  assert.equal(run(s, 'git blame nope.md').error.key, 'error.unknownFile');
});

test('scene: touch, create, click cycle clean -> M -> staged -> clean and U -> A -> U', () => {
  const s = baseRepo();
  const t = run(s, { name: 'touch', args: ['plan.md'] });
  assert.equal(status(t.state, 'plan.md'), 'M');
  assert.notEqual(file(t.state, 'plan.md').work, file(t.state, 'plan.md').base);
  assert.deepEqual(t.equivalent, { key: 'equiv.edit', params: { file: 'plan.md' } });

  const c1 = run(s, { name: 'click', args: ['plan.md'] });
  assert.equal(status(c1.state, 'plan.md'), 'M');
  const c2 = run(c1.state, { name: 'click', args: ['plan.md'] });
  assert.equal(status(c2.state, 'plan.md'), 'M+');
  assert.deepEqual(c2.equivalent, { command: 'git add plan.md' });
  const c3 = run(c2.state, { name: 'click', args: ['plan.md'] });
  assert.equal(status(c3.state, 'plan.md'), 'clean');
  assert.deepEqual(c3.equivalent, { command: 'git restore --staged --worktree plan.md' });

  const n = run(s, { name: 'create', args: ['chapitres'] });
  assert.equal(n.output.path, 'chapitres/nouveau-1.md');
  assert.equal(status(n.state, 'chapitres/nouveau-1.md'), 'U');
  assert.equal(getDesk(n.state).files.find((f) => f.path === 'chapitres').dirty, true, 'folder carries a dot');
  const u1 = run(n.state, { name: 'click', args: ['chapitres/nouveau-1.md'] });
  assert.equal(status(u1.state, 'chapitres/nouveau-1.md'), 'A');
  const u2 = run(u1.state, { name: 'click', args: ['chapitres/nouveau-1.md'] });
  assert.equal(status(u2.state, 'chapitres/nouveau-1.md'), 'U');
  assert.equal(run(n.state, { name: 'create', args: ['chapitres'] }).output.path, 'chapitres/nouveau-2.md');

  const other = play(s, ['git worktree add ../ia -b ia/x', 'cd rapport-client']).state;
  const remote = run(other, { name: 'touch', args: ['ia', 'plan.md'] });
  assert.equal(status(remote.state, 'plan.md', 'ia'), 'M');
  assert.equal(status(remote.state, 'plan.md'), 'clean');
});

test('cd changes the active desk; ls lists the folder', () => {
  const s = play(baseRepo(), ['git worktree add ../ia -b ia/x']).state;
  const r = run(s, 'cd ../rapport-client');
  assert.equal(r.state.active, 'w1');
  assert.ok(r.events.some((e) => e.type === 'desk.activated'));
  assert.equal(run(s, 'cd ../nope').error.key, 'error.unknownDesk');
  assert.ok(run(s, 'ls').output.entries.some((e) => e.path === 'chapitres' && e.kind === 'dir'));
});

test('a first commit on an unborn branch creates the lane', () => {
  const r = apply(baseRepo(), 'git status');
  assert.equal(r.error, null);
  const fresh = play(createState(), [{ name: 'create', options: { path: 'a.md' } }, 'git add a.md']).state;
  const c = run(fresh, 'git commit -m "first"');
  assert.ok(c.state.branches.main);
  assert.ok(c.events.some((e) => e.type === 'lane.forked' && e.name === 'main'));
  assert.equal(run(fresh, 'git branch x').error.key, 'error.noCommitYet');
});
