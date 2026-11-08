// The terminal: a charcoal card with a transcript, a command line (history, Tab completion) and suggestion chips.
// The terminal does not know Git: the caller decides what to run, what to suggest and what to print.
import { t } from "../i18n/i18n.js";
import { icon } from "./icons.js";
import { docTopicFor, docHash } from "../content/docs-topics.js";

export const MAX_SUGGESTIONS = 6;

/** Pure command history. prev()/next() take and return the text to show in the input. */
export function createHistory(limit = 100) {
  const items = [];
  let pos = 0; // items.length means "the line being typed"
  let draft = "";
  return {
    items: () => items.slice(),
    push(text) {
      const v = String(text ?? "").trim();
      if (v && items[items.length - 1] !== v) {
        items.push(v);
        if (items.length > limit) items.shift();
      }
      pos = items.length;
      draft = "";
    },
    prev(current = "") {
      if (!items.length) return current;
      if (pos === items.length) draft = current;
      if (pos > 0) pos -= 1;
      return items[pos];
    },
    next(current = "") {
      if (pos >= items.length) return current;
      pos += 1;
      return pos === items.length ? draft : items[pos];
    },
    reset() {
      pos = items.length;
      draft = "";
    },
  };
}

/** Pure Tab completion: the first suggestion, or the text unchanged when there is none. */
export function completeWith(text, suggestions) {
  return suggestions && suggestions.length ? suggestions[0] : text;
}

/** Normalises a suggestion list (strings only, no duplicates, no empty, capped). */
export function cleanSuggestions(list) {
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (typeof s === "string" && s.trim() && !out.includes(s)) out.push(s);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/**
 * @param {Element} container
 * @param {{ onSubmit: (text: string) => void, suggest?: (text: string) => string[], placeholder?: string, prompt?: string }} opts
 */
export function createTerminal(container, { onSubmit, suggest, placeholder, prompt = "$" } = {}) {
  const root = document.createElement("section");
  root.className = "terminal terminal--live";
  root.setAttribute("aria-label", t("term.label"));
  root.innerHTML = `<div class="terminal-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="${t("term.history")}"></div>
    <div class="terminal-input"><label class="terminal-prompt"><span class="terminal-prompt-text"></span><span class="sr-only">${t("term.inputLabel")}</span>
      <input type="text" class="terminal-field" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label></div>
    <div class="terminal-suggest chip-group" role="group" aria-label="${t("term.suggestions")}" hidden></div>`;
  container.textContent = "";
  container.appendChild(root);

  const log = root.querySelector(".terminal-log");
  const input = root.querySelector(".terminal-field");
  const promptEl = root.querySelector(".terminal-prompt-text");
  const chips = root.querySelector(".terminal-suggest");
  promptEl.textContent = prompt;
  input.placeholder = placeholder ?? t("term.placeholder");

  const history = createHistory();
  let suggestions = [];
  let disabled = false;
  let details = false;

  function refreshSuggestions() {
    let list = [];
    if (suggest) {
      try {
        list = cleanSuggestions(suggest(input.value));
      } catch {
        list = [];
      }
    }
    suggestions = list;
    chips.textContent = "";
    chips.hidden = !list.length;
    for (const s of list) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip terminal-chip";
      b.disabled = disabled;
      b.textContent = s;
      b.addEventListener("click", () => {
        setValue(s);
        input.focus();
      });
      chips.appendChild(b);
    }
  }

  function setValue(text) {
    input.value = String(text ?? "");
    history.reset();
    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      /* not selectable in this state */
    }
    refreshSuggestions();
  }

  function submit() {
    const text = input.value.trim();
    if (!text || disabled) return;
    history.push(text);
    input.value = "";
    refreshSuggestions();
    if (onSubmit) onSubmit(text);
  }

  const onKeyDown = (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      input.value = history.prev(input.value);
      refreshSuggestions();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      input.value = history.next(input.value);
      refreshSuggestions();
    } else if (e.key === "Tab" && !e.shiftKey && suggestions.length) {
      e.preventDefault();
      setValue(completeWith(input.value, suggestions));
    }
  };
  const onInput = () => {
    history.reset();
    refreshSuggestions();
  };
  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("input", onInput);

  function status(kind, iconName, labelKey, text) {
    const row = document.createElement("div");
    row.className = `terminal-result terminal-${kind}`;
    row.innerHTML = `${icon(iconName, { size: 14 })}<span class="terminal-status"></span>`;
    const span = row.querySelector(".terminal-status");
    if (labelKey) {
      const strong = document.createElement("strong");
      strong.className = "terminal-tag";
      strong.textContent = t(labelKey);
      span.appendChild(strong);
      span.appendChild(document.createTextNode(" "));
    }
    span.appendChild(document.createTextNode(text));
    return row;
  }

  /** After an error: a link to the command card (new tab), or to the list when the command is unknown. */
  function docLink(command) {
    const id = docTopicFor(command);
    const row = document.createElement("div");
    row.className = "terminal-result terminal-doc";
    const a = document.createElement("a");
    a.href = docHash(id);
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = icon("book-open", { size: 14 });
    a.append(id ? t("term.docCard", { name: id }) : t("term.docList"));
    row.appendChild(a);
    return row;
  }

  /** entry: { command, explanation? (HTML-safe), output? (raw text), error?, warning? } */
  function print(entry = {}) {
    const block = document.createElement("div");
    block.className = "terminal-entry";
    if (entry.command) {
      const line = document.createElement("div");
      line.className = "terminal-line";
      const p = document.createElement("span");
      p.className = "terminal-prompt";
      p.textContent = "$ ";
      const c = document.createElement("span");
      c.className = "terminal-cmd";
      c.textContent = entry.command;
      line.append(p, c);
      block.appendChild(line);
    }
    if (entry.error) {
      block.appendChild(status("error", "triangle-alert", "term.error", entry.error));
      if (entry.command) block.appendChild(docLink(entry.command));
    }
    if (entry.warning) block.appendChild(status("warning", "triangle-alert", "term.warning", entry.warning));
    if (entry.explanation) {
      const row = document.createElement("div");
      row.className = "terminal-result terminal-ok";
      row.innerHTML = `${icon(entry.error ? "info" : "check", { size: 14 })}<span class="terminal-status"></span>`;
      row.querySelector(".terminal-status").innerHTML = entry.explanation;
      block.appendChild(row);
    }
    if (entry.output) {
      const pre = document.createElement("pre");
      pre.className = "terminal-output";
      pre.textContent = entry.output;
      pre.hidden = !details;
      block.appendChild(pre);
    }
    log.appendChild(block);
    log.scrollTop = log.scrollHeight;
  }

  function setDetails(on) {
    details = Boolean(on);
    root.classList.toggle("is-details", details);
    for (const pre of log.querySelectorAll(".terminal-output")) pre.hidden = !details;
  }

  function setDisabled(on) {
    disabled = Boolean(on);
    input.disabled = disabled;
    root.classList.toggle("is-disabled", disabled);
    for (const b of chips.querySelectorAll("button")) b.disabled = disabled;
  }

  function setPrompt(text) {
    promptEl.textContent = String(text ?? "");
  }

  function destroy() {
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("input", onInput);
    root.remove();
  }

  refreshSuggestions();
  return {
    focus: () => input.focus(),
    setValue,
    print,
    clear: () => {
      log.textContent = "";
    },
    setDisabled,
    setDetails,
    setPrompt,
    getValue: () => input.value,
    destroy,
  };
}
