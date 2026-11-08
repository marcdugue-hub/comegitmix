import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../../src/content/frontmatter.js';
import { parseMission } from '../../src/content/mission.js';
import { parsePuzzle } from '../../src/content/puzzle.js';
import { parseSandbox } from '../../src/content/sandbox.js';
import { parseSummary, parseAiWork } from '../../src/content/summary.js';
import { renderMarkdown, renderInline } from '../../src/content/markdown.js';
import { parseCheckPhrase } from '../../src/content/check-phrase.js';
import { createLoader } from '../../src/content/loader.js';

const MISSION = `---
title: Test
duration: 5
repos: [local, origin]
unlocks: [stash]
mode: stepper
---

> duo: Hello
> there

## Setup
\`\`\`git-setup
@files a.md
git commit -m "init"
\`\`\`

\`\`\`conflict a.md
<<< main
one
=== ia/x
two
>>>
\`\`\`

## Part A — First
> duo: Part intro
### 1. Look
command: git status
accepts: git status -s ; git st
check:
- stash = 1
- main = origin/main
Explain here.

Second paragraph.
after: Done.
before: @work a.md
### Part end
summary: Part over

## End
summary: All over
takeaway: Learned
next: puzzle 01-x
`;

test('frontmatter values', () => {
  const fm = parseFrontmatter(['---', 'a: 3', 'b: [x, y]', 'c: text here', '---', 'body']);
  assert.deepEqual(fm.data, { a: 3, b: ['x', 'y'], c: 'text here' });
  assert.equal(fm.lines.b, 3);
  assert.equal(fm.end, 5);
  assert.equal(parseFrontmatter(['no']).errors.length, 1);
});

test('mission parser', () => {
  const m = parseMission(MISSION);
  assert.deepEqual(m.errors, []);
  assert.equal(m.mode, 'stepper');
  assert.deepEqual(m.duo, ['Hello there']);
  assert.equal(m.setup.lines[1].text, 'git commit -m "init"');
  assert.equal(m.setup.lines[1].line, 15);
  assert.equal(m.conflicts[0].path, 'a.md');
  assert.deepEqual(m.conflicts[0].sides.map((s) => [s.branch, s.lines]), [['main', ['one']], ['ia/x', ['two']]]);
  assert.equal(m.parts.length, 1);
  const p = m.parts[0];
  assert.equal(p.letter, 'A');
  assert.equal(p.title, 'First');
  assert.deepEqual(p.duo, ['Part intro']);
  const s = p.steps[0];
  assert.equal(s.n, 1);
  assert.equal(s.line, 28);
  assert.equal(s.command, 'git status');
  assert.deepEqual(s.accepts, ['git status -s', 'git st']);
  assert.deepEqual(s.check.map((c) => c.text), ['stash = 1', 'main = origin/main']);
  assert.equal(s.check[0].line, 32);
  assert.equal(s.text, 'Explain here.');
  assert.deepEqual(s.extra, ['Second paragraph.']);
  assert.equal(s.after, 'Done.');
  assert.equal(s.before[0].text, '@work a.md');
  assert.equal(p.end.summary, 'Part over');
  assert.equal(m.end.next.kind, 'puzzle');
  assert.equal(m.end.next.id, '01-x');
});

test('mission parser reports unknown key and section with lines', () => {
  const m = parseMission(MISSION.replace('after: Done.', 'bogus: x').replace('## End', '## Fin'));
  const msgs = m.errors.map((e) => `${e.line}:${e.message}`);
  assert.ok(msgs.some((x) => x.startsWith('37:unknown key "bogus"')), msgs.join('\n'));
  assert.ok(msgs.some((x) => /unknown section "## Fin"/.test(x)));
});

test('mission compare mode', () => {
  const m = parseMission(`---
title: C
mode: compare
---
Intro.

## Column — A
replays: m part A
desk: intact, stashed

## Piège
\`fatal: x\`
Text.
`);
  assert.deepEqual(m.errors, []);
  assert.equal(m.columns[0].replays.part, 'A');
  assert.deepEqual(m.columns[0].desk, ['intact', 'stashed']);
  assert.equal(m.boxes[0].blocks[0].type, 'code');
});

