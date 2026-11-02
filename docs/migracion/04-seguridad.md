# 04 — Seguridad de datos en SharePoint (Fase 4)

> **Regla de oro.** Ninguna regla de acceso depende del frontend. Todo lo que figura aquí como *control* lo aplica
> SharePoint (o un flujo que corrige de inmediato y deja rastro). Lo que solo ocurre en la interfaz se rotula **UX**.
> Referencias: matriz por rol en [02-roles-y-permisos.md](./02-roles-y-permisos.md), listas en
> [03-modelo-sharepoint.md](./03-modelo-sharepoint.md), flujos en [05-logica-e-integraciones.md](./05-logica-e-integraciones.md).

## 0. Cómo se combinan las capas

| Capa | Qué protege | Mecanismo |
|---|---|---|
| 1. Sitio | Quién entra al sitio y quién lo administra | Sitio dedicado, propietarios mínimos, compartición limitada |
| 2. Lista | Qué lista puede ver/editar cada rol | Herencia rota + niveles de permiso por grupo |
| 3. Ítem | **Que una planta vea solo sus productos** | Permisos únicos por ítem asignados por el flujo F1 |
| 4. Columna | Campos que algunos roles no deben ver | No existe en SharePoint; hoy no hay campos que lo requieran (ver §4) |
| 5. Transición | Que la etapa y los datos derivados no se falsifiquen | Flujos de guarda F2/F3 + versionado |

## 1. Sitio

**Qué sitio.** Un **sitio dedicado** a la app: `https://<tenant>.sharepoint.com/sites/discontinuados-corp`, sin grupo de
Microsoft 365 asociado. ⚠️ SUPUESTO: el dueño de negocio no informó un sitio existente. **No** se reutiliza un sitio de
equipo compartido: los grupos predeterminados *Propietarios/Miembros/Visitantes* de un sitio compartido heredarían acceso a
contenido ajeno, y los flujos necesitan permisos elevados.

**Quién administra.**
- **Propietarios** = `SG-Discontinuados-Owners`: máximo 2–3 personas (IT + 1 de S&OP Global) y la cuenta de servicio de los
  flujos. ⚠️ Los propietarios y cualquiera con *Administrar listas* **ven y editan todo, ignorando las reglas de fila**.
  Por eso los Admin de negocio **no** reciben *Administrar listas*: reciben `Colaborar`.
- Los grupos predeterminados *Miembros* y *Visitantes* del sitio quedan **vacíos**; el acceso a las listas se da solo por
  los grupos `SP-Discontinuados-*`.

**Compartición y usuarios externos.** El inquilino tiene acceso de invitados **habilitado** (respuesta de IT). Varios
fabricantes del catálogo parecen terceros (`Ems`, `Ibsa`, `CSLB Behring`, `Chemo`…; ⚠️ no confirmado), cuyos usuarios serían
**invitados B2B**. Decisión: configurar el sitio en **"Solo invitados existentes"**
(`SharingCapability = ExistingExternalUserSharingOnly`): nadie comparte por enlace ni invita desde el sitio; IT da de alta al
invitado en Entra ID y lo agrega al grupo de su planta. Controles asociados (a cargo de IT): acceso condicional con MFA para
invitados, caducidad de la cuenta y **revisión de acceso trimestral** de los grupos `SG-Discontinuados-Planta-*`.
⚠️ Pendiente de IT: licenciamiento de invitados para ejecutar una Managed App.

**Etiqueta de confidencialidad.** Recomendada: **"Confidencial – Uso interno"** (los diagramas del proyecto ya llevan ese
pie). Aplicar a nivel de sitio con Microsoft Purview. No bloquea la lectura de usuarios autorizados.

**Cuenta de servicio de los flujos.** Cuenta dedicada `svc-discontinuados-flows`, miembro de `SG-Discontinuados-Owners`
(necesita *Administrar permisos* para asignar permisos por ítem), sin buzón de uso humano, con credenciales y MFA/acceso
condicional gestionados por IT. Es el punto de mayor poder del diseño (riesgo R-07).

## 2. Lista (seguridad de tabla)

