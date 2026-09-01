import { useApp } from '../context/AppContext';
import { COSTO_DESTRUCCION_LABELS } from '../data/db';

const ML_GREEN = '#009641';
const BORDER = '0.5px solid rgba(0,150,65,0.15)';

const STAGE_COLORS = ['#009641', '#007A65', '#005A44'];
const STAGE_LABELS = ['Detección', 'Análisis', 'Confirmación'];

function parseMonto(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatMonto(n) {
  return Math.round(n).toLocaleString('es-AR');
}

// Costo de inventario de una categoría (PT / materiales / API) para un producto puntual.
// Sale del campo "Costo del inventario" del hito correspondiente, cargado en
// "Análisis de impacto planta" (ProductDetail.jsx) vía updateHitoExtras.
function costoPorCategoria(p, label) {
  const h = p.hitos.find((x) => x.label === label);
  return h ? parseMonto(h.valorInventario) : 0;
}

function costoInventarioProducto(p) {
  return COSTO_DESTRUCCION_LABELS.reduce((sum, label) => sum + costoPorCategoria(p, label), 0);
}

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={size/2 - 16} fill="none" stroke="#E5E7EB" strokeWidth={28} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fontSize={13} fill="#9CA3AF">Sin datos</text>
    </svg>
  );
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const seg = { pct, offset, dash: pct * circ, gap: (1 - pct) * circ };
    offset += pct * circ;
    return seg;
  });

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F0F0F0" strokeWidth={28} />
      {segments.map((seg, i) => (
        <circle key={i}
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={data[i].color} strokeWidth={28}
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={-seg.offset}
        />
      ))}
    </svg>
  );
}

