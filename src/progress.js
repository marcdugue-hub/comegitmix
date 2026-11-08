// Progress persistence (ADR 0003): localStorage key "comegitmix:v1", guarded, versioned.
// The same key also holds the i18n "lang" field: every write re-reads the stored object and only
// touches the fields owned here, so the two modules coexist.
//
// Stored shape:
//   { v: 1, lang?, missions: { [id]: true }, puzzles: { [id]: stars 0..3 },
//     sandbox: { start: string|null, commands: string[]|object[] } | null, last: "#/…" | null,
//     prefs: { details: boolean } }
// A stored `v` different from VERSION resets everything except `lang`. A missing `v` (language only) is fine.

export const STORAGE_KEY = 'comegitmix:v1';
export const VERSION = 1;
export const MAX_STARS = 3;

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

const isPlain = (o) => o && typeof o === 'object' && !Array.isArray(o);
const cleanMap = (o, ok) => {
  const out = {};
  if (isPlain(o)) for (const [k, v] of Object.entries(o)) if (ok(v)) out[k] = v;
  return out;
};

/** Normalises whatever was stored into a complete, valid progress object (pure). */
export function normalize(raw) {
  const src = isPlain(raw) ? raw : {};
  const stale = src.v !== undefined && src.v !== VERSION;
  const out = { v: VERSION, missions: {}, puzzles: {}, sandbox: null, last: null, prefs: { details: false } };
  if (typeof src.lang === 'string') out.lang = src.lang;
  if (stale) return out;
  out.missions = cleanMap(src.missions, (v) => v === true);
  out.puzzles = cleanMap(src.puzzles, (v) => Number.isInteger(v) && v >= 0 && v <= MAX_STARS);
  if (isPlain(src.sandbox) && Array.isArray(src.sandbox.commands)) {
    out.sandbox = { start: typeof src.sandbox.start === 'string' ? src.sandbox.start : null, commands: src.sandbox.commands };
  }
  if (typeof src.last === 'string' && src.last.startsWith('#/')) out.last = src.last;
  if (isPlain(src.prefs) && src.prefs.details === true) out.prefs.details = true;
  return out;
}

/** createProgress({ storage }) -> progress API. `storage` is a function or an object with getItem/setItem (default: localStorage). */
export function createProgress({ storage } = {}) {
  const getStorage = typeof storage === 'function' ? storage : storage === undefined ? defaultStorage : () => storage;

  function read() {
    try {
      const s = getStorage();
      const text = s && s.getItem(STORAGE_KEY);
      return normalize(text ? JSON.parse(text) : {});
    } catch {
      return normalize({});
    }
  }
  function update(fn) {
    const data = read();
    fn(data);
    try {
      const s = getStorage();
      if (s) s.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable or full: the game works without it */
    }
    return data;
  }

  return {
    /** Snapshot of everything stored (always valid). */
    get: read,
    isMissionDone: (id) => read().missions[id] === true,
    markMissionDone: (id) => update((d) => { d.missions[id] = true; }),
    /** Stars 0..3 for a puzzle (0 = never solved). */
    getStars: (id) => read().puzzles[id] || 0,
    /** Keeps the best score. */
    setStars(id, stars) {
      const n = Math.max(0, Math.min(MAX_STARS, Math.floor(Number(stars) || 0)));
      return update((d) => { if (n > (d.puzzles[id] || 0)) d.puzzles[id] = n; });
    },
    /** Saved sandbox session: { start, commands } or null. */
    getSandbox: () => read().sandbox,
    saveSandbox: (commands, start = null) => update((d) => { d.sandbox = { start, commands: [...commands] }; }),
    clearSandbox: () => update((d) => { d.sandbox = null; }),
    /** Last visited screen as a hash route ("#/mission/…"), used by Resume. */
    getLast: () => read().last,
    setLast: (hash) => update((d) => { d.last = typeof hash === 'string' && hash.startsWith('#/') && hash !== '#/' ? hash : null; }),
    /** "More details" mode (raw command output), shared by the sandbox and the missions. */
    getDetails: () => read().prefs.details === true,
    setDetails: (on) => update((d) => { d.prefs.details = Boolean(on); }),
    /** True when there is anything worth resuming. */
    hasProgress() {
      const d = read();
      return Boolean(d.last) || Object.keys(d.missions).length > 0 || Object.keys(d.puzzles).length > 0 || Boolean(d.sandbox);
    },
    /** Forgets progress; the language is kept. */
    reset: () => update((d) => { d.missions = {}; d.puzzles = {}; d.sandbox = null; d.last = null; }),
  };
}

/** Shared instance on the browser's localStorage. */
export const progress = createProgress();
