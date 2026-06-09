import { createContext, useContext, useState, useCallback } from 'react';
import { loadData, saveData } from '../data/db';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(() => loadData());

  const updateData = useCallback((updater) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  const addComment = useCallback((productId, text) => {
    updateData((prev) => {
      const now = new Date();
      const ts =
        now.getDate().toString().padStart(2, '0') +
        '/' +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        ' ' +
        now.getHours().toString().padStart(2, '0') +
        ':' +
        now.getMinutes().toString().padStart(2, '0');
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          actividades: [
            { id: `A${Date.now()}`, text: `Ariana S. (S&OP Global): ${text}`, time: ts },
            ...p.actividades,
          ],
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const toggleHito = useCallback((productId, hitoId) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        const hitos = p.hitos.map((h) => {
          if (h.id !== hitoId) return h;
          const now = new Date();
          const date = now.getDate().toString().padStart(2, '0') + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getFullYear();
          return { ...h, done: !h.done, fechaReal: !h.done ? date : '-' };
        });
        const done = hitos.filter((h) => h.done).length;
        const progreso = Math.round((done / hitos.length) * 100);
        const lastDone = [...hitos].reverse().find((h) => h.done);
        return {
          ...p,
          hitos,
          progreso,
          ultimoHito: lastDone ? lastDone.label : p.ultimoHito,
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const updateHitoExtras = useCallback((productId, hitoId, extras) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          hitos: p.hitos.map((h) => h.id !== hitoId ? h : { ...h, ...extras }),
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const advanceStage = useCallback((productId) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId || p.etapaActual >= 2) return p;
        const next = p.etapaActual + 1;
        const etapas = p.etapas.map((e, i) => {
          if (i === p.etapaActual) return { ...e, estado: 'completado' };
          if (i === next) return { ...e, estado: 'en_progreso' };
          return e;
        });
        const now = new Date();
        const ts =
          now.getDate().toString().padStart(2, '0') +
          '/' +
          (now.getMonth() + 1).toString().padStart(2, '0') +
          ' ' +
          now.getHours().toString().padStart(2, '0') +
          ':' +
          now.getMinutes().toString().padStart(2, '0');
        return {
          ...p,
          etapaActual: next,
          etapas,
          actividades: [
            {
              id: `A${Date.now()}`,
              text: `Avance de etapa: ${p.etapas[p.etapaActual].nombre} → ${p.etapas[next].nombre}`,
              time: ts,
            },
            ...p.actividades,
          ],
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const addProduct = useCallback((product) => {
    updateData((prev) => ({ ...prev, products: [...prev.products, product] }));
  }, [updateData]);

  const addProducts = useCallback((newProducts) => {
    updateData((prev) => ({ ...prev, products: [...prev.products, ...newProducts] }));
  }, [updateData]);

  return (
    <AppContext.Provider value={{ data, addComment, toggleHito, advanceStage, addProduct, addProducts, updateHitoExtras }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
