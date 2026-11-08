// Zone ② "The lanes": SVG markup (lanes, merges, commits, wires) and the HTML overlay
// (lane labels, chips, commit buttons, messages). Pure string builders: no DOM.
import { t } from '../i18n/i18n.js';
import { esc, px, commitMessage } from './html.js';
import { G } from './lanes-layout.js';

const isSet = (list, v) => Array.isArray(list) && list.includes(v);

/** Description shown under the lane name in the left column. */
export function laneDescription(lane, state, opts = {}) {
  if (opts.laneLabels && lane.name && opts.laneLabels[lane.name]) return opts.laneLabels[lane.name];
  const desks = state.worktrees || [];
  switch (lane.kind) {
    case 'remote':
      return t('lane.remote.desc', { remote: lane.name.split('/')[0] });
    case 'online':
      return t('lane.online.desc');
    case 'ghost':
      return t(opts.ghostKind === 'preview' ? 'lane.preview' : 'lane.goal');
    case 'anon':
      return t('lane.merged.desc');
    case 'detached':
      return t('lane.detached');
    default: {
      const desk = desks.find((w) => w.branch === lane.name);
      if (lane.key === opts.mainLane && lane.name === 'main') return t('lane.main.desc');
      if (desk) return t('lane.desk.desc', { folder: desk.path });
      return t('lane.noDesk.desc');
    }
  }
}

function deskOpacityClass(state, deskId) {
  if (String(deskId).startsWith('ghost:')) return 'is-ghost';
  return deskId === state.active ? 'is-active' : 'is-inactive';
}

/** SVG markup of the lanes layer (lanes, merge curves, commits). */
export function lanesSvg(layout, opts = {}) {
  const hl = opts.highlight || {};
  const out = [];
  const lw = layout.laneWidth;
  for (const l of layout.lanes) {
    const cls = ['lane-path', l.dashed ? 'is-dashed' : '', l.faded ? 'is-faded' : '', l.ghost ? 'is-ghost' : '', isSet(hl.branches, l.name) ? 'is-highlight' : '']
      .filter(Boolean)
      .join(' ');
    out.push(`<path class="${cls}" data-lane="${esc(l.key)}" d="${l.path}" style="stroke:${l.color};stroke-width:${lw}px"/>`);
  }
  for (const e of layout.edges) {
    const cls = ['edge-path', `edge--${e.kind}`, e.dashed ? 'is-dashed' : '', e.ghost ? 'is-ghost' : ''].filter(Boolean).join(' ');
    out.push(`<path class="${cls}" data-edge="${esc(e.from)}-${esc(e.to)}" d="${e.path}" style="stroke:${e.color};stroke-width:${e.kind === 'pending' ? 4 : lw}px"/>`);
  }
  for (const c of Object.values(layout.commits)) {
    const cls = ['commit', c.tip ? 'is-tip' : '', c.ghost ? 'is-ghost' : '', c.dashed && !c.ghost ? 'is-dashed' : '', c.online ? 'is-faded' : '', c.ai ? 'is-ai' : '', c.colorIdx === 0 ? 'is-main' : '', isSet(hl.commits, c.id) ? 'is-highlight' : '']
      .filter(Boolean)
      .join(' ');
    const fill = c.tip && !c.ghost && !c.dashed ? c.color : '';
    const stroke = c.ghost || c.dashed ? c.color : '';
    const style = [fill ? `--commit-fill:${fill}` : '', stroke ? `--commit-stroke:${stroke}` : ''].filter(Boolean).join(';');
    out.push(
      `<g class="${cls}" data-commit-id="${esc(c.id)}"${style ? ` style="${style}"` : ''}>` +
        (isSet(hl.commits, c.id) ? `<circle class="commit-halo" cx="${px(c.x)}" cy="${px(c.y)}" r="${c.r + 6}"/>` : '') +
        `<circle class="commit-dot" cx="${px(c.x)}" cy="${px(c.y)}" r="${c.r}"/>` +
        (c.ai ? `<circle class="commit-ai" cx="${px(c.x)}" cy="${px(c.y)}" r="${Math.max(3, Math.round(c.r * 0.34))}"/>` : '') +
        `</g>`,
    );
  }
  return out.join('');
}

/** Wire items (keyed by desk) for the wires layer of the SVG. */
export function wireItems(layout, state) {
  return layout.wires.map((w) => ({
    key: w.desk,
    cls: ['wire', w.elbow ? 'is-elbow' : '', deskOpacityClass(state, w.desk)].filter(Boolean).join(' '),
    d: w.path,
    color: w.color,
  }));
}

