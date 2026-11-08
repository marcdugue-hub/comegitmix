// Floating layers: context menu (openPopover), toast (showToast) and the helpers shared with pickers.js.
// Only one floating layer is open at a time. Focus returns to the opener on close.
import { t } from '../i18n/i18n.js';
import { icon } from './icons.js';

const GAP = 6;
const MARGIN = 8;

/**
 * Pure placement: below the anchor (left aligned), flipped above when there is no room below,
 * clamped inside the viewport. Rects are { left, top, right, bottom, width, height }-like.
 * Returns { left, top, placement: 'below' | 'above' }.
 */
export function computePosition(anchor, size, viewport) {
  const room = viewport.height - anchor.bottom - GAP - MARGIN;
  const roomAbove = anchor.top - GAP - MARGIN;
  const above = size.height > room && roomAbove > room;
  let top = above ? anchor.top - GAP - size.height : anchor.bottom + GAP;
  let left = anchor.left;
  left = Math.min(left, viewport.width - size.width - MARGIN);
  left = Math.max(MARGIN, left);
  top = Math.min(top, viewport.height - size.height - MARGIN);
  top = Math.max(MARGIN, top);
  return { left, top, placement: above ? "above" : "below" };
}

/** Pure keyboard navigation over `count` items. Returns the new index (wraps), or `index` for other keys. */
export function moveIndex(index, count, key) {
  if (!count) return -1;
  if (key === "ArrowDown") return index < 0 ? 0 : (index + 1) % count;
  if (key === "ArrowUp") return index < 0 ? count - 1 : (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return index;
}

let activeLayer = null;
let uid = 0;

export function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function closeActiveLayer() {
  if (activeLayer) activeLayer.close();
}

function toElement(anchor) {
  return anchor && typeof anchor.getBoundingClientRect === "function" ? anchor : null;
}

/**
 * Mounts `el` as the single floating layer near `anchor`.
 * Handles placement, outside click, Escape, resize, focus return. Returns { close, place }.
 * `onKey(event)` lets the caller handle keys inside the layer; Escape and Tab are handled here.
 */
export function mountLayer(anchor, el, { onClose, onKey } = {}) {
  closeActiveLayer();
  const anchorEl = toElement(anchor);
  const active = document.activeElement;
  const opener = active && active !== document.body ? active : anchorEl;
  let closed = false;

  el.style.position = "fixed";
  el.style.visibility = "hidden";
  document.body.appendChild(el);

  const place = () => {
    const a = anchorEl ? anchorEl.getBoundingClientRect() : { left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN };
    const size = { width: el.offsetWidth, height: el.offsetHeight };
    const p = computePosition(a, size, { width: window.innerWidth, height: window.innerHeight });
    el.style.left = `${p.left}px`;
    el.style.top = `${p.top}px`;
    el.dataset.placement = p.placement;
  };
  place();
  el.style.visibility = "";

  const onPointerDown = (e) => {
    if (el.contains(e.target)) return;
    if (anchorEl && anchorEl.contains(e.target)) {
      // a click on the anchor toggles: close and swallow so the opener does not reopen the layer
      e.stopPropagation();
      e.preventDefault();
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 400);
    }
    close();
  };
  const onDocKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab" && el.contains(document.activeElement)) {
      close();
    } else if (onKey && el.contains(document.activeElement)) {
      onKey(e);
    }
  };
  const onResize = () => place();
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onDocKey, true);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onResize, true);

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onDocKey, true);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("scroll", onResize, true);
    el.remove();
    if (activeLayer && activeLayer.el === el) activeLayer = null;
    if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus();
    if (onClose) onClose();
  }
  activeLayer = { el, close };
  return { close, place };
}

/**
 * Context menu.
 * @param {Element} anchor
 * @param {{ title?: string, body?: string, items?: Array<{label: string, icon?: string, onSelect: () => void, disabled?: boolean}>, onClose?: () => void }} opts
 *   `body` is HTML (the caller escapes it); `title` and item labels are plain text.
 */
export function openPopover(anchor, { title, body, items = [], onClose } = {}) {
  const el = document.createElement("div");
  el.className = "popover ui-layer";
  const hasItems = items.length > 0;
  el.setAttribute("role", hasItems ? "menu" : "dialog");
  const titleId = nextId("pop-title");
  if (title) {
    const h = document.createElement("div");
    h.className = "popover-title eyebrow";
    h.id = titleId;
    h.textContent = title;
    el.appendChild(h);
    el.setAttribute("aria-labelledby", titleId);
  } else {
    el.setAttribute("aria-label", t("popover.menu"));
  }
  if (body) {
    const b = document.createElement("div");
    b.className = "popover-body";
    b.innerHTML = body;
    el.appendChild(b);
  }
  const buttons = items.map((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "popover-item";
    btn.setAttribute("role", "menuitem");
    btn.tabIndex = -1;
    btn.innerHTML = `${item.icon ? icon(item.icon, { size: 16 }) : ""}<span class="popover-item-label"></span>`;
    btn.querySelector(".popover-item-label").textContent = item.label;
    if (item.disabled) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
    }
    btn.addEventListener("click", () => {
      if (item.disabled) return;
      layer.close();
      if (item.onSelect) item.onSelect();
    });
    el.appendChild(btn);
    return btn;
  });
  const enabled = () => buttons.filter((b) => !b.disabled);
  const layer = mountLayer(anchor, el, {
    onClose,
    onKey(e) {
      const list = enabled();
      const cur = list.indexOf(document.activeElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next = moveIndex(cur, list.length, e.key);
        if (list[next]) list[next].focus();
      }
    },
  });
  const first = enabled()[0];
  if (first) first.focus();
  else {
    el.tabIndex = -1;
    el.focus();
  }
  return { close: layer.close };
}

let toastRegion = null;

function getRegion() {
  if (toastRegion && toastRegion.isConnected) return toastRegion;
  toastRegion = document.createElement("div");
  toastRegion.className = "toast-region";
  toastRegion.setAttribute("role", "status");
  toastRegion.setAttribute("aria-live", "polite");
  document.body.appendChild(toastRegion);
  return toastRegion;
}

/** Default display time in ms by kind (errors stay longer). */
export function toastTimeout(kind) {
  return kind === "error" ? 6000 : 3500;
}

const TOAST_ICONS = { info: "info", ok: "check", error: "triangle-alert" };

/** Shows a short message. Always icon + text (never colour alone). Returns { close() }. */
export function showToast(text, { kind = "info", timeout } = {}) {
  const k = TOAST_ICONS[kind] ? kind : "info";
  const el = document.createElement("div");
  el.className = `toast toast--${k}`;
  el.innerHTML = `${icon(TOAST_ICONS[k], { size: 16 })}<span class="toast-text"></span>`;
  el.querySelector(".toast-text").textContent = text;
  getRegion().appendChild(el);
  const remove = () => {
    clearTimeout(timer);
    el.remove();
  };
  const timer = setTimeout(remove, timeout ?? toastTimeout(k));
  return { close: remove };
}
