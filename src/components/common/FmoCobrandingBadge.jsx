import React from 'react';

/**
 * FmoCobrandingBadge - Módulo de Cobranding para Sedes, Municipios y Alianzas
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Página 8)
 *
 * REGLAS TÉCNICAS ESTRICTAS:
 * 1. Misma altura visual: Ambos logos (FMO y entidad aliada/municipio) deben medir exactamente
 *    la misma altura para mantener el balance jerárquico.
 * 2. Línea divisoria reglamentaria: Línea en Gris Institucional al 30% (#6d6e71 / 30% -> rgba(109, 110, 113, 0.3)).
 * 3. Espacio de reserva reglamentario: Distancia equivalente a 2x el ancho de la "M" a cada lado de la línea divisoria.
 */

// Escudos y Sellos Oficiales de Territorios Aliados FMO
export function MunicipalShieldIcon({ sede = 'Medellín', size = 32, color = '#013a52' }) {
  const s = String(sede).toLowerCase();
  
  if (s.includes('retiro')) {
    // Escudo / Sello El Retiro (Cuna de la libertad / Madera y Tradición)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 L27 6 V16 C27 23 16 29 16 29 C16 29 5 23 5 16 V6 Z" fill="#2CACD0" fillOpacity="0.15" stroke="#2CACD0" strokeWidth="1.8" />
        <path d="M16 7 L20 13 H12 Z" fill="#2CACD0" />
        <circle cx="16" cy="19" r="3.5" fill="#013a52" />
        <path d="M11 23 Q 16 26 21 23" stroke="#013a52" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('carmen') || s.includes('viboral')) {
    // Escudo / Sello El Carmen de Viboral (Cerámica y Artesanía)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 L27 6 V16 C27 23 16 29 16 29 C16 29 5 23 5 16 V6 Z" fill="#7b2cbf" fillOpacity="0.15" stroke="#7b2cbf" strokeWidth="1.8" />
        <circle cx="16" cy="14" r="5" stroke="#7b2cbf" strokeWidth="1.8" />
        <path d="M12 21 Q 16 24 20 21" stroke="#013a52" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('ceja')) {
    // Escudo / Sello La Ceja del Tambo (Flores y Esperanza)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 L27 6 V16 C27 23 16 29 16 29 C16 29 5 23 5 16 V6 Z" fill="#abd037" fillOpacity="0.2" stroke="#abd037" strokeWidth="1.8" />
        <path d="M16 8 C14 11 12 14 16 18 C20 14 18 11 16 8 Z" fill="#abd037" />
        <path d="M11 22 Q 16 25 21 22" stroke="#013a52" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('santuario')) {
    // Escudo / Sello El Santuario (Tradición y Emprendimiento)
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M16 2 L27 6 V16 C27 23 16 29 16 29 C16 29 5 23 5 16 V6 Z" fill="#F4C400" fillOpacity="0.2" stroke="#F4C400" strokeWidth="1.8" />
        <path d="M16 8 V16 M12 12 H20" stroke="#013a52" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 22 Q 16 25 21 22" stroke="#013a52" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Fallback Medellín (Alcaldía / Distrito de Ciencia, Tecnología e Innovación)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Silueta de Torre / Castillo del Escudo de Medellín */}
      <path d="M16 2 L27 6 V16 C27 23 16 29 16 29 C16 29 5 23 5 16 V6 Z" fill="#013a52" fillOpacity="0.1" stroke="#013a52" strokeWidth="1.8" />
      <rect x="11" y="9" width="10" height="9" rx="1" stroke="#013a52" strokeWidth="1.5" />
      <path d="M11 9 L11 7 H13 V9 H15 V7 H17 V9 H19 V7 H21 V9" stroke="#013a52" strokeWidth="1.2" />
      <path d="M14 18 V15 C14 14 18 14 18 15 V18" fill="#abd037" />
      <path d="M10 22 Q 16 25 22 22" stroke="#013a52" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function FmoCobrandingBadge({
  sede = 'Medellín',
  alianza = 'Alcaldía de Medellín',
  logoAliado = null,
  height = 34,
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  className = '',
  style = {},
}) {
  const isHorizontal = orientation === 'horizontal';

  // Espacio de reserva reglamentario: 2x el ancho de la 'M' (~18px)
  const reserveSpace = '18px';

  return (
    <div
      className={`fmo-cobranding-badge inline-flex items-center rounded-xl p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}
      style={{
        flexDirection: isHorizontal ? 'row' : 'column',
        ...style,
      }}
      title={`Alianza Territorial Oficial: Fundación Marina Orth & ${alianza || sede}`}
    >
      {/* 1. Logotipo Oficial Fundación Marina Orth */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ height: `${height}px` }}
      >
        <img
          src="/logo-marina-orth.png"
          alt="Fundación Marina Orth"
          style={{
            height: `${height}px`,
            width: `${height}px`,
            objectFit: 'contain',
          }}
        />
        <div className="flex flex-col justify-center">
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              fontSize: '11px',
              color: '#013a52',
              lineHeight: 1.15,
            }}
            className="dark:text-white"
          >
            MARINA ORTH
          </span>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: '7.5px',
              color: '#abd037',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            FOUNDATION
          </span>
        </div>
      </div>

      {/* 2. Línea divisoria reglamentaria en #6d6e71 al 30% con espacio de reserva 2x 'M' */}
      <div
        className="fmo-cobranding-divider flex-shrink-0"
        style={{
          width: isHorizontal ? '1px' : '80%',
          height: isHorizontal ? `${height}px` : '1px',
          backgroundColor: 'rgba(109, 110, 113, 0.30)',
          margin: isHorizontal ? `0 ${reserveSpace}` : `${reserveSpace} 0`,
        }}
        aria-hidden="true"
      />

      {/* 3. Escudo / Logotipo de la Entidad o Municipio Aliado con EXACTAMENTE la misma altura visual */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{ height: `${height}px` }}
      >
        {logoAliado ? (
          <img
            src={logoAliado}
            alt={alianza || `Alcaldía de ${sede}`}
            style={{
              height: `${height}px`,
              maxWidth: '120px',
              objectFit: 'contain',
            }}
          />
        ) : (
          <MunicipalShieldIcon sede={sede} size={height} />
        )}
        <div className="flex flex-col justify-center">
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: '11px',
              color: '#6d6e71',
              lineHeight: 1.15,
            }}
            className="dark:text-slate-300"
          >
            {alianza || `Municipio de ${sede}`}
          </span>
          <span
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              fontSize: '8px',
              color: '#2CACD0',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            TERRITORIO ALIADO STEAM
          </span>
        </div>
      </div>
    </div>
  );
}

