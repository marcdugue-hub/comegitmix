// Sandbox screen (#/sandbox, docs/SANDBOX.md): left panel (start, terminal, what just happened, palette,
// history, undo / redo / reset, details, copy / paste a start) and the scene (render/scene.js).
// Every action, typed, clicked in the palette or done in the scene, goes through the store (src/store.js)
// and shows its Git command in the terminal. The session (start + commands) is saved in progress.
import { t, getLang } from '../i18n/i18n.js';
import { registerScreen, replace } from '../router.js';
import { apply } from '../engine/apply.js';
import { parse } from '../engine/parse.js';
import { activeDesk, getDesk, findFile, isAncestor, resolveRev, commitsBetween } from '../engine/state.js';
import { toSetup, commandText } from '../engine/to-setup.js';
import { createStore } from '../store.js';
import { renderScene } from '../render/scene.js';
import { openDiffScreen } from '../render/diff-screen.js';
import { openConflictScreen } from '../render/conflict-screen.js';
import { renderLog } from '../render/log-view.js';
import { commitText, esc } from '../render/screens-util.js';
import { createTerminal } from './terminal.js';
import { openPicker } from './pickers.js';
import { openPopover, showToast, closeActiveLayer } from './popovers.js';
import { openRebaseEditor } from './rebase-editor.js';
import { icon } from './icons.js';
import {
  paletteGroups, paletteLabel, planCommand, suggestLines, commandIcon, historyText, outputLines, encodeStart, decodeStart,
  storableCommands, aiText, say, deskFolderFor,
} from './sandbox-model.js';
import { buildStart } from './sandbox-starts.js';

// ---- small DOM helpers ----
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children);
  return node;
}
const svg = (name, opts) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = icon(name, opts);
  return tpl.content.firstChild;
};
const button = (cls, label, onClick, attrs = {}) => {
  const b = el('button', { type: 'button', class: cls, ...attrs }, label);
  b.addEventListener('click', onClick);
  return b;
};
const q = (v) => (/[\s\u0022\u0027]/.test(v) ? `"${v}"` : v);
const hasKey = (key) => t(key) !== key;

// ---- module cache: keeps the store (and its redo list) across re-mounts (language switch) ----
let cache = null;
let detailsOn = false;
let commandsJson = null;
const aiCache = new Map();

async function loadCommandsJson() {
  if (commandsJson) return commandsJson;
  try {
    const res = await fetch('data/commands.json');
    commandsJson = res.ok ? await res.json() : { groups: [], commands: {} };
  } catch {
    commandsJson = { groups: [], commands: {} };
  }
  return commandsJson;
}

async function loadAiItems(loader, lang) {
  if (aiCache.has(lang)) return aiCache.get(lang);
  let items = [];
  try {
    items = (await loader.loadAiWork(lang)).data.items;
  } catch {
    items = [];
  }
  aiCache.set(lang, items);
  return items;
}

/** The state as drawn: the "Show online repositories" toggle decides which repository cards appear. */
export function displayState(state, showOnline) {
  const remotes = Object.keys(state.remotes || {});
  const show = showOnline === null || showOnline === undefined ? remotes.length > 0 || (state.visibleRepos || []).length > 1 : showOnline;
  const visibleRepos = show ? [...new Set(['local', ...(state.visibleRepos || []), ...remotes, 'origin'])] : ['local'];
  return { ...state, visibleRepos };
}

