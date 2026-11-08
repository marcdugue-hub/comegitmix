// Pure step engine of the mission screen (src/ui/mission-steps.js), played on the real content files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMission } from '../../src/content/mission.js';
import {
  startSession, partSession, act, autoStep, gotoStep, noteDiff, currentStep, isPartDone, stepAccepts, stepKind,
  wildcardMatch, lockedReposFor, missionNumbers, paletteFor, paletteInsert, highlightFor, workState, diffTarget,
  predictAiFiles, aiCommand,
} from '../../src/ui/mission-steps.js';
import { compareModel, deskTone } from '../../src/ui/mission-compare.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (id, lang = 'fr') => parseMission(readFileSync(join(ROOT, 'content', 'missions', `${id}.${lang}.md`), 'utf8'));
const catalogue = JSON.parse(readFileSync(join(ROOT, 'data', 'commands.json'), 'utf8'));

test('mission 1: typed commands and a scene click advance the steps', () => {
  const m = load('01-premiere-photo');
  let s = startSession(m);
  assert.equal(s.index, 0);
  assert.equal(stepKind(currentStep(s)), 'command');

  let r = act(s, 'git log'); // succeeds but is not the expected command
  assert.equal(r.completed, false);
  s = r.session;
  r = act(s, 'git   status');
  assert.equal(r.completed, true);
  assert.equal(r.step.n, 1);
  s = r.session;
  assert.equal(s.index, 1);
  assert.equal(stepKind(currentStep(s)), 'instruction');

  const desk = s.state.worktrees[0].id;
  r = act(s, { name: 'click', args: [desk, 'resume.md'] }); // wrong file
  assert.equal(r.completed, false);
  r = act(r.session, { name: 'click', args: [desk, 'resume.md'] }); // back to staged, still wrong
  r = act(r.session, { name: 'click', args: [desk, 'plan.md'] });
  assert.equal(r.completed, true);
  s = r.session;

  r = act(s, 'git add intro.md');
  assert.ok(r.completed);
  r = act(r.session, 'git commit -m "Whatever I like"'); // accepts: git commit -m "*"
  assert.ok(r.completed);
  assert.ok(isPartDone(r.session));
  assert.equal(currentStep(r.session), null);
});

test('a failing command does not advance, unless the step expects that error', () => {
  const m = load('05-partager-avec-l-equipe');
  let s = gotoStep(startSession(m), 3);
  assert.equal(s.index, 3);
  // the before: lines of step 4 are already played (a colleague pushed): git push is refused
  const r = act(s, 'git push');
  assert.ok(r.result.error);
  assert.equal(r.completed, true, 'step 4 expects push-rejected');
  s = r.session;
  const bad = act(s, 'git merge nowhere');
  assert.ok(bad.result.error);
  assert.equal(bad.completed, false);
  assert.equal(bad.session.index, s.index);
});

test('autoStep plays every kind of step: every mission and part can be replayed to its end', () => {
  for (const f of readdirSync(join(ROOT, 'content', 'missions')).filter((x) => x.endsWith('.md'))) {
    const m = parseMission(readFileSync(join(ROOT, 'content', 'missions', f), 'utf8'));
    if (m.mode === 'compare') continue;
    for (let p = 0; p < m.parts.length; p += 1) {
      const s = gotoStep(partSession(m, p), 999);
      assert.equal(s.error, null, `${f} part ${p}`);
      assert.ok(isPartDone(s), `${f} part ${p} stops at step ${s.index + 1}`);
    }
  }
});

test('stepper: going back recomputes the scene from the initial state (replay, not undo)', () => {
  const m = load('06-relire-une-mr');
  const s0 = startSession(m, { part: 'A' });
  const s4 = gotoStep(s0, 4);
  assert.equal(s4.index, 4);
  assert.equal(s4.state.worktrees[0].branch, 'ia/graphiques');
  assert.equal(workState(s4.state), 'stashed');
  const back = gotoStep(s4, 1);
  assert.equal(back.index, 1);
  assert.equal(back.state.worktrees[0].branch, 'main');
  assert.equal(workState(back.state), 'visible');
  assert.deepEqual(back.initial, s0.initial);
  // same result as playing the first step by hand
  const byHand = act(s0, 'git status').session;
  assert.equal(JSON.stringify(byHand.state), JSON.stringify(back.state));
  // startSession with a step index replays too (reload, language switch)
  const restored = startSession(m, { part: 'A', step: 4 });
  assert.equal(JSON.stringify(restored.state), JSON.stringify(s4.state));
  // part B starts again from the mission setup
  const b = startSession(m, { part: 'B' });
  assert.equal(b.part.letter, 'B');
  assert.equal(b.index, 0);
  assert.equal(workState(b.state), 'visible');
});

