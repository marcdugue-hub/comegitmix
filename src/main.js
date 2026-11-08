// Startup: i18n (browser detection) -> content summary -> shell -> router.
//
// ADD A SCREEN: create your module (it calls registerScreen('mission' | 'puzzle' | 'sandbox', mount) from
// ./router.js at import time) and add ONE import line in the "Screen modules" block below.
// mount(container, { name, id, part, step, start, ctx }) -> unmount, with ctx = { loader, summary, progress }.
import * as i18n from './i18n/i18n.js';
import { createLoader } from './content/loader.js';
import { router, registerScreen, hasScreen } from './router.js';
import { progress } from './progress.js';
import { mountShell } from './ui/shell.js';
import { mountHome, nextId } from './ui/home.js';
import { buildHash } from './router.js';

// ---- Screen modules (one line each) ----
// import './ui/sandbox-screen.js';
// import './ui/mission-screen.js';
// import './ui/puzzle-screen.js';

/** Stand-in shown until the real screen module registers itself. */
function placeholder(name) {
  return (container, params) => {
    const { t } = i18n;
    const wrap = document.createElement('div');
    wrap.className = 'screen-placeholder';
    const h1 = document.createElement('h1');
    h1.textContent = t(`nav.${name}`);
    const p = document.createElement('p');
    p.className = 'secondary';
    p.textContent = params.id ? `${params.id} · ${t('screen.placeholder')}` : t('screen.placeholder');
    wrap.append(h1, p);
    container.append(wrap);
    return null;
  };
}

async function boot() {
  const root = document.getElementById('app');
  await i18n.load(i18n.getLang());
  document.documentElement.lang = i18n.getLang();

  const loader = createLoader();
  let summary = { missions: [], puzzles: [], sandbox: [], errors: [] };
  try {
    summary = await loader.loadSummary();
  } catch (e) {
    console.error(e); // the home then shows empty lists; modes remain reachable
  }

  router.setContext({ loader, summary, progress });
  registerScreen('home', mountHome);
  for (const name of ['mission', 'puzzle', 'sandbox']) if (!hasScreen(name)) registerScreen(name, placeholder(name));

  const shell = mountShell(root, {
    router,
    tabTarget(name) {
      if (name === 'mission') {
        const id = nextId(summary.missions.map((m) => m.id), (x) => progress.isMissionDone(x));
        return id ? buildHash({ name, id }) : buildHash({ name: 'home' });
      }
      if (name === 'puzzle') {
        const id = summary.puzzles.find((p) => !progress.getStars(p.id))?.id ?? summary.puzzles[0]?.id;
        return id ? buildHash({ name, id }) : buildHash({ name: 'home' });
      }
      return buildHash({ name });
    },
  });

  router.onRoute((route, hash) => { if (route.name !== 'home') progress.setLast(hash); });
  i18n.onChange(() => { shell.update(); router.refresh(); }); // instant language switch
  router.start(shell.main);
}

boot().catch((e) => {
  console.error(e);
  const root = document.getElementById('app');
  if (root) root.textContent = String(e && e.message ? e.message : e);
});
