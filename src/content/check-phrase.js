// Syntax of the `check:` success conditions (docs/AUTHORING.md §4.2).
// Pure: turns a phrase into a plain object, or null when it is not a known phrase.

export const FILE_STATUSES = ['M', 'U', 'A', 'staged', 'clean', 'conflict'];
export const MR_STATUSES = ['open', 'approved', 'merged'];
export const DIFF_MODES = ['branches', 'work', 'staged'];
export const ERROR_CODES = ['push-rejected', 'branch-in-use', 'worktree-dirty', 'nothing-to-commit', 'conflict', 'not-a-repo'];

const REF = '[^\\s=]+';

/** Returns { type, ...args } or null. `type` is the first word (or "same" for `a = b`). */
export function parseCheckPhrase(raw) {
  const s = raw.trim().replace(/\s+/g, ' ');
  let m;
  if ((m = /^command (\S+)$/.exec(s))) return { type: 'command', id: m[1] };
  if ((m = /^branch (\S+) exists$/.exec(s))) return { type: 'branch-exists', branch: m[1] };
  if ((m = /^desk (\S+) on (\S+)$/.exec(s))) return { type: 'desk-on', desk: m[1], branch: m[2] };
  if ((m = /^desk (\S+) removed$/.exec(s))) return { type: 'desk-removed', desk: m[1] };
  if ((m = /^active desk (\S+)$/.exec(s))) return { type: 'active-desk', desk: m[1] };
  if ((m = /^work-intact (\S+)$/.exec(s))) return { type: 'work-intact', desk: m[1] };
  if ((m = /^file ([^\s/]+)\/(\S+) (\S+)$/.exec(s)) && FILE_STATUSES.includes(m[3])) {
    return { type: 'file', desk: m[1], path: m[2], status: m[3] };
  }
  if ((m = /^resolved ([^\s/]+)\/(\S+) (\S+)$/.exec(s))) return { type: 'resolved', desk: m[1], path: m[2], side: m[3] };
  if ((m = /^index (\S+) empty$/.exec(s))) return { type: 'index-empty', desk: m[1] };
  if ((m = /^index (\S+) contains (\S+)$/.exec(s))) return { type: 'index-contains', desk: m[1], path: m[2] };
  if ((m = /^stash = (\d+)$/.exec(s))) return { type: 'stash', count: Number(m[1]) };
  if ((m = /^commits (\S+) since (\S+) = (\d+)$/.exec(s))) return { type: 'commits', branch: m[1], base: m[2], count: Number(m[3]) };
  if ((m = /^remote (\S+) fetched$/.exec(s))) return { type: 'remote-fetched', branch: m[1] };
  if ((m = /^mr (\d+) (\S+)$/.exec(s)) && MR_STATUSES.includes(m[2])) return { type: 'mr', num: Number(m[1]), status: m[2] };
  if ((m = /^diff shown (\S+)$/.exec(s)) && DIFF_MODES.includes(m[1])) return { type: 'diff-shown', mode: m[1] };
  if (s === 'no conflict') return { type: 'no-conflict' };
  if ((m = /^error (\S+)$/.exec(s))) return { type: 'error', code: m[1] };
  if ((m = new RegExp(`^(${REF}) = (${REF})$`).exec(s))) return { type: 'same', a: m[1], b: m[2] };
  return null;
}
