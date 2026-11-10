// File content library (content/files.<lang>.md, docs/AUTHORING.md §7 ter): realistic initial contents and edits.
// The engine stays pure and language-neutral: the UI hands it the parsed library of the current language.
// Without a library (unit tests) or for a file with no entry, the generic generator of state.js is used.
//
// Library shape: { entries: { '<path>' | '*.<ext>': { initial: string, edits: [string], fallback: string|null } } }

let library = null;

/** Sets (or clears, with null) the library used by initialContent / editedContent. */
export function setFileLibrary(lib) {
  library = lib && lib.entries ? lib : null;
}

export function getFileLibrary() {
  return library;
}

function base(path) {
  const parts = String(path).split('/');
  return parts[parts.length - 1];
}

function extension(path) {
  const m = /\.([^./]+)$/.exec(base(path));
  return m ? m[1].toLowerCase() : '';
}

/** Entry for a path: exact path, then file name, then default by extension. */
export function libraryEntry(path) {
  if (!library) return null;
  const e = library.entries;
  return e[path] || e[base(path)] || e[`*.${extension(path)}`] || null;
}

function fill(text, path, n = '') {
  const name = base(path).replace(/\.[^.]+$/, '');
  return String(text).split('{name}').join(name).split('{n}').join(String(n));
}

/** Library initial content of a file, or null when the library has no entry for it. */
export function libraryInitial(path) {
  const entry = libraryEntry(path);
  return entry ? fill(entry.initial, path) : null;
}

const isTableRow = (line) => /^\s*\|/.test(line);
const isSeparator = (line) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line);
const cellKey = (line) => line.trim().replace(/^\|/, '').split('|')[0].trim();
const csvKey = (line) => line.split(',')[0].trim();
const isProse = (line) => line.trim() !== '' && !/^\s*#/.test(line) && !isTableRow(line) && !/^\s*```/.test(line);

/** Applies one edit line to the lines of a file (returns new lines). */
function applyEdit(lines, edit, proseRank, csv) {
  const out = [...lines];
  if (csv) {
    const key = csvKey(edit);
    const at = out.findIndex((l, i) => i > 0 && l.trim() !== '' && csvKey(l) === key);
    if (at !== -1) out[at] = edit;
    else {
      let last = out.length - 1;
      while (last > 0 && out[last].trim() === '') last -= 1;
      out.splice(last + 1, 0, edit);
    }
    return out;
  }
  if (isTableRow(edit)) {
    const key = cellKey(edit);
    const header = (i) => i + 1 < out.length && isSeparator(out[i + 1]);
    const at = out.findIndex((l, i) => isTableRow(l) && !isSeparator(l) && !header(i) && cellKey(l) === key);
    if (at !== -1) {
      out[at] = edit;
      return out;
    }
    let last = -1;
    out.forEach((l, i) => { if (isTableRow(l)) last = i; });
    if (last === -1) out.push(edit);
    else out.splice(last + 1, 0, edit);
    return out;
  }
  const prose = out.map((l, i) => (isProse(l) ? i : -1)).filter((i) => i !== -1);
  if (!prose.length) out.push(edit);
  else out[prose[proseRank % prose.length]] = edit;
  return out;
}

function fallbackPattern(fb, path) {
  const parts = fill(fb, path, '\u0000').split('\u0000').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('\\d+')}$`);
}

/**
 * Library edit of a file, or null when the library has no entry for it.
 * Edit number `rev` (a global counter) applies edit (rev-1) mod n. Once the list has been used up, or when the
 * edit changes nothing, the fallback line (with {n} = rev) is written too, replacing an earlier fallback line,
 * so two different edits of the same content never give the same result.
 */
export function libraryEdit(content, rev, path) {
  const entry = libraryEntry(path);
  if (!entry) return null;
  const csv = extension(path) === 'csv';
  const current = content == null || content === '' ? fill(entry.initial, path) : content;
  const edits = entry.edits || [];
  const r = Math.max(1, Number(rev) || 1);
  let next = current;
  if (edits.length) {
    const i = (r - 1) % edits.length;
    const proseRank = csv ? 0 : edits.slice(0, i).filter((e) => !isTableRow(e)).length;
    next = applyEdit(current.split('\n'), fill(edits[i], path, r), proseRank, csv).join('\n');
  }
  if (next === current || r > edits.length) {
    const fb = entry.fallback || '_{n}_';
    const pattern = fallbackPattern(fb, path);
    const lines = next.split('\n');
    const at = lines.findIndex((l) => pattern.test(l));
    if (at !== -1) lines[at] = fill(fb, path, r);
    else {
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      if (!csv && !isTableRow(fb)) lines.push('');
      lines.push(fill(fb, path, r));
    }
    next = lines.join('\n');
  }
  return next;
}
