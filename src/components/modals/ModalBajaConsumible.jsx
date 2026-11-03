import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, ShieldAlert, ArrowRight } from 'lucide-react';

export const ModalBajaConsumible = ({ material, isOpen, onClose, onConfirmarBaja }) => {
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!isOpen || !material) return null;

  const codigo = material.id_referencia || material.codigo || material.id || 'ROB-000';
  const nombreMaterial = material.nombre || material.material || material.nombre_material || material.name || 'Insumo de Robótica';
  const categoria = material.categoria || material.category || 'Robótica / STEAM';
  const ubicacion = material.ubicacion || material.location || material.sede || 'Oficina FMO';
  const unidadMedida = material.unidad_medida || 'und';
  const stockDisponible = Number(material.cantidad ?? material.stock ?? material.disponible ?? material.quantity ?? 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      alert('La cantidad a dar de baja debe ser mayor a 0.');
      return;
    }

    if (cantNum > stockDisponible) {
      alert(`La cantidad a dar de baja no puede superar el stock disponible (${stockDisponible} ${unidadMedida}).`);
      return;
    }

    if (!motivo.trim()) {
      alert('Debes ingresar un motivo o justificación para la baja del material.');
      return;
    }

    try {
      setCargando(true);
      await onConfirmarBaja({
        materialId: material.id,
        cantidadBaja: cantNum,
        motivo: motivo.trim() || 'Baja de material confirmada por administrador',
      });
      onClose();
    } catch (err) {
      console.error('Error al procesar la baja:', err);
      alert('Ocurrió un error al procesar la baja del material.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !cargando && onClose()}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0b1320] border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface, #0b1320)',
          border: '1px solid rgba(225, 29, 72, 0.35)',
          borderRadius: '16px',
          maxWidth: '36rem',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.25)',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo Institucional */}
        <div
          className="p-5 border-b border-rose-100 dark:border-rose-950 shrink-0 flex items-center justify-between bg-rose-50/70 dark:bg-rose-950/40"
          style={{
            backgroundColor: 'var(--surface-2, rgba(225, 29, 72, 0.08))',
            borderBottom: '1px solid rgba(225, 29, 72, 0.2)',
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
                fontFamily: 'var(--mono, monospace)',
                color: '#e11d48',
                fontSize: '12px',
                fontWeight: 700,
                display: 'block',
                marginBottom: '2px',
                letterSpacing: '0.05em',
              }}
            >
              {codigo} · MATERIAL / ROBÓTICA
            </span>
            <h3
              className="text-base font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2"
              style={{ margin: 0, fontSize: '15px', color: 'var(--text, #f8fafc)' }}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Dar de Baja Material / Insumo
            </h3>
            <p
              className="text-xs text-slate-500 dark:text-slate-400 m-0"
              style={{ margin: '2px 0 0 0', fontSize: '12px' }}
            >
              Retiro definitivo o descuento de inventario por deterioro o fin de ciclo útil
            </p>
          </div>
          <button
            type="button"
            disabled={cargando}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Fijo bajo el Header: Pastillas Redondeadas con Colores de Advertencia */}
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
              { paso: 1, label: 'Identificación', icono: '1', active: true },
              { paso: 2, label: 'Parámetros Baja', icono: '2', active: false },
              { paso: 3, label: 'Auditoría Historial', icono: '3', active: false },
            ].map((item) => {
              const isActive = item.active;
              return (
                <div
                  key={item.paso}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-rose-950/20 text-rose-500 border-rose-500/30'
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
                    backgroundColor: isActive ? '#E11D48' : 'rgba(225, 29, 72, 0.1)',
                    border: isActive ? '1px solid #E11D48' : '1px solid rgba(225, 29, 72, 0.25)',
                    color: isActive ? '#FFFFFF' : '#FB7185',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(225, 29, 72, 0.2)',
                      color: isActive ? '#FFFFFF' : '#FB7185',
                    }}
                  >
                    {item.icono}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
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
            className="p-5 text-sm overflow-y-auto flex-1 space-y-3.5"
            style={{
              padding: '18px 20px',
              backgroundColor: 'var(--surface, #0b1320)',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Título de Sección con color rojo institucional */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <h4
                className="font-bold text-xs uppercase tracking-wider m-0 text-rose-600 dark:text-rose-400 flex items-center gap-1.5"
                style={{ color: '#E11D48', margin: 0, fontSize: '12px', fontWeight: 700 }}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Identificación y Parámetros de la Baja
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
            </div>

            {/* Banner Informativo de Acción Sensible */}
            <div
              className="rounded-xl p-3 flex items-start gap-3 border bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
              style={{
                backgroundColor: 'rgba(225, 29, 72, 0.06)',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
              }}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                <span className="font-bold text-rose-700 dark:text-rose-300">Acción Crítica: </span>
                Esta acción descontará el stock físico del almacén y generará un registro oficial de baja permanente en el historial de auditoría.
              </div>
            </div>

            {/* Fila 1: Código / Placa y Nombre del Equipo en 2 Columnas (Estilo exacto imagen 2) */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Código / Referencia *
                </label>
                <input
                  readOnly
                  type="text"
                  value={codigo}
                  className="w-full font-mono bg-slate-100 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed outline-none"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    opacity: 0.9,
                  }}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Nombre Del Insumo / Material *
                </label>
                <input
                  readOnly
                  type="text"
                  value={nombreMaterial}
                  className="w-full bg-slate-100 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 font-semibold cursor-not-allowed outline-none"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>

            {/* Fila 2: Categoría y Ubicación Física en 2 Columnas */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Categoría *
                </label>
                <input
                  readOnly
                  type="text"
                  value={categoria}
                  className="w-full bg-slate-100 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    opacity: 0.85,
                  }}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Ubicación Física *
                </label>
                <input
                  readOnly
                  type="text"
                  value={ubicacion}
                  className="w-full bg-slate-100 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 cursor-not-allowed outline-none"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>

            {/* Fila 3: Stock Actual en Bodega vs Cantidad a Dar de Baja */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}
            >
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Stock Actual en Bodega
                </label>
                <div
                  className="w-full flex items-center justify-between bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    borderColor: 'var(--line, #334155)',
                  }}
                >
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Existencias:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                    {stockDisponible} {unidadMedida}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Cantidad a Dar de Baja *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={stockDisponible}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="Ej: 1"
                  className="w-full font-bold bg-white dark:bg-[#0f172a] border border-rose-300 dark:border-rose-700/80 rounded-lg px-3 py-1.5 text-sm text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: '#E11D48',
                    borderColor: 'rgba(225, 29, 72, 0.45)',
                  }}
                />
              </div>
            </div>

            {/* Fila 4: Motivo o Justificación de la Baja */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                Motivo o Justificación de la Baja *
              </label>
              <textarea
                required
                rows={3}
                maxLength={250}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Material deteriorado, avería irreversible en taller STEAM, componentes rotos o fin de ciclo de vida..."
                className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-colors resize-none"
                style={{
                  backgroundColor: 'var(--bg, #0f172a)',
                  color: 'var(--text, #f8fafc)',
                  borderColor: 'var(--line, #334155)',
                }}
              />
              <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                <span>Esta justificación quedará registrada en el historial de movimientos.</span>
                <span>{motivo.length}/250</span>
              </div>
            </div>
          </div>

          {/* Footer Fijo con Botones Idénticos a la Imagen 2 (pero con color de advertencia rojo) */}
          <div
            className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/60"
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--line, #1e293b)',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.8))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Botón Cancelar (Izquierda) */}
            <button
              type="button"
              disabled={cargando}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line, #334155)',
                color: 'var(--text, #94a3b8)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            {/* Botón Confirmar Baja (Derecha, Rojo de Advertencia estilo Imagen 2) */}
            <button
              type="submit"
              disabled={cargando || stockDisponible <= 0}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold px-5 py-2 rounded-lg transition-all shadow-md shadow-rose-600/30 flex items-center gap-2 cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#E11D48',
                border: '1px solid #BE123C',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: cargando || stockDisponible <= 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>{cargando ? 'Procesando Baja...' : 'Confirmar Baja'}</span>
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalBajaConsumible;
