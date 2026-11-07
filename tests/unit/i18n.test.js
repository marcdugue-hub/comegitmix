import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as i18n from "../../src/i18n/i18n.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "i18n");
const fr = JSON.parse(readFileSync(join(DIR, "fr.json"), "utf8"));
const en = JSON.parse(readFileSync(join(DIR, "en.json"), "utf8"));

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

function setup({ nav = "fr-FR", storage = memoryStorage() } = {}) {
  i18n.reset();
  i18n.configure({ storage, navigatorLang: nav });
  i18n.setDictionary("fr", { "a.b": "Bonjour {name}", "only.fr": "Seulement FR", "n": "{n} fichiers" });
  i18n.setDictionary("en", { "a.b": "Hello {name}", "n": "{n} files" });
  return storage;
}

test("fr.json and en.json have the same keys", () => {
  const a = Object.keys(fr).sort();
  const b = Object.keys(en).sort();
  assert.deepEqual(a.filter((k) => !(k in en)), [], "keys missing in en.json");
  assert.deepEqual(b.filter((k) => !(k in fr)), [], "keys missing in fr.json");
});

test("no empty values", () => {
  for (const [name, dict] of [["fr", fr], ["en", en]]) {
    for (const [k, v] of Object.entries(dict)) {
      assert.equal(typeof v, "string", `${name}:${k} must be a string`);
      assert.ok(v.trim().length > 0, `${name}:${k} is empty`);
    }
  }
});

test("placeholders match between languages", () => {
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const k of Object.keys(fr)) {
    if (k in en) assert.equal(ph(en[k]), ph(fr[k]), `placeholders differ for ${k}`);
  }
});

test("detects the language from the browser", () => {
  assert.equal(i18n.detectLang("fr-CA"), "fr");
  assert.equal(i18n.detectLang("FR"), "fr");
  assert.equal(i18n.detectLang("en-US"), "en");
  assert.equal(i18n.detectLang("de"), "en");
  assert.equal(i18n.detectLang(""), "en");
});

test("initial language: stored value wins over the browser", () => {
  setup({ nav: "fr-FR" });
  assert.equal(i18n.getLang(), "fr");
  setup({ nav: "en-GB" });
  assert.equal(i18n.getLang(), "en");
  setup({ nav: "en-GB", storage: memoryStorage({ "comegitmix:v1": JSON.stringify({ lang: "fr" }) }) });
  assert.equal(i18n.getLang(), "fr");
});

test("t interpolates, falls back to French then to the key", () => {
  setup({ nav: "en-US" });
  assert.equal(i18n.t("a.b", { name: "Marc" }), "Hello Marc");
  assert.equal(i18n.t("only.fr"), "Seulement FR");
  assert.equal(i18n.t("missing.key"), "missing.key");
  assert.equal(i18n.t("a.b"), "Hello {name}");
  assert.equal(i18n.t("n", { n: 0 }), "0 files");
});

test("setLang stores under lang without clobbering, notifies, and switches", async () => {
  const storage = setup({ nav: "fr-FR", storage: memoryStorage({ "comegitmix:v1": JSON.stringify({ missions: [1, 2] }) }) });
  const seen = [];
  const off = i18n.onChange((l) => seen.push(l));
  await i18n.setLang("en");
  assert.equal(i18n.getLang(), "en");
  assert.equal(i18n.t("a.b", { name: "X" }), "Hello X");
  assert.deepEqual(JSON.parse(storage.data["comegitmix:v1"]), { missions: [1, 2], lang: "en" });
  assert.deepEqual(seen, ["en"]);
  off();
  await i18n.setLang("fr");
  assert.deepEqual(seen, ["en"]);
  await i18n.setLang("xx"); // ignored
  assert.equal(i18n.getLang(), "fr");
});

test("works when storage throws", async () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  setup({ nav: "fr", storage: broken });
  assert.equal(i18n.getLang(), "fr");
  await i18n.setLang("en");
  assert.equal(i18n.getLang(), "en");
});

test("load fetches the JSON through an injectable fetch (and French for the fallback)", async () => {
  i18n.reset();
  const urls = [];
  i18n.configure({
    storage: memoryStorage(),
    navigatorLang: "en",
    fetch: async (url) => {
      urls.push(String(url));
      const name = String(url).endsWith("fr.json") ? "fr" : "en";
      return { ok: true, status: 200, json: async () => (name === "fr" ? fr : en) };
    },
  });
  await i18n.load("en");
  assert.ok(urls.some((u) => u.endsWith("src/i18n/en.json")));
  assert.ok(urls.some((u) => u.endsWith("src/i18n/fr.json")));
  assert.equal(i18n.t("nav.sandbox"), en["nav.sandbox"]);
});

test("applyStatic fills data-i18n and data-i18n-attr", () => {
  setup({ nav: "en" });
  const makeEl = (attrs) => {
    const el = {
      textContent: "",
      attrs: { ...attrs },
      getAttribute: (n) => (n in el.attrs ? el.attrs[n] : null),
      setAttribute: (n, v) => { el.attrs[n] = v; },
    };
    return el;
  };
  const a = makeEl({ "data-i18n": "a.b", "data-i18n-params": '{"name":"Z"}' });
  const b = makeEl({ "data-i18n-attr": "aria-label:a.b;title:only.fr", "data-i18n-params": '{"name":"Q"}' });
  i18n.applyStatic({ querySelectorAll: () => [a, b] });
  assert.equal(a.textContent, "Hello Z");
  assert.equal(b.attrs["aria-label"], "Hello Q");
  assert.equal(b.attrs.title, "Seulement FR");
});
