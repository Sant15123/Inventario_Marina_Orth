import React, { useState, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Laptop,
  Box,
  MapPin,
  Sparkles,
  User,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
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
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-dialog bg-white dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '740px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* =========================================================================
            1. ESTRUCTURA Y CABECERA
            ========================================================================= */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0B132B]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Gestión y Aprobación de Solicitud
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                  solicitud.estado === 'APROBADO'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : solicitud.estado === 'RECHAZADO'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                {solicitud.estado || 'PENDIENTE'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Revisa los requerimientos, asigna placas físicas de inventario o autoriza despacho
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* =========================================================================
            CONTENIDO SCROLLEABLE
            ========================================================================= */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {validationError && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* =========================================================================
              2. PANEL DE INFORMACIÓN DEL SOLICITANTE (GRID 2x2)
              ========================================================================= */}
          <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Solicitante */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
                    Custodio / Docente
                  </span>
                  <strong className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {solicitud.usuario_nombre || 'Docente Institucional'}
                  </strong>
                </div>
              </div>

              {/* Sede de Destino */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100/70 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
                    Sede / Ubicación
                  </span>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    {solicitud.sede || 'Medellín'}
                  </span>
                </div>
              </div>

              {/* Tipo de Requerimiento */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  {esPrestamo ? <Laptop size={16} /> : <Box size={16} />}
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
                    Tipo de Requerimiento
                  </span>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      esPrestamo
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {esPrestamo ? 'Equipo Retornable (Préstamo)' : 'Consumibles / Insumos Robótica'}
                  </span>
                  {esPrestamo && solicitud.fecha_devolucion_estimada && (
                    <div className="text-[11px] text-gray-400 mt-1">
                      Retorno pactado: <strong className="text-gray-700 dark:text-gray-300 mono-num">{fmtDate(solicitud.fecha_devolucion_estimada)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Proyecto STEAM */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
                    Proyecto Vinculado
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 block mt-0.5">
                    {solicitud.proyecto_steam_id || 'Sin vincular a proyecto específico'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloque de Justificación (Debajo del grid) */}
            <div className="bg-white dark:bg-slate-800/80 rounded-lg p-3 border border-slate-200 dark:border-slate-700/80 mt-3.5">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-slate-400 block mb-1">
                Motivo / Justificación Pedagógica
              </span>
              <p className="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed">
                "{solicitud.motivo || 'Sin justificación detallada'}"
              </p>
            </div>
          </div>

          {/* =========================================================================
              3. SECCIÓN: ARTÍCULOS SOLICITADOS & ASIGNACIÓN FÍSICA
              ========================================================================= */}
          <div>
            <h3 className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-slate-400 mb-3">
              Artículos Solicitados & Asignación Física
            </h3>

            <div className="space-y-3">
              {(solicitud.items || []).map((it, idx) => {
                const invItem = inventarioMap.get(String(it.item_id));
                const unitsDisponibles = (invItem?.units || []).filter((u) => u.status === 'disponible');
                const stockActualConsumible = Number(invItem?.quantity ?? invItem?.disponible ?? 0);
                const asignadas = (placasAsignadas[it.item_id] || []).filter(Boolean);
                const cantidadAprobada = cantidadesAprobadas[it.item_id] ?? it.cantidad ?? 1;

                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Lado izquierdo: Metadatos */}
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {it.nombre_item}
                      </h4>
                      <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>
                          Solicitado: <strong className="text-gray-700 dark:text-gray-300 font-semibold">{it.cantidad} {it.unidad || 'und'}</strong>
                        </span>
                        <span>•</span>
                        {!esPrestamo ? (
                          <span>
                            Stock disponible en bodega:{' '}
                            <strong className={stockActualConsumible >= it.cantidad ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                              {stockActualConsumible} {it.unidad || 'und'}
                            </strong>
                          </span>
                        ) : (
                          <span>
                            Equipos disponibles:{' '}
                            <strong className={unitsDisponibles.length >= it.cantidad ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                              {unitsDisponibles.length} unidades
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lado derecho: Despacho / Asignación */}
                    <div>
                      {/* SI ES CONSUMIBLE: Control numérico con botones +/- */}
                      {!esPrestamo && !yaResuelta && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap font-medium">
                            Cant. a despachar:
                          </span>
                          <div className="flex items-center border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleAjustarCantidad(it.item_id, -1, stockActualConsumible)}
                              className="px-2.5 py-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              title="Disminuir"
                            >
                              <Minus size={14} />
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
                              className="w-14 text-center font-bold text-xs text-gray-800 dark:text-gray-100 bg-transparent border-0 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleAjustarCantidad(it.item_id, 1, stockActualConsumible)}
                              className="px-2.5 py-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              title="Aumentar"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SI ES EQUIPO RETORNABLE: Selectores dropdown limpios para elegir placa física */}
                      {esPrestamo && !yaResuelta && (
                        <div className="space-y-2">
                          {Array.from({ length: it.cantidad }).map((_, unitIdx) => {
                            const placaActual = asignadas[unitIdx] || '';

                            return (
                              <div key={unitIdx} className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap font-medium">
                                  {it.cantidad > 1 ? `Placa ${unitIdx + 1}:` : 'Placa física:'}
                                </span>
                                <select
                                  value={placaActual}
                                  onChange={(e) => handleSelectPlacaDropdown(it.item_id, unitIdx, e.target.value)}
                                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm min-w-[200px]"
                                >
                                  <option value="">-- Asignar Placa (ej. P33) --</option>
                                  {unitsDisponibles.map((u) => {
                                    const code = u.placa || u.code;
                                    const yaAsignadaEnOtro = asignadas.includes(code) && code !== placaActual;
                                    return (
                                      <option key={code} value={code} disabled={yaAsignadaEnOtro}>
                                        {code} {u.model ? `(${u.model})` : ''} {yaAsignadaEnOtro ? '— (Ya seleccionada)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* VISTA RESUELTA */}
                      {yaResuelta && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-400">
                          {solicitud.estado === 'APROBADO' ? '✓ Despacho autorizado' : '✕ Requerimiento desestimado'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              PANEL DE RECHAZO (DESPLEGABLE)
              ========================================================================= */}
          {resolucion === 'rechazar' && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/40 space-y-2.5">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                Motivo del Rechazo (Obligatorio) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ejemplo: No hay disponibilidad en la sede para las fechas requeridas; actividad no contemplada en el cronograma..."
                className="w-full px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 shadow-sm"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResolucion(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRechazar}
                  disabled={submitting || !motivoRechazo.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. BARRA DE ACCIONES (FOOTER)
            ========================================================================= */}
        <div className="border-t border-gray-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between bg-white dark:bg-[#0B132B]">
          {/* Lado izquierdo: Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Cerrar
          </button>

          {/* Lado derecho: Acciones principales */}
          {!yaResuelta && resolucion !== 'rechazar' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setResolucion('rechazar')}
                disabled={submitting}
                className="border border-red-200 text-red-600 hover:bg-red-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
              >
                <XCircle size={16} />
                <span>Rechazar Solicitud</span>
              </button>

              <button
                type="button"
                onClick={handleAprobarYDespachar}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2 transition-all hover:shadow cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Procesando...' : 'Aprobar y Despachar'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
