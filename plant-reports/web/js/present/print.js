import { h, modal } from '../util.js';
import { renderSlide } from '../slide/render.js';

/** Exporta a PDF usando la impresión del navegador (CSS @page 13.333x7.5 in). items: [{slide, ctx}] */
export function exportPdf(items, filename = 'informe') {
  const go = async () => {
    const root = document.getElementById('print-root');
    root.innerHTML = '';
    for (const it of items) root.append(h('div', { class: 'print-page' }, renderSlide(it.slide, { ...it.ctx, lazy: false })));
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    const old = document.title;
    document.title = filename;
    const done = () => { root.innerHTML = ''; document.title = old; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };
  modal({
    title: 'Exportar a PDF',
    body: h('div', {}, h('p', {}, `Se van a imprimir ${items.length} diapositivas. En la ventana de impresión del navegador elegí:`),
      h('ul', {}, h('li', {}, h('b', {}, 'Destino: '), 'Guardar como PDF'), h('li', {}, h('b', {}, 'Márgenes: '), 'Ninguno'), h('li', {}, h('b', {}, 'Más ajustes: '), 'activar "Gráficos de fondo"'),
        h('li', {}, 'Tamaño de papel y orientación se toman solos (16:9 horizontal).'))),
    buttons: [{ label: 'Cancelar' }, { label: 'Continuar', cls: 'primary', onclick: () => { go(); } }],
  });
}
