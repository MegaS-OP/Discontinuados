import { h, uid, clone, debounce, lsGet, lsSet, lsDel, toast, modal, confirmBox, promptBox, fmtDate } from '../util.js';
import { api, ApiError, auth, getConfig } from '../api.js';
import { renderSlide, mountScaled, lazyThumb, W, H } from '../slide/render.js';
import { sanitizeHtml, sectionStatus, missingRequired, blockIsEmpty, htmlToText } from '../model/sanitize.js';
import { KPI_KEYS } from '../model/seed.js';
import { kpiState, targetOf, buildKpiSlide, STATE_COLOR, STATE_NAME } from '../model/kpi.js';
import { TEMPLATES, CELL_COLORS } from '../model/seed.js';
import { prepareAndUpload, parseHtmlTable, parseTsv, blankTable, blankCell, plainToHtml } from './media.js';
import { present } from '../present/present.js';
import { exportPdf } from '../present/print.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const DEFAULTS = {
  text: () => ({ html: '', size: 22, color: null, align: 'left' }),
  callout: () => ({ title: 'Puntos a destacar', html: '', size: 18, color: null, align: 'left' }),
  image: () => ({ hash: '', fit: 'contain', alt: '' }),
  table: () => ({ rows: blankTable(4, 3), header: true, fs: 14, colW: null }),
};
const BOX = { text: [5, 18, 50, 30], callout: [69, 14, 28, 74], image: [5, 16, 60, 70], table: [3, 16, 64, 60] };
const put = (el, ...kids) => el.append(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const isEditable = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export async function mountEditor(root, { cycleId, plantId, viewOnly = false, archive = false }) {
  const user = auth.get();
  viewOnly = viewOnly || archive;
  const [res, cfg] = await Promise.all([api(`/api/${archive ? 'archive' : 'report'}?cycle=${cycleId}&plant=${plantId}`), getConfig()]);
  const { cycle } = res;
  const plant = cfg.plants.find((p) => p.id === plantId);
  const sections = cfg.sections;
  const isAdmin = user.role === 'admin';
  const ownPlant = isAdmin || (user.plantId === plantId && user.perm === 'editor');

  const S = {
    slides: res.report.slides || [], na: res.report.naSections || {}, kpis: res.report.kpis || {},
    version: res.report.version || 0, status: res.report.status || 'borrador', submittedAt: res.report.submittedAt,
    cur: null, sel: null, cell: null, undo: [], redo: [], dirty: false, editing: null, saving: false, conflict: false, clip: null,
  };
  let canEdit = res.canEdit && !viewOnly;
  const baseline = Object.fromEntries(S.slides.map((s) => [s.id, stripFlag(s)]));
  function stripFlag(s) { return JSON.stringify({ ...s, editedByAdmin: false }); }
  S.cur = S.slides[0]?.id || null;

  const bkKey = `sop.bk.${cycleId}.${plantId}`;
  const cleanups = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };

  // ---------- Estado / utilidades ----------
  const curSlide = () => S.slides.find((s) => s.id === S.cur) || null;
  const secOf = (id) => sections.find((s) => s.id === id);
  const findBlock = (id) => curSlide()?.blocks.find((b) => b.id === id);
  const selBlock = () => (S.sel ? findBlock(S.sel) : null);
  const snapshot = () => JSON.stringify({ slides: S.slides, na: S.na });
  const payload = () => ({ slides: S.slides, naSections: S.na, kpis: S.kpis });
  const slideCtx = (s, extra = {}) => ({
    cycleLabel: cycle.label, plantName: plant.shortName || plant.name, sectionName: secOf(s.section)?.name,
    page: S.slides.indexOf(s) + 1, total: S.slides.length, ...extra,
  });

  function pushUndo(snap = snapshot()) { S.undo.push(snap); if (S.undo.length > 100) S.undo.shift(); S.redo = []; syncTop(); }
  function restore(str) {
    const o = JSON.parse(str);
    S.slides = o.slides; S.na = o.na;
    if (!curSlide()) S.cur = S.slides[0]?.id || null;
    if (!selBlock()) S.sel = null;
    S.cell = null;
    renderAll(); changed(false);
  }
  const undo = () => { if (!S.undo.length || !canEdit) return; S.redo.push(snapshot()); restore(S.undo.pop()); };
  const redo = () => { if (!S.redo.length || !canEdit) return; S.undo.push(snapshot()); restore(S.redo.pop()); };

  const saveLater = debounce(() => save(), 3000);
  const backupLater = debounce(() => lsSet(bkKey, JSON.stringify({ base: S.version, at: Date.now(), data: payload() })), 400);
  function changed(thumb = true) {
    S.dirty = true;
    setStatus('Cambios sin guardar…');
    backupLater(); saveLater();
    if (thumb) refreshThumb();
    syncTop();
  }
  /** Aplica un cambio con deshacer; structural=true re-dibuja el navegador de diapositivas. */
  function mutate(fn, { structural = false, stage = true, props = true } = {}) {
    if (!canEdit) return;
    pushUndo();
    fn();
    changed(!structural);
    if (structural) renderNav();
    if (stage) renderStage();
    if (props) renderProps();
  }

  // ---------- Guardado ----------
  let retry = null;
  async function save() {
    if (!canEdit || S.saving || !S.dirty || S.conflict) return;
    S.saving = true; setStatus('Guardando…');
    if (isAdmin) for (const s of S.slides) if (!s.editedByAdmin && baseline[s.id] && baseline[s.id] !== stripFlag(s)) s.editedByAdmin = true;
    const sent = JSON.stringify(payload());
    try {
      const r = await api(`/api/report?cycle=${cycleId}&plant=${plantId}`, { method: 'PUT', body: { baseVersion: S.version, report: JSON.parse(sent) } });
      S.version = r.report.version; S.status = r.report.status;
      S.dirty = JSON.stringify(payload()) !== sent;
      if (!S.dirty) { lsDel(bkKey); setStatus('Guardado ✓ ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), 'ok'); } else saveLater();
    } catch (e) {
      if (e.status === 409) { S.conflict = true; showConflict(); setStatus('Conflicto de versión', 'bad'); }
      else if (e.status === 0) { setStatus('Sin conexión — se reintenta solo', 'bad'); clearTimeout(retry); retry = setTimeout(save, 10000); }
      else { setStatus('No se pudo guardar', 'bad'); toast(e.message, 'bad', 6000); }
    } finally { S.saving = false; }
  }
  on(window, 'online', () => save());
  on(window, 'beforeunload', (e) => { if (S.dirty && canEdit) { e.preventDefault(); e.returnValue = ''; } });

  function showConflict() {
    banner.innerHTML = '';
    banner.hidden = false;
    banner.className = 'banner bad';
    banner.append('⚠ Este informe se modificó desde otra pestaña o sesión. Tus cambios locales quedaron respaldados en este navegador. ',
      h('button', { class: 'btn small', onclick: () => { location.reload(); } }, 'Recargar la última versión'));
  }

  // ---------- Estructura de pantalla ----------
  const statusEl = h('span', { class: 'save-st' });
  const banner = h('div', { class: 'banner', hidden: true });
  const nav = h('div', { class: 'ed-nav' });
  const stageBox = h('div', { class: 'ed-stage-box' });
  const props = h('div', { class: 'ed-props' });
  const top = h('div', { class: 'ed-top' });
  const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => { for (const f of fileInput.files) await handleImageFile(f); fileInput.value = ''; } });
  root.append(h('div', { class: 'editor' }, top, banner, h('div', { class: 'ed-main' }, nav, h('div', { class: 'ed-stage' }, stageBox), props), fileInput));

  function setStatus(t, kind = '') { statusEl.textContent = t; statusEl.className = 'save-st ' + kind; }

  function syncTop() {
    top.innerHTML = '';
    const sent = S.status === 'enviado';
    put(top, [
      h('a', { class: 'btn small', href: isAdmin ? (archive ? '#/admin/archive' : '#/admin') : '#/' }, '← Volver'),
      h('div', { class: 'ed-title' }, h('b', {}, plant.name), ` · ${cycle.label}`, ' ', h('span', { class: 'chip ' + S.status }, archive ? 'Archivo' : sent ? 'Enviado' : cycle.status !== 'abierto' ? 'Ciclo ' + cycle.status : 'Borrador')),
      statusEl,
      h('span', { class: 'grow' }),
      canEdit && h('button', { class: 'btn small', title: 'Ctrl+Z', disabled: !S.undo.length, onclick: undo }, '↶ Deshacer'),
      canEdit && h('button', { class: 'btn small', title: 'Ctrl+Y', disabled: !S.redo.length, onclick: redo }, '↷ Rehacer'),
      h('button', { class: 'btn small', onclick: () => checklist(false) }, '☑ Secciones'),
      h('button', { class: 'btn small', onclick: kpiForm }, '📈 KPIs'),
      !archive && h('button', { class: 'btn small', onclick: versions }, '🕘 Versiones'),
      h('button', { class: 'btn small', onclick: () => exportPdf(visibleItems(), `${plant.shortName}-${cycle.label}`) }, '⬇ PDF'),
      h('button', { class: 'btn small', onclick: () => presentFrom(0) }, '▶ Presentar'),
      ownPlant && !sent && canEdit && h('button', { class: 'btn small primary', onclick: () => checklist(true) }, 'Enviar informe'),
      ownPlant && sent && (isAdmin || cycle.status === 'abierto') && !viewOnly && h('button', { class: 'btn small', onclick: reopen }, 'Reabrir'),
    ]);
    banner.hidden = !(sent || archive || (!canEdit && !S.conflict));
    if (!banner.hidden && !S.conflict) {
      banner.className = 'banner';
      banner.textContent = archive ? `Archivo de ${cycle.label}: copia congelada al cierre del ciclo${res.closedAt ? ' (' + fmtDate(res.closedAt) + ')' : ''}. Sólo lectura.` : sent ? `Informe enviado${S.submittedAt ? ' el ' + fmtDate(S.submittedAt) : ''}. Sólo lectura${isAdmin ? ' (como administrador igual podés editar)' : ''}.`
        : viewOnly ? 'Modo lectura.' : `Modo lectura (ciclo ${cycle.status}).`;
    }
  }

  const visibleItems = () => S.slides.filter((s) => !s.hidden).map((s) => ({ slide: s, ctx: slideCtx(s) }));
  function presentFrom(idx) {
    const s = curSlide();
    const items = visibleItems();
    const start = idx === -1 && s ? Math.max(0, items.findIndex((it) => it.slide === s)) : 0;
    present(items, { start });
  }

  // ---------- Navegador de diapositivas ----------
  const thumbs = new Map();
  function refreshThumb() {
    const t = thumbs.get(S.cur);
    if (t) t._redraw();
  }
  function renderNav() {
    nav.innerHTML = '';
    thumbs.clear();
    const rep = { slides: S.slides, naSections: S.na };
    for (const sec of sections) {
      const st = sectionStatus(rep, sec.id);
      const list = S.slides.filter((s) => s.section === sec.id);
      const head = h('div', { class: 'nav-sec', ondragover: (e) => { if (drag) e.preventDefault(); }, ondrop: (e) => { e.preventDefault(); moveSlide(drag, null, sec.id); } },
        h('span', { class: 'dot ' + st, title: st === 'completa' ? 'Completa' : st === 'na' ? 'No aplica' : 'Vacía' }),
        h('span', { class: 'nav-sec-n' }, sec.icon + ' ' + sec.name + (sec.required ? ' *' : '')),
        canEdit && h('button', { class: 'ib', title: 'Nueva diapositiva (plantilla típica)', onclick: () => addSlide(sec.id, sec.template) }, '＋'),
        canEdit && h('button', { class: 'ib', title: 'Elegir plantilla…', onclick: () => pickTemplate(sec) }, '▾'));
      nav.append(head);
      if (st === 'na') nav.append(h('div', { class: 'nav-na' }, 'No aplica: ' + S.na[sec.id]));
      for (const s of list) {
        const t = lazyThumb(164, () => renderSlide(s, slideCtx(s, { lazy: true })));
        thumbs.set(s.id, t);
        nav.append(h('div', {
          class: 'nav-item' + (s.id === S.cur ? ' cur' : '') + (s.hidden ? ' hid' : ''), draggable: canEdit ? 'true' : 'false', 'data-id': s.id,
          onclick: () => selectSlide(s.id),
          ondragstart: (e) => { drag = s.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); },
          ondragend: () => { drag = null; },
          ondragover: (e) => { if (drag && drag !== s.id) e.preventDefault(); },
          ondrop: (e) => { e.preventDefault(); e.stopPropagation(); moveSlide(drag, s.id); },
        }, h('span', { class: 'nav-n' }, S.slides.indexOf(s) + 1), t,
        h('div', { class: 'nav-t' }, s.title || '(sin título)', s.editedByAdmin && h('em', {}, ' · editado por admin'), isSame(s) && h('span', { class: 'same', title: 'Idéntica a la del mes anterior (' + prev.label + ')' }, '= mes anterior')),
        canEdit && h('div', { class: 'nav-act' },
          h('button', { class: 'ib', title: 'Duplicar', onclick: (e) => { e.stopPropagation(); dupSlide(s.id); } }, '⧉'),
          h('button', { class: 'ib', title: s.hidden ? 'Mostrar' : 'Ocultar en la presentación', onclick: (e) => { e.stopPropagation(); mutate(() => { s.hidden = !s.hidden; }, { structural: true }); } }, s.hidden ? '🚫' : '👁'),
          h('button', { class: 'ib', title: 'Eliminar', onclick: (e) => { e.stopPropagation(); delSlide(s.id); } }, '🗑'))));
      }
    }
    nav.querySelector('.nav-item.cur')?.scrollIntoView({ block: 'nearest' });
  }
  let drag = null;

  function selectSlide(id) {
    if (S.cur === id) return;
    endEditing();
    S.cur = id; S.sel = null; S.cell = null;
    nav.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('cur', n.dataset.id === id));
    renderStage(); renderProps();
  }
  function newSlide(secId, tpl) {
    const sec = secOf(secId);
    const t = TEMPLATES[tpl] || TEMPLATES.libre;
    return {
      id: uid('s'), section: secId, title: sec.name, layout: tpl, notes: '', hidden: false, editedByAdmin: false,
      blocks: t.blocks.map((b) => ({ id: uid('b'), type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, content: DEFAULTS[b.type]() })),
    };
  }
  function insertSorted(s) { // mantiene el orden por sección (estable)
    const order = sections.map((x) => x.id);
    let i = S.slides.length;
    while (i > 0 && order.indexOf(S.slides[i - 1].section) > order.indexOf(s.section)) i--;
    S.slides.splice(i, 0, s);
  }
  function addSlide(secId, tpl) {
    const s = newSlide(secId, tpl);
    mutate(() => { insertSorted(s); S.cur = s.id; S.sel = null; S.cell = null; }, { structural: true });
  }
  function pickTemplate(sec) {
    const m = modal({
      title: 'Nueva diapositiva en "' + sec.name + '"',
      body: h('div', { class: 'tpl-grid' }, Object.entries(TEMPLATES).map(([k, t]) => h('button', {
        class: 'tpl' + (k === sec.template ? ' rec' : ''), onclick: () => { m.close(); addSlide(sec.id, k); },
      }, h('div', { class: 'tpl-prev' }, t.blocks.map((b) => h('i', { class: b.type, style: `left:${b.x}%;top:${(b.y - 14) * 1.28}%;width:${b.w}%;height:${b.h * 1.28}%` }))), h('span', {}, t.name, k === sec.template ? ' ★' : '')))),
      buttons: [{ label: 'Cancelar' }],
    });
  }
  function dupSlide(id) {
    const s = S.slides.find((x) => x.id === id);
    const c = clone(s); c.id = uid('s'); c.title = s.title + ' (copia)'; c.editedByAdmin = false;
    c.blocks.forEach((b) => { b.id = uid('b'); });
    mutate(() => { S.slides.splice(S.slides.indexOf(s) + 1, 0, c); S.cur = c.id; S.sel = null; }, { structural: true });
  }
  async function delSlide(id) {
    if (!(await confirmBox('Eliminar diapositiva', '¿Eliminar esta diapositiva? Podés deshacerlo con Ctrl+Z.', 'Eliminar'))) return;
    mutate(() => {
      const i = S.slides.findIndex((x) => x.id === id);
      S.slides.splice(i, 1);
      if (S.cur === id) S.cur = (S.slides[i] || S.slides[i - 1])?.id || null;
      S.sel = null;
    }, { structural: true });
  }
  function moveSlide(id, beforeId, secId) {
    if (!id || id === beforeId) return;
    mutate(() => {
      const s = S.slides.find((x) => x.id === id);
      S.slides.splice(S.slides.indexOf(s), 1);
      if (beforeId) {
        const t = S.slides.find((x) => x.id === beforeId);
        s.section = t.section;
        S.slides.splice(S.slides.indexOf(t), 0, s);
      } else {
        s.section = secId;
        S.slides.splice(S.slides.length, 0, s);
        S.slides.sort((a, b) => sections.findIndex((x) => x.id === a.section) - sections.findIndex((x) => x.id === b.section));
      }
    }, { structural: true, stage: false });
    drag = null;
  }

  // ---------- Lienzo ----------
  let scaled = null;
  function renderStage() {
    scaled?.ro?.disconnect();
    stageBox.innerHTML = '';
    const s = curSlide();
    if (!s) {
      stageBox.append(h('div', { class: 'empty' }, h('p', {}, 'Este informe todavía no tiene diapositivas.'),
        canEdit && h('button', { class: 'btn primary', onclick: () => addSlide('kpis', 'imagen_texto') }, '＋ Crear la primera diapositiva')));
      scaled = null;
      return;
    }
    const el = renderSlide(s, slideCtx(s, { edit: true }));
    scaled = mountScaled(stageBox, el);
    decorate();
  }
  function decorate() {
    const s = curSlide();
    if (!s || !scaled) return;
    const el = scaled.wrap.firstChild;
    el.querySelectorAll('.sel,.cell-sel,.handle,.grip,.ovf').forEach((n) => { n.classList.remove('sel', 'cell-sel', 'ovf'); if (n.classList.contains('handle') || n.classList.contains('grip')) n.remove(); });
    for (const b of s.blocks) {
      const be = el.querySelector(`.blk[data-id="${b.id}"]`);
      if (!be) continue;
      const body = be.querySelector('.blk-body,table');
      if (body && (be.scrollHeight > be.clientHeight + 2)) be.classList.add('ovf');
      if (b.id !== S.sel) continue;
      be.classList.add('sel');
      if (canEdit) {
        be.append(h('div', { class: 'grip', title: 'Arrastrar para mover', 'data-mode': 'move' }, '✥'));
        for (const hd of HANDLES) be.append(h('div', { class: 'handle h-' + hd, 'data-mode': hd }));
      }
      if (b.type === 'table' && S.cell) {
        const r = rect();
        be.querySelectorAll('td').forEach((td) => {
          const rr = +td.dataset.r, cc = +td.dataset.c;
          if (rr >= r.r1 && rr <= r.r2 && cc >= r.c1 && cc <= r.c2) td.classList.add('cell-sel');
        });
      }
    }
  }
  const rect = () => {
    const c = S.cell;
    return { r1: Math.min(c.r1, c.r2), r2: Math.max(c.r1, c.r2), c1: Math.min(c.c1, c.c2), c2: Math.max(c.c1, c.c2) };
  };
  function setSel(id, keepCell = false) {
    if (S.sel !== id) { endEditing(); if (!keepCell) S.cell = null; }
    S.sel = id;
    decorate(); renderProps();
  }

  // Interacción con el mouse
  let act = null;
  on(stageBox, 'pointerdown', (e) => {
    if (e.button !== 0) return;
    const s = curSlide();
    if (!s) return;
    const mode = e.target.closest('.handle,.grip')?.dataset.mode;
    const be = e.target.closest('.blk');
    if (S.editing && be && be.contains(S.editing.el)) return;
    if (!be) { endEditing(); setSel(null); return; }
    const id = be.dataset.id;
    const b = findBlock(id);
    if (b.type === 'table' && !mode) { // seleccionar celdas
      const td = e.target.closest('td');
      if (S.editing && td === S.editing.el) return;
      if (td) {
        const r = +td.dataset.r, c = +td.dataset.c;
        endEditing();
        S.cell = e.shiftKey && S.cell && S.sel === id ? { ...S.cell, r2: r, c2: c } : { r1: r, c1: c, r2: r, c2: c };
        const same = S.sel === id;
        S.sel = id; decorate(); renderProps();
        if (!same) return;
        act = { type: 'cells', id, from: { r, c } };
        stageBox.setPointerCapture?.(e.pointerId);
        return;
      }
    }
    setSel(id, true);
    if (!canEdit) return;
    const m = mode || 'move';
    act = { type: 'box', mode: m, id, sx: e.clientX, sy: e.clientY, o: { x: b.x, y: b.y, w: b.w, h: b.h }, el: be, moved: false };
    stageBox.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  });
  on(stageBox, 'pointermove', (e) => {
    if (!act || !scaled) return;
    if (act.type === 'cells') {
      const td = document.elementFromPoint(e.clientX, e.clientY)?.closest('td');
      if (td && td.closest('.blk')?.dataset.id === act.id) { S.cell = { r1: act.from.r, c1: act.from.c, r2: +td.dataset.r, c2: +td.dataset.c }; decorate(); }
      return;
    }
    const k = scaled.scale;
    let dx = ((e.clientX - act.sx) / k / W) * 100, dy = ((e.clientY - act.sy) / k / H) * 100;
    if (!e.altKey) { dx = Math.round(dx); dy = Math.round(dy); }
    if (!dx && !dy && !act.moved) return;
    act.moved = true;
    const o = act.o;
    let { x, y, w, h: hh } = o;
    const m = act.mode;
    if (m === 'move') { x = o.x + dx; y = o.y + dy; }
    else {
      if (m.includes('e')) w = Math.max(3, o.w + dx);
      if (m.includes('s')) hh = Math.max(3, o.h + dy);
      if (m.includes('w')) { w = Math.max(3, o.w - dx); x = o.x + o.w - w; }
      if (m.includes('n')) { hh = Math.max(3, o.h - dy); y = o.y + o.h - hh; }
    }
    act.v = { x, y, w, h: hh };
    Object.assign(act.el.style, { left: x + '%', top: y + '%', width: w + '%', height: hh + '%' });
  });
  const endAct = () => {
    if (act?.type === 'box' && act.moved && act.v) {
      const { id, v } = act;
      mutate(() => Object.assign(findBlock(id), v), { stage: true, props: true });
      decorate();
    }
    act = null;
  };
  on(stageBox, 'pointerup', endAct);
  on(stageBox, 'pointercancel', endAct);

  on(stageBox, 'dblclick', (e) => {
    if (!canEdit) return;
    const t = document.elementFromPoint(e.clientX, e.clientY); // con pointer-capture, e.target es el contenedor
    const be = t?.closest('.blk');
    if (!be) return;
    const b = findBlock(be.dataset.id);
    if (b.type === 'text' || b.type === 'callout') startEdit(be, b);
    else if (b.type === 'table') { const td = t.closest('td'); if (td) startCellEdit(td, b); }
    else if (b.type === 'image') fileInput.click();
  });

  // Soltar archivos sobre el lienzo
  on(stageBox, 'dragover', (e) => { if (canEdit && e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); stageBox.classList.add('drop'); } });
  on(stageBox, 'dragleave', () => stageBox.classList.remove('drop'));
  on(stageBox, 'drop', async (e) => {
    stageBox.classList.remove('drop');
    if (!canEdit || !e.dataTransfer?.files?.length) return;
    e.preventDefault();
    const be = e.target.closest('.blk');
    if (be && findBlock(be.dataset.id)?.type === 'image') S.sel = be.dataset.id;
    for (const f of e.dataTransfer.files) await handleImageFile(f);
  });

  // ---------- Edición de texto ----------
  function placeCaretEnd(el) {
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function startEdit(be, b) {
    endEditing();
    const body = be.querySelector('.blk-body');
    body.contentEditable = 'true'; body.spellcheck = true;
    body.focus(); placeCaretEnd(body);
    S.editing = { el: body, kind: 'block', id: b.id, pre: snapshot() };
    body.addEventListener('paste', pastePlain);
    body.addEventListener('keydown', editKeys);
    body.addEventListener('blur', endEditing, { once: true });
    setSel(b.id, true);
  }
  function startCellEdit(td, b) {
    endEditing();
    td.contentEditable = 'true';
    td.focus(); placeCaretEnd(td);
    S.editing = { el: td, kind: 'cell', id: b.id, r: +td.dataset.r, c: +td.dataset.c, pre: snapshot() };
    td.addEventListener('paste', pastePlain);
    td.addEventListener('keydown', editKeys);
    td.addEventListener('blur', endEditing, { once: true });
  }
  function pastePlain(e) {
    e.preventDefault(); e.stopPropagation();
    const t = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, plainToHtml(t));
  }
  function editKeys(e) {
    e.stopPropagation();
    if (e.key === 'Escape') { e.target.blur(); return; }
    if (e.key === 'Tab' && S.editing?.kind === 'cell') {
      e.preventDefault();
      const { id, r, c } = S.editing;
      const b = findBlock(id);
      const ncol = b.content.rows[0].length;
      let nr = r, nc = c + (e.shiftKey ? -1 : 1);
      if (nc >= ncol) { nc = 0; nr++; } else if (nc < 0) { nc = ncol - 1; nr--; }
      e.target.blur();
      const td = scaled.wrap.querySelector(`.blk[data-id="${id}"] td[data-r="${nr}"][data-c="${nc}"]`);
      if (td) { S.cell = { r1: nr, c1: nc, r2: nr, c2: nc }; decorate(); startCellEdit(td, b); }
    }
  }
  function endEditing() {
    const ed = S.editing;
    if (!ed) return;
    S.editing = null;
    ed.el.removeEventListener('paste', pastePlain);
    ed.el.removeEventListener('keydown', editKeys);
    ed.el.contentEditable = 'false';
    const b = findBlock(ed.id);
    if (!b) return;
    const html = sanitizeHtml(ed.el.innerHTML, ed.kind === 'cell' ? 2000 : 20000);
    const cur = ed.kind === 'cell' ? b.content.rows[ed.r]?.[ed.c] : b.content;
    if (cur && html !== cur.html && html !== cur.h) {
      pushUndo(ed.pre);
      if (ed.kind === 'cell') cur.h = html; else cur.html = html;
      changed(true);
      renderNav();
    }
    if (ed.kind === 'block') ed.el.innerHTML = sanitizeHtml(b.content.html);
    decorate();
    renderProps();
  }

  // Formato del texto desde el panel derecho
  function fmt(cmd) {
    const b = selBlock();
    if (!b) return;
    const be = scaled.wrap.querySelector(`.blk[data-id="${b.id}"]`);
    const wasEditing = S.editing && be.contains(S.editing.el);
    if (!wasEditing) { startEdit(be, b); document.execCommand('selectAll'); }
    document.execCommand(cmd);
    if (!wasEditing) endEditing();
  }

  // ---------- Bloques ----------
  function addBlock(type, content, box) {
    const s = curSlide();
    if (!s) { toast('Primero creá una diapositiva.', 'bad'); return null; }
    const [x, y, w, hh] = box || BOX[type];
    const b = { id: uid('b'), type, x, y, w, h: hh, content: { ...DEFAULTS[type](), ...content } };
    mutate(() => { s.blocks.push(b); S.sel = b.id; S.cell = null; });
    return b;
  }
  /** Bloque donde "cae" un contenido pegado: el seleccionado o el primer bloque vacío del mismo tipo. */
  function targetBlock(type) {
    const s = curSlide();
    if (!s) return null;
    const sel = selBlock();
    if (sel && sel.type === type && (type === 'image' || blockIsEmpty(sel))) return sel;
    return s.blocks.find((b) => b.type === type && blockIsEmpty(b)) || null;
  }

  async function handleImageFile(file) {
    if (!canEdit) return;
    if (!curSlide()) addSlide('otros', 'libre');
    const bar = h('div', { class: 'prog' }, h('div'));
    const t = h('div', { class: 'toast info' }, `Subiendo ${file.name || 'imagen'}… `, bar);
    document.getElementById('toasts').append(t);
    try {
      const { hash, width, height } = await prepareAndUpload(file, (p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; });
      const tgt = targetBlock('image');
      if (tgt) mutate(() => { tgt.content.hash = hash; S.sel = tgt.id; });
      else {
        const aw = 94, ah = 74; // área útil en %
        const ratio = width / height, areaRatio = (aw * W) / (ah * H);
        let w = aw, hh = ah;
        if (ratio > areaRatio) hh = (aw * W) / ratio / H; else w = (ah * H * ratio) / W;
        addBlock('image', { hash }, [3 + (aw - w) / 2, 14 + (ah - hh) / 2, w, hh]);
      }
      toast('Imagen cargada ✓', 'ok', 1800);
      renderNav();
    } catch (e) { toast(e.message || 'No se pudo cargar la imagen', 'bad', 6000); } finally { t.remove(); }
  }

  function addTable(rows) {
    const tgt = targetBlock('table');
    const content = { rows, colW: null, header: true, fs: rows.length > 14 ? 11 : rows.length > 8 ? 13 : 15 };
    if (tgt) mutate(() => { Object.assign(tgt.content, content); S.sel = tgt.id; });
    else addBlock('table', content, [3, 16, 94, Math.min(76, 6 + rows.length * 5)]);
    renderNav();
  }

  on(document, 'paste', async (e) => {
    if (!canEdit || isEditable(e.target) || document.querySelector('.modal-ov')) return;
    const cd = e.clipboardData;
    const html = cd.getData('text/html'), text = cd.getData('text/plain');
    if (text === '__sopblock__' && S.clip) { e.preventDefault(); pasteBlock(); return; }
    const rows = (html && /<table/i.test(html) ? parseHtmlTable(html) : null) || parseTsv(text);
    if (rows) { e.preventDefault(); addTable(rows); return; }
    const imgs = [...cd.items].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile());
    if (imgs.length) { e.preventDefault(); for (const f of imgs) await handleImageFile(f); return; }
    if (text.trim() && curSlide()) { e.preventDefault(); addBlock('text', { html: plainToHtml(text) }); }
  });
  on(document, 'copy', (e) => {
    if (isEditable(e.target) || !selBlock() || getSelection().toString()) return;
    S.clip = clone(selBlock());
    e.clipboardData.setData('text/plain', '__sopblock__');
    e.preventDefault();
  });
  function pasteBlock() {
    const s = curSlide();
    if (!s || !S.clip) return;
    const b = clone(S.clip); b.id = uid('b'); b.x = Math.min(90, b.x + 2); b.y = Math.min(90, b.y + 3);
    mutate(() => { s.blocks.push(b); S.sel = b.id; });
  }
  function dupBlock() { const b = selBlock(); if (b) { S.clip = clone(b); pasteBlock(); } }
  function delBlock() {
    const s = curSlide(), b = selBlock();
    if (!s || !b) return;
    mutate(() => { s.blocks.splice(s.blocks.indexOf(b), 1); S.sel = null; S.cell = null; });
    renderNav();
  }

  on(document, 'keydown', (e) => {
    if (isEditable(e.target) || document.querySelector('.modal-ov') || document.querySelector('.pr-ov')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); dupBlock(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (canEdit && selBlock()) { e.preventDefault(); delBlock(); } }
    else if (e.key.startsWith('Arrow') && selBlock() && canEdit) {
      e.preventDefault();
      const b = selBlock(), st = e.shiftKey ? 5 : 1;
      const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      mutate(() => { b.x += d[0]; b.y += d[1]; });
    } else if (e.key === 'Escape') setSel(null);
    else if (e.key === 'PageDown') { const i = S.slides.findIndex((s) => s.id === S.cur); if (S.slides[i + 1]) selectSlide(S.slides[i + 1].id); }
    else if (e.key === 'PageUp') { const i = S.slides.findIndex((s) => s.id === S.cur); if (S.slides[i - 1]) selectSlide(S.slides[i - 1].id); }
  });

  // ---------- Panel de propiedades ----------
  const field = (label, el) => h('label', { class: 'fld' }, h('span', {}, label), el);
  const keepFocus = (fn) => ({ onmousedown: (e) => e.preventDefault(), onclick: fn });
  function renderProps() {
    props.innerHTML = '';
    const s = curSlide();
    if (!s) { put(props, h('p', { class: 'muted' }, 'Creá una diapositiva desde la columna izquierda (＋).')); return; }
    const dis = !canEdit;
    put(props, 
      h('h4', {}, 'Diapositiva'),
      field('Título', h('input', { type: 'text', value: s.title, disabled: dis, maxlength: 200, oninput: (e) => { s.title = e.target.value; scaled.wrap.querySelector('.s-title').textContent = e.target.value; changed(true); } })),
      field('Sección', (() => {
        const sel = h('select', { disabled: dis, onchange: () => mutate(() => { s.section = sel.value; S.slides.sort((a, b) => sections.findIndex((x) => x.id === a.section) - sections.findIndex((x) => x.id === b.section)); }, { structural: true }) },
          sections.map((x) => h('option', { value: x.id, selected: x.id === s.section }, x.name)));
        return sel;
      })()),
      field('Notas del orador (no se exportan)', h('textarea', { rows: 3, disabled: dis, maxlength: 4000, oninput: (e) => { s.notes = e.target.value; changed(false); } }, s.notes)),
      canEdit && h('div', { class: 'add-row' },
        h('b', {}, 'Agregar:'),
        h('button', { class: 'btn small', onclick: () => addBlock('text') }, 'T Texto'),
        h('button', { class: 'btn small', onclick: () => addBlock('callout') }, '💬 Puntos a destacar'),
        h('button', { class: 'btn small', onclick: () => addBlock('image') }, '🖼 Imagen'),
        h('button', { class: 'btn small', onclick: () => addBlock('table') }, '▦ Tabla')),
      canEdit && h('p', { class: 'hint' }, 'Tip: pegá con Ctrl+V capturas, tablas de Excel o texto; o arrastrá archivos al lienzo.'));
    const b = selBlock();
    if (!b) return;
    put(props, h('hr'), h('h4', {}, { text: 'Bloque de texto', callout: 'Puntos a destacar', image: 'Imagen', table: 'Tabla' }[b.type]));
    if (b.type === 'text' || b.type === 'callout') textProps(b);
    if (b.type === 'image') imageProps(b);
    if (b.type === 'table') tableProps(b);
    if (canEdit) put(props, h('div', { class: 'add-row' },
      h('button', { class: 'btn small', title: 'Traer al frente', onclick: () => mutate(() => { const a = curSlide().blocks; a.push(a.splice(a.indexOf(b), 1)[0]); }) }, '↑ Al frente'),
      h('button', { class: 'btn small', title: 'Enviar atrás', onclick: () => mutate(() => { const a = curSlide().blocks; a.unshift(a.splice(a.indexOf(b), 1)[0]); }) }, '↓ Atrás'),
      h('button', { class: 'btn small', onclick: dupBlock }, '⧉ Duplicar'),
      h('button', { class: 'btn small bad', onclick: delBlock }, '🗑 Eliminar')));
  }
  // Los campos de texto del panel dejan un punto de deshacer al abandonarlos si cambiaron.
  let pendingUndo = null;
  on(props, 'focusin', (e) => { if (e.target.matches('input[type=text],textarea')) pendingUndo = snapshot(); });
  on(props, 'focusout', () => { if (pendingUndo && pendingUndo !== snapshot()) pushUndo(pendingUndo); pendingUndo = null; });

  function textProps(b) {
    const c = b.content, dis = !canEdit;
    put(props, 
      h('div', { class: 'tb' },
        h('button', { class: 'btn small', disabled: dis, title: 'Negrita', ...keepFocus(() => fmt('bold')) }, h('b', {}, 'B')),
        h('button', { class: 'btn small', disabled: dis, title: 'Cursiva', ...keepFocus(() => fmt('italic')) }, h('i', {}, 'I')),
        h('button', { class: 'btn small', disabled: dis, title: 'Subrayado', ...keepFocus(() => fmt('underline')) }, h('u', {}, 'U')),
        h('button', { class: 'btn small', disabled: dis, title: 'Lista con viñetas', ...keepFocus(() => fmt('insertUnorderedList')) }, '• Lista'),
        h('button', { class: 'btn small', disabled: dis, title: 'Lista numerada', ...keepFocus(() => fmt('insertOrderedList')) }, '1. Lista')),
      b.type === 'callout' && field('Título del cuadro', h('input', { type: 'text', value: c.title, disabled: dis, maxlength: 80, oninput: (e) => { c.title = e.target.value; scaled.wrap.querySelector(`.blk[data-id="${b.id}"] .co-h`).textContent = e.target.value; changed(true); } })),
      field('Tamaño de letra', h('select', { disabled: dis, onchange: (e) => mutate(() => { c.size = +e.target.value; }) }, [12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48, 60].map((n) => h('option', { value: n, selected: n === c.size }, n + ' px')))),
      field('Alineación', h('select', { disabled: dis, onchange: (e) => mutate(() => { c.align = e.target.value; }) }, [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']].map(([v, n]) => h('option', { value: v, selected: v === c.align }, n)))),
      field('Color del texto', swatches(['#000000', '#00886d', '#00a650', '#01557a', '#e0a100', '#d64545', '#575e69'], c.color, (v) => mutate(() => { c.color = v; }))),
      h('p', { class: 'hint' }, 'Doble clic en el bloque para escribir. Al pegar texto se limpia el formato.'));
  }
  function swatches(list, cur, fn) {
    return h('div', { class: 'sw' }, list.map((v) => h('button', { class: 'swb' + (v === cur ? ' on' : ''), style: `background:${v}`, title: v, disabled: !canEdit, onclick: () => fn(v) })),
      h('button', { class: 'swb none', title: 'Sin color', disabled: !canEdit, onclick: () => fn(null) }, '∅'));
  }
  function imageProps(b) {
    const c = b.content;
    put(props, 
      canEdit && h('button', { class: 'btn primary', onclick: () => { S.sel = b.id; fileInput.click(); } }, c.hash ? '🔄 Reemplazar imagen' : '⬆ Cargar imagen'),
      field('Ajuste', h('select', { disabled: !canEdit, onchange: (e) => mutate(() => { c.fit = e.target.value; }) }, [['contain', 'Mostrar completa'], ['cover', 'Rellenar (recorta)']].map(([v, n]) => h('option', { value: v, selected: v === c.fit }, n)))),
      field('Texto alternativo', h('input', { type: 'text', value: c.alt, disabled: !canEdit, maxlength: 200, oninput: (e) => { c.alt = e.target.value; changed(false); } })),
      h('p', { class: 'hint' }, 'La imagen se comprime en tu navegador (máx. 1920 px) antes de subirse.'));
  }

  function tableProps(b) {
    const c = b.content, dis = !canEdit;
    const r = S.cell ? rect() : null;
    const nrow = c.rows.length, ncol = c.rows[0].length;
    const clamp = () => { if (S.cell) { for (const k of ['r1', 'r2']) S.cell[k] = Math.min(S.cell[k], c.rows.length - 1); for (const k of ['c1', 'c2']) S.cell[k] = Math.min(S.cell[k], c.rows[0].length - 1); } };
    const rowOp = (fn) => mutate(() => { fn(); c.colW = c.colW && c.colW.length === c.rows[0].length ? c.colW : null; clamp(); });
    const btn = (label, fn, title) => h('button', { class: 'btn small', disabled: dis, title, onclick: fn }, label);
    put(props, 
      h('div', { class: 'tb' },
        btn('＋ Fila ↑', () => rowOp(() => c.rows.splice(r ? r.r1 : 0, 0, c.rows[0].map(blankCell))), 'Insertar fila arriba de la celda activa'),
        btn('＋ Fila ↓', () => rowOp(() => c.rows.splice(r ? r.r2 + 1 : nrow, 0, c.rows[0].map(blankCell))), 'Insertar fila debajo'),
        btn('− Fila', () => nrow > 1 && rowOp(() => c.rows.splice(r ? r.r1 : nrow - 1, r ? r.r2 - r.r1 + 1 : 1)), 'Quitar fila(s) seleccionada(s)')),
      h('div', { class: 'tb' },
        btn('＋ Col ←', () => rowOp(() => { c.colW = null; c.rows.forEach((row) => row.splice(r ? r.c1 : 0, 0, blankCell())); }), 'Insertar columna a la izquierda'),
        btn('＋ Col →', () => rowOp(() => { c.colW = null; c.rows.forEach((row) => row.splice(r ? r.c2 + 1 : ncol, 0, blankCell())); }), 'Insertar columna a la derecha'),
        btn('− Col', () => ncol > 1 && rowOp(() => { c.colW = null; c.rows.forEach((row) => row.splice(r ? r.c1 : ncol - 1, r ? r.c2 - r.c1 + 1 : 1)); }), 'Quitar columna(s)')),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: c.header, disabled: dis, onchange: (e) => mutate(() => { c.header = e.target.checked; }) }), ' Primera fila como encabezado'),
      field('Tamaño de letra de la tabla', h('select', { disabled: dis, onchange: (e) => mutate(() => { c.fs = +e.target.value; }) }, [9, 10, 11, 12, 13, 14, 16, 18, 20, 24].map((n) => h('option', { value: n, selected: n === c.fs }, n + ' px')))),
      h('div', { class: 'fld' }, h('span', {}, r ? `Color de celda (${(r.r2 - r.r1 + 1) * (r.c2 - r.c1 + 1)} seleccionada/s)` : 'Seleccioná una celda con un clic (Shift o arrastre para varias)'),
        h('div', { class: 'sw' }, CELL_COLORS.map((k) => h('button', { class: 'swb', style: `background:${k.hex}`, title: k.name + ' (semáforo)', disabled: dis || !r, onclick: () => cellsDo((cell) => { cell.bg = k.hex; }) })),
          h('button', { class: 'swb none', title: 'Sin color', disabled: dis || !r, onclick: () => cellsDo((cell) => { cell.bg = ''; }) }, '∅'),
          h('input', { type: 'color', disabled: dis || !r, title: 'Color personalizado', onchange: (e) => cellsDo((cell) => { cell.bg = e.target.value; }) }))),
      h('div', { class: 'tb' }, ['left', 'center', 'right'].map((a) => h('button', { class: 'btn small', disabled: dis || !r, title: 'Alinear ' + a, onclick: () => cellsDo((cell) => { cell.al = a; }) }, { left: '⬅', center: '↔', right: '➡' }[a]))),
      r && field(`Ancho de la columna ${r.c1 + 1} (%)`, h('input', { type: 'number', min: 3, max: 90, disabled: dis, value: c.colW ? c.colW[r.c1] : Math.round(100 / ncol), onchange: (e) => mutate(() => { c.colW = c.colW || Array(ncol).fill(100 / ncol); c.colW[r.c1] = Math.max(3, +e.target.value || 10); }) })),
      c.colW && canEdit && btn('Anchos automáticos', () => mutate(() => { c.colW = null; })),
      h('p', { class: 'hint' }, 'Doble clic en una celda para escribir (Tab pasa a la siguiente). Pegá una tabla de Excel con Ctrl+V.'));
    function cellsDo(fn) {
      if (!S.cell) return;
      const q = rect();
      mutate(() => { for (let i = q.r1; i <= q.r2; i++) for (let j = q.c1; j <= q.c2; j++) fn(c.rows[i][j]); });
    }
  }

  // ---------- Secciones / envío ----------
  function checklist(forSubmit) {
    const rep = { slides: S.slides, naSections: S.na };
    const draw = () => {
      body.innerHTML = '';
      const miss = missingRequired({ slides: S.slides, naSections: S.na }, sections);
      for (const sec of sections) {
        const st = sectionStatus(rep, sec.id);
        body.append(h('div', { class: 'ck-row' },
          h('span', { class: 'dot ' + st }), h('span', { class: 'grow' }, sec.icon + ' ' + sec.name, sec.required ? h('em', {}, ' (obligatoria)') : ''),
          h('span', { class: 'chip ' + st }, { completa: 'Completa', vacia: 'Vacía', na: 'No aplica' }[st]),
          canEdit && (st === 'na'
            ? h('button', { class: 'btn small', onclick: () => { mutate(() => { delete S.na[sec.id]; }, { structural: true, stage: false }); draw(); } }, 'Quitar "No aplica"')
            : st === 'vacia' && h('button', { class: 'btn small', onclick: async () => {
              const why = await promptBox('No aplica este mes', 'Motivo (aparece en el tablero del administrador):');
              if (why !== null) { mutate(() => { S.na[sec.id] = why.trim() || 'Sin novedades'; }, { structural: true, stage: false }); draw(); }
            } }, 'No aplica'))));
      }
      const same = S.slides.filter((x) => !x.hidden && isSame(x));
      if (same.length) body.append(h('p', { class: 'warn' }, `${same.length} diapositiva(s) son idénticas a las de ${prev.label}: ${same.map((x) => '“' + (x.title || 'sin título') + '”').join(', ')}. Revisá que no haya cifras o fechas desactualizadas.`));
      if (forSubmit) body.append(miss.length ? h('p', { class: 'warn' }, 'Faltan secciones obligatorias: ' + miss.map((x) => x.name).join(', ') + '. Completalas o marcalas como "No aplica".') : h('p', { class: 'okmsg' }, 'Todas las secciones obligatorias están completas.'));
    };
    const body = h('div', { class: 'ck' });
    const m = modal({
      title: forSubmit ? 'Enviar informe' : 'Estado de las secciones', body, wide: true,
      buttons: forSubmit ? [{ label: 'Cancelar' }, { label: 'Enviar informe', cls: 'primary', onclick: async () => {
        if (missingRequired({ slides: S.slides, naSections: S.na }, sections).length) { toast('Faltan secciones obligatorias.', 'bad'); return false; }
        return submit();
      } }] : [{ label: 'Cerrar', cls: 'primary' }],
    });
    draw();
    return m;
  }
  async function submit() {
    S.dirty = true; saveLater.cancel();
    S.conflict = false;
    await save();
    if (S.dirty) { toast('No se pudo guardar antes de enviar. Revisá la conexión.', 'bad'); return false; }
    try {
      const r = await api(`/api/report?cycle=${cycleId}&plant=${plantId}&action=submit`, { method: 'POST' });
      S.version = r.report.version; S.status = 'enviado'; S.submittedAt = r.report.submittedAt;
      if (!isAdmin) canEdit = false;
      toast('Informe enviado ✓', 'ok');
      renderAll();
    } catch (e) { toast(e.message, 'bad', 7000); return false; }
  }
  async function reopen() {
    if (!(await confirmBox('Reabrir informe', 'El informe vuelve a borrador y podrás editarlo de nuevo.', 'Reabrir'))) return;
    try {
      const r = await api(`/api/report?cycle=${cycleId}&plant=${plantId}&action=reopen`, { method: 'POST' });
      S.version = r.report.version; S.status = 'borrador';
      canEdit = !viewOnly && (isAdmin || cycle.status === 'abierto');
      renderAll();
    } catch (e) { toast(e.message, 'bad'); }
  }

  // ---------- Contenido sin cambios vs. el mes anterior ----------
  let prev = null; // { label, fps:Set }
  const fpOf = (sl) => (sl.blocks.some((b) => !blockIsEmpty(b)) ? JSON.stringify(sl.blocks.map((b) => [b.type, b.content])) : null);
  const isSame = (sl) => { const f = prev && fpOf(sl); return !!f && prev.fps.has(f); };

  // ---------- KPIs estructurados ----------
  function kpiForm() {
    const targets = plant.kpiTargets || {};
    const inputs = {}, dots = {};
    const dot = (def) => { const st = kpiState(def, inputs[def.key].value === '' ? null : inputs[def.key].value, targetOf(plant, def.key)); dots[def.key].style.background = st ? STATE_COLOR[st] : '#eee'; dots[def.key].title = st ? STATE_NAME[st] : 'Sin dato'; dots[def.key].textContent = st ? { ok: '✔', warn: '!', bad: '✖' }[st] : ''; };
    const rowsEl = KPI_KEYS.map((def) => {
      inputs[def.key] = h('input', { type: 'number', step: '0.1', id: 'kpi-' + def.key, disabled: !canEdit, value: S.kpis[def.key] ?? '', oninput: () => dot(def) });
      dots[def.key] = h('span', { class: 'kdot' });
      const t = targets[def.key];
      return h('tr', {}, h('td', {}, def.name), h('td', {}, inputs[def.key], ' %'), h('td', { class: 'muted' }, t === null || t === undefined ? '—' : (def.dir === 'min' ? '≥ ' : '≤ ') + t + ' %'), h('td', {}, dots[def.key]));
    });
    const com = h('textarea', { rows: 5, id: 'kpi-com', disabled: !canEdit, placeholder: 'Una línea por punto a destacar…' }, htmlToText((S.kpis.comentario || '').replace(/<\/li>/g, '\n')));
    const read = () => {
      const k = { ...S.kpis };
      for (const def of KPI_KEYS) k[def.key] = inputs[def.key].value === '' ? null : Number(inputs[def.key].value);
      const lines = com.value.split('\n').map((x) => x.trim()).filter(Boolean);
      k.comentario = lines.length ? '<ul>' + lines.map((l) => '<li>' + sanitizeHtml(l.replace(/</g, '&lt;')) + '</li>').join('') + '</ul>' : '';
      return k;
    };
    const apply = (gen) => {
      const k = read();
      if (!gen) { pushUndo(); S.kpis = k; changed(false); return; }
      const ex = S.slides.find((x) => x.layout === 'kpi_auto');
      const ns = buildKpiSlide(k, plant, ex?.id);
      mutate(() => {
        S.kpis = k;
        if (ex) S.slides[S.slides.indexOf(ex)] = { ...ns, hidden: ex.hidden, notes: ex.notes, title: ex.title };
        else insertSorted(ns);
        S.cur = ns.id; S.sel = null;
      }, { structural: true });
    };
    modal({ title: 'KPIs del mes · ' + plant.name, wide: true,
      body: h('div', {}, h('table', { class: 'tbl kpitbl' }, h('thead', {}, h('tr', {}, ['KPI', 'Valor del mes', 'Meta', ''].map((t) => h('th', {}, t)))), h('tbody', {}, rowsEl)),
        h('label', {}, 'Puntos a destacar', com), h('p', { class: 'hint' }, 'El semáforo compara con la meta de tu planta. "Guardar y generar diapositiva" arma (o actualiza) la diapositiva de KPIs con una tabla editable; el comparativo entre plantas del consolidado sale de estos valores.')),
      buttons: canEdit ? [{ label: 'Cancelar' }, { label: 'Guardar', onclick: () => apply(false) }, { label: 'Guardar y generar diapositiva', cls: 'primary', onclick: () => apply(true) }] : [{ label: 'Cerrar', cls: 'primary' }] });
    KPI_KEYS.forEach(dot);
  }

  // ---------- Historial de versiones ----------
  async function versions() {
    let list;
    try { list = (await api(`/api/history?cycle=${cycleId}&plant=${plantId}`)).versions; } catch (e) { toast(e.message, 'bad'); return; }
    const m = modal({ title: 'Versiones del informe', wide: true,
      body: list.length ? h('div', { class: 'ck' }, list.map((v) => h('div', { class: 'ck-row' },
        h('b', {}, 'v' + v.version), h('span', { class: 'grow' }, `${v.event} · ${fmtDate(v.at)} · ${v.by} · ${v.slides} diapositivas`),
        h('button', { class: 'btn small', onclick: async () => {
          try { const snap = await api(`/api/history?cycle=${cycleId}&plant=${plantId}&version=${v.version}`); const sl = snap.slides.filter((x) => !x.hidden); if (!sl.length) return toast('Esa versión no tiene diapositivas.', 'bad'); m.close(); present(sl.map((x, i) => ({ slide: x, ctx: slideCtx(x, { page: i + 1, total: sl.length }) }))); } catch (e) { toast(e.message, 'bad'); }
        } }, '▶ Ver'),
        canEdit && h('button', { class: 'btn small', onclick: async () => {
          if (!(await confirmBox('Restaurar versión', `El informe vuelve a la versión v${v.version}. La versión actual queda guardada en el historial.`, 'Restaurar'))) return;
          try { saveLater.cancel(); S.dirty = true; await save(); await api(`/api/history?cycle=${cycleId}&plant=${plantId}&version=${v.version}&action=restore`, { method: 'POST' }); lsDel(bkKey); toast('Versión restaurada ✓', 'ok'); location.reload(); } catch (e) { toast(e.message, 'bad', 6000); }
        } }, 'Restaurar')))) : h('p', {}, 'Todavía no hay versiones guardadas. Se guardan automáticamente al enviar, reabrir y cada ~10 minutos de edición.'),
      buttons: [{ label: 'Cerrar', cls: 'primary' }] });
  }

  function renderAll() { syncTop(); renderNav(); renderStage(); renderProps(); }

  // ---------- Recuperación de respaldo local ----------
  renderAll();
  setStatus(canEdit ? 'Guardado' : 'Sólo lectura');
  if (canEdit && !archive) {
    api(`/api/report?cycle=${cycleId}&plant=${plantId}&prev=1`).then(({ prev: p }) => {
      if (!p) return;
      prev = { label: p.label, fps: new Set(p.slides.map(fpOf).filter(Boolean)) };
      renderNav();
    }).catch(() => {});
  }
  try {
    const bk = JSON.parse(lsGet(bkKey) || 'null');
    if (bk && canEdit && bk.base === S.version && JSON.stringify(bk.data.slides) !== JSON.stringify(S.slides)) {
      modal({
        title: 'Recuperar cambios sin guardar',
        body: h('p', {}, `Hay una copia de respaldo de ${new Date(bk.at).toLocaleString('es-AR')} con cambios que no llegaron al servidor (por ejemplo, se cortó la conexión). ¿La recuperás?`),
        buttons: [{ label: 'Descartar', onclick: () => { lsDel(bkKey); } }, { label: 'Recuperar', cls: 'primary', onclick: () => {
          pushUndo(); S.slides = bk.data.slides; S.na = bk.data.naSections || {}; S.kpis = bk.data.kpis || {};
          S.cur = S.slides[0]?.id || null; renderAll(); changed(false);
        } }],
      });
    } else if (bk && bk.base !== S.version) lsDel(bkKey);
  } catch { /* respaldo corrupto */ }

  return () => {
    cleanups.forEach((f) => f());
    clearTimeout(retry);
    scaled?.ro?.disconnect();
    endEditing();
    if (S.dirty && canEdit && !S.conflict) { saveLater.cancel(); save(); }
  };
}
