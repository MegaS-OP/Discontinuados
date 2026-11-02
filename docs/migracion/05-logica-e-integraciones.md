# 05 — Lógica e integraciones (Fase 5)

> Hoy **toda** la lógica corre en el navegador (01-relevamiento.md §5). Al migrar no hay servidor propio ni cuenta de servicio
> detrás de la app: lo que sea de **seguridad o integridad** debe vivir en SharePoint o en Power Automate; el frontend
> conserva solo lo que es experiencia (UX).

## 1. Dónde vive ahora cada pieza

| # | Lógica actual (origen) | Dónde vive ahora | Por qué |
|---|---|---|---|
| 1 | Campos obligatorios del alta: nombre, compañía, fabricante, BU (`NuevoProducto.jsx:35-42`) | **Validación de SharePoint**: columnas obligatorias (`Title`, 3 búsquedas) + **UX** (mensajes en el formulario) | El alta manual lo exigía solo en el cliente; la importación no (S-10). Ahora lo rechaza el servidor para todos los caminos |
| 2 | Generar el id `CU-` + hora (`NuevoProducto.jsx:58`, `ImportModal.jsx:72`) | **Power Automate F1** (`CodigoCU`) + índice único | Evita colisiones (S-09) |
| 3 | Crear los 16 hitos con responsable por defecto (`db.js:79-95`) | **F1** leyendo `HitosCatalogo` | Cambiar el proceso = editar el catálogo, sin redeploy |
| 4 | Actividades iniciales (`NuevoProducto.jsx:46-51`) | **F1** | Autor y fecha reales |
| 5 | Marcar hito: `done`, `fechaReal` (`AppContext.jsx:69-77`) | Frontend escribe `Completado`; **F2** fija/limpia `FechaReal` | La fecha no debe depender del reloj del cliente |
| 6 | Progreso y último hito (`AppContext.jsx:79-81`) | **F2** (subflujo `Recalcular-Producto`) | Los usuarios de planta no leen todos los hitos |
| 7 | Avance automático 0→1 al completar *Aviso a Supply Corp y S&OP Global* (`AppContext.jsx:86-106`) | **F2** | Regla de negocio |
| 8 | Confirmación de la etapa 3 (`AppContext.jsx:107-128`) | **F2** (`ProcesoConfirmado` + actividad) | Idem |
| 9 | Avance manual y su regla (`ProductDetail.jsx:89-99`; `AppContext.jsx:156-191`) | **UX**: el botón aparece si se cumple la regla. **Control**: **F3** valida y revierte | La interfaz no es control (04 §5) |
| 10 | Comentarios (`AppContext.jsx:44-67`) | Frontend crea un ítem en `Actividades`; autor = `Creado por` | Corrige S-07 |
| 11 | Datos extra del hito (`AppContext.jsx:143-154`) | Frontend actualiza columnas de `Hitos` | Hoy escribe **en cada tecla**: debe guardar al salir del campo (ver §5) |
| 12 | `migrateHitos()` y reposición de `initialData` (`db.js:99-147`; `AppContext.jsx:19-29`) | **Se elimina del runtime**; se aplica una sola vez en la migración (06) | Es la causa de S-06 |
| 13 | Parseo y suma de costos (`DashboardView.jsx:11-31`) | Columnas `Number`; **UX** suma en el cliente | Elimina Q-02 |
| 14 | Filtros y orden del dashboard (`Dashboard.jsx:174-190`) | **UX** con `$filter` OData sobre columnas indexadas | `Productos` < 5.000 ítems: se puede traer completo y paginado |
| 15 | Borrado masivo de datos de prueba (`AppContext.jsx:208-213`; `Configuracion.jsx:207-224`) | Admin borra productos con `EsPrueba = Sí`; los hitos y actividades caen en **cascada** | Reemplaza el regex (S-09) |
| 16 | Login "¿Quién sos?" y gestión de usuarios (`LoginScreen.jsx`; `Configuracion.jsx`) | **Entra ID**: la Managed App ya autentica; roles = grupos | Corrige S-01, S-02, S-03 |
| 17 | Historial 2024/2025 en `localStorage` (`Comparativa.jsx:23-31,118`) | Lista `ComparativaHistorica` | Dato compartido (Q-03) |
| 18 | Tiempo real (`onValue`, `AppContext.jsx:15`) | **UX**: recarga al abrir, botón *Actualizar* y refresco cada 30–60 s | El conector no empuja cambios |
| 19 | Exportar a Excel (`Reportes.jsx`) | **UX** con SheetJS; exporta solo lo que el usuario puede leer. Corregir campos (Q-01) | La seguridad la impone la lectura de SharePoint |
| 20 | Importar desde Excel (`ImportModal.jsx`) | **UX** parsea y valida contra catálogos; crea ítems en lotes; F1 completa cada uno | El servidor rechaza compañías/fabricantes/BU inexistentes |
| 21 | Notificaciones, tareas programadas | **No existen hoy**. Se agrega solo F4 (seguridad). Avisos a áreas: backlog | No inventar alcance |
| 22 | Integraciones externas | **Ninguna** en la app principal. `plant-reports` (backlog) usa Gmail y Netlify con secretos que **no migran** tal cual (ver §6) | — |

