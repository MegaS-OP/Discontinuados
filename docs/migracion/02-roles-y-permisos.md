# 02 — Roles y matriz de permisos (Fase 2)

> **Principio rector.** La app corre con la identidad del usuario: cualquiera puede abrir las listas desde SharePoint,
> Excel, Power Automate o Graph con **exactamente** sus mismos permisos. Por eso cada celda de la matriz indica el
> **mecanismo de SharePoint** que la garantiza (detalle en [04-seguridad.md](./04-seguridad.md)). Ocultar un botón es
> *UX*, no control, y se rotula así.

## 1. Roles de negocio

Hoy existen tres roles en el código (`Admin`, `Editor`, `Viewer`; `src/data/users.js:49-53`), pero **solo `Admin` se
aplica** y únicamente en el navegador (`src/pages/Configuracion.jsx:18`; ver S-03 en 01-relevamiento.md). El modelo nuevo
mantiene esos tres nombres para no cambiar el lenguaje del equipo, hace que **sí se cumplan**, y agrega el rol que
surge de la respuesta del dueño de negocio ("los usuarios de planta ven solo lo de su planta").

| Rol | Quién lo cumple | Qué puede hacer | Origen |
|---|---|---|---|
| **Admin** | Equipo S&OP Global | Todo lo del Editor, más: administrar catálogos, borrar productos (datos de prueba) y gestionar la pertenencia a grupos junto con IT | `Configuracion.jsx:195` |
| **Editor** | Supply Corp, Mkt Corp, Finanzas, Compliance, AARR, Mkt Local & Cía | Crear e importar productos, editar cabecera, completar hitos y sus datos, comentar y avanzar etapas. **No borra** | `Configuracion.jsx:196` |
| **Viewer** | Gerencias, auditoría interna | Ver el tablero, el detalle, la comparativa y exportar. **No escribe** | `Configuracion.jsx:197` |
| **Planta** (nuevo) | Usuarios de cada fabricante; **uno por planta** (`SG-Discontinuados-Planta-<Fabricante>`) | Ver **solo los productos de su fabricante** y completar **sus 5 hitos de planta** (impacto, 3 costos y cola de producción) | Respuesta del dueño; `db.js:63-67` |
| **Propietarios** (técnico) | IT + un responsable de S&OP Global (máximo 2–3 personas) y la cuenta de servicio de los flujos | Administrar el sitio y las listas; **ven y editan todo, ignorando las reglas de fila** | Plataforma |

**Decisiones y supuestos.**
- ⚠️ **No hay roles por área** (Supply vs. Mkt vs. Finanzas): en el código cualquier Editor puede completar cualquier hito, y
  mapear `Responsable` a usuarios reales quedó en backlog por decisión del dueño. El diseño no lo impide a futuro: bastaría
  un grupo por área y permisos únicos por hito.
- ⚠️ SUPUESTO: la planta **no crea** productos. El formulario tiene el campo *¿Se levantó desde la planta?*, pero la planta
  hoy no tiene usuarios. Si la planta debe crear, hay que sumar una lista de solicitudes (ver pregunta abierta en el README).
- ⚠️ SUPUESTO: la planta **no ve ni escribe `Actividades`** (comentarios internos de otras áreas). Si debe hacerlo, se resuelve
  con una carpeta por producto con permiso único (ver 04-seguridad.md, §5).
- **Aprobador de avance de etapa**: no existe un cargo específico (respuesta del dueño: "los usuarios"). Avanzar etapa lo hace
  cualquier Editor/Admin que cumpla la regla de `ProductDetail.jsx:89-99`. No se crea flujo de aprobación.

## 2. Grupos de seguridad

Convención `SG-Discontinuados-<Rol>`. Los grupos de **Entra ID** son la fuente de verdad (los administra IT / el dueño de
negocio). Cada uno se agrega a un **grupo de SharePoint** (`SP-Discontinuados-<Rol>`) que es el que recibe los permisos de
lista, para poder cambiar la estructura sin tocar a las personas. Los grupos de planta, en cambio, se otorgan **directamente**
por ítem (los asigna el flujo F1; ver 04-seguridad.md).

| Grupo Entra ID | Grupo SharePoint | Rol | Miembros esperados |
|---|---|---|---|
| `SG-Discontinuados-Owners` | `SP-Discontinuados-Owners` (+ propietarios del sitio) | Propietarios | 2–3 + cuenta de servicio |
| `SG-Discontinuados-Admin` | `SP-Discontinuados-Admin` | Admin | Equipo S&OP Global |
| `SG-Discontinuados-Editor` | `SP-Discontinuados-Editor` | Editor | Áreas operativas |
| `SG-Discontinuados-Viewer` | `SP-Discontinuados-Viewer` | Viewer | Gerencias, auditoría |
| `SG-Discontinuados-Planta-<Fabricante>` × 31 | `SP-Discontinuados-Plantas` (contiene a los 31, solo para leer catálogos) | Planta | Usuarios de cada fabricante |

