// "git …" text -> { name, args, options, raw, text }.
// Unknown or misspelled commands -> { error: { key, params: { input, suggestion } } }.

/** Git subcommands the game knows (handlers may live in other modules, e.g. remote.js). */
const GIT_COMMANDS = new Set([
  'status', 'add', 'commit', 'restore', 'stash', 'branch', 'switch', 'checkout', 'merge', 'rebase',
  'cherry-pick', 'reset', 'revert', 'worktree', 'diff', 'log', 'blame', 'show', 'rm',
  'fetch', 'pull', 'push', 'remote', 'init',
]);

/** Real Git commands the game deliberately does not simulate (clear message). */
const OUT_OF_SCOPE = new Set(['clone', 'tag', 'submodule', 'config', 'gc', 'reflog', 'bisect', 'mv', 'clean']);

/** `glab mr <action>` (GitLab's command line): actions the game simulates. */
const GLAB_MR_ACTIONS = new Set(['create', 'list', 'view', 'approve', 'merge', 'close']);
/** glab options -> option names of the `mr` command. Value options take the next word. */
const GLAB_OPTIONS = {
  s: 'source', 'source-branch': 'source', b: 'target', 'target-branch': 'target', t: 'title', title: 'title',
  d: 'description', description: 'description', f: 'fill', fill: 'fill', y: 'yes', yes: 'yes', push: 'push',
};
const GLAB_VALUES = new Set(['source', 'target', 'title', 'description']);

/** Words accepted without the `git` prefix (shell and site actions). */
const SHELL_COMMANDS = new Set(['cd', 'ls', 'clear', 'help', '?', 'rm', 'fork']);

/** Short options that take a value: -m "msg", -b name, -c name… */
const VALUE_SHORT = new Set(['m', 'b', 'B', 'c', 'C', 'n']);
/** Long options that take a value when written `--name value`. */
const VALUE_LONG = new Set(['message', 'onto']);
const LONG_ALIAS = { message: 'm', cached: 'staged' };

export function addKnownCommand(name, { git = true } = {}) {
  (git ? GIT_COMMANDS : SHELL_COMMANDS).add(name);
}

export function knownCommands() {
  return { git: [...GIT_COMMANDS], shell: [...SHELL_COMMANDS], outOfScope: [...OUT_OF_SCOPE] };
}

const QUOTES = { '"': '"', "'": "'", '“': '”', '‘': '’', '«': '»' };

/** Splits a line into tokens; quotes group words; `&&` is its own token. */
export function tokenize(text) {
  const tokens = [];
  let cur = '';
  let has = false;
  let i = 0;
  const s = String(text);
  while (i < s.length) {
    const ch = s[i];
    if (QUOTES[ch]) {
      const close = QUOTES[ch];
      const end = s.indexOf(close, i + 1);
      const stop = end === -1 ? s.length : end;
      cur += s.slice(i + 1, stop);
      has = true;
      i = stop + 1;
      continue;
    }
    if (ch === '&' && s[i + 1] === '&') {
      if (has) tokens.push(cur);
      tokens.push('&&');
      cur = '';
      has = false;
      i += 2;
      continue;
    }
    if (/\s/.test(ch)) {
      if (has) tokens.push(cur);
      cur = '';
      has = false;
      i += 1;
      continue;
    }
    cur += ch;
    has = true;
    i += 1;
  }
  if (has) tokens.push(cur);
  return tokens;
}

export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Closest known name within a small distance, or null. */
export function closest(word, candidates) {
  const w = String(word).toLowerCase();
  let best = null;
  let bestD = Infinity;
  for (const c of [...candidates].sort()) {
    const dist = editDistance(w, c);
    if (dist < bestD) {
      best = c;
      bestD = dist;
    }
  }
  const max = w.length <= 4 ? 1 : 2;
  return bestD <= max ? best : null;
}

function parseOptions(tokens) {
  const args = [];
  const options = {};
  let rest = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (rest || t === '-' || !t.startsWith('-')) {
      args.push(t);
      continue;
    }
    if (t === '--') {
      rest = true;
      options['--'] = true;
      continue;
    }
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      let key = eq === -1 ? t.slice(2) : t.slice(2, eq);
      let value = eq === -1 ? true : t.slice(eq + 1);
      if (eq === -1 && VALUE_LONG.has(key) && i + 1 < tokens.length) {
        value = tokens[i + 1];
        i += 1;
      }
      key = LONG_ALIAS[key] || key;
      options[key] = value;
      continue;
    }
    const flags = t.slice(1);
    for (let k = 0; k < flags.length; k += 1) {
      const f = flags[k];
      if (VALUE_SHORT.has(f)) {
        const inline = flags.slice(k + 1);
        if (inline) options[f] = inline;
        else if (i + 1 < tokens.length) {
          options[f] = tokens[i + 1];
          i += 1;
        } else options[f] = '';
        break;
      }
      options[f] = true;
    }
  }
  return { args, options };
}

