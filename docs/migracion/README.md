# Diseño de migración — Discontinuados Corporativos a Microsoft 365

**Fecha**: 30 de octubre de 2026  
**Preparado por**: Arquitectura de Soluciones Microsoft 365  
**Versión**: 1.0

---

## Qué es la app y qué hace

**Discontinuados Corporativos** es una herramienta de gestión de procesos del área S&OP Global de Megalabs. Permite hacer seguimiento de la discontinuación de SKUs farmacéuticos a través de 13 compañías del grupo y múltiples plantas fabricantes.

El proceso tiene 3 etapas: **Detección → Análisis → Confirmación**. Cada producto en proceso de discontinuación atraviesa 16 hitos estándar con responsables definidos por área (Mkt Corp, Supply Chain Corp, Planta, Compliance, etc.). Actualmente hay **224 productos registrados** en el seed de datos, con proyección de crecimiento a ~500 activos por ciclo anual.

La app es React + Vite con Firebase Realtime Database como backend. Tiene un sub-módulo separado (`plant-reports`) para informes de planta, con su propio backend en Netlify.

---

## Decisiones de arquitectura clave

### 1. SharePoint alcanza — se recomienda SharePoint Online (no Dataverse)

Con 224 productos × 16 hitos = ~3.584 ítems en la lista Hitos, y una proyección de crecimiento que no superará los 5.000 productos en el horizonte de 5 años, el modelo cabe perfectamente en SharePoint Online con los índices adecuados. No se identificaron requisitos de transacciones ACID, relaciones complejas de muchos-a-muchos, ni >100.000 registros que justifiquen el costo y complejidad de Dataverse.

**Condición**: si en el futuro se necesitan permisos únicos por ítem para más de 5.000 ítems simultáneamente, re-evaluar Dataverse.

### 2. Los datos se aplanan — los hitos salen del objeto del producto

El modelo actual de Firebase guarda todos los hitos embebidos dentro del objeto del producto (JSON anidado). En SharePoint, los hitos se almacenan en una lista separada con lookup al producto. Esto habilita filtros, consultas por hito y auditoría individual.

### 3. La seguridad se mueve al servidor

El principal hallazgo de seguridad es que **toda la autorización actual vive en el frontend** (localStorage, comprobaciones de rol en React). En SharePoint, los permisos son server-side: el servidor rechaza la operación con 403 sin importar si el usuario manipuló la UI o usó Excel/REST directamente.

### 4. El login custom se elimina — Entra ID toma el control

El sistema de "elegir quién sos" sin contraseña se reemplaza con autenticación MSAL/Entra ID estándar. Los roles se mapean a grupos de seguridad `SG-Discontinuados-{Rol}`.

### 5. La lógica de servidor va a Power Automate

La máquina de estados (avance de etapas, cálculo de progreso, creación de hitos, notificaciones) se implementa en 6 flujos Power Automate. No hay código de servidor propio ni secretos en el frontend.

### 6. Se crea un grupo Entra ID por planta fabricante

Para restringir el acceso de los usuarios de planta a sus propios productos (~31 grupos `SG-Discontinuados-Planta-{Fabricante}`), se usan permisos únicos por ítem asignados por flujo al crear cada producto. Dentro del límite de 500 ítems activos, el impacto de rendimiento es mínimo.

---

## ¿SharePoint alcanza?

**Sí, con las condiciones documentadas.**

| Criterio | Estado |
|---|---|
| Volumen < 5.000 ítems por lista con índices | OK (Hitos ~8.000 → indexados, manejable) |
| Sin transacciones ACID requeridas | OK |
| Sin campos sensibles que requieran seguridad por columna | OK (costos visibles para todos los Editors) |
| Permisos únicos por ítem < 5.000 | OK (~500 productos activos) |
| Sin integraciones con APIs externas que requieran secretos | OK (solo email via Office 365 Outlook) |

Si se necesitara **seguridad por columna extensiva** (ej. costos visibles solo para Finanzas) o **transacciones multi-ítem garantizadas**, se recomendaría Dataverse.

