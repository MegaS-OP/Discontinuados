import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ML_GREEN = '#0F6E56';
const ML_GREEN_LIGHT = '#E1F5EE';
const ML_ORANGE = '#F5A623';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

const stageLabels = { 0: 'Detección', 1: 'Análisis', 2: 'Confirmación' };
const stageClasses = { 0: 'stage-1', 1: 'stage-2', 2: 'stage-3' };

function Stepper({ etapas, etapaActual }) {
  return (
    <div style={{ display: 'flex', padding: '14px 16px', borderBottom: BORDER }}>
      {[0, 1, 2].map((i) => {
        const isDone = etapas[i].estado === 'completado';
        const isActive = i === etapaActual;
        const circleBg = isDone ? ML_GREEN : isActive ? ML_ORANGE : '#fff';
        const circleBorder = isDone ? ML_GREEN : isActive ? ML_ORANGE : '#D3D1C7';
        const labelColor = isDone ? ML_GREEN : isActive ? ML_ORANGE : '#5F5E5A';
        const connectorBg = etapas[i].estado === 'completado' ? ML_GREEN : BG_SEC;

        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: '60%',
                  width: '80%',
                  height: 2,
                  background: connectorBg,
                  zIndex: 0,
                }}
              />
            )}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 500,
                zIndex: 1,
                border: `2px solid ${circleBorder}`,
                background: circleBg,
                color: isDone || isActive ? '#fff' : '#5F5E5A',
              }}
            >
              {isDone ? '✓' : i + 1}
            </div>
            <div
              style={{
                fontSize: 10,
                color: labelColor,
                marginTop: 4,
                textAlign: 'center',
                fontWeight: isDone || isActive ? 500 : 400,
              }}
            >
              {stageLabels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProductDetail({ productId, onBack }) {
  const { data, addComment, toggleHito, advanceStage } = useApp();
  const [comment, setComment] = useState('');

  const product = data.products.find((p) => p.id === productId);
  if (!product) return null;

  const allCurrentDone = product.hitos.filter((h) => {
    // heuristic: current stage hitos are those not fully done yet from the total set
    return true;
  }) && false; // we'll derive from etapas state instead

  const currentEtapa = product.etapas[product.etapaActual];
  const doneHitos = product.hitos.filter((h) => h.done).length;
  const totalHitos = product.hitos.length;
  const canAdvance = product.etapaActual < 2 && doneHitos === totalHitos;

  const handleSend = () => {
    if (!comment.trim()) return;
    addComment(product.id, comment.trim());
    setComment('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>
          {product.id} — {product.nombre}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {canAdvance && (
            <button
              onClick={() => advanceStage(product.id)}
              style={{ background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
            >
              Avanzar a {stageLabels[product.etapaActual + 1]} →
            </button>
          )}
          <button
            onClick={onBack}
            style={{ background: 'none', border: BORDER, borderRadius: 6, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F5E5A', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Back button */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{ border: BORDER, background: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#5F5E5A', cursor: 'pointer' }}
          >
            ← Volver
          </button>
        </div>

        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden' }}>
          {/* Detail header */}
          <div style={{ padding: '14px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 3 }}>{product.id}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{product.nombre}</div>
              <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 2 }}>
                País: {product.pais} · Área: {product.area} · Inicio: {product.fechaInicio}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className={`stage-pill ${stageClasses[product.etapaActual]}`}>
                {stageLabels[product.etapaActual]}
              </span>
              <button
                onClick={onBack}
                style={{ background: 'none', border: BORDER, borderRadius: 6, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F5E5A', fontSize: 14 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Stepper */}
          <Stepper etapas={product.etapas} etapaActual={product.etapaActual} />

          {/* Milestones */}
          <div style={{ padding: '10px 16px', borderBottom: BORDER }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 8 }}>Hitos del proceso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {product.hitos.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: BG_SEC,
                  }}
                >
                  <button
                    onClick={() => toggleHito(product.id, h.id)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `1.5px solid ${h.done ? ML_GREEN : '#D3D1C7'}`,
                      background: h.done ? ML_GREEN : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: h.done ? '#fff' : 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </button>
                  <span style={{ fontSize: 12, color: '#1A1A1A', flex: 1 }}>{h.label}</span>
                  <span style={{ fontSize: 10, color: '#5F5E5A' }}>{h.area}</span>
                  <span style={{ fontSize: 10, color: '#5F5E5A', marginLeft: 'auto' }}>{h.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div style={{ padding: '10px 16px', borderBottom: BORDER }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 8 }}>Historial de actividades</div>
            {product.actividades.length === 0 ? (
              <div style={{ fontSize: 11, color: '#5F5E5A' }}>Sin actividad registrada.</div>
            ) : (
              product.actividades.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ML_GREEN, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#1A1A1A' }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: '#5F5E5A' }}>{a.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment box */}
          <div style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 6 }}>Agregar comentario</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribí tu comentario o actualización..."
                style={{
                  flex: 1,
                  border: BORDER,
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  background: BG_SEC,
                  color: '#1A1A1A',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                style={{ background: ML_GREEN, color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
