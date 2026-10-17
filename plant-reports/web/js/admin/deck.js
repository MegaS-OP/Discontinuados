import { esc } from '../util.js';
import { KPI_KEYS } from '../model/seed.js';
import { kpiState, fmtVal, targetOf, STATE_COLOR } from '../model/kpi.js';

const lines = (t) => esc(t).split('\n').join('<br>');

/** Construye las entradas por defecto del consolidado y aplica la capa del administrador (orden / ocultas). */
export function buildDeck({ cycle, cfg, reports, layer }) {
  const plants = cfg.plants.filter((p) => p.active).sort((a, b) => a.order - b.order);
  const secName = (id) => cfg.sections.find((s) => s.id === id)?.name;
  const entries = [];
  const gen = (key, slide, label) => entries.push({ key, slide: { blocks: [], ...slide, id: key }, label, generated: true });

  gen('cover', { kind: 'cover', title: 'Reunión de Suministro S&OP', subtitle: cycle.label }, 'Portada');

  // Resumen comparativo: 7 KPIs x plantas con semáforo contra la meta de cada planta
  const withKpi = plants.filter((p) => KPI_KEYS.some((k) => reports[p.id]?.kpis?.[k.key] !== null && reports[p.id]?.kpis?.[k.key] !== undefined));
  if (withKpi.length) {
    const c = (t, bg = '', al = 'center') => ({ h: esc(t), bg, al });
    const rows = [[c('Planta'), ...KPI_KEYS.map((k) => c(k.short))]];
    for (const p of plants) {
      const kp = reports[p.id]?.kpis || {};
      rows.push([c(p.shortName, '', 'left'), ...KPI_KEYS.map((k) => { const st = kpiState(k, kp[k.key], targetOf(p, k.key)); return c(fmtVal(kp[k.key]), st ? STATE_COLOR[st] : ''); })]);
    }
    gen('kpi-summary', { title: 'Resumen comparativo de KPIs', blocks: [
      { id: 'ks', type: 'table', x: 3, y: 14, w: 94, h: 62, content: { rows, header: true, fs: 20, colW: [20, 10, 10, 10, 12, 14, 12, 12] } },
      { id: 'kn', type: 'text', x: 3, y: 79, w: 94, h: 10, content: { html: '<span style="color:#575e69">Verde: cumple la meta de la planta · Amarillo: cerca de la meta · Rojo: fuera de meta · Sin color: sin dato. Metas por planta en Administración &gt; Plantas.</span>', size: 16, align: 'left' } },
    ] }, 'Resumen comparativo de KPIs');
  }

  const withSlides = plants.filter((p) => (reports[p.id]?.slides || []).some((s) => !s.hidden));
  for (const p of withSlides) {
    const idx = withSlides.indexOf(p);
    const list = withSlides.map((q, i) => (q === p
      ? `<p><b style="color:#00a650">▶ ${i + 1}. ${esc(q.name)}</b></p>`
      : `<p><span style="color:#575e69">${i + 1}. ${esc(q.name)}</span></p>`)).join('');
    gen('agenda:' + p.id, { title: 'Contenido de la sesión', blocks: [{ id: 'ag', type: 'text', x: 6, y: 17, w: 88, h: 74, content: { html: list, size: 30, align: 'left' } }] }, `Agenda · ${p.shortName} (${idx + 1})`);
    for (const s of reports[p.id].slides.filter((x) => !x.hidden)) {
      entries.push({ key: `p:${p.id}:${s.id}`, slide: s, plantId: p.id, plant: p, label: s.title || '(sin título)', sectionName: secName(s.section), editedByAdmin: s.editedByAdmin });
    }
  }
  gen('bk:div', { kind: 'end', title: 'Back Up', subtitle: 'Definiciones de los KPI' }, 'Back Up');
  for (const d of cfg.kpiDefinitions) {
    gen('bk:' + d.id, { title: d.title, blocks: [{ id: 'df', type: 'text', x: 6, y: 17, w: 88, h: 74, content: { html: lines(d.text), size: 28 } }] }, 'Back Up · ' + d.title);
  }
  gen('end', { kind: 'end', title: 'Fin de la sesión', subtitle: 'Gracias' }, 'Cierre');

  // Capa del administrador: el orden guardado manda; lo nuevo se inserta tras su predecesor.
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const out = (layer.order || []).filter((k) => byKey.has(k));
  const have = new Set(out);
  let prev = null;
  for (const e of entries) {
    if (!have.has(e.key)) { out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, e.key); have.add(e.key); }
    prev = e.key;
  }
  const hidden = new Set(layer.hidden || []);
  return out.map((k) => ({ ...byKey.get(k), hidden: hidden.has(k) }));
}

/** items listos para presentar / imprimir (sólo las visibles, con paginación). */
export function deckItems(entries, cycle) {
  const vis = entries.filter((e) => !e.hidden);
  return vis.map((e, i) => ({
    slide: e.slide,
    ctx: { cycleLabel: cycle.label, plantName: e.plant?.shortName, sectionName: e.sectionName, page: i + 1, total: vis.length },
  }));
}
