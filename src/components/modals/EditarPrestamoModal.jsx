import React, { useState, useEffect } from 'react';

export const EditarPrestamoModal = ({ prestamo, isOpen, onClose, onActualizar }) => {
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [observaciones, setObservaciones] = useState('');
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
      setObservaciones(prestamo.observaciones || prestamo.motive || prestamo.motivo || '');
    }
  }, [prestamo]);

  if (!isOpen || !prestamo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (fechaDevolucion < hoyStr) {
      alert('La fecha de devolución no puede ser anterior a la fecha de hoy.');
      return;
    }

    try {
      setCargando(true);
      await onActualizar(prestamo.id, {
        fecha_devolucion_esperada: fechaDevolucion,
        observaciones: observaciones,
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cambios del préstamo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-800 transition-all">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Editar Préstamo</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Fecha de Devolución Pactada *
            </label>
            <input
              type="date"
              min={hoyStr}
              value={fechaDevolucion}
              onChange={(e) => setFechaDevolucion(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Motivo u Observaciones
            </label>
            <textarea
              rows={3}
              maxLength={300}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPrestamoModal;
