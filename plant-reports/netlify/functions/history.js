import { json, fail, store, handler, loadConfig, loadCycle, emptyReport, reportKey } from './_lib.js';
import { listVersions, getVersion, snapshot } from './_history.js';
import { normalizeReport } from '../../web/js/model/sanitize.js';

// Versiones de un informe: sólo la propia planta (o el administrador).
export default handler(async ({ req, url, user }) => {
  const cycleId = url.searchParams.get('cycle'), plantId = url.searchParams.get('plant');
  const cycle = await loadCycle(cycleId);
  const cfg = await loadConfig();
  if (!cycle || !cfg.plants.some((p) => p.id === plantId)) return fail(404, 'No encontrado');
  const isAdmin = user.role === 'admin';
  if (!isAdmin && user.plantId !== plantId) return fail(403, 'No tenés acceso al informe de otra planta.');
  if (!isAdmin && cycle.status === 'borrador') return fail(403, 'Ciclo no disponible.');
  const v = Number(url.searchParams.get('version'));

  if (req.method === 'GET') {
    if (!v) return json({ versions: await listVersions(cycleId, plantId) });
    const snap = await getVersion(cycleId, plantId, v);
    return snap ? json({ version: v, ...snap }) : fail(404, 'Esa versión ya no está disponible.');
  }
  if (req.method === 'POST' && url.searchParams.get('action') === 'restore') {
    if (!isAdmin && user.perm !== 'editor') return fail(403, 'Tu usuario es de sólo lectura (Lector).');
    if (!isAdmin && cycle.status !== 'abierto') return fail(403, 'El ciclo no está abierto para edición.');
    const rs = await store('reports');
    const cur = (await rs.get(reportKey(cycleId, plantId), { type: 'json' })) || emptyReport();
    if (!isAdmin && cur.status === 'enviado') return fail(403, 'El informe ya fue enviado. Reabrilo para restaurar una versión.');
    const snap = await getVersion(cycleId, plantId, v);
    if (!snap) return fail(404, 'Esa versión ya no está disponible.');
    const who = isAdmin ? 'admin' : user.name;
    await snapshot(cycleId, plantId, cur, 'antes de restaurar', who); // la versión actual no se pierde
    const norm = normalizeReport(snap, cfg.sections.map((s) => s.id));
    const r = { ...cur, ...norm, version: (cur.version || 0) + 1, updatedAt: new Date().toISOString(), updatedBy: who };
    r.history = [...(cur.history || []), { version: r.version, at: r.updatedAt, by: who, event: `restaurado v${v}` }].slice(-60);
    await rs.setJSON(reportKey(cycleId, plantId), r);
    await snapshot(cycleId, plantId, r, `restaurado v${v}`, who);
    return json({ report: r });
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/history' };
