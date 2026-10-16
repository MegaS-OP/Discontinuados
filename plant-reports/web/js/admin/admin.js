import { h, toast, modal, confirmBox, fmtDay, fmtDate } from '../util.js';
import { api, getConfig, clearConfig } from '../api.js';
import { sectionStatus } from '../model/sanitize.js';
import { KPI_KEYS } from '../model/seed.js';
import { loadDemo } from './demo.js';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export async function adminDashboard(main) {
  const [{ cycles }, cfg] = await Promise.all([api('/api/cycles'), getConfig(true)]);
  if (!cycles.length) {
    main.append(h('h2', {}, 'Tablero del ciclo'), h('div', { class: 'card' }, h('p', {}, 'Todavía no hay ciclos. Creá el primero en ', h('a', { href: '#/admin/cycles' }, 'Ciclos'), ', o cargá datos de ejemplo para probar el consolidador.'), demoBtn()));
    return;
  }
  const saved = sessionStorage.getItem('sop.cycle');
  let cur = cycles.find((c) => c.id === saved) || cycles.find((c) => c.status === 'abierto') || cycles[0];
  const box = h('div');
  const sel = h('select', { onchange: () => { cur = cycles.find((c) => c.id === sel.value); try { sessionStorage.setItem('sop.cycle', cur.id); } catch { /* ok */ } draw(); } },
    cycles.map((c) => h('option', { value: c.id, selected: c.id === cur.id }, `${c.label} (${c.status})`)));
  main.append(h('div', { class: 'row' }, h('h2', {}, 'Tablero del ciclo'), sel, h('span', { class: 'grow' }), demoBtn()), box);

  async function draw() {
    box.innerHTML = '';
    const { reports } = await api(`/api/report?cycle=${cur.id}`);
    const plants = cfg.plants.filter((p) => p.active).sort((a, b) => a.order - b.order);
    const reqs = cfg.sections.filter((s) => s.required);
    const days = cur.deadline ? Math.ceil((new Date(cur.deadline + 'T23:59:59') - new Date()) / 864e5) : null;
    let sent = 0;
    const rows = plants.map((p) => {
      const r = reports[p.id];
      const isSent = r.status === 'enviado';
      if (isSent) sent++;
      const done = reqs.filter((s) => sectionStatus(r, s.id) !== 'vacia').length;
      const pct = Math.round((done / reqs.length) * 100);
      const started = r.version > 0 || r.slides.length > 0;
      const light = isSent ? 'ok' : days !== null && days < 0 ? 'bad' : days !== null && days <= 2 ? 'warn' : 'idle';
      return h('tr', {},
        h('td', {}, h('span', { class: 'dot ' + light }), ' ', h('b', {}, p.name)),
        h('td', {}, isSent ? h('span', { class: 'chip enviado' }, 'Enviado') : started ? h('span', { class: 'chip borrador' }, `Borrador ${pct}%`) : h('span', { class: 'chip' }, 'Sin empezar')),
        h('td', {}, h('span', { class: 'bar' }, h('i', { style: `width:${pct}%` })), ` ${done}/${reqs.length}`),
        h('td', {}, r.slides.length),
        h('td', {}, isSent ? fmtDate(r.submittedAt) : r.updatedAt ? 'Editado ' + fmtDate(r.updatedAt) : '—'),
        h('td', { class: 'acts' },
          h('a', { class: 'btn small', href: `#/edit/${cur.id}/${p.id}` }, started ? 'Abrir / editar' : 'Abrir'),
          r.slides.length > 0 && h('a', { class: 'btn small', href: `#/present/${cur.id}/${p.id}` }, '▶ Presentar'),
          isSent && h('button', { class: 'btn small', onclick: async () => { await api(`/api/report?cycle=${cur.id}&plant=${p.id}&action=reopen`, { method: 'POST' }); toast('Informe reabierto', 'ok'); draw(); } }, 'Reabrir')));
    });
    box.append(
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, `${sent} / ${plants.length}`), 'informes enviados'),
        h('div', { class: 'stat' }, h('b', {}, fmtDay(cur.deadline)), days === null ? 'sin fecha límite' : days < 0 ? `venció hace ${-days} día(s)` : `faltan ${days} día(s)`),
        h('div', { class: 'stat' }, h('b', {}, cur.status), 'estado del ciclo'),
        h('a', { class: 'btn primary', href: `#/admin/consolidate/${cur.id}` }, '🧩 Consolidar y presentar →')),
      h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Planta', 'Estado', 'Secciones obligatorias', 'Diapositivas', 'Última actividad', ''].map((t) => h('th', {}, t)))), h('tbody', {}, rows)));
  }
  draw();
}

