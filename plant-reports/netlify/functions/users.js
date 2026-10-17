import crypto from 'node:crypto';
import { json, fail, readJson, handler, requireAdmin, loadConfig, loadUsers, saveUsers, publicUser, hashCode, PERMS } from './_lib.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 12 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('').replace(/(.{4})(?=.)/g, '$1-');
const withCode = (u) => { const code = genCode(); const salt = crypto.randomBytes(16).toString('hex'); return { code, fields: { salt, hash: hashCode(salt, code) } }; };
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,120}$/;

export default handler(async ({ req, url, user }) => {
  const denied = requireAdmin(user);
  if (denied) return denied;
  const users = await loadUsers();
  const cfg = await loadConfig();
  const id = url.searchParams.get('id');

  if (req.method === 'GET') return json({ users: users.map(publicUser) });

  if (req.method === 'POST' && !id) {
    const b = (await readJson(req)) || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(400, 'Ingresá un correo válido.');
    if (!String(b.name || '').trim()) return fail(400, 'Falta el nombre.');
    if (!cfg.plants.some((p) => p.id === b.plantId)) return fail(400, 'Elegí una planta.');
    if (!PERMS.includes(b.perm)) return fail(400, 'Rol inválido.');
    if (users.some((u) => u.email === email)) return fail(409, 'Ya existe un usuario con ese correo.');
    const { code, fields } = withCode();
    const u = { id: 'u' + crypto.randomBytes(5).toString('hex'), name: String(b.name).trim().slice(0, 80), email, plantId: b.plantId, perm: b.perm, active: true, createdAt: new Date().toISOString(), ...fields };
    users.push(u);
    await saveUsers(users);
    return json({ user: publicUser(u), code }); // el código se muestra una sola vez
  }

  const u = users.find((x) => x.id === id);
  if (!u) return fail(404, 'Usuario inexistente');
  if (req.method === 'POST' && url.searchParams.get('action') === 'regen') {
    const { code, fields } = withCode();
    Object.assign(u, fields);
    await saveUsers(users);
    return json({ code });
  }
  if (req.method === 'PATCH') {
    const b = (await readJson(req)) || {};
    if (b.name !== undefined) u.name = String(b.name).trim().slice(0, 80) || u.name;
    if (b.plantId !== undefined) { if (!cfg.plants.some((p) => p.id === b.plantId)) return fail(400, 'Planta inválida'); u.plantId = b.plantId; }
    if (b.perm !== undefined) { if (!PERMS.includes(b.perm)) return fail(400, 'Rol inválido'); u.perm = b.perm; }
    if (b.active !== undefined) u.active = !!b.active;
    await saveUsers(users);
    return json({ user: publicUser(u) });
  }
  if (req.method === 'DELETE') { await saveUsers(users.filter((x) => x !== u)); return json({ ok: true }); }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/users' };
