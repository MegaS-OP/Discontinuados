# 06 — Migración de datos (Fase 6)

> **Contexto de las respuestas del dueño de negocio.** Firebase **no se seguirá usando**. Los 224 productos del seed son de
> **prueba**, pero se migran igualmente "para revisar el uso". No hay política de retención. `plant-reports` queda en
> backlog. IT confirmó que se puede coordinar una **ventana de migración**.

## 1. Qué se migra y qué no

| Origen | Se migra | Destino | Nota |
|---|---|---|---|
| Nodo `discontinuados` de Firebase (o, si no se puede exportar, `discontinuados-224.json`) | Sí | `Productos`, `Hitos`, `Actividades` | Ver §2 |
| Catálogos `CIAS`, `FABRICANTES`, `BUS`, `HITOS_TEMPLATE` (`src/data/db.js:3-40`) | Sí | `Companias`, `Fabricantes`, `UnidadesNegocio`, `HitosCatalogo` | Los carga `01-crear-listas.ps1 -SeedCatalogs` desde el bloque `seed` del esquema |
| `mgl_comparativa_hist` (`localStorage` de cada navegador) | **No automático** | `ComparativaHistorica` | El código solo guarda valores tipeados a mano, por navegador, y en el seed no hay ninguno. Pedir a quien los haya cargado que los reingrese (pregunta abierta) |
| `mgl_users` / `mgl_session` (`localStorage`) | **No** | Grupos de Entra ID | Solo se conoce un usuario semilla (`Ariana Vinzon`, Admin; `users.js:5`). El resto de las altas se hace en Entra |
| `plant-reports` (Netlify Blobs) | **No** (backlog) | — | — |

**Fuente de los datos.** El seed del repositorio **no es necesariamente lo que hay hoy en Firebase** (el nodo vivo pudo recibir
altas, hitos completados y comentarios). Paso 0: exportar el nodo `discontinuados` desde la consola de Firebase
(*Exportar JSON*) y guardarlo **fuera del repositorio** (puede contener datos de negocio reales). El resto del documento
funciona igual con cualquiera de las dos fuentes.

## 2. Mapeo campo → columna y transformaciones

### 2.1 `Productos`

| Origen (`products[]`) | Columna destino | Transformación |
|---|---|---|
| `id` | `IdLegado` | Tal cual. `CodigoCU` = `'CU-' + (100000 + ID de SharePoint)`, calculado por el script con la misma fórmula que F1 |
| `codigo` | `CodigoSAP` | `trim`; vacío → sin valor (en el seed los 224 están vacíos) |
| `nombre` | `Title` | `trim` (8 nombres del seed tienen espacios sobrantes); máximo 255 |
| `paisCompania` | `Compania` (búsqueda) | Buscar en `Companias` por `Title` exacto; si no existe → **registro rechazado** y al informe |
| `paisPlanta` | `Fabricante` (búsqueda) | Ídem con `Fabricantes` |
| `bu` | `UnidadNegocio` (búsqueda) | Ídem con `UnidadesNegocio` |
| `mph` | `Mph` | `trim`; ausente → sin valor (el seed no trae la clave) |
| `observaciones` | `Observaciones` | Tal cual |
| `levantadoSOPC` | `LevantadoPorPlanta` | `'si'` → `Sí`, `'no'` → `No`, vacío/ausente → sin valor |
| `etapaActual` | `EtapaActual` y `EtapaValidada` | Mismo número (0–2) |
| `progreso` | `Progreso` | Se **recalcula** desde los hitos migrados y se compara con el origen (ver §6) |
| `ultimoHito` | `UltimoHito` | Tal cual |
| `fechaUltimoHito`, `fechaInicio` | `FechaUltimoHito`, `FechaInicio` | `DD/MM/AAAA` → fecha. **Escribirla a las 12:00 UTC** para que ninguna zona horaria la corra un día |
| `etapas[]` | — | No se guarda; `ProcesoConfirmado = Sí` si `etapas[2].estado = 'completado'` |
| (derivado) | `EsPrueba` | `Sí` si `id` cumple `^CU-000\d{3}$` (el mismo criterio que usa hoy el borrado masivo, `AppContext.jsx:211`); los 224 del seed cumplen |
| (derivado) | `PermisosAplicados` | `No` hasta ejecutar el paso 5 |

### 2.2 `Hitos` (16 por producto)

La app aplica `migrateHitos()` al cargar (`db.js:99-147`); la migración **reproduce esa conversión una sola vez** y luego la
elimina del código. Para cada fila de `HitosCatalogo` (en orden):

