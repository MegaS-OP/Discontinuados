# Lógica e integraciones — Reubicación para SharePoint

## 1. Tabla de reubicación de lógica

| Lógica actual | Archivo:línea | Destino en M365 | Mecanismo | Notas |
|---|---|---|---|---|
| **Avance automático Detección→Análisis** al completar hito "Aviso a Supply Corp" | `AppContext.jsx:86-106` | Power Automate | Flujo disparado por cambio en lista Hitos (`Done=true` AND `Label="Aviso a Supply Corp y S&OP Global"`). Actualiza `EtapaActual` del producto padre. | |
| **Avance Análisis→Confirmación** (manual) | `AppContext.jsx:156-191` | Power Automate + frontend | Botón en frontend llama a flujo via HTTP trigger. Flujo valida que todos los hitos de etapa 1 estén completos antes de avanzar. | |
| **Cierre automático Confirmación** al completar todos los hitos de etapa 2 | `AppContext.jsx:108-128` | Power Automate | Igual al avance automático: disparado por cambio en Hitos, verifica que todos los de `Etapa=2` estén `Done`. | |
| **Cálculo de progreso** (`done/total*100`) | `AppContext.jsx:79` | Power Automate | Flujo recalcula y actualiza `Progreso` en el producto al cambiar cualquier hito. Alternativa: columna calculada (no puede referenciar lista externa en SP). | |
| **Creación de 16 hitos al crear producto** | `src/data/db.js:79-95` (makeHitos) | Power Automate | Flujo `PA-Discontinuados-CrearHitos` disparado al crear ítem en Discontinuados. Lee `HitosTemplate`, crea 16 ítems en lista Hitos. | |
| **Migración de hitos legados** (renombres, campos nuevos) | `src/data/db.js:99-147` | Power Automate (one-time) | Script de migración de datos (PnP PowerShell o flujo manual) durante la carga inicial. No aplica en régimen permanente. | |
| **Actualización de `UltimoHito`** y `FechaUltimoHito` | `AppContext.jsx:130-133` | Power Automate | Parte del flujo de toggle de hito: actualiza campos derivados en el producto padre. | |
| **Eliminación masiva de productos seed** | `AppContext.jsx:208-213` | No migrar | Esta es una función de setup/dev. No tiene equivalente de negocio. Si se necesita un borrado masivo puntual, usar PnP PowerShell. | |
| **Importación desde Excel** | `src/components/ImportModal.jsx` | Frontend + Power Automate | Frontend parsea el Excel y llama al flujo de creación para cada fila. O bien: Power Automate con conector Excel Online. | |
| **Login y gestión de usuarios** (localStorage) | `src/data/users.js` | Reemplazado por Entra ID | La identidad viene de la sesión MSAL del usuario en la app Copilot Runtime. No hay login custom. | |
| **Verificación de rol (isAdmin)** | `src/pages/Configuracion.jsx:18` | Frontend UX + SharePoint | Ver sección 3 abajo. | |
| **Registro de actividades de sistema** (avance de etapa, etc.) | `AppContext.jsx:102-105, 121-124` | Power Automate | El flujo de avance de etapa crea el ítem en lista Actividades con `TipoActividad=Sistema`. | |
| **Hardcode de nombre en comentario** | `AppContext.jsx:58` | Eliminado | En SharePoint, `CreadoPor` es automático y corresponde a la identidad Entra ID real del usuario. | |

---

## 2. Flujos Power Automate — resumen

