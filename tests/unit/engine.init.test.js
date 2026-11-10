// From a plain folder to GitHub: @no-git, git init, git remote add, gh repo create (docs/GIT-MODEL.md, docs/AUTHORING.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { parse } from '../../src/engine/parse.js';
import { runSetup } from '../../src/engine/setup.js';
import { commandIds } from '../../src/engine/predicates.js';
import { findFile, activeDesk } from '../../src/engine/state.js';

const plainFolder = () => runSetup('@no-git\n@new README.md programme.md', { folder: 'atelier-ia' }).state;
const run = (state, ...commands) => commands.reduce((s, c) => {
  const r = apply(s, c);
  assert.equal(r.error, null, `${c}: ${JSON.stringify(r.error)}`);
  return r.state;
}, state);
const firstCommit = () => run(plainFolder(), 'git init', 'git add .', 'git commit -m "Premier commit"');

test('before git init, git commands fail with notARepo; the shell and scene actions still work', () => {
  const s = plainFolder();
  assert.equal(s.noGit, true);
  for (const c of ['git status', 'git add .', 'git commit -m x', 'git log', 'glab mr list']) assert.equal(apply(s, c).error.key, 'error.notARepo', c);
  assert.equal(apply(s, 'ls').error, null);
  const clicked = apply(s, { name: 'click', args: ['README.md'] });
  assert.equal(clicked.error, null);
  assert.equal(findFile(activeDesk(clicked.state), 'README.md').staged, false, 'no index before git init: a click edits, it does not stage');
});

test('git init creates the repository; a second git init changes nothing', () => {
  const s = run(plainFolder(), 'git init');
  assert.equal(s.noGit, undefined);
  assert.equal(findFile(activeDesk(s), 'README.md').status, 'U');
  const again = apply(s, 'git init');
  assert.equal(again.error, null);
  assert.equal(again.state, s);
  assert.equal(again.explanation.key, 'explain.init.again');
  assert.equal(parse('git init').name, 'init');
});

test('gh repo create without --source: the repository is online but not linked until git remote add', () => {
  let s = run(firstCommit(), 'gh repo create atelier-ia --public');
  assert.equal(s.remotes.origin.pending, true);
  assert.ok(s.visibleRepos.includes('origin'));
  assert.equal(apply(s, 'git push').error.key, 'error.noRemote');
  assert.equal(apply(s, 'gh repo create atelier-ia').error.key, 'error.ghRepoExists');
  s = run(s, 'git remote add origin https://github.com/demo/atelier-ia.git');
  assert.equal(s.remotes.origin.pending, undefined);
  assert.equal(apply(s, 'git remote add origin x').error.key, 'error.remoteExists');
  s = run(s, 'git push -u origin main');
  assert.equal(s.remoteRefs['origin/main'].tip, s.branches.main.tip);
  assert.equal(s.branches.main.upstream, 'origin/main');
});

test('git remote add refuses an address where nothing was created', () => {
  assert.equal(apply(firstCommit(), 'git remote add origin https://github.com/demo/x.git').error.key, 'error.remoteNotCreated');
  assert.equal(apply(firstCommit(), 'git remote add perso https://x').error.key, 'error.unknownRemote');
});

test('gh repo create --source=. --push creates, links and pushes in one command', () => {
  for (const c of ['gh repo create atelier-ia --public --source=. --push', 'gh repo create --private -s . --push']) {
    const s = run(firstCommit(), c);
    assert.equal(s.remotes.origin.url, 'https://github.com/demo/atelier-ia.git');
    assert.equal(s.remoteRefs['origin/main'].tip, s.branches.main.tip);
  }
  assert.equal(apply(plainFolder(), 'gh repo create --source=. --push').error.key, 'error.notARepo');
  assert.equal(apply(run(plainFolder(), 'git init'), 'gh repo create --source=. --push').error.key, 'error.noCommitYet');
  assert.equal(apply(firstCommit(), 'gh repo create x --push').error.key, 'error.ghPushNeedsSource');
  assert.equal(parse('gh pr create').error.key, 'error.ghOnlyRepoCreate');
  assert.equal(parse('gh repo create x --frobnicate').error.key, 'error.ghOption');
});

test('command ids of the new commands', () => {
  assert.deepEqual(commandIds('git init'), ['init']);
  assert.deepEqual(commandIds('git remote add origin x'), ['remote-add', 'remote']);
  assert.deepEqual(commandIds('gh repo create x --public'), ['gh-repo-create']);
});
