import test from 'node:test';
import assert from 'node:assert/strict';
import { runSetup } from '../../src/engine/setup.js';
import { apply } from '../../src/engine/apply.js';
import { computeLayout, countCrossings, tileSlots, assignColors, curveXAt, G } from '../../src/render/lanes-layout.js';

function setup(text, repos = ['local']) {
  const r = runSetup(text, { repos });
  assert.equal(r.error, null, `setup failed at line ${r.line}: ${r.text} ${JSON.stringify(r.error)}`);
  return r.state;
}

const BASE = ['@files plan.md intro.md resume.md chapitres/ch1.md', 'git commit -m "init"', '@work plan.md', 'git commit -m "plan"'];

/**
 * Typical histories with `n` branches in total (main + n-1).
 * fan: every branch forks from main at a different point, main keeps moving, the first three get a desk.
 * merged: same, and the first branch is merged back into main.
 * stacked: a branch forks from another branch.
 */
function history(n, kind) {
  const lines = [...BASE];
  const desks = [];
  for (let i = 1; i < n; i++) {
    const name = `ia/t${i}`;
    if (i <= 3) {
      lines.push(`git worktree add ../rapport-t${i} -b ${name}`);
      desks.push(i);
    } else if (kind === 'stacked' && i === 4) lines.push(`git branch ${name} ia/t1`);
    else lines.push(`git branch ${name}`);
    if (i % 2 === 0) lines.push('@work intro.md', `git commit -m "main ${i}"`);
  }
  for (let i = 1; i < n; i++) {
    const name = `ia/t${i}`;
    if (i <= 3) lines.push(`@cd rapport-t${i}`);
    else lines.push('@cd rapport-client', `git switch ${name}`);
    for (let k = 0; k < 1 + (i % 3); k++) lines.push(`@work resume.md`, `git commit -m "t${i}.${k}"`);
    if (i > 3) lines.push('git switch main');
  }
  lines.push('@cd rapport-client');
  if (kind === 'merged' && n > 1) lines.push('git merge ia/t1 -m "merge"');
  return setup(lines.join('\n'));
}

for (const kind of ['fan', 'merged', 'stacked']) {
  for (let n = 2; n <= 8; n++) {
    test(`no crossings: ${kind} history with ${n} branches`, () => {
      const state = history(n, kind);
      const L = computeLayout(state);
      assert.equal(L.lanes.filter((l) => l.kind === 'branch').length, n);
      assert.equal(L.crossings, 0, `crossings in order ${L.order.join(', ')}`);
      assert.equal(countCrossings(L), 0);
      // main at the bottom, every lane inside zone ②
      const main = L.lanes.find((l) => l.name === 'main');
      assert.equal(main.y, Math.max(...L.lanes.map((l) => l.y)));
      for (const l of L.lanes) assert.ok(l.y >= 192 + 50 && l.y <= 484 - 40, `lane ${l.key} at y ${l.y}`);
    });
  }
}

test('layout is deterministic (same input, clone, repeated calls)', () => {
  const state = history(6, 'merged');
  const a = computeLayout(state);
  const b = computeLayout(JSON.parse(JSON.stringify(state)));
  const c = computeLayout(state);
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});

test('mission 3: desk lane tips sit above their tiles, wires are straight dashed verticals', () => {
  const state = setup(
    [...BASE, '@work intro.md', 'git commit -m "intro"', 'git worktree add ../rapport-ia-resume -b ia/resume', '@cd rapport-ia-resume', '@work resume.md', 'git commit -m "v1"', '@cd rapport-client'].join('\n'),
  );
  const L = computeLayout(state);
  const slots = tileSlots(2);
  const resume = L.lanes.find((l) => l.name === 'ia/resume');
  const main = L.lanes.find((l) => l.name === 'main');
  assert.equal(main.tipX, slots[0].cx);
  assert.equal(resume.tipX, slots[1].cx);
  assert.ok(resume.y < main.y);
  for (const w of L.wires) {
    assert.equal(w.elbow, false);
    assert.equal(w.points[0][0], w.points[w.points.length - 1][0]);
    assert.equal(w.points[w.points.length - 1][1], G.tileY);
  }
  assert.equal(L.chips.find((c) => c.branch === 'main').head, true);
});

