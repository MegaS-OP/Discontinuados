import { json, fail, store, handler, loadConfig, CYCLE_ID_RE } from './_lib.js';

// Archivo mensual (sólo lectura). Cada usuario de planta accede únicamente al archivo de SU planta.
export default handler(async ({ req, url, user }) => {
  if (req.method !== 'GET') return fail(405, 'Método no permitido');
  const ar = await store('archive');
  const isAdmin = user.role === 'admin';
  const cycleId = url.searchParams.get('cycle');
  const plantId = url.searchParams.get('plant');

  if (!cycleId) { // listado de meses archivados
    const { blobs } = await ar.list({ prefix: 'index/' });
    const all = (await Promise.all(blobs.map((b) => ar.get(b.key, { type: 'json' })))).filter(Boolean).sort((a, b) => b.cycleId.localeCompare(a.cycleId));
    if (isAdmin) return json({ months: all });
    return json({ months: all.filter((m) => m.plants[user.plantId]).map((m) => ({ cycleId: m.cycleId, label: m.label, closedAt: m.closedAt, ...m.plants[user.plantId] })) });
  }
  if (!CYCLE_ID_RE.test(cycleId)) return fail(400, 'Ciclo inválido');

  if (url.searchParams.get('consolidated')) { // consolidado congelado: sólo corporativo
    if (!isAdmin) return fail(403, 'Sólo el administrador puede hacer esto.');
    const c = await ar.get(`cons/${cycleId}`, { type: 'json' });
    return c ? json(c) : fail(404, 'Ese mes todavía no está archivado.');
  }
  if (!plantId || !(await loadConfig()).plants.some((p) => p.id === plantId)) return fail(404, 'Planta inexistente');
  if (!isAdmin && user.plantId !== plantId) return fail(403, 'No tenés acceso al archivo de otra planta.');
  const a = await ar.get(`plant/${cycleId}/${plantId}`, { type: 'json' });
  if (!a) return fail(404, 'Ese mes todavía no está archivado.');
  return json({ cycle: { ...a.cycle, status: 'archivado' }, report: a.report, canEdit: false, closedAt: a.closedAt, archiveStatus: a.archiveStatus });
});

export const config = { path: '/api/archive' };
