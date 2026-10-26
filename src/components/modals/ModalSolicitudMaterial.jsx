import React, { useState, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Laptop,
  Package,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  FolderGit2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
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
      setValidationError('');

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

      const res = await inventoryApi.createSolicitud(payload);

      // Validación estricta del status HTTP
      if (res && (res.status === 200 || res.status === 201)) {
        if (showSuccess) {
          showSuccess(
            'Solicitud enviada exitosamente',
            'Tu requerimiento ha sido radicado para revisión y aprobación administrativa.'
          );
        }

        const solicitudCreada = res.data || payload;

        if (onSolicitudCreated) {
          onSolicitudCreated(solicitudCreada);
        }

        // Emitir evento reactivo local para actualizar de inmediato el badge de la campanita
        try {
          window.dispatchEvent(
            new CustomEvent('siga:solicitud_creada', { detail: solicitudCreada })
          );
        } catch (e) {
          console.warn('Error emitiendo evento de solicitud creada:', e);
        }

        // Cerrar modal únicamente tras respuesta exitosa
        onClose();
      } else {
        throw new Error(res?.data?.message || 'No se pudo radicar la solicitud');
      }
    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      const mensaje =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Error al conectar con el servidor';

      setValidationError(`Error: ${mensaje}`);
      if (showError) {
        showError('Error al enviar solicitud', `Error: ${mensaje}`);
      }
      // No cerrar modal ni limpiar formulario si la petición falla (4xx o 5xx)
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
        className="max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--surface, #0f172a)',
          borderColor: 'var(--line-strong, #1e293b)',
          color: 'var(--text, #f8fafc)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 2. Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(132, 204, 22, 0.15)',
                border: '1px solid rgba(132, 204, 22, 0.35)',
                color: '#84CC16',
              }}
            >
              <PackagePlus size={20} />
            </div>
            <div>
              <h2
                className="text-xl font-bold flex items-center gap-2.5"
                style={{ color: 'var(--text, #f8fafc)', margin: 0 }}
              >
                Solicitud de Equipos e Insumos
              </h2>
              <p
                className="text-xs font-normal mt-0.5"
                style={{ color: 'var(--text-dim, #94a3b8)', margin: 0 }}
              >
                Radica requerimientos de materiales tecnológicos para tus actividades pedagógicas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              outline: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text, #ffffff)';
              e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(148, 163, 184, 0.12))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Formulario y cuerpo scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" style={{ margin: 0 }}>
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {validationError && (
              <div
                className="flex items-center gap-2.5 p-3.5 text-xs rounded-xl font-medium"
                style={{
                  backgroundColor: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fda4af',
                }}
              >
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 3. Tipo de Solicitud (Segmented Control / Tabs tipo botón) */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                style={{ color: 'var(--text-dim, #94a3b8)' }}
              >
                Tipo de Solicitud
              </label>
              <div
                className="grid grid-cols-2 gap-2 p-1.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-alt, #0b1120)',
                  borderColor: 'var(--line, #1e293b)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleChangeTipo('PRESTAMO_EQUIPO')}
                  className="rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
                  style={
                    tipoSol === 'PRESTAMO_EQUIPO'
                      ? {
                          backgroundColor: '#84CC16',
                          color: '#020617',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(132, 204, 22, 0.25)',
                          border: '1px solid #84CC16',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-dim, #94a3b8)',
                          fontWeight: 500,
                          border: '1px solid transparent',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (tipoSol !== 'PRESTAMO_EQUIPO') {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(255, 255, 255, 0.05))';
                      e.currentTarget.style.color = 'var(--text, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tipoSol !== 'PRESTAMO_EQUIPO') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                    }
                  }}
                >
                  <Laptop size={18} />
                  <span>Equipo Retornable (Préstamo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeTipo('CONSUMIBLES')}
                  className="rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
                  style={
                    tipoSol === 'CONSUMIBLES'
                      ? {
                          backgroundColor: '#84CC16',
                          color: '#020617',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(132, 204, 22, 0.25)',
                          border: '1px solid #84CC16',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-dim, #94a3b8)',
                          fontWeight: 500,
                          border: '1px solid transparent',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (tipoSol !== 'CONSUMIBLES') {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(255, 255, 255, 0.05))';
                      e.currentTarget.style.color = 'var(--text, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tipoSol !== 'CONSUMIBLES') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                    }
                  }}
                >
                  <Package size={18} />
                  <span>Consumibles / Insumos Robótica</span>
                </button>
              </div>
            </div>

            {/* 4. Tarjeta de Selección de Artículos */}
            <div
              className="rounded-xl p-4 space-y-3 border"
              style={{
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                borderColor: 'var(--line, #1e293b)',
              }}
            >
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                style={{ color: 'var(--text-dim, #94a3b8)' }}
              >
                Seleccionar Artículos del Catálogo
              </label>

              {/* Fila de controles */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setCantidadInput(1);
                  }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                >
                  <option value="">
                    {tipoSol === 'PRESTAMO_EQUIPO'
                      ? '-- Seleccionar equipo tecnológico --'
                      : '-- Seleccionar material o insumo --'}
                  </option>
                  {catalogoDisponible.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name || it.material} {it.category ? `(${it.category})` : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max={tipoSol === 'CONSUMIBLES' && stockDisponibleItem > 0 ? stockDisponibleItem : 99}
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  placeholder="Cant."
                  className="w-20 rounded-lg px-3 py-2 text-sm text-center font-semibold border focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                />

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: '#84CC16',
                    color: '#020617',
                    border: '1px solid #84CC16',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#65A30D')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#84CC16')}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>+ Agregar</span>
                </button>
              </div>

              {/* Lista de Artículos Agregados */}
              <div>
                {itemsSolicitud.length === 0 ? (
                  <div
                    className="text-xs text-center py-4 rounded-lg border border-dashed"
                    style={{
                      backgroundColor: 'var(--bg-alt, rgba(11, 17, 32, 0.45))',
                      borderColor: 'var(--line, #334155)',
                      color: 'var(--text-dim, #94a3b8)',
                    }}
                  >
                    Ningún artículo agregado aún a esta solicitud.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {itemsSolicitud.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm shadow-sm transition-all"
                        style={{
                          backgroundColor: 'var(--bg, #0b1120)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span
                            className="p-1.5 rounded-md shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: 'rgba(132, 204, 22, 0.15)',
                              color: '#84CC16',
                            }}
                          >
                            {it.tipo_item === 'equipo' ? <Laptop size={14} /> : <Package size={14} />}
                          </span>
                          <span
                            className="font-medium truncate text-xs"
                            style={{ color: 'var(--text, #f8fafc)' }}
                          >
                            {it.nombre_item}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: 'rgba(132, 204, 22, 0.18)',
                              color: '#bef264',
                              border: '1px solid rgba(132, 204, 22, 0.4)',
                            }}
                          >
                            {it.cantidad} {it.unidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Quitar artículo"
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--red, #f43f5e)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Campos de Formulario y Tipografía */}
            {/* Fecha de Devolución Estimada (Solo para equipos retornables) */}
            {tipoSol === 'PRESTAMO_EQUIPO' && (
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <Calendar size={14} style={{ color: '#84CC16' }} />
                  <span>Fecha de Devolución Estimada</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  min={today()}
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  required={tipoSol === 'PRESTAMO_EQUIPO'}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                />
                <span
                  className="text-[11px] mt-1 block"
                  style={{ color: 'var(--text-muted, #64748b)' }}
                >
                  Fecha límite pactada para retornar los equipos a la bodega o sede central.
                </span>
              </div>
            )}

            {/* Sede / Municipio Destino y Proyecto STEAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <MapPin size={14} style={{ color: '#84CC16' }} />
                  <span>Sede / Municipio Destino</span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                >
                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <FolderGit2 size={14} style={{ color: '#84CC16' }} />
                  <span>Proyecto STEAM Vinculado (Opcional)</span>
                </label>
                <select
                  value={proyectoId}
                  onChange={(e) => setProyectoId(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
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

            {/* Motivo / Justificación */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                style={{ color: 'var(--text-dim, #94a3b8)' }}
              >
                <FileText size={14} style={{ color: '#84CC16' }} />
                <span>Motivo / Justificación Pedagógica o Técnica</span>
                <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe detalladamente el taller, clase, evento o necesidad formativa que justifica esta solicitud..."
                required
                className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                style={{
                  backgroundColor: 'var(--bg, #0b1120)',
                  borderColor: 'var(--line, #334155)',
                  color: 'var(--text, #f8fafc)',
                }}
              />
            </div>
          </div>

          {/* 6. Footer Fijo con Separación de Botones */}
          <div
            className="px-6 py-4 border-t flex items-center justify-between shrink-0"
            style={{
              borderTop: '1px solid var(--line, #1e293b)',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
            }}
          >
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="btn ghost"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || itemsSolicitud.length === 0 || !motivo.trim()}
              className="btn btn-primary"
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#84CC16',
                borderColor: '#84CC16',
                color: '#020617',
                cursor: submitting || itemsSolicitud.length === 0 || !motivo.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || itemsSolicitud.length === 0 || !motivo.trim() ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  <span>Enviar Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
