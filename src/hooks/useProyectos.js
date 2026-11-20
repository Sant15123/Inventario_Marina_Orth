import { useState, useEffect, useCallback } from 'react';
import inventoryApi from '../services/inventoryApi';
import {
  PROYECTOS_STEAM_OFICIALES,
  formatProyectoLabel,
  normalizeProyectoNombre,
} from '../constants/proyectos';

const STORAGE_KEY = 'siga_proyectos_steam';

/**
 * Hook centralizado para consumir los Proyectos STEAM oficiales de SIGA-FMO.
 * Fuente única de verdad para Administrador, Coordinador, Supervisor, Operador y Usuario.
 */
export function useProyectos() {
  const [proyectos, setProyectos] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignorar fallo de parseo
    }
    return PROYECTOS_STEAM_OFICIALES;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProyectos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getProyectos();
      if (Array.isArray(data) && data.length > 0) {
        // Ordenar alfabéticamente por nombre
        const ordenados = [...data].sort((a, b) => {
          const nomA = (a.nombre || a.name || '').toLowerCase();
          const nomB = (b.nombre || b.name || '').toLowerCase();
          return nomA.localeCompare(nomB, 'es');
        });
        setProyectos(ordenados);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ordenados));
        } catch (e) {}
      } else {
        // Si la API retorna vacío, usar catálogo canónico
        setProyectos(PROYECTOS_STEAM_OFICIALES);
      }
    } catch (err) {
      console.warn('Fallo al obtener proyectos de la API. Usando catálogo canónico FMO:', err);
      setError(err);
      // Mantener proyectos en caché o fallback canónico
      setProyectos((prev) => (prev && prev.length > 0 ? prev : PROYECTOS_STEAM_OFICIALES));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProyectos();
  }, [fetchProyectos]);

  return {
    proyectos,
    loading,
    error,
    refetch: fetchProyectos,
    formatLabel: formatProyectoLabel,
    canonicalName: normalizeProyectoNombre,
  };
}

export default useProyectos;
