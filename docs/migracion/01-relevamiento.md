# 01 — Relevamiento del backend actual (Fase 1)

> Alcance: todo el repositorio salvo `plant-reports/` (backlog por decisión del dueño de negocio; se lista solo para que
> quede registrado). Cada afirmación cita `archivo:línea`. Lo que no se pudo verificar en el código está marcado con
> ⚠️ SUPUESTO.
>
> **Aviso sobre `CLAUDE.md`**: su sección "Modelo de datos" no coincide con el código (usa nodo `/productos`, campos
> `descripcion`/`cia`/`fabricante` y un campo `estado` que no existen). Este relevamiento describe lo que el código
> **realmente** hace; ver la sección 7.

## 1. Almacenamiento actual

| Dato | Motor | Dónde | Cómo se conecta |
|---|---|---|---|
| Productos, hitos y actividades | Firebase Realtime Database | `discontinuados-megalabs-default-rtdb.firebaseio.com`, nodo `discontinuados` (`src/context/AppContext.jsx:8`) | SDK web de Firebase con la configuración escrita en el código (`src/firebase.js:4-12`) |
| Usuarios y sesión | `localStorage` del navegador | claves `mgl_users`, `mgl_session` (`src/data/users.js:1-2`) | Sin servidor |
| Historial 2024/2025 por compañía | `localStorage` del navegador | clave `mgl_comparativa_hist` (`src/pages/Comparativa.jsx:12,23-31,118`) | Sin servidor: cada usuario ve valores distintos |
| Datos iniciales | JSON embebido | `initialData` en `src/data/db.js:159` en adelante y copia en `discontinuados-224.json` | Se escribe en Firebase si el nodo está vacío (`AppContext.jsx:27-29`) |
| `plant-reports` (**fuera de alcance**) | Netlify Blobs + funciones | `plant-reports/netlify/functions/_lib.js:40-42` | Variables de entorno `ADMIN_PASSWORD`, `SESSION_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` (`auth.js:25`, `_lib.js:48`, `_mail.js:15`) |

**Forma del almacenamiento.** Es **un solo documento** `{ products: [...] }`: el cliente lo lee entero con `onValue`
(`AppContext.jsx:15-19`) y cada operación hace `get` + modificar en memoria + `set` del documento completo
(`AppContext.jsx:35-42`). No existe `firebase.json`, `database.rules.json` ni `.firebaserc` en el repositorio, por lo que
**las reglas de seguridad de Firebase no están versionadas** ⚠️ SUPUESTO sobre su contenido real (ver S-04).

**Despliegue.** `.github/workflows/deploy.yml` (disparo manual) compila con Vite y publica `dist` en la rama `gh-pages`
(GitHub Pages). ⚠️ SUPUESTO: Pages está activo; si lo está, la app y su configuración son públicas (S-08). No hay
`.env`, `.env.example` ni secretos en el frontend principal; la única credencial es la configuración de Firebase.

## 2. Entidades de datos

### 2.1 Producto (`products[]`)

Se crea en `NuevoProducto.jsx:58-79` (alta manual) y `ImportModal.jsx:71-95` (carga masiva).

| Campo | Tipo | ¿Obligatorio? | Valores / formato | Origen |
|---|---|---|---|---|
| `id` | texto | sí (clave) | `CU-` + últimos 6 dígitos de `Date.now()` (alta) o + `i` (importación) | `NuevoProducto.jsx:58`, `ImportModal.jsx:72` |
| `codigo` | texto | no (vacío en los 224 del seed) | libre, ej. `002-001-1077` | `NuevoProducto.jsx:59` |
| `nombre` | texto | **sí** en alta manual | hasta 65 caracteres en el seed | `NuevoProducto.jsx:37` |
| `paisCompania` | texto | **sí** en alta manual, **no** en importación | 13 valores (`CIAS`) | `NuevoProducto.jsx:38`; `db.js:3-7` |
| `paisPlanta` | texto | **sí** en alta manual, **no** en importación | 31 valores (`FABRICANTES`); en pantalla se llama *Fabricante* | `NuevoProducto.jsx:39`; `db.js:9-15` |
| `bu` | texto | **sí** en alta manual, **no** en importación | 5 valores (`BUS`) | `NuevoProducto.jsx:40`; `db.js:17` |
| `mph` | texto | no (ausente en el seed) | libre | `NuevoProducto.jsx:64` |
| `observaciones` | texto | no | libre | `NuevoProducto.jsx:65` |
| `levantadoSOPC` | texto | no | `'si'` / `'no'` / vacío (radio *¿Se levantó desde la planta?*) | `NuevoProducto.jsx:66,150-152` |
| `etapaActual` | número | sí | 0, 1, 2 | `NuevoProducto.jsx:67`; `AppContext.jsx:83` |
| `progreso` | número | sí | 0–100, `round(hitos hechos / total × 100)` | `AppContext.jsx:79-80` |
| `ultimoHito`, `fechaUltimoHito`, `fechaInicio` | texto | sí | texto; fechas `DD/MM/AAAA` | `NuevoProducto.jsx:69-71` |
| `etapas[3]` | arreglo | sí | `{nombre, estado: en_progreso\|pendiente\|completado}`; **derivable** de `etapaActual` | `NuevoProducto.jsx:72-76`; `AppContext.jsx:88-92,111` |
| `hitos[16]` | arreglo | sí | ver 2.2 | `NuevoProducto.jsx:77` |
| `actividades[]` | arreglo | sí (puede ser vacío) | ver 2.3 | `NuevoProducto.jsx:78` |

