// Minimal i18n runtime: dictionaries, interpolation, language persistence.
// Keys live in src/i18n/fr.json and en.json (same keys in both). French is the fallback language.
// Persistence: localStorage key "comegitmix:v1", field "lang" (other fields are preserved).

export const LANGS = ["fr", "en"];
export const FALLBACK = "fr";
export const STORAGE_KEY = "comegitmix:v1";

const deps = {
  fetch: (...args) => globalThis.fetch(...args),
  storage: () => {
    try {
      return globalThis.localStorage || null;
    } catch {
      return null;
    }
  },
  navigatorLang: () => (globalThis.navigator && globalThis.navigator.language) || "",
};

const dictionaries = {};
const listeners = new Set();
let current = null;

/** Override the environment (tests): { fetch, storage, navigatorLang }. Each value is a function or value. */
export function configure(overrides = {}) {
  if (overrides.fetch) deps.fetch = overrides.fetch;
  if ("storage" in overrides) {
    const s = overrides.storage;
    deps.storage = typeof s === "function" ? s : () => s;
  }
  if ("navigatorLang" in overrides) {
    const n = overrides.navigatorLang;
    deps.navigatorLang = typeof n === "function" ? n : () => n;
  }
}

/** Forget loaded dictionaries and the current language (tests). */
export function reset() {
  for (const k of Object.keys(dictionaries)) delete dictionaries[k];
  listeners.clear();
  current = null;
}

/** French browser language -> "fr", anything else -> "en". */
export function detectLang(navigatorLang = deps.navigatorLang()) {
  return String(navigatorLang || "").toLowerCase().startsWith("fr") ? "fr" : "en";
}

function readStore() {
  try {
    const s = deps.storage();
    const raw = s && s.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeStoredLang(lang) {
  try {
    const s = deps.storage();
    if (!s) return;
    s.setItem(STORAGE_KEY, JSON.stringify({ ...readStore(), lang }));
  } catch {
    /* storage unavailable: the game works without it */
  }
}

/** Loads one dictionary (relative fetch). Also loads French so the fallback works. */
export async function load(lang = getLang()) {
  const wanted = LANGS.includes(lang) ? lang : FALLBACK;
  for (const l of new Set([wanted, FALLBACK])) {
    if (dictionaries[l]) continue;
    const url = new URL(`./${l}.json`, import.meta.url).href;
    const res = await deps.fetch(url);
    if (!res.ok) throw new Error(`i18n: cannot load ${l}.json (${res.status})`);
    dictionaries[l] = await res.json();
  }
  return dictionaries[wanted];
}

/** Registers a dictionary directly (tests, or after a manual load). */
export function setDictionary(lang, dict) {
  dictionaries[lang] = dict;
}

export function getLang() {
  if (current) return current;
  const stored = readStore().lang;
  current = LANGS.includes(stored) ? stored : detectLang();
  return current;
}

/** Changes the language: loads it if needed, stores it, updates <html lang>, notifies listeners. */
export async function setLang(lang) {
  if (!LANGS.includes(lang)) return getLang();
  if (!dictionaries[lang]) await load(lang);
  current = lang;
  writeStoredLang(lang);
  if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = lang;
  for (const cb of [...listeners]) cb(lang);
  return lang;
}

/** Subscribes to language changes. Returns an unsubscribe function. */
export function onChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** Translates a key. Falls back to French, then to the key itself. */
export function t(key, params) {
  const lang = getLang();
  const text = dictionaries[lang]?.[key] ?? dictionaries[FALLBACK]?.[key];
  return typeof text === "string" ? interpolate(text, params) : key;
}

/**
 * Fills static markup:
 *   data-i18n="key"                         -> textContent
 *   data-i18n-attr="aria-label:key;title:k" -> attributes
 *   data-i18n-params='{"n":3}'              -> optional params (JSON) for both
 */
export function applyStatic(root = document) {
  const nodes = root.querySelectorAll("[data-i18n], [data-i18n-attr]");
  for (const el of nodes) {
    let params;
    const raw = el.getAttribute("data-i18n-params");
    if (raw) {
      try {
        params = JSON.parse(raw);
      } catch {
        params = undefined;
      }
    }
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key, params);
    const attrs = el.getAttribute("data-i18n-attr");
    if (attrs) {
      for (const pair of attrs.split(";")) {
        const i = pair.indexOf(":");
        if (i < 1) continue;
        el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim(), params));
      }
    }
  }
}
