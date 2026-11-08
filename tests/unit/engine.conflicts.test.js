import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { getDesk, commitsBetween } from '../../src/engine/state.js';
import { threeWay } from '../../src/engine/conflicts.js';
import { diff } from '../../src/engine/diff.js';
import { baseRepo, play, run, work, status, file } from './_engine-helpers.js';

/** The "Conflict ready to resolve" start: ia/resume and main both changed plan.md. */
function conflictStart(extraOnMain = []) {
  return play(baseRepo(), [
    'git switch -c ia/resume', ...work('resume.md'), 'git commit -am "shorter summary"', ...work('plan.md'), 'git commit -am "April"',
    'git switch main', ...work('plan.md'), 'git commit -am "March"', ...extraOnMain,
  ]).state;
}

test('threeWay: same file changed on both sides = conflict; different files = no conflict', () => {
  const base = { a: '1', b: '1' };
  assert.deepEqual(threeWay(base, { a: '2', b: '1' }, { a: '1', b: '2' }).conflicts, []);
  assert.deepEqual(threeWay(base, { a: '2', b: '1' }, { a: '1', b: '2' }).tree, { a: '2', b: '2' });
  assert.deepEqual(threeWay(base, { a: '2', b: '1' }, { a: '3', b: '1' }).conflicts.map((c) => c.path), ['a']);
  assert.deepEqual(threeWay(base, { a: '2', b: '1' }, { a: '2', b: '1' }).conflicts, [], 'same change on both sides');
  assert.deepEqual(threeWay(base, { b: '1' }, { a: '3', b: '1' }).conflicts.map((c) => c.path), ['a'], 'deleted vs modified');
});

test('merge with the same file changed on both sides -> conflict (state changes, warning, not an error)', () => {
  const s = conflictStart();
  const r = run(s, 'git merge ia/resume');
  assert.equal(r.error, null);
  assert.deepEqual(r.warning, { key: 'error.mergeConflict', params: { file: 'plan.md', files: 'plan.md', n: 1 } });
  assert.equal(status(r.state, 'plan.md'), 'conflict');
  assert.equal(status(r.state, 'resume.md'), 'M+', 'non-conflicting incoming change is staged');
  assert.equal(getDesk(r.state).op.type, 'merge');
  assert.ok(r.events.some((e) => e.type === 'conflict' && e.files[0] === 'plan.md'));
  assert.equal(r.explanation.key, 'explain.merge.conflict');
});

test('merge with different files changed -> no conflict', () => {
  const s = play(baseRepo(), [
    'git switch -c ia/resume', ...work('resume.md'), 'git commit -am "r"', 'git switch main', ...work('plan.md'), 'git commit -am "p"',
  ]).state;
  const r = run(s, 'git merge ia/resume');
  assert.equal(r.warning, null);
  assert.equal(getDesk(r.state).op, null);
});

test('conflict resolution: blocked until resolved, then keep theirs -> M -> add -> commit (merge commit)', () => {
  const s = play(conflictStart(), ['git merge ia/resume']).state;
  assert.equal(run(s, 'git commit -m "x"').error.key, 'error.conflictUnresolved');
  assert.equal(run(s, 'git add plan.md').error.key, 'error.conflictChooseFirst');
  assert.equal(run(s, 'git switch ia/resume').error.key, 'error.operationInProgress');
  const res = run(s, { name: 'resolve', args: ['plan.md', 'ia/resume'] });
  assert.equal(status(res.state, 'plan.md'), 'M');
  assert.equal(file(res.state, 'plan.md').work, s.commits[s.branches['ia/resume'].tip].tree['plan.md']);
  assert.deepEqual(res.equivalent, { command: 'git checkout --theirs plan.md' });
  assert.equal(run(res.state, 'git commit').error.key, 'error.conflictNotAdded');
  const done = play(res.state, ['git add plan.md', 'git commit']).state;
  const tip = done.commits[done.branches.main.tip];
  assert.equal(tip.parents.length, 2);
  assert.equal(tip.parents[1], s.branches['ia/resume'].tip);
  assert.equal(getDesk(done).op, null);
  assert.equal(status(done, 'plan.md'), 'clean');
  assert.deepEqual(getDesk(done).resolutions.map((x) => [x.path, x.sideLabel]), [['plan.md', 'ia/resume']]);
});

test('keep mine still makes the file M; keep both concatenates; terminal --ours works', () => {
  const s = play(conflictStart(), ['git merge ia/resume']).state;
  const mine = run(s, { name: 'resolve', args: ['plan.md', 'ours'] });
  assert.equal(status(mine.state, 'plan.md'), 'M');
  const both = run(s, { name: 'resolve', args: ['plan.md', 'both'] });
  const f = file(both.state, 'plan.md');
  assert.ok(f.work.includes(s.commits[s.branches.main.tip].tree['plan.md']));
  assert.ok(f.work.includes(s.commits[s.branches['ia/resume'].tip].tree['plan.md']));
  const term = run(s, 'git checkout --ours plan.md');
  assert.equal(status(term.state, 'plan.md'), 'M');
  assert.equal(run(s, { name: 'resolve', args: ['plan.md', 'nobody'] }).error.key, 'error.invalidSide');
});

