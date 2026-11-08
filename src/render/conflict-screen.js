// The conflict screen: shows the two versions of a conflicted file (when the scenario details them)
// and offers three choices: keep mine, keep theirs, keep both. The caller applies the choice
// (engine action `resolve`) and calls update(state) with the new state.
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { diff as engineDiff } from '../engine/diff.js';
import { findBlock } from '../engine/conflicts.js';
import { getDesk, findFile } from '../engine/state.js';
import { esc, mountOverlay, rerender } from './screens-util.js';

export const SIDES = ['ours', 'theirs', 'both'];

/** What the screen shows for a conflicted file of a desk. Returns { kind: 'none' | 'open' | 'resolved', ... }. */
export function conflictModel(state, { desk = null, path = null } = {}) {
  const d = getDesk(state, desk);
  if (!d) return { kind: 'none' };
  const entries = engineDiff(state, { mode: 'conflict', worktreeId: d.id }).files || [];
  const entry = entries.find((f) => !path || f.path === path) || (path ? null : entries[0]);
  const rebase = Boolean(d.op && d.op.type === 'rebase');
  if (!entry) {
    const f = path ? findFile(d, path) : null;
    if (f && f.conflict && f.conflict.resolved) return { kind: 'resolved', path, rebase };
    return { kind: 'none' };
  }
  const block = findBlock(state, entry.path, entry.ours, entry.theirs);
  return {
    kind: 'open',
    path: entry.path,
    ours: entry.ours,
    theirs: entry.theirs,
    detailed: Boolean(block) && !entry.conflictUndetailed,
    firstText: block ? block.firstText : null,
    secondText: block ? block.secondText : null,
    rebase,
  };
}

const nextStep = (m) => t(m.rebase ? 'conflict.next.rebase' : 'conflict.next.commit', { file: m.path });

function version(kind, label, text) {
  return `<section class="conf-side conf-side--${kind}">
  <h3 class="conf-side-label"><span class="diff-pill diff-pill--${kind === 'ours' ? 'dark' : 'orange'}">${esc(label)}</span></h3>
  <pre class="conf-text">${esc(text || '')}</pre>
</section>`;
}

/** Full HTML of the screen (no DOM needed). */
export function conflictScreenHtml(state, opts = {}) {
  const m = conflictModel(state, opts);
  const close = `<button type="button" class="btn-icon diff-close" data-action="close" data-focus="close" aria-label="${t('ui.close')}">${icon('x')}</button>`;
  if (m.kind !== 'open') {
    const text = m.kind === 'resolved' ? `${t('conflict.resolved', { file: m.path })} ${nextStep(m)}` : t('conflict.none');
    return `<div class="card conf-card"><div class="conf-head"><div class="eyebrow">★</div>${close}</div><p class="conf-note">${esc(text)}</p></div>`;
  }
  const body = m.detailed
    ? `<div class="conf-versions">${version('ours', t('conflict.mine', { branch: m.ours }), m.firstText)}${version('theirs', t('conflict.theirs', { branch: m.theirs }), m.secondText)}</div>`
    : `<p class="conf-nodetail">${icon('info', { size: 16 })} ${esc(t('diff.conflict.noDetail'))}</p>`;
  const buttons = [['ours', 'conflict.keepMine', 'btn--dark'], ['theirs', 'conflict.keepTheirs', 'btn--primary'], ['both', 'conflict.keepBoth', '']]
    .map(([side, key, cls]) => `<button type="button" class="btn ${cls}" data-action="resolve" data-side="${side}" data-focus="side-${side}">${t(key)}</button>`).join('');
  return `<div class="card conf-card">
  <div class="conf-head"><div class="eyebrow">★ ${esc(t("conflict.title", { file: m.path }))}</div>${close}</div>
  <p class="conf-why">${esc(t('conflict.why'))}</p>
  ${body}
  <div class="conf-choose"><span class="conf-choose-label">${t('conflict.choose')}</span><div class="conf-buttons">${buttons}</div></div>
  <p class="conf-next">${icon('terminal', { size: 16 })} ${esc(nextStep(m))}</p>
</div>`;
}

/**
 * Opens the conflict screen over `container`.
 * opts: { state, desk?, path?, onResolve(side: 'ours'|'theirs'|'both'), onClose? }
 * Returns { update(state), close() }.
 */
export function openConflictScreen(container, opts) {
  let state = opts.state;
  let closed = false;
  const doc = container.ownerDocument || globalThis.document;
  const previousFocus = doc.activeElement;
  const root = mountOverlay(container, 'diff-screen conflict-screen');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('conflict.title', { file: opts.path || '' }));
  root.tabIndex = -1;
  const paint = () => rerender(root, conflictScreenHtml(state, opts));

  function close() {
    if (closed) return;
    closed = true;
    doc.removeEventListener('keydown', onKey, true);
    root.remove();
    if (previousFocus && previousFocus.focus) previousFocus.focus();
    if (opts.onClose) opts.onClose();
  }
  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close();
  }
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (action === 'close') close();
    else if (action === 'resolve' && opts.onResolve) opts.onResolve(el.getAttribute('data-side'));
  });
  doc.addEventListener('keydown', onKey, true);
  paint();
  root.focus();
  return {
    update(next) {
      if (closed) return;
      state = next;
      paint();
    },
    close,
  };
}
