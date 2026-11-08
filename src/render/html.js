// Small string helpers shared by the zone renderers (no DOM).
import { t } from '../i18n/i18n.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML content and attribute values. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Rounds a coordinate for compact markup. */
export function px(v) {
  return Math.round(v * 10) / 10;
}

/** Text of a commit message: free text, or an engine i18n key (params may themselves hold a key). */
export function commitMessage(c) {
  if (!c) return '';
  if (c.msgKey) {
    const params = { ...(c.msgParams || {}) };
    if (params.msgKey) params.msg = t(params.msgKey, params.msgParams || params);
    return t(c.msgKey, params);
  }
  return c.msg || '';
}

/** Display letter and modifier of a file entry (IDE convention). Null when clean. */
export function fileLetter(f) {
  if (!f || f.kind === 'dir') return null;
  if (f.status === 'conflict') return { letter: '!', cls: 'conflict', key: 'letter.conflict' };
  if (f.status === 'U') return f.staged ? { letter: 'A', cls: 'A', key: 'letter.A' } : { letter: 'U', cls: 'U', key: 'letter.U' };
  if (f.status === 'M') return f.staged ? { letter: 'M', cls: 'M is-staged', key: 'letter.A' } : { letter: 'M', cls: 'M', key: 'letter.M' };
  if (f.status === 'D') return { letter: 'D', cls: 'M', key: 'letter.D' };
  return null;
}
