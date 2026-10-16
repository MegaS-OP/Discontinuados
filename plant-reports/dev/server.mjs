// Servidor de desarrollo local (sin Netlify). Uso: node dev/server.mjs  -> http://localhost:8888
// Sirve /web y ejecuta las funciones de netlify/functions con un almacenamiento en archivos (.dev-data).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.LOCAL_STORE_DIR ||= path.join(root, '.dev-data');
process.env.SESSION_SECRET ||= 'dev-secret-dev-secret-dev-secret';
process.env.ADMIN_PASSWORD ||= 'admin-dev';
const PORT = Number(process.env.PORT || 8888);

const routes = new Map();
const fdir = path.join(root, 'netlify/functions');
for (const f of await fs.readdir(fdir)) {
  if (f.startsWith('_') || !f.endsWith('.js')) continue;
  const mod = await import(pathToFileURL(path.join(fdir, f)).href);
  routes.set(mod.config.path, mod.default);
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const fn = routes.get(url.pathname);
  if (fn) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), { ip: req.socket.remoteAddress });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let file = path.join(root, 'web', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(path.join(root, 'web'))) { res.writeHead(403); return res.end(); }
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('No encontrado'); }
}).listen(PORT, () => console.log(`S&OP Suministro Reports en http://localhost:${PORT}  (admin: ${process.env.ADMIN_PASSWORD})`));
