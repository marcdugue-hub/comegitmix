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

/**
 * content/files.<lang>.md -> { entries: { key: { initial, edits, fallback, line } }, order: [key], errors }.
 * `## <path | *.ext>`, then a ```text block (initial content), `- ` items (edits) and an optional `fallback:` line.
 */
export function parseFiles(text) {
  const lines = splitLines(text);
  const entries = {};
  const order = [];
  const errors = [];
  let cur = null;
  let fence = null;
  lines.forEach((raw, i) => {
    const line = i + 1;
    if (fence) {
      if (/^```\s*$/.test(raw)) {
        cur.initial = fence.join('\n');
        fence = null;
      } else fence.push(raw);
      return;
    }
    const t = raw.trim();
    if (t === '' || /^#\s/.test(t)) return;
    let m;
    if ((m = /^##\s+(\S+)\s*$/.exec(t))) {
      const key = m[1];
      if (!/^(\*\.[a-z0-9]+|[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*)$/.test(key)) errors.push({ line, message: `"${key}" is not a file path or a "*.ext" default` });
      if (entries[key]) errors.push({ line, message: `"${key}" is listed twice` });
      cur = { initial: null, edits: [], fallback: null, line };
      entries[key] = cur;
      order.push(key);
      return;
    }
    if (!cur) {
      errors.push({ line, message: 'expected a "## <file>" heading' });
      return;
    }
    if (/^```/.test(t)) {
      if (cur.initial !== null) errors.push({ line, message: 'only one ```text block per file' });
      fence = [];
      return;
    }
    if ((m = /^-\s(.*)$/.exec(raw))) {
      cur.edits.push(m[1]);
      return;
    }
    if ((m = /^fallback:\s*(.+)$/.exec(t))) {
      cur.fallback = m[1].trim();
      return;
    }
    errors.push({ line, message: 'expected a ```text block, a "- " edit or a "fallback:" line' });
  });
  if (fence) errors.push({ line: lines.length, message: 'the ```text block is never closed' });
  for (const key of order) {
    const e = entries[key];
    if (e.initial === null) errors.push({ line: e.line, message: `"${key}" has no \`\`\`text block (initial content)` });
    if (key.startsWith('*.') && !e.fallback) errors.push({ line: e.line, message: `the default "${key}" needs a "fallback:" line` });
    if (/\.csv$/.test(key) && e.initial) {
      const cols = e.initial.split('\n')[0].split(',').length;
      for (const edit of e.edits) if (edit.split(',').length !== cols) errors.push({ line: e.line, message: `"${key}": the row "${edit}" does not have ${cols} columns` });
    }
  }
  return { entries, order, errors };
}
