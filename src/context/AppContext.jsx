import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { db } from '../firebase';
import { initialData } from '../data/db';

const AppContext = createContext(null);

const DATA_PATH = 'discontinuados';

export function AppProvider({ children }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const dataRef = ref(db, DATA_PATH);
    const unsubscribe = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.val());
      } else {
        set(dataRef, initialData);
        setData(initialData);
      }
    });
    return () => unsubscribe();
  }, []);

  const updateData = useCallback((updater) => {
    const dataRef = ref(db, DATA_PATH);
    get(dataRef).then((snapshot) => {
      const prev = snapshot.exists() ? snapshot.val() : initialData;
      const next = updater(prev);
      set(dataRef, next);
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
            ...(p.actividades || []),
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
        const toggledHito = hitos.find((h) => h.id === hitoId);
        let etapaActual = p.etapaActual;
        let etapas = p.etapas;
        let actividades = p.actividades || [];
        if (toggledHito?.label === 'Inventario PT' && toggledHito.done && p.etapaActual === 0) {
          etapaActual = 1;
          etapas = p.etapas.map((e, i) => {
            if (i === 0) return { ...e, estado: 'completado' };
            if (i === 1) return { ...e, estado: 'en_progreso' };
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
          actividades = [
            { id: `A${Date.now()}`, text: `Avance de etapa: ${p.etapas[0].nombre} → ${p.etapas[1].nombre}`, time: ts },
            ...actividades,
          ];
        }
        return {
          ...p,
          hitos,
          progreso,
          ultimoHito: lastDone ? lastDone.label : p.ultimoHito,
          etapaActual,
          etapas,
          actividades,
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
            ...(p.actividades || []),
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

  if (data === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#5F5E5A' }}>
        Cargando datos...
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ data, addComment, toggleHito, advanceStage, addProduct, addProducts, updateHitoExtras }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
