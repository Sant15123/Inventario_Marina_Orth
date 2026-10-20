const BACKEND_PORT = 3000;
const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
export const API_BASE_URL = `http://${hostname}:${BACKEND_PORT}`;
const API_BASE = import.meta.env.VITE_API_URL || `${API_BASE_URL}/api`;

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.message || json?.error || `Error HTTP ${res.status} al consultar ${path}`;
    const error = new Error(message);
    error.status = res.status;
    error.response = json;
    throw error;
  }

  return json;
}

export const inventoryApi = {
  // 1. Activos
  getActivos: async () => {
    const json = await request('/activos');
    if (!json || !Array.isArray(json.data)) {
      throw new Error('Respuesta inválida de la API de activos: se esperaba un arreglo');
    }
    return json.data;
  },

  getActivoByPlaca: async (placa) => {
    const json = await request(`/activos/${encodeURIComponent(placa)}`);
    if (!json || !json.data) {
      throw new Error(`No se encontró el activo con placa ${placa}`);
    }
    return json.data;
  },

  createActivo: async (data) => {
    const json = await request('/activos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json.data;
  },

  updateActivo: async (placa, updates) => {
    const json = await request(`/activos/${encodeURIComponent(placa)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  // 2. Consumibles
  getConsumibles: async () => {
    const json = await request('/consumibles');
    if (!json || !Array.isArray(json.data)) {
      throw new Error('Respuesta inválida de la API de consumibles: se esperaba un arreglo');
    }
    return json.data;
  },

  getConsumibleById: async (id) => {
    // Intentar consulta directa al endpoint específico si existe
    try {
      const json = await request(`/consumibles/${encodeURIComponent(id)}`);
      if (json?.data) return json.data;
      if (json && typeof json === 'object' && json.id) return json;
    } catch {
      // Fallback a lista completa
    }

    // Buscar en la lista de consumibles
    const jsonAll = await request('/consumibles');
    const list = Array.isArray(jsonAll?.data) ? jsonAll.data : (Array.isArray(jsonAll) ? jsonAll : []);
    const normalizedId = String(id).toLowerCase().trim();
    const found = list.find((c) => String(c.id).toLowerCase().trim() === normalizedId);
    if (!found) {
      throw new Error(`Material o consumible con código "${id}" no encontrado`);
    }
    return found;
  },

  // Obtener ítem universal (sea equipo tecnológico o material de robótica)
  getItemUniversal: async (id) => {
    const isRob = String(id).toLowerCase().startsWith('rob');
    if (isRob) {
      try {
        const c = await inventoryApi.getConsumibleById(id);
        return { ...c, __tipo: 'consumible' };
      } catch {
        // Fallback a activos
      }
    }

    try {
      const a = await inventoryApi.getActivoByPlaca(id);
      return { ...a, __tipo: 'equipo' };
    } catch (errActivo) {
      // Si falló activo, intentar buscar en consumibles
      try {
        const c = await inventoryApi.getConsumibleById(id);
        return { ...c, __tipo: 'consumible' };
      } catch {
        throw new Error(errActivo.message || `No se encontró ningún activo o material con el código "${id}"`);
      }
    }
  },

  // 3. Préstamos
  getPrestamos: async () => {
    const json = await request('/prestamos');
    if (!json || !Array.isArray(json.data)) {
      throw new Error('Respuesta inválida de la API de préstamos: se esperaba un arreglo');
    }
    return json.data;
  },

  createPrestamo: async (data) => {
    const json = await request('/prestamos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json.data;
  },

  devolverPrestamo: async (id) => {
    const json = await request(`/prestamos/${id}/devolver`, {
      method: 'PUT',
    });
    return json.data;
  },

  // 2.1 Entregas y Remisiones de Consumibles
  getRemisiones: async () => {
    const json = await request('/consumibles/remisiones');
    if (!json || !Array.isArray(json.data)) {
      return [];
    }
    return json.data;
  },

  createRemision: async (data) => {
    const json = await request('/consumibles/remisiones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json.data;
  },

  getEntregas: async () => {
    const json = await request('/consumibles/entregas');
    if (!json || !Array.isArray(json.data)) {
      return [];
    }
    return json.data;
  },

  createEntrega: async (data) => {
    const json = await request('/consumibles/entregas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json.data;
  },

  // Compatibilidad genérica directa con endpoints de la API
  getAll: async () => {
    const json = await request('/consumibles');
    return Array.isArray(json?.data) ? json.data : [];
  },

  get: async (id) => {
    // Si parece una placa de activo
    try {
      const activo = await request(`/activos/${encodeURIComponent(id)}`);
      if (activo?.data) return activo.data;
    } catch {
      // continuar a consumibles
    }
    const consumibles = await request('/consumibles');
    const found = consumibles?.data?.find((c) => String(c.id) === String(id));
    if (!found) throw new Error(`Elemento con ID ${id} no encontrado`);
    return found;
  },

  create: async (data) => {
    if (data.itemType === 'equipo' || data.placa) {
      return inventoryApi.createActivo(data);
    }
    const json = await request('/consumibles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json.data;
  },

  update: async (id, patch) => {
    // Actualizar consumible o activo
    const json = await request(`/consumibles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }).catch(async () => {
      return await request(`/activos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
    });
    return json?.data || patch;
  },

  remove: async (id) => {
    const json = await request(`/consumibles/${id}`, {
      method: 'DELETE',
    }).catch(async () => {
      return await request(`/activos/${id}`, {
        method: 'DELETE',
      });
    });
    return json?.data;
  },
};

export default inventoryApi;
