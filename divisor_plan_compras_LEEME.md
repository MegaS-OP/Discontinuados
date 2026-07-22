# Divisor de plan de compras — Guía rápida

Herramienta para separar un plan de compras (Excel `.xlsx`) en un archivo por
país / compañía, conservando el formato original (fechas, moneda, negritas,
colores, anchos de columna, celdas combinadas y fórmulas).

**Todo pasa en tu navegador. Ningún archivo se sube a internet.**

Es un único archivo: `divisor_plan_compras.html`.

---

## Cómo se usa (para el equipo)

1. Abrí la herramienta (doble clic al archivo, o el link de Netlify).
2. Arrastrá tu Excel `.xlsx` o hacé clic para elegirlo.
3. La herramienta detecta sola la columna de país/compañía. Si no la detecta:
   - revisá el número de **Filas de encabezado**, y
   - elegí la columna a mano en la lista, o escribí el nombre de tu columna en
     el campo "¿Tu columna se llama distinto?".
4. (Opcional) Poné un **prefijo** para los nombres de archivo (ej: `Megalabs`,
   `Plan-Agosto`).
5. (Opcional) Usá **Ver detalle** para revisar las primeras 5 filas de un grupo
   antes de generar.
6. Clic en **Generar** → se descarga un `.zip` con un Excel por cada grupo.

---

## Cómo probar los cambios en tu compu (sin saber programar)

No necesitás instalar nada. Solo hacé **doble clic** en el archivo
`divisor_plan_compras.html`; se abre en tu navegador y ya funciona.

> Necesita conexión a internet la primera vez que lo abrís, porque carga unas
> librerías desde la web.

---

## Cómo subirlo a Netlify para compartir el link

La forma más simple, **sin build ni carpetas**:

1. Entrá a https://app.netlify.com/drop
2. Arrastrá **solo** el archivo `divisor_plan_compras.html` a la página.
3. Netlify te da un link público al toque. Ese es el link que compartís con el
   equipo.

Si querés que el link termine en algo más lindo (ej. `divisor-megalabs`),
en Netlify entrá al sitio → **Site settings → Change site name**.

Para actualizar la herramienta más adelante: volvé a
https://app.netlify.com/drop y arrastrá el archivo nuevo (o, si ya tenés el
sitio creado, usá "Deploys" → arrastrar el archivo).

> No hace falta pasar el proyecto a Vite. Como es un solo HTML autocontenido,
> Netlify Drop alcanza y sobra, y así sigue funcionando también por doble clic.
