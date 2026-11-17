import React from 'react';

/**
 * FmoStarIcon - Iconografía Institucional Transversal con la Estrella Minimalista
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Páginas 24 y 25)
 *
 * REGLAS INSTITUCIONALES ESTRICTAS:
 * 1. Indicadores transversales para:
 *    - Sede / Territorio: Sede o pin municipal acompañado de la estrella minimalista.
 *    - Usuarios / Docentes: Silueta de docente/educador acompañado de la estrella minimalista.
 *    - Proyectos / Innovación: Nodo de innovación / bombilla STEAM acompañado de la estrella minimalista.
 *    - Historial / Logros: Reloj de trayectoria / medalla acompañado de la estrella minimalista.
 * 2. Estado base: Trazo lineal en Gris Institucional (#6d6e71).
 * 3. Prohibido usar iconos grises dentro de contenedores de color de los programas (allí van en blanco #FFFFFF).
 */

// Icono 1: Sede / Territorio con Estrella Minimalista
export function SedeStarIcon({ size = 18, color = '#6d6e71', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Sede / Edificación institucional */}
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2M10 21v-4h4v4" />
      {/* Estrella minimalista FMO de guía y proyección territorial */}
      <path
        d="M19 2l.7 1.8L21.5 4.5l-1.8.7L19 7l-.7-1.8-1.8-.7 1.8-.7z"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

// Icono 2: Usuario / Docente con Estrella Minimalista
export function UsuarioStarIcon({ size = 18, color = '#6d6e71', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Docente / Educador */}
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      {/* Estrella minimalista FMO de liderazgo y vocación */}
      <path
        d="M19 2l.7 1.8L21.5 4.5l-1.8.7L19 7l-.7-1.8-1.8-.7 1.8-.7z"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

// Icono 3: Proyecto / Innovación con Estrella Minimalista
export function ProyectoStarIcon({ size = 18, color = '#6d6e71', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Bombillo / Nodo de Innovación STEAM */}
      <path d="M8.5 14A6 6 0 1 1 15.5 14c-.8.8-1.5 2-1.5 3h-4c0-1-.7-2.2-1.5-3zM10 20h4M11 22h2" />
      {/* Estrella minimalista FMO de innovación */}
      <path
        d="M20 2l.7 1.8L22.5 4.5l-1.8.7L20 7l-.7-1.8-1.8-.7 1.8-.7z"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

// Icono 4: Historial / Logros con Estrella Minimalista
export function HistorialStarIcon({ size = 18, color = '#6d6e71', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Reloj de trayectoria / historial */}
      <circle cx="11" cy="12" r="8" />
      <polyline points="11 8 11 12 14 14" />
      {/* Estrella minimalista FMO de logro y memoria */}
      <path
        d="M19 2l.7 1.8L21.5 4.5l-1.8.7L19 7l-.7-1.8-1.8-.7 1.8-.7z"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

/**
 * FmoStarIcon: Selector principal para renderizar el icono transversal adecuado
 */
export default function FmoStarIcon({
  indicator = 'sede', // 'sede' | 'usuario' | 'proyecto' | 'historial'
  size = 18,
  color = '#6d6e71',
  className = '',
  style = {},
}) {
  const norm = String(indicator).toLowerCase().trim();

  let IconComponent = SedeStarIcon;
  if (norm.includes('user') || norm.includes('usuario') || norm.includes('docente') || norm.includes('formador')) {
    IconComponent = UsuarioStarIcon;
  } else if (norm.includes('proy') || norm.includes('steam') || norm.includes('innova')) {
    IconComponent = ProyectoStarIcon;
  } else if (norm.includes('hist') || norm.includes('logro') || norm.includes('mov') || norm.includes('trayec')) {
    IconComponent = HistorialStarIcon;
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={style}>
      <IconComponent size={size} color={color} />
    </span>
  );
}
