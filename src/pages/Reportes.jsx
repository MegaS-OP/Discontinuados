import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

const stageLabels = { 0: 'Detección', 1: 'Análisis', 2: 'Confirmación' };

function exportToExcel(products) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const resumen = products.map((p) => ({
    'CU #': p.id,
    Producto: p.nombre,
    País: p.pais,
    'Área responsable': p.area,
    Etapa: stageLabels[p.etapaActual],
    'Progreso (%)': p.progreso,
    'Último hito': p.ultimoHito,
    Fecha: p.fechaUltimoHito,
    'Inicio proceso': p.fechaInicio,
  }));
  const ws1 = XLSX.utils.json_to_sheet(resumen);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  // Hoja 2: Hitos detalle
  const hitosData = [];
  products.forEach((p) => {
    p.hitos.forEach((h) => {
      hitosData.push({
        'CU #': p.id,
        Producto: p.nombre,
        País: p.pais,
        Hito: h.label,
        Área: h.area,
        Estado: h.done ? 'Completado' : 'Pendiente',
        Fecha: h.date !== '-' ? h.date : '',
      });
    });
  });
  const ws2 = XLSX.utils.json_to_sheet(hitosData);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Hitos');

  // Hoja 3: Historial de actividades
  const actData = [];
  products.forEach((p) => {
    p.actividades.forEach((a) => {
      actData.push({
        'CU #': p.id,
        Producto: p.nombre,
        Actividad: a.text,
        Fecha: a.time,
      });
    });
  });
  const ws3 = XLSX.utils.json_to_sheet(actData);
  ws3['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 50 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Historial');

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Discontinuados_Megalabs_${fecha}.xlsx`);
}

export default function Reportes() {
  const { data } = useApp();
  const [search, setSearch] = useState('');
  const products = data.products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (p.codigo || '').toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q);
  });

  const counts = {
    total: products.length,
    det: products.filter((p) => p.etapaActual === 0).length,
    ana: products.filter((p) => p.etapaActual === 1).length,
    con: products.filter((p) => p.etapaActual === 2).length,
    avgProgreso: products.length
      ? Math.round(products.reduce((s, p) => s + p.progreso, 0) / products.length)
      : 0,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Reportes</div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o descripción..."
          style={{ fontSize: 11, color: '#1A1A1A', background: '#fff', border: BORDER, borderRadius: 6, padding: '4px 8px', outline: 'none', width: 220 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Resumen numérico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total productos', value: counts.total, color: ML_GREEN },
            { label: 'En Detección', value: counts.det, color: '#185FA5' },
            { label: 'En Análisis', value: counts.ana, color: '#854F0B' },
            { label: 'En Confirmación', value: counts.con, color: '#3B6D11' },
          ].map((k) => (
            <div key={k.label} style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Progreso promedio */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Progreso promedio del portafolio</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: ML_GREEN }}>{counts.avgProgreso}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: BG_SEC, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: ML_GREEN, width: `${counts.avgProgreso}%`, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Tabla previa */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '10px 16px', borderBottom: BORDER, background: BG_SEC }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Vista previa — datos a exportar</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: BG_SEC }}>
                {['CU #', 'Producto', 'País', 'Área', 'Etapa', 'Progreso', 'Último hito'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#5F5E5A', borderBottom: BORDER }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: BORDER }}>
                  <td style={{ padding: '8px 12px', color: ML_GREEN, fontWeight: 500, fontSize: 11 }}>{p.id}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{p.nombre}</td>
                  <td style={{ padding: '8px 12px', color: '#5F5E5A' }}>{p.pais}</td>
                  <td style={{ padding: '8px 12px', color: '#5F5E5A', fontSize: 11 }}>{p.area}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: ['#185FA5','#854F0B','#3B6D11'][p.etapaActual] }}>
                      {stageLabels[p.etapaActual]}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 60, height: 4, background: BG_SEC, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: p.progreso < 40 ? '#F5A623' : ML_GREEN, width: `${p.progreso}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#5F5E5A' }}>{p.progreso}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#5F5E5A' }}>{p.ultimoHito}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export buttons */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', marginBottom: 12 }}>Exportar</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => exportToExcel(products)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#1D6F42', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '10px 20px', fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Exportar a Excel (.xlsx)
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: BG_SEC, color: '#5F5E5A',
              border: BORDER, borderRadius: 8,
              padding: '10px 20px', fontSize: 13,
              opacity: 0.6,
              cursor: 'not-allowed',
            }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Exportar a PowerPoint — próximamente
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#5F5E5A', marginTop: 10 }}>
            El Excel incluye 3 hojas: <strong>Resumen</strong>, <strong>Hitos</strong> e <strong>Historial de actividades</strong>.
          </p>
        </div>

      </div>
    </div>
  );
}
