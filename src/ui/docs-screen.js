// Docs screen: the list of command cards (#/docs) and one card (#/docs/<id>), opened in its own tab.
// Cards are Markdown files in content/docs/ (docs/AUTHORING.md §9); groups and official links in
// src/content/docs-topics.js.
import { t, getLang } from '../i18n/i18n.js';
import { icon } from './icons.js';
import { registerScreen } from '../router.js';
import { renderMarkdown } from '../content/markdown.js';
import { DOC_GROUPS, DOC_TOPICS, officialUrl, docHash } from '../content/docs-topics.js';

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

/** Every card of the language, as { id: data | null }. */
async function loadAll(loader, lang) {
  const entries = await Promise.all(DOC_TOPICS.map(async (id) => {
    try {
      return [id, (await loader.loadDoc(id, lang)).data];
    } catch (e) {
      console.error(e);
      return [id, null];
    }
  }));
  return Object.fromEntries(entries);
}

function nav(cards, current) {
  return el('nav', { class: 'docs-nav panel', 'aria-label': t('docs.nav') }, [
    el('a', { class: 'docs-nav-home', href: docHash(), 'aria-current': current ? false : 'page' }, [t('docs.all')]),
    ...DOC_GROUPS.map((g) => el('div', { class: 'docs-nav-group' }, [
      el('p', { class: 'eyebrow' }, [t(g.label)]),
      el('ul', {}, g.topics.filter((id) => cards[id]).map((id) => el('li', {}, [
        el('a', { href: docHash(id), 'aria-current': id === current ? 'page' : false }, [cards[id].title]),
      ]))),
    ])),
  ]);
}

function listView(cards) {
  const head = el('header', { class: 'docs-head' }, [
    el('p', { class: 'eyebrow' }, [t('docs.eyebrow')]),
    el('h1', {}, [t('docs.title')]),
    el('p', { class: 'docs-lead' }, [t('docs.intro')]),
  ]);
  const groups = DOC_GROUPS.map((g) => el('section', { class: 'docs-group' }, [
    el('h2', { class: 'eyebrow' }, [t(g.label)]),
    el('ul', { class: 'docs-cards' }, g.topics.filter((id) => cards[id]).map((id) => el('li', {}, [
      el('a', { class: 'docs-card', href: docHash(id) }, [
        el('code', { class: 'docs-card-title' }, [cards[id].title]),
        el('span', { class: 'docs-card-summary' }, [cards[id].summary]),
      ]),
    ]))),
  ]));
  return el('article', { class: 'docs-main' }, [head, ...groups]);
}

function cardView(id, card, cards, lang) {
  const sections = card.sections.map((s) => {
    const body = el('div', { class: 'docs-body' });
    body.innerHTML = renderMarkdown(s.body);
    return el('section', { class: `docs-section docs-section--${s.key}` }, [el('h2', {}, [t(`docs.section.${s.key}`)]), body]);
  });
  const see = card.see.filter((x) => cards[x]);
  const url = officialUrl(id, lang);
  const foot = el('footer', { class: 'docs-foot' }, [
    see.length ? el('p', { class: 'docs-see' }, [
      el('span', { class: 'secondary' }, [t('docs.see')]),
      ...see.map((x) => el('a', { class: 'chip', href: docHash(x) }, [cards[x].title])),
    ]) : '',
    url ? el('p', { class: 'docs-official' }, [
      el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, [svg(icon('external-link', { size: 15 })), t('docs.official')]),
      el('span', { class: 'secondary small' }, [t('docs.officialNote')]),
    ]) : '',
  ]);
  return el('article', { class: 'docs-main' }, [
    el('header', { class: 'docs-head' }, [
      el('p', { class: 'eyebrow' }, [t('docs.eyebrow')]),
      el('h1', { class: 'docs-title' }, [card.title]),
      el('p', { class: 'docs-lead' }, [card.summary]),
      el('p', { class: 'docs-syntax' }, [el('code', {}, [card.syntax])]),
    ]),
    ...sections,
    foot,
  ]);
}

export function mountDocs(container, { id, ctx }) {
  const wrap = el('div', { class: 'docs-screen' }, [el('p', { class: 'docs-loading secondary' }, [t('docs.loading')])]);
  container.append(wrap);
  let alive = true;
  const lang = getLang();
  loadAll(ctx.loader, lang).then((cards) => {
    if (!alive) return;
    const current = id && cards[id] ? id : null;
    if (id && !current) {
      wrap.replaceChildren(nav(cards, null), el('article', { class: 'docs-main' }, [
        el('p', {}, [t('docs.missing', { name: id })]),
        el('a', { href: docHash() }, [t('docs.all')]),
      ]));
      return;
    }
    wrap.replaceChildren(nav(cards, current), current ? cardView(current, cards[current], cards, lang) : listView(cards));
    document.title = `${current ? cards[current].title : t('docs.title')} · ${t('app.name')}`;
  });
  return () => { alive = false; };
}

registerScreen('docs', mountDocs);
