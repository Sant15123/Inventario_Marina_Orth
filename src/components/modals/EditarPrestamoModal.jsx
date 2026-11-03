import React, { useState, useEffect } from 'react';
import { Pencil, Calendar, X, Laptop, Sparkles, Building2, User, FileText, Check } from 'lucide-react';

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
      // Normalizar fecha si viene en formato ISO o YYYY-MM-DD
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

  // Extraer nombre/identificador del equipo
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* ENCABEZADO INSTITUCIONAL */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Pencil size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase block">
                Gestión de Préstamos Activos
              </span>
              <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                Editar Préstamo
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Campo 1: Equipo Asignado (Solo lectura) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Laptop size={14} className="text-slate-400" />
              Equipo Asignado
            </label>
            <input
              type="text"
              readOnly
              value={`${nombreEquipo}${serialEquipo ? ` - [Placa: ${serialEquipo}]` : ''}`}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
            />
          </div>

          {/* Campo 2: Custodio / Responsable */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-slate-400" />
              Custodio / Responsable *
            </label>
            {usuarios.length > 0 ? (
              <select
                value={custodioId}
                onChange={(e) => setCustodioId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-800 dark:text-white transition-all"
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed select-none font-medium"
              />
            )}
          </div>

          {/* Fila 2 columnas: Sede y Proyecto STEAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-400" />
                Sede / Municipio Destino *
              </label>
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-800 dark:text-white transition-all"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles size={14} className="text-slate-400" />
                Proyecto STEAM Vinculado
              </label>
              <input
                type="text"
                value={proyectoSteam}
                onChange={(e) => setProyectoSteam(e.target.value)}
                placeholder="Ej. Robótica Educativa, Aulas Conectadas..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-800 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Campo: Fecha Devolución Pactada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-400" />
              Fecha Devolución Pactada *
            </label>
            <input
              type="date"
              min={hoyStr}
              value={fechaDevolucion}
              onChange={(e) => setFechaDevolucion(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-800 dark:text-white transition-all"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              No es posible seleccionar fechas pasadas a la de hoy.
            </p>
          </div>

          {/* Campo: Observaciones */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              Motivo u Observaciones
            </label>
            <textarea
              rows={3}
              maxLength={250}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre el estado de entrega o requerimientos del préstamo..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:bg-slate-800 dark:text-white transition-all resize-none"
            />
            <div className="flex justify-end text-[10px] text-slate-400 mt-1">
              {observaciones.length} / 250 caracteres
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl shadow-md shadow-green-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        </form>
      </div>
    </div>
  );
};

export default EditarPrestamoModal;
