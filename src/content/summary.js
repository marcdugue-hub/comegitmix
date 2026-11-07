// content/index.md -> ordered lists. Pure.
import { splitLines } from './util.js';

const SECTIONS = { Missions: 'missions', Puzzles: 'puzzles', Sandbox: 'sandbox' };

/** Returns { missions: [{id, line}], puzzles: [...], sandbox: [...], errors }. */
export function parseSummary(text) {
  const lines = splitLines(text);
  const errors = [];
  const out = { missions: [], puzzles: [], sandbox: [], errors };
  let cur = null;
  let inComment = false;
  lines.forEach((raw, i) => {
    let t = raw;
    // strip HTML comments (possibly multi-line)
    let res = '';
    while (t.length) {
      if (inComment) {
        const e = t.indexOf('-->');
        if (e < 0) { t = ''; break; }
        t = t.slice(e + 3); inComment = false;
      } else {
        const s = t.indexOf('<!--');
        if (s < 0) { res += t; t = ''; }
        else { res += t.slice(0, s); t = t.slice(s + 4); inComment = true; }
      }
    }
    t = res.trim();
    if (t === '') return;
    let m;
    if ((m = /^#\s+(.+)$/.exec(t))) {
      const key = SECTIONS[m[1].trim()];
      if (!key) {
        errors.push({ line: i + 1, message: `unknown section "# ${m[1].trim()}" (expected Missions, Puzzles or Sandbox)` });
        cur = null;
      } else cur = key;
    } else if ((m = /^-\s+(.+)$/.exec(t))) {
      const id = m[1].trim();
      if (!cur) errors.push({ line: i + 1, message: 'list item outside a section' });
      else if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) errors.push({ line: i + 1, message: `"${id}" is not a valid id (lowercase letters, digits, "-")` });
      else if (out[cur].some((x) => x.id === id)) errors.push({ line: i + 1, message: `"${id}" is listed twice` });
      else out[cur].push({ id, line: i + 1 });
    } else {
      errors.push({ line: i + 1, message: 'expected a "# Section" title or a "- id" list item' });
    }
  });
  if (inComment) errors.push({ line: lines.length, message: 'HTML comment is never closed' });
  return out;
}

/** content/ai-work.<lang>.md -> { items: [{ text, line }], errors }. */
export function parseAiWork(text) {
  const lines = splitLines(text);
  const items = [];
  const errors = [];
  lines.forEach((t, i) => {
    const m = /^-\s+(.+)$/.exec(t);
    if (m) items.push({ text: m[1].trim(), line: i + 1 });
  });
  if (items.length === 0) errors.push({ line: 1, message: 'the list must contain at least one "- " item' });
  return { items, errors };
}
