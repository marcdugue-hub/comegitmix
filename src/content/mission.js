// Mission .md -> plain object (docs/AUTHORING.md §4). Pure.
// Every element carries its source `line` (1-based). Syntax problems are collected in `errors`.
import { parseFrontmatter, checkFrontmatter } from './frontmatter.js';
import {
  splitLines, matchKey, splitByHeading, parseSetupSection, paragraphs, splitDuo, splitList, textOutsideFences,
} from './util.js';

export const STEP_KEYS = ['command', 'web', 'accepts', 'after', 'note', 'hint', 'opens', 'diff-mode', 'check', 'before', 'ai-files', 'ai-text'];
export const LIST_KEYS = ['check', 'before'];
export const END_KEYS = ['summary', 'takeaway', 'next'];
export const MISSION_SCHEMA = {
  title: 'string', duration: 'number', repos: { listOf: ['local', 'origin', 'upstream'] }, unlocks: 'list',
  folder: 'string', mode: ['guided', 'stepper', 'compare'],
};

/**
 * Reads `key: value` lines (and `- ` lists under list keys) of lines[from..to).
 * Returns { keys: { key: { value, items: [{text,line}], line } }, other: [{text,line}] }.
 */
export function parseKeyedBody(lines, from, to, allowed, listKeys, errors) {
  const keys = {};
  const other = [];
  for (let i = from; i < to; i++) {
    const t = lines[i];
    const k = matchKey(t);
    if (!k) { other.push({ text: t, line: i + 1 }); continue; }
    if (!allowed.includes(k.key)) {
      errors.push({ line: i + 1, message: `unknown key "${k.key}" (expected one of: ${allowed.join(', ')})` });
      continue;
    }
    if (k.key in keys) errors.push({ line: i + 1, message: `duplicate key "${k.key}"` });
    const entry = { value: k.value, items: [], line: i + 1 };
    if (listKeys.includes(k.key)) {
      if (k.value !== '') entry.items.push({ text: k.value, line: i + 1 });
      else {
        while (i + 1 < to && /^\s*-\s+\S/.test(lines[i + 1])) {
          i++;
          entry.items.push({ text: lines[i].replace(/^\s*-\s+/, '').trim(), line: i + 1 });
        }
        if (entry.items.length === 0) errors.push({ line: i + 1, message: `"${k.key}" needs a value or a "- " list below` });
      }
      entry.value = entry.items.map((x) => x.text).join(' ; ');
    } else if (k.value === '') {
      errors.push({ line: i + 1, message: `"${k.key}" has an empty value` });
    }
    keys[k.key] = entry;
  }
  return { keys, other };
}

function parseEnd(keys, line) {
  const end = { line, summary: null, takeaway: null, next: null, lines: {} };
  for (const k of END_KEYS) if (keys[k]) { end.lines[k] = keys[k].line; if (k !== 'next') end[k] = keys[k].value; }
  if (keys.next) {
    const m = /^(mission|puzzle|sandbox|compare)\s+(\S+)$/.exec(keys.next.value);
    end.next = m ? { kind: m[1], id: m[2], line: keys.next.line } : { kind: null, id: null, raw: keys.next.value, line: keys.next.line };
  }
  return end;
}

function parseEndSection(lines, from, to, line, errors) {
  const { keys } = parseKeyedBody(lines, from, to, END_KEYS, [], errors);
  const end = parseEnd(keys, line);
  if (!end.summary) errors.push({ line, message: 'end section needs "summary:"' });
  if (end.next && !end.next.kind) {
    errors.push({ line: end.next.line, message: `"next:" must be "mission <id>", "puzzle <id>", "sandbox <id>" or "compare <id>"` });
  }
  return end;
}

