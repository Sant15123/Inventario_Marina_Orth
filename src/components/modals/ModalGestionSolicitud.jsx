import React, { useState, useMemo } from 'react';
import {
  X,
  CheckSquare,
  AlertCircle,
  Laptop,
  Box,
  Calendar,
  MapPin,
  FolderGit2,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Tag,
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

  // Para equipos retornables: asignación de placas físicas por cada ítem/unidad
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

  // Para consumibles: cantidades confirmadas
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

  // Toggle de placa física para un equipo
  const handleTogglePlaca = (itemId, placa, maxCantidad) => {
    setPlacasAsignadas((prev) => {
      const currentList = prev[itemId] || [];
      if (currentList.includes(placa)) {
        return { ...prev, [itemId]: currentList.filter((p) => p !== placa) };
      }
      if (currentList.length >= maxCantidad) {
        return prev; // Ya alcanzó la cantidad requerida
      }
      return { ...prev, [itemId]: [...currentList, placa] };
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
        const asignadas = placasAsignadas[it.item_id] || [];
        if (asignadas.length < it.cantidad) {
          setValidationError(
            `Debes asignar ${it.cantidad} placa(s) física(s) para el artículo "${it.nombre_item}". (Asignadas: ${asignadas.length})`
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // 1. Si es Préstamo de Equipo Retornable: crear registros de préstamos
      if (esPrestamo) {
        for (const it of solicitud.items || []) {
          const placas = placasAsignadas[it.item_id] || [];
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
          `Se ha procesado exitosamente la solicitud de ${solicitud.usuario_nombre}. Los registros de préstamo/entrega han sido generados.`
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
        backgroundColor: 'rgba(11, 19, 43, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-dialog bg-white dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[#84CC16]">
              <CheckSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  Gestión y Aprobación de Solicitud
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    solicitud.estado === 'APROBADO'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : solicitud.estado === 'RECHAZADO'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  }`}
                >
                  {solicitud.estado || 'PENDIENTE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revisa los requerimientos, asigna placas físicas de inventario o autoriza despacho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {validationError && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. Datos del Solicitante y Contexto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Custodio / Solicitante:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                <User size={14} className="text-[#84CC16]" />
                <span>{solicitud.usuario_nombre || 'Docente'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Sede de Destino:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                <MapPin size={14} className="text-[#84CC16]" />
                <span>{solicitud.sede || 'Medellín'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold block">Tipo de Requerimiento:</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                {esPrestamo ? <Laptop size={14} className="text-sky-500" /> : <Box size={14} className="text-emerald-500" />}
                <span>{esPrestamo ? 'Equipo Retornable (Préstamo)' : 'Consumibles / Insumos Robótica'}</span>
              </div>
            </div>

            {esPrestamo && (
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Fecha de Retorno Pactada:</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 mono-num">
                  <Calendar size={14} className="text-[#84CC16]" />
                  <span>{fmtDate(solicitud.fecha_devolucion_estimada)}</span>
                </div>
              </div>
            )}

            {solicitud.proyecto_steam_id && (
              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-semibold block">Proyecto STEAM Vinculado:</span>
                <div className="flex items-center gap-1.5 font-semibold text-[#84CC16]">
                  <FolderGit2 size={14} />
                  <span>{solicitud.proyecto_steam_id}</span>
                </div>
              </div>
            )}

            <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block">Motivo / Justificación Pedagógica:</span>
              <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                "{solicitud.motivo || 'Sin justificación detallada'}"
              </p>
            </div>
          </div>

          {/* 2. Detalle de Ítems a Autorizar / Asignar */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Artículos Solicitados & Asignación Física
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(solicitud.items || []).map((it, idx) => {
                  const invItem = inventarioMap.get(String(it.item_id));
                  const unitsDisponibles = (invItem?.units || []).filter((u) => u.status === 'disponible');
                  const stockActualConsumible = Number(invItem?.quantity ?? invItem?.disponible ?? 0);
                  const asignadas = placasAsignadas[it.item_id] || [];

                  return (
                    <div key={idx} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white">
                            {it.nombre_item}
                          </strong>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Solicitado: <strong>{it.cantidad} {it.unidad || 'und'}</strong></span>
                            {!esPrestamo && (
                              <span>· Stock en Bodega: <strong className={stockActualConsumible >= it.cantidad ? 'text-emerald-500' : 'text-amber-500'}>{stockActualConsumible} {it.unidad || 'und'}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Control de cantidad para consumibles */}
                        {!esPrestamo && !yaResuelta && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Cant. a Despachar:</span>
                            <input
                              type="number"
                              min="1"
                              max={stockActualConsumible > 0 ? stockActualConsumible : 99}
                              value={cantidadesAprobadas[it.item_id] ?? it.cantidad}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setCantidadesAprobadas((prev) => ({ ...prev, [it.item_id]: val }));
                              }}
                              className="w-16 px-2 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
                            />
                          </div>
                        )}
                      </div>

                      {/* ASIGNACIÓN DE PLACAS FÍSICAS PARA EQUIPOS RETORNABLES */}
                      {esPrestamo && !yaResuelta && (
                        <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                          <div className="flex items-center justify-between text-[11px] mb-2 font-semibold">
                            <span className="text-slate-600 dark:text-slate-300">
                              Asignar {it.cantidad} Placa(s) Física(s) de Inventario:
                            </span>
                            <span className={asignadas.length === it.cantidad ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                              {asignadas.length} de {it.cantidad} seleccionada(s)
                            </span>
                          </div>

                          {unitsDisponibles.length === 0 ? (
                            <div className="text-[11px] text-amber-500 dark:text-amber-400 italic">
                              ⚠️ No hay placas registradas en estado "Disponible" para este activo. Puedes gestionar el inventario o agregar placas en la sección de Equipos.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {unitsDisponibles.map((u) => {
                                const placaCode = u.placa || u.code;
                                const isSelected = asignadas.includes(placaCode);

                                return (
                                  <button
                                    key={placaCode}
                                    type="button"
                                    onClick={() => handleTogglePlaca(it.item_id, placaCode, it.cantidad)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                                      isSelected
                                        ? 'bg-[#84CC16] text-slate-950 shadow-sm border border-lime-600'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                    }`}
                                  >
                                    <Tag size={12} />
                                    <span>{placaCode}</span>
                                    {isSelected && <span>✓</span>}
                                  </button>
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
          </div>

          {/* 3. Panel de Rechazo (si el usuario pulsa rechazar) */}
          {resolucion === 'rechazar' && (
            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 space-y-2">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                Motivo del Rechazo (Obligatorio para notificar al docente) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ejemplo: Sin disponibilidad actual de portátiles en la sede; actividad no autorizada en el cronograma..."
                className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResolucion(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRechazar}
                  disabled={submitting || !motivoRechazo.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
          >
            Cerrar
          </button>

          {!yaResuelta && resolucion !== 'rechazar' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResolucion('rechazar')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
              >
                <XCircle size={15} />
                <span>Rechazar Solicitud</span>
              </button>

              <button
                type="button"
                onClick={handleAprobarYDespachar}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 text-xs font-black transition-all shadow-md active:scale-95"
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
