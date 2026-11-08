// Fixture states for the screens preview (dev/screens.html) and tests/unit/screens.*.test.js.
// Built only with the engine (apply / applyAll): nothing is hand-written into the state.
import { apply, applyAll } from '../src/engine/apply.js';
import { createState } from '../src/engine/state.js';

const LONG_REPORT = [
  '# Report summary', '', 'The report is long and covers many topics.', '', '## Key points',
  'Sales went up.', 'Costs are stable.', 'Hiring continues.', 'The office moved.', 'A new tool was adopted.',
  'The team grew.', 'Training took place.', 'Two partners joined.', 'The roadmap is public.', 'Support answers faster.',
  'Quality checks are weekly.', 'Reviews are monthly.', 'Budgets are frozen.', '', '## Sources',
].join('\n');

const SHORT_REPORT = LONG_REPORT
  .replace('The report is long and covers many topics.', 'This report presents three key results for the client.')
  .replace('Sales went up.', 'Sales went up 12% in the second half.\nAcquisition cost fell by 8%.')
  .replace('## Sources', '## Conclusion\nWe recommend keeping up the effort on online sales.\n\n## Sources');

function must(result) {
  if (result.error) throw new Error(`fixture: ${JSON.stringify(result.error)}`);
  return result.state;
}

const edit = (path, content) => ({ name: 'touch', args: [path], options: { content } });
const seed = (path, content) => ({ name: 'create', options: { path, content, status: 'clean' } });

/** main + an AI lane ia/resume that rewrote resume.md and plan.md and added sources.md. */
export function lanesState() {
  let s = createState({ folder: 'report', branch: 'main' });
  s = must(applyAll(s, [
    seed('resume.md', LONG_REPORT), seed('plan.md', '# Plan\n1. Introduction\n2. Results\n3. Summary'),
    'git commit -m "init"',
  ], { lenient: true }));
  s = must(applyAll(s, [
    'git switch -c ia/resume',
    edit('resume.md', SHORT_REPORT),
    edit('plan.md', '# Plan\n1. Introduction\n2. Results\n3. Summary and conclusion'),
    seed('sources.md', '# Sources\n- 2026 market study\n- Internal sales database'),
    'git add resume.md plan.md sources.md',
    'git commit -m "shorter summary"',
    'git switch main',
  ], { lenient: true, author: 'ai' }));
  return s;
}

/** Desk on main with: plan.md modified (M), resume.md modified and staged, nouveau-1.md untracked (U). */
export function workState() {
  let s = lanesState();
  s = must(applyAll(s, [
    edit('plan.md', '# Plan\n1. Introduction\n2. Results\n3. Summary, conclusion and appendices'),
    edit('resume.md', LONG_REPORT.replace('Sales went up.', 'Sales went up a lot.')),
    'git add resume.md',
    { name: 'create', options: { path: 'nouveau-1.md', content: '# New file' } },
  ]));
  return s;
}

/** main and ia/resume both changed plan.md; `git merge ia/resume` stopped on a conflict. */
export function conflictState({ detailed = false } = {}) {
  let s = createState({ folder: 'report', branch: 'main' });
  s = must(applyAll(s, [seed('plan.md', 'Delivery planned'), seed('resume.md', 'Summary'), 'git commit -m "init"'], { lenient: true }));
  s = must(applyAll(s, [
    'git switch -c ia/resume', edit('plan.md', 'Delivery in April'), 'git commit -am "April"',
    'git switch main', edit('plan.md', 'Delivery in March'), 'git commit -am "March"',
  ], { lenient: true }));
  if (detailed) {
    s = { ...s, conflictBlocks: [{ path: 'plan.md', first: 'main', second: 'ia/resume', firstText: 'Delivery in March', secondText: 'Delivery in April' }] };
  }
  const r = apply(s, 'git merge ia/resume');
  if (r.error) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.state;
}

/** A short history mixing human and AI commits, with a merge commit. */
export function historyState() {
  let s = lanesState();
  s = must(applyAll(s, [seed('notes.md', '# Notes'), 'git add notes.md', 'git commit -m "add notes"'], { lenient: true, author: 'human' }));
  s = must(applyAll(s, ['git merge ia/resume --no-ff']));
  return s;
}
