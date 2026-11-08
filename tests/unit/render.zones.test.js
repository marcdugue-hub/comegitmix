// Render tests: the zone builders return HTML / SVG strings, checked here without a DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as i18n from '../../src/i18n/i18n.js';
import { runSetup } from '../../src/engine/setup.js';
import { apply } from '../../src/engine/apply.js';
import { computeLayout } from '../../src/render/lanes-layout.js';
import { gitZoneHtml, normaliseLocked } from '../../src/render/zone-git.js';
import { lanesSvg, lanesOverlayHtml, wireItems } from '../../src/render/zone-lanes.js';
import { indexItems, indexStripInner } from '../../src/render/zone-index.js';
import { tileItems, treeRows, folderDot } from '../../src/render/zone-disk.js';
import { fileLetter, commitMessage } from '../../src/render/html.js';
import { actionFromElement, dirsToOpen, parentDirs } from '../../src/render/scene.js';
import { planAnimations } from '../../src/render/animate.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'i18n');
const dict = (l) => JSON.parse(readFileSync(join(DIR, `${l}.json`), 'utf8'));
i18n.reset();
i18n.configure({ storage: null, navigatorLang: 'en' });
i18n.setDictionary('fr', dict('fr'));
i18n.setDictionary('en', dict('en'));

function setup(text, repos = ['local']) {
  const r = runSetup(text, { repos });
  assert.equal(r.error, null, `${r.line}: ${r.text}`);
  return r.state;
}

const M3 = `@files plan.md intro.md resume.md chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "outline"
git worktree add ../rapport-ia-resume -b ia/resume
@cd rapport-ia-resume
@work resume.md
git commit -m "v1"
@work resume.md
@work intro.md
@work plan.md
git add resume.md intro.md plan.md
@cd rapport-client
@work plan.md
@work chapitres/ch1.md
@new nouveau-1.md`;

const count = (s, re) => (s.match(re) || []).length;

test('file letters follow the IDE convention', () => {
  assert.equal(fileLetter({ kind: 'file', status: 'clean' }), null);
  assert.equal(fileLetter({ kind: 'file', status: 'M', staged: false }).letter, 'M');
  assert.equal(fileLetter({ kind: 'file', status: 'M', staged: true }).cls, 'M is-staged');
  assert.equal(fileLetter({ kind: 'file', status: 'U', staged: false }).letter, 'U');
  assert.equal(fileLetter({ kind: 'file', status: 'U', staged: true }).letter, 'A');
  assert.equal(fileLetter({ kind: 'file', status: 'conflict' }).letter, '!');
});

