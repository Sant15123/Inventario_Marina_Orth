import React from 'react';

/**
 * DetailModalLoader: Indicador de carga reutilizable para modales de ficha técnica.
 * Muestra el anillo giratorio (.siga-spinner), título, subtítulo y dos tarjetas skeleton
 * con animate-pulse compatibles con Modo Claro y Modo Oscuro.
 */
export default function DetailModalLoader({
  title = 'Consultando ficha técnica...',
  subtitle = 'Obteniendo datos reales y estado actualizado...',
  accentColor = '#ABD037',
  ringTrackColor = 'rgba(171, 208, 55, 0.25)',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '12px 0 8px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px 12px',
          gap: '10px',
          textAlign: 'center',
        }}
      >
        <div
          className="siga-spinner"
          aria-hidden="true"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            border: `3px solid ${ringTrackColor}`,
            borderTopColor: accentColor,
          }}
        />
        <strong style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h, #013A52)' }}>
          {title}
        </strong>
        {subtitle && (
          <span style={{ fontSize: '12px', color: 'var(--text-dim, #64748b)' }}>
            {subtitle}
          </span>
        )}
      </div>

      {/* Dos tarjetas skeleton simulando las secciones principales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}
        aria-hidden="true"
      >
        {[0, 1].map((cardIdx) => (
          <div
            key={cardIdx}
            style={{
              backgroundColor: 'var(--surface-2, #131b26)',
              border: '1px solid var(--line, #1e293b)',
              padding: '16px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '58%', height: '14px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '80%', height: '28px' }} />
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '75%', height: '28px' }} />
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '85%', height: '28px' }} />
              <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '70%', height: '28px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
