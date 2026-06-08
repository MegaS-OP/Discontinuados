import { SP_SITE_URL, SP_LIST_NAME } from '../config';

const API = `${SP_SITE_URL}/_api/web/lists/getbytitle('${SP_LIST_NAME}')`;

// Cabeceras para lecturas
const READ_HEADERS = {
  Accept: 'application/json;odata=nometadata',
};

// Obtiene el Request Digest necesario para escrituras en SharePoint
async function getDigest() {
  const res = await fetch(`${SP_SITE_URL}/_api/contextinfo`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json;odata=nometadata' },
  });
  if (!res.ok) throw new Error('No se pudo obtener el digest de SharePoint');
  const data = await res.json();
  return data.FormDigestValue;
}

// Carga todos los productos desde la lista
export async function spLoadProducts() {
  const res = await fetch(
    `${API}/items?$select=Id,Title,ProductData&$orderby=Title asc`,
    { credentials: 'include', headers: READ_HEADERS }
  );
  if (!res.ok) throw new Error(`Error al cargar datos: ${res.status}`);
  const data = await res.json();
  return data.value.map((item) => ({
    _spId: item.Id,
    ...JSON.parse(item.ProductData),
  }));
}

// Crea un producto nuevo en la lista
export async function spCreateProduct(product) {
  const digest = await getDigest();
  const res = await fetch(`${API}/items`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json;odata=nometadata',
      'Content-Type': 'application/json;odata=nometadata',
      'X-RequestDigest': digest,
    },
    body: JSON.stringify({
      Title: product.id,
      ProductData: JSON.stringify(product),
    }),
  });
  if (!res.ok) throw new Error(`Error al crear producto: ${res.status}`);
  const data = await res.json();
  return data.Id;
}

// Actualiza un producto existente (requiere el ID interno de SharePoint)
export async function spUpdateProduct(spId, product) {
  const digest = await getDigest();
  const res = await fetch(`${API}/items(${spId})`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json;odata=nometadata',
      'Content-Type': 'application/json;odata=nometadata',
      'X-RequestDigest': digest,
      'X-HTTP-Method': 'MERGE',
      'IF-MATCH': '*',
    },
    body: JSON.stringify({
      Title: product.id,
      ProductData: JSON.stringify(product),
    }),
  });
  if (!res.ok) throw new Error(`Error al actualizar producto: ${res.status}`);
}

// Carga inicial con fallback a datos demo si la lista está vacía
export async function spInitializeIfEmpty(demoProducts) {
  const products = await spLoadProducts();
  if (products.length > 0) return products;
  // Lista vacía: cargar datos demo
  for (const p of demoProducts) {
    await spCreateProduct(p);
  }
  return spLoadProducts();
}
