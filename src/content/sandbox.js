// Sandbox start .md -> plain object (docs/AUTHORING.md §6). Pure.
import { parseFrontmatter, checkFrontmatter } from './frontmatter.js';
import { splitLines, splitByHeading, parseSetupSection, paragraphs, textOutsideFences } from './util.js';

export const SANDBOX_SCHEMA = { title: 'string', repos: { listOf: ['local', 'origin', 'upstream'] }, folder: 'string' };

/** Returns { kind:'sandbox', front, text, setup, conflicts, errors }. */
export function parseSandbox(text) {
  const lines = splitLines(text);
  const errors = [];
  const fm = parseFrontmatter(lines);
  errors.push(...fm.errors);
  checkFrontmatter(fm, SANDBOX_SCHEMA, errors, ['title']);
  const s = { kind: 'sandbox', front: fm.data, frontLines: fm.lines, text: '', setup: null, setupLine: null, conflicts: [], errors };
  const { pre, sections } = splitByHeading(lines, fm.end, lines.length, 2);
  s.text = paragraphs(textOutsideFences(lines, pre.from, pre.to)).map((p) => p.text).join('\n\n');
  for (const sec of sections) {
    if (sec.title === 'Setup') {
      const r = parseSetupSection(lines, sec.from, sec.to, errors);
      s.setup = r.setup; s.conflicts = r.conflicts; s.setupLine = sec.line;
    } else errors.push({ line: sec.line, message: `unknown section "## ${sec.title}" (expected Setup)` });
  }
  if (!s.setup) errors.push({ line: s.setupLine || 1, message: 'missing "## Setup" section with a git-setup block' });
  return s;
}
