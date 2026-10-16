import { json, fail, readJson, store, handler, requireAdmin, loadCycle, CYCLE_ID_RE, STATUSES } from './_lib.js';
import { archiveCycle, deleteArchive } from './_archive.js';

const clean = (b, old = {}) => ({
  ...old,
  label: String(b.label ?? old.label ?? '').slice(0, 60),
  deadline: b.deadline === undefined ? old.deadline ?? null : /^\d{4}-\d{2}-\d{2}$/.test(b.deadline) ? b.deadline : null,
});

export default handler(async ({ req, url, user }) => {
  const s = await store('cycles');
  if (req.method === 'GET') {
    const { blobs } = await s.list();
    let cycles = (await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })))).filter(Boolean);
    if (user.role !== 'admin') cycles = cycles.filter((c) => c.status !== 'borrador');
    cycles.sort((a, b) => b.id.localeCompare(a.id));
    return json({ cycles });
  }
  const denied = requireAdmin(user);
  if (denied) return denied;
  if (req.method === 'POST') {
    const b = (await readJson(req)) || {};
    if (!CYCLE_ID_RE.test(b.id || '')) return fail(400, 'Identificador de ciclo inválido (ej.: 2026-09).');
    if (await s.get(b.id, { type: 'json' })) return fail(409, 'Ese ciclo ya existe.');
    const c = { id: b.id, status: 'borrador', createdAt: new Date().toISOString(), ...clean(b) };
    if (!c.label) return fail(400, 'Falta el nombre del ciclo.');
    await s.setJSON(c.id, c);
    return json({ cycle: c });
  }
  const id = url.searchParams.get('id');
  const old = await loadCycle(id);
  if (!old) return fail(404, 'Ciclo inexistente');
  if (req.method === 'PATCH') {
    const b = (await readJson(req)) || {};
    const c = clean(b, old);
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return fail(400, 'Estado inválido');
      c.status = b.status;
    }
    await s.setJSON(id, c);
    // Al cerrar el ciclo se archiva solo: informe de cada planta + consolidado del mes
    const archived = ['cerrado', 'consolidado'].includes(b.status) && ['borrador', 'abierto'].includes(old.status) ? await archiveCycle(c, user.name) : null;
    return json({ cycle: c, archived });
  }
  if (req.method === 'DELETE') {
    const rs = await store('reports');
    for (const b of (await rs.list({ prefix: id + '/' })).blobs) await rs.delete(b.key);
    await (await store('consolidation')).delete(id);
    await deleteArchive(id);
    await s.delete(id);
    return json({ ok: true });
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/cycles' };