---

## Preguntas abiertas para negocio

1. **¿Aplica 21 CFR Part 11 o GxP?** Los productos farmacéuticos discontinuados pueden requerir firma electrónica para la etapa de Confirmación y registros inalterables. ¿El equipo regulatorio debe revisar este diseño?

2. **¿Los usuarios de planta deben ver solo sus productos, o también pueden ver los de otras plantas para coordinación?** El diseño actual restringe a planta propia; si se necesita visibilidad cruzada, el modelo de permisos cambia.

3. **¿El sub-módulo `plant-reports` (informes de planta por ciclo) se migra junto con Discontinuados o en una segunda fase?** Tiene su propio modelo de datos (ciclos, informes, slides) que no está incluido en este diseño.

4. **¿Cuál es la política de retención de datos?** ¿Cuántos años deben conservarse los registros de discontinuación? ¿Hay requisitos regulatorios de retención por país?

5. **¿Quiénes son los responsables de aprobar el avance de etapa?** ¿Es suficiente con que cualquier Admin lo apruebe, o debe ser una persona específica? Esto define si se necesita un flujo de aprobación formal.

6. **¿Se necesita notificación automática a los responsables de cada hito?** El campo `Responsable` en los hitos es texto libre (no una persona de Entra ID). Para enviar notificaciones por email, ¿debe mapearse a usuarios reales del directorio?

7. **¿Qué pasa con los productos del seed `CU-000001` al `CU-000224` que están todos en etapa 0 (Detección)?** ¿Son datos reales o datos de prueba? ¿Se migran todos o solo los que tienen actividad real en Firebase?

---

## Preguntas abiertas para IT

1. **Reglas de seguridad de Firebase actuales**: ¿son `".read": true, ".write": true`? Esto es un riesgo crítico activo que debe cerrarse independientemente de la migración.

2. **¿El tenant Microsoft 365 de Megalabs tiene PnP.PowerShell habilitado** y acceso de administrador para ejecutar los scripts de provisioning? ¿Hay políticas de acceso condicional que afecten al sitio?

3. **¿Se puede crear un sitio SharePoint nuevo** `discontinuados-corp` sin restricciones de naming/aprobación interna?

4. **¿Los grupos Entra ID `SG-Discontinuados-*` pueden ser creados por el equipo de IT** o requieren aprobación especial? ¿Hay un proceso de onboarding de usuarios a grupos de seguridad?

5. **¿Power Automate Premium está disponible** en las licencias actuales? Los flujos con HTTP trigger y acciones de permisos de SharePoint requieren conectores premium en algunos planes.

6. **Throttling de SharePoint durante la migración masiva**: ¿se puede coordinar una ventana de mantenimiento para cargar ~3.600 ítems sin afectar otros sitios del tenant?

7. **¿Hay un proceso de CI/CD** para flujos de Power Automate (export/import entre ambientes DEV → PROD)?

---

## Entregables de este documento

| Archivo | Descripción |
|---|---|
| `01-relevamiento.md` | Análisis completo del código fuente actual con citas de archivo:línea |
| `02-roles-y-permisos.md` | Roles de negocio, grupos Entra ID, matriz CRUD completa |
| `03-modelo-sharepoint.md` | 7 listas con columnas, tipos, índices, validaciones y diagrama Mermaid |
| `04-seguridad.md` | Seguridad por capas: sitio, lista, ítem, columna, transiciones, cumplimiento |
| `05-logica-e-integraciones.md` | Tabla de reubicación de lógica, 6 flujos Power Automate, resolución de rol en frontend |
| `06-migracion-datos.md` | Mapeo campo a campo, orden de carga, transformaciones, validación post-migración |
| `provisioning/01-crear-listas.ps1` | Script PnP PowerShell idempotente para crear todas las listas |
| `sharepoint-schema.json` | Esquema legible por máquina de todas las listas y permisos |
| `07-pruebas-seguridad.md` | 12 casos de prueba por rol incluyendo acceso directo a SharePoint/Excel/REST |