**Volumen real del seed** (`discontinuados-224.json`, medido): 224 productos; ids `CU-000001` a `CU-000236` (hay huecos);
13 compañías, 30 de los 31 fabricantes, 5 BU; todos en etapa 0 y progreso 0; ningún `codigo`; 18 nombres repetidos (en
distinta compañía). Proyección del dueño: < 500 activos por ciclo anual.

### 2.2 Hito (`products[].hitos[]`)

Definición maestra: `HITOS_TEMPLATE` (16 hitos, `db.js:20-40`), responsable por defecto (`db.js:56-73`) y campos extra
(`db.js:43-51`). Se instancian en `makeHitos()` (`db.js:79-95`).

| Campo | Tipo | Notas | Origen |
|---|---|---|---|
| `id` | texto | `H{i}_{timestamp}` | `db.js:83` |
| `etapa` | 0/1/2 | 4 hitos en etapa 0, 8 en etapa 1, 4 en etapa 2 | `db.js:22-39` |
| `label` | texto | **es la clave de negocio del hito**: el código busca hitos por texto (`db.js:113`, `AppContext.jsx:86`, `ProductDetail.jsx:94`) | `db.js:20-40` |
| `responsable` | texto libre | defecto por hito; el dueño decidió **no** mapearlo a usuarios (backlog) | `db.js:86` |
| `done` | booleano | | `AppContext.jsx:77` |
| `fechaCompromiso`, `fechaReal` | texto | `'-'` = vacío; `fechaReal` la fija el código al marcar `done` | `db.js:88-89`; `AppContext.jsx:75-77` |
| `notas` | texto | solo *Inventario PT* y *Productos en cola de producción* | `db.js:44,49` |
| `ofreceUnidades` | `'si'`/`'no'` | solo *Inventario PT* | `db.js:44`; `ProductDetail.jsx:258-270` |
| `impactoGranelLleva`, `impactoGranelValor`, `resolucionFinal` | `'si'`/`'no'`, texto (`"0,0"`), texto | solo *Análisis de impacto planta* | `db.js:45`; `ProductDetail.jsx:288-326` |
| `valorItem`, `valorInventario` | texto con formato `1.234,56` | solo *Costo destrucción PT*, *Costo destrucción materiales*, *Costo inventario API* | `db.js:46-48`; `ProductDetail.jsx:196-218` |
| `fecha` | texto `AAAA-MM` | solo *Última OC* (`<input type="month">`) | `db.js:50`; `ProductDetail.jsx:224-230` |

**Hitos con responsable "Planta"** (los que la planta debe poder editar): *Análisis de impacto planta*, *Costo destrucción
PT*, *Costo destrucción materiales*, *Costo inventario API* y *Productos en cola de producción* (`db.js:63-67`).

**El seed no tiene estos hitos.** Trae **15 hitos con nombres legados** (`Definición MKT`, `Compliance`, `AARR`,
`Presupuesto`, `Inventario PT`, `Producción en curso`, `Inventario materiales`, `Costo destrucción`, `Última OC`,
`Análisis de granel`, `Análisis de impacto planta`, `Confirmación MKT`, `Plan desagote`, `Inactivación código`,
`Notificación final`), ninguno completado. El cliente los convierte a los 16 estándar al cargar con `migrateHitos()`
(`db.js:99-147`, invocado en `AppContext.jsx:19-26`). La migración de datos debe aplicar esa misma transformación
(ver 06-migracion-datos.md).