test('merge --abort restores the state before the merge', () => {
  const s = conflictStart();
  const m = play(s, ['git merge ia/resume', 'git merge --abort']).state;
  assert.equal(getDesk(m).op, null);
  assert.equal(status(m, 'plan.md'), 'clean');
  assert.equal(file(m, 'plan.md').work, file(s, 'plan.md').work);
  assert.equal(m.branches.main.tip, s.branches.main.tip);
});

test('conflict block: detailed content in the diff and in the resolution', () => {
  const s = { ...conflictStart(), conflictBlocks: [{ path: 'plan.md', first: 'main', second: 'ia/resume', firstText: 'Delivery in March', secondText: 'Delivery in April' }] };
  const m = play(s, ['git merge ia/resume']).state;
  const d = diff(m, { mode: 'work' }).files.find((x) => x.path === 'plan.md');
  assert.equal(d.conflictUndetailed, false);
  assert.ok(d.rows.length > 0);
  const r = play(m, [{ name: 'resolve', args: ['plan.md', 'both'] }]).state;
  assert.equal(file(r, 'plan.md').work, 'Delivery in March\nDelivery in April');
});

test('conflict without block: diff entry is undetailed (sandbox case)', () => {
  const m = play(conflictStart(), ['git merge ia/resume']).state;
  const d = diff(m, { mode: 'work' }).files.find((x) => x.path === 'plan.md');
  assert.deepEqual(d.rows, []);
  assert.equal(d.conflictUndetailed, true);
  assert.equal(d.letter, '!');
  assert.equal(diff(m, { mode: 'conflict' }).files.length, 1);
});

test('rebase conflict -> resolve -> add -> rebase --continue; and --abort', () => {
  const s = play(conflictStart(), ['git switch ia/resume']).state;
  const r = run(s, 'git rebase main');
  assert.equal(r.warning.key, 'error.mergeConflict');
  assert.equal(getDesk(r.state).op.type, 'rebase');
  assert.equal(status(r.state, 'plan.md'), 'conflict');
  assert.equal(run(r.state, 'git rebase --continue').error.key, 'error.conflictUnresolved');
  assert.equal(run(play(r.state, [{ name: 'resolve', args: ['plan.md', 'theirs'] }, 'git add plan.md']).state, 'git commit -m x').error.key, 'error.useRebaseContinue');
  const done = play(r.state, [{ name: 'resolve', args: ['plan.md', 'theirs'] }, 'git add plan.md', 'git rebase --continue']);
  assert.equal(getDesk(done.state).op, null);
  assert.equal(commitsBetween(done.state, done.state.branches.main.tip, done.state.branches['ia/resume'].tip).length, 2);
  assert.equal(done.state.commits[done.state.branches['ia/resume'].tip].tree['plan.md'], s.commits[s.branches['ia/resume'].tip].tree['plan.md']);
  assert.ok(done.last.events.some((e) => e.type === 'rebase.done'));
  const ab = play(r.state, ['git rebase --abort']).state;
  assert.equal(ab.branches['ia/resume'].tip, s.branches['ia/resume'].tip);
  assert.equal(getDesk(ab).branch, 'ia/resume');
  assert.equal(getDesk(ab).op, null);
});

test('cherry-pick conflict -> resolve -> add -> commit keeps the source message', () => {
  const s = conflictStart();
  const r = run(s, 'git cherry-pick ia/resume');
  assert.equal(status(r.state, 'plan.md'), 'conflict');
  const done = play(r.state, [{ name: 'resolve', args: ['plan.md', 'theirs'] }, 'git add plan.md', 'git cherry-pick --continue']).state;
  assert.equal(done.commits[done.branches.main.tip].msg, 'April');
  assert.equal(done.commits[done.branches.main.tip].parents.length, 1);
});

test('stash pop conflict when the lane changed the same file', () => {
  const s = play(baseRepo(), [...work('plan.md'), 'git stash', ...work('plan.md'), 'git commit -am "moved on"']).state;
  const r = run(s, 'git stash pop');
  assert.equal(r.error, null);
  assert.equal(status(r.state, 'plan.md'), 'conflict');
  assert.equal(r.state.stash.length, 1, 'entry kept on conflict');
  const ok = run(play(baseRepo(), [...work('plan.md'), 'git stash', ...work('intro.md'), 'git commit -am "other"']).state, 'git stash pop');
  assert.equal(status(ok.state, 'plan.md'), 'M');
});

test('the "Conflict ready to resolve" flow plays end to end', () => {
  const r = apply(conflictStart(), 'git merge ia/resume && git checkout --theirs plan.md && git add plan.md && git commit -m "merged"');
  assert.equal(r.error, null);
  assert.equal(r.state.commits[r.state.branches.main.tip].msg, 'merged');
});