| Nombre del flujo | Disparador | Propósito |
|---|---|---|
| `PA-Discontinuados-CrearHitos` | Nuevo ítem en lista Discontinuados | Crea los 16 hitos estándar leyendo HitosTemplate |
| `PA-Discontinuados-AsignarPermisosPlanta` | Nuevo ítem en lista Discontinuados | Rompe herencia y asigna grupo de planta al ítem (ver Fase 4) |
| `PA-Discontinuados-ToggleHito` | Modificación de ítem en Hitos (`Done` cambia) | Recalcula progreso, actualiza UltimoHito, avanza etapa si corresponde, registra actividad |
| `PA-Discontinuados-ValidarTransicionEtapa` | Modificación de ítem en Discontinuados (`EtapaActual` cambia) | Valida que la transición sea válida (solo +1, hitos previos completos) |
| `PA-Discontinuados-NotificarEtapa` | Avance de etapa confirmado | Envía email/Teams a los responsables de la nueva etapa |
| `PA-Discontinuados-EliminarProducto` | HTTP trigger (llamado desde frontend, solo Admin) | Elimina hitos relacionados, luego el producto (cascade manual) |

---

## 3. Resolución de rol del usuario en el frontend (solo UX)

**Problema**: el frontend necesita saber si el usuario es Admin/Editor/Viewer para mostrar u ocultar controles (esto es puramente UX; la seguridad real está en SharePoint).

**Mecanismo recomendado**: intentar leer un ítem de una lista restringida.

```javascript
// En el contexto de autenticación de la app (al iniciar)
async function resolverRol(spClient) {
  // Intenta leer la lista HitosTemplate con acceso de Admin.
  // Si tiene permiso de escritura, es Admin o Editor.
  // Si falla con 403, es Viewer.
  try {
    const perms = await spClient.getListPermissions('HitosTemplate');
    const puedeEditar = perms.includes('EditListItems');
    const puedeBorrar = perms.includes('DeleteListItems');
    if (puedeBorrar) return 'Admin';
    if (puedeEditar) return 'Editor';
    return 'Viewer';
  } catch {
    return 'Viewer';
  }
}
```

Alternativa más directa y recomendada: consultar la membresía de grupos via **Microsoft Graph API** (conector Office 365 Users o llamada directa desde MSAL):

```javascript
// Graph: GET /me/memberOf
const grupos = await graphClient.api('/me/memberOf').get();
const esAdmin = grupos.value.some(g => g.displayName === 'SG-Discontinuados-Admin');
const esEditor = grupos.value.some(g => g.displayName === 'SG-Discontinuados-Editor');
```

> **Importante**: esta información se usa **solo para mostrar/ocultar elementos de UI**. Las operaciones reales están protegidas por los permisos SharePoint del servidor.

---

## 4. Integraciones externas

La app actual **no tiene integraciones externas** a servicios de terceros aparte de Firebase.

El sub-módulo `plant-reports` tiene:

| Integración | Servicio | Secreto requerido | Migración a M365 |
|---|---|---|---|
| **Email (notificaciones)** | SMTP / Sendgrid (⚠️ SUPUESTO: `_mail.js` referencia env vars de email) | Sí — connection string en Netlify env | Conector **Office 365 Outlook** en Power Automate. Sin secretos en el frontend. |
| **Almacenamiento de informes** | Netlify Blobs | Token de deploy (Netlify) | Reemplazado por listas SharePoint o biblioteca de documentos. |
| **Autenticación de planta** | Custom HMAC | `SESSION_SECRET`, `ADMIN_PASSWORD` en Netlify env | Reemplazado por Entra ID + grupos `SG-Discontinuados-Planta-{X}`. No hay secretos. |

---

## 5. Secretos y su manejo

En la app migrada **no hay secretos en el frontend**. Todos los secretos se eliminan o mueven:

| Secreto actual | Dónde está hoy | Destino |
|---|---|---|
| Firebase API key | `src/firebase.js:4` (bundle público) | **Eliminado** — reemplazado por MSAL + SharePoint REST API |
| `ADMIN_PASSWORD` (plant-reports) | Variable de entorno Netlify | Eliminado — reemplazado por Entra ID |
| `SESSION_SECRET` (plant-reports) | Variable de entorno Netlify | Eliminado — tokens gestionados por Entra ID |
| Credenciales de email (plant-reports) | Variable de entorno Netlify | Conector Office 365 Outlook (sin secretos explícitos) |