Total: **35 grupos de Entra ID** (4 corporativos + 31 de planta), listados en `sharepoint-schema.json` → `groups`. Los
nombres de planta se normalizan a ASCII (`Andrómaco` → `SG-Discontinuados-Planta-Andromaco`; `CSLB Behring` →
`SG-Discontinuados-Planta-CSLB-Behring`). Se crean con `provisioning/00-crear-grupos-entra.ps1`.

**Reglas operativas.**
- Los grupos anidados **no** se expanden en los permisos de SharePoint: la pertenencia debe ser **directa** en cada grupo.
- Un usuario puede estar en varios grupos de planta (verá varios fabricantes) y en un grupo corporativo; el permiso es la
  suma. Un usuario de planta **no** debe estar en Editor/Admin/Viewer (vería todo).
- Muchos fabricantes del catálogo son plantas propias (`Arg-Mlb`, `Col-Mlb`…); otros parecen terceros (`Ems`, `Ibsa`,
  `CSLB Behring`). ⚠️ El código no lo distingue: columna `Fabricantes.Externo`, pregunta abierta para el negocio. Los terceros
  serán **invitados (guest)** de Entra ID; ver 04-seguridad.md §1.

## 3. Mecanismos de SharePoint usados

| Código | Mecanismo | Garantía |
|---|---|---|
| **M1** | Permiso a nivel de lista por grupo, con niveles `Leer`, `Colaborar` (incluye borrar), `Contribuir sin eliminar` y `Editar sin crear ni eliminar` (personalizados) | Fuerte: lo aplica SharePoint en cada llamada |
| **M2** | Permisos únicos por ítem asignados por el flujo F1/F3 | Fuerte una vez asignado; **eventual** (segundos) y no atómico. Falla cerrada: sin permiso = sin acceso |
| **M3** | Configuración avanzada *crear y editar solo ítems propios* (`WriteSecurity = Own`) | Fuerte |
| **M4** | Flujo de guarda (F2/F3): detecta y revierte cambios inválidos | **Correctivo**, no preventivo: el cambio existe unos segundos y queda en el historial de versiones |
| **M5** | Búsqueda indexada con *Restringir eliminación* o *Cascada* | Fuerte |
| **M6** | Índice con valores únicos | Fuerte |
| UX | Ocultar/deshabilitar en el frontend | **No es control** |

Leyenda de la matriz: ✘ no permitido, y SharePoint lo bloquea · ✅ permitido y garantizado por SharePoint · 🟡 garantizado con una salvedad indicada · 🔴 **no se puede garantizar
solo con SharePoint** (se indica la alternativa).

## 4. Matriz CRUD por rol y lista

### `Productos`

| Rol | Crear | Leer | Editar | Eliminar | Mecanismo |
|---|:-:|---|---|:-:|---|
| Propietarios | ✅ | Todos | Todos | ✅ | M1 Control total |
| Admin | ✅ | Todos | Todos | ✅ | M1 `Colaborar` |
| Editor | ✅ | Todos | Todos (cabecera, etapa) 🔴 | ✘ | M1 `Contribuir sin eliminar`; M4 (F3) |
| Viewer | ✘ | Todos | ✘ | ✘ | M1 `Leer` |
| Planta | ✘ | **Solo su fabricante** ✅ | ✘ | ✘ | M2 (permiso `Leer` por ítem; sin permiso de lista) |

🔴 *Editor edita todo*: SharePoint no puede impedir que un Editor escriba `EtapaActual` o `Fabricante` directamente (no hay
seguridad por columna). Alternativa adoptada: **F3 valida y revierte** transiciones de etapa inválidas y reasigna permisos
si cambia el fabricante; queda en versiones. Riesgo residual R-03 (04-seguridad.md).

### `Hitos`

| Rol | Crear | Leer | Editar | Eliminar | Mecanismo |
|---|:-:|---|---|:-:|---|
| Propietarios / Admin | ✅ | Todos | Todos | ✅ | M1 |
| Editor | ✘ | Todos | Todos 🔴 | ✘ | M1 `Editar sin crear ni eliminar`; M4 (F2) |
| Viewer | ✘ | Todos | ✘ | ✘ | M1 `Leer` |
| Planta | ✘ | **Solo los 5 hitos de planta de sus productos** ✅ | Esos 5 🔴 | ✘ | M2 (`Editar sin crear ni eliminar` por ítem); M4 (F2) |

