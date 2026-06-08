import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { STAGES } from '../data/db';
import { AlertTriangle, CheckCircle2, Clock, TrendingDown, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="rounded-lg p-3" style={{ backgroundColor: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StageChip({ etapaActual }) {
  const colors = ['#F5A623', '#006B70', '#0F6E56'];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: colors[etapaActual] }}
    >
      {STAGES[etapaActual]}
    </span>
  );
}

export default function Dashboard() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('todas');

  const products = data.products;

  const kpis = {
    total: products.length,
    enProgreso: products.filter((p) => p.etapas[p.etapaActual].estado === 'en_progreso' || p.etapas[p.etapaActual].estado === 'completado').length,
    bloqueados: products.filter((p) =>
      p.etapas.some((e) => e.hitos.some((h) => h.estado === 'bloqueado'))
    ).length,
    confirmados: products.filter((p) => p.etapaActual === 2 && p.etapas[2].estado === 'completado').length,
    altaPrioridad: products.filter((p) => p.prioridad === 'alta').length,
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.laboratorio.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchEtapa = filterEtapa === 'todas' || p.etapaActual === parseInt(filterEtapa);
    return matchSearch && matchEtapa;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#0F6E56' }} className="shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Discontinuados Corporativos</h1>
            <p className="text-sm text-green-200">Megalabs — Gestión de portafolio</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-200">Panel de Control</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={TrendingDown} label="Total productos" value={kpis.total} color="#0F6E56" />
          <KpiCard icon={Clock} label="En proceso" value={kpis.enProgreso} sub="Activos" color="#006B70" />
          <KpiCard icon={AlertTriangle} label="Con bloqueos" value={kpis.bloqueados} sub="Requieren atención" color="#F5A623" />
          <KpiCard icon={CheckCircle2} label="Alta prioridad" value={kpis.altaPrioridad} sub="Urgentes" color="#E05A2B" />
        </div>

        {/* Progress by stage */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Distribución por Etapa</h2>
          <div className="grid grid-cols-3 gap-4">
            {STAGES.map((stage, i) => {
              const count = products.filter((p) => p.etapaActual === i).length;
              const colors = ['#F5A623', '#006B70', '#0F6E56'];
              const pct = products.length ? Math.round((count / products.length) * 100) : 0;
              return (
                <div key={stage} className="text-center">
                  <div className="text-2xl font-bold mb-1" style={{ color: colors[i] }}>{count}</div>
                  <div className="text-sm text-gray-600 mb-2">{stage}</div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, laboratorio o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              style={{ '--tw-ring-color': '#0F6E56' }}
            />
          </div>
          <select
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
          >
            <option value="todas">Todas las etapas</option>
            {STAGES.map((s, i) => (
              <option key={s} value={i}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F7F8FA' }} className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">Producto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Laboratorio</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Etapa</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Prioridad</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Responsable</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">F. Estimada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/producto/${product.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{product.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{product.sku}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.laboratorio}</td>
                  <td className="px-4 py-4">
                    <StageChip etapaActual={product.etapaActual} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={product.etapas[product.etapaActual].estado} />
                  </td>
                  <td className="px-4 py-4">
                    <PriorityBadge level={product.prioridad} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{product.responsable}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{product.fechaEstimada}</td>
                  <td className="px-4 py-4">
                    <ChevronRight size={16} className="text-gray-400" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
