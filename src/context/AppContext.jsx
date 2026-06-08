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

  const addComment = useCallback((productId, text, autor) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          actividades: [
            {
              id: `A${Date.now()}`,
              tipo: 'comentario',
              autor,
              fecha: new Date().toISOString(),
              contenido: text,
            },
            ...p.actividades,
          ],
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const updateHitoEstado = useCallback((productId, etapaIdx, hitoId, nuevoEstado) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        const etapas = p.etapas.map((e, i) => {
          if (i !== etapaIdx) return e;
          const hitos = e.hitos.map((h) => {
            if (h.id !== hitoId) return h;
            return {
              ...h,
              estado: nuevoEstado,
              fechaCompletado: nuevoEstado === 'completado' ? new Date().toISOString().split('T')[0] : h.fechaCompletado,
            };
          });
          const allDone = hitos.every((h) => h.estado === 'completado');
          const anyProgress = hitos.some((h) => h.estado === 'completado' || h.estado === 'en_progreso');
          return {
            ...e,
            hitos,
            estado: allDone ? 'completado' : anyProgress ? 'en_progreso' : e.estado,
          };
        });
        return { ...p, etapas };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  const advanceStage = useCallback((productId) => {
    updateData((prev) => {
      const products = prev.products.map((p) => {
        if (p.id !== productId) return p;
        if (p.etapaActual >= 2) return p;
        const nextStage = p.etapaActual + 1;
        const etapas = p.etapas.map((e, i) => {
          if (i === p.etapaActual) return { ...e, estado: 'completado', fechaFin: new Date().toISOString().split('T')[0] };
          if (i === nextStage) return { ...e, estado: 'en_progreso', fechaInicio: new Date().toISOString().split('T')[0] };
          return e;
        });
        return {
          ...p,
          etapaActual: nextStage,
          etapas,
          actividades: [
            {
              id: `A${Date.now()}`,
              tipo: 'cambio_etapa',
              autor: 'Sistema',
              fecha: new Date().toISOString(),
              contenido: `Producto avanzó de ${p.etapas[p.etapaActual].nombre} a ${p.etapas[nextStage].nombre}`,
            },
            ...p.actividades,
          ],
        };
      });
      return { ...prev, products };
    });
  }, [updateData]);

  return (
    <AppContext.Provider value={{ data, addComment, updateHitoEstado, advanceStage }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