/** `glab mr create -t "x" --fill`, `glab mr approve 42`… -> { name: 'mr', args: [action, ref?], options, cli: 'glab' }. */
function parseGlab(rest, tokens, text) {
  const [sub, action, ...more] = rest;
  if (!sub) return { error: { key: 'error.glabMissing', params: {} } };
  if (sub.toLowerCase() !== 'mr') return { error: { key: 'error.glabOnlyMr', params: { sub } } };
  if (!action) return { error: { key: 'error.glabMissingAction', params: {} } };
  const act = action.toLowerCase();
  if (!GLAB_MR_ACTIONS.has(act)) {
    const s = closest(act, GLAB_MR_ACTIONS);
    return unknown(text, s ? ['glab', 'mr', s, ...more].join(' ') : null);
  }
  const args = [act];
  const options = {};
  for (let i = 0; i < more.length; i += 1) {
    const tok = more[i];
    const m = /^--?([a-z-]+)(?:=(.*))?$/.exec(tok);
    if (!m || /^-\d/.test(tok)) { args.push(/^!?\d+$/.test(tok) ? Number(tok.replace('!', '')) : tok); continue; }
    const key = GLAB_OPTIONS[m[1]];
    if (!key) return { error: { key: 'error.glabOption', params: { option: tok } } };
    if (GLAB_VALUES.has(key)) {
      if (m[2] !== undefined) options[key] = m[2];
      else if (i + 1 < more.length) { options[key] = more[i + 1]; i += 1; }
      else options[key] = '';
    } else options[key] = m[2] === undefined ? true : m[2] !== 'false';
  }
  return { name: 'mr', args, options, git: false, cli: 'glab', raw: tokens, text };
}

/** gh options -> option names of the `gh` command. Value options take the next word. */
const GH_OPTIONS = {
  s: 'source', source: 'source', public: 'public', private: 'private', internal: 'internal', push: 'push',
  r: 'remote', remote: 'remote', d: 'description', description: 'description',
};
const GH_VALUES = new Set(['source', 'remote', 'description']);

/** `gh repo create [name] --public --source=. --push` (GitHub's command line) -> { name: 'gh', args, options, cli: 'gh' }. */
function parseGh(rest, tokens, text) {
  const [sub, action, ...more] = rest;
  if (!sub || String(sub).toLowerCase() !== 'repo' || !action || String(action).toLowerCase() !== 'create') {
    return { error: { key: 'error.ghOnlyRepoCreate', params: {} } };
  }
  const args = ['repo', 'create'];
  const options = {};
  for (let i = 0; i < more.length; i += 1) {
    const tok = more[i];
    const m = /^--?([a-z-]+)(?:=(.*))?$/.exec(tok);
    if (!m) { args.push(tok); continue; }
    const key = GH_OPTIONS[m[1]];
    if (!key) return { error: { key: 'error.ghOption', params: { option: tok } } };
    if (GH_VALUES.has(key)) {
      if (m[2] !== undefined) options[key] = m[2];
      else if (i + 1 < more.length) { options[key] = more[i + 1]; i += 1; }
      else options[key] = '';
    } else options[key] = true;
  }
  return { name: 'gh', args, options, git: false, cli: 'gh', raw: tokens, text };
}

function unknown(input, suggestion) {
  return {
    error: {
      key: suggestion ? 'error.unknownCommand.suggest' : 'error.unknownCommand',
      params: { input, suggestion: suggestion || '' },
    },
  };
}

function parseTokens(tokens, text) {
  if (!tokens.length) return { error: { key: 'error.emptyCommand', params: {} } };
  const [first, ...rest] = tokens;
  const word = first.toLowerCase();
  if (word === 'git') {
    if (!rest.length) return { error: { key: 'error.missingSubcommand', params: {} } };
    const sub = rest[0].toLowerCase();
    if (OUT_OF_SCOPE.has(sub)) return { error: { key: `error.outOfScope.${sub}`, params: { name: sub } } };
    if (!GIT_COMMANDS.has(sub)) {
      const s = closest(sub, GIT_COMMANDS);
      return unknown(text, s ? ['git', s, ...rest.slice(1)].join(' ') : null);
    }
    const { args, options } = parseOptions(rest.slice(1));
    return { name: sub, args, options, git: true, raw: tokens, text };
  }
  if (word === 'glab') return parseGlab(rest, tokens, text);
  if (word === 'gh') return parseGh(rest, tokens, text);
  if (SHELL_COMMANDS.has(word)) {
    const { args, options } = parseOptions(rest);
    return { name: word === '?' ? 'help' : word, args, options, git: false, raw: tokens, text };
  }
  if (GIT_COMMANDS.has(word)) return unknown(text, ['git', word, ...rest].join(' '));
  const s = closest(word, GIT_COMMANDS);
  if (s) return unknown(text, ['git', s, ...rest].join(' '));
  const sh = closest(word, SHELL_COMMANDS);
  return unknown(text, sh ? [sh, ...rest].join(' ') : null);
}

/** Parses one command. `a && b` is returned as { name: 'sequence', commands: [...] }. */
export function parse(text) {
  const all = parseLine(text);
  if (all.length === 1) return all[0];
  const bad = all.find((c) => c.error);
  if (bad) return bad;
  return { name: 'sequence', commands: all, args: [], options: {}, text: String(text).trim() };
}

/** Parses a line that may chain commands with `&&`. Returns an array (each item may carry `error`). */
export function parseLine(text) {
  const tokens = tokenize(String(text).trim());
  const groups = [[]];
  for (const t of tokens) {
    if (t === '&&') groups.push([]);
    else groups[groups.length - 1].push(t);
  }
  const parts = String(text).split('&&').map((p) => p.trim());
  return groups.map((g, i) => parseTokens(g, parts[i] !== undefined ? parts[i] : g.join(' ')));
}
