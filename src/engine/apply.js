// apply(state, command) -> { state, events, explanation, error, warning, output, equivalent }
// Pure: the input state is never mutated; on error the input state is returned unchanged.
// Commands live in src/engine/commands/*.js and are registered in commands/index.js.

import { EngineError, LIMITS, clone, getDesk, refreshState, reachableCommits, deskFiles } from './state.js';
import { parse } from './parse.js';
import { COMMANDS } from './commands/index.js';

const registry = new Map();

/**
 * Registers a command handler: { name, aliases?: string[], readOnly?: boolean, run(ctx) }.
 * A later registration with the same name replaces the previous one.
 */
export function registerCommand(handler) {
  if (!handler || typeof handler.run !== 'function' || !handler.name) throw new Error('Invalid command handler');
  registry.set(handler.name, handler);
  for (const a of handler.aliases || []) registry.set(a, handler);
}

export function getCommand(name) {
  return registry.get(name) || null;
}

export function registeredCommands() {
  return [...new Set(registry.values())].map((h) => h.name);
}

for (const h of COMMANDS) registerCommand(h);

function failure(state, error, extra = {}) {
  return { state, events: [], explanation: null, error, warning: null, output: null, equivalent: null, ...extra };
}

function snapshotFiles(state) {
  const out = new Map();
  for (const w of state.worktrees) {
    const m = new Map();
    for (const f of deskFiles(w)) m.set(f.path, { status: f.status, staged: f.staged });
    out.set(w.id, m);
  }
  return out;
}

function autoEvents(before, after) {
  const events = [];
  const b = snapshotFiles(before);
  const a = snapshotFiles(after);
  for (const [deskId, files] of a) {
    const prev = b.get(deskId);
    if (!prev) continue;
    for (const [path, f] of files) {
      const p = prev.get(path);
      if (!p) {
        events.push({ type: 'file.created', desk: deskId, path, status: f.status, staged: f.staged });
        if (f.staged) events.push({ type: 'index.added', desk: deskId, path });
        continue;
      }
      if (p.status !== f.status || p.staged !== f.staged) {
        events.push({ type: 'file.status', desk: deskId, path, from: p.status, to: f.status, stagedFrom: p.staged, staged: f.staged });
      }
      if (!p.staged && f.staged) events.push({ type: 'index.added', desk: deskId, path });
      if (p.staged && !f.staged) events.push({ type: 'index.removed', desk: deskId, path });
    }
    for (const [path, p] of prev) {
      if (!files.has(path)) {
        events.push({ type: 'file.removed', desk: deskId, path });
        if (p.staged) events.push({ type: 'index.removed', desk: deskId, path });
      }
    }
  }
  const rb = reachableCommits(before);
  const ra = reachableCommits(after);
  const orphaned = [...rb].filter((id) => !ra.has(id));
  const restored = [...ra].filter((id) => !rb.has(id) && before.commits[id]);
  if (orphaned.length) events.push({ type: 'commits.orphaned', ids: orphaned.sort() });
  if (restored.length) events.push({ type: 'commits.restored', ids: restored.sort() });
  if (before.active !== after.active) events.push({ type: 'desk.activated', id: after.active, from: before.active });
  return { events, visibleBefore: rb.size, visibleAfter: ra.size };
}

function makeCtx(draft, command, opts, shared) {
  const desk = getDesk(draft, command.desk || null);
  if (!desk) throw new EngineError('error.unknownDesk', { path: command.desk });
  const ctx = {
    state: draft,
    command,
    name: command.name,
    args: command.args || [],
    options: command.options || {},
    desk,
    opts,
    readOnly: false,
    emit(type, data = {}) {
      shared.events.push({ type, ...data });
    },
    explain(key, params = {}) {
      shared.explanation = { key, params };
    },
    warn(key, params = {}) {
      shared.warning = { key, params };
    },
    output(data) {
      shared.output = data;
    },
    equivalent(value) {
      shared.equivalent = value;
    },
    fail(key, params = {}) {
      throw new EngineError(key, params);
    },
    markReadOnly() {
      ctx.readOnly = true;
    },
    /** Runs another command on the same draft (used by composite actions such as click). */
    run(name, args = [], options = {}, extra = {}) {
      const handler = registry.get(name);
      if (!handler) throw new EngineError('error.unknownCommand', { input: name, suggestion: '' });
      const sub = makeCtx(draft, { name, args, options, desk: extra.desk || desk.id, git: extra.git }, opts, shared);
      handler.run(sub);
      return sub;
    },
  };
  return ctx;
}