### 2.3 Actividad (`products[].actividades[]`)

`{ id: 'A'+timestamp, text, time: 'DD/MM HH:MM' }`, con el más nuevo primero (`AppContext.jsx:59-63`). **`time` no guarda el
año.** Hay 8 actividades en el seed, todas `Observación: …` con `time: '01/01 00:00'`.

### 2.4 Usuario (solo `localStorage`)

`{ id: 'U001'|'U'+timestamp, nombre, rol: Admin|Editor|Viewer, color, initials }` (`src/data/users.js:4-6`;
`UserContext.jsx:21-33`). El único usuario semilla es `Ariana Vinzon`, Admin (`users.js:5`).

### 2.5 Catálogos y parametría en el código

`CIAS` (13), `FABRICANTES` (31), `BUS` (5) en `db.js:3-17`; no son editables desde la UI. Nota: **`Configuracion.jsx` solo
administra usuarios**, no catálogos. La *Comparativa* guarda `{ [cia]: { y2024, y2025 } }` en `localStorage`
(`Comparativa.jsx:24-31`).

## 3. Operaciones sobre los datos

| Operación | Entidad | Pantalla / función | Detalle |
|---|---|---|---|
| Leer todo | Productos + hitos + actividades | `AppContext.jsx:13-33` | Suscripción en tiempo real al documento completo; filtros y ordenamientos **en el cliente** (`Dashboard.jsx:174-190`) |
| Crear producto | Producto | `NuevoProducto.jsx` → `addProduct` (`AppContext.jsx:200-202`) | Crea 16 hitos y 1–2 actividades |
| Importar Excel | Producto | `ImportModal.jsx` → `addProducts` (`:131-133`; `AppContext.jsx:204-206`) | Columnas reconocidas por coincidencia aproximada del encabezado (`ImportModal.jsx:46-57`); ignora filas sin nombre |
| Editar cabecera | Producto | `EditarProducto.jsx:52-65` → `updateProduct` (`AppContext.jsx:193-198`) | Cualquier campo, incluido `paisPlanta` |
| Marcar/desmarcar hito | Hito | `ProductDetail.jsx:192` → `toggleHito` (`AppContext.jsx:69-141`) | Recalcula progreso, último hito y puede avanzar etapa |
| Cargar extras del hito | Hito | `ProductDetail.jsx:196-326` → `updateHitoExtras` (`AppContext.jsx:143-154`) | Se escribe en cada pulsación de tecla |
| Avanzar etapa | Producto | `ProductDetail.jsx:115-121` → `advanceStage` (`AppContext.jsx:156-191`) | Botón visible si `canAdvance` (regla en 5.1) |
| Comentar | Actividad | `ProductDetail.jsx:101-105` → `addComment` (`AppContext.jsx:44-67`) | Prefija el texto con un nombre fijo (S-07) |
| Borrado masivo | Producto | `Configuracion.jsx:207-224` → `removeBulkProducts` (`AppContext.jsx:208-213`) | Borra ids `^CU-000\d{3}$` |
| Gestionar usuarios | Usuario (local) | `Configuracion.jsx:23-60,164-190` | Solo se muestra a Admin |
| Exportar Excel | Lectura | `Reportes.jsx:10-71` | Hojas Resumen, Hitos, Historial (con campos inexistentes: Q-01) |
| Cálculo de costos | Lectura | `DashboardView.jsx:11-31,141` | Suma `valorInventario` de los 3 hitos de costo, parseando texto |
| Historial 2024/2025 | Parametría | `Comparativa.jsx:117-122` | Tipeado a mano, guardado por navegador |

No hay filtros en el servidor: la lista completa viaja al navegador y se filtra allí. No existen llamadas `fetch` ni
variables de entorno en `src/` (verificado con búsqueda).

## 4. Autenticación y autorización actuales

- **Identificación**: pantalla "¿Quién sos?" que lista usuarios y entra con un clic (`LoginScreen.jsx:70-79`). No hay
  contraseña, token ni MFA. La sesión es el id del usuario en `localStorage` (`users.js:32-34`). La app se bloquea
  solo si no hay usuario elegido (`App.jsx:23`).
