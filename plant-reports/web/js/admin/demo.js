import { api, uploadImage, getConfig } from '../api.js';

const rnd = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

async function chart(title, seed, color) {
  const r = rnd(seed);
  const c = document.createElement('canvas'); c.width = 1200; c.height = 640;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1200, 640);
  x.fillStyle = '#01557a'; x.font = 'bold 34px sans-serif'; x.fillText(title, 40, 56);
  const months = ['May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct'];
  months.forEach((m, i) => {
    const v = 40 + r() * 55;
    const bh = v * 5;
    x.fillStyle = i === 5 ? '#00a650' : color; x.fillRect(100 + i * 180, 580 - bh, 110, bh);
    x.fillStyle = '#333'; x.font = '26px sans-serif'; x.fillText(m, 120 + i * 180, 620); x.fillText(v.toFixed(1) + '%', 110 + i * 180, 570 - bh);
  });
  x.strokeStyle = '#d64545'; x.setLineDash([10, 8]); x.lineWidth = 3; x.beginPath(); x.moveTo(80, 580 - 400); x.lineTo(1160, 580 - 400); x.stroke();
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
const T = (rows) => rows.map((r, i) => r.map((t) => ({ h: String(t), bg: '', al: i === 0 ? 'center' : '' })));
const col = (rows, c, fn) => rows.forEach((r, i) => { if (i) r[c].bg = fn(r[c].h); });
const sem = (v) => ({ OK: '#c6efce', Atención: '#ffeb9c', Crítico: '#ffc7ce' }[v] || '');
const txt = (html, size = 22) => ({ type: 'text', x: 3, y: 14, w: 94, h: 74, content: { html, size, color: null, align: 'left' } });
const call = (html) => ({ type: 'callout', x: 69, y: 14, w: 28, h: 74, content: { title: 'Puntos a destacar', html, size: 18 } });
const img = (hash) => ({ type: 'image', x: 3, y: 14, w: 64, h: 74, content: { hash, fit: 'contain', alt: '' } });
const tbl = (rows, fs = 14) => ({ type: 'table', x: 3, y: 14, w: 64, h: 74, content: { rows, header: true, fs, colW: null } });

async function reportFor(plant, n) {
  const hashes = [];
  for (let i = 0; i < 3; i++) hashes.push(await uploadImage(await chart(['OTIF', 'Backorder', '% Faltante'][i] + ' · ' + plant.shortName, n * 31 + i + 7, ['#01557a', '#00a88e', '#78d721'][i])));
  const bo = T([['SKU', 'Producto', 'Días BO', 'Unid.', 'Causa', 'Estado'],
    ...Array.from({ length: 8 }, (_, i) => [`${100200 + i * 17}`, ['Amoxicilina 500', 'Ibuprofeno 400', 'Loratadina 10', 'Omeprazol 20', 'Metformina 850', 'Losartán 50', 'Atorvastatina 20', 'Paracetamol 1g'][i], 5 + ((i * n) % 40), 800 + i * 350, ['Falta de MP', 'Capacidad', 'Liberación QA', 'Material de empaque'][i % 4], ['OK', 'Atención', 'Crítico'][(i + n) % 3]])]);
  col(bo, 5, sem);
  const lan = T([['Lanzamiento', 'País', 'Fecha plan', 'Fecha estimada', 'Estado'],
    ...['Producto A', 'Producto B', 'Producto C', 'Producto D'].map((p, i) => [p, ['AR', 'CO', 'UY', 'PE'][i], `1${i}/11`, `${i + 1}${i}/11`, ['OK', 'Atención', 'Crítico', 'OK'][(i + n) % 4]])]);
  col(lan, 4, sem);
  const cap = T([['Línea', '2026', '2027', 'Utilización'], ...['Sólidos', 'Líquidos', 'Semisólidos', 'Inyectables'].map((l, i) => [l, 70 + i * 5 + n, 75 + i * 4, `${60 + i * 8}%`])]);
  const s = (id, section, title, blocks) => ({ id, section, title, layout: '', notes: '', hidden: false, editedByAdmin: false, blocks: blocks.map((b, i) => ({ id: id + 'b' + i, ...b })) });
  return {
    slides: [
      s('d1', 'kpis', 'KPIs de manufactura · ' + plant.shortName, [img(hashes[0]), call(`<ul><li>OTIF ${(85 + n).toFixed(1)}% (meta ≥ 80%)</li><li>BO bajo la meta del 10%</li><li>Adherencia al plan estable</li></ul>`)]),
      s('d2', 'bo_critico', 'BO / Crítico', [tbl(bo), call('<ul><li>3 SKU en estado crítico</li><li>Acción: priorizar compra de MP</li></ul>')]),
      s('d3', 'faltantes', 'Informe de Faltantes', [img(hashes[2]), call('<ul><li>% faltante sobre venta en baja</li></ul>')]),
      s('d4', 'lanzamientos', 'Lanzamientos', [tbl(lan, 16), call('<ul><li>Lanzamiento C con riesgo de fecha</li></ul>')]),
      s('d5', 'riesgos', 'Riesgos', [txt('<ul><li><b>Proveedor único</b> de un API crítico: plan de contingencia en curso.</li><li>Mantenimiento de línea 3 programado en noviembre.</li><li>Variación cambiaria en insumos importados.</li></ul>', 26)]),
      s('d6', 'capacidad', 'Capacidad 2026 / 2027', [tbl(cap, 18), call('<ul><li>Capacidad suficiente para el plan 2027</li></ul>')]),
      s('d7', 'mp_insumos', 'Materias primas e insumos', [img(hashes[1]), call('<ul><li>Cobertura MP: 62 días</li></ul>')]),
    ],
    naSections: { log_acciones: 'Sin temas pendientes', otros: 'Sin otros temas' },
    kpis: {},
  };
}

/** Crea el ciclo "demo" con 3 plantas cargadas (2 enviadas, 1 en borrador). */
export async function loadDemo(onStep = () => {}) {
  const cfg = await getConfig();
  try { await api('/api/cycles?id=demo', { method: 'DELETE' }); } catch { /* no existía */ }
  await api('/api/cycles', { method: 'POST', body: { id: 'demo', label: 'Demo / Ejemplo', deadline: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) } });
  await api('/api/cycles?id=demo', { method: 'PATCH', body: { status: 'abierto' } });
  const pick = ['pdlc', 'rowe', 'acromax'].map((id) => cfg.plants.find((p) => p.id === id));
  for (const [i, p] of pick.entries()) {
    onStep(`Cargando ${p.name}…`);
    const rep = await reportFor(p, i + 1);
    await api(`/api/report?cycle=demo&plant=${p.id}`, { method: 'PUT', body: { baseVersion: 0, report: rep } });
    if (i < 2) await api(`/api/report?cycle=demo&plant=${p.id}&action=submit`, { method: 'POST' });
  }
}
