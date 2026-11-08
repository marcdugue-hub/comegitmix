// Interactive rebase editor: one row per commit with an action (pick / reword / squash / drop) and reorder controls.
// Input commits are in rebase order, OLDEST FIRST (the order of the engine's commitsBetween), top row = replayed first.
// Output plan = [{ id, action, msg? }] in the new order: exactly what `apply(state, { name: 'rebase', args: [base], options: { i: true, plan } })` expects.
import { t } from "../i18n/i18n.js";
import { icon } from "./icons.js";

export const ACTIONS = ["pick", "reword", "squash", "drop"];

/** Pure: editor rows from the commits (all "pick"). */
export function initialRows(commits) {
  return commits.map((c) => ({ id: c.id, message: c.message, author: c.author, action: "pick", msg: c.message }));
}

/** Pure: moves row `index` by `delta` (-1 up, +1 down). Returns a new array (same one when out of range). */
export function moveRow(rows, index, delta) {
  const to = index + delta;
  if (index < 0 || index >= rows.length || to < 0 || to >= rows.length) return rows;
  const next = rows.slice();
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Pure: sets the action of row `index` (ignored for an unknown action). */
export function setAction(rows, index, action) {
  if (!ACTIONS.includes(action) || !rows[index]) return rows;
  return rows.map((r, i) => (i === index ? { ...r, action } : r));
}

/** Pure: first kept (not dropped) row index, or -1. */
function firstKept(rows) {
  return rows.findIndex((r) => r.action !== "drop");
}

/** Pure validation. Returns { ok: true } or { ok: false, key } where key is an i18n key. */
export function validateRows(rows) {
  const first = firstKept(rows);
  if (first < 0) return { ok: false, key: "rebase.errorAllDropped" };
  if (rows[first].action === "squash") return { ok: false, key: "rebase.errorSquashFirst" };
  const bad = rows.find((r) => r.action === "reword" && !String(r.msg ?? "").trim());
  if (bad) return { ok: false, key: "rebase.errorEmptyMessage" };
  return { ok: true };
}

/** Pure: the engine plan. `msg` only on reword rows (trimmed). */
export function buildPlan(rows) {
  return rows.map((r) => (r.action === "reword" ? { id: r.id, action: r.action, msg: String(r.msg).trim() } : { id: r.id, action: r.action }));
}

/** Pure: how many commits remain after the plan (squash and drop remove one each). */
export function resultingCount(rows) {
  return rows.filter((r) => r.action === "pick" || r.action === "reword").length;
}

/**
 * @param {Element} container
 * @param {{ commits: Array<{id: string, message: string, author: string}>, onConfirm: (plan: Array<{id: string, action: string, msg?: string}>) => void, onCancel?: () => void }} opts
 * @returns {{ close: () => void }}
 */
export function openRebaseEditor(container, { commits = [], onConfirm, onCancel } = {}) {
  const opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  let rows = initialRows(commits);
  let closed = false;

  const root = document.createElement("section");
  root.className = "rebase-editor card card--raised";
  root.setAttribute("role", "group");
  root.setAttribute("aria-labelledby", "rebase-title");
  root.innerHTML = `<h3 class="rebase-title" id="rebase-title">${t("rebase.title")}</h3>
    <p class="rebase-intro">${t("rebase.intro")}</p>
    <ol class="rebase-list"></ol>
    <p class="rebase-summary" aria-live="polite"></p>
    <p class="rebase-error" role="alert"></p>
    <div class="rebase-actions">
      <button type="button" class="btn btn--ghost" data-act="cancel">${t("rebase.cancel")}</button>
      <button type="button" class="btn btn--primary" data-act="confirm">${icon("check", { size: 16 })}${t("rebase.confirm")}</button>
    </div>`;
  container.textContent = "";
  container.appendChild(root);

  const list = root.querySelector(".rebase-list");
  const summary = root.querySelector(".rebase-summary");
  const errorEl = root.querySelector(".rebase-error");
  const confirmBtn = root.querySelector('[data-act="confirm"]');

  function refreshFooter() {
    const v = validateRows(rows);
    errorEl.textContent = v.ok ? "" : t(v.key);
    confirmBtn.disabled = !v.ok;
    confirmBtn.setAttribute("aria-disabled", v.ok ? "false" : "true");
    summary.textContent = t("rebase.summary", { from: rows.length, to: resultingCount(rows) });
  }

  function render(focus) {
    list.textContent = "";
    rows.forEach((row, i) => {
      const li = document.createElement("li");
      li.className = `rebase-row rebase-row--${row.action}`;
      li.dataset.id = row.id;
      const groupId = `rebase-act-${row.id}`;
      li.innerHTML = `<div class="rebase-move">
          <button type="button" class="btn-plus" data-move="-1" aria-label="${t("rebase.moveUp")}" ${i === 0 ? "disabled" : ""}>${icon("chevron-down", { size: 14, className: "ic--up" })}</button>
          <button type="button" class="btn-plus" data-move="1" aria-label="${t("rebase.moveDown")}" ${i === rows.length - 1 ? "disabled" : ""}>${icon("chevron-down", { size: 14 })}</button>
        </div>
        <div class="rebase-commit"><code class="rebase-id"></code><span class="rebase-message"></span><span class="rebase-author badge badge--pill"></span></div>
        <div class="chip-group rebase-actions-group" role="radiogroup" id="${groupId}" aria-label="${t("rebase.actionFor")}"></div>`;
      li.querySelector(".rebase-id").textContent = row.id;
      const msgEl = li.querySelector(".rebase-message");
      msgEl.textContent = row.message;
      if (row.action === "drop") msgEl.classList.add("is-dropped");
      li.querySelector(".rebase-author").textContent = t(row.author === "ai" ? "rebase.authorAi" : "rebase.authorHuman");
      const group = li.querySelector(".rebase-actions-group");
      for (const action of ACTIONS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip rebase-action";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", row.action === action ? "true" : "false");
        b.tabIndex = row.action === action ? 0 : -1;
        b.dataset.action = action;
        b.textContent = t(`rebase.action.${action}`);
        b.title = t(`rebase.help.${action}`);
        group.appendChild(b);
      }
      if (row.action === "reword") {
        const field = document.createElement("input");
        field.type = "text";
        field.className = "rebase-reword";
        field.value = row.msg;
        field.setAttribute("aria-label", t("rebase.newMessage"));
        field.addEventListener("input", () => {
          rows = rows.map((r, k) => (k === i ? { ...r, msg: field.value } : r));
          refreshFooter();
        });
        li.appendChild(field);
      }
      list.appendChild(li);
    });
    refreshFooter();
    if (focus) {
      const li = list.querySelector(`[data-id="${CSS.escape(focus.id)}"]`);
      const target = li && li.querySelector(focus.selector);
      const fallback = li && li.querySelector("button:not(:disabled)");
      const el = target && !target.disabled ? target : fallback;
      if (el) el.focus();
    }
  }

  function move(index, delta, selector) {
    const id = rows[index].id;
    rows = moveRow(rows, index, delta);
    render({ id, selector });
  }

  const onClick = (e) => {
    const btn = e.target.closest("button");
    if (!btn || !root.contains(btn)) return;
    const li = btn.closest(".rebase-row");
    if (li) {
      const index = [...list.children].indexOf(li);
      if (btn.dataset.move) move(index, Number(btn.dataset.move), `[data-move="${btn.dataset.move}"]`);
      else if (btn.dataset.action) {
        rows = setAction(rows, index, btn.dataset.action);
        render({ id: rows[index].id, selector: `[data-action="${btn.dataset.action}"]` });
      }
      return;
    }
    if (btn.dataset.act === "cancel") finish(onCancel);
    else if (btn.dataset.act === "confirm" && validateRows(rows).ok) {
      const plan = buildPlan(rows);
      finish(onConfirm ? () => onConfirm(plan) : null);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finish(onCancel);
      return;
    }
    const li = e.target.closest && e.target.closest(".rebase-row");
    if (!li) return;
    const index = [...list.children].indexOf(li);
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      move(index, e.key === "ArrowUp" ? -1 : 1, e.target.matches("[data-action]") ? `[data-action="${e.target.dataset.action}"]` : "[data-move]");
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.target.matches("[data-action]")) {
      e.preventDefault();
      const i = ACTIONS.indexOf(e.target.dataset.action);
      const next = ACTIONS[(i + (e.key === "ArrowRight" ? 1 : ACTIONS.length - 1)) % ACTIONS.length];
      rows = setAction(rows, index, next);
      render({ id: rows[index].id, selector: `[data-action="${next}"]` });
    }
  };
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);

  function finish(after) {
    if (closed) return;
    close();
    if (after) after();
  }

  function close() {
    if (closed) return;
    closed = true;
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    root.remove();
    if (opener && opener.isConnected) opener.focus();
  }

  render(null);
  const firstAction = list.querySelector('[data-action][tabindex="0"]');
  if (firstAction) firstAction.focus();
  return { close };
}
