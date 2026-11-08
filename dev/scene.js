// Dev-only preview of the scene renderer: a few engine states, interactive (clicks are applied to the engine).
// Open with `npm start` then http://localhost:8080/dev/scene.html (add ?s=<name>&lang=en to pick a state).
import { load, setLang, getLang } from '../src/i18n/i18n.js';
import { apply } from '../src/engine/apply.js';
import { runSetup } from '../src/engine/setup.js';
import { renderScene } from '../src/render/scene.js';

const MISSION3 = `
@files plan.md intro.md resume.md chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "outline"
@work intro.md
git commit -m "intro"
git worktree add ../rapport-ia-resume -b ia/resume
@cd rapport-ia-resume
@author ai
@work resume.md
git commit -m "summary v1"
@work resume.md
git commit -m "v2"
@work resume.md
git commit -m "v3"
@work resume.md
git add resume.md
@author human
@cd rapport-client
@work plan.md
`;

const DEUX_IA = `
@files plan.md intro.md resume.md chiffres.xlsx chapitres/ch1.md chapitres/ch2.md
git commit -m "init"
@work plan.md
git commit -m "plan"
git switch -c feature/intro
@work intro.md
git commit -m "intro"
git switch main
@author ai
git worktree add ../rapport-ia-resume -b ia/agent-1
@cd rapport-ia-resume
@work resume.md
git commit -m "summary v1"
@work resume.md
git add resume.md
@cd rapport-client
git worktree add ../rapport-ia-chiffres -b ia/agent-2
@cd rapport-ia-chiffres
@work chiffres.xlsx
git commit -m "figures"
@work chiffres.xlsx
@author human
@cd rapport-client
`;

const TEAM = `
@files plan.md intro.md resume.md
git commit -m "init"
@work plan.md
git commit -m "plan"
@remote upstream
@fork upstream origin
@author ai
git switch -c ia/graphiques
@files graphiques/ventes.svg
git commit -m "chart"
@author human
git switch main
@remote origin
@online-only ia/graphiques
@mr 42 ia/graphiques -> main "Add the charts" comments=2
@colleague main "Fix the figures"
@work plan.md intro.md
git stash
`;

const FOUR = `
@files plan.md intro.md resume.md chapitres/ch1.md
git commit -m "init"
@work plan.md
git commit -m "plan"
git branch old/idea
git worktree add ../rapport-ia-a -b ia/a
git worktree add ../rapport-ia-b -b ia/b
git worktree add ../rapport-ia-c -b ia/c
@cd rapport-ia-a
@work resume.md
git commit -m "a1"
@cd rapport-ia-b
@work intro.md
git commit -m "b1"
@work intro.md
git commit -m "b2"
@cd rapport-ia-c
@work chapitres/ch1.md
git commit -m "c1"
@cd rapport-client
@work intro.md
git commit -m "intro"
git merge ia/a
git branch fix/typo
@new notes.md
`;

const CONFLICT = `
@files plan.md intro.md
git commit -m "init"
git switch -c ia/plan
@work plan.md
git commit -m "AI plan"
git switch main
@work plan.md
git commit -m "my plan"
git merge ia/plan
`;

function setup(text, repos = ['local']) {
  const r = runSetup(text, { repos });
  if (r.error) console.error('setup error', r.error, r.line, r.text);
  return r.state;
}

const STATES = {
  mission3: () => ({ state: setup(MISSION3), opts: { lockedRepos: { origin: 5 }, note: 'One desk = one real folder on your computer' } }), // i18n-ok (dev)
  mission3preview: () => {
    const s = setup(MISSION3);
    const p = apply(s, 'git worktree add ../rapport-ia-chiffres -b ia/chiffres').state;
    return { state: s, opts: { lockedRepos: { origin: 5 }, previewState: p } };
  },
  sandbox: () => ({ state: setup(DEUX_IA) }),
  team: () => ({ state: setup(TEAM, ['local', 'origin', 'upstream']) }),
  teamMr: () => ({ state: setup(TEAM, ['local', 'origin']) }),
  four: () => ({ state: setup(FOUR) }),
  conflict: () => ({ state: setup(CONFLICT) }),
  goal: () => {
    const s = setup(MISSION3);
    const g = apply(s, 'git merge ia/resume').state;
    return { state: s, opts: { goalState: g } };
  },
};

const params = new URLSearchParams(location.search);
const lang = params.get('lang') || getLang();
await load(lang);
await setLang(lang);

const stage = document.getElementById('stage');
const bar = document.getElementById('bar');
const log = document.getElementById('log');
let scene = null;
let state = null;

function onAction(a) {
  log.textContent = JSON.stringify({ ...a, anchor: undefined });
  let cmd = null;
  if (a.type === 'click') cmd = { name: 'click', args: [a.desk, a.path] };
  else if (a.type === 'create') cmd = { name: 'create', args: a.dir ? [a.desk, a.dir] : [a.desk] };
  else if (a.type === 'cd') cmd = { name: 'cd', args: [state.worktrees.find((w) => w.id === a.desk).path] };
  else if (a.type === 'unstage') cmd = `git restore --staged ${a.path}`;
  else if (a.type === 'ai-work') cmd = { name: 'ai', args: [a.desk] };
  else if (a.type === 'mr') cmd = { name: 'mr', args: ['approve', a.id] };
  if (!cmd) return;
  const r = apply(state, cmd);
  if (r.error) {
    log.textContent += `  -> ${r.error.key}`;
    scene.shake();
    return;
  }
  state = r.state;
  scene.update(state, r.events);
}

function show(name) {
  const { state: s, opts = {} } = STATES[name]();
  state = s;
  if (scene) scene.destroy();
  scene = renderScene(stage, state, { ...opts, onAction });
  window.__scene = scene;
  for (const b of bar.querySelectorAll('button[data-s]')) b.setAttribute('aria-pressed', String(b.dataset.s === name));
}

for (const name of Object.keys(STATES)) {
  const b = document.createElement('button');
  b.dataset.s = name;
  b.textContent = name;
  b.onclick = () => show(name);
  bar.appendChild(b);
}
for (const l of ['fr', 'en']) {
  const b = document.createElement('button');
  b.textContent = l.toUpperCase();
  b.onclick = () => setLang(l);
  bar.appendChild(b);
}
show(params.get('s') || 'mission3');