Todas las listas **rompen la herencia** del sitio al crearse (`provisioning/01-crear-listas.ps1`, solo la primera vez, para
no borrar permisos por ítem en re-ejecuciones). Niveles de permiso:

| Nivel | Base | Qué quita | Para qué |
|---|---|---|---|
| `Leer` (integrado) | — | — | Viewer; catálogos |
| `Colaborar` (integrado) | — | — | Admin (puede borrar; **no** administra la lista) |
| `Contribuir sin eliminar` (personalizado) | `Colaborar` | Eliminar elementos, eliminar versiones | Editor en `Productos`, `Actividades`, `ComparativaHistorica` |
| `Editar sin crear ni eliminar` (personalizado) | `Colaborar` | Agregar elementos, eliminar elementos y versiones | Editor y Planta en `Hitos` (los hitos los crea el flujo) |
| `Control total` (integrado) | — | — | Solo `SP-Discontinuados-Owners` |

Los nombres de los niveles integrados cambian según el idioma del sitio (`Leer`, `Colaborar`…); el script los resuelve por
tipo de rol, no por nombre.

| Lista | Owners | Admin | Editor | Viewer | Plantas |
|---|---|---|---|---|---|
| `Productos` | Control total | Colaborar | Contribuir sin eliminar | Leer | **Ninguno** (solo por ítem) |
| `Hitos` | Control total | Colaborar | Editar sin crear ni eliminar | Leer | **Ninguno** (solo por ítem) |
| `Actividades` | Control total | Colaborar | Contribuir sin eliminar | Leer | Ninguno |
| `ComparativaHistorica` | Control total | Colaborar | Contribuir sin eliminar | Leer | Ninguno |
| `Companias`, `Fabricantes`, `UnidadesNegocio`, `HitosCatalogo` | Control total | Colaborar | Leer | Leer | Leer |

**Catálogos de solo lectura** para todo el que no sea Admin: lo pedido por el diseño y, además, necesario para que nadie
altere `GrupoEntraId` (de ahí salen los permisos de planta). Seguridad de ítems propios (M3): `Actividades` usa *crear y editar
solo ítems propios*.

## 3. Ítem (seguridad por fila): que la planta vea solo lo suyo

### 3.1 Qué se necesita

Respuesta del dueño: **los usuarios de planta ven solo los productos de su planta**. El diseño debe además permitirles
completar los 5 hitos de planta de esos productos. Los demás roles ven todo.

### 3.2 Opciones evaluadas

| Opción | Veredicto | Motivo |
|---|---|---|
| *Leer/editar solo ítems creados por el usuario* (configuración avanzada) | **No sirve** | La regla no es "cada uno ve lo suyo": el creador de un producto es Supply/Mkt, no la planta. Sí se usa en `Actividades` (M3) |
| **Permisos únicos por ítem asignados por flujo** | **Elegida** | La regla depende de un dato del ítem (`Fabricante`), los grupos de planta son 31 y estables, y los ítems activos son pocos (≤ ~500 productos) |
| Partición en listas separadas (una por planta) | Descartada | 31 listas de productos + 31 de hitos; los roles corporativos necesitan la vista global (31 consultas y orden/filtros manuales); el cambio de fabricante obliga a mover ítems. Es la mejor opción solo si el volumen por planta fuera enorme |
| Carpeta por producto con permiso único (los hitos heredan de la carpeta) | Descartada para `Hitos`; **reservada** para `Actividades` | Daría a la planta edición sobre los 16 hitos, no sobre los 5. Para comentarios (si negocio los quiere visibles a la planta) reduce 1 permiso único por producto |

### 3.3 Diseño

- `Productos`: un permiso único por producto → el **grupo de Entra de la planta** (`Fabricantes.GrupoEntraId`) con **`Leer`**.
- `Hitos`: solo para los hitos con `HitosCatalogo.EditablePorPlanta = Sí` (5 por producto) → el mismo grupo con
  **`Editar sin crear ni eliminar`**. Los otros 11 hitos **no** tienen el grupo y, como la planta no tiene permiso de lista,
  **no los ve**. Por eso `Productos` guarda `Progreso`, `EtapaActual` y `UltimoHito` (el tablero de la planta no necesita
  leer los demás hitos).
