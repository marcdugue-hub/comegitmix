// Zone ① "In Git": repository cards (upstream, origin with its merge requests, local .git with its stash).
// Pure string builder: no DOM.
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { esc } from './html.js';

/** Normalises the lockedRepos option: ['origin'] | { origin: 5 } | [{ repo, mission }] -> { origin: 5|null }. */
export function normaliseLocked(locked) {
  const out = {};
  if (!locked) return out;
  if (Array.isArray(locked)) {
    for (const x of locked) {
      if (typeof x === 'string') out[x] = null;
      else if (x && x.repo) out[x.repo] = x.mission ?? null;
    }
  } else if (typeof locked === 'object') {
    for (const [k, v] of Object.entries(locked)) out[k] = v ?? null;
  }
  return out;
}

function ancestorsIn(map, id) {
  const seen = new Set();
  const stack = id ? [id] : [];
  while (stack.length) {
    const c = stack.pop();
    if (seen.has(c) || !map[c]) continue;
    seen.add(c);
    for (const p of map[c].parents || []) stack.push(p);
  }
  return seen;
}

/** Commits of local `main` not on the remote (ahead) and the reverse (behind). */
export function aheadBehind(state, remoteName, branch = 'main') {
  const remote = (state.remotes || {})[remoteName];
  const local = (state.branches || {})[branch];
  if (!remote || !remote.branches || !remote.branches[branch] || !local) return null;
  const map = { ...(remote.commits || {}), ...(state.commits || {}) };
  const a = ancestorsIn(map, local.tip);
  const b = ancestorsIn(map, remote.branches[branch].tip);
  let ahead = 0;
  let behind = 0;
  for (const id of a) if (!b.has(id)) ahead += 1;
  for (const id of b) if (!a.has(id)) behind += 1;
  return { ahead, behind };
}

function mrTitle(mr) {
  if (mr.titleKey) return t(mr.titleKey, mr.titleParams || {});
  return mr.title || '';
}

export function mrCardHtml(mr, { compact = false, highlight = false } = {}) {
  const status = ['open', 'approved', 'merged', 'closed'].includes(mr.status) ? mr.status : 'open';
  const statusText = t(`mr.status.${status}`);
  const title = mrTitle(mr);
  const aria = t('a11y.mr', { id: mr.id, title, status: statusText });
  if (compact) {
    return `<button type="button" class="mr-card is-compact${highlight ? ' is-highlight' : ''}" data-action="mr" data-mr="${esc(mr.id)}" aria-label="${esc(aria)}"><span class="mono mr-id">!${esc(mr.id)}</span><span class="mr-status mr-status--${status}">${esc(statusText)}</span></button>`;
  }
  return (
    `<button type="button" class="mr-card${highlight ? ' is-highlight' : ''}" data-action="mr" data-mr="${esc(mr.id)}" aria-label="${esc(aria)}">` +
    `<span class="mr-row"><span class="mono mr-id">!${esc(mr.id)}</span><span class="mr-title">${esc(title)}</span><span class="mr-status mr-status--${status}">${esc(statusText)}</span></span>` +
    `<span class="mr-row mr-meta"><span class="mono mr-source">${esc(mr.source)}</span><span aria-hidden="true">→</span><span class="mono">${esc(mr.target)}</span><span class="mr-comments">${esc(t('mr.comments', { n: mr.comments || 0 }))}</span></span>` +
    `</button>`
  );
}

function remoteCard(state, name, box, opts) {
  const remote = (state.remotes || {})[name] || { branches: {}, mrs: [] };
  const key = name === 'origin' ? 'repo.origin' : 'repo.upstream';
  const mrs = (remote.mrs || []).filter((m) => m.status !== 'closed');
  const compact = box.w < 300;
  const parts = [`<div class="repo-title">${icon('cloud')}<span>${esc(t(key))}</span></div>`];
  if (remote.pending) {
    // created on GitHub (gh repo create) but the local repository does not know it yet
    parts.push(`<div class="repo-desc">${esc(t('repo.origin.pending'))}</div>`);
    if (remote.url) parts.push(`<div class="repo-ref mono" title="${esc(remote.url)}">${esc(remote.url.replace(/^https:\/\//, ''))}</div>`);
  } else if (mrs.length && !compact) {
    const shown = mrs.filter((m) => m.status !== 'merged').concat(mrs.filter((m) => m.status === 'merged')).slice(0, 1);
    for (const mr of shown) parts.push(mrCardHtml(mr, { highlight: (opts.highlight?.mrs || []).includes(mr.id) }));
    if (mrs.length > 1) parts.push(`<span class="repo-more">+${mrs.length - 1}</span>`);
  } else {
    const empty = !Object.keys(remote.branches || {}).length;
    if (!mrs.length) parts.push(`<div class="repo-desc">${esc(t(name === 'origin' ? (empty && remote.url ? 'repo.origin.empty' : 'repo.origin.desc') : 'repo.upstream.desc'))}</div>`);
    const branch = 'main';
    const main = remote.branches && remote.branches[branch];
    if (main) {
      const ab = name === 'origin' ? aheadBehind(state, name) : null;
      const info = ab ? `↑${ab.ahead} ↓${ab.behind}` : esc(main.tip);
      parts.push(`<div class="repo-ref mono">${esc(branch)} · ${info}</div>`);
    }
    if (mrs.length) {
      // narrow card: the live MR first, then "+n" (two status chips do not fit)
      const live = mrs.filter((m) => m.status !== 'merged').concat(mrs.filter((m) => m.status === 'merged'));
      const more = live.length > 1 ? `<span class="repo-more">+${live.length - 1}</span>` : '';
      parts.push(`<div class="repo-mrs">${mrCardHtml(live[0], { compact: true })}${more}</div>`);
    }
  }
  return `<section class="repo-card repo-card--${name}${mrs.length && !compact ? ' has-mr' : ''}" style="left:${box.x}px;width:${box.w}px" data-repo="${name}" aria-label="${esc(t(key))}">${parts.join('')}</section>`;
}

