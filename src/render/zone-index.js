// Zone ③ "The index": one strip per desk, aligned with its tile (2 chips max, then "+n").
// The stash is not here: it belongs to the repository and is drawn on the local .git card (zone ①).
// Pure string builders: no DOM.
import { t } from '../i18n/i18n.js';
import { icon } from '../ui/icons.js';
import { esc, fileLetter } from './html.js';

/** Staged files of a desk (the desk's own index). */
export function stagedFiles(desk) {
  return (desk.files || []).filter((f) => f.kind !== 'dir' && f.staged);
}

function baseName(path) {
  const i = String(path).lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

/** Inner HTML of one index strip. */
export function indexStripInner(desk, { ghost = false, highlight = [] } = {}) {
  const staged = ghost ? [] : stagedFiles(desk);
  const max = 2;
  const parts = [];
  for (const f of staged.slice(0, max)) {
    const l = fileLetter(f) || { letter: 'A', cls: 'A' };
    const aria = t('index.unstage', { path: f.path });
    const hl = highlight.includes(f.path) ? ' is-highlight' : '';
    parts.push(
      `<button type="button" class="index-chip${hl}" data-action="unstage" data-desk="${esc(desk.id)}" data-path="${esc(f.path)}" data-index-chip="${esc(desk.id)}|${esc(f.path)}" aria-label="${esc(aria)}" title="${esc(f.path)}">` +
        `<span class="badge badge--${l.cls}">${l.letter}</span><span class="index-name">${esc(baseName(f.path))}</span></button>`,
    );
  }
  if (staged.length > max) parts.push(`<span class="index-more" title="${esc(staged.slice(max).map((f) => f.path).join(', '))}">+${staged.length - max}</span>`);
  if (!staged.length) parts.push(`<span class="index-empty">${esc(t('index.empty'))}</span>`);
  return parts.join('');
}

/** Keyed strip items (one per tile) for zone ③. */
export function indexItems(state, layout, opts = {}) {
  const desks = state.worktrees || [];
  const hlFiles = (opts.highlight && opts.highlight.files) || [];
  return layout.tiles.map((tile) => {
    const desk = desks.find((w) => w.id === tile.desk);
    const ghost = !desk;
    const cls = ['index-strip', ghost ? 'is-ghost' : tile.desk === state.active ? 'is-active' : 'is-inactive'].join(' ');
    const d = desk || { id: tile.desk, path: tile.path, files: [] };
    return {
      key: tile.desk,
      cls,
      style: `left:${tile.x}px;width:${tile.w}px;--lane:${tile.color}`,
      attrs: { 'data-desk': tile.desk, role: 'group', 'aria-label': t('index.label', { folder: d.path }) },
      html: indexStripInner(d, { ghost, highlight: hlFiles.filter((f) => f.desk === tile.desk).map((f) => f.path) }),
    };
  });
}