- Al romper la herencia se **copian** las asignaciones de la lista (`copyRoleAssignments = true`): Admin, Editor, Viewer y
  Owners conservan el acceso; solo se **suma** el grupo de planta.
- Se aplica **sin permiso de lista** para el grupo de planta: SharePoint le concede automáticamente "acceso limitado" y la
  consulta de la lista devuelve únicamente los ítems donde tiene permiso (*security trimming*).
- **Falla cerrada**: un ítem recién creado hereda permisos de la lista (que no incluyen a ninguna planta), de modo que en la
  ventana de segundos hasta que el flujo asigna el permiso **ninguna planta lo ve** (ni siquiera la propia).

### 3.4 Flujo F1 `Producto-Alta` — paso a paso

- **Disparador**: SharePoint *Al crearse un elemento* en `Productos`, con condición de disparo
  `@empty(triggerOutputs()?['body/IdLegado'])` (la carga histórica **no** dispara F1; sus permisos los aplica el
  script de migración o la primera corrida de F4: ver 06).
- **Conexión**: cuenta de servicio (propietaria). Todas las llamadas con *Reintentar: exponencial, 4 veces*.

| # | Acción | Detalle |
|---|---|---|
| 1 | Obtener el fabricante | `Get item` en `Fabricantes` por `Fabricante/Id`; leer `GrupoEntraId`. Si está vacío: se ejecutan igualmente los pasos 2 a 5 y se salta al 12 con el error "Fabricante sin grupo" |
| 2 | Asignar el código | `Update item` en `Productos`: `CodigoCU = concat('CU-', string(add(100000, ID)))` |
| 3 | Leer el catálogo | `Get items` en `HitosCatalogo` con `$filter=Activa eq 1`, `$orderby=Orden` (16 filas) |
| 4 | Crear los 16 hitos | `Apply to each` (concurrencia 5): `Create item` en `Hitos` con `Title`, `Producto`, `ClaveHito`, `Etapa`, `Orden`, `Responsable = ResponsableDefault`, `Completado = No` (reemplaza `makeHitos()`, `db.js:79-95`) |
| 5 | Registrar actividades | `Create item` en `Actividades`: *"Producto ingresado al proceso de discontinuados"* (`Tipo = Sistema`) y, si hay `Observaciones`, *"Observación: …"* (`Tipo = Observación`) (reemplaza `NuevoProducto.jsx:46-51`) |
| 6 | Resolver al grupo en el sitio | `Send an HTTP request to SharePoint`: `POST _api/web/ensureuser` con `{"logonName":"c:0t.c\|tenant\|<GrupoEntraId>"}` → guardar `Id` como `principalId` |
| 7 | Resolver niveles | `GET _api/web/roledefinitions?$filter=RoleTypeKind eq 2` (Lector) y `GET _api/web/roledefinitions/getbyname('Editar sin crear ni eliminar')` → `roleReader`, `roleEdit` |
| 8 | Romper herencia del producto | `POST _api/web/lists/getbytitle('Productos')/items(<ID>)/breakroleinheritance(copyRoleAssignments=true,clearSubscopes=true)` |
| 9 | Dar `Leer` al grupo en el producto | `POST …/items(<ID>)/roleassignments/addroleassignment(principalid=<principalId>,roledefid=<roleReader>)` |
| 10 | Repetir 8 y 9 para los hitos de planta | Para cada hito creado cuyo `ClaveHito` tenga `EditablePorPlanta = Sí` en el catálogo (5): `breakroleinheritance` + `addroleassignment(... roledefid=<roleEdit>)` |
| 11 | Marcar | `Update item` en `Productos`: `PermisosAplicados = Sí`, `FabricantePermisoId = <Id del fabricante>`, `EtapaValidada = 0` |
| 12 | Manejo de error | Una rama *Configurar ejecución posterior → ha fallado* escribe una actividad *"No se pudieron asignar los permisos de planta"* y envía un correo a `SG-Discontinuados-Owners`. **`PermisosAplicados` queda en No**, y F4 reintenta esa misma noche |

