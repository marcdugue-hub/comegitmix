// Content validator. Pure (no I/O): `validate(files, options)` where `files` maps a path
// relative to content/ ("index.md", "missions/01-x.fr.md", "ai-work.fr.md") to its text.
// Returns { errors, warnings, parsed } with items { file, line, message } (file is "content/<path>").
//
// Engine hook: pass `options.engine` (optional) to enable the engine-dependent checks
// (setup replay, puzzle solution reaches goal, commands recognised). It must provide
//   engine.checkContent({ parsed, files, report })  // report(file, line, message, level = 'error')
// When absent those checks are skipped. `options.commandIds` (optional list of ids from
// data/commands.json) enables checks of `command <id>` phrases and `unlocks:`.
import { parseMission } from './mission.js';
import { parsePuzzle } from './puzzle.js';
import { parseSandbox } from './sandbox.js';
import { parseSummary, parseAiWork } from './summary.js';
import { parseCheckPhrase, ERROR_CODES, DIFF_MODES } from './check-phrase.js';

const KINDS = { missions: 'mission', puzzles: 'puzzle', sandbox: 'sandbox' };
const LANGS = ['fr', 'en'];
const OPENS = ['diff', 'log', 'conflict'];
const REBASE_ACTIONS = ['pick', 'squash', 'drop', 'reword', 'edit', 'fixup'];
const SHELL_COMMANDS = ['git', 'cd', 'fork'];

