# Deploy en SharePoint (Microsoft 365)

## 1. Crear la lista en SharePoint

Ir al sitio SharePoint donde se va a publicar la app y crear una lista:

1. **Configuración → Agregar una aplicación → Lista personalizada**
2. Nombre: `MGL_Discontinuados`
3. Agregar columna:
   - Nombre: `ProductData`
   - Tipo: **Varias líneas de texto** (Multiple lines of text)
   - Formato de texto: Texto sin formato
4. Guardar

> La columna `Title` ya existe por defecto — se usará para el ID del producto (CU-XXXXXX).

---

## 2. Buildear la app

```bash
npm install
npm run build
```

Esto genera la carpeta `dist/` con todos los archivos estáticos.

---

## 3. Subir archivos a SharePoint

### Opción A — Desde el navegador

1. Ir al sitio SharePoint
2. **Documentos → Nuevo → Carpeta** → llamarla `DiscontinuadosApp`
3. Subir **todo el contenido de la carpeta `dist/`** (index.html + carpeta assets/)
4. Subir también la carpeta `dist/assets/` con su contenido

### Opción B — Con SharePoint CLI (si tienen acceso)

```bash
m365 spo file add --webUrl https://empresa.sharepoint.com/sites/megalabs \
  --folder "Documentos Compartidos/DiscontinuadosApp" \
  --path ./dist/index.html
```

---

## 4. Acceder a la app

URL de acceso directo:

```
https://tuempresa.sharepoint.com/sites/SITIO/Documentos%20Compartidos/DiscontinuadosApp/index.html
```

> **Primera vez**: la app detecta que la lista está vacía y carga automáticamente los 8 productos demo. Después todos los cambios se guardan en SharePoint.

---

## 5. Permisos

- Los usuarios necesitan **permiso de lectura/escritura** en el sitio SharePoint
- Los permisos de la lista `MGL_Discontinuados` heredan los del sitio por defecto
- Para restringir quién puede editar: configurar permisos específicos en la lista desde SharePoint

---

## Desarrollo local

Crear archivo `.env.local` (no subir al repo):

```
VITE_SP_SITE_URL=https://tuempresa.sharepoint.com/sites/megalabs
```

Luego:

```bash
npm run dev
```

En modo desarrollo usa `localStorage` para no afectar datos de producción.