test('puzzle parser (choice and typed)', () => {
  const p = parsePuzzle(`---
title: P
timer: 60
---
## Prompt
Do it.

## Setup
\`\`\`git-setup
@files a.md
\`\`\`

## Choices
- [x] git a
- [ ] git b — because b.

## Goal
G

## Takeaway
T
`);
  assert.deepEqual(p.errors, []);
  assert.equal(p.type, 'choice');
  assert.deepEqual(p.choices.map((c) => [c.correct, c.command, c.explanation, c.line]), [[true, 'git a', null, 14], [false, 'git b', 'because b.', 15]]);
  const t = parsePuzzle(`---
title: P
type: typed
---
## Prompt
x
## Setup
\`\`\`git-setup
@files a.md
\`\`\`
## Solution
solution: git worktree add ../r b
check:
- desk r on b
## Goal
g
## Takeaway
t
`);
  assert.deepEqual(t.errors, []);
  assert.equal(t.solution.command, 'git worktree add ../r b');
  assert.equal(t.solution.check[0].text, 'desk r on b');
});

test('sandbox parser', () => {
  const s = parseSandbox('---\ntitle: S\nrepos: [local]\n---\nSome text.\n\n## Setup\n```git-setup\n@files a.md\n```\n');
  assert.deepEqual(s.errors, []);
  assert.equal(s.text, 'Some text.');
  assert.equal(s.setup.lines.length, 1);
});

test('summary and ai-work parsers', () => {
  const s = parseSummary('# Missions\n- a\n<!-- - b -->\n- c\n\n# Puzzles\n- p\n');
  assert.deepEqual(s.missions, [{ id: 'a', line: 2 }, { id: 'c', line: 4 }]);
  assert.deepEqual(s.puzzles, [{ id: 'p', line: 7 }]);
  assert.deepEqual(s.errors, []);
  const a = parseAiWork('# What\n\n- One {files}.\n- Two.\n');
  assert.deepEqual(a.items, [{ text: 'One {files}.', line: 3 }, { text: 'Two.', line: 4 }]);
  assert.equal(parseAiWork('# x').errors.length, 1);
});

test('check phrases', () => {
  assert.deepEqual(parseCheckPhrase('file rpt-client/a/b.md staged'), { type: 'file', desk: 'rpt-client', path: 'a/b.md', status: 'staged' });
  assert.equal(parseCheckPhrase('main = origin/main').type, 'same');
  assert.equal(parseCheckPhrase('stash = 2').count, 2);
  assert.equal(parseCheckPhrase('commits b since main = 1').base, 'main');
  assert.equal(parseCheckPhrase('no conflict').type, 'no-conflict');
  assert.equal(parseCheckPhrase('mr 42 closed'), null);
  assert.equal(parseCheckPhrase('nonsense words'), null);
});

test('markdown escapes HTML and renders the mini syntax', () => {
  assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(renderInline('**b** *i* `c<d>`'), '<strong>b</strong> <em>i</em> <code>c&lt;d&gt;</code>');
  assert.equal(renderMarkdown('a\nb\n\n- x\n- y'), '<p>a b</p><ul><li>x</li><li>y</li></ul>');
  assert.equal(renderMarkdown('1. x\n2. y'), '<ol><li>x</li><li>y</li></ol>');
  assert.match(renderInline('[ok](https://e.com/a?b=1&c=2)'), /<a href="https:\/\/e\.com\/a\?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">ok<\/a>/);
  assert.ok(!/href|<a/.test(renderInline('[bad](javascript:alert(1))')));
  assert.equal(renderInline('`git commit -m "*"` and *it*'), '<code>git commit -m &quot;*&quot;</code> and <em>it</em>');
  assert.ok(!renderInline('"><img onerror=x>').includes('<img'));
  assert.equal(renderInline('snake_case_name'), 'snake_case_name');
});

test('loader: language, French fallback flag, injectable fetch', async () => {
  const calls = [];
  const store = {
    'content/missions/a.fr.md': '---\ntitle: A\n---\n',
    'content/missions/b.fr.md': '---\ntitle: B-fr\n---\n',
    'content/missions/b.en.md': '---\ntitle: B-en\n---\n',
    'content/index.md': '# Missions\n- a\n',
  };
  const loader = createLoader({ fetchText: async (p) => { calls.push(p); return store[p] ?? null; } });
  const a = await loader.loadMission('a', 'en');
  assert.equal(a.fallback, true);
  assert.equal(a.lang, 'fr');
  assert.equal(a.data.front.title, 'A');
  const b = await loader.loadMission('b', 'en');
  assert.equal(b.fallback, false);
  assert.equal(b.data.front.title, 'B-en');
  assert.ok(calls.every((c) => !c.startsWith('/')));
  await assert.rejects(loader.loadPuzzle('zzz', 'fr'), /not found/);
  assert.deepEqual((await loader.loadSummary()).missions, [{ id: 'a', line: 2 }]);
});
