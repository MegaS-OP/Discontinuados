import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { makeHitos, HITOS_TEMPLATE } from '../data/db';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Hoja Discontinuados
  const prodData = [
    ['Cia', 'Producto', 'BU', 'Fabricante', 'Observaciones', 'Codigo', 'MPH'],
    ['Arg-Mlb', 'Ejemplo Producto 1', 'Primary', 'Roe-Arg', '', '', ''],
    ['Bol-Mlb', 'Ejemplo Producto 2', 'Consumer', 'Urufarma', 'Reemplazado por X', '002-001-1077', 'ABC'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(prodData);
  ws1['!cols'] = [{ wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 36 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Discontinuados');

  // Hoja Hitos (referencia)
  const hitosRef = [
    ['Etapa', 'Hito', 'Responsable (opcional)', 'Fecha_Compromiso (opcional, DD/MM/YYYY)'],
    ...HITOS_TEMPLATE.map((h) => [['Deteccion', 'Analisis', 'Confirmacion'][h.etapa], h.label, '', '']),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(hitosRef);
  ws2['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Hitos_Referencia');

  XLSX.writeFile(wb, 'Template_Carga_Masiva_Discontinuados.xlsx');
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets['Discontinuados'] || wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) { reject('El archivo no tiene datos'); return; }

        const headers = rows[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
        const idx = {
          codigo: headers.findIndex((h) => h.includes('codigo') || h.includes('sku')),
          nombre: headers.findIndex((h) => h.includes('producto') || h.includes('nombre') || h.includes('descripcion')),
          paisCia: headers.findIndex((h) => h.includes('cia') || h.includes('compan') || h.includes('pais_c')),
          fabricante: headers.findIndex((h) => h.includes('fabricante') || h.includes('planta')),
          bu: headers.findIndex((h) => h.includes('bu') || h.includes('business') || h.includes('area')),
          obs: headers.findIndex((h) => h.includes('observ')),
          mph: headers.findIndex((h) => h === 'mph'),
        };

        const products = [];
        const now = new Date();
        const fecha = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
        const ts = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + ' ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const nombre = String(row[idx.nombre] ?? '').trim();
          if (!nombre) continue;
          const obs = idx.obs >= 0 ? String(row[idx.obs] ?? '').trim() : '';
          const actividades = [
            { id: `A${Date.now()}${i}`, text: 'Producto cargado masivamente', time: ts },
          ];
          if (obs) actividades.push({ id: `AO${Date.now()}${i}`, text: `Observación: ${obs}`, time: ts });

          products.push({
            id: `CU-${Date.now().toString().slice(-6)}${i}`,
            codigo: idx.codigo >= 0 ? String(row[idx.codigo] ?? '').trim() : '',
            mph: idx.mph >= 0 ? String(row[idx.mph] ?? '').trim() : '',
            nombre,
            paisCompania: String(row[idx.paisCia] ?? '').trim() || '',
            paisPlanta: String(row[idx.fabricante] ?? '').trim() || '',
            bu: String(row[idx.bu] ?? '').trim() || '',
            observaciones: obs,
            etapaActual: 0,
            progreso: 0,
            ultimoHito: 'Inicio proceso',
            fechaUltimoHito: fecha,
            fechaInicio: fecha,
            etapas: [
              { nombre: 'Detección', estado: 'en_progreso' },
              { nombre: 'Análisis', estado: 'pendiente' },
              { nombre: 'Confirmación', estado: 'pendiente' },
            ],
            hitos: makeHitos(),
            actividades,
          });
        }
        resolve(products);
      } catch (err) {
        reject('Error al leer el archivo: ' + err.message);
      }
    };
    reader.onerror = () => reject('No se pudo leer el archivo');
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportModal({ onClose }) {
  const { addProducts } = useApp();
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    setError('');
    try {
      const products = await parseExcel(file);
      if (products.length === 0) { setError('No se encontraron productos válidos. Verificá que el archivo tenga datos en la hoja "Discontinuados".'); return; }
      setPreview(products);
      setStep('preview');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Error al procesar el archivo.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    addProducts(preview);
    setStep('done');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG_SEC }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>Carga masiva de productos</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#5F5E5A' }}>✕</button>
        </div>

        <div style={{ padding: '16px' }}>
          {step === 'upload' && (
            <>
              {/* Download template */}
              <div style={{ background: BG_SEC, borderRadius: 8, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A' }}>1. Descargá la plantilla Excel</div>
                  <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 2 }}>Completá los datos y volvé a subir el archivo.</div>
                </div>
                <button
                  onClick={downloadTemplate}
                  style={{ background: '#1D6F42', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  ↓ Plantilla .xlsx
                </button>
              </div>

              {/* Drop zone */}
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 8 }}>2. Subí tu archivo completado</div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current.click()}
                style={{
                  border: `2px dashed ${dragging ? ML_GREEN : '#D3D1C7'}`,
                  borderRadius: 8, padding: '32px 16px',
                  textAlign: 'center', cursor: 'pointer',
                  background: dragging ? '#E1F5EE' : BG_SEC,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Arrastrá el archivo aquí</div>
                <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 4 }}>o hacé click para buscar — solo archivos .xlsx</div>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                  onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
              </div>

              {error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 8 }}>{error}</p>}
            </>
          )}

          {step === 'preview' && (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 10 }}>
                Se encontraron <strong>{preview.length}</strong> productos. Revisá antes de importar:
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', border: BORDER, borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: BG_SEC, position: 'sticky', top: 0 }}>
                      {['Código', 'Descripción', 'Cía', 'Fabricante', 'BU'].map((h) => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 500, color: '#5F5E5A', borderBottom: BORDER }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} style={{ borderBottom: BORDER }}>
                        <td style={{ padding: '6px 10px', color: ML_GREEN, fontWeight: 500 }}>{p.codigo || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{p.nombre}</td>
                        <td style={{ padding: '6px 10px', color: '#5F5E5A' }}>{p.paisCompania}</td>
                        <td style={{ padding: '6px 10px', color: '#5F5E5A' }}>{p.paisPlanta}</td>
                        <td style={{ padding: '6px 10px', color: '#5F5E5A' }}>{p.bu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: '#5F5E5A', marginTop: 8 }}>
                Cada producto se creará con los 15 hitos estándar en estado Pendiente.
              </p>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>
                {preview.length} productos importados correctamente
              </div>
              <div style={{ fontSize: 12, color: '#5F5E5A' }}>Ya podés verlos en el dashboard.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: BORDER, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step === 'preview' && (
            <button onClick={() => setStep('upload')} style={{ border: BORDER, background: '#fff', borderRadius: 6, padding: '7px 16px', fontSize: 12, color: '#5F5E5A', cursor: 'pointer' }}>
              ← Volver
            </button>
          )}
          {step === 'preview' && (
            <button onClick={handleImport} style={{ background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Importar {preview.length} productos
            </button>
          )}
          {(step === 'upload' || step === 'done') && (
            <button onClick={onClose} style={{ background: step === 'done' ? ML_GREEN : '#fff', color: step === 'done' ? '#fff' : '#5F5E5A', border: BORDER, borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              {step === 'done' ? 'Ir al dashboard' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