function parseStep(lines, sec, errors) {
  const m = /^(\d+)\.\s+(.+)$/.exec(sec.title);
  if (!m) {
    errors.push({ line: sec.line, message: `step heading must be "### <n>. <title>" (got "${sec.title}")` });
    return null;
  }
  const { keys, other } = parseKeyedBody(lines, sec.from, sec.to, STEP_KEYS, LIST_KEYS, errors);
  const { duo, rest } = splitDuo(other);
  const paras = paragraphs(rest);
  const step = {
    n: Number(m[1]), title: m[2].trim(), line: sec.line,
    command: null, web: [], accepts: [], after: null, note: null, hint: null, opens: null, diffMode: null,
    check: [], before: [], aiFiles: [], aiText: null,
    text: paras.length ? paras[0].text : null, extra: paras.slice(1).map((p) => p.text),
    duo: duo.map((d) => d.text), duoLines: duo.map((d) => d.line),
    isInstruction: false, lines: {},
  };
  for (const [k, e] of Object.entries(keys)) step.lines[k] = e.line;
  if (keys.command) {
    step.command = keys.command.value;
    step.isInstruction = /^\(.*\)$/.test(step.command);
  }
  if (keys.web) step.web = splitList(keys.web.value, ';');
  if (keys.accepts) step.accepts = splitList(keys.accepts.value, ';');
  if (keys.after) step.after = keys.after.value;
  if (keys.note) step.note = keys.note.value;
  if (keys.hint) step.hint = keys.hint.value;
  if (keys.opens) step.opens = keys.opens.value;
  if (keys['diff-mode']) step.diffMode = keys['diff-mode'].value;
  if (keys.check) step.check = keys.check.items;
  if (keys.before) step.before = keys.before.items;
  if (keys['ai-files']) step.aiFiles = splitList(keys['ai-files'].value, /[\s,]+/);
  if (keys['ai-text']) step.aiText = keys['ai-text'].value;
  return step;
}

function parseStepsRange(lines, from, to, errors, container) {
  const { pre, sections } = splitByHeading(lines, from, to, 3);
  const intro = splitDuo(textOutsideFences(lines, pre.from, pre.to));
  container.duo = intro.duo.map((d) => d.text);
  container.text = paragraphs(intro.rest).map((p) => p.text);
  const sub = parseSetupSection(lines, pre.from, pre.to, errors);
  for (const sec of sections) {
    if (sec.title === 'Setup') {
      const s = parseSetupSection(lines, sec.from, sec.to, errors);
      container.setup = s.setup;
      container.conflicts = s.conflicts;
      container.setupLine = sec.line;
    } else if (sec.title === 'Part end') {
      container.end = parseEndSection(lines, sec.from, sec.to, sec.line, errors);
    } else {
      const step = parseStep(lines, sec, errors);
      if (step) container.steps.push(step);
    }
  }
  if (sub.setup || sub.conflicts.length) errors.push({ line: from + 1, message: 'a part setup must be under "### Setup"' });
}