## 2. Flujos de Power Automate

Todos usan conectores **estándar** (SharePoint, Office 365 Outlook para avisos de error). No usan disparador HTTP, por lo
que **no requieren licencia Premium** aunque el dueño informó que está disponible.

| Id | Nombre | Disparador | Qué hace | Detalle |
|---|---|---|---|---|
| F1 | `Producto-Alta` | Al crearse un elemento en `Productos` (si `IdLegado` está vacío) | Código, 16 hitos, actividades, permisos de planta | 04 §3.4 |
| F2 | `Hito-Modificado` | Al modificarse un elemento en `Hitos` (si no lo modificó la cuenta de servicio) | Fecha real, recálculo del producto, avance automático, restitución de columnas estructurales | §2.1 |
| F3 | `Producto-Modificado` | Al modificarse un elemento en `Productos` (si no lo modificó la cuenta de servicio) | Valida etapa, reasigna permisos si cambia el fabricante, retira permisos al confirmar | 04 §3.5 y §5 |
| F4 | `Permisos-Reconciliacion` | Programado, diario | Repara permisos, cuenta permisos únicos, alerta | 04 §3.6 |
| — | `Recalcular-Producto` (flujo secundario) | Llamado por F2 y F3 | Recalcula los campos derivados de un producto | §2.1 |

**Conexión.** Los cuatro flujos corren con la **cuenta de servicio** `svc-discontinuados-flows` (04 §1). Cada acción se
ejecuta con sus permisos, no con los del usuario que disparó el cambio.

### 2.1 F2 `Hito-Modificado` y `Recalcular-Producto`

**F2** — disparador *Al crearse o modificarse un elemento* en `Hitos`, concurrencia **1**, condición
`@not(equals(toLower(triggerOutputs()?['body/Editor/Email']), 'svc-discontinuados-flows@<dominio>'))`.

1. **Restituir columnas estructurales.** Leer la **versión 1.0** del ítem
   (`GET _api/web/lists/getbytitle('Hitos')/items(<ID>)/versions?$filter=VersionLabel eq '1.0'`) y, si `Title`, `Producto`,
   `ClaveHito`, `Etapa` u `Orden` difieren, volver a escribirlos.
2. **Fecha real.** Si `Completado = Sí` y `FechaReal` está vacía → `FechaReal = hoy`. Si `Completado = No` y `FechaReal` tiene valor → vaciarla.
   (Equivale a `AppContext.jsx:75-77`.)
3. Llamar a **`Recalcular-Producto`** con `Producto/Id`.

**`Recalcular-Producto(productoId)`**

1. Leer los 16 hitos del producto (`$filter=Producto eq <id>`).
2. `Progreso = round(completados / total × 100)`; `UltimoHito` = título del último hito completado en orden
   (`AppContext.jsx:79-81`).
3. `ProcesoConfirmado` = todos los hitos de etapa 2 completados (`AppContext.jsx:107-128`).
4. **Avance automático**: si `EtapaActual = 0` y el hito `AVISO_SUPPLY_SOP` está completado → `EtapaActual = 1`,
   `EtapaValidada = 1` y actividad *"Avance de etapa: Detección → Análisis"* (`AppContext.jsx:86-106`).
5. Si `ProcesoConfirmado` pasó a Sí → actividad *"Producto confirmado como discontinuado: Confirmación"*
   (`AppContext.jsx:121-123`).
6. Un único `Update item` sobre `Productos` con solo las columnas que cambiaron.

> **Cambio de comportamiento a confirmar.** El código actual **nunca actualiza `fechaUltimoHito`** después del alta
> (`AppContext.jsx:129-137` no la incluye). En el nuevo modelo, `FechaUltimoHito` se fija a la fecha real del último hito
> completado; si negocio prefiere conservar el comportamiento anterior, se omite ese campo del paso 6.

Como `Recalcular-Producto` recalcula **desde los datos** y no suma deltas, dos ediciones simultáneas convergen al mismo
resultado: esto reemplaza el "gana el último" que pierde datos de hoy (S-05).

## 3. Operaciones que el frontend debe usar para no chocar con los límites

| Necesidad | Consulta recomendada | Motivo |
|---|---|---|
| Tablero / lista de productos | `Productos` completa, paginada de a 500–5.000, con las columnas del tablero | < 5.000 ítems; `Progreso` y `EtapaActual` ya vienen calculados |
| Detalle de un producto | `Hitos` con `$filter=Producto eq <id>` + `Actividades` con `$filter=Producto eq <id>` | Columna indexada; 16 filas |
| Costo en riesgo (`DashboardView.jsx:141`) | `Hitos` con `$filter=ClaveHito eq 'COSTO_DEST_PT'` (y `COSTO_DEST_MAT`, `COSTO_INV_API`) | ≤ N filas por consulta, indexada |
| Exportación completa | Paginar `Hitos` por rango de `ID` (`ID gt <último>`, `$top=5000`) | El índice de `ID` evita el umbral |
| Escritura de datos extra | Guardar **al salir del campo** (no en cada tecla) y enviar solo las columnas modificadas | Hoy se escribe por pulsación (`ProductDetail.jsx:204,216,228,253,291,324`): con ~600 solicitudes/min por usuario y un flujo F2 por cada una, se saturaría |
| Importación masiva | Lotes de ≤ 20 productos con pausa; mostrar progreso | F1 hace ≈ 24 operaciones por producto |

