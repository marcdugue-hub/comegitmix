// Mission screen (docs/SPEC.md §3.1, mockups Main, A5, A6, A7): panel on the left (duo, steps, current step card,
// terminal, "what just happened", palette), the four-zone scene on the right.
// Route: #/mission/<id>?part=B&step=3 — the URL follows the current part and step (router.replace) and a reload or a
// language switch replays the part up to that step. The step logic is pure and lives in mission-steps.js.
import { t, getLang } from '../i18n/i18n.js';
import { registerScreen, replace, buildHash } from '../router.js';
import { renderScene } from '../render/scene.js';
import { openDiffScreen } from '../render/diff-screen.js';
import { openConflictScreen } from '../render/conflict-screen.js';
import { logHtml } from '../render/log-view.js';
import { mountOverlay } from '../render/screens-util.js';
import { renderInline } from '../content/markdown.js';
import { parseWebAction } from '../engine/remote.js';
import { getDesk, activeDesk, findFile } from '../engine/state.js';
import { createTerminal } from './terminal.js';
import { createScenePopovers, handlePopoverAction } from './scene-tools.js';
import { icon } from './icons.js';
import { mountCompare } from './mission-compare.js';
import {
  startSession, partSession, gotoStep, act, noteDiff, autoStep, currentStep, isPartDone, stepKind, expectsError,
  lockedReposFor, missionNumbers, paletteFor, paletteInsert, highlightFor, predictAiFiles, nextAiTextIndex, aiCommand,
  workState, diffTarget, logTarget,
} from './mission-steps.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const md = (text) => (text ? renderInline(text) : '');

let catalogue = null;
async function loadCatalogue() {
  if (catalogue) return catalogue;
  try {
    const res = await fetch('data/commands.json');
    catalogue = res.ok ? await res.json() : null;
  } catch {
    catalogue = null;
  }
  return catalogue;
}

/** Joins file names in the UI language ("a.md and b.md"). */
function joinFiles(files) {
  try {
    return new Intl.ListFormat(getLang(), { style: 'long', type: 'conjunction' }).format(files);
  } catch {
    return files.join(', ');
  }
}

/** Text of an engine message ({ key, params }). */
function msg(m) {
  return m && m.key ? t(m.key, m.params || {}) : '';
}

/** Loads everything the screen needs: the mission, the numbering of the list, the AI texts. */
async function loadAll(ctx, id) {
  const { loader, summary } = ctx;
  const lang = getLang();
  const file = await loader.loadMission(id, lang);
  const ids = (summary.missions || []).map((m) => m.id);
  const files = await Promise.all(ids.map((x) => (x === id ? file : loader.loadMission(x, lang).catch(() => null))));
  const modes = {};
  ids.forEach((x, i) => { if (files[i]) modes[x] = files[i].data.mode; });
  const numbering = missionNumbers(ids, modes);
  let aiItems = [];
  try {
    aiItems = (await loader.loadAiWork(lang)).data.items || [];
  } catch {
    aiItems = [];
  }
  const cat = await loadCatalogue();
  return { file, ids, files, numbering, aiItems, catalogue: cat };
}

function mountMission(container, params) {
  const { id, ctx } = params;
  let alive = true;
  let teardown = null;
  const wrap = document.createElement('div');
  wrap.className = 'mission-screen';
  wrap.innerHTML = `<p class="mission-loading secondary">${esc(t('missionScreen.loading'))}</p>`;
  container.replaceChildren(wrap);

  loadAll(ctx, id).then((data) => {
    if (!alive) return;
    if (data.file.data.mode === 'compare') teardown = mountCompare(wrap, { ...data, id, ctx });
    else teardown = mountPlay(wrap, { ...data, id, params });
  }).catch((e) => {
    console.error(e);
    if (!alive) return;
    wrap.innerHTML = `<p class="mission-error notice">${esc(t('missionScreen.loadError'))}</p>`;
  });

  return () => {
    alive = false;
    if (typeof teardown === 'function') teardown();
  };
}

