// Comparison screen of a `mode: compare` mission file (docs/AUTHORING.md §4.5, mockup A7): one column per replayed
// part (step titles and commands come from that part, the desk state of each step from `desk:`), then text boxes.
import { t, getLang } from '../i18n/i18n.js';
import { buildHash } from '../router.js';
import { renderInline } from '../content/markdown.js';
import { stepCommandText } from './mission-steps.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Tone of a desk chip (colour family): pure. */
export function deskTone(value) {
  if (value === 'intact') return 'ok';
  if (value === 'restored') return 'back';
  return 'bad';
}

/**
 * Model of the screen (pure): columns with rows { n, title, command, desk, tone }.
 * `replayed` maps a mission id to its parsed mission.
 */
export function compareModel(data, replayed) {
  const columns = (data.columns || []).map((col, ci) => {
    const m = col.replays ? replayed[col.replays.mission] : null;
    const part = m ? m.parts.find((p) => p.letter === col.replays.part) : null;
    const rows = part ? part.steps.map((s, i) => ({
      n: i + 1, title: s.title, command: stepCommandText(s), desk: col.desk[i] || null, tone: deskTone(col.desk[i]),
    })) : [];
    return {
      title: col.title, index: ci, rows,
      replay: col.replays ? buildHash({ name: 'mission', id: col.replays.mission, part: col.replays.part, step: 1 }) : null,
    };
  });
  return { columns, boxes: data.boxes || [], text: data.text || [] };
}

export function mountCompare(wrap, { file, ids, numbering, id, ctx }) {
  const data = file.data;
  let alive = true;
  const missionIds = [...new Set((data.columns || []).map((c) => c.replays && c.replays.mission).filter(Boolean))];

  function render(replayed) {
    const model = compareModel(data, replayed);
    const first = missionIds[0];
    const n = first ? numbering.numbers[first] : null;
    const eyebrow = n ? t('missionScreen.eyebrowCompare', { n, total: numbering.total }) : '';
    const badge = file.fallback ? ` <span class="chip chip--small badge-fallback" title="${esc(t('home.fallbackNote'))}">${esc(t('lang.fr'))}</span>` : '';
    const cols = model.columns.map((c) => {
      const rows = c.rows.map((r) =>
        `<li class="compare-row"><span class="compare-n mono" aria-hidden="true">${r.n}</span>` +
        `<span class="compare-step"><b>${esc(r.title)}</b><code>${esc(r.command)}</code></span>` +
        (r.desk ? `<span class="compare-chip is-${r.tone}">${esc(t(`compare.desk.${r.desk}`))}</span>` : '') +
        `</li>`).join('');
      return `<section class="card compare-col compare-col--${c.index}">` +
        `<div class="compare-col-head"><span class="compare-dot" aria-hidden="true"></span><h2 class="compare-col-title">${esc(c.title)}</h2>` +
        (c.replay ? `<a class="compare-replay" href="${esc(c.replay)}">${esc(t('missionScreen.replay'))}</a>` : '') +
        `</div><ol class="compare-rows">${rows}</ol></section>`;
    }).join('');
    const boxes = model.boxes.map((b, i) => {
      const blocks = b.blocks.map((x) => (x.type === 'code' ? `<p class="compare-code mono">${esc(x.text)}</p>` : `<p>${renderInline(x.text)}</p>`)).join('');
      return `<section class="card compare-box compare-box--${i}"><h3 class="eyebrow">${esc(b.title)}</h3>${blocks}</section>`;
    }).join('');
    const i = ids.indexOf(id);
    const after = ids.slice(i + 1)[0];
    const next = after
      ? `<a class="btn btn--dark btn--small" href="${esc(buildHash({ name: 'mission', id: after }))}" data-next="mission">${esc(t('missionScreen.next.mission'))}</a>`
      : '';
    wrap.innerHTML =
      `<div class="compare-screen">` +
      `<header class="compare-head"><div><div class="eyebrow">★ ${esc(eyebrow)}${badge}</div>` +
      `<h1 class="compare-title">${esc((data.front && data.front.title) || id)}</h1></div>` +
      `<div class="compare-lead secondary">${model.text.map((p) => `<p>${renderInline(p)}</p>`).join('')}</div></header>` +
      `<div class="compare-cols">${cols}</div>` +
      `<div class="compare-boxes">${boxes}</div>` +
      `<div class="compare-actions">${next}<a class="btn btn--ghost btn--small" href="#/">${esc(t('missionScreen.backHome'))}</a></div>` +
      `</div>`;
  }

  const lang = getLang();
  Promise.all(missionIds.map((m) => ctx.loader.loadMission(m, lang).then((f) => [m, f.data]).catch(() => [m, null])))
    .then((pairs) => {
      if (!alive) return;
      const replayed = {};
      for (const [m, d] of pairs) if (d) replayed[m] = d;
      render(replayed);
      ctx.progress.markMissionDone(id);
    });
  render({});
  return () => { alive = false; };
}
