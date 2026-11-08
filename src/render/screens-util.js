// Small helpers shared by the diff, conflict and log screens.
import { t } from '../i18n/i18n.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML (content and attribute values). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Text of a commit: free message, or the i18n key the engine generated (params may nest another message). */
export function commitText(commit) {
  if (!commit) return '';
  if (!commit.msgKey) return commit.msg || '';
  const params = { ...(commit.msgParams || {}) };
  if (params.msgKey || typeof params.msg === 'string') {
    params.msg = commitText({ msg: params.msg, msgKey: params.msgKey, msgParams: params.msgParams });
  }
  return t(commit.msgKey, params);
}

/** Opens a screen element inside a container: makes the container a positioning context. */
export function mountOverlay(container, className) {
  const doc = container.ownerDocument || globalThis.document;
  const root = doc.createElement('div');
  root.className = className;
  const style = globalThis.getComputedStyle ? globalThis.getComputedStyle(container) : null;
  if (style && style.position === 'static') container.style.position = 'relative';
  container.appendChild(root);
  return root;
}

/** Re-renders `root.innerHTML` and gives the focus back to the same control (matched by data-focus). */
export function rerender(root, html) {
  const doc = root.ownerDocument;
  const active = doc && doc.activeElement && root.contains(doc.activeElement) ? doc.activeElement : null;
  const focusId = active && active.getAttribute('data-focus');
  root.innerHTML = html;
  if (focusId) {
    const next = [...root.querySelectorAll('[data-focus]')].find((el) => el.getAttribute('data-focus') === focusId);
    if (next) next.focus();
  }
}
