// Maps engine events (src/engine/README.md §4) to short CSS / SVG animations (≤ 600 ms, docs/DESIGN.md §7).
// Everything is skipped under prefers-reduced-motion.

const DURATION = 700;

export function prefersReducedMotion() {
  try {
    return !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

function cssEscape(v) {
  return String(v).replace(/["\\]/g, '\\$&');
}

function flash(el, cls) {
  if (!el || !el.classList) return;
  el.classList.remove(cls);
  // restart the animation
  void el.getBoundingClientRect?.();
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), DURATION);
}

/**
 * Plans the animations for a list of events: returns [{ selector, cls }] (pure, testable).
 * @param {object[]} events
 */
export function planAnimations(events = []) {
  const out = [];
  const add = (selector, cls) => out.push({ selector, cls });
  const commit = (id) => add(`[data-commit-id="${cssEscape(id)}"]`, 'anim-pop');
  for (const e of events || []) {
    if (!e || !e.type) continue;
    switch (e.type) {
      case 'commit.created':
      case 'commit.copied':
      case 'commit.reverted':
        commit(e.id);
        break;
      case 'op.finished':
        if (e.commit) commit(e.commit);
        break;
      case 'rebase.done':
        for (const id of e.to || []) commit(id);
        if (e.branch) add(`[data-lane="b:${cssEscape(e.branch)}"]`, 'anim-shift');
        break;
      case 'branch.moved':
        if (e.reason === 'rebase' || e.reason === 'reset') add(`[data-lane="b:${cssEscape(e.name)}"]`, 'anim-shift');
        break;
      case 'lane.forked':
        add(`[data-lane="b:${cssEscape(e.name)}"]`, 'anim-draw');
        break;
      case 'lanes.joined':
        if (e.commit) {
          commit(e.commit);
          add(`[data-edge$="-${cssEscape(e.commit)}"]`, 'anim-draw');
        }
        break;
      case 'merge.fastForward':
        add(`[data-lane="b:${cssEscape(e.into)}"]`, 'anim-shift');
        break;
      case 'worktree.added':
        add(`.tile[data-desk="${cssEscape(e.id)}"]`, 'anim-pop');
        add(`.wire[data-key="${cssEscape(e.id)}"]`, 'anim-draw');
        break;
      case 'file.created':
      case 'file.status':
      case 'conflict.resolved':
        add(`[data-file="${cssEscape(e.desk)}|${cssEscape(e.path)}"]`, 'anim-flash');
        break;
      case 'conflict':
        for (const p of e.files || []) add(`[data-file="${cssEscape(e.desk)}|${cssEscape(p)}"]`, 'anim-flash');
        break;
      case 'index.added':
        add(`[data-index-chip="${cssEscape(e.desk)}|${cssEscape(e.path)}"]`, 'anim-rise');
        break;
      case 'stash.pushed':
        add('[data-stash-chip]', 'anim-rise');
        break;
      case 'desk.activated':
        add(`.tile[data-desk="${cssEscape(e.id)}"]`, 'anim-flash');
        break;
      case 'mr.approved':
      case 'mr.merged':
      case 'mr.opened':
        add(`[data-mr="${cssEscape(e.id)}"]`, 'anim-flash');
        break;
      case 'error':
        add(':scope', 'anim-shake');
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Plays the animations of `events` inside `root`. `prev` / `next` layouts let orphaned commits fade out
 * where they were.
 */
export function animateEvents(root, events, { prev = null, svgLayer = null } = {}) {
  if (!root || prefersReducedMotion()) return;
  for (const { selector, cls } of planAnimations(events)) {
    if (selector === ':scope') flash(root, cls);
    else for (const el of root.querySelectorAll(selector)) flash(el, cls);
  }
  if (prev && svgLayer) {
    for (const e of events || []) {
      if (e.type !== 'commits.orphaned') continue;
      for (const id of e.ids || []) {
        const c = prev.commits[id];
        if (!c) continue;
        const ns = 'http://www.w3.org/2000/svg';
        const ghost = root.ownerDocument.createElementNS(ns, 'circle');
        ghost.setAttribute('cx', c.x);
        ghost.setAttribute('cy', c.y);
        ghost.setAttribute('r', c.r);
        ghost.setAttribute('class', 'commit-orphan anim-fade-out');
        svgLayer.appendChild(ghost);
        setTimeout(() => ghost.remove(), DURATION);
      }
    }
  }
}

/** Shakes an element (played errors). */
export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  flash(el, 'anim-shake');
}
