import { json, fail, readJson, handler, requireAdmin, loadCycle } from './_lib.js';
import { notify } from './_notify.js';
import { mailConfigured } from './_mail.js';

// Avisos por correo (sólo administrador). GET: ¿está configurado? · POST {cycle, type: opened|reminder|closed}
export default handler(async ({ req, user }) => {
  const denied = requireAdmin(user);
  if (denied) return denied;
  if (req.method === 'GET') return json({ configured: mailConfigured() });
  if (req.method !== 'POST') return fail(405, 'Método no permitido');
  const b = (await readJson(req)) || {};
  const cycle = await loadCycle(b.cycle);
  if (!cycle) return fail(404, 'Ciclo inexistente');
  if (!['opened', 'reminder', 'closed'].includes(b.type)) return fail(400, 'Tipo de aviso inválido');
  return json(await notify(b.type, cycle));
});

export const config = { path: '/api/notify' };
