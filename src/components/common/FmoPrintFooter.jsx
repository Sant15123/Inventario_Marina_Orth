import React from 'react';

/**
 * FmoPrintFooter - Pie de Página Institucional Oficial Fijo
 * (Cumplimiento de la Página 61 del Manual de Identidad Visual de la Fundación Marina Orth)
 *
 * Características institucionales:
 * 1. Columna izquierda en Poppins Regular color Gris Institucional (#6d6e71, text-[10px]):
 *    - NIT: 900142115-2
 *    - Cll 10 Sur N° 50FF-28. Of. 305
 *    - Ed. Primer Plano.
 *    - Medellín, Colombia.
 *    - [+574] 322 37 39
 * 2. Columna derecha: @fundacionmarinaorth en #7b2cbf y www.fundorth.org en #abd037 font-bold.
 * 3. Franja inferior bicolor con corte diagonal:
 *    - Tramo izquierdo (75%): Verde FMO (#abd037)
 *    - Tramo derecho (25%): Morado Estratégico (#7b2cbf)
 */
export default function FmoPrintFooter({ className = '' }) {
  return (
    <footer
      className={`fmo-print-footer ${className}`}
      style={{
        marginTop: '28px',
        paddingTop: '16px',
        pageBreakInside: 'avoid',
      }}
    >
      {/* 1. INFORMACIÓN LEGAL Y CONTACTO INSTITUCIONAL */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '10px',
          color: '#6d6e71',
          fontFamily: "'Poppins', sans-serif",
          lineHeight: '1.45',
          marginBottom: '10px',
          padding: '0 4px',
        }}
      >
        {/* Columna Izquierda: Datos Legales y Sede Principal */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, color: '#013a52', fontSize: '10.5px' }}>
            FUNDACIÓN MARINA ORTH
          </div>
          <div>NIT: 900142115-2</div>
          <div>Cll 10 Sur N° 50FF-28. Of. 305</div>
          <div>Ed. Primer Plano.</div>
          <div>Medellín, Colombia.</div>
          <div>[+574] 322 37 39</div>
        </div>

        {/* Columna Derecha: Canales Digitales y Portal Oficial */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              color: '#7b2cbf',
              fontWeight: 600,
              fontSize: '10.5px',
              marginBottom: '2px',
            }}
          >
            @fundacionmarinaorth
          </div>
          <div
            style={{
              color: '#abd037',
              fontWeight: 800,
              fontSize: '11px',
              letterSpacing: '0.02em',
            }}
          >
            www.fundorth.org
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px' }}>
            SIGA • Sistema Interno de Inventario FMO
          </div>
        </div>
      </div>

      {/* 2. FRANJA INFERIOR BICOLOR CON CORTE DIAGONAL (75% Verde FMO / 25% Morado #7b2cbf) */}
      <div
        style={{
          width: '100%',
          height: '10px',
          overflow: 'hidden',
          borderRadius: '1px',
        }}
      >
        <svg
          viewBox="0 0 800 12"
          width="100%"
          height="10"
          preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: '10px' }}
          aria-hidden="true"
        >
          {/* Tramo izquierdo (75% = 600px en escala de 800px) con corte diagonal */}
          <polygon points="0,0 600,0 585,12 0,12" fill="#abd037" />
          {/* Tramo derecho (25% = 200px) completando el corte diagonal exacto */}
          <polygon points="600,0 800,0 800,12 585,12" fill="#7b2cbf" />
        </svg>
      </div>
    </footer>
  );
}

