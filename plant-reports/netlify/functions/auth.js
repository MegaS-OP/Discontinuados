import { json, fail, readJson, store, signToken, safeEqual, hashCode, clientIp, handler, loadConfig, loadUsers } from './_lib.js';

const MAX_FAILS = 5, WINDOW = 15 * 60 * 1000, TTL = 12 * 3600 * 1000;

async function limited(key) {
  const s = await store('ratelimit');
  const r = (await s.get(key, { type: 'json' })) || { n: 0, t: Date.now() };
  if (Date.now() - r.t > WINDOW) return { s, r: { n: 0, t: Date.now() }, blocked: false };
  return { s, r, blocked: r.n >= MAX_FAILS };
}

export default handler(async ({ req, ctx, url }) => {
  if (req.method !== 'POST') return fail(405, 'Método no permitido');
  const body = (await readJson(req)) || {};
  const ip = clientIp(req, ctx);
  const isAdmin = body.role === 'admin';
  const email = String(body.email || '').trim().toLowerCase().slice(0, 80);
  const key = `${ip}:${isAdmin ? 'admin' : email}`.replace(/[^\w:.-]/g, '_');
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
    const u = (await loadUsers()).find((x) => x.email === email && x.active);
    if (!u || !body.code) return bad();
    if (!safeEqual(hashCode(u.salt, String(body.code).trim().toUpperCase()), u.hash)) return bad();
    const plant = (await loadConfig()).plants.find((p) => p.id === u.plantId && p.active);
    if (!plant) return fail(403, 'Tu planta está desactivada. Consultá al equipo de S&OP.');
    user = { role: 'plant', userId: u.id, plantId: u.plantId, perm: u.perm, name: u.name };
  }
  await s.delete(key);
  const exp = Date.now() + TTL;
  return json({ token: signToken({ ...user, exp }), exp, ...user });
}, { auth: false });

export const config = { path: '/api/auth' };
