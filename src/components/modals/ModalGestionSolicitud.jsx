import React, { useState, useMemo } from 'react';
import {
  User,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { fmtDate, today } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';

export default function ModalGestionSolicitud({
  isOpen,
  onClose,
  solicitud,
  items = [],
  onSolicitudResolved,
  showSuccess,
  showError,
}) {
  const [resolucion, setResolucion] = useState(null); // null | 'aprobar' | 'rechazar'
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Para equipos retornables: asignación de placas físicas por cada ítem
  // Estado: { [item_id]: string[] (placas seleccionadas) }
  const [placasAsignadas, setPlacasAsignadas] = useState(() => {
    const initial = {};
    if (solicitud?.tipo_solicitud === 'PRESTAMO_EQUIPO' && Array.isArray(solicitud.items)) {
      solicitud.items.forEach((it) => {
        initial[it.item_id] = [];
      });
    }
    return initial;
  });

  // Para consumibles: cantidades confirmadas a despachar
  // Estado: { [item_id]: number }
  const [cantidadesAprobadas, setCantidadesAprobadas] = useState(() => {
    const initial = {};
    if (Array.isArray(solicitud?.items)) {
      solicitud.items.forEach((it) => {
        initial[it.item_id] = it.cantidad || 1;
      });
    }
    return initial;
  });

  // Mapa de ítems del inventario para consulta de stock y placas disponibles
  const inventarioMap = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      map.set(String(it.id), it);
      if (it.placa) map.set(String(it.placa), it);
    });
    return map;
  }, [items]);

  if (!isOpen || !solicitud) return null;

  const esPrestamo = solicitud.tipo_solicitud === 'PRESTAMO_EQUIPO';
  const yaResuelta = solicitud.estado === 'APROBADO' || solicitud.estado === 'RECHAZADO';

  // Manejador del cambio de placa física por dropdown
  const handleSelectPlacaDropdown = (itemId, indexUnit, placaSeleccionada) => {
    setPlacasAsignadas((prev) => {
      const currentList = [...(prev[itemId] || [])];
      if (!placaSeleccionada) {
        currentList.splice(indexUnit, 1);
      } else {
        currentList[indexUnit] = placaSeleccionada;
      }
      return { ...prev, [itemId]: currentList.filter(Boolean) };
    });
  };

  // Ajustador de cantidad con botones +/- para consumibles
  const handleAjustarCantidad = (itemId, delta, maxStock) => {
    setCantidadesAprobadas((prev) => {
      const actual = prev[itemId] || 1;
      const nuevo = Math.max(1, Math.min(maxStock > 0 ? maxStock : 999, actual + delta));
      return { ...prev, [itemId]: nuevo };
    });
  };

  // Manejador del Rechazo
  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      setValidationError('Por favor ingresa el motivo obligatorio del rechazo.');
      return;
    }

    try {
      setSubmitting(true);
      setValidationError('');

      const patch = {
        estado: 'RECHAZADO',
        observaciones_admin: motivoRechazo.trim(),
        fecha_resolucion: today(),
      };

      const actualizada = await inventoryApi.updateSolicitud(solicitud.id, patch);

      if (showSuccess) {
        showSuccess(
          'Solicitud Rechazada',
          `La solicitud de ${solicitud.usuario_nombre} ha sido marcada como rechazada.`
        );
      }

      if (onSolicitudResolved) {
        onSolicitudResolved(actualizada);
      }

      onClose();
    } catch (err) {
      setValidationError(err.message || 'Error al rechazar solicitud');
      if (showError) showError('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Manejador de la Aprobación y Despacho
  const handleAprobarYDespachar = async () => {
    setValidationError('');

    // Validar asignaciones de placas físicas en préstamos
    if (esPrestamo) {
      for (const it of solicitud.items || []) {
        const asignadas = (placasAsignadas[it.item_id] || []).filter(Boolean);
        if (asignadas.length < it.cantidad) {
          setValidationError(
            `Debes asignar las ${it.cantidad} placa(s) física(s) para "${it.nombre_item}". (Seleccionadas: ${asignadas.length})`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // 1. Si es Préstamo de Equipo Retornable: crear registros formales de préstamo
      if (esPrestamo) {
        for (const it of solicitud.items || []) {
          const placas = (placasAsignadas[it.item_id] || []).filter(Boolean);
          await inventoryApi.createPrestamo({
            itemId: it.item_id,
            itemName: it.nombre_item,
            person: solicitud.usuario_nombre,
            sede: solicitud.sede,
            proyecto: solicitud.proyecto_steam_id,
            expectedReturn: solicitud.fecha_devolucion_estimada || today(),
            motive: `Solicitud autorizada: ${solicitud.motivo}`,
            unitCodes: placas,
          });
        }
      } else {
        // 2. Si son Consumibles: registrar la entrega de consumibles
        const itemsParaEntrega = (solicitud.items || []).map((it) => ({
          id: it.item_id,
          material: it.nombre_item,
          cantidadEntrega: cantidadesAprobadas[it.item_id] || it.cantidad || 1,
          disponible: 99,
          unit: it.unidad || 'und',
        }));

        await inventoryApi.createEntrega({
          person: solicitud.usuario_nombre,
          sede: solicitud.sede,
          proyecto: solicitud.proyecto_steam_id,
          motive: `Solicitud de insumos autorizada: ${solicitud.motivo}`,
          items: itemsParaEntrega,
        });
      }

      // 3. Actualizar el estado de la solicitud en la base de datos
      const patch = {
        estado: 'APROBADO',
        fecha_resolucion: today(),
        placas_asignadas: placasAsignadas,
        cantidades_aprobadas: cantidadesAprobadas,
      };

      const actualizada = await inventoryApi.updateSolicitud(solicitud.id, patch);

      if (showSuccess) {
        showSuccess(
          'Solicitud Aprobada y Despachada',
          `Se ha procesado exitosamente la solicitud de ${solicitud.usuario_nombre}. Los registros correspondientes han sido generados.`
        );
      }

      if (onSolicitudResolved) {
        onSolicitudResolved(actualizada);
      }

      onClose();
    } catch (err) {
      setValidationError(err.message || 'Error al aprobar y despachar solicitud');
      if (showError) showError('Error al despachar', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !submitting && onClose()}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '650px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
        }}
      >
        {/* Encabezado estándar de los modales de la aplicación */}
        <div className="modal-header" style={{ padding: '20px 24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Gestión y Aprobación de Solicitud
            </h3>
            <span
              className={`pill ${
                solicitud.estado === 'APROBADO'
                  ? 'ok'
                  : solicitud.estado === 'RECHAZADO'
                  ? 'low'
                  : 'prestado'
              }`}
              style={{ fontSize: '11px', textTransform: 'uppercase', padding: '3px 9px', letterSpacing: '0.04em' }}
            >
              {solicitud.estado || 'PENDIENTE'}
            </span>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
            title="Cerrar ventana"
            style={{ fontSize: '20px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del modal con el formulario y estructura nativa de la app */}
        <div className="modal-body" style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {validationError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Bloque 1: Datos del Requerimiento en formulario nativo de dos columnas */}
          <div className="form-grid" style={{ gap: '14px' }}>
            {/* Custodio / Solicitante Responsable */}
            <div className="form-group full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <User size={14} style={{ color: '#84CC16' }} />
                <span>Custodio / Solicitante Responsable</span>
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                {solicitud.usuario_nombre || 'Docente Institucional'}
              </div>
            </div>

            {/* Sede / Municipio de Destino */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <MapPin size={14} style={{ color: '#38bdf8' }} />
                <span>Sede / Municipio de Destino</span>
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{solicitud.sede || 'Medellín'}</span>
                <span className="sede-badge municipal" style={{ margin: 0 }}>{solicitud.sede || 'Medellín'}</span>
              </div>
            </div>

            {/* Tipo de Requerimiento o Fecha de Retorno */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                {esPrestamo ? <Calendar size={14} style={{ color: '#84CC16' }} /> : <Layers size={14} style={{ color: '#f59e0b' }} />}
                <span>{esPrestamo ? 'Fecha de Devolución Pactada' : 'Tipo de Requerimiento'}</span>
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                }}
              >
                {esPrestamo
                  ? fmtDate(solicitud.fecha_devolucion_estimada)
                  : 'Consumibles / Insumos Robótica'}
              </div>
              {esPrestamo && <small className="help-text">Fecha límite pactada para retornar los equipos.</small>}
            </div>

            {/* Proyecto STEAM Vinculado */}
            <div className="form-group full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Sparkles size={14} style={{ color: '#84CC16' }} />
                <span>Proyecto STEAM Vinculado</span>
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: solicitud.proyecto_steam_id ? 700 : 500,
                }}
              >
                {solicitud.proyecto_steam_id ? (
                  <span style={{ color: '#84CC16' }}>{solicitud.proyecto_steam_id}</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>-- Sin vincular a proyecto específico --</span>
                )}
              </div>
            </div>

            {/* Motivo y Observaciones del Préstamo */}
            <div className="form-group full">
              <label style={{ margin: 0 }}>Motivo y Justificación Pedagógica</label>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface-2)',
                  fontSize: '13px',
                  fontStyle: 'italic',
                  color: 'var(--text)',
                  lineHeight: 1.45,
                }}
              >
                "{solicitud.motivo || 'Sin observaciones adicionales'}"
              </div>
            </div>
          </div>

          {/* Bloque 2: Selección y Asignación de Artículos */}
          <div style={{ marginTop: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
              Artículos Solicitados & Asignación Física
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(solicitud.items || []).map((it, idx) => {
                const invItem = inventarioMap.get(String(it.item_id));
                const unitsDisponibles = (invItem?.units || []).filter((u) => u.status === 'disponible');
                const stockActualConsumible = Number(invItem?.quantity ?? invItem?.disponible ?? 0);
                const asignadas = (placasAsignadas[it.item_id] || []).filter(Boolean);
                const cantidadAprobada = cantidadesAprobadas[it.item_id] ?? it.cantidad ?? 1;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--line)',
                      background: 'var(--surface-2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-h)', display: 'block' }}>
                          {it.nombre_item}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          <span>Solicitado: <strong>{it.cantidad} {it.unidad || 'und'}</strong></span>
                          {' · '}
                          {!esPrestamo ? (
                            <span>
                              Stock en bodega:{' '}
                              <strong style={{ color: stockActualConsumible >= it.cantidad ? '#84CC16' : '#f59e0b' }}>
                                {stockActualConsumible} {it.unidad || 'und'}
                              </strong>
                            </span>
                          ) : (
                            <span>
                              Equipos disponibles en estante:{' '}
                              <strong style={{ color: unitsDisponibles.length >= it.cantidad ? '#84CC16' : '#f59e0b' }}>
                                {unitsDisponibles.length} unidades
                              </strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Control para Consumibles: Cantidad a despachar con botones */}
                      {!esPrestamo && !yaResuelta && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                            Cant. a despachar:
                          </span>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              background: 'var(--bg)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleAjustarCantidad(it.item_id, -1, stockActualConsumible)}
                              style={{
                                padding: '6px 10px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                cursor: 'pointer',
                              }}
                              title="Disminuir"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={stockActualConsumible > 0 ? stockActualConsumible : 999}
                              value={cantidadAprobada}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setCantidadesAprobadas((prev) => ({ ...prev, [it.item_id]: val }));
                              }}
                              style={{
                                width: '48px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                border: 'none',
                                padding: '4px',
                                background: 'transparent',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAjustarCantidad(it.item_id, 1, stockActualConsumible)}
                              style={{
                                padding: '6px 10px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                cursor: 'pointer',
                              }}
                              title="Aumentar"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selector de Placas Físicas para Equipos Retornables */}
                    {esPrestamo && !yaResuelta && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px dashed var(--line-strong)',
                          background: 'var(--bg)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>
                            Asignar placa física de inventario ({it.cantidad} requerida{it.cantidad > 1 ? 's' : ''}):
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: asignadas.length === it.cantidad ? '#84CC16' : '#f59e0b',
                            }}
                          >
                            {asignadas.length} de {it.cantidad} seleccionada(s)
                          </span>
                        </div>

                        {unitsDisponibles.length === 0 ? (
                          <div style={{ fontSize: '11.5px', color: '#f59e0b', fontStyle: 'italic' }}>
                            ⚠️ No hay placas disponibles de este equipo en bodega.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {Array.from({ length: it.cantidad }).map((_, unitIdx) => {
                              const placaActual = asignadas[unitIdx] || '';

                              return (
                                <div key={unitIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', minWidth: '70px' }}>
                                    {it.cantidad > 1 ? `Placa ${unitIdx + 1}:` : 'Placa:'}
                                  </span>
                                  <select
                                    value={placaActual}
                                    onChange={(e) => handleSelectPlacaDropdown(it.item_id, unitIdx, e.target.value)}
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      padding: '7px 10px',
                                      flex: 1,
                                    }}
                                  >
                                    <option value="">-- Elige una placa física disponible --</option>
                                    {unitsDisponibles.map((u) => {
                                      const code = u.placa || u.code;
                                      const yaAsignadaEnOtro = asignadas.includes(code) && code !== placaActual;
                                      return (
                                        <option key={code} value={code} disabled={yaAsignadaEnOtro}>
                                          {code} {u.model ? `(${u.model})` : ''} {yaAsignadaEnOtro ? '— (Asignada)' : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de Rechazo (Desplegable) */}
          {resolucion === 'rechazar' && (
            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#ef4444', margin: 0 }}>
                Motivo del Rechazo (Obligatorio) *
              </label>
              <textarea
                rows={2}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ejemplo: No hay disponibilidad en la sede para las fechas requeridas..."
                style={{ fontSize: '13px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setResolucion(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={handleRechazar}
                  disabled={submitting || !motivoRechazo.trim()}
                  style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones / Pie estándar del modal */}
        <div className="modal-footer" style={{ padding: '16px 24px', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </button>

          {!yaResuelta && resolucion !== 'rechazar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setResolucion('rechazar')}
                disabled={submitting}
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.35)' }}
              >
                <XCircle size={15} />
                <span>Rechazar Solicitud</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAprobarYDespachar}
                disabled={submitting}
              >
                <CheckCircle size={15} />
                <span>{submitting ? 'Procesando...' : 'Aprobar y Despachar'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
