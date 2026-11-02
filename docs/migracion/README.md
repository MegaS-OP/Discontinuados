# Migración de Discontinuados Corporativos a Microsoft Managed Apps — Resumen ejecutivo

**Qué se diseñó.** El backend de la app (hoy Firebase + `localStorage`, con toda la lógica y los permisos en el navegador) sobre
**listas de SharePoint Online**, con seguridad aplicada en SharePoint y la lógica de servidor reubicada en 4 flujos de Power
Automate. El frontend se reconstruye aparte a partir del código fuente. **Fuera de alcance** (backlog por decisión del dueño):
`plant-reports` y el mapeo de `Responsable` a usuarios de Entra ID.

## Decisiones clave

1. **8 listas**: `Productos`, `Hitos` (16 por producto), `Actividades`, `ComparativaHistorica` y 4 catálogos
   (`Companias`, `Fabricantes`, `UnidadesNegocio`, `HitosCatalogo`). El proceso (los 16 hitos) vive en un catálogo editable.
2. **Seguridad en SharePoint, no en la interfaz.** Hoy un *Viewer* edita todo y cualquiera se hace *Admin* desde el navegador
   (hallazgos S-01 a S-03). Ahora el rol sale de grupos de Entra ID y lo hace cumplir SharePoint: el Viewer no puede escribir, el
   Editor no puede borrar y las listas de catálogo son de solo lectura salvo Admin.
3. **"La planta ve solo lo suyo"** = un permiso único por producto y por cada uno de sus 5 hitos de planta, asignado por el flujo F1
   al grupo `SG-Discontinuados-Planta-<Fabricante>` (31 grupos). Falla cerrada: sin permiso, no se ve.
4. **Sin Firebase y sin secretos en el frontend.** Se elimina la configuración de Firebase del paquete; el acceso a datos es por
   el conector de SharePoint con la identidad del usuario.
5. **Reglas de negocio** (avance de etapa, progreso, fecha real, confirmación) pasan a los flujos F2/F3; la etapa se **valida y revierte**,
   no se impide (SharePoint no puede comparar el valor anterior).
6. **Sin GxP / 21 CFR Part 11 y sin política de retención** (respuestas del dueño): versionado activado y auditoría automática, sin
   etiquetas de retención.

## ¿SharePoint alcanza?

**Sí, con dos puntos débiles reconocidos.** Se evaluó contra los criterios del pedido:

| Criterio | Resultado |
|---|---|
| Más de ~5.000 ítems con permisos únicos | **No hoy**: 6 por producto activo = 1.344 (224 productos) a 3.000 (500). El techo recomendado se alcanza en ~833 productos activos simultáneos; los productos confirmados bajan a 1 |
| Seguridad por columna extensa | **No hoy**: los costos son visibles para todo el equipo corporativo (⚠️ supuesto a confirmar). Si el negocio los restringe, se mueven a una lista aparte |
| Transacciones entre varias entidades | **Punto débil #1**: crear un producto = producto + 16 hitos + permisos, sin atomicidad. Mitigado con falla cerrada y reconciliación nocturna (F4) |
| Reglas de edición muy granulares | **Punto débil #2**: SharePoint no impide que un Editor escriba `EtapaActual`; el flujo F3 lo revierte en segundos y queda en versiones (control correctivo, no preventivo) |
| Más de 100.000 registros | No (≈ 3.800 ítems hoy; `Hitos` es el mayor: 3.584) |

**Dataverse sería la alternativa más sólida** si, al desplegar, se cumple alguna de estas condiciones concretas: (a) más de ~800 productos
activos simultáneos; (b) el negocio exige que el avance de etapa sea **preventivo**; (c) se necesita restringir costos por columna;
(d) se suma `plant-reports`, que repetiría el esquema de permisos por planta. Con Dataverse, la propiedad por equipo de planta, la
relación *Parental* (el permiso del producto alcanza a sus hitos), la seguridad por columna y las reglas de negocio reemplazan a la
mayoría de los flujos de permisos (mapeo en `03-modelo-sharepoint.md` §8). **Decisión pendiente al desplegar**: depende de si el tenant ya
tiene Dataverse y licencias para todos los usuarios, **incluidos los invitados externos**.

## Entregables