function balancedQuotes(s) {
  return (s.match(/"/g) || []).length % 2 === 0;
}

/** Validates one git-setup line (directive or command). Returns an error message or null. */
export function checkSetupLine(text, { allowContent = true } = {}) {
  const t = text.trim();
  if (t === '' || t.startsWith('#')) return null;
  if (!balancedQuotes(t)) return 'unbalanced quote';
  if (!t.startsWith('@')) {
    for (const part of t.split('&&')) {
      const word = part.trim().split(/\s+/)[0];
      if (!SHELL_COMMANDS.includes(word)) return `unrecognised line "${part.trim()}" (expected a git command or an @directive)`;
    }
    return null;
  }
  const [name, ...rest] = t.split(/\s+/);
  const arg = t.slice(name.length).trim();
  let m;
  switch (name) {
    case '@files': case '@work': case '@new':
      return rest.length ? null : `${name} needs at least one path`;
    case '@content':
      if (!allowContent) return '@content is not allowed here';
      return rest.length === 1 ? null : '@content needs exactly one path';
    case '@author':
      return rest.length === 1 && ['ai', 'human'].includes(rest[0]) ? null : '@author must be "ai" or "human"';
    case '@cd': case '@online-only':
      return rest.length === 1 ? null : `${name} needs exactly one argument`;
    case '@remote':
      return rest.length === 1 && ['origin', 'upstream'].includes(rest[0]) ? null : '@remote must be "origin" or "upstream"';
    case '@fork':
      return rest.length === 2 ? null : '@fork needs "<source> <fork>" (@fork upstream origin)';
    case '@colleague':
      return /^\S+ ".*"( files=\S+)?$/.test(arg) ? null : '@colleague must be: @colleague <branch> "<message>" [files=<paths>]';
    case '@mr':
      return /^\d+ \S+ -> \S+ ".+"( comments=\d+)?$/.test(arg) ? null : '@mr must be: @mr <num> <source> -> <target> "<title>" [comments=<n>]';
    case '@rebase-plan':
      m = /^[a-z]+(,[a-z]+)*$/.exec(arg);
      if (!m) return '@rebase-plan must be a comma-separated list (pick,squash,drop)';
      return arg.split(',').every((a) => REBASE_ACTIONS.includes(a)) ? null : `@rebase-plan actions must be among: ${REBASE_ACTIONS.join(', ')}`;
    default:
      return `unknown directive ${name}`;
  }
}

/** Validates all lines of a setup block (handles @content indented blocks). */
function checkSetupLines(lines, file, report, opts) {
  let contentOpen = false;
  for (const { text, line } of lines) {
    if (/^\s+\S/.test(text)) {
      if (!contentOpen) report(file, line, 'unexpected indented line (only allowed under @content)');
      continue;
    }
    contentOpen = false;
    const msg = checkSetupLine(text, opts);
    if (msg) report(file, line, msg);
    if (!msg && text.trim().startsWith('@content')) contentOpen = true;
  }
}

function validateCheckList(items, file, report, opts) {
  for (const it of items) {
    const p = parseCheckPhrase(it.text);
    if (!p) { report(file, it.line, `unknown check phrase "${it.text}"`); continue; }
    if (p.type === 'error' && !ERROR_CODES.includes(p.code)) report(file, it.line, `unknown error code "${p.code}" (expected: ${ERROR_CODES.join(', ')})`);
    if (p.type === 'command' && opts.commandIds && !opts.commandIds.includes(p.id)) report(file, it.line, `unknown command id "${p.id}" in check`);
  }
}

function validateStep(step, file, report, opts) {
  const L = (k) => step.lines[k] || step.line;
  if (step.command === null && step.web.length === 0) report(file, step.line, 'step needs "command:" or "web:"');
  if (step.command !== null && step.web.length) report(file, L('web'), 'a step has either "command:" or "web:", not both');
  if (step.command !== null) {
    if (step.isInstruction) {
      if (step.check.length === 0) report(file, L('command'), 'an interface instruction in parentheses needs a "check:"');
    } else {
      if (!balancedQuotes(step.command)) report(file, L('command'), 'unbalanced quote in command');
      for (const part of step.command.split('&&')) {
        const word = part.trim().split(/\s+/)[0];
        if (!SHELL_COMMANDS.includes(word)) report(file, L('command'), `unrecognised command "${part.trim()}" (expected a git command)`);
      }
    }
  }
  for (const w of step.web) {
    if (!/^(approve|merge) MR !\d+$/.test(w)) report(file, L('web'), `unknown web action "${w}" (expected "approve MR !<n>" or "merge MR !<n>")`);
  }
  if (step.opens !== null && !OPENS.includes(step.opens)) report(file, L('opens'), `"opens:" must be one of: ${OPENS.join(', ')}`);
  if (step.diffMode !== null && !DIFF_MODES.includes(step.diffMode)) report(file, L('diff-mode'), `"diff-mode:" must be one of: ${DIFF_MODES.join(', ')}`);
  validateCheckList(step.check, file, report, opts);
  checkSetupLines(step.before, file, report, { allowContent: false });
  step.duo.forEach((d, i) => { if (d === '') report(file, step.duoLines[i], 'empty duo bubble'); });
}

function validateConflicts(conflicts, setupLines, file, report) {
  const tokens = new Set(['main']);
  for (const { text } of setupLines) for (const tk of text.split(/\s+/)) tokens.add(tk.replace(/^"|"$/g, ''));
  for (const c of conflicts) {
    if (!tokens.has(c.path)) report(file, c.line, `conflict block refers to "${c.path}", which the setup does not create`);
    for (const s of c.sides) if (!tokens.has(s.branch)) report(file, s.line, `conflict block refers to branch "${s.branch}", which the setup does not create`);
  }
}

function validateMission(m, file, report, opts) {
  for (const e of m.errors) report(file, e.line, e.message);
  if (opts.commandIds && Array.isArray(m.front.unlocks)) {
    for (const id of m.front.unlocks) if (!opts.commandIds.includes(id)) report(file, m.frontLines.unlocks, `unknown command id "${id}" in unlocks`);
  }
  if (m.mode === 'compare') return;
  const setupAll = [];
  if (m.setup) { checkSetupLines(m.setup.lines, file, report, {}); setupAll.push(...m.setup.lines); }
  for (const p of m.parts) {
    if (p.setup) { checkSetupLines(p.setup.lines, file, report, {}); setupAll.push(...p.setup.lines); }
    p.steps.forEach((s, i) => {
      if (s.n !== i + 1) report(file, s.line, `steps must be numbered 1, 2, 3… in order (got ${s.n}, expected ${i + 1})`);
      validateStep(s, file, report, opts);
      setupAll.push(...s.before);
    });
  }
  const conflicts = [...m.conflicts, ...m.parts.flatMap((p) => p.conflicts)];
  validateConflicts(conflicts, setupAll, file, report);
}

function validatePuzzle(p, file, report, opts) {
  for (const e of p.errors) report(file, e.line, e.message);
  if (p.setup) { checkSetupLines(p.setup.lines, file, report, {}); validateConflicts(p.conflicts, p.setup.lines, file, report); }
  if (p.solution) {
    validateCheckList(p.solution.check, file, report, opts);
    if (p.solution.command && !balancedQuotes(p.solution.command)) report(file, p.solution.commandLine, 'unbalanced quote in solution');
  }
  for (const c of p.choices) if (!balancedQuotes(c.command)) report(file, c.line, 'unbalanced quote in choice');
}

function validateSandbox(s, file, report) {
  for (const e of s.errors) report(file, e.line, e.message);
  if (s.setup) { checkSetupLines(s.setup.lines, file, report, {}); validateConflicts(s.conflicts, s.setup.lines, file, report); }
}

// ---- FR / EN alignment ----------------------------------------------------

const norm = (s) => (s || '').trim();
// Interface instructions "(...)" and quoted strings (commit messages) are displayed text: ignored.
const normCommand = (c) => (c === null ? null : /^\(.*\)$/.test(norm(c)) ? '(instruction)' : norm(c).replace(/"[^"]*"/g, '""'));
const stepSig = (s) => JSON.stringify([normCommand(s.command), s.web.map(norm), s.check.map((c) => norm(c.text))]);
const setupShape = (setup) => (setup ? setup.lines.filter((l) => !/^\s/.test(l.text) && !l.text.trim().startsWith('#')).map((l) => {
  const w = l.text.trim().split(/\s+/);
  return w[0] === 'git' ? `git ${w[1] || ''}` : w[0];
}) : []);

function compareShapes(a, b, file, line, report, what) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) report(file, line, `${what} differs between the FR and EN files`);
}

function alignMission(fr, en, enFile, report) {
  if (fr.mode !== en.mode) report(enFile, en.frontLines.mode || 1, 'mode differs from the FR file');
  if (fr.mode === 'compare') {
    if (fr.columns.length !== en.columns.length) report(enFile, 1, `compare columns: ${en.columns.length} here, ${fr.columns.length} in FR`);
    fr.columns.forEach((c, i) => {
      const e = en.columns[i];
      if (!e) return;
      if (JSON.stringify([c.replays && [c.replays.mission, c.replays.part], c.desk]) !== JSON.stringify([e.replays && [e.replays.mission, e.replays.part], e.desk])) {
        report(enFile, e.line, 'column "replays:" or "desk:" differs from the FR file');
      }
    });
    if (fr.boxes.length !== en.boxes.length) report(enFile, 1, `text boxes: ${en.boxes.length} here, ${fr.boxes.length} in FR`);
    return;
  }
  if (fr.parts.length !== en.parts.length || fr.parts.some((p, i) => p.letter !== en.parts[i].letter)) {
    report(enFile, 1, `parts are not aligned with the FR file (${en.parts.map((p) => p.letter || '-').join(',')} vs ${fr.parts.map((p) => p.letter || '-').join(',')})`);
    return;
  }
  fr.parts.forEach((p, pi) => {
    const e = en.parts[pi];
    if (p.steps.length !== e.steps.length) {
      report(enFile, e.line, `${e.steps.length} steps here, ${p.steps.length} in the FR file`);
      return;
    }
    p.steps.forEach((s, i) => {
      if (stepSig(s) !== stepSig(e.steps[i])) report(enFile, e.steps[i].line, `step ${s.n}: "command"/"web"/"check" differ from the FR file (line ${s.line})`);
    });
    if (!!p.end !== !!e.end) report(enFile, e.line, 'part end present in only one language');
  });
  compareShapes(setupShape(fr.setup), setupShape(en.setup), enFile, en.setupLine || 1, report, 'setup commands');
  if (fr.end && en.end && JSON.stringify(fr.end.next && [fr.end.next.kind, fr.end.next.id]) !== JSON.stringify(en.end.next && [en.end.next.kind, en.end.next.id])) {
    report(enFile, en.end.line, '"next:" differs from the FR file');
  }
}

function alignPuzzle(fr, en, enFile, report) {
  if (fr.type !== en.type) report(enFile, en.frontLines.type || 1, '"type" differs from the FR file');
  compareShapes(setupShape(fr.setup), setupShape(en.setup), enFile, en.setupLine || 1, report, 'setup commands');
  if (fr.choices.length !== en.choices.length) report(enFile, en.choicesLine || 1, `${en.choices.length} choices here, ${fr.choices.length} in the FR file`);
  else fr.choices.forEach((c, i) => {
    const e = en.choices[i];
    if (c.correct !== e.correct || normCommand(c.command) !== normCommand(e.command)) report(enFile, e.line, 'choice command or [x] differs from the FR file');
  });
  if (fr.solution && en.solution && normCommand(fr.solution.command) !== normCommand(en.solution.command)) report(enFile, en.solution.commandLine || 1, '"solution:" differs from the FR file');
}

function alignSandbox(fr, en, enFile, report) {
  compareShapes(setupShape(fr.setup), setupShape(en.setup), enFile, en.setupLine || 1, report, 'setup commands');
}

// ---- main -----------------------------------------------------------------

export function validate(files, options = {}) {
  const errors = [];
  const warnings = [];
  const mk = (list) => (file, line, message) => list.push({ file: `content/${file}`, line: line || 1, message });
  const addErr = mk(errors);
  const addWarn = mk(warnings);
  const report = (file, line, message, level = 'error') => (level === 'warning' ? addWarn : addErr)(file, line, message);
  const opts = { commandIds: options.commandIds || null };

  // classify files
  const parsed = { index: null, aiWork: {}, mission: {}, puzzle: {}, sandbox: {} };
  const present = { mission: {}, puzzle: {}, sandbox: {} };
  for (const [path, text] of Object.entries(files)) {
    if (!path.endsWith('.md')) continue;
    let m;
    if (path === 'index.md') {
      parsed.index = parseSummary(text);
      for (const e of parsed.index.errors) report(path, e.line, e.message);
    } else if ((m = /^ai-work\.([a-z]{2})\.md$/.exec(path))) {
      const r = parseAiWork(text);
      parsed.aiWork[m[1]] = r;
      for (const e of r.errors) report(path, e.line, e.message);
      if (!LANGS.includes(m[1])) report(path, 1, `unknown language "${m[1]}"`);
    } else if ((m = /^(missions|puzzles|sandbox)\/([a-z0-9][a-z0-9-]*)\.([a-z]{2})\.md$/.exec(path))) {
      const kind = KINDS[m[1]];
      const [, , id, lang] = m;
      if (!LANGS.includes(lang)) { report(path, 1, `unknown language "${lang}" (expected fr or en)`); continue; }
      const parse = { mission: parseMission, puzzle: parsePuzzle, sandbox: parseSandbox }[kind];
      const data = parse(text);
      (parsed[kind][id] = parsed[kind][id] || {})[lang] = data;
      (present[kind][id] = present[kind][id] || {})[lang] = path;
      if (kind === 'mission') validateMission(data, path, report, opts);
      else if (kind === 'puzzle') validatePuzzle(data, path, report, opts);
      else validateSandbox(data, path, report);
    } else {
      report(path, 1, 'unexpected file name (expected <id>.fr.md or <id>.en.md in missions/, puzzles/ or sandbox/)', 'warning');
    }
  }

  // index.md and the files it lists
  if (!parsed.index) addErr('index.md', 1, 'content/index.md is missing');
  else {
    const dirs = { mission: 'missions', puzzle: 'puzzles', sandbox: 'sandbox' };
    const listed = { mission: parsed.index.missions, puzzle: parsed.index.puzzles, sandbox: parsed.index.sandbox };
    for (const kind of Object.keys(listed)) {
      for (const { id, line } of listed[kind]) {
        const p = present[kind][id];
        if (!p || !p.fr) report('index.md', line, `"${id}" is listed but ${dirs[kind]}/${id}.fr.md does not exist`);
        else if (!p.en) report(`${dirs[kind]}/${id}.fr.md`, 1, 'no .en.md file: the game will show the French file with a FR badge', 'warning');
      }
      for (const id of Object.keys(present[kind])) {
        if (!listed[kind].some((x) => x.id === id)) report(Object.values(present[kind][id])[0], 1, 'file is not listed in index.md (inactive content)', 'warning');
      }
    }
    for (const lang of LANGS) if (!parsed.aiWork[lang] && lang === 'fr') addErr('ai-work.fr.md', 1, 'content/ai-work.fr.md is missing');
    if (!parsed.aiWork.en) addWarn('ai-work.en.md', 1, 'no ai-work.en.md file: the French texts will be used');

    // references: next, replays
    const listedIds = (kind) => listed[kind].map((x) => x.id);
    const checkNext = (end, file) => {
      if (!end || !end.next || !end.next.kind) return;
      const kind = end.next.kind === 'compare' ? 'mission' : end.next.kind;
      if (!listedIds(kind).includes(end.next.id)) report(file, end.next.line, `"next:" refers to ${end.next.kind} "${end.next.id}", which is not listed in index.md`);
      else if (end.next.kind === 'compare') {
        const t = parsed.mission[end.next.id] && (parsed.mission[end.next.id].fr || parsed.mission[end.next.id].en);
        if (t && t.mode !== 'compare') report(file, end.next.line, `"${end.next.id}" is not a "mode: compare" file`);
      }
    };
    for (const [id, langs] of Object.entries(parsed.mission)) {
      for (const [lang, m] of Object.entries(langs)) {
        const file = present.mission[id][lang];
        checkNext(m.end, file);
        for (const p of m.parts || []) checkNext(p.end, file);
        for (const c of m.columns || []) {
          if (!c.replays) continue;
          const target = parsed.mission[c.replays.mission] && parsed.mission[c.replays.mission][lang];
          if (!target) { report(file, c.replays.line, `"replays:" refers to mission "${c.replays.mission}" which does not exist in this language`); continue; }
          const part = target.parts.find((p) => p.letter === c.replays.part);
          if (!part) report(file, c.replays.line, `mission "${c.replays.mission}" has no part ${c.replays.part}`);
          else if (c.desk.length !== part.steps.length) report(file, c.deskLine, `"desk:" has ${c.desk.length} values but part ${c.replays.part} has ${part.steps.length} steps`);
          else for (const v of c.desk) if (!['intact', 'stashed', 'changed', 'restored', 'removed'].includes(v)) report(file, c.deskLine, `unknown desk value "${v}" (expected intact, stashed, changed, restored, removed)`);
        }
      }
    }
  }

  // FR / EN alignment
  const aligners = { mission: alignMission, puzzle: alignPuzzle, sandbox: alignSandbox };
  for (const kind of Object.keys(aligners)) {
    for (const [id, langs] of Object.entries(parsed[kind])) {
      if (langs.fr && langs.en) aligners[kind](langs.fr, langs.en, present[kind][id].en, report);
    }
  }

  if (options.engine && typeof options.engine.checkContent === 'function') {
    options.engine.checkContent({ parsed, files, report });
  }

  const order = (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);
  errors.sort(order); warnings.sort(order);
  return { errors, warnings, parsed };
}

/** "file:line message" */
export function formatIssue(i) {
  return `${i.file}:${i.line} ${i.message}`;
}