test('web steps play site actions; the check waits for the merge', () => {
  const m = load('06-relire-une-mr');
  const s = gotoStep(startSession(m, { part: 'B' }), 3);
  assert.equal(stepKind(currentStep(s)), 'web');
  const approve = act(s, { name: 'mr', args: ['approve', 42] });
  assert.equal(approve.completed, false);
  const merge = act(approve.session, { name: 'mr', args: ['merge', 42] });
  assert.equal(merge.completed, true);
  assert.equal(merge.session.index, 4);
  const auto = autoStep(s);
  assert.equal(auto.completed, true);
  assert.equal(auto.results.length, 2);
});

test('AI steps: ai-files and messages, two desks before the check holds', () => {
  const m = load('03-deux-assistants');
  let s = gotoStep(startSession(m), 2);
  const step = currentStep(s);
  assert.equal(stepKind(step), 'instruction');
  const hl = highlightFor(step, s.state);
  assert.equal(hl.desks.length, 2);
  const [d1, d2] = hl.desks;
  const files = predictAiFiles(s.state, d1, step);
  assert.ok(files.length >= 1);
  let r = act(s, aiCommand(s.state, d1, step, 'Texte de test'));
  assert.equal(r.completed, false);
  assert.deepEqual(r.result.output.files, files);
  const commit = r.result.state.commits[r.result.output.commit];
  assert.equal(commit.msg, 'Texte de test');
  r = act(r.session, aiCommand(r.session.state, d2, step, ''));
  assert.equal(r.completed, true);
});

test('diff shown from the scene counts for the step', () => {
  const m = load('04-relire-avant-d-accepter');
  const s = startSession(m);
  const fake = { ...s, part: { ...s.part, steps: [{ ...s.part.steps[0], check: [{ text: 'diff shown work', line: 1 }] }] } };
  const r = noteDiff(fake, 'work');
  assert.equal(r.completed, true);
});

test('accepted spellings and wildcards', () => {
  const step = { command: 'git switch ia/resume', accepts: ['git checkout ia/resume'], isInstruction: false };
  assert.ok(stepAccepts(step, 'git switch  ia/resume'));
  assert.ok(stepAccepts(step, 'git checkout ia/resume'));
  assert.ok(!stepAccepts(step, 'git switch main'));
  assert.ok(wildcardMatch('git commit -m "*"', 'git commit -m "x y"'));
  assert.ok(!wildcardMatch('git commit -m "*"', 'git commit -am "x"'));
  assert.ok(stepAccepts({ command: 'git cherry-pick ia/essai~1', accepts: ['git cherry-pick *'] }, 'git cherry-pick c7'));
});

test('progression helpers: zone ① locks, numbering, palette', () => {
  assert.deepEqual(lockedReposFor(1), { origin: 5 });
  assert.deepEqual(lockedReposFor(4), { origin: 5 });
  assert.deepEqual(lockedReposFor(5), {});
  assert.deepEqual(lockedReposFor(null), {});
  const { numbers, total } = missionNumbers(['a', 'b', 'c', 'd'], { c: 'compare' });
  assert.deepEqual(numbers, { a: 1, b: 2, d: 3 });
  assert.equal(total, 3);
  const pal = paletteFor(1, catalogue);
  assert.deepEqual(pal.unlocked.map((c) => c.id), ['status', 'add', 'commit']);
  assert.ok(pal.locked.every((c) => c.unlock === 2));
  assert.equal(paletteInsert('git add <fichier>'), 'git add ');
  assert.equal(paletteInsert('git status'), 'git status');
  assert.equal(paletteInsert('(site) Approuver la MR'), null);
});

test('diff targets of diff commands', () => {
  const m = load('02-une-voie-pour-l-ia');
  const s = startSession(m);
  assert.deepEqual(diffTarget('git diff main ia/resume', s.state), { mode: 'branches', a: 'main', b: 'ia/resume' });
  assert.deepEqual(diffTarget('git diff main...ia/x', s.state), { mode: 'branches', a: 'main', b: 'ia/x', threeDot: true });
  assert.deepEqual(diffTarget('git diff --staged', s.state), { mode: 'staged' });
  assert.deepEqual(diffTarget('git diff', s.state), { mode: 'work' });
  assert.equal(diffTarget('git status', s.state), null);
});

test('compare model: columns replay the parts with their desk chips', () => {
  const data = load('06b-deux-facons');
  const model = compareModel(data, { '06-relire-une-mr': load('06-relire-une-mr') });
  assert.equal(model.columns.length, 2);
  assert.equal(model.columns[0].rows.length, 7);
  assert.equal(model.columns[1].rows.length, 6);
  assert.equal(model.columns[0].rows[1].command, 'git stash');
  assert.equal(model.columns[0].rows[5].command, 'approve MR !42');
  assert.equal(model.columns[0].replay, '#/mission/06-relire-une-mr?part=A&step=1');
  assert.equal(deskTone('intact'), 'ok');
  assert.equal(deskTone('restored'), 'back');
  assert.equal(deskTone('changed'), 'bad');
  assert.equal(model.boxes.length, 3);
});