test('zone ④: one tile per desk, active 100 % and others 60 %, letters, diff link, + buttons', () => {
  const s = setup(M3);
  const L = computeLayout(s);
  const items = tileItems(s, L, { openDirs: new Map([[s.worktrees[0].id, new Set(['chapitres'])]]) });
  assert.equal(items.length, 2);
  const [main, ia] = items;
  assert.match(main.cls, /is-active/);
  assert.match(ia.cls, /is-inactive/);
  assert.equal(ia.attrs['data-action'], 'cd');
  assert.equal(main.attrs['data-action'], undefined);
  // main desk: plan.md M (diff link), chapitres open with ch1.md M, nouveau-1.md U
  assert.match(main.html, /data-action="diff"[^>]*data-path="plan.md"/);
  assert.match(main.html, /badge--U"[^>]*>U</);
  assert.match(main.html, /data-path="chapitres\/ch1.md"/);
  assert.match(main.html, /tree-dot--M/);
  assert.equal(count(main.html, /data-action="create"/g), 2); // tile + folder
  assert.match(main.html, /class="tile-here"/);
  // AI desk: staged M is blue, "Make the AI work" on ia/* branches
  assert.match(ia.html, /badge--M is-staged/);
  assert.match(ia.html, /data-action="ai-work"/);
  assert.doesNotMatch(main.html, /data-action="ai-work"/);
});

test('tree rows: folders first, closed folders hide their children, folder dot colour', () => {
  const s = setup(M3);
  const desk = s.worktrees[0];
  const closed = treeRows(desk);
  assert.equal(closed[0].path, 'chapitres');
  assert.ok(!closed.some((r) => r.path === 'chapitres/ch1.md'));
  const open = treeRows(desk, new Set(['chapitres']));
  assert.equal(open[1].path, 'chapitres/ch1.md');
  assert.equal(open[1].depth, 1);
  assert.equal(folderDot(desk, 'chapitres'), 'M');
});

test('zone ③: one strip per desk aligned with its tile, 2 chips then +n, empty text, stash chip', () => {
  const s = setup(M3);
  const L = computeLayout(s);
  const strips = indexItems(s, L);
  assert.equal(strips.length, 2);
  L.tiles.forEach((tile, i) => assert.match(strips[i].style, new RegExp(`left:${tile.x}px;width:${tile.w}px`)));
  assert.match(strips[0].html, /nothing staged/);
  assert.equal(count(strips[1].html, /class="index-chip/g), 2);
  assert.match(strips[1].html, /index-more[^>]*>\+1</);
  const stashed = apply(s, 'git stash').state;
  const html = indexStripInner(stashed.worktrees[0]);
  assert.match(html, /data-action="stash"/);
  assert.match(html, /stash · 1/);
});

test('zone ②: one path per lane, commits, wires keyed by desk with the desk opacity', () => {
  const s = setup(M3);
  const L = computeLayout(s);
  const svg = lanesSvg(L);
  assert.equal(count(svg, /class="lane-path/g), 2);
  assert.equal(count(svg, /data-commit-id=/g), Object.keys(s.commits).length);
  const wires = wireItems(L, s);
  assert.equal(wires.length, 2);
  assert.match(wires[0].cls, /is-active/);
  assert.match(wires[1].cls, /is-inactive/);
  const overlay = lanesOverlayHtml(L, s);
  assert.match(overlay, /data-action="branch" data-branch="main"/);
  assert.match(overlay, /<i>HEAD<\/i>/);
  assert.match(overlay, /Reference version/);
  assert.equal(count(overlay, /data-action="commit"/g), Object.keys(s.commits).length);
  assert.match(overlay, />outline</);
});

test('zone ①: local card always, locked origin, MR card inside origin', () => {
  const s = setup(M3);
  const html = gitZoneHtml(s, { lockedRepos: { origin: 5 } });
  assert.match(html, /repo-card--locked/);
  assert.match(html, /Unlocks at mission 5/);
  assert.match(html, /repo-card--local/);
  assert.deepEqual(normaliseLocked(['origin']), { origin: null });
  const team = setup(
    `@files plan.md
git commit -m "init"
@remote origin
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "chart"
git switch main
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Add the charts" comments=2`,
    ['local', 'origin'],
  );
  const g = gitZoneHtml(team);
  assert.match(g, /data-action="mr" data-mr="42"/);
  assert.match(g, /mr-status--open/);
  assert.match(g, /Add the charts/);
  const approved = apply(team, { name: 'mr', args: ['approve', 42] }).state;
  assert.match(gitZoneHtml(approved), /mr-status--approved/);
  const overlay = lanesOverlayHtml(computeLayout(team), team);
  assert.match(overlay, /MR !42 · online only/);
});

test('FR / EN: the same scene switches language', async () => {
  const s = setup(M3);
  await i18n.setLang('fr');
  assert.match(lanesOverlayHtml(computeLayout(s), s), /Version de référence/);
  await i18n.setLang('en');
  assert.match(lanesOverlayHtml(computeLayout(s), s), /Reference version/);
});

test('engine messages are translated (msgKey)', () => {
  assert.equal(commitMessage({ msg: '', msgKey: 'msg.merge', msgParams: { name: 'a', into: 'main' } }), 'Merge a into main');
});

test('clicks map to actions', () => {
  const el = (dataset) => ({ dataset });
  assert.deepEqual(actionFromElement(el({ action: 'click', desk: 'w1', path: 'plan.md' })), { type: 'click', desk: 'w1', path: 'plan.md' });
  assert.deepEqual(actionFromElement(el({ action: 'create', desk: 'w2', dir: '' })), { type: 'create', desk: 'w2', dir: '' });
  assert.deepEqual(actionFromElement(el({ action: 'cd', desk: 'w2' })), { type: 'cd', desk: 'w2' });
  assert.deepEqual(actionFromElement(el({ action: 'diff', desk: 'w1', path: 'a.md' })), { type: 'diff', desk: 'w1', path: 'a.md' });
  assert.equal(actionFromElement(el({ action: 'mr', mr: '42' })).id, 42);
  assert.equal(actionFromElement(el({})), null);
  assert.deepEqual(parentDirs('a/b/c.md'), ['a', 'a/b']);
  assert.deepEqual(dirsToOpen([{ type: 'file.created', desk: 'w1', path: 'chapitres/x.md' }]), [{ desk: 'w1', dir: 'chapitres' }]);
});

test('events map to animations', () => {
  const plan = planAnimations([
    { type: 'commit.created', id: 'c4' },
    { type: 'index.added', desk: 'w1', path: 'plan.md' },
    { type: 'worktree.added', id: 'w2' },
    { type: 'error' },
  ]);
  assert.deepEqual(plan.map((p) => p.cls), ['anim-pop', 'anim-rise', 'anim-pop', 'anim-draw', 'anim-shake']);
  assert.match(plan[0].selector, /c4/);
});
