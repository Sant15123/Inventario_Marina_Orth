const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

  // 2. Consumibles
  getConsumibles: async () => {
    const json = await request('/consumibles');
    if (!json || !Array.isArray(json.data)) {
      throw new Error('Respuesta inválida de la API de consumibles: se esperaba un arreglo');
    }
    return json.data;
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
};

export default inventoryApi;
