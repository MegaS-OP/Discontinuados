import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ML_GREEN = '#0F6E56';
const ML_GREEN_LIGHT = '#E1F5EE';
const ML_ORANGE = '#F5A623';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

function KpiCard({ label, value, sub, subColor, valueColor }) {
  return (
    <div style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: valueColor || '#1A1A1A' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || '#5F5E5A', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const stageLabels = { 0: 'Detección', 1: 'Análisis', 2: 'Confirmación' };
const stageClasses = { 0: 'stage-1', 1: 'stage-2', 2: 'stage-3' };

export default function Dashboard({ onOpenDetail }) {
  const { data } = useApp();
  const products = data.products;
  const [activeFilter, setActiveFilter] = useState('all');

  const counts = {
    total: products.length,
    det: products.filter((p) => p.etapaActual === 0).length,
    ana: products.filter((p) => p.etapaActual === 1).length,
    con: products.filter((p) => p.etapaActual === 2).length,
  };

  const filtered = activeFilter === 'all'
    ? products
    : products.filter((p) => p.etapaActual === parseInt(activeFilter));

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: '0', label: 'Detección' },
    { key: '1', label: 'Análisis' },
    { key: '2', label: 'Confirmación' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Dashboard — Seguimiento Discontinuados</div>
        <button
          style={{ background: ML_GREEN, color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          + Nuevo producto
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Total en proceso" value={counts.total} sub={`↑ 2 este mes`} subColor={ML_GREEN} />
          <KpiCard label="En detección" value={counts.det} sub="Etapa 1" valueColor="#185FA5" />
          <KpiCard label="En análisis" value={counts.ana} sub="⚠ 2 vencidos" subColor={ML_ORANGE} valueColor="#854F0B" />
          <KpiCard label="En confirmación" value={counts.con} sub="Casi listo" subColor={ML_GREEN} valueColor="#3B6D11" />
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Todos los productos</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  border: BORDER,
                  background: activeFilter === f.key ? ML_GREEN_LIGHT : '#fff',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: activeFilter === f.key ? ML_GREEN : '#5F5E5A',
                  fontWeight: activeFilter === f.key ? 500 : 400,
                  cursor: 'pointer',
                  ...(activeFilter === f.key ? { borderColor: ML_GREEN } : {}),
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: BG_SEC }}>
                {['CU #', 'Producto', 'País', 'Área resp.', 'Etapa', 'Progreso', 'Último hito'].map((h) => (
                  <th
                    key={h}
                    style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', padding: '8px 12px', textAlign: 'left', borderBottom: BORDER }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <TableRow key={p.id} product={p} onOpen={() => onOpenDetail(p.id)} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#5F5E5A', fontSize: 12 }}>
                    Sin productos en esta etapa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TableRow({ product: p, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer', background: hovered ? '#F8F7F4' : 'transparent' }}
    >
      <td style={{ padding: '9px 12px', borderBottom: BORDER, fontWeight: 500, color: ML_GREEN, fontSize: 11 }}>{p.id}</td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER, fontWeight: 500, color: '#1A1A1A' }}>{p.nombre}</td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER, color: '#5F5E5A', fontSize: 12 }}>{p.pais}</td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER, color: '#5F5E5A', fontSize: 11 }}>{p.area}</td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER }}>
        <span className={`stage-pill ${stageClasses[p.etapaActual]}`}>{stageLabels[p.etapaActual]}</span>
      </td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: '#F1EFE8', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                background: p.progreso < 40 ? ML_ORANGE : ML_GREEN,
                width: `${p.progreso}%`,
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: '#5F5E5A', minWidth: 28, textAlign: 'right' }}>{p.progreso}%</span>
        </div>
      </td>
      <td style={{ padding: '9px 12px', borderBottom: BORDER, fontSize: 11, color: '#5F5E5A' }}>
        {p.ultimoHito}{' '}
        <span style={{ color: '#9B9895' }}>{p.fechaUltimoHito}</span>
      </td>
    </tr>
  );
}
