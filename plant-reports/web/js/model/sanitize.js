// Saneado y normalización de informes. Módulo puro (sin DOM): lo usan el navegador y las funciones.
import { KPI_KEYS } from './seed.js';

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'ul', 'ol', 'li', 'span']);
const VOID = new Set(['br']);
const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ENTITY_FIX = /&(?!(?:#\d{1,6}|#x[0-9a-f]{1,6}|[a-z]{2,10});)/gi;

function toHex(v) {
  v = String(v).trim().toLowerCase();
  let m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return '#' + m[1];
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  if (m) return '#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
  m = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(v);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
  return null;
}
export const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

function cleanStyle(style) {
  const out = [];
  for (const decl of String(style).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim().toLowerCase();
    const v = decl.slice(i + 1).trim().toLowerCase();
    if (k === 'color') { const x = toHex(v); if (x) out.push('color:' + x); }
    else if (k === 'font-size') { const m = /^(\d{1,2})px$/.exec(v); if (m && +m[1] >= 8 && +m[1] <= 72) out.push('font-size:' + m[1] + 'px'); }
    else if (k === 'text-align' && /^(left|center|right)$/.test(v)) out.push('text-align:' + v);
    else if (k === 'font-weight' && /^(bold|700|600|normal)$/.test(v)) out.push('font-weight:' + v);
    else if (k === 'font-style' && /^(italic|normal)$/.test(v)) out.push('font-style:' + v);
    else if (k === 'text-decoration' && /^(underline|none)$/.test(v)) out.push('text-decoration:' + v);
  }
  return out.join(';');
}

const escText = (t) => t.replace(ENTITY_FIX, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lista blanca de etiquetas y estilos. Todo lo demás se descarta. */
export function sanitizeHtml(input, maxLen = 20000) {
  let s = String(input ?? '').slice(0, maxLen * 2);
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '');
  let out = '';
  let last = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(s))) {
    out += escText(s.slice(last, m.index));
    last = m.index + m[0].length;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (!ALLOWED.has(tag)) continue;
    if (closing) { if (!VOID.has(tag)) out += `</${tag}>`; continue; }
    let style = '';
    const sm = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[3]);
    if (sm) style = cleanStyle(sm[1] ?? sm[2]);
    out += style && !VOID.has(tag) ? `<${tag} style="${style}">` : `<${tag}>`;
  }
  out += escText(s.slice(last));
  return out.slice(0, maxLen);
}

export const htmlToText = (html) => String(html ?? '').replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

// ---------- Normalización de informes ----------
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const ID_RE = /^[\w-]{1,24}$/;
export const HASH_RE = /^[a-f0-9]{64}$/;
const TYPES = new Set(['text', 'callout', 'image', 'table']);

function normBlock(b) {
  if (!b || typeof b !== 'object' || !TYPES.has(b.type)) return null;
  const c = b.content && typeof b.content === 'object' ? b.content : {};
  const out = {
    id: ID_RE.test(b.id) ? b.id : 'b' + Math.random().toString(36).slice(2, 8),
    type: b.type,
    x: num(b.x, -20, 100, 5), y: num(b.y, -20, 100, 15), w: num(b.w, 2, 120, 30), h: num(b.h, 2, 120, 30),
    content: {},
  };
  if (b.type === 'text' || b.type === 'callout') {
    out.content = {
      html: sanitizeHtml(c.html), size: num(c.size, 8, 96, b.type === 'callout' ? 18 : 22),
      color: isHex(c.color) ? c.color : null, align: /^(left|center|right)$/.test(c.align) ? c.align : 'left',
    };
    if (b.type === 'callout') out.content.title = str(c.title, 80) || 'Puntos a destacar';
  } else if (b.type === 'image') {
    out.content = { hash: HASH_RE.test(c.hash) ? c.hash : '', fit: c.fit === 'cover' ? 'cover' : 'contain', alt: str(c.alt, 200) };
  } else {
    const rows = (Array.isArray(c.rows) ? c.rows : []).slice(0, 60).map((r) =>
      (Array.isArray(r) ? r : []).slice(0, 20).map((cell) => ({
        h: sanitizeHtml(cell && cell.h, 2000),
        bg: isHex(cell && cell.bg) ? cell.bg : '',
        al: /^(left|center|right)$/.test(cell && cell.al) ? cell.al : '',
      })));
    const ncol = Math.max(1, ...rows.map((r) => r.length));
    for (const r of rows) while (r.length < ncol) r.push({ h: '', bg: '', al: '' });
    if (!rows.length) rows.push(Array.from({ length: ncol }, () => ({ h: '', bg: '', al: '' })));
    const colW = Array.isArray(c.colW) && c.colW.length === ncol ? c.colW.map((n) => num(n, 3, 90, 0)) : null;
    out.content = { rows, header: c.header !== false, fs: num(c.fs, 8, 40, 14), colW: colW && colW.every((n) => n > 0) ? colW : null };
  }
  return out;
}

function normSlide(s, sectionIds) {
  if (!s || typeof s !== 'object') return null;
  return {
    id: ID_RE.test(s.id) ? s.id : 's' + Math.random().toString(36).slice(2, 8),
    section: sectionIds.includes(s.section) ? s.section : 'otros',
    title: str(s.title, 200), layout: str(s.layout, 30), notes: str(s.notes, 4000),
    hidden: !!s.hidden, editedByAdmin: !!s.editedByAdmin,
    blocks: (Array.isArray(s.blocks) ? s.blocks : []).slice(0, 60).map(normBlock).filter(Boolean),
  };
}

export function normalizeReport(raw, sectionIds) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const slides = (Array.isArray(r.slides) ? r.slides : []).slice(0, 200).map((s) => normSlide(s, sectionIds)).filter(Boolean);
  const seen = new Set();
  for (const s of slides) { while (seen.has(s.id)) s.id += 'x'; seen.add(s.id); }
  slides.sort((a, b) => sectionIds.indexOf(a.section) - sectionIds.indexOf(b.section)); // estable
  const naSections = {};
  if (r.naSections && typeof r.naSections === 'object') {
    for (const id of sectionIds) if (typeof r.naSections[id] === 'string') naSections[id] = r.naSections[id].slice(0, 300);
  }
  const kpis = {};
  const k = r.kpis && typeof r.kpis === 'object' ? r.kpis : {};
  for (const { key } of KPI_KEYS) kpis[key] = k[key] === null || k[key] === '' || k[key] === undefined ? null : num(k[key], -1e6, 1e6, null);
  kpis.comentario = sanitizeHtml(k.comentario, 4000);
  return { slides, naSections, kpis };
}

export function blockIsEmpty(b) {
  const c = b.content || {};
  if (b.type === 'image') return !c.hash;
  if (b.type === 'table') return !(c.rows || []).some((r) => r.some((x) => htmlToText(x.h)));
  return !htmlToText(c.html);
}

/** 'na' | 'completa' | 'vacia' */
export function sectionStatus(report, sectionId) {
  if (report.naSections && report.naSections[sectionId] !== undefined) return 'na';
  const ok = (report.slides || []).some((s) => s.section === sectionId && !s.hidden && s.blocks.some((b) => !blockIsEmpty(b)));
  return ok ? 'completa' : 'vacia';
}

export function missingRequired(report, sections) {
  return sections.filter((s) => s.required && sectionStatus(report, s.id) === 'vacia');
}