Notas de implementación:
- Los pasos 6–10 usan la acción estándar *Enviar una solicitud HTTP a SharePoint* (REST) porque permite elegir
  `copyRoleAssignments` y asignar el grupo por su identificador. ⚠️ No se verificó si las acciones nativas de compartir
  cubren este caso; confirmarlo en el tenant antes de implementar.
- Por producto: 1 + 5 = **6 permisos únicos**. Una importación de 100 productos genera ≈ 100 × (16 + 6 + 2) ≈ 2.400
  operaciones; con concurrencia limitada cabe dentro del *throttling* (ver 06).

### 3.5 Flujo F3 `Producto-Modificado` — mantener los permisos al día

Disparador: *Al modificarse un elemento* en `Productos`, con condición `Modificado por ≠ cuenta de servicio` (evita bucles).

| Caso | Detección | Acción |
|---|---|---|
| Se cambió el `Fabricante` (`EditarProducto.jsx:52-65` lo permite) | `Fabricante/Id ≠ FabricantePermisoId` | Quitar el grupo anterior (`removeroleassignment`) del producto y de sus 5 hitos de planta; agregar el nuevo; actualizar `FabricantePermisoId` |
| El producto se confirmó (`ProcesoConfirmado = Sí`) | cambio del campo | **Retirar los 5 permisos únicos de `Hitos`** (`resetroleinheritance`): la planta conserva `Leer` sobre el producto pero deja de editar. Reduce permisos únicos de 6 a 1 por producto cerrado |
| Salto de etapa | `EtapaActual ≠ EtapaValidada` | Ver §5 |

### 3.6 Flujo F4 `Permisos-Reconciliacion` — red de seguridad diaria

Programado, 02:00, cuenta de servicio.
1. Productos con `PermisosAplicados = No` → repite F1 desde el paso 6 (idempotente: `addroleassignment` sobre un permiso
   ya existente no falla).
2. Para productos activos (`ProcesoConfirmado = No`): lee `roleassignments` del ítem y verifica que contenga al grupo de la
   planta y a los grupos de lista (Admin, Editor, Viewer, Owners). Si falta alguno, lo agrega. Esto cubre el caso crítico
   siguiente.
3. Cuenta los ítems con permisos únicos; **alerta si superan 3.500** (70 % del máximo recomendado).
4. Resumen por correo a los propietarios si hubo reparaciones.

> **Trampa conocida.** Un cambio de permisos a nivel **lista** (por ejemplo, sumar un grupo nuevo de gerencia) **no se propaga**
> a los ítems con permisos únicos: esos ítems conservan la copia de cuando se rompió la herencia. Tras tocar los permisos de
> `Productos` o `Hitos` hay que ejecutar F4 a mano (riesgo R-06).

### 3.7 Presupuesto de permisos únicos

| Productos activos | Permisos únicos (6 por producto) | % del máximo recomendado (5.000) |
|---:|---:|---:|
| 224 (hoy) | 1.344 | 27 % |
| 500 (proyección del ciclo) | 3.000 | 60 % |
| 833 | 5.000 | 100 % → **re-evaluar (Dataverse)** |

Los productos confirmados bajan a 1 permiso único (§3.5), por lo que el techo se aplica a los **activos simultáneos**.

## 4. Seguridad por columna

SharePoint **no** la tiene. Se revisó cada columna del modelo:

| Columna | ¿Debe ocultarse a algún rol? | Decisión |
|---|---|---|
| `Hitos.CostoItem`, `Hitos.CostoInventario` (costos de destrucción de PT, materiales y API) | ⚠️ SUPUESTO: no. El dueño dejó vacío el campo "datos sensibles conocidos"; hoy los ve cualquier usuario en el tablero (`DashboardView.jsx:141`) | Visibles para todos los roles corporativos; cada planta solo ve los suyos (§3). **Si el negocio decide restringirlos** (p. ej. solo Admin y Finanzas): mover las dos columnas a una lista 1:1 `HitosCostos` relacionada por `Producto`, con permisos propios; el tablero consultaría esa lista y mostraría "—" si recibe 403 |
| `Productos.Observaciones`, `Actividades.Texto` | No identificados datos personales ni de salud | Sin restricción; ver §6 |
| `Fabricantes.GrupoEntraId` | Sí, no debe poder alterarse | Catálogo de solo lectura salvo Admin/Owners (§2) |
| Columnas técnicas de `Productos` (`PermisosAplicados`, `FabricantePermisoId`, `EtapaValidada`) | No son secretas, pero solo deben escribirlas los flujos | **No se pueden proteger**: F3 corrige y R-03 lo documenta |

