import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, applyAll, preview, registerCommand, getCommand } from '../../src/engine/apply.js';
import { createState, serialize, deserialize, LIMITS, visibleCommitCount, resolveRev, getDesk } from '../../src/engine/state.js';
import { parse, parseLine, tokenize } from '../../src/engine/parse.js';
import { baseRepo, play, run, work, status, deepFreeze } from './_engine-helpers.js';

test('createState: one main desk on an unborn main branch', () => {
  const s = createState();
  assert.equal(s.worktrees.length, 1);
  assert.equal(s.worktrees[0].main, true);
  assert.equal(s.worktrees[0].branch, 'main');
  assert.equal(s.worktrees[0].head, null);
  assert.deepEqual(s.commits, {});
  assert.deepEqual(s.remotes, {});
  assert.deepEqual(s.remoteRefs, {});
});

test('apply never mutates its input (deep-frozen) and returns the input on error', () => {
  const s = deepFreeze(baseRepo());
  const copy = JSON.parse(JSON.stringify(s));
  for (const c of ['git switch -c ia/x', 'git worktree add ../ia -b ia/y', { name: 'touch', args: ['plan.md'] }, 'git merge nope', 'git status', 'git rebase -i HEAD~1']) {
    const r = apply(s, c);
    assert.deepEqual(JSON.parse(JSON.stringify(s)), copy);
    if (r.error) assert.equal(r.state, s);
  }
});

test('read-only commands return the very same state object', () => {
  const s = deepFreeze(baseRepo());
  for (const c of ['git status', 'git log', 'git diff', 'git worktree list', 'git branch', 'git stash list', 'git show', 'ls']) {
    assert.equal(apply(s, c).state, s, c);
  }
});

test('JSON round trip keeps the state identical', () => {
  const s = play(baseRepo(), ['git worktree add ../ia -b ia/x', ...work('plan.md'), 'git stash']).state;
  assert.deepEqual(deserialize(serialize(s)), s);
});

test('replaying the same command list twice gives deep-equal states (deterministic ids, no clock)', () => {
  const cmds = [
    'git switch -c ia/a', ...work('plan.md'), 'git commit -am "a"', 'git switch main',
    'git worktree add ../desk2 -b ia/b', ...work('intro.md'), 'git commit -am "b"', 'cd rapport-client',
    'git merge ia/a', 'git merge ia/b', { name: 'create', args: [] }, 'git reset --soft HEAD~1', 'git stash',
  ];
  const a = play(baseRepo(), cmds).state;
  const b = play(baseRepo(), cmds).state;
  assert.deepEqual(a, b);
  assert.ok(Object.keys(a.commits).every((id) => /^c\d+$/.test(id)));
});

test('a single .git: every desk sees the same commits and branches', () => {
  const s = play(baseRepo(), ['git worktree add ../ia -b ia/x', ...work('plan.md'), 'git commit -am "ai"']).state;
  assert.equal(s.worktrees.length, 2);
  for (const w of s.worktrees) {
    assert.equal(w.commits, undefined);
    assert.equal(w.branches, undefined);
  }
  const id = s.branches['ia/x'].tip;
  assert.ok(s.commits[id]);
  const r = run(s, 'cd rapport-client');
  assert.equal(resolveRev(r.state, getDesk(r.state, null), 'ia/x').id, id);
});

test('a branch is checked out in at most one desk', () => {
  const s = play(baseRepo(), ['git worktree add ../ia -b ia/x']).state;
  const r1 = run(s, 'git switch main');
  assert.equal(r1.error.key, 'error.branchInUse');
  assert.deepEqual(r1.error.params, { name: 'main', path: 'rapport-client' });
  assert.equal(run(s, 'git worktree add ../other ia/x').error.key, 'error.branchInUse');
  assert.equal(run(s, 'git checkout main').error.key, 'error.branchInUse');
});

test('limits: branches, desks, commits', () => {
  let s = baseRepo();
  for (let i = 1; i < LIMITS.branches; i += 1) s = play(s, [`git branch b${i}`]).state;
  assert.equal(Object.keys(s.branches).length, LIMITS.branches);
  assert.equal(run(s, 'git branch one-too-many').error.key, 'error.limitBranches');
  assert.equal(run(s, 'git switch -c one-too-many').error.key, 'error.limitBranches');

  let d = baseRepo();
  for (let i = 1; i < LIMITS.desks; i += 1) d = play(d, [`git worktree add ../d${i} -b ia/d${i}`]).state;
  const r = run(d, 'git worktree add ../d9 -b ia/d9');
  assert.equal(r.error.key, 'error.limitDesks');
  assert.deepEqual(r.error.params, { max: 4 });

  let c = baseRepo();
  while (visibleCommitCount(c) < LIMITS.commits) c = play(c, [...work('plan.md'), 'git commit -am "x"']).state;
  const rc = run(play(c, work('plan.md')).state, 'git commit -am "x"');
  assert.equal(rc.error.key, 'error.limitCommits');
});

