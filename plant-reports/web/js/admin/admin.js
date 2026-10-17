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

let MAIL = false; // ¿hay correo configurado en Netlify?
const sendNotice = async (cycle, type) => { try { const r = await api('/api/notify', { method: 'POST', body: { cycle, type } }); toast(r.skipped ? r.skipped : `Correos enviados: ${r.sent} de ${r.recipients}`, r.skipped ? 'bad' : 'ok', 6000); } catch (e) { toast(e.message, 'bad'); } };
const mailChk = (label) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: MAIL, disabled: !MAIL }), ' ' + label + (MAIL ? '' : ' (configurar GMAIL_USER y GMAIL_APP_PASSWORD en Netlify)'));

export async function adminCycles(main) {
  const [{ cycles }, mc] = await Promise.all([api('/api/cycles'), api('/api/notify')]);
  MAIL = mc.configured;
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
          c.status === 'abierto' && h('button', { class: 'btn small', title: 'Avisa por correo a los editores que todavía no enviaron', onclick: () => sendNotice(c.id, 'reminder') }, '📧 Recordatorio'),
          c.status === 'abierto' && h('button', { class: 'btn small primary', onclick: () => closeCycle(c) }, 'Cerrar y archivar'),
          c.status === 'cerrado' && h('button', { class: 'btn small', onclick: () => set('abierto') }, 'Reabrir ciclo'),
          ['cerrado', 'consolidado'].includes(c.status) && h('a', { class: 'btn small', href: '#/admin/archive' }, 'Ver archivo'),
          c.status === 'cerrado' && h('button', { class: 'btn small', onclick: () => set('consolidado') }, 'Marcar consolidado'),
          c.status === 'consolidado' && h('button', { class: 'btn small', onclick: () => set('cerrado') }, 'Quitar "consolidado"'),
          h('a', { class: 'btn small', href: `#/admin/consolidate/${c.id}` }, 'Consolidado'),
          h('button', { class: 'btn small bad', onclick: async () => {
            if (!(await confirmBox('Eliminar ciclo', `Se borran el ciclo "${c.label}" y TODOS sus informes. No se puede deshacer.`, 'Eliminar'))) return;
            try { await api(`/api/cycles?id=${c.id}`, { method: 'DELETE' }); location.reload(); } catch (e) { toast(e.message, 'bad'); }
          } }, 'Eliminar')));
    }))));
}
async function closeCycle(c) {
  const [{ reports }, cfg] = await Promise.all([api(`/api/report?cycle=${c.id}`), getConfig()]);
  const pend = cfg.plants.filter((p) => p.active && reports[p.id].status !== 'enviado').map((p) => p.name + (reports[p.id].slides.length ? ' (borrador)' : ' (sin informe)'));
  const notice = mailChk('Avisar por correo a los usuarios que el ciclo se cerró');
  modal({ title: 'Cerrar y archivar ' + c.label, wide: true,
    body: h('div', {}, h('p', {}, 'Al cerrar el ciclo, automáticamente:'),
      h('ul', {}, h('li', {}, 'el informe de cada planta se guarda en su historial del mes (las plantas lo ven en su inicio);'), h('li', {}, 'el consolidado del mes (con tu orden y diapositivas ocultas) queda guardado en el Archivo;'), h('li', {}, 'las plantas dejan de poder editar.')),
      pend.length ? h('p', { class: 'warn' }, 'Todavía no enviaron: ' + pend.join(', ') + '. Se archivan tal como están.') : h('p', { class: 'okmsg' }, 'Todas las plantas enviaron su informe.'), notice),
    buttons: [{ label: 'Cancelar' }, { label: 'Cerrar y archivar', cls: 'primary', onclick: async () => {
      try { const r = await api(`/api/cycles?id=${c.id}`, { method: 'PATCH', body: { status: 'cerrado' } }); toast(`Archivado ✓ ${r.archived?.consolidatedSlides ?? ''} diapositivas en el consolidado`, 'ok', 5000); if (notice.querySelector('input').checked) await sendNotice(c.id, 'closed'); setTimeout(() => location.reload(), 800); } catch (e) { toast(e.message, 'bad', 6000); return false; }
    } }] });
}
function openCycle(c, prev, set) {
  const notice = mailChk('Avisar por correo a los usuarios que el ciclo se abrió');
  const chk = h('input', { type: 'checkbox', checked: !!prev, disabled: !prev });
  modal({ title: 'Abrir ' + c.label, body: h('div', {}, h('p', {}, 'Las plantas podrán ver y editar su informe.'),
    h('label', { class: 'chk' }, chk, prev ? ` Pre-cargar cada informe desde ${prev.label}` : ' (no hay ciclo anterior para pre-cargar)'), notice),
  buttons: [{ label: 'Cancelar' }, { label: 'Abrir ciclo', cls: 'primary', onclick: async () => {
    const cfg = await getConfig();
    await set('abierto', async () => {
      if (notice.querySelector('input').checked) await sendNotice(c.id, 'opened');
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
  main.append(h('h2', {}, 'Plantas'),
    h('p', { class: 'muted' }, 'El orden define la agenda del consolidado. Los accesos se administran en ', h('a', { href: '#/admin/users' }, 'Usuarios'), '.'),
    h('div', { class: 'scroll' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, ['Orden', 'Nombre', 'Nombre corto', 'Activa', ...tkeys.map((k) => 'Meta ' + k.name.split(' ')[0].replace('Adherencia', 'Adh.') + (k.key.startsWith('adh') ? ' ' + k.key.slice(3) : ''))].map((t) => h('th', {}, t)))),
      h('tbody', {}, plants.map((p) => h('tr', {},
        h('td', {}, inp(p, 'order', 'number', 'w50')), h('td', {}, inp(p, 'name')), h('td', {}, inp(p, 'shortName')),
        h('td', {}, h('input', { type: 'checkbox', checked: p.active, onchange: (e) => { p.active = e.target.checked; } })),
        tkeys.map((k) => h('td', {}, inp(p.kpiTargets, k.key, 'number', 'w60')))))))),
    h('p', {}, h('button', { class: 'btn primary', onclick: async () => {
      try { await api('/api/config', { method: 'PUT', body: { plants } }); clearConfig(); toast('Guardado ✓', 'ok'); } catch (e) { toast(e.message, 'bad'); }
    } }, 'Guardar cambios')));
}
export async function adminUsers(main) {
  const [{ users }, cfg] = await Promise.all([api('/api/users'), getConfig(true)]);
  const plants = cfg.plants.slice().sort((a, b) => a.order - b.order);
  const pname = (id) => cfg.plants.find((p) => p.id === id)?.name || id;
  const showCode = (title, code) => modal({ title, body: h('div', {}, h('p', {}, 'Copialo y enviáselo a la persona. ', h('b', {}, 'No se vuelve a mostrar.')), h('div', { class: 'code' }, code)),
    buttons: [{ label: 'Copiar', onclick: async () => { try { await navigator.clipboard.writeText(code); toast('Copiado', 'ok'); } catch { toast('Copialo a mano', 'bad'); } return false; } }, { label: 'Listo', cls: 'primary', onclick: () => location.reload() }] });
  const act = async (fn) => { try { await fn(); } catch (e) { toast(e.message, 'bad', 6000); } };

  main.append(h('div', { class: 'row' }, h('h2', {}, 'Usuarios y permisos'), h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: newUser }, '＋ Nuevo usuario')),
    h('div', { class: 'card perms' },
      h('p', {}, h('b', {}, 'Editor'), ': arma, presenta y envía el informe de SU planta.'),
      h('p', {}, h('b', {}, 'Lector'), ': sólo ve y presenta el informe de SU planta.'),
      h('p', { class: 'muted' }, 'Ningún usuario de planta puede ver ni editar informes de otras plantas, ni el consolidado. El administrador (contraseña en Netlify) ve todo.')));
  if (!users.length) main.append(h('div', { class: 'card' }, 'Todavía no hay usuarios. Creá el primero con "Nuevo usuario".'));
  for (const p of plants) {
    const list = users.filter((u) => u.plantId === p.id);
    if (!list.length) continue;
    main.append(h('h3', {}, p.name), h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, ['Nombre', 'Correo (usuario)', 'Rol', 'Estado', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, list.map((u) => h('tr', {},
        h('td', {}, h('b', {}, u.name)), h('td', {}, u.email),
        h('td', {}, h('select', { onchange: (e) => act(async () => { await api('/api/users?id=' + u.id, { method: 'PATCH', body: { perm: e.target.value } }); toast('Rol actualizado', 'ok'); }) },
          [['editor', 'Editor'], ['lector', 'Lector']].map(([v, n]) => h('option', { value: v, selected: v === u.perm }, n)))),
        h('td', {}, h('span', { class: 'chip ' + (u.active ? 'enviado' : 'cerrado') }, u.active ? 'Activo' : 'Desactivado')),
        h('td', { class: 'acts' },
          h('button', { class: 'btn small', onclick: () => act(async () => { const { code } = await api(`/api/users?id=${u.id}&action=regen`, { method: 'POST' }); showCode('Nuevo código de ' + u.name, code); }) }, 'Nuevo código'),
          h('button', { class: 'btn small', onclick: () => act(async () => { await api('/api/users?id=' + u.id, { method: 'PATCH', body: { active: !u.active } }); location.reload(); }) }, u.active ? 'Desactivar' : 'Activar'),
          h('button', { class: 'btn small bad', onclick: async () => { if (await confirmBox('Eliminar usuario', `Se elimina a ${u.name}. No se puede deshacer.`, 'Eliminar')) act(async () => { await api('/api/users?id=' + u.id, { method: 'DELETE' }); location.reload(); }); } }, 'Eliminar')))))));
  }

  function newUser() {
    const name = h('input', { type: 'text', id: 'u-name', maxlength: 80 });
    const email = h('input', { type: 'text', id: 'u-email', placeholder: 'nombre@megalabs.com' });
    const plant = h('select', { id: 'u-plant' }, plants.filter((p) => p.active).map((p) => h('option', { value: p.id }, p.name)));
    const perm = h('select', { id: 'u-perm' }, h('option', { value: 'editor' }, 'Editor (arma y envía el informe)'), h('option', { value: 'lector' }, 'Lector (sólo ve y presenta)'));
    modal({ title: 'Nuevo usuario', body: h('div', {}, h('label', {}, 'Nombre y apellido', name), h('label', {}, 'Correo (será su usuario)', email), h('label', {}, 'Planta', plant), h('label', {}, 'Rol', perm)),
      buttons: [{ label: 'Cancelar' }, { label: 'Crear usuario', cls: 'primary', onclick: async () => {
        try { const r = await api('/api/users', { method: 'POST', body: { name: name.value, email: email.value, plantId: plant.value, perm: perm.value } }); showCode('Código de ' + r.user.name, r.code); } catch (e) { toast(e.message, 'bad', 6000); return false; }
      } }] });
  }
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

export async function adminArchive(main) {
  const [{ months }, cfg] = await Promise.all([api('/api/archive'), getConfig(true)]);
  const plants = cfg.plants.filter((p) => p.active).sort((a, b) => a.order - b.order);
  main.append(h('h2', {}, 'Archivo mensual'), h('p', { class: 'muted' }, 'Al cerrar un ciclo se guarda solo: el informe de cada planta y el consolidado del mes. Es una copia congelada; se puede ver, presentar y exportar a PDF idéntica cuando haga falta.'));
  if (!months.length) { main.append(h('div', { class: 'card' }, 'Todavía no hay meses archivados. Se crean al usar "Cerrar y archivar" en ', h('a', { href: '#/admin/cycles' }, 'Ciclos'), '.')); return; }
  for (const m of months) {
    main.append(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, m.label), h('span', { class: 'muted' }, `cerrado el ${fmtDate(m.closedAt)} por ${m.closedBy}`), h('span', { class: 'grow' }),
        h('a', { class: 'btn primary', href: `#/admin/archived/${m.cycleId}` }, '🧩 Consolidado (' + m.consolidatedSlides + ' diapositivas)')),
      h('table', { class: 'tbl', style: 'margin-top:10px' }, h('thead', {}, h('tr', {}, ['Planta', 'Estado al cierre', 'Diapositivas', ''].map((t) => h('th', {}, t)))),
        h('tbody', {}, plants.map((p) => { const x = m.plants[p.id] || { status: 'sin informe', slides: 0 };
          return h('tr', {}, h('td', {}, h('b', {}, p.name)),
            h('td', {}, h('span', { class: 'chip ' + (x.status === 'enviado' ? 'enviado' : x.status === 'borrador' ? 'borrador' : '') }, x.status === 'enviado' ? 'Enviado ' + fmtDate(x.submittedAt) : x.status === 'borrador' ? 'No enviado' : 'Sin informe')),
            h('td', {}, x.slides),
            h('td', { class: 'acts' }, x.slides > 0 && [h('a', { class: 'btn small', href: `#/archive/${m.cycleId}/${p.id}` }, 'Ver informe'), h('a', { class: 'btn small', href: `#/present/${m.cycleId}/${p.id}/a` }, '▶ Presentar')])); })))));
  }
}
