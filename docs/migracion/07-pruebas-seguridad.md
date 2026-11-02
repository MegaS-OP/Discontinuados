# 07 — Plan de pruebas de seguridad (Fase 8)

> **Cómo leer este plan.** Cada caso se ejecuta con **cuentas reales de prueba del tenant** y, salvo que se indique lo contrario,
> **por fuera de la app**: lista abierta en SharePoint, exportación a Excel, `Connect-PnPOnline`/Graph/REST. Si un control solo
> funciona por la interfaz de la app, no es un control. Un caso **pasa** solo si el resultado coincide con la columna
> "Esperado"; cualquier desvío se registra en §9 y bloquea el pase a producción si afecta a un caso marcado **(Crítico)**.

## 1. Preparación

**Cuentas** (una persona por cuenta; sin compartir contraseñas):

| Cuenta | Pertenece a | Uso |
|---|---|---|
| `t.owner` | `SG-Discontinuados-Owners` | Referencia de acceso total |
| `t.admin` | `SG-Discontinuados-Admin` | Rol Admin |
| `t.editor` | `SG-Discontinuados-Editor` | Rol Editor |
| `t.viewer` | `SG-Discontinuados-Viewer` | Rol Viewer |
| `t.plantaA` | `SG-Discontinuados-Planta-Ems` | Planta A |
| `t.plantaB` | `SG-Discontinuados-Planta-Ibsa` | Planta B |
| `t.plantaAB` | Ambos grupos de planta | Suma de permisos |
| `t.guestA` | Invitado B2B en `SG-Discontinuados-Planta-Ems` | Planta externa |
| `t.nadie` | Ningún grupo de Discontinuados | Control negativo |

**Datos**: 3 productos de prueba de `Ems` (A1, A2, A3), 2 de `Ibsa` (B1, B2) y 1 de `Chemo` (C1) cuyo `GrupoEntraId` se deja **vacío a propósito**, todos
con `EsPrueba = Sí`, creados por `t.editor` para que pasen por F1. Anotar sus `ID`.

**Herramientas**: navegador (lista nativa de SharePoint), Excel (*Exportar a Excel*), PnP PowerShell
(`Connect-PnPOnline -Url <sitio> -Interactive -ClientId <id>`; `Get-PnPListItem -List Productos`) y una llamada REST con el token de
la cuenta (`GET <sitio>/_api/web/lists/getbytitle('Productos')/items?$select=ID,Title`).

## 2. Acceso por fuera de la app (todos los roles) — **(Crítico)**

| Id | Cuenta | Acción | Esperado |
|---|---|---|---|
| X-1 | cada una | Abrir `<sitio>/Lists/Productos` en el navegador | Owners/Admin/Editor/Viewer ven los ítems; `t.plantaA` solo A1–A3; `t.nadie`: "Acceso denegado" |
| X-2 | cada una | *Exportar a Excel* de `Productos` y de `Hitos` | El archivo contiene **solo** lo que la cuenta puede leer (planta A: 3 productos y 15 hitos) |
| X-3 | cada una | Abrir la lista en *Power Automate* o *Power Apps* con su cuenta y listar ítems | Mismo conjunto que X-1 |
| X-4 | `t.plantaA` | REST: `GET …/items?$select=ID,Title` en `Productos` | 200 con solo A1–A3 |
| X-5 | `t.plantaA` | REST: `GET …/items(<ID de B1>)` | 403 o 404, **nunca** el ítem |
| X-6 | `t.plantaA` | Buscar el nombre de B1 con la búsqueda de SharePoint / Microsoft Search | Sin resultados (la búsqueda respeta permisos) |

## 3. Admin (`t.admin`)

| Id | Acción | Esperado |
|---|---|---|
| A-1 | Crear un producto desde la app | Se crea; en ≤ 2 min tiene `CodigoCU`, 16 hitos y 1 actividad inicial (2 si se cargó Observaciones) (F1) |
| A-2 | Borrar un producto de prueba por la lista nativa | Se borra; **sus hitos y actividades desaparecen** (cascada) |
| A-3 | Editar una fila de `Fabricantes` o `HitosCatalogo` | Permitido |
| A-4 | Borrar un fabricante que tiene productos | **Rechazado** (restricción de relación) |
| A-5 | Editar una actividad creada por otra persona | **Rechazado** (solo ítems propios) |
| A-6 | Abrir *Configuración de la lista → Permisos* de `Productos` | No puede cambiar permisos (no tiene *Administrar listas*) |

## 4. Editor (`t.editor`)

