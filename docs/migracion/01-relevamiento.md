# Relevamiento técnico — App Discontinuados Corporativos

## 1. Almacenamiento actual

| Componente | Motor | Dónde | Cómo conecta |
|---|---|---|---|
| **Datos de negocio (productos, hitos, actividades)** | Firebase Realtime Database | `discontinuados-megalabs-default-rtdb.firebaseio.com` — path `/discontinuados` | SDK Firebase Web v12, credenciales embebidas en el bundle (`src/firebase.js:4-12`) |
| **Usuarios y sesión** | `localStorage` del navegador | Claves `mgl_users` y `mgl_session` | `src/data/users.js:1-38` — sin servidor |
| **Sub-módulo plant-reports** | Netlify Blobs (key-value serverless) | Stores nombrados: `reports`, `cycles`, `users`, `config`, `ratelimit` | Funciones Netlify Edge en `plant-reports/netlify/functions/` |

### Detalle Firebase

- La **API key** de Firebase (`AIzaSyBiwlQ-MRDeLWV4YFhb4B-0Bro_xRIeNTI`) y el `appId` están **hardcodeados** en el bundle que se entrega al navegador (`src/firebase.js:4-12`). Cualquier persona con DevTools puede leerlos.
- El cliente escucha cambios en tiempo real con `onValue` (`src/context/AppContext.jsx:15`) y escribe con `set` (reemplazo completo del árbol cada vez).
- No hay reglas de seguridad de Firebase documentadas en el repositorio. ⚠️ SUPUESTO: las reglas actuales son `".read": true, ".write": true` (modo desarrollo) o protegidas por oscuridad de API key.

---

## 2. Entidades de datos

### 2.1 Producto (`products[]`)

Fuente: `src/data/db.js`, `discontinuados-224.json` (224 registros de ejemplo).

| Campo | Tipo JS | Notas |
|---|---|---|
| `id` | string | Formato `CU-NNNNNN` (seed) o `CU-{timestamp[-6]}` (nuevo) |
| `codigo` | string | Código SAP u otro; puede estar vacío |
| `nombre` | string | Descripción del SKU, hasta ~80 chars en los datos |
| `paisCompania` | string (choice) | Valores: `Arg-Mlb`, `Bol-Mlb`, …, 13 opciones (`src/data/db.js:3-7`) |
| `paisPlanta` | string (choice) | Valores: `Andrómaco`, `Apiter`, …, 31 opciones (`src/data/db.js:9-15`) |
| `bu` | string (choice) | `Primary`, `Consumer`, `Divise`, `Hi-Tech`, `Nutraceutical` (`src/data/db.js:17`) |
| `observaciones` | string | Texto libre; puede ser vacío |
| `mph` | string | Código MPH; puede estar vacío |
| `levantadoSOPC` | string | `'si'` / `'no'` / vacío — si la detección vino de la planta (`src/components/NuevoProducto.jsx:28`) |
| `etapaActual` | number (0/1/2) | 0=Detección, 1=Análisis, 2=Confirmación |
| `progreso` | number (0-100) | % de hitos completados |
| `ultimoHito` | string | Label del último hito marcado |
| `fechaUltimoHito` | string (DD/MM/YYYY) | Fecha del último cambio de hito |
| `fechaInicio` | string (DD/MM/YYYY) | Fecha de ingreso al proceso |
| `etapas` | array[3] | `[{nombre, estado}]`; estados: `en_progreso`, `pendiente`, `completado` |
| `hitos` | array[16] | Ver entidad Hito |
| `actividades` | array | Ver entidad Actividad |

**Volumen estimado**: 224 registros seed + crecimiento orgánico. Escenario realista: < 1.000 productos activos por ciclo anual. Nunca supera el umbral SharePoint de 5.000.

### 2.2 Hito (`hitos[]` dentro de cada producto)

Definición maestra en `src/data/db.js:20-40`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `H{index}_{timestamp}` |
| `etapa` | number (0/1/2) | A qué etapa del proceso pertenece |
| `label` | string | Nombre del hito (16 valores fijos + migración de legados) |
| `responsable` | string | Área responsable (texto libre); defecto en `RESPONSABLES_DEFAULT` |
| `done` | boolean | Si está completado |
| `fechaCompromiso` | string | DD/MM/YYYY o `'-'` |
| `fechaReal` | string | DD/MM/YYYY o `'-'`; se setea automáticamente al marcar `done` |
| `notas` | string | Solo en hitos con `notas: true` (Inventario PT, Productos en cola) |
| `ofreceUnidades` | string | Solo en "Inventario PT" |
| `impactoGranelLleva` | string | Solo en "Análisis de impacto planta" |
| `impactoGranelValor` | string | Solo en "Análisis de impacto planta" |
| `resolucionFinal` | string | Solo en "Análisis de impacto planta" |
| `valorItem` | string | Solo en hitos de costo ("Costo destrucción PT/materiales", "Costo inventario API") |
| `valorInventario` | string | Igual que `valorItem` |
| `fecha` | string | Solo en "Última OC" |

