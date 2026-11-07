// Line diff (LCS) and the three diff modes of the diff screen (docs/GIT-MODEL.md §8).
// Rows follow data/diff-examples.json: { lk, rk, ln, rn, lt, rt } with lk/rk in ctx|del|add|empty|fold.

import { getDesk, deskFiles, resolveRev, commitTree, mergeBase, deskTree } from './state.js';
import { findBlock } from './conflicts.js';

export const CONTEXT = 3;

function splitLines(text) {
  if (text === null || text === undefined || text === '') return [];
  return String(text).split('\n');
}

/** Edit script between two line arrays: [{ op: 'eq'|'del'|'add', a, b, text }]. */
export function lineOps(a, b) {
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ op: 'eq', a: i, b: j, text: a[i] });
      i += 1;
      j += 1;
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      ops.push({ op: 'del', a: i, text: a[i] });
      i += 1;
    } else {
      ops.push({ op: 'add', b: j, text: b[j] });
      j += 1;
    }
  }
  while (i < n) ops.push({ op: 'del', a: i, text: a[i++] });
  while (j < m) ops.push({ op: 'add', b: j, text: b[j++] });
  return ops;
}

/**
 * Side-by-side rows between two texts, with unchanged runs folded beyond `context` lines.
 * A fold row is { lk: 'fold', rk: 'fold', n } (n = number of hidden lines, at least 2).
 */
export function lineDiff(oldText, newText, { context = CONTEXT } = {}) {
  const ops = lineOps(splitLines(oldText), splitLines(newText));
  const rows = [];
  let adds = 0;
  let dels = 0;
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === 'eq') {
      const o = ops[k];
      rows.push({ lk: 'ctx', rk: 'ctx', ln: o.a + 1, rn: o.b + 1, lt: o.text, rt: o.text });
      k += 1;
      continue;
    }
    const del = [];
    const add = [];
    while (k < ops.length && ops[k].op !== 'eq') {
      if (ops[k].op === 'del') del.push(ops[k]);
      else add.push(ops[k]);
      k += 1;
    }
    dels += del.length;
    adds += add.length;
    for (let i = 0; i < Math.max(del.length, add.length); i += 1) {
      const d = del[i];
      const a = add[i];
      rows.push({
        lk: d ? 'del' : 'empty',
        rk: a ? 'add' : 'empty',
        ln: d ? d.a + 1 : null,
        rn: a ? a.b + 1 : null,
        lt: d ? d.text : '',
        rt: a ? a.text : '',
      });
    }
  }
  return { rows: fold(rows, context), adds, dels };
}

function fold(rows, context) {
  const out = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].lk !== 'ctx') {
      out.push(rows[i]);
      i += 1;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j].lk === 'ctx') j += 1;
    const run = rows.slice(i, j);
    const leading = i === 0;
    const trailing = j === rows.length;
    const keepStart = leading ? 0 : context;
    const keepEnd = trailing ? 0 : context;
    const hidden = run.length - keepStart - keepEnd;
    if (leading && trailing) {
      out.push(...run);
    } else if (hidden >= 2) {
      out.push(...run.slice(0, keepStart));
      out.push({ lk: 'fold', rk: 'fold', n: hidden });
      out.push(...run.slice(run.length - keepEnd));
    } else {
      out.push(...run);
    }
    i = j;
  }
  return out;
}

function letterFor(a, b) {
  if (a === null) return 'A';
  if (b === null) return 'D';
  return 'M';
}

/** Diff between two content maps: [{ path, letter, staged:false, rows, adds, dels }]. */
export function diffTrees(treeA, treeB) {
  const paths = [...new Set([...Object.keys(treeA), ...Object.keys(treeB)])].sort();
  const files = [];
  for (const p of paths) {
    const a = p in treeA ? treeA[p] : null;
    const b = p in treeB ? treeB[p] : null;
    if (a === b) continue;
    const d = lineDiff(a, b);
    files.push({ path: p, letter: letterFor(a, b), staged: false, rows: d.rows, adds: d.adds, dels: d.dels });
  }
  return files;
}

