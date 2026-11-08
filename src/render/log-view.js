// Readable commit list: newest first, author marker (AI / human), message. Pure rendering of `git log` output.
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { apply } from '../engine/apply.js';
import { esc, commitText } from './screens-util.js';

/** The commits to show: [{ id, parents, msg, msgKey, msgParams, author, files }] (newest first). */
export function logCommits(state, { desk = null, branch = null } = {}) {
  const command = { name: 'log', args: branch ? [branch] : [], options: {}, ...(desk ? { desk } : {}) };
  const result = apply(state, command);
  if (result.error || !result.output || result.output.kind !== 'log') return [];
  return result.output.commits;
}

function branchesAt(state, id) {
  return Object.keys(state.branches || {}).filter((name) => state.branches[name].tip === id);
}

/** HTML of the log list (used by renderLog and by tests). */
export function logHtml(state, opts = {}) {
  const commits = logCommits(state, opts);
  if (!commits.length) return `<p class="log-empty">${t('explain.log.empty')}</p>`;
  const items = commits.map((c) => {
    const ai = c.author === 'ai';
    const merge = c.parents.length > 1;
    const tips = branchesAt(state, c.id).map((n) => `<span class="chip chip--branch log-branch">${esc(n)}</span>`).join('');
    return `<li class="log-item log-item--${ai ? 'ai' : 'human'}" data-commit="${esc(c.id)}">
  <span class="log-author" data-author="${ai ? 'ai' : 'human'}">${icon(ai ? 'star' : 'users', { size: 14 })}<span>${t(ai ? 'log.author.ai' : 'log.author.human')}</span></span>
  <span class="log-msg">${esc(commitText(c))}</span>
  ${merge ? `<span class="badge badge--pill log-merge">${icon('git-merge', { size: 12 })} ${t('log.merge')}</span>` : ''}
  ${tips}
  <span class="log-files">${t('log.files', { n: c.files.length })}</span>
  <span class="log-id">${esc(c.id)}</span>
</li>`;
  });
  return `<ol class="log-list" aria-label="${t('log.list')}">${items.join('')}</ol>`;
}

/** Fills `container` with the log of a desk / branch. Returns nothing; call again to refresh. */
export function renderLog(container, state, opts = {}) {
  container.innerHTML = logHtml(state, opts);
}