function BarChart({ items, maxVal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: '#1A2B25', fontWeight: 500 }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.value}{item.unit || ''}</span>
          </div>
          <div style={{ height: 8, background: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${maxVal ? (item.value / maxVal) * 100 : 0}%`,
              background: item.color,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.07)',
      borderTop: `3px solid ${color}`,
      borderRadius: 10,
      padding: '16px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 11, color: '#8FA99E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6B7F76', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 12,
      padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2B25' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#8FA99E', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export default function DashboardView() {
  const { data } = useApp();
  const products = data.products;

  const total = products.length;

  // --- Impacto de la discontinuación para la planta ---
  // Todo sale de los hitos de "Análisis de impacto planta" (ProductDetail.jsx), vía data.products del AppContext.

  // Subtotal e cantidad de productos por categoría de costo (PT / materiales / API)
  const impactoCategorias = COSTO_DESTRUCCION_LABELS.map((label) => {
    const costos = products.map((p) => costoPorCategoria(p, label)).filter((c) => c > 0);
    return { label, total: costos.reduce((s, c) => s + c, 0), count: costos.length };
  });
  const totalRiesgo = impactoCategorias.reduce((s, c) => s + c.total, 0);

  // Un producto "tiene costo cargado" si al menos una de las 3 categorías tiene valor > 0
  const productsConCosto = products.filter((p) => costoInventarioProducto(p) > 0).length;
  const productsPendientes = total - productsConCosto;

  // "Cola de producción activa" = checkbox del hito "Productos en cola de producción" marcado
  const colaProduccionActiva = products.filter((p) => {
    const h = p.hitos.find((x) => x.label === 'Productos en cola de producción');
    return h?.done;
  }).length;

  // % de impacto sobre Granel, calculado sobre los productos que ya respondieron
  // "Lleva" / "No lleva" en el hito "Análisis de impacto planta" (no sobre el total de la compañía)
  const granelRespondidos = products.filter((p) => {
    const h = p.hitos.find((x) => x.label === 'Análisis de impacto planta');
    return h?.impactoGranelLleva === 'si' || h?.impactoGranelLleva === 'no';
  });
  const granelLleva = granelRespondidos.filter((p) => {
    const h = p.hitos.find((x) => x.label === 'Análisis de impacto planta');
    return h.impactoGranelLleva === 'si';
  });
  const pctGranel = granelRespondidos.length ? Math.round((granelLleva.length / granelRespondidos.length) * 100) : 0;

  const hayDatosImpacto = totalRiesgo > 0 || granelRespondidos.length > 0 || colaProduccionActiva > 0;

  const byStage = STAGE_LABELS.map((label, i) => ({
    label,
    value: products.filter(p => p.etapaActual === i).length,
    color: STAGE_COLORS[i],
  }));
  const avgProgreso = total ? Math.round(products.reduce((s, p) => s + p.progreso, 0) / total) : 0;
  const totalHitos = products.reduce((s, p) => s + p.hitos.length, 0);
  const doneHitos = products.reduce((s, p) => s + p.hitos.filter(h => h.done).length, 0);
  const pctHitos = totalHitos ? Math.round((doneHitos / totalHitos) * 100) : 0;

  const hitosPerStage = STAGE_LABELS.map((label, i) => {
    const ps = products.filter(p => p.etapaActual === i);
    const th = ps.reduce((s, p) => s + p.hitos.length, 0);
    const dh = ps.reduce((s, p) => s + p.hitos.filter(h => h.done).length, 0);
    return { label, value: th ? Math.round((dh / th) * 100) : 0, color: STAGE_COLORS[i], unit: '%' };
  });

  const progresoPerStage = STAGE_LABELS.map((label, i) => {
    const ps = products.filter(p => p.etapaActual === i);
    const avg = ps.length ? Math.round(ps.reduce((s, p) => s + p.progreso, 0) / ps.length) : 0;
    return { label, value: avg, color: STAGE_COLORS[i], unit: '%' };
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F7F6' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #003D2E 0%, #006B52 55%, #00A07A 100%)',
        padding: '20px 24px 22px',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#78D721', boxShadow: '0 0 0 2px rgba(120,215,33,0.25)' }} />
          S&OP Global · Megalabs
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Dashboard
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          Resumen ejecutivo del proceso de discontinuados
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total en proceso" value={total} sub="productos activos" color={ML_GREEN} icon="📦" />
          <StatCard label="En Detección" value={byStage[0].value} sub="Etapa 1" color="#009641" icon="🔍" />
          <StatCard label="En Análisis" value={byStage[1].value} sub="Etapa 2" color="#007A65" icon="📊" />
          <StatCard label="Avance promedio" value={`${avgProgreso}%`} sub={`${doneHitos}/${totalHitos} hitos completados`} color="#005A44" icon="✅" />
        </div>

        {/* Impacto de la discontinuación para la planta */}
        <div style={{
          background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderTop: '3px solid #005A44',
          borderRadius: 10, padding: '16px 18px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8FA99E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: hayDatosImpacto ? 12 : 4 }}>
            🏭 Impacto de la discontinuación para la planta
          </div>

          {!hayDatosImpacto ? (
            <div style={{ fontSize: 11, color: '#6B7F76' }}>
              Todavía no hay datos cargados en "Análisis de impacto planta". Completá los costos y el estado de Granel para ver el impacto acá.
            </div>
          ) : (
            <>
              {/* KPI principal + estado de completitud */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8FA99E', fontWeight: 600 }}>TOTAL EN RIESGO</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#005A44', letterSpacing: '-0.03em', lineHeight: 1 }}>${formatMonto(totalRiesgo)}</div>
                </div>
                <div style={{ fontSize: 11, color: '#6B7F76', paddingBottom: 3 }}>
                  {productsConCosto} de {total} productos con costo cargado
                  {productsPendientes > 0 && <> · {productsPendientes} pendiente{productsPendientes !== 1 ? 's' : ''}</>}
                </div>
              </div>

              {/* Desglose por categoría de costo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                {impactoCategorias.map((c, i) => (
                  <div key={c.label} style={{ background: '#F0F5F2', border: BORDER, borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#4E6358', fontWeight: 600 }}>{c.label.replace('Costo destrucción ', '').replace('Costo inventario ', '')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: STAGE_COLORS[i] }}>${formatMonto(c.total)}</div>
                    <div style={{ fontSize: 10, color: '#8FA99E' }}>{c.count} producto{c.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>

              {/* Indicadores complementarios (no monetarios) */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #F0F0F0', fontSize: 11, color: '#4E6358' }}>
                <span>📦 {colaProduccionActiva} producto{colaProduccionActiva !== 1 ? 's' : ''} con órdenes en cola de producción activas</span>
                <span>
                  🧪 {granelRespondidos.length > 0
                    ? `${pctGranel}% impacta sobre Granel (${granelLleva.length} de ${granelRespondidos.length})`
                    : 'Sin datos de impacto sobre Granel cargados'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 3 Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

          {/* Chart 1: Distribución por etapa */}
          <ChartCard title="Distribución por etapa" subtitle="Cantidad de productos por etapa del proceso">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <DonutChart data={byStage} size={140} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1A2B25', lineHeight: 1 }}>{total}</div>
                  <div style={{ fontSize: 9, color: '#8FA99E', marginTop: 2 }}>total</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {byStage.map((s) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#4E6358', flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          {/* Chart 2: Avance de hitos por etapa */}
          <ChartCard title="Hitos completados" subtitle="Porcentaje de hitos cerrados por etapa">
            <BarChart items={hitosPerStage} maxVal={100} />
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#8FA99E' }}>Total global</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pctHitos}%`, height: '100%', background: ML_GREEN, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ML_GREEN }}>{pctHitos}%</span>
              </div>
            </div>
          </ChartCard>

          {/* Chart 3: Progreso promedio por etapa */}
          <ChartCard title="Progreso promedio" subtitle="Avance medio de los productos en cada etapa">
            <BarChart items={progresoPerStage} maxVal={100} />
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F0F0F0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {byStage.map((s) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <span style={{ color: '#8FA99E' }}>{s.label}</span>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.value} producto{s.value !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

        </div>
      </div>
    </div>
  );
}
