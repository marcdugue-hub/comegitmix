// Diff screen, conflict screen and log view: string rendering on fixture states (no DOM needed).
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setDictionary, setLang } from '../../src/i18n/i18n.js';
import { apply } from '../../src/engine/apply.js';
import { diffScreenHtml, diffModel, unifiedRowsHtml, sideRowsHtml, diffCommand, defaultLanes } from '../../src/render/diff-screen.js';
import { conflictScreenHtml, conflictModel } from '../../src/render/conflict-screen.js';
import { logHtml } from '../../src/render/log-view.js';
import { workState, conflictState, historyState, lanesState } from '../../dev/screens-fixtures.js';

const dict = (lang) => JSON.parse(readFileSync(new URL(`../../src/i18n/${lang}.json`, import.meta.url), 'utf8'));
const EN = dict('en');

before(async () => {
  setDictionary('fr', dict('fr'));
  setDictionary('en', EN);
  await setLang('en');
});

const ui = (extra) => ({ mode: 'work', view: 'side', index: 0, a: 'main', b: 'ia/resume', desk: null, ...extra });

test('diff commands are the equivalent git commands', () => {
  assert.equal(diffCommand('work'), 'git diff');
  assert.equal(diffCommand('staged'), 'git diff --staged');
  assert.equal(diffCommand('branches', 'main', 'ia/resume'), 'git diff main ia/resume');
  assert.deepEqual(defaultLanes(lanesState()), { a: 'main', b: 'ia/resume' });
});

