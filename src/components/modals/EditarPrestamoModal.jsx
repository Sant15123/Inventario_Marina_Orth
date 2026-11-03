import React, { useState, useEffect } from 'react';
import { X, Laptop, Sparkles, Building2, User, FileText, Calendar } from 'lucide-react';

export const EditarPrestamoModal = ({
  prestamo,
  isOpen,
  onClose,
  onActualizar,
  onGuardar,
  sedes = [],
  usuarios = []
}) => {
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [sede, setSede] = useState('');
  const [proyectoSteam, setProyectoSteam] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [custodioId, setCustodioId] = useState('');
  const [cargando, setCargando] = useState(false);

  // Fecha mínima permitida: hoy (YYYY-MM-DD)
  const hoyStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (prestamo) {
      const fechaVal =
        prestamo.fecha_devolucion_esperada ||
        prestamo.fecha_devolucion ||
        prestamo.expectedReturn ||
        '';
      setFechaDevolucion(fechaVal ? String(fechaVal).split('T')[0] : '');

      setSede(prestamo.sede || prestamo.destination || prestamo.destino || '');
      setProyectoSteam(prestamo.proyecto_steam || prestamo.proyecto || prestamo.project || '');
      setObservaciones(prestamo.observaciones || prestamo.motivo || prestamo.motive || '');
      setCustodioId(
        prestamo.custodio_id ||
        prestamo.usuario_id ||
        prestamo.userId ||
        prestamo.responsable ||
        prestamo.custodian ||
        ''
      );
    }
  }, [prestamo]);

  if (!isOpen || !prestamo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fechaDevolucion && fechaDevolucion < hoyStr) {
      alert('La fecha de devolución no puede ser anterior a la fecha de hoy.');
      return;
    }

    try {
      setCargando(true);
      const payload = {
        fecha_devolucion_esperada: fechaDevolucion,
        sede,
        proyecto_steam: proyectoSteam,
        observaciones,
        motivo: observaciones,
        custodio_id: custodioId,
      };

      const handler = onGuardar || onActualizar;
      if (handler) {
        await handler(prestamo.id, payload);
      }
      onClose();
    } catch (err) {
      console.error('Error al actualizar préstamo:', err);
      alert('Error al guardar los cambios del préstamo.');
    } finally {
      setCargando(false);
    }
  };

  const nombreEquipo =
    prestamo.equipo_nombre ||
    prestamo.itemDescription ||
    prestamo.articulo ||
    prestamo.item ||
    'Equipo Asignado';

  const serialEquipo =
    prestamo.serial ||
    prestamo.placa ||
    prestamo.unitCodes?.[0] ||
    prestamo.itemId ||
    '';

  const sedesOpciones = sedes.length > 0
    ? sedes
    : ['Medellín', 'Carmen de Viboral', 'La Ceja', 'El Retiro', 'Oficina FMO'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !cargando && onClose()}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          maxWidth: '38rem',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface, #ffffff)',
          border: '1px solid var(--line, #e2e8f0)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO INSTITUCIONAL FIJO */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            padding: '18px 24px',
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
                marginBottom: '4px',
                letterSpacing: '0.05em',
              }}
            >
              {serialEquipo ? `PLACA: ${serialEquipo}` : 'GESTIÓN DE PRÉSTAMOS'}
            </span>
            <h3
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0"
              style={{ margin: 0, fontSize: '17px', lineHeight: 1.3 }}
            >
              Editar Préstamo
            </h3>
            <p
              className="text-xs text-slate-500 dark:text-slate-400 m-0"
              style={{ margin: '4px 0 0 0', fontSize: '12px' }}
            >
              Modifica los datos del préstamo activo y sus especificaciones
            </p>
          </div>
          <button
            type="button"
            disabled={cargando}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DESPLAZABLE CON ESPACIADO CÓMODO Y AIREADO */}
        <div
          className="p-6 overflow-y-auto flex-1 space-y-6"
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
          }}
        >
          {/* Subtítulo de Sección */}
          <div
            className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800"
            style={{ marginBottom: '18px' }}
          >
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-primary, #84CC16)', margin: 0 }}
            >
              INFORMACIÓN Y CONDICIONES DEL PRÉSTAMO
            </h4>
            <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
          </div>

          <form id="form-editar-prestamo" onSubmit={handleSubmit} className="space-y-5" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Campo 1: Equipo Asignado (Solo lectura) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Laptop size={14} className="text-slate-400" />
                Equipo Asignado
              </label>
              <input
                type="text"
                readOnly
                value={`${nombreEquipo}${serialEquipo ? ` - [Placa: ${serialEquipo}]` : ''}`}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
              />
            </div>

            {/* Campo 2: Custodio / Responsable */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" />
                Custodio / Responsable *
              </label>
              {usuarios.length > 0 ? (
                <select
                  value={custodioId}
                  onChange={(e) => setCustodioId(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                >
                  <option value="">Seleccione un custodio...</option>
                  {usuarios.map((u) => {
                    const val = u.id || u.nombre || u.name;
                    const label = `${u.nombre || u.name}${u.documento ? ` - ${u.documento}` : ''}`;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={prestamo.responsable || prestamo.custodian || prestamo.solicitante || 'Custodio no especificado'}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
                />
              )}
            </div>

            {/* Fila 2 columnas: Sede y Proyecto STEAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  Sede / Destino *
                </label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                >
                  <option value="">Seleccione una sede...</option>
                  {sedesOpciones.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-slate-400" />
                  Proyecto STEAM
                </label>
                <input
                  type="text"
                  value={proyectoSteam}
                  onChange={(e) => setProyectoSteam(e.target.value)}
                  placeholder="Ej. Robótica, STEAM..."
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                />
              </div>
            </div>

            {/* Campo: Fecha Devolución Pactada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                Fecha Devolución Pactada *
              </label>
              <input
                type="date"
                min={hoyStr}
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                No es posible seleccionar fechas anteriores al día de hoy.
              </p>
            </div>

            {/* Campo: Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-slate-400" />
                Motivo u Observaciones
              </label>
              <textarea
                rows={3}
                maxLength={250}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas u observaciones sobre el préstamo..."
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400 mt-1">
                {observaciones.length} / 250 caracteres
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER FIJO CON BOTONES INSTITUCIONALES */}
        <div
          className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--line, #334155)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.95))',
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
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            style={{
              padding: '9px 18px',
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

          {/* Botón Guardar Cambios (Derecha) */}
          <button
            type="submit"
            form="form-editar-prestamo"
            disabled={cargando}
            className="px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-md cursor-pointer"
            style={{
              padding: '9px 22px',
              borderRadius: '8px',
              backgroundColor: '#84CC16',
              border: '1px solid #65A30D',
              color: '#020617',
              fontSize: '13px',
              fontWeight: 700,
              cursor: cargando ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(132, 204, 22, 0.3)',
              transition: 'all 0.15s ease',
              opacity: cargando ? 0.7 : 1,
            }}
          >
            {cargando ? (
              <>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(15, 23, 42, 0.2)',
                    borderTopColor: '#020617',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>Guardar Cambios</span>
                <span style={{ fontSize: '13px' }}>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarPrestamoModal;
