# Seguridad SharePoint — Diseño por capas

## 1. Capa: Sitio

- **Sitio dedicado**: `https://<tenant>.sharepoint.com/sites/discontinuados-corp`
- **Propietarios del sitio** (grupo Owners): máximo 3 personas de IT/governance → grupo `SG-Discontinuados-Owners`
- **Administradores externos del sitio**: ninguno
- **Acceso externo (sharing)**: deshabilitado (organización solo)
- **Grupos con acceso al sitio**:

| Grupo Entra ID | Nivel de permiso de sitio |
|---|---|
| `SG-Discontinuados-Owners` | Control total |
| `SG-Discontinuados-Admin` | Diseño (puede gestionar listas y permisos) |
| `SG-Discontinuados-Editor` | Contribuir (personalizado — sin eliminar) |
| `SG-Discontinuados-Planta` | Contribuir (personalizado — sin eliminar; restringido por ítem vía flujo) |
| `SG-Discontinuados-Viewer` | Leer |

---

## 2. Capa: Lista

### Herencia de permisos por lista

| Lista | Rompe herencia | Justificación |
|---|---|---|
| **Discontinuados** | No (hereda del sitio) | Todos los grupos del sitio acceden; la restricción por ítem (planta) se gestiona con permisos únicos vía flujo |
| **Hitos** | No | Los hitos heredan del sitio; las restricciones de planta siguen al producto padre |
| **Actividades** | Sí | Requiere nivel de permiso "Solo agregar" personalizado que la herencia no provee |
| **Cias** | Sí | Catálogo: solo lectura para todos, escritura solo Admin |
| **Fabricantes** | Sí | Igual que Cias |
| **BUs** | Sí | Igual que Cias |
| **HitosTemplate** | Sí | Catálogo de proceso: solo lectura para todos, escritura solo Admin |

### Niveles de permiso personalizados

#### "Contribuir sin eliminar" (para Editors y Planta)

Basado en "Contribuir", quitar:
- `DeleteListItems` — No puede eliminar ítems
- `DeleteVersions` — No puede eliminar versiones

#### "Solo agregar" (para lista Actividades)

Basado en "Contribuir", quitar:
- `EditListItems` — No puede editar ítems propios
- `DeleteListItems` — No puede eliminar ítems
- `DeleteVersions` — No puede eliminar versiones

Esto asegura que el log de auditoría sea append-only.

### Asignación por lista

| Lista | SG-Admin | SG-Editor | SG-Planta | SG-Viewer |
|---|---|---|---|---|
| Discontinuados | Control total | Contribuir sin eliminar | Contribuir sin eliminar | Leer |
| Hitos | Control total | Contribuir sin eliminar | Contribuir sin eliminar | Leer |
| Actividades | Control total | Solo agregar | Solo agregar | Leer |
| Cias | Control total | Leer | Leer | Leer |
| Fabricantes | Control total | Leer | Leer | Leer |
| BUs | Control total | Leer | Leer | Leer |
| HitosTemplate | Control total | Leer | Leer | Leer |

---

## 3. Capa: Ítem

### Mecanismo elegido: Permisos únicos por ítem vía flujo (para acceso de Planta)

**Justificación**: Los usuarios con rol Planta deben ver y editar solo los productos cuyo fabricante sea su planta. SharePoint no filtra permisos por valor de columna sin permisos únicos por ítem. Con ~500 ítems activos y ~30 plantas, el número de ítems con permisos únicos es manejable (máximo 500 ítems × N rupturas, muy lejos del límite de degradación de 5.000).

**Condición para usar permisos únicos**: se aplica SOLO al acceso del grupo `SG-Discontinuados-Planta` y subgrupos `SG-Discontinuados-Planta-{CodigoFabricante}`. Los demás grupos (Admin, Editor, Viewer) acceden por herencia del sitio sin ruptura.

### Flujo Power Automate: Asignación de permisos al crear producto

**Nombre del flujo**: `PA-Discontinuados-AsignarPermisosPlanta`

**Disparador**: Cuando se crea un ítem en la lista Discontinuados.

**Pasos**:
1. Obtener el valor de `Fabricante` del ítem recién creado.
2. Calcular el nombre del subgrupo de planta: `SG-Discontinuados-Planta-{Fabricante}`.
3. Llamar a la acción **"Detener herencia de permisos de elemento"** en el ítem de Discontinuados (preservar los permisos actuales como copia base).
4. **Quitar** el permiso del grupo `SG-Discontinuados-Planta` del ítem (el grupo base, sin subgrupo).
5. **Agregar** el grupo `SG-Discontinuados-Planta-{Fabricante}` con nivel "Contribuir sin eliminar".
6. Repetir pasos 3-5 para los 16 ítems de Hitos creados por el flujo `PA-Discontinuados-CrearHitos`.

> Nota: La acción HTTP de Graph API puede ser más eficiente que los conectores nativos para operaciones en masa. Usar conector SharePoint v3 "Grant access to an item or a folder".

**Grupos requeridos**: crear en Entra ID un grupo por fabricante activo (~31 grupos): `SG-Discontinuados-Planta-Andrómaco`, `SG-Discontinuados-Planta-Apiter`, etc. Cada grupo contiene los usuarios de esa planta.

