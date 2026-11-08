import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, normalize, STORAGE_KEY, VERSION } from '../../src/progress.js';

function memory(initial) {
  const data = initial === undefined ? {} : { [STORAGE_KEY]: typeof initial === 'string' ? initial : JSON.stringify(initial) };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const stored = (s) => JSON.parse(s.data[STORAGE_KEY]);

test('empty storage gives a valid empty progress', () => {
  const p = createProgress({ storage: memory() });
  assert.deepEqual(p.get(), { v: VERSION, missions: {}, puzzles: {}, sandbox: null, last: null, prefs: { details: false } });
  assert.equal(p.hasProgress(), false);
});

test('missions, stars (best kept, clamped), last route and sandbox persist', () => {
  const s = memory();
  const p = createProgress({ storage: s });
  p.markMissionDone('01-a');
  p.setStars('p1', 2);
  p.setStars('p1', 1);
  p.setStars('p2', 9);
  p.setLast('#/mission/02-b?step=2');
  p.saveSandbox(['git branch a', { name: 'touch', args: ['plan.md'] }], 'solo');
  const again = createProgress({ storage: s });
  assert.equal(again.isMissionDone('01-a'), true);
  assert.equal(again.getStars('p1'), 2);
  assert.equal(again.getStars('p2'), 3);
  assert.equal(again.getLast(), '#/mission/02-b?step=2');
  assert.deepEqual(again.getSandbox(), { start: 'solo', commands: ['git branch a', { name: 'touch', args: ['plan.md'] }] });
  assert.equal(again.hasProgress(), true);
  again.clearSandbox();
  assert.equal(again.getSandbox(), null);
  p.setLast('#/');
  assert.equal(p.getLast(), null);
});

test('coexists with the i18n lang field', () => {
  const s = memory({ lang: 'en' });
  const p = createProgress({ storage: s });
  assert.equal(p.hasProgress(), false, 'a language alone is not progress');
  p.markMissionDone('m');
  assert.equal(stored(s).lang, 'en');
  assert.equal(stored(s).v, VERSION);
  // i18n rewrites { ...stored, lang }: our fields survive
  s.setItem(STORAGE_KEY, JSON.stringify({ ...stored(s), lang: 'fr' }));
  assert.equal(p.isMissionDone('m'), true);
});

test('a different stored version resets progress but keeps the language', () => {
  const s = memory({ v: 0, lang: 'fr', missions: { old: true }, puzzles: { x: 3 } });
  const p = createProgress({ storage: s });
  assert.deepEqual(p.get().missions, {});
  p.markMissionDone('new');
  assert.deepEqual(stored(s), { v: VERSION, lang: 'fr', missions: { new: true }, puzzles: {}, sandbox: null, last: null, prefs: { details: false } });
});

test('garbage in storage is ignored', () => {
  assert.equal(createProgress({ storage: memory('{not json') }).hasProgress(), false);
  assert.equal(createProgress({ storage: memory('[1,2]') }).hasProgress(), false);
  const n = normalize({ missions: { a: 'yes', b: true }, puzzles: { a: 7, b: 2, c: 'x' }, sandbox: { commands: 'no' }, last: 'http://x' });
  assert.deepEqual(n.missions, { b: true });
  assert.deepEqual(n.puzzles, { b: 2 });
  assert.equal(n.sandbox, null);
  assert.equal(n.last, null);
});

test('storage that throws or is missing never breaks the game', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
  const p = createProgress({ storage: broken });
  assert.doesNotThrow(() => p.markMissionDone('m'));
  assert.equal(p.isMissionDone('m'), false);
  const none = createProgress({ storage: () => null });
  assert.doesNotThrow(() => none.setStars('p', 1));
  const throwingAccessor = createProgress({ storage: () => { throw new Error('blocked'); } });
  assert.equal(throwingAccessor.hasProgress(), false);
});

test('reset forgets progress and keeps the language', () => {
  const s = memory({ lang: 'en', missions: { a: true } });
  const p = createProgress({ storage: s });
  p.reset();
  assert.equal(p.hasProgress(), false);
  assert.equal(stored(s).lang, 'en');
});

test('the "More details" preference persists, survives reset and ignores junk', () => {
  const s = memory();
  const p = createProgress({ storage: s });
  assert.equal(p.getDetails(), false);
  p.setDetails(true);
  assert.equal(createProgress({ storage: s }).getDetails(), true);
  assert.equal(p.hasProgress(), false);
  p.reset();
  assert.equal(p.getDetails(), true);
  p.setDetails(false);
  assert.equal(p.getDetails(), false);
  assert.equal(normalize({ prefs: { details: 'yes' } }).prefs.details, false);
  assert.equal(normalize({ prefs: 'x' }).prefs.details, false);
  const broken = createProgress({ storage: () => { throw new Error('blocked'); } });
  assert.doesNotThrow(() => broken.setDetails(true));
  assert.equal(broken.getDetails(), false);
});
