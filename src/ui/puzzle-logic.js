// Pure puzzle logic (no DOM, no language): start/goal states, answer evaluation, stars.
// Used by src/ui/puzzle-panel.js; unit-tested in tests/unit/puzzle.logic.test.js.
//
// STAR RULE (documented here, shown to the player as "3 on the first try"):
//   stars = max(1, 3 - misses - hints - (timedOut ? 1 : 0))
//   - miss: a wrong answer (choice puzzle), or a typed command that changes the state without reaching the goal.
//     Typos and read-only commands (status, log…) are free.
//   - hint: each use of the Hint button.
//   - timedOut: the `timer:` of the puzzle ran out before the solution (the puzzle stays playable).
//   A solved puzzle always earns at least one star.
import { runSetup } from '../engine/setup.js';
import { apply } from '../engine/apply.js';
import { equivalent } from '../engine/equivalence.js';
import { checkAll } from '../engine/predicates.js';

export const MAX_STARS = 3;

/** Stars for a solved puzzle (see the rule above). */
export function starsFor({ misses = 0, hints = 0, timedOut = false } = {}) {
  const lost = Math.max(0, misses) + Math.max(0, hints) + (timedOut ? 1 : 0);
  return Math.max(1, MAX_STARS - lost);
}

/**
 * Builds the start state and the goal state of a parsed puzzle (src/content/puzzle.js).
 * Returns { initial, goal, error } with error = { key, params, line } when the setup or the solution fails.
 * The goal is the state obtained by applying the [x] choice (choice) or `solution:` (typed).
 */
export function buildPuzzle(data) {
  if (!data || !data.setup) return { initial: null, goal: null, error: { key: 'puzzle.ui.contentError', params: { n: 1 } } };
  const setup = runSetup(data.setup.lines, { folder: data.front.folder, repos: data.front.repos, conflicts: data.conflicts });
  if (setup.error) return { initial: null, goal: null, error: { ...setup.error, line: setup.line } };
  const initial = setup.state;
  const command = data.type === 'typed' ? data.solution && data.solution.command : (data.choices.find((c) => c.correct) || {}).command;
  if (!command) return { initial, goal: null, error: { key: 'puzzle.ui.contentError', params: { n: 1 } } };
  const r = apply(initial, command);
  if (r.error) return { initial, goal: null, error: r.error };
  return { initial, goal: r.state, solutionResult: r, error: null };
}

/**
 * Plays choice number `index` on the start state.
 * Returns { correct, choice, result } where result is the engine result (state, events, explanation, error…).
 */
export function evaluateChoice(data, initial, index) {
  const choice = data.choices[index];
  if (!choice) return { correct: false, choice: null, result: null };
  return { correct: Boolean(choice.correct), choice, result: apply(initial, choice.command) };
}

/** Classifies a typed command result: 'error' | 'read' (state untouched) | 'change'. */
export function classify(before, result) {
  if (result.error) return 'error';
  return result.state === before ? 'read' : 'change';
}

/**
 * Is the typed puzzle solved? The state must be equivalent to the goal and satisfy the `check:` phrases.
 * `last` = { command, result } of the command just played.
 */
export function isSolved(data, { state, goal, initial, last }) {
  if (!goal || !equivalent(state, goal)) return false;
  const phrases = (data.solution && data.solution.check) || [];
  if (!phrases.length) return true;
  return checkAll(phrases, { state, initial, last: last || null, diffShown: [] }).ok;
}

/** Start of the solution shown by the typed Hint: the first two words, then "…". */
export function hintStart(command) {
  const words = String(command || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length <= 2) return `${words[0]} …`;
  return `${words[0]} ${words[1]} …`;
}

/** Index of a wrong choice to rule out with the choice Hint (not picked, not already ruled out), or -1. */
export function choiceToRuleOut(data, ruledOut = new Set(), picked = -1) {
  const live = data.choices.map((c, i) => i).filter((i) => !data.choices[i].correct && !ruledOut.has(i) && i !== picked);
  // keep at least one wrong option next to the right one, so the hint never hands over the answer
  const remainingWrong = data.choices.filter((c, i) => !c.correct && !ruledOut.has(i)).length;
  return remainingWrong > 1 && live.length ? live[0] : -1;
}

/** "m:ss" for a number of seconds. */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Id of the puzzle after `id` in the summary, or null. */
export function nextPuzzleId(puzzles, id) {
  const i = puzzles.findIndex((p) => p.id === id);
  return i >= 0 && i + 1 < puzzles.length ? puzzles[i + 1].id : null;
}
