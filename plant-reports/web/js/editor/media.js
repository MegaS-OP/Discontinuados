import { uploadImage } from '../api.js';
import { sanitizeHtml, isHex } from '../model/sanitize.js';
import { esc } from '../util.js';

const MAX_SIDE = 1920, MAX_BYTES = 5 * 1024 * 1024 - 200 * 1024;

/** Comprime en el navegador: máx. 1920 px, WebP/JPEG ~0,85 (PNG sólo con transparencia). */
export async function compressImage(file) {
  if (!/^image\/(png|jpe?g|webp|gif|bmp)/.test(file.type)) throw new Error('Formato no soportado (usá PNG, JPG o WebP).');
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  let w = Math.max(1, Math.round(bmp.width * k)), hh = Math.max(1, Math.round(bmp.height * k));
  let alpha = false;
  const draw = (cw, ch, bg) => {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const x = c.getContext('2d', { willReadFrequently: true });
    if (bg) { x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch); }
    x.drawImage(bmp, 0, 0, cw, ch);
    return c;
  };
  if (file.type === 'image/png' || file.type === 'image/webp') {
    const c = draw(w, hh, false);
    const d = c.getContext('2d').getImageData(0, 0, w, hh).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] < 250) { alpha = true; break; }
  }
  const toBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = draw(w, hh, !alpha);
    let blob;
    if (alpha) blob = await toBlob(c, 'image/png');
    else {
      blob = await toBlob(c, 'image/webp', Math.max(0.5, 0.85 - attempt * 0.08));
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(c, 'image/jpeg', Math.max(0.5, 0.85 - attempt * 0.08));
    }
    if (blob.size <= MAX_BYTES) return { blob, width: w, height: hh };
    w = Math.round(w * 0.8); hh = Math.round(hh * 0.8); // sigue pesando de más: reduce y reintenta
  }
  throw new Error('No se pudo comprimir la imagen por debajo de 5 MB.');
}

export async function prepareAndUpload(file, onProgress) {
  const { blob, width, height } = await compressImage(file);
  const hash = await uploadImage(blob, onProgress);
  return { hash, width, height };
}

// ---------- Pegado de tablas (Excel: text/html y text/plain tabulado) ----------
const rgbToHex = (s) => {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  return isHex(s) ? s.toLowerCase() : /^#[0-9a-f]{3}$/i.test(s) ? '#' + [...s.slice(1)].map((c) => c + c).join('') : '';
};
const WHITE = new Set(['#ffffff', '#fff', '']);

export function parseHtmlTable(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const t = doc.querySelector('table');
  if (!t) return null;
  const rows = [];
  for (const tr of t.querySelectorAll('tr')) {
    const row = [];
    for (const td of tr.querySelectorAll('th,td')) {
      const st = td.getAttribute('style') || '';
      const bgm = /background(?:-color)?\s*:\s*([^;]+)/i.exec(st);
      let bg = rgbToHex(td.getAttribute('bgcolor') || (bgm ? bgm[1].trim() : ''));
      if (WHITE.has(bg)) bg = '';
      const al = /text-align\s*:\s*(left|center|right)/i.exec(st)?.[1] || td.getAttribute('align') || '';
      const text = td.textContent.replace(/\s+/g, ' ').trim();
      row.push({ h: esc(text), bg, al: /^(left|center|right)$/.test(al) ? al : '' });
      const span = Math.min(parseInt(td.getAttribute('colspan') || '1', 10) || 1, 20);
      for (let k = 1; k < span; k++) row.push({ h: '', bg, al: '' });
    }
    if (row.length) rows.push(row);
  }
  return rows.length ? normalizeRows(rows) : null;
}

export function parseTsv(text) {
  if (!/\t/.test(text) && !/\n.*\n/.test(text.trim())) return null;
  if (!/\t/.test(text)) return null;
  const rows = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((l) => l.split('\t').map((c) => ({ h: esc(c.replace(/^"|"$/g, '').trim()), bg: '', al: '' })));
  return rows.length ? normalizeRows(rows) : null;
}

function normalizeRows(rows) {
  rows = rows.slice(0, 60);
  const n = Math.min(20, Math.max(...rows.map((r) => r.length)));
  return rows.map((r) => { const x = r.slice(0, n); while (x.length < n) x.push({ h: '', bg: '', al: '' }); return x; });
}

export const blankCell = () => ({ h: '', bg: '', al: '' });
export const blankTable = (r = 4, c = 3) => Array.from({ length: r }, () => Array.from({ length: c }, blankCell));

/** Limpia texto pegado desde Word/PowerPoint: sólo texto plano en párrafos. */
export const plainToHtml = (t) => esc(t.replace(/\r/g, '').trim()).split(/\n/).join('<br>');
export { sanitizeHtml };