- **Roles definidos**: `Admin`, `Editor`, `Viewer` (`users.js:49-53`; descripción en `Configuracion.jsx:195-197`).
- **Dónde se aplican**:

| Rol | Lo que dice la UI | ¿Se aplica en el código? |
|---|---|---|
| Admin | "Acceso total. Puede agregar, editar y eliminar productos y usuarios." | Solo `isAdmin` (`Configuracion.jsx:18`) controla: gestión de usuarios (`:64,122,164,207`) y el borrado masivo (`:207-224`) |
| Editor | "Puede editar hitos, agregar comentarios y avanzar etapas." | **No existe ningún chequeo**: cualquier usuario puede hacerlo |
| Viewer | "Solo puede ver el dashboard y el detalle de productos." | **No existe ningún chequeo**: un Viewer puede editar, importar, comentar y avanzar etapas (`ProductDetail.jsx`, `Dashboard.jsx` no consultan el rol) |

Es decir, hoy solo hay **un permiso real** (ser Admin) y ese permiso vive en el navegador (S-02, S-03).

## 5. Lógica de negocio

Toda la lógica corre **en el navegador**; no hay servidor propio.

### 5.1 Máquina de estados del producto

| Regla | Dónde |
|---|---|
| Al completar el hito *Aviso a Supply Corp y S&OP Global* con `etapaActual = 0`, el producto pasa solo a la etapa 1 y se registra una actividad | `AppContext.jsx:86-106` |
| Avance manual 0→1: alcanza con que **un** hito de la etapa 0 esté hecho | `ProductDetail.jsx:89-91` |
| Avance manual 1→2: todos los hitos de la etapa 1 **excepto** *Análisis de impacto planta* | `ProductDetail.jsx:92-95` |
| Etapa 2: la etapa 3 se marca `completado` cuando **todos** sus hitos están hechos, y vuelve a `en_progreso` si se desmarca uno | `AppContext.jsx:107-128` |
| `progreso` = `round(hechos / hitos × 100)`; `ultimoHito` = último hecho de la lista | `AppContext.jsx:79-81` |
| Al marcar `done` se fija `fechaReal` = hoy; al desmarcar vuelve a `'-'` | `AppContext.jsx:75-77` |

No existe aprobador: el que tiene la app abierta avanza la etapa (confirmado por el dueño de negocio: "los usuarios").

### 5.2 Otras reglas

- **Migración de hitos en el cliente** (`db.js:99-147`): renombra hitos legados y agrega los faltantes; si cambia algo,
  **reescribe todo el nodo** (`AppContext.jsx:26`). Cualquier navegador que abra la app puede disparar esa escritura.
- **Reposición de datos**: si el nodo no existe o está vacío, el cliente escribe `initialData` (`AppContext.jsx:27-29`).
- **Costos**: texto → número con puntos como miles y coma decimal (`DashboardView.jsx:11-15`).
- **Importación**: parseo con `xlsx`; `paisCompania`, `paisPlanta` y `bu` se aceptan **sin validar contra los catálogos**
  y vacíos (`ImportModal.jsx:76-78`), a diferencia del alta manual (`NuevoProducto.jsx:35-42`).
- **Notificaciones, tareas programadas, integraciones externas**: **no hay** en la app principal (`plant-reports` sí envía
  correos con Gmail, pero está fuera de alcance).

## 6. Hallazgos de seguridad y calidad

Severidad: **Alta** = permite leer o alterar datos de negocio sin permiso o perder datos; **Media** = degrada auditoría o
facilita errores; **Baja** = defecto funcional o de higiene.

### Alta

