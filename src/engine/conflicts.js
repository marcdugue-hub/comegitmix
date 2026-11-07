// Simulated conflicts (docs/adr/0005-file-level-conflicts.md):
// a file conflicts when it was changed on both sides since the common ancestor.
// No line-level detection. Content detail only comes from `conflict` blocks.

import { findFile, setFile, refreshDesk, deskFiles } from './state.js';

/**
 * Three-way merge of content maps (path -> content).
 * Returns { tree, conflicts: [{ path, base, ours, theirs }] }.
 * In `tree`, a conflicted path keeps "ours" provisionally.
 */
export function threeWay(base, ours, theirs) {
  const paths = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  const tree = {};
  const conflicts = [];
  for (const p of paths) {
    const b = p in base ? base[p] : null;
    const o = p in ours ? ours[p] : null;
    const t = p in theirs ? theirs[p] : null;
    let merged;
    if (o === t) merged = o;
    else if (o === b) merged = t;
    else if (t === b) merged = o;
    else {
      conflicts.push({ path: p, base: b, ours: o, theirs: t });
      merged = o;
    }
    if (merged !== null) tree[p] = merged;
  }
  return { tree, conflicts };
}

/** Paths whose content differs between two maps. */
export function changedPaths(a, b) {
  const paths = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...paths].filter((p) => (p in a ? a[p] : null) !== (p in b ? b[p] : null)).sort();
}

/**
 * The `conflict` block provided by the content for this path and these two sides, if any.
 * Block shape (set by the content reader in state.conflictBlocks):
 * { path, first, second, firstText, secondText } — first = the receiving lane, second = the incoming lane.
 */
export function findBlock(state, path, oursLabel, theirsLabel) {
  return (state.conflictBlocks || []).find(
    (b) => b.path === path && b.first === oursLabel && b.second === theirsLabel,
  ) || null;
}

/**
 * Writes a merge result into a desk whose last commit content is `headTree`.
 * Non-conflicting incoming changes are placed in the folder and the index (staged, as Git does);
 * conflicting files get the `conflict` status.
 */
export function applyMergeResult(state, desk, headTree, result, oursLabel, theirsLabel) {
  for (const p of changedPaths(headTree, result.tree)) {
    if (result.conflicts.some((c) => c.path === p)) continue;
    const v = p in result.tree ? result.tree[p] : null;
    setFile(desk, p, { index: v, work: v });
  }
  for (const c of result.conflicts) {
    const block = findBlock(state, c.path, oursLabel, theirsLabel);
    setFile(desk, c.path, {
      base: c.path in headTree ? headTree[c.path] : null,
      index: c.path in headTree ? headTree[c.path] : null,
      work: c.ours !== null ? c.ours : c.theirs,
      conflict: {
        oursLabel,
        theirsLabel,
        ours: c.ours,
        theirs: c.theirs,
        detailed: Boolean(block),
        resolved: null,
        added: false,
      },
    });
  }
  refreshDesk(desk);
}

/** Resolution content for a side: 'ours' | 'theirs' | 'both'. */
export function resolvedContent(state, file, side) {
  const c = file.conflict;
  const block = findBlock(state, file.path, c.oursLabel, c.theirsLabel);
  const ours = block ? block.firstText : c.ours;
  const theirs = block ? block.secondText : c.theirs;
  if (side === 'ours') return ours;
  if (side === 'theirs') return theirs;
  if (ours === null) return theirs;
  if (theirs === null) return ours;
  return `${ours}\n${theirs}`;
}

/** Normalises a side given as 'ours' / 'theirs' / 'both' or as a branch name of the conflict. */
export function normalizeSide(file, side) {
  if (side === 'ours' || side === 'theirs' || side === 'both') return side;
  if (!file.conflict) return null;
  if (side === file.conflict.oursLabel) return 'ours';
  if (side === file.conflict.theirsLabel) return 'theirs';
  return null;
}

/** Applies a resolution: the file leaves the conflict status and becomes M (to be added). */
export function resolveFile(state, desk, path, side) {
  const f = findFile(desk, path);
  const work = resolvedContent(state, f, side);
  f.conflict = { ...f.conflict, resolved: side, added: false };
  setFile(desk, path, { work });
  desk.resolutions.push({ path, side, sideLabel: side === 'ours' ? f.conflict.oursLabel : side === 'theirs' ? f.conflict.theirsLabel : 'both', oursLabel: f.conflict.oursLabel, theirsLabel: f.conflict.theirsLabel });
  return f;
}

/** Clears conflict markers once the operation is committed. */
export function clearConflicts(desk) {
  for (const f of deskFiles(desk)) f.conflict = null;
  refreshDesk(desk);
}
