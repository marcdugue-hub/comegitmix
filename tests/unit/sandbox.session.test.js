// Sandbox sessions: starts, save / restore, undo / redo / reset consistency, copy as start / paste a start.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSandbox } from '../../src/content/sandbox.js';
import { parseMission } from '../../src/content/mission.js';
import { parseSummary } from '../../src/content/summary.js';
import { apply } from '../../src/engine/apply.js';
import { serialize } from '../../src/engine/state.js';
import { equivalent, difference } from '../../src/engine/equivalence.js';
import { toSetup } from '../../src/engine/to-setup.js';
import { createStore } from '../../src/store.js';
import { createProgress } from '../../src/progress.js';
import { encodeStart, decodeStart, storableCommands } from '../../src/ui/sandbox-model.js';
import { startFromSandbox, startFromPaste, pastedLines, missionFinalState } from '../../src/ui/sandbox-starts.js';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const summary = parseSummary(read('content/index.md'));
const startOf = (id, lang = 'en') => startFromSandbox(parseSandbox(read(`content/sandbox/${id}.${lang}.md`)));

// A session touching most kinds of actions (scene, terminal, AI, team). Errors are skipped by the store.
const SESSION = [
  { name: 'click', args: ['w1', 'plan.md'], options: {} },
  'git add .',
  'git commit -m "first"',
  'git switch -c feature/a',
  { name: 'create', args: ['w1'], options: {} },
  { name: 'ai', args: [], options: { commit: false } },
  'git stash',
  { name: 'assistant', args: [], options: { message: 'The AI did things' } },
  'cd ../rapport-client',
  'git switch main',
  'git merge ia/resume',
  { name: 'resolve', args: ['w1', 'plan.md', 'theirs'], options: {} },
  'git add plan.md',
  'git commit -m "merged"',
  { name: 'colleague', args: ['main'], options: {} },
  'git fetch',
];

test('every start listed in content/index.md loads in both languages, including the conflict start', () => {
  const ids = summary.sandbox.map((s) => s.id);
  assert.ok(ids.includes('conflit'));
  for (const id of ids) for (const lang of ['fr', 'en']) {
    const s = startOf(id, lang);
    assert.equal(s.error, null, `${id}.${lang}: ${JSON.stringify(s.error)}`);
    assert.ok(s.state && s.lines.length);
  }
});

test('the conflict start produces a conflict with git merge ia/resume', () => {
  const s = startOf('conflit').state;
  const r = apply(s, 'git merge ia/resume');
  assert.equal(r.error, null);
  assert.equal(r.warning.key, 'error.mergeConflict');
  const desk = r.state.worktrees[0];
  assert.equal(desk.files.find((f) => f.path === 'plan.md').status, 'conflict');
  const resolved = apply(r.state, { name: 'resolve', args: ['w1', 'plan.md', 'ours'] });
  const added = apply(resolved.state, 'git add plan.md');
  const done = apply(added.state, 'git commit -m "merge"');
  assert.equal(done.error, null);
  assert.equal(done.state.worktrees[0].op, null);
});

test('start references round-trip through progress', () => {
  for (const src of [{ kind: 'start', id: 'solo' }, { kind: 'paste', text: '@files a.md\ngit commit -m "x y"' }, { kind: 'mission', id: '03-deux-assistants' }]) {
    assert.deepEqual(decodeStart(encodeStart(src)), src);
  }
  assert.equal(decodeStart(null), null);
});

for (const id of summary.sandbox.map((s) => s.id)) {
  test(`session on "${id}": save, restore, undo/redo/reset, copy then paste give the same state`, () => {
    const start = startOf(id);
    const store = createStore({ apply, initialState: start.state });
    for (const c of SESSION) store.dispatch(c);
    const final = store.getState();
    const commands = storableCommands(store.getCommands());

    // save in progress (JSON in localStorage) and restore by replaying
    const mem = new Map();
    const progress = createProgress({ storage: { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) } });
    progress.saveSandbox(commands, encodeStart({ kind: 'start', id }));
    const saved = progress.getSandbox();
    assert.deepEqual(decodeStart(saved.start), { kind: 'start', id });
    const restored = createStore({ apply, initialState: startOf(id).state });
    restored.load(startOf(id).state, saved.commands);
    assert.equal(serialize(restored.getState()), serialize(final), 'replaying the saved history gives the same state');
    assert.equal(restored.getCommands().length, commands.length);

    // undo everything then redo everything: same states, no inconsistency
    const n = store.getCommands().length;
    for (let i = 0; i < n; i += 1) assert.ok(store.undo());
    assert.equal(store.getState(), start.state);
    for (let i = 0; i < n; i += 1) assert.ok(store.redo());
    assert.equal(serialize(store.getState()), serialize(final));
    store.undo();
    const mid = store.getState();
    const replayed = createStore({ apply, initialState: start.state });
    replayed.load(start.state, storableCommands(store.getCommands()));
    assert.equal(serialize(replayed.getState()), serialize(mid));
    store.reset();
    assert.equal(store.getState(), start.state);
    assert.equal(store.getCommands().length, 0);

    // copy as start, then paste a start
    const out = toSetup({ start: start.state, startLines: start.lines, commands });
    const pasted = startFromPaste(out.block);
    assert.equal(pasted.error, null, JSON.stringify(pasted.error));
    assert.ok(equivalent(pasted.state, final), JSON.stringify(difference(pasted.state, final)));
  });
}

test('pasted text: fences and front matter are tolerated; empty and broken texts are errors with a line', () => {
  assert.equal(pastedLines('---\ntitle: x\n---\n```git-setup\n@files a.md\n```\n').length, 1);
  assert.equal(startFromPaste('').error.key, 'sandbox.paste.empty');
  const bad = startFromPaste('@files a.md\ngit switch nowhere');
  assert.ok(bad.error);
  assert.equal(bad.line, 2);
});

test('finished missions give a final state to start from', () => {
  for (const m of summary.missions) {
    const data = parseMission(read(`content/missions/${m.id}.en.md`));
    const s = missionFinalState(data);
    if (data.mode === 'compare') assert.equal(s, null);
    else assert.ok(s && s.worktrees.length >= 1, m.id);
  }
});
