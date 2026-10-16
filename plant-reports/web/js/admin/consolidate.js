import { h, toast, debounce, fmtDate } from '../util.js';
import { api, getConfig } from '../api.js';
import { renderSlide, lazyThumb } from '../slide/render.js';
import { buildDeck, deckItems } from './deck.js';
import { present } from '../present/present.js';
import { exportPdf } from '../present/print.js';

export async function consolidatePage(root, cycleId) {
  const [cfg, { cycle, reports }, { layer }] = await Promise.all([getConfig(true), api(`/api/report?cycle=${cycleId}`), api(`/api/consolidation?cycle=${cycleId}`)]);
  let state = { order: layer.order || [], hidden: layer.hidden || [] };
  let entries = buildDeck({ cycle, cfg, reports, layer: state });
  let showHidden = true, drag = null;

  let pending = false;
  const persist = debounce(async () => {
    pending = false;
    try { await api(`/api/consolidation?cycle=${cycleId}`, { method: 'PUT', body: state }); stat.textContent = 'Cambios guardados ✓'; } catch (e) { stat.textContent = 'No se pudo guardar'; toast(e.message, 'bad'); }
  }, 800);
  const stat = h('span', { class: 'muted' });
  const grid = h('div', { class: 'deck-grid' });
  const warn = h('div', { class: 'banner warnb', hidden: true });
  const count = h('b');

  function sync() {
    state = { order: entries.map((e) => e.key), hidden: entries.filter((e) => e.hidden).map((e) => e.key) };
    stat.textContent = 'Guardando…'; pending = true; persist();
  }
  function warnings() {
    const w = [];
    for (const p of cfg.plants.filter((x) => x.active).sort((a, b) => a.order - b.order)) {
      const r = reports[p.id];
      if (!r || !r.slides?.length) w.push(`${p.name}: sin informe`);
      else if (r.status !== 'enviado') w.push(`${p.name}: en borrador (no enviado)`);
    }
    warn.hidden = !w.length;
    warn.textContent = w.length ? '⚠ Plantas pendientes: ' + w.join(' · ') : '';
  }
  function draw() {
    grid.innerHTML = '';
    const vis = entries.filter((e) => !e.hidden);
    count.textContent = `${vis.length} diapositivas visibles de ${entries.length}`;
    entries.forEach((e) => {
      if (e.hidden && !showHidden) return;
      const page = vis.indexOf(e) + 1;
      const ctx = { cycleLabel: cycle.label, plantName: e.plant?.shortName, sectionName: e.sectionName, page: page || '', total: vis.length, lazy: true };
      grid.append(h('div', {
        class: 'dk' + (e.hidden ? ' hid' : ''), draggable: 'true',
        ondragstart: (ev) => { drag = e.key; ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', ''); },
        ondragend: () => { drag = null; },
        ondragover: (ev) => { if (drag && drag !== e.key) { ev.preventDefault(); ev.currentTarget.classList.add('over'); } },
        ondragleave: (ev) => ev.currentTarget.classList.remove('over'),
        ondrop: (ev) => {
          ev.preventDefault();
          const from = entries.findIndex((x) => x.key === drag);
          if (from < 0) return;
          const [m] = entries.splice(from, 1);
          entries.splice(entries.findIndex((x) => x.key === e.key), 0, m);
          sync(); draw();
        },
      }, lazyThumb(236, () => renderSlide(e.slide, ctx)),
      h('div', { class: 'dk-l' }, h('span', { class: 'dk-n' }, page || '—'), h('span', { class: 'dk-t' }, e.label, e.editedByAdmin && h('em', {}, ' · editado por admin')),
        h('button', { class: 'ib', title: e.hidden ? 'Mostrar en el consolidado' : 'Ocultar del consolidado', onclick: () => { e.hidden = !e.hidden; sync(); draw(); } }, e.hidden ? '🚫' : '👁'),
        e.plantId && h('a', { class: 'ib', title: 'Editar en el informe de la planta (queda marcado "editado por admin")', href: `#/edit/${cycleId}/${e.plantId}` }, '✎'))));
    });
  }
  const items = () => deckItems(entries, cycle);

  root.append(h('div', { class: 'cons' },
    h('div', { class: 'ed-top' },
      h('a', { class: 'btn small', href: '#/admin' }, '← Tablero'),
      h('div', { class: 'ed-title' }, h('b', {}, 'Consolidado'), ` · ${cycle.label}`, ' ', h('span', { class: 'chip ' + cycle.status }, cycle.status)),
      stat, h('span', { class: 'grow' }), count,
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { showHidden = e.target.checked; draw(); } }), ' Mostrar ocultas'),
      h('button', { class: 'btn small', onclick: () => { if (confirm('¿Restablecer el orden y mostrar todas las diapositivas?')) { state = { order: [], hidden: [] }; entries = buildDeck({ cycle, cfg, reports, layer: state }); sync(); draw(); } } }, 'Restablecer'),
      h('button', { class: 'btn small', onclick: () => items().length && present(items()) }, '▶ Presentar'),
      h('button', { class: 'btn small primary', onclick: () => exportPdf(items(), `SOP-Consolidado-${cycle.label.replace(/\W+/g, '-')}`) }, '⬇ Exportar PDF')),
    warn,
    h('p', { class: 'hint pad' }, 'Arrastrá las tarjetas para reordenar. El ojo oculta una diapositiva sólo del consolidado (el informe de la planta no se toca). La portada, la agenda de cada planta, el Back Up y el cierre se generan solos.'),
    grid));
  warnings(); draw();
  return () => { if (pending) persist.flush(); };
}

/** Consolidado archivado de un mes cerrado: copia congelada, sólo lectura. */
export async function archivedDeckPage(root, cycleId) {
  const snap = await api(`/api/archive?cycle=${cycleId}&consolidated=1`);
  const cycle = snap.cycle;
  const entries = snap.entries.map((e) => ({ ...e, hidden: false }));
  const items = () => deckItems(entries, cycle);
  const grid = h('div', { class: 'deck-grid' });
  entries.forEach((e, i) => {
    const ctx = { cycleLabel: cycle.label, plantName: e.plant?.shortName, sectionName: e.sectionName, page: i + 1, total: entries.length, lazy: true };
    grid.append(h('div', { class: 'dk', draggable: 'false', style: 'cursor:default' }, lazyThumb(236, () => renderSlide(e.slide, ctx)),
      h('div', { class: 'dk-l' }, h('span', { class: 'dk-n' }, i + 1), h('span', { class: 'dk-t' }, e.label, e.editedByAdmin && h('em', {}, ' · editado por admin')))));
  });
  root.append(h('div', { class: 'cons' },
    h('div', { class: 'ed-top' },
      h('a', { class: 'btn small', href: '#/admin/archive' }, '← Archivo'),
      h('div', { class: 'ed-title' }, h('b', {}, 'Consolidado archivado'), ` · ${cycle.label}`, ' ', h('span', { class: 'chip cerrado' }, 'congelado')),
      h('span', { class: 'grow' }), h('b', {}, `${entries.length} diapositivas`),
      h('button', { class: 'btn small', onclick: () => present(items()) }, '▶ Presentar'),
      h('button', { class: 'btn small primary', onclick: () => exportPdf(items(), `SOP-Consolidado-${cycle.label.replace(/\W+/g, '-')}`) }, '⬇ Exportar PDF')),
    h('div', { class: 'banner' }, `Copia congelada al cierre del ciclo (${fmtDate(snap.closedAt)}, por ${snap.closedBy}). No cambia aunque después se edite algún informe.`),
    grid));
}