**Concurrencia.** El frontend debe enviar **solo las columnas modificadas** (⚠️ verificar este comportamiento del conector en la Managed App) y
no hay control optimista (ETag): dos usuarios que editan la **misma columna** del mismo ítem siguen pisándose (gana el último),
pero ya no se pisa el resto de la base (S-05).

## 4. Cómo resuelve la app el rol del usuario (solo UX)

**Principio**: la autorización real es la de SharePoint. El rol que muestra la interfaz solo decide qué botones dibujar.

**Mecanismo propuesto** (SharePoint, acción *Enviar una solicitud HTTP a SharePoint*, conector estándar):

1. Al iniciar: `GET _api/web/lists/getbytitle('Productos')/EffectiveBasePermissions` → `{High, Low}`.
2. Con la máscara baja (`Low`): *Ver elementos* = `0x1`, *Agregar* = `0x2`, *Editar* = `0x4`, *Eliminar* = `0x8`.

| Máscara sobre `Productos` | Rol que muestra la UI |
|---|---|
| Eliminar activo | Admin |
| Agregar + Editar, sin Eliminar | Editor |
| Solo Ver | Viewer |
| Sin permiso de lista, pero la consulta devuelve productos | **Planta** (el/los fabricante(s) salen de los productos devueltos) |
| Sin permiso y sin productos | Sin acceso (mensaje con el contacto de IT) |

3. Lo mismo sobre `Hitos` para saber si se pueden editar los hitos de planta.

**Alternativa / complemento** (⚠️ a validar con IT): consultar pertenencia a grupos con el conector de Microsoft Entra ID o con
Graph `checkMemberGroups` sobre los 4 grupos corporativos; requiere consentimiento de administrador del permiso de lectura de
grupos. Se prefiere la consulta de permisos efectivos porque **refleja lo que SharePoint realmente va a permitir**.

Si la interfaz mostrara un botón de más, la llamada devolvería **403** y la app debe mostrar *"No tenés permiso para esta
acción"*, no un error genérico.

## 5. Pantallas que cambian

| Pantalla | Cambio |
|---|---|
| Login (`LoginScreen.jsx`) | Se elimina. La identidad es la de Entra ID |
| Configuración (`Configuracion.jsx`) | La gestión de usuarios desaparece (se hace en Entra). Queda: descripción de roles (informativa), catálogos (solo Admin) y "Zona de riesgo" |
| Reportes (`Reportes.jsx`) | Corregir campos inexistentes (Q-01) |
| Comparativa (`Comparativa.jsx`) | Lee y escribe `ComparativaHistorica` |
| Detalle (`ProductDetail.jsx`) | Guardar datos extra al salir del campo; el comentario usa el usuario real |
| Descargas de archivos (`file-saver`, `xlsx`) | ⚠️ Verificar si el entorno de ejecución de la Managed App permite descargas generadas en el navegador. Si no, generar el archivo con un flujo y devolver un enlace de OneDrive/SharePoint |

## 6. Integraciones y secretos

| Integración | Hoy | Después | ¿Secretos? |
|---|---|---|---|
| Base de datos | Firebase con configuración en el código (`firebase.js:4-12`) | Conector de **SharePoint** (identidad delegada) | **No**. Se elimina el paquete `firebase` |
| Correo de error de los flujos | — | Conector **Office 365 Outlook** | No (conexión propia del flujo) |
| Usuarios | `localStorage` | Entra ID | No |
| Excel / descargas | SheetJS y `file-saver` en el navegador | Igual (UX), sujeto al §5 | No |
| `plant-reports` (**backlog**) | Netlify Blobs + Gmail (`ADMIN_PASSWORD`, `SESSION_SECRET`, `GMAIL_APP_PASSWORD`) | Fuera de alcance. Al migrarlo: listas de SharePoint y **Outlook** en lugar de Gmail; los secretos actuales **no se trasladan** | Sí hoy; no después |

**No hay lugar para secretos en el frontend.** Antes de publicar la nueva app, rotar o dar de baja el proyecto Firebase
(la clave de API de `src/firebase.js` está en el historial de Git y en cualquier copia pública del sitio).

## 7. Empaquetado de los flujos (sin CI/CD)

Respuesta de IT: no hay CI/CD. Recomendación mínima: crear los flujos **dentro de una solución de Power Platform** con
*referencias de conexión* y *variables de entorno* (URL del sitio, correo de la cuenta de servicio), y exportarla a mano de
DEV a PROD. Así el cambio de ambiente no obliga a editar flujo por flujo.
