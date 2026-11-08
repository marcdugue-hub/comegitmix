// The diff screen: a full scene overlay with three modes (between two lanes / my changes / staged),
// two views (side by side / unified), a file list, folding of long unchanged context.
// The engine does the diffing (src/engine/diff.js); this module only renders and wires the events.
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { diff as engineDiff } from '../engine/diff.js';
import { getDesk } from '../engine/state.js';
import { esc, mountOverlay, rerender } from './screens-util.js';

export const MODES = ['branches', 'work', 'staged'];
const MINUS = '−';

/** The Git command shown at the top for a mode. */
export function diffCommand(mode, a, b) {
  if (mode === 'staged') return 'git diff --staged';
  if (mode === 'branches') return `git diff ${a} ${b}`;
  return 'git diff';
}

/** Default pair of lanes to compare: `main` against the lane of the desk (or the first other lane). */
export function defaultLanes(state, deskId = null) {
  const desk = getDesk(state, deskId);
  const names = Object.keys(state.branches || {});
  const a = names.includes('main') ? 'main' : names[0] || null;
  const own = desk && desk.branch && desk.branch !== a ? desk.branch : null;
  const b = own || names.find((n) => n !== a) || null;
  return { a, b };
}

function endpoints(mode, a, b) {
  if (mode === 'branches') {
    return { from: { text: a, tone: a === 'main' ? 'dark' : 'sky' }, to: { text: b, tone: b === 'main' ? 'dark' : 'orange' } };
  }
  if (mode === 'staged') return { from: { text: t('diff.from.lastCommit'), tone: 'plain' }, to: { text: t('diff.from.index'), tone: 'index' } };
  return { from: { text: t('diff.from.index'), tone: 'index' }, to: { text: t('diff.to.folder'), tone: 'plain' } };
}

/** Computes everything the screen shows for a UI state { mode, a, b, desk }. */
export function diffModel(state, { mode, a, b, desk = null }) {
  const canCompare = Boolean(a && b);
  const result = mode === 'branches' && !canCompare
    ? { files: [] }
    : engineDiff(state, { mode, worktreeId: desk, a, b });
  const files = result.error ? [] : result.files;
  return {
    mode, a, b, files,
    error: result.error || null,
    canCompare,
    command: diffCommand(mode, a, b),
    ...endpoints(mode, a, b),
    adds: files.reduce((n, f) => n + f.adds, 0),
    dels: files.reduce((n, f) => n + f.dels, 0),
    changedFiles: files.filter((f) => f.rows.length).length,
  };
}

function sentence(model) {
  if (model.mode === 'branches') {
    if (!model.canCompare) return t('diff.needTwoLanes');
    return t(model.files.length ? 'explain.diff.branches' : 'explain.diff.branches.empty', { a: model.a, b: model.b });
  }
  if (!model.files.length) return t(`explain.diff.${model.mode}.empty`);
  return t(`diff.sentence.${model.mode}`);
}

function badgeClass(f) {
  if (f.letter === '!' || f.letter === 'D') return 'badge badge--conflict';
  if (f.staged && f.letter === 'M') return 'badge badge--M is-staged';
  return `badge badge--${f.letter}`;
}

function fileButton(f, i, selected) {
  const count = f.untracked ? t('diff.untracked') : f.conflict ? t('diff.legend.conflict') : `+${f.adds} ${MINUS}${f.dels}`;
  return `<li><button type="button" class="diff-file" data-action="file" data-index="${i}" data-focus="file-${i}"${i === selected ? ' aria-current="true"' : ''}>
  <span class="${badgeClass(f)}">${esc(f.letter)}</span>
  <span class="diff-file-name">${esc(f.path)}</span>
  <span class="diff-file-count">${esc(count)}</span>
</button></li>`;
}

function cell(kind, n, text, sep) {
  const sign = kind === 'del' ? MINUS : kind === 'add' ? '+' : '';
  return `<div class="dc dc--${kind}${sep ? ' dc--sep' : ''}"><span class="dn">${n ?? ''}</span><span class="dg">${sign}</span><span class="dt">${esc(text)}</span></div>`;
}

const foldText = (n) => esc(t('diff.folded', { n }));

/** Side-by-side rows. */
export function sideRowsHtml(rows) {
  return rows.map((r) => {
    if (r.lk === 'fold') return `<div class="drow drow--fold"><div class="dc dc--fold">${foldText(r.n)}</div></div>`;
    return `<div class="drow">${cell(r.lk, r.ln, r.lt, true)}${cell(r.rk, r.rn, r.rt, false)}</div>`;
  }).join('');
}