| Archivo | Contenido |
|---|---|
| `01-relevamiento.md` | Backend actual, entidades, operaciones, roles, lógica y 14 hallazgos con `archivo:línea` |
| `02-roles-y-permisos.md` | 4 roles + propietarios, 35 grupos, matriz rol × lista con el mecanismo de cada celda |
| `03-modelo-sharepoint.md` | Columnas, índices, relaciones, validaciones, diagrama ER, límites |
| `04-seguridad.md` | Sitio, lista, ítem (flujo F1 paso a paso), columna, transiciones, cumplimiento, 13 riesgos residuales |
| `05-logica-e-integraciones.md` | Dónde vive cada pieza de lógica, flujos F1–F4, resolución del rol en el frontend |
| `06-migracion-datos.md` | Mapeo campo a campo, orden de carga, validación (con ensayo en seco sobre el seed) |
| `07-pruebas-seguridad.md` | 59 casos por rol, incluidos accesos por fuera de la app |
| `sharepoint-schema.json` | Esquema legible por máquina (fuente única de las tablas del doc 03 y del script) |
| `provisioning/` | `00-crear-grupos-entra.ps1` y `01-crear-listas.ps1` (idempotentes) |

> ⚠️ **Los scripts de `provisioning/` no se ejecutaron ni se probaron contra un tenant** (no hay PowerShell en el entorno de trabajo; solo se
> verificó el balance de llaves). Probar con `-WhatIf` en un sitio de desarrollo. Los flujos están **especificados**, no construidos.
> Este paquete **reemplaza** los archivos de igual nombre generados en una pasada anterior (siguen en el historial de Git).

## Preguntas abiertas para el dueño de negocio

1. ¿La planta solo completa hitos o también **crea** productos? (se asumió que no; si crea, hace falta una lista de solicitudes)
2. ¿La planta debe **ver o comentar** la bitácora (`Actividades`)? (se asumió que no)
3. ¿Qué fabricantes son **terceros** y tendrán usuarios invitados? (columna `Fabricantes.Externo`)
4. ¿Los **costos** de destrucción los ve todo el equipo corporativo o solo algunas áreas? ¿En qué **moneda**?
5. `FechaUltimoHito`: hoy nunca se actualiza tras el alta. ¿Se mantiene así o pasa a ser la fecha real del último hito?
6. Responsable de los 16 hitos al migrar: ¿el **del catálogo** (propuesto) o el del origen (el seed trae `Planta` en dos hitos)?
7. ¿Alguien cargó valores 2024/2025 en la **Comparativa** de su navegador que haya que rescatar?
8. ¿El estado vivo de Firebase difiere del seed? ¿Quién exporta el nodo antes de apagarlo?
9. Nombre y ubicación del **sitio** (se propuso `discontinuados-corp`) y si hay **otros datos sensibles** (el campo quedó vacío en el pedido).

## Preguntas abiertas para IT

1. ¿Se pueden crear los **35 grupos** de Entra ID (4 + 31) sin proceso de aprobación especial? *(sin respuesta)*
2. **Licencias**: ¿Managed Apps / Power Platform para usuarios internos **e invitados**? ¿Hay Dataverse disponible?
3. Alta de la **cuenta de servicio** `svc-discontinuados-flows` (acceso condicional, MFA, propietaria de las conexiones).
4. ¿El conector de SharePoint de la Managed App incluye *Enviar una solicitud HTTP a SharePoint* y permite **descargar archivos** generados en el navegador?
5. Retención del **registro de auditoría de Purview** según la licencia, y etiqueta de confidencialidad para el sitio.
6. ¿Está activo **GitHub Pages** en el repositorio (S-08)? Si es así, desactivarlo y dar de baja/rotar el proyecto Firebase.
7. App registrada y permisos para **PnP.PowerShell** (`-ClientId`) y Microsoft Graph (grupos).

## Respuestas ya recibidas (registro)

GxP/Part 11: **no** · Planta ve solo lo suyo · `plant-reports`: backlog · Retención: **sin política** · Aprobador de etapa: **los usuarios** ·
`Responsable` → usuario: backlog · Seed de 224: **datos de prueba, se migran** · `PROC-SC-DISC-001`: **no existe** · Firebase: **no se usa** ·
Power Automate Premium: **sí** (no hace falta: F1–F4 usan solo conectores estándar) · CI/CD de flujos: **no** (usar solución de Power Platform) ·
Ventana de migración: **sí** · Invitados externos: **habilitados** · PnP/Admin: **se resuelve al desplegar**.

**Nota.** `CLAUDE.md` describe un modelo de datos que no coincide con el código (01 §7). No se modificó; conviene corregirlo al terminar.
