// Home: three mode cards (Mission, Puzzle, Sandbox), Resume banner, mission list, puzzle list.
// Nothing is locked (ADR 0010). Titles come from content through the loader (French fallback badge).
import { t, getLang } from '../i18n/i18n.js';
import { icon } from './icons.js';
import { buildHash, parseHash } from '../router.js';
import { MAX_STARS } from '../progress.js';

const MODES = [
  { name: 'mission', icon: 'book-open' },
  { name: 'puzzle', icon: 'lightbulb' },
  { name: 'sandbox', icon: 'git-branch', priority: true },
];

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
const svg = (html) => {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content.firstChild;
};

/** Next mission to play: first not completed (recommended order), else the first one. Pure. */
export function nextId(ids, isDone) {
  return ids.find((id) => !isDone(id)) ?? ids[0];
}

/** Titles of every mission and puzzle for the current language. Missing files are simply absent. */
async function loadTitles(loader, summary, lang) {
  const titles = { mission: {}, puzzle: {} };
  const jobs = [
    ...summary.missions.map((m) => ['mission', m.id, loader.loadMission(m.id, lang)]),
    ...summary.puzzles.map((p) => ['puzzle', p.id, loader.loadPuzzle(p.id, lang)]),
  ];
  const settled = await Promise.allSettled(jobs.map((j) => j[2]));
  settled.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const [kind, id] = jobs[i];
    const front = r.value.data?.front || {};
    titles[kind][id] = { title: front.title || id, duration: front.duration, fallback: r.value.fallback };
  });
  return titles;
}

function fallbackBadge() {
  return el('span', { class: 'chip chip--small badge-fallback', title: t('home.fallbackNote') }, [t('lang.fr')]);
}

function resumeCard(last, titles) {
  const route = parseHash(last);
  if (route.name === 'home') return null;
  let label;
  if (route.name === 'sandbox') label = t('home.resume.sandbox');
  else {
    const title = titles[route.name]?.[route.id]?.title;
    label = t(`home.resume.${route.name}`, { title: title || route.id });
  }
  return el('a', { class: 'home-resume card card--linen', href: buildHash(route) }, [
    el('div', {}, [el('p', { class: 'eyebrow' }, [t('home.resume.title')]), el('p', { class: 'home-resume-label' }, [label])]),
    el('span', { class: 'btn btn--dark' }, [t('home.resume.cta'), svg(icon('chevron-right', { size: 16 }))]),
  ]);
}

function modeCards({ summary, progress, titles }) {
  const nextMission = nextId(summary.missions.map((m) => m.id), (id) => progress.isMissionDone(id));
  const nextPuzzle = summary.puzzles.find((p) => !progress.getStars(p.id))?.id ?? summary.puzzles[0]?.id;
  const target = {
    mission: nextMission ? buildHash({ name: 'mission', id: nextMission }) : '#/',
    puzzle: nextPuzzle ? buildHash({ name: 'puzzle', id: nextPuzzle }) : '#/',
    sandbox: buildHash({ name: 'sandbox' }),
  };
  const count = { mission: summary.missions.length, puzzle: summary.puzzles.length };
  return el('div', { class: 'home-cards' }, MODES.map((m) => el('a', {
    class: `home-card home-card--${m.name}${m.priority ? ' is-priority' : ''}`, href: target[m.name],
  }, [
    svg(icon(m.icon, { size: 40 })),
    el('h2', {}, [t(`nav.${m.name}`)]),
    el('p', {}, [t(`home.${m.name}.text`)]),
    el('p', { class: 'eyebrow' }, [t(`home.${m.name}.meta`, { n: count[m.name] ?? 0 })]),
    el('span', { class: 'btn btn--dark home-card-cta' }, [t(`home.${m.name}.cta`), svg(icon('chevron-right', { size: 16 }))]),
  ])));
}

