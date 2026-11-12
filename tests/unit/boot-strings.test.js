// The boot-error panel strings (classic script, not JSON) have the same keys in fr and en, and every
// key used by src/boot-guard.js exists.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, "src", "i18n", "boot-strings.js"), "utf8"), sandbox);
const strings = sandbox.window.COMEGITMIX_BOOT_STRINGS;

test("boot strings: same keys in fr and en, none empty", () => {
  assert.deepEqual(Object.keys(strings.fr).sort(), Object.keys(strings.en).sort());
  for (const lang of ["fr", "en"]) for (const [k, v] of Object.entries(strings[lang])) assert.ok(v.trim(), `${lang}.${k}`);
});

test("boot strings: every key the guard uses exists", () => {
  const guard = readFileSync(join(ROOT, "src", "boot-guard.js"), "utf8");
  const keys = new Set([...guard.matchAll(/\bt\('([\w.]*\w)'[,)]/g)].map((m) => m[1]));
  const reasons = guard.match(/REASONS = \[([^\]]+)\]/)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  for (const r of reasons) keys.add(`reason.${r}.title`).add(`reason.${r}.text`);
  const causes = [...guard.match(/LIKELY = \{([^}]+)\}/)[1].matchAll(/(\w+):/g)].map((m) => m[1]);
  for (const c of causes) keys.add(`cause.${c}`);
  for (const k of keys) assert.ok(k in strings.fr, `missing key ${k}`);
});