| Id | Acción | Esperado |
|---|---|---|
| E-1 | Crear producto; importar 3 productos desde Excel | Permitido |
| E-2 | Marcar un hito `Completado` | `FechaReal` = hoy y `Progreso` actualizado en ≤ 1 min (F2) |
| E-3 | **Borrar** un producto, un hito o una actividad | **403** en los tres casos **(Crítico)** |
| E-4 | **Crear** un ítem en `Hitos` por la lista nativa | **403** |
| E-5 | Editar un ítem de `Companias`, `Fabricantes`, `UnidadesNegocio` o `HitosCatalogo` | **403** |
| E-6 | Poner `EtapaActual = 2` en un producto en etapa 0 (por la lista nativa) | En ≤ 1 min F3 **revierte** a 0 y registra *"Cambio de etapa rechazado"* **(Crítico)** |
| E-7 | Con la regla cumplida (hito de etapa 0 completado), subir `EtapaActual` de 0 a 1 | Se acepta; `EtapaValidada = 1` y actividad *"Avance de etapa: Detección → Análisis"* |
| E-8 | Cambiar `ClaveHito`, `Etapa` o `Producto` de un hito | F2 los restituye en ≤ 1 min |
| E-9 | Cambiar `CodigoCU` a un valor existente / a otro | Existente: **rechazado** (único). Otro: F3 lo restituye |
| E-10 | Poner `Progreso = 100` a mano | F2/F3 lo recalculan |
| E-11 | Editar una actividad propia / ajena; borrar una propia | Propia: permitido. Ajena: rechazado. Borrar: **403** |
| E-12 | Cambiar el `Fabricante` de A1 a `Ibsa` | Ver P-8 |
| E-13 | Crear producto con compañía/fabricante/BU vacíos (por la lista nativa o por REST) | **Rechazado** (obligatorios) |
| E-14 | Editar `FechaUltimoHito` a una fecha anterior a `FechaInicio` | **Rechazado** (validación de lista) |
| E-15 | Marcar `EsPrueba = Sí` en un producto real | Permitido (riesgo R-05): queda en versiones; verificar que el historial muestra a `t.editor` |

## 5. Viewer (`t.viewer`)

| Id | Acción | Esperado |
|---|---|---|
| V-1 | Leer `Productos`, `Hitos`, `Actividades`, `ComparativaHistorica` y catálogos | Permitido |
| V-2 | Crear, editar o borrar en **cualquier** lista, por la lista nativa, por Excel (*Exportar → editar → publicar*) y por REST | **403 / solo lectura** en todos **(Crítico)** (hoy un Viewer edita todo: S-03) |
| V-3 | Exportar a Excel | Permitido (se documenta: no es prevenible, R-08) |

## 6. Planta (`t.plantaA`, `t.plantaB`, `t.plantaAB`, `t.guestA`)

| Id | Cuenta | Acción | Esperado |
|---|---|---|---|
| **P-1** (T-P1) | `t.plantaA` | Abrir la app | Ve **exactamente** A1–A3; el tablero cuenta 3 productos **(Crítico)** |
| **P-2** (T-P2) | `t.plantaA` | REST `GET …/Productos/items` y `GET …/items(<ID de B1>)` | Lista: solo A. B1: 403/404 **(Crítico)** |
| **P-3** (T-P3) | `t.plantaA` | Abrir la lista `Productos` desde SharePoint (vista nativa y `…/AllItems.aspx`) | Solo A1–A3 o acceso denegado; **nunca** B1/B2/C1. Registrar cuál de los dos ocurre |
| **P-4** (T-P4) | `t.plantaA` | Leer `Hitos`; editar `CostoInventario` en *Costo destrucción PT* de A1; editar *Confirmación con Mkt Corp* de A1 | Ve **solo 5** hitos por producto (los de planta); la edición de costo se guarda; el hito no-planta no es visible / **403** **(Crítico)** |
| **P-5** (T-P5) | `t.plantaA` | Cambiar `Fabricante` de A1 a `Ibsa`; crear un producto; crear/borrar un hito; borrar A1 | **403** en todos **(Crítico)** |
| **P-6** (T-P6) | `t.plantaA` | Leer `Actividades` y `ComparativaHistorica`; leer y editar un catálogo; cambiar `GrupoEntraId` | Actividades y Comparativa: sin acceso. Catálogos: lectura sí, edición **403** **(Crítico)** |
| **P-7** (T-P7) | `t.plantaB` + `t.editor` | `t.editor` crea un producto de `Ibsa`; **inmediatamente** `t.plantaB` y `t.plantaA` consultan; repetir a los 2 min | A los 0 s: ninguna planta lo ve. A los ≤ 2 min: `t.plantaB` sí, `t.plantaA` **nunca** (falla cerrada, R-01) **(Crítico)** |
| P-8 | `t.plantaA`, `t.plantaB` | `t.editor` cambia el fabricante de A1 a `Ibsa` | En pocos minutos (F3): `t.plantaA` pierde A1 y sus hitos; `t.plantaB` los gana. `FabricantePermisoId` se actualiza |
| P-9 | `t.plantaA` | Confirmar A2 (`ProcesoConfirmado = Sí`) | `t.plantaA` sigue **leyendo** A2 pero ya **no edita** sus hitos (F3 retiró esos permisos) |
| P-10 | `t.plantaAB` | Abrir la app | Ve A1–A3, B1, B2 (suma de permisos) |
| P-11 | `t.guestA` | Repetir P-1 a P-6 | Mismos resultados que `t.plantaA`; además no puede compartir el sitio ni abrir otros sitios del inquilino **(Crítico)** |
| P-12 | `t.nadie` | Abrir la app y el sitio | Sin acceso; la app muestra el mensaje de sin permiso, **no** un error genérico |

