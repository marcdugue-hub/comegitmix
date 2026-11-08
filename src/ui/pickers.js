// Argument picker: a small listbox near its anchor to choose a branch, a file, a desk, a commit...
import { t } from "../i18n/i18n.js";
import { mountLayer, moveIndex, nextId } from "./popovers.js";

/** Options count above which a filter field is shown. */
export const FILTER_THRESHOLD = 7;

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pure: options whose label, hint or value contains every word of `query` (accent and case insensitive). */
export function filterOptions(options, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return options.slice();
  return options.filter((o) => {
    const hay = fold(`${o.label} ${o.hint ?? ""} ${o.value}`);
    return words.every((w) => hay.includes(w));
  });
}

/**
 * @param {Element} anchor
 * @param {{ title: string, options: Array<{value: any, label: string, hint?: string}>, onPick: (value: any) => void, onClose?: () => void }} opts
 * @returns {{ close: () => void }}
 */
export function openPicker(anchor, { title, options = [], onPick, onClose } = {}) {
  const el = document.createElement("div");
  el.className = "popover picker ui-layer";
  const titleId = nextId("picker-title");
  const listId = nextId("picker-list");
  const withFilter = options.length > FILTER_THRESHOLD;
  el.innerHTML = `<div class="popover-title eyebrow" id="${titleId}"></div>
    ${withFilter ? `<input class="picker-filter" type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${listId}" aria-label="${t("picker.filter")}" placeholder="${t("picker.filter")}" autocomplete="off">` : ""}
    <ul class="picker-list" id="${listId}" role="listbox" aria-labelledby="${titleId}" tabindex="-1"></ul>`;
  el.querySelector(".popover-title").textContent = title || "";
  const list = el.querySelector(".picker-list");
  const filter = el.querySelector(".picker-filter");
  const focusTarget = filter || list;

  let shown = options.slice();
  let active = shown.length ? 0 : -1;
  let layer;

  const pick = (opt) => {
    layer.close();
    if (onPick) onPick(opt.value);
  };

  function render() {
    list.textContent = "";
    if (!shown.length) {
      const empty = document.createElement("li");
      empty.className = "picker-empty";
      empty.setAttribute("role", "presentation");
      empty.textContent = t("picker.empty");
      list.appendChild(empty);
      focusTarget.removeAttribute("aria-activedescendant");
      return;
    }
    shown.forEach((opt, i) => {
      const li = document.createElement("li");
      li.id = `${listId}-o${i}`;
      li.className = "picker-option popover-item";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      const label = document.createElement("span");
      label.className = "picker-label";
      label.textContent = opt.label;
      li.appendChild(label);
      if (opt.hint) {
        const hint = document.createElement("span");
        hint.className = "picker-hint";
        hint.textContent = opt.hint;
        li.appendChild(hint);
      }
      li.addEventListener("click", () => pick(opt));
      li.addEventListener("pointermove", () => {
        if (active !== i) setActive(i, false);
      });
      list.appendChild(li);
    });
    syncActive(true);
  }

  function syncActive(scroll) {
    [...list.children].forEach((li, i) => li.setAttribute("aria-selected", i === active ? "true" : "false"));
    const cur = list.children[active];
    if (cur && cur.id) {
      focusTarget.setAttribute("aria-activedescendant", cur.id);
      if (scroll && typeof cur.scrollIntoView === "function") cur.scrollIntoView({ block: "nearest" });
    }
  }
  function setActive(i, scroll = true) {
    active = i;
    syncActive(scroll);
  }

  if (filter) {
    filter.addEventListener("input", () => {
      shown = filterOptions(options, filter.value);
      active = shown.length ? 0 : -1;
      render();
      layer.place();
    });
  }

  layer = mountLayer(anchor, el, {
    onClose,
    onKey(e) {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        if (e.key === "Home" || e.key === "End") {
          if (filter) return; // let the text field move its caret
        }
        e.preventDefault();
        setActive(moveIndex(active, shown.length, e.key));
      } else if (e.key === "Enter" && shown[active]) {
        e.preventDefault();
        pick(shown[active]);
      }
    },
  });
  render();
  layer.place();
  focusTarget.focus();
  return { close: layer.close };
}
