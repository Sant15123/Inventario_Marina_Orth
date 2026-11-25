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
      <div className="table-loader-spinner-wrap">
        <div
          className="table-loader-ring siga-spinner"
          aria-hidden="true"
        />
        {IconComponent && (
          <IconComponent
            size={22}
            className="table-loader-icon animate-pulse"
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

        <div className="table-loader-track">
          <div className="table-loader-bar animate-table-shimmer" />
        </div>
      </div>

      {/* 4 filas skeleton con bloques simulando columnas reales */}
      {showSkeleton && (
        <div className="w-full max-w-4xl space-y-2.5 pt-2" aria-hidden="true">
          {[0, 1, 2, 3].map((rowIdx) => (
            <div
              key={rowIdx}
              className="table-loader-skeleton-row"
            >
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '64px', flexShrink: 0 }} />
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '176px', flex: '1 1 0%', maxWidth: '11rem' }} />
              <div className="table-loader-skeleton-cell animate-pulse hidden sm:block" style={{ width: '112px', flexShrink: 0 }} />
              <div className="table-loader-skeleton-cell animate-pulse hidden md:block" style={{ width: '96px', flexShrink: 0 }} />
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '80px', height: '20px', borderRadius: '9999px', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
