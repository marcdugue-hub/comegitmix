// Engine-backed content checks (src/engine/content-check.js) on the real content and on broken samples.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../src/content/validate.js';
import { checkContent, playInstruction } from '../../src/engine/content-check.js';
import { runSetup } from '../../src/engine/setup.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');

function walk(dir, prefix = '') {
  const out = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) Object.assign(out, walk(join(dir, e.name), `${prefix}${e.name}/`));
    else if (e.name.endsWith('.md')) out[`${prefix}${e.name}`] = readFileSync(join(dir, e.name), 'utf8');
  }
  return out;
}

const engine = { checkContent };
const errorsOf = (files) => validate(files, { engine }).errors;

test('all real content passes the engine checks', () => {
  const { errors } = validate(walk(root), { engine });
  assert.deepEqual(errors.map((e) => `${e.file}:${e.line} ${e.message}`), []);
});

const SETUP = '## Setup\n```git-setup\n@files plan.md intro.md\ngit commit -m "init"\n```\n';
const mission = (steps, setup = SETUP) => `---\ntitle: M\n---\n${setup}\n## Steps\n${steps}\n## End\nsummary: s\n`;
const base = (files) => ({
  'index.md': '# Missions\n- m\n# Puzzles\n- p\n# Sandbox\n- s\n', 'ai-work.fr.md': '- x\n', 'ai-work.en.md': '- x\n',
  'missions/m.fr.md': mission('### 1. A\ncommand: git status\n'),
  'puzzles/p.fr.md': `---\ntitle: P\n---\n## Prompt\np\n${SETUP}\n## Choices\n- [x] git branch x\n- [ ] git status — no\n## Goal\ng\n## Takeaway\nt\n`,
  'sandbox/s.fr.md': `---\ntitle: S\n---\ntext\n${SETUP}`,
  ...files,
});
const has = (errs, file, line, re) => errs.some((e) => e.file === `content/${file}` && e.line === line && re.test(e.message));

test('a minimal valid set passes', () => {
  assert.deepEqual(errorsOf(base({})), []);
});

test('a setup that fails is reported at its line', () => {
  const e = errorsOf(base({ 'sandbox/s.fr.md': '---\ntitle: S\n---\n## Setup\n```git-setup\n@files a.md\ngit switch nope\n```\n' }));
  assert.ok(has(e, 'sandbox/s.fr.md', 7, /setup fails at "git switch nope": error.unknownBranch/), JSON.stringify(e));
});

test('a step command that fails, an unknown command and a false check are reported', () => {
  const steps = '### 1. A\ncommand: git merge nope\n### 2. B\ncommand: git status\n';
  let e = errorsOf(base({ 'missions/m.fr.md': mission(steps) }));
  assert.ok(has(e, 'missions/m.fr.md', 12, /step 1 "A": "git merge nope" fails: error.unknownRevision/), JSON.stringify(e));
  e = errorsOf(base({ 'missions/m.fr.md': mission('### 1. A\ncommand: git stat\n') }));
  assert.ok(e.some((x) => /not recognised by the game/.test(x.message) && x.line === 12), JSON.stringify(e));
  e = errorsOf(base({ 'missions/m.fr.md': mission('### 1. A\ncommand: git branch x\ncheck: branch y exists\n') }));
  assert.ok(has(e, 'missions/m.fr.md', 13, /check "branch y exists" is false/), JSON.stringify(e));
});

test('steps are played in order: a later step sees the earlier ones; before: lines are replayed', () => {
  const ok = '### 1. A\ncommand: git switch -c ia/x\n### 2. B\nbefore: @work plan.md\ncommand: git commit -am "x"\ncheck: commits ia/x since main = 1\n';
  assert.deepEqual(errorsOf(base({ 'missions/m.fr.md': mission(ok) })), []);
  const bad = '### 1. A\nbefore: @work nope.md\ncommand: git status\n';
  const e = errorsOf(base({ 'missions/m.fr.md': mission(bad) }));
  assert.ok(has(e, 'missions/m.fr.md', 12, /"before:" fails at "@work nope.md"/), JSON.stringify(e));
});

