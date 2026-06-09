export const STAGES = ['Detección', 'Análisis', 'Confirmación'];

// Hitos estándar del proceso — igual para todos los productos
export const HITOS_TEMPLATE = [
  { etapa: 0, label: 'Definición MKT' },
  { etapa: 0, label: 'Compliance' },
  { etapa: 0, label: 'AARR' },
  { etapa: 0, label: 'Presupuesto' },
  { etapa: 1, label: 'Inventario PT' },
  { etapa: 1, label: 'Producción en curso' },
  { etapa: 1, label: 'Inventario materiales' },
  { etapa: 1, label: 'Costo destrucción' },
  { etapa: 1, label: 'Última OC' },
  { etapa: 1, label: 'Análisis de granel' },
  { etapa: 1, label: 'Análisis de impacto planta' },
  { etapa: 2, label: 'Confirmación MKT' },
  { etapa: 2, label: 'Plan desagote' },
  { etapa: 2, label: 'Inactivación código' },
  { etapa: 2, label: 'Notificación final' },
];

// Hitos que tienen campos extra
export const HITOS_CON_EXTRAS = {
  'Análisis de granel': { notas: true, costoImpacto: true },
  'Análisis de impacto planta': { notas: true, costoImpacto: true },
};

export const RESPONSABLES_DEFAULT = {
  'Definición MKT': 'Mkt Corp',
  'Compliance': 'Compliance',
  'AARR': 'AARR',
  'Presupuesto': 'Finanzas',
  'Inventario PT': 'Planta',
  'Producción en curso': 'Planta',
  'Inventario materiales': 'Planta',
  'Costo destrucción': 'Planta',
  'Última OC': 'Supply Corp',
  'Análisis de granel': 'Oficina de Estrategia',
  'Análisis de impacto planta': 'Planta',
  'Confirmación MKT': 'Mkt Corp',
  'Plan desagote': 'Supply Corp',
  'Inactivación código': 'Supply Corp',
  'Notificación final': 'S&OP',
};

function defaultResponsable(label) {
  return RESPONSABLES_DEFAULT[label] || '';
}

export function makeHitos(overrides = []) {
  return HITOS_TEMPLATE.map((t, i) => {
    const ov = overrides.find((o) => o.label === t.label) || {};
    return {
      id: `H${i}_${Date.now()}`,
      etapa: t.etapa,
      label: t.label,
      responsable: ov.responsable || defaultResponsable(t.label),
      done: ov.done || false,
      fechaCompromiso: ov.fechaCompromiso || '-',
      fechaReal: ov.fechaReal || '-',
      ...(HITOS_CON_EXTRAS[t.label] ? { notas: ov.notas || '', costoImpacto: ov.costoImpacto || '' } : {}),
    };
  });
}

export function calcEtapaActual(hitos) {
  const doneByEtapa = [0, 1, 2].map((e) => {
    const etapaHitos = hitos.filter((h) => h.etapa === e);
    return etapaHitos.length > 0 && etapaHitos.every((h) => h.done);
  });
  if (doneByEtapa[0] && doneByEtapa[1]) return 2;
  if (doneByEtapa[0]) return 1;
  return 0;
}

