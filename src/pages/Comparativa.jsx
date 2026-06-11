import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CIAS, BUS } from '../data/db';

const ML_GREEN = '#0F6E56';
const ML_GREEN_LIGHT = '#E1F5EE';
const ML_ORANGE = '#F5A623';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';
const HIST_KEY = 'mgl_comparativa_hist';

const Y_COLORS = {
  2024: '#185FA5',
  2025: '#854F0B',
  2026: ML_GREEN,
};
const Y_BG = {
  2024: '#E6F1FB',
  2025: '#FAEEDA',
  2026: ML_GREEN_LIGHT,
};

function loadHist() {
  try {
    const s = localStorage.getItem(HIST_KEY);
    if (s) return JSON.parse(s);
  } catch { /**/ }
  const obj = {};
  CIAS.forEach((c) => { obj[c] = { y2024: '', y2025: '' }; });
  return obj;
}

// Simple horizontal bar chart
function BarChart({ rows, year, color, max }) {
  const barMax = max || Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 72, fontSize: 10, color: '#5F5E5A', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
          <div style={{ flex: 1, height: 14, background: '#F1EFE8', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / barMax) * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s', minWidth: r.value > 0 ? 4 : 0 }} />
          </div>
          <div style={{ width: 24, fontSize: 10, fontWeight: 600, color, textAlign: 'right', flexShrink: 0 }}>{r.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, color, bg, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? bg : '#fff',
        border: active ? `2px solid ${color}` : BORDER,
        borderRadius: 8, padding: '12px 16px',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: active ? `0 2px 10px ${color}33` : 'none',
      }}
    >
      <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {active && <span style={{ fontSize: 9, background: color, color: '#fff', borderRadius: 8, padding: '1px 5px', fontWeight: 600 }}>activo</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color }}>{value || '—'}</div>
    </div>
  );
}

function EditableNum({ value, onChange, color, bg }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        defaultValue={value}
        onBlur={(e) => { onChange(e.target.value); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onChange(e.target.value); setEditing(false); } }}
        style={{ width: 56, border: `1.5px solid ${color}`, borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'center', outline: 'none' }}
      />
    );
  }
  return (
    <div
      onClick={() => setEditing(true)}
      title="Clic para editar"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 36, padding: '3px 8px', borderRadius: 4,
        fontSize: 12, fontWeight: value ? 600 : 400,
        color: value ? color : '#C0C0C0',
        background: value ? bg : '#F8F7F4',
        border: `0.5px solid ${value ? color + '55' : '#E5E7EB'}`,
        cursor: 'pointer',
      }}
    >
      {value || '—'}
    </div>
  );
}

