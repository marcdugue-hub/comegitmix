// Hash router. Routes: #/  #/mission/<id>?part=B&step=3  #/puzzle/<id>  #/sandbox?start=<id>  #/docs  #/docs/<id>
// Screens plug in with registerScreen(name, mount); mount(container, params) returns an unmount function.
// params = { name, id, part, step, start, ctx }  (ctx = shared context set by main.js: { loader, summary, progress }).
// An unknown route goes to the home. The language is not a route: a language change calls refresh().

export const SCREENS = ['home', 'mission', 'puzzle', 'sandbox', 'docs'];
const ID = /^[a-z0-9][a-z0-9-]*$/;

/** "#/mission/03-x?part=B&step=2" -> { name, id?, part?, step?, start? }; anything unknown -> { name: 'home' }. */
export function parseHash(hash = '') {
  const text = String(hash).replace(/^#/, '');
  const [pathRaw, queryRaw = ''] = text.split('?');
  const segments = pathRaw.split('/').filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const query = new URLSearchParams(queryRaw);
  const [name, id, ...rest] = segments;
  if ((name === 'mission' || name === 'puzzle') && id && ID.test(id) && rest.length === 0) {
    const route = { name, id };
    if (name === 'mission') {
      const part = (query.get('part') || '').toUpperCase();
      if (/^[A-Z]$/.test(part)) route.part = part;
      const step = Number(query.get('step'));
      if (Number.isInteger(step) && step >= 1 && /^\d+$/.test(query.get('step'))) route.step = step;
    }
    return route;
  }
  if (name === 'docs' && rest.length === 0) {
    if (!id) return { name };
    if (ID.test(id)) return { name, id };
  }
  if (name === 'sandbox' && !id) {
    const start = query.get('start');
    return start && ID.test(start) ? { name, start } : { name };
  }
  return { name: 'home' };
}

/** Inverse of parseHash. */
export function buildHash(route = { name: 'home' }) {
  const { name, id, part, step, start } = route;
  if (name === 'mission' && id) {
    const q = new URLSearchParams();
    if (part) q.set('part', part);
    if (step) q.set('step', String(step));
    const qs = q.toString();
    return `#/mission/${id}${qs ? `?${qs}` : ''}`;
  }
  if (name === 'puzzle' && id) return `#/puzzle/${id}`;
  if (name === 'docs') return id ? `#/docs/${id}` : '#/docs';
  if (name === 'sandbox') return start ? `#/sandbox?start=${encodeURIComponent(start)}` : '#/sandbox';
  return '#/';
}

/**
 * createRouter({ win }) -> {
 *   registerScreen(name, mount), hasScreen(name), setContext(ctx),
 *   start(container), stop(), navigate(route | hash)   // pushes history, mounts
 *   replace(route | hash)                              // updates the URL silently, no re-mount (e.g. current step)
 *   refresh()                                          // unmount + mount the current screen again (language change)
 *   current(), onRoute(listener(route, hash)) -> unsubscribe
 * }
 * `win` is the window-like object (location, history, addEventListener), injectable for tests.
 */
export function createRouter({ win = globalThis.window } = {}) {
  const screens = new Map();
  const listeners = new Set();
  let container = null;
  let unmount = null;
  let route = { name: 'home' };
  let ctx = {};
  let started = false;

  const toHash = (r) => (typeof r === 'string' ? r : buildHash(r));

  function mountCurrent() {
    if (typeof unmount === 'function') {
      try { unmount(); } catch (e) { console.error(e); }
    }
    unmount = null;
    if (!container) return;
    container.replaceChildren?.();
    const mount = screens.get(route.name) || screens.get('home');
    if (mount) unmount = mount(container, { ...route, ctx }) || null;
  }

  function sync() {
    const hash = win.location.hash;
    route = parseHash(hash);
    const canonical = buildHash(route);
    if (route.name === 'home' && hash && hash !== '#/' && hash !== '#') win.history.replaceState(null, '', canonical);
    mountCurrent();
    for (const cb of [...listeners]) cb(route, canonical);
  }

  return {
    registerScreen(name, mount) {
      if (!SCREENS.includes(name)) throw new Error(`unknown screen: ${name}`);
      if (typeof mount !== 'function') throw new TypeError('mount must be a function');
      screens.set(name, mount);
    },
    hasScreen: (name) => screens.has(name),
    setContext(value) { ctx = value || {}; },
    start(el) {
      container = el;
      if (!started) { win.addEventListener('hashchange', sync); started = true; }
      sync();
    },
    stop() {
      if (started) win.removeEventListener?.('hashchange', sync);
      started = false;
      if (typeof unmount === 'function') unmount();
      unmount = null;
    },
    navigate(target) {
      const hash = toHash(target);
      if (win.location.hash === hash) { sync(); return; }
      win.location.hash = hash; // fires hashchange -> sync
    },
    replace(target) {
      const hash = toHash(target);
      route = parseHash(hash);
      win.history.replaceState(null, '', hash);
      for (const cb of [...listeners]) cb(route, buildHash(route));
    },
    refresh: mountCurrent,
    current: () => route,
    onRoute(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

// Shared instance used by the screens: import { registerScreen, navigate, replace } from './router.js'.
export const router = createRouter({ win: globalThis.window });
export const registerScreen = (...a) => router.registerScreen(...a);
export const hasScreen = (...a) => router.hasScreen(...a);
export const navigate = (...a) => router.navigate(...a);
export const replace = (...a) => router.replace(...a);
export const refresh = () => router.refresh();
export const onRoute = (...a) => router.onRoute(...a);