/** Unified rows: consecutive changes are grouped (all removed lines, then all added lines), as in `git diff`. */
export function unifiedRowsHtml(rows) {
  const out = [];
  let dels = [];
  let adds = [];
  const flush = () => {
    for (const r of dels) out.push(`<div class="drow drow--uni"><div class="dc dc--del"><span class="dn">${r.ln}</span><span class="dn"></span><span class="dg">${MINUS}</span><span class="dt">${esc(r.lt)}</span></div></div>`);
    for (const r of adds) out.push(`<div class="drow drow--uni"><div class="dc dc--add"><span class="dn"></span><span class="dn">${r.rn}</span><span class="dg">+</span><span class="dt">${esc(r.rt)}</span></div></div>`);
    dels = [];
    adds = [];
  };
  for (const r of rows) {
    if (r.lk === 'del') dels.push(r);
    if (r.rk === 'add') adds.push(r);
    if (r.lk === 'del' || r.rk === 'add' || (r.lk === 'empty' && r.rk === 'empty')) continue;
    flush();
    if (r.lk === 'fold') out.push(`<div class="drow drow--fold"><div class="dc dc--fold">${foldText(r.n)}</div></div>`);
    else out.push(`<div class="drow drow--uni"><div class="dc dc--ctx"><span class="dn">${r.ln}</span><span class="dn">${r.rn}</span><span class="dg"></span><span class="dt">${esc(r.lt)}</span></div></div>`);
  }
  flush();
  return out.join('');
}

function viewerBody(model, file, view) {
  if (!file) return `<div class="diff-empty">${esc(sentence(model))}</div>`;
  if (file.untracked) {
    return `<div class="diff-empty diff-empty--untracked"><p>${esc(t('diff.empty.untracked', { file: file.path }))}</p><p class="diff-why">${icon('info', { size: 16 })} ${esc(t('diff.untracked.why'))}</p></div>`;
  }
  if (file.conflict && file.conflictUndetailed) {
    return `<div class="diff-empty diff-empty--conflict"><p>${esc(t('diff.conflict.noDetail'))}</p></div>`;
  }
  if (!file.rows.length) return `<div class="diff-empty">${esc(t('diff.noChange'))}</div>`;
  const hint = file.conflict ? `<p class="diff-hint">${esc(t('diff.conflict.hint'))}</p>` : '';
  if (view === 'unified') {
    return `${hint}<div class="diff-cols diff-cols--uni">${esc(model.from.text)} → ${esc(model.to.text)}</div><div class="diff-rows" data-view="unified">${unifiedRowsHtml(file.rows)}</div>`;
  }
  return `${hint}<div class="diff-cols"><div>${esc(model.from.text)}</div><div>${esc(model.to.text)}</div></div><div class="diff-rows" data-view="side">${sideRowsHtml(file.rows)}</div>`;
}

