import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HITOS_CON_EXTRAS } from '../data/db';

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
  const { data, addComment, toggleHito, advanceStage, updateHitoExtras } = useApp();
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
                {product.codigo ? `Código: ${product.codigo} · ` : ''}Cía: {product.paisCompania} · Fabricante: {product.paisPlanta} · BU: {product.bu}{product.mph ? ` · MPH: ${product.mph}` : ''} · Inicio: {product.fechaInicio}
              </div>
              {product.observaciones && (
                <div style={{ fontSize: 11, color: '#854F0B', marginTop: 4, background: '#FAEEDA', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
                  📋 {product.observaciones}
                </div>
              )}
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

          {/* Milestones por etapa */}
          {[0, 1, 2].map((etapaIdx) => {
            const hitosEtapa = product.hitos.filter((h) => h.etapa === etapaIdx);
            const etapaColors = ['#185FA5', '#854F0B', '#3B6D11'];
            const color = etapaColors[etapaIdx];
            const doneCount = hitosEtapa.filter((h) => h.done).length;
            return (
              <div key={etapaIdx} style={{ borderBottom: BORDER }}>
                <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: etapaIdx === product.etapaActual ? BG_SEC : '#fff' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{stageLabels[etapaIdx]}</span>
                  <span style={{ fontSize: 10, color: '#5F5E5A' }}>{doneCount}/{hitosEtapa.length} completados</span>
                </div>
                <div style={{ padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hitosEtapa.map((h) => {
                    const hasExtras = !!HITOS_CON_EXTRAS[h.label];
                    return (
                      <div key={h.id} style={{ borderRadius: 6, background: BG_SEC, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                          <button
                            onClick={() => toggleHito(product.id, h.id)}
                            style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${h.done ? ML_GREEN : '#D3D1C7'}`, background: h.done ? ML_GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: h.done ? '#fff' : 'transparent', cursor: 'pointer', flexShrink: 0 }}
                          >✓</button>
                          <span style={{ fontSize: 12, color: '#1A1A1A', flex: 1 }}>{h.label}</span>
                          <span style={{ fontSize: 10, color: '#5F5E5A' }}>{h.responsable}</span>
                          {h.fechaCompromiso !== '-' && <span style={{ fontSize: 10, color: '#9B9895' }}>📅 {h.fechaCompromiso}</span>}
                          {h.fechaReal !== '-' && <span style={{ fontSize: 10, color: ML_GREEN }}>✓ {h.fechaReal}</span>}
                        </div>
                        {hasExtras && (
                          <div style={{
                            margin: '0 10px 8px 36px',
                            padding: '8px 10px',
                            borderRadius: 4,
                            background: h.label === 'Análisis de granel' ? '#EEF4FF' : '#FFF8EE',
                            border: `0.5px solid ${h.label === 'Análisis de granel' ? '#B8D4F0' : '#F0D4A0'}`,
                            display: 'flex', flexDirection: 'column', gap: 6,
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: h.label === 'Análisis de granel' ? '#185FA5' : '#854F0B', marginBottom: 2 }}>
                              {h.label === 'Análisis de granel' ? '📊 Oficina de Estrategia' : '🏭 Planta'}
                            </div>
                            <textarea
                              value={h.notas || ''}
                              onChange={(e) => updateHitoExtras(product.id, h.id, { notas: e.target.value })}
                              placeholder="Notas del análisis..."
                              rows={2}
                              style={{ width: '100%', border: '0.5px solid #D3D1C7', borderRadius: 4, padding: '5px 8px', fontSize: 11, background: '#fff', color: '#1A1A1A', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: '#5F5E5A', whiteSpace: 'nowrap' }}>Costo / Impacto (USD)</span>
                              <input
                                type="number"
                                value={h.costoImpacto || ''}
                                onChange={(e) => updateHitoExtras(product.id, h.id, { costoImpacto: e.target.value })}
                                placeholder="0.00"
                                style={{ width: 120, border: '0.5px solid #D3D1C7', borderRadius: 4, padding: '4px 8px', fontSize: 11, background: '#fff', color: '#1A1A1A', outline: 'none' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

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