🔴 *Edición de columnas estructurales*: quien puede editar un hito puede cambiar `Producto`, `ClaveHito`, `Etapa`, `Orden` o
`Responsable`. F2 restituye `Producto`, `ClaveHito`, `Etapa`, `Orden` y `Title` desde `HitosCatalogo` en cada modificación.
Los 11 hitos que **no** son de planta son invisibles para la planta (ver 04-seguridad.md §3): por eso `Productos` guarda
`Progreso`, `EtapaActual` y `UltimoHito`.

### `Actividades`

| Rol | Crear | Leer | Editar | Eliminar | Mecanismo |
|---|:-:|---|---|:-:|---|
| Propietarios | ✅ | Todas | Todas | ✅ | M1 Control total |
| Admin | ✅ | Todas | Solo propias 🟡 | Solo propias 🟡 | M1 `Colaborar` + M3 |
| Editor | ✅ | Todas | Solo propias ✅ | ✘ | M1 `Contribuir sin eliminar` + M3 |
| Viewer | ✘ | Todas | ✘ | ✘ | M1 `Leer` |
| Planta | ✘ | ✘ | ✘ | ✘ | Sin permiso en la lista (v1) |

🟡 M3 también limita al Admin a sus propias actividades. El borrado de los comentarios de un producto de prueba se hace
por **cascada** al borrar el producto (M5), no uno por uno. Quien edite una actividad propia queda en el historial de
versiones (10 versiones).

### `ComparativaHistorica`

| Rol | Crear | Leer | Editar | Eliminar | Mecanismo |
|---|:-:|---|---|:-:|---|
| Propietarios / Admin | ✅ | Todas | Todas | ✅ | M1 |
| Editor | ✅ | Todas | Todas | ✘ | M1 `Contribuir sin eliminar` |
| Viewer | ✘ | Todas | ✘ | ✘ | M1 `Leer` |
| Planta | ✘ | ✘ | ✘ | ✘ | Sin permiso |

Hoy cualquier usuario edita su copia local; ahora los valores son **compartidos**: un Editor modifica el número de todos
(riesgo aceptado, queda versionado).

### Catálogos: `Companias`, `Fabricantes`, `UnidadesNegocio`, `HitosCatalogo`

| Rol | Crear | Leer | Editar | Eliminar | Mecanismo |
|---|:-:|---|---|:-:|---|
| Propietarios | ✅ | Todos | Todos | ✅ | M1 Control total |
| Admin | ✅ | Todos | Todos | ✅ (si no hay productos) | M1 `Colaborar` + M5 restringe |
| Editor | ✘ | Todos | ✘ | ✘ | M1 `Leer` |
| Viewer | ✘ | Todos | ✘ | ✘ | M1 `Leer` |
| Planta | ✘ | Todos | ✘ | ✘ | M1 `Leer` vía `SP-Discontinuados-Plantas` |

Los catálogos no contienen datos sensibles (nombres de compañías, plantas y BU). Las plantas necesitan leerlos para que
se resuelvan las columnas de búsqueda.

## 5. Qué cambia respecto del comportamiento actual

| Hoy (navegador) | Después (SharePoint) |
|---|---|
| Un Viewer edita todo; solo Admin tiene un guard visual (S-03) | Un Viewer **no puede** escribir ni por la app ni por la API |
| Cualquiera se asigna Admin por `localStorage` (S-02) | El rol sale de la pertenencia a un grupo de Entra ID; se cambia solo en Entra |
| Un Editor puede borrar todo (no hay guard) | Un Editor **no puede** borrar productos, hitos ni actividades |
| Todos ven todos los productos | Un usuario de planta ve únicamente los de su fabricante |
| Autor de comentarios fijo (S-07) | Autor = usuario autenticado (`Creado por`) |
| Datos de *Comparativa* por navegador (Q-03) | Datos compartidos y versionados |

## 6. Cómo sabe el frontend qué mostrar (solo UX)

La app no "decide" permisos: **intenta** y SharePoint responde. Para no mostrar botones inútiles, el frontend consulta los
permisos efectivos del usuario sobre las listas (detalle en 05-logica-e-integraciones.md §4) y deriva el rol que muestra
en la interfaz. Si esa consulta se manipulara, el único efecto sería ver un botón que, al usarse, devuelve 403.
