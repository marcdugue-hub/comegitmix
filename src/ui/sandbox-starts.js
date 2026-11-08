// Sandbox starting points (docs/SANDBOX.md §2): a start file, a pasted ```git-setup block, or the final state
// of a finished mission. Pure (the loader is passed in). Each builder returns
//   { state, lines: [setup line texts], error: { key, params } | null, line }
import { runSetup, setupLinesFromText, applySetupLines } from '../engine/setup.js';
import { apply } from '../engine/apply.js';
import { parse } from '../engine/parse.js';
import { parseWebAction } from '../engine/remote.js';
import { playInstruction } from '../engine/content-check.js';

const texts = (lines) => (lines || []).map((l) => (typeof l === 'string' ? l : l.text));

/** Start from a parsed sandbox file (src/content/sandbox.js). */
export function startFromSandbox(data) {
  if (!data || !data.setup) return { state: null, lines: [], error: { key: 'sandbox.start.broken', params: {} }, line: null };
  const r = runSetup(data.setup.lines, { folder: data.front.folder, repos: data.front.repos, conflicts: data.conflicts });
  return { state: r.error ? null : r.state, lines: texts(data.setup.lines), error: r.error || null, line: r.line || null };
}

/** Text pasted by the player: a ```git-setup block (fences and a front matter are tolerated). */
export function pastedLines(text) {
  let body = String(text || '').replace(/\r\n/g, '\n');
  const fm = /^---\n[\s\S]*?\n---\n/.exec(body);
  if (fm) body = body.slice(fm[0].length);
  const fence = /```git-setup\n([\s\S]*?)```/.exec(body);
  if (fence) body = fence[1];
  return setupLinesFromText(body);
}

/** Start from a pasted block. An empty text is an error. */
export function startFromPaste(text) {
  const lines = pastedLines(text);
  if (!lines.length) return { state: null, lines: [], error: { key: 'sandbox.paste.empty', params: {} }, line: null };
  const r = runSetup(lines, {});
  return { state: r.error ? null : r.state, lines: texts(lines), error: r.error || null, line: r.line || null, text: r.text };
}

/**
 * Final state of a mission (parsed by src/content/mission.js): its last part played from its setup,
 * step by step (typed commands, site actions, interface instructions). Returns null when it cannot be played.
 */
export function missionFinalState(m) {
  if (!m || !m.setup || !m.parts || !m.parts.length) return null;
  const conflicts = [...(m.conflicts || []), ...m.parts.flatMap((p) => p.conflicts || [])];
  const part = m.parts[m.parts.length - 1];
  const setup = part.setup || m.setup;
  const r = runSetup(setup.lines, { folder: m.front.folder, repos: m.front.repos, conflicts });
  if (r.error) return null;
  let s = r.state;
  for (const step of part.steps) {
    if (step.before && step.before.length) {
      const b = applySetupLines(s, step.before);
      if (b.error) return null;
      s = b.state;
    }
    if (step.web && step.web.length) {
      for (const w of step.web) {
        const c = parseWebAction(w);
        const x = c ? apply(s, c) : null;
        if (!x || x.error) return null;
        s = x.state;
      }
    } else if (step.isInstruction) {
      const x = playInstruction(s, step.check);
      if (x.error) return null;
      s = x.state;
    } else if (step.command) {
      const x = apply(s, parse(step.command));
      if (!x.error) s = x.state;
    }
  }
  return s;
}

/** Start from a finished mission (lines: none, the state cannot be written back as text without replaying). */
export function startFromMission(data) {
  const state = missionFinalState(data);
  return { state, lines: [], error: state ? null : { key: 'sandbox.start.broken', params: {} }, line: null };
}

/**
 * Builds a start from its reference, using the content loader.
 * src: { kind: 'start', id } | { kind: 'paste', text } | { kind: 'mission', id }
 * Resolves to { state, lines, error, line, title, text }.
 */
export async function buildStart(src, { loader, lang }) {
  if (!src) return { state: null, lines: [], error: { key: 'sandbox.start.broken', params: {} } };
  try {
    if (src.kind === 'paste') return { ...startFromPaste(src.text), title: null };
    if (src.kind === 'mission') {
      const f = await loader.loadMission(src.id, lang);
      return { ...startFromMission(f.data), title: f.data.front.title || src.id };
    }
    const f = await loader.loadSandbox(src.id, lang);
    return { ...startFromSandbox(f.data), title: f.data.front.title || src.id, text: f.data.text };
  } catch {
    return { state: null, lines: [], error: { key: 'sandbox.start.broken', params: {} } };
  }
}