## 7. Flujos y consistencia de permisos

| Id | Acción | Esperado |
|---|---|---|
| F-1 | Alta de producto A1 (como `t.editor`) | `CodigoCU = CU-` + (100000 + ID); 16 hitos con `ClaveHito` distintas; 1 actividad inicial; `roleassignments` de A1 incluye al grupo de `Ems` (Leer) y a Admin/Editor/Viewer/Owners; 5 hitos incluyen al grupo (editar) y los otros 11 **no**; `PermisosAplicados = Sí` |
| F-2 | Alta del producto C1 (`Chemo`, fabricante sin `GrupoEntraId`) | F1 crea todo salvo permisos; `PermisosAplicados = No`; actividad de error; correo a Owners. Tras corregir `GrupoEntraId`, F4 repara esa noche |
| F-3 | Quitar a mano el permiso del grupo `Ems` en A1 | F4 lo restituye en la corrida diaria |
| F-4 | Agregar un grupo nuevo (p. ej. gerencia) a nivel **lista** en `Productos` | No llega a los ítems con permisos únicos hasta correr F4 (riesgo R-06); tras F4, sí. Verificar |
| F-5 | Importar 100 productos de prueba | Sin errores 429 persistentes; los 100 terminan con 16 hitos y permisos en < 30 min; ningún duplicado al reintentar |
| F-6 | Dos usuarios marcan hitos **distintos** del mismo producto casi a la vez | `Progreso` final correcto (recalculado, no sumado) |
| F-7 | Contar ítems con permisos únicos tras F-5 | F4 informa el total; alerta si ≥ 3.500 |

## 8. Integridad, auditoría y frontend

| Id | Acción | Esperado |
|---|---|---|
| I-1 | Crear un ítem en `Hitos`/`Actividades` con `Producto` vacío | **Rechazado** (obligatorio) |
| I-2 | Poner `EtapaActual = 3` o `Progreso = 120` | **Rechazado** (rango de la columna) |
| I-3 | Crear una fila duplicada en `Companias`, `Fabricantes` o `HitosCatalogo` | **Rechazado** (único) |
| I-4 | Una consulta sobre `Hitos` filtrando por `Title` (no indexada) cuando la lista supera 5.000 | Falla por umbral → la app **solo** usa `Producto`, `ClaveHito` o `ID` (ver 03 §7) |
| U-1 | Abrir el historial de versiones de un producto modificado por `t.editor` | Muestra quién y cuándo cambió cada columna (reemplaza el autor fijo: S-07) |
| U-2 | Buscar en el registro de auditoría de Microsoft Purview las acciones de `t.editor` | Aparecen las lecturas y escrituras (la retención depende de la licencia; ⚠️ dato de IT) |
| N-1 | Buscar en el paquete publicado (`dist/` y el sitio desplegado) la clave de Firebase y el paquete `firebase` | **Cero** coincidencias **(Crítico)** |
| N-2 | Con las herramientas del navegador, listar las llamadas de red | Solo SharePoint/Graph de Microsoft; ninguna a `firebaseio.com` |
| N-3 | Modificar a mano el rol en el almacenamiento local o en la memoria de la app | No cambia lo que SharePoint permite (los pasos de V-2 siguen dando 403) **(Crítico)** |
| N-4 | Quitar a `t.editor` del grupo y reintentar una escritura | **403** al renovar el token (anotar el tiempo real de revocación) |

## 9. Registro de resultados

| Id | Fecha | Ejecutó | Resultado (OK / Falla) | Evidencia (captura / salida) | Observaciones |
|---|---|---|---|---|---|
| | | | | | |

**Criterio de salida.** Todos los casos **(Crítico)** en OK; ningún caso de lectura de otra planta (X-5, P-2, P-3, P-7, P-11) con
fuga; cualquier "Falla" con plan de corrección aprobado por el dueño de negocio e IT.

## 10. Si un control no se puede garantizar

| Caso que falla | Qué significa | Camino |
|---|---|---|
| P-3 muestra ítems de otras plantas | La lista no filtra por permisos de ítem como se espera | **Detener**: no pasar a producción. Revisar herencia y el grupo "acceso limitado"; si persiste, pasar a **Dataverse** (seguridad por fila nativa) o a **listas por planta** |
| P-7 muestra el producto a la planta equivocada | F1 asignó el grupo incorrecto o la lista hereda permisos de más | Corregir `GrupoEntraId`; revisar herencia de `Productos` |
| E-6 no se revierte | F3 no está disparando (condición de disparo o cuenta de servicio) | Revisar la ejecución del flujo y el filtro `Modificado por` |
| V-2 permite escribir | El Viewer tiene un nivel mayor al previsto en la lista o en un ítem con permisos únicos | Reaplicar `01-crear-listas.ps1` y correr F4 |
