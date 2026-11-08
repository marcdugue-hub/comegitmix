// Sandbox pure helpers: palette model, argument requirements, suggestions, labels, raw output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSandbox } from '../../src/content/sandbox.js';
import { parse } from '../../src/engine/parse.js';
import { apply } from '../../src/engine/apply.js';
import {
  paletteGroups, paletteLabel, planCommand, activeSteps, suggestLines, commandIcon, historyText, outputLines,
  joinFiles, aiText, deskFolderFor, nextBranchName,
} from '../../src/ui/sandbox-model.js';
import { startFromSandbox } from '../../src/ui/sandbox-starts.js';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const commandsJson = JSON.parse(read('data/commands.json'));
const start = (id) => startFromSandbox(parseSandbox(read(`content/sandbox/${id}.en.md`))).state;

/** Answers every step with its first option (or its default text). */
function firstAnswers(plan) {
  const values = [];
  for (let i = 0; i < plan.steps.length; i += 1) {
    const s = plan.steps[i];
    if (s.when && !s.when(values)) continue;
    if (s.kind === 'text') values[i] = s.value;
    else if (s.options.length) values[i] = s.options[0].value;
    else return null;
  }
  return values;
}

test('palette groups follow data/commands.json (6 groups, every command known)', () => {
  const groups = paletteGroups(commandsJson);
  assert.deepEqual(groups.map((g) => g.id), ['prepare', 'lanes', 'rewrite', 'share', 'parallel', 'read']);
  for (const g of groups) for (const c of g.commands) assert.ok(planCommand(c.id, start('deux-ia')), `no plan for ${c.id}`);
  assert.equal(paletteLabel('worktree-add'), 'worktree add');
  assert.equal(paletteLabel('cherry-pick'), 'cherry-pick');
});

test('every palette command builds a command the engine recognises, with its arguments', () => {
  const states = ['deux-ia', 'equipe', 'solo', 'conflit'].map(start);
  for (const state of states) {
    for (const g of paletteGroups(commandsJson)) {
      for (const c of g.commands) {
        const plan = planCommand(c.id, state);
        const values = firstAnswers(plan);
        if (!values) continue; // nothing to choose: the panel explains why
        const command = plan.build(values);
        if (typeof command === 'string') {
          const p = parse(command);
          assert.equal(p.error, undefined, `${c.id} -> ${command}: ${JSON.stringify(p.error)}`);
        } else {
          assert.equal(typeof command.name, 'string');
        }
        const r = apply(state, command);
        assert.ok(!r.error || /^error\./.test(r.error.key), `${c.id}: ${JSON.stringify(r.error)}`);
      }
    }
  }
});

test('argument requirements: add offers changed files, branch asks a name, worktree add can create a branch', () => {
  const s = start('deux-ia');
  const add = planCommand('add', s);
  assert.equal(add.steps.length, 1);
  assert.equal(add.steps[0].kind, 'pick');
  const solo = start('solo');
  const files = planCommand('add', solo).steps[0].options.map((o) => o.value);
  assert.ok(files.includes('.'));
  assert.ok(files.includes('resume.md'));
  const br = planCommand('branch', s);
  assert.equal(br.steps[0].kind, 'text');
  assert.equal(br.build(['feature/x']), 'git branch feature/x');
  const wt = planCommand('worktree-add', s);
  assert.equal(activeSteps(wt, []).length, 1);
  assert.equal(activeSteps(wt, ['\u0000new']).length, 2);
  assert.equal(wt.build(['\u0000new', 'ia/demo']), 'git worktree add ../rpt-client-demo -b ia/demo');
  const reset = planCommand('reset', solo);
  assert.equal(reset.steps.length, 2);
  assert.match(reset.build([reset.steps[0].options[0].value, 'hard']), /^git reset --hard c\d+$/);
  assert.equal(planCommand('mr-approve', start('equipe')).build([42]), 'glab mr approve 42');
  assert.equal(planCommand('mr-merge', start('equipe')).build([42]), 'glab mr merge 42');
  assert.equal(planCommand('mr-create', start('equipe')).build([]), 'glab mr create --fill');
  assert.equal(planCommand('nope', s), null);
});

test('helpers: folder names, branch names, joins, AI text', () => {
  const s = start('deux-ia');
  assert.equal(deskFolderFor(s, 'ia/x'), 'rpt-client-x');
  assert.match(nextBranchName(s), /^feature\//);
  assert.equal(joinFiles(['a']), 'a');
  assert.match(joinFiles(['a', 'b', 'c']), /^a, b .+ c$/);
  assert.equal(aiText([{ text: 'did {files}' }, { text: 'two' }], 2, ['x.md']), 'did x.md');
  assert.equal(aiText([], 0, []), '');
});

test('suggestions complete commands, branches, files and folders as whole lines', () => {
  const s = start('deux-ia');
  assert.deepEqual(suggestLines('', s), []);
  assert.ok(suggestLines('git sw', s).includes('git switch'));
  assert.ok(suggestLines('git switch ', s).includes('git switch ia/agent-1'));
  assert.ok(suggestLines('git merge feat', s).includes('git merge feature/intro'));
  assert.ok(suggestLines('cd ', s).includes('cd ../rpt-ia-resume'));
  assert.ok(suggestLines('git add ', start('solo')).some((l) => l.startsWith('git add ')));
  assert.ok(suggestLines('git switch ', s).length <= 6);
});

test('history labels and icons', () => {
  const s = start('deux-ia');
  assert.equal(historyText('git status', s), 'git status');
  assert.equal(commandIcon('git commit -m x'), 'camera');
  assert.equal(commandIcon({ name: 'ai', args: [] }), 'star');
  assert.equal(commandIcon('nonsense words'), 'terminal');
  assert.equal(typeof historyText({ name: 'click', args: ['w1', 'plan.md'] }, s), 'string');
  assert.equal(historyText({ name: 'switch', args: ['main'], options: {}, desk: 'w2' }, s), 'git switch main (rpt-ia-resume)');
});

test('raw output lines are mapped to scene elements', () => {
  const s = start('solo');
  const st = apply(s, 'git status');
  const lines = outputLines(st.output, st.state);
  assert.ok(lines.length > 2);
  assert.ok(lines.some((l) => l.hl && l.hl.files && l.hl.files[0].path === 'resume.md'));
  const log = apply(s, 'git log');
  const ll = outputLines(log.output, log.state);
  assert.equal(ll.length, log.output.commits.length);
  assert.deepEqual(ll[0].hl, { commits: [log.output.commits[0].id] });
  assert.deepEqual(outputLines(null, s), []);
  const wt = apply(start('deux-ia'), 'git worktree list');
  assert.equal(outputLines(wt.output, wt.state).length, 3);
});
