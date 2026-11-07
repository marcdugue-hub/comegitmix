import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, formatIssue, checkSetupLine } from '../../src/content/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const setup = '## Setup\n```git-setup\n@files a.md\ngit commit -m "init"\n```\n';
const mission = (steps, extra = '') => `---\ntitle: M\n---\n${setup}${extra}\n## Steps\n${steps}\n## End\nsummary: s\n`;
const okStep = '### 1. A\ncommand: git status\nafter: x\n';
const puzzle = (choices, fm = '') => `---\ntitle: P\n${fm}---\n## Prompt\np\n${setup}\n## Choices\n${choices}\n## Goal\ng\n## Takeaway\nt\n`;

function run(files) {
  const base = { 'index.md': '# Missions\n- m\n# Puzzles\n- p\n# Sandbox\n- s\n', 'ai-work.fr.md': '- x\n', 'ai-work.en.md': '- x\n',
    'missions/m.fr.md': mission(okStep), 'puzzles/p.fr.md': puzzle('- [x] git a\n- [ ] git b — no\n'),
    'sandbox/s.fr.md': `---\ntitle: S\n---\ntext\n${setup}` };
  return validate({ ...base, ...files }).errors;
}
const find = (errs, file, line, re) => errs.find((e) => e.file === `content/${file}` && e.line === line && re.test(e.message));

test('a valid minimal content set has no error', () => {
  assert.deepEqual(run({}), []);
});

test('unknown step key, with line', () => {
  const e = run({ 'missions/m.fr.md': mission('### 1. A\ncommand: git status\nbogus: x\n') });
  assert.ok(find(e, 'missions/m.fr.md', 13, /unknown key "bogus"/), JSON.stringify(e));
});

test('unknown front matter key, French token, unknown section', () => {
  const e = run({ 'missions/m.fr.md': `---\ntitre: M\n---\n${setup}\n## Etapes\n` });
  assert.ok(find(e, 'missions/m.fr.md', 2, /unknown front matter key "titre"/));
  assert.ok(e.some((x) => /unknown section "## Etapes"/.test(x.message) && x.line === 10));
});

test('unknown directive (including French ones)', () => {
  const bad = mission(okStep).replace('@files a.md', '@travail a.md');
  const e = run({ 'missions/m.fr.md': bad });
  assert.ok(find(e, 'missions/m.fr.md', 6, /unknown directive @travail/));
  assert.match(checkSetupLine('@mr 4 a b "t"'), /@mr must be/);
  assert.equal(checkSetupLine('@mr 42 ia/x -> main "T" comments=2'), null);
  assert.equal(checkSetupLine('# comment'), null);
});

test('bad check phrase and unknown error code', () => {
  const e = run({ 'missions/m.fr.md': mission('### 1. A\ncommand: git status\ncheck:\n- banana split\n- error nope\n') });
  assert.ok(find(e, 'missions/m.fr.md', 14, /unknown check phrase/));
  assert.ok(find(e, 'missions/m.fr.md', 15, /unknown error code "nope"/));
});

test('instruction needs a check; command or web required', () => {
  const e = run({ 'missions/m.fr.md': mission('### 1. A\ncommand: (click it)\n### 2. B\nafter: x\n') });
  assert.ok(find(e, 'missions/m.fr.md', 12, /needs a "check:"/));
  assert.ok(find(e, 'missions/m.fr.md', 13, /needs "command:" or "web:"/));
});

test('step numbering and web actions', () => {
  const e = run({ 'missions/m.fr.md': mission('### 2. A\nweb: approve MR 42\n') });
  assert.ok(find(e, 'missions/m.fr.md', 11, /numbered/));
  assert.ok(find(e, 'missions/m.fr.md', 12, /unknown web action/));
});

test('choice list without [x]', () => {
  const e = run({ 'puzzles/p.fr.md': puzzle('- [ ] git a — x\n- [ ] git b — y\n') });
  assert.ok(find(e, 'puzzles/p.fr.md', 12, /exactly one \[x\] \(found 0\)/), JSON.stringify(e));
});