| Caso | Regla | Cantidad en el seed |
|---|---|---:|
| El hito existe con **el mismo nombre** (`Inventario PT`, `Última OC`, `Análisis de impacto planta`) | Conservar sus datos | 672 (3 × 224) |
| Existe con un **nombre anterior** (`Costo API`, `Confirmación MKT`, `Plan desagote`, `Inactivación código`, `Notificación final`; `db.js:102-108`) | Conservar sus datos; `Responsable` = el del catálogo | 896 (4 × 224) |
| Es `Costo destrucción PT` y existe el hito único anterior `Costo destrucción` (`db.js:109,130-132`) | Heredar sus datos | 224 |
| No existe | Crear vacío, con el responsable por defecto del catálogo | 1.792 |
| Hitos del origen sin equivalente (`Definición MKT`, `Compliance`, `AARR`, `Presupuesto`, `Producción en curso`, `Inventario materiales`, `Análisis de granel`) | **Se descartan** (el código también los descarta) | 7 × 224 |
| **Total de hitos a cargar** | **16 × 224** | **3.584** |

| Origen (`hitos[]`) | Columna destino | Transformación |
|---|---|---|
| `label` | `Title`, `ClaveHito`, `Etapa`, `Orden` | Del catálogo |
| `responsable` | `Responsable` | ⚠️ **Decisión**: usar el del **catálogo** en los 16. El runtime actual conserva el del origen en los hitos de nombre idéntico y el seed trae `Planta` en *Inventario PT* y *Análisis de impacto planta* (versión anterior), que difiere del defecto actual de *Inventario PT* (`Supply Chain Corp`, `db.js:61`). No afecta permisos: la edición de la planta depende de `EditablePorPlanta`, no del texto |
| `done` | `Completado` | booleano |
| `fechaCompromiso`, `fechaReal` | ídem | `'-'` o vacío → sin valor; `DD/MM/AAAA` → fecha (12:00 UTC) |
| `notas` | `Notas` | Tal cual |
| `ofreceUnidades` | `OfreceUnidades` | `'si'`→`Sí`, `'no'`→`No` |
| `impactoGranelLleva` | `ImpactoGranelLleva` | `'si'`→`Lleva`, `'no'`→`No lleva` |
| `impactoGranelValor` | `ImpactoGranelPct` | `"0,0"` → número (coma decimal) |
| `resolucionFinal` | `ResolucionFinal` | Tal cual |
| `valorItem` (o el antiguo `valor`, `db.js:116-119`), `valorInventario` | `CostoItem`, `CostoInventario` | Ver regla de montos abajo |
| `fecha` | `FechaUltimaOC` | `AAAA-MM` → `AAAA-MM-01` |
| `id`, `costoImpacto` (legado) | — | Se descartan (`costoImpacto` está vacío en los 224) |

**Regla de montos.** El formato de entrada es el de `es-AR` (`ProductDetail.jsx:203`, placeholder `1.234,56`): `.` miles y `,` decimal.
- `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` o `^\d+(,\d{1,2})?$` → se convierte (`1.234,56` → `1234.56`).
- **Cualquier otro formato** (por ejemplo `1234.56`, que el tablero actual lee como 123.456 por `DashboardView.jsx:11-15`) **no se
  adivina**: se carga vacío y se informa en `migracion-revision.csv` para que el área corrija. En el seed: **0 casos**.

### 2.3 `Actividades`

| Origen (`actividades[]`) | Columna destino | Transformación |
|---|---|---|
| `text` | `Texto` | Tal cual (incluye espacios no separables) y `Title` = primeros 100 caracteres |
| (derivado) | `Tipo` | Empieza con `Observación:` → `Observación`; `Avance de etapa:` → `Avance de etapa`; `Producto ingresado…`, `Producto cargado masivamente`, `Producto confirmado…` → `Sistema`; el resto → `Comentario` |
| `time` (`DD/MM HH:MM`, **sin año**) | `FechaEvento` | ⚠️ SUPUESTO: año de `fechaInicio` del producto; si la fecha resultante quedara antes de `fechaInicio`, sumar un año. Todo se marca en el informe de revisión. En el seed: 8 actividades, todas `01/01 00:00` con `fechaInicio` 01/01/2026 |
| (autor) | — | El texto histórico puede traer un nombre escrito a mano (`AppContext.jsx:60`); se conserva. El `Creado por` será el de quien migra |

## 3. Orden de carga

| Paso | Qué | Prerrequisito |
|---|---|---|
| 0 | Exportar Firebase; crear grupos de Entra (`00-crear-grupos-entra.ps1`); crear sitio; listas (`01-crear-listas.ps1 -SeedCatalogs`) | IT |
| 1 | **Catálogos**: `Companias` (13), `UnidadesNegocio` (5), `Fabricantes` (31, con `GrupoEntraId`), `HitosCatalogo` (16) | Paso 0 |
| 2 | `Productos`, de a lotes, con `IdLegado` (para poder repetir sin duplicar) y `CodigoCU`; `PermisosAplicados = No` | Catálogos cargados (las búsquedas deben resolverse) |
| 3 | `Hitos` (16 por producto) con la búsqueda al `ID` del producto recién creado | Paso 2 |
| 4 | `Actividades` | Paso 2 |
| 5 | **Permisos de planta** (producto + 5 hitos), con el mismo procedimiento REST de F1 (04 §3.4, pasos 6–10) y luego `PermisosAplicados = Sí` | Pasos 2–3; grupos de Entra con miembros |
| 6 | `ComparativaHistorica`, si hay datos | Catálogo de compañías |
| 7 | Validación (§6) y firma de conformidad | — |

