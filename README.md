# Tracking de Iniciativas S&OP · Megalabs

Torre de Control de Iniciativas Estratégicas del equipo S&OP Global, convertida de demo HTML a **aplicación multiusuario** con:

- **Frontend**: mismo diseño exacto de la demo (`public/index.html`), con la fecha del día real.
- **Backend**: API REST en Node.js puro, sin dependencias externas (`server.js`).
- **Base de datos**: archivo `data/iniciativas.json` en el servidor, creado automáticamente con las 17 iniciativas iniciales (`seed/iniciativas-iniciales.json`).
- **Sincronización en vivo**: si una persona crea, edita, cambia de estado o elimina una iniciativa, todos los demás lo ven **automáticamente, sin recargar la página** (Server-Sent Events).

## Requisitos

Solo **Node.js 18 o superior** (https://nodejs.org — versión LTS). Nada más: sin `npm install`, sin base de datos externa.

## Cómo arrancarla

```bash
node server.js
```

(En Windows también podés hacer doble clic en `iniciar.bat`.)

Después abrí **http://localhost:3000** en el navegador. La primera vez se crea la base con las 17 iniciativas iniciales.

## Cómo la usan varias personas a la vez

Todos deben apuntar al **mismo servidor** (una sola computadora corre `node server.js`; el resto solo abre el navegador):

1. **Prueba rápida en tu propia máquina**: abrí dos navegadores (o una ventana normal y una de incógnito) en `http://localhost:3000`. Cambiá el estado de una iniciativa en uno y mirá cómo se actualiza el otro solo.
2. **En la red de la oficina (LAN/VPN)**: averiguá tu IP local (`ipconfig` en Windows → "Dirección IPv4", ej. `192.168.1.50`) y compartí el link `http://192.168.1.50:3000`. Requisitos: tu máquina encendida con el servidor corriendo, y que el firewall de Windows permita Node.js en red privada (lo pregunta la primera vez).
3. **Uso permanente para todo el equipo**: pedir a TI un pequeño servidor interno (o máquina virtual) con Node.js donde dejar corriendo `node server.js` como servicio, y compartir esa URL interna. Alternativamente, desplegar en un servicio en la nube (Render, Railway, Azure App Service) si TI lo autoriza.

## Estructura

```
server.js                     → backend: API REST + eventos en vivo + persistencia
public/index.html             → frontend (diseño original intacto)
public/vendor/chart.umd.min.js→ Chart.js 4.4.1 local (no depende de CDN externos)
seed/iniciativas-iniciales.json → las 17 iniciativas semilla
data/iniciativas.json         → base de datos (se crea sola; no se versiona en git)
iniciar.bat                   → arranque con doble clic en Windows
```

## API (por si se quiere integrar con otra herramienta)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/iniciativas` | Lista completa |
| POST | `/api/iniciativas` | Crear (requiere `titulo` y `estado`) |
| PUT | `/api/iniciativas/:id` | Editar |
| DELETE | `/api/iniciativas/:id` | Eliminar |
| POST | `/api/import` | Importar `{mode: "replace"|"append", initiatives: [...]}` |
| POST | `/api/restore` | Restaurar las 17 iniciativas iniciales |
| GET | `/api/events` | Stream de eventos en vivo (SSE) |

## Respaldo

- El botón **Compartir → Exportar** descarga un JSON de respaldo con todas las iniciativas.
- El archivo `data/iniciativas.json` del servidor es la base: copiarlo alcanza como backup.

## Notas

- La fecha "hoy" para semáforos y días restantes es la **fecha real del día** (ya no está fija en 06-jul-2026).
- Los cambios simultáneos de varias personas se aceptan todos; si dos personas editan la **misma** iniciativa a la vez, vale la última que guarda, y ambas ven el resultado final al instante.
- El Roadmap muestra el horizonte Julio–Diciembre 2026, igual que la demo.
