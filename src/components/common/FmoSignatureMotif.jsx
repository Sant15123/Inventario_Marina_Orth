import React from 'react';

/**
 * FmoSignatureMotif - Recurso Gráfico Oficial "Trazo Manuscrito Orth"
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Página 22)
 *
 * REGLAS INSTITUCIONALES ESTRICTAS:
 * 1. Colores autorizados ÚNICAMENTE:
 *    - Verde FMO: #abd037
 *    - Púrpura TeachLabs / Innovación: #7b2cbf
 *    - Azul Profundo FMO: #013a52
 *    - Gris Institucional: #6d6e71
 *    - Blanco puro: #ffffff (para fondos oscuros / contrastes)
 * 2. PROHIBIDO: Trazos con contorno hueco (outline), deformación de grosor no armónica,
 *    o uso de colores no autorizados (ej. naranjas, amarillos o degradados extraños).
 * 3. Aplicación: Siempre recortado por el borde del contenedor (overflow-hidden)
 *    como textura o encuadre sutil con opacidad controlada (0.08 - 0.25).
 */

const AUTHORIZED_COLORS = {
  '#abd037': '#abd037',
  '#7b2cbf': '#7b2cbf',
  '#013a52': '#013a52',
  '#6d6e71': '#6d6e71',
  '#ffffff': '#ffffff',
  '#fff': '#ffffff',
  'white': '#ffffff',
};

export default function FmoSignatureMotif({
  color = '#abd037',
  opacity = 0.15,
  variant = 'flourish', // 'flourish' | 'ribbon' | 'curve'
  width = 200,
  height = 120,
  className = '',
  style = {},
}) {
  // Validación estricta de color autorizado según Manual de Marca FMO (Página 22)
  const normalizedColor = String(color).trim().toLowerCase();
  const validColor = AUTHORIZED_COLORS[normalizedColor] || '#abd037';

  return (
    <svg
      viewBox="0 0 320 180"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
      style={{
        opacity,
        color: validColor,
        ...style,
      }}
    >
      {variant === 'ribbon' ? (
        /* Trazo fluido tipo cinta continua y armónica */
        <path
          d="M12 165 C 65 140, 110 95, 155 110 C 205 128, 235 60, 275 42 C 295 32, 310 38, 318 45 C 314 55, 290 62, 268 70 C 220 90, 195 152, 142 142 C 105 135, 68 168, 12 165 Z"
          fill="currentColor"
        />
      ) : variant === 'curve' ? (
        /* Curva fluida abierta con remate orgánico */
        <g fill="currentColor">
          <path
            d="M20 150 C 70 120, 120 70, 180 85 C 240 100, 265 40, 310 25 C 295 38, 255 75, 205 72 C 150 68, 105 125, 20 150 Z"
          />
          <circle cx="312" cy="24" r="3.5" />
        </g>
      ) : (
        /* 'flourish' - Trazo manuscrito oficial "Orth" (curva continua y dinámica) */
        <path
          d="M15 155 C 45 138, 85 92, 132 108 C 178 123, 215 54, 258 40 C 282 32, 305 38, 315 48 C 311 58, 288 64, 265 72 C 222 88, 192 148, 145 140 C 110 134, 72 165, 15 155 Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

