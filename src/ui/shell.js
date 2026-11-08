// Application shell: skip link, header (logo, name, mode tabs, FR|EN toggle), minimum-screen note, <main>.
// Hooks for other modules:
//   shell.main         the <main id="main"> element the router mounts screens into
//   shell.headerSlot   an empty element in the header (e.g. mission progress dots); emptied on every route change
//   shell.update()     re-renders the header texts, tabs targets and language toggle (after a language or progress change)
import { t, getLang, setLang, LANGS } from '../i18n/i18n.js';
import { buildHash } from '../router.js';

const TABS = ['mission', 'puzzle', 'sandbox'];

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

/** "Comegitmix" -> "Come" + <em>git</em> + "mix" (the accent follows the app name from i18n). */
function brandName(name) {
  const node = el('span', { class: 'brand-name' });
  const i = name.toLowerCase().indexOf('git');
  const accent = el('em', {}, [name.slice(i, i + 3)]);
  if (i < 0) { node.textContent = name; return node; }
  node.append(name.slice(0, i), accent, name.slice(i + 3));
  return node;
}

/**
 * mountShell(root, { router, tabTarget(name) -> route|hash }) -> { main, headerSlot, update, destroy }
 * `tabTarget` tells where a mode tab leads (e.g. the next mission to play); default is the bare route.
 */
export function mountShell(root, { router, tabTarget = (name) => buildHash({ name }) } = {}) {
  const skip = el('a', { class: 'skip-link', href: '#main' });
  const header = el('header', { class: 'app-header' });
  const note = el('p', { class: 'min-screen-note', role: 'note' });
  const main = el('main', { id: 'main', tabindex: '-1' });
  const headerSlot = el('div', { class: 'header-slot' });
  root.replaceChildren(skip, header, note, main);
  root.classList.add('app');

  skip.addEventListener('click', (e) => { // a "#main" href would be read as a route
    e.preventDefault();
    main.focus();
  });

  function renderHeader() {
    const active = router.current().name;
    const brand = el('a', { class: 'brand', href: '#/', 'aria-label': t('shell.home') }, [
      el('img', { src: 'assets/logo-petit.png', alt: t('shell.logoAlt') }),
      el('span', { class: 'brand-sep', 'aria-hidden': 'true' }),
      brandName(t('app.name')),
    ]);
    const tabs = el('nav', { class: 'tabs', 'aria-label': t('shell.nav') }, TABS.map((name) => {
      const target = tabTarget(name);
      return el('a', {
        href: typeof target === 'string' ? target : buildHash(target),
        'aria-current': active === name ? 'page' : false,
      }, [t(`nav.${name}`)]);
    }));
    const lang = getLang();
    const toggle = el('div', { class: 'lang-toggle', role: 'group', 'aria-label': t('shell.lang') }, LANGS.map((code) => {
      const b = el('button', {
        type: 'button', 'data-lang': code, lang: code,
        'aria-pressed': String(code === lang), 'aria-label': t(`lang.name.${code}`),
      }, [t(`lang.${code}`)]);
      b.addEventListener('click', async () => {
        if (code === getLang()) return;
        await setLang(code); // listeners (main.js) re-render the shell and the current screen
        header.querySelector(`[data-lang="${code}"]`)?.focus();
      });
      return b;
    }));
    header.replaceChildren(brand, tabs, el('div', { class: 'header-end' }, [headerSlot, toggle]));
    skip.textContent = t('shell.skip');
    note.textContent = t('ui.minScreen');
    document.title = t('app.name');
  }

  const offRoute = router.onRoute(() => {
    headerSlot.replaceChildren();
    renderHeader();
    window.scrollTo?.(0, 0);
  });
  renderHeader();

  return { main, headerSlot, update: renderHeader, destroy: offRoute };
}