const initialData = {
  products: [
    {
      id: 'CU-125678',
      sku: '002-001-1077',
      nombre: 'Rowe Comp 500mg',
      paisCompania: 'Uruguay',
      paisPlanta: 'Uruguay',
      areaTerapeutica: 'Antibióticos',
      etapaActual: 1,
      progreso: 60,
      ultimoHito: 'Inventario PT',
      fechaUltimoHito: '20/05/2025',
      fechaInicio: '01/05/2025',
      etapas: [
        { nombre: 'Detección', estado: 'completado' },
        { nombre: 'Análisis', estado: 'en_progreso' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: [
        { id: 'H001', etapa: 0, label: 'Definición MKT', responsable: 'Mkt Corp', done: true, fechaCompromiso: '10/05/2025', fechaReal: '15/05/2025' },
        { id: 'H002', etapa: 0, label: 'Compliance', responsable: 'Compliance', done: true, fechaCompromiso: '12/05/2025', fechaReal: '16/05/2025' },
        { id: 'H003', etapa: 0, label: 'AARR', responsable: 'AARR', done: true, fechaCompromiso: '12/05/2025', fechaReal: '16/05/2025' },
        { id: 'H004', etapa: 0, label: 'Presupuesto', responsable: 'Finanzas', done: false, fechaCompromiso: '20/05/2025', fechaReal: '-' },
        { id: 'H005', etapa: 1, label: 'Inventario PT', responsable: 'Planta', done: true, fechaCompromiso: '18/05/2025', fechaReal: '20/05/2025' },
        { id: 'H006', etapa: 1, label: 'Producción en curso', responsable: 'Planta', done: false, fechaCompromiso: '25/05/2025', fechaReal: '-' },
        { id: 'H007', etapa: 1, label: 'Inventario materiales', responsable: 'Planta', done: false, fechaCompromiso: '25/05/2025', fechaReal: '-' },
        { id: 'H008', etapa: 1, label: 'Costo destrucción', responsable: 'Planta', done: false, fechaCompromiso: '30/05/2025', fechaReal: '-' },
        { id: 'H009', etapa: 1, label: 'Última OC', responsable: 'Supply Corp', done: false, fechaCompromiso: '30/05/2025', fechaReal: '-' },
        { id: 'H009b', etapa: 1, label: 'Análisis de granel', responsable: 'Oficina de Estrategia', done: false, fechaCompromiso: '-', fechaReal: '-' },
        { id: 'H009c', etapa: 1, label: 'Análisis de impacto planta', responsable: 'Planta', done: false, fechaCompromiso: '-', fechaReal: '-' },
        { id: 'H010', etapa: 2, label: 'Confirmación MKT', responsable: 'Mkt Corp', done: false, fechaCompromiso: '-', fechaReal: '-' },
        { id: 'H011', etapa: 2, label: 'Plan desagote', responsable: 'Supply Corp', done: false, fechaCompromiso: '-', fechaReal: '-' },
        { id: 'H012', etapa: 2, label: 'Inactivación código', responsable: 'Supply Corp', done: false, fechaCompromiso: '-', fechaReal: '-' },
        { id: 'H013', etapa: 2, label: 'Notificación final', responsable: 'S&OP', done: false, fechaCompromiso: '-', fechaReal: '-' },
      ],
      actividades: [
        { id: 'A001', text: 'Inventario PT completado — Planta UY', time: '20/05 14:30' },
        { id: 'A002', text: 'AARR validado', time: '16/05 11:20' },
        { id: 'A003', text: 'Definición MKT completada', time: '15/05 10:15' },
      ],
    },
    {
      id: 'CU-125432',
      sku: '003-002-0543',
      nombre: 'Selenin Jar 250ml',
      paisCompania: 'Argentina',
      paisPlanta: 'Argentina',
      areaTerapeutica: 'Dermatología',
      etapaActual: 2,
      progreso: 85,
      ultimoHito: 'Plan desagote',
      fechaUltimoHito: '18/05/2025',
      fechaInicio: '10/04/2025',
      etapas: [
        { nombre: 'Detección', estado: 'completado' },
        { nombre: 'Análisis', estado: 'completado' },
        { nombre: 'Confirmación', estado: 'en_progreso' },
      ],
      hitos: [
        { id: 'H014', etapa: 0, label: 'Definición MKT', responsable: 'Mkt Corp', done: true, fechaCompromiso: '15/04/2025', fechaReal: '15/04/2025' },
        { id: 'H015', etapa: 0, label: 'Compliance', responsable: 'Compliance', done: true, fechaCompromiso: '18/04/2025', fechaReal: '18/04/2025' },
        { id: 'H016', etapa: 0, label: 'AARR', responsable: 'AARR', done: true, fechaCompromiso: '18/04/2025', fechaReal: '20/04/2025' },
        { id: 'H017', etapa: 0, label: 'Presupuesto', responsable: 'Finanzas', done: true, fechaCompromiso: '22/04/2025', fechaReal: '22/04/2025' },
        { id: 'H018', etapa: 1, label: 'Inventario PT', responsable: 'Planta', done: true, fechaCompromiso: '25/04/2025', fechaReal: '25/04/2025' },
        { id: 'H019', etapa: 1, label: 'Producción en curso', responsable: 'Planta', done: true, fechaCompromiso: '28/04/2025', fechaReal: '28/04/2025' },
        { id: 'H020', etapa: 1, label: 'Inventario materiales', responsable: 'Planta', done: true, fechaCompromiso: '05/05/2025', fechaReal: '05/05/2025' },
        { id: 'H021', etapa: 1, label: 'Costo destrucción', responsable: 'Planta', done: true, fechaCompromiso: '10/05/2025', fechaReal: '10/05/2025' },
        { id: 'H022', etapa: 1, label: 'Última OC', responsable: 'Supply Corp', done: true, fechaCompromiso: '12/05/2025', fechaReal: '14/05/2025' },
        { id: 'H022b', etapa: 1, label: 'Análisis de granel', responsable: 'Oficina de Estrategia', done: true, fechaCompromiso: '15/05/2025', fechaReal: '15/05/2025' },
        { id: 'H022c', etapa: 1, label: 'Análisis de impacto planta', responsable: 'Planta', done: true, fechaCompromiso: '16/05/2025', fechaReal: '16/05/2025' },
        { id: 'H023', etapa: 2, label: 'Confirmación MKT', responsable: 'Mkt Corp', done: true, fechaCompromiso: '16/05/2025', fechaReal: '16/05/2025' },
        { id: 'H024', etapa: 2, label: 'Plan desagote', responsable: 'Supply Corp', done: true, fechaCompromiso: '18/05/2025', fechaReal: '18/05/2025' },
        { id: 'H025', etapa: 2, label: 'Inactivación código', responsable: 'Supply Corp', done: false, fechaCompromiso: '25/05/2025', fechaReal: '-' },
        { id: 'H026', etapa: 2, label: 'Notificación final', responsable: 'S&OP', done: false, fechaCompromiso: '30/05/2025', fechaReal: '-' },
      ],
      actividades: [
        { id: 'A004', text: 'Plan de desagote aprobado por Supply Corp', time: '18/05 09:00' },
        { id: 'A005', text: 'Análisis completado — pasa a Confirmación', time: '01/05 16:00' },
      ],
    },
    {
      id: 'CU-125100',
      sku: '001-003-0210',
      nombre: 'Nexol Tabs 10mg',
      paisCompania: 'Chile',
      paisPlanta: 'Uruguay',
      areaTerapeutica: 'Cardiovascular',
      etapaActual: 0,
      progreso: 25,
      ultimoHito: 'Compliance',
      fechaUltimoHito: '10/05/2025',
      fechaInicio: '02/05/2025',
      etapas: [
        { nombre: 'Detección', estado: 'en_progreso' },
        { nombre: 'Análisis', estado: 'pendiente' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos([
        { label: 'Definición MKT', done: true, fechaReal: '05/05/2025', responsable: 'Mkt Corp' },
        { label: 'Compliance', done: false, responsable: 'Compliance' },
        { label: 'AARR', done: false, responsable: 'AARR' },
        { label: 'Presupuesto', done: false, responsable: 'Finanzas' },
      ]),
      actividades: [
        { id: 'A006', text: 'Compliance notificado del inicio del proceso', time: '10/05 13:45' },
      ],
    },
    {
      id: 'CU-124980',
      sku: '004-001-0980',
      nombre: 'Biocal Caps 500',
      paisCompania: 'Brasil',
      paisPlanta: 'Brasil',
      areaTerapeutica: 'Vitaminas',
      etapaActual: 1,
      progreso: 50,
      ultimoHito: 'Inventario materiales',
      fechaUltimoHito: '12/05/2025',
      fechaInicio: '25/04/2025',
      etapas: [
        { nombre: 'Detección', estado: 'completado' },
        { nombre: 'Análisis', estado: 'en_progreso' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos([
        { label: 'Definición MKT', done: true, fechaReal: '28/04/2025', responsable: 'Mkt Corp' },
        { label: 'Compliance', done: true, fechaReal: '30/04/2025', responsable: 'Compliance' },
        { label: 'AARR', done: true, fechaReal: '02/05/2025', responsable: 'AARR' },
        { label: 'Presupuesto', done: true, fechaReal: '05/05/2025', responsable: 'Finanzas' },
        { label: 'Inventario PT', done: true, fechaReal: '10/05/2025', responsable: 'Planta' },
        { label: 'Inventario materiales', done: true, fechaReal: '12/05/2025', responsable: 'Planta' },
      ]),
      actividades: [
        { id: 'A007', text: 'Inventario materiales confirmado por Planta BR', time: '12/05 11:00' },
      ],
    },
    {
      id: 'CU-124750',
      sku: '005-002-0750',
      nombre: 'Gastrolab 20mg',
      paisCompania: 'Paraguay',
      paisPlanta: 'Uruguay',
      areaTerapeutica: 'Gastroenterología',
      etapaActual: 0,
      progreso: 10,
      ultimoHito: 'Inicio proceso',
      fechaUltimoHito: '05/05/2025',
      fechaInicio: '05/05/2025',
      etapas: [
        { nombre: 'Detección', estado: 'en_progreso' },
        { nombre: 'Análisis', estado: 'pendiente' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos(),
      actividades: [
        { id: 'A008', text: 'Proceso de discontinuado iniciado por Mkt Local', time: '05/05 09:00' },
      ],
    },
    {
      id: 'CU-124530',
      sku: '001-001-0530',
      nombre: 'Vitazen D3 1000',
      paisCompania: 'Uruguay',
      paisPlanta: 'Uruguay',
      areaTerapeutica: 'Vitaminas',
      etapaActual: 1,
      progreso: 70,
      ultimoHito: 'Última OC',
      fechaUltimoHito: '17/05/2025',
      fechaInicio: '15/04/2025',
      etapas: [
        { nombre: 'Detección', estado: 'completado' },
        { nombre: 'Análisis', estado: 'en_progreso' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos([
        { label: 'Definición MKT', done: true, fechaReal: '18/04/2025', responsable: 'Mkt Corp' },
        { label: 'Compliance', done: true, fechaReal: '20/04/2025', responsable: 'Compliance' },
        { label: 'AARR', done: true, fechaReal: '22/04/2025', responsable: 'AARR' },
        { label: 'Presupuesto', done: true, fechaReal: '25/04/2025', responsable: 'Finanzas' },
        { label: 'Inventario PT', done: true, fechaReal: '05/05/2025', responsable: 'Planta' },
        { label: 'Producción en curso', done: true, fechaReal: '08/05/2025', responsable: 'Planta' },
        { label: 'Inventario materiales', done: true, fechaReal: '10/05/2025', responsable: 'Planta' },
        { label: 'Costo destrucción', done: true, fechaReal: '14/05/2025', responsable: 'Planta' },
        { label: 'Última OC', done: true, fechaReal: '17/05/2025', responsable: 'Supply Corp' },
      ]),
      actividades: [
        { id: 'A009', text: 'Última OC confirmada — Supply Corp', time: '17/05 15:20' },
        { id: 'A010', text: 'Inventario PT confirmado por Planta UY', time: '05/05 10:00' },
      ],
    },
    {
      id: 'CU-124210',
      sku: '006-003-0210',
      nombre: 'Cardiomax 5mg',
      paisCompania: 'Colombia',
      paisPlanta: 'Uruguay',
      areaTerapeutica: 'Cardiovascular',
      etapaActual: 0,
      progreso: 15,
      ultimoHito: 'Definición MKT',
      fechaUltimoHito: '08/05/2025',
      fechaInicio: '07/05/2025',
      etapas: [
        { nombre: 'Detección', estado: 'en_progreso' },
        { nombre: 'Análisis', estado: 'pendiente' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos([
        { label: 'Definición MKT', done: true, fechaReal: '08/05/2025', responsable: 'Mkt Corp' },
      ]),
      actividades: [
        { id: 'A011', text: 'MKT Corp detectó caída de demanda sostenida', time: '08/05 14:00' },
      ],
    },
    {
      id: 'CU-123900',
      sku: '007-001-0900',
      nombre: 'Inflamed Gel 30g',
      paisCompania: 'Ecuador',
      paisPlanta: 'Argentina',
      areaTerapeutica: 'Dermatología',
      etapaActual: 1,
      progreso: 45,
      ultimoHito: 'Inventario materiales',
      fechaUltimoHito: '14/05/2025',
      fechaInicio: '20/04/2025',
      etapas: [
        { nombre: 'Detección', estado: 'completado' },
        { nombre: 'Análisis', estado: 'en_progreso' },
        { nombre: 'Confirmación', estado: 'pendiente' },
      ],
      hitos: makeHitos([
        { label: 'Definición MKT', done: true, fechaReal: '22/04/2025', responsable: 'Mkt Corp' },
        { label: 'Compliance', done: true, fechaReal: '25/04/2025', responsable: 'Compliance' },
        { label: 'AARR', done: true, fechaReal: '28/04/2025', responsable: 'AARR' },
        { label: 'Presupuesto', done: true, fechaReal: '30/04/2025', responsable: 'Finanzas' },
        { label: 'Inventario PT', done: true, fechaReal: '08/05/2025', responsable: 'Planta' },
        { label: 'Inventario materiales', done: true, fechaReal: '14/05/2025', responsable: 'Planta' },
      ]),
      actividades: [
        { id: 'A012', text: 'Inventario de materiales revisado — stock para 3 meses', time: '14/05 16:30' },
      ],
    },
  ],
};

const STORAGE_KEY = 'megalabs_discontinuados_v4';

export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  saveData(initialData);
  return initialData;
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
