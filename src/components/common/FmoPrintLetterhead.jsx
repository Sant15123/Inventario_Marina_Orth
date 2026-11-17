import React from 'react';

/**
 * FmoPrintLetterhead - Encabezado / Membrete Institucional Oficial
 * (Cumplimiento de la Página 61 del Manual de Identidad Visual de la Fundación Marina Orth)
 *
 * Características institucionales:
 * 1. Esquina superior izquierda: Bloque decorativo rectangular sólido en Verde FMO (#abd037, w-16 h-3).
 * 2. Esquina superior derecha: Logotipo oficial MARINA ORTH FOUNDATION / EDUCATING FOR THE FUTURE
 *    (ancho >= 114px y área de reserva reglamentaria).
 * 3. Identificación del documento: Título, subtítulo, radicado y fecha en tipografía Poppins.
 */
export default function FmoPrintLetterhead({
  titulo = 'DOCUMENTO OFICIAL',
  subtitulo = 'Sistema Integrado de Gestión de Activos (SIGA) • Bodega Central STEAM',
  radicado = '',
  fecha = '',
  className = '',
}) {
  return (
    <header
      className={`fmo-print-letterhead ${className}`}
      style={{
        marginBottom: '16px',
        paddingBottom: '14px',
        borderBottom: '2px solid #013a52',
        pageBreakInside: 'avoid',
      }}
    >
      {/* 1. FILA SUPERIOR: Bloque verde FMO (izq) y Logo oficial (der) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '14px',
        }}
      >
        {/* Esquina superior izquierda: Bloque decorativo rectangular sólido en Verde FMO (w-16 h-3) */}
        <div
          style={{
            width: '64px',
            height: '12px',
            backgroundColor: '#abd037',
            borderRadius: '2px',
          }}
          title="Bloque Oficial Verde FMO"
          aria-hidden="true"
        />

        {/* Esquina superior derecha: Logotipo oficial (ancho >= 114px con área de reserva) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 8px',
            minWidth: '180px',
          }}
        >
          <img
            src="/logo-marina-orth.png"
            alt="Logo Marina Orth Foundation"
            style={{
              width: '42px',
              height: '42px',
              objectFit: 'contain',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 800,
                fontSize: '13px',
                color: '#6d6e71',
                letterSpacing: '0.04em',
                lineHeight: 1.15,
              }}
            >
              MARINA ORTH FOUNDATION
            </span>
            <div
              style={{
                height: '1.5px',
                backgroundColor: '#abd037',
                margin: '3px 0',
                width: '100%',
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: '8.5px',
                color: '#abd037',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              EDUCATING FOR THE FUTURE
            </span>
          </div>
        </div>
      </div>

      {/* 2. FILA INFERIOR DEL ENCABEZADO: Título y Consecutivo / Radicado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 900,
              fontSize: '15px',
              color: '#013a52',
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
            }}
          >
            {titulo}
          </h2>
          {subtitulo && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '11px',
                color: '#6d6e71',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
              }}
            >
              {subtitulo}
            </p>
          )}
        </div>

        {radicado && (
          <div
            style={{
              textAlign: 'right',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              minWidth: '180px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#6d6e71',
                display: 'block',
                letterSpacing: '0.04em',
              }}
            >
              N° RADICADO / CONSECUTIVO
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#013a52',
              }}
            >
              {radicado}
            </span>
            {fecha && (
              <span
                style={{
                  fontSize: '10px',
                  color: '#6d6e71',
                  display: 'block',
                  marginTop: '1px',
                }}
              >
                Fecha: <strong>{fecha}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
