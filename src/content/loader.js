// Fetches content files for a language, with French fallback. The only content
// module that does I/O; `fetchText` is injectable so it also runs under node tests.
import { parseMission } from './mission.js';
import { parsePuzzle } from './puzzle.js';
import { parseSandbox } from './sandbox.js';
import { parseSummary, parseAiWork } from './summary.js';
import { parseDoc } from './doc.js';

export const FALLBACK_LANG = 'fr';
const DIRS = { mission: 'missions', puzzle: 'puzzles', sandbox: 'sandbox', doc: 'docs' };

/** Default browser fetcher: resolves to the text, or null on 404 / non-OK. */
export async function browserFetchText(path) {
  const res = await fetch(path);
  return res.ok ? res.text() : null;
}

/**
 * createLoader({ fetchText, base }) -> {
 *   loadSummary(), loadAiWork(lang),
 *   loadFile(kind, id, lang), loadMission(id, lang), loadPuzzle(id, lang), loadSandbox(id, lang), loadDoc(id, lang)
 * }
 * `base` is a relative path ("content/"); never starts with "/".
 * File loaders resolve to { id, lang, fallback, path, text, data } where `fallback`
 * is true when the requested language was missing and French was served (UI shows a "FR" badge).
 * They throw when even the French file is missing.
 */
export function createLoader({ fetchText = browserFetchText, base = 'content/' } = {}) {
  const cache = new Map();
  const get = (path) => {
    if (!cache.has(path)) cache.set(path, Promise.resolve(fetchText(path)).then((t) => (typeof t === 'string' ? t : null)));
    return cache.get(path);
  };
  async function withFallback(rel, lang) {
    let text = await get(`${base}${rel}.${lang}.md`);
    if (text !== null) return { lang, fallback: false, path: `${base}${rel}.${lang}.md`, text };
    if (lang !== FALLBACK_LANG) {
      text = await get(`${base}${rel}.${FALLBACK_LANG}.md`);
      if (text !== null) return { lang: FALLBACK_LANG, fallback: true, path: `${base}${rel}.${FALLBACK_LANG}.md`, text };
    }
    throw new Error(`content file not found: ${base}${rel}.${FALLBACK_LANG}.md`);
  }
  const parsers = { mission: parseMission, puzzle: parsePuzzle, sandbox: parseSandbox, doc: parseDoc };
  async function loadFile(kind, id, lang) {
    if (!DIRS[kind]) throw new Error(`unknown content kind: ${kind}`);
    const f = await withFallback(`${DIRS[kind]}/${id}`, lang);
    return { id, ...f, data: parsers[kind](f.text) };
  }
  return {
    async loadSummary() {
      const text = await get(`${base}index.md`);
      if (text === null) throw new Error(`content file not found: ${base}index.md`);
      return parseSummary(text);
    },
    async loadAiWork(lang) {
      const f = await withFallback('ai-work', lang);
      return { ...f, data: parseAiWork(f.text) };
    },
    loadFile,
    loadMission: (id, lang) => loadFile('mission', id, lang),
    loadPuzzle: (id, lang) => loadFile('puzzle', id, lang),
    loadSandbox: (id, lang) => loadFile('sandbox', id, lang),
    loadDoc: (id, lang) => loadFile('doc', id, lang),
  };
}
