// Zone ④ "On your computer": one tile per desk (worktree folder) with its interactive file tree.
// Pure string builders: no DOM. Open folders are UI state passed in (a Set of paths per desk).
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { esc, fileLetter } from './html.js';

const URGENCY = ['conflict', 'M', 'U', 'A'];

function parentOf(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}
function baseName(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

/** Folder dot class: most urgent change inside (conflict, then M, then U, then staged). Null when clean. */
export function folderDot(desk, dir) {
  const prefix = `${dir}/`;
  let best = null;
  for (const f of desk.files || []) {
    if (f.kind === 'dir' || !f.path.startsWith(prefix)) continue;
    let k = null;
    if (f.status === 'conflict') k = 'conflict';
    else if ((f.status === 'M' || f.status === 'D') && !f.staged) k = 'M';
    else if (f.status === 'U' && !f.staged) k = 'U';
    else if (f.staged) k = 'A';
    if (k && (best === null || URGENCY.indexOf(k) < URGENCY.indexOf(best))) best = k;
  }
  return best;
}

/**
 * Visible tree rows: folders first then files (alphabetical) at each level; children of open folders only.
 * @returns {{ path, name, dir: boolean, depth, open, file }[]}
 */
export function treeRows(desk, open = new Set()) {
  const files = desk.files || [];
  const dirs = new Set(files.filter((f) => f.kind === 'dir').map((f) => f.path));
  // folders implied by paths (robustness)
  for (const f of files) {
    let p = parentOf(f.path);
    while (p) {
      dirs.add(p);
      p = parentOf(p);
    }
  }
  const byParent = {};
  const add = (parent, item) => (byParent[parent] = byParent[parent] || []).push(item);
  for (const d of dirs) add(parentOf(d), { path: d, dir: true });
  for (const f of files) if (f.kind !== 'dir') add(parentOf(f.path), { path: f.path, dir: false, file: f });
  const sortFn = (a, b) => (a.dir !== b.dir ? (a.dir ? -1 : 1) : a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const rows = [];
  const walk = (parent, depth) => {
    for (const item of (byParent[parent] || []).sort(sortFn)) {
      const isOpen = item.dir && open.has(item.path);
      rows.push({ path: item.path, name: baseName(item.path), dir: item.dir, depth, open: isOpen, file: item.file || null });
      if (isOpen) walk(item.path, depth + 1);
    }
  };
  walk('', 0);
  return rows;
}

function rowHtml(desk, row, { ghost, highlight }) {
  const d = esc(desk.id);
  const p = esc(row.path);
  const indent = `style="--depth:${row.depth}"`;
  const hl = highlight.includes(row.path) ? ' is-highlight' : '';
  if (row.dir) {
    const dot = ghost ? null : folderDot(desk, row.path);
    const chev = `<span class="tree-chev${row.open ? ' is-open' : ''}">${icon('chevron-right', { size: 14 })}</span>`;
    const ic = icon(row.open ? 'folder-open' : 'folder');
    if (ghost) return `<li class="tree-row is-dir" ${indent}><span class="tree-main">${chev}${ic}<span class="tree-name">${esc(row.name)}</span></span></li>`;
    const label = t(row.open ? 'tree.closeFolder' : 'tree.openFolder', { path: row.path });
    return (
      `<li class="tree-row is-dir${hl}" ${indent} data-row="${d}|${p}">` +
      `<button type="button" class="tree-main" data-action="toggle" data-desk="${d}" data-path="${p}" aria-expanded="${row.open}" aria-label="${esc(label)}">${chev}${ic}<span class="tree-name">${esc(row.name)}</span></button>` +
      `<button type="button" class="btn-plus" data-action="create" data-desk="${d}" data-dir="${p}" aria-label="${esc(t('tree.addIn', { path: row.path }))}">${icon('plus', { size: 14 })}</button>` +
      (dot ? `<span class="tree-dot tree-dot--${dot}" data-file="${d}|${p}" role="img" aria-label="${esc(t('tree.folderChanged'))}"></span>` : `<span class="tree-dot-space"></span>`) +
      `</li>`
    );
  }
  const f = row.file;
  const ic = `<span class="tree-chev is-empty"></span>${icon('file')}`;
  if (ghost) return `<li class="tree-row" ${indent}><span class="tree-main">${ic}<span class="tree-name">${esc(row.name)}</span></span></li>`;
  const l = fileLetter(f);
  const state = l ? t(l.key) : t('status.clean');
  const aria = t('tree.fileAction', { path: row.path, status: state });
  const showDiff = f.status === 'M' || f.status === 'conflict';
  const canDelete = f.status !== 'D' && f.status !== 'conflict';
  return (
    `<li class="tree-row${f.status === 'D' ? ' is-deleted' : ''}${hl}" ${indent} data-row="${d}|${p}">` +
    `<button type="button" class="tree-main" data-action="click" data-desk="${d}" data-path="${p}" aria-label="${esc(aria)}">${ic}<span class="tree-name">${esc(row.name)}</span></button>` +
    (canDelete ? `<button type="button" class="tree-del" data-action="delete" data-desk="${d}" data-path="${p}" aria-label="${esc(t('tree.delete', { path: row.path }))}">${icon('x', { size: 13 })}</button>` : '') +
    (showDiff ? `<button type="button" class="badge--link tree-diff" data-action="diff" data-desk="${d}" data-path="${p}" aria-label="${esc(t('tree.diffLabel', { path: row.path }))}">${esc(t('tree.diff'))}</button>` : '') +
    (l ? `<span class="badge badge--${l.cls}" data-file="${d}|${p}" title="${esc(t(l.key))}">${l.letter}</span>` : `<span class="badge-space"></span>`) +
    `</li>`
  );
}

/** Inner HTML of a tile. */
export function tileInner(desk, tile, { active = false, ghost = false, open = new Set(), aiWork = false, highlight = [] } = {}) {
  const d = esc(desk.id);
  const band = `<span class="tile-band" aria-hidden="true"></span>`;
  const name = `${esc(desk.path)}/`;
  const head = ghost
    ? `<div class="tile-head">${icon('folder')}<span class="tile-name">${name}</span></div>`
    : `<div class="tile-head">${icon('folder')}<button type="button" class="tile-name" data-action="cd" data-desk="${d}" aria-label="${esc(t('desk.cd', { folder: desk.path }))}" title="${esc(desk.path)}">${name}</button>` +
      (aiWork ? `<button type="button" class="tile-ai" data-action="ai-work" data-desk="${d}" aria-label="${esc(t('desk.aiWork'))}" title="${esc(t('desk.aiWork'))}">${icon('play', { size: 14 })}</button>` : '') +
      `<button type="button" class="btn-plus btn-plus--lg" data-action="create" data-desk="${d}" data-dir="" aria-label="${esc(t('tree.addFile'))}">${icon('plus', { size: 15 })}</button></div>`;
  let branch;
  if (desk.branch) branch = esc(desk.branch);
  else branch = esc(t('desk.detached'));
  const note = ghost ? t('desk.toCreate') : desk.main ? t('desk.main') : t('desk.linked');
  const unborn = !ghost && desk.branch && !desk.head ? ` · ${esc(t('desk.unborn'))}` : '';
  const descText = `${desk.branch || t('desk.detached')} · ${note}`;
  const here = active ? `<span class="tile-here">${esc(t('tree.here'))}</span>` : '';
  const desc = `<div class="tile-desc" title="${esc(descText)}"><span class="mono tile-branch">${branch}</span><span class="tile-note">· ${esc(note)}${unborn}</span>${here}</div>`;
  const rows = treeRows(desk, open);
  const list = rows.length
    ? `<ul class="tree-list" role="list" data-tree="${d}">${rows.map((r) => rowHtml(desk, r, { ghost, highlight })).join('')}</ul>`
    : `<div class="tree-list tree-empty" data-tree="${d}">${esc(t('tree.empty'))}</div>`;
  return band + head + desc + list;
}

/** Keyed tile items for zone ④. */
export function tileItems(state, layout, opts = {}) {
  const desks = state.worktrees || [];
  const ghostDesks = ((opts.ghostState && opts.ghostState.worktrees) || []);
  const hlDesks = (opts.highlight && opts.highlight.desks) || [];
  const hlFiles = (opts.highlight && opts.highlight.files) || [];
  return layout.tiles.map((tile) => {
    const real = desks.find((w) => w.id === tile.desk);
    const ghost = !real;
    const desk = real || ghostDesks.find((w) => w.path === tile.path) || { id: tile.desk, path: tile.path, files: [], stash: [] };
    const active = !ghost && desk.id === state.active;
    const aiWork = !ghost && opts.aiWork !== false && !!desk.branch && desk.branch.startsWith('ia/');
    const cls = ['tile', ghost ? 'is-ghost' : active ? 'is-active' : 'is-inactive', tile.w < 250 ? 'is-narrow' : '', hlDesks.includes(tile.desk) ? 'is-highlight' : '']
      .filter(Boolean)
      .join(' ');
    const attrs = { 'data-desk': tile.desk, role: 'group', 'aria-label': t(ghost ? 'desk.ghostLabel' : 'desk.label', { folder: desk.path, branch: desk.branch || t('desk.detached') }) };
    if (!ghost && !active) attrs['data-action'] = 'cd';
    return {
      key: tile.desk,
      cls,
      style: `left:${tile.x}px;width:${tile.w}px;--lane:${tile.color}`,
      attrs,
      html: tileInner({ ...desk, id: tile.desk }, tile, {
        active, ghost, aiWork,
        open: (opts.openDirs && opts.openDirs.get(tile.desk)) || new Set(),
        highlight: hlFiles.filter((f) => f.desk === tile.desk).map((f) => f.path),
      }),
    };
  });
}

/** Left column of zone ④ (path, letter legend, hint). Hidden when four tiles use the full width. */
export function diskLegendHtml() {
  const item = (letter, cls, key) => `<div class="disk-legend-item"><span class="badge badge--${cls}">${letter}</span><span>${esc(t(key))}</span></div>`;
  return (
    `<div class="disk-path mono">${esc(t('zone.disk.path'))}</div>` +
    `<div class="disk-legend">${item('M', 'M', 'letter.M')}${item('U', 'U', 'letter.U')}${item('A', 'A', 'letter.A')}</div>` +
    `<p class="disk-tip">${esc(t('tree.tip'))}</p>`
  );
}
