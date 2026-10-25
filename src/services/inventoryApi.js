// Configuración dinámica y tolerante a fallos para la URL base de la API
export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // Si estamos en producción (Vercel o HTTPS) usar el backend en Render
  if (typeof window !== 'undefined' && window.location) {
    const isVercel = window.location.hostname.includes('vercel.app');
    const isHttps = window.location.protocol === 'https:';
    if (isVercel || isHttps) {
      return 'https://inventario-marina-back.onrender.com/api';
    }
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

export const API_BASE = getBaseUrl();
export const API_BASE_URL = API_BASE.replace(/\/api\/?$/, '');

export function getAuthToken() {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('siga_token') : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
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

// Normalizador universal de respuestas tipo arreglo
export const extraerArreglo = (res) => {
  const data = res?.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.activos)) return data.activos;
  if (data && Array.isArray(data.equipos)) return data.equipos;
  if (data && Array.isArray(data.consumibles)) return data.consumibles;
  if (data && Array.isArray(data.prestamos)) return data.prestamos;
  if (data && Array.isArray(data.historial)) return data.historial;
  if (data && Array.isArray(data.proyectos)) return data.proyectos;
  if (data && Array.isArray(data.usuarios)) return data.usuarios;
  if (data && Array.isArray(data.remisiones)) return data.remisiones;
  if (data && Array.isArray(data.entregas)) return data.entregas;
  console.warn('Estructura de respuesta inesperada (se esperaba arreglo):', data);
  return []; // Fallback seguro para no romper la interfaz
};