### Mecanismo para Admin/Editor/Viewer

Acceso por herencia del sitio. No se generan permisos únicos. Estos grupos ven **todos los productos**.

---

## 4. Capa: Columna

**SharePoint no tiene seguridad por columna nativa.**

Campos sensibles identificados en el modelo actual:
- `ValorItem` y `ValorInventario` (costos de destrucción de inventario) — datos financieros potencialmente sensibles.
- `Observaciones` — puede contener información comercial sensible.

**Decisión**: dado que todos los Editors y Admins del proceso necesitan ver estos datos para operar, **no se propone lista separada** para estos campos en esta versión. Si surgiera un requisito regulatorio de restringir costos a un subconjunto de usuarios, se crearía una lista `HitosCostos` separada (1:1 con Hitos) con permisos propios.

---

## 5. Transiciones de estado

El proceso tiene 3 etapas (Detección → Análisis → Confirmación). El campo `EtapaActual` en Discontinuados controla el estado.

**Mecanismo de protección**: columna de validación + flujo Power Automate.

### Validación de columna (primera línea de defensa)

Fórmula de validación en la columna `EtapaActual`:
```
=[EtapaActual]>=[EtapaActualAnterior] AND [EtapaActual]<=[EtapaActualAnterior]+1
```
> Nota: SharePoint no tiene acceso al valor anterior en columnas calculadas; esta validación se implementa en el **flujo Power Automate** que procesa el cambio, no como fórmula de SharePoint.

### Flujo Power Automate: Transición de etapa

**Nombre**: `PA-Discontinuados-ValidarTransicionEtapa`

**Disparador**: Cuando se modifica un ítem en Discontinuados (campo `EtapaActual` cambia).

**Pasos**:
1. Obtener el valor anterior de `EtapaActual` (del historial de versiones o campo `EtapaAnterior` de control).
2. Verificar: `nuevoValor <= anteriorValor + 1` y `nuevoValor >= 0` y `nuevoValor <= 2`. Si no → rechazar y enviar email con motivo.
3. Verificar que todos los hitos de la etapa anterior estén `Done = true`. Si no → rechazar.
4. Actualizar `EtapaAnterior` con el nuevo valor.
5. Registrar en Actividades: evento de sistema "Avance de etapa: X → Y".
6. Enviar notificación por email a los responsables de la nueva etapa.

---

## 6. Datos sensibles y cumplimiento

| Aspecto | Decisión |
|---|---|
| **Etiqueta de confidencialidad** (Purview) | Aplicar etiqueta "Confidencial - Interno" al sitio. Los documentos adjuntos heredan la etiqueta. |
| **Retención** | Política de retención de 7 años para la lista Discontinuados y Actividades (trazabilidad de discontinuaciones de productos farmacéuticos). Configurar en Microsoft Purview Compliance. |
| **GxP / 21 CFR Part 11** | ⚠️ SUPUESTO: Megalabs opera bajo estándares farmacéuticos. Si aplica 21 CFR Part 11, se requiere: (a) auditoría de todas las escrituras (nativa en SharePoint con historial de versiones), (b) firma electrónica para la transición a "Confirmación" (implementar con un flujo de aprobación en Power Automate), (c) políticas de bloqueo de registros. Confirmar con el equipo regulatorio. |
| **Auditoría con Purview** | Habilitar auditoría unificada en el tenant. Configurar alertas para: eliminación masiva de ítems, cambios de permisos, acceso desde fuera de la organización. |
| **Acceso desde Excel/Power BI** | Los usuarios pueden conectar Excel o Power BI directamente a las listas. La seguridad de SharePoint aplica: cada usuario ve solo los ítems a los que tiene acceso. Documentar y comunicar esta posibilidad. |

---

## 7. Tabla de riesgos residuales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Usuario Planta modifica datos de otro producto (si se asigna al grupo equivocado en Entra ID) | Baja | Alto | Proceso de onboarding controlado: IT agrega usuarios a subgrupos `SG-Discontinuados-Planta-{X}` solo con aprobación del responsable de proceso. |
| Editor elimina registros accidentalmente desde Excel | Media | Alto | Nivel "Contribuir sin eliminar" quita `DeleteListItems`; válido también para acceso directo de Excel/REST. |
| Flujo de permisos falla y un producto queda sin restricción de planta | Media | Medio | Monitorear ejecuciones fallidas del flujo en Power Automate; alerta por email al Admin. Ejecutar script de verificación semanal. |
| Log de Actividades editado maliciosamente | Muy baja | Alto | Nivel "Solo agregar" previene edición; Purview audita intentos fallidos de edición. |
| Throttling de SharePoint durante importación masiva (>224 productos) | Media | Bajo | Usar Power Automate con delays entre ítems; no usar Graph API en ráfaga sin exponential backoff. |
| Superación del umbral de 5.000 ítems en lista Hitos sin índice | Media | Alto | 16 hitos × 313 productos = 5.008. Umbral se alcanza rápido. Índices en `Producto`, `Label`, `Done`, `Etapa` mitigados. REVISAR al superar 300 productos activos. |
