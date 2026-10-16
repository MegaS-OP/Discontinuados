import { h } from './util.js';
import { auth, api, clearConfig } from './api.js';
import { loginPage, plantHome, presentReport } from './pages.js';
import { mountEditor } from './editor/editor.js';
import { adminDashboard, adminCycles, adminPlants, adminUsers, adminArchive, adminContent } from './admin/admin.js';
import { consolidatePage, archivedDeckPage } from './admin/consolidate.js';

const app = document.getElementById('app');
let cleanup = null;
let token = 0;

function shell(active) {
  const a = auth.get();
  const nav = a.role === 'admin' ? [['admin', 'Tablero'], ['admin/cycles', 'Ciclos'], ['admin/archive', 'Archivo'], ['admin/plants', 'Plantas'], ['admin/users', 'Usuarios'], ['admin/content', 'Contenido']] : [];
  const main = h('main', { class: 'main' });
  app.append(h('header', { class: 'topbar' },
    h('img', { src: 'assets/megalabs-white.png', class: 'tb-logo', alt: '' }), h('b', {}, 'S&OP Suministro Reports'),
    h('nav', {}, nav.map(([p, n]) => h('a', { href: '#/' + p, class: active === p ? 'on' : '' }, n))),
    h('span', { class: 'grow' }),
    h('span', { class: 'who' }, a.name),
    h('button', { class: 'btn small', onclick: () => { auth.clear(); clearConfig(); location.hash = '#/login'; } }, 'Salir')), main);
  return main;
}

async function render() {
  const my = ++token;
  if (cleanup) { try { await cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  app.innerHTML = '';
  const [page = '', ...a] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const user = auth.get();
  if (!user && page !== 'login') { location.hash = '#/login'; return; }
  try {
    const sub = a[0];
    const done = (c) => { if (my === token) cleanup = c; else c?.(); };
    if (page === 'login') return loginPage(app);
    if (page === 'edit' || page === 'view') {
      const root = h('div', { class: 'screen' }); app.append(root);
      return done(await mountEditor(root, { cycleId: a[0], plantId: a[1], viewOnly: page === 'view' }));
    }
    if (page === 'archive') {
      const root = h('div', { class: 'screen' }); app.append(root);
      return done(await mountEditor(root, { cycleId: a[0], plantId: a[1], archive: true }));
    }
    if (page === 'present') return await presentReport(a[0], a[1], a[2] === 'a');
    if (page === 'admin' && user.role === 'admin') {
      if (sub === 'archived') { const root = h('div', { class: 'screen' }); app.append(root); return done(await archivedDeckPage(root, a[1])); }
      if (sub === 'consolidate') { const root = h('div', { class: 'screen' }); app.append(root); return done(await consolidatePage(root, a[1])); }
      const main = shell('admin' + (sub ? '/' + sub : ''));
      return done(await ({ undefined: adminDashboard, cycles: adminCycles, plants: adminPlants, users: adminUsers, archive: adminArchive, content: adminContent }[sub] || adminDashboard)(main, a));
    }
    if (user.role === 'admin') { location.hash = '#/admin'; return; }
    return done(await plantHome(shell('')));
  } catch (e) {
    console.error(e);
    app.innerHTML = '';
    app.append(h('div', { class: 'fatal' }, h('h2', {}, 'No se pudo cargar'), h('p', {}, e.message), h('a', { class: 'btn', href: '#/' }, 'Volver al inicio')));
  }
}
window.addEventListener('hashchange', render);
render();
