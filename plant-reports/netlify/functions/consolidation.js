import { json, fail, readJson, store, handler, requireAdmin, loadCycle } from './_lib.js';

const strs = (a, n) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.length < 80).slice(0, n) : []);

export default handler(async ({ req, url, user }) => {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const id = url.searchParams.get('cycle');
  if (!(await loadCycle(id))) return fail(404, 'Ciclo inexistente');
  const s = await store('consolidation');
  if (req.method === 'GET') return json({ layer: (await s.get(id, { type: 'json' })) || { order: [], hidden: [] } });
  if (req.method === 'PUT') {
    const b = (await readJson(req)) || {};
    const layer = { order: strs(b.order, 3000), hidden: strs(b.hidden, 3000), updatedAt: new Date().toISOString() };
    await s.setJSON(id, layer);
    return json({ layer });
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/consolidation' };
