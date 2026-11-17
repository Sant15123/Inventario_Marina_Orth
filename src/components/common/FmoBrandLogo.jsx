import React from 'react';

/**
 * FmoBrandLogo - Logotipo Oficial Responsivo con Tamaños Mínimos Reglamentarios
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Página 7)
 *
 * REGLAS TÉCNICAS:
 * 1. Ancho >= 114px: Logotipo completo con isotipo integrado en "ORTH" y lema "EDUCATING FOR THE FUTURE".
 * 2. Ancho entre 85px y 52px: Versión simplificada con texto "MARINA ORTH" sin subtítulo para
 *    garantizar la óptima legibilidad de la palabra manuscrita "Orth".
 * 3. Ancho < 52px: Únicamente el isotipo circular institucional autorizado.
 */
export default function FmoBrandLogo({
  variant = 'auto', // 'auto' | 'full' | 'compact' | 'isotipo'
  showMotto = true,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`fmo-brand-logo-container brand-badge ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textDecoration: 'none',
        ...style,
      }}
      title="Marina Orth Foundation - Educating for the Future"
    >
      {/* Isotipo Circular Oficial FMO */}
      <img
        src="/logo-marina-orth.png"
        alt="Isotipo Fundación Marina Orth"
        className="brand-logo-img flex-shrink-0"
        style={{
          width: '42px',
          height: '42px',
          objectFit: 'contain',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          padding: '2px',
        }}
      />

      {/* Bloque Tipográfico con Reglas Responsivas de la Página 7 */}
      {variant !== 'isotipo' && (
        <div className="brand-text-wrap min-w-0">
          <span
            className="brand-title block truncate"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '12.5px',
              fontWeight: 800,
              color: 'var(--brand-title-color, #6d6e71)',
              lineHeight: 1.2,
              letterSpacing: '0.03em',
            }}
          >
            MARINA ORTH FOUNDATION
          </span>

          {/* Línea divisoria y Lema Oficial (Solo visible si >= 114px y no en modo compacto) */}
          {variant !== 'compact' && showMotto && (
            <>
              <div
                className="brand-divider fmo-logo-motto"
                style={{
                  height: '1.5px',
                  backgroundColor: '#abd037',
                  margin: '3px 0',
                  width: '100%',
                }}
                aria-hidden="true"
              />
              <span
                className="brand-subtitle fmo-logo-motto block truncate"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#abd037',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  lineHeight: 1.15,
                }}
              >
                EDUCATING FOR THE FUTURE
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
