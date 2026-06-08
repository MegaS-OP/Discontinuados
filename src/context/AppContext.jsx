import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialProducts } from '../data/db';
import { spLoadProducts, spUpdateProduct, spInitializeIfEmpty } from '../data/sharepoint';

const IS_LOCAL = Boolean(import.meta.env.VITE_SP_SITE_URL === undefined && import.meta.env.DEV);

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga inicial
  useEffect(() => {
    async function load() {
      try {
        if (IS_LOCAL) {
          // Desarrollo local: usa localStorage
          const stored = localStorage.getItem('mgl_dev_data');
          setProducts(stored ? JSON.parse(stored) : initialProducts);
        } else {
          // SharePoint
          const data = await spInitializeIfEmpty(initialProducts);
          setProducts(data);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Persiste un producto actualizado
  const persistProduct = useCallback(async (updated) => {
    if (IS_LOCAL) {
      setProducts((prev) => {
        const next = prev.map((p) => (p.id === updated.id ? updated : p));
        localStorage.setItem('mgl_dev_data', JSON.stringify(next));
        return next;
      });
    } else {
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      await spUpdateProduct(updated._spId, updated);
    }
  }, []);

  const addComment = useCallback(async (productId, text) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const now = new Date();
    const ts =
      now.getDate().toString().padStart(2, '0') +
      '/' +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      ' ' +
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');
    const updated = {
      ...product,
      actividades: [
        { id: `A${Date.now()}`, text: `${text}`, time: ts },
        ...product.actividades,
      ],
    };
    await persistProduct(updated);
  }, [products, persistProduct]);

  const toggleHito = useCallback(async (productId, hitoId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const now = new Date();
    const date =
      now.getDate().toString().padStart(2, '0') +
      '/' +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      '/' +
      now.getFullYear();
    const hitos = product.hitos.map((h) => {
      if (h.id !== hitoId) return h;
      return { ...h, done: !h.done, date: !h.done ? date : '-' };
    });
    const done = hitos.filter((h) => h.done).length;
    const progreso = Math.round((done / hitos.length) * 100);
    const lastDone = [...hitos].reverse().find((h) => h.done);
    const updated = {
      ...product,
      hitos,
      progreso,
      ultimoHito: lastDone ? lastDone.label : product.ultimoHito,
    };
    await persistProduct(updated);
  }, [products, persistProduct]);

  const advanceStage = useCallback(async (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.etapaActual >= 2) return;
    const next = product.etapaActual + 1;
    const now = new Date();
    const ts =
      now.getDate().toString().padStart(2, '0') +
      '/' +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      ' ' +
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');
    const updated = {
      ...product,
      etapaActual: next,
      etapas: product.etapas.map((e, i) => {
        if (i === product.etapaActual) return { ...e, estado: 'completado' };
        if (i === next) return { ...e, estado: 'en_progreso' };
        return e;
      }),
      actividades: [
        {
          id: `A${Date.now()}`,
          text: `Avance: ${product.etapas[product.etapaActual].nombre} → ${product.etapas[next].nombre}`,
          time: ts,
        },
        ...product.actividades,
      ],
    };
    await persistProduct(updated);
  }, [products, persistProduct]);

  return (
    <AppContext.Provider value={{ products, loading, error, addComment, toggleHito, advanceStage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