test('interface instructions are played as the scene action implied by their check', () => {
  const ok = '### 1. A\ncommand: (cliquez plan.md)\ncheck: file rapport-client/plan.md M\n'
    + '### 2. B\ncommand: git switch -c ia/x\n### 3. C\ncommand: (bouton IA)\ncheck: commits ia/x since main = 2\n';
  assert.deepEqual(errorsOf(base({ 'missions/m.fr.md': mission(ok) })), []);
  const none = '### 1. A\ncommand: (regardez)\ncheck: index rapport-client empty\n';
  const e = errorsOf(base({ 'missions/m.fr.md': mission(none) }));
  assert.ok(has(e, 'missions/m.fr.md', 12, /cannot tell which scene action/), JSON.stringify(e));
  const s = runSetup('@files a.md b.md\ngit commit -m "i"').state;
  const r = playInstruction(s, [{ text: 'file rapport-client/a.md staged' }]);
  assert.equal(r.error, null);
  assert.equal(r.results.length, 2, 'two clicks: clean -> M -> staged');
});

test('a step expecting an error passes when the command is refused', () => {
  const setup = '## Setup\n```git-setup\n@files a.md b.md\ngit commit -m "init"\n@remote origin\n@work a.md\ngit commit -m "y"\n@colleague main "x"\n```\n';
  const steps = '### 1. A\ncommand: git push\ncheck: error push-rejected\n### 2. B\ncommand: git pull\n### 3. C\ncommand: git push\ncheck: main = origin/main\n';
  assert.deepEqual(errorsOf(base({ 'missions/m.fr.md': mission(steps, setup) })), []);
});

test('puzzles: the [x] choice must apply; a typed solution must satisfy its check', () => {
  let e = errorsOf(base({ 'puzzles/p.fr.md': `---\ntitle: P\n---\n## Prompt\np\n${SETUP}\n## Choices\n- [x] git switch nope\n- [ ] git status — no\n## Goal\ng\n## Takeaway\nt\n` }));
  assert.ok(has(e, 'puzzles/p.fr.md', 13, /the \[x\] choice "git switch nope" fails/), JSON.stringify(e));
  const typed = (sol) => `---\ntitle: P\ntype: typed\n---\n## Prompt\np\n${SETUP}\n## Solution\n${sol}\n## Goal\ng\n## Takeaway\nt\n`;
  assert.deepEqual(errorsOf(base({ 'puzzles/p.fr.md': typed('solution: git worktree add ../revue -b ia/r\ncheck:\n- desk revue on ia/r') })), []);
  e = errorsOf(base({ 'puzzles/p.fr.md': typed('solution: git branch ia/r\ncheck:\n- desk revue on ia/r') }));
  assert.ok(e.some((x) => /check "desk revue on ia\/r" is false after the solution/.test(x.message)), JSON.stringify(e));
});

test('a conflict block must match a real conflict (setup, steps or probe merge)', () => {
  const setup = '## Setup\n```git-setup\n@files plan.md intro.md\ngit commit -m "init"\ngit switch -c ia/x\n@work plan.md\ngit commit -m "x"\ngit switch main\n@work plan.md\ngit commit -m "y"\n```\n';
  const block = (path, a, b) => `\n\`\`\`conflict ${path}\n<<< ${a}\nmine\n=== ${b}\ntheirs\n>>>\n\`\`\`\n`;
  const sandbox = (blk) => `---\ntitle: S\n---\ntext\n${setup}${blk}`;
  assert.deepEqual(errorsOf(base({ 'sandbox/s.fr.md': sandbox(block('plan.md', 'main', 'ia/x')) })), []);
  const e = errorsOf(base({ 'sandbox/s.fr.md': sandbox(block('intro.md', 'main', 'ia/x')) }));
  assert.ok(e.some((x) => /conflict block intro.md \(main \/ ia\/x\) does not match/.test(x.message)), JSON.stringify(e));
  const reversed = errorsOf(base({ 'sandbox/s.fr.md': sandbox(block('plan.md', 'ia/x', 'main')) }));
  assert.deepEqual(reversed, [], 'ia/x receiving main also conflicts (probe switches to ia/x)');
});

test('web actions are played on the MR', () => {
  const setup = '## Setup\n```git-setup\n@files a.md\ngit commit -m "init"\ngit switch -c ia/g\n@work a.md\ngit commit -m "g"\ngit switch main\n@remote origin\n@mr 42 ia/g -> main "G"\n```\n';
  const ok = '### 1. A\nweb: approve MR !42 ; merge MR !42\ncheck: mr 42 merged\n### 2. B\ncommand: git pull\ncheck: main = origin/main\n';
  assert.deepEqual(errorsOf(base({ 'missions/m.fr.md': mission(ok, setup) })), []);
  const bad = '### 1. A\nweb: merge MR !42\ncheck: mr 42 merged\n';
  const e = errorsOf(base({ 'missions/m.fr.md': mission(bad, setup) }));
  assert.ok(e.some((x) => /check "mr 42 merged" is false.*error.mrNotApproved/.test(x.message)), JSON.stringify(e));
});
