# S&OP Plant Reports

Editor de informes mensuales de planta + consolidador para la reunión de suministro.
Salida: **presentación en pantalla + PDF** (no genera .pptx). Interfaz en español.

> ⚠ Información confidencial de S&OP. Se recomienda confirmar con IT el uso de Netlify para estos datos.

Stack: HTML/CSS/JS sin build · Netlify Functions · Netlify Blobs (datos e imágenes). El repo sólo contiene código.
Esta app vive en la carpeta `plant-reports/` del repo `MegaS-OP/Discontinuados` (no toca la otra app del repo).

## Deploy (sin terminal)

### 1. Código en GitHub
Ya está en la rama `claude/new-session-6fojux` del repo **MegaS-OP/Discontinuados**. Para publicarlo desde la rama principal:
1. GitHub → repo → pestaña **Pull requests** → **New pull request** → base `main`, compare `claude/new-session-6fojux` → **Create pull request** → **Merge pull request**.
   (También podés desplegar directamente esa rama, ver paso 2.6.)

### 2. Sitio en Netlify
1. Entrá a https://app.netlify.com e ingresá con tu cuenta.
2. **Add new site** → **Import an existing project** → **Deploy with GitHub**. Autorizá a Netlify si lo pide y elegí la organización **MegaS-OP**.
3. Elegí el repo **Discontinuados**.
4. En la pantalla de configuración completá:
   - **Branch to deploy**: `main` (o `claude/new-session-6fojux` si todavía no hiciste el merge).
   - **Base directory**: `plant-reports`  ← importante
   - **Build command**: dejalo vacío
   - **Publish directory**: `web`
   - **Functions directory**: `netlify/functions`
   (Si Netlify lee `netlify.toml` ya vienen puestos.)
5. Antes de desplegar, abrí **Add environment variables** (o hacelo luego en el paso 3) — ver más abajo.
6. Click en **Deploy**. Cuando termine, Netlify muestra la URL (`https://algo.netlify.app`). En **Site configuration → Change site name** podés elegir un nombre más lindo.

### 3. Variables de entorno
Netlify → tu sitio → **Site configuration** → **Environment variables** → **Add a variable** → **Add a single variable**:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | La contraseña del administrador (larga, ej. 16+ caracteres) |
| `SESSION_SECRET` | Texto aleatorio de 32+ caracteres (sólo firma las sesiones; no la compartas) |

Guardá y luego **Deploys** → **Trigger deploy** → **Deploy site** para que las funciones tomen las variables.
Netlify Blobs no requiere configuración: se activa solo para el sitio.

### 4. Primer uso
1. Abrí la URL → pestaña **Administrador** → ingresá con `ADMIN_PASSWORD`.
2. **Plantas y accesos** → **Generar código** en cada planta y enviáselo (se muestra una sola vez).
3. **Contenido** → reemplazá los textos provisionales de definiciones de KPI (Back Up).
4. **Ciclos** → crear ciclo (mes + fecha límite) → **Abrir a las plantas** (con opción de pre-cargar desde el mes anterior).
5. Para probar sin cargar nada: **Tablero** → **Cargar datos de ejemplo** (crea el ciclo "Demo / Ejemplo" con 3 plantas). Se borra desde **Ciclos → Eliminar**.

## Manual de uso (1 página)

**Plantas**
- Ingresan con su código → **Empezar el informe** o **Duplicar del mes anterior**.
- Columna izquierda: diapositivas por sección (＋ agrega con la plantilla típica; ▾ elige otra). Arrastrá para reordenar.
- **Ctrl+V** pega capturas (se comprimen solas a ≤1920 px), **tablas de Excel** (quedan editables, conservan colores de celda) o texto. También se pueden arrastrar archivos al lienzo.
- Doble clic en un texto/celda para escribir. Mover y redimensionar con el mouse; flechas (Shift = 5%); Supr borra; Ctrl+C/V/D copia/pega/duplica bloques; Ctrl+Z / Ctrl+Y.
- Panel derecho: formato, colores de semáforo, filas/columnas, anchos.
- Autoguardado cada ~3 s (hay copia local si se corta internet). **☑ Secciones**: estado por sección y "No aplica".
- **▶ Presentar**: ←/→, `N` notas, `G` miniaturas, `Esc` sale. **Enviar informe** valida las secciones obligatorias (*).

**Administrador**
- **Tablero**: estado de las 8 plantas, semáforo vs fecha límite, abrir/presentar/reabrir.
- **Consolidar**: portada, agenda (resaltando la planta), informes, Back Up y cierre se arman solos. Arrastrar para reordenar, 👁 oculta sólo en el consolidado, ✎ edita en el informe de la planta (queda "editado por admin"). Cambios se guardan solos.
- **⬇ Exportar PDF**: en la ventana de impresión elegir *Destino: Guardar como PDF · Márgenes: Ninguno · Gráficos de fondo activado*.

## Seguridad
- Código por planta (sólo se guarda el hash SHA-256 con sal); sesión firmada HMAC de 12 h; 5 intentos fallidos/15 min por IP.
- Una planta no puede leer ni escribir informes de otra hasta que el ciclo se cierra (entonces sólo lectura).
- HTML saneado con lista blanca al guardar y al mostrar; imágenes validadas por contenido (≤5 MB); CSP y cabeceras en `netlify.toml`.

## Desarrollo local (opcional, requiere Node 20+)
```
cd plant-reports && npm install
npm run dev        # http://localhost:8888  (admin: admin-dev, datos en .dev-data)
npm run test:api   # pruebas de la API (incluye aislamiento entre plantas)
```

## Estado por fases
- **Fase 1 (esta entrega)**: login planta/admin, ciclos, editor (texto, imagen, tabla, "Puntos a destacar"), pegado/arrastre/compresión, autoguardado + respaldo local + bloqueo por versión, presentación, enviar/reabrir, tablero, consolidador (orden, ocultas, portada, agenda, Back Up) y PDF, duplicar mes anterior, demo.
- **Fase 2**: KPIs estructurados + resumen comparativo, aviso de contenido sin cambios, dividir tablas largas, historial, orden por sección, congelar consolidado.
- **Fase 3**: importar PPTX, correos por Gmail SMTP, exportar HTML autocontenido.

## Pendientes / decisiones por defecto
- No llegaron los PPTX de ejemplo: **paleta, tipografía y logo son provisorios** (`web/css/slide.css`, `web/assets/logo.png`). Reemplazar el logo y pasar los PPTX a `reference/` para ajustar el tema.
- Textos de definición de KPI (Back Up) y metas de KPI por planta son provisorios (editables en el panel).
