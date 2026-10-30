# Migración de datos — Firebase → SharePoint Online

## 1. Orden de carga (catálogos primero)

```
1. Cias           (13 ítems)
2. Fabricantes    (31 ítems)
3. BUs            (5 ítems)
4. HitosTemplate  (16 ítems)
5. Discontinuados (~224 ítems del seed + datos reales de Firebase)
6. Hitos          (~3.584 ítems = 16 × 224; creados por flujo o en bloque)
7. Actividades    (las que existan en Firebase; vacías en el seed)
```

---

## 2. Mapeo campo origen → columna destino

### Catálogo Cias (`src/data/db.js:3-7`)

| Origen (array JS) | Columna SP | Transformación |
|---|---|---|
| valor string (ej. `"Arg-Mlb"`) | `Title` | Sin transformación |
| — | `NombreCompleto` | Dejar vacío; completar manualmente |
| — | `Activa` | `true` para todos los del seed |

### Catálogo Fabricantes (`src/data/db.js:9-15`)

| Origen | Columna SP | Transformación |
|---|---|---|
| valor string (ej. `"Andrómaco"`) | `Title` | Sin transformación |
| — | `NombreCompleto` | Dejar vacío |
| — | `Pais` | Dejar vacío |
| — | `Activo` | `true` |

### Catálogo BUs (`src/data/db.js:17`)

| Origen | Columna SP | Transformación |
|---|---|---|
| valor string | `Title` | Sin transformación |
| — | `NombreCompleto` | Dejar vacío |
| — | `Activa` | `true` |

### HitosTemplate (`src/data/db.js:20-40`)

| Origen | Columna SP | Transformación |
|---|---|---|
| `label` | `Title` | Sin transformación |
| `etapa` | `Etapa` | Sin transformación (0/1/2) |
| índice en array | `Orden` | 0-15 |
| `RESPONSABLES_DEFAULT[label]` | `ResponsableDefault` | Lookup en el diccionario |
| `HITOS_CON_EXTRAS[label].notas` | `TieneNotas` | `true` si la clave existe |
| `HITOS_CON_EXTRAS[label].valorItem` | `TieneCostos` | `true` si la clave existe |
| `HITOS_CON_EXTRAS[label].impactoGranelLleva` | `TieneImpactoGranel` | `true` si la clave existe |
| `HITOS_CON_EXTRAS[label].fecha` | `TieneFechaOC` | `true` si la clave existe |

### Lista Discontinuados (`discontinuados-224.json` → Firebase → SP)

| Campo Firebase | Columna SP | Transformación |
|---|---|---|
| `id` | `Title` | Sin transformación |
| `codigo` | `CodigoSKU` | Vacío si es `""` → dejar vacío en SP |
| `nombre` | `NombreProducto` | Sin transformación; verificar que no supere 255 chars |
| `paisCompania` | `Cia` (lookup) | Buscar por `Title` en lista Cias; obtener ID SP |
| `paisPlanta` | `Fabricante` (lookup) | Buscar por `Title` en lista Fabricantes; obtener ID SP |
| `bu` | `BU` (lookup) | Buscar por `Title` en lista BUs; obtener ID SP |
| `mph` | `MPH` | Sin transformación |
| `levantadoSOPC` | `LevantadoDesdePlanta` | `'si'` → `'Sí'`; `'no'` → `'No'`; `''` → `'No especificado'` |
| `observaciones` | `Observaciones` | Sin transformación |
| `etapaActual` | `EtapaActual` | Sin transformación (0/1/2) |
| `progreso` | `Progreso` | Sin transformación (0-100) |
| `ultimoHito` | `UltimoHito` | Sin transformación |
| `fechaUltimoHito` | `FechaUltimoHito` | DD/MM/YYYY → parsear a ISO 8601 (YYYY-MM-DD) |
| `fechaInicio` | `FechaInicio` | DD/MM/YYYY → parsear a ISO 8601 |
| `etapas[].estado` | No migrar directamente | `EtapaActual` es suficiente; estado derivado en frontend |

### Lista Hitos (desde `hitos[]` dentro de cada producto)