test('parse: commands, options, quotes, sequences', () => {
  assert.deepEqual(parse('git commit -m "First draft"').options, { m: 'First draft' });
  const am = parse('git commit -am “wip”');
  assert.equal(am.options.a, true);
  assert.equal(am.options.m, 'wip');
  const w = parse('git worktree add ../rapport-ia-chiffres -b ia/chiffres');
  assert.equal(w.name, 'worktree');
  assert.deepEqual(w.args, ['add', '../rapport-ia-chiffres']);
  assert.equal(w.options.b, 'ia/chiffres');
  assert.deepEqual(parse('git reset --hard HEAD~2').options, { hard: true });
  assert.deepEqual(parse('git diff --cached').options, { staged: true });
  assert.equal(parse('git rebase -i HEAD~3').options.i, true);
  assert.deepEqual(parse('git switch -c ia/plan').options, { c: 'ia/plan' });
  assert.equal(parse('cd ../rapport-ia').name, 'cd');
  assert.deepEqual(tokenize('git commit -m "a b" && git push'), ['git', 'commit', '-m', 'a b', '&&', 'git', 'push']);
  const seq = parse('git switch main && git stash pop');
  assert.equal(seq.name, 'sequence');
  assert.equal(seq.commands.length, 2);
  assert.equal(parseLine('git status').length, 1);
});

test('parse: unknown commands get a suggestion (edit distance)', () => {
  assert.deepEqual(parse('git swich main').error, { key: 'error.unknownCommand.suggest', params: { input: 'git swich main', suggestion: 'git switch main' } });
  assert.equal(parse('git stauts').error.params.suggestion, 'git status');
  assert.equal(parse('status').error.params.suggestion, 'git status');
  assert.equal(parse('git frobnicate').error.key, 'error.unknownCommand');
  assert.equal(parse('git init').error.key, 'error.outOfScope.init');
  assert.equal(parse('').error.key, 'error.emptyCommand');
  const r = apply(baseRepo(), 'git comit -m x');
  assert.equal(r.error.key, 'error.unknownCommand.suggest');
});

test('sequence is atomic: a failing step leaves the state untouched', () => {
  const s = deepFreeze(baseRepo());
  const r = apply(s, 'git switch -c ia/a && git switch nope');
  assert.equal(r.error.key, 'error.unknownBranch');
  assert.equal(r.state, s);
  const ok = apply(s, 'git switch -c ia/a && git switch main');
  assert.equal(ok.error, null);
  assert.equal(ok.explanations.length, 2);
});

test('applyAll stops at the first error and preview does not apply', () => {
  const s = baseRepo();
  const r = applyAll(s, ['git branch a', 'git branch a', 'git branch b']);
  assert.equal(r.index, 1);
  assert.equal(r.error.key, 'error.branchExists');
  assert.ok(r.state.branches.a);
  const ev = preview(s, 'git branch z');
  assert.equal(ev[0].type, 'lane.forked');
  assert.equal(s.branches.z, undefined);
});

test('registry is extensible', () => {
  assert.equal(apply(baseRepo(), 'git fetch').error.key, 'error.notAvailable');
  registerCommand({ name: 'test-noop', readOnly: true, run(ctx) { ctx.explain('explain.ls', {}); } });
  assert.ok(getCommand('test-noop'));
  assert.equal(apply(baseRepo(), { name: 'test-noop', args: [], options: {} }).explanation.key, 'explain.ls');
});

test('explanations and errors are i18n keys present in both dictionaries', async () => {
  const { readFileSync } = await import('node:fs');
  const en = JSON.parse(readFileSync(new URL('../../src/i18n/en.json', import.meta.url)));
  const fr = JSON.parse(readFileSync(new URL('../../src/i18n/fr.json', import.meta.url)));
  const s = baseRepo();
  const samples = ['git status', 'git switch -c ia/a', 'git merge nope', 'git commit -m x', 'git worktree add ../x -b ia/x', 'git log', 'git diff'];
  for (const c of samples) {
    const r = apply(s, c);
    for (const k of [r.explanation && r.explanation.key, r.error && r.error.key].filter(Boolean)) {
      assert.ok(k in en, `${k} missing in en`);
      assert.ok(k in fr, `${k} missing in fr`);
    }
  }
  assert.equal(status(s, 'plan.md'), 'clean');
});
