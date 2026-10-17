// Envío de correos por Gmail SMTP. Credenciales sólo en variables de entorno (GMAIL_USER, GMAIL_APP_PASSWORD).
// MAIL_DRY_RUN=1 no envía: registra los mensajes en el almacenamiento (para probar).
import { store } from './_lib.js';

export const mailConfigured = () => !!(process.env.MAIL_DRY_RUN || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));

/** messages: [{ to, subject, text }]. Un correo por destinatario (no se exponen direcciones entre sí). */
export async function sendMessages(messages) {
  if (!messages.length) return { sent: 0 };
  if (process.env.MAIL_DRY_RUN) {
    const s = await store('maillog');
    for (const m of messages) await s.setJSON(`${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, m);
    return { sent: messages.length, dry: true };
  }
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return { sent: 0, skipped: 'Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en Netlify.' };
  const nodemailer = (await import('nodemailer')).default;
  const tr = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  let sent = 0, failed = 0;
  for (const m of messages) {
    try { await tr.sendMail({ from: `"S&OP Suministro Reports" <${user}>`, to: m.to, subject: m.subject, text: m.text }); sent++; } catch (e) { console.error('mail', m.to, e.message); failed++; }
  }
  return { sent, failed };
}
