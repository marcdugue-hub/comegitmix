// Success conditions of steps and typed puzzles (docs/AUTHORING.md §4.2, docs/GIT-MODEL.md §5).
// Pure. The phrase syntax lives in src/content/check-phrase.js (parseCheckPhrase); this module evaluates it.
//
// Evaluation context:
//   {
//     state,          // current state
//     initial,        // state right after the setup (mission, part or puzzle): used by work-intact
//     last,           // { command, result } of the last command played (command: text or object; result: apply result)
//     diffShown,      // modes the diff screen was opened in during this step: ['branches' | 'work' | 'staged']
//   }

import { parseCheckPhrase } from '../content/check-phrase.js';
import { getDesk, findFile, resolveRev, commitsBetween, stagedPaths, deskFiles, activeDesk } from './state.js';
import { parse } from './parse.js';

/** Error codes of `error <code>` -> engine error keys. */
export const ERROR_KEYS = {
  'push-rejected': 'error.pushRejected',
  'branch-in-use': 'error.branchInUse',
  'worktree-dirty': 'error.worktreeDirty',
  'nothing-to-commit': 'error.nothingToCommit',
  conflict: 'error.mergeConflict',
};

/**
 * Ids of data/commands.json matching a command (text or object). A command may match several ids
 * (`git rebase -i` is both `squash` and `rebase`; `git commit -am` is `commit`).
 */
export function commandIds(command) {
  const c = typeof command === 'string' ? parse(command) : command;
  if (!c || c.error) return [];
  if (c.name === 'sequence') return [...new Set((c.commands || []).flatMap(commandIds))];
  const a0 = (c.args || [])[0];
  switch (c.name) {
    case 'worktree': return a0 ? [`worktree-${a0 === 'rm' ? 'remove' : a0}`, 'worktree'] : ['worktree'];
    case 'mr': return ['list', 'view'].includes(a0) ? [] : a0 ? [`mr-${a0 === 'open' ? 'create' : a0}`] : [];
    case 'rebase': return c.options && (c.options.i || c.options.interactive) ? ['squash', 'rebase'] : ['rebase'];
    case 'checkout': return ['switch', 'checkout'];
    case 'ai': case 'assistant': return ['ai'];
    default: return [c.name];
  }
}

const LETTER = (f) => {
  if (!f) return null;
  if (f.status === 'conflict') return 'conflict';
  if (f.staged) return f.status === 'U' ? 'A' : 'staged';
  return f.status;
};

/** True when the file matches a status word of `file <folder>/<path> <status>`. */
export function fileMatches(f, status) {
  if (!f) return false;
  switch (status) {
    case 'M': return f.status === 'M' && !f.staged;          // modified, not staged (the black M)
    case 'U': return f.status === 'U' && !f.staged;          // new, untracked
    case 'A': return f.status === 'U' && f.staged;           // new file in the index
    case 'staged': return f.staged && f.status !== 'conflict';
    case 'clean': return f.status === 'clean';
    case 'conflict': return f.status === 'conflict';
    default: return false;
  }
}

function lastErrorKey(last) {
  if (!last || !last.result) return null;
  const r = last.result;
  return (r.error && r.error.key) || (r.warning && r.warning.key) || null;
}

function resolveRef(state, name) {
  const r = resolveRev(state, activeDesk(state), name);
  return r ? r.id : null;
}

/** M/U files of `desk` in `initial` are all still there with the same content and status. */
export function workIntact(initial, state, folder) {
  const before = initial && getDesk(initial, folder);
  const now = getDesk(state, folder);
  if (!before || !now) return false;
  for (const f of deskFiles(before)) {
    if (f.status !== 'M' && f.status !== 'U') continue;
    const g = findFile(now, f.path);
    if (!g || g.work !== f.work || g.status !== f.status) return false;
  }
  return true;
}

/** Evaluates one parsed phrase ({ type, … } from parseCheckPhrase). Unknown types are false. */
export function evaluate(p, ctx) {
  const { state } = ctx;
  const desk = (name) => getDesk(state, name);
  switch (p.type) {
    case 'command': {
      const last = ctx.last;
      if (!last || !last.result || last.result.error) return false;
      return commandIds(last.command).includes(p.id);
    }
    case 'branch-exists': return Boolean(state.branches[p.branch]);
    case 'same': {
      const a = resolveRef(state, p.a);
      return Boolean(a) && a === resolveRef(state, p.b);
    }
    case 'desk-on': { const d = desk(p.desk); return Boolean(d) && d.branch === p.branch; }
    case 'desk-removed': return !desk(p.desk);
    case 'active-desk': { const d = desk(p.desk); return Boolean(d) && state.active === d.id; }
    case 'work-intact': return workIntact(ctx.initial, state, p.desk);
    case 'file': { const d = desk(p.desk); return Boolean(d) && fileMatches(findFile(d, p.path), p.status); }
    case 'resolved': {
      const d = desk(p.desk);
      if (!d) return false;
      return d.resolutions.some((r) => r.path === p.path && (r.sideLabel === p.side || r.side === p.side));
    }
    case 'index-empty': { const d = desk(p.desk); return Boolean(d) && stagedPaths(d).length === 0; }
    case 'index-contains': { const d = desk(p.desk); return Boolean(d) && stagedPaths(d).includes(p.path); }
    case 'stash': return (state.stash || []).length === p.count;
    case 'commits': {
      const b = resolveRef(state, p.branch);
      const base = resolveRef(state, p.base);
      if (!b || !base) return false;
      return commitsBetween(state, base, b).length === p.count;
    }
    case 'remote-fetched': return Boolean(state.remoteRefs && state.remoteRefs[`origin/${p.branch}`]);
    case 'mr': {
      for (const r of Object.values(state.remotes || {})) {
        const mr = (r.mrs || []).find((m) => m.id === p.num);
        if (mr) return mr.status === p.status;
      }
      return false;
    }
    case 'diff-shown': {
      if ((ctx.diffShown || []).includes(p.mode)) return true;
      const ev = ctx.last && ctx.last.result && !ctx.last.result.error ? ctx.last.result.events || [] : [];
      return ev.some((e) => e.type === 'diff.shown' && e.mode === p.mode);
    }
    case 'no-conflict': return state.worktrees.every((w) => deskFiles(w).every((f) => f.status !== 'conflict'));
    case 'error': return lastErrorKey(ctx.last) === ERROR_KEYS[p.code];
    default: return false;
  }
}

/** Evaluates one phrase (text or parsed). Returns true / false; an unknown phrase is false. */
export function check(phrase, ctx) {
  const p = typeof phrase === 'string' ? parseCheckPhrase(phrase) : phrase;
  return p ? evaluate(p, ctx) : false;
}

/**
 * Evaluates a list of phrases (strings, parsed phrases, or { text, line } items of the content reader).
 * Returns { ok, failed: [{ text, line }] }.
 */
export function checkAll(items, ctx) {
  const failed = [];
  for (const it of items || []) {
    const text = typeof it === 'string' ? it : it.text;
    const ok = text !== undefined ? check(text, ctx) : evaluate(it, ctx);
    if (!ok) failed.push({ text: text !== undefined ? text : JSON.stringify(it), line: it.line || null });
  }
  return { ok: failed.length === 0, failed };
}

/** Status letter of a file as shown in zone ④ (M, U, A, staged = blue M, clean, conflict). */
export { LETTER as fileLetter };
