// Archivo mensual: al cerrar un ciclo se congela (1) el informe de cada planta y (2) el consolidado del mes.
import { store, loadConfig, emptyReport, reportKey } from './_lib.js';
import { buildDeck } from '../../web/js/admin/deck.js';

export async function archiveCycle(cycle, by) {
  const cfg = await loadConfig();
  const rs = await store('reports');
  const ar = await store('archive');
  const closedAt = new Date().toISOString();
  const reports = {};
  const plants = {};
  for (const p of cfg.plants) {
    const r = (await rs.get(reportKey(cycle.id, p.id), { type: 'json' })) || emptyReport();
    reports[p.id] = r;
    const status = r.status === 'enviado' ? 'enviado' : r.slides.length ? 'borrador' : 'sin informe';
    plants[p.id] = { status, slides: r.slides.length, submittedAt: r.submittedAt || null };
    await ar.setJSON(`plant/${cycle.id}/${p.id}`, { cycle: { id: cycle.id, label: cycle.label }, plantId: p.id, closedAt, closedBy: by, archiveStatus: status, report: r });
  }
  // consolidado: orden y ocultas del administrador al momento del cierre
  const layer = (await (await store('consolidation')).get(cycle.id, { type: 'json' })) || { order: [], hidden: [] };
  const entries = buildDeck({ cycle, cfg, reports, layer }).filter((e) => !e.hidden).map((e) => ({
    key: e.key, label: e.label, slide: e.slide, plantId: e.plantId || null, plant: e.plant ? { shortName: e.plant.shortName, name: e.plant.name } : null,
    sectionName: e.sectionName || null, editedByAdmin: !!e.editedByAdmin,
  }));
  await ar.setJSON(`cons/${cycle.id}`, { cycle: { id: cycle.id, label: cycle.label }, closedAt, closedBy: by, entries });
  const index = { cycleId: cycle.id, label: cycle.label, closedAt, closedBy: by, plants, consolidatedSlides: entries.length };
  await ar.setJSON(`index/${cycle.id}`, index);
  return index;
}

export async function deleteArchive(cycleId) {
  const ar = await store('archive');
  for (const prefix of [`plant/${cycleId}/`, `cons/${cycleId}`, `index/${cycleId}`]) for (const b of (await ar.list({ prefix })).blobs) await ar.delete(b.key);
}