test('branches mode: command, lanes, side-by-side with folding and +/- signs', () => {
  const html = diffScreenHtml(workState(), ui({ mode: 'branches', index: 1 })); // resume.md
  assert.match(html, /git diff main ia\/resume/);
  assert.match(html, /diff-pill--dark">main</);
  assert.match(html, /diff-pill--orange">ia\/resume</);
  assert.match(html, /data-view="side"/);
  assert.match(html, /−<\/span>/);
  assert.match(html, /<span class="dg">\+<\/span>/);
  assert.match(html, /dc--fold">··· \d+ unchanged lines/);
  assert.match(html, /aria-selected="true"[^>]*>Between two lanes/);
});

test('unified view groups removed lines before added lines', () => {
  const m = diffModel(workState(), { mode: 'branches', a: 'main', b: 'ia/resume' });
  const resume = m.files.find((f) => f.path === 'resume.md');
  const html = unifiedRowsHtml(resume.rows);
  assert.ok(!html.includes('dc--empty'));
  const kinds = [...html.matchAll(/dc--(ctx|del|add|fold)/g)].map((x) => x[1]);
  const firstAdd = kinds.indexOf('add');
  assert.ok(kinds.slice(0, firstAdd).includes('del'));
  assert.ok(kinds.includes('fold'));
  assert.match(diffScreenHtml(workState(), ui({ mode: 'branches', view: 'unified', index: 1 })), /data-view="unified"/);
  assert.ok(sideRowsHtml(resume.rows).includes('drow'));
});

test('my changes mode: shows git diff, lists the U file and explains why it is not in git diff', () => {
  const s = workState();
  const model = diffModel(s, ui());
  assert.deepEqual(model.files.map((f) => f.path).sort(), ['nouveau-1.md', 'plan.md']);
  const untrackedIndex = model.files.findIndex((f) => f.untracked);
  const html = diffScreenHtml(s, ui({ index: untrackedIndex }));
  assert.match(html, /diff-cmd-prompt">\$<\/span> git diff</);
  assert.ok(html.includes(EN['diff.untracked.why']));
  assert.ok(html.includes('git add nouveau-1.md'));
  assert.ok(!html.includes('class="diff-rows"'));
  assert.match(html, /badge badge--U">U</);
});

test('staged mode: staged file in blue M, command git diff --staged', () => {
  const html = diffScreenHtml(workState(), ui({ mode: 'staged' }));
  assert.match(html, /git diff --staged/);
  assert.match(html, /badge badge--M is-staged">M</);
  assert.match(html, /resume\.md/);
  assert.ok(!html.includes('nouveau-1.md'));
});

test('empty modes give the plain explanation', () => {
  const html = diffScreenHtml(lanesState(), ui({ mode: 'staged' }));
  assert.ok(html.includes(EN['explain.diff.staged.empty']));
});

test('text is escaped', () => {
  const s = workState();
  const r = apply(s, { name: 'touch', args: ['plan.md'], options: { content: '<script>alert(1)</script>' } });
  const html = diffScreenHtml(r.state, ui({ index: 1 }));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('both languages render the same structure', async () => {
  const en = diffScreenHtml(workState(), ui());
  await setLang('fr');
  const fr = diffScreenHtml(workState(), ui());
  await setLang('en');
  assert.notEqual(en, fr);
  assert.match(fr, /Mes changements/);
});

test('conflict screen with detail: both versions and three choices', () => {
  const s = conflictState({ detailed: true });
  const m = conflictModel(s, { path: 'plan.md' });
  assert.equal(m.detailed, true);
  const html = conflictScreenHtml(s, { path: 'plan.md' });
  assert.ok(html.includes('Delivery in March') && html.includes('Delivery in April'));
  for (const side of ['ours', 'theirs', 'both']) assert.ok(html.includes(`data-side="${side}"`));
  assert.ok(html.includes(EN['conflict.next.commit'].replace('{file}', 'plan.md')));
  assert.ok(!html.includes(EN['diff.conflict.noDetail']));
});

test('conflict screen without detail: not-detailed message, choices still offered', () => {
  const s = conflictState({ detailed: false });
  assert.equal(conflictModel(s, {}).detailed, false);
  const html = conflictScreenHtml(s, {});
  assert.ok(html.includes(EN['diff.conflict.noDetail']));
  for (const side of ['ours', 'theirs', 'both']) assert.ok(html.includes(`data-side="${side}"`));
  assert.ok(!html.includes('conf-versions'));
});

test('conflict screen after a choice: resolved note and next step', () => {
  const s = conflictState({ detailed: true });
  const r = apply(s, { name: 'resolve', args: ['plan.md', 'both'] }).state;
  assert.equal(conflictModel(r, { path: 'plan.md' }).kind, 'resolved');
  assert.ok(conflictScreenHtml(r, { path: 'plan.md' }).includes('git add plan.md'));
});

test('diff screen lists a conflicted file with the not-detailed message (my changes mode)', () => {
  const html = diffScreenHtml(conflictState(), ui());
  assert.match(html, /badge badge--conflict">!</);
  assert.ok(html.includes(EN['diff.conflict.noDetail']));
});

test('log view: newest first, author markers, merge commit, branch chips', () => {
  const html = logHtml(historyState(), {});
  assert.ok(html.indexOf('Merge ia/resume into main') < html.indexOf('shorter summary'));
  assert.ok(html.indexOf('shorter summary') < html.indexOf('init'));
  assert.match(html, /data-author="ai"/);
  assert.match(html, /data-author="human"/);
  assert.match(html, /log-merge/);
  assert.match(html, /log-branch">main</);
  assert.ok(logHtml(lanesState(), { branch: 'ia/resume' }).includes('shorter summary'));
  assert.ok(!logHtml(lanesState(), { branch: 'main' }).includes('shorter summary'));
});

test('log view: "1 file" in the singular, "n files" otherwise', async () => {
  let s = lanesState();
  s = apply(s, { name: 'touch', args: ['plan.md'], options: {} }).state;
  s = apply(s, 'git commit -am "one file"').state;
  const html = logHtml(s, {});
  assert.match(html, /log-files">1 file</);
  assert.match(html, /log-files">2 files</);
  await setLang('fr');
  assert.match(logHtml(s, {}), /log-files">1 fichier</);
  await setLang('en');
});

test('diff screen, three dots: only what the branch brings since it left main', () => {
  let s = lanesState();
  s = apply(s, { name: 'touch', args: ['resume.md'], options: {} }).state;
  s = apply(s, 'git commit -am "main moves on"').state;
  assert.equal(diffCommand('branches', 'main', 'ia/resume', true), 'git diff main...ia/resume');
  const two = diffModel(s, { mode: 'branches', a: 'main', b: 'ia/resume' });
  const three = diffModel(s, { mode: 'branches', a: 'main', b: 'ia/resume', threeDot: true });
  assert.equal(three.threeDot, true);
  assert.equal(three.command, 'git diff main...ia/resume');
  assert.notDeepEqual(two.files.map((f) => f.rows), three.files.map((f) => f.rows));
  // the line main added after the fork is not shown as removed by the branch
  const resume = three.files.find((f) => f.path === 'resume.md');
  assert.ok(!resume.rows.some((r) => r.lk === 'del' && /r\d/.test(r.lt)));
  const html = diffScreenHtml(s, ui({ mode: 'branches', threeDot: true }));
  assert.ok(html.includes(EN['diff.from.base'].replace('{a}', 'main')));
  assert.ok(html.includes(EN['explain.diff.threeDot'].replace('{b}', 'ia/resume').replace('{a}', 'main')));
});
