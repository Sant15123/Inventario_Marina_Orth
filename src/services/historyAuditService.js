/**
 * SERVICIO OFICIAL DE AUDITORÍA E HISTORIAL (SIGA-FMO)
 * Fundación Marina Orth - Bitácora Institucional de Trazabilidad
 * 
 * Registra automáticamente eventos y movimientos en la tabla 'historial_movimientos'
 * de Supabase con compatibilidad de columnas cruzadas y notificación Realtime.
 */
import { supabase } from './supabase';

/**
 * Registra una acción de auditoría en Supabase.
 * @param {Object} params
 * @param {string} params.tipo - Categoría / acción (ej. 'Solicitud de Compra', 'Compra Aprobada', 'Ingreso', 'Baja')
 * @param {string} params.elemento - Nombre legible del elemento o entidad afectada
 * @param {string} [params.id_referencia] - Código corto, placa, radicado o documento
 * @param {number} [params.cantidad=1] - Cantidad de unidades involucradas
 * @param {string} [params.responsable] - Nombre y rol del usuario ejecutor
 * @param {string} [params.documento_responsable] - Documento del ejecutor
 * @param {string} [params.sede='Medellín'] - Sede institucional
 * @param {string} [params.motivo] - Detalle descriptivo legible del evento
 * @param {string} [params.detalles] - Detalle alternativo
 * @param {string} [params.fecha] - Timestamp ISO
 * @returns {Promise<Object>} Registro formateado
 */
export async function registrarAuditoria({
  tipo,
  elemento,
  id_referencia,
  cantidad = 1,
  responsable = 'Administrador',
  documento_responsable = null,
  sede = 'Medellín',
  motivo = '',
  detalles = '',
  fecha = new Date().toISOString(),
}) {
  const finalMotivo = (motivo || detalles || 'Acción registrada en SIGA-FMO').trim();
  const finalElemento = (elemento || 'Registro institucional').trim();
  const finalRef = id_referencia ? String(id_referencia).trim() : null;

  const payload = {
    tipo: tipo || 'Movimiento',
    elemento: finalElemento,
    elemento_nombre: finalElemento,
    id_referencia: finalRef,
    placa_o_id: finalRef,
    cantidad: Number(cantidad) || 1,
    responsable: responsable || 'Administrador',
    documento_responsable: documento_responsable ? String(documento_responsable).trim() : null,
    sede: sede || 'Medellín',
    motivo: finalMotivo,
    detalles: finalMotivo,
    fecha: fecha || new Date().toISOString(),
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('historial_movimientos')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.warn(
          `Aviso insert en historial_movimientos Supabase: ${error.message}${error.details ? ` | Detalles: ${error.details}` : ''}${error.hint ? ` | Pista: ${error.hint}` : ''}`
        );
      }
    }
  } catch (err) {
    console.warn('Excepción en registrarAuditoria Supabase:', err.message);
  }

  // Notificar al frontend para sincronización reactiva inmediata
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('siga:historial_nuevo', { detail: payload }));
  }

  return payload;
}

export default {
  registrarAuditoria,
};
