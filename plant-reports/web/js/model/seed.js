// Datos iniciales (semilla). Se usan en el navegador y en las funciones de Netlify.
// Los valores reales quedan guardados en Netlify Blobs y se editan desde el panel de administrador.

export const SECTIONS = [
  { id: 'kpis', name: 'KPIs / Indicadores de Manufactura', icon: '📊', order: 1, required: true, template: 'imagen_texto' },
  { id: 'bo_critico', name: 'BO / Crítico', icon: '🚨', order: 2, required: true, template: 'tabla_comentarios' },
  { id: 'faltantes', name: 'Informe de Faltantes', icon: '📉', order: 3, required: true, template: 'imagen_texto' },
  { id: 'lanzamientos', name: 'Lanzamientos', icon: '🚀', order: 4, required: true, template: 'tabla_comentarios' },
  { id: 'riesgos', name: 'Riesgos', icon: '⚠️', order: 5, required: true, template: 'solo_texto' },
  { id: 'mp_insumos', name: 'Materias Primas e Insumos', icon: '🧪', order: 6, required: false, template: 'imagen_texto' },
  { id: 'capacidad', name: 'Capacidad', icon: '🏭', order: 7, required: true, template: 'tabla_comentarios' },
  { id: 'log_acciones', name: 'Temas pendientes en Log de acciones', icon: '📝', order: 8, required: false, template: 'tabla_comentarios' },
  { id: 'otros', name: 'Otros temas', icon: '📌', order: 9, required: false, template: 'libre' },
];

// Orden de la agenda actual. Metas provisionales: ajustar desde Administración > Plantas.
const T = { otif: 80, bo: 10, fo: 10, adhProd: 90, adhCap: 90, adhSSAA: 90 };
export const PLANTS = [
  { id: 'pdlc', name: 'Parque de las Ciencias', shortName: 'PDLC' },
  { id: 'rowe', name: 'Rowe', shortName: 'Rowe' },
  { id: 'colombia', name: 'Colombia', shortName: 'Colombia' },
  { id: 'poen', name: 'Poen / Dromex', shortName: 'Poen' },
  { id: 'acromax', name: 'Acromax', shortName: 'Acromax' },
  { id: 'iclos', name: 'Iclos', shortName: 'Iclos' },
  { id: 'uruguay', name: 'Mega Uruguay', shortName: 'Uruguay' },
  { id: 'gardenhouse', name: 'Garden House', shortName: 'Garden House' },
].map((p, i) => ({ ...p, order: i + 1, active: true, kpiTargets: { ...T } }));

export const KPI_KEYS = [
  { key: 'otif', short: 'OTIF', name: 'OTIF', unit: '%', dir: 'min' },
  { key: 'bo', short: 'BO', name: 'Backorder (BO)', unit: '%', dir: 'max' },
  { key: 'fo', short: 'FO', name: 'Forward Order (FO)', unit: '%', dir: 'max' },
  { key: 'adhProd', short: 'Adh. plan', name: 'Adherencia al plan de producción', unit: '%', dir: 'min' },
  { key: 'adhCap', short: 'Adh. capacidad', name: 'Adherencia a la capacidad de producción', unit: '%', dir: 'min' },
  { key: 'adhSSAA', short: 'Adh. SSAA', name: 'Adherencia a la capacidad de servicios analíticos', unit: '%', dir: 'min' },
  { key: 'faltantePct', short: '% Faltante', name: '% Faltante sobre venta', unit: '%', dir: 'max' },
];

// TEXTO PROVISIONAL: reemplazar con las definiciones oficiales del Back Up (Administración > Contenido).
export const KPI_DEFINITIONS = [
  { id: 'bo', title: 'Backorder (BO)', text: 'Porcentaje de la demanda confirmada de clientes que a la fecha de cierre no pudo entregarse y queda pendiente.\n\nFórmula: BO % = unidades en backorder / demanda total del período.\nMeta general: ≤ 10 %.' },
  { id: 'fo', title: 'Forward Order (FO)', text: 'Porcentaje de pedidos que el cliente solicita para una fecha posterior a la de cierre y que quedan programados a futuro.\n\nFórmula: FO % = unidades en forward order / demanda total del período.' },
  { id: 'otif', title: 'OTIF (On Time In Full)', text: 'Porcentaje de pedidos entregados en la fecha comprometida y en la cantidad completa.\n\nFórmula: OTIF % = pedidos entregados a tiempo y completos / total de pedidos.' },
  { id: 'adhProd', title: 'Adherencia al plan de producción', text: 'Mide el cumplimiento de lo producido respecto de lo planificado para el período.\n\nFórmula: Adherencia % = unidades producidas conforme al plan / unidades planificadas.' },
  { id: 'adhCap', title: 'Adherencia a la capacidad de producción', text: 'Mide el uso efectivo de la capacidad de producción disponible según lo comprometido en el plan de capacidad.\n\nFórmula: Adherencia % = capacidad utilizada / capacidad comprometida.' },
  { id: 'adhSSAA', title: 'Adherencia a la capacidad de servicios analíticos', text: 'Mide el cumplimiento de la capacidad de análisis (control de calidad) comprometida para liberar lotes en tiempo.\n\nFórmula: Adherencia % = análisis realizados en plazo / análisis comprometidos.' },
];

// Plantillas de diapositiva: coordenadas en % del lienzo (el contenido útil va de y=15 a y=93).
export const TEMPLATES = {
  imagen_texto: { name: 'Imagen + Puntos a destacar', blocks: [
    { type: 'image', x: 3, y: 14, w: 64, h: 74 },
    { type: 'callout', x: 69, y: 14, w: 28, h: 74 }] },
  imagen_grande: { name: 'Título + imagen grande', blocks: [
    { type: 'image', x: 3, y: 14, w: 94, h: 74 }] },
  dos_imagenes: { name: 'Dos imágenes', blocks: [
    { type: 'image', x: 3, y: 14, w: 46, h: 74 },
    { type: 'image', x: 51, y: 14, w: 46, h: 74 }] },
  tabla_comentarios: { name: 'Tabla + comentarios', blocks: [
    { type: 'table', x: 3, y: 14, w: 64, h: 74 },
    { type: 'callout', x: 69, y: 14, w: 28, h: 74 }] },
  solo_texto: { name: 'Solo texto', blocks: [
    { type: 'text', x: 3, y: 14, w: 94, h: 74 }] },
  libre: { name: 'Libre (en blanco)', blocks: [] },
};

export const CELL_COLORS = [
  { name: 'Verde', hex: '#c6efce' },
  { name: 'Amarillo', hex: '#ffeb9c' },
  { name: 'Rojo', hex: '#ffc7ce' },
  { name: 'Gris', hex: '#e7e6e6' },
];
