// File content library (content/files.<lang>.md): parsing, initial contents and edits.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFiles } from '../../src/content/summary.js';
import { setFileLibrary } from '../../src/engine/library.js';
import { initialContent, editedContent } from '../../src/engine/state.js';

const LIB = `# Files

## plan.md
\`\`\`text
# Plan

First line.

| Part | Who |
|---|---|
| Intro | You |
\`\`\`
- First line, rewritten.
- | Intro | AI |
- | Sources | AI |
fallback: _Plan v{n}._

## data.csv
\`\`\`text
Month,Sales
Jan,10
\`\`\`
- Jan,12
- Feb,9

## *.md
\`\`\`text
# {name}
\`\`\`
- A line.
fallback: _{name} v{n}_
`;

afterEach(() => setFileLibrary(null));

test('parseFiles reads entries, edits and fallback; reports malformed files', () => {
  const lib = parseFiles(LIB);
  assert.deepEqual(lib.errors, []);
  assert.deepEqual(lib.order, ['plan.md', 'data.csv', '*.md']);
  assert.equal(lib.entries['plan.md'].edits.length, 3);
  assert.equal(lib.entries['plan.md'].fallback, '_Plan v{n}._');
  assert.ok(parseFiles('## *.md\n- x').errors.length >= 2, 'no text block and no fallback for a default');
  assert.ok(parseFiles('## a.csv\n```text\nA,B\n```\n- 1,2,3').errors.some((e) => /columns/.test(e.message)));
});

test('without a library, generic contents are generated', () => {
  assert.match(initialContent('plan.md'), /plan\.md · 1/);
});

test('library contents: exact path, then default by extension; edits replace prose, rows by key, append new rows', () => {
  setFileLibrary(parseFiles(LIB));
  assert.equal(initialContent('notes/idea.md'), '# idea');
  const plan = initialContent('plan.md');
  assert.match(editedContent(plan, 1, 'plan.md'), /^First line, rewritten\.$/m);
  assert.match(editedContent(plan, 2, 'plan.md'), /^\| Intro \| AI \|$/m);
  assert.doesNotMatch(editedContent(plan, 2, 'plan.md'), /\| Intro \| You \|/);
  assert.match(editedContent(plan, 3, 'plan.md'), /\| Intro \| You \|\n\| Sources \| AI \|/);
  const csv = initialContent('data.csv');
  assert.equal(editedContent(csv, 1, 'data.csv'), 'Month,Sales\nJan,12');
  assert.equal(editedContent(csv, 2, 'data.csv'), 'Month,Sales\nJan,10\nFeb,9');
});

test('two different edits of the same content never give the same result; the fallback line is reused', () => {
  setFileLibrary(parseFiles(LIB));
  const plan = initialContent('plan.md');
  const results = new Set();
  for (let r = 1; r <= 12; r += 1) results.add(editedContent(plan, r, 'plan.md'));
  assert.equal(results.size, 12);
  const twice = editedContent(editedContent(plan, 5, 'plan.md'), 8, 'plan.md');
  assert.equal((twice.match(/_Plan v\d+\._/g) || []).length, 1);
  assert.match(twice, /_Plan v8\._/);
});

test('the shipped libraries parse without error and are aligned', () => {
  const fr = parseFiles(readFileSync(new URL('../../content/files.fr.md', import.meta.url), 'utf8'));
  const en = parseFiles(readFileSync(new URL('../../content/files.en.md', import.meta.url), 'utf8'));
  assert.deepEqual(fr.errors, []);
  assert.deepEqual(en.errors, []);
  assert.deepEqual(fr.order, en.order);
});