Los 16 hitos estándar se definen en `HITOS_TEMPLATE` (`src/data/db.js:20-40`). Hay lógica de migración de nombres (`src/data/db.js:99-147`) para mantener compatibilidad con versiones anteriores.

### 2.3 Actividad (`actividades[]` dentro de cada producto)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `A{timestamp}` |
| `text` | string | Texto libre del comentario o evento de sistema |
| `time` | string | DD/MM HH:MM |

Las actividades se agregan al inicio del array (orden inverso cronológico). El texto puede incluir el nombre del usuario hardcodeado: `"Ariana S. (S&OP Global): ${text}"` (`src/context/AppContext.jsx:58`). ⚠️ HALLAZGO: el nombre está hardcodeado, no viene del usuario autenticado.

### 2.4 Usuarios (localStorage, no Firebase)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `U001` (seed) o `U{timestamp}` |
| `nombre` | string | Nombre completo |
| `rol` | string | `Admin`, `Editor`, `Viewer` |
| `color` | string (hex) | Color del avatar |
| `initials` | string | Iniciales derivadas del nombre |

**Volumen**: pocos usuarios (decenas). Único usuario seed: `Ariana Vinzon` con rol `Admin` (`src/data/users.js:5`).

### 2.5 Sub-módulo plant-reports (sistema separado)

Este módulo tiene su propia base de datos en Netlify Blobs con entidades:
- **Ciclos** (store `cycles`): períodos de reporte de planta.
- **Informes** (store `reports`): uno por `{cycleId}:{plantId}`.
- **Usuarios de planta** (store `users`): email, plantId, hash de código de acceso, salt.
- **Configuración** (store `config`): plantas activas, secciones, KPIs.

---

## 3. Operaciones CRUD

| Operación | Entidad | Desde dónde | Filtros / parámetros |
|---|---|---|---|
| **Leer todos los productos** | Product | `Dashboard.jsx`, `DashboardView.jsx` | Suscripción en tiempo real a `/discontinuados`; filtrado en frontend por CIA, BU, etapa |
| **Crear producto** | Product | `NuevoProducto.jsx` | `addProduct()` → `set()` Firebase |
| **Importar productos** (bulk) | Product | `ImportModal.jsx` | Parseo Excel con `xlsx`; `addProducts()` → `set()` Firebase |
| **Editar cabecera de producto** | Product | `EditarProducto.jsx` | `updateProduct(id, changes)` → `set()` Firebase |
| **Eliminar productos bulk** | Product | `Configuracion.jsx` (solo Admin) | Regex `^CU-000\d{3}$` filtra los de carga inicial |
| **Marcar/desmarcar hito** | Hito en Product | `ProductDetail.jsx` | `toggleHito(productId, hitoId)` — también calcula progreso y puede avanzar etapa |
| **Actualizar extras de hito** | Hito en Product | `ProductDetail.jsx` | `updateHitoExtras(productId, hitoId, extras)` |
| **Avanzar etapa manualmente** | Product | `ProductDetail.jsx` | `advanceStage(productId)` |
| **Agregar comentario** | Actividad en Product | `ProductDetail.jsx` | `addComment(productId, text)` — nombre del usuario hardcodeado |
| **Gestionar usuarios** | Users (localStorage) | `Configuracion.jsx` (solo Admin) | CRUD local; solo Admin puede crear/editar/eliminar |
| **Login / logout** | Sesión (localStorage) | `LoginScreen.jsx` | `setCurrentUser(id)` / `clearSession()` |

---

## 4. Autenticación y autorización actuales

### Autenticación principal (app Discontinuados)

- **Mecanismo**: "selección de usuario" en pantalla de login (`src/components/LoginScreen.jsx`). El usuario hace click en su nombre de una lista — **no hay contraseña ni MFA**.
- **Sesión**: se guarda el `id` del usuario elegido en `localStorage` con clave `mgl_session` (`src/data/users.js:32`).
- **Lista de usuarios**: almacenada también en `localStorage` (`mgl_users`). Cualquier usuario puede abrir DevTools y modificarla.

### Roles y su aplicación