**F1 no se dispara durante la carga** porque los productos migrados llevan `IdLegado` (condición del disparador) y porque la
migración crea sus propios hitos y actividades; así no se duplican.

**Volumen real del ensayo en seco** (medido con el seed): 224 productos + 3.584 hitos + 8 actividades = **3.816 ítems**, más 65
filas de catálogo. Los permisos únicos serían 224 × (1 + 5) = **1.344** ítems, unas **2.688 llamadas REST** (romper herencia + asignar).

## 4. Método

**Propuesta: PnP PowerShell por lotes** (mismo módulo que el aprovisionamiento).

1. Un script lee el JSON exportado, aplica las transformaciones de §2 y escribe un **JSON intermedio** por lista (no tocar SharePoint
   todavía). Revisar ese JSON y el informe de revisión.
2. Carga con `New-PnPBatch` + `Add-PnPListItem -Batch` (lotes de 100–200) y `Invoke-PnPBatch`; reintento automático ante respuestas
   429/503 (*throttling*, ≈ 600 solicitudes/min por usuario).
3. Para las búsquedas, mantener en memoria un diccionario `Title → ID` de cada catálogo y el de `IdLegado → ID` de productos.
4. **Idempotencia**: antes de crear, consultar los `IdLegado` ya presentes y saltearlos; así se puede interrumpir y retomar.
5. Permisos (paso 5): un único `ensureuser` por planta (se reutiliza el `principalId`), luego `breakroleinheritance(copyRoleAssignments=true)` +
   `addroleassignment` por producto y por hito de planta. **No usar `clearSubscopes` sobre una lista ya poblada.**
6. Ejecutar fuera del horario de uso, con la cuenta de servicio. Tiempo estimado: **menos de una hora** para el seed (⚠️ estimación, no
   medida; depende del *throttling* del inquilino).

Alternativas descartadas: importar desde Excel/CSV por la interfaz de SharePoint (no resuelve búsquedas ni permisos ni
`IdLegado`), y cargar con un flujo de Power Automate (más lento y con límites de ejecución por volumen).

**Fechas de creación y autor.** Firebase no guarda cuándo ni quién creó cada producto, de modo que `Creado`/`Creado por` serán la
fecha y la cuenta de la migración. No se pierde información disponible.

## 5. Datos de prueba

Los 224 productos se cargan con `EsPrueba = Sí`. Cuando el negocio termine de revisarlos, un Admin los borra con filtro
`EsPrueba = Sí` (los hitos y actividades se eliminan en cascada). ⚠️ **Exportar antes de borrar**: el borrado en cascada no se
puede deshacer salvo por la papelera (93 días, ítem por ítem). Cualquier producto cargado a mano que **no** cumpla el patrón
`CU-000###` entra con `EsPrueba = No`.

## 6. Validación posterior a la migración

| Control | Cómo | Resultado esperado con el seed |
|---|---|---|
| Conteo de productos | `Productos` con `IdLegado` no vacío | **224** |
| Conteo de hitos | `Hitos` por producto | **16** cada uno; **3.584** en total; 16 `ClaveHito` distintas por producto |
| Conteo de actividades | `Actividades` | **8** (seed) |
| Distribución por BU | Agrupar `UnidadNegocio` | Primary 168 · Hi-Tech 24 · Divise 20 · Consumer 8 · Nutraceutical 4 (suma 224) |
| Distribución por compañía y fabricante | Agrupar y comparar con el origen | Idénticas (13 compañías, 30 fabricantes con productos) |
| Suma de control | SHA-256 de las líneas ordenadas `IdLegado\|Title(trim)\|Compañía\|Fabricante\|BU` en origen y destino | Coinciden. Valor medido sobre el seed: `587e6087a3f11988…` (primeros 16 caracteres) |
| Progreso | `Progreso` recalculado = `progreso` del origen | Iguales (en el seed: todos 0) |
| Costos | Suma de `CostoInventario` por `ClaveHito` | Igual a la suma del origen; **0 montos en el seed** |
| Permisos | Para 5 productos de 5 plantas distintas, leer `roleassignments` del producto y de sus hitos | Está el grupo de la planta y los 4 corporativos; solo 5 hitos tienen el grupo |
| Aislamiento | Casos de 07-pruebas-seguridad.md (T-P1…T-P7) | Todos cumplen |
| Informe de revisión | `migracion-revision.csv` | Vacío en el seed; los casos del vivo los resuelve el área |

## 7. Reversión

Las listas son nuevas, así que la reversión es borrar los ítems con `IdLegado` no vacío (cascada a hitos y actividades) y volver a
correr desde el paso 2. **No se borra el origen** (Firebase/export) hasta la firma de conformidad del dueño de negocio. Después
de la firma, dar de baja el proyecto Firebase y **rotar** su configuración (05 §6).
