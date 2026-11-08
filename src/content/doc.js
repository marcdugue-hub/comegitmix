// Command card .md (content/docs/<id>.<lang>.md, docs/AUTHORING.md §9) -> plain object. Pure.
import { parseFrontmatter, checkFrontmatter } from './frontmatter.js';
import { splitLines, splitByHeading } from './util.js';

export const DOC_SCHEMA = { title: 'string', summary: 'string', syntax: 'string', see: 'list' };
/** Section headings (English tokens) -> keys; the displayed headings come from i18n (docs.section.<key>). */
export const DOC_SECTIONS = { 'What it does': 'what', 'In the game': 'game', Example: 'example', 'Watch out': 'watch' };
export const DOC_REQUIRED_SECTIONS = ['what', 'game'];

/** Returns { title, summary, syntax, see, sections: [{ key, body, line }], errors }. */
export function parseDoc(text) {
  const lines = splitLines(text);
  const errors = [];
  const fm = parseFrontmatter(lines);
  errors.push(...fm.errors);
  checkFrontmatter(fm, DOC_SCHEMA, errors, ['title', 'summary', 'syntax']);
  const { pre, sections } = splitByHeading(lines, fm.end, lines.length, 2);
  for (let i = pre.from; i < pre.to; i++) {
    if (lines[i].trim()) { errors.push({ line: i + 1, message: 'text before the first "## " section' }); break; }
  }
  const out = [];
  for (const s of sections) {
    const key = DOC_SECTIONS[s.title];
    if (!key) {
      errors.push({ line: s.line, message: `unknown section "## ${s.title}" (expected: ${Object.keys(DOC_SECTIONS).join(', ')})` });
      continue;
    }
    if (out.some((x) => x.key === key)) errors.push({ line: s.line, message: `duplicate section "## ${s.title}"` });
    const body = lines.slice(s.from, s.to).join('\n').trim();
    if (!body) errors.push({ line: s.line, message: `section "## ${s.title}" is empty` });
    out.push({ key, body, line: s.line });
  }
  for (const key of DOC_REQUIRED_SECTIONS) {
    if (!out.some((x) => x.key === key)) {
      const title = Object.keys(DOC_SECTIONS).find((k) => DOC_SECTIONS[k] === key);
      errors.push({ line: 1, message: `missing section "## ${title}"` });
    }
  }
  const d = fm.data;
  return { title: d.title || '', summary: d.summary || '', syntax: d.syntax || '', see: Array.isArray(d.see) ? d.see : [], sections: out, errors };
}