## 5. Transiciones de estado y edición condicionada

SharePoint no puede decir "este usuario no puede cambiar este campo" ni comparar el valor anterior. Cada regla del código
actual queda cubierta así:

| Regla (origen) | Cómo se protege ahora | Tipo |
|---|---|---|
| Avanzar etapa solo si se cumplió la regla: etapa 0 → algún hito hecho; etapa 1 → todos salvo *Análisis de impacto planta* (`ProductDetail.jsx:89-99`) | **F3**: si `EtapaActual ≠ EtapaValidada`, valida que sea `EtapaValidada + 1` y recalcula la regla leyendo los hitos de esa etapa. Si es válida: `EtapaValidada = EtapaActual` y actividad *"Avance de etapa: A → B"* (`AppContext.jsx:181-184`). Si no: **revierte** `EtapaActual`, escribe actividad *"Cambio de etapa rechazado"* y notifica | Correctivo (el valor inválido existe unos segundos y queda en versiones) |
| Avance automático 0→1 al completar *Aviso a Supply Corp y S&OP Global* (`AppContext.jsx:86-106`) | **F2** (lo escribe la cuenta de servicio) | Automatismo |
| `ProcesoConfirmado` = todos los hitos de la etapa 2 hechos (`AppContext.jsx:107-128`) | **F2** lo recalcula en cada cambio de hito; F3 lo restituye si alguien lo toca | Correctivo |
| `Progreso`, `UltimoHito`, `FechaUltimoHito`, `FechaReal` (`AppContext.jsx:75-81`) | **F2/F3** los recalculan; el valor tipeado se pisa | Correctivo |
| Los hitos no se crean ni se eliminan a mano | Niveles de permiso que quitan *Agregar* y *Eliminar* (M1) | **Preventivo** |
| Columnas estructurales del hito (`Producto`, `ClaveHito`, `Etapa`, `Orden`, `Title`) | **F2** las restituye desde `HitosCatalogo` | Correctivo |
| `CodigoCU` inmutable | Índice único (impide duplicados) + F3 lo restituye a `CU-` + (100000 + ID) | Preventivo parcial + correctivo |
| Solo Admin borra datos de prueba | `Eliminar` solo en el nivel `Colaborar` (Admin) y Owners | **Preventivo** |
| `EsPrueba` marca lo borrable en masa | Editar `EsPrueba` está permitido a Editor (misma fila): riesgo R-05 | Procedimental: antes de borrar, Admin revisa el listado filtrado y la versión muestra quién lo marcó |

**Por qué un flujo y no una lista de aprobaciones.** Como el dueño decidió que **no hay aprobador de etapa**, no se crea una
lista de aprobaciones escrita solo por el flujo. Si el negocio la pide después, `EtapaValidada` ya deja el hueco (el cambio
sería un paso de aprobación en F3).

## 6. Datos sensibles y cumplimiento

| Tema | Estado | Detalle |
|---|---|---|
| **21 CFR Part 11 / GxP** | **No aplica** (respuesta del dueño) | No se requiere firma electrónica ni registros inalterables. Aun así: versionado activado (50 versiones en `Productos`/`Hitos`, 10 en `Actividades`) y auditoría automática de *Creado/Modificado por* |
| **Retención** | **Sin política definida** (respuesta del dueño: "No") | No se configura etiqueta de retención ni borrado automático. Los datos permanecen hasta que un Admin los borre. ⚠️ Si el negocio fija un plazo, se agrega una etiqueta de retención de Purview sobre el sitio |
| **Datos personales / de salud** | No se identificaron | La app guarda nombres de productos, compañías y costos. Los únicos datos personales son las identidades de los usuarios en `Creado por`/`Modificado por`. ⚠️ SUPUESTO: `Observaciones` y comentarios no contienen datos de pacientes |
| **Auditoría** | Historial de versiones por ítem + registro de auditoría unificado de Microsoft Purview (retención según la licencia del tenant; ⚠️ dato de IT) | Reemplaza el autor fijo del código (S-07) |
| **Exportación** | Un usuario con acceso de lectura puede exportar a Excel desde SharePoint o la app | No se puede impedir; se mitiga con la etiqueta de confidencialidad, directivas DLP (opcional) y auditoría |
| **Invitados externos** | Habilitados en el inquilino; sitio en "solo invitados existentes" | MFA y revisión trimestral de acceso (§1) |