| Campo Firebase | Columna SP | Transformación |
|---|---|---|
| `id` | `Title` | Sin transformación |
| referencia al producto padre | `Producto` (lookup) | ID SP del ítem en lista Discontinuados donde `Title = producto.id` |
| `etapa` | `Etapa` | Sin transformación |
| `label` | `Label` (choice) | Sin transformación; verificar que sea uno de los 16 valores válidos |
| `responsable` | `Responsable` | Sin transformación |
| `done` | `Done` | `true`/`false` → Sí/No en SP |
| `fechaCompromiso` | `FechaCompromiso` | DD/MM/YYYY → ISO; `'-'` → null |
| `fechaReal` | `FechaReal` | DD/MM/YYYY → ISO; `'-'` → null |
| `notas` | `Notas` | Sin transformación; `''` → null |
| `ofreceUnidades` | `OfreceUnidades` | Sin transformación |
| `impactoGranelLleva` | `ImpactoGranelLleva` | Sin transformación |
| `impactoGranelValor` | `ImpactoGranelValor` | String → moneda (parsear número) |
| `resolucionFinal` | `ResolucionFinal` | Sin transformación |
| `valorItem` | `ValorItem` | String → moneda |
| `valorInventario` | `ValorInventario` | String → moneda |
| `fecha` (hito Última OC) | `FechaUltimaOC` | DD/MM/YYYY → ISO; `''` → null |
| índice en array | `Orden` | 0-15 según posición en HITOS_TEMPLATE |

### Lista Actividades

Actualmente vacías en el seed (`discontinuados-224.json`). Si Firebase tiene actividades reales, migrar con:

| Campo Firebase | Columna SP | Transformación |
|---|---|---|
| `id` | `Title` | Sin transformación |
| referencia al producto | `Producto` (lookup) | ID SP del producto padre |
| `text` | `Texto` | Sin transformación |
| `time` | `FechaActividad` | "DD/MM HH:MM" → parsear a datetime ISO del año actual |
| — | `TipoActividad` | Inferir del texto: si contiene "Avance de etapa" → `Sistema`; si contiene "Observación:" → `Sistema`; si contiene "Producto ingresado" → `Sistema`; resto → `Comentario` |

---

## 3. Método de migración propuesto

### Herramienta: PnP PowerShell

Se elige PnP PowerShell por:
- Manejo nativo de listas SharePoint (sin necesidad de Graph REST manual).
- Soporte de bulk insert con `Add-PnPListItem`.
- Disponible en el tenant sin infraestructura adicional.
- El script de provisioning ya usa PnP (ver Fase 7).

### Procedimiento

```powershell
# 1. Exportar datos de Firebase a JSON (ejecutar desde Node.js)
# node scripts/export-firebase.mjs > migration-data.json

# 2. Ejecutar en orden:
.\migration\01-cargar-catalogos.ps1 -SiteUrl "https://tenant.sharepoint.com/sites/discontinuados-corp"
.\migration\02-cargar-discontinuados.ps1 -SiteUrl "..." -DataFile "migration-data.json"
.\migration\03-cargar-hitos.ps1       -SiteUrl "..." -DataFile "migration-data.json"
.\migration\04-cargar-actividades.ps1 -SiteUrl "..." -DataFile "migration-data.json"
.\migration\05-verificar.ps1          -SiteUrl "..."
```

> El script de provisioning completo se encuentra en `docs/migracion/provisioning/01-crear-listas.ps1`.

---

## 4. Validación post-migración

| Check | Método | Resultado esperado |
|---|---|---|
| Conteo de productos | `Get-PnPListItem -List Discontinuados -PageSize 1000` | Igual al conteo en Firebase |
| Conteo de hitos | `Get-PnPListItem -List Hitos -PageSize 5000` | Productos × 16 |
| Lookup de Cia/Fabricante/BU no null | Script que lea todos los ítems y verifique campos lookup | 0 ítems con lookup vacío |
| Fechas correctamente formateadas | Sample de 10 ítems, verificar FechaInicio, FechaUltimoHito | Fechas ISO, no nulas donde el original era DD/MM/YYYY |
| Hitos completados (Done=true) preservados | Comparar `done:true` en JSON con `Done=Yes` en SP | 100% coincidencia |
| Progreso coherente | Para cada producto: `count(Hitos donde Done=true) / 16 * 100 ≈ Progreso` | Diferencia < 1% (redondeo) |
| Permisos de planta asignados | Para muestra de 5 productos: `Get-PnPListItemPermission` | Incluye el grupo `SG-Discontinuados-Planta-{Fabricante}` correcto |
| Acceso de Viewer denegado en catálogos (escritura) | Login con cuenta de test Viewer, intentar modificar lista Cias | Error 403 |
