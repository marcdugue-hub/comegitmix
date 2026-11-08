// Engine-backed content checks, plugged into the content validator:
//   validate(files, { engine: { checkContent } })   (src/content/validate.js, scripts/check-content.mjs)
// Pure. Reports problems with report(file, line, message, level = 'error').
//
// What is checked (docs/AUTHORING.md §8):
// - every setup block (mission, part, puzzle, sandbox start) and every `before:` replays without error;
// - every step command, `accepts:` spelling and puzzle choice is recognised by the parser;
// - missions: playing the steps in order from the setup satisfies each step's `check:` (or, without check,
//   the command succeeds). Interface instructions "(…)" are played as the scene action implied by their
//   check phrases (see sceneActionsFor below and src/engine/README.md);
// - puzzles: the [x] choice (or `solution:`) applies without error and satisfies the `check:` list;
//   a wrong choice giving the same result as the right one is a warning;
// - every `conflict` block matches a real conflict produced by the setup, the steps, or a probe
//   (`git merge <second>` on the lane <first> after the setup).

import { apply } from './apply.js';
import { parse } from './parse.js';
import { getDesk, findFile, commitsBetween, resolveRev, activeDesk, deskFiles } from './state.js';
import { runSetup, applySetupLines, conflictBlocksFrom } from './setup.js';
import { checkAll, fileMatches } from './predicates.js';
import { parseWebAction } from './remote.js';
import { equivalent } from './equivalence.js';
import { parseCheckPhrase } from '../content/check-phrase.js';

const DIRS = { mission: 'missions', puzzle: 'puzzles', sandbox: 'sandbox' };

function describe(error) {
  if (!error) return '';
  const params = error.params && Object.keys(error.params).length ? ` ${JSON.stringify(error.params)}` : '';
  return `${error.key}${params}`;
}

function cmdText(c) {
  return typeof c === 'string' ? c : c.text || JSON.stringify(c);
}

/** True when the parser does not recognise the text as a command at all (typo, unknown word). */
function unrecognised(text) {
  const c = parse(text);
  if (!c.error) return null;
  return /^error\.(unknownCommand|emptyCommand|missingSubcommand)/.test(c.error.key) ? c.error : null;
}

/** Conflicts currently open in a state: [{ path, first, second }]. */
function openConflicts(state) {
  const out = [];
  for (const w of state.worktrees) {
    for (const f of deskFiles(w)) if (f.conflict) out.push({ path: f.path, first: f.conflict.oursLabel, second: f.conflict.theirsLabel });
  }
  return out;
}

function collect(seen, state) {
  for (const c of openConflicts(state)) seen.add(`${c.path}\u0000${c.first}\u0000${c.second}`);
}

function collectResults(seen, results) {
  for (const r of results || []) if (r.result && !r.result.error) collect(seen, r.result.state);
}

/**
 * Scene actions implied by the check phrases of an interface instruction step ("(click plan.md)").
 * Returns { actions: [command objects], diffModes: [modes] }.
 *   file <desk>/<path> M|U|A|staged|clean -> clicks on the file (or the "+" button for a new U file) until it matches
 *   commits <branch> since <base> = <n>   -> "Make the AI work" on the desk of <branch> until the count is reached
 *   resolved <desk>/<path> <side>         -> resolve the conflict keeping <side>
 *   active desk <folder>                  -> click the tile (cd)
 *   desk <folder> on <branch>             -> switch that desk to the branch
 *   mr <n> approved|merged                -> site actions on the MR card
 *   diff shown <mode>                     -> the diff screen opened from the scene
 * Phrases that describe a state (index, stash, no conflict…) imply no action.
 * The actions are computed against the state as it evolves (clicks and AI work depend on it).
 */
export function playInstruction(state, checks) {
  let s = state;
  const results = [];
  const diffModes = [];
  let acted = false;
  let error = null;
  const run = (c) => {
    const r = apply(s, c);
    results.push({ command: c, result: r });
    if (r.error) { error = { command: c, error: r.error }; return false; }
    s = r.state;
    return true;
  };
  for (const it of checks) {
    if (error) break;
    const p = parseCheckPhrase(it.text);
    if (!p) continue;
    if (p.type === 'file') {
      acted = true;
      const desk = getDesk(s, p.desk);
      if (!desk) { error = { command: null, error: { key: 'error.unknownDesk', params: { path: p.desk } } }; break; }
      if (!findFile(desk, p.path) && (p.status === 'U' || p.status === 'A')) run({ name: 'create', args: [desk.id], options: { path: p.path } });
      for (let i = 0; i < 4 && !error && !fileMatches(findFile(getDesk(s, p.desk), p.path), p.status); i += 1) run({ name: 'click', args: [desk.id, p.path] });
    } else if (p.type === 'commits') {
      acted = true;
      const desk = s.worktrees.find((w) => w.branch === p.branch);
      if (!desk) { error = { command: null, error: { key: 'error.noDeskOnBranch', params: { name: p.branch } } }; break; }
      const count = () => {
        const a = resolveRev(s, activeDesk(s), p.base);
        const b = resolveRev(s, activeDesk(s), p.branch);
        return a && b ? commitsBetween(s, a.id, b.id).length : 0;
      };
      for (let i = 0; i < p.count + 2 && !error && count() < p.count; i += 1) run({ name: 'ai', args: [desk.id], options: {} });
    } else if (p.type === 'resolved') {
      acted = true;
      run({ name: 'resolve', args: [p.desk, p.path, p.side] });
    } else if (p.type === 'active-desk') {
      acted = true;
      run({ name: 'cd', args: [p.desk] });
    } else if (p.type === 'desk-on') {
      acted = true;
      const d = getDesk(s, p.desk);
      if (d && d.branch !== p.branch) run({ name: 'switch', args: [p.branch], options: {}, desk: d.id });
    } else if (p.type === 'mr') {
      acted = true;
      run({ name: 'mr', args: ['approve', p.num] });
      if (p.status === 'merged' && !error) run({ name: 'mr', args: ['merge', p.num] });
    } else if (p.type === 'diff-shown') {
      acted = true;
      diffModes.push(p.mode);
    }
  }
  return { state: s, results, diffModes, acted, error };
}

