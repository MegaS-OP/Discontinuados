import { KPI_KEYS } from './seed.js';
import { esc, uid } from '../util.js';

export const STATE_COLOR = { ok: '#c6efce', warn: '#ffeb9c', bad: '#ffc7ce' };
export const STATE_NAME = { ok: 'Cumple la meta', warn: 'Cerca de la meta', bad: 'Fuera de meta' };

/** Semáforo: 'min' = debe ser ≥ meta (amarillo hasta 10 pts por debajo); 'max' = debe ser ≤ meta (amarillo hasta 5 pts por encima). */
export function kpiState(def, value, target) {
  if (value === null || value === undefined || value === '' || target === null || target === undefined) return null;
  const v = Number(value), t = Number(target);
  if (def.dir === 'min') return v >= t ? 'ok' : v >= t - 10 ? 'warn' : 'bad';
  return v <= t ? 'ok' : v <= t + 5 ? 'warn' : 'bad';
}
export const fmtVal = (v, unit = '%') => (v === null || v === undefined || v === '' ? '—' : String(Number(v).toLocaleString('es-AR', { maximumFractionDigits: 1 })) + unit);
export const targetOf = (plant, key) => plant?.kpiTargets?.[key] ?? null;
const cell = (h, bg = '', al = '') => ({ h: esc(h), bg, al });

/** Diapositiva de KPIs generada desde el formulario (tabla editable con semáforo + puntos a destacar). */
export function buildKpiSlide(kpis, plant, id = uid('s')) {
  const rows = [[cell('KPI', '', 'center'), cell('Valor del mes', '', 'center'), cell('Meta', '', 'center'), cell('Estado', '', 'center')]];
  for (const def of KPI_KEYS) {
    const t = targetOf(plant, def.key), st = kpiState(def, kpis[def.key], t);
    rows.push([cell(def.name), cell(fmtVal(kpis[def.key]), st ? STATE_COLOR[st] : '', 'center'),
      cell(t === null ? '—' : (def.dir === 'min' ? '≥ ' : '≤ ') + fmtVal(t), '', 'center'), cell(st ? STATE_NAME[st] : 'Sin dato', st ? STATE_COLOR[st] : '', 'center')]);
  }
  const bullets = String(kpis.comentario || '');
  return {
    id, section: 'kpis', title: 'KPIs / Indicadores de Manufactura', layout: 'kpi_auto', notes: '', hidden: false, editedByAdmin: false,
    blocks: [
      { id: uid('b'), type: 'table', x: 3, y: 14, w: 64, h: 74, content: { rows, header: true, fs: 16, colW: [40, 18, 16, 26] } },
      { id: uid('b'), type: 'callout', x: 69, y: 14, w: 28, h: 74, content: { title: 'Puntos a destacar', html: bullets, size: 18, color: null, align: 'left' } },
    ],
  };
}