/** Full HTML of the screen for a UI state { mode, view, index, a, b, desk } (no DOM needed). */
export function diffScreenHtml(state, ui) {
  const model = diffModel(state, ui);
  const index = Math.min(Math.max(ui.index || 0, 0), Math.max(model.files.length - 1, 0));
  const file = model.files[index] || null;
  const view = ui.view === 'unified' ? 'unified' : 'side';
  const nFiles = model.changedFiles;
  const tabs = MODES.map((m) => {
    const off = m === 'branches' && !(ui.a && ui.b);
    return `<button type="button" role="tab" class="diff-tab" data-action="mode" data-mode="${m}" data-focus="mode-${m}" aria-selected="${m === model.mode}"${off ? ' disabled' : ''}>${t(`diff.tab.${m}`)}</button>`;
  }).join('');
  const views = [['side', 'diff.side'], ['unified', 'diff.unified']].map(([v, key]) =>
    `<button type="button" data-action="view" data-view="${v}" data-focus="view-${v}" aria-pressed="${v === view}">${t(key)}</button>`).join('');
  return `<header class="card diff-head">
  <div class="diff-head-top">
    <div class="eyebrow">★ ${t('diff.title')}</div>
    <div class="diff-tabs" role="tablist" aria-label="${t('diff.modes')}">${tabs}</div>
    <button type="button" class="btn-icon diff-close" data-action="close" data-focus="close" aria-label="${t('diff.back')}">${icon('x')}</button>
  </div>
  <div class="diff-compare">
    <span class="diff-pill diff-pill--${model.from.tone}">${esc(model.from.text)}</span>
    <svg width="64" height="18" viewBox="0 0 64 18" aria-hidden="true"><path d="M2 9 H58" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M51 3 L59 9 L51 15" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    <span class="diff-pill diff-pill--${model.to.tone}">${esc(model.to.text)}</span>
    <span class="diff-cmd"><span class="diff-cmd-prompt">$</span> ${esc(model.command)}</span>
    <span class="diff-totals">
      <span class="diff-totals-files">${nFiles} ${t(nFiles > 1 ? 'diff.files.n' : 'diff.file')}</span>
      <span class="diff-count diff-count--add">+${model.adds}</span>
      <span class="diff-count diff-count--del">${MINUS}${model.dels}</span>
    </span>
  </div>
  <p class="diff-sentence">${esc(sentence(model))}</p>
</header>
<nav class="card diff-files" aria-label="${t('diff.files')}">
  <div class="eyebrow">${t('diff.files')}</div>
  <ul class="diff-file-list" role="list">${model.files.map((f, i) => fileButton(f, i, index)).join('')}</ul>
  <div class="diff-legend-letters">
    <span><span class="badge badge--M">M</span> ${t('diff.legend.M')}</span>
    <span><span class="badge badge--A">A</span> ${t('diff.legend.A')}</span>
    <span><span class="badge badge--U">U</span> ${t('diff.legend.U')}</span>
  </div>
</nav>
<section class="card diff-viewer" aria-label="${file ? esc(file.path) : t('diff.title')}">
  <div class="diff-viewer-head">
    <span class="diff-viewer-name">${file ? esc(file.path) : ''}</span>
    <div class="diff-views" role="group" aria-label="${t('diff.views')}">${views}</div>
  </div>
  <div class="diff-viewer-body">${viewerBody(model, file, view)}</div>
  <div class="diff-legend">
    <span class="diff-key"><span class="diff-swatch diff-swatch--del"></span>${t('diff.removed')}</span>
    <span class="diff-key"><span class="diff-swatch diff-swatch--add"></span>${t('diff.added')}</span>
    <span class="diff-note">${t('diff.readonly')}</span>
  </div>
</section>`;
}

/**
 * Opens the diff screen over `container` (the scene).
 * opts: { state, mode?, a?, b?, desk?, path?, view?, onClose? }
 * Returns { update(state), close() }.
 */
export function openDiffScreen(container, opts) {
  const lanes = defaultLanes(opts.state, opts.desk || null);
  const ui = {
    a: opts.a || lanes.a,
    b: opts.b || lanes.b,
    desk: opts.desk || null,
    mode: MODES.includes(opts.mode) ? opts.mode : opts.a && opts.b ? 'branches' : 'work',
    view: opts.view === 'unified' ? 'unified' : 'side',
    index: 0,
  };
  let state = opts.state;
  let closed = false;
  const doc = container.ownerDocument || globalThis.document;
  const previousFocus = doc.activeElement;
  const root = mountOverlay(container, 'diff-screen');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('diff.title'));
  root.tabIndex = -1;

  const pickInitialFile = () => {
    if (!opts.path) return;
    const i = diffModel(state, ui).files.findIndex((f) => f.path === opts.path);
    if (i >= 0) ui.index = i;
  };
  const paint = () => rerender(root, diffScreenHtml(state, ui));

  function close() {
    if (closed) return;
    closed = true;
    doc.removeEventListener('keydown', onKey, true);
    root.remove();
    if (previousFocus && previousFocus.focus) previousFocus.focus();
    if (opts.onClose) opts.onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.closest && e.target.closest('.diff-file-list')) {
      const n = diffModel(state, ui).files.length;
      if (!n) return;
      e.preventDefault();
      ui.index = (ui.index + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      paint();
      const el = root.querySelector(`[data-focus="file-${ui.index}"]`);
      if (el) el.focus();
    }
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const action = el.getAttribute('data-action');
    if (action === 'close') close();
    else if (action === 'mode') {
      ui.mode = el.getAttribute('data-mode');
      ui.index = 0;
      paint();
    } else if (action === 'view') {
      ui.view = el.getAttribute('data-view');
      paint();
    } else if (action === 'file') {
      ui.index = Number(el.getAttribute('data-index'));
      paint();
    }
  });
  doc.addEventListener('keydown', onKey, true);
  pickInitialFile();
  paint();
  root.focus();

  return {
    update(next) {
      if (closed) return;
      const current = diffModel(state, ui).files[ui.index];
      state = next;
      const i = current ? diffModel(state, ui).files.findIndex((f) => f.path === current.path) : -1;
      ui.index = i >= 0 ? i : 0;
      paint();
    },
    close,
  };
}