| Rol | Descripción en UI | Dónde se verifica |
|---|---|---|
| `Admin` | Gestión total + usuarios | `src/pages/Configuracion.jsx:18` — `isAdmin = currentUser?.rol === 'Admin'` |
| `Editor` | Ver + editar hitos + comentarios | Implícito; no hay guard explícito en `ProductDetail.jsx` para Editor vs Viewer |
| `Viewer` | Solo lectura | ⚠️ SUPUESTO: el frontend no muestra botones de edición, pero **no hay guard a nivel API/Firebase** |

**No hay verificación de rol en Firebase.** Cualquier usuario (o cualquier persona con la API key) puede escribir directamente al nodo `/discontinuados` en Firebase, independientemente de su rol.

### Autenticación plant-reports (sub-módulo)

Sistema separado y más robusto (`plant-reports/netlify/functions/auth.js`):
- Admin: contraseña desde variable de entorno `ADMIN_PASSWORD`.
- Usuarios de planta: código de acceso con hash HMAC + salt; rate limiting por IP (5 intentos / 15 min).
- Tokens JWT firmados con `SESSION_SECRET` (env var), TTL 12 h.

---

## 5. Lógica de negocio del servidor

### Máquina de estados del producto

Implementada en cliente (`src/context/AppContext.jsx`):

1. **Avance Detección → Análisis**: se dispara al marcar como `done` el hito "Aviso a Supply Corp y S&OP Global" y `etapaActual === 0` (`AppContext.jsx:86-106`).
2. **Avance Análisis → Confirmación**: función `advanceStage()` — manual.
3. **Cierre Confirmación**: al completar todos los hitos de etapa 2 (`AppContext.jsx:108-128`).
4. **Cálculo de progreso**: `Math.round((done/total)*100)` al toglear cualquier hito (`AppContext.jsx:79`).

### Migración de hitos legados

Función `migrateHitos()` (`src/data/db.js:99-147`) renombra hitos viejos y agrega nuevos al cargar datos. Se ejecuta en el cliente y persiste el resultado en Firebase si hubo cambios (`AppContext.jsx:26`).

### Importación masiva desde Excel

Función `parseExcel()` en `src/components/ImportModal.jsx`: parsea columnas por nombre (fuzzy matching de headers), crea productos con hitos por defecto y los agrega masivamente a Firebase.

### Sub-módulo plant-reports — lógica de servidor real

- Validación de ciclo abierto antes de permitir escritura (`report.js:17,45-46`).
- Restricción de cada usuario de planta a su propio `plantId` (`report.js:28`).
- Notificaciones por email al abrir/recordar/cerrar ciclos (`notify.js`).
- Historial de versiones de informes (hasta 60 versiones, `report.js:7`).

---

## 6. Hallazgos de seguridad

### Alta

| # | Hallazgo | Archivo:línea | Impacto |
|---|---|---|---|
| S1 | **API key de Firebase embebida en el bundle** | `src/firebase.js:4-12` | Cualquier persona puede leer y escribir en la base de datos si las reglas de seguridad son permisivas. La API key no es un secreto real en Firebase, pero sin reglas equivale a acceso total. |
| S2 | **Sin autenticación real** — login es solo "elegir nombre" | `src/components/LoginScreen.jsx`, `src/data/users.js` | Cualquier persona puede impersonar a cualquier usuario incluyendo Admin; no hay password, token ni MFA. |
| S3 | **Lista de usuarios y rol en localStorage** | `src/data/users.js:1-2` | Cualquier usuario puede abrir DevTools → Application → localStorage, cambiar su rol a `Admin` y obtener todos los privilegios de administrador. |
| S4 | **Roles solo en frontend** — no hay enforcement en Firebase | `src/pages/Configuracion.jsx:18` | El chequeo `isAdmin = currentUser?.rol === 'Admin'` es puramente de UI. Un Viewer puede escribir en Firebase directamente. |

### Media

| # | Hallazgo | Archivo:línea | Impacto |
|---|---|---|---|
| S5 | **Nombre de usuario hardcodeado** en actividades | `src/context/AppContext.jsx:58` | Las actividades muestran `"Ariana S. (S&OP Global)"` sin importar quién está logueado; la auditoría es inútil. |
| S6 | **Sin sanitización de inputs** antes de persistir en Firebase | `src/components/NuevoProducto.jsx:57-78` | Riesgo de inyección de datos maliciosos en el JSON de Firebase (bajo impacto directo dado el modelo, pero puede corromper la aplicación). |

### Baja

| # | Hallazgo | Archivo:línea | Impacto |
|---|---|---|---|
| S7 | **`window.confirm()` como único guard** para eliminación masiva | `src/pages/Configuracion.jsx:215` | No hay confirmación por escrito ni log de quién eliminó. |
| S8 | **IDs de productos predecibles** (timestamp de 6 dígitos) | `src/components/NuevoProducto.jsx:57` | Facilita enumeración/colisión en entornos con mucho tráfico. |
