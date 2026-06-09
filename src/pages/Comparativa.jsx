import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CIAS } from '../data/db';

const ML_GREEN = '#0F6E56';
const ML_GREEN_LIGHT = '#E1F5EE';
const ML_ORANGE = '#F5A623';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';
const HIST_KEY = 'mgl_comparativa_hist';

const YEAR_COLORS = {
  2024: { color: '#185FA5', bg: '#E6F1FB', border: '#B8D4F0' },
  2025: { color: '#854F0B', bg: '#FAEEDA', border: '#F0D4A0' },
  2026: { color: ML_GREEN, bg: ML_GREEN_LIGHT, border: '#A8D8C8' },
};

function loadHist() {
  try {
    const s = localStorage.getItem(HIST_KEY);
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  // Default zeros for all CIAs
  const obj = {};
  CIAS.forEach((c) => { obj[c] = { mph: '', y2024: '', y2025: '' }; });
  return obj;
}

function saveHist(h) {
  localStorage.setItem(HIST_KEY, JSON.stringify(h));
}

function KpiCard({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, minWidth: 24, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function Comparativa() {
  const { data } = useApp();
  const [hist, setHist] = useState(loadHist);
  const [editing, setEditing] = useState(null); // { cia, field }

  useEffect(() => { saveHist(hist); }, [hist]);

  // Ensure all CIAs exist in hist
  useEffect(() => {
    setHist((prev) => {
      const next = { ...prev };
      let changed = false;
      CIAS.forEach((c) => {
        if (!next[c]) { next[c] = { mph: '', y2024: '', y2025: '' }; changed = true; }
      });
      return changed ? next : prev;
    });
  }, []);

  // Count 2026 products per CIA from live data
  const count2026 = {};
  CIAS.forEach((c) => { count2026[c] = 0; });
  data.products.forEach((p) => { if (count2026[p.paisCompania] !== undefined) count2026[p.paisCompania]++; });

  const total2026 = data.products.length;
  const total2025 = CIAS.reduce((s, c) => s + (parseInt(hist[c]?.y2025) || 0), 0);
  const total2024 = CIAS.reduce((s, c) => s + (parseInt(hist[c]?.y2024) || 0), 0);

  const max2026 = Math.max(...CIAS.map((c) => count2026[c] || 0), 1);
  const max2025 = Math.max(...CIAS.map((c) => parseInt(hist[c]?.y2025) || 0), 1);
  const max2024 = Math.max(...CIAS.map((c) => parseInt(hist[c]?.y2024) || 0), 1);

  const setField = (cia, field, value) => {
    setHist((prev) => ({ ...prev, [cia]: { ...prev[cia], [field]: value } }));
  };

  const EditableNum = ({ cia, field, color }) => {
    const val = hist[cia]?.[field] ?? '';
    const isEditing = editing?.cia === cia && editing?.field === field;
    if (isEditing) {
      return (
        <input
          autoFocus
          type="number"
          min="0"
          value={val}
          onChange={(e) => setField(cia, field, e.target.value)}
          onBlur={() => setEditing(null)}
          onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
          style={{ width: 60, border: `1px solid ${color}`, borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'center', outline: 'none', color }}
        />
      );
    }
    return (
      <div
        onClick={() => setEditing({ cia, field })}
        title="Clic para editar"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 28, padding: '2px 8px', borderRadius: 4,
          fontSize: 12, fontWeight: val ? 600 : 400,
          color: val ? color : '#C0C0C0',
          background: val ? (field === 'mph' ? '#F8F7F4' : YEAR_COLORS[field === 'y2024' ? 2024 : 2025].bg) : '#F8F7F4',
          border: `0.5px solid ${val ? (field === 'mph' ? '#D3D1C7' : YEAR_COLORS[field === 'y2024' ? 2024 : 2025].border) : '#E5E7EB'}`,
          cursor: 'pointer',
        }}
      >
        {val || '—'}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Comparativa de Discontinuados</div>
        <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 2 }}>Evolución anual por compañía · Hacé clic en los valores de 2024, 2025 y MPH para editarlos</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <KpiCard label="Discontinuados 2024" value={total2024 || '—'} {...YEAR_COLORS[2024]} />
          <KpiCard label="Discontinuados 2025" value={total2025 || '—'} {...YEAR_COLORS[2025]} />
          <KpiCard label="Discontinuados 2026" value={total2026} {...YEAR_COLORS[2026]} />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: BORDER, background: BG_SEC, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>Desglose por Compañía</span>
            <span style={{ fontSize: 10, color: '#9B9895' }}>Hacé clic en 2024, 2025 o MPH para cargar el dato</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: BG_SEC }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#5F5E5A', borderBottom: BORDER, width: '18%' }}>Compañía</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, color: '#5F5E5A', borderBottom: BORDER, width: '10%' }}>MPH</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: YEAR_COLORS[2024].color, borderBottom: BORDER, width: '24%' }}>2024</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: YEAR_COLORS[2025].color, borderBottom: BORDER, width: '24%' }}>2025</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: YEAR_COLORS[2026].color, borderBottom: BORDER, width: '24%' }}>2026</th>
              </tr>
            </thead>
            <tbody>
              {CIAS.map((cia, i) => {
                const v26 = count2026[cia] || 0;
                const v25 = parseInt(hist[cia]?.y2025) || 0;
                const v24 = parseInt(hist[cia]?.y2024) || 0;
                const trend = v25 > 0 ? ((v26 - v25) / v25 * 100).toFixed(0) : null;
                return (
                  <tr key={cia} style={{ borderBottom: BORDER, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1A1A1A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ML_GREEN, flexShrink: 0 }} />
                        {cia}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <EditableNum cia={cia} field="mph" color="#5F5E5A" />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <EditableNum cia={cia} field="y2024" color={YEAR_COLORS[2024].color} />
                        {v24 > 0 && <MiniBar value={v24} max={max2024} color={YEAR_COLORS[2024].color} />}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <EditableNum cia={cia} field="y2025" color={YEAR_COLORS[2025].color} />
                        {v25 > 0 && <MiniBar value={v25} max={max2025} color={YEAR_COLORS[2025].color} />}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: v26 ? 600 : 400, color: v26 ? ML_GREEN : '#C0C0C0' }}>{v26 || '—'}</span>
                          {trend !== null && v26 > 0 && (
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
                              background: parseInt(trend) > 0 ? '#FAEEDA' : ML_GREEN_LIGHT,
                              color: parseInt(trend) > 0 ? ML_ORANGE : ML_GREEN,
                            }}>
                              {parseInt(trend) > 0 ? '▲' : '▼'}{Math.abs(trend)}%
                            </span>
                          )}
                        </div>
                        {v26 > 0 && <MiniBar value={v26} max={max2026} color={ML_GREEN} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ background: BG_SEC, borderTop: `1px solid #D3D1C7` }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: '#1A1A1A', fontSize: 12 }}>TOTAL</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#5F5E5A', fontWeight: 600 }}>—</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: YEAR_COLORS[2024].color, fontSize: 13 }}>{total2024 || '—'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: YEAR_COLORS[2025].color, fontSize: 13 }}>{total2025 || '—'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: ML_GREEN, fontSize: 13 }}>{total2026}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 10, color: '#9B9895' }}>
          * Los datos de 2024 y 2025 se ingresan manualmente. Los de 2026 se calculan automáticamente del dashboard. Los cambios se guardan automáticamente.
        </div>
      </div>
    </div>
  );
}
