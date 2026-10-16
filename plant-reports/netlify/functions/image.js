import crypto from 'node:crypto';
import { fail, store, handler } from './_lib.js';
import { HASH_RE } from '../../web/js/model/sanitize.js';

const MAX = 5 * 1024 * 1024;
function sniff(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (b.length > 6 && b.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  return null;
}

export default handler(async ({ req, url, user }) => {
  const s = await store('images');
  if (req.method === 'GET') {
    const h = url.searchParams.get('h');
    if (!HASH_RE.test(h || '')) return fail(400, 'Imagen inválida');
    const r = await s.getWithMetadata(h, { type: 'arrayBuffer' });
    if (!r) return fail(404, 'Imagen inexistente');
    return new Response(r.data, { headers: { 'content-type': r.metadata.type || 'image/png', 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
  }
  if (req.method === 'POST') {
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) return fail(400, 'Archivo vacío');
    if (buf.length > MAX) return fail(413, 'La imagen supera los 5 MB incluso después de comprimir.');
    const type = sniff(buf);
    if (!type) return fail(415, 'Formato no soportado (usá PNG, JPG, WebP o GIF).');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (!(await s.getWithMetadata(hash, { type: 'arrayBuffer' }))) await s.set(hash, buf, { metadata: { type, size: buf.length, by: user.name } });
    return new Response(JSON.stringify({ hash }), { headers: { 'content-type': 'application/json' } });
  }
  return fail(405, 'Método no permitido');
});

export const config = { path: '/api/image' };
