import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * ModuleConnectionState: Componente institucional unificado para estados de
 * carga inicial / reintento de conexión y error amigable en tipografía Poppins.
 * Soporta Modo Claro y Modo Oscuro sin bordes rojos agresivos ni textos técnicos.
 */
export default function ModuleConnectionState({
  mode = 'loading',
  isRetryingOrSlow = false,
  onRetry,
  className = '',
}) {
  if (mode === 'error') {
    return (
      <div
        className={`connection-state-card border border-slate-200 dark:border-slate-700 ${className}`}
        role="alert"
      >
        <div className="connection-error-icon-wrap" aria-hidden="true">
          <WifiOff size={25} strokeWidth={2} />
        </div>

        <h3 className="connection-state-title">
          No pudimos completar la conexión
        </h3>

        <p className="connection-state-subtitle">
          El servidor tardó más de lo esperado en responder. Intenta nuevamente en unos segundos.
        </p>

        {typeof onRetry === 'function' && (
          <button
            type="button"
            onClick={onRetry}
            className="connection-retry-btn"
          >
            <RefreshCw size={15} strokeWidth={2.2} />
            <span>Reintentar conexión</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`connection-state-card border border-slate-200 dark:border-slate-700 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="siga-spinner"
        aria-hidden="true"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          border: '3.5px solid rgba(171, 208, 55, 0.25)',
          borderTopColor: '#ABD037',
          marginBottom: '4px',
        }}
      />

      <h3 className="connection-state-title">
        {isRetryingOrSlow
          ? 'Sincronizando permisos y conexión con el servidor...'
          : 'Cargando información del módulo...'}
      </h3>

      <p className="connection-state-subtitle">
        Esto puede tardar unos segundos. No es necesario recargar la página.
      </p>

      <div className="table-loader-track" style={{ marginTop: '6px' }}>
        <div className="table-loader-bar animate-table-shimmer" />
      </div>
    </div>
  );
}
