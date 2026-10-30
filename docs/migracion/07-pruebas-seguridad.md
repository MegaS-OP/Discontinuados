# Pruebas de seguridad — Casos por rol

## Configuración de cuentas de prueba

Crear las siguientes cuentas en el tenant antes de ejecutar las pruebas:

| Cuenta de prueba | Grupo Entra ID | Descripción |
|---|---|---|
| `test-admin@<tenant>.onmicrosoft.com` | `SG-Discontinuados-Admin` | Pruebas de rol Admin |
| `test-editor@<tenant>.onmicrosoft.com` | `SG-Discontinuados-Editor` | Pruebas de rol Editor |
| `test-planta-arg@<tenant>.onmicrosoft.com` | `SG-Discontinuados-Planta-Arg-Mlb` | Pruebas de acceso restringido a planta Arg-Mlb |
| `test-planta-bol@<tenant>.onmicrosoft.com` | `SG-Discontinuados-Planta-Bol-Mlb` | Pruebas de acceso a planta diferente |
| `test-viewer@<tenant>.onmicrosoft.com` | `SG-Discontinuados-Viewers` | Pruebas de solo lectura |
| `test-externo@external.com` | Ninguno | Pruebas de acceso no autorizado |

---

## TC-01: Viewer no puede crear productos (desde la app)

**Rol probado**: Viewer  
**Precondición**: `test-viewer` autenticado en la app. Lista Discontinuados tiene al menos 1 ítem.

**Pasos**:
1. Abrir la app con `test-viewer`.
2. Verificar que el botón "Nuevo producto" no sea visible en el dashboard.
3. Intentar mediante llamada REST directa: `POST https://<tenant>.sharepoint.com/sites/discontinuados-corp/_api/web/lists/getbytitle('Discontinuados')/items` con cuerpo JSON de ítem nuevo.

**Resultado esperado**:
- Paso 2: el botón no aparece (UX).
- Paso 3: respuesta HTTP 403 Forbidden.

---

## TC-02: Editor no puede eliminar productos (desde la app)

**Rol probado**: Editor  
**Precondición**: `test-editor` autenticado. Existe el producto `CU-000001`.

**Pasos**:
1. Abrir la app con `test-editor`, navegar al detalle de `CU-000001`.
2. Verificar que no haya botón "Eliminar producto".
3. Intentar REST: `DELETE https://<tenant>.sharepoint.com/sites/discontinuados-corp/_api/web/lists/getbytitle('Discontinuados')/items(1)` con header `X-HTTP-Method: DELETE`.

**Resultado esperado**:
- Paso 2: no hay botón (UX).
- Paso 3: HTTP 403 Forbidden (nivel "Contribuir sin eliminar" no incluye `DeleteListItems`).

---

## TC-03: Viewer no puede editar hitos (acceso directo SharePoint)

**Rol probado**: Viewer  
**Precondición**: Existe un hito con ID conocido.

**Pasos**:
1. Abrir SharePoint directamente: `https://<tenant>.sharepoint.com/sites/discontinuados-corp/lists/Hitos`.
2. Intentar editar el campo "Completado" de cualquier hito desde la vista de lista (edición en línea o formulario).
3. Intentar REST PATCH con `test-viewer`.

**Resultado esperado**:
- Paso 2: SharePoint muestra el ítem en solo lectura, sin posibilidad de editar.
- Paso 3: HTTP 403 Forbidden.

---

## TC-04: Planta-Arg solo ve sus productos (desde SharePoint directo)

**Rol probado**: Planta (Arg-Mlb)  
**Precondición**: Existen productos de `Fabricante=Arg-Mlb` y de `Fabricante=Bol-Mlb`. El flujo de permisos se ejecutó correctamente.

**Pasos**:
1. Abrir `https://<tenant>.sharepoint.com/sites/discontinuados-corp/lists/Discontinuados` con `test-planta-arg`.
2. Verificar qué ítems son visibles.
3. Intentar REST GET del ítem de un producto con `Fabricante=Bol-Mlb` (ID conocido).

**Resultado esperado**:
- Paso 2: Solo aparecen productos cuyo `Fabricante=Arg-Mlb`.
- Paso 3: HTTP 403 Forbidden o ítem no encontrado (no visible para este usuario).

---

## TC-05: Planta-Arg puede editar hito de su producto

**Rol probado**: Planta (Arg-Mlb)  
**Precondición**: Existe producto de `Fabricante=Arg-Mlb` con hito "Análisis de impacto planta" en `Done=false`.

**Pasos**:
1. Autenticar como `test-planta-arg`.
2. Navegar al hito correspondiente y marcar `Done=true` con `ImpactoGranelLleva=Sí` y `ImpactoGranelValor=1500`.
3. Verificar que el ítem se guardó.

**Resultado esperado**:
- El hito se actualiza correctamente.
- El campo `FechaReal` se actualiza (vía flujo Power Automate).
- Se crea una entrada en lista Actividades con `TipoActividad=Hito completado`.

---

