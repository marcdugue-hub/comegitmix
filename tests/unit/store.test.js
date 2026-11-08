import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/store.js';
import { apply } from '../../src/engine/apply.js';
import { deepFreeze, baseRepo } from './_engine-helpers.js';

const fresh = () => createStore({ apply, initialState: baseRepo() });
const seed = (s) => {
  s.dispatch({ name: 'touch', args: ['plan.md'] });
};

test('dispatch applies a command and records it', () => {
  const s = fresh();
  const initial = s.getState();
  const r = s.dispatch('git status');
  assert.equal(r.error, null);
  assert.equal(s.getState(), initial, 'read-only command keeps the state');
  assert.deepEqual(s.getCommands(), []);
  assert.equal(s.canUndo(), false);
  assert.equal(s.getLastResult(), r);
});

test('an error leaves state and history untouched', () => {
  const s = fresh();
  const before = s.getState();
  const r = s.dispatch('git nonsense');
  assert.ok(r.error);
  assert.equal(s.getState(), before);
  assert.equal(s.canUndo(), false);
  assert.equal(s.getLastResult().error.key, r.error.key);
});

test('undo, redo and reset', () => {
  const s = fresh();
  const initial = s.getState();
  s.dispatch('git branch ia/a');
  const afterBranch = s.getState();
  s.dispatch('git branch ia/b');
  assert.equal(s.getCommands().length, 2);
  assert.ok(s.undo());
  assert.equal(s.getState(), afterBranch);
  assert.ok(s.canRedo());
  assert.ok(s.redo());
  assert.equal(s.canRedo(), false);
  assert.ok(s.undo() && s.undo());
  assert.equal(s.getState(), initial);
  assert.equal(s.undo(), false);
  s.redo();
  s.reset();
  assert.equal(s.getState(), initial);
  assert.equal(s.canUndo() || s.canRedo(), false);
});

test('a new command clears the redo stack', () => {
  const s = fresh();
  s.dispatch('git branch a');
  s.undo();
  s.dispatch('git branch b');
  assert.equal(s.canRedo(), false);
});

test('replay rebuilds the same state from the serialisable history', () => {
  const s = fresh();
  s.dispatch('git branch ia/a');
  s.dispatch('git switch ia/a');
  seed(s);
  const saved = JSON.parse(JSON.stringify(s.getCommands()));
  const finalState = s.getState();
  const t = fresh();
  const results = t.replay(saved);
  assert.equal(results.length, saved.length);
  assert.deepEqual(t.getState(), finalState);
  assert.deepEqual(t.getCommands(), saved);
});

test('the input state is never mutated', () => {
  const initialState = deepFreeze(baseRepo());
  const s = createStore({ apply, initialState });
  s.dispatch('git branch ia/a');
  s.dispatch('git switch ia/a');
  s.undo();
  s.replay(['git branch x']);
  assert.ok(Object.isFrozen(initialState));
  assert.equal(s.getInitialState(), initialState);
});

test('subscribe is notified with (state, result) and can unsubscribe', () => {
  const s = fresh();
  const calls = [];
  const off = s.subscribe((state, result) => calls.push([state, result]));
  const r = s.dispatch('git branch a');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], s.getState());
  assert.equal(calls[0][1], r);
  s.undo();
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1], null);
  off();
  s.redo();
  assert.equal(calls.length, 2);
});

test('diffShown flag notifies only on change; load starts a new session', () => {
  const s = fresh();
  let n = 0;
  s.subscribe(() => n++);
  assert.equal(s.isDiffShown(), false);
  s.setDiffShown(true);
  s.setDiffShown(true);
  assert.equal(n, 1);
  assert.equal(s.isDiffShown(), true);
  const other = baseRepo();
  s.load(other, ['git branch z']);
  assert.equal(s.isDiffShown(), false);
  assert.equal(s.getInitialState(), other);
  assert.deepEqual(s.getCommands(), ['git branch z']);
});

test('createStore requires apply', () => {
  assert.throws(() => createStore({}), TypeError);
});
