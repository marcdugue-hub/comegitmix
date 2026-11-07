// Shared helpers for the engine tests (not a test file).
import assert from 'node:assert/strict';
import { apply } from '../../src/engine/apply.js';
import { createState, getDesk, findFile } from '../../src/engine/state.js';

export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** Applies commands in order (text or objects); fails the test on the first error. Input is frozen each time. */
export function play(state, commands, opts = {}) {
  let s = state;
  let last = null;
  for (const c of commands) {
    deepFreeze(s);
    const r = apply(s, c, opts);
    assert.equal(r.error, null, `${typeof c === 'string' ? c : JSON.stringify(c)} -> ${JSON.stringify(r.error)}`);
    s = r.state;
    last = r;
  }
  return { state: s, last };
}

export function run(state, command, opts = {}) {
  return apply(deepFreeze(state), command, opts);
}

export const files = (...paths) => paths.map((p) => ({ name: 'create', options: { path: p, status: 'clean' } }));
export const work = (...paths) => paths.map((p) => ({ name: 'touch', args: [p] }));

/** main with "init" (plan.md, intro.md, resume.md, chapitres/ch1.md) then "plan". */
export function baseRepo() {
  const s0 = createState();
  const { state } = play(s0, [
    ...files('plan.md', 'intro.md', 'resume.md', 'chapitres/ch1.md'),
    'git commit -m "init"',
    ...work('plan.md'),
    'git commit -m "plan"',
  ], { lenient: true });
  return state;
}

export function file(state, path, desk = null) {
  return findFile(getDesk(state, desk), path);
}

export function status(state, path, desk = null) {
  const f = file(state, path, desk);
  if (!f) return null;
  if (f.staged) return f.status === 'U' ? 'A' : `${f.status}+`;
  return f.status;
}
