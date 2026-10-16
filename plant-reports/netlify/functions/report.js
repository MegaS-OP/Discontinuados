import { json, fail, readJson, store, handler, loadConfig, loadCycle, emptyReport, reportKey } from './_lib.js';
import { normalizeReport, missingRequired } from '../../web/js/model/sanitize.js';

const MAX_HISTORY = 60;

export default handler(async ({ req, url, user }) => {
  const cycleId = url.searchParams.get('cycle');
  const plantId = url.searchParams.get('plant');
  const cycle = await loadCycle(cycleId);
  if (!cycle) return fail(404, 'Ciclo inexistente');
  const cfg = await loadConfig();
  const rs = await store('reports');
  const isAdmin = user.role === 'admin';

  if (!isAdmin && cycle.status === 'borrador') return fail(403, 'Ciclo no disponible.');

  // Todos los informes del ciclo (consolidador): sólo administrador
  if (!plantId) {
    if (!isAdmin) return fail(403, 'Sólo el administrador puede hacer esto.');
    const reports = {};
    for (const p of cfg.plants) reports[p.id] = (await rs.get(reportKey(cycleId, p.id), { type: 'json' })) || emptyReport();
    return json({ cycle, reports });
  }
  if (!cfg.plants.some((p) => p.id === plantId)) return fail(404, 'Planta inexistente');

  const own = isAdmin || user.plantId === plantId;
  const closed = cycle.status === 'cerrado' || cycle.status === 'consolidado';
  if (!own && !closed) return fail(403, 'No tenés acceso al informe de otra planta.');
  const method = req.method;
  const stored = (await rs.get(reportKey(cycleId, plantId), { type: 'json' })) || emptyReport();

  if (method === 'GET') return json({ cycle, report: stored, canEdit: own && (isAdmin || (cycle.status === 'abierto' && stored.status !== 'enviado')) });

  if (!own) return fail(403, 'No tenés acceso al informe de otra planta.');
  if (!isAdmin && cycle.status !== 'abierto') return fail(403, 'El ciclo no está abierto para edición.');
  const who = isAdmin ? 'admin' : user.name;
  const sectionIds = cfg.sections.map((s) => s.id);
  const save = async (r, event) => {
    r.version = (stored.version || 0) + 1;
    r.updatedAt = new Date().toISOString();
    r.updatedBy = who;
    if (event) r.history = [...(r.history || []), { version: r.version, at: r.updatedAt, by: who, event }].slice(-MAX_HISTORY);
    await rs.setJSON(reportKey(cycleId, plantId), r);
    return json({ report: r });
  };

  if (method === 'PUT') {
    if (!isAdmin && stored.status === 'enviado') return fail(403, 'El informe ya fue enviado. Reabrilo para editarlo.');
    const b = (await readJson(req)) || {};
    if ((stored.version || 0) !== b.baseVersion) return fail(409, 'El informe fue modificado desde otra pestaña o sesión.', { version: stored.version || 0 });
    const norm = normalizeReport(b.report, sectionIds);
    return save({ ...stored, ...norm }, null);
  }

  if (method === 'POST') {
    const action = url.searchParams.get('action');
    if (action === 'submit') {
      if (!isAdmin && stored.status === 'enviado') return fail(400, 'Ya está enviado.');
      const miss = missingRequired(stored, cfg.sections);
      if (miss.length) return fail(400, 'Faltan secciones obligatorias: ' + miss.map((s) => s.name).join(', '), { missing: miss.map((s) => s.id) });
      return save({ ...stored, status: 'enviado', submittedAt: new Date().toISOString() }, 'enviado');
    }
    if (action === 'reopen') return save({ ...stored, status: 'borrador', submittedAt: null }, 'reabierto');
    if (action === 'duplicate') {
      const from = url.searchParams.get('from');
      if (!isAdmin && stored.status === 'enviado') return fail(400, 'El informe ya fue enviado.');
      if (!(await loadCycle(from))) return fail(404, 'Ciclo de origen inexistente');
      if (!isAdmin && from === cycleId) return fail(400, 'Ciclo de origen inválido');
      const prev = await rs.get(reportKey(from, plantId), { type: 'json' });
      if (!prev || !prev.slides?.length) return fail(404, 'La planta no tiene informe en el ciclo anterior.');
      const norm = normalizeReport(prev, sectionIds);
      norm.kpis = {}; // los KPIs cambian cada mes: no se arrastran
      return save({ ...stored, ...norm, status: 'borrador', submittedAt: null }, 'duplicado desde ' + from);
    }
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/report' };