function chipHtml(c, state, opts) {
  const hl = opts.highlight || {};
  const light = c.colorIdx !== 0 || c.dashed || c.ghost;
  const cls = ['scene-chip', `scene-chip--${c.kind}`, c.dashed ? 'is-dashed' : '', c.ghost ? 'is-ghost' : '', light ? '' : 'is-dark', layoutTight(opts) ? 'is-small' : '', isSet(hl.branches, c.branch) ? 'is-highlight' : '']
    .filter(Boolean)
    .join(' ');
  let label = esc(c.label);
  if (c.kind === 'online') label = esc(t('mr.onlineOnly', { id: c.mr }));
  const tag = c.head && c.kind !== 'detached' ? `<i>HEAD</i>` : '';
  const ghostTag = c.ghost ? `<i>${esc(t(opts.ghostKind === 'preview' ? 'lane.preview' : 'lane.goal'))}</i>` : '';
  const style = `left:${px(c.x)}px;top:${px(c.y)}px;--lane:${c.color}`;
  if (c.ghost || c.kind === 'online' || !c.branch) {
    return `<span class="${cls}" style="${style}">${label}${tag}${ghostTag}</span>`;
  }
  const aria = t('a11y.branch', { name: c.branch });
  return `<button type="button" class="${cls}" style="${style}" data-action="branch" data-branch="${esc(c.branch)}" data-remote="${c.kind === 'remote' ? 1 : 0}" aria-label="${esc(aria)}">${label}${tag}</button>`;
}

function layoutTight(opts) {
  return !!(opts.layout && opts.layout.tight);
}

const MSG_CHAR = 7.2; // approximate width of one 12px mono character
const MSG_PAD = 12;
const MSG_MIN = 40; // below this width a message is left out rather than unreadable

/**
 * Width given to each commit message so that the centred labels of one lane never overlap.
 * Fitted from the newest commit (the most useful label) to the oldest; a label without room is left out (0).
 * Returns { [commitId]: maxWidth }.
 */
export function fitMessages(commits) {
  const byLane = {};
  for (const c of Object.values(commits)) (byLane[c.y] ||= []).push(c);
  const widths = {};
  for (const row of Object.values(byLane)) {
    row.sort((a, b) => b.x - a.x);
    let leftEdge = Infinity; // left edge of the nearest label on the right
    for (const c of row) {
      const msg = commitMessage(c);
      if (!msg) { widths[c.id] = 0; continue; }
      const prefix = c.ai && !(c.ghost || c.online) ? t('author.ai.short').length + 1 : 0;
      const wanted = Math.min(c.msgMax || 120, Math.ceil(MSG_PAD + MSG_CHAR * (msg.length + prefix)) + 1);
      const room = Number.isFinite(leftEdge) ? 2 * (leftEdge - 3 - c.x) : Infinity;
      const w = Math.floor(Math.min(wanted, room));
      if (w < MSG_MIN) { widths[c.id] = 0; continue; }
      widths[c.id] = w;
      leftEdge = c.x - w / 2;
    }
  }
  return widths;
}

/** HTML overlay of zone ②: lane labels, chips, commit buttons and messages. */
export function lanesOverlayHtml(layout, state, opts = {}) {
  const o = { ...opts, layout, mainLane: layout.mainLane };
  const out = [];
  const twoLines = layout.spacing >= 40;
  for (const l of layout.lanes) {
    const name = l.kind === 'detached' ? 'HEAD' : l.kind === 'anon' ? '' : l.name;
    const desc = laneDescription(l, state, o);
    // the lane name sits on the lane line (its 18px line is centred on y); the description goes below
    const top = l.y - 9;
    out.push(
      `<div class="lane-label${twoLines ? '' : ' is-compact'}${l.ghost ? ' is-ghost' : ''}" style="top:${px(top)}px">` +
        (name ? `<b>${esc(name)}</b>` : '') +
        (twoLines || !name ? `<span>${esc(desc)}</span>` : '') +
        `</div>`,
    );
  }
  for (const c of layout.chips) out.push(chipHtml(c, state, o));
  const showMsg = layout.spacing >= 44;
  const widths = fitMessages(layout.commits);
  for (const c of Object.values(layout.commits)) {
    const msg = widths[c.id] ? commitMessage(c) : '';
    const author = t(c.ai ? 'author.ai' : 'author.human');
    const maxW = widths[c.id];
    if (c.ghost || c.online) {
      if (showMsg && msg) out.push(`<div class="commit-msg is-ghost" style="left:${px(c.x)}px;top:${px(c.y + c.r + 5)}px;max-width:${maxW}px">${esc(msg)}</div>`);
      continue;
    }
    const aria = t('a11y.commit', { id: c.id, msg: commitMessage(c), author });
    const size = c.r * 2 + 4;
    out.push(
      `<button type="button" class="commit-hit" data-action="commit" data-commit="${esc(c.id)}" style="left:${px(c.x - size / 2)}px;top:${px(c.y - size / 2)}px;width:${size}px;height:${size}px" aria-label="${esc(aria)}"></button>`,
    );
    if (showMsg && msg) {
      const ai = c.ai ? `<b class="commit-msg-ai">${esc(t('author.ai.short'))}</b>` : '';
      out.push(`<div class="commit-msg" style="left:${px(c.x)}px;top:${px(c.y + c.r + 5)}px;max-width:${maxW}px" title="${esc(msg)}">${ai}${esc(msg)}</div>`);
    }
  }
  if (layout.folded > 0) {
    const main = layout.lanes.find((l) => l.key === layout.mainLane);
    const y = main ? main.y : G.yBottom;
    out.push(`<div class="lanes-folded" style="left:${G.laneX0 - 4}px;top:${px(y - 34)}px">${esc(t('lane.folded', { n: layout.folded }))}</div>`);
  }
  return out.join('');
}
