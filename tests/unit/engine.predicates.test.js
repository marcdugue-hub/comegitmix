import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { runSetup } from '../../src/engine/setup.js';
import { check, checkAll, commandIds, workIntact, ERROR_KEYS } from '../../src/engine/predicates.js';
import { parseWebAction } from '../../src/engine/remote.js';
import { ERROR_CODES } from '../../src/content/check-phrase.js';
import { play } from './_engine-helpers.js';

const setup = (text) => {
  const r = runSetup(text);
  assert.equal(r.error, null, JSON.stringify(r));
  return r.state;
};

const START = `@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "v1"
@author human
git switch main
@remote origin
@online-only ia/resume
@mr 42 ia/resume -> main "Résumé"
@work plan.md
@new notes.md`;

const after = (state, command) => {
  const result = apply(state, command);
  return { state: result.error ? state : result.state, last: { command, result } };
};

test('every error code of the content maps to an engine key', () => {
  assert.deepEqual(Object.keys(ERROR_KEYS).sort(), [...ERROR_CODES].sort());
});

test('commandIds maps commands to the ids of data/commands.json', () => {
  assert.deepEqual(commandIds('git worktree add ../x -b y'), ['worktree-add', 'worktree']);
  assert.deepEqual(commandIds('git rebase -i HEAD~3'), ['squash', 'rebase']);
  assert.deepEqual(commandIds(parseWebAction('merge MR !42')), ['mr-merge']);
  assert.deepEqual(commandIds('git switch main && git stash pop'), ['switch', 'stash']);
  assert.deepEqual(commandIds('fork'), ['fork']);
  assert.deepEqual(commandIds('nonsense'), []);
});

test('files, index, stash, work-intact', () => {
  const initial = setup(START);
  const ctx = { state: initial, initial };
  assert.ok(check('file rpt-client/plan.md M', ctx));
  assert.ok(check('file rpt-client/notes.md U', ctx));
  assert.ok(check('file rpt-client/intro.md clean', ctx));
  assert.ok(!check('file rpt-client/plan.md staged', ctx));
  assert.ok(check('index rpt-client empty', ctx));
  const staged = play(initial, ['git add plan.md notes.md']).state;
  const c2 = { state: staged, initial };
  assert.ok(check('file rpt-client/plan.md staged', c2));
  assert.ok(!check('file rpt-client/plan.md M', c2), 'M means modified and not staged');
  assert.ok(check('file rpt-client/notes.md A', c2));
  assert.ok(check('index rpt-client contains notes.md', c2));
  assert.ok(!check('index rpt-client empty', c2));
  assert.ok(check('work-intact rpt-client', { state: initial, initial }));
  assert.ok(check('work-intact rpt-client', c2), 'staging keeps the content');
  assert.ok(!check('work-intact rpt-client', { state: play(initial, [{ name: 'touch', args: ['plan.md'] }]).state, initial }));
  const stashed = play(initial, ['git stash']).state;
  assert.ok(check('stash = 1', { state: stashed }));
  assert.ok(check('stash = 0', { state: play(stashed, ['git stash pop']).state }));
  assert.ok(!check('work-intact rpt-client', { state: stashed, initial }));
  assert.ok(workIntact(initial, play(stashed, ['git stash pop']).state, 'rpt-client'));
});

test('branches, desks, refs, commits since', () => {
  let s = setup(START);
  assert.ok(!check('branch ia/resume exists', { state: s }));
  assert.ok(!check('remote ia/resume fetched', { state: s }));
  s = play(s, ['git fetch']).state;
  assert.ok(check('remote ia/resume fetched', { state: s }));
  assert.ok(check('main = origin/main', { state: s }));
  assert.ok(check('commits origin/ia/resume since main = 1', { state: s }));
  s = play(s, ['git worktree add ../revue ia/resume']).state;
  assert.ok(check('branch ia/resume exists', { state: s }));
  assert.ok(check('desk revue on ia/resume', { state: s }));
  assert.ok(check('active desk revue', { state: s }));
  assert.ok(!check('desk revue removed', { state: s }));
  assert.ok(!check('desk revue on main', { state: s }));
  s = play(s, ['git worktree remove ../revue']).state;
  assert.ok(check('desk revue removed', { state: s }));
  assert.ok(check('active desk rpt-client', { state: s }));
  assert.ok(!check('nope = main', { state: s }));
});

test('MR status, diff shown, command, error, no conflict, resolved', () => {
  const s0 = setup(START);
  assert.ok(check('mr 42 open', { state: s0 }));
  const a = after(s0, parseWebAction('approve MR !42'));
  assert.ok(check('mr 42 approved', a));
  assert.ok(check('command mr-approve', a));
  assert.ok(!check('command mr-merge', a));
  const d = after(s0, 'git diff --staged');
  assert.ok(check('diff shown staged', d));
  assert.ok(!check('diff shown work', d));
  assert.ok(check('diff shown work', { state: s0, diffShown: ['work'] }));
  const e = after(play(s0, ['git add plan.md', 'git commit -m "x"', { name: 'colleague', args: ['main'] }, { name: 'touch', args: ['intro.md'] }, 'git commit -am "y"']).state, 'git push');
  assert.ok(check('error push-rejected', e));
  assert.ok(!check('command push', e), 'a failed command is not "the last successful command"');
  assert.ok(check('error nothing-to-commit', after(setup('@files a.md\ngit commit -m "i"'), 'git commit -m "x"')));

  const c = setup(`@files plan.md\ngit commit -m "init"\ngit switch -c ia/x\n@work plan.md\ngit commit -m "x"\ngit switch main\n@work plan.md\ngit commit -m "y"`);
  const m = after(c, 'git merge ia/x');
  assert.ok(check('error conflict', m));
  assert.ok(check('file rpt-client/plan.md conflict', m));
  assert.ok(!check('no conflict', m));
  const r = play(m.state, [{ name: 'resolve', args: ['plan.md', 'ia/x'] }]).state;
  assert.ok(check('no conflict', { state: r }));
  assert.ok(check('resolved rpt-client/plan.md ia/x', { state: r }));
  assert.ok(!check('resolved rpt-client/plan.md main', { state: r }));
});

test('checkAll reports the failing phrases with their line', () => {
  const s = setup(START);
  const res = checkAll([{ text: 'file rpt-client/plan.md M', line: 3 }, { text: 'branch nope exists', line: 4 }, { text: 'not a phrase', line: 5 }], { state: s });
  assert.equal(res.ok, false);
  assert.deepEqual(res.failed.map((f) => f.line), [4, 5]);
  assert.ok(checkAll([], { state: s }).ok);
});
