import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { makeHitos } from '../data/db';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

const PAISES = ['Uruguay', 'Argentina', 'Chile', 'Brasil', 'Paraguay', 'Colombia', 'Ecuador', 'Perú', 'Bolivia', 'Venezuela'];
const AREAS = ['Antibióticos', 'Cardiovascular', 'Dermatología', 'Gastroenterología', 'Vitaminas', 'Neurología', 'Oncología', 'Respiratorio', 'Otro'];

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A' }}>
        {label}{required && <span style={{ color: '#C0392B' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  border: BORDER, borderRadius: 6, padding: '6px 10px',
  fontSize: 12, background: '#fff', outline: 'none', width: '100%',
};

export default function NuevoProducto({ onClose }) {
  const { addProduct } = useApp();
  const [form, setForm] = useState({
    sku: '', nombre: '', paisCompania: '', paisPlanta: '', areaTerapeutica: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.sku.trim()) e.sku = 'Requerido';
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.paisCompania) e.paisCompania = 'Requerido';
    if (!form.paisPlanta) e.paisPlanta = 'Requerido';
    if (!form.areaTerapeutica) e.areaTerapeutica = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const now = new Date();
    const fecha = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
    const product = {
      id: `CU-${Date.now().toString().slice(-6)}`,
      sku: form.sku.trim(),
      nombre: form.nombre.trim(),
      paisCompania: form.paisCompania,
      paisPlanta: form.paisPlanta,
      areaTerapeutica: form.areaTerapeutica,
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
      actividades: [
        { id: `A${Date.now()}`, text: 'Producto ingresado al proceso de discontinuados', time: now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + ' ' + now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') },
      ],
    };
    addProduct(product);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, width: 480,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG_SEC }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>Nuevo producto</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#5F5E5A' }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="SKU" required>
              <input value={form.sku} onChange={set('sku')} placeholder="002-001-1077" style={{ ...inputStyle, borderColor: errors.sku ? '#C0392B' : undefined }} />
              {errors.sku && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.sku}</span>}
            </Field>
            <Field label="Nombre del producto" required>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Rowe Comp 500mg" style={{ ...inputStyle, borderColor: errors.nombre ? '#C0392B' : undefined }} />
              {errors.nombre && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.nombre}</span>}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="País Compañía" required>
              <select value={form.paisCompania} onChange={set('paisCompania')} style={{ ...inputStyle, borderColor: errors.paisCompania ? '#C0392B' : undefined, cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {PAISES.map((p) => <option key={p}>{p}</option>)}
              </select>
              {errors.paisCompania && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.paisCompania}</span>}
            </Field>
            <Field label="País Planta" required>
              <select value={form.paisPlanta} onChange={set('paisPlanta')} style={{ ...inputStyle, borderColor: errors.paisPlanta ? '#C0392B' : undefined, cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {PAISES.map((p) => <option key={p}>{p}</option>)}
              </select>
              {errors.paisPlanta && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.paisPlanta}</span>}
            </Field>
          </div>

          <Field label="Área Terapéutica" required>
            <select value={form.areaTerapeutica} onChange={set('areaTerapeutica')} style={{ ...inputStyle, borderColor: errors.areaTerapeutica ? '#C0392B' : undefined, cursor: 'pointer' }}>
              <option value="">Seleccionar...</option>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
            {errors.areaTerapeutica && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.areaTerapeutica}</span>}
          </Field>

          <div style={{ background: BG_SEC, borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#5F5E5A', lineHeight: 1.5 }}>
            Se crearán automáticamente los <strong>13 hitos estándar</strong> del proceso (4 en Detección, 5 en Análisis, 4 en Confirmación) con estado Pendiente.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: BORDER, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ border: BORDER, background: '#fff', borderRadius: 6, padding: '7px 16px', fontSize: 12, color: '#5F5E5A', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Guardando...' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
