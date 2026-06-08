import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { STAGES } from '../data/db';
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, Circle,
  MessageSquare, Activity, ChevronRight, User, Calendar,
  Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState } from 'react';

function Stepper({ etapas, etapaActual }) {
  const stageColors = ['#F5A623', '#006B70', '#0F6E56'];

  return (
    <div className="flex items-center gap-0">
      {etapas.map((etapa, i) => {
        const isActive = i === etapaActual;
        const isDone = etapa.estado === 'completado';
        const color = stageColors[i];

        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all"
                style={{
                  borderColor: isDone || isActive ? color : '#D1D5DB',
                  backgroundColor: isDone ? color : isActive ? color + '15' : '#F9FAFB',
                  color: isDone ? '#fff' : isActive ? color : '#9CA3AF',
                }}
              >
                {isDone ? <CheckCircle2 size={20} color="#fff" /> : i + 1}
              </div>
              <div className="mt-2 text-center">
                <p
                  className="text-xs font-semibold"
                  style={{ color: isDone || isActive ? color : '#9CA3AF' }}
                >
                  {etapa.nombre}
                </p>
                <StatusBadge status={etapa.estado} />
              </div>
            </div>
            {i < etapas.length - 1 && (
              <div
                className="h-0.5 flex-shrink-0 w-16 mb-8 transition-all"
                style={{ backgroundColor: etapas[i].estado === 'completado' ? stageColors[i] : '#E5E7EB' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function HitoRow({ hito, onStatusChange }) {
  const iconMap = {
    completado: <CheckCircle2 size={16} className="text-green-500" />,
    en_progreso: <Clock size={16} className="text-blue-500" />,
    pendiente: <Circle size={16} className="text-gray-300" />,
    bloqueado: <AlertTriangle size={16} className="text-red-500" />,
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="mt-0.5">{iconMap[hito.estado]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{hito.titulo}</p>
        {hito.notas && <p className="text-xs text-gray-500 mt-0.5">{hito.notas}</p>}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          <span className="flex items-center gap-1"><User size={11} />{hito.responsable}</span>
          <span className="flex items-center gap-1"><Calendar size={11} />Límite: {hito.fechaLimite}</span>
          {hito.fechaCompletado && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={11} />Completado: {hito.fechaCompletado}
            </span>
          )}
        </div>
      </div>
      <select
        value={hito.estado}
        onChange={(e) => onStatusChange(hito.id, e.target.value)}
        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="pendiente">Pendiente</option>
        <option value="en_progreso">En Progreso</option>
        <option value="completado">Completado</option>
        <option value="bloqueado">Bloqueado</option>
      </select>
    </div>
  );
}

function StageCard({ etapa, etapaIdx, isActive, isCurrent, productId, onStatusChange }) {
  const [expanded, setExpanded] = useState(isActive);
  const stageColors = ['#F5A623', '#006B70', '#0F6E56'];
  const color = stageColors[etapaIdx];
  const completedHitos = etapa.hitos.filter((h) => h.estado === 'completado').length;

  return (
    <div
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      style={{ borderColor: isActive ? color : '#F3F4F6', borderWidth: isActive ? 2 : 1 }}
    >
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: color + '20', color }}
          >
            {etapaIdx + 1}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{etapa.nombre}</p>
            <p className="text-xs text-gray-500">{completedHitos}/{etapa.hitos.length} hitos completados</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={etapa.estado} />
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-50">
          {etapa.fechaInicio && (
            <div className="flex gap-4 py-3 text-xs text-gray-500 border-b border-gray-50 mb-2">
              <span>Inicio: <strong>{etapa.fechaInicio}</strong></span>
              {etapa.fechaFin && <span>Fin: <strong>{etapa.fechaFin}</strong></span>}
            </div>
          )}
          {etapa.hitos.map((hito) => (
            <HitoRow
              key={hito.id}
              hito={hito}
              onStatusChange={(hitoId, estado) => onStatusChange(etapaIdx, hitoId, estado)}
            />
          ))}
          {/* Progress bar */}
          <div className="mt-3 pt-3 border-t border-gray-50">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{Math.round((completedHitos / etapa.hitos.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedHitos / etapa.hitos.length) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityFeed({ actividades }) {
  const iconMap = {
    comentario: <MessageSquare size={14} className="text-blue-500" />,
    hito: <CheckCircle2 size={14} className="text-green-500" />,
    cambio_etapa: <ChevronRight size={14} className="text-purple-500" />,
  };

  const bgMap = {
    comentario: 'bg-blue-50',
    hito: 'bg-green-50',
    cambio_etapa: 'bg-purple-50',
  };

  return (
    <div className="space-y-3">
      {actividades.map((a) => (
        <div key={a.id} className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${bgMap[a.tipo] || 'bg-gray-50'}`}>
            {iconMap[a.tipo] || <Activity size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">{a.contenido}</p>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
              <span>{a.autor}</span>
              <span>·</span>
              <span>{new Date(a.fecha).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, addComment, updateHitoEstado, advanceStage } = useApp();
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('etapas');

  const product = data.products.find((p) => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F8FA' }}>
        <div className="text-center">
          <p className="text-gray-500">Producto no encontrado</p>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-brand-green underline">
            Volver al dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStageAllDone = product.etapas[product.etapaActual].hitos.every(
    (h) => h.estado === 'completado'
  );
  const canAdvance = currentStageAllDone && product.etapaActual < 2;

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment(product.id, comment.trim(), 'Usuario');
    setComment('');
  };

  const hasBlocked = product.etapas.some((e) => e.hitos.some((h) => h.estado === 'bloqueado'));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0F6E56' }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-green-200 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al Dashboard
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">{product.nombre}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-green-200">
                <span>{product.laboratorio}</span>
                <span>·</span>
                <span>{product.sku}</span>
                <span>·</span>
                <span>{product.categoria}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PriorityBadge level={product.prioridad} />
              {hasBlocked && (
                <span className="flex items-center gap-1.5 text-xs font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-full">
                  <AlertTriangle size={12} />
                  Hitos bloqueados
                </span>
              )}
              {canAdvance && (
                <button
                  onClick={() => advanceStage(product.id)}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:opacity-90 shadow-sm"
                  style={{ backgroundColor: '#F5A623' }}
                >
                  Avanzar a {STAGES[product.etapaActual + 1]}
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Responsable', value: product.responsable },
            { label: 'Fecha inicio', value: product.fechaInicio },
            { label: 'Fecha estimada', value: product.fechaEstimada },
            { label: 'Etapa actual', value: STAGES[product.etapaActual] },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Progreso del proceso</h2>
          <Stepper etapas={product.etapas} etapaActual={product.etapaActual} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          {[
            { key: 'etapas', label: 'Etapas e Hitos' },
            { key: 'actividad', label: 'Historial' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 text-sm font-medium rounded-md transition-all"
              style={
                activeTab === tab.key
                  ? { backgroundColor: '#0F6E56', color: '#fff' }
                  : { color: '#6B7280' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'etapas' && (
          <div className="grid gap-4">
            {product.etapas.map((etapa, i) => (
              <StageCard
                key={i}
                etapa={etapa}
                etapaIdx={i}
                isActive={i === product.etapaActual}
                isCurrent={i === product.etapaActual}
                productId={product.id}
                onStatusChange={(etapaIdx, hitoId, estado) =>
                  updateHitoEstado(product.id, etapaIdx, hitoId, estado)
                }
              />
            ))}
          </div>
        )}

        {activeTab === 'actividad' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Activity feed */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity size={16} style={{ color: '#0F6E56' }} />
                Historial de actividades
              </h3>
              {product.actividades.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin actividad registrada</p>
              ) : (
                <ActivityFeed actividades={product.actividades} />
              )}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MessageSquare size={16} style={{ color: '#006B70' }} />
                Comentarios
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-80">
                {product.actividades.filter((a) => a.tipo === 'comentario').length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Sin comentarios aún</p>
                ) : (
                  product.actividades
                    .filter((a) => a.tipo === 'comentario')
                    .map((a) => (
                      <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{a.contenido}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                          <span className="font-medium">{a.autor}</span>
                          <span>·</span>
                          <span>{new Date(a.fecha).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un comentario..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#0F6E56' }}
                />
                <button
                  type="submit"
                  disabled={!comment.trim()}
                  className="px-3 py-2 rounded-lg text-white transition-all disabled:opacity-40"
                  style={{ backgroundColor: '#0F6E56' }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
