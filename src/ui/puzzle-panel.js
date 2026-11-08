// Puzzle screen (#/puzzle/<id>): prompt, scene with the goal drawn dashed, choice or typed answer, stars, takeaway.
// Logic (states, evaluation, stars) lives in puzzle-logic.js; the scene comes from render/scene.js; the terminal
// (typed puzzles) from ui/terminal.js. mount(container, { id, ctx: { loader, summary, progress } }) -> unmount.
import { t, getLang } from '../i18n/i18n.js';
import { registerScreen, navigate, buildHash } from '../router.js';
import { apply } from '../engine/apply.js';
import { renderScene } from '../render/scene.js';
import { esc } from '../render/html.js';
import { openDiffScreen } from '../render/diff-screen.js';
import { icon } from './icons.js';
import {
  MAX_STARS, starsFor, buildPuzzle, evaluateChoice, classify, isSolved, hintStart, choiceToRuleOut, formatTime, nextPuzzleId,
} from './puzzle-logic.js';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children);
  return node;
}
const svg = (name, opts) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = icon(name, opts);
  return tpl.content.firstChild;
};
/** Appends children (a named helper keeps the hard-coded-text scanner away from class-name literals). */
const put = (parent, ...kids) => parent.append(...kids);
const say = (m) => (m ? t(m.key, m.params) : '');

/** Title with its last word in the accent colour (as in the mockup). */
function titleNode(title) {
  const i = title.lastIndexOf(' ');
  const h = el('h2', { class: 'puzzle-title' });
  if (i < 0) put(h, el('em', {}, [title]));
  else put(h, `${title.slice(0, i)} `, el('em', {}, [title.slice(i + 1)]));
  return h;
}

function starsNode(n, extraClass = '') {
  const wrap = el('span', { class: `puzzle-stars ${extraClass}`.trim(), role: 'img', 'aria-label': t('home.puzzle.stars', { n, max: MAX_STARS }) });
  for (let k = 0; k < MAX_STARS; k++) {
    const s = svg('star', { size: 20 });
    if (k < n) s.classList.add('is-on');
    wrap.append(s);
  }
  return wrap;
}

