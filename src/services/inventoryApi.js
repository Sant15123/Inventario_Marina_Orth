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
    error.response = { data: json, status: res.status };
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

  // Obtener ítem universal (sea equipo tecnológico, mobiliario, robótica o papelería)
  getItemUniversal: async (id) => {
    const rawId = String(id || '').trim();
    const idLower = rawId.toLowerCase();

    // 1. Si es Mobiliario (MOB-XXXX)
    if (idLower.startsWith('mob')) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const { data, error } = await supabase
            .from('mobiliario')
            .select('*')
            .or(`placa.ilike.${rawId},id.ilike.${rawId}`)
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            return { ...data, __tipo: 'mobiliario', tipo: 'mobiliario' };
          }
        }
      } catch (_) {}

      try {
        const json = await request(`/mobiliario/${encodeURIComponent(rawId)}`);
        const data = json?.data !== undefined ? json.data : json;
        if (data && (data.placa || data.id)) {
          return { ...data, __tipo: 'mobiliario', tipo: 'mobiliario' };
        }
      } catch (_) {}
    }

    // 2. Si es Papelería (PapeXXXX)
    if (idLower.startsWith('pape')) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const { data, error } = await supabase
            .from('papeleria')
            .select('*')
            .eq('id', rawId)
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            return { ...data, __tipo: 'papeleria', tipo: 'papeleria' };
          }
        }
      } catch (_) {}

      try {
        const catalogoModule = await import('../data/catalogoPapeleriaFMO.json');
        const cat = catalogoModule.default || catalogoModule;
        const found = Array.isArray(cat) && cat.find(p => String(p.id).toLowerCase() === idLower);
        if (found) {
          return { ...found, __tipo: 'papeleria', tipo: 'papeleria' };
        }
      } catch (_) {}
    }

    // 3. Si es Robótica / Consumible (RobXXXX)
    if (idLower.startsWith('rob')) {
      try {
        const c = await inventoryApi.getConsumibleById(rawId);
        return { ...c, __tipo: 'robotica', tipo: 'robotica' };
      } catch {
        // Fallback a activos
      }
    }

    // 4. Búsqueda principal como Activo Tecnológico
    try {
      const a = await inventoryApi.getActivoByPlaca(rawId);
      let activoObj = { ...a, __tipo: 'equipo', tipo: 'tecnologia' };

      // Buscar si tiene préstamo activo asociado para enriquecer la ubicación y custodio vigente
      try {
        const prestamos = await inventoryApi.getPrestamos();
        if (Array.isArray(prestamos)) {
          const placaComp = rawId.toLowerCase();
          const prestamoActivo = prestamos.find((p) => {
            const matchPlaca = String(p.placa_activo || p.item_id || p.itemId || '').toLowerCase() === placaComp;
            const pEstado = String(p.estado || p.status || '').toLowerCase();
            const esActivo = pEstado === 'activo' || pEstado.includes('préstamo') || pEstado.includes('prestamo') || pEstado.includes('pendiente');
            return matchPlaca && esActivo;
          });

          if (prestamoActivo) {
            activoObj.prestamo_activo = {
              id: prestamoActivo.id,
              sede: prestamoActivo.sede,
              responsable: prestamoActivo.solicitante || prestamoActivo.responsable || prestamoActivo.person || prestamoActivo.usuario_nombre,
              usuario_nombre: prestamoActivo.solicitante || prestamoActivo.responsable || prestamoActivo.person || prestamoActivo.usuario_nombre,
              ubicacion_especifica: prestamoActivo.ubicacion_especifica || prestamoActivo.ubicacion,
              motivo: prestamoActivo.motivo || prestamoActivo.motive,
              fecha_salida: prestamoActivo.fecha_salida || prestamoActivo.date,
              fecha_devolucion_esperada: prestamoActivo.fecha_devolucion_esperada || prestamoActivo.expectedReturn,
              estado: prestamoActivo.estado || prestamoActivo.status,
            };
            activoObj.estado = 'En campo';
          }
        }
      } catch (_) {}

      return activoObj;
    } catch (errActivo) {
      // 5. Fallbacks cruzados
      try {
        const c = await inventoryApi.getConsumibleById(rawId);
        return { ...c, __tipo: 'robotica', tipo: 'robotica' };
      } catch (_) {}

      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          // Intentar en mobiliario
          const { data: mob } = await supabase
            .from('mobiliario')
            .select('*')
            .or(`placa.ilike.${rawId},id.ilike.${rawId}`)
            .limit(1)
            .maybeSingle();
          if (mob) return { ...mob, __tipo: 'mobiliario', tipo: 'mobiliario' };

          // Intentar en papeleria
          const { data: pap } = await supabase
            .from('papeleria')
            .select('*')
            .eq('id', rawId)
            .limit(1)
            .maybeSingle();
          if (pap) return { ...pap, __tipo: 'papeleria', tipo: 'papeleria' };
        }
      } catch (_) {}

      throw new Error(errActivo.message || `No se encontró ningún activo, mobiliario o material con el código "${rawId}"`);
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

  updatePrestamo: async (id, data) => {
    // 1. Intentar actualización directa en Supabase
    try {
      const { supabase } = await import('./supabase');
      if (supabase && id) {
        const patch = {};
        if (data.fecha_devolucion_esperada) patch.fecha_devolucion_esperada = data.fecha_devolucion_esperada;
        if (data.observaciones !== undefined) patch.motivo = data.observaciones;
        if (data.motivo !== undefined) patch.motivo = data.motivo;

        const { data: res, error } = await supabase
          .from('prestamos')
          .update(patch)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && res) return res;
      }
    } catch (_) {}

    // 2. Fallback a endpoint REST
    const json = await request(`/prestamos/${id}`, {
      method: 'PUT',
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

  // 2.2 Mobiliario y Enseres Institucionales
  getMobiliario: async () => {
    try {
      const json = await request('/mobiliario');
      return extraerArreglo(json);
    } catch (err) {
      console.warn('Fallback al consultar /mobiliario:', err.message);
      return [];
    }
  },

  getSiguientePlacaMobiliario: async () => {
    try {
      const json = await request('/mobiliario/siguiente-placa');
      return json?.data !== undefined ? json.data : json;
    } catch {
      // Fallback consecutivo seguro si el endpoint backend aún está arrancando
      const randomSuffix = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      return { placa: `MOB-${randomSuffix}` };
    }
  },

  createMobiliario: async (data) => {
    const json = await request('/mobiliario', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return json?.data !== undefined ? json.data : json;
  },

  // 4. Historial Universal y Auditoría
  getHistorial: async (params = {}) => {
    let list = [];
    try {
      const qs = new URLSearchParams(params).toString();
      const endpoint = qs ? `/historial?${qs}` : '/historial';
      const json = await request(endpoint);
      list = extraerArreglo(json);
    } catch (_) {}

    // Complementar directamente con registros de Supabase (historial_movimientos)
    try {
      const { supabase } = await import('./supabase');
      if (supabase) {
        const { data: supaHist, error: errH } = await supabase
          .from('historial_movimientos')
          .select('*')
          .order('fecha', { ascending: false });

        if (!errH && Array.isArray(supaHist) && supaHist.length > 0) {
          const existingKeys = new Set(
            list.map((m) => String(m.id || `${m.tipo}-${m.id_referencia || m.placa_o_id}-${m.fecha}`))
          );
          supaHist.forEach((sh) => {
            const key = String(sh.id || `${sh.tipo}-${sh.id_referencia || sh.codigo || sh.placa_o_id}-${sh.fecha}`);
            if (!existingKeys.has(key)) {
              list.push({
                ...sh,
                id: sh.id,
                tipo: sh.tipo,
                elemento: sh.elemento || sh.elemento_nombre,
                elemento_nombre: sh.elemento || sh.elemento_nombre,
                id_referencia: sh.id_referencia || sh.codigo || sh.placa_o_id,
                placa_o_id: sh.id_referencia || sh.codigo || sh.placa_o_id,
                motivo: sh.motivo || sh.detalles,
                detalles: sh.motivo || sh.detalles,
                fecha: sh.fecha || sh.created_at,
              });
              existingKeys.add(key);
            }
          });
        }
      }
    } catch (_) {}

    return list;
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

  // 5.0 Solicitudes de Inventario (Rol Custodio / Docente / Admin)
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

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const arrayResult = extraerArreglo(json) || [];
        return arrayResult.map((s) => {
          const items = Array.isArray(s.items_solicitud) && s.items_solicitud.length > 0
            ? s.items_solicitud
            : (Array.isArray(s.items) ? s.items : []);
          const fechaRad = s.creado_en || s.fecha_radicado || s.created_at || '';
          return {
            ...s,
            items: items,
            items_solicitud: items,
            tipo: s.tipo_solicitud || s.tipo || '',
            tipo_solicitud: s.tipo_solicitud || s.tipo || '',
            creado_en: fechaRad,
            created_at: fechaRad,
            fecha_radicado: fechaRad ? fechaRad.slice(0, 10) : '',
            motivo_rechazo: s.motivo_rechazo || s.observaciones_admin || s.nota_rechazo || null,
            nota_rechazo: s.nota_rechazo || s.observaciones_admin || s.motivo_rechazo || null,
            observaciones_admin: s.observaciones_admin || s.motivo_rechazo || s.nota_rechazo || null,
          };
        });
      }
    } catch (err) {
      console.warn('Endpoint /api/solicitudes no disponible en backend, intentando fallback:', err.message);
    }

    // Fallback con cliente Supabase directo
    try {
      const { supabase } = await import('./supabase');
      if (supabase) {
        // Intentar consulta con join de items_solicitud
        let { data, error } = await supabase
          .from('solicitudes_inventario')
          .select('*, items_solicitud(*)')
          .order('creado_en', { ascending: false });

        if (error) {
          const resAlias = await supabase
            .from('solicitudes_inventario')
            .select('*, items:items_solicitud(*)')
            .order('creado_en', { ascending: false });
          data = resAlias.data;
          error = resAlias.error;
        }

        if (error) {
          // Fallback a select plano y consulta secundaria de items
          const resPlana = await supabase
            .from('solicitudes_inventario')
            .select('*')
            .order('creado_en', { ascending: false });
          data = resPlana.data;
          error = resPlana.error;

          if (!error && Array.isArray(data) && data.length > 0) {
            const solIds = data.map((s) => s.id);
            const { data: allItems } = await supabase
              .from('items_solicitud')
              .select('*')
              .in('solicitud_id', solIds);

            if (Array.isArray(allItems)) {
              data = data.map((s) => {
                const its = allItems.filter((it) => String(it.solicitud_id) === String(s.id));
                return {
                  ...s,
                  items: its,
                  items_solicitud: its,
                };
              });
            }
          }
        }

        if (!error && Array.isArray(data)) {
          return data.map((s) => {
            const items = Array.isArray(s.items_solicitud) && s.items_solicitud.length > 0
              ? s.items_solicitud
              : (Array.isArray(s.items) ? s.items : []);
            const fechaRad = s.creado_en || s.fecha_radicado || s.created_at || '';
            return {
              ...s,
              items: items,
              items_solicitud: items,
              tipo: s.tipo_solicitud || s.tipo || '',
              tipo_solicitud: s.tipo_solicitud || s.tipo || '',
              creado_en: fechaRad,
              created_at: fechaRad,
              fecha_radicado: fechaRad ? fechaRad.slice(0, 10) : '',
              motivo_rechazo: s.motivo_rechazo || s.observaciones_admin || null,
              nota_rechazo: s.nota_rechazo || s.observaciones_admin || null,
              observaciones_admin: s.observaciones_admin || s.motivo_rechazo || null,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Aviso Supabase fallback solicitudes:', e.message);
    }

    // Fallback a almacenamiento local tolerante
    try {
      const local = localStorage.getItem('siga_solicitudes_inventario');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  },

  createSolicitud: async (data) => {
    // 1. Intentar endpoint backend REST si está disponible
    try {
      const url = `${API_BASE}/solicitudes`;
      const token = getAuthToken();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const createdData = json?.data !== undefined ? json.data : json;

        try {
          const local = localStorage.getItem('siga_solicitudes_inventario');
          const list = local ? JSON.parse(local) : [];
          list.unshift(createdData);
          localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
        } catch (e) {
          console.warn('Error al sincronizar cache local de solicitudes:', e);
        }

        return {
          status: res.status,
          data: createdData,
        };
      }
    } catch (apiErr) {
      console.warn('Backend REST /api/solicitudes no respondió, intentando inserción Supabase:', apiErr.message);
    }

    // 2. Fallback transaccional directo a Supabase
    try {
      const { supabase } = await import('./supabase');
      if (supabase) {
        const solPayload = {
          usuario_id: data.usuario_id || null,
          usuario_nombre: data.usuario_nombre || 'Docente / Custodio',
          sede: data.sede || 'Medellín',
          tipo_solicitud: data.tipo_solicitud || 'PRESTAMO_EQUIPO',
          proyecto_steam_id: data.proyecto_steam_id || null,
          motivo: data.motivo || data.justificacion || 'Sin motivo',
          justificacion: data.justificacion || data.motivo || null,
          fecha_devolucion_estimada: data.fecha_devolucion_estimada || data.fecha_devolucion || null,
          estado: data.estado || 'PENDIENTE',
          observaciones_admin: data.observaciones_admin || null,
          creado_en: data.creado_en || new Date().toISOString(),
        };

        const { data: solCreated, error: solErr } = await supabase
          .from('solicitudes_inventario')
          .insert(solPayload)
          .select()
          .single();

        if (solErr) throw solErr;

        let itemsFinal = [];
        if (Array.isArray(data.items) && data.items.length > 0) {
          const itemsPayload = data.items.map((it) => ({
            solicitud_id: solCreated.id,
            tipo_item: it.tipo_item || (data.tipo_solicitud === 'compra' ? 'compra' : 'equipo'),
            item_id: it.item_id || null,
            nombre_item: it.nombre_item || it.nombre_sugerido || 'Artículo',
            cantidad: it.cantidad || 1,
            nombre_sugerido: it.nombre_sugerido || null,
            categoria_sugerida: it.categoria_sugerida || null,
            url_compra: it.url_compra || null,
            precio_estimado: it.precio_estimado || 0,
            ingresado_inventario: Boolean(it.ingresado_inventario),
          }));

          const { data: itemsCreated, error: itemsErr } = await supabase
            .from('items_solicitud')
            .insert(itemsPayload)
            .select();

          if (!itemsErr && itemsCreated) {
            itemsFinal = itemsCreated;
          } else {
            itemsFinal = data.items;
          }
        }

        const solicitudCompleta = {
          ...solCreated,
          items: itemsFinal,
        };

        try {
          const local = localStorage.getItem('siga_solicitudes_inventario');
          const list = local ? JSON.parse(local) : [];
          list.unshift(solicitudCompleta);
          localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
        } catch (e) {
          console.warn('Error al sincronizar cache local de solicitudes:', e);
        }

        return {
          status: 201,
          data: solicitudCompleta,
        };
      }
    } catch (supErr) {
      console.error('Error al insertar solicitud vía Supabase:', supErr);
      throw supErr;
    }

    throw new Error('No se pudo radicar la solicitud en el servidor ni en la base de datos.');
  },

  updateSolicitud: async (id, patch) => {
    let apiSuccess = null;
    try {
      const json = await request(`/solicitudes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      apiSuccess = json?.data !== undefined ? json.data : json;
    } catch (err) {
      try {
        const jsonPut = await request(`/solicitudes/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        });
        apiSuccess = jsonPut?.data !== undefined ? jsonPut.data : jsonPut;
      } catch (errPut) {
        console.warn(`API /solicitudes/${id} no disponible, actualizando local:`, errPut.message);
      }
    }

    // Actualizar también en Supabase si está disponible
    try {
      const { supabase } = await import('./supabase');
      if (supabase) {
        await supabase
          .from('solicitudes_inventario')
          .update(patch)
          .eq('id', id);
      }
    } catch (e) {
      console.warn('Aviso updateSolicitud Supabase:', e.message);
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

  ingresarArticuloInventario: async (datos) => {
    // 1. Intentar endpoint backend dedicado
    try {
      const json = await request('/solicitudes/ingreso-inventario', {
        method: 'POST',
        body: JSON.stringify(datos),
      });
      if (json?.success) {
        return json;
      }
    } catch (errApi) {
      console.warn('Endpoint /api/solicitudes/ingreso-inventario fallback a Supabase:', errApi.message);
    }

    // 2. Fallback con Supabase directo
    const { supabase } = await import('./supabase');
    if (!supabase) throw new Error('Cliente de base de datos no disponible');

    const {
      solicitud_id,
      item_solicitud_id,
      tabla_destino = 'consumibles',
      sku,
      nombre,
      cantidad = 1,
      sede = 'Medellín',
      stock_minimo = 5,
      ubicacion_estante = 'Recepción',
    } = datos;

    let itemInsertado = null;
    const cantNum = parseInt(cantidad, 10) || 1;
    const minNum = parseInt(stock_minimo, 10) || 5;

    if (tabla_destino === 'consumibles') {
      const { data, error } = await supabase
        .from('consumibles')
        .insert({
          id: sku,
          material: nombre,
          categoria: 'Robótica y Consumibles',
          disponible: cantNum,
          minimo: minNum,
          ubicacion: sede,
          ubicacion_estante: ubicacion_estante || 'Recepción',
          estado: 'Disponible',
          condicion: 'Nuevo',
          observaciones: `Ingreso automático desde Sugerencia de Compra #${solicitud_id || 'N/A'}`,
          area: 'Tecnología y STEAM',
          tipo_inventario: 'consumible',
        })
        .select()
        .single();
      if (error) throw error;
      itemInsertado = data;
    } else {
      const { data, error } = await supabase
        .from('papeleria')
        .insert({
          id: sku,
          material: nombre,
          descripcion: `Material ingresado desde sugerencia de compra #${solicitud_id || 'N/A'}`,
          disponible: cantNum,
          minimo: minNum,
          sede: sede,
          ubicacion_estante: ubicacion_estante || 'Recepción',
          condicion: 'Nuevo',
          estado: 'Disponible',
          observaciones: `Ingreso automático desde Sugerencia de Compra #${solicitud_id || 'N/A'}`,
          responsable: 'Bodega Central',
        })
        .select()
        .single();
      if (error) throw error;
      itemInsertado = data;
    }

    // Actualizar items_solicitud
    if (item_solicitud_id) {
      await supabase
        .from('items_solicitud')
        .update({
          ingresado_inventario: true,
          item_id: sku,
        })
        .eq('id', item_solicitud_id);
    }

    // Verificar si todos los ítems fueron ingresados
    let solicitudCompletada = false;
    if (solicitud_id) {
      const { data: pendientes } = await supabase
        .from('items_solicitud')
        .select('id')
        .eq('solicitud_id', solicitud_id)
        .eq('ingresado_inventario', false);

      if (!pendientes || pendientes.length === 0) {
        await supabase
          .from('solicitudes_inventario')
          .update({
            estado: 'Completada / En Inventario',
          })
          .eq('id', solicitud_id);
        solicitudCompletada = true;
      }
    }

    return {
      success: true,
      item: itemInsertado,
      solicitud_completada: solicitudCompletada,
    };
  },

  rechazarSolicitud: async (id, motivo = 'Rechazado por administración') => {
    const payload = {
      estado: 'RECHAZADA',
      motivo: motivo.trim() || 'Rechazado por administración',
      observaciones_admin: motivo.trim() || 'Rechazado por administración',
      fecha_resolucion: new Date().toISOString(),
    };

    let apiSuccess = null;
    // Intentar endpoint dedicado si existe
    try {
      const json = await request(`/solicitudes/${encodeURIComponent(id)}/rechazar`, {
        method: 'PATCH',
        body: JSON.stringify({ motivo: payload.motivo, observaciones_admin: payload.observaciones_admin }),
      });
      apiSuccess = json?.data !== undefined ? json.data : json;
    } catch {
      // Fallback a PATCH/PUT general
      try {
        apiSuccess = await inventoryApi.updateSolicitud(id, payload);
      } catch (errPatch) {
        console.warn(`Error al rechazar solicitud ${id}:`, errPatch.message);
      }
    }

    try {
      const local = localStorage.getItem('siga_solicitudes_inventario');
      if (local) {
        const list = JSON.parse(local);
        const idx = list.findIndex((s) => String(s.id) === String(id));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() };
          localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
          return list[idx];
        }
      }
    } catch (e) {
      console.warn('Error al sincronizar cache local de solicitud rechazada:', e);
    }

    return apiSuccess || { id, ...payload };
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

  // 12. KPIs y Métricas Ligeras del Dashboard (< 2s, conteo en servidor)
  getDashboardKPIs: async () => {
    try {
      const json = await request('/dashboard/kpis');
      return json?.data !== undefined ? json.data : json;
    } catch (err) {
      console.warn('Fallback al consultar /dashboard/kpis:', err.message);
      return null;
    }
  },
};

export default inventoryApi;
