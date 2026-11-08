// Dev-only preview of the diff, conflict and log screens. Not part of the game.
// URL hash: #screen=diff|conflict|log&mode=branches|work|staged&view=side|unified&lang=fr|en&detail=1&path=plan.md
import { load, setLang, t } from '../src/i18n/i18n.js';
import { openDiffScreen } from '../src/render/diff-screen.js';
import { openConflictScreen } from '../src/render/conflict-screen.js';
import { renderLog } from '../src/render/log-view.js';
import { apply } from '../src/engine/apply.js';
import { workState, conflictState, historyState } from './screens-fixtures.js';

const params = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
const go = (patch) => { location.hash = new URLSearchParams({ ...params(), ...patch }).toString(); };
const bar = document.getElementById('bar');
const scene = document.getElementById('scene');
let current = null;

function button(label, patch) {
  const b = document.createElement('button');
  b.className = 'btn btn--small';
  b.textContent = label; // i18n-ok
  b.addEventListener('click', () => go(patch));
  bar.append(b);
}

async function show() {
  const p = params();
  await setLang(p.lang === 'en' ? 'en' : 'fr');
  if (current) current.close();
  current = null;
  scene.innerHTML = '';
  const screen = p.screen || 'diff';
  if (screen === 'diff') {
    current = openDiffScreen(scene, { state: workState(), mode: p.mode || 'branches', view: p.view, path: p.path, a: 'main', b: 'ia/resume', onClose: () => { scene.innerHTML = `<p>${t('ui.close')}</p>`; } });
  } else if (screen === 'conflict') {
    let state = conflictState({ detailed: p.detail === '1' });
    current = openConflictScreen(scene, {
      state, path: 'plan.md',
      onResolve: (side) => { state = apply(state, { name: 'resolve', args: ['plan.md', side] }).state; current.update(state); },
    });
  } else {
    renderLog(scene, historyState(), {});
  }
}

for (const [label, patch] of [
  ['diff · lanes', { screen: 'diff', mode: 'branches' }], ['diff · work', { screen: 'diff', mode: 'work' }], ['diff · staged', { screen: 'diff', mode: 'staged' }],
  ['side', { view: 'side' }], ['unified', { view: 'unified' }],
  ['conflict', { screen: 'conflict', detail: '0' }], ['conflict + detail', { screen: 'conflict', detail: '1' }], ['log', { screen: 'log' }],
  ['fr', { lang: 'fr' }], ['en', { lang: 'en' }],
]) button(label, patch);

window.addEventListener('hashchange', show);
await load('fr');
await load('en');
show();
