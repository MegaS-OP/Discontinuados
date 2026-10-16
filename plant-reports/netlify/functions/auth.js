import { json, fail, readJson, store, signToken, safeEqual, hashCode, clientIp, handler, loadConfig, loadAccess } from './_lib.js';

const MAX_FAILS = 5, WINDOW = 15 * 60 * 1000, TTL = 12 * 3600 * 1000;

async function limited(key) {
  const s = await store('ratelimit');
  const r = (await s.get(key, { type: 'json' })) || { n: 0, t: Date.now() };
  if (Date.now() - r.t > WINDOW) return { s, r: { n: 0, t: Date.now() }, blocked: false };
  return { s, r, blocked: r.n >= MAX_FAILS };
}

export default handler(async ({ req, ctx, url }) => {
  if (req.method === 'GET') { // lista pública de plantas para la pantalla de ingreso
    const cfg = await loadConfig();
    return json({ plants: cfg.plants.filter((p) => p.active).sort((a, b) => a.order - b.order).map((p) => ({ id: p.id, name: p.name })) });
  }
  if (req.method !== 'POST') return fail(405, 'Método no permitido');
  const body = (await readJson(req)) || {};
  const ip = clientIp(req, ctx);
  const isAdmin = body.role === 'admin';
  const key = `${ip}:${isAdmin ? 'admin' : String(body.plantId).slice(0, 30)}`.replace(/[^\w:.-]/g, '_');
  const { s, r, blocked } = await limited(key);
  if (blocked) return fail(429, 'Demasiados intentos fallidos. Esperá 15 minutos e intentá de nuevo.');
  const bad = async () => { r.n += 1; await s.setJSON(key, r); return fail(401, 'Código o contraseña incorrectos.'); };

  let user;
  if (isAdmin) {
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return fail(500, 'Falta la variable de entorno ADMIN_PASSWORD en Netlify.');
    if (!body.password || !safeEqual(body.password, pw)) return bad();
    user = { role: 'admin', name: 'Administrador S&OP' };
  } else {
    const cfg = await loadConfig();
    const plant = cfg.plants.find((p) => p.id === body.plantId && p.active);
    const acc = (await loadAccess())[body.plantId];
    if (!plant || !acc || !body.code) return bad();
    if (!safeEqual(hashCode(acc.salt, String(body.code).trim()), acc.hash)) return bad();
    user = { role: 'plant', plantId: plant.id, name: plant.name };
  }
  await s.delete(key);
  const exp = Date.now() + TTL;
  return json({ token: signToken({ ...user, exp }), exp, ...user });
}, { auth: false });

export const config = { path: '/api/auth' };
