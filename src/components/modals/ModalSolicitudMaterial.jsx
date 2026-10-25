import React, { useState, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Laptop,
  Box,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  FolderGit2,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { today } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';

export default function ModalSolicitudMaterial({
  isOpen,
  onClose,
  currentUser,
  items = [],
  sedes = [],
  proyectos = [],
  onSolicitudCreated,
  showSuccess,
  showError,
}) {
  const [tipoSol, setTipoSol] = useState('PRESTAMO_EQUIPO'); // 'PRESTAMO_EQUIPO' | 'CONSUMIBLES'
  const [sede, setSede] = useState(() => currentUser?.sede || sedes[0] || 'Medellín');
  const [proyectoId, setProyectoId] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Ítems acumulados en la solicitud: [{ tipo_item, item_id, nombre_item, cantidad, unidad }]
  const [itemsSolicitud, setItemsSolicitud] = useState([]);

  // Selector temporal para agregar ítem a la lista
  const [selectedItemId, setSelectedItemId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);

  // Catálogo disponible filtrado por tipo de solicitud
  const catalogoDisponible = useMemo(() => {
    if (tipoSol === 'PRESTAMO_EQUIPO') {
      // Activos de cómputo / equipos retornables
      return (items || []).filter((it) => it.itemType === 'equipo');
    }
    // Consumibles / insumos de robótica / papelería
    return (items || []).filter((it) => it.itemType === 'consumible');
  }, [items, tipoSol]);

  // Ítem actualmente seleccionado en el selector
  const currentItemInfo = useMemo(() => {
    if (!selectedItemId) return null;
    return catalogoDisponible.find((it) => String(it.id) === String(selectedItemId)) || null;
  }, [catalogoDisponible, selectedItemId]);

  // Stock disponible del ítem seleccionado
  const stockDisponibleItem = useMemo(() => {
    if (!currentItemInfo) return 0;
    if (tipoSol === 'PRESTAMO_EQUIPO') {
      const unitsDisponibles = (currentItemInfo.units || []).filter((u) => u.status === 'disponible').length;
      return unitsDisponibles > 0 ? unitsDisponibles : 1;
    }
    const q = Number(currentItemInfo.quantity ?? currentItemInfo.disponible ?? 0);
    return isNaN(q) ? 1 : Math.max(0, q);
  }, [currentItemInfo, tipoSol]);

  if (!isOpen) return null;

  // Cambiar tipo de solicitud (reinicia ítems seleccionados)
  const handleChangeTipo = (nuevoTipo) => {
    if (nuevoTipo === tipoSol) return;
    setTipoSol(nuevoTipo);
    setItemsSolicitud([]);
    setSelectedItemId('');
    setCantidadInput(1);
    setValidationError('');
  };

  // Agregar ítem a la lista
  const handleAddItem = () => {
    setValidationError('');
    if (!selectedItemId || !currentItemInfo) {
      setValidationError('Selecciona un artículo del catálogo para agregar.');
      return;
    }

    const qty = parseInt(cantidadInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setValidationError('La cantidad debe ser mayor a 0.');
      return;
    }

    // Verificar si ya está en la lista
    const yaExiste = itemsSolicitud.find((it) => String(it.item_id) === String(currentItemInfo.id));
    if (yaExiste) {
      setValidationError('El artículo ya se encuentra en la lista de solicitud.');
      return;
    }

    const nuevoItem = {
      tipo_item: tipoSol === 'PRESTAMO_EQUIPO' ? 'equipo' : 'consumible',
      item_id: currentItemInfo.id,
      nombre_item: currentItemInfo.name || currentItemInfo.material || 'Artículo',
      cantidad: qty,
      unidad: currentItemInfo.unit || 'und',
    };

    setItemsSolicitud((prev) => [...prev, nuevoItem]);
    setSelectedItemId('');
    setCantidadInput(1);
  };

  // Eliminar ítem de la lista
  const handleRemoveItem = (index) => {
    setItemsSolicitud((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Enviar la solicitud completa
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (itemsSolicitud.length === 0) {
      setValidationError('Debes agregar al menos un artículo a la solicitud.');
      return;
    }

    if (!motivo.trim()) {
      setValidationError('El motivo o justificación pedagógica es obligatorio.');
      return;
    }

    if (tipoSol === 'PRESTAMO_EQUIPO') {
      if (!fechaEstimada) {
        setValidationError('La fecha estimada de devolución es obligatoria para préstamos de equipo.');
        return;
      }
      const fechaActual = today();
      if (fechaEstimada < fechaActual) {
        setValidationError('La fecha estimada de devolución no puede ser una fecha pasada.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        usuario_id: currentUser?.id || currentUser?.documento || 'usr-temp',
        usuario_nombre: currentUser?.nombre || currentUser?.nombre_completo || 'Docente / Custodio',
        sede: sede || 'Medellín',
        tipo_solicitud: tipoSol,
        proyecto_steam_id: proyectoId || null,
        motivo: motivo.trim(),
        fecha_devolucion_estimada: tipoSol === 'PRESTAMO_EQUIPO' ? fechaEstimada : null,
        estado: 'PENDIENTE',
        items: itemsSolicitud,
        created_at: new Date().toISOString(),
        fecha_radicado: today(),
      };

      const respuesta = await inventoryApi.createSolicitud(payload);

      if (showSuccess) {
        showSuccess(
          'Solicitud enviada exitosamente',
          'Tu requerimiento ha sido radicado para revisión y aprobación administrativa.'
        );
      }

      if (onSolicitudCreated) {
        onSolicitudCreated(respuesta || payload);
      }

      onClose();
    } catch (err) {
      const msg = err.message || 'Error al enviar la solicitud';
      setValidationError(msg);
      if (showError) showError('Error al enviar solicitud', msg);
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
          maxWidth: '680px',
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
              <PackagePlus size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Solicitud de Equipos e Insumos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Radica requerimientos de materiales tecnológicos para tus actividades pedagógicas
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
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {validationError && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. Selector de Tipo de Solicitud */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Tipo de Solicitud
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChangeTipo('PRESTAMO_EQUIPO')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoSol === 'PRESTAMO_EQUIPO'
                    ? 'border-[#84CC16] bg-lime-500/10 text-lime-600 dark:text-[#84CC16] shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Laptop size={18} />
                <span>Equipo Retornable (Préstamo)</span>
              </button>

              <button
                type="button"
                onClick={() => handleChangeTipo('CONSUMIBLES')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                  tipoSol === 'CONSUMIBLES'
                    ? 'border-[#84CC16] bg-lime-500/10 text-lime-600 dark:text-[#84CC16] shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Box size={18} />
                <span>Consumibles / Insumos Robótica</span>
              </button>
            </div>
          </div>

          {/* 2. Selección y agregado dinámico de artículos */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seleccionar Artículos del Catálogo
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1">
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setCantidadInput(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
                >
                  <option value="">
                    {tipoSol === 'PRESTAMO_EQUIPO'
                      ? '-- Seleccionar equipo retornable --'
                      : '-- Seleccionar material o insumo --'}
                  </option>
                  {catalogoDisponible.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name || it.material} {it.category ? `(${it.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max={tipoSol === 'CONSUMIBLES' && stockDisponibleItem > 0 ? stockDisponibleItem : 99}
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  placeholder="Cant."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus size={16} />
                <span>Agregar</span>
              </button>
            </div>

            {/* Lista visual de ítems agregados */}
            <div className="mt-3">
              {itemsSolicitud.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  Ningún artículo agregado aún a esta solicitud.
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                        <th className="p-2.5 text-left">Artículo / Material</th>
                        <th className="p-2.5 text-center w-20">Cantidad</th>
                        <th className="p-2.5 text-center w-16">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {itemsSolicitud.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {it.nombre_item}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-400 font-bold">
                              {it.cantidad} {it.unidad}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Quitar artículo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 3. Condiciones de Préstamo (Solo si es equipo retornable) */}
          {tipoSol === 'PRESTAMO_EQUIPO' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <Calendar size={14} className="inline mr-1 text-[#84CC16]" />
                Fecha de Devolución Estimada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={today()}
                value={fechaEstimada}
                onChange={(e) => setFechaEstimada(e.target.value)}
                required={tipoSol === 'PRESTAMO_EQUIPO'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Fecha límite pactada para retornar los equipos a la bodega o sede central.
              </span>
            </div>
          )}

          {/* 4. Sede y Proyecto STEAM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <MapPin size={14} className="inline mr-1 text-[#84CC16]" />
                Sede / Municipio Destino <span className="text-rose-500">*</span>
              </label>
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
              >
                {sedes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <FolderGit2 size={14} className="inline mr-1 text-[#84CC16]" />
                Proyecto STEAM Vinculado (Opcional)
              </label>
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
              >
                <option value="">-- Sin vincular a proyecto específico --</option>
                {proyectos.map((p) => {
                  const val = typeof p === 'string' ? p : p.nombre || p.id;
                  const label = typeof p === 'string' ? p : p.nombre || p.id;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* 5. Motivo y Justificación Pedagógica */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              <FileText size={14} className="inline mr-1 text-[#84CC16]" />
              Motivo / Justificación Pedagógica o Técnica <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe detalladamente el taller, clase, evento o necesidad formativa que justifica esta solicitud..."
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#84CC16]"
            />
          </div>

          {/* Botones de acción inferiores */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || itemsSolicitud.length === 0 || !motivo.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-black transition-all shadow-md"
            >
              <CheckCircle2 size={16} />
              <span>{submitting ? 'Enviando...' : 'Enviar Solicitud'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
