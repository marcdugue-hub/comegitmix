// The scene: four zones (① In Git, ② lanes, ③ index, ④ on your computer) drawn from an engine state.
//
//   const scene = renderScene(container, state, { onAction, goalState?, previewState?, highlight?, lockedRepos?,
//                                                 note?, laneLabels?, aiWork? });
//   scene.update(nextState, events, optionsPatch?)  // redraw + animations
//   scene.shake()                                    // played error
//   scene.destroy()
//
// onAction(action) receives scene manipulations (the caller turns them into engine commands):
//   { type: 'click',   desk, path }      file clicked ("I worked on it" cycle)
//   { type: 'create',  desk, dir }       + on a tile (dir '') or a folder
//   { type: 'diff',    desk, path }      "diff" link of an M / conflicted file
//   { type: 'delete',  desk, path }      trash button of a file (rm)
//   { type: 'cd',      desk }            tile clicked: becomes the active desk
//   { type: 'ai-work', desk }            "Make the AI work" (tiles on ia/* branches)
//   { type: 'commit',  id, anchor }      commit circle (popover is the caller's)
//   { type: 'branch',  name, remote, anchor }  lane chip
//   { type: 'mr',      id, anchor }      merge request card
//   { type: 'unstage', desk, path }      index chip
//   { type: 'stash',   desk, anchor }    stash chip
// Folder open / close is UI state kept here (no action).
import { t, onChange } from '../i18n/i18n.js';
import { esc } from './html.js';
import { computeLayout } from './lanes-layout.js';
import { gitZoneHtml } from './zone-git.js';
import { lanesSvg, lanesOverlayHtml, wireItems } from './zone-lanes.js';
import { indexItems } from './zone-index.js';
import { tileItems, diskLegendHtml } from './zone-disk.js';
import { animateEvents, shake as shakeEl } from './animate.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let uid = 0;

/** Reads the action described by a clicked element (data-action and data-*). Pure: works on any element-like. */
export function actionFromElement(el) {
  if (!el || !el.dataset || !el.dataset.action) return null;
  const d = el.dataset;
  switch (d.action) {
    case 'click':
    case 'diff':
    case 'delete':
    case 'unstage':
      return { type: d.action, desk: d.desk, path: d.path };
    case 'toggle':
      return { type: 'toggle', desk: d.desk, path: d.path };
    case 'create':
      return { type: 'create', desk: d.desk, dir: d.dir || '' };
    case 'cd':
      return { type: 'cd', desk: d.desk };
    case 'ai-work':
      return { type: 'ai-work', desk: d.desk };
    case 'commit':
      return { type: 'commit', id: d.commit, anchor: el };
    case 'branch':
      return { type: 'branch', name: d.branch, remote: d.remote === '1', anchor: el };
    case 'mr':
      return { type: 'mr', id: Number(d.mr), anchor: el };
    case 'stash':
      return { type: 'stash', desk: d.desk, anchor: el };
    default:
      return null;
  }
}

/** Parent folders of a path ("a/b/c.md" -> ["a", "a/b"]). */
export function parentDirs(path) {
  const parts = String(path).split('/');
  const out = [];
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join('/'));
  return out;
}

/** Folders to open after events (a new file inside a folder opens it). */
export function dirsToOpen(events = []) {
  const out = [];
  for (const e of events || []) {
    if (e && e.type === 'file.created' && e.desk && e.path) for (const d of parentDirs(e.path)) out.push({ desk: e.desk, dir: d });
  }
  return out;
}