function missionList({ summary, progress, titles }) {
  const ids = summary.missions.map((m) => m.id);
  const next = nextId(ids, (id) => progress.isMissionDone(id));
  const items = summary.missions.map((m, i) => {
    const info = titles.mission[m.id];
    const done = progress.isMissionDone(m.id);
    const row = el('a', { class: `home-row${done ? ' is-done' : ''}`, href: buildHash({ name: 'mission', id: m.id }) }, [
      el('span', { class: 'home-row-n mono' }, [String(i + 1)]),
      el('span', { class: 'home-row-title' }, [info?.title || m.id]),
    ]);
    if (info?.fallback) row.appendChild(fallbackBadge());
    if (info?.duration) row.appendChild(el('span', { class: 'secondary small' }, [t('home.mission.duration', { n: info.duration })]));
    if (done) row.appendChild(el('span', { class: 'home-row-done' }, [svg(icon('badge-check', { size: 18, label: t('home.mission.done') }))]));
    else if (m.id === next) row.appendChild(el('span', { class: 'chip chip--small is-on' }, [t('home.mission.next')]));
    return el('li', {}, [row]);
  });
  return el('section', { class: 'home-section', 'aria-labelledby': 'home-missions' }, [
    el('h3', { id: 'home-missions' }, [t('home.missions.title')]),
    el('p', { class: 'secondary small' }, [t('home.missions.hint')]),
    el('ol', { class: 'home-list', role: 'list' }, items),
  ]);
}

function puzzleList({ summary, progress, titles }) {
  const items = summary.puzzles.map((p, i) => {
    const info = titles.puzzle[p.id];
    const stars = progress.getStars(p.id);
    const starNodes = Array.from({ length: MAX_STARS }, (_, k) => {
      const s = svg(icon('star', { size: 16 }));
      if (k < stars) s.classList.add('is-on');
      return s;
    });
    const row = el('a', { class: 'home-row', href: buildHash({ name: 'puzzle', id: p.id }) }, [
      el('span', { class: 'home-row-n mono' }, [String(i + 1)]),
      el('span', { class: 'home-row-title' }, [info?.title || p.id]),
    ]);
    if (info?.fallback) row.appendChild(fallbackBadge());
    row.appendChild(el('span', { class: 'home-stars', role: 'img', 'aria-label': stars ? t('home.puzzle.stars', { n: stars, max: MAX_STARS }) : t('home.puzzle.todo') }, starNodes));
    return el('li', {}, [row]);
  });
  return el('section', { class: 'home-section', 'aria-labelledby': 'home-puzzles' }, [
    el('h3', { id: 'home-puzzles' }, [t('home.puzzles.title')]),
    el('p', { class: 'secondary small' }, [t('home.puzzles.hint')]),
    el('ol', { class: 'home-list home-list--cols', role: 'list' }, items),
  ]);
}

/** Screen: mount(container, { ctx: { loader, summary, progress } }) -> unmount. */
export function mountHome(container, { ctx }) {
  const { loader, summary, progress } = ctx;
  let alive = true;
  const page = el('div', { class: 'home' });
  container.replaceChildren(page);

  function render(titles) {
    const data = { summary, progress, titles };
    const last = progress.getLast();
    const resume = progress.hasProgress() && last ? resumeCard(last, titles) : null;
    page.replaceChildren(
      el('section', { class: 'home-hero' }, [
        el('p', { class: 'eyebrow' }, [t('home.eyebrow')]),
        el('h1', {}, [t('home.title'), ' ', el('em', {}, [t('home.titleEm')])]),
        el('p', { class: 'home-intro' }, [t('home.intro')]),
      ]),
      ...(resume ? [el('div', { class: 'home-resume-wrap' }, [resume])] : []),
      modeCards(data),
      el('div', { class: 'home-lists' }, [missionList(data), puzzleList(data)]),
    );
  }

  render({ mission: {}, puzzle: {} });
  loadTitles(loader, summary, getLang()).then((titles) => { if (alive) render(titles); });
  return () => { alive = false; };
}
