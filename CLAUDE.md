# CLAUDE.md — Discontinuados Corporativos (Megalabs S&OP Global)

## Qué es este proyecto

App de gestión del proceso de **discontinuación de SKUs farmacéuticos** para Megalabs.
Cubre 13 compañías del grupo y múltiples plantas fabricantes.
El proceso tiene 3 etapas (Detección → Análisis → Confirmación) con 16 hitos estándar por producto.

**Área dueña:** S&OP Global  
**Contacto:** arianavinzon@gmail.com  
**Usuarios:** Supply Corp, Mkt Corp, Plantas, Compliance, AARR, Finanzas, S&OP Global  
**Volumen actual:** 224 productos registrados · proyección <500 activos por ciclo anual

---

## Stack actual

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Router | React Router DOM 7 |
| Backend / BD | Firebase Realtime Database |
| Íconos | lucide-react |
| Export | file-saver + xlsx |
| Deploy | (pendiente definir — hoy Netlify para `plant-reports`) |

**Rama de trabajo:** `claude/dazzling-turing-szyjli`  
**Repo:** `arianavinzon-blip/Discontinuados` (movido a `MegaS-OP/Discontinuados`)

---

## Estructura del repositorio

```
/
├── src/
│   ├── firebase.js               # Config Firebase (API key embebida — ver Seguridad)
│   ├── context/
│   │   ├── AppContext.jsx         # Estado global de productos e hitos
│   │   └── UserContext.jsx        # Rol del usuario (solo frontend — NO es seguridad)
│   ├── pages/
│   │   ├── Dashboard.jsx / DashboardView.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── NuevoProducto.jsx
│   │   ├── EditarProducto.jsx
│   │   ├── Comparativa.jsx
│   │   ├── Reportes.jsx
│   │   └── Configuracion.jsx
│   └── components/
│       ├── Sidebar.jsx
│       ├── LoginScreen.jsx        # "Elegí quién sos" sin contraseña — NO es auth real
│       ├── ImportModal.jsx
│       └── StatusBadge.jsx
├── plant-reports/                 # Sub-módulo separado (ciclos, informes, slides)
├── docs/migracion/                # Diseño de migración a SharePoint Online
├── editor_discontinuados.html     # Editor BPMN interactivo (diagrama de flujo + RACI)
├── discontinuados-224.json        # Seed / datos de ejemplo (224 productos)
├── Plantilla_NuevoProducto_Discontinuado.xlsx
├── Plantilla_AnalisisImpacto_Planta.xlsx
├── Plantilla_Anunciante_Discontinuacion.xlsx
└── Plantilla_Planta_Analisis_Impacto.xlsx
```

---

## Comandos útiles

```bash
npm run dev      # Servidor de desarrollo (Vite)
npm run build    # Build de producción
npm run lint     # ESLint
npm run preview  # Preview del build
```

---

## Modelo de datos (Firebase Realtime Database)

### Nodo raíz: `/productos`
Cada producto tiene:
- `id`, `codigo`, `descripcion`, `cia`, `fabricante`, `bu`, `mph`
- `estado`: `Activo | En proceso | Discontinuado`
- `etapa`: `1 | 2 | 3`
- `hitos`: array de 16 objetos `{ id, nombre, responsable, estado, fechaEstimada, fechaReal }`
- `creadoEn`, `actualizadoEn`
- Campos de análisis de planta: `costoDestruccionPT`, `costoDestruccionMateriales`,
  `costoInventarioAPI`, `productosColaProduccion`, `ultimaOC`, `impactoGranel`,
  `porcentajeGranel`, `resolucionFinal`

### Nodo raíz: `/configuracion`
- Listas de catálogo: compañías, fabricantes, BUs, estados de hito

---

## ⚠️ Seguridad — Issues conocidos

| Severidad | Issue | Archivo:línea |
|---|---|---|
| **CRÍTICA** | API key de Firebase embebida en el bundle (visible a cualquier usuario) | `src/firebase.js:4` |
| **CRÍTICA** | Sin autenticación real — LoginScreen es solo selección de nombre/rol | `src/components/LoginScreen.jsx` |
| **ALTA** | Toda autorización vive en el frontend (`UserContext`) — se puede bypassear desde Firebase Console | `src/context/UserContext.jsx` |
| **ALTA** | Reglas de seguridad de Firebase desconocidas — verificar si son `.read/.write: true` | Firebase Console |
| **MEDIA** | Rol del usuario guardado en localStorage — modificable desde DevTools | `src/context/UserContext.jsx` |

**Acción urgente antes de cualquier deploy a producción:** revisar las reglas de seguridad de Firebase Realtime Database en la consola.

---

## Migración planificada → SharePoint Online

Ver `docs/migracion/README.md` para el diseño completo.

**Resumen de decisiones:**
- **SharePoint alcanza** (no se requiere Dataverse): <5.000 ítems proyectados
- **7 listas SharePoint:** Productos, Hitos, Compañías, Fabricantes, BusinessUnits, EstadosHito, PlantReports
- **Autenticación:** Entra ID + MSAL (reemplaza el LoginScreen actual)
- **Roles → grupos Entra ID:** `SG-Discontinuados-Admin`, `SG-Discontinuados-SupplyCorp`, `SG-Discontinuados-MktCorp`, `SG-Discontinuados-Planta-{Fabricante}`, etc.
- **Lógica de negocio → 6 flujos Power Automate**
- **Script de aprovisionamiento:** `docs/migracion/provisioning/01-crear-listas.ps1`

---

## Artefactos generados en esta sesión

| Artefacto | URL / Path |
|---|---|
| Editor BPMN interactivo | https://claude.ai/artifact/RcASvcEsVo647iR4y8vNoK |
| Email corporativo de lanzamiento | https://claude.ai/artifact/D2Q2hqQa92akqeGzGEkiPn |
| Plantilla anunciante (v2) | `Plantilla_NuevoProducto_Discontinuado.xlsx` |
| Plantilla planta (v2) | `Plantilla_AnalisisImpacto_Planta.xlsx` |
| Docs migración SharePoint | `docs/migracion/` (9 archivos) |

---

## Convenciones de desarrollo

- **Nombres de columnas SharePoint:** CamelCase sin espacios (`EstadoSolicitud`, no `Estado de la solicitud`)
- **Regla de oro:** ninguna regla de acceso puede depender solo del frontend
- **Comentarios en código:** solo cuando el WHY no es obvio
- **No crear archivos .md** salvo que se pida explícitamente

---

## Preguntas abiertas pendientes

### Negocio
1. ¿Aplica 21 CFR Part 11 o GxP para este proceso?
2. ¿Usuarios de planta ven solo sus productos o también los de otras plantas?
3. ¿El sub-módulo `plant-reports` se migra en esta fase?
4. ¿Política de retención de datos (años)?
5. ¿Quién aprueba el avance de etapa?
6. ¿Los 224 productos del seed son datos reales o de prueba?

### IT
1. **¿Las reglas de Firebase son permisivas?** (riesgo crítico activo)
2. ¿PnP PowerShell disponible en el tenant?
3. ¿Power Automate Premium disponible en las licencias?
4. ¿Se pueden crear ~36 grupos Entra ID `SG-Discontinuados-*`?
5. ¿Ventana de migración disponible para carga masiva?
