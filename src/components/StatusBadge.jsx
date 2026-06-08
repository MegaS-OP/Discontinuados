const config = {
  pendiente: { label: 'Pendiente', classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
  en_progreso: { label: 'En Progreso', classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  completado: { label: 'Completado', classes: 'bg-green-50 text-green-700 border border-green-200' },
  bloqueado: { label: 'Bloqueado', classes: 'bg-red-50 text-red-700 border border-red-200' },
};

const priority = {
  alta: { label: 'Alta', classes: 'bg-orange-50 text-orange-700 border border-orange-200' },
  media: { label: 'Media', classes: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  baja: { label: 'Baja', classes: 'bg-gray-100 text-gray-600 border border-gray-200' },
};

export function StatusBadge({ status }) {
  const c = config[status] || config.pendiente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  );
}

export function PriorityBadge({ level }) {
  const c = priority[level] || priority.baja;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  );
}
