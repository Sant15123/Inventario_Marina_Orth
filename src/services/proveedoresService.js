/**
 * SERVICIO OFICIAL SIGA-FMO: PROVEEDORES RECOMENDADOS
 * Fundación Marina Orth - Gestión de Compras y Adquisiciones
 */
import { supabase } from './supabase';

export const PROVEEDORES_RECOMENDADOS_DEFAULT = [
  {
    id: 'prov-001',
    nombre: 'Sigma Electrónica',
    url: 'https://www.sigmaelectronica.net',
    descripcion: 'Sensores especializados, placas Arduino, microcontroladores ESP32, módulos IoT y componentes de robótica.',
    created_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'prov-002',
    nombre: 'Dynamoelectronics',
    url: 'https://www.dynamoelectronics.com',
    descripcion: 'Servomotores, kits de robótica educativa, filamento para impresión 3D, baterías LiPo y hardware electromecánico.',
    created_at: '2026-01-12T10:00:00Z',
  },
  {
    id: 'prov-003',
    nombre: 'Panamericana Librería y Papelería',
    url: 'https://www.panamericana.com.co',
    descripcion: 'Papelería institucional, resmas de papel bond, marcadores borrables, guías pedagógicas y consumibles de oficina.',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'prov-004',
    nombre: 'Homecenter Colombia',
    url: 'https://www.homecenter.com.co',
    descripcion: 'Cajas organizadoras plásticas, herramientas de taller, cintas, tornillería y materiales de mantenimiento ligero.',
    created_at: '2026-01-18T10:00:00Z',
  },
  {
    id: 'prov-005',
    nombre: 'MercadoLibre Colombia',
    url: 'https://www.mercadolibre.com.co',
    descripcion: 'Catálogo multirubro con envíos directos para insumos pedagógicos, repuestos electrónicos y tecnología general.',
    created_at: '2026-01-20T10:00:00Z',
  },
];

const LOCAL_STORAGE_KEY = 'siga_proveedores_recomendados';

const notifyChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('siga:proveedores_changed'));
  }
};

export const getProveedoresRecomendados = async () => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('proveedores_recomendados')
        .select('*')
        .order('nombre', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch (_) {}
        return data;
      }
    }
  } catch (err) {
    console.warn('Aviso consulta Supabase proveedores_recomendados:', err?.message || err);
  }

  // Fallback a localStorage o semilla predeterminada
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  return PROVEEDORES_RECOMENDADOS_DEFAULT;
};

export const createProveedorRecomendado = async (proveedor, currentUser = null) => {
  const nuevoRegistro = {
    nombre: proveedor.nombre.trim(),
    url: proveedor.url.trim(),
    descripcion: proveedor.descripcion.trim(),
    created_by: currentUser?.nombre || currentUser?.id || 'Coordinación FMO',
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('proveedores_recomendados')
        .insert([nuevoRegistro])
        .select()
        .single();

      if (!error && data) {
        // Actualizar caché local
        const lista = await getProveedoresRecomendados();
        const actualizada = [data, ...lista.filter((p) => p.id !== data.id)];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
        notifyChange();
        return data;
      }
    }
  } catch (err) {
    console.warn('Fallback al crear proveedor en Supabase:', err?.message || err);
  }

  // Fallback local
  const itemLocal = {
    ...nuevoRegistro,
    id: `prov-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const lista = await getProveedoresRecomendados();
  const actualizada = [itemLocal, ...lista];
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
  } catch (_) {}
  notifyChange();
  return itemLocal;
};

export const updateProveedorRecomendado = async (id, patch) => {
  const datosActualizados = {
    nombre: patch.nombre ? patch.nombre.trim() : undefined,
    url: patch.url ? patch.url.trim() : undefined,
    descripcion: patch.descripcion ? patch.descripcion.trim() : undefined,
    updated_at: new Date().toISOString(),
  };

  // Limpiar campos undefined
  Object.keys(datosActualizados).forEach((key) => {
    if (datosActualizados[key] === undefined) delete datosActualizados[key];
  });

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('proveedores_recomendados')
        .update(datosActualizados)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const lista = await getProveedoresRecomendados();
        const actualizada = lista.map((p) => (p.id === id ? { ...p, ...data } : p));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
        notifyChange();
        return data;
      }
    }
  } catch (err) {
    console.warn('Fallback al actualizar proveedor en Supabase:', err?.message || err);
  }

  // Fallback local
  const lista = await getProveedoresRecomendados();
  const actualizada = lista.map((p) => (p.id === id ? { ...p, ...datosActualizados } : p));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
  } catch (_) {}
  notifyChange();
  return { id, ...datosActualizados };
};

export const deleteProveedorRecomendado = async (id) => {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('proveedores_recomendados')
        .delete()
        .eq('id', id);

      if (!error) {
        const lista = await getProveedoresRecomendados();
        const actualizada = lista.filter((p) => p.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
        notifyChange();
        return true;
      }
    }
  } catch (err) {
    console.warn('Fallback al eliminar proveedor en Supabase:', err?.message || err);
  }

  // Fallback local
  const lista = await getProveedoresRecomendados();
  const actualizada = lista.filter((p) => p.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(actualizada));
  } catch (_) {}
  notifyChange();
  return true;
};