function parseCompare(lines, start, errors, mission) {
  const { pre, sections } = splitByHeading(lines, start, lines.length, 2);
  mission.text = paragraphs(textOutsideFences(lines, pre.from, pre.to)).map((p) => p.text);
  mission.columns = [];
  mission.boxes = [];
  for (const sec of sections) {
    const col = /^Column — (.+)$/.exec(sec.title);
    if (col) {
      const { keys } = parseKeyedBody(lines, sec.from, sec.to, ['replays', 'desk'], [], errors);
      const column = { title: col[1].trim(), line: sec.line, replays: null, desk: [], deskLine: keys.desk ? keys.desk.line : null };
      if (keys.replays) {
        const r = /^(\S+) part ([A-Z])$/.exec(keys.replays.value);
        if (r) column.replays = { mission: r[1], part: r[2], line: keys.replays.line };
        else errors.push({ line: keys.replays.line, message: '"replays:" must be "<mission id> part <letter>"' });
      } else errors.push({ line: sec.line, message: 'column needs "replays:"' });
      if (keys.desk) column.desk = splitList(keys.desk.value, ',');
      else errors.push({ line: sec.line, message: 'column needs "desk:"' });
      mission.columns.push(column);
    } else {
      const blocks = [];
      let buf = [];
      const flush = () => {
        for (const p of paragraphs(buf)) blocks.push({ type: 'text', text: p.text, line: p.line });
        buf = [];
      };
      for (const it of textOutsideFences(lines, sec.from, sec.to)) {
        const c = /^`([^`]+)`$/.exec(it.text.trim());
        if (c) { flush(); blocks.push({ type: 'code', text: c[1], line: it.line }); } else buf.push(it);
      }
      flush();
      mission.boxes.push({ title: sec.title, line: sec.line, blocks });
    }
  }
  if (mission.columns.length === 0) errors.push({ line: 1, message: 'a compare file needs at least one "## Column — <title>"' });
}

/** Parses a mission file. Returns the mission object (see docs/AUTHORING.md §4). */
export function parseMission(text) {
  const lines = splitLines(text);
  const errors = [];
  const fm = parseFrontmatter(lines);
  errors.push(...fm.errors);
  checkFrontmatter(fm, MISSION_SCHEMA, errors, ['title']);
  const mission = {
    kind: 'mission', front: fm.data, frontLines: fm.lines, mode: fm.data.mode || 'guided',
    duo: [], text: [], setup: null, setupLine: null, conflicts: [], parts: [], end: null, errors,
  };
  if (mission.mode === 'compare') {
    parseCompare(lines, fm.end, errors, mission);
    return mission;
  }
  const { pre, sections } = splitByHeading(lines, fm.end, lines.length, 2);
  const intro = splitDuo(textOutsideFences(lines, pre.from, pre.to));
  mission.duo = intro.duo.map((d) => d.text);
  mission.text = paragraphs(intro.rest).map((p) => p.text);
  let hasSteps = false;
  for (const sec of sections) {
    let m;
    if (sec.title === 'Setup') {
      const s = parseSetupSection(lines, sec.from, sec.to, errors);
      mission.setup = s.setup;
      mission.conflicts = s.conflicts;
      mission.setupLine = sec.line;
    } else if (sec.title === 'Steps') {
      hasSteps = true;
      const part = { letter: null, title: null, line: sec.line, duo: [], text: [], steps: [], setup: null, conflicts: [], end: null };
      parseStepsRange(lines, sec.from, sec.to, errors, part);
      mission.parts.push(part);
    } else if ((m = /^Part ([A-Z]) — (.+)$/.exec(sec.title))) {
      hasSteps = true;
      const part = { letter: m[1], title: m[2].trim(), line: sec.line, duo: [], text: [], steps: [], setup: null, conflicts: [], end: null };
      parseStepsRange(lines, sec.from, sec.to, errors, part);
      mission.parts.push(part);
    } else if (sec.title === 'End') {
      mission.end = parseEndSection(lines, sec.from, sec.to, sec.line, errors);
    } else {
      errors.push({ line: sec.line, message: `unknown section "## ${sec.title}" (expected Setup, Steps, Part <letter> — <title> or End)` });
    }
  }
  if (!mission.setup) errors.push({ line: 1, message: 'missing "## Setup" section with a git-setup block' });
  if (!hasSteps) errors.push({ line: 1, message: 'missing "## Steps" (or "## Part A — <title>") section' });
  if (!mission.end) errors.push({ line: 1, message: 'missing "## End" section' });
  const steps = mission.parts.flatMap((p) => p.steps);
  if (hasSteps && steps.length === 0) errors.push({ line: 1, message: 'the mission has no step' });
  const letters = mission.parts.map((p) => p.letter);
  if (letters.some((l) => l !== null) && letters.some((l) => l === null)) errors.push({ line: 1, message: 'cannot mix "## Steps" and "## Part" sections' });
  return mission;
}