## TC-06: Planta-Arg no puede editar hito de producto de otra planta

**Rol probado**: Planta (Arg-Mlb)  
**Precondición**: Existe producto de `Fabricante=Bol-Mlb` con hito conocido.

**Pasos**:
1. Autenticar como `test-planta-arg`.
2. Intentar PATCH REST sobre un hito del producto de `Fabricante=Bol-Mlb`.

**Resultado esperado**: HTTP 403 Forbidden.

---

## TC-07: Editor no puede editar catálogo Cias (SharePoint directo)

**Rol probado**: Editor  
**Precondición**: Lista Cias existe con al menos 1 ítem.

**Pasos**:
1. Autenticar como `test-editor`.
2. Abrir `https://<tenant>.sharepoint.com/sites/discontinuados-corp/lists/Cias`.
3. Intentar editar el `NombreCompleto` de una compañía.
4. Intentar REST PATCH con `test-editor`.

**Resultado esperado**: Pasos 3 y 4 → HTTP 403 Forbidden.

---

## TC-08: Log de actividades es inalterable para Editors

**Rol probado**: Editor  
**Precondición**: Existe al menos 1 ítem en lista Actividades creado por `test-editor`.

**Pasos**:
1. Autenticar como `test-editor`.
2. Intentar editar el campo `Texto` de la actividad propia desde la vista de lista SharePoint.
3. Intentar REST PATCH sobre el ítem de Actividades.
4. Intentar REST DELETE sobre el ítem de Actividades.

**Resultado esperado**: Los 3 intentos retornan HTTP 403 Forbidden. El ítem permanece intacto.

---

## TC-09: Acceso de Power Automate respeta permisos (Graph API)

**Precondición**: Flujo `PA-Discontinuados-ToggleHito` configurado con identidad de `test-editor`.

**Pasos**:
1. Disparar el flujo para marcar un hito de un producto asignado a `Fabricante=Arg-Mlb` desde la cuenta `test-editor`.
2. Verificar el historial de ejecución del flujo.
3. Intentar disparar el mismo flujo sobre un producto de `Fabricante=Bol-Mlb` desde la misma cuenta.

**Resultado esperado**:
- Paso 2: flujo completado con éxito, hito actualizado.
- Paso 3: flujo falla con error de permiso (si el flujo usa identidad delegada del usuario que disparó; ⚠️ SUPUESTO si el flujo usa identidad de aplicación, este control debe implementarse explícitamente en la lógica del flujo).

---

## TC-10: Usuario sin grupo no tiene acceso al sitio

**Rol probado**: Sin grupo  
**Precondición**: `test-externo` no pertenece a ningún grupo de la app.

**Pasos**:
1. Intentar navegar a `https://<tenant>.sharepoint.com/sites/discontinuados-corp`.
2. Intentar GET REST de la lista Discontinuados con token del usuario externo.

**Resultado esperado**:
- Paso 1: SharePoint muestra "Acceso denegado" o redirige al administrador.
- Paso 2: HTTP 403 Forbidden.

---

## TC-11: Acceso desde Excel (Power Query)

**Rol probado**: Editor  
**Precondición**: `test-editor` tiene Excel instalado con acceso al tenant.

**Pasos**:
1. En Excel: Datos → Obtener datos → SharePoint Online List.
2. Conectarse a `https://<tenant>.sharepoint.com/sites/discontinuados-corp`.
3. Seleccionar lista Discontinuados.
4. Verificar qué ítems se retornan.
5. Intentar modificar un valor en el Excel conectado y sincronizar.

**Resultado esperado**:
- Paso 4: Solo los ítems que el Editor puede ver (todos, dado que Editor tiene acceso al sitio sin restricción por ítem).
- Paso 5: Si el valor modificado es de un campo con "Contribuir sin eliminar", el cambio se guarda. Si se intenta un DELETE desde Power Query, falla con 403.

---

## TC-12: Admin puede eliminar producto (única cuenta con ese permiso)

**Rol probado**: Admin  
**Precondición**: Existe producto de prueba `CU-TEST-001`.

**Pasos**:
1. Autenticar como `test-admin`.
2. Desde la app, ejecutar la función de eliminar producto (si existe en UI).
3. Verificar que el flujo `PA-Discontinuados-EliminarProducto` se ejecutó: los 16 hitos del producto también fueron eliminados.
4. Verificar que el ítem ya no aparece en la lista.

**Resultado esperado**: Producto e hitos eliminados. Actividades previas conservadas (como historial).

---

## Registro de ejecución de pruebas

| Test | Fecha | Ejecutado por | Resultado | Observaciones |
|---|---|---|---|---|
| TC-01 | | | | |
| TC-02 | | | | |
| TC-03 | | | | |
| TC-04 | | | | |
| TC-05 | | | | |
| TC-06 | | | | |
| TC-07 | | | | |
| TC-08 | | | | |
| TC-09 | | | | |
| TC-10 | | | | |
| TC-11 | | | | |
| TC-12 | | | | |
