// Puzzle .md -> plain object (docs/AUTHORING.md §5). Pure.
import { parseFrontmatter, checkFrontmatter } from './frontmatter.js';
import { splitLines, splitByHeading, parseSetupSection, paragraphs, textOutsideFences } from './util.js';
import { parseKeyedBody } from './mission.js';

export const PUZZLE_SCHEMA = {
  title: 'string', type: ['choice', 'typed'], timer: 'number', repos: { listOf: ['local', 'origin', 'upstream'] }, folder: 'string',
};

function textOf(lines, sec) {
  const p = paragraphs(textOutsideFences(lines, sec.from, sec.to));
  return { text: p.map((x) => x.text).join('\n\n'), line: sec.line };
}

/** Returns { kind:'puzzle', type, front, prompt, setup, conflicts, choices, solution, goal, takeaway, errors }. */
export function parsePuzzle(text) {
  const lines = splitLines(text);
  const errors = [];
  const fm = parseFrontmatter(lines);
  errors.push(...fm.errors);
  checkFrontmatter(fm, PUZZLE_SCHEMA, errors, ['title']);
  const type = fm.data.type || 'choice';
  const p = {
    kind: 'puzzle', type, front: fm.data, frontLines: fm.lines, prompt: null, setup: null, setupLine: null, conflicts: [],
    choices: [], choicesLine: null, solution: null, goal: null, takeaway: null, errors,
  };
  const { sections } = splitByHeading(lines, fm.end, lines.length, 2);
  const seen = new Set();
  for (const sec of sections) {
    if (seen.has(sec.title)) errors.push({ line: sec.line, message: `duplicate section "## ${sec.title}"` });
    seen.add(sec.title);
    if (sec.title === 'Prompt') p.prompt = textOf(lines, sec);
    else if (sec.title === 'Goal') p.goal = textOf(lines, sec);
    else if (sec.title === 'Takeaway') p.takeaway = textOf(lines, sec);
    else if (sec.title === 'Setup') {
      const s = parseSetupSection(lines, sec.from, sec.to, errors);
      p.setup = s.setup; p.conflicts = s.conflicts; p.setupLine = sec.line;
    } else if (sec.title === 'Choices') {
      p.choicesLine = sec.line;
      for (let i = sec.from; i < sec.to; i++) {
        const t = lines[i];
        if (t.trim() === '') continue;
        const m = /^-\s+\[( |x|X)\]\s+(.+)$/.exec(t);
        if (!m) { errors.push({ line: i + 1, message: 'choice must be "- [x] command" or "- [ ] command — explanation"' }); continue; }
        const parts = m[2].split(' — ');
        p.choices.push({
          correct: m[1] !== ' ', command: parts[0].trim(), explanation: parts.length > 1 ? parts.slice(1).join(' — ').trim() : null, line: i + 1,
        });
      }
    } else if (sec.title === 'Solution') {
      const { keys } = parseKeyedBody(lines, sec.from, sec.to, ['solution', 'check'], ['check'], errors);
      p.solution = { command: keys.solution ? keys.solution.value : null, check: keys.check ? keys.check.items : [], line: sec.line, commandLine: keys.solution ? keys.solution.line : null };
      if (!keys.solution) errors.push({ line: sec.line, message: 'solution section needs "solution:"' });
    } else {
      errors.push({ line: sec.line, message: `unknown section "## ${sec.title}" (expected Prompt, Setup, Choices, Solution, Goal, Takeaway)` });
    }
  }
  for (const [name, v] of [['Prompt', p.prompt], ['Setup', p.setup || (p.setupLine ? true : null)], ['Goal', p.goal], ['Takeaway', p.takeaway]]) {
    if (!v) errors.push({ line: 1, message: `missing "## ${name}" section` });
  }
  if (p.setupLine && !p.setup) errors.push({ line: p.setupLine, message: 'Setup section has no git-setup block' });
  if (type === 'choice') {
    if (p.solution) errors.push({ line: p.solution.line, message: '"## Solution" is only for type: typed' });
    if (p.choicesLine === null) errors.push({ line: 1, message: 'missing "## Choices" section' });
    else {
      const n = p.choices.filter((c) => c.correct).length;
      if (n !== 1) errors.push({ line: p.choicesLine, message: `choices need exactly one [x] (found ${n})` });
      if (p.choices.length < 2) errors.push({ line: p.choicesLine, message: 'choices need at least two options' });
      for (const c of p.choices) if (!c.correct && !c.explanation) errors.push({ line: c.line, message: 'a wrong choice needs an explanation after " — "' });
    }
  } else {
    if (p.choicesLine !== null) errors.push({ line: p.choicesLine, message: '"## Choices" is only for type: choice' });
    if (!p.solution) errors.push({ line: 1, message: 'missing "## Solution" section' });
  }
  return p;
}
