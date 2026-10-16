import { json, fail, readJson, handler, requireAdmin, loadConfig, saveConfig } from './_lib.js';

export default handler(async ({ req, url, user }) => {
  const cfg = await loadConfig();
  if (req.method === 'GET') {
    return json(cfg);
  }
  const denied = requireAdmin(user);
  if (denied) return denied;

  if (req.method === 'PUT') {
    const b = (await readJson(req)) || {};
    const num = (v) => (v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
    if (Array.isArray(b.plants)) {
      cfg.plants = cfg.plants.map((p) => {
        const n = b.plants.find((x) => x.id === p.id);
        if (!n) return p;
        const t = n.kpiTargets || {};
        return {
          ...p, name: String(n.name || p.name).slice(0, 80), shortName: String(n.shortName || p.shortName).slice(0, 40),
          order: Number(n.order) || p.order, active: n.active !== false,
          kpiTargets: Object.fromEntries(Object.keys(p.kpiTargets).map((k) => [k, num(t[k]) ?? p.kpiTargets[k]])),
        };
      });
    }
    if (Array.isArray(b.kpiDefinitions)) {
      cfg.kpiDefinitions = b.kpiDefinitions.slice(0, 20).map((d, i) => ({ id: String(d.id || 'k' + i).slice(0, 30), title: String(d.title || '').slice(0, 120), text: String(d.text || '').slice(0, 4000) }));
    }
    await saveConfig(cfg);
    return json({ ok: true });
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/config' };
