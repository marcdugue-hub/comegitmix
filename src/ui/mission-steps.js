// Mission step engine: pure logic (no DOM, no language) behind the mission screen.
//
// A session is an immutable plain object for ONE part of a parsed mission (src/content/mission.js):
//   { mission, partIndex, part, initial, state, index, last, diffShown, error }
//   - initial:  state right after the part setup (mission `## Setup` or the part `### Setup`)
//   - state:    current state (the `before:` lines of the current step are already applied)
//   - index:    current step index (0-based); index === part.steps.length means the part is finished
//   - last:     { command, result } of the last action played during the current step (null when none)
//   - diffShown: diff screen modes opened during the current step
//   - error:    { key, params, line, text } when the setup (or a `before:`) failed, else null
//
//   startSession(mission, { part, step })     -> session (replays steps [0, step) automatically)
//   act(session, command, { diffModes })      -> { session, result, completed, step }
//   noteDiff(session, mode)                   -> { session, completed, step }   (diff screen opened from the scene)
//   autoStep(session)                         -> { session, results, completed, step }  (canonical action of the step)
//   gotoStep(session, index)                  -> session (replay from the initial state)
//
// Steps are validated by predicates on the state (src/engine/predicates.js), never by text, except the
// default check of a step without `check:` (AUTHORING §4.2): "the expected command (or an accepted one) succeeded",
// compared on the parsed command, so spacing and quotes do not matter.
import { apply } from '../engine/apply.js';
import { parse } from '../engine/parse.js';
import { runSetup, applySetupLines } from '../engine/setup.js';
import { checkAll } from '../engine/predicates.js';
import { parseWebAction } from '../engine/remote.js';
import { playInstruction } from '../engine/content-check.js';
import { parseCheckPhrase } from '../content/check-phrase.js';
import { getDesk, activeDesk, deskFiles } from '../engine/state.js';
import { pickAiFiles } from '../engine/ai.js';

/** First mission (in the recommended order) where a repository card shows up in zone ① (docs/CONTENT.md). */
export const REPO_UNLOCK = { origin: 5 };

/** lockedRepos option of the scene for mission number `n` (null for the compare screen). */
export function lockedReposFor(n) {
  const out = {};
  if (!Number.isInteger(n)) return out;
  for (const [repo, at] of Object.entries(REPO_UNLOCK)) if (n < at) out[repo] = at;
  return out;
}

/** Numbering of the missions: compare files do not count. `modes` maps id -> mode. Returns { [id]: n }, total. */
export function missionNumbers(ids, modes = {}) {
  const numbers = {};
  let n = 0;
  for (const id of ids) if (modes[id] !== 'compare') numbers[id] = ++n;
  return { numbers, total: n };
}

/** Commands of data/commands.json for the palette: unlocked (unlock <= n) and the next locked ones. */
export function paletteFor(n, catalogue, { maxLocked = 3 } = {}) {
  const entries = Object.entries((catalogue && catalogue.commands) || {}).map(([id, c]) => ({ id, ...c }));
  const unlocked = entries.filter((c) => c.unlock <= n);
  const nextAt = Math.min(...entries.filter((c) => c.unlock > n).map((c) => c.unlock));
  const locked = entries.filter((c) => c.unlock === nextAt).slice(0, maxLocked);
  return { unlocked, locked, nextAt: Number.isFinite(nextAt) ? nextAt : null };
}

