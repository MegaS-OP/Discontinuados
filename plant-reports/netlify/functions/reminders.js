// Recordatorio automático diario (Netlify Scheduled Function, 12:00 UTC ≈ 9:00 Argentina):
// avisa a los editores que no enviaron cuando faltan 2 días o menos para la fecha límite, una vez por día.
import { store } from './_lib.js';
import { notify } from './_notify.js';

export default async () => {
  const cs = await store('cycles'), log = await store('maillog-state');
  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  for (const b of (await cs.list()).blobs) {
    const c = await cs.get(b.key, { type: 'json' });
    if (!c || c.status !== 'abierto' || !c.deadline) continue;
    const days = Math.ceil((new Date(c.deadline + 'T23:59:59') - new Date()) / 864e5);
    if (days > 2 || days < 0) continue;
    const key = `reminder/${c.id}/${today}`;
    if (await log.get(key)) continue;
    out.push({ cycle: c.id, ...(await notify('reminder', c)) });
    await log.set(key, '1');
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '0 12 * * *' };
