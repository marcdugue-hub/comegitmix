// Front matter: a simple YAML subset (text, number, [list]) between two "---" lines.
import { matchKey } from './util.js';

/** Parses a scalar / list value. */
export function parseValue(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((s) => s.trim()).filter((s) => s !== '');
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  const q = /^(["'])(.*)\1$/.exec(v);
  return q ? q[2] : v;
}

/**
 * Parses the front matter of `lines` (array of lines).
 * Returns { data, lines: {key: line}, raw: {key: string}, end, errors }:
 * `end` is the index of the first body line; keys are in file order.
 */
export function parseFrontmatter(lines) {
  const errors = [];
  const data = {};
  const keyLines = {};
  const raw = {};
  if (lines[0] === undefined || lines[0].trim() !== '---') {
    errors.push({ line: 1, message: 'missing front matter (the file must start with "---")' });
    return { data, lines: keyLines, raw, end: 0, errors };
  }
  let i = 1;
  for (; i < lines.length; i++) {
    const t = lines[i];
    if (t.trim() === '---') break;
    if (t.trim() === '' || /^\s*#/.test(t)) continue;
    const k = matchKey(t);
    if (!k) {
      errors.push({ line: i + 1, message: 'front matter line must be "key: value"' });
      continue;
    }
    if (k.key in data) errors.push({ line: i + 1, message: `duplicate key "${k.key}"` });
    data[k.key] = parseValue(k.value);
    raw[k.key] = k.value;
    keyLines[k.key] = i + 1;
  }
  if (i >= lines.length) {
    errors.push({ line: 1, message: 'front matter is never closed (missing second "---")' });
    return { data, lines: keyLines, raw, end: lines.length, errors };
  }
  return { data, lines: keyLines, raw, end: i + 1, errors };
}

/** Checks keys and value kinds against a schema {key: 'string'|'number'|'list'|[enum...]}. */
export function checkFrontmatter(fm, schema, errors, required = []) {
  for (const key of Object.keys(fm.data)) {
    const line = fm.lines[key];
    const rule = schema[key];
    const v = fm.data[key];
    if (rule === undefined) {
      errors.push({ line, message: `unknown front matter key "${key}"` });
    } else if (rule === 'number') {
      if (typeof v !== 'number') errors.push({ line, message: `"${key}" must be a number` });
    } else if (rule === 'string') {
      if (typeof v !== 'string' || v === '') errors.push({ line, message: `"${key}" must be a non-empty text` });
    } else if (rule === 'list') {
      if (!Array.isArray(v)) errors.push({ line, message: `"${key}" must be a list like [a, b]` });
    } else if (Array.isArray(rule)) {
      if (!rule.includes(v)) errors.push({ line, message: `"${key}" must be one of: ${rule.join(', ')}` });
    } else if (rule && rule.listOf) {
      if (!Array.isArray(v)) errors.push({ line, message: `"${key}" must be a list like [a, b]` });
      else for (const x of v) if (!rule.listOf.includes(x)) errors.push({ line, message: `"${key}" has unknown value "${x}" (expected: ${rule.listOf.join(', ')})` });
    }
  }
  for (const key of required) {
    if (!(key in fm.data)) errors.push({ line: 1, message: `missing front matter key "${key}"` });
  }
}
