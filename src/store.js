// Application store: current simulation state + undo/redo/reset history.
// Pure (no DOM). `apply` is injected (src/engine/apply.js `apply`), so tests can use a stub.
// Rules: an errored command or a read-only command (apply returns the same state object) changes nothing
// in the history; the session history is the list of applied state-changing commands (serialisable).

/**
 * createStore({ apply, initialState }) -> {
 *   getState(), getInitialState(), getLastResult(), getCommands(),
 *   dispatch(command, opts?) -> result,      // result of apply(); listeners are notified every time
 *   undo() / redo() -> boolean, canUndo(), canRedo(),
 *   reset(), load(initialState, commands?),   // load = new starting point (mission/sandbox start), then replay
 *   replay(commands, opts?) -> results[],     // reset to the initial state, then dispatch each (errors skipped)
 *   isDiffShown(), setDiffShown(bool),        // diff screen flag (zone view vs diff view)
 *   subscribe(listener(state, result)) -> unsubscribe
 * }
 */
export function createStore({ apply, initialState, applyOpts } = {}) {
  if (typeof apply !== 'function') throw new TypeError('createStore: apply is required');
  let initial = initialState;
  let state = initialState;
  let past = []; // [{ state, command }] — entries to go back to
  let future = []; // [{ state, command }] — entries undone
  let lastResult = null;
  let diffShown = false;
  const listeners = new Set();

  const notify = () => {
    for (const cb of [...listeners]) cb(state, lastResult);
  };

  function dispatch(command, opts) {
    const result = apply(state, command, { ...applyOpts, ...opts });
    lastResult = result;
    if (!result.error && result.state !== state) {
      past.push({ state, command });
      future = [];
      state = result.state;
    }
    notify();
    return result;
  }

  function undo() {
    if (!past.length) return false;
    const entry = past.pop();
    future.push({ state, command: entry.command });
    state = entry.state;
    lastResult = null;
    notify();
    return true;
  }

  function redo() {
    if (!future.length) return false;
    const entry = future.pop();
    past.push({ state, command: entry.command });
    state = entry.state;
    lastResult = null;
    notify();
    return true;
  }

  function resetSilently() {
    state = initial;
    past = [];
    future = [];
    lastResult = null;
  }

  function reset() {
    resetSilently();
    notify();
  }

  function replay(commands, opts) {
    resetSilently();
    const results = [];
    for (const c of commands) results.push(dispatch(c, opts));
    return results;
  }

  function load(newInitial, commands = []) {
    initial = newInitial;
    diffShown = false;
    resetSilently();
    if (commands.length) return replay(commands);
    notify();
    return [];
  }

  return {
    getState: () => state,
    getInitialState: () => initial,
    getLastResult: () => lastResult,
    getCommands: () => past.map((e) => e.command),
    dispatch,
    undo,
    redo,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    reset,
    load,
    replay,
    isDiffShown: () => diffShown,
    setDiffShown(value) {
      const v = Boolean(value);
      if (v === diffShown) return;
      diffShown = v;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
