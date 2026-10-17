# S&OP Suministro Reports

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
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_NOTIFY_EMAIL` | *Opcionales*: correos (ver "KPIs, versiones y avisos") |

Guardá y luego **Deploys** → **Trigger deploy** → **Deploy site** para que las funciones tomen las variables.
Netlify Blobs no requiere configuración: se activa solo para el sitio.

### 4. Primer uso
1. Abrí la URL → pestaña **Administrador** → ingresá con `ADMIN_PASSWORD`.
2. **Usuarios** → **Nuevo usuario**: nombre, correo, planta y rol (**Editor** o **Lector**). Al crearlo se muestra su código personal **una sola vez**; enviáselo. Se puede regenerar, desactivar o eliminar en cualquier momento.
3. **Contenido** → reemplazá los textos provisionales de definiciones de KPI (Back Up).
4. **Ciclos** → crear ciclo (mes + fecha límite) → **Abrir a las plantas** (con opción de pre-cargar desde el mes anterior).
5. Para probar sin cargar nada: **Tablero** → **Cargar datos de ejemplo** (crea el ciclo "Demo / Ejemplo" con 3 plantas). Se borra desde **Ciclos → Eliminar**.

## Manual de uso (1 página)

**Usuarios de planta (Editor)**
- Ingresan con su correo + código personal → **Empezar el informe** o **Duplicar del mes anterior**.
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

## KPIs, versiones y avisos
- **📈 KPIs** (editor): formulario con los 7 KPIs del mes y semáforo contra la meta de la planta (verde cumple · amarillo cerca: hasta 10 pts por debajo de una meta mínima o 5 por encima de una máxima · rojo fuera). "Guardar y generar diapositiva" arma la diapositiva de KPIs (tabla editable). Con esos valores el consolidado incluye solo el **Resumen comparativo** de las plantas (se puede ocultar como cualquier diapositiva).
- **🕘 Versiones** (editor): se guardan automáticamente al enviar, reabrir, duplicar y cada ~10 min de edición (últimas 30). Se puede ver y restaurar una versión; la versión actual no se pierde.
- **"= mes anterior"**: las diapositivas idénticas a las del mes anterior se marcan en la columna izquierda y se advierte antes de enviar.
- **Correos (opcional)**: cargar en Netlify `GMAIL_USER` (cuenta Gmail) y `GMAIL_APP_PASSWORD` ([contraseña de aplicación](https://myaccount.google.com/apppasswords), requiere verificación en dos pasos). Opcional `ADMIN_NOTIFY_EMAIL` (uno o varios correos separados por coma) para avisar cuando una planta envía. Avisos manuales al abrir/cerrar un ciclo y botón **📧 Recordatorio** en Ciclos; además un **recordatorio automático diario** (≈9:00 Argentina) a los editores que no enviaron cuando faltan 2 días o menos. Sin esas variables la app funciona igual, sin correos.

## Archivo mensual (automático)
Al usar **Ciclos → Cerrar y archivar**, el sistema guarda solo y de forma congelada:
- **Por planta y mes**: el informe de cada planta (también las que no enviaron, marcadas como tal). Cada usuario de planta lo ve en **Historial de meses cerrados** en su inicio; sólo el de SU planta.
- **Consolidado del mes**: con el orden y las diapositivas ocultas que dejaste al cerrar. Está en **Archivo → Consolidado** (sólo corporativo), se puede presentar y exportar a PDF idéntico cuando haga falta.
- Es una copia: aunque después se edite el informe original, el archivo no cambia. Si reabrís un ciclo y lo cerrás de nuevo, el archivo de ese mes se actualiza.
- Eliminar un ciclo también elimina su archivo (pide confirmación).

## Seguridad
- **Usuarios individuales** (correo + código personal; sólo se guarda el hash SHA-256 con sal); sesión firmada HMAC de 12 h; 5 intentos fallidos/15 min por IP y usuario.
- **Roles**: *Editor* (arma, presenta y envía el informe de SU planta) y *Lector* (sólo ve y presenta SU planta). El administrador (contraseña en Netlify) ve todo.
- Un usuario de planta **nunca** puede ver ni editar informes de otras plantas, ni el consolidado, tampoco con el ciclo cerrado. Planta y rol se validan en el servidor en cada llamada: desactivar a alguien o cambiarlo de planta/rol se aplica al instante.
- HTML saneado con lista blanca al guardar y al mostrar; imágenes validadas por contenido (≤5 MB); CSP y cabeceras en `netlify.toml`.

## Desarrollo local (opcional, requiere Node 20+)
```
cd plant-reports && npm install
npm run dev        # http://localhost:8888  (admin: admin-dev, datos en .dev-data)
npm run test:api   # pruebas de la API (incluye aislamiento entre plantas)
```

## Estado por fases
- **Fase 1 (esta entrega)**: usuarios y permisos por planta (Editor/Lector), login, ciclos, editor (texto, imagen, tabla, "Puntos a destacar"), pegado/arrastre/compresión, autoguardado + respaldo local + bloqueo por versión, presentación, enviar/reabrir, tablero, consolidador (orden, ocultas, portada, agenda, Back Up) y PDF, duplicar mes anterior, demo.
- **Fase 2 (hecha)**: KPIs estructurados + resumen comparativo, aviso de contenido sin cambios, historial de versiones, archivo mensual congelado, correos y recordatorio diario. *Pendiente*: dividir tablas largas y orden por sección en el consolidado.
- **Fase 3**: importar PPTX, exportar HTML autocontenido.

## Pendientes / decisiones por defecto
- No llegaron los PPTX de ejemplo: **paleta, tipografía y logo son provisorios** (`web/css/slide.css`, `web/assets/logo.png`). Reemplazar el logo y pasar los PPTX a `reference/` para ajustar el tema.
- Textos de definición de KPI (Back Up) y metas de KPI por planta son provisorios (editables en el panel).