## 7. Riesgos residuales

| Id | Riesgo | Probabilidad / impacto | Mitigación | ¿Queda abierto? |
|---|---|---|---|---|
| R-01 | Ventana de segundos entre crear un producto y asignar el permiso a la planta | Alta / Bajo | Falla cerrada: nadie de planta lo ve hasta que el flujo termina | No |
| R-02 | F1 falla a mitad (quedan hitos sin crear o sin permisos) | Media / Medio | Rama de error, `PermisosAplicados = No`, reintento y reparación en F4, correo a Owners | Sí, requiere monitoreo de ejecuciones |
| R-03 | Un Editor/Admin escribe directo `EtapaActual`, `ProcesoConfirmado`, `Progreso` o columnas técnicas (por API o Excel) | Baja / Medio | F2/F3 revierten y dejan actividad; versiones muestran quién | Sí: es correctivo, no preventivo |
| R-04 | Planta o Editor altera columnas estructurales de un hito | Baja / Bajo | F2 las restituye | Sí, ídem |
| R-05 | Un Editor marca `EsPrueba = Sí` en un producto real y el Admin lo borra en masa | Baja / **Alto** | Solo Admin borra; revisión del listado antes de borrar; borrado en cascada irreversible ⇒ **exportar antes**. Alternativa: que solo Admin pueda marcar (requiere lista aparte) | Sí |
| R-06 | Cambios de permisos de lista no llegan a ítems con permisos únicos | Media / Medio | Ejecutar F4 tras cada cambio de permisos de lista; documentado como procedimiento | Sí |
| R-07 | Compromiso de la cuenta de servicio (acceso total) | Baja / **Alto** | Cuenta dedicada, MFA/acceso condicional, sin uso interactivo, credenciales rotadas, revisión trimestral | Sí |
| R-08 | Exfiltración por lectores autorizados | Media / Medio | Etiqueta, DLP opcional, auditoría Purview | Sí (no se puede impedir) |
| R-09 | Invitados externos: ciclo de vida de cuentas y MFA fuera del control de la app | Media / Medio | Acceso condicional, caducidad, revisión de acceso trimestral | Sí |
| R-10 | Superar 5.000 permisos únicos | Baja a 500 productos | Alerta a 3.500 (F4); retiro de permisos de hitos al confirmar; plan B Dataverse | Vigilar |
| R-11 | Límite de consultas sobre `Hitos` (> 5.000) | Media / Medio | Toda consulta filtra por columna indexada o pagina por `ID` (ver 03 §7) | Sí, depende del frontend |
| R-12 | Sin política de retención | — / Medio | Pendiente del negocio | Sí |
| R-13 | Plantas sin acceso a `Actividades` (decisión funcional) | — / Bajo | Opción de carpeta por producto si se necesita | Pregunta abierta |

## 8. Operación: alta y baja de usuarios

1. **Alta** → IT agrega la persona (o el invitado B2B) al grupo de Entra que corresponde. **Nunca** a un grupo de SharePoint.
2. **Planta nueva** → agregar una fila a `Fabricantes`, correr `00-crear-grupos-entra.ps1` y `01-crear-listas.ps1 -SeedCatalogs`
   (completa `GrupoEntraId`); luego F4 asigna lo que falte.
3. **Baja** → quitar del grupo de Entra. La revocación no es instantánea (las sesiones y la caché de pertenencia pueden
   demorar desde minutos hasta alrededor de una hora; ⚠️ valor aproximado, confirmar con IT).
4. **Revisión** → trimestral para grupos con invitados; semestral para Admin/Owners.