function demoBtn() {
  return h('button', { class: 'btn', onclick: async (e) => {
    if (!(await confirmBox('Cargar datos de ejemplo', 'Crea (o reemplaza) el ciclo "Demo / Ejemplo" con 3 plantas cargadas: 2 enviadas y 1 en borrador. No afecta a los demás ciclos.', 'Cargar demo'))) return;
    const b = e.target; b.disabled = true;
    try { await loadDemo((t) => { b.textContent = t; }); toast('Demo cargada ✓', 'ok'); sessionStorage.setItem('sop.cycle', 'demo'); location.reload(); } catch (ex) { toast(ex.message, 'bad', 7000); b.disabled = false; b.textContent = 'Cargar datos de ejemplo'; }
  } }, 'Cargar datos de ejemplo');
}

export async function adminCycles(main) {
  const { cycles } = await api('/api/cycles');
  const now = new Date();
  const month = h('input', { type: 'month', value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` });
  const label = h('input', { type: 'text' });
  const syncLabel = () => { const [y, m] = month.value.split('-'); label.value = y ? `${MONTHS[+m - 1]}/${y}` : ''; };
  month.onchange = syncLabel; syncLabel();
  const dl = h('input', { type: 'date' });
  main.append(h('h2', {}, 'Ciclos mensuales'),
    h('div', { class: 'card' }, h('h3', {}, 'Crear ciclo'),
      h('div', { class: 'form-row' }, h('label', {}, 'Mes', month), h('label', {}, 'Nombre', label), h('label', {}, 'Fecha límite de envío', dl),
        h('button', { class: 'btn primary', onclick: async () => {
          try { await api('/api/cycles', { method: 'POST', body: { id: month.value, label: label.value, deadline: dl.value || null } }); toast('Ciclo creado (en borrador: las plantas todavía no lo ven)', 'ok'); location.reload(); } catch (e) { toast(e.message, 'bad'); }
        } }, 'Crear'))));
  main.append(h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Ciclo', 'Estado', 'Fecha límite', 'Acciones'].map((t) => h('th', {}, t)))),
    h('tbody', {}, cycles.map((c, i) => {
      const prev = cycles[i + 1];
      const set = async (status, extra) => { try { await api(`/api/cycles?id=${c.id}`, { method: 'PATCH', body: { status } }); if (extra) await extra(); location.reload(); } catch (e) { toast(e.message, 'bad'); } };
      return h('tr', {}, h('td', {}, h('b', {}, c.label), h('small', {}, ' ' + c.id)), h('td', {}, h('span', { class: 'chip ' + c.status }, c.status)), h('td', {}, fmtDay(c.deadline)),
        h('td', { class: 'acts' },
          c.status === 'borrador' && h('button', { class: 'btn small primary', onclick: () => openCycle(c, prev, set) }, 'Abrir a las plantas'),
          c.status === 'abierto' && h('button', { class: 'btn small', onclick: () => set('cerrado') }, 'Cerrar ciclo'),
          c.status === 'cerrado' && h('button', { class: 'btn small', onclick: () => set('abierto') }, 'Reabrir ciclo'),
          c.status === 'cerrado' && h('button', { class: 'btn small', onclick: () => set('consolidado') }, 'Marcar consolidado'),
          c.status === 'consolidado' && h('button', { class: 'btn small', onclick: () => set('cerrado') }, 'Quitar "consolidado"'),
          h('a', { class: 'btn small', href: `#/admin/consolidate/${c.id}` }, 'Consolidado'),
          h('button', { class: 'btn small bad', onclick: async () => {
            if (!(await confirmBox('Eliminar ciclo', `Se borran el ciclo "${c.label}" y TODOS sus informes. No se puede deshacer.`, 'Eliminar'))) return;
            try { await api(`/api/cycles?id=${c.id}`, { method: 'DELETE' }); location.reload(); } catch (e) { toast(e.message, 'bad'); }
          } }, 'Eliminar')));
    }))));
}
function openCycle(c, prev, set) {
  const chk = h('input', { type: 'checkbox', checked: !!prev, disabled: !prev });
  modal({ title: 'Abrir ' + c.label, body: h('div', {}, h('p', {}, 'Las plantas podrán ver y editar su informe.'),
    h('label', { class: 'chk' }, chk, prev ? ` Pre-cargar cada informe desde ${prev.label}` : ' (no hay ciclo anterior para pre-cargar)')),
  buttons: [{ label: 'Cancelar' }, { label: 'Abrir ciclo', cls: 'primary', onclick: async () => {
    const cfg = await getConfig();
    await set('abierto', async () => {
      if (!chk.checked) return;
      for (const p of cfg.plants.filter((x) => x.active)) { try { await api(`/api/report?cycle=${c.id}&plant=${p.id}&action=duplicate&from=${prev.id}`, { method: 'POST' }); } catch { /* sin informe previo */ } }
    });
  } }] });
}

