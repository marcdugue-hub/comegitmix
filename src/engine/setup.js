// Replays a ```git-setup block (docs/AUTHORING.md §3.2): real Git commands (lenient mode) and @directives.
// Pure. Errors are returned with the source line, never thrown.

import { apply } from './apply.js';
import { createState, clone } from './state.js';
import { tokenize } from './parse.js';
import { parseWebAction } from './remote.js';

/** Text of a git-setup block -> [{ text, line }] (blank lines dropped, line numbers relative to the text). */
export function setupLinesFromText(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n')
    .map((t, i) => ({ text: t.replace(/\s+$/, ''), line: i + 1 }))
    .filter((l) => l.text.trim() !== '' && !/^```/.test(l.text.trim()));
}

/** Parsed `conflict` blocks of the content reader -> state.conflictBlocks entries. */
export function conflictBlocksFrom(conflicts = []) {
  return conflicts
    .filter((c) => c.sides && c.sides.length === 2)
    .map((c) => ({
      path: c.path, first: c.sides[0].branch, second: c.sides[1].branch,
      firstText: c.sides[0].lines.join('\n'), secondText: c.sides[1].lines.join('\n'),
    }));
}

function normaliseLines(lines) {
  if (typeof lines === 'string') return setupLinesFromText(lines);
  return (lines || []).map((l, i) => (typeof l === 'string' ? { text: l, line: i + 1 } : l));
}

/** Directive line -> list of engine commands (objects) or a state transform. */
function directive(text) {
  const tokens = tokenize(text.trim());
  const [name, ...rest] = tokens;
  const opt = (prefix) => {
    const t = rest.find((x) => x.startsWith(`${prefix}=`));
    return t ? t.slice(prefix.length + 1) : null;
  };
  switch (name) {
    case '@files': return rest.map((p) => ({ name: 'create', args: [], options: { path: p, status: 'clean' } }));
    case '@new': return rest.map((p) => ({ name: 'create', args: [], options: { path: p } }));
    case '@work': return rest.map((p) => ({ name: 'touch', args: [p], options: {} }));
    case '@cd': return [{ name: 'cd', args: [rest[0]], options: {} }];
    case '@remote': return [{ name: 'publish', args: [rest[0]], options: {} }];
    case '@fork': return [{ name: 'fork', args: [rest[0], rest[1]], options: {} }];
    case '@online-only': return [{ name: 'online-only', args: [rest[0]], options: {} }];
    case '@colleague': {
      const files = opt('files');
      return [{ name: 'colleague', args: [rest[0]], options: { message: rest[1] || '', files: files ? files.split(',').filter(Boolean) : null } }];
    }
    case '@mr': {
      // @mr <num> <source> -> <target> "<title>" [comments=<n>]
      const [num, source, arrow, target, title] = rest;
      if (arrow !== '->') return { error: { key: 'error.setupSyntax', params: { text } } };
      return [{ name: 'mr', args: ['open', Number(num)], options: { source, target, title: title || '', comments: Number(opt('comments') || 0) } }];
    }
    case '@no-git': return { transform: (s) => ({ ...s, noGit: true }) };
    case '@author': return { transform: (s) => ({ ...s, author: rest[0] === 'ai' ? 'ai' : 'human' }) };
    case '@rebase-plan': return { transform: (s) => ({ ...s, rebasePlan: (rest[0] || '').split(',').filter(Boolean) }) };
    default: return { error: { key: 'error.setupUnknownDirective', params: { name } } };
  }
}

/**
 * Plays setup lines on top of `state` (lenient mode).
 * Returns { state, error, line, text, results } — on error, `state` is the state before the failing line,
 * `error` is { key, params } and `line` the source line number.
 */
export function applySetupLines(state, lines, { lenient = true } = {}) {
  let s = state;
  const results = [];
  const list = normaliseLines(lines);
  const ok = (extra = {}) => ({ state: s, error: null, line: null, text: null, results, ...extra });
  for (let i = 0; i < list.length; i += 1) {
    const { text, line } = list[i];
    const t = text.trim();
    if (!t || t.startsWith('#')) continue;
    if (/^\s/.test(text)) return ok({ error: { key: 'error.setupSyntax', params: { text: t } }, line, text: t });
    let commands;
    if (t.startsWith('@content')) {
      const path = t.split(/\s+/)[1];
      const body = [];
      const indented = (k) => k < list.length && /^\s+\S/.test(list[k].text);
      const blank = (k) => k < list.length && list[k].text.trim() === '';
      const continues = (k) => {
        let j = k;
        while (blank(j)) j += 1;
        return indented(j);
      };
      while (i + 1 < list.length && continues(i + 1)) body.push(list[(i += 1)].text);
      const filled = body.filter((b) => b.trim() !== '');
      const indent = filled.length ? Math.min(...filled.map((b) => /^\s*/.exec(b)[0].length)) : 0;
      const content = body.map((b) => (b.trim() === '' ? '' : b.slice(indent))).join('\n');
      commands = [{ name: 'touch', args: [path], options: { content } }];
    } else if (t.startsWith('@')) {
      const d = directive(t);
      if (d.error) return ok({ error: d.error, line, text: t });
      if (d.transform) {
        s = d.transform(s);
        continue;
      }
      commands = d;
    } else if (parseWebAction(t)) {
      // Site actions ("approve MR !42") are accepted when replaying a pasted start ("Copy as start" emits them).
      commands = [parseWebAction(t)];
    } else {
      commands = [t];
    }
    for (const c of commands) {
      const r = apply(s, c, { lenient });
      results.push({ line, text: t, result: r });
      if (r.error) return ok({ error: r.error, line, text: t });
      s = r.state;
    }
  }
  return ok();
}

/**
 * Builds a starting state from a setup block.
 * options: { folder = 'rpt-client', repos = ['local'], conflicts = [] (parsed blocks) | conflictBlocks = [] (state entries) }
 * Returns { state, error, line, text, results } (see applySetupLines).
 */
export function runSetup(lines, { folder = 'rpt-client', repos = ['local'], conflicts = [], conflictBlocks = null } = {}) {
  const s0 = createState({ folder: folder || 'rpt-client', visibleRepos: repos && repos.length ? repos : ['local'] });
  s0.conflictBlocks = conflictBlocks ? clone(conflictBlocks) : conflictBlocksFrom(conflicts);
  return applySetupLines(s0, lines);
}
