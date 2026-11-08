// Puzzle logic: star rule, answer evaluation, goal states, typed checks, hints (src/ui/puzzle-logic.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parsePuzzle } from '../../src/content/puzzle.js';
import { apply } from '../../src/engine/apply.js';
import {
  starsFor, buildPuzzle, evaluateChoice, classify, isSolved, hintStart, choiceToRuleOut, formatTime, nextPuzzleId,
} from '../../src/ui/puzzle-logic.js';

const dir = new URL('../../content/puzzles/', import.meta.url);
const load = (name) => parsePuzzle(readFileSync(new URL(name, dir), 'utf8'));

const TYPED = `---
title: Un dossier pour relire
type: typed
---

## Prompt
Ouvrez un dossier de revue.

## Setup
\`\`\`git-setup
@files plan.md
git commit -m "init"
git branch ia/x
\`\`\`

## Solution
solution: git worktree add ../revue ia/x
check:
- desk revue on ia/x

## Goal
Un dossier revue.

## Takeaway
worktree add ouvre un dossier.
`;

test('stars: 3 on the first try, one less per miss, per hint and for the timer, never below 1', () => {
  assert.equal(starsFor({}), 3);
  assert.equal(starsFor({ misses: 0, hints: 0 }), 3);
  assert.equal(starsFor({ misses: 1 }), 2);
  assert.equal(starsFor({ hints: 1 }), 2);
  assert.equal(starsFor({ misses: 1, hints: 1 }), 1);
  assert.equal(starsFor({ timedOut: true }), 2);
  assert.equal(starsFor({ misses: 5, hints: 4, timedOut: true }), 1);
});

test('every real puzzle builds a start state and a goal that differs from it', () => {
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.fr.md'))) {
    const data = load(f);
    const b = buildPuzzle(data);
    assert.equal(b.error, null, f);
    if (!f.startsWith('11-')) assert.notEqual(b.goal, b.initial, f); // puzzle 11's solution is read-only (diff screen)
  }
});

test('choice evaluation: the [x] choice is correct and reaches the goal; others are wrong', () => {
  const data = load('03-ouvrir-une-voie.fr.md');
  const { initial, goal } = buildPuzzle(data);
  const right = data.choices.findIndex((c) => c.correct);
  const ev = evaluateChoice(data, initial, right);
  assert.equal(ev.correct, true);
  assert.equal(ev.result.error, null);
  assert.ok(ev.result.state.branches['ia/plan']);
  assert.deepEqual(Object.keys(goal.branches).sort(), Object.keys(ev.result.state.branches).sort());
  data.choices.forEach((c, i) => {
    if (i !== right) assert.equal(evaluateChoice(data, initial, i).correct, false);
  });
  assert.equal(evaluateChoice(data, initial, 99).correct, false);
});

test('a wrong choice that fails in the engine still returns the engine error (shown, not thrown)', () => {
  const data = load('03-ouvrir-une-voie.fr.md');
  const { initial } = buildPuzzle(data);
  const i = data.choices.findIndex((c) => c.command === 'git switch ia/plan');
  const ev = evaluateChoice(data, initial, i);
  assert.ok(ev.result.error);
  assert.equal(ev.result.state, initial);
});

test('typed puzzle: solved only when the shape matches the goal and the check phrases hold', () => {
  const data = parsePuzzle(TYPED);
  assert.deepEqual(data.errors, []);
  const { initial, goal } = buildPuzzle(data);
  assert.equal(isSolved(data, { state: initial, goal, initial, last: null }), false);

  const status = apply(initial, 'git status');
  assert.equal(classify(initial, status), 'read');
  const bad = apply(initial, 'git worktree add ../autre -b ia/y');
  assert.equal(classify(initial, bad), 'change');
  assert.equal(isSolved(data, { state: bad.state, goal, initial, last: { command: 'x', result: bad } }), false);
  assert.equal(classify(initial, apply(initial, 'git nope')), 'error');

  const good = apply(initial, 'git worktree add ../revue ia/x');
  assert.equal(isSolved(data, { state: good.state, goal, initial, last: { command: 'git worktree add ../revue ia/x', result: good } }), true);
});

test('typed check phrases can reject an equivalent shape', () => {
  const data = parsePuzzle(TYPED.replace('desk revue on ia/x', 'desk nope on ia/x'));
  const { initial, goal } = buildPuzzle(data);
  const good = apply(initial, 'git worktree add ../revue ia/x');
  assert.equal(isSolved(data, { state: good.state, goal, initial, last: null }), false);
});

test('hints: typed start of the solution, and a wrong choice ruled out without giving the answer away', () => {
  assert.equal(hintStart('git worktree add ../revue ia/x'), 'git worktree …');
  assert.equal(hintStart('git status'), 'git …');
  assert.equal(hintStart(''), '');
  const data = load('03-ouvrir-une-voie.fr.md');
  const out = new Set();
  const a = choiceToRuleOut(data, out);
  assert.ok(a >= 0 && !data.choices[a].correct);
  out.add(a);
  const b = choiceToRuleOut(data, out);
  assert.ok(b >= 0 && b !== a);
  out.add(b);
  assert.equal(choiceToRuleOut(data, out), -1, 'one wrong option always remains');
  assert.equal(choiceToRuleOut(data, new Set(), 1), 2, 'the picked option is never ruled out');
});

test('timer format and next puzzle', () => {
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(42.4), '0:42');
  assert.equal(formatTime(-3), '0:00');
  const list = [{ id: 'a' }, { id: 'b' }];
  assert.equal(nextPuzzleId(list, 'a'), 'b');
  assert.equal(nextPuzzleId(list, 'b'), null);
  assert.equal(nextPuzzleId(list, 'zz'), null);
});
