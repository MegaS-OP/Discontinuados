import { h, toast, confirmBox, fmtDay, fmtDate } from './util.js';
import { api, auth, getConfig } from './api.js';
import { sectionStatus } from './model/sanitize.js';
import { present } from './present/present.js';

export async function loginPage(app) {
  let plants = [];
  try { plants = (await api('/api/auth')).plants; } catch (e) { toast(e.message, 'bad'); }
  let role = 'plant';
  const err = h('div', { class: 'err' });
  const sel = h('select', { id: 'plant' }, plants.map((p) => h('option', { value: p.id }, p.name)));
  const code = h('input', { type: 'password', id: 'code', placeholder: 'Código de acceso de la planta', autocomplete: 'off' });
  const pw = h('input', { type: 'password', id: 'pw', placeholder: 'Contraseña de administrador', autocomplete: 'off' });
  const plantBox = h('div', {}, h('label', {}, 'Planta', sel), h('label', {}, 'Código de acceso', code));
  const adminBox = h('div', { hidden: true }, h('label', {}, 'Contraseña', pw));
  const t1 = h('button', { class: 'tab on', type: 'button' }, 'Planta'), t2 = h('button', { class: 'tab', type: 'button' }, 'Administrador');
  const setRole = (r) => { role = r; plantBox.hidden = r !== 'plant'; adminBox.hidden = r !== 'admin'; t1.classList.toggle('on', r === 'plant'); t2.classList.toggle('on', r === 'admin'); err.textContent = ''; };
  t1.onclick = () => setRole('plant'); t2.onclick = () => setRole('admin');
  const form = h('form', { class: 'login-card', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    try {
      const body = role === 'admin' ? { role, password: pw.value } : { role, plantId: sel.value, code: code.value };
      auth.set(await api('/api/auth', { method: 'POST', body }));
      location.hash = '#/';
    } catch (ex) { err.textContent = ex.message; }
  } },
  h('img', { src: 'assets/sop-green.png', class: 'login-logo', alt: '' }), h('h1', {}, 'S&OP Plant Reports'),
  h('p', { class: 'muted' }, 'Informes mensuales de planta · Reunión de suministro'),
  h('div', { class: 'tabs' }, t1, t2), plantBox, adminBox, err, h('button', { class: 'btn primary full', type: 'submit' }, 'Ingresar'),
  h('p', { class: 'muted small' }, 'Información confidencial de Megalabs. Uso interno.'));
  app.append(h('div', { class: 'login' }, form));
}

export async function plantHome(main) {
  const a = auth.get();
  const [{ cycles }, cfg] = await Promise.all([api('/api/cycles'), getConfig()]);
  const plant = cfg.plants.find((p) => p.id === a.plantId);
  main.append(h('h2', {}, plant.name), h('p', { class: 'muted' }, 'Armá tu informe del mes, presentalo desde acá y enviálo cuando esté listo.'));
  if (!cycles.length) { main.append(h('div', { class: 'card' }, 'Todavía no hay ciclos abiertos. Te avisará el equipo de S&OP.')); return; }
  const open = cycles.find((c) => c.status === 'abierto');
  const reps = {};
  await Promise.all(cycles.map(async (c) => { try { reps[c.id] = (await api(`/api/report?cycle=${c.id}&plant=${a.plantId}`)).report; } catch { /* sin acceso */ } }));
  const card = (c, big) => {
    const r = reps[c.id] || { slides: [], status: 'borrador', version: 0, naSections: {} };
    const sent = r.status === 'enviado';
    const isOpen = c.status === 'abierto';
    const prev = cycles.find((x) => x.id < c.id);
    const done = cfg.sections.filter((s) => s.required && sectionStatus(r, s.id) !== 'vacia').length;
    const req = cfg.sections.filter((s) => s.required).length;
    const late = isOpen && !sent && c.deadline && new Date(c.deadline + 'T23:59:59') < new Date();
    return h('div', { class: 'card cycle' + (big ? ' big' : '') },
      h('div', { class: 'row' }, h('h3', {}, c.label), h('span', { class: 'chip ' + (sent ? 'enviado' : c.status) }, sent ? 'Enviado' : c.status)),
      isOpen && h('p', {}, 'Fecha límite: ', h('b', { class: late ? 'bad-t' : '' }, fmtDay(c.deadline)), late ? ' (vencida)' : ''),
      sent && h('p', {}, 'Enviado el ' + fmtDate(r.submittedAt)),
      isOpen && !sent && h('p', {}, `Secciones obligatorias completas: ${done} / ${req}`, h('span', { class: 'bar' }, h('i', { style: `width:${(done / req) * 100}%` }))),
      h('div', { class: 'btns' },
        isOpen && !sent && h('a', { class: 'btn primary', href: `#/edit/${c.id}/${a.plantId}` }, r.slides.length ? 'Continuar editando' : 'Empezar el informe'),
        isOpen && !sent && r.slides.length > 0 && h('a', { class: 'btn', href: `#/edit/${c.id}/${a.plantId}` }, 'Revisar y enviar'),
        isOpen && !sent && prev && h('button', { class: 'btn', onclick: async () => {
          if (r.slides.length && !(await confirmBox('Duplicar informe anterior', 'Esto reemplaza las diapositivas actuales por las de ' + prev.label + '. ¿Continuar?', 'Duplicar'))) return;
          try { await api(`/api/report?cycle=${c.id}&plant=${a.plantId}&action=duplicate&from=${prev.id}`, { method: 'POST' }); toast('Informe duplicado desde ' + prev.label, 'ok'); location.hash = `#/edit/${c.id}/${a.plantId}`; } catch (e) { toast(e.message, 'bad', 6000); }
        } }, '⧉ Duplicar del mes anterior (' + prev.label + ')'),
        (sent || !isOpen) && r.slides.length > 0 && h('a', { class: 'btn', href: `#/view/${c.id}/${a.plantId}` }, 'Ver informe'),
        r.slides.length > 0 && h('a', { class: 'btn', href: `#/present/${c.id}/${a.plantId}` }, '▶ Presentar'),
        sent && isOpen && h('a', { class: 'btn', href: `#/edit/${c.id}/${a.plantId}` }, 'Reabrir / editar')));
  };
  if (open) main.append(card(open, true));
  else main.append(h('div', { class: 'card' }, 'No hay un ciclo abierto en este momento.'));
  const others = cycles.filter((c) => c !== open);
  if (others.length) main.append(h('h3', {}, 'Ciclos anteriores'), h('div', { class: 'grid' }, others.map((c) => card(c, false))));
}

export async function presentReport(cycleId, plantId) {
  const [{ cycle, report }, cfg] = await Promise.all([api(`/api/report?cycle=${cycleId}&plant=${plantId}`), getConfig()]);
  const plant = cfg.plants.find((p) => p.id === plantId);
  const slides = report.slides.filter((s) => !s.hidden);
  if (!slides.length) { toast('El informe no tiene diapositivas.', 'bad'); history.back(); return; }
  const items = slides.map((s, i) => ({ slide: s, ctx: { cycleLabel: cycle.label, plantName: plant.shortName, sectionName: cfg.sections.find((x) => x.id === s.section)?.name, page: i + 1, total: slides.length } }));
  const back = auth.get().role === 'admin' ? '#/admin' : '#/';
  present(items, { onExit: () => { location.hash = back; } });
}
