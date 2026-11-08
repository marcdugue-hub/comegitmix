// Sandbox: pure helpers (no DOM). Palette model, argument requirements, terminal suggestions,
// history labels, raw output ("More details"), session encoding. Tested in tests/unit/sandbox.*.test.js.
import { t } from '../i18n/i18n.js';
import { parse } from '../engine/parse.js';
import { activeDesk, deskFiles, firstParentChain, ancestors, getDesk, folderName } from '../engine/state.js';
import { commandText } from '../engine/to-setup.js';
import { commitText } from '../render/screens-util.js';

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

/** Text of a palette button: the Git word(s) (site actions use an i18n label). */
export function paletteLabel(id, def = {}) {
  if (def.web) return t(`sandbox.cmd.${id}`);
  return id.startsWith('worktree-') ? id.replace('-', ' ') : id;
}

/** data/commands.json -> [{ id, labelKey, commands: [{ id, icon, web, readOnly }] }]. */
export function paletteGroups(json) {
  const defs = (json && json.commands) || {};
  return ((json && json.groups) || []).map((g) => ({
    id: g.id,
    labelKey: g.label,
    commands: g.commands.filter((c) => defs[c]).map((c) => ({ id: c, icon: defs[c].icon, web: Boolean(defs[c].web), readOnly: Boolean(defs[c].readOnly) })),
  }));
}

const q = (v) => (/[\s\u0022\u0027]/.test(v) || v === '' ? `"${String(v).replace(/\u0022/g, '\u0027')}"` : v);

/** Short label of a commit for pickers: "c4 · message". */
export function commitLabel(state, id) {
  const c = state.commits[id];
  return c ? `${id} · ${commitText(c)}` : id;
}

