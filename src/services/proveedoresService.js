/**
 * SERVICIO OFICIAL SIGA-FMO: PROVEEDORES RECOMENDADOS
 * Fundación Marina Orth - Gestión de Compras y Adquisiciones
 * 
 * PERSISTENCIA ESTRICTA EN SUPABASE (Sin localStorage ni datos simulados)
 */
import { supabase } from './supabase';
import { registrarAuditoria } from './historyAuditService';

const notifyChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('siga:proveedores_changed'));
  }
};

/**
 * Obtiene el catálogo de proveedores recomendados directamente desde Supabase.
 * @returns {Promise<Array>} Listado ordenado alfabéticamente por nombre.
 */
export const getProveedoresRecomendados = async () => {
  if (!supabase) {
    const err = new Error('Cliente Supabase no disponible en la aplicación.');
    console.error('[proveedoresService.getProveedoresRecomendados]', err);
    throw err;
  }

  const { data, error } = await supabase
    .from('proveedores_recomendados')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('[proveedoresService.getProveedoresRecomendados] Error en Supabase:', error);
    throw new Error(error.message || 'Error al consultar proveedores en Supabase');
  }

  return Array.isArray(data) ? data : [];
};

/**
 * Crea un nuevo proveedor en la tabla proveedores_recomendados de Supabase.
 * @param {Object} proveedor - { nombre, url, descripcion }
 * @param {Object} currentUser - Usuario actual para auditoría
 * @returns {Promise<Object>} Registro creado en Supabase
 */
export const createProveedorRecomendado = async (proveedor, currentUser = null) => {
  if (!supabase) {
    const err = new Error('Cliente Supabase no disponible.');
    console.error('[proveedoresService.createProveedorRecomendado]', err);
    throw err;
  }

  const nuevoRegistro = {
    nombre: (proveedor.nombre || '').trim(),
    url: (proveedor.url || '').trim(),
    descripcion: (proveedor.descripcion || '').trim(),
    created_by: currentUser?.name || currentUser?.nombre || currentUser?.id || 'Coordinación FMO',
  };

  const { data, error } = await supabase
    .from('proveedores_recomendados')
    .insert([nuevoRegistro])
    .select()
    .single();

  if (error) {
    console.error('[proveedoresService.createProveedorRecomendado] Error en Supabase:', error);
    throw new Error(error.message || 'No se pudo registrar el proveedor en Supabase');
  }

  const usuarioNombre = currentUser?.nombre_completo || currentUser?.nombre || currentUser?.name || 'Administrador FMO';
  const usuarioRol = currentUser?.rol || 'Administrador';
  try {
    await registrarAuditoria({
      tipo: 'Proveedor Agregado',
      elemento: data.nombre || proveedor.nombre,
      id_referencia: data.id ? String(data.id).slice(0, 8).toUpperCase() : null,
      cantidad: 1,
      responsable: `${usuarioNombre} (${usuarioRol})`,
      documento_responsable: currentUser?.documento || '',
      sede: currentUser?.sede || 'Medellín',
      motivo: `Nuevo proveedor recomendado registrado: "${data.nombre}". Enlace: ${data.url || 'N/A'}. Descripción: ${data.descripcion || 'Sin descripción'}`,
    });
  } catch (eAud) {
    console.warn('Aviso auditoria proveedor creado:', eAud?.message);
  }

  notifyChange();
  return data;
};

/**
 * Actualiza un proveedor existente en la tabla proveedores_recomendados de Supabase.
 * @param {string} id - UUID del proveedor
 * @param {Object} patch - Campos a actualizar { nombre, url, descripcion }
 * @param {Object} [currentUser=null] - Usuario actual para auditoría
 * @returns {Promise<Object>} Registro actualizado
 */
export const updateProveedorRecomendado = async (id, patch, currentUser = null) => {
  if (!supabase) {
    const err = new Error('Cliente Supabase no disponible.');
    console.error('[proveedoresService.updateProveedorRecomendado]', err);
    throw err;
  }

  const datosActualizados = {
    updated_at: new Date().toISOString(),
  };

  if (patch.nombre !== undefined) datosActualizados.nombre = String(patch.nombre).trim();
  if (patch.url !== undefined) datosActualizados.url = String(patch.url).trim();
  if (patch.descripcion !== undefined) datosActualizados.descripcion = String(patch.descripcion).trim();

  const { data, error } = await supabase
    .from('proveedores_recomendados')
    .update(datosActualizados)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[proveedoresService.updateProveedorRecomendado] Error en Supabase:', error);
    throw new Error(error.message || 'No se pudo actualizar el proveedor en Supabase');
  }

  const usuarioNombre = currentUser?.nombre_completo || currentUser?.nombre || currentUser?.name || 'Administrador FMO';
  const usuarioRol = currentUser?.rol || 'Administrador';
  try {
    await registrarAuditoria({
      tipo: 'Proveedor Editado',
      elemento: data.nombre || 'Proveedor',
      id_referencia: String(id).slice(0, 8).toUpperCase(),
      cantidad: 1,
      responsable: `${usuarioNombre} (${usuarioRol})`,
      documento_responsable: currentUser?.documento || '',
      sede: currentUser?.sede || 'Medellín',
      motivo: `Actualización de datos para proveedor recomendado: "${data.nombre}". Enlace: ${data.url || 'N/A'}`,
    });
  } catch (eAud) {
    console.warn('Aviso auditoria proveedor editado:', eAud?.message);
  }

  notifyChange();
  return data;
};

/**
 * Elimina un proveedor de la tabla proveedores_recomendados de Supabase.
 * @param {string} id - UUID del proveedor a eliminar
 * @param {Object} [currentUser=null] - Usuario actual para auditoría
 * @param {string} [nombreProveedor=''] - Nombre del proveedor eliminado
 * @returns {Promise<boolean>} true si se eliminó con éxito
 */
export const deleteProveedorRecomendado = async (id, currentUser = null, nombreProveedor = '') => {
  if (!supabase) {
    const err = new Error('Cliente Supabase no disponible.');
    console.error('[proveedoresService.deleteProveedorRecomendado]', err);
    throw err;
  }

  const { error } = await supabase
    .from('proveedores_recomendados')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[proveedoresService.deleteProveedorRecomendado] Error en Supabase:', error);
    throw new Error(error.message || 'No se pudo eliminar el proveedor de Supabase');
  }

  const usuarioNombre = currentUser?.nombre_completo || currentUser?.nombre || currentUser?.name || 'Administrador FMO';
  const usuarioRol = currentUser?.rol || 'Administrador';
  try {
    await registrarAuditoria({
      tipo: 'Proveedor Eliminado',
      elemento: nombreProveedor || 'Proveedor Recomendado',
      id_referencia: String(id).slice(0, 8).toUpperCase(),
      cantidad: 1,
      responsable: `${usuarioNombre} (${usuarioRol})`,
      documento_responsable: currentUser?.documento || '',
      sede: currentUser?.sede || 'Medellín',
      motivo: `Eliminación de proveedor recomendado del directorio: "${nombreProveedor || id}"`,
    });
  } catch (eAud) {
    console.warn('Aviso auditoria proveedor eliminado:', eAud?.message);
  }

  notifyChange();
  return true;
};
