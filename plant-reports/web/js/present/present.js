import { h } from '../util.js';
import { renderSlide, mountScaled, lazyThumb } from '../slide/render.js';

/**
 * items: [{ slide, ctx }]. Pantalla completa; ←/→/clic avanzan, Esc sale, N notas, G miniaturas.
 */
export function present(items, { start = 0, onExit } = {}) {
  let i = Math.min(Math.max(start, 0), items.length - 1);
  let scaled = null, notesOn = false, gridOn = false;
  const stage = h('div', { class: 'pr-stage' });
  const prog = h('div', { class: 'pr-prog' }, h('div'));
  const notes = h('div', { class: 'pr-notes', hidden: true });
  const grid = h('div', { class: 'pr-grid', hidden: true });
  const ov = h('div', { class: 'pr-ov', tabindex: '-1', onclick: (e) => { if (e.target.closest('.pr-grid')) return; e.clientX < innerWidth * 0.25 ? go(i - 1) : go(i + 1); } }, stage, prog, notes, grid);
  document.body.append(ov);
  ov.focus();
  ov.requestFullscreen?.().catch(() => {});

  function show() {
    scaled?.ro?.disconnect();
    stage.innerHTML = '';
    const it = items[i];
    scaled = mountScaled(stage, renderSlide(it.slide, { ...it.ctx, lazy: false }));
    prog.firstChild.style.width = ((i + 1) / items.length) * 100 + '%';
    notes.textContent = it.slide.notes || '(sin notas)';
  }
  function go(n) { if (n < 0 || n >= items.length) return; i = n; show(); }
  function buildGrid() {
    grid.innerHTML = '';
    items.forEach((it, n) => grid.append(h('div', { class: 'pr-g' + (n === i ? ' cur' : ''), onclick: (e) => { e.stopPropagation(); i = n; gridOn = false; grid.hidden = true; show(); } },
      lazyThumb(240, () => renderSlide(it.slide, { ...it.ctx, lazy: true })), h('small', {}, `${n + 1}`))));
  }
  function exit() {
    document.removeEventListener('keydown', key, true);
    document.removeEventListener('fullscreenchange', fs);
    scaled?.ro?.disconnect();
    ov.remove();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onExit?.();
  }
  function key(e) {
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) go(i + 1);
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) go(i - 1);
    else if (k === 'Home') go(0);
    else if (k === 'End') go(items.length - 1);
    else if (k === 'Escape') { if (gridOn) { gridOn = false; grid.hidden = true; } else exit(); }
    else if (k === 'n' || k === 'N') { notesOn = !notesOn; notes.hidden = !notesOn; }
    else if (k === 'g' || k === 'G') { gridOn = !gridOn; if (gridOn) buildGrid(); grid.hidden = !gridOn; }
    else return;
    e.preventDefault(); e.stopPropagation();
  }
  const fs = () => { if (!document.fullscreenElement && document.body.contains(ov) && ov._wasFs) exit(); ov._wasFs = !!document.fullscreenElement; };
  document.addEventListener('keydown', key, true);
  document.addEventListener('fullscreenchange', fs);
  show();
  return { exit };
}
