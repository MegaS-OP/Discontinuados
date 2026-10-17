import { loadConfig, loadUsers, store, reportKey } from './_lib.js';
import { sendMessages, mailConfigured } from './_mail.js';

const base = () => process.env.URL || process.env.DEPLOY_PRIME_URL || '';
const fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR') : 'sin fecha');
const sign = '\n\n— S&OP Suministro Reports\n' + base();

/** Usuarios activos de plantas activas; con onlyPending se filtran los editores de plantas sin informe enviado. */
async function recipients(cycle, onlyPending) {
  const cfg = await loadConfig(), users = await loadUsers(), rs = await store('reports');
  const out = [];
  for (const u of users.filter((x) => x.active)) {
    const plant = cfg.plants.find((p) => p.id === u.plantId && p.active);
    if (!plant) continue;
    if (onlyPending) {
      if (u.perm !== 'editor') continue;
      const r = await rs.get(reportKey(cycle.id, plant.id), { type: 'json' });
      if (r?.status === 'enviado') continue;
    }
    out.push({ u, plant });
  }
  return out;
}

/** type: opened | reminder | closed | submitted */
export async function notify(type, cycle, extra = {}) {
  if (!mailConfigured()) return { sent: 0, recipients: 0, skipped: 'Los correos no están configurados (GMAIL_USER / GMAIL_APP_PASSWORD).' };
  const msgs = [];
  if (type === 'submitted') {
    for (const to of (process.env.ADMIN_NOTIFY_EMAIL || '').split(',').map((x) => x.trim()).filter(Boolean)) {
      msgs.push({ to, subject: `[S&OP] ${extra.plant?.name} envió su informe de ${cycle.label}`, text: `${extra.who || 'Un usuario'} envió el informe de ${extra.plant?.name} para ${cycle.label}.${sign}` });
    }
  } else {
    const list = await recipients(cycle, type === 'reminder');
    for (const { u, plant } of list) {
      const hi = `Hola ${u.name.split(' ')[0]},\n\n`;
      if (type === 'opened') msgs.push({ to: u.email, subject: `[S&OP] Se abrió el ciclo ${cycle.label}`, text: `${hi}Ya podés cargar el informe de ${plant.name} para ${cycle.label}. Fecha límite: ${fmtDay(cycle.deadline)}.${sign}` });
      if (type === 'reminder') msgs.push({ to: u.email, subject: `[S&OP] Recordatorio: informe de ${cycle.label}`, text: `${hi}Todavía no enviaste el informe de ${plant.name} para ${cycle.label}. Fecha límite: ${fmtDay(cycle.deadline)}.${sign}` });
      if (type === 'closed') msgs.push({ to: u.email, subject: `[S&OP] Ciclo ${cycle.label} cerrado`, text: `${hi}El ciclo ${cycle.label} se cerró. El informe de ${plant.name} quedó guardado en tu historial de meses cerrados.${sign}` });
    }
  }
  const r = await sendMessages(msgs);
  return { recipients: msgs.length, ...r };
}
