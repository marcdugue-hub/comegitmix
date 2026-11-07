// Content checker: `npm run content:check`. Prints "file:line message", exit 1 on error.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, formatIssue } from '../src/content/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, prefix = '') {
  const out = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) Object.assign(out, walk(join(dir, e.name), `${prefix}${e.name}/`));
    else if (e.name.endsWith('.md')) out[`${prefix}${e.name}`] = readFileSync(join(dir, e.name), 'utf8');
  }
  return out;
}

export function loadContentFiles() {
  return walk(join(root, 'content'));
}

export function loadCommandIds() {
  const p = join(root, 'data', 'commands.json');
  if (!existsSync(p)) return null;
  return Object.keys(JSON.parse(readFileSync(p, 'utf8')).commands);
}

const files = loadContentFiles();
const result = validate(files, { commandIds: loadCommandIds() });
for (const w of result.warnings) console.log(`warning ${formatIssue(w)}`);
for (const e of result.errors) console.error(formatIssue(e));
if (result.errors.length) {
  console.error(`content:check failed: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`content:check OK: ${Object.keys(files).length} files, ${result.warnings.length} warning(s)`);