export async function adminPlants(main) {
  const cfg = await getConfig(true);
  const plants = cfg.plants.map((p) => ({ ...p, kpiTargets: { ...p.kpiTargets } })).sort((a, b) => a.order - b.order);
  const tkeys = KPI_KEYS.filter((k) => k.key in plants[0].kpiTargets);
  const inp = (obj, key, type = 'text', w = '') => h('input', { type, value: obj[key] ?? '', class: w, onchange: (e) => { obj[key] = type === 'number' ? e.target.value : e.target.value; } });
  main.append(h('h2', {}, 'Plantas y accesos'),
    h('p', { class: 'muted' }, 'El orden define la agenda del consolidado. Cada planta entra con su código de acceso (se muestra una sola vez al generarlo; si se pierde, se genera otro).'),
    h('div', { class: 'scroll' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, ['Orden', 'Nombre', 'Nombre corto', 'Activa', ...tkeys.map((k) => 'Meta ' + k.name.split(' ')[0].replace('Adherencia', 'Adh.') + (k.key.startsWith('adh') ? ' ' + k.key.slice(3) : '')), 'Acceso'].map((t) => h('th', {}, t)))),
      h('tbody', {}, plants.map((p) => h('tr', {},
        h('td', {}, inp(p, 'order', 'number', 'w50')), h('td', {}, inp(p, 'name')), h('td', {}, inp(p, 'shortName')),
        h('td', {}, h('input', { type: 'checkbox', checked: p.active, onchange: (e) => { p.active = e.target.checked; } })),
        tkeys.map((k) => h('td', {}, inp(p.kpiTargets, k.key, 'number', 'w60'))),
        h('td', {}, h('span', { class: 'chip ' + (p.hasCode ? 'enviado' : '') }, p.hasCode ? 'Con código' : 'Sin código'), ' ',
          h('button', { class: 'btn small', onclick: () => genCode(p) }, p.hasCode ? 'Regenerar' : 'Generar código'))))))),
    h('p', {}, h('button', { class: 'btn primary', onclick: async () => {
      try { await api('/api/config', { method: 'PUT', body: { plants } }); clearConfig(); toast('Guardado ✓', 'ok'); } catch (e) { toast(e.message, 'bad'); }
    } }, 'Guardar cambios')));
}
async function genCode(p) {
  if (p.hasCode && !(await confirmBox('Regenerar código', `El código actual de ${p.name} dejará de funcionar.`, 'Regenerar'))) return;
  try {
    const { code } = await api(`/api/config?action=gencode&plant=${p.id}`, { method: 'POST' });
    clearConfig();
    modal({ title: 'Código de acceso de ' + p.name, body: h('div', {}, h('p', {}, 'Copialo y enviáselo a la planta. ', h('b', {}, 'No se vuelve a mostrar.')), h('div', { class: 'code' }, code)),
      buttons: [{ label: 'Copiar', onclick: async () => { try { await navigator.clipboard.writeText(code); toast('Copiado', 'ok'); } catch { toast('Copialo a mano', 'bad'); } return false; } }, { label: 'Listo', cls: 'primary', onclick: () => location.reload() }] });
  } catch (e) { toast(e.message, 'bad'); }
}

export async function adminContent(main) {
  const cfg = await getConfig(true);
  const defs = cfg.kpiDefinitions.map((d) => ({ ...d }));
  const box = h('div');
  const draw = () => {
    box.innerHTML = '';
    defs.forEach((d, i) => box.append(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('input', { type: 'text', value: d.title, class: 'grow', placeholder: 'Título', onchange: (e) => { d.title = e.target.value; } }),
        h('button', { class: 'btn small', disabled: i === 0, onclick: () => { defs.splice(i - 1, 0, defs.splice(i, 1)[0]); draw(); } }, '↑'),
        h('button', { class: 'btn small', disabled: i === defs.length - 1, onclick: () => { defs.splice(i + 1, 0, defs.splice(i, 1)[0]); draw(); } }, '↓'),
        h('button', { class: 'btn small bad', onclick: () => { defs.splice(i, 1); draw(); } }, '🗑')),
      h('textarea', { rows: 5, class: 'full', onchange: (e) => { d.text = e.target.value; } }, d.text))));
  };
  draw();
  main.append(h('h2', {}, 'Contenido'),
    h('div', { class: 'banner warnb' }, 'Los textos de definición de KPI que vienen cargados son PROVISIONALES. Reemplazalos por las definiciones oficiales del Back Up.'),
    h('h3', {}, 'Definiciones de KPI (diapositivas del Back Up)'), box,
    h('p', {}, h('button', { class: 'btn', onclick: () => { defs.push({ id: 'k' + Date.now().toString(36), title: 'Nuevo KPI', text: '' }); draw(); } }, '＋ Agregar definición'), ' ',
      h('button', { class: 'btn primary', onclick: async () => {
        try { await api('/api/config', { method: 'PUT', body: { kpiDefinitions: defs } }); clearConfig(); toast('Guardado ✓', 'ok'); } catch (e) { toast(e.message, 'bad'); }
      } }, 'Guardar definiciones')),
    h('h3', {}, 'Secciones del informe (iguales para todas las plantas)'),
    h('ul', {}, cfg.sections.map((s) => h('li', {}, `${s.icon} ${s.name}`, s.required ? ' — obligatoria' : ' — opcional'))));
}
