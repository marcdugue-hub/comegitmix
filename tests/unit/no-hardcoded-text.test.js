// Scanner: no displayed text may be hard-coded in src/ui/**/*.js and src/render/**/*.js.
//
// Heuristic (pragmatic, not a JS parser). Comments are ignored. For every string / template literal:
//   1. HTML-looking literals (contain "<tag"): the text between ">" and "<" and the values of
//      aria-label / title / alt / placeholder / aria-description attributes must have no letters
//      once "${...}" expressions are removed (use t("key") inside "${...}").
//   2. Other literals are checked only when they feed a display sink in the same statement:
//        el.textContent / innerText / title / placeholder / ariaLabel / alt = <literal>
//        setAttribute("aria-label" | "aria-description" | "title" | "alt" | "placeholder", <literal>)
//        document.createTextNode(<literal>), el.append(<literal>) / prepend(<literal>)
//        { text: | label: | title: | placeholder: | ariaLabel: | alt: | message: | hint: <literal> }
//      Literals that are arguments of t(...) / icon(...) are translation keys or icon names: ignored.
//   3. A literal is "displayed text" when it still contains a letter (any Latin letter) after removing
//      "${...}" and is not in ALLOWED (single characters, status letters, git tokens such as HEAD).
// Escape hatch for a deliberate, non-translatable string: add the comment  // i18n-ok  on the same line.
// Allow-list: CSS classes, attribute names, icon names and event names never reach a sink, so they need
// no entry. The test passes when the scanned folders are empty or missing.

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FOLDERS = ["src/ui", "src/render"];

// Literals that are not translatable text.
const ALLOWED = new Set(["HEAD", "main", "origin", "upstream", ".git", "git", "M", "U", "A", "+", "-"]);

const SINK_ASSIGN = /\.(textContent|innerText|title|placeholder|ariaLabel|alt)\s*=(?!=)/;
const SINK_SETATTR = /setAttribute\(\s*["'](aria-label|aria-description|title|alt|placeholder)["']\s*,/;
const SINK_CALL = /createTextNode\(|\.(append|prepend)\(/;
const SINK_PROP = /\b(text|label|title|placeholder|ariaLabel|alt|message|hint)\s*:\s*[^,{}]*$/;
const SAFE_CALLEES = /(^|[^\w$])(t|icon|hasIcon|getAttribute|querySelector|querySelectorAll|closest|matches|addEventListener|removeEventListener|getElementById|createElement|includes|startsWith|endsWith|test|has|get)$/;
const DISPLAY_ATTR = /\b(aria-label|aria-description|title|alt|placeholder)\s*=\s*("([^"]*)"|'([^']*)')/g;

function hasLetters(text) {
  return /[A-Za-zÀ-ɏ]/.test(text);
}

function isDisplayed(raw) {
  const text = stripExpressions(raw).trim();
  return hasLetters(text) && !ALLOWED.has(text);
}

/** Replaces ${...} (with nested braces) by a marker without letters. */
function stripExpressions(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "$" && s[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < s.length && depth > 0) {
        if (s[i] === "{") depth++;
        else if (s[i] === "}") depth--;
        i++;
      }
      i--;
      out += "\u0001";
    } else out += s[i];
  }
  return out;
}

/** Tokenises JS source into string literals, skipping comments. Returns [{start, end, raw, line}]. */
export function extractLiterals(src) {
  const lits = [];
  let i = 0;
  const lineAt = (p) => src.slice(0, p).split("\n").length;
  const skipTemplate = (from) => {
    // from points after the opening backtick; returns index after the closing backtick
    let j = from;
    while (j < src.length) {
      if (src[j] === "\\") j += 2;
      else if (src[j] === "`") return j + 1;
      else if (src[j] === "$" && src[j + 1] === "{") {
        let depth = 1;
        j += 2;
        while (j < src.length && depth > 0) {
          if (src[j] === "`") j = skipTemplate(j + 1);
          else if (src[j] === '"' || src[j] === "'") {
            const q = src[j++];
            while (j < src.length && src[j] !== q && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
            j++;
          } else {
            if (src[j] === "{") depth++;
            else if (src[j] === "}") depth--;
            j++;
          }
        }
      } else j++;
    }
    return j;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      i = e < 0 ? src.length : e + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      if (src[j] === c) {
        lits.push({ start: i, end: j + 1, raw: src.slice(i + 1, j), line: lineAt(i) });
        i = j + 1;
      } else i++; // stray quote (regex, apostrophe): ignore
    } else if (c === "`") {
      const end = skipTemplate(i + 1);
      lits.push({ start: i, end, raw: src.slice(i + 1, end - 1), line: lineAt(i) });
      i = end;
    } else i++;
  }
  return lits;
}

/** Returns the callee text of the nearest unmatched "(" in a code prefix, or null. */
function enclosingCallee(prefix) {
  let depth = 0;
  for (let k = prefix.length - 1; k >= 0; k--) {
    const ch = prefix[k];
    if (ch === ")") depth++;
    else if (ch === "(") {
      if (depth === 0) return prefix.slice(Math.max(0, k - 30), k);
      depth--;
    }
  }
  return null;
}

/** Scans a source string; returns violations [{line, text}]. */
export function scanSource(src) {
  const violations = [];
  const lines = src.split("\n");
  for (const lit of extractLiterals(src)) {
    if (/\/\/\s*i18n-ok/.test(lines[lit.line - 1] || "")) continue;
    const { raw } = lit;
    if (/<[A-Za-z][^>]*>?/.test(raw) && /<\/?[A-Za-z]/.test(raw)) {
      const text = stripExpressions(raw);
      for (const m of text.matchAll(/>([^<>]+)/g)) {
        if (isDisplayed(m[1])) violations.push({ line: lit.line, text: m[1].trim() });
      }
      for (const m of text.matchAll(DISPLAY_ATTR)) {
        const value = m[3] ?? m[4] ?? "";
        if (isDisplayed(value)) violations.push({ line: lit.line, text: value });
      }
      continue;
    }
    if (!isDisplayed(raw)) continue;
    const before = src.slice(Math.max(0, lit.start - 240), lit.start);
    const stmt = before.slice(Math.max(before.lastIndexOf(";"), before.lastIndexOf("\n}") ) + 1);
    const callee = enclosingCallee(stmt);
    if (callee && SAFE_CALLEES.test(callee)) continue;
    const isSink =
      SINK_ASSIGN.test(stmt) || SINK_SETATTR.test(stmt) || SINK_CALL.test(stmt) || SINK_PROP.test(stmt);
    if (isSink) violations.push({ line: lit.line, text: stripExpressions(raw).trim() });
  }
  return violations;
}

function walk(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith(".js") ? [p] : [];
  });
}

