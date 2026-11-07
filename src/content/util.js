// Shared helpers for the content parsers. Pure: no DOM, no fetch.

/** Splits a text into lines (handles CRLF). Line numbers are index + 1. */
export function splitLines(text) {
  return String(text).replace(/^﻿/, '').split(/\r?\n/);
}

/** key: value detection. Returns { key, value } or null. */
export function matchKey(text) {
  const m = /^([a-z][a-z-]*):(?:\s+(.*)|\s*)$/.exec(text.trimEnd());
  if (!m) return null;
  return { key: m[1], value: (m[2] || '').trim() };
}

/**
 * Splits lines[from..to) at headings of the given level ("## " is level 2),
 * ignoring headings inside fenced code blocks.
 * Returns { pre: {from, to}, sections: [{ title, line, from, to }] } where
 * from/to are line indexes of the section body (heading excluded).
 */
export function splitByHeading(lines, from, to, level) {
  const prefix = '#'.repeat(level) + ' ';
  const sections = [];
  let inFence = false;
  let pre = { from, to };
  let current = null;
  for (let i = from; i < to; i++) {
    const t = lines[i];
    if (/^\s*```/.test(t)) inFence = !inFence;
    if (!inFence && t.startsWith(prefix)) {
      if (current) current.to = i;
      else pre = { from, to: i };
      current = { title: t.slice(prefix.length).trim(), line: i + 1, from: i + 1, to };
      sections.push(current);
    }
  }
  if (current) current.to = to;
  return { pre, sections };
}

/**
 * Extracts fenced blocks from lines[from..to).
 * Returns [{ info, line, body: [{ text, line }] }]; reports unclosed fences.
 */
export function extractFences(lines, from, to, errors) {
  const blocks = [];
  let cur = null;
  for (let i = from; i < to; i++) {
    const t = lines[i];
    if (/^```/.test(t)) {
      if (cur) { blocks.push(cur); cur = null; }
      else cur = { info: t.slice(3).trim(), line: i + 1, body: [] };
    } else if (cur) {
      cur.body.push({ text: t.replace(/\s+$/, ''), line: i + 1 });
    }
  }
  if (cur) {
    errors.push({ line: cur.line, message: 'code block is never closed' });
    blocks.push(cur);
  }
  return blocks;
}

/** Lines of lines[from..to) that are outside fenced blocks, as [{text, line}]. */
export function textOutsideFences(lines, from, to) {
  const out = [];
  let inFence = false;
  for (let i = from; i < to; i++) {
    const t = lines[i];
    if (/^```/.test(t)) { inFence = !inFence; continue; }
    if (!inFence) out.push({ text: t, line: i + 1 });
  }
  return out;
}

/** Parses a "conflict" block body into two sides. */
function parseConflictBody(body, line, errors) {
  const sides = [];
  let cur = null;
  let closed = false;
  for (const { text, line: ln } of body) {
    let m;
    if ((m = /^<<<\s+(\S+)\s*$/.exec(text))) {
      if (sides.length !== 0) errors.push({ line: ln, message: 'unexpected "<<<" in conflict block' });
      cur = { branch: m[1], line: ln, lines: [] };
      sides.push(cur);
    } else if ((m = /^===\s+(\S+)\s*$/.exec(text))) {
      if (sides.length !== 1) errors.push({ line: ln, message: 'unexpected "===" in conflict block' });
      cur = { branch: m[1], line: ln, lines: [] };
      sides.push(cur);
    } else if (/^>>>\s*$/.test(text)) {
      closed = true;
      cur = null;
    } else if (/^(<<<|===|>>>)/.test(text)) {
      errors.push({ line: ln, message: 'malformed conflict marker (expected "<<< <branch>", "=== <branch>" or ">>>")' });
    } else if (cur) {
      cur.lines.push(text);
    } else if (text.trim() !== '') {
      errors.push({ line: ln, message: 'text outside the sides of the conflict block' });
    }
  }
  if (sides.length !== 2) errors.push({ line, message: 'conflict block needs two sides ("<<< <branch>" then "=== <branch>")' });
  if (!closed) errors.push({ line, message: 'conflict block must end with ">>>"' });
  return sides;
}

/**
 * Reads the git-setup block and the conflict blocks of lines[from..to).
 * Returns { setup: { line, lines: [{text, line}] } | null, conflicts: [{ path, line, sides }] }.
 */
export function parseSetupSection(lines, from, to, errors) {
  let setup = null;
  const conflicts = [];
  for (const b of extractFences(lines, from, to, errors)) {
    if (b.info === 'git-setup') {
      if (setup) errors.push({ line: b.line, message: 'only one git-setup block is allowed here' });
      else setup = { line: b.line, lines: b.body.filter((l) => l.text.trim() !== '') };
    } else if (/^conflict(\s|$)/.test(b.info)) {
      const m = /^conflict\s+(\S+)$/.exec(b.info);
      if (!m) {
        errors.push({ line: b.line, message: 'conflict block needs a path ("```conflict plan.md")' });
        continue;
      }
      conflicts.push({ path: m[1], line: b.line, sides: parseConflictBody(b.body, b.line, errors) });
    } else {
      errors.push({ line: b.line, message: `unknown code block "${b.info}" (expected git-setup or conflict)` });
    }
  }
  return { setup, conflicts };
}

/** Builds text paragraphs from [{text,line}] lines (blank line = separator). */
export function paragraphs(items) {
  const out = [];
  let cur = null;
  for (const { text, line } of items) {
    if (text.trim() === '') { cur = null; continue; }
    if (!cur) { cur = { text: text.trim(), line }; out.push(cur); }
    else cur.text += '\n' + text.trim();
  }
  return out;
}

/** Same as paragraphs() but duo quotes ("> duo: ...") are returned apart. */
export function splitDuo(items) {
  const duo = [];
  const rest = [];
  let cur = null;
  for (const it of items) {
    const m = /^>\s*duo:\s?(.*)$/.exec(it.text);
    if (m) {
      cur = { text: m[1].trim(), line: it.line };
      duo.push(cur);
    } else if (cur && /^>\s?(.*)$/.test(it.text)) {
      cur.text += ' ' + /^>\s?(.*)$/.exec(it.text)[1].trim();
    } else {
      cur = null;
      rest.push(it);
    }
  }
  return { duo, rest };
}

export function splitList(value, sep) {
  return value.split(sep).map((s) => s.trim()).filter(Boolean);
}
