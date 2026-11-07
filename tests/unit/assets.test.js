// Every font / image referenced by the CSS or index.html exists; CSS uses no colour outside tokens.css;
// every icon used by data/commands.json exists in the icon table.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasIcon, icon } from "../../src/ui/icons.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STYLES = join(ROOT, "src", "styles");
const cssFiles = readdirSync(STYLES).filter((f) => f.endsWith(".css"));

test("every url() in the CSS resolves to an existing file, with a relative path", () => {
  for (const f of cssFiles) {
    const css = readFileSync(join(STYLES, f), "utf8");
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const url = m[1];
      if (url.startsWith("data:")) continue;
      assert.ok(!/^(\/|https?:|\/\/)/.test(url), `${f}: absolute url ${url}`);
      assert.ok(existsSync(resolve(STYLES, url)), `${f}: missing file ${url}`);
    }
  }
});

test("fonts: every woff2 is a real woff2 and has its licence", () => {
  const dir = join(ROOT, "assets", "fonts");
  const woff = readdirSync(dir).filter((f) => f.endsWith(".woff2"));
  assert.ok(woff.length >= 20);
  for (const f of woff) assert.equal(readFileSync(join(dir, f)).subarray(0, 4).toString(), "wOF2", f);
  const licences = readdirSync(dir).filter((f) => f.startsWith("LICENSE"));
  assert.ok(licences.length >= 4);
});

test("index.html references only existing relative assets", () => {
  const p = join(ROOT, "index.html");
  if (!existsSync(p)) return;
  const html = readFileSync(p, "utf8");
  for (const m of html.matchAll(/\b(?:src|href)=["']([^"'#]+)["']/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|data:)/.test(url)) assert.fail(`external resource in index.html: ${url}`);
    assert.ok(!url.startsWith("/"), `absolute path in index.html: ${url}`);
    if (/\.(js|mjs)(\?|$)/.test(url)) continue; // scripts are owned by the app agents
    assert.ok(existsSync(resolve(ROOT, url.split("?")[0])), `index.html: missing ${url}`);
  }
});

test("CSS defines no colour outside tokens.css", () => {
  for (const f of cssFiles) {
    if (f === "tokens.css") continue;
    const css = readFileSync(join(STYLES, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), `${f}: hex colour found`);
    assert.ok(!/\b(rgba?|hsla?)\(/.test(css), `${f}: rgb/hsl colour found`);
    assert.ok(!/(?<![-\w])(white|black|red|blue|green|gray|grey|orange|purple)\s*[;,)]/.test(css), `${f}: named colour found`);
  }
});

test("icons: those of data/commands.json exist; icon() is accessible", () => {
  const cmds = JSON.parse(readFileSync(join(ROOT, "data", "commands.json"), "utf8"));
  for (const [name, c] of Object.entries(cmds.commands)) {
    if (c.icon) assert.ok(hasIcon(c.icon), `icon ${c.icon} (command ${name}) missing`);
  }
  assert.match(icon("check"), /aria-hidden="true"/);
  assert.match(icon("check", { label: "OK", size: 20 }), /aria-label="OK"/);
  assert.match(icon("check", { size: 20 }), /width="20"/);
  assert.ok(!/aria-hidden/.test(icon("check", { label: "OK" })));
});

test("brand images used by the game exist", () => {
  for (const f of ["logo-petit.png", "duo-rond.png"]) assert.ok(existsSync(join(ROOT, "assets", f)), f);
});
