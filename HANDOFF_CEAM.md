# Traspaso — App "Seguimiento de Abastecimiento CEAM"

Guía para que cualquier persona pueda mantener y mejorar la app desde su propio
**Claude Code**. Leé esto completo antes de tocar nada.

---

## 1. Qué es la app

Un tablero operativo (Kanban + cronograma en días hábiles + medidor de carga de
bodega + analítica) para seguir órdenes de compra del HUB CEAM.

- **Link en vivo:** https://abastecimiento-ceam.web.app
- **Repositorio:** `arianavinzon-blip/Discontinuados` (GitHub)
- **Rama de trabajo:** `claude/app-cambios-tracking-dinamica-i9wkbx`
- **El código de la app está en UN SOLO archivo:** [`public/cambios.html`](public/cambios.html)

> ⚠️ Importante: `public/cambios.html` es **autocontenido** (HTML + CSS + JavaScript
> en el mismo archivo, ~1200 líneas). El 99 % de los cambios se hacen ahí. El logo
> va embebido en base64 y la única dependencia externa es la librería `xlsx` (CDN)
> y el SDK de Firebase (CDN). No hay build: lo que está en el archivo es lo que se
> publica.

Hay además una app React aparte en el mismo repo (carpeta `src/`, "Discontinuados"),
que es **otro proyecto distinto**. Para la app CEAM **no toques `src/`**.

---

## 2. Cómo se publica (automático, sin terminal)

La publicación es automática con **GitHub Actions**:

- Workflow: [`.github/workflows/deploy-ceam.yml`](.github/workflows/deploy-ceam.yml)
- **Cada vez que se hace `push` a la rama `claude/app-cambios-tracking-dinamica-i9wkbx`**
  y cambió `public/cambios.html` (o `firebase.json` / `.firebaserc`), se publica solo
  a Firebase Hosting en ~1 minuto.
- Usa el secreto de repositorio **`FIREBASE_SERVICE_ACCOUNT_CEAM`** (ya está cargado;
  no hay que hacer nada con él).

**Conclusión: para publicar un cambio, solo hay que hacer commit + push a esa rama.**
No hay que correr `firebase deploy` ni tocar la terminal.

Se puede ver el estado de cada publicación en la pestaña **Actions** del repo
(workflow "Publicar CEAM (Firebase Hosting)").

---

## 3. La base de datos (tiempo real, multiusuario)

- **Firebase Realtime Database**, proyecto **`abastecimiento-ceam`** (separado de
  la app Discontinuados).
- Los datos del tablero viven en el nodo **`abastecimiento_ceam`**.
- La configuración de conexión está **embebida al final de `public/cambios.html`**,
  en el `<script type="module">` (objeto `firebaseConfig`). Son claves de cliente,
  públicas por diseño; no son secretas.
- La app funciona por **tiempo real**: si alguien edita, a los demás se les refresca
  el tablero solo (listener `onValue`). El nombre del editor queda local a cada
  navegador (no se comparte).
- Si Firebase no responde, la app sigue andando con `localStorage` como respaldo.

Para cambiar datos/reglas hace falta acceso al proyecto Firebase (ver punto 6). Para
cambiar **código** de la app, NO hace falta Firebase.

---

## 4. Cómo hacer un cambio con Claude Code (paso a paso)

1. Cloná el repo y ubicate en la rama de trabajo:
   ```bash
   git clone https://github.com/arianavinzon-blip/Discontinuados.git
   cd Discontinuados
   git checkout claude/app-cambios-tracking-dinamica-i9wkbx
   ```
2. Abrí Claude Code en esa carpeta y pedile el cambio (ver "prompt de arranque" abajo).
3. El cambio casi siempre es sobre **`public/cambios.html`**.
4. Verificá que no rompiste la sintaxis del JavaScript antes de publicar:
   ```bash
   # extrae el <script> principal y lo chequea con node
   node --check <(sed -n '/^<script>$/,/^<\/script>$/p' public/cambios.html | sed '1d;$d')
   ```
   (o simplemente abrí el archivo localmente en el navegador y probá.)
5. Commit + push a la rama de trabajo:
   ```bash
   git add public/cambios.html
   git commit -m "descripción del cambio"
   git push origin claude/app-cambios-tracking-dinamica-i9wkbx
   ```
6. Esperá ~1 minuto y refrescá https://abastecimiento-ceam.web.app con **Ctrl+F5**.

---

## 5. Prompt de arranque para pegar en Claude Code

> Estoy tomando el mantenimiento de una app web llamada "Seguimiento de
> Abastecimiento CEAM". Es un archivo HTML autocontenido en `public/cambios.html`
> (HTML + CSS + JS juntos), conectado a Firebase Realtime Database (proyecto
> `abastecimiento-ceam`, nodo `abastecimiento_ceam`) para tiempo real multiusuario.
> Se publica solo a Firebase Hosting con GitHub Actions al hacer push a la rama
> `claude/app-cambios-tracking-dinamica-i9wkbx`. Leé `HANDOFF_CEAM.md` y
> `public/cambios.html` para entender la estructura. Cuando te pida un cambio,
> editá `public/cambios.html`, cuidá de no romper el bloque de Firebase ni la
> sintaxis, y dejá el commit listo para pushear a esa rama.

---

## 6. Accesos que necesita la persona (los da la dueña de la cuenta)

- **GitHub (obligatorio para publicar):** ser **colaborador con permiso de escritura**
  del repo `arianavinzon-blip/Discontinuados`.
  Se agrega en: repo → **Settings → Collaborators → Add people**.
- **Firebase (solo si va a tocar datos o reglas):** ser miembro del proyecto
  `abastecimiento-ceam`.
  Se agrega en: Firebase Console → proyecto → ⚙ → **Usuarios y permisos → Agregar miembro**.

---

## 7. Reglas de oro (para no romper nada)

- Editá **solo `public/cambios.html`** para la app CEAM. No toques `src/` (es otra app).
- **No borres ni modifiques** el `<script type="module">` de Firebase al final del
  archivo (es lo que da el tiempo real). Si cambia el proyecto Firebase, se actualiza
  ahí el objeto `firebaseConfig`.
- Hacé **cambios chicos y frecuentes**: cada push publica, así es fácil ver qué rompió
  algo y volver atrás (`git revert`).
- Probá siempre después de publicar, refrescando con **Ctrl+F5**.
- Ante la duda, pedile a Claude Code que te explique la parte del archivo antes de cambiarla.
