// Boot guard: replaces the blank page with an explanation when the game cannot start.
// A classic script (not a module), loaded before src/main.js, so it still runs when the modules are
// blocked (file://, company proxy, old browser, extension). Strings: src/i18n/boot-strings.js.
//
// The panel shows when: the page is opened from file://; the browser has no module support; a game
// script fails to load or throws while loading; main.js reports a start error (comegitmixBoot.fail);
// or main.js has not reported success (comegitmixBoot.ready) after the timeout. ready() removes it.
(function () {
  var TIMEOUT_MS = window.COMEGITMIX_BOOT_TIMEOUT || 15000;
  var STORAGE_KEY = 'comegitmix:v1';
  var REASONS = ['file', 'network', 'oldBrowser', 'extension'];
  // detected cause -> reason shown first as "likely"
  var LIKELY = { file: 'file', noModules: 'oldBrowser', scriptBlocked: 'network', scriptError: 'oldBrowser', startFailed: 'network', timeout: 'network' };

  var base = new URL('.', location.href).href;
  var done = false;
  var failure = null;
  var panel = null;
  var lang = detectLang();
  var timer = null;

  function detectLang() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').lang;
      if (stored === 'fr' || stored === 'en') return stored;
    } catch (e) { /* storage unavailable */ }
    return String(navigator.language || '').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function t(key, vars) {
    var all = window.COMEGITMIX_BOOT_STRINGS || {};
    var s = (all[lang] && all[lang][key]) || (all.fr && all.fr[key]) || key;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; });
  }

  function shortPath(url) {
    return url && url.indexOf(base) === 0 ? url.slice(base.length) : url || '';
  }

  /** Same-origin resources that answered with an error status (where the browser reports it). */
  function failedFiles() {
    try {
      return performance.getEntriesByType('resource')
        .filter(function (e) { return e.responseStatus >= 400 && e.name.indexOf(base) === 0; })
        .map(function (e) { return shortPath(e.name) + ' (' + e.responseStatus + ')'; });
    } catch (e) {
      return [];
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    var f = failure;
    var likely = LIKELY[f.cause];
    var order = [likely].concat(REASONS.filter(function (r) { return r !== likely; }));
    var wrap = el('section', 'boot-error');
    wrap.setAttribute('role', 'alert');
    wrap.lang = lang;

    var top = el('div', 'boot-error-top');
    top.append(el('p', 'eyebrow', t('eyebrow')));
    var other = el('button', 'btn btn--ghost btn--small', t('other'));
    other.type = 'button';
    other.addEventListener('click', function () { lang = lang === 'fr' ? 'en' : 'fr'; show(); });
    top.append(other);
    wrap.append(top, el('h1', null, t('title')), el('p', 'boot-error-intro', t('intro')));

    var list = el('ol', 'boot-error-reasons');
    order.forEach(function (r, i) {
      var li = el('li', 'card' + (i === 0 ? ' boot-error-likely' : ''));
      if (i === 0) li.append(el('p', 'eyebrow', t('likely')));
      li.append(el('h2', null, t('reason.' + r + '.title')), el('p', null, t('reason.' + r + '.text')));
      list.append(li);
    });
    wrap.append(list);

    var reload = el('button', 'btn btn--dark', t('reload'));
    reload.type = 'button';
    reload.addEventListener('click', function () { location.reload(); });
    wrap.append(reload);

    var details = el('details', 'boot-error-details');
    details.append(el('summary', null, t('details')));
    var rows = [
      ['details.cause', t('cause.' + f.cause, { seconds: Math.round(TIMEOUT_MS / 1000) })],
      ['details.file', f.file],
      ['details.message', f.message],
      ['details.failed', failedFiles().join(', ')],
      ['details.address', location.href],
      ['details.browser', navigator.userAgent],
    ];
    var dl = el('dl');
    rows.forEach(function (r) {
      if (!r[1]) return;
      dl.append(el('dt', null, t(r[0])), el('dd', 'mono', r[1]));
    });
    details.append(dl);
    wrap.append(details);
    return wrap;
  }

  function show() {
    var next = render();
    if (panel && panel.parentNode) panel.parentNode.replaceChild(next, panel);
    else document.body.insertBefore(next, document.body.firstChild);
    panel = next;
    var app = document.getElementById('app');
    if (app) app.hidden = true;
  }

  function fail(cause, file, message) {
    if (done || failure) return; // keep the first cause: it is the real one
    failure = { cause: cause, file: shortPath(file), message: message || '' };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  }

  function onError(ev) {
    if (done) return;
    var target = ev.target;
    if (target && target.tagName === 'SCRIPT') {
      if (target.src && target.src.indexOf(base) === 0) fail('scriptBlocked', target.src, '');
      return;
    }
    // an exception thrown while a game file loads (e.g. syntax the browser does not know)
    if (ev.filename && ev.filename.indexOf(base) === 0) fail('scriptError', ev.filename, ev.message);
  }

  window.comegitmixBoot = {
    /** The game is on screen: drop the guard (and the panel, if a slow start had shown it). */
    ready: function () {
      done = true;
      clearTimeout(timer);
      window.removeEventListener('error', onError, true);
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      var app = document.getElementById('app');
      if (app) app.hidden = false;
    },
    /** The start sequence threw. */
    fail: function (err) {
      fail('startFailed', '', String(err && err.message ? err.message : err));
    },
  };

  if (location.protocol === 'file:') return fail('file', '', '');
  if (!('noModule' in document.createElement('script'))) return fail('noModules', '', '');
  window.addEventListener('error', onError, true); // capture: script load errors do not bubble
  timer = setTimeout(function () { fail('timeout', '', ''); }, TIMEOUT_MS);
})();
