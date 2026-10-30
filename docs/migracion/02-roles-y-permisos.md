# Roles y permisos — Diseño para SharePoint Online

## 1. Roles de negocio (inferidos del código)

| Rol actual | Descripción en código | Fuente |
|---|---|---|
| **Admin** | "Gestión total + usuarios. Puede agregar, editar y eliminar productos y usuarios." | `src/pages/Configuracion.jsx:196` |
| **Editor** | "Puede editar hitos, agregar comentarios y avanzar etapas." | `src/pages/Configuracion.jsx:197` |
| **Viewer** | "Solo puede ver el dashboard y el detalle de productos." | `src/pages/Configuracion.jsx:198` |

### Roles adicionales a considerar para SharePoint

Dado el proceso multi-compañía y multi-planta visible en los datos, se recomienda agregar:

| Rol propuesto | Justificación |
|---|---|
| **Propietario del sitio** | IT / governance; no opera el negocio |
| **Planta** | Usuarios del sub-módulo plant-reports que completan hitos específicos ("Análisis de impacto planta", costos) |

---

## 2. Grupos Entra ID

Convención de nomenclatura: `SG-Discontinuados-<Rol>`

| Grupo Entra ID | Rol de negocio | Descripción |
|---|---|---|
| `SG-Discontinuados-Admin` | Admin | Gestores del proceso (S&OP Global). Pueden crear/editar/eliminar productos y gestionar la configuración. |
| `SG-Discontinuados-Editor` | Editor | Áreas funcionales (Supply Chain Corp, Mkt Corp, etc.). Completan hitos y agregan comentarios. |
| `SG-Discontinuados-Viewer` | Viewer | Audiencia de solo lectura (gerencias, auditores internos). |
| `SG-Discontinuados-Planta` | Planta | Usuarios de planta que completan hitos de impacto. Acceso restringido a ítems de su compañía/planta. |
| `SG-Discontinuados-Owners` | Propietario del sitio | IT; nunca más de 2-3 personas. |

---

## 3. Matriz CRUD completa

### Lista: Discontinuados (productos)

| Operación | Admin | Editor | Planta | Viewer | Mecanismo SharePoint |
|---|---|---|---|---|---|
| **Crear** ítem | ✅ | ✅ | ❌ | ❌ | Nivel de permiso "Contribuir" en Editors; Viewers con "Leer" |
| **Leer** todos los ítems | ✅ | ✅ | Solo propios* | ✅ | *Ver sección "ítem" abajo |
| **Editar** campos de cabecera (nombre, CIA, BU…) | ✅ | ✅ | ❌ | ❌ | Permiso "Contribuir" |
| **Eliminar** ítem | ✅ Admin solo | ❌ | ❌ | ❌ | Nivel personalizado "Contribuir sin eliminar" para Editors |

### Lista: Hitos (tabla relacionada)

| Operación | Admin | Editor | Planta | Viewer | Mecanismo SharePoint |
|---|---|---|---|---|---|
| **Leer** todos | ✅ | ✅ | Solo de su planta* | ✅ | Herencia de permisos del producto padre |
| **Editar** hito (done, fechas, extras) | ✅ | ✅ | Solo hitos de su etapa* | ❌ | *Flujo Power Automate valida antes de escribir |
| **Crear/eliminar** hito | ❌ | ❌ | ❌ | ❌ | Los hitos se crean solo por flujo al crear producto |

### Lista: Actividades (log de auditoría)

| Operación | Admin | Editor | Planta | Viewer | Mecanismo SharePoint |
|---|---|---|---|---|---|
| **Leer** | ✅ | ✅ | Solo las de su planta | ✅ | Herencia |
| **Crear** comentario | ✅ | ✅ | ✅ (hitos propios) | ❌ | "Contribuir" |
| **Editar/Eliminar** | ❌ | ❌ | ❌ | ❌ | Nivel personalizado sin editar/eliminar |

### Listas de catálogo (Cias, Fabricantes, BUs)

| Operación | Admin | Editor | Planta | Viewer | Mecanismo |
|---|---|---|---|---|---|
| **Leer** | ✅ | ✅ | ✅ | ✅ | Acceso de lectura a todos |
| **Editar** | ✅ | ❌ | ❌ | ❌ | Solo Admin; se asigna permiso "Diseño" al grupo Admin en estas listas |

---

## 4. Casos que SharePoint no puede garantizar nativamente

| Caso | Limitación SharePoint | Solución propuesta |
|---|---|---|
| **Restricción de Planta a sus propios ítems** | SharePoint no filtra permisos por valor de columna nativamente sin permisos únicos por ítem | Flujo Power Automate: al crear un producto, rompe herencia del ítem y asigna acceso al grupo `SG-Discontinuados-Planta-{PlantaId}` (ver Fase 4) |
| **Restricción a hitos de su etapa** | No existe control de acceso a nivel de fila en una lista con condición de campo | Validación en el flujo de "completar hito": verificar que `ProductoPlanta` coincida con el usuario; rechazar si no. El ítem del hito no tendrá permisos únicos (complejidad de escala) |
| **Auditoría inalterable** | SharePoint permite a Contribuidores editar sus propios comentarios | Lista Actividades con nivel personalizado "Solo agregar" (sin editar ni eliminar); implementado con nivel de permiso custom que quita `EditListItems` y `DeleteListItems` |
| **Control de etapa** (no saltar etapas) | SharePoint no tiene máquina de estados nativa | Columna de validación + flujo Power Automate que valida la transición antes de permitir el cambio de `EtapaActual` |