function lockedCard(name, mission, box) {
  const key = name === 'origin' ? 'repo.origin' : 'repo.upstream';
  const chip = mission != null ? t('repo.locked', { n: mission }) : t('ui.locked');
  return (
    `<section class="repo-card repo-card--locked" style="left:${box.x}px;width:${box.w}px" data-repo="${name}" aria-label="${esc(t(key))}">` +
    `<div class="repo-title">${icon('lock')}<span>${esc(t(key))}</span></div>` +
    `<div class="repo-desc">${esc(t('repo.lockedDesc'))}</div>` +
    `<div class="repo-lock-chip">${esc(chip)}</div></section>`
  );
}

/** The repository's stash (one for every desk, as in Git): a chip in the title row of the local card. */
function stashChip(state) {
  const n = (state.stash || []).length;
  if (!n) return '';
  return `<button type="button" class="stash-chip" data-action="stash" data-stash-chip="repo" aria-label="${esc(t('stash.label', { n }))}" title="${esc(t('stash.label', { n }))}">${icon('archive')}<span>${esc(t('stash.chip', { n }))}</span></button>`;
}

function localCard(state, box, stats) {
  if (state.noGit) {
    // a plain folder: no .git yet (git init creates it)
    return (
      `<section class="repo-card repo-card--local repo-card--nogit" style="left:${box.x}px;width:${box.w}px" data-repo="local" aria-label="${esc(t('repo.noGit'))}">` +
      `<div class="repo-title"><span>${esc(t('repo.noGit'))}</span></div>` +
      `<div class="repo-desc">${esc(t('repo.noGit.desc'))}</div></section>`
    );
  }
  const stat = (n, key) => `<div class="repo-stat"><b>${n}</b><span>${esc(t(key, { n }))}</span></div>`;
  return (
    `<section class="repo-card repo-card--local" style="left:${box.x}px;width:${box.w}px" data-repo="local" aria-label="${esc(t('repo.local'))}">` +
    `<div class="repo-title"><span>${esc(t('repo.local'))}</span>${stashChip(state)}</div>` +
    `<div class="repo-stats">${stat(stats.commits, 'repo.stats.commits')}${stat(stats.branches, 'repo.stats.branches')}${stat(stats.desks, 'repo.stats.desks')}</div>` +
    `<div class="repo-foot">${icon('layers')}<span>${esc(t('repo.singleGit'))}</span></div></section>`
  );
}

function arrow(x1, x2, y, label, cls) {
  const left = Math.min(x1, x2);
  const w = Math.abs(x2 - x1);
  const dir = x2 > x1 ? 'right' : 'left';
  return `<div class="repo-arrow repo-arrow--${dir} ${cls}" style="left:${left}px;top:${y}px;width:${w}px" aria-hidden="true"><span>${esc(label)}</span></div>`;
}

/** Counts shown in the local card. */
export function localStats(state) {
  return {
    commits: Object.keys(state.commits || {}).length,
    branches: Object.keys(state.branches || {}).length,
    desks: (state.worktrees || []).length,
  };
}

/** HTML of the repository cards in zone ①. */
export function gitZoneHtml(state, opts = {}) {
  const visible = new Set(state.visibleRepos || ['local']);
  const locked = normaliseLocked(opts.lockedRepos);
  const cards = [];
  for (const name of ['upstream', 'origin']) {
    if (visible.has(name) && (state.remotes || {})[name]) cards.push({ name, kind: 'remote' });
    else if (visible.has(name) || name in locked) cards.push({ name, kind: 'locked', mission: locked[name] ?? null });
  }
  const out = [];
  const stats = localStats(state);
  const hasMr = (n) => ((state.remotes || {})[n]?.mrs || []).some((m) => m.status !== 'closed');
  if (cards.length === 0) {
    out.push(localCard(state, { x: 600, w: 388 }, stats));
  } else if (cards.length === 1) {
    const w = cards[0].kind === 'remote' && hasMr(cards[0].name) ? 420 : 380;
    const c = cards[0];
    out.push(c.kind === 'remote' ? remoteCard(state, c.name, { x: 200, w }, opts) : lockedCard(c.name, c.mission, { x: 200, w }));
    out.push(localCard(state, { x: 200 + w + 20, w: 788 - w - 20 }, stats));
  } else {
    const boxes = [{ x: 200, w: 210 }, { x: 466, w: 210 }];
    cards.forEach((c, i) => out.push(c.kind === 'remote' ? remoteCard(state, c.name, boxes[i], opts) : lockedCard(c.name, c.mission, boxes[i])));
    out.push(localCard(state, { x: 732, w: 256 }, stats));
    out.push(arrow(414, 462, 80, t('repo.arrow.fork'), 'is-fork'));
    out.push(arrow(680, 728, 58, t('repo.arrow.pull'), 'is-pull'));
    out.push(arrow(728, 680, 104, t('repo.arrow.push'), 'is-push'));
  }
  return out.join('');
}