function applyOne(state, command, opts) {
  if (command && command.error) return failure(state, command.error);
  if (!command || !command.name) return failure(state, { key: 'error.emptyCommand', params: {} });
  if (command.name === 'sequence') return applySequence(state, command.commands || [], opts);
  const handler = registry.get(command.name);
  if (!handler) {
    const key = ['fetch', 'pull', 'push', 'remote', 'fork'].includes(command.name) ? 'error.notAvailable' : 'error.unknownCommand';
    return failure(state, { key, params: { name: command.name, input: command.text || command.name, suggestion: '' } });
  }
  const draft = clone(state);
  const shared = { events: [], explanation: null, warning: null, output: null, equivalent: null };
  let ctx;
  try {
    ctx = makeCtx(draft, command, opts, shared);
    handler.run(ctx);
    refreshState(draft);
    if (handler.readOnly || ctx.readOnly) {
      return { state, events: shared.events, explanation: shared.explanation, error: null, warning: shared.warning, output: shared.output, equivalent: shared.equivalent };
    }
    if (Object.keys(draft.branches).length > LIMITS.branches && Object.keys(draft.branches).length > Object.keys(state.branches).length) {
      throw new EngineError('error.limitBranches', { max: LIMITS.branches });
    }
    if (draft.worktrees.length > LIMITS.desks && draft.worktrees.length > state.worktrees.length) {
      throw new EngineError('error.limitDesks', { max: LIMITS.desks });
    }
    const auto = autoEvents(state, draft);
    if (auto.visibleAfter > LIMITS.commits && auto.visibleAfter > auto.visibleBefore) {
      throw new EngineError('error.limitCommits', { max: LIMITS.commits });
    }
    const seen = new Set(shared.events.map((e) => e.type));
    const events = [...shared.events, ...auto.events.filter((e) => !(e.type === 'desk.activated' && seen.has('desk.activated')))];
    return { state: draft, events, explanation: shared.explanation, error: null, warning: shared.warning, output: shared.output, equivalent: shared.equivalent };
  } catch (e) {
    if (e instanceof EngineError) return failure(state, { key: e.key, params: e.params });
    throw e;
  }
}

function applySequence(state, commands, opts) {
  let cur = state;
  const events = [];
  const explanations = [];
  let last = null;
  for (const c of commands) {
    const r = applyOne(cur, c, opts);
    if (r.error) return failure(state, r.error, { explanations });
    events.push(...r.events);
    if (r.explanation) explanations.push(r.explanation);
    cur = r.state;
    last = r;
  }
  return { state: cur, events, explanation: last ? last.explanation : null, explanations, error: null, warning: last ? last.warning : null, output: last ? last.output : null, equivalent: null };
}

/**
 * Applies a command (object or text) to a state.
 * opts.lenient: setup mode (commit with nothing staged saves the whole folder, empty commits allowed).
 * opts.author: author of the commits created ('human' | 'ai'), overrides state.author.
 */
export function apply(state, command, opts = {}) {
  const cmd = typeof command === 'string' ? parse(command) : command;
  return applyOne(state, cmd, opts);
}

/** Applies a list of commands; stops at the first error. Returns { state, results, error, index }. */
export function applyAll(state, commands, opts = {}) {
  let cur = state;
  const results = [];
  for (let i = 0; i < commands.length; i += 1) {
    const r = apply(cur, commands[i], opts);
    results.push(r);
    if (r.error) return { state: cur, results, error: r.error, index: i };
    cur = r.state;
  }
  return { state: cur, results, error: null, index: -1 };
}

/** Events the command would produce, without applying it (dashed preview). */
export function preview(state, command, opts = {}) {
  const r = apply(state, command, opts);
  return r.error ? [] : r.events;
}
