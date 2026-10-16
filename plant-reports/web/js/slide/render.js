import { h } from '../util.js';
import { sanitizeHtml } from '../model/sanitize.js';
import { imgUrl } from '../api.js';

export const W = 1280, H = 720;

/**
 * ctx: { cycleLabel, plantName, sectionName, page, total, edit, lazy, selectedId }
 * El mismo render se usa en editor, miniaturas, presentación y PDF.
 */
export function renderSlide(slide, ctx = {}) {
  const kind = slide.kind || 'content';
  const el = h('div', { class: 'slide kind-' + kind, 'data-sid': slide.id });
  if (kind === 'cover' || kind === 'end') {
    el.append(h('img', { class: 's-logo-big', src: 'assets/logo.png', alt: '' }),
      h('div', { class: 'cv-t' }, slide.title || ''), h('div', { class: 'cv-b' }), h('div', { class: 'cv-s' }, slide.subtitle || ''));
    return el;
  }
  const tag = [ctx.plantName, ctx.sectionName].filter(Boolean).join(' · ');
  el.append(h('div', { class: 's-bar' },
    h('div', { class: 's-title' }, slide.title || (ctx.edit ? 'Título de la diapositiva' : '')),
    tag && h('div', { class: 's-tag' }, tag),
    h('img', { class: 's-logo', src: 'assets/logo.png', alt: '' })));
  for (const b of slide.blocks || []) {
    const bl = renderBlock(b, ctx);
    if (bl) el.append(bl);
  }
  el.append(h('div', { class: 's-foot' }, h('span', {}, ctx.cycleLabel ? 'S&OP Ciclo: ' + ctx.cycleLabel : ''), h('span', {}, ctx.page ? (ctx.total ? `${ctx.page} / ${ctx.total}` : String(ctx.page)) : '')));
  return el;
}

function renderBlock(b, ctx) {
  const c = b.content || {};
  const el = h('div', { class: `blk blk-${b.type}`, 'data-id': b.id, style: `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%` });
  if (b.type === 'text' || b.type === 'callout') {
    const body = h('div', { class: 'blk-body', style: `font-size:${c.size || 22}px;${c.color ? 'color:' + c.color + ';' : ''}text-align:${c.align || 'left'}` });
    body.innerHTML = sanitizeHtml(c.html);
    if (b.type === 'callout') el.append(h('div', { class: 'co-h' }, c.title || 'Puntos a destacar'));
    el.append(body);
  } else if (b.type === 'image') {
    if (c.hash) el.append(h('img', { src: c.src || imgUrl(c.hash), alt: c.alt || '', loading: ctx.lazy ? 'lazy' : 'eager', decoding: 'async', style: `object-fit:${c.fit || 'contain'}` }));
    else if (ctx.edit) el.append(h('div', { class: 'ph' }, h('b', {}, '🖼 Imagen'), h('span', {}, 'Pegá con Ctrl+V, arrastrá un archivo acá o usá "Cargar imagen" en el panel derecho')));
    else return null;
  } else if (b.type === 'table') {
    const t = h('table', { class: (c.header !== false ? 'hdr ' : '') + (c.colW ? 'fixed' : ''), style: `font-size:${c.fs || 14}px` });
    if (c.colW) { const tot = c.colW.reduce((a, n) => a + n, 0); t.append(h('colgroup', {}, c.colW.map((n) => h('col', { style: `width:${(n / tot) * 100}%` })))); }
    (c.rows || []).forEach((r, ri) => t.append(h('tr', {}, r.map((cell, ci) => {
      const td = h('td', { style: `${cell.bg ? 'background:' + cell.bg + ';' : ''}${cell.al ? 'text-align:' + cell.al : ''}`, 'data-r': ri, 'data-c': ci });
      td.innerHTML = sanitizeHtml(cell.h, 2000);
      return td;
    }))));
    el.append(t);
  }
  return el;
}

/** Escala una diapositiva dentro de un contenedor. mode 'contain' (llena el contenedor) o 'width'. */
export function mountScaled(container, slideEl, mode = 'contain') {
  const wrap = h('div', { class: 'fit' });
  wrap.append(slideEl);
  container.append(wrap);
  const api = {
    scale: 1,
    wrap,
    refresh() {
      const cw = container.clientWidth, ch = container.clientHeight;
      const s = mode === 'width' ? cw / W : Math.min(cw / W, ch / H);
      if (!(s > 0)) return;
      api.scale = s;
      slideEl.style.transform = `scale(${s})`;
      wrap.style.width = W * s + 'px';
      wrap.style.height = H * s + 'px';
    },
  };
  api.refresh();
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => api.refresh()); ro.observe(container); api.ro = ro; }
  return api;
}

/** Miniatura que se renderiza sólo al entrar en pantalla (rendimiento con ~100 diapositivas). */
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); e.target._draw?.(); }
}, { rootMargin: '300px' }) : null;

export function lazyThumb(width, getSlideEl) {
  const box = h('div', { class: 'thumb', style: { width: width + 'px', height: (width * H) / W + 'px' } });
  box._draw = () => {
    box.innerHTML = '';
    const el = getSlideEl();
    el.style.transform = `scale(${width / W})`;
    box.append(el);
  };
  box._redraw = () => { if (box.firstChild) box._draw(); };
  io ? io.observe(box) : box._draw();
  return box;
}
