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
      <div className="relative flex items-center justify-center w-14 h-14">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700/80"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#abd037] border-r-[#abd037]/70 animate-spin"
          aria-hidden="true"
        />
        <div className="w-9 h-9 rounded-full bg-[#013a52] dark:bg-[#0f293a] flex items-center justify-center shadow-sm animate-pulse border border-[#abd037]/40">
          {IconComponent && (
            <IconComponent size={17} className="text-[#abd037]" strokeWidth={2.2} />
          )}
        </div>
      </div>

      {/* Título, subtítulo y barra indeterminada shimmer */}
      <div className="flex flex-col items-center text-center gap-1.5 max-w-md w-full">
        <strong className="text-sm sm:text-base font-bold text-[#013a52] dark:text-slate-100">
          {title}
        </strong>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 m-0">
            {subtitle}
          </p>
        )}

        <div className="w-48 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-2">
          <div className="h-full w-2/5 rounded-full bg-[#abd037] animate-table-shimmer" />
        </div>
      </div>

      {/* 4 filas skeleton sutiles simulando estructura de tabla */}
      {showSkeleton && (
        <div className="w-full max-w-4xl space-y-2.5 pt-2 opacity-65" aria-hidden="true">
          {[0, 1, 2, 3].map((rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/40 animate-pulse"
            >
              <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />
              <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
