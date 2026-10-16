export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 8);
export const clone = (o) => JSON.parse(JSON.stringify(o));
export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  d.cancel = () => clearTimeout(t);
  return d;
}
export const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento local */ } };
export const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* idem */ } };
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR') : '—');

export function toast(msg, kind = 'info', ms = 3500) {
  const t = h('div', { class: 'toast ' + kind }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), ms);
}
export function modal({ title, body, buttons = [], wide = false }) {
  const close = () => ov.remove();
  const ov = h('div', { class: 'modal-ov', onmousedown: (e) => { if (e.target === ov) close(); } },
    h('div', { class: 'modal' + (wide ? ' wide' : '') },
      h('h3', {}, title), h('div', { class: 'modal-body' }, body),
      h('div', { class: 'modal-btns' }, buttons.map((b) => h('button', {
        class: 'btn ' + (b.cls || ''), onclick: async () => { if ((await b.onclick?.()) !== false) close(); },
      }, b.label)))));
  document.body.append(ov);
  ov.querySelector('input,textarea,select')?.focus();
  return { close, el: ov };
}
export const confirmBox = (title, msg, okLabel = 'Aceptar') => new Promise((res) => {
  modal({ title, body: h('p', {}, msg), buttons: [
    { label: 'Cancelar', onclick: () => res(false) }, { label: okLabel, cls: 'primary', onclick: () => res(true) }] });
});
export const promptBox = (title, label, value = '') => new Promise((res) => {
  const inp = h('input', { type: 'text', value, class: 'full' });
  modal({ title, body: h('label', {}, label, inp), buttons: [
    { label: 'Cancelar', onclick: () => res(null) }, { label: 'Aceptar', cls: 'primary', onclick: () => res(inp.value) }] });
});