/** Probes a conflict block from a state: git merge <second> on the desk of <first>. */
function probeConflict(state, block) {
  let s = state;
  let desk = s.worktrees.find((w) => w.branch === block.first);
  if (!desk) {
    const r = apply(s, { name: 'switch', args: [block.first], options: {} });
    if (r.error) return false;
    s = r.state;
    desk = activeDesk(s);
  }
  const r = apply(s, { name: 'merge', args: [block.second], options: {}, desk: desk.id });
  if (r.error) return false;
  return openConflicts(r.state).some((c) => c.path === block.path && c.first === block.first && c.second === block.second);
}

function checkConflictBlocks(blocks, seen, probeState, file, report) {
  for (const b of blocks) {
    if (!b.sides || b.sides.length !== 2) continue;
    const block = conflictBlocksFrom([b])[0];
    if (seen.has(`${block.path}\u0000${block.first}\u0000${block.second}`)) continue;
    if (probeState && probeConflict(probeState, block)) continue;
    report(file, b.line, `conflict block ${block.path} (${block.first} / ${block.second}) does not match any conflict produced by the setup or the steps (nor by "git merge ${block.second}" on ${block.first})`);
  }
}

function setupOf(lines, front, conflicts, file, report, line) {
  const r = runSetup(lines, { folder: front.folder, repos: front.repos, conflicts });
  if (r.error) {
    report(file, r.line || line, `setup fails at "${r.text}": ${describe(r.error)}`);
    return null;
  }
  return r;
}