export function mountSandbox(container, params) {
  const { loader, summary, progress } = params.ctx || {};
  const lang = getLang();
  let alive = true;
  let session = null; // { src, startKey, title, lines, store, transcript }
  let scene = null;
  let unsubscribe = null;
  let overlay = null; // diff / conflict screen { kind, handle }
  let logBox = null;
  let rebase = null;
  let dialog = null;
  let showOnline = null;
  let pendingDiffPath = null;
  let aiItems = [];
  let groups = [];

  // ---------------------------------------------------------------- skeleton
  const root = el('div', { class: 'layout sandbox', 'data-testid': 'sandbox' });
  const panel = el('aside', { class: 'panel sb-panel', 'aria-label': t('sandbox.panel') });
  const stage = el('div', { class: 'sb-stage' });
  root.append(panel, stage);
  container.replaceChildren(root);

  const title = el('h1', { class: 'sb-title' }, [`${t('sandbox.title1')} `, el('em', {}, [t('sandbox.title2')])]);
  const startBtn = button('sb-start-btn', [], () => openStartDialog(true), { 'aria-haspopup': 'dialog', 'data-testid': 'start-button' });
  const termHost = el('div', { class: 'sb-term' });
  const askForm = el('form', { class: 'sb-ask', hidden: true });
  const explainP = el('p', { class: 'sb-explain', 'data-testid': 'explanation' });
  const aiP = el('p', { class: 'sb-ai-text', hidden: true });
  const whyBtn = button('sb-why-btn', [t('sandbox.why')], () => {
    whyP.hidden = !whyP.hidden;
    whyBtn.setAttribute('aria-expanded', String(!whyP.hidden));
  }, { 'aria-expanded': 'false', hidden: true });
  const whyP = el('p', { class: 'sb-why', hidden: true });
  const detailsList = el('ul', { class: 'sb-details', role: 'list', 'aria-label': t('sandbox.details.label'), hidden: true });
  const happened = el('section', { class: 'sb-happened', 'aria-live': 'polite' }, [
    el('div', { class: 'gl' }, [t('ui.whatHappened')]), explainP, aiP, whyBtn, whyP, detailsList,
  ]);
  const undoBtn = button('btn btn--small', [svg('rotate-ccw', { size: 14 }), t('ui.undo')], () => undo(), { 'aria-keyshortcuts': 'Control+Z Meta+Z', 'data-testid': 'undo' });
  const redoBtn = button('btn btn--small', [t('sandbox.redo')], () => redo(), { 'aria-keyshortcuts': 'Control+Shift+Z Meta+Shift+Z', 'data-testid': 'redo' });
  const resetBtn = button('btn btn--small btn--ghost', [t('ui.reset')], () => resetSession(), { 'data-testid': 'reset' });
  const detailsBtn = button('btn btn--small btn--ghost sb-details-btn', [t('ui.moreDetails')], () => setDetails(!detailsOn), { 'aria-pressed': 'false', 'data-testid': 'details' });
  const controls = el('div', { class: 'sb-controls' }, [undoBtn, redoBtn, resetBtn, detailsBtn]);
  const world = el('section', { class: 'sb-world', 'aria-label': t('sandbox.world') });
  const palette = el('nav', { class: 'sb-palette', 'aria-label': t('sandbox.palette') });
  const historyList = el('ol', { class: 'sb-history-list', role: 'list' });
  const history = el('section', { class: 'sb-history' }, [el('div', { class: 'gl' }, [t('sandbox.history')]), historyList]);
  const copyBtn = button('btn btn--small btn--ghost', [svg('file-text', { size: 14 }), t('sandbox.copy')], () => copyAsStart(), { 'data-testid': 'copy-start' });
  const pasteBtn = button('btn btn--small btn--ghost', [svg('file-plus', { size: 14 }), t('sandbox.paste')], () => openStartDialog(true, true), { 'data-testid': 'paste-start' });
  const share = el('div', { class: 'sb-share' }, [copyBtn, pasteBtn]);

  const eyebrow = el('div', { class: 'eyebrow' }, [`★ ${t('nav.sandbox')}`]);
  const startRow = el('div', { class: 'sb-start-row' }, [el('span', { class: 'gl' }, [t('sandbox.start.label')]), startBtn]);
  panel.append(eyebrow, title, startRow, termHost, askForm, happened, controls, world, palette, history, share);

  const terminal = createTerminal(termHost, {
    onSubmit: (text) => runText(text),
    suggest: (text) => (session ? suggestLines(text, session.store.getState()) : []),
    placeholder: t('sandbox.term.placeholder'),
  });

  // ---------------------------------------------------------------- helpers
  const state = () => session.store.getState();
  const deskOf = (ref) => getDesk(state(), ref);

  function setStartLabel() {
    startBtn.replaceChildren(el('span', {}, [session && session.title ? session.title : t('sandbox.start.pasted')]), svg('chevron-down', { size: 14 }));
  }

  function setPrompt() {
    const d = activeDesk(state());
    terminal.setPrompt(`${d.path} (${d.branch || t('desk.detached')}) $`);
  }

  function setDetails(on) {
    detailsOn = Boolean(on);
    detailsBtn.setAttribute('aria-pressed', String(detailsOn));
    detailsBtn.textContent = t(detailsOn ? 'ui.lessDetails' : 'ui.moreDetails');
    terminal.setDetails(detailsOn);
    detailsList.hidden = !detailsOn || !detailsList.children.length;
  }

  function setHighlight(hl) {
    if (scene) scene.setOptions({ highlight: hl || null });
  }

  // ---------------------------------------------------------------- transcript ("what just happened")
  function shownText(entry) {
    if (typeof entry.shown === 'string') return entry.shown;
    if (entry.shown && entry.shown.key) return t(entry.shown.key, entry.shown.params);
    return '';
  }

  function printEntry(entry) {
    const r = entry.result || {};
    const out = {};
    out.command = shownText(entry);
    if (r.error) out.error = `${say(r.error)}${/^error\.limit/.test(r.error.key) ? ` ${t('sandbox.limitHint')}` : ''}`;
    if (r.warning) out.warning = say(r.warning);
    const parts = [];
    if (entry.help !== undefined) parts.push(helpHtml(entry.help));
    else if (r.explanation) parts.push(esc(say(r.explanation)));
    if (entry.note) parts.push(esc(t(entry.note.key, entry.note.params)));
    if (entry.ai) parts.push(`<em>${esc(entry.ai)}</em>`);
    if (parts.length) out.explanation = parts.join(' ');
    const lines = r.output ? outputLines(r.output, r.state) : [];
    if (lines.length) out.output = lines.map((l) => l.text).join('\n');
    terminal.print(out);
  }

  function showHappened(entry) {
    const r = entry.result || {};
    let text = '';
    if (r.error) text = `${say(r.error)}${/^error\.limit/.test(r.error.key) ? ` ${t('sandbox.limitHint')}` : ''}`;
    else if (r.warning && r.explanation) text = `${say(r.explanation)} ${say(r.warning)}`;
    else if (r.warning) text = say(r.warning);
    else if (r.explanation) text = say(r.explanation);
    else if (entry.note) text = t(entry.note.key, entry.note.params);
    else if (entry.help !== undefined) text = t('sandbox.help.intro');
    explainP.textContent = text;
    explainP.classList.toggle('is-error', Boolean(r.error));
    aiP.hidden = !entry.ai;
    aiP.textContent = entry.ai || '';
    const whyKey = entry.why ? `sandbox.why.${entry.why}` : null;
    const hasWhy = Boolean(whyKey && hasKey(whyKey) && !r.error);
    whyBtn.hidden = !hasWhy;
    whyP.hidden = true;
    whyBtn.setAttribute('aria-expanded', 'false');
    whyP.textContent = hasWhy ? t(whyKey) : '';
    // raw output mapped to the scene
    const lines = r.output ? outputLines(r.output, r.state) : [];
    detailsList.replaceChildren(...lines.map((l) => {
      const li = el('li', { class: 'mono' }, [l.text]);
      if (l.hl) {
        li.classList.add('is-mapped');
        li.addEventListener('mouseenter', () => setHighlight(l.hl));
        li.addEventListener('mouseleave', () => setHighlight(null));
      }
      return li;
    }));
    detailsList.hidden = !detailsOn || !lines.length;
  }

  function record(entry) {
    session.transcript.push(entry);
    if (session.transcript.length > 60) session.transcript.shift();
    printEntry(entry);
    showHappened(entry);
  }

  function helpHtml(topic) {
    if (topic) {
      const key = `sandbox.help.${topic}`;
      return esc(hasKey(key) ? t(key) : t('sandbox.help.unknown', { name: topic }));
    }
    const rows = groups.map((g) => `<strong>${esc(t(g.labelKey))}</strong> ${esc(g.commands.filter((c) => !c.web).map((c) => paletteLabel(c.id)).join(', '))}`);
    return `${esc(t('sandbox.help.intro'))}<br>${rows.join('<br>')}<br>${esc(t('sandbox.help.more'))}`;
  }

  // ---------------------------------------------------------------- running commands
  /** Name used for the "Why?" text of a command. */
  function whyName(command) {
    const c = typeof command === 'string' ? parse(command) : command;
    if (!c || c.error) return null;
    if (c.name === 'sequence') return whyName(c.commands[c.commands.length - 1]);
    if (c.name === 'worktree') return `worktree.${c.args[0] || 'list'}`;
    if (c.name === 'mr') return `mr.${c.args[0]}`;
    return c.name;
  }

  function equivalentShown(command, result) {
    const eq = result && result.equivalent;
    if (eq && eq.command) return eq.command;
    if (eq && eq.key) return { key: eq.key, params: eq.params };
    return typeof command === 'string' ? command : historyText(command, state());
  }

  /**
   * Runs a command through the store and reports it.
   * opts: { shown?: text shown in the terminal (default: the equivalent command / the text), ai?, note? }
   */
  function run(command, opts = {}) {
    if (!session) return null;
    const result = session.store.dispatch(command);
    const shown = opts.shown !== undefined ? opts.shown : typeof command === 'string' ? command : equivalentShown(command, result);
    const entry = { shown, result: { error: result.error, warning: result.warning, explanation: result.explanation, output: result.output, state: result.state }, why: whyName(command) };
    if (opts.ai && !result.error) entry.ai = opts.ai;
    if (opts.note) entry.note = opts.note;
    record(entry);
    if (result.error) scene.shake();
    handleEvents(command, result);
    return result;
  }

  function handleEvents(command, result) {
    if (result.error) return;
    const parsed = typeof command === 'string' ? parse(command) : command;
    for (const e of result.events || []) {
      if (e.type === 'diff.shown') openDiff(e, parsed);
      else if (e.type === 'log.shown') openLog(e);
      else if (e.type === 'commit.shown' && result.output && result.output.commit) {
        const c = result.output.commit;
        if (c.parents && c.parents[0]) openDiff({ mode: 'branches' }, null, { a: c.parents[0], b: c.id });
      } else if (e.type === 'ui' && e.action === 'clear') terminal.clear();
    }
  }

  function runText(text) {
    if (!session) return;
    let line = String(text || '').trim();
    if (!line) return;
    if (line === '?') line = 'help';
    const parsed = parse(line);
    if (!parsed.error && parsed.name === 'help') {
      record({ shown: line, help: parsed.args[0] ? parsed.args[0].replace(/^git\s+/, '') : null });
      return;
    }
    if (!parsed.error && parsed.name === 'clear') {
      terminal.clear();
      return;
    }
    if (!parsed.error && parsed.name === 'rebase' && parsed.options.i && !parsed.options.plan && parsed.args[0]) {
      if (openRebase(parsed, line)) return;
    }
    run(line);
  }

  /** Makes `deskId` the active desk first (scene clicks on another tile), showing the cd. */
  function activate(deskId) {
    const d = deskOf(deskId);
    if (d && d.id !== state().active) run(`cd ../${d.path}`);
  }

  // ---------------------------------------------------------------- overlays: diff, conflict, log, rebase
  function closeOverlay() {
    if (overlay) {
      const o = overlay;
      overlay = null;
      o.handle.close();
    }
  }

  function openDiff(event, parsed, pair = null) {
    closeOverlay();
    const desk = event.desk || state().active;
    let a = null;
    let b = null;
    if (pair) ({ a, b } = pair);
    else if (event.mode === 'branches' && parsed && parsed.args) {
      const args = parsed.args.filter((x) => !/^-/.test(x));
      if (args.length === 1 && /\.\.\.?/.test(args[0])) [a, b] = args[0].split(/\.\.\.?/);
      else [a, b] = args;
    }
    const path = pendingDiffPath;
    pendingDiffPath = null;
    const handle = openDiffScreen(stage, {
      state: state(), mode: event.mode === 'conflict' ? 'work' : event.mode, a: a || undefined, b: b || undefined, desk, path,
      onClose: () => { if (overlay && overlay.handle === handle) overlay = null; },
    });
    overlay = { kind: 'diff', handle };
  }

  function openConflict(deskId, path) {
    closeOverlay();
    const handle = openConflictScreen(stage, {
      state: state(), desk: deskId, path,
      onResolve: (side) => {
        run({ name: 'resolve', args: [deskId, path, side], options: {} });
      },
      onClose: () => { if (overlay && overlay.handle === handle) overlay = null; },
    });
    overlay = { kind: 'conflict', handle };
  }

  function closeLog() {
    if (logBox) {
      logBox.remove();
      logBox = null;
      setHighlight(null);
    }
  }

  function openLog(event) {
    closeLog();
    const desk = deskOf(event.desk) || activeDesk(state());
    const list = el('div', { class: 'sb-log-list' });
    const close = button('btn-icon', [svg('x', { size: 16 })], () => closeLog(), { 'aria-label': t('ui.close') });
    logBox = el('section', { class: 'sb-log card', role: 'region', 'aria-label': t('log.title', { branch: desk.branch || desk.head || '' }) }, [
      el('div', { class: 'sb-log-head' }, [el('div', { class: 'eyebrow' }, [`★ ${t('log.title', { branch: desk.branch || desk.head || '' })}`]), close]),
      list,
    ]);
    logBox.dataset.desk = desk.id;
    list.addEventListener('mouseover', (e) => {
      const li = e.target.closest('[data-commit]');
      setHighlight(li ? { commits: [li.getAttribute('data-commit')] } : null);
    });
    list.addEventListener('mouseleave', () => setHighlight(null));
    stage.append(logBox);
    renderLog(list, state(), { desk: desk.id });
  }

  function closeRebase() {
    if (!rebase) return;
    const r = rebase;
    rebase = null;
    try { r.handle.close(); } catch { /* already closed */ }
    r.host.remove();
  }

  function openRebase(parsed, text) {
    const desk = activeDesk(state());
    const base = resolveRev(state(), desk, parsed.args[0]);
    if (!base || !desk.head) return false;
    const ids = commitsBetween(state(), base.id, desk.head);
    if (!ids.length) return false;
    closeRebase();
    const { raw, ...cmd } = parsed;
    const host = el('div', { class: 'sb-rebase-host' });
    stage.append(host);
    const handle = openRebaseEditor(host, {
      commits: ids.map((id) => ({ id, message: commitText(state().commits[id]), author: state().commits[id].author })),
      onConfirm: (plan) => {
        closeRebase();
        run({ ...cmd, options: { ...cmd.options, plan } }, { shown: text });
      },
      onCancel: () => {
        closeRebase();
        record({ shown: text, note: { key: 'sandbox.rebase.cancelled' } });
      },
    });
    rebase = { host, handle };
    return true;
  }

  // ---------------------------------------------------------------- AI and the outside world
  function aiWork(deskId, { commit = !noCommit.checked } = {}) {
    const base = { name: 'ai', args: [deskId], options: { commit } };
    const pre = apply(state(), base);
    if (pre.error || !pre.output) return run(base);
    const text = aiText(aiItems, pre.output.textIndex, pre.output.files);
    const command = { name: 'ai', args: [deskId], options: commit && text ? { commit, message: text } : { commit } };
    return run(command, { ai: text });
  }

  function newAssistant() {
    const base = { name: 'assistant', args: [], options: {} };
    const pre = apply(state(), base);
    if (pre.error || !pre.output || pre.output.kind !== 'ai') return run(base);
    const text = aiText(aiItems, pre.output.textIndex, pre.output.files);
    return run({ name: 'assistant', args: [], options: text ? { message: text } : {} }, { ai: text });
  }

  function aiDesk() {
    const s = state();
    const a = activeDesk(s);
    if (a.branch && a.branch.startsWith('ia/')) return a;
    return s.worktrees.find((w) => w.branch && w.branch.startsWith('ia/')) || null;
  }

  const noCommit = el('input', { type: 'checkbox', class: 'sb-check', id: `sb-nocommit-${Date.now()}` });
  const onlineToggle = el('input', { type: 'checkbox', class: 'sb-check', id: `sb-online-${Date.now()}`, 'data-testid': 'show-online' });
  onlineToggle.addEventListener('change', () => {
    showOnline = onlineToggle.checked;
    if (scene) scene.update(displayState(state(), showOnline), []);
    renderWorld();
  });

  function renderWorld() {
    if (!session) return;
    const s = state();
    const ia = aiDesk();
    const hasOrigin = Boolean(s.remotes && s.remotes.origin);
    const shown = displayState(s, showOnline).visibleRepos.length > 1;
    onlineToggle.checked = shown;
    const items = [
      button('btn btn--small btn--primary', [svg('star', { size: 14 }), t('desk.aiWork')], () => ia && aiWork(ia.id), { disabled: !ia, title: ia ? t('sandbox.ai.on', { folder: ia.path }) : t('sandbox.ai.none'), 'data-testid': 'ai-work' }),
      el('label', { class: 'sb-check-label', for: noCommit.id }, [noCommit, t('sandbox.ai.noCommit')]),
      button('btn btn--small', [svg('plus', { size: 14 }), t('sandbox.ai.new')], () => newAssistant(), { 'data-testid': 'ai-new' }),
    ];
    if (shown) {
      items.push(button('btn btn--small', [svg('git-pull-request-arrow', { size: 14 }), t('sandbox.ai.mr')], () => ia && run({ name: 'ai-mr', args: [ia.id], options: {} }), { disabled: !ia || !hasOrigin, 'data-testid': 'ai-mr' }));
      items.push(button('btn btn--small', [svg('users', { size: 14 }), t('sandbox.colleague')], () => run({ name: 'colleague', args: ['main'], options: {} }), { disabled: !hasOrigin, 'data-testid': 'colleague' }));
      if (!hasOrigin) items.push(button('btn btn--small', [svg('cloud', { size: 14 }), t('sandbox.publish')], () => run({ name: 'publish', args: ['origin'], options: {} }, { shown: { key: 'sandbox.equiv.publish' } }), { 'data-testid': 'publish' }));
    }
    world.replaceChildren(
      el('div', { class: 'gl' }, [t('sandbox.world')]),
      el('div', { class: 'sb-world-row' }, items),
      el('label', { class: 'sb-check-label', for: onlineToggle.id }, [onlineToggle, t('sandbox.online')]),
    );
  }

  // ---------------------------------------------------------------- palette
  function renderPalette() {
    palette.replaceChildren(...groups.map((g) => el('div', { class: 'sb-group' }, [
      el('div', { class: 'gl' }, [t(g.labelKey)]),
      el('div', { class: 'sb-cmds' }, g.commands.map((c) => button(`sb-cmd${c.web ? ' is-web' : ''}`, [svg(c.icon, { size: 14 }), paletteLabel(c.id, c)], (e) => startPalette(c.id, e.currentTarget), { 'data-command': c.id }))),
    ])));
  }

  function askText(labelKey, value, anchor, done) {
    const input = el('input', { type: 'text', class: 'sb-ask-input', value, spellcheck: 'false', autocomplete: 'off' });
    const label = el('label', { class: 'sb-ask-label' }, [t(labelKey), input]);
    const ok = el('button', { type: 'submit', class: 'btn btn--small btn--dark' }, [t('ui.run')]);
    const cancel = button('btn btn--small btn--ghost', [t('sandbox.cancel')], () => close());
    function close() {
      askForm.hidden = true;
      askForm.replaceChildren();
      askForm.onsubmit = null;
      if (anchor && anchor.focus) anchor.focus();
    }
    askForm.replaceChildren(label, el('div', { class: 'sb-ask-buttons' }, [ok, cancel]));
    askForm.hidden = false;
    askForm.onsubmit = (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      askForm.hidden = true;
      askForm.replaceChildren();
      askForm.onsubmit = null;
      done(v);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    input.focus();
    input.select();
  }

  function startPalette(id, anchor) {
    if (!session) return;
    const plan = planCommand(id, state());
    if (!plan) return;
    const def = commandsJson.commands[id] || {};
    if (!def.web) terminal.setValue(`${id === 'fork' ? '' : 'git '}${paletteLabel(id)} `);
    const values = [];
    let i = 0;
    const step = () => {
      while (i < plan.steps.length && plan.steps[i].when && !plan.steps[i].when(values)) i += 1;
      if (i >= plan.steps.length) {
        const command = plan.build(values);
        terminal.setValue('');
        if (typeof command === 'string') runText(command);
        else run(command);
        return;
      }
      const s = plan.steps[i];
      if (s.kind === 'pick') {
        if (!s.options.length) {
          terminal.setValue('');
          record({ shown: def.web ? paletteLabel(id, def) : `git ${paletteLabel(id)}`, note: { key: s.emptyKey } });
          return;
        }
        openPicker(anchor, { title: t(s.titleKey), options: s.options, onPick: (v) => { values[i] = v; i += 1; step(); } });
      } else {
        askText(s.labelKey, s.value, anchor, (v) => { values[i] = v; i += 1; step(); });
      }
    };
    step();
  }

  // ---------------------------------------------------------------- scene actions and popovers
  function onAction(a) {
    if (!session) return;
    switch (a.type) {
      case 'click':
        activate(a.desk);
        run({ name: 'click', args: [a.desk, a.path], options: {} });
        break;
      case 'create':
        activate(a.desk);
        run({ name: 'create', args: a.dir ? [a.desk, a.dir] : [a.desk], options: {} });
        break;
      case 'delete':
        activate(a.desk);
        run(`rm ${q(a.path)}`);
        break;
      case 'unstage':
        activate(a.desk);
        run(`git restore --staged ${q(a.path)}`);
        break;
      case 'diff': {
        const desk = deskOf(a.desk);
        const f = desk && findFile(desk, a.path);
        if (f && f.status === 'conflict') {
          openConflict(desk.id, a.path);
          break;
        }
        activate(a.desk);
        pendingDiffPath = a.path;
        run(f && f.staged && f.work === f.index ? 'git diff --staged' : 'git diff');
        break;
      }
      case 'cd': {
        const d = deskOf(a.desk);
        if (d) run(`cd ../${d.path}`);
        break;
      }
      case 'ai-work':
        aiWork(a.desk);
        break;
      case 'commit':
        commitPopover(a.id, a.anchor);
        break;
      case 'branch':
        branchPopover(a.name, a.remote, a.anchor);
        break;
      case 'mr':
        mrPopover(a.id, a.anchor);
        break;
      case 'stash':
        stashPopover(a.desk, a.anchor);
        break;
      default:
        break;
    }
  }

  function commitPopover(id, anchor) {
    const s = state();
    const c = s.commits[id];
    if (!c) return;
    const desk = activeDesk(s);
    const inHead = desk.head ? isAncestor(s, id, desk.head) : false;
    const body = `<p class="sb-pop-meta">${icon(c.author === 'ai' ? 'star' : 'users', { size: 14 })} ${esc(t(c.author === 'ai' ? 'log.author.ai' : 'log.author.human'))} · <span class="mono">${esc(id)}</span></p>` +
      `<p class="sb-pop-files mono">${esc((c.files || []).join(', '))}</p>`;
    openPopover(anchor, {
      title: commitText(c),
      body,
      items: [
        { label: t('sandbox.commit.diff'), icon: 'diff', onSelect: () => run(`git show ${id}`) },
        { label: t('sandbox.commit.cherryPick'), icon: 'cherry', disabled: inHead, onSelect: () => run(`git cherry-pick ${id}`) },
        { label: t('sandbox.commit.reset'), icon: 'rotate-ccw', disabled: !inHead || id === desk.head, onSelect: () => run(`git reset ${id}`) },
        { label: t('sandbox.commit.revert'), icon: 'history', disabled: !inHead || c.parents.length !== 1, onSelect: () => run(`git revert ${id}`) },
        { label: t('sandbox.commit.newDesk'), icon: 'folder-plus', onSelect: () => run(`git worktree add ../${deskFolderFor(s, id)} ${id}`) },
      ],
    });
  }

  function branchPopover(name, remote, anchor) {
    const s = state();
    const desk = activeDesk(s);
    const local = remote ? name.replace(/^[^/]+\//, '') : name;
    const current = !remote && desk.branch === name;
    const onDesk = s.worktrees.some((w) => w.branch === local);
    const from = desk.branch || 'HEAD';
    const items = [
      { label: t('sandbox.branch.switch'), icon: 'arrow-right-left', disabled: current, onSelect: () => run(`git switch ${local}`) },
      { label: t('sandbox.branch.merge', { into: from }), icon: 'git-merge', disabled: current, onSelect: () => run(`git merge ${name}`) },
      { label: t('sandbox.branch.rebase', { name }), icon: 'move-horizontal', disabled: current, onSelect: () => run(`git rebase ${name}`) },
      { label: t('sandbox.branch.compare'), icon: 'diff', disabled: current, onSelect: () => run(`git diff ${from} ${name}`) },
    ];
    if (!remote) {
      items.push({ label: t('sandbox.branch.newDesk'), icon: 'folder-plus', disabled: onDesk, onSelect: () => run(`git worktree add ../${deskFolderFor(s, name)} ${name}`) });
      items.push({ label: t('sandbox.branch.delete'), icon: 'x', disabled: onDesk, onSelect: () => run(`git branch -d ${name}`) });
    }
    openPopover(anchor, { title: name, items });
  }

  function mrPopover(id, anchor) {
    const s = state();
    let mr = null;
    for (const r of Object.values(s.remotes || {})) mr = mr || (r.mrs || []).find((m) => m.id === id);
    if (!mr) return;
    const ref = (b) => (s.remoteRefs && s.remoteRefs[`origin/${b}`] ? `origin/${b}` : s.branches[b] ? b : null);
    openPopover(anchor, {
      title: `!${mr.id} · ${mr.titleKey ? t(mr.titleKey, mr.titleParams || {}) : mr.title}`,
      body: `<p class="sb-pop-meta">${esc(t(`mr.status.${mr.status}`))} · <span class="mono">${esc(mr.source)} → ${esc(mr.target)}</span></p>`,
      items: [
        { label: t('sandbox.mr.approve'), icon: 'badge-check', disabled: mr.status !== 'open', onSelect: () => run({ name: 'mr', args: ['approve', mr.id], options: {} }) },
        { label: t('sandbox.mr.merge'), icon: 'git-pull-request-arrow', disabled: mr.status !== 'approved', onSelect: () => run({ name: 'mr', args: ['merge', mr.id], options: {} }) },
        {
          label: t('sandbox.mr.diff'), icon: 'diff', disabled: mr.status === 'merged',
          onSelect: () => {
            const a = ref(mr.target);
            const b = ref(mr.source);
            if (a && b) run(`git diff ${a} ${b}`);
            else showToast(t('sandbox.mr.fetchFirst'), { kind: 'info' });
          },
        },
      ],
    });
  }

  function stashPopover(deskId, anchor) {
    const desk = deskOf(deskId);
    if (!desk) return;
    const go = (cmd) => () => { activate(deskId); run(cmd); };
    openPopover(anchor, {
      title: t('stash.label', { folder: desk.path, n: desk.stash.length }),
      items: [
        { label: t('sandbox.stash.pop'), icon: 'archive', disabled: !desk.stash.length, onSelect: go('git stash pop') },
        { label: t('sandbox.stash.apply'), icon: 'archive', disabled: !desk.stash.length, onSelect: go('git stash apply') },
        { label: t('sandbox.stash.drop'), icon: 'x', disabled: !desk.stash.length, onSelect: go('git stash drop') },
        { label: t('sandbox.stash.list'), icon: 'list-checks', onSelect: go('git stash list') },
      ],
    });
  }

  // ---------------------------------------------------------------- history, undo, redo, reset
  function renderHistory() {
    const cmds = session.store.getCommands();
    const s = state();
    const startItem = el('li', {}, [button(`sb-hist${cmds.length ? '' : ' is-current'}`, [svg('flag', { size: 14 }), session.title || t('sandbox.start.pasted')], () => goTo(-1), { 'aria-current': cmds.length ? false : 'step' })]);
    const items = cmds.map((c, i) => el('li', {}, [button(`sb-hist${i === cmds.length - 1 ? ' is-current' : ''}`, [svg(commandIcon(c), { size: 14 }), el('span', { class: 'mono' }, [historyText(c, s)])], () => goTo(i), { 'aria-current': i === cmds.length - 1 ? 'step' : false })]));
    historyList.replaceChildren(startItem, ...items);
    historyList.scrollTop = historyList.scrollHeight;
    undoBtn.disabled = !session.store.canUndo();
    redoBtn.disabled = !session.store.canRedo();
    const fromMission = session.src.kind === 'mission';
    copyBtn.disabled = fromMission;
    copyBtn.title = fromMission ? t('sandbox.copy.unavailable') : '';
  }

  function goTo(index) {
    const n = session.store.getCommands().length;
    for (let k = n - 1; k > index; k -= 1) session.store.undo();
    record({ shown: { key: 'sandbox.hist.goto', params: {} }, note: { key: 'sandbox.hist.back', params: { n: index + 1 } } });
  }

  function undo() {
    if (!session || !session.store.canUndo()) return;
    const cmds = session.store.getCommands();
    const label = historyText(cmds[cmds.length - 1], state());
    session.store.undo();
    record({ shown: { key: 'sandbox.undo.shown', params: {} }, note: { key: 'sandbox.undone', params: { command: label } } });
  }

  function redo() {
    if (!session || !session.store.canRedo()) return;
    session.store.redo();
    const cmds = session.store.getCommands();
    record({ shown: { key: 'sandbox.redo.shown', params: {} }, note: { key: 'sandbox.redone', params: { command: historyText(cmds[cmds.length - 1], state()) } } });
  }

  function resetSession() {
    if (!session) return;
    if (session.store.getCommands().length && !window.confirm(t('sandbox.resetConfirm'))) return;
    session.store.reset();
    record({ shown: { key: 'sandbox.reset.shown', params: {} }, note: { key: 'sandbox.resetDone', params: {} } });
  }

  // ---------------------------------------------------------------- copy / paste a start
  async function copyAsStart() {
    if (!session || session.src.kind === 'mission') return;
    const out = toSetup({ start: session.store.getInitialState(), startLines: session.lines, commands: session.store.getCommands() });
    try {
      await navigator.clipboard.writeText(out.block);
      showToast(t('sandbox.copy.done'), { kind: 'ok' });
    } catch {
      openStartDialog(true, true, out.block);
    }
  }

  // ---------------------------------------------------------------- the start dialog
  function closeDialog() {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
    document.removeEventListener('keydown', onDialogKey, true);
    startBtn.focus();
  }
  function onDialogKey(e) {
    if (e.key === 'Escape' && dialog && dialog.dataset.closable === '1') {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
    }
  }

  function openStartDialog(closable, focusPaste = false, pasteText = '') {
    closeActiveLayer();
    if (dialog) closeDialog();
    const titleId = `sb-dialog-title-${Date.now()}`;
    const list = el('ul', { class: 'sb-starts', role: 'list' });
    for (const s of summary.sandbox || []) {
      const titleEl = el('strong', {}, [s.id]);
      const textEl = el('span', { class: 'sb-start-text' }, ['']);
      const b = button('sb-start-card', [titleEl, textEl], () => choose({ kind: 'start', id: s.id }), { 'data-testid': `start-${s.id}`, 'data-start': s.id });
      const li = el('li', {}, [b]);
      list.append(li);
      loader.loadSandbox(s.id, lang).then((f) => {
        titleEl.textContent = f.data.front.title || s.id;
        textEl.textContent = f.data.text || '';
      }).catch(() => {});
    }
    const done = (summary.missions || []).filter((m) => progress && progress.isMissionDone(m.id));
    const missions = el('ul', { class: 'sb-starts sb-starts--missions', role: 'list' });
    for (const m of done) {
      const titleEl = el('strong', {}, [m.id]);
      const li = el('li', {}, [button('sb-start-card', [titleEl], () => choose({ kind: 'mission', id: m.id }), { 'data-testid': `start-mission-${m.id}` })]);
      missions.append(li);
      loader.loadMission(m.id, lang).then((f) => { titleEl.textContent = f.data.front.title || m.id; }).catch(() => {});
    }
    const area = el('textarea', { class: 'sb-paste-area mono', rows: '6', spellcheck: 'false', 'aria-label': t('sandbox.paste.label'), 'data-testid': 'paste-area', placeholder: t('sandbox.paste.placeholder') });
    area.value = pasteText;
    const err = el('p', { class: 'sb-paste-error', role: 'alert' });
    const usePaste = button('btn btn--small btn--dark', [t('sandbox.paste.use')], () => choose({ kind: 'paste', text: area.value }, err), { 'data-testid': 'paste-use' });
    const closeBtn = closable && session ? button('btn-icon sb-dialog-close', [svg('x', { size: 16 })], () => closeDialog(), { 'aria-label': t('ui.close') }) : null;
    const box = el('div', { class: 'sb-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('div', { class: 'sb-dialog-head' }, [el('h2', { id: titleId }, [t('sandbox.start.title')]), closeBtn || '']),
      el('p', { class: 'secondary' }, [t('sandbox.start.intro')]),
      list,
      done.length ? el('div', { class: 'gl' }, [t('sandbox.start.missions')]) : '',
      done.length ? missions : '',
      el('div', { class: 'gl' }, [t('sandbox.paste')]),
      el('p', { class: 'secondary small' }, [t('sandbox.paste.help')]),
      area, err, usePaste,
    ]);
    dialog = el('div', { class: 'sb-dialog-backdrop', 'data-closable': closable && session ? '1' : '0' }, [box]);
    root.append(dialog);
    document.addEventListener('keydown', onDialogKey, true);
    (focusPaste ? area : list.querySelector('button') || area).focus();
  }

  async function choose(src, errEl = null) {
    const built = await buildStart(src, { loader, lang });
    if (!alive) return;
    if (built.error || !built.state) {
      const msg = t(built.error ? built.error.key : 'sandbox.start.broken', built.error ? built.error.params : {});
      const where = built.line ? ` ${t('sandbox.paste.line', { line: built.line, text: built.text || '' })}` : '';
      if (errEl) errEl.textContent = `${msg}${where}`;
      else showToast(msg, { kind: 'error' });
      return;
    }
    closeDialog();
    startSession(src, built, []);
    if (src.kind === 'start') replace({ name: 'sandbox', start: src.id });
    else replace({ name: 'sandbox' });
    terminal.focus();
    panel.scrollTop = 0;
  }

  // ---------------------------------------------------------------- session
  function attach(sess) {
    session = sess;
    if (unsubscribe) unsubscribe();
    if (scene) scene.destroy();
    closeOverlay();
    closeLog();
    stage.replaceChildren();
    showOnline = null;
    scene = renderScene(stage, displayState(state(), showOnline), { onAction });
    scene.root.setAttribute('data-testid', 'scene');
    unsubscribe = session.store.subscribe((st, result) => {
      if (!alive) return;
      scene.update(displayState(st, showOnline), result ? result.events || [] : []);
      if (overlay) overlay.handle.update(st);
      if (logBox) renderLog(logBox.querySelector('.sb-log-list'), st, { desk: logBox.dataset.desk });
      afterChange();
    });
    terminal.clear();
    for (const e of session.transcript) printEntry(e);
    const last = session.transcript[session.transcript.length - 1];
    if (last) showHappened(last);
    else showHappened({ note: { key: 'sandbox.ready', params: {} } });
    afterChange();
  }

  function afterChange() {
    setPrompt();
    setStartLabel();
    renderHistory();
    renderWorld();
    if (progress) progress.saveSandbox(storableCommands(session.store.getCommands()), session.startKey);
    cache = { ...session, lang };
  }

  function startSession(src, built, commands) {
    const store = createStore({ apply, initialState: built.state });
    const sess = { src, startKey: encodeStart(src), title: built.title || null, lines: built.lines, store, transcript: [] };
    if (commands.length) store.load(built.state, commands);
    attach(sess);
  }

  // ---------------------------------------------------------------- keyboard
  function onKey(e) {
    if (dialog || !session) return;
    const tag = e.target && e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      terminal.focus();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  }
  document.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- boot
  (async () => {
    const [json, items] = await Promise.all([loadCommandsJson(), loadAiItems(loader, lang)]);
    if (!alive) return;
    groups = paletteGroups(json);
    aiItems = items;
    renderPalette();
    setDetails(detailsOn);
    const saved = progress ? progress.getSandbox() : null;
    const savedSrc = saved ? decodeStart(saved.start) : null;
    let src = null;
    let commands = [];
    if (params.start) {
      src = { kind: 'start', id: params.start };
      if (saved && saved.start === params.start) commands = saved.commands;
    } else if (savedSrc) {
      src = savedSrc;
      commands = saved.commands;
    }
    if (!src) {
      openStartDialog(false);
      return;
    }
    const key = encodeStart(src);
    if (cache && cache.startKey === key && cache.lang === lang
      && JSON.stringify(storableCommands(cache.store.getCommands())) === JSON.stringify(commands)) {
      attach({ src: cache.src, startKey: cache.startKey, title: cache.title, lines: cache.lines, store: cache.store, transcript: cache.transcript });
      return;
    }
    const built = await buildStart(src, { loader, lang });
    if (!alive) return;
    if (built.error || !built.state) {
      openStartDialog(false);
      return;
    }
    const transcript = cache && cache.startKey === key ? cache.transcript : [];
    startSession(src, built, commands);
    if (transcript.length) {
      session.transcript = transcript;
      terminal.clear();
      for (const e of transcript) printEntry(e);
      showHappened(transcript[transcript.length - 1]);
      cache = { ...session, lang };
    }
  })();

  return () => {
    alive = false;
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keydown', onDialogKey, true);
    closeActiveLayer();
    closeRebase();
    closeOverlay();
    if (unsubscribe) unsubscribe();
    if (scene) scene.destroy();
    terminal.destroy();
  };
}

registerScreen('sandbox', mountSandbox);