function mountPlay(wrap, { file, ids, numbering, aiItems, catalogue: cat, id, params }) {
  const { ctx } = params;
  const mission = file.data;
  const number = numbering.numbers[id] || null;
  const stepper = mission.mode === 'stepper';
  const lettered = mission.parts.some((p) => p.letter);
  const startIndex = Math.max(0, (params.step || 1) - 1);
  let session = startSession(mission, { part: params.part || 0, step: startIndex });
  let happened = '';
  let note = null;
  let hintOpen = false;
  let overlay = null;
  let alive = true;

  if (startIndex > 0 && session.index > 0) {
    const prev = session.part.steps[session.index - 1];
    happened = md(prev.after);
    note = prev.note;
  }

  wrap.innerHTML =
    `<div class="layout mission-layout">` +
    `<aside class="panel mission-panel" aria-labelledby="mission-title">` +
    `<div class="mission-top"></div>` +
    `<div class="mission-terminal"></div>` +
    `<div class="mission-bottom"></div>` +
    `</aside>` +
    `<div class="mission-stage"></div>` +
    `</div>`;
  const panelTop = wrap.querySelector('.mission-top');
  const panelBottom = wrap.querySelector('.mission-bottom');
  const stage = wrap.querySelector('.mission-stage');

  const terminal = createTerminal(wrap.querySelector('.mission-terminal'), {
    onSubmit: (text) => play(text, { typed: text }),
    suggest: (text) => suggestions(text),
    placeholder: t('term.inputLabel'),
  });

  const scene = renderScene(stage, session.state, { ...sceneOptions(), onAction });
  const popovers = createScenePopovers({
    getState: () => session.state,
    run: (command) => play(command, typeof command === 'string' ? { typed: command } : {}),
    activate: (deskId) => {
      const d = getDesk(session.state, deskId);
      if (d && d.id !== session.state.active) play({ name: 'cd', args: [d.path] });
    },
  });

  function sceneOptions() {
    const step = currentStep(session);
    const kind = step ? stepKind(step) : null;
    return {
      lockedRepos: lockedReposFor(number),
      note: note || null,
      highlight: kind && kind !== 'command' ? highlightFor(step, session.state) : null,
      aiWork: true,
    };
  }

  function suggestions(text) {
    const out = [];
    const step = currentStep(session);
    const v = String(text || '').trim();
    if (!v) return out;
    if (step && stepKind(step) === 'command' && step.command.startsWith(v) && step.command !== v) out.push(step.command);
    if (cat) {
      for (const c of paletteFor(number || 99, cat).unlocked) {
        const ins = paletteInsert(c.syntax);
        if (ins && ins.trim().startsWith(v) && ins.trim() !== v) out.push(ins.trim());
      }
    }
    return out;
  }

  // ---- URL ----
  function syncUrl() {
    const route = { name: 'mission', id, step: session.index + 1 };
    if (lettered) route.part = session.part.letter;
    replace(route);
  }

  // ---- overlays (diff, conflict, log) ----
  function closeOverlay() {
    if (overlay) {
      const o = overlay;
      overlay = null;
      o.close();
    }
  }

  function openDiff(target, { desk = null, path = null } = {}) {
    closeOverlay();
    const state = session.state;
    const d = desk || state.active;
    overlay = openDiffScreen(stage, { state, mode: target.mode, a: target.a, b: target.b, threeDot: Boolean(target.threeDot), desk: d, path, onClose: () => { overlay = null; } });
  }

  function openConflict(deskId, path) {
    closeOverlay();
    overlay = openConflictScreen(stage, {
      state: session.state,
      desk: deskId,
      path,
      onResolve: (side) => {
        play({ name: 'resolve', args: [deskId, path, side] }, { keepOverlay: true });
        if (overlay && overlay.update) overlay.update(session.state);
      },
      onClose: () => { overlay = null; },
    });
  }

  function openLog(branch) {
    closeOverlay();
    const root = mountOverlay(stage, 'diff-screen mission-log-screen');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', t('log.title', { branch: branch || '' }));
    root.tabIndex = -1;
    const desk = activeDesk(session.state);
    const label = branch || (desk && desk.branch) || '';
    root.innerHTML =
      `<header class="card diff-head"><div class="diff-head-top"><div class="eyebrow">★ ${esc(t('log.title', { branch: label }))}</div>` +
      `<button type="button" class="btn-icon diff-close" data-action="close" aria-label="${esc(t('missionScreen.logClose'))}">${icon('x')}</button></div></header>` +
      `<div class="card mission-log-body">${logHtml(session.state, { branch })}</div>`;
    const doc = root.ownerDocument;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    function close() {
      doc.removeEventListener('keydown', onKey, true);
      root.remove();
      overlay = null;
    }
    root.addEventListener('click', (e) => { if (e.target.closest('[data-action="close"]')) close(); });
    doc.addEventListener('keydown', onKey, true);
    root.focus();
    overlay = { close };
  }

  // ---- playing ----
  function printResult(label, result) {
    terminal.print({
      command: label,
      explanation: result.explanation ? esc(msg(result.explanation)) : '',
      error: result.error ? msg(result.error) : '',
      warning: result.warning ? msg(result.warning) : '',
    });
  }

  function labelOf(command, result) {
    const eq = result && result.equivalent;
    if (eq && eq.command) return eq.command;
    if (eq && eq.key) return t(eq.key, eq.params || {});
    if (typeof command === 'string') return command;
    return (command && command.text) || '';
  }

  function afterAction(out, command, { typed = null, keepOverlay = false, extraText = '' } = {}) {
    const r = out.result || { events: [] };
    const step = out.step;
    if (!keepOverlay) closeOverlay();
    if (r) printResult(typed || labelOf(command, r), r);
    if (out.completed) {
      happened = md(step.after) || esc(msg(r.explanation)) || md(extraText);
      note = step.note || null;
      hintOpen = false;
    } else if (r.error && !(step && expectsError(step))) {
      happened = `<span class="mission-happened-error">${esc(msg(r.error))}</span>`;
    } else {
      const base = extraText ? md(extraText) : esc(msg(r.explanation));
      happened = base;
      if (step && stepKind(step) === 'command' && !r.error && r.state !== undefined && typed) happened = `${base}${base ? ' ' : ''}<em>${esc(t('missionScreen.notYet'))}</em>`;
    }
    scene.update(session.state, r.events || [], sceneOptions());
    if (r.error) scene.shake();
    if (!keepOverlay) openScreensFor(command, r, out, step);
    if (out.completed && isPartDone(session) && isLastPart()) ctx.progress.markMissionDone(id);
    renderPanel();
    syncUrl();
  }

  function openScreensFor(command, r, out, step) {
    if (r.error) return;
    const events = r.events || [];
    const diffEv = events.find((e) => e.type === 'diff.shown');
    if (diffEv) {
      const target = diffTarget(typeof command === 'string' ? command : command, out.stateBefore || session.state) || { mode: diffEv.mode };
      openDiff(target);
      return;
    }
    if (events.some((e) => e.type === 'log.shown')) {
      const lt = logTarget(command);
      openLog(lt ? lt.branch : null);
      return;
    }
    const shown = r.output && r.output.kind === 'show' ? r.output.commit : null;
    if (events.some((e) => e.type === 'commit.shown') && shown && shown.parents && shown.parents[0]) {
      openDiff({ mode: 'branches', a: shown.parents[0], b: shown.id });
      return;
    }
    if (out.completed && step) {
      if (step.opens === 'conflict') {
        const desk = activeDesk(session.state);
        const f = desk && desk.files.find((x) => x.kind === 'file' && x.status === 'conflict');
        if (f) openConflict(desk.id, f.path);
      } else if (step.opens === 'diff' && step.diffMode) {
        openDiff({ mode: step.diffMode });
      }
    }
  }

  function play(command, opts = {}) {
    if (!alive) return null;
    const stateBefore = session.state;
    const out = act(session, command, { diffModes: opts.diffModes || [] });
    session = out.session;
    afterAction({ ...out, stateBefore }, command, opts);
    return out;
  }

  function runAuto() {
    closeOverlay();
    const out = autoStep(session);
    session = out.session;
    const last = out.results.length ? out.results[out.results.length - 1] : null;
    for (const x of out.results.slice(0, -1)) printResult(labelOf(x.command, x.result), x.result);
    afterAction({ result: last ? last.result : { events: [] }, step: out.step, completed: out.completed }, last ? last.command : '', {});
  }

  function aiWork(deskId) {
    const step = currentStep(session);
    const state = session.state;
    const files = predictAiFiles(state, deskId, step);
    let text = step && step.aiText ? step.aiText : '';
    if (!text && aiItems.length) {
      const item = aiItems[nextAiTextIndex(state) % aiItems.length];
      text = item.text.replace(/\{files\}/g, joinFiles(files));
    }
    play(aiCommand(state, deskId, step, text), { extraText: text });
  }

  function webAction(text) {
    const c = parseWebAction(text);
    if (c) play(c);
  }

  function onAction(action) {
    const state = session.state;
    switch (action.type) {
      case 'click': play({ name: 'click', args: [action.desk, action.path] }); break;
      case 'create': play({ name: 'create', args: [action.desk, action.dir || ''] }); break;
      case 'delete': play({ name: 'rm', args: [action.path], options: {}, desk: action.desk }); break;
      case 'unstage': play({ name: 'restore', args: [action.path], options: { staged: true }, desk: action.desk }); break;
      case 'cd': {
        const d = getDesk(state, action.desk);
        if (d) play({ name: 'cd', args: [d.path] });
        break;
      }
      case 'ai-work': aiWork(action.desk); break;
      case 'diff': {
        const d = getDesk(state, action.desk);
        const f = d && findFile(d, action.path);
        if (f && f.status === 'conflict') {
          openConflict(d.id, action.path);
        } else {
          openDiff({ mode: f && f.staged && f.status !== 'M' ? 'staged' : 'work' }, { desk: action.desk, path: action.path });
          const r = noteDiff(session, 'work');
          session = r.session;
          if (r.completed) {
            happened = md(r.step.after);
            note = r.step.note || null;
            scene.update(session.state, [], sceneOptions());
            renderPanel();
            syncUrl();
          }
        }
        break;
      }
      default:
        handlePopoverAction(popovers, action);
        break;
    }
  }

  // ---- navigation ----
  function isLastPart() {
    return session.partIndex >= mission.parts.length - 1;
  }

  function resetTo(next, { clear = true } = {}) {
    closeOverlay();
    session = next;
    hintOpen = false;
    const prev = session.index > 0 ? session.part.steps[session.index - 1] : null;
    happened = prev ? md(prev.after) : '';
    note = prev ? prev.note : null;
    if (clear) terminal.clear();
    scene.update(session.state, [], sceneOptions());
    renderPanel();
    syncUrl();
  }

  function goto(index) {
    resetTo(gotoStep(session, index));
  }

  function switchPart(index) {
    resetTo(partSession(mission, index));
  }

  // ---- panel ----
  function duoText() {
    const step = currentStep(session);
    if (step && step.duo && step.duo.length) return step.duo.join(' ');
    if (session.part.duo && session.part.duo.length) return session.part.duo.join(' ');
    return (mission.duo || []).join(' ');
  }

  function partsHtml() {
    if (!lettered || mission.parts.length < 2) return '';
    const tabs = mission.parts.map((p, i) => {
      const on = i === session.partIndex;
      return `<button type="button" class="mission-part${on ? ' is-active' : ''}" data-part="${i}" aria-pressed="${on}">${esc(t('missionScreen.part', { letter: p.letter, title: p.title }))}</button>`;
    }).join('');
    return `<div class="mission-parts" role="group" aria-label="${esc(t('missionScreen.parts'))}">${tabs}</div>`;
  }

  function headHtml() {
    const front = mission.front || {};
    const eyebrow = number
      ? t('missionScreen.eyebrow', { n: number, total: numbering.total, min: front.duration || '' })
      : '';
    const badge = file.fallback ? ` <span class="chip chip--small badge-fallback" title="${esc(t('home.fallbackNote'))}">${esc(t('lang.fr'))}</span>` : '';
    const sub = lettered && session.part.title ? ` <em>${esc(session.part.title)}</em>` : '';
    return `<div class="eyebrow mission-eyebrow">★ ${esc(eyebrow)}${badge}</div>` +
      `<h2 id="mission-title" class="mission-title">${esc(front.title || id)}${sub}</h2>`;
  }

  function duoHtml() {
    const text = duoText();
    if (!text) return '';
    return `<div class="mission-duo"><img src="assets/duo-rond.png" alt="" width="52" height="52"><div class="bubble mission-bubble">${md(text)}</div></div>`;
  }

  function workHtml() {
    if (!stepper) return '';
    const w = workState(session.state);
    return `<div class="mission-work"><span class="secondary">${esc(t('ui.work'))}</span>` +
      `<span class="mission-work-state is-${w}">${esc(t(w === 'stashed' ? 'ui.workStashed' : 'ui.workVisible'))}</span></div>`;
  }

  function stepsHtml() {
    const items = session.part.steps.map((s, i) => {
      const done = i < session.index;
      const cur = i === session.index;
      const cls = `mission-step${done ? ' is-done' : ''}${cur ? ' is-current' : ''}`;
      const n = done ? icon('check', { size: 13 }) : esc(String(i + 1));
      const label = t(done ? 'missionScreen.stepDone' : cur ? 'missionScreen.stepCurrent' : 'missionScreen.stepLabel', { n: i + 1, title: s.title });
      const inner = `<span class="mission-step-n" aria-hidden="true">${n}</span><span class="mission-step-title">${esc(s.title)}</span>`;
      const body = stepper
        ? `<button type="button" class="mission-step-btn" data-step="${i}" aria-label="${esc(label)}"${cur ? ' aria-current="step"' : ''}>${inner}</button>`
        : `<div class="mission-step-row" aria-label="${esc(label)}"${cur ? ' aria-current="step"' : ''}>${inner}</div>`;
      return `<li class="${cls}">${body}</li>`;
    }).join('');
    return `<ol class="mission-steps" aria-label="${esc(t('missionScreen.steps'))}">${items}</ol>`;
  }

  function cardHtml(step) {
    const kind = stepKind(step);
    const label = kind === 'web' ? t('ui.webLabel') : kind === 'instruction' ? t('missionScreen.sceneLabel') : t('ui.nextCommand');
    let line;
    if (kind === 'web') line = `<div class="mission-cmd mono">${esc(step.web.join(' ; '))}</div>`;
    else if (kind === 'instruction') line = `<div class="mission-cmd mission-cmd--instruction">${esc(step.command.replace(/^\(|\)$/g, ''))}</div>`;
    else line = `<div class="mission-cmd mono"><span class="terminal-prompt">$ </span>${esc(step.command)}</div>`;
    const buttons = [];
    if (kind === 'command') buttons.push(`<button type="button" class="btn btn--primary btn--small" data-act="run">${esc(t('ui.run'))}</button>`);
    if (kind === 'web') {
      for (const w of step.web) {
        const c = parseWebAction(w);
        if (c) buttons.push(`<button type="button" class="btn btn--primary btn--small" data-act="web" data-web="${esc(w)}">${esc(t(`web.${c.args[0]}`, { n: c.args[1] }))}</button>`);
      }
    }
    if (kind === 'instruction' && stepper) buttons.push(`<button type="button" class="btn btn--primary btn--small" data-act="auto">${esc(t('missionScreen.autoRun'))}</button>`);
    buttons.push(`<button type="button" class="btn btn--on-dark btn--small" data-act="hint" aria-expanded="${hintOpen}">${esc(t('ui.hint'))}</button>`);
    if (stepper) buttons.push(`<button type="button" class="btn btn--on-dark btn--small" data-act="prev"${session.index === 0 ? ' disabled' : ''}>${esc(t('ui.prev'))}</button>`);
    const hintText = step.hint ? md(step.hint)
      : esc(t(kind === 'web' ? 'missionScreen.hintWeb' : kind === 'instruction' ? 'missionScreen.hintInstruction' : 'missionScreen.hintDefault'));
    return `<section class="mission-card" aria-live="polite">` +
      `<div class="mission-card-label">${esc(label)}</div>${line}` +
      (step.text ? `<div class="mission-card-text">${md(step.text)}</div>` : '') +
      `<div class="mission-card-actions">${buttons.join('')}</div>` +
      (hintOpen ? `<div class="mission-hint">${icon('lightbulb', { size: 14 })}<span>${hintText}</span></div>` : '') +
      `</section>`;
  }

  function nextLink(next) {
    if (!next || !next.kind) {
      const i = ids.indexOf(id);
      const after = ids.slice(i + 1)[0];
      return after
        ? `<a class="btn btn--dark btn--small" href="${esc(buildHash({ name: 'mission', id: after }))}" data-next="mission">${esc(t('missionScreen.next.mission'))}</a>`
        : `<a class="btn btn--dark btn--small" href="#/">${esc(t('missionScreen.backHome'))}</a>`;
    }
    const href = next.kind === 'puzzle' ? buildHash({ name: 'puzzle', id: next.id })
      : next.kind === 'sandbox' ? buildHash({ name: 'sandbox', start: next.id })
        : buildHash({ name: 'mission', id: next.id });
    return `<a class="btn btn--dark btn--small" href="${esc(href)}" data-next="${esc(next.kind)}">${esc(t(`missionScreen.next.${next.kind}`))}</a>`;
  }

  function endHtml() {
    const part = session.part;
    const out = [];
    const restart = `<button type="button" class="btn btn--ghost btn--small" data-act="restart">${esc(t('ui.restart'))}</button>`;
    const prev = stepper ? `<button type="button" class="btn btn--ghost btn--small" data-act="prev">${esc(t('ui.prev'))}</button>` : '';
    if (part.letter && part.end) {
      const nextPart = mission.parts[session.partIndex + 1];
      const toPart = nextPart
        ? `<button type="button" class="btn btn--dark btn--small" data-act="part" data-part="${session.partIndex + 1}">${esc(t('missionScreen.toPart', { letter: nextPart.letter, title: nextPart.title }))}</button>`
        : '';
      out.push(`<section class="mission-end mission-end--part" data-end="part">` +
        `<h3 class="mission-end-title">${esc(t('missionScreen.partDone', { letter: part.letter }))}</h3>` +
        `<div class="mission-end-text">${md(part.end.summary)}</div>` +
        `<div class="mission-card-actions">${toPart}${isLastPart() ? '' : restart}${isLastPart() ? '' : prev}</div></section>`);
    }
    if (isLastPart()) {
      const end = mission.end || {};
      out.push(`<section class="mission-end" data-end="mission">` +
        `<h3 class="mission-end-title">${esc(t('missionScreen.done'))}</h3>` +
        (end.summary ? `<div class="mission-end-text">${md(end.summary)}</div>` : '') +
        (end.takeaway ? `<div class="callout mission-takeaway"><div class="eyebrow">${esc(t('ui.takeaway'))}</div><div>${md(end.takeaway)}</div></div>` : '') +
        `<div class="mission-card-actions">${nextLink(end.next)}${restart}${prev}</div></section>`);
    }
    return out.join('');
  }

  function errorHtml() {
    return `<p class="notice mission-setup-error">${esc(t('missionScreen.setupError', { line: session.error.line || '' }))}</p>`;
  }

  function paletteHtml() {
    if (!cat || !number) return '';
    const pal = paletteFor(number, cat);
    const chip = (c, locked) => {
      const name = c.id.replace(/-/g, ' ');
      const ins = paletteInsert(c.syntax);
      if (locked) {
        return `<button type="button" class="mission-chip is-locked" disabled aria-label="${esc(`${name} · ${t('repo.locked', { n: c.unlock })}`)}">${icon('lock', { size: 14 })}<span>${esc(name)}</span></button>`;
      }
      const dis = ins ? '' : ' disabled';
      return `<button type="button" class="mission-chip" data-insert="${esc(ins || '')}"${dis} aria-label="${esc(t('missionScreen.paletteInsert', { command: name }))}">${icon(c.icon || 'terminal', { size: 14 })}<span>${esc(name)}</span></button>`;
    };
    return `<div class="mission-palette"><div class="eyebrow">${esc(t('missionScreen.palette'))}</div>` +
      `<div class="mission-chips">${pal.unlocked.map((c) => chip(c, false)).join('')}${pal.locked.map((c) => chip(c, true)).join('')}</div></div>`;
  }

  function renderPanel() {
    const step = currentStep(session);
    const main = session.error ? errorHtml() : step ? cardHtml(step) : endHtml();
    panelTop.innerHTML = partsHtml() + headHtml() + duoHtml() + workHtml() + stepsHtml() + main;
    panelBottom.innerHTML =
      (happened ? `<div class="mission-happened" aria-live="polite"><div class="eyebrow">${esc(t('ui.happened'))}</div><div>${happened}</div></div>` : '') +
      paletteHtml();
  }

  function onPanelClick(e) {
    const el = e.target.closest('button, a');
    if (!el || el.disabled) return;
    if (el.dataset.step !== undefined) { goto(Number(el.dataset.step)); return; }
    if (el.dataset.part !== undefined && el.classList.contains('mission-part')) { switchPart(Number(el.dataset.part)); return; }
    if (el.dataset.insert !== undefined && el.dataset.insert) { terminal.setValue(el.dataset.insert); terminal.focus(); return; }
    switch (el.dataset.act) {
      case 'run': {
        const step = currentStep(session);
        if (step) play(step.command, { typed: step.command });
        break;
      }
      case 'web': webAction(el.dataset.web); break;
      case 'auto': runAuto(); break;
      case 'hint': hintOpen = !hintOpen; renderPanel(); break;
      case 'prev': goto(Math.max(0, session.index - 1)); break;
      case 'restart': switchPart(session.partIndex); break;
      case 'part': switchPart(Number(el.dataset.part)); break;
      default: break;
    }
  }
  wrap.querySelector('.mission-panel').addEventListener('click', onPanelClick);

  renderPanel();
  syncUrl();
  if (session.index >= session.part.steps.length && isLastPart() && !session.error) ctx.progress.markMissionDone(id);

  return () => {
    alive = false;
    closeOverlay();
    terminal.destroy();
    scene.destroy();
  };
}

registerScreen('mission', mountMission);

export { mountMission };