/** Text a palette chip puts into the terminal: the syntax up to its first placeholder ("git add <f>" -> "git add "). */
export function paletteInsert(syntax) {
  const s = String(syntax || '');
  if (s.startsWith('(')) return null; // site action: no terminal text
  const cut = s.search(/[<[]/);
  return cut < 0 ? s : s.slice(0, cut);
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');

function sameCommand(a, b) {
  if (!a || !b || a.error || b.error) return false;
  if (a.name !== b.name) return false;
  if (a.name === 'sequence') {
    return a.commands.length === b.commands.length && a.commands.every((c, i) => sameCommand(c, b.commands[i]));
  }
  return JSON.stringify(a.args || []) === JSON.stringify(b.args || []) && JSON.stringify(sortKeys(a.options)) === JSON.stringify(sortKeys(b.options));
}

function sortKeys(o = {}) {
  const out = {};
  for (const k of Object.keys(o || {}).sort()) out[k] = o[k];
  return out;
}

/** True when a pattern with `*` wildcards matches the text (whitespace normalised). */
export function wildcardMatch(pattern, text) {
  const re = new RegExp(`^${norm(pattern).split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return re.test(norm(text));
}

/** Text of a command (string or object) as typed. */
function textOf(command) {
  if (typeof command === 'string') return command;
  return (command && command.text) || '';
}

/** True when a played command is the step's expected command or one of its `accepts:` spellings. */
export function stepAccepts(step, command) {
  if (!step || !step.command || step.isInstruction) return false;
  const typed = typeof command === 'string' ? parse(command) : command;
  if (!typed || typed.error) return false;
  const candidates = [step.command, ...(step.accepts || [])];
  for (const c of candidates) {
    if (c.includes('*')) {
      if (wildcardMatch(c, textOf(typed) || textOf(command))) return true;
    } else if (sameCommand(parse(c), typed)) return true;
  }
  return false;
}

/** Does the step expect Git to refuse (a `check: error <code>` phrase)? */
export function expectsError(step) {
  return (step.check || []).some((c) => /^error\s/.test(String(c.text).trim()));
}

/** Kind of step: 'command' | 'instruction' | 'web'. */
export function stepKind(step) {
  if (step.web && step.web.length) return 'web';
  if (step.isInstruction) return 'instruction';
  return 'command';
}

/** Is the step satisfied in this context? ctx = { state, initial, last, diffShown }. */
export function evaluateStep(step, ctx) {
  if (!ctx.last && !(ctx.diffShown && ctx.diffShown.length)) return { ok: false, failed: [] };
  if (step.check && step.check.length) return checkAll(step.check, ctx);
  const last = ctx.last;
  if (!last || last.result.error) return { ok: false, failed: [] };
  if (stepKind(step) === 'web') {
    const want = parseWebAction(step.web[step.web.length - 1]);
    const ok = Boolean(want) && sameCommand(want, typeof last.command === 'string' ? parse(last.command) : last.command);
    return { ok, failed: [] };
  }
  return { ok: stepAccepts(step, last.command), failed: [] };
}

function partSetup(mission, partIndex) {
  const part = mission.parts[partIndex];
  const setup = (part && part.setup) || mission.setup;
  const conflicts = [...(mission.conflicts || []), ...mission.parts.flatMap((p) => p.conflicts || [])];
  const front = mission.front || {};
  return runSetup(setup ? setup.lines : [], { folder: front.folder, repos: front.repos, conflicts });
}

function enter(session) {
  const step = session.part.steps[session.index];
  const base = { ...session, last: null, diffShown: [] };
  if (!step || !step.before || !step.before.length) return base;
  const r = applySetupLines(session.state, step.before);
  if (r.error) return { ...base, error: { key: r.error.key, params: r.error.params, line: r.line, text: r.text } };
  return { ...base, state: r.state };
}

function advance(session) {
  return enter({ ...session, index: session.index + 1 });
}

/** Current step of a session (null when the part is finished). */
export function currentStep(session) {
  return session.part.steps[session.index] || null;
}

export function isPartDone(session) {
  return session.index >= session.part.steps.length;
}

function ctxOf(session) {
  return { state: session.state, initial: session.initial, last: session.last, diffShown: session.diffShown };
}

function settle(session) {
  const step = currentStep(session);
  if (!step) return { session, completed: false, step: null };
  const res = evaluateStep(step, ctxOf(session));
  if (!res.ok) return { session, completed: false, step };
  return { session: advance(session), completed: true, step };
}

/**
 * Plays a command (text or engine object) as the player's action in the current step.
 * opts.diffModes: diff screen modes opened by this action (scene "diff" link).
 * Returns { session, result, completed, step } — `step` is the step that was current when the action ran.
 */
export function act(session, command, { diffModes = [] } = {}) {
  const result = apply(session.state, command);
  const shown = (result.events || []).filter((e) => e.type === 'diff.shown').map((e) => e.mode);
  let next = {
    ...session,
    state: result.error ? session.state : result.state,
    last: { command, result },
    diffShown: [...session.diffShown, ...shown, ...diffModes],
  };
  const out = settle(next);
  next = out.session;
  return { session: next, result, completed: out.completed, step: out.step };
}

/** The diff screen was opened from the scene in `mode` (for `diff shown <mode>` checks). */
export function noteDiff(session, mode) {
  const next = { ...session, diffShown: [...session.diffShown, mode] };
  return settle(next);
}

/**
 * Plays the canonical action of the current step: its command, its web actions, or the scene actions
 * implied by an instruction's check phrases (content-check playInstruction).
 * Returns { session, results: [{ command, result }], completed, step, error }.
 */
export function autoStep(session) {
  const step = currentStep(session);
  if (!step) return { session, results: [], completed: false, step: null, error: null };
  const kind = stepKind(step);
  let s = session;
  const results = [];
  if (kind === 'web') {
    for (const w of step.web) {
      const c = parseWebAction(w);
      if (!c) break;
      const r = act(s, c);
      results.push({ command: c, result: r.result });
      if (r.completed) return { session: r.session, results, completed: true, step, error: null };
      s = r.session;
      if (r.result.error) return { session: s, results, completed: false, step, error: r.result.error };
    }
    return { session: s, results, completed: false, step, error: null };
  }
  if (kind === 'instruction') {
    const played = playInstruction(s.state, step.check);
    const last = played.results.length ? played.results[played.results.length - 1] : null;
    s = {
      ...s,
      state: played.state,
      last: last ? { command: last.command, result: last.result } : s.last,
      diffShown: [...s.diffShown, ...played.diffModes],
    };
    for (const x of played.results) results.push(x);
    const out = settle(s);
    return { session: out.session, results, completed: out.completed, step, error: played.error ? played.error.error : null };
  }
  const r = act(s, step.command);
  results.push({ command: step.command, result: r.result });
  return { session: r.session, results, completed: r.completed, step, error: r.result.error && !expectsError(step) ? r.result.error : null };
}

/** Fresh session at the start of a part. */
export function partSession(mission, partIndex = 0) {
  const index = Math.max(0, Math.min(mission.parts.length - 1, partIndex));
  const part = mission.parts[index];
  const r = partSetup(mission, index);
  const base = {
    mission, partIndex: index, part, initial: r.state, state: r.state, index: 0, last: null, diffShown: [],
    error: r.error ? { key: r.error.key, params: r.error.params, line: r.line, text: r.text } : null,
  };
  return r.error ? base : enter(base);
}

/**
 * Replays the part from its initial state up to step `target` (0-based; steps.length = part finished).
 * Stops early when a step cannot be played automatically (session.index then tells where).
 */
export function gotoStep(session, target) {
  let s = partSession(session.mission, session.partIndex);
  const max = s.part.steps.length;
  const goal = Math.max(0, Math.min(max, Number(target) || 0));
  while (!s.error && s.index < goal) {
    const r = autoStep(s);
    if (!r.completed) break;
    s = r.session;
  }
  return s;
}

/** startSession(mission, { part: letter | index, step: 0-based index }) */
export function startSession(mission, { part = 0, step = 0 } = {}) {
  let partIndex = typeof part === 'string' ? mission.parts.findIndex((p) => p.letter === part) : part;
  if (!(partIndex >= 0)) partIndex = 0;
  const s = partSession(mission, partIndex);
  return step > 0 ? gotoStep(s, step) : s;
}

/** Index of a part by letter (0 when not found). */
export function partIndexOf(mission, letter) {
  const i = mission.parts.findIndex((p) => p.letter === letter);
  return i >= 0 ? i : 0;
}

/**
 * What the scene should highlight for a step (instruction or web): { files: [{desk, path}], desks: [ids], mrs: [ids] }.
 * Derived from the step's check phrases.
 */
export function highlightFor(step, state) {
  const out = { files: [], desks: [], mrs: [] };
  if (!step || !state) return out;
  for (const c of step.check || []) {
    const p = parseCheckPhrase(c.text);
    if (!p) continue;
    if (p.type === 'file') {
      const d = getDesk(state, p.desk);
      if (d) out.files.push({ desk: d.id, path: p.path });
    } else if (p.type === 'commits') {
      const d = state.worktrees.find((w) => w.branch === p.branch);
      if (d) out.desks.push(d.id);
    } else if (p.type === 'mr') out.mrs.push(p.num);
    else if (p.type === 'active-desk' || p.type === 'desk-on') {
      const d = getDesk(state, p.desk);
      if (d) out.desks.push(d.id);
    }
  }
  return out;
}

/** Files the "Make the AI work" button will change, before running it (same rule as src/engine/ai.js). */
export function predictAiFiles(state, deskRef, step) {
  if (step && step.aiFiles && step.aiFiles.length) return [...step.aiFiles];
  const desk = getDesk(state, deskRef) || activeDesk(state);
  return desk ? pickAiFiles(desk, (state.seq.ai || 0) + 1) : [];
}

/** Index of the generic "what the AI did" text for the next AI action (src/engine/ai.js textIndex). */
export function nextAiTextIndex(state) {
  return state.seq.ai || 0;
}

/** Engine command for the "Make the AI work" button, with the step's ai-files and the given message. */
export function aiCommand(state, deskRef, step, message) {
  const options = {};
  if (step && step.aiFiles && step.aiFiles.length) options.files = [...step.aiFiles];
  if (message) options.message = message;
  return { name: 'ai', args: [deskRef], options };
}

/** "Your work in progress": 'stashed' when the original desk has a stash entry, else 'visible'. */
export function workState(state) {
  const main = state.worktrees.find((w) => w.main) || state.worktrees[0];
  return main && main.stash && main.stash.length ? 'stashed' : 'visible';
}

/** Diff screen target of a diff command: { mode, a, b, threeDot } or null. */
export function diffTarget(command, state) {
  const c = typeof command === 'string' ? parse(command) : command;
  if (!c || c.error || c.name !== 'diff') return null;
  if (c.options && (c.options.staged || c.options.cached)) return { mode: 'staged' };
  const desk = activeDesk(state);
  const files = new Set(desk ? deskFiles(desk).map((f) => f.path) : []);
  const revs = (c.args || []).filter((a) => !files.has(a));
  if (!revs.length) return { mode: 'work' };
  if (revs.length === 1 && revs[0].includes('...')) {
    const [a, b] = revs[0].split('...');
    return { mode: 'branches', a: a || 'HEAD', b: b || 'HEAD', threeDot: true };
  }
  if (revs.length === 1 && revs[0].includes('..')) {
    const [a, b] = revs[0].split('..');
    return { mode: 'branches', a: a || 'HEAD', b: b || 'HEAD' };
  }
  if (revs.length === 1) return { mode: 'branches', a: revs[0], b: desk ? desk.branch : null };
  return { mode: 'branches', a: revs[0], b: revs[1] };
}

/** Log target of a log command: { branch } or null. */
export function logTarget(command) {
  const c = typeof command === 'string' ? parse(command) : command;
  if (!c || c.error || c.name !== 'log') return null;
  return { branch: (c.args || [])[0] || null };
}

/** Text a compare column shows for a replayed step: its command, or its web actions. */
export function stepCommandText(step) {
  if (step.web && step.web.length) return step.web.join(' ; ');
  return step.command || '';
}