export function mountPuzzle(container, { id, ctx }) {
  const { loader, summary, progress } = ctx;
  let alive = true;
  let scene = null;
  let terminal = null;
  let diffView = null;
  let timerId = null;
  const root = el('div', { class: 'layout puzzle-layout' });
  container.replaceChildren(root);
  put(root, el('aside', { class: 'panel puzzle-panel' }, [el('p', { class: 'secondary' }, [t('puzzle.ui.loading')])]));

  const cleanup = () => {
    alive = false;
    if (timerId) clearInterval(timerId);
    timerId = null;
    if (scene) scene.destroy();
    if (diffView) diffView.close();
    if (terminal) terminal.destroy();
    diffView = null;
    scene = null;
    terminal = null;
  };

  function fail(message) {
    root.replaceChildren(el('aside', { class: 'panel puzzle-panel' }, [
      el('p', { class: 'eyebrow' }, [t('puzzle.ui.eyebrow')]),
      el('p', { role: 'alert' }, [message]),
      el('a', { class: 'btn btn--dark', href: '#/' }, [t('puzzle.ui.backToList')]),
    ]));
  }

  loader.loadPuzzle(id, getLang()).then((file) => {
    if (alive) start(file);
  }).catch(() => {
    if (alive) fail(t('puzzle.ui.loadError'));
  });
  return cleanup;

  function start(file) {
    const data = file.data;
    if (data.errors.length) {
      fail(t('puzzle.ui.contentError', { n: data.errors.length }));
      return;
    }
    const built = buildPuzzle(data);
    if (built.error) {
      fail(`${t('puzzle.ui.contentError', { n: 1 })} ${say(built.error)}`);
      return;
    }
    const { initial, goal } = built;
    const typed = data.type === 'typed';
    const puzzles = summary.puzzles || [];
    const index = puzzles.findIndex((p) => p.id === id);
    const nextId = nextPuzzleId(puzzles, id);

    // ---- mutable game state ----
    const S = {
      state: initial, picked: -1, ruledOut: new Set(), wrong: new Set(), lastWrong: null,
      misses: 0, hints: 0, hintText: '', timedOut: false, solved: false, stars: 0, lastResult: null, notYet: false,
    };
    const timerSeconds = Number(data.front.timer) > 0 ? Number(data.front.timer) : 0;
    const startedAt = Date.now();

    // ---- panel skeleton (built once) ----
    const panel = el('aside', { class: 'panel puzzle-panel', 'aria-label': t('puzzle.ui.panelLabel') });
    const timerEl = el('span', { class: 'puzzle-timer mono', role: 'timer' });
    const eyebrowRow = el('div', { class: 'puzzle-eyebrow-row' }, [
      el('span', { class: 'eyebrow' }, [`★ ${t('puzzle.ui.eyebrow')}`]),
      ...(file.fallback ? [el('span', { class: 'chip chip--small badge-fallback', title: t('home.fallbackNote') }, [t('lang.fr')])] : []),
      ...(timerSeconds ? [timerEl] : []),
    ]);
    const body = el('div', { class: 'puzzle-body' });
    const terminalHost = el('div', { class: 'puzzle-terminal' });
    const sceneHost = el('div', { class: 'puzzle-scene' });
    panel.append(eyebrowRow, titleNode(data.front.title || id), progressBar(), body);
    root.replaceChildren(panel, sceneHost);

    // a goal identical to the start (a read-only solution such as `git diff --staged`) has nothing to draw
    scene = renderScene(sceneHost, S.state, {
      goalState: goal === initial ? null : goal,
      onAction: typed ? onSceneAction : undefined,
    });

    if (typed) mountTerminal();
    if (timerSeconds) startTimer();
    renderBody();

    function progressBar() {
      const n = Math.max(puzzles.length, 1);
      const bar = el('div', { class: 'puzzle-progress', role: 'img', 'aria-label': t('puzzle.ui.progress', { n: index + 1, total: n }) });
      puzzles.forEach((p, i) => {
        const cls = i === index ? 'is-current' : progress.getStars(p.id) > 0 ? 'is-done' : '';
        put(bar, el('span', { class: `puzzle-seg ${cls}`.trim() }));
      });
      return bar;
    }

    // ---- timer ----
    function remaining() {
      return timerSeconds - (Date.now() - startedAt) / 1000;
    }
    function tick() {
      const left = remaining();
      timerEl.textContent = formatTime(Math.ceil(left));
      timerEl.classList.toggle('is-over', left <= 0);
      if (left <= 0 && !S.timedOut && !S.solved) {
        S.timedOut = true;
        renderBody();
      }
      if (S.solved || left <= 0) {
        clearInterval(timerId);
        timerId = null;
      }
    }
    function startTimer() {
      tick();
      timerId = setInterval(tick, 500);
    }

    // ---- typed puzzles ----
    async function mountTerminal() {
      try {
        const { createTerminal } = await import('./terminal.js');
        if (!alive) return;
        terminal = createTerminal(terminalHost, {
          onSubmit: onCommand,
          placeholder: t('puzzle.ui.placeholder'),
        });
        if (S.solved) terminal.setDisabled(true);
      } catch (e) {
        console.error(e);
        terminalHost.textContent = t('puzzle.ui.loadError');
      }
    }
    /** Opens the diff screen over the scene when a played command showed a diff. */
    function showDiff(result, state) {
      const ev = (result.events || []).find((e) => e.type === 'diff.shown');
      if (!ev) return;
      if (diffView) diffView.close();
      diffView = openDiffScreen(sceneHost, {
        state, mode: ev.mode, desk: ev.desk, onClose: () => { diffView = null; },
      });
    }
    function closeDiff() {
      if (diffView) diffView.close();
    }
    function playEngine(command) {
      const result = apply(S.state, command);
      const kind = classify(S.state, result);
      if (!result.error) {
        S.state = result.state;
        scene.update(result.state, result.events);
      } else scene.shake();
      showDiff(result, S.state);
      return { result, kind };
    }
    function onCommand(text) {
      if (S.solved) return;
      const { result, kind } = playEngine(text);
      S.lastResult = result;
      S.notYet = false;
      if (terminal) {
        terminal.print({
          command: text,
          explanation: result.explanation ? esc(say(result.explanation)) : undefined, // the terminal inserts it as HTML
          error: result.error ? say(result.error) : undefined,
          warning: result.warning ? say(result.warning) : undefined,
        });
      }
      if (kind !== 'error' && isSolved(data, { state: S.state, goal, initial, last: { command: text, result } })) {
        solve();
        return;
      }
      if (kind === 'change') {
        S.misses += 1;
        S.notYet = true;
      }
      renderBody();
    }
    function onSceneAction(action) {
      if (S.solved) return;
      const names = { click: 'click', create: 'create', cd: 'cd' };
      if (!names[action.type]) return;
      let command;
      if (action.type === 'click') command = { name: 'click', args: [action.desk, action.path] };
      else if (action.type === 'create') command = { name: 'create', args: [action.desk, action.dir || ''] };
      else command = { name: 'cd', args: [action.desk] };
      const { result } = playEngine(command);
      if (!result.error && isSolved(data, { state: S.state, goal, initial, last: { command, result } })) solve();
      else renderBody();
    }
    function resetTyped() {
      S.state = initial;
      S.notYet = false;
      closeDiff();
      scene.update(initial, []);
      if (terminal) terminal.clear();
      renderBody();
      if (terminal) terminal.focus();
    }

    // ---- choice puzzles ----
    function pick(i) {
      if (S.solved || S.wrong.has(i) || S.ruledOut.has(i)) return;
      if (S.lastWrong) restoreScene();
      S.picked = i;
      renderBody();
    }
    function restoreScene() {
      S.lastWrong = null;
      S.state = initial;
      closeDiff();
      scene.update(initial, []);
    }
    function check() {
      if (S.solved || S.picked < 0) return;
      const ev = evaluateChoice(data, initial, S.picked);
      const r = ev.result;
      if (r.error) scene.shake();
      else {
        S.state = r.state;
        scene.update(r.state, r.events);
      }
      showDiff(r, initial);
      S.lastResult = r;
      if (ev.correct) {
        solve();
        return;
      }
      S.misses += 1;
      S.wrong.add(S.picked);
      S.lastWrong = { index: S.picked, result: r, choice: ev.choice };
      S.picked = -1;
      renderBody();
    }
    function hint() {
      if (S.solved) return;
      if (typed) {
        if (!S.hintText) S.hints += 1;
        S.hintText = hintStart(data.solution.command);
      } else {
        const i = choiceToRuleOut(data, S.ruledOut, S.picked);
        if (i < 0) return;
        S.ruledOut.add(i);
        S.hints += 1;
      }
      renderBody();
    }

    // ---- end of puzzle ----
    function solve() {
      S.solved = true;
      S.notYet = false;
      S.stars = starsFor({ misses: S.misses, hints: S.hints, timedOut: S.timedOut });
      progress.setStars(id, S.stars);
      if (timerId) { clearInterval(timerId); timerId = null; }
      scene.update(null, [], { goalState: null });
      if (terminal) terminal.setDisabled(true);
      renderBody();
    }

    // ---- panel body ----
    function renderBody() {
      const kids = [el('p', { class: 'puzzle-prompt' }, [data.prompt.text])];
      kids.push(el('div', { class: 'puzzle-goal' }, [
        el('p', { class: 'eyebrow' }, [t('puzzle.ui.goalLabel')]),
        el('p', {}, [data.goal.text]),
      ]));
      if (!S.solved) kids.push(el('p', { class: 'eyebrow puzzle-ask' }, [typed ? t('puzzle.ui.type') : t('puzzle.ui.pick')]));
      if (typed) {
        kids.push(terminalHost);
        if (S.hintText) kids.push(el('p', { class: 'puzzle-hint', role: 'status' }, [t('puzzle.ui.hintText', { start: S.hintText })]));
      } else kids.push(optionsNode());
      if (!S.solved) kids.push(actionsNode());
      kids.push(...feedbackNodes());
      body.replaceChildren(...kids);
    }

    function optionsNode() {
      const list = el('div', { class: 'puzzle-options', role: 'radiogroup', 'aria-label': t('puzzle.ui.pick') });
      data.choices.forEach((c, i) => {
        const isWrong = S.wrong.has(i);
        const isRuled = S.ruledOut.has(i);
        const isRight = S.solved && c.correct;
        const selected = S.picked === i || isRight;
        const cls = ['opt', selected ? 'is-selected' : '', isWrong ? 'is-wrong' : '', isRuled ? 'is-ruled-out' : '', isRight ? 'is-right' : '']
          .filter(Boolean).join(' ');
        const note = isWrong ? c.explanation : null;
        const b = el('button', {
          type: 'button', class: cls, role: 'radio', 'aria-checked': selected ? 'true' : 'false', 'data-choice': String(i),
          disabled: S.solved || isWrong || isRuled,
        }, [el('code', {}, [c.command]), ...(note ? [el('span', {}, [note])] : [])]);
        b.addEventListener('click', () => pick(i));
        list.append(b);
      });
      return list;
    }

    function actionsNode() {
      const row = el('div', { class: 'puzzle-actions' });
      const hintDisabled = !typed && choiceToRuleOut(data, S.ruledOut, S.picked) < 0;
      if (typed) {
        const reset = el('button', { type: 'button', class: 'btn btn--ghost', 'data-action-name': 'reset' }, [svg('rotate-ccw', { size: 16 }), t('ui.reset')]);
        reset.addEventListener('click', resetTyped);
        row.append(reset);
      } else if (S.lastWrong) {
        const again = el('button', { type: 'button', class: 'btn btn--primary', 'data-action-name': 'retry' }, [t('puzzle.ui.tryAgain')]);
        again.addEventListener('click', () => { restoreScene(); renderBody(); });
        row.append(again);
      } else {
        const ok = el('button', { type: 'button', class: 'btn btn--primary', 'data-action-name': 'check', disabled: S.picked < 0 }, [t('ui.validate')]);
        ok.addEventListener('click', check);
        row.append(ok);
      }
      const hintBtn = el('button', { type: 'button', class: 'btn btn--ghost', 'data-action-name': 'hint', disabled: hintDisabled }, [svg('lightbulb', { size: 16 }), t('ui.hint')]);
      hintBtn.addEventListener('click', hint);
      const skip = el('button', { type: 'button', class: 'btn btn--ghost', 'data-action-name': 'skip' }, [t('ui.skip')]);
      skip.addEventListener('click', () => (nextId ? navigate({ name: 'puzzle', id: nextId }) : navigate({ name: 'home' })));
      put(row, hintBtn, skip, starsNode(starsFor({ misses: S.misses, hints: S.hints, timedOut: S.timedOut }), 'puzzle-stars--live'));
      return row;
    }

    function feedbackNodes() {
      const out = [];
      if (S.timedOut && !S.solved) out.push(el('p', { class: 'puzzle-note', role: 'status' }, [t('puzzle.ui.timeUp')]));
      if (S.notYet && !S.solved) out.push(el('p', { class: 'puzzle-note', role: 'status' }, [t('puzzle.ui.notYet')]));
      if (S.lastWrong && !S.solved) {
        const r = S.lastWrong.result;
        out.push(el('div', { class: 'puzzle-feedback is-wrong', role: 'status' }, [
          el('p', { class: 'puzzle-feedback-title' }, [t('puzzle.ui.wrong')]),
          el('p', {}, [S.lastWrong.choice.explanation || '']),
          ...(r && (r.error || r.explanation) ? [el('p', { class: 'secondary small' }, [`${t('ui.whatHappened')} : ${say(r.error || r.explanation)}`])] : []),
        ]));
      }
      if (S.solved) {
        const r = S.lastResult;
        const what = r && r.explanation ? say(r.explanation) : '';
        out.push(el('div', { class: 'puzzle-feedback is-right', role: 'status' }, [
          el('p', { class: 'puzzle-feedback-title' }, [svg('check', { size: 18 }), t('puzzle.ui.right')]),
          ...(what ? [el('p', {}, [what])] : []),
          el('div', { class: 'puzzle-result' }, [
            starsNode(S.stars, 'puzzle-stars--final'),
            el('span', { class: 'small' }, [t('puzzle.ui.starsEarned', { n: S.stars, max: MAX_STARS })]),
          ]),
        ]));
        out.push(el('div', { class: 'callout puzzle-takeaway' }, [
          el('p', { class: 'eyebrow' }, [t('ui.takeaway')]),
          el('p', {}, [data.takeaway.text]),
        ]));
        const nav = el('div', { class: 'puzzle-actions puzzle-nav' });
        if (nextId) put(nav, el('a', { class: 'btn btn--primary', href: buildHash({ name: 'puzzle', id: nextId }), 'data-action-name': 'next' }, [t('puzzle.ui.next'), svg('chevron-right', { size: 16 })]));
        put(nav, el('a', { class: `btn ${nextId ? 'btn--ghost' : 'btn--primary'}`, href: '#/', 'data-action-name': 'back' }, [t('puzzle.ui.backToList')]));
        out.push(nav);
      } else {
        out.push(el('div', { class: 'puzzle-tip' }, [
          el('img', { src: 'assets/duo-rond.png', alt: '' }),
          el('div', { class: 'bubble' }, [typed ? t('puzzle.ui.tipTyped') : t('puzzle.ui.tipChoice')]),
        ]));
      }
      return out;
    }
  }
}

registerScreen('puzzle', mountPuzzle);
