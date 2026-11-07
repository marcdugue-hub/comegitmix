import test from 'node:test';
import assert from 'node:assert/strict';
import { lineDiff, lineOps, diff, diffTrees } from '../../src/engine/diff.js';
import { baseRepo, play, work } from './_engine-helpers.js';

test('lineOps: LCS edit script', () => {
  const ops = lineOps(['a', 'b', 'c'], ['a', 'x', 'c']);
  assert.deepEqual(ops.map((o) => o.op), ['eq', 'del', 'add', 'eq']);
});

test('lineDiff: side-by-side rows pair deletions and additions; empty cells', () => {
  const d = lineDiff('a\nb\nc', 'a\nB\nc\nd');
  assert.equal(d.adds, 2);
  assert.equal(d.dels, 1);
  assert.deepEqual(d.rows[1], { lk: 'del', rk: 'add', ln: 2, rn: 2, lt: 'b', rt: 'B' });
  assert.deepEqual(d.rows[3], { lk: 'empty', rk: 'add', ln: null, rn: 4, lt: '', rt: 'd' });
  const n = lineDiff(null, 'x\ny');
  assert.deepEqual(n.rows.map((r) => [r.lk, r.rk]), [['empty', 'add'], ['empty', 'add']]);
});

test('lineDiff: folds unchanged runs beyond 3 lines of context', () => {
  const old = Array.from({ length: 20 }, (_, i) => `l${i + 1}`);
  const neu = [...old];
  neu[10] = 'changed';
  const d = lineDiff(old.join('\n'), neu.join('\n'));
  const kinds = d.rows.map((r) => r.lk);
  assert.deepEqual(kinds, ['fold', 'ctx', 'ctx', 'ctx', 'del', 'ctx', 'ctx', 'ctx', 'fold']);
  assert.equal(d.rows[0].n, 7);
  assert.equal(d.rows[8].n, 6);
  assert.equal(d.rows[1].ln, 8);
});

test('diff mode work: index -> folder; U files listed with untracked flag and no rows', () => {
  const s = play(baseRepo(), [...work('plan.md'), { name: 'create', args: [] }, ...work('intro.md'), 'git add intro.md']).state;
  const d = diff(s, { mode: 'work' });
  assert.deepEqual(d.files.map((f) => [f.path, f.letter]), [['nouveau-1.md', 'U'], ['plan.md', 'M']]);
  const u = d.files.find((f) => f.letter === 'U');
  assert.equal(u.untracked, true);
  assert.deepEqual(u.rows, []);
  assert.equal(d.from.kind, 'index');
  assert.equal(d.to.kind, 'folder');
  const p = d.files.find((f) => f.path === 'plan.md');
  assert.equal(p.adds, 1);
  assert.equal(p.dels, 1);
});

test('diff mode staged: last commit -> index; new staged file is A', () => {
  const s = play(baseRepo(), [...work('plan.md'), { name: 'create', args: [] }, 'git add nouveau-1.md', ...work('intro.md'), 'git add intro.md']).state;
  const d = diff(s, { mode: 'staged' });
  assert.deepEqual(d.files.map((f) => [f.path, f.letter, f.staged]), [['intro.md', 'M', true], ['nouveau-1.md', 'A', true]]);
  assert.equal(d.from.kind, 'lastCommit');
});

test('diff mode branches: direct and three dots (what the MR brings)', () => {
  const s = play(baseRepo(), [
    'git switch -c ia/graphiques', { name: 'create', options: { path: 'graphiques/ventes.svg' } }, 'git add .', 'git commit -m "chart"',
    ...work('plan.md'), 'git commit -am "outline"', 'git switch main', ...work('intro.md'), 'git commit -am "intro"',
  ]).state;
  const direct = diff(s, { mode: 'branches', a: 'main', b: 'ia/graphiques' });
  assert.deepEqual(direct.files.map((f) => [f.path, f.letter]), [['graphiques/ventes.svg', 'A'], ['intro.md', 'M'], ['plan.md', 'M']]);
  const three = diff(s, { mode: 'branches', a: 'main', b: 'ia/graphiques', threeDot: true });
  assert.deepEqual(three.files.map((f) => [f.path, f.letter]), [['graphiques/ventes.svg', 'A'], ['plan.md', 'M']]);
  assert.ok(three.from.base);
  assert.equal(diff(s, { mode: 'branches', a: 'nope', b: 'main' }).error.key, 'error.unknownRevision');
});

test('diffTrees letters A / M / D', () => {
  assert.deepEqual(diffTrees({ a: 'x', b: 'y' }, { b: 'z', c: 'w' }).map((f) => [f.path, f.letter]), [['a', 'D'], ['b', 'M'], ['c', 'A']]);
});
