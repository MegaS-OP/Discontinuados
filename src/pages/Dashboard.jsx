import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HITOS_CON_EXTRAS, CIAS, FABRICANTES } from '../data/db';
import NuevoProducto from '../components/NuevoProducto';
import ImportModal from '../components/ImportModal';

const ML_GREEN = '#009641';
const ML_GREEN_LIGHT = '#E6F5ED';
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
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={4} />
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
        background: '#fff',
        border: `1px solid ${hovered ? color : 'rgba(0,0,0,0.07)'}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.3px', background: bg, padding: '2px 7px', borderRadius: 6 }}>{product.codigo || product.id}</span>
        <ProgressRing pct={product.progreso} color={color} size={34} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2B25', lineHeight: 1.3, marginBottom: 6 }}>
        {product.nombre}
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <Tag text={product.paisCompania} />
        <Tag text={product.bu} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#8FA99E', fontWeight: 500 }}>HITOS</span>
          <span style={{ fontSize: 9, color: '#8FA99E' }}>{doneHitos}/{totalHitos}</span>
        </div>
        <div style={{ height: 4, background: '#F0F0F0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${totalHitos ? (doneHitos/totalHitos)*100 : 0}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>
      {nextHito ? (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
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
          <span style={{ fontSize: 10, color: '#6B7F76', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextHito.label}
          </span>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 10, color: ML_GREEN, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>●</span> Todos los hitos completados
        </div>
      )}
    </div>
  );
}

function Tag({ text }) {
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 20,
      background: '#F0F5F2', color: '#4E6358', fontWeight: 500,
      border: '0.5px solid rgba(0,150,65,0.15)',
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
      <div style={{
        background: '#fff',
        border: `1px solid rgba(0,0,0,0.07)`,
        borderTop: `3px solid ${color}`,
        borderRadius: 10, padding: '10px 14px', marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A2B25' }}>{label}</span>
        </div>
        <span style={{
          background: color, color: '#fff',
          borderRadius: 20, fontSize: 11, fontWeight: 700,
          padding: '2px 10px',
        }}>
          {stageProducts.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {stageProducts.map(p => (
          <ProductCard key={p.id} product={p} color={color} bg={bg} onOpen={onOpenDetail} />
        ))}
        {stageProducts.length === 0 && (
          <div style={{
            border: `1.5px dashed ${border}`, borderRadius: 10,
            padding: '24px 12px', textAlign: 'center',
            color: '#C0C0C0', fontSize: 11, background: '#FAFAFA',
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
  const [filterStage, setFilterStage] = useState(null);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#F5F7F6' }}>

      {/* Hero header */}
      <div style={{
        background: 'linear-gradient(135deg, #003D2E 0%, #006B52 55%, #00A07A 100%)',
        padding: '20px 24px 22px',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '40%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(120,215,33,0.06)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#78D721', boxShadow: '0 0 0 2px rgba(120,215,33,0.25)' }} />
              S&OP Global · Megalabs
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Discontinuados Corporativos
            </div>
          </div>

          {/* KPI chips */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[
              { value: total, label: 'En proceso' },
              { value: baseProducts.filter(p => p.etapaActual === 0).length, label: 'Detección' },
              { value: baseProducts.filter(p => p.etapaActual === 1).length, label: 'Análisis' },
              { value: `${avgProgreso}%`, label: 'Avance prom.' },
            ].map((k) => (
              <div key={k.label} style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 60,
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2, whiteSpace: 'nowrap' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{ fontSize: 11, color: '#1A2B25', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 8, padding: '7px 12px', outline: 'none', width: 240 }}
          />
          <select
            value={filterCompania}
            onChange={(e) => setFilterCompania(e.target.value)}
            style={{ fontSize: 11, color: '#1A2B25', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Todas las compañías</option>
            {CIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterPlanta}
            onChange={(e) => setFilterPlanta(e.target.value)}
            style={{ fontSize: 11, color: '#1A2B25', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Todas las plantas</option>
            {FABRICANTES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          {(filterStage !== null || hasExtraFilters) && (
            <button onClick={() => { setFilterStage(null); setFilterCompania(''); setFilterPlanta(''); setSearch(''); }}
              style={{ fontSize: 11, color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
              ✕ Limpiar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowImport(true)}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ↑ Carga masiva
          </button>
          <button onClick={() => setShowNuevo(true)}
            style={{ background: '#78D721', color: '#003D2E', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Stage filter tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 24px', display: 'flex', gap: 4, flexShrink: 0 }}>
        {[{ label: 'Todos', idx: null }, ...STAGES.map(s => ({ label: s.label, idx: s.idx, color: s.color }))].map((tab) => {
          const isActive = filterStage === tab.idx;
          return (
            <button
              key={String(tab.idx)}
              onClick={() => tab.idx === null ? setFilterStage(null) : toggleFilter(tab.idx)}
              style={{
                padding: '10px 16px', fontSize: 12, fontWeight: isActive ? 700 : 400,
                color: isActive ? (tab.color || ML_GREEN) : '#6B7F76',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: isActive ? `2px solid ${tab.color || ML_GREEN}` : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.12s', fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Kanban */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleStages.length}, 1fr)`, gap: 14 }}>
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