export const inventoryApi = {
  // 1. Activos
  getActivos: async () => {
    const json = await request('/activos');
    return extraerArreglo(json);
  },

  getActivoByPlaca: async (placa) => {
    const json = await request(`/activos/${encodeURIComponent(placa)}`);
    const data = json?.data !== undefined ? json.data : json;
    if (!data) {
      throw new Error(`No se encontró el activo con placa ${placa}`);
    }
    return data;
  },

  createActivo: async (data) => {
    const json = await request('/activos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  updateActivo: async (placa, updates) => {
    const json = await request(`/activos/${encodeURIComponent(placa)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 2. Consumibles
  getConsumibles: async () => {
    const json = await request('/consumibles');
    return extraerArreglo(json);
  },

  getConsumibleById: async (id) => {
    // Intentar consulta directa al endpoint específico si existe
    try {
      const json = await request(`/consumibles/${encodeURIComponent(id)}`);
      const data = json?.data !== undefined ? json.data : json;
      if (data && typeof data === 'object' && (data.id || data.codigo)) return data;
    } catch {
      // Fallback a lista completa
    }

    // Buscar en la lista de consumibles
    const jsonAll = await request('/consumibles');
    const list = extraerArreglo(jsonAll);
    const normalizedId = String(id).toLowerCase().trim();
    const found = list.find((c) => String(c.id || c.codigo || '').toLowerCase().trim() === normalizedId);
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
    return extraerArreglo(json);
  },

  createPrestamo: async (data) => {
    const json = await request('/prestamos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  devolverPrestamo: async (id) => {
    const json = await request(`/prestamos/${id}/devolver`, {
      method: 'PUT',
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 2.1 Entregas y Remisiones de Consumibles
  getRemisiones: async () => {
    const json = await request('/consumibles/remisiones');
    return extraerArreglo(json);
  },

  createRemision: async (data) => {
    const json = await request('/consumibles/remisiones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  getEntregas: async () => {
    const json = await request('/consumibles/entregas');
    return extraerArreglo(json);
  },

  createEntrega: async (data) => {
    const json = await request('/consumibles/entregas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 4. Historial Universal y Auditoría
  getHistorial: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const endpoint = qs ? `/historial?${qs}` : '/historial';
    const json = await request(endpoint);
    return extraerArreglo(json);
  },

  // 5. Proyectos STEAM
  getProyectos: async () => {
    const json = await request('/proyectos');
    return extraerArreglo(json);
  },

  createProyecto: async (data) => {
    const json = await request('/proyectos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 5.0 Solicitudes de Inventario (Rol Custodio / Docente)
  getSolicitudes: async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const endpoint = qs ? `/solicitudes?${qs}` : '/solicitudes';
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
      const token = getAuthToken();
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        // Si el endpoint aún no está desplegado en backend (ej. 404 Not Found), usar fallback local silencioso
        if (res.status === 404) {
          console.warn('Endpoint /api/solicitudes aún no disponible en el backend (404), usando almacenamiento local.');
        } else {
          console.warn(`Respuesta no exitosa (${res.status}) al consultar /api/solicitudes, usando respaldo local.`);
        }
        try {
          const local = localStorage.getItem('siga_solicitudes_inventario');
          return local ? JSON.parse(local) : [];
        } catch {
          return [];
        }
      }

      const json = await res.json().catch(() => null);
      return extraerArreglo(json) || [];
    } catch (err) {
      console.warn('Endpoint /api/solicitudes en espera de despliegue en backend, usando lista local:', err.message);
      // Fallback a almacenamiento local tolerante
      try {
        const local = localStorage.getItem('siga_solicitudes_inventario');
        return local ? JSON.parse(local) : [];
      } catch {
        return [];
      }
    }
  },

  createSolicitud: async (data) => {
    let apiSuccess = null;
    try {
      const json = await request('/solicitudes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      apiSuccess = json?.data !== undefined ? json.data : json;
    } catch (err) {
      console.warn('API /solicitudes no disponible, guardando en local:', err.message);
    }

    // Asegurar persistencia local también
    try {
      const itemToSave = apiSuccess || {
        ...data,
        id: data.id || 'sol-' + Date.now(),
        created_at: new Date().toISOString(),
        fecha_radicado: new Date().toISOString().slice(0, 10),
        estado: data.estado || 'PENDIENTE',
      };
      const local = localStorage.getItem('siga_solicitudes_inventario');
      const list = local ? JSON.parse(local) : [];
      list.unshift(itemToSave);
      localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
      return itemToSave;
    } catch (e) {
      if (apiSuccess) return apiSuccess;
      throw e;
    }
  },

  updateSolicitud: async (id, patch) => {
    let apiSuccess = null;
    try {
      const json = await request(`/solicitudes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      apiSuccess = json?.data !== undefined ? json.data : json;
    } catch (err) {
      console.warn(`API PUT /solicitudes/${id} no disponible, actualizando local:`, err.message);
    }

    try {
      const local = localStorage.getItem('siga_solicitudes_inventario');
      if (local) {
        const list = JSON.parse(local);
        const idx = list.findIndex((s) => String(s.id) === String(id));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...patch, updated_at: new Date().toISOString() };
          localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
          return list[idx];
        }
      }
    } catch (e) {
      console.warn('Error al actualizar localStorage de solicitudes:', e);
    }
    return apiSuccess || { id, ...patch };
  },

  // 5.1 Sedes y Municipios
  getSedes: async () => {
    const json = await request('/sedes');
    return extraerArreglo(json);
  },

  createSede: async (data) => {
    const json = await request('/sedes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 6. Usuarios y Perfiles
  getUsuarios: async () => {
    const json = await request('/usuarios');
    return extraerArreglo(json);
  },

  createUsuario: async (data) => {
    const json = await request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json;
  },

  updateUsuario: async (id, data) => {
    const json = await request(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return json;
  },

  // Compatibilidad genérica directa con endpoints de la API
  getAll: async () => {
    const json = await request('/consumibles');
    return extraerArreglo(json);
  },

  get: async (id) => {
    // Si parece una placa de activo
    try {
      const activo = await request(`/activos/${encodeURIComponent(id)}`);
      const dataActivo = activo?.data !== undefined ? activo.data : activo;
      if (dataActivo) return dataActivo;
    } catch {
      // continuar a consumibles
    }
    const consumibles = await request('/consumibles');
    const list = extraerArreglo(consumibles);
    const found = list.find((c) => String(c.id || c.codigo || '') === String(id));
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
