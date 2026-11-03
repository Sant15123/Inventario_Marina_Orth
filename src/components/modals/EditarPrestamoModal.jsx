import React, { useState, useEffect } from 'react';
import { X, Laptop, Sparkles, Building2, User, FileText, Check, Calendar } from 'lucide-react';

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
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !cargando && onClose()}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          maxWidth: '36rem',
          width: '100%',
          maxHeight: '90vh',
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
        {/* ENCABEZADO INSTITUCIONAL FIJO (Idéntico al de Editar Equipo Tecnológico) */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            borderBottom: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            padding: '16px 20px',
          }}
        >
          <div>
            <span
              className="text-xs font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 block"
              style={{ color: 'var(--text-dim, #64748b)' }}
            >
              {serialEquipo ? `PLACA / ID: ${serialEquipo}` : 'GESTIÓN DE PRÉSTAMOS'}
            </span>
            <h3
              className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight"
              style={{ color: 'var(--text, #0f172a)', margin: '2px 0 0 0' }}
            >
              Editar Préstamo
            </h3>
            <p
              className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
              style={{ color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0 0' }}
            >
              Modifica los datos del préstamo activo y su fecha pactada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO DESPLAZABLE (Scroll si la pantalla es reducida) */}
        <div
          className="p-5 overflow-y-auto flex-1 space-y-4"
          style={{
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          {/* Subtítulo de Sección */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-lime-600 dark:text-lime-400 uppercase tracking-wider">
              INFORMACIÓN Y CONDICIONES DEL PRÉSTAMO
            </h4>
            <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
          </div>

          <form id="form-editar-prestamo" onSubmit={handleSubmit} className="space-y-3.5">
            {/* Campo 1: Equipo Asignado (Solo lectura) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Laptop size={13} className="text-slate-400" />
                Equipo Asignado
              </label>
              <input
                type="text"
                readOnly
                value={`${nombreEquipo}${serialEquipo ? ` - [Placa: ${serialEquipo}]` : ''}`}
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
              />
            </div>

            {/* Campo 2: Custodio / Responsable */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                Custodio / Responsable *
              </label>
              {usuarios.length > 0 ? (
                <select
                  value={custodioId}
                  onChange={(e) => setCustodioId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition-colors"
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
                  className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
                />
              )}
            </div>

            {/* Fila 2 columnas: Sede y Proyecto STEAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-slate-400" />
                  Sede / Destino *
                </label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition-colors"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-slate-400" />
                  Proyecto STEAM
                </label>
                <input
                  type="text"
                  value={proyectoSteam}
                  onChange={(e) => setProyectoSteam(e.target.value)}
                  placeholder="Ej. Robótica, STEAM..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition-colors"
                />
              </div>
            </div>

            {/* Campo: Fecha Devolución Pactada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Fecha Devolución Pactada *
              </label>
              <input
                type="date"
                min={hoyStr}
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                No es posible seleccionar fechas anteriores al día de hoy.
              </p>
            </div>

            {/* Campo: Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                Motivo u Observaciones
              </label>
              <textarea
                rows={2}
                maxLength={250}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas u observaciones sobre el préstamo..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-500 transition-colors resize-none"
              />
              <div className="flex justify-end text-[10px] text-slate-400 mt-0.5">
                {observaciones.length} / 250 caracteres
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER FIJO CON BOTONES */}
        <div
          className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90"
          style={{
            borderTop: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            padding: '14px 20px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-editar-prestamo"
            disabled={cargando}
            className="px-5 py-2 text-sm font-semibold text-slate-900 bg-lime-500 hover:bg-lime-600 dark:bg-lime-400 dark:hover:bg-lime-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {cargando ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarPrestamoModal;
