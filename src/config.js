// Auto-detecta la URL del sitio SharePoint cuando la app corre desde una
// document library. Si corrés en local (npm run dev), usa VITE_SP_SITE_URL.
function detectSiteUrl() {
  const env = import.meta.env.VITE_SP_SITE_URL;
  if (env) return env.replace(/\/$/, '');

  // En SharePoint la URL tiene la forma:
  // https://tenant.sharepoint.com/sites/SITIO/Libreria/index.html
  // Extraemos hasta el segmento /sites/SITIO
  const path = window.location.pathname;
  const match = path.match(/^(\/sites\/[^/]+)/);
  if (match) return window.location.origin + match[1];

  // Fallback: raíz del tenant (sitio raíz)
  return window.location.origin;
}

export const SP_SITE_URL = detectSiteUrl();
export const SP_LIST_NAME = 'MGL_Discontinuados';
