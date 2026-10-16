import crypto from 'node:crypto';
import { json, fail, readJson, handler, requireAdmin, loadConfig, saveConfig, loadAccess, saveAccess, hashCode } from './_lib.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 12 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('').replace(/(.{4})(?=.)/g, '$1-');

export default handler(async ({ req, url, user }) => {
  const cfg = await loadConfig();
  if (req.method === 'GET') {
    const access = await loadAccess();
    return json({ ...cfg, plants: cfg.plants.map((p) => ({ ...p, hasCode: !!access[p.id] })) });
  }
  const denied = requireAdmin(user);
  if (denied) return denied;

  if (req.method === 'POST' && url.searchParams.get('action') === 'gencode') {
    const id = url.searchParams.get('plant');
    if (!cfg.plants.some((p) => p.id === id)) return fail(404, 'Planta inexistente');
    const code = genCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const access = await loadAccess();
    access[id] = { salt, hash: hashCode(salt, code), at: new Date().toISOString() };
    await saveAccess(access);
    return json({ code }); // se muestra una sola vez; sólo se guarda el hash
  }
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