| Id | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| S-01 | **Sin autenticación real**: se entra eligiendo un nombre de una lista | `LoginScreen.jsx:70-79`, `App.jsx:23` | Cualquiera que abra la app se hace pasar por cualquier usuario, incluido Admin |
| S-02 | **Usuarios y rol en `localStorage`**, editables desde DevTools | `users.js:1-2,10-19,32-34` | Cualquier persona se asigna rol Admin con una línea de JavaScript |
| S-03 | **Autorización solo en el cliente** y, además, incompleta: solo `isAdmin` existe; Editor y Viewer no restringen nada | `Configuracion.jsx:18`; ausencia de chequeos en `ProductDetail.jsx`, `Dashboard.jsx`, `EditarProducto.jsx` | Un Viewer edita todo; el Admin "protegido" se evita escribiendo directo en la base |
| S-04 | **Configuración de Firebase en el paquete público** y reglas de seguridad **no versionadas** | `firebase.js:4-12`; no existe `database.rules.json` | La clave de API de Firebase no es secreta por diseño, pero sin reglas estrictas equivale a lectura/escritura abierta de toda la base. ⚠️ SUPUESTO: reglas desconocidas (ver pregunta abierta resuelta: Firebase no se usará más) |
| S-05 | **Se reescribe el documento completo en cada cambio** (leer-modificar-escribir) | `AppContext.jsx:35-42` | Dos usuarios editando a la vez se pisan: gana el último; un fallo parcial puede dejar datos viejos. Pérdida silenciosa de datos |
| S-06 | **Cualquier navegador puede reescribir o repoblar toda la base** (migración y reposición automáticas) | `AppContext.jsx:26-29,38` | Un nodo borrado se repuebla con datos de ejemplo; una migración local pisa el trabajo de otros |

### Media

| Id | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| S-07 | **Autor fijo en los comentarios** ("Ariana S. (S&OP Global)") y las actividades de sistema no registran autor | `AppContext.jsx:60,102-105` | No hay trazabilidad de quién hizo qué |
| S-08 | **Despliegue en GitHub Pages** ⚠️ SUPUESTO activo | `.github/workflows/deploy.yml` | App y configuración accesibles desde internet, sin autenticación real |
| S-09 | **Borrado masivo por expresión regular sobre ids generados con la hora**; confirmación con `window.confirm` | `AppContext.jsx:211`; `NuevoProducto.jsx:58`; `Configuracion.jsx:215` | Un id nuevo con 6 dígitos que empiece en `000` (1 de cada 1.000) coincide con el patrón y se borra con los datos de prueba; sin registro de quién borró |
| S-10 | **Importación sin validación de catálogos** y con ids `CU-` + hora + índice | `ImportModal.jsx:72,76-78` | Entran compañías, fabricantes o BU vacíos o inexistentes; esos productos quedan fuera de los filtros |

### Baja

| Id | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| Q-01 | **El reporte Excel usa campos que no existen** (`p.pais`, `p.area`, `h.area`, `h.date`) | `Reportes.jsx:18,19,40,42,44,153,154` | Columnas País, Área y Fecha salen vacías: la exportación está rota hoy |
| Q-02 | **Costos guardados como texto** y análisis frágil: `"1234.56"` se lee como 123456 | `ProductDetail.jsx:203-216`; `DashboardView.jsx:11-15` | Totales del tablero incorrectos si alguien tipea punto decimal |
| Q-03 | **Historial por compañía guardado por navegador** | `Comparativa.jsx:23-31,118` | Cada usuario ve (y pierde) sus propios números |
| Q-04 | **Seed con hitos de una versión anterior** y migración en tiempo de ejecución | `db.js:99-147` | Cualquier migración de datos debe reproducir esa conversión |

## 7. Discrepancias entre `CLAUDE.md` y el código

| `CLAUDE.md` dice | El código hace |
|---|---|
| Nodo raíz `/productos` y `/configuracion` | Un solo nodo `discontinuados` con `{ products: [...] }` (`AppContext.jsx:8,19`); no existe `/configuracion` |
| Campos `descripcion`, `cia`, `fabricante` | `nombre`, `paisCompania`, `paisPlanta` (`NuevoProducto.jsx:59-63`) |
| `estado: Activo \| En proceso \| Discontinuado` y `etapa: 1\|2\|3` | No existe `estado`; `etapaActual` es 0, 1 o 2 y la confirmación se deduce de `etapas[2].estado` |
| Hito `{ id, nombre, responsable, estado, fechaEstimada, fechaReal }` | `{ id, etapa, label, responsable, done, fechaCompromiso, fechaReal, …extras }` (`db.js:82-92`) |
| `AppContext.jsx` y `UserContext.jsx` bajo `context/`, páginas `NuevoProducto.jsx` y `EditarProducto.jsx` bajo `pages/` | Esos dos formularios están en `src/components/` |
| "Reglas de seguridad de Firebase desconocidas" | Siguen sin poder verificarse, pero **Firebase deja de usarse** |

No se modifica `CLAUDE.md` (instrucción de no tocar archivos existentes); conviene corregirlo cuando termine la
migración.