test("scanner flags displayed literals", () => {
  const bad = [
    'el.textContent = "Save";',
    "el.innerHTML = `<button>Valider</button>`;",
    'el.innerHTML = `<button aria-label="Fermer">${icon("x")}</button>`;',
    'el.setAttribute("title", "Hello");',
    "el.textContent = `Mission ${n}`;",
    'const o = { label: "Suivant" };',
    'el.textContent = ok ? "Oui" : "Non";',
    'el.append("Texte");',
  ];
  for (const code of bad) assert.ok(scanSource(code).length > 0, `should flag: ${code}`);
});

test("scanner accepts i18n calls, class names, icons, symbols", () => {
  const good = [
    'el.textContent = t("ui.save");',
    "el.innerHTML = `<button aria-label=\"${t('ui.close')}\">${icon(\"x\")}</button>`;",
    'el.className = "card card--linen";',
    'el.setAttribute("aria-label", t("a11y.x"));',
    'el.setAttribute("role", "button");',
    'el.textContent = t(cond ? "ui.yes" : "ui.no");',
    'el.textContent = "M";',
    "el.innerHTML = `<span class=\"badge badge--M\">M</span>`;",
    "el.innerHTML = `<div class=\"x\">${t('k', { n })}</div>`;",
    'el.textContent = "Quoi"; // i18n-ok',
    '// el.textContent = "Commented";',
    'const f = (x) => x.replace(/["\']/g, "");',
    "el.dataset.name = 'worktree';",
    "node.classList.add('is-active');",
  ];
  for (const code of good) assert.deepEqual(scanSource(code), [], `should accept: ${code}`);
});

test("no hard-coded displayed text in src/ui and src/render", () => {
  const found = [];
  for (const folder of FOLDERS) {
    for (const file of walk(join(ROOT, folder))) {
      for (const v of scanSource(readFileSync(file, "utf8"))) {
        found.push(`${file.slice(ROOT.length + 1)}:${v.line}  "${v.text}"`);
      }
    }
  }
  assert.deepEqual(found, [], `Hard-coded text (use t() or add // i18n-ok):\n${found.join("\n")}`);
});