function checkCommandSpelling(text, file, line, report, what) {
  const e = unrecognised(text);
  if (e) report(file, line, `${what} "${text}" is not recognised by the game (${describe(e)})`);
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

function playStep(step, state, initial, file, report) {
  const L = (k) => step.lines[k] || step.line;
  let s = state;
  const label = `step ${step.n} "${step.title}"`;
  if (step.before.length) {
    const r = applySetupLines(s, step.before);
    if (r.error) {
      report(file, r.line || L('before'), `${label}: "before:" fails at "${r.text}": ${describe(r.error)}`);
      return { state: null };
    }
    s = r.state;
  }
  const seenStates = [s];
  let last = null;
  let diffShown = [];
  let failure = null;
  if (step.web.length) {
    for (const w of step.web) {
      const c = parseWebAction(w);
      if (!c) { failure = `web action "${w}" is not recognised`; break; }
      const r = apply(s, c);
      last = { command: c, result: r };
      if (r.error) { failure = `"${w}" fails: ${describe(r.error)}`; break; }
      s = r.state;
    }
  } else if (step.isInstruction) {
    const r = playInstruction(s, step.check);
    if (!r.acted) {
      report(file, L('command'), `${label}: cannot tell which scene action the instruction ${step.command} stands for (its check phrases imply none)`);
      return { state: null };
    }
    if (r.error) failure = `the scene action ${r.error.command ? cmdText(r.error.command) : ''} fails: ${describe(r.error.error)}`;
    s = r.state;
    diffShown = r.diffModes;
    last = r.results.length ? r.results[r.results.length - 1] : null;
    if (last) last = { command: last.command, result: last.result };
    for (const x of r.results) if (!x.result.error) seenStates.push(x.result.state);
  } else if (step.command !== null) {
    checkCommandSpelling(step.command, file, L('command'), report, `${label}: command`);
    for (const a of step.accepts) checkCommandSpelling(a.replace(/\*/g, 'x'), file, L('accepts'), report, `${label}: accepted spelling`);
    const c = parse(step.command);
    const r = apply(s, c);
    last = { command: step.command, result: r };
    if (r.error) failure = `"${step.command}" fails: ${describe(r.error)}`;
    else {
      s = r.state;
      seenStates.push(s);
      diffShown = (r.events || []).filter((e) => e.type === 'diff.shown').map((e) => e.mode);
      if (step.diffMode && diffShown.length && !diffShown.includes(step.diffMode)) {
        report(file, L('diff-mode'), `${label}: "diff-mode: ${step.diffMode}" but "${step.command}" shows the ${diffShown[0]} diff`);
      }
    }
  }
  const expectsError = step.check.some((c) => /^error\s/.test(c.text.trim()));
  if (step.check.length) {
    const res = checkAll(step.check, { state: s, initial, last, diffShown });
    for (const f of res.failed) report(file, f.line || L('check'), `${label}: check "${f.text}" is false after playing it${failure ? ` (${failure})` : ''}`);
    if (res.ok && failure && !expectsError) report(file, L(step.web.length ? 'web' : 'command'), `${label}: ${failure}`);
    if (!res.ok) return { state: null, seenStates };
  } else if (failure || (last && last.result.error)) {
    report(file, L(step.web.length ? 'web' : 'command'), `${label}: ${failure || `"${step.command}" fails: ${describe(last.result.error)}`}`);
    return { state: null, seenStates };
  }
  return { state: s, seenStates };
}

function checkMission(m, file, report) {
  if (m.mode === 'compare' || !m.setup) return;
  const allConflicts = [...m.conflicts, ...m.parts.flatMap((p) => p.conflicts)];
  const base = setupOf(m.setup.lines, m.front, allConflicts, file, report, m.setupLine);
  if (!base) return;
  const seen = new Set();
  collectResults(seen, base.results);
  collect(seen, base.state);
  for (const part of m.parts) {
    let start = base;
    if (part.setup) {
      start = setupOf(part.setup.lines, m.front, allConflicts, file, report, part.setupLine);
      if (!start) continue;
      collectResults(seen, start.results);
    }
    let state = start.state;
    for (const step of part.steps) {
      const r = playStep(step, state, start.state, file, report);
      for (const st of r.seenStates || []) collect(seen, st);
      if (!r.state) break;
      state = r.state;
    }
  }
  checkConflictBlocks(allConflicts, seen, base.state, file, report);
}

// ---------------------------------------------------------------------------
// Puzzles and sandbox starts
// ---------------------------------------------------------------------------

function checkPuzzle(p, file, report) {
  if (!p.setup) return;
  const setup = setupOf(p.setup.lines, p.front, p.conflicts, file, report, p.setupLine);
  if (!setup) return;
  const seen = new Set();
  collectResults(seen, setup.results);
  const initial = setup.state;
  let goal = null;
  if (p.type === 'typed' && p.solution && p.solution.command) {
    const line = p.solution.commandLine || p.solution.line;
    checkCommandSpelling(p.solution.command, file, line, report, 'solution');
    const r = apply(initial, p.solution.command);
    if (r.error) report(file, line, `the solution "${p.solution.command}" fails: ${describe(r.error)}`);
    else {
      goal = r.state;
      collect(seen, goal);
      const res = checkAll(p.solution.check, { state: goal, initial, last: { command: p.solution.command, result: r }, diffShown: [] });
      for (const f of res.failed) report(file, f.line || line, `check "${f.text}" is false after the solution`);
    }
  } else {
    const right = p.choices.find((c) => c.correct);
    for (const c of p.choices) checkCommandSpelling(c.command, file, c.line, report, 'choice');
    if (right) {
      const r = apply(initial, right.command);
      if (r.error) report(file, right.line, `the [x] choice "${right.command}" fails: ${describe(r.error)}`);
      else {
        goal = r.state;
        collect(seen, goal);
        for (const c of p.choices) {
          if (c.correct) continue;
          const w = apply(initial, c.command);
          if (!w.error && w.state !== initial && goal !== initial && equivalent(w.state, goal)) {
            report(file, c.line, `the wrong choice "${c.command}" reaches the same state as the [x] choice`, 'warning');
          }
        }
      }
    }
  }
  checkConflictBlocks(p.conflicts, seen, initial, file, report);
}

function checkSandbox(s, file, report) {
  if (!s.setup) return;
  const setup = setupOf(s.setup.lines, s.front, s.conflicts, file, report, s.setupLine);
  if (!setup) return;
  const seen = new Set();
  collectResults(seen, setup.results);
  checkConflictBlocks(s.conflicts, seen, setup.state, file, report);
}

/** Hook for src/content/validate.js: engine-dependent checks of every parsed content file. */
export function checkContent({ parsed, report }) {
  const checkers = { mission: checkMission, puzzle: checkPuzzle, sandbox: checkSandbox };
  for (const kind of Object.keys(checkers)) {
    for (const [id, langs] of Object.entries(parsed[kind] || {})) {
      for (const [lang, data] of Object.entries(langs)) {
        const file = `${DIRS[kind]}/${id}.${lang}.md`;
        try {
          checkers[kind](data, file, report);
        } catch (e) {
          report(file, 1, `engine check crashed: ${e && e.message ? e.message : e}`);
        }
      }
    }
  }
}

export default { checkContent };
