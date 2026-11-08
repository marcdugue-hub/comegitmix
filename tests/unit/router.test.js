import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, buildHash, createRouter } from '../../src/router.js';

test('parseHash: known routes', () => {
  assert.deepEqual(parseHash(''), { name: 'home' });
  assert.deepEqual(parseHash('#/'), { name: 'home' });
  assert.deepEqual(parseHash('#/mission/03-deux-assistants'), { name: 'mission', id: '03-deux-assistants' });
  assert.deepEqual(parseHash('#/mission/06-relire-une-mr?part=b&step=3'), { name: 'mission', id: '06-relire-une-mr', part: 'B', step: 3 });
  assert.deepEqual(parseHash('#/puzzle/01-ranger-un-fichier'), { name: 'puzzle', id: '01-ranger-un-fichier' });
  assert.deepEqual(parseHash('#/sandbox'), { name: 'sandbox' });
  assert.deepEqual(parseHash('#/sandbox?start=conflit'), { name: 'sandbox', start: 'conflit' });
});

test('parseHash: unknown or malformed routes go home', () => {
  for (const h of ['#/nope', '#/mission', '#/mission/Bad_Id', '#/puzzle/a/b', '#/sandbox/x', '#main']) {
    assert.deepEqual(parseHash(h), { name: 'home' }, h);
  }
});

test('parseHash: invalid query values are dropped', () => {
  assert.deepEqual(parseHash('#/mission/a?part=zz&step=0'), { name: 'mission', id: 'a' });
  assert.deepEqual(parseHash('#/mission/a?step=2x'), { name: 'mission', id: 'a' });
  assert.deepEqual(parseHash('#/sandbox?start=Bad Id'), { name: 'sandbox' });
});

test('buildHash round-trips', () => {
  for (const h of ['#/', '#/mission/a', '#/mission/a?part=B&step=3', '#/puzzle/p-1', '#/sandbox', '#/sandbox?start=solo']) {
    assert.equal(buildHash(parseHash(h)), h);
  }
});

function fakeWindow(hash = '') {
  let handler = null;
  let h = hash;
  return {
    location: { get hash() { return h; }, set hash(v) { h = v; handler?.(); } }, // like a browser: assigning fires hashchange
    history: { replaceState: (_s, _t, url) => { h = url; } }, // replaceState does not fire it
    addEventListener: (_type, cb) => { handler = cb; },
    removeEventListener: () => { handler = null; },
  };
}
const fakeContainer = () => ({ replaceChildren() {} });

test('router mounts screens, unmounts the previous one, falls back to home', () => {
  const win = fakeWindow('#/puzzle/p1');
  const r = createRouter({ win });
  const log = [];
  r.registerScreen('home', (c, p) => { log.push(['mount', 'home']); return () => log.push(['unmount', 'home']); });
  r.registerScreen('puzzle', (c, p) => { log.push(['mount', 'puzzle', p.id]); return () => log.push(['unmount', 'puzzle']); });
  r.setContext({ x: 1 });
  r.start(fakeContainer());
  assert.deepEqual(log, [['mount', 'puzzle', 'p1']]);
  r.navigate('#/wat');
  assert.deepEqual(log.slice(1), [['unmount', 'puzzle'], ['mount', 'home']]);
  assert.equal(win.location.hash, '#/', 'unknown route rewritten to home');
  assert.equal(r.current().name, 'home');
});

test('screen params carry the context; replace() does not re-mount; refresh() does', () => {
  const win = fakeWindow('#/mission/m1?part=A&step=1');
  const r = createRouter({ win });
  let mounts = 0;
  let seen;
  r.registerScreen('home', () => null);
  r.registerScreen('mission', (c, p) => { mounts++; seen = p; return null; });
  r.setContext({ loader: 'L' });
  r.start(fakeContainer());
  assert.equal(seen.ctx.loader, 'L');
  assert.equal(seen.step, 1);
  const routes = [];
  r.onRoute((route) => routes.push(route));
  r.replace({ name: 'mission', id: 'm1', part: 'A', step: 2 });
  assert.equal(mounts, 1);
  assert.equal(win.location.hash, '#/mission/m1?part=A&step=2');
  assert.equal(r.current().step, 2);
  assert.equal(routes.length, 1);
  r.refresh();
  assert.equal(mounts, 2);
});

test('registerScreen rejects unknown names', () => {
  const r = createRouter({ win: fakeWindow() });
  assert.throws(() => r.registerScreen('nope', () => null));
});
