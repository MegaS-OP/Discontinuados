import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HITOS_CON_EXTRAS, CIAS, FABRICANTES } from '../data/db';
import NuevoProducto from '../components/NuevoProducto';
import ImportModal from '../components/ImportModal';

const ML_GREEN = '#009641';
const ML_GREEN_LIGHT = '#E6F5ED';
const ML_ORANGE = '#009641';
const BORDER = '0.5px solid rgba(0,150,65,0.15)';
const BG_SEC = '#F0F5F2';

const STAGES = [
  { idx: 0, label: 'Detección',    color: '#009641', bg: '#E6F5ED', border: '#A8DABC' },
  { idx: 1, label: 'Análisis',     color: '#007A65', bg: '#E0F2EE', border: '#90CCC2' },
  { idx: 2, label: 'Confirmación', color: '#005A44', bg: '#D6EDE7', border: '#70B8A8' },
];

function ProgressRing({ pct, color, size = 36 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={9} fontWeight={600} fill={color}>{pct}%</text>
    </svg>
  );
}

function ProductCard({ product, color, bg, onOpen }) {
  const { toggleHito } = useApp();
  const [hovered, setHovered] = useState(false);
  const doneHitos = product.hitos.filter(h => h.done).length;
  const totalHitos = product.hitos.length;
  const nextHito = product.hitos.find(h => !h.done);

  return (
    <div
      onClick={() => onOpen(product.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#fff' : '#FAFAFA',
        border: `0.5px solid rgba(0,150,65,0.12)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* SKU + progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color, letterSpacing: '0.3px' }}>{product.codigo || product.id}</span>
        <ProgressRing pct={product.progreso} color={color} size={34} />
      </div>

      {/* Nombre */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2B25', lineHeight: 1.3, marginBottom: 4 }}>
        {product.nombre}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Tag text={product.paisCompania} />
        <Tag text={product.bu} />
      </div>

      {/* Hitos mini bar */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: '#8FA99E' }}>Hitos</span>
          <span style={{ fontSize: 9, color: '#8FA99E' }}>{doneHitos}/{totalHitos}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {product.hitos.map(h => (
            <div key={h.id} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: h.done ? color : '#E5E7EB',
            }} />
          ))}
        </div>
      </div>

      {/* Next pending hito */}
      {nextHito ? (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleHito(product.id, nextHito.id); }}
            title="Marcar como completado"
            style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `1.5px solid ${color}`, background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color, cursor: 'pointer',
            }}
          >✓</button>
          <span style={{ fontSize: 10, color: '#4E6358', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextHito.label}
          </span>
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 10, color: ML_GREEN, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>●</span> Todos los hitos completados
        </div>
      )}
    </div>
  );
}

function Tag({ text }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 6px', borderRadius: 4,
      background: '#E8F0EC', color: '#4E6358', border: '0.5px solid rgba(0,150,65,0.15)',
    }}>
      {text}
    </span>
  );
}

function StageColumn({ stage, products, onOpenDetail }) {
  const { idx, label, color, bg, border } = stage;
  const stageProducts = products.filter(p => p.etapaActual === idx);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Column header */}
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 8, padding: '10px 14px', marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
        </div>
        <span style={{
          background: color, color: '#fff',
          borderRadius: 10, fontSize: 11, fontWeight: 600,
          padding: '2px 8px',
        }}>
          {stageProducts.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {stageProducts.map(p => (
          <ProductCard key={p.id} product={p} color={color} bg={bg} onOpen={onOpenDetail} />
        ))}
        {stageProducts.length === 0 && (
          <div style={{
            border: `1.5px dashed ${border}`, borderRadius: 8,
            padding: '24px 12px', textAlign: 'center',
            color: '#C0C0C0', fontSize: 11,
          }}>
            Sin productos en esta etapa
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ onOpenDetail }) {
  const { data } = useApp();
  const products = data.products;
  const [showNuevo, setShowNuevo] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterStage, setFilterStage] = useState(null); // null = all
  const [filterCompania, setFilterCompania] = useState('');
  const [filterPlanta, setFilterPlanta] = useState('');
  const [search, setSearch] = useState('');

  const matchesSearch = (p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (p.codigo || '').toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q);
  };

  const baseProducts = products.filter(p =>
    (!filterCompania || p.paisCompania === filterCompania) &&
    (!filterPlanta || p.paisPlanta === filterPlanta) &&
    matchesSearch(p)
  );
  const total = baseProducts.length;
  const avgProgreso = total ? Math.round(baseProducts.reduce((s, p) => s + p.progreso, 0) / total) : 0;

  const toggleFilter = (idx) => setFilterStage(prev => prev === idx ? null : idx);
  const visibleStages = filterStage !== null ? STAGES.filter(s => s.idx === filterStage) : STAGES;
  const filteredProducts = products.filter(p =>
    (filterStage === null || p.etapaActual === filterStage) &&
    (!filterCompania || p.paisCompania === filterCompania) &&
    (!filterPlanta || p.paisPlanta === filterPlanta) &&
    matchesSearch(p)
  );
  const hasExtraFilters = filterCompania || filterPlanta || search;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,150,65,0.15)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A2B25', letterSpacing: '-0.01em' }}>Discontinuados</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{ fontSize: 11, color: '#1A2B25', background: '#F0F5F2', border: '0.5px solid rgba(0,150,65,0.2)', borderRadius: 6, padding: '4px 8px', outline: 'none', width: 220 }}
          />
          <select
            value={filterCompania}
            onChange={(e) => setFilterCompania(e.target.value)}
            style={{ fontSize: 11, color: '#4E6358', background: '#F0F5F2', border: '0.5px solid rgba(0,150,65,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Todas las compañías</option>
            {CIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterPlanta}
            onChange={(e) => setFilterPlanta(e.target.value)}
            style={{ fontSize: 11, color: '#4E6358', background: '#F0F5F2', border: '0.5px solid rgba(0,150,65,0.2)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Todas las plantas</option>
            {FABRICANTES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          {(filterStage !== null || hasExtraFilters) && (
            <button onClick={() => { setFilterStage(null); setFilterCompania(''); setFilterPlanta(''); setSearch(''); }} style={{ fontSize: 11, color: '#4E6358', background: '#E6F5ED', border: '0.5px solid rgba(0,150,65,0.2)', borderRadius: 10, padding: '2px 8px', cursor: 'pointer' }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)}
            style={{ background: '#fff', color: ML_GREEN, border: `1px solid ${ML_GREEN}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↑ Carga masiva
          </button>
          <button onClick={() => setShowNuevo(true)}
            style={{ background: ML_GREEN, color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Total en proceso" value={total} sub="productos activos" subColor="#4E6358" valueColor={ML_GREEN}
            active={filterStage === null} onClick={() => setFilterStage(null)} />
          <KpiCard label="En Detección"    value={baseProducts.filter(p => p.etapaActual === 0).length} valueColor="#009641" sub="Etapa 1"
            active={filterStage === 0} onClick={() => toggleFilter(0)} />
          <KpiCard label="En Análisis"     value={baseProducts.filter(p => p.etapaActual === 1).length} valueColor="#007A65" sub="Etapa 2" subColor="#007A65"
            active={filterStage === 1} onClick={() => toggleFilter(1)} />
          <KpiCard label="En Confirmación" value={baseProducts.filter(p => p.etapaActual === 2).length} valueColor="#005A44" sub={`Progreso prom. ${avgProgreso}%`} subColor="#005A44"
            active={filterStage === 2} onClick={() => toggleFilter(2)} />
        </div>

        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)`, gap: 12 }}>
          {visibleStages.map(stage => (
            <StageColumn key={stage.idx} stage={stage} products={filteredProducts} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      </div>

      {showNuevo && <NuevoProducto onClose={() => setShowNuevo(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function KpiCard({ label, value, sub, subColor, valueColor, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? (valueColor ? valueColor + '12' : ML_GREEN_LIGHT) : '#fff',
        border: active ? `1.5px solid ${valueColor || ML_GREEN}` : BORDER,
        borderRadius: 8,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: active ? `0 0 0 1px ${valueColor || ML_GREEN}22` : 'none',
      }}
    >
      <div style={{ fontSize: 11, color: '#6B7F76', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor || '#1A2B25', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || '#6B7F76', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
