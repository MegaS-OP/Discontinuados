import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CIAS, FABRICANTES, BUS } from '../data/db';

const ML_GREEN = '#009641';
const BORDER = '0.5px solid rgba(0,150,65,0.15)';
const BG_SEC = '#F0F5F2';

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

export default function EditarProducto({ product, onClose }) {
  const { updateProduct } = useApp();
  const [form, setForm] = useState({
    codigo: product.codigo || '',
    nombre: product.nombre || '',
    paisCompania: product.paisCompania || '',
    paisPlanta: product.paisPlanta || '',
    bu: product.bu || '',
    mph: product.mph || '',
    observaciones: product.observaciones || '',
    levantadoSOPC: product.levantadoSOPC || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.paisCompania) e.paisCompania = 'Requerido';
    if (!form.paisPlanta) e.paisPlanta = 'Requerido';
    if (!form.bu) e.bu = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    updateProduct(product.id, {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      paisCompania: form.paisCompania,
      paisPlanta: form.paisPlanta,
      bu: form.bu,
      mph: form.mph.trim(),
      observaciones: form.observaciones.trim(),
      levantadoSOPC: form.levantadoSOPC,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#fff', borderRadius: 10, width: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG_SEC }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>Editar producto</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#5F5E5A' }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <Field label="Código">
              <input value={form.codigo} onChange={set('codigo')} placeholder="002-001-1077" style={inputStyle} />
            </Field>
            <Field label="Descripción" required>
              <input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Amoxidal Duo Susp 750 mg x 70 ml" style={{ ...inputStyle, borderColor: errors.nombre ? '#C0392B' : undefined }} />
              {errors.nombre && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.nombre}</span>}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cía" required>
              <select value={form.paisCompania} onChange={set('paisCompania')} style={{ ...inputStyle, borderColor: errors.paisCompania ? '#C0392B' : undefined, cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {CIAS.map((c) => <option key={c}>{c}</option>)}
              </select>
              {errors.paisCompania && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.paisCompania}</span>}
            </Field>
            <Field label="Fabricante" required>
              <select value={form.paisPlanta} onChange={set('paisPlanta')} style={{ ...inputStyle, borderColor: errors.paisPlanta ? '#C0392B' : undefined, cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {FABRICANTES.map((f) => <option key={f}>{f}</option>)}
              </select>
              {errors.paisPlanta && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.paisPlanta}</span>}
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="BU" required>
              <select value={form.bu} onChange={set('bu')} style={{ ...inputStyle, borderColor: errors.bu ? '#C0392B' : undefined, cursor: 'pointer' }}>
                <option value="">Seleccionar...</option>
                {BUS.map((b) => <option key={b}>{b}</option>)}
              </select>
              {errors.bu && <span style={{ fontSize: 10, color: '#C0392B' }}>{errors.bu}</span>}
            </Field>
            <Field label="MPH">
              <input value={form.mph} onChange={set('mph')} placeholder="—" style={inputStyle} />
            </Field>
          </div>

          <Field label="¿Se levantó desde la planta?">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '6px 0' }}>
              {['Sí', 'No'].map((opt) => {
                const val = opt === 'Sí' ? 'si' : 'no';
                return (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1A1A1A', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="levantadoSOPC"
                      checked={form.levantadoSOPC === val}
                      onChange={() => setForm((f) => ({ ...f, levantadoSOPC: val }))}
                      style={{ cursor: 'pointer' }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </Field>

          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={set('observaciones')}
              placeholder="Notas o aclaraciones sobre el discontinuado"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>
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
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