export default function Comparativa() {
  const { data } = useApp();
  const [hist, setHist] = useState(loadHist);
  const [filterCia, setFilterCia] = useState('');
  const [filterBu, setFilterBu] = useState('');
  const [vista, setVista] = useState('cia'); // 'cia' | 'bu'
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(null); // 2024 | 2025 | 2026 | null

  const toggleYear = (y) => setSelectedYear((prev) => prev === y ? null : y);

  useEffect(() => { localStorage.setItem(HIST_KEY, JSON.stringify(hist)); }, [hist]);
  useEffect(() => {
    setHist((prev) => {
      const next = { ...prev };
      let changed = false;
      CIAS.forEach((c) => { if (!next[c]) { next[c] = { y2024: '', y2025: '' }; changed = true; } });
      return changed ? next : prev;
    });
  }, []);

  const setHistField = (cia, field, val) =>
    setHist((prev) => ({ ...prev, [cia]: { ...prev[cia], [field]: val } }));

  // Filtered products
  const filtered = data.products.filter((p) => {
    if (filterCia && p.paisCompania !== filterCia) return false;
    if (filterBu && p.bu !== filterBu) return false;
    return true;
  });

  // Count 2026 by CIA
  const count2026byCia = {};
  CIAS.forEach((c) => { count2026byCia[c] = 0; });
  filtered.forEach((p) => { if (count2026byCia[p.paisCompania] !== undefined) count2026byCia[p.paisCompania]++; });

  // Count 2026 by BU
  const count2026byBu = {};
  BUS.forEach((b) => { count2026byBu[b] = 0; });
  filtered.forEach((p) => { if (count2026byBu[p.bu] !== undefined) count2026byBu[p.bu]++; });

  const total2026 = filtered.length;
  const total2025 = filterCia
    ? (parseInt(hist[filterCia]?.y2025) || 0)
    : CIAS.reduce((s, c) => s + (parseInt(hist[c]?.y2025) || 0), 0);
  const total2024 = filterCia
    ? (parseInt(hist[filterCia]?.y2024) || 0)
    : CIAS.reduce((s, c) => s + (parseInt(hist[c]?.y2024) || 0), 0);

  const ciaRows = CIAS
    .filter((c) => !filterCia || c === filterCia)
    .map((c) => ({ label: c, value: count2026byCia[c] || 0 }))
    .filter((r) => !filterBu || r.value > 0);

  const buRows = BUS
    .filter((b) => !filterBu || b === filterBu)
    .map((b) => ({ label: b, value: count2026byBu[b] || 0 }));

  const chartRows = vista === 'cia' ? ciaRows : buRows;
  const chartMax = Math.max(...chartRows.map((r) => r.value), 1);

  const hasFilters = filterCia || filterBu;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Comparativa de Discontinuados</div>
          <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 1 }}>Evolución anual · 2024 y 2025 se cargan manualmente, 2026 es automático</div>
        </div>
        {hasFilters && (
          <button onClick={() => { setFilterCia(''); setFilterBu(''); }}
            style={{ fontSize: 11, color: '#5F5E5A', background: BG_SEC, border: BORDER, borderRadius: 10, padding: '3px 10px', cursor: 'pointer' }}>
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#5F5E5A', fontWeight: 500 }}>Filtrar por:</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o descripción..."
            style={{ fontSize: 11, color: '#1A1A1A', background: '#fff', border: BORDER, borderRadius: 6, padding: '4px 8px', outline: 'none', width: 200 }}
          />
          <select value={filterCia} onChange={(e) => setFilterCia(e.target.value)}
            style={{ border: filterCia ? `1.5px solid ${ML_GREEN}` : BORDER, borderRadius: 6, padding: '5px 10px', fontSize: 12, background: '#fff', cursor: 'pointer', color: filterCia ? ML_GREEN : '#5F5E5A', outline: 'none' }}>
            <option value="">Todas las Cías</option>
            {CIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={filterBu} onChange={(e) => setFilterBu(e.target.value)}
            style={{ border: filterBu ? `1.5px solid ${ML_ORANGE}` : BORDER, borderRadius: 6, padding: '5px 10px', fontSize: 12, background: '#fff', cursor: 'pointer', color: filterBu ? '#854F0B' : '#5F5E5A', outline: 'none' }}>
            <option value="">Todas las BUs</option>
            {BUS.map((b) => <option key={b}>{b}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['cia', 'bu'].map((v) => (
              <button key={v} onClick={() => setVista(v)}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: BORDER, cursor: 'pointer', background: vista === v ? ML_GREEN : '#fff', color: vista === v ? '#fff' : '#5F5E5A', fontWeight: vista === v ? 500 : 400 }}>
                Por {v === 'cia' ? 'Compañía' : 'BU'}
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Discontinuados 2024" value={total2024} color={Y_COLORS[2024]} bg={Y_BG[2024]} active={selectedYear === 2024} onClick={() => toggleYear(2024)} />
          <KpiCard label="Discontinuados 2025" value={total2025} color={Y_COLORS[2025]} bg={Y_BG[2025]} active={selectedYear === 2025} onClick={() => toggleYear(2025)} />
          <KpiCard label="Discontinuados 2026" value={total2026} color={Y_COLORS[2026]} bg={Y_BG[2026]} active={selectedYear === 2026} onClick={() => toggleYear(2026)} />
        </div>

        {/* Chart + Table layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>

          {/* Chart */}
          <div style={{ background: '#fff', border: selectedYear ? `2px solid ${Y_COLORS[selectedYear]}` : BORDER, borderRadius: 8, padding: '12px 14px', transition: 'border 0.2s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
              {selectedYear || 2026} · {vista === 'cia' ? 'Por Compañía' : 'Por BU'}
            </div>
            <BarChart
              rows={selectedYear === 2024
                ? (vista === 'cia' ? CIAS.filter(c => !filterCia || c === filterCia).map(c => ({ label: c, value: parseInt(hist[c]?.y2024) || 0 })) : buRows)
                : selectedYear === 2025
                  ? (vista === 'cia' ? CIAS.filter(c => !filterCia || c === filterCia).map(c => ({ label: c, value: parseInt(hist[c]?.y2025) || 0 })) : buRows)
                  : chartRows}
              color={Y_COLORS[selectedYear || 2026]}
              max={null}
            />
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: BG_SEC }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#5F5E5A', borderBottom: BORDER }}>
                    {vista === 'cia' ? 'Compañía' : 'BU'}
                  </th>
                  {vista === 'cia' && (
                    <>
                      <th onClick={() => toggleYear(2024)} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: Y_COLORS[2024], borderBottom: BORDER, cursor: 'pointer', background: selectedYear === 2024 ? Y_BG[2024] : 'transparent' }}>2024 {selectedYear === 2024 ? '▲' : ''}</th>
                      <th onClick={() => toggleYear(2025)} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: Y_COLORS[2025], borderBottom: BORDER, cursor: 'pointer', background: selectedYear === 2025 ? Y_BG[2025] : 'transparent' }}>2025 {selectedYear === 2025 ? '▲' : ''}</th>
                    </>
                  )}
                  <th onClick={() => toggleYear(2026)} style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: Y_COLORS[2026], borderBottom: BORDER, cursor: 'pointer', background: selectedYear === 2026 ? Y_BG[2026] : 'transparent' }}>2026 {selectedYear === 2026 ? '▲' : ''}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: '#5F5E5A', borderBottom: BORDER }}>% del total</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: '#5F5E5A', borderBottom: BORDER }}></th>
                </tr>
              </thead>
              <tbody>
                {(vista === 'cia' ? ciaRows : buRows).map((row, i) => {
                  const cia = row.label;
                  const v26 = row.value;
                  const v25 = vista === 'cia' ? (parseInt(hist[cia]?.y2025) || 0) : null;
                  const v24 = vista === 'cia' ? (parseInt(hist[cia]?.y2024) || 0) : null;
                  const pct = total2026 > 0 ? ((v26 / total2026) * 100).toFixed(1) : 0;
                  const trend = v25 > 0 && v26 > 0 ? ((v26 - v25) / v25 * 100).toFixed(0) : null;
                  const isExpanded = expanded === cia;
                  return (
                    <tr key={cia} style={{ borderBottom: BORDER, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 500, color: '#1A1A1A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: ML_GREEN, flexShrink: 0 }} />
                          {cia}
                        </div>
                      </td>
                      {vista === 'cia' && (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center', background: selectedYear === 2024 ? Y_BG[2024] : 'transparent', opacity: selectedYear && selectedYear !== 2024 ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                            <EditableNum value={v24 || ''} onChange={(val) => setHistField(cia, 'y2024', val)} color={Y_COLORS[2024]} bg={Y_BG[2024]} />
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', background: selectedYear === 2025 ? Y_BG[2025] : 'transparent', opacity: selectedYear && selectedYear !== 2025 ? 0.3 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <EditableNum value={v25 || ''} onChange={(val) => setHistField(cia, 'y2025', val)} color={Y_COLORS[2025]} bg={Y_BG[2025]} />
                              {trend !== null && (
                                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 3px', borderRadius: 3, background: parseInt(trend) > 0 ? '#FAEEDA' : ML_GREEN_LIGHT, color: parseInt(trend) > 0 ? ML_ORANGE : ML_GREEN }}>
                                  {parseInt(trend) > 0 ? '▲' : '▼'}{Math.abs(trend)}%
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: v26 ? 600 : 400, color: v26 ? ML_GREEN : '#C0C0C0', fontSize: 13, background: selectedYear === 2026 ? Y_BG[2026] : 'transparent', opacity: selectedYear && selectedYear !== 2026 ? 0.3 : 1, transition: 'opacity 0.2s' }}>{v26 || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {v26 > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                            <div style={{ width: 36, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: ML_GREEN, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 10, color: '#5F5E5A' }}>{pct}%</span>
                          </div>
                        ) : <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {v26 > 0 && (
                          <button onClick={() => setExpanded(isExpanded ? null : cia)}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: BORDER, background: isExpanded ? BG_SEC : '#fff', cursor: 'pointer', color: '#5F5E5A' }}>
                            {isExpanded ? '▲ Cerrar' : '▼ SKUs'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals */}
                <tr style={{ background: BG_SEC, borderTop: `1px solid #D3D1C7` }}>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color: '#1A1A1A' }}>TOTAL</td>
                  {vista === 'cia' && (
                    <>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: Y_COLORS[2024] }}>{total2024 || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: Y_COLORS[2025] }}>{total2025 || '—'}</td>
                    </>
                  )}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: ML_GREEN, fontSize: 13 }}>{total2026}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 11, color: '#5F5E5A', fontWeight: 500 }}>100%</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expanded SKU list */}
        {expanded && (() => {
          const q = search.trim().toLowerCase();
          const skus = filtered.filter((p) => (vista === 'cia' ? p.paisCompania : p.bu) === expanded)
            .filter((p) => !q || (p.codigo || '').toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q));
          const stageLabels = { 0: 'Detección', 1: 'Análisis', 2: 'Confirmación' };
          const stageColors = { 0: '#185FA5', 1: '#854F0B', 2: ML_GREEN };
          return (
            <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '10px 16px', borderBottom: BORDER, background: BG_SEC, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                  {skus.length} {skus.length === 1 ? 'producto' : 'productos'} · {expanded}
                </span>
                <button onClick={() => setExpanded(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#5F5E5A', fontSize: 13 }}>✕</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: BG_SEC }}>
                    {['ID', 'Descripción', 'Código', 'Fabricante', 'BU', 'MPH', 'Etapa', 'Progreso'].map((h) => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: '#5F5E5A', borderBottom: BORDER }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skus.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: BORDER, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                      <td style={{ padding: '6px 12px', color: ML_GREEN, fontWeight: 500 }}>{p.id}</td>
                      <td style={{ padding: '6px 12px', color: '#1A1A1A' }}>{p.nombre}</td>
                      <td style={{ padding: '6px 12px', color: '#9B9895' }}>{p.codigo || '—'}</td>
                      <td style={{ padding: '6px 12px', color: '#5F5E5A' }}>{p.paisPlanta || '—'}</td>
                      <td style={{ padding: '6px 12px', color: '#5F5E5A' }}>{p.bu}</td>
                      <td style={{ padding: '6px 12px', color: '#5F5E5A' }}>{p.mph || '—'}</td>
                      <td style={{ padding: '6px 12px' }}>
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: Y_BG[p.etapaActual] || BG_SEC, color: stageColors[p.etapaActual] || '#5F5E5A', fontWeight: 500 }}>
                          {stageLabels[p.etapaActual]}
                        </span>
                      </td>
                      <td style={{ padding: '6px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${p.progreso}%`, height: '100%', background: ML_GREEN, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: ML_GREEN, fontWeight: 600 }}>{p.progreso}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        <div style={{ fontSize: 10, color: '#9B9895', marginTop: 4 }}>
          * Los datos de 2024 y 2025 se ingresan manualmente (clic en el valor). Los de 2026 son automáticos. Los cambios se guardan al instante.
        </div>
      </div>
    </div>
  );
}
