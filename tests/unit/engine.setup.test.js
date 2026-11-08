import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { runSetup, applySetupLines, conflictBlocksFrom, setupLinesFromText } from '../../src/engine/setup.js';
import { toSetup, commandText } from '../../src/engine/to-setup.js';
import { equivalent, difference } from '../../src/engine/equivalence.js';
import { getDesk, findFile } from '../../src/engine/state.js';
import { play, status, file, deepFreeze } from './_engine-helpers.js';

const ok = (text, opts) => {
  const r = runSetup(text, opts);
  assert.equal(r.error, null, `${r.line}: ${r.text} -> ${JSON.stringify(r.error)}`);
  return deepFreeze(r.state);
};

test('directives: @files, @work, @new, @content, @author, @cd and lenient commits', () => {
  const s = ok(`
@files plan.md chapitres/ch1.md
git commit -m "init"
@author ai
git switch -c ia/x
@work plan.md
git commit -m "ai"
@author human
git switch main
git worktree add ../revue ia/x
@cd rpt-client
@new notes.md
@content plan.md
  Line one
    indented
@work chapitres/ch1.md
`, { folder: 'rpt-client' });
  const tip = s.commits[s.branches['ia/x'].tip];
  assert.equal(tip.author, 'ai');
  assert.equal(tip.msg, 'ai');
  assert.equal(s.commits[s.branches.main.tip].author, 'human');
  assert.equal(s.active, getDesk(s, 'rpt-client').id);
  assert.equal(status(s, 'notes.md'), 'U');
  assert.equal(file(s, 'plan.md').work, 'Line one\n  indented');
  assert.equal(status(s, 'chapitres/ch1.md'), 'M');
  assert.equal(getDesk(s, 'revue').branch, 'ia/x');
  assert.equal(s.author, 'human');
});

test('errors carry the source line; nothing is thrown', () => {
  const r = runSetup([{ text: '@files a.md', line: 10 }, { text: 'git commit -m "i"', line: 11 }, { text: 'git switch nope', line: 12 }]);
  assert.equal(r.line, 12);
  assert.equal(r.error.key, 'error.unknownBranch');
  assert.equal(r.text, 'git switch nope');
  assert.ok(r.state.branches.main, 'state before the failing line');
  assert.equal(runSetup('@bogus x').error.key, 'error.setupUnknownDirective');
  assert.equal(runSetup('@work missing.md').error.key, 'error.unknownFile');
  assert.equal(runSetup('@files a.md\n@mr 1 a main "x"').error.key, 'error.setupSyntax');
});

test('@rebase-plan is used by the next interactive rebase', () => {
  const s = ok(`@files a.md\ngit commit -m "init"\ngit switch -c ia/x\n@work a.md\ngit commit -m "1"\n@work a.md\ngit commit -m "2"\n@work a.md\ngit commit -m "3"\n@rebase-plan pick,squash,drop`);
  assert.deepEqual(s.rebasePlan, ['pick', 'squash', 'drop']);
  const r = apply(s, 'git rebase -i HEAD~3');
  assert.equal(r.error, null);
  assert.equal(r.state.rebasePlan, null);
});

test('conflict blocks become state.conflictBlocks and detail the conflict', () => {
  const blocks = [{ path: 'plan.md', line: 3, sides: [{ branch: 'main', lines: ['March'] }, { branch: 'ia/x', lines: ['April'] }] }];
  assert.deepEqual(conflictBlocksFrom(blocks), [{ path: 'plan.md', first: 'main', second: 'ia/x', firstText: 'March', secondText: 'April' }]);
  const s = ok(`@files plan.md\ngit commit -m "init"\ngit switch -c ia/x\n@work plan.md\ngit commit -m "x"\ngit switch main\n@work plan.md\ngit commit -m "y"\ngit merge ia/x`, { conflicts: blocks });
  const f = findFile(getDesk(s), 'plan.md');
  assert.equal(f.status, 'conflict');
  assert.equal(f.conflict.detailed, true);
  const resolved = play(s, [{ name: 'resolve', args: ['plan.md', 'ia/x'] }]).state;
  assert.equal(findFile(getDesk(resolved), 'plan.md').work, 'April');
});