test('conflict block malformed or referring to missing path', () => {
  const block = '\n```conflict zzz.md\n<<< main\nA\n=== other\nB\n>>>\n```\n';
  const e = run({ 'sandbox/s.fr.md': `---\ntitle: S\n---\ntext\n${setup}${block}` });
  assert.ok(e.some((x) => /"zzz.md", which the setup does not create/.test(x.message)));
  assert.ok(e.some((x) => /branch "other"/.test(x.message)));
  const e2 = run({ 'sandbox/s.fr.md': `---\ntitle: S\n---\ntext\n${setup}\n\`\`\`conflict a.md\n<<< main\nA\n\`\`\`\n` });
  assert.ok(e2.some((x) => /two sides/.test(x.message)));
  assert.ok(e2.some((x) => /must end with ">>>"/.test(x.message)));
});

test('index.md: missing file, unknown section, bad next', () => {
  let e = run({ 'index.md': '# Missions\n- m\n- ghost\n# Foo\n# Puzzles\n- p\n# Sandbox\n- s\n' });
  assert.ok(find(e, 'index.md', 3, /ghost.*does not exist/));
  assert.ok(find(e, 'index.md', 4, /unknown section "# Foo"/));
  e = run({ 'missions/m.fr.md': mission(okStep).replace('summary: s', 'summary: s\nnext: puzzle nope') });
  assert.ok(e.some((x) => /refers to puzzle "nope"/.test(x.message)));
  e = run({ 'missions/m.fr.md': mission(okStep).replace('summary: s', 'summary: s\nnext: tomorrow') });
  assert.ok(e.some((x) => /"next:" must be/.test(x.message)));
});

test('missing English file is only a warning', () => {
  const r = validate({ 'index.md': '# Missions\n- m\n', 'ai-work.fr.md': '- x\n', 'missions/m.fr.md': mission(okStep) });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /no \.en\.md/.test(w.message)));
});

test('FR / EN misalignment', () => {
  const two = okStep + '### 2. B\ncommand: git log\n';
  let e = run({ 'missions/m.en.md': mission(two) });
  assert.ok(e.some((x) => x.file === 'content/missions/m.en.md' && /2 steps here, 1 in the FR/.test(x.message)));
  e = run({ 'missions/m.en.md': mission(okStep.replace('git status', 'git log')) });
  assert.ok(find(e, 'missions/m.en.md', 11, /differ from the FR file/));
  // translated commit messages and instructions do not count as differences
  const fr = mission('### 1. A\ncommand: git commit -m "Un"\n### 2. B\ncommand: (cliquez)\ncheck: no conflict\n');
  const en = mission('### 1. A\ncommand: git commit -m "One"\n### 2. B\ncommand: (click)\ncheck: no conflict\n');
  assert.deepEqual(run({ 'missions/m.fr.md': fr, 'missions/m.en.md': en }), []);
  e = run({ 'puzzles/p.en.md': puzzle('- [ ] git a — x\n- [x] git b\n') });
  assert.ok(e.some((x) => /choice command or \[x\] differs/.test(x.message)));
});

test('compare mode: replays and desk counts', () => {
  const cmp = (desk) => `---\ntitle: C\nmode: compare\n---\n## Column — A\nreplays: m part A\ndesk: ${desk}\n`;
  const parts = '## Part A — One\n### 1. A\ncommand: git status\n';
  const m = `---\ntitle: M\n---\n${setup}${parts}## End\nsummary: s\n`;
  const idx = '# Missions\n- m\n- c\n';
  const base = { 'index.md': idx, 'ai-work.fr.md': '- x\n', 'missions/m.fr.md': m };
  assert.deepEqual(validate({ ...base, 'missions/c.fr.md': cmp('intact') }).errors, []);
  const e = validate({ ...base, 'missions/c.fr.md': cmp('intact, intact') }).errors;
  assert.ok(e.some((x) => /2 values but part A has 1 steps/.test(x.message)));
});

test('engine hook is optional and called when given', () => {
  const calls = [];
  validate({ 'index.md': '# Missions\n', 'ai-work.fr.md': '- x\n' }, { engine: { checkContent: (c) => { calls.push(Object.keys(c)); c.report('index.md', 1, 'boom'); } } });
  assert.deepEqual(calls, [['parsed', 'files', 'report']]);
});

test('every real file in content/ validates', () => {
  const files = {};
  const walk = (dir, prefix = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${prefix}${e.name}/`);
      else if (e.name.endsWith('.md')) files[`${prefix}${e.name}`] = readFileSync(join(dir, e.name), 'utf8');
    }
  };
  walk(join(root, 'content'));
  const commandIds = Object.keys(JSON.parse(readFileSync(join(root, 'data', 'commands.json'), 'utf8')).commands);
  const { errors } = validate(files, { commandIds });
  assert.deepEqual(errors.map(formatIssue), []);
});