function otherBranches(state, desk) {
  return Object.keys(state.branches).filter((b) => b !== desk.branch).sort();
}
function remoteOnly(state) {
  return Object.keys(state.remoteRefs || {}).filter((r) => !state.branches[r.replace(/^[^/]+\//, '')]).sort();
}
function unstagedFiles(desk) {
  return deskFiles(desk).filter((f) => f.status === 'conflict' || (f.status !== 'clean' && f.work !== f.index));
}
const fileHint = (f) => t(f.status === 'conflict' ? 'letter.conflict' : f.status === 'U' ? (f.staged ? 'letter.A' : 'letter.U') : f.status === 'D' ? 'letter.D' : f.staged ? 'status.staged' : 'letter.M');

/** Folder name for a new desk on `branch` ("rapport-client" + "ia/x" -> "rapport-client-x"). */
export function deskFolderFor(state, branch) {
  const main = state.worktrees.find((w) => w.main) || state.worktrees[0];
  const base = folderName(main.path);
  const leaf = String(branch).split('/').pop().replace(/[^A-Za-z0-9._-]/g, '-');
  let name = `${base}-${leaf}`;
  for (let i = 2; state.worktrees.some((w) => w.path === name); i += 1) name = `${base}-${leaf}-${i}`;
  return name;
}

/**
 * What a palette command needs before it can run.
 * Returns { steps: [step], build(values) -> command text | command object }, where a step is
 *   { kind: 'pick', titleKey, options: [{ value, label, hint? }], emptyKey }   (choose one)
 *   { kind: 'text', labelKey, value }                                          (type a value)
 * and may have `when(values)` (asked only when it returns true). `values[i]` is the answer to step i.
 */
export function planCommand(id, state) {
  const desk = activeDesk(state);
  const head = desk && desk.head;
  const pick = (titleKey, options, emptyKey = 'sandbox.pick.none', extra = {}) => ({ kind: 'pick', titleKey, options, emptyKey, ...extra });
  const branchOpts = (list) => list.map((b) => ({ value: b, label: b, hint: state.branches[b] ? commitLabel(state, state.branches[b].tip) : t('sandbox.pick.remoteHint') }));
  const own = head ? firstParentChain(state, head) : [];
  switch (id) {
    case 'status': return { steps: [], build: () => 'git status' };
    case 'add': {
      const files = unstagedFiles(desk);
      const opts = files.map((f) => ({ value: f.path, label: f.path, hint: fileHint(f) }));
      if (files.length > 1) opts.unshift({ value: '.', label: '.', hint: t('sandbox.pick.allFiles') });
      return { steps: [pick('sandbox.pick.file', opts, 'sandbox.pick.noChange')], build: (v) => `git add ${q(v[0])}` };
    }
    case 'commit':
      return { steps: [{ kind: 'text', labelKey: 'sandbox.ask.message', value: t('sandbox.ask.defaultMessage') }], build: (v) => `git commit -m "${String(v[0]).replace(/\u0022/g, '\u0027')}"` };
    case 'stash': {
      const opts = [{ value: '', label: 'git stash', hint: t('sandbox.stash.push') }]; // i18n-ok: Git command text
      if (desk.stash.length) {
        opts.push({ value: 'pop', label: 'git stash pop', hint: t('sandbox.stash.pop') }); // i18n-ok: Git command text
        opts.push({ value: 'apply', label: 'git stash apply', hint: t('sandbox.stash.apply') }); // i18n-ok: Git command text
        opts.push({ value: 'drop', label: 'git stash drop', hint: t('sandbox.stash.drop') }); // i18n-ok: Git command text
      }
      opts.push({ value: 'list', label: 'git stash list', hint: t('sandbox.stash.list') }); // i18n-ok: Git command text
      return { steps: [pick('sandbox.pick.stash', opts)], build: (v) => (v[0] ? `git stash ${v[0]}` : 'git stash') };
    }
    case 'restore': {
      const opts = [];
      for (const f of deskFiles(desk)) {
        if (f.staged) opts.push({ value: `--staged ${q(f.path)}`, label: `--staged ${f.path}`, hint: t('sandbox.pick.unstage') }); // i18n-ok: Git command text
        if (f.status !== 'clean' && f.status !== 'conflict' && f.base !== null && f.work !== f.index) opts.push({ value: q(f.path), label: f.path, hint: t('sandbox.pick.discard') });
      }
      return { steps: [pick('sandbox.pick.file', opts, 'sandbox.pick.noChange')], build: (v) => `git restore ${v[0]}` };
    }
    case 'branch':
      return { steps: [{ kind: 'text', labelKey: 'sandbox.ask.branch', value: nextBranchName(state) }], build: (v) => `git branch ${v[0]}` };
    case 'switch': {
      const opts = branchOpts(otherBranches(state, desk));
      for (const r of remoteOnly(state)) opts.push({ value: r.replace(/^[^/]+\//, ''), label: r.replace(/^[^/]+\//, ''), hint: t('sandbox.pick.fromRemote', { ref: r }) });
      opts.push({ value: '\u0000new', label: t('sandbox.pick.newBranch'), hint: 'git switch -c' }); // i18n-ok: Git command text
      return {
        steps: [pick('sandbox.pick.branch', opts), { kind: 'text', labelKey: 'sandbox.ask.branch', value: nextBranchName(state), when: (v) => v[0] === '\u0000new' }],
        build: (v) => (v[0] === '\u0000new' ? `git switch -c ${v[1]}` : `git switch ${v[0]}`),
      };
    }
    case 'merge':
    case 'rebase': {
      const opts = branchOpts(otherBranches(state, desk));
      for (const r of Object.keys(state.remoteRefs || {}).sort()) opts.push({ value: r, label: r, hint: t('sandbox.pick.remoteHint') });
      return { steps: [pick('sandbox.pick.branch', opts, 'sandbox.pick.noBranch')], build: (v) => `git ${id} ${v[0]}` };
    }
    case 'squash': {
      const opts = [];
      for (let n = 2; n <= Math.min(own.length - 1, 6); n += 1) opts.push({ value: n, label: `HEAD~${n}`, hint: t('sandbox.pick.lastN', { n }) }); // i18n-ok: Git command text
      return { steps: [pick('sandbox.pick.howMany', opts, 'sandbox.pick.noCommits')], build: (v) => `git rebase -i HEAD~${v[0]}` };
    }
    case 'cherry-pick': {
      const mine = head ? ancestors(state, head) : new Set();
      const ids = Object.keys(state.commits).filter((c) => !mine.has(c) && state.commits[c].parents.length < 2).reverse();
      return { steps: [pick('sandbox.pick.commit', ids.map((c) => ({ value: c, label: commitLabel(state, c) })), 'sandbox.pick.noCommits')], build: (v) => `git cherry-pick ${v[0]}` };
    }
    case 'reset': {
      const opts = own.slice(1).map((c, i) => ({ value: c, label: commitLabel(state, c), hint: `HEAD~${i + 1}` })); // i18n-ok: Git command text
      const modes = ['soft', 'mixed', 'hard'].map((m) => ({ value: m, label: `--${m}`, hint: t(`sandbox.reset.${m}`) }));
      return { steps: [pick('sandbox.pick.commit', opts, 'sandbox.pick.noCommits'), pick('sandbox.pick.resetMode', modes)], build: (v) => `git reset --${v[1]} ${v[0]}` };
    }
    case 'revert': {
      const opts = own.filter((c) => state.commits[c].parents.length === 1).map((c) => ({ value: c, label: commitLabel(state, c) }));
      return { steps: [pick('sandbox.pick.commit', opts, 'sandbox.pick.noCommits')], build: (v) => `git revert ${v[0]}` };
    }
    case 'fork': return { steps: [], build: () => 'fork' };
    case 'fetch': return { steps: [], build: () => 'git fetch' };
    case 'pull': return { steps: [], build: () => 'git pull' };
    case 'push': {
      const b = desk.branch && state.branches[desk.branch];
      return { steps: [], build: () => (b && !b.upstream ? `git push -u origin ${desk.branch}` : 'git push') };
    }
    case 'mr-approve':
    case 'mr-merge': {
      const want = id === 'mr-approve' ? ['open'] : ['approved', 'open'];
      const opts = [];
      for (const r of Object.values(state.remotes || {})) for (const mr of r.mrs || []) if (want.includes(mr.status)) opts.push({ value: mr.id, label: `!${mr.id} · ${mr.titleKey ? t(mr.titleKey, mr.titleParams || {}) : mr.title}`, hint: t(`mr.status.${mr.status}`) });
      return { steps: [pick('sandbox.pick.mr', opts, 'sandbox.pick.noMr')], build: (v) => ({ name: 'mr', args: [id === 'mr-approve' ? 'approve' : 'merge', v[0]], options: {} }) };
    }
    case 'worktree-add': {
      const free = Object.keys(state.branches).filter((b) => !state.worktrees.some((w) => w.branch === b)).sort();
      const opts = free.map((b) => ({ value: b, label: b, hint: `../${deskFolderFor(state, b)}` }));
      opts.push({ value: '\u0000new', label: t('sandbox.pick.newBranch'), hint: '-b' }); // i18n-ok: Git command text
      return {
        steps: [pick('sandbox.pick.branch', opts), { kind: 'text', labelKey: 'sandbox.ask.branch', value: nextBranchName(state, 'ia/'), when: (v) => v[0] === '\u0000new' }],
        build: (v) => (v[0] === '\u0000new' ? `git worktree add ../${deskFolderFor(state, v[1])} -b ${v[1]}` : `git worktree add ../${deskFolderFor(state, v[0])} ${v[0]}`),
      };
    }
    case 'worktree-list': return { steps: [], build: () => 'git worktree list' };
    case 'worktree-remove': {
      const opts = state.worktrees.filter((w) => !w.main).map((w) => ({ value: w.path, label: `../${w.path}`, hint: w.branch || '' }));
      return { steps: [pick('sandbox.pick.desk', opts, 'sandbox.pick.noDesk')], build: (v) => `git worktree remove ../${v[0]}` };
    }
    case 'diff': {
      const opts = [{ value: 'git diff', label: 'git diff', hint: t('sandbox.diff.work') }, { value: 'git diff --staged', label: 'git diff --staged', hint: t('sandbox.diff.staged') }]; // i18n-ok: Git command text
      const from = desk.branch || 'HEAD';
      for (const b of otherBranches(state, desk)) opts.push({ value: `git diff ${from} ${b}`, label: `git diff ${from} ${b}`, hint: t('sandbox.diff.branches') }); // i18n-ok: Git command text
      return { steps: [pick('sandbox.pick.diff', opts)], build: (v) => v[0] };
    }
    case 'log': return { steps: [], build: () => 'git log' };
    case 'blame': {
      const opts = deskFiles(desk).filter((f) => f.base !== null).map((f) => ({ value: f.path, label: f.path }));
      return { steps: [pick('sandbox.pick.file', opts, 'sandbox.pick.noFile')], build: (v) => `git blame ${q(v[0])}` };
    }
    default: return null;
  }
}

/** Steps actually asked given the answers so far (filters `when`). */
export function activeSteps(plan, values = []) {
  return plan.steps.filter((s) => !s.when || s.when(values));
}

/** A branch name not used yet: "<prefix>idea", "<prefix>idea-2"… */
export function nextBranchName(state, prefix = 'feature/') {
  const base = `${prefix}${t('sandbox.ask.branchWord')}`.replace(/[^A-Za-z0-9._/-]/g, '-');
  let name = base;
  for (let i = 2; state.branches[name]; i += 1) name = `${base}-${i}`;
  return name;
}

// ---------------------------------------------------------------------------
// Terminal suggestions (Tab completion): whole lines
// ---------------------------------------------------------------------------

export const GIT_WORDS = ['status', 'add', 'commit', 'restore', 'rm', 'stash', 'branch', 'switch', 'checkout', 'merge', 'rebase', 'cherry-pick', 'reset', 'revert', 'worktree', 'diff', 'log', 'blame', 'show', 'fetch', 'pull', 'push', 'remote'];
export const SHELL_WORDS = ['cd', 'ls', 'clear', 'help', 'fork', 'rm'];
const OPTIONS = {
  commit: ['-m', '-am', '--amend'], add: ['.', '-A'], restore: ['--staged'], branch: ['-d', '-D'], switch: ['-c', '--detach'],
  checkout: ['-b'], merge: ['--no-ff', '--abort', '--continue'], rebase: ['-i', '--continue', '--abort'], reset: ['--soft', '--mixed', '--hard'],
  diff: ['--staged'], log: ['--oneline', '--graph'], push: ['-u', '--force-with-lease'], stash: ['push', 'pop', 'apply', 'drop', 'list'],
  worktree: ['add', 'list', 'remove', 'prune'], 'cherry-pick': ['--continue', '--abort'], revert: ['--continue', '--abort'],
};

/** Candidates for the word being typed after `git <sub> …`. */
function argCandidates(state, sub, words) {
  const desk = activeDesk(state);
  const files = desk ? deskFiles(desk) : [];
  const branches = Object.keys(state.branches).sort();
  const refs = Object.keys(state.remoteRefs || {}).sort();
  const commits = desk && desk.head ? firstParentChain(state, desk.head).slice(0, 6) : [];
  const opts = OPTIONS[sub] || [];
  switch (sub) {
    case 'add': return [...opts, ...unstagedFiles(desk).map((f) => f.path)];
    case 'restore': return [...opts, ...files.filter((f) => f.status !== 'clean').map((f) => f.path)];
    case 'rm': case 'blame': return files.map((f) => f.path);
    case 'switch': case 'checkout': case 'merge': case 'rebase': return [...opts, ...branches.filter((b) => b !== desk.branch), ...refs];
    case 'branch': return [...opts, ...branches];
    case 'cherry-pick': return [...opts, ...Object.keys(state.commits).reverse()];
    case 'reset': case 'revert': case 'show': return [...opts, 'HEAD~1', ...commits];
    case 'diff': return [...opts, ...branches, ...refs];
    case 'push': case 'pull': case 'fetch': return [...opts, 'origin', ...branches];
    case 'worktree':
      if (words[0] === 'remove') return state.worktrees.filter((w) => !w.main).map((w) => `../${w.path}`);
      if (words[0] === 'add') return words.length >= 2 ? ['-b', ...branches] : [`../${deskFolderFor(state, 'ia/new')}`];
      return opts;
    default: return opts;
  }
}

/** Completion lines for the text typed so far (for the terminal's suggest option). */
export function suggestLines(text, state, max = 6) {
  const raw = String(text || '');
  if (!raw.trim()) return [];
  const endsWithSpace = /\s$/.test(raw);
  const tokens = raw.trim().split(/\s+/);
  const current = endsWithSpace ? '' : tokens.pop();
  const before = tokens;
  const prefix = before.length ? `${before.join(' ')} ` : '';
  let candidates;
  if (!before.length) candidates = ['git', ...SHELL_WORDS, 'help'].map((w) => (w === 'git' ? 'git ' : w));
  else if (before[0] === 'git' && before.length === 1) candidates = GIT_WORDS;
  else if (before[0] === 'git') candidates = argCandidates(state, before[1], before.slice(2));
  else if (before[0] === 'cd') candidates = state.worktrees.filter((w) => w.id !== state.active).map((w) => `../${w.path}`);
  else if (before[0] === 'help') candidates = GIT_WORDS;
  else if (before[0] === 'rm') candidates = argCandidates(state, 'rm', []);
  else candidates = [];
  const out = [];
  for (const c of candidates) {
    if (!c.startsWith(current) || (c === current && !endsWithSpace && before.length)) continue;
    const line = `${prefix}${c}`;
    if (line.trim() !== raw.trim() && !out.includes(line)) out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// History labels and icons
// ---------------------------------------------------------------------------

const ICON_BY_NAME = {
  status: 'list-checks', add: 'plus-square', commit: 'camera', stash: 'archive', restore: 'undo-2', rm: 'x', branch: 'git-branch',
  switch: 'arrow-right-left', checkout: 'arrow-right-left', merge: 'git-merge', rebase: 'move-horizontal', 'cherry-pick': 'cherry',
  reset: 'rotate-ccw', revert: 'history', fork: 'git-fork', fetch: 'download-cloud', pull: 'arrow-down-to-line', push: 'arrow-up-from-line',
  worktree: 'folder-plus', diff: 'diff', log: 'scroll-text', blame: 'user-search', show: 'eye', cd: 'folder-open', touch: 'file-text',
  click: 'file-text', create: 'file-plus', resolve: 'check', ai: 'star', assistant: 'star', 'ai-mr': 'git-pull-request-arrow',
  colleague: 'users', mr: 'badge-check', publish: 'cloud',
};

/** Icon name for a command (text or object). */
export function commandIcon(command) {
  const c = typeof command === 'string' ? parse(command) : command;
  if (!c || c.error) return 'terminal';
  if (c.name === 'sequence') return commandIcon(c.commands[0]);
  return ICON_BY_NAME[c.name] || 'terminal';
}

/** Readable one-line text of a history entry. Scene actions get a sentence; commands their text. */
export function historyText(command, state = null) {
  if (typeof command === 'string') return command;
  const a = command.args || [];
  const deskName = (ref) => {
    const d = state && ref ? getDesk(state, ref) : null;
    return d ? d.path : ref || '';
  };
  switch (command.name) {
    case 'click': case 'touch': return t('sandbox.hist.click', { file: a.length > 1 ? a[1] : a[0], folder: deskName(a.length > 1 ? a[0] : null) });
    case 'create': return t('sandbox.hist.create', { folder: deskName(a[0]) });
    case 'resolve': return t('sandbox.hist.resolve', { file: a.length > 2 ? a[1] : a[0], side: t(`sandbox.side.${a.length > 2 ? a[2] : a[1]}`) });
    case 'ai': return t(command.options && command.options.commit === false ? 'sandbox.hist.aiNoCommit' : 'sandbox.hist.ai', { folder: deskName(a[0]) });
    case 'assistant': return t('sandbox.hist.assistant');
    case 'ai-mr': return t('sandbox.hist.aiMr', { folder: deskName(a[0]) });
    case 'colleague': return t('sandbox.hist.colleague', { branch: a[0] || 'main' });
    case 'mr': return t(`sandbox.hist.mr.${a[0]}`, { id: a[1] });
    case 'publish': return t('sandbox.hist.publish', { name: a[0] || 'origin' });
    default: {
      const text = commandText(command);
      return command.desk ? `${text} (${deskName(command.desk)})` : text;
    }
  }
}

// ---------------------------------------------------------------------------
// Raw output ("More details"): [{ text, hl? }] lines, hl = scene highlight for hover
// ---------------------------------------------------------------------------

const STATUS_WORD = { M: 'sandbox.out.modified', U: 'sandbox.out.newFile', D: 'sandbox.out.deleted', conflict: 'sandbox.out.bothModified' };

export function outputLines(output, state) {
  if (!output) return [];
  const L = [];
  const line = (text, hl) => L.push(hl ? { text, hl } : { text });
  switch (output.kind) {
    case 'status': {
      const desk = getDesk(state, output.desk);
      line(output.detached ? t('sandbox.out.detached', { id: output.head }) : t('sandbox.out.onBranch', { branch: output.branch }), output.branch ? { branches: [output.branch] } : null);
      const fileHl = (p) => ({ files: [{ desk: desk ? desk.id : output.desk, path: p }] });
      const staged = output.files.filter((f) => f.staged && f.status !== 'conflict');
      const conflicts = output.files.filter((f) => f.status === 'conflict');
      const unstaged = output.files.filter((f) => !f.staged && f.status !== 'U' && f.status !== 'conflict');
      const untracked = output.files.filter((f) => f.status === 'U' && !f.staged);
      if (staged.length) { line(t('sandbox.out.staged')); for (const f of staged) line(`    ${t(STATUS_WORD[f.status] || STATUS_WORD.M)}  ${f.path}`, fileHl(f.path)); }
      if (conflicts.length) { line(t('sandbox.out.conflicts')); for (const f of conflicts) line(`    ${t(STATUS_WORD.conflict)}  ${f.path}`, fileHl(f.path)); }
      if (unstaged.length) { line(t('sandbox.out.unstaged')); for (const f of unstaged) line(`    ${t(STATUS_WORD[f.status] || STATUS_WORD.M)}  ${f.path}`, fileHl(f.path)); }
      if (untracked.length) { line(t('sandbox.out.untracked')); for (const f of untracked) line(`    ${f.path}`, fileHl(f.path)); }
      if (!output.files.length) line(t('sandbox.out.clean'));
      break;
    }
    case 'log':
      for (const c of output.commits) {
        const ai = c.author === 'ai' ? ` [${t('log.author.ai')}]` : '';
        line(`${c.id}${ai} ${commitText(c)}`, { commits: [c.id] });
      }
      break;
    case 'worktrees':
      for (const w of output.worktrees) line(`../${w.path}  ${w.head || '-'}  [${w.branch || t('desk.detached')}]`, { desks: [w.id] });
      break;
    case 'branches':
      for (const b of output.branches) line(`${b.current ? '*' : ' '} ${b.name}  ${b.tip}`, { branches: [b.name] });
      break;
    case 'stash':
      if (!output.entries.length) line(t('sandbox.out.noStash'));
      for (const e of output.entries) line(`${e.ref}: ${e.branch || ''} ${e.msg || ''}`.trim());
      break;
    case 'blame':
      for (const l of output.lines) line(`${l.commit} (${t(l.author === 'ai' ? 'log.author.ai' : 'log.author.human')}) ${l.n}) ${l.text}`, { commits: [l.commit] });
      break;
    case 'show':
      line(`${output.commit.id} ${commitText(output.commit)}`, { commits: [output.commit.id] });
      for (const f of output.files) line(`    ${f.letter}  ${f.path}`);
      break;
    case 'ls':
      for (const e of output.entries) line(e.kind === 'dir' ? `${e.path}/` : e.path);
      break;
    case 'remotes':
      for (const r of output.remotes) line(`${r.name}  ${r.branches.join(', ')}`);
      break;
    case 'diff':
      for (const f of output.files) line(`${f.letter}  ${f.path}  +${f.adds} -${f.dels}`);
      break;
    default:
      break;
  }
  return L;
}

// ---------------------------------------------------------------------------
// Session: the start reference stored in progress (string) and AI text
// ---------------------------------------------------------------------------

/** { kind: 'start'|'paste'|'mission', id?, text? } -> string stored in progress.sandbox.start. */
export function encodeStart(src) {
  if (!src) return null;
  if (src.kind === 'paste') return `paste:${src.text}`;
  if (src.kind === 'mission') return `mission:${src.id}`;
  return src.id;
}

/** Inverse of encodeStart. */
export function decodeStart(value) {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('paste:')) return { kind: 'paste', text: value.slice(6) };
  if (value.startsWith('mission:')) return { kind: 'mission', id: value.slice(8) };
  return { kind: 'start', id: value };
}

/** Commands safe to store (JSON): strings as is, objects without parser leftovers. */
export function storableCommands(commands) {
  return commands.map((c) => {
    if (typeof c === 'string') return c;
    const { raw, ...rest } = c;
    return JSON.parse(JSON.stringify(rest));
  });
}

/** "a", "a and b", "a, b and c" in the UI language. */
export function joinFiles(files) {
  const list = [...files];
  if (list.length < 2) return list.join('');
  const last = list.pop();
  return `${list.join(', ')} ${t('sandbox.and')} ${last}`;
}

/** What the AI did: the generic text number `index` with {files} filled in. */
export function aiText(items, index, files) {
  if (!items || !items.length) return '';
  const item = items[((index % items.length) + items.length) % items.length];
  const text = typeof item === 'string' ? item : item.text;
  return text.replace(/\{files\}/g, joinFiles(files));
}

/** Text of an engine message ({ key, params }) — params that are themselves messages are translated. */
export function say(m) {
  return m ? t(m.key, m.params) : '';
}
