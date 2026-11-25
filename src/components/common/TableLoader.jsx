import React from 'react';
import { Package } from 'lucide-react';

/**
 * TableLoader: Indicador institucional reutilizable para tablas de SIGA-FMO.
 * Reemplaza el estado estático (⏳) con spinner de doble anillo, barra shimmer
 * en verde lima (#ABD037) y 4 filas skeleton adaptadas a Modo Claro y Oscuro.
 */
export default function TableLoader({
  title = 'Sincronizando inventario...',
  subtitle = 'Consultando registros en tiempo real',
  icon: IconComponent = Package,
  showSkeleton = true,
}) {
  return (
    <div
      className="panel empty relative overflow-hidden"
      role="status"
      aria-live="polite"
      style={{
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
      }}
    >
      {/* Spinner institucional de doble anillo */}
      <div className="relative w-14 h-14 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-[#ABD037] animate-spin"
          aria-hidden="true"
        />
        {IconComponent && (
          <IconComponent
            size={22}
            className="text-[#013A52] dark:text-[#ABD037] animate-pulse"
            strokeWidth={2.2}
          />
        )}
      </div>

      {/* Título, subtítulo y barra indeterminada shimmer */}
      <div className="flex flex-col items-center text-center gap-1.5 max-w-md w-full">
        <strong className="text-sm sm:text-base font-bold text-[#013A52] dark:text-slate-100">
          {title}
        </strong>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0">
            {subtitle}
          </p>
        )}

        <div className="w-48 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mx-auto mt-3">
          <div className="h-full w-2/5 rounded-full bg-[#ABD037] animate-table-shimmer" />
        </div>
      </div>

      {/* 4 filas skeleton con bloques simulando columnas reales */}
      {showSkeleton && (
        <div className="w-full max-w-4xl space-y-2.5 pt-2" aria-hidden="true">
          {[0, 1, 2, 3].map((rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/35 border border-slate-200/80 dark:border-slate-700/50"
            >
              <div className="h-4 w-16 rounded-md bg-slate-200/80 dark:bg-slate-700/70 animate-pulse shrink-0" />
              <div className="h-4 w-44 rounded-md bg-slate-200/80 dark:bg-slate-700/70 animate-pulse flex-1 max-w-[11rem]" />
              <div className="h-4 w-28 rounded-md bg-slate-200/80 dark:bg-slate-700/70 animate-pulse hidden sm:block shrink-0" />
              <div className="h-4 w-24 rounded-md bg-slate-200/80 dark:bg-slate-700/70 animate-pulse hidden md:block shrink-0" />
              <div className="h-5 w-20 rounded-full bg-slate-200/80 dark:bg-slate-700/70 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
