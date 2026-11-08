// "Copy as start" (docs/SANDBOX.md §9, docs/AUTHORING.md §6): command history -> ```git-setup block.
// Pure. The commands are replayed from `start` to know what each scene action did (a click can mean
// "I edited it", git add or git restore; the AI picks its files), then each one is written as setup lines.
//
//   toSetup({ start, startLines = [], commands = [] }) -> { text, block, lines, skipped }
//     start       state the history starts from (the chosen sandbox start, already set up)
//     startLines  the setup lines of that start (strings or { text }), copied first
//     commands    successful commands in order (text or command objects, as given to apply)
//   text  = the lines joined with "\n"; block = text wrapped in ```git-setup fences;
//   skipped = indexes of commands that could not be expressed exactly (written as a # comment).

import { apply } from './apply.js';
import { parse } from './parse.js';
import { getDesk, activeDesk, findFile } from './state.js';

const SHORT_VALUE = new Set(['m', 'b', 'B', 'c', 'C', 'n']);

function quote(v) {
  const s = String(v);
  return /[\s"'&]/.test(s) || s === '' ? `"${s.replace(/"/g, "'")}"` : s;
}

/** Command object -> terminal text ("git commit -m \"x\""). */
export function commandText(c) {
  if (typeof c === 'string') return c.trim();
  if (c.text) return c.text;
  const parts = [];
  for (const [k, v] of Object.entries(c.options || {})) {
    if (k === '--' || k === 'plan' || v === false || v == null) continue;
    if (k.length === 1) parts.push(v === true ? `-${k}` : `-${k} ${quote(v)}`);
    else if (k === 'staged') parts.push('--staged');
    else parts.push(v === true ? `--${k}` : `--${k}=${quote(v)}`);
  }
  const args = (c.args || []).map(quote);
  const dashdash = c.options && c.options['--'] ? ['--'] : [];
  const shell = ['cd', 'fork', 'ls', 'help', 'clear'].includes(c.name) || c.git === false;
  return [shell ? c.name : `git ${c.name}`, ...parts, ...dashdash, ...args].join(' ');
}

function indent(content) {
  return String(content).split('\n').map((l) => `  ${l}`);
}

function targetDesk(state, c) {
  if (c.desk) return getDesk(state, c.desk);
  const a = c.args || [];
  const twoArgs = { touch: 2, click: 2, resolve: 3, create: 2 }[c.name];
  if (twoArgs && a.length >= twoArgs) return getDesk(state, a[0]);
  if ((c.name === 'ai' || c.name === 'ai-mr') && a[0]) return getDesk(state, a[0]);
  if (c.name === 'create' && a.length === 1) {
    const d = state.worktrees.find((w) => w.id === a[0] || w.path === a[0]);
    if (d) return d;
  }
  return activeDesk(state);
}

function pathArg(c) {
  const a = c.args || [];
  const n = { touch: 2, click: 2, resolve: 3 }[c.name];
  return a.length >= n ? a[1] : a[0];
}

/** Setup lines for one successful command, given the states before and after. */
function linesFor(c, before, result, skip) {
  const after = result.state;
  const desk = targetDesk(before, c);
  const deskAfter = desk && getDesk(after, desk.id);
  switch (c.name) {
    case 'touch': {
      const p = pathArg(c);
      if (typeof (c.options || {}).content === 'string') return ['@content ' + p, ...indent(c.options.content)];
      return [`@work ${p}`];
    }
    case 'create': {
      const p = result.output && result.output.path;
      if ((c.options || {}).status === 'clean') return [`@files ${p}`];
      if (typeof (c.options || {}).content === 'string') return [`@content ${p}`, ...indent(c.options.content)];
      return [`@new ${p}`];
    }
    case 'click': {
      const eq = result.equivalent || {};
      if (eq.command) return [eq.command];
      return [`@work ${pathArg(c)}`];
    }
    case 'resolve': {
      const p = pathArg(c);
      const f = deskAfter && findFile(deskAfter, p);
      const r = f && f.conflict ? f.conflict.resolved : null;
      if (r === 'ours' || r === 'theirs') return [`git checkout --${r} ${p}`];
      return [`git checkout --ours ${p}`, `@content ${p}`, ...indent(f ? f.work : '')];
    }
    case 'ai': {
      const out = result.output || {};
      const lines = before.author === 'ai' ? [] : ['@author ai'];
      for (const p of out.files || []) lines.push(findFile(desk, p) ? `@work ${p}` : `@new ${p}`);
      if (out.commit) {
        lines.push(`git add ${(out.files || []).join(' ')}`);
        const msg = (c.options || {}).message;
        lines.push(msg ? `git commit -m ${quote(msg)}` : 'git commit');
      }
      if (before.author !== 'ai') lines.push(`@author ${before.author || 'human'}`);
      return lines;
    }
    case 'assistant': {
      const added = after.worktrees.find((w) => !before.worktrees.some((x) => x.id === w.id));
      const ev = (result.events || []).find((e) => e.type === 'ai.worked') || {};
      const lines = [`git worktree add ../${added.path} -b ${added.branch}`, '@author ai'];
      for (const p of ev.files || []) lines.push(`@work ${p}`);
      lines.push(`git add ${(ev.files || []).join(' ')}`);
      const msg = (c.options || {}).message;
      lines.push(msg ? `git commit -m ${quote(msg)}` : 'git commit');
      lines.push(`@author ${before.author || 'human'}`);
      return lines;
    }
    case 'ai-mr': {
      const mr = (after.remotes.origin.mrs || []).find((m) => !(before.remotes.origin.mrs || []).some((x) => x.id === m.id));
      return [`git push -u origin ${desk.branch}`, `@mr ${mr.id} ${mr.source} -> ${mr.target} ${quote(mr.title || mr.source)}`];
    }
    case 'colleague': {
      const ev = (result.events || []).find((e) => e.type === 'colleague.pushed') || {};
      const msg = (c.options || {}).message || '';
      return [`@colleague ${c.args[0] || 'main'} ${quote(msg)} files=${(ev.files || []).join(',')}`];
    }
    case 'mr': {
      const [action, id] = c.args;
      if (action === 'open') {
        const mr = (after.remotes.origin.mrs || []).find((m) => !(before.remotes.origin.mrs || []).some((x) => x.id === m.id));
        return [`@mr ${mr.id} ${mr.source} -> ${mr.target} ${quote(mr.title || mr.source)}${mr.comments ? ` comments=${mr.comments}` : ''}`];
      }
      if (action === 'approve' || action === 'merge') return [`${action} MR !${id}`];
      skip();
      return [`# mr ${action} !${id}`];
    }
    case 'publish': return [`@remote ${c.args[0] || 'origin'}`];
    case 'online-only': return [`@online-only ${c.args[0]}`];
    case 'ls': case 'help': case 'clear': return [];
    case 'rebase': {
      const plan = (c.options || {}).plan;
      const text = commandText({ ...c, options: { ...c.options, plan: undefined } });
      if (!plan) return [text];
      const actions = plan.map((p) => (typeof p === 'string' ? p : p.action));
      const ordered = plan.every((p) => typeof p === 'string') || (() => {
        const ev = (result.events || []).find((e) => e.type === 'rebase.done');
        const old = ev ? ev.from : [];
        return plan.every((p, i) => p.id === old[i] && p.msg === undefined);
      })();
      if (!ordered) skip();
      return [`@rebase-plan ${actions.join(',')}`, text];
    }
    default:
      return [commandText(c)];
  }
}

export function toSetup({ start, startLines = [], commands = [] } = {}) {
  const lines = startLines.map((l) => (typeof l === 'string' ? l : l.text));
  const skipped = [];
  let state = start;
  commands.forEach((raw, index) => {
    const parsed = typeof raw === 'string' ? parse(raw) : raw;
    const list = parsed.name === 'sequence' ? parsed.commands : [parsed];
    for (const c of list) {
      const before = state;
      const r = apply(before, c);
      if (r.error) {
        skipped.push(index);
        lines.push(`# ${commandText(c)}`);
        continue;
      }
      const target = targetDesk(before, c);
      const here = activeDesk(before);
      const away = target && here && target.id !== here.id && !['cd', 'worktree', 'assistant'].includes(c.name);
      if (away) lines.push(`@cd ${target.path}`);
      lines.push(...linesFor(c, before, r, () => skipped.push(index)));
      if (away && getDesk(r.state, here.id) && r.state.active === here.id) lines.push(`@cd ${here.path}`);
      state = r.state;
    }
  });
  const text = lines.join('\n');
  return { text, block: `\`\`\`git-setup\n${text}\n\`\`\``, lines, skipped };
}