function syncKeyed(doc, parent, items, { ns = null, tag = 'div', managed = [] } = {}) {
  const existing = new Map();
  for (const el of [...parent.children]) existing.set(el.getAttribute('data-key'), el);
  let ref = parent.firstChild;
  for (const it of items) {
    let el = existing.get(it.key);
    if (el) existing.delete(it.key);
    else {
      el = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);
      el.setAttribute('data-key', it.key);
    }
    el.setAttribute('class', it.cls);
    if (it.style !== undefined) el.setAttribute('style', it.style);
    for (const a of managed) if (!(it.attrs && a in it.attrs)) el.removeAttribute(a);
    for (const [a, v] of Object.entries(it.attrs || {})) el.setAttribute(a, v);
    if (it.html !== undefined && el.__html !== it.html) {
      el.innerHTML = it.html;
      el.__html = it.html;
    }
    if (el !== ref) parent.insertBefore(el, ref);
    ref = el.nextSibling;
  }
  for (const el of existing.values()) el.remove();
}

function zoneHtml(id, zone, titleKey, hintKey) {
  return (
    `<section class="zone zone--${zone}" aria-labelledby="${id}-${zone}">` +
    `<h2 class="zone-title" id="${id}-${zone}"><span aria-hidden="true">★ </span>${esc(t(titleKey))}</h2>` +
    (hintKey ? `<p class="zone-hint zone-hint--${zone}">${esc(t(hintKey))}</p>` : '') +
    `</section>`
  );
}

/**
 * Renders the scene into `container`.
 * @param {HTMLElement} container
 * @param {object} state engine state
 * @param {object} [options]
 */
