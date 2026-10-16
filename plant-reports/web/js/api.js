import { lsGet, lsSet, lsDel } from './util.js';

let mem = null;
export const auth = {
  get() {
    if (mem) return mem;
    try { mem = JSON.parse(sessionStorage.getItem('sop.auth')); } catch { mem = null; }
    if (mem && mem.exp < Date.now()) mem = null;
    return mem;
  },
  set(a) { mem = a; try { sessionStorage.setItem('sop.auth', JSON.stringify(a)); } catch { /* ok */ } },
  clear() { mem = null; try { sessionStorage.removeItem('sop.auth'); } catch { /* ok */ } },
};

export class ApiError extends Error {
  constructor(status, msg, data) { super(msg); this.status = status; this.data = data; }
}

export async function api(path, { method = 'GET', body, raw, type } = {}) {
  const a = auth.get();
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { ...(a ? { authorization: 'Bearer ' + a.token } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...(type ? { 'content-type': type } : {}) },
      body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'Sin conexión con el servidor');
  }
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    if (res.status === 401 && a) { auth.clear(); location.hash = '#/login'; }
    throw new ApiError(res.status, data?.error || 'Error ' + res.status, data);
  }
  return data;
}

export function uploadImage(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/image');
    x.setRequestHeader('authorization', 'Bearer ' + auth.get()?.token);
    x.setRequestHeader('content-type', blob.type || 'application/octet-stream');
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      let d = {}; try { d = JSON.parse(x.responseText); } catch { /* ok */ }
      x.status === 200 ? resolve(d.hash) : reject(new ApiError(x.status, d.error || 'No se pudo subir la imagen'));
    };
    x.onerror = () => reject(new ApiError(0, 'Sin conexión con el servidor'));
    x.send(blob);
  });
}
export const imgUrl = (hash) => `/api/image?h=${hash}&t=${encodeURIComponent(auth.get()?.token || '')}`;

// Config en memoria (se recarga bajo demanda)
let cfgCache = null;
export async function getConfig(force = false) {
  if (!cfgCache || force) cfgCache = await api('/api/config');
  return cfgCache;
}
export const clearConfig = () => { cfgCache = null; };
export { lsGet, lsSet, lsDel };