function conflictEntry(state, f) {
  const c = f.conflict;
  const block = findBlock(state, f.path, c.oursLabel, c.theirsLabel);
  if (!block) {
    return { path: f.path, letter: '!', staged: false, rows: [], adds: 0, dels: 0, conflict: true, conflictUndetailed: true, ours: c.oursLabel, theirs: c.theirsLabel };
  }
  const d = lineDiff(block.firstText, block.secondText);
  return { path: f.path, letter: '!', staged: false, rows: d.rows, adds: d.adds, dels: d.dels, conflict: true, conflictUndetailed: false, ours: c.oursLabel, theirs: c.theirsLabel };
}

/**
 * diff(state, { mode, worktreeId?, a?, b?, threeDot? })
 *  - mode 'work'     : git diff            (index -> folder). U files: rows [] + untracked: true.
 *  - mode 'staged'   : git diff --staged   (last commit -> index).
 *  - mode 'branches' : git diff a b / a..b, or a...b with threeDot (merge base of a and b -> b).
 *                      `b` may be omitted: the folder of the desk (git diff <a>).
 *  - mode 'conflict' : only the conflicted files of the desk.
 * Returns { mode, from, to, files: [{ path, letter, staged, rows, adds, dels, untracked?, conflict?, conflictUndetailed? }] }
 * or { error: { key, params } } when a revision is unknown.
 */
export function diff(state, { mode = 'work', worktreeId = null, a = null, b = null, threeDot = false, paths = null } = {}) {
  const desk = getDesk(state, worktreeId);
  const keep = (f) => !paths || paths.includes(f.path);
  if (mode === 'branches') {
    const ra = resolveRev(state, desk, a || 'HEAD');
    if (!ra) return { error: { key: 'error.unknownRevision', params: { rev: a } } };
    let rb = null;
    if (b) {
      rb = resolveRev(state, desk, b);
      if (!rb) return { error: { key: 'error.unknownRevision', params: { rev: b } } };
    }
    let fromId = ra.id;
    let baseId = null;
    if (threeDot && rb) {
      baseId = mergeBase(state, ra.id, rb.id);
      fromId = baseId;
    }
    const treeB = rb ? commitTree(state, rb.id) : deskTree(desk, 'work');
    const files = diffTrees(commitTree(state, fromId), treeB).filter(keep);
    return {
      mode,
      from: { kind: 'rev', name: a || 'HEAD', id: ra.id, base: baseId },
      to: rb ? { kind: 'rev', name: b, id: rb.id } : { kind: 'folder', desk: desk.id },
      threeDot: Boolean(threeDot && rb),
      files,
    };
  }
  const files = [];
  for (const f of deskFiles(desk)) {
    if (!keep(f)) continue;
    if (f.status === 'conflict') {
      if (mode === 'work' || mode === 'conflict') files.push(conflictEntry(state, f));
      continue;
    }
    if (mode === 'conflict') continue;
    if (mode === 'work') {
      if (f.base === null && f.index === null) {
        files.push({ path: f.path, letter: 'U', staged: false, rows: [], adds: 0, dels: 0, untracked: true });
      } else if (f.work !== f.index) {
        const d = lineDiff(f.index, f.work);
        files.push({ path: f.path, letter: f.work === null ? 'D' : 'M', staged: false, rows: d.rows, adds: d.adds, dels: d.dels });
      }
    } else if (mode === 'staged') {
      if (f.index !== f.base) {
        const d = lineDiff(f.base, f.index);
        files.push({ path: f.path, letter: letterFor(f.base, f.index), staged: true, rows: d.rows, adds: d.adds, dels: d.dels });
      }
    }
  }
  const from = mode === 'staged' ? { kind: 'lastCommit', id: desk.head } : { kind: 'index' };
  const to = mode === 'staged' ? { kind: 'index' } : { kind: 'folder' };
  return { mode, desk: desk.id, from, to, threeDot: false, files };
}