test('a branch without a desk has no wire; a fresh branch is an empty lane', () => {
  const state = setup([...BASE, 'git branch idea'].join('\n'));
  const L = computeLayout(state);
  const idea = L.lanes.find((l) => l.name === 'idea');
  assert.equal(idea.empty, true);
  assert.deepEqual(idea.desks, []);
  assert.equal(L.wires.length, 1);
});

test('wire falls back to an elbow when the tip is not above the tile', () => {
  const state = setup([...BASE, 'git worktree add ../rapport-b -b ia/b', '@work intro.md', 'git commit -m "x"', '@work intro.md', 'git commit -m "y"', '@work intro.md', 'git commit -m "z"', '@work intro.md', 'git commit -m "w"'].join('\n'));
  const L = computeLayout(state);
  const main = L.wires.find((w) => w.desk === state.worktrees[0].id);
  assert.equal(main.elbow, true);
  assert.equal(L.crossings, 0);
});

test('colours: main charcoal, cycle for the others, stable across renders', () => {
  const c1 = assignColors(['main', 'ia/a', 'ia/b']);
  assert.deepEqual(c1, { main: 0, 'ia/a': 1, 'ia/b': 2 });
  const c2 = assignColors(['main', 'ia/new', 'ia/b'], c1);
  assert.equal(c2['ia/b'], 2);
  assert.notEqual(c2['ia/new'], 2);
  const c3 = assignColors(['main', 'origin/ia/a'], c1);
  assert.equal(c3['ia/a'], 1);
});

test('tile slots: 3 per row from x 200, 4 narrower tiles fill the width', () => {
  assert.deepEqual(tileSlots(3).map((s) => s.x), [200, 470, 740]);
  const four = tileSlots(4);
  assert.equal(four.length, 4);
  assert.ok(four[3].x + four[3].w <= 1012);
});

test('curveXAt follows the fork curve between its ends', () => {
  assert.equal(curveXAt(100, 400, 200, 300, 400), 100);
  assert.equal(curveXAt(100, 400, 200, 300, 300), 200);
  assert.ok(Math.abs(curveXAt(100, 400, 200, 300, 350) - 150) < 0.5);
});

test('remote: online-only MR lane is dashed, origin/main is a chip', () => {
  const state = setup(
    [...BASE, '@remote origin', 'git switch -c ia/graphiques', '@files graphiques/ventes.svg', 'git commit -m "chart"', 'git switch main', '@remote origin', '@online-only ia/graphiques', '@mr 42 ia/graphiques -> main "Add the charts" comments=2'].join('\n'),
    ['local', 'origin'],
  );
  const L = computeLayout(state);
  const online = L.lanes.find((l) => l.kind === 'online');
  assert.ok(online && online.dashed && online.faded);
  assert.equal(online.mr, 42);
  assert.ok(L.chips.some((c) => c.label === 'origin/main' && c.dashed));
  const fetched = apply(state, 'git fetch').state;
  const L2 = computeLayout(fetched);
  assert.ok(L2.lanes.some((l) => l.kind === 'remote' && l.name === 'origin/ia/graphiques'));
});

test('ghost (goal) state adds dashed lanes and tiles without touching the current ones', () => {
  const state = setup(BASE.join('\n'));
  const goal = apply(state, 'git worktree add ../rapport-ia -b ia/x').state;
  const L = computeLayout(state, { ghost: goal });
  assert.ok(L.lanes.some((l) => l.ghost && l.name === 'ia/x'));
  assert.ok(L.tiles.some((t) => t.ghost && t.path === 'rapport-ia'));
  assert.ok(L.wires.some((w) => w.ghost));
});

test('many generations fold the oldest commits', () => {
  const lines = [...BASE];
  for (let i = 0; i < 30; i++) lines.push('@work plan.md', `git commit -m "n${i}"`);
  const L = computeLayout(setup(lines.join('\n')));
  assert.ok(L.folded > 0);
  for (const c of Object.values(L.commits)) assert.ok(c.x >= G.firstCommitX && c.x <= G.laneXMax);
});
