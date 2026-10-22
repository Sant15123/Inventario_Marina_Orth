import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * ModalEditarActivo: Componente modal unificado para editar equipos tecnológicos.
 * Se reutiliza tanto desde la tabla de inventario como desde la consulta de placa/detalle.
 * 
 * Props soportadas:
 * - isOpen (boolean)
 * - onClose (function)
 * - activo / equipo (object)
 * - onSaveSuccess / onSave / onSubmit (function)
 * - formData (opcional, para modo controlado)
 * - setFormData (opcional, para modo controlado)
 * - pasoActual (opcional)
 * - setPasoActual (opcional)
 * - submitting (opcional)
 */
export default function ModalEditarActivo({
  isOpen,
  onClose,
  activo,
  equipo,
  onSaveSuccess,
  onSave,
  formData: externalFormData,
  setFormData: externalSetFormData,
  pasoActual: externalPasoActual,
  setPasoActual: externalSetPasoActual,
  onSubmit: externalOnSubmit,
  submitting: externalSubmitting,
}) {
  const { showEditSuccess, showError } = useToast();
  const itemActivo = activo || equipo;

  // Estado interno para uso autónomo
  const [internalPasoActual, setInternalPasoActual] = useState(1);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalFormData, setInternalFormData] = useState({
    placa: '',
    nombre: '',
    categoria: 'Portátiles',
    condicion: 'Bueno',
    area: 'Tecnología',
    ubicacion: 'Oficina Medellín',
    ubicacion_estante: '',
    cantidad: 1,
    descripcion: '',
    marca: '',
    modelo: '',
    serial: '',
    caracteristica_1: '',
    caracteristica_2: '',
    caracteristica_3: '',
    responsable: 'Bodega Central',
    proveedor: '',
    valor_compra: '',
    valor_total: '',
    fecha_compra: '',
    fecha_vencimiento_garantia: '',
    claves_otros: '',
    observaciones: '',
  });

  const pasoActual = externalPasoActual !== undefined ? externalPasoActual : internalPasoActual;
  const setPasoActual = externalSetPasoActual || setInternalPasoActual;
  const isControlledForm = Boolean(externalFormData && externalSetFormData);
  const formData = isControlledForm ? externalFormData : internalFormData;
  const setFormData = isControlledForm ? externalSetFormData : setInternalFormData;
  const isSubmitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  // Sincronizar datos si no está controlado externamente
  useEffect(() => {
    if (!isControlledForm && itemActivo) {
      setInternalFormData({
        ...itemActivo,
        placa: itemActivo.placa || itemActivo.codigo || itemActivo.code || itemActivo.id || '',
        nombre: itemActivo.nombre || itemActivo.equipo || itemActivo.material || itemActivo.name || '',
        categoria: itemActivo.categoria || itemActivo.category || 'Portátiles',
        condicion: itemActivo.condicion || itemActivo.estado_fisico || itemActivo.estado || 'Bueno',
        area: itemActivo.area || 'Tecnología',
        ubicacion: itemActivo.ubicacion || itemActivo.location || 'Oficina Medellín',
        ubicacion_estante: itemActivo.ubicacion_estante || '',
        cantidad: 1,
        descripcion:
          itemActivo.descripcion && itemActivo.descripcion !== 'Sin descripción general registrada.'
            ? itemActivo.descripcion
            : '',
        marca: itemActivo.marca || '',
        modelo: itemActivo.modelo || itemActivo.model || '',
        serial: itemActivo.serial || '',
        caracteristica_1: itemActivo.caracteristica_1 || '',
        caracteristica_2: itemActivo.caracteristica_2 || '',
        caracteristica_3: itemActivo.caracteristica_3 || '',
        responsable: itemActivo.responsable || itemActivo.custodio || 'Bodega Central',
        proveedor: itemActivo.proveedor || '',
        valor_compra: itemActivo.valor_compra || '',
        valor_total: itemActivo.valor_total || '',
        fecha_compra: itemActivo.fecha_compra
          ? itemActivo.fecha_compra.split('T')[0]
          : itemActivo.fecha_ingreso
            ? itemActivo.fecha_ingreso.split('T')[0]
            : '',
        fecha_vencimiento_garantia: itemActivo.fecha_vencimiento_garantia
          ? itemActivo.fecha_vencimiento_garantia.split('T')[0]
          : itemActivo.garantia
            ? itemActivo.garantia.split('T')[0]
            : '',
        claves_otros: itemActivo.claves_otros || '',
        observaciones: itemActivo.observaciones || itemActivo.notas || itemActivo.notes || '',
      });
      setInternalPasoActual(1);
    }
  }, [itemActivo, isControlledForm]);

  if (!isOpen || !itemActivo) return null;

  // Manejador del submit autónomo si no hay externalOnSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (externalOnSubmit) {
      return externalOnSubmit(e);
    }

    // Validación paso 1
    if (!formData.nombre?.trim()) {
      showError('Validación', 'El Nombre del equipo es obligatorio.');
      setPasoActual(1);
      return;
    }
    if (!formData.placa?.trim()) {
      showError('Validación', 'La Placa / Código del equipo es obligatorio.');
      setPasoActual(1);
      return;
    }
    // Validación paso 2
    if (!formData.serial?.trim()) {
      showError('Validación', 'El Serial del equipo es obligatorio.');
      setPasoActual(2);
      return;
    }

    try {
      setInternalSubmitting(true);
      if (onSave) {
        await onSave(formData);
      } else if (onSaveSuccess) {
        await onSaveSuccess(formData);
      }
      onClose();
      showEditSuccess(formData.nombre || formData.placa);
    } catch (err) {
      console.error('Error al guardar equipo:', err);
      showError('Error al guardar cambios', err.message || 'Error desconocido');
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface, #0b1320)',
          border: '1px solid var(--line, #1e293b)',
          borderRadius: '16px',
          maxWidth: '36rem',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--mono)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'block',
                marginBottom: '2px',
              }}
            >
              {formData.placa || itemActivo.placa || 'ACT-FMO-001'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0" style={{ margin: 0, fontSize: '15px' }}>
              Editar Equipo Tecnológico
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
              Modifica los datos del equipo y sus especificaciones técnicas
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Fijo bajo el Header: Pastillas Redondeadas */}
        <div
          className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a]/50 shrink-0"
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
            flexShrink: 0,
          }}
        >
          <div
            className="flex items-center justify-between gap-2 max-w-xl mx-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
            }}
          >
            {[
              { paso: 1, label: 'Identificación', icono: '1' },
              { paso: 2, label: 'Ficha Técnica', icono: '2' },
              { paso: 3, label: 'Adquisición', icono: '3' },
            ].map((item) => {
              const isActive = pasoActual === item.paso;
              const isDone = pasoActual > item.paso;
              return (
                <button
                  key={item.paso}
                  type="button"
                  onClick={() => setPasoActual(item.paso)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 border-lime-400 shadow-sm'
                      : isDone
                        ? 'bg-lime-950/40 text-lime-400 border-lime-500/40 hover:bg-lime-900/40'
                        : 'bg-slate-200 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-800'
                  }`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive
                      ? '#ABDE16'
                      : isDone
                        ? 'rgba(171, 222, 22, 0.12)'
                        : 'rgba(30, 41, 59, 0.4)',
                    color: isActive
                      ? '#0f172a'
                      : isDone
                        ? '#ABDE16'
                        : 'var(--text-dim, #94a3b8)',
                    border: isActive
                      ? '1px solid #ABDE16'
                      : isDone
                        ? '1px solid rgba(171, 222, 22, 0.35)'
                        : '1px solid var(--line, #334155)',
                    boxShadow: isActive ? '0 2px 10px rgba(171, 222, 22, 0.3)' : 'none',
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                        : isDone
                          ? 'text-lime-400 font-bold'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold'
                    }`}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      backgroundColor: isActive
                        ? 'rgba(15, 23, 42, 0.2)'
                        : isDone
                          ? 'transparent'
                          : 'rgba(148, 163, 184, 0.2)',
                      color: isActive
                        ? '#0f172a'
                        : isDone
                          ? '#ABDE16'
                          : 'var(--text-dim, #94a3b8)',
                    }}
                  >
                    {isDone ? '✓' : item.icono}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario Estructurado */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {/* Cuerpo del Formulario */}
          <div
            className="p-5 text-sm overflow-y-auto flex-1"
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--surface, #0b1320)',
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {/* ==========================================
                PASO 1: Identificación y Clasificación
                ========================================== */}
            {pasoActual === 1 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Identificación y Clasificación
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
                </div>

                {/* Fila 1: Código / Placa y Nombre del Equipo en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Código / Placa *
                    </label>
                    <input
                      required
                      type="text"
                      name="placa"
                      value={formData.placa || ''}
                      onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                      placeholder="Ej: FMO-EQ-005 o PLA-901"
                      className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Nombre Del Equipo *
                    </label>
                    <input
                      required
                      type="text"
                      name="nombre"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej. Computador portatil"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Categoría y Condición en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Categoría *
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria || 'Portátiles'}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {formData.categoria && ![
                        'Portátiles', 'Tablets', 'Robótica y Sensores', 'Proyectores y Audio',
                        'Cámaras y Video', 'Impresoras 3D', 'Redes y Servidores', 'Otros Equipos'
                      ].includes(formData.categoria) && (
                        <option value={formData.categoria}>{formData.categoria}</option>
                      )}
                      <option value="Portátiles">Portátiles / Laptops</option>
                      <option value="Tablets">Tablets</option>
                      <option value="Robótica y Sensores">Robótica y Sensores</option>
                      <option value="Proyectores y Audio">Proyectores y Audio</option>
                      <option value="Cámaras y Video">Cámaras y Video</option>
                      <option value="Impresoras 3D">Impresoras 3D</option>
                      <option value="Redes y Servidores">Redes y Servidores</option>
                      <option value="Otros Equipos">Otros Equipos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Condición Física
                    </label>
                    <select
                      name="condicion"
                      value={formData.condicion || 'Bueno'}
                      onChange={(e) => setFormData({ ...formData, condicion: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      <option value="Bueno">Bueno</option>
                      <option value="Nuevo">Nuevo</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                      <option value="Usado">Usado</option>
                      <option value="Donación">Donación</option>
                    </select>
                  </div>
                </div>

                {/* Fila 3: Área / Proceso y Sede / Ubicación Física en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Área / Proceso
                    </label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="Ej. Tecnología, Robótica, Formación..."
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Sede / Ubicación Física
                    </label>
                    <input
                      type="text"
                      name="ubicacion"
                      value={formData.ubicacion || ''}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                      placeholder="Ej. Sede Medellín, Sala de Cómputo"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 4: Descripción General */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Descripción General
                  </label>
                  <textarea
                    name="descripcion"
                    rows="2"
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción y detalles del equipo..."
                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                    style={{
                      backgroundColor: 'var(--bg, #0f172a)',
                      color: 'var(--text, #f8fafc)',
                      borderColor: 'var(--line, #334155)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* ==========================================
                PASO 2: Ficha Técnica y Asignación
                ========================================== */}
            {pasoActual === 2 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Especificaciones y Ficha Técnica
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
                </div>

                {/* Fila 1: Marca, Modelo, Serial * en 3 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Marca
                    </label>
                    <input
                      type="text"
                      name="marca"
                      value={formData.marca || ''}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      placeholder="Ej. Lenovo, Dell, HP..."
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      name="modelo"
                      value={formData.modelo || ''}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      placeholder="Ej. ThinkPad L14"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Serial *
                    </label>
                    <input
                      required
                      type="text"
                      name="serial"
                      value={formData.serial || ''}
                      onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                      placeholder="Ej. PF-3X9011"
                      className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Características 1, 2 y 3 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Característica 1 (CPU)
                    </label>
                    <input
                      type="text"
                      name="caracteristica_1"
                      value={formData.caracteristica_1 || ''}
                      onChange={(e) => setFormData({ ...formData, caracteristica_1: e.target.value })}
                      placeholder="Ej. RAM 16GB / i5"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Característica 2 (RAM)
                    </label>
                    <input
                      type="text"
                      name="caracteristica_2"
                      value={formData.caracteristica_2 || ''}
                      onChange={(e) => setFormData({ ...formData, caracteristica_2: e.target.value })}
                      placeholder="Ej. SSD 512GB"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Característica 3 (Disco)
                    </label>
                    <input
                      type="text"
                      name="caracteristica_3"
                      value={formData.caracteristica_3 || ''}
                      onChange={(e) => setFormData({ ...formData, caracteristica_3: e.target.value })}
                      placeholder="Ej. Pantalla 14 FHD"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 3: Ubicación Física, Estante / Gaveta y Responsable */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Sede / Ubicación Física
                    </label>
                    <input
                      type="text"
                      name="ubicacion"
                      value={formData.ubicacion || ''}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                      placeholder="Ej. Oficina Medellín"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Estante / Caja / Gaveta
                    </label>
                    <input
                      type="text"
                      name="ubicacion_estante"
                      value={formData.ubicacion_estante || ''}
                      onChange={(e) => setFormData({ ...formData, ubicacion_estante: e.target.value })}
                      placeholder="Ej. Estante A-2, Caja 05"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Responsable / Asignado
                    </label>
                    <input
                      type="text"
                      name="responsable"
                      value={formData.responsable || ''}
                      onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                      placeholder="Ej. Bodega Central o Custodio"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ==========================================
                PASO 3: Adquisición, Garantía y Credenciales
                ========================================== */}
            {pasoActual === 3 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Adquisición, Garantía y Credenciales
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Datos de compra y credenciales</span>
                </div>

                {/* Fila 1: Proveedor, Valor Unitario, Valor Total */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      name="proveedor"
                      value={formData.proveedor || ''}
                      onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                      placeholder="Ej. Lenovo Colombia"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Valor Unitario ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="valor_compra"
                      value={formData.valor_compra ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const qty = Number(formData.cantidad) || 1;
                        setFormData({
                          ...formData,
                          valor_compra: val,
                          valor_total: val !== '' ? Number(val) * qty : '',
                        });
                      }}
                      placeholder="Ej. 2800000"
                      className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Valor Total ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="valor_total"
                      value={formData.valor_total ?? ''}
                      onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                      placeholder="Ej. 2800000"
                      className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Fecha de Compra y Vencimiento Garantía */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Fecha de Compra
                    </label>
                    <input
                      type="date"
                      name="fecha_compra"
                      value={formData.fecha_compra || ''}
                      onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Vencimiento Garantía
                    </label>
                    <input
                      type="date"
                      name="fecha_vencimiento_garantia"
                      value={formData.fecha_vencimiento_garantia || ''}
                      onChange={(e) => setFormData({ ...formData, fecha_vencimiento_garantia: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 3: Claves / Credenciales y Observaciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Claves / Credenciales
                    </label>
                    <textarea
                      name="claves_otros"
                      rows="2"
                      value={formData.claves_otros || ''}
                      onChange={(e) => setFormData({ ...formData, claves_otros: e.target.value })}
                      placeholder="PIN de acceso, usuario administrador o credenciales..."
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      rows="2"
                      value={formData.observaciones || ''}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Comentarios adicionales, estado del paquete, donante..."
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Fijo Abajo */}
          <div
            className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'var(--surface-2, #0f172a)',
              borderTop: '1px solid var(--line, #1e293b)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Botón Cancelar (Izquierda) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line, #334155)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            {/* Botones de Navegación del Asistente (Derecha) */}
            <div
              className="flex items-center gap-2.5"
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              {pasoActual > 1 && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPasoActual(pasoActual - 1)}
                  className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface, #1e293b)',
                    border: '1px solid var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>←</span> Anterior
                </button>
              )}

              {pasoActual < 3 && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    // Validación paso 1
                    if (pasoActual === 1) {
                      if (!formData.nombre?.trim()) {
                        showError('Validación', 'El Nombre del equipo es obligatorio.');
                        return;
                      }
                      if (!formData.placa?.trim()) {
                        showError('Validación', 'La Placa / Código del equipo es obligatorio.');
                        return;
                      }
                    }
                    // Validación paso 2
                    if (pasoActual === 2) {
                      if (!formData.serial?.trim()) {
                        showError('Validación', 'El Serial del equipo es obligatorio.');
                        return;
                      }
                    }
                    setPasoActual(pasoActual + 1);
                  }}
                  className="bg-lime-500 hover:bg-lime-600 dark:bg-[#84CC16] dark:hover:bg-[#65A30D] text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#84CC16',
                    border: '1px solid #84CC16',
                    color: '#020617',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(132, 204, 22, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Siguiente</span>
                  <span>→</span>
                </button>
              )}

              {pasoActual === 3 && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md bg-[#84CC16] hover:bg-[#65A30D] text-slate-950"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#84CC16',
                    border: '1px solid #65A30D',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 12px rgba(132, 204, 22, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          border: '2px solid rgba(15, 23, 42, 0.2)',
                          borderTopColor: '#0f172a',
                          display: 'inline-block',
                        }}
                      />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