test('applySetupLines continues from a state (step "before:")', () => {
  const s = ok(`@files plan.md\ngit commit -m "init"\n@remote origin`);
  const r = applySetupLines(s, [{ text: '@colleague main "fix"', line: 40 }, { text: '@work plan.md', line: 41 }]);
  assert.equal(r.error, null);
  assert.notEqual(r.state.remotes.origin.branches.main.tip, s.branches.main.tip);
  assert.equal(status(r.state, 'plan.md'), 'M');
  assert.deepEqual(setupLinesFromText('```git-setup\n@files a.md\n\n# comment\n```').map((l) => l.text), ['@files a.md', '# comment']);
});

test('equivalence ignores ids and messages, not shapes', () => {
  const base = ok(`@files a.md b.md\ngit commit -m "init"`);
  const a = play(base, ['git switch -c ia/x', { name: 'touch', args: ['a.md'] }, 'git commit -am "one"']).state;
  const b = play(base, ['git switch -c ia/x', { name: 'touch', args: ['a.md'] }, 'git commit -am "another message"']).state;
  assert.ok(equivalent(a, b));
  assert.equal(difference(a, b), null);
  const c = play(base, ['git switch -c ia/x', { name: 'touch', args: ['b.md'] }, 'git commit -am "one"']).state;
  assert.ok(!equivalent(a, c));
  assert.equal(difference(a, c), 'branches');
  const d = play(base, ['git branch ia/x']).state;
  assert.ok(!equivalent(a, d));
});

test('commandText writes command objects as terminal text', () => {
  assert.equal(commandText({ name: 'commit', args: [], options: { m: 'Mon intro' } }), 'git commit -m "Mon intro"');
  assert.equal(commandText({ name: 'restore', args: ['a.md'], options: { staged: true } }), 'git restore --staged a.md');
  assert.equal(commandText({ name: 'cd', args: ['../x'], options: {} }), 'cd ../x');
  assert.equal(commandText('git status'), 'git status');
});

const START = `@files plan.md intro.md resume.md
git commit -m "init"
@author ai
git switch -c ia/resume
@work resume.md
git commit -m "v1"
@author human
git switch main
@work plan.md
git commit -m "plan"
git worktree add ../rpt-ia-resume ia/resume
@cd rpt-client
@remote origin
@mr 7 ia/resume -> main "Résumé"`;

test('Copy as start: toSetup then runSetup gives back an equivalent state', () => {
  const lines = setupLinesFromText(START);
  const start = ok(lines);
  const commands = [
    { name: 'click', args: ['intro.md'] },
    { name: 'click', args: ['intro.md'] },
    'git commit -m "Intro réécrite"',
    { name: 'create', args: [] },
    { name: 'touch', args: ['rpt-ia-resume', 'plan.md'], options: { content: 'Exact\ncontent' } },
    { name: 'ai', args: ['rpt-ia-resume'], options: { message: 'Le résumé est plus court' } },
    { name: 'colleague', args: ['main'], options: { message: 'Correction' } },
    { name: 'mr', args: ['approve', 7] },
    'git fetch && git status',
    { name: 'assistant' },
    'cd ../rpt-client',
    'git switch -c ia/conf',
    { name: 'touch', args: ['resume.md'] },
    'git commit -am "conf"',
    'git switch main',
    { name: 'touch', args: ['resume.md'] },
    'git commit -am "main"',
    'git merge ia/conf',
    { name: 'resolve', args: ['resume.md', 'both'] },
    'git add resume.md',
    'git commit -m "merged"',
    { name: 'rebase', args: ['main'], options: {} },
  ];
  let final = start;
  for (const c of commands) {
    const r = apply(final, c);
    if (r.error) continue; // the last rebase is a no-op on main; failures are not part of history
    final = r.state;
  }
  const history = [];
  let s = start;
  for (const c of commands) { const r = apply(s, c); if (!r.error) { history.push(c); s = r.state; } }
  const out = toSetup({ start, startLines: lines, commands: history });
  assert.deepEqual(out.skipped, []);
  assert.ok(out.block.startsWith('```git-setup\n'));
  const replay = runSetup(out.lines);
  assert.equal(replay.error, null, `${replay.line}: ${replay.text} -> ${JSON.stringify(replay.error)}\n${out.text}`);
  assert.equal(difference(final, replay.state), null, out.text);
  assert.ok(equivalent(final, replay.state));
});
