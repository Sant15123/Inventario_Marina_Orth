import React from 'react';
import { Calendar, X } from 'lucide-react';

export const BarraFiltrosHistorial = ({
  filtroTipo = 'TODOS',
  setFiltroTipo,
  fechaDesde = '',
  setFechaDesde,
  fechaHasta = '',
  setFechaHasta,
  onResetFechas,
  totalCount,
  countPrestamos,
  countEntregas,
  countDevoluciones,
  countIngresos,
  countActualizaciones,
  countBajas,
  countEliminaciones = 0,
  isUsuario = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2 w-full">
      {/* Selector de Tipo */}
      <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Tipo De Movimiento:
        </span>
        <select
          value={filtroTipo ? filtroTipo.toLowerCase() : 'todos'}
          onChange={(e) => setFiltroTipo(e.target.value === 'todos' ? 'TODOS' : e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm cursor-pointer"
        >
          <option value="todos">Todos los tipos {totalCount !== undefined ? `(${totalCount})` : ''}</option>
          <option value="prestamo">{isUsuario ? 'Mis Préstamos' : 'Préstamos'} {countPrestamos !== undefined ? `(${countPrestamos})` : ''}</option>
          <option value="entrega">{isUsuario ? 'Mis Entregas' : 'Entregas / Salidas'} {countEntregas !== undefined ? `(${countEntregas})` : ''}</option>
          <option value="devolucion">{isUsuario ? 'Mis Devoluciones' : 'Devoluciones'} {countDevoluciones !== undefined ? `(${countDevoluciones})` : ''}</option>
          {!isUsuario && (
            <>
              <option value="ingreso">Ingresos {countIngresos !== undefined ? `(${countIngresos})` : ''}</option>
              <option value="actualizacion">Actualizaciones {countActualizaciones !== undefined ? `(${countActualizaciones})` : ''}</option>
              <option value="baja">Bajas {countBajas !== undefined ? `(${countBajas})` : ''}</option>
              {countEliminaciones > 0 && (
                <option value="eliminacion">Eliminaciones ({countEliminaciones})</option>
              )}
            </>
          )}
        </select>
      </div>

      {/* Rango de Fechas */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 text-sm shadow-sm">
          <Calendar className="text-slate-400 dark:text-slate-500" size={15} />
          <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">Desde:</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
          />
          <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
          <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">Hasta:</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="text-xs text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>

        {(fechaDesde || fechaHasta) && (
          <button
            type="button"
            onClick={onResetFechas}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-red-500 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Limpiar rango de fechas"
          >
            <X size={14} />
            <span>Limpiar Fechas</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BarraFiltrosHistorial;
