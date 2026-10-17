// Utilidades compartidas de las funciones: almacenamiento, firma de tokens, respuestas.
import crypto from 'node:crypto';
import { SECTIONS, PLANTS, KPI_DEFINITIONS } from '../../web/js/model/seed.js';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
export const fail = (status, error, extra = {}) => json({ error, ...extra }, status);
export const readJson = async (req) => { try { return await req.json(); } catch { return null; } };

// ---------- Almacenamiento (Netlify Blobs; en desarrollo local, carpeta de archivos) ----------
async function localStore(name) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = path.join(process.env.LOCAL_STORE_DIR, name);
  await fs.mkdir(dir, { recursive: true });
  const f = (k) => path.join(dir, encodeURIComponent(k));
  const readMeta = async (k) => { try { return JSON.parse(await fs.readFile(f(k) + '.meta', 'utf8')); } catch { return null; } };
  const conv = (buf, type) => (type === 'json' ? JSON.parse(buf.toString('utf8')) : type === 'text' ? buf.toString('utf8') : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return {
    async get(k, o = {}) { try { return conv(await fs.readFile(f(k)), o.type); } catch { return null; } },
    async getWithMetadata(k, o = {}) {
      try { return { data: conv(await fs.readFile(f(k)), o.type), metadata: (await readMeta(k)) || {} }; } catch { return null; }
    },
    async set(k, v, o = {}) {
      await fs.writeFile(f(k), typeof v === 'string' ? v : Buffer.from(v));
      await fs.writeFile(f(k) + '.meta', JSON.stringify(o.metadata || {}));
    },
    async setJSON(k, v) { await fs.writeFile(f(k), JSON.stringify(v)); },
    async delete(k) { await fs.rm(f(k), { force: true }); await fs.rm(f(k) + '.meta', { force: true }); },
    async list({ prefix = '' } = {}) {
      const names = (await fs.readdir(dir)).filter((n) => !n.endsWith('.meta')).map(decodeURIComponent).filter((k) => k.startsWith(prefix));
      return { blobs: names.map((key) => ({ key })) };
    },
  };
}
export async function store(name) {
  if (process.env.LOCAL_STORE_DIR) return localStore(name);
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name, consistency: 'strong' });
}

// ---------- Tokens firmados (HMAC) ----------
const b64u = (b) => Buffer.from(b).toString('base64url');
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Falta la variable de entorno SESSION_SECRET (mínimo 16 caracteres).');
  return s;
};
export function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  return body + '.' + crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}
export function readToken(req, url) {
  const h = req.headers.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : url?.searchParams.get('t');
  if (!t || !t.includes('.')) return null;
  const [body, sig] = t.split('.');
  const good = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const safeEqual = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};
export const hashCode = (salt, code) => crypto.createHash('sha256').update(salt + ':' + code).digest('hex');
export const clientIp = (req, ctx) => ctx?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';

/** Envuelve un handler: maneja errores de configuración y devuelve el usuario autenticado. */
export function handler(fn, { auth = true } = {}) {
  return async (req, ctx) => {
    try {
      const url = new URL(req.url);
      let user = null;
      if (auth) {
        user = readToken(req, url);
        if (!user) return fail(401, 'Sesión no válida o vencida. Ingresá nuevamente.');
        if (user.role === 'plant') { // el usuario debe seguir activo; planta y rol se toman SIEMPRE del servidor
          const u = (await loadUsers()).find((x) => x.id === user.userId);
          if (!u || !u.active) return fail(401, 'Tu usuario está desactivado o no existe. Consultá al equipo de S&OP.');
          user = { ...user, plantId: u.plantId, perm: u.perm, name: u.name };
        }
      }
      return await fn({ req, ctx, url, user });
    } catch (e) {
      console.error(e);
      return fail(500, e.message || 'Error interno');
    }
  };
}
export const requireAdmin = (user) => (user.role === 'admin' ? null : fail(403, 'Sólo el administrador puede hacer esto.'));

// ---------- Configuración global ----------
export async function loadConfig() {
  const s = await store('config');
  let cfg = await s.get('main', { type: 'json' });
  if (!cfg) {
    cfg = { plants: PLANTS, sections: SECTIONS, kpiDefinitions: KPI_DEFINITIONS };
    await s.setJSON('main', cfg);
  }
  cfg.sections = SECTIONS; // las secciones son fijas y vienen del código
  return cfg;
}
export const saveConfig = async (cfg) => (await store('config')).setJSON('main', cfg);
// Usuarios: { id, name, email, plantId, perm: 'editor'|'lector', active, salt, hash, createdAt }
export const loadUsers = async () => (await (await store('users')).get('main', { type: 'json' })) || [];
export const saveUsers = async (u) => (await store('users')).setJSON('main', u);
export const publicUser = ({ salt, hash, ...u }) => u;
export const PERMS = ['editor', 'lector'];

export const CYCLE_ID_RE = /^[a-z0-9-]{3,24}$/;
export const STATUSES = ['borrador', 'abierto', 'cerrado', 'consolidado'];
export const loadCycle = async (id) => (CYCLE_ID_RE.test(id || '') ? (await store('cycles')).get(id, { type: 'json' }) : null);

export function emptyReport() {
  return { version: 0, status: 'borrador', updatedAt: null, updatedBy: null, submittedAt: null, kpis: {}, slides: [], naSections: {}, history: [] };
}
export const reportKey = (cycle, plant) => `${cycle}/${plant}`;