export function renderScene(container, state, options = {}) {
  const doc = container.ownerDocument || document;
  const id = `scene${++uid}`;
  let opts = { ...options };
  let current = state;
  let layout = null;
  let colors = {};
  const openDirs = new Map();

  const root = doc.createElement('div');
  root.className = 'scene scene-render';
  root.setAttribute('role', 'region');
  root.innerHTML =
    `<div class="scene-frames"></div>` +
    `<svg class="scene-svg" xmlns="${SVG_NS}" viewBox="0 0 1012 796" width="1012" height="796" aria-hidden="true" focusable="false"><g class="lanes-layer"></g><g class="wires-layer"></g><g class="fx-layer"></g></svg>` +
    `<div class="scene-layer git-layer"></div>` +
    `<div class="scene-layer lanes-overlay"></div>` +
    `<div class="scene-layer index-layer"></div>` +
    `<div class="scene-layer tiles-layer"></div>` +
    `<div class="scene-layer note-layer"></div>` +
    `<ul class="sr-only scene-summary" role="list"></ul>`;
  container.appendChild(root);
  const q = (sel) => root.querySelector(sel);
  const frames = q('.scene-frames');
  const lanesLayer = q('.lanes-layer');
  const wiresLayer = q('.wires-layer');
  const fxLayer = q('.fx-layer');
  const gitLayer = q('.git-layer');
  const lanesOverlay = q('.lanes-overlay');
  const indexLayer = q('.index-layer');
  const tilesLayer = q('.tiles-layer');
  const noteLayer = q('.note-layer');
  const summary = q('.scene-summary');

  const ghostState = () => opts.goalState || opts.previewState || null;
  const ghostKind = () => (opts.goalState ? 'goal' : opts.previewState ? 'preview' : null);

  function focusKey(el) {
    if (!el || !root.contains(el) || !el.dataset) return null;
    const d = el.dataset;
    return [d.action, d.desk, d.path, d.dir, d.commit, d.branch, d.mr].join('|');
  }

  function draw() {
    const prevLayout = layout;
    const ghost = ghostState();
    layout = computeLayout(current, { ghost, colors, orderHint: prevLayout ? prevLayout.order : null });
    colors = { ...colors, ...layout.colors };
    const four = layout.tiles.length > 3;
    const o = { ...opts, layout, ghostKind: ghostKind(), ghostState: ghost, openDirs };

    // keep focus and scroll positions across the redraw
    const fk = focusKey(doc.activeElement);
    const scrolls = {};
    for (const el of root.querySelectorAll('[data-tree]')) scrolls[el.getAttribute('data-tree')] = el.scrollTop;

    root.setAttribute('aria-label', t('scene.label'));
    root.classList.toggle('has-four-desks', four);
    frames.innerHTML =
      zoneHtml(id, 'git', 'zone.git', 'zone.git.sub') +
      zoneHtml(id, 'lanes', 'zone.lanes', 'zone.lanes.sub') +
      zoneHtml(id, 'index', 'zone.index', four ? null : 'zone.index.sub') +
      zoneHtml(id, 'disk', 'zone.disk', null);
    if (!four) frames.querySelector('.zone--disk').insertAdjacentHTML('beforeend', `<div class="disk-side">${diskLegendHtml()}</div>`);

    gitLayer.innerHTML = gitZoneHtml(current, o);
    lanesLayer.innerHTML = lanesSvg(layout, o);
    syncKeyed(
      doc,
      wiresLayer,
      wireItems(layout, current).map((w) => ({ key: w.key, cls: w.cls, style: `stroke:${w.color}`, attrs: { d: w.d } })),
      { ns: SVG_NS, tag: 'path' },
    );
    lanesOverlay.innerHTML = lanesOverlayHtml(layout, current, o);
    syncKeyed(doc, indexLayer, indexItems(current, layout, o), { managed: ['role', 'aria-label', 'data-desk'] });
    syncKeyed(doc, tilesLayer, tileItems(current, layout, o), { managed: ['data-action', 'role', 'aria-label', 'data-desk'] });
    noteLayer.innerHTML = opts.note ? `<div class="scene-note">${esc(opts.note)}</div>` : '';

    const items = [];
    for (const l of layout.lanes) if (l.name) items.push(`<li>${esc(t('scene.sr.lane', { name: l.name, n: l.commits.length }))}</li>`);
    for (const w of current.worktrees || []) {
      const key = w.id === current.active ? 'scene.sr.deskActive' : 'scene.sr.desk';
      items.push(`<li>${esc(t(key, { folder: w.path, branch: w.branch || t('desk.detached') }))}</li>`);
    }
    summary.innerHTML = items.join('');

    for (const el of root.querySelectorAll('[data-tree]')) {
      const k = el.getAttribute('data-tree');
      if (k in scrolls) el.scrollTop = scrolls[k];
    }
    if (fk) {
      for (const el of root.querySelectorAll('[data-action]')) {
        if (focusKey(el) === fk && el.focus) {
          el.focus({ preventScroll: true });
          break;
        }
      }
    }
    return prevLayout;
  }

  function toggleDir(desk, dir, force) {
    const set = openDirs.get(desk) || new Set();
    const open = force === undefined ? !set.has(dir) : force;
    if (open) set.add(dir);
    else set.delete(dir);
    openDirs.set(desk, set);
  }

  function onClick(e) {
    const el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el || !root.contains(el)) return;
    const action = actionFromElement(el);
    if (!action) return;
    if (action.type === 'toggle') {
      toggleDir(action.desk, action.path);
      draw();
      return;
    }
    if (action.type === 'create' && action.dir) {
      toggleDir(action.desk, action.dir, true);
      draw();
    }
    if (typeof opts.onAction === 'function') opts.onAction(action);
  }
  root.addEventListener('click', onClick);
  const unsubscribe = onChange(() => draw());

  draw();

  return {
    root,
    /** Redraws with a new state; `events` drive the animations; `patch` updates options (note, goalState…). */
    update(nextState, events = [], patch = null) {
      if (patch) opts = { ...opts, ...patch };
      if (nextState) current = nextState;
      for (const { desk, dir } of dirsToOpen(events)) toggleDir(desk, dir, true);
      const prev = draw();
      animateEvents(root, events, { prev, svgLayer: fxLayer });
    },
    /** Changes options without a new state (e.g. highlight on hover). */
    setOptions(patch) {
      opts = { ...opts, ...patch };
      draw();
    },
    shake() {
      shakeEl(root);
    },
    getLayout() {
      return layout;
    },
    destroy() {
      unsubscribe();
      root.removeEventListener('click', onClick);
      root.remove();
    },
  };
}
