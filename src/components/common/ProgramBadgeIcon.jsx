import React from 'react';

/**
 * ProgramBadgeIcon - Iconos Oficiales de los 6 Programas Institucionales
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Páginas 24, 25, 28, 29 y 30)
 *
 * REGLAS INSTITUCIONALES ESTRICTAS:
 * 1. Todos los iconos de programa están basados en el lenguaje visual de la SONRISA.
 * 2. Asignación cromática inalterable por programa:
 *    - Robótica: #0A3C63 (Cara de robot con conector superior y sonrisa)
 *    - Nuevas Tecnologías: #2CACD0 (Laptop abierta con sonrisa en pantalla y nodos digitales superiores)
 *    - TeachLabs: #7b2cbf (Contenedor de laboratorio con sonrisa, cohete, lápiz y regla)
 *    - Inglés: #E0321C (Dos burbujas de diálogo sonrientes interactuando)
 *    - Habilidades Socioemocionales: #F4C400 (Silueta de mente/nube con ojos de corazón y sonrisa)
 *    - Becas "Educando para el Futuro": #abd037 (Isotipo humano central rodeado de coronas de estrellas)
 * 3. REGLA DE ORO: El trazo dentro del contenedor de color del programa debe ser SIEMPRE BLANCO (#FFFFFF),
 *    sin sombras ni contornos adicionales.
 */

export const PROGRAM_CONFIG = {
  robotica: {
    id: 'robotica',
    nombre: 'Robótica',
    color: '#0A3C63',
    textColor: '#ffffff',
    bgBadge: 'bg-[#0A3C63]/10 text-[#0A3C63] border-[#0A3C63]/25 dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]',
    aliases: ['robotica', 'robot', 'consumible', 'consumibles', 'electronica', 'stem', 'clubes'],
  },
  tecnologia: {
    id: 'tecnologia',
    nombre: 'Nuevas Tecnologías',
    color: '#2CACD0',
    textColor: '#ffffff',
    bgBadge: 'bg-[#2CACD0]/15 text-[#013a52] border-[#2CACD0]/40 dark:bg-[#2CACD0]/25 dark:text-[#2CACD0]',
    aliases: ['tecnologia', 'computo', 'equipo', 'equipos', 'laptop', 'tablet', 'retornable', 'semillero'],
  },
  teachlabs: {
    id: 'teachlabs',
    nombre: 'TeachLabs',
    color: '#7b2cbf',
    textColor: '#ffffff',
    bgBadge: 'bg-[#7b2cbf]/10 text-[#7b2cbf] border-[#7b2cbf]/25 dark:bg-[#7b2cbf]/25 dark:text-[#c084fc]',
    aliases: ['teachlabs', 'teachlab', 'papeleria', 'pedagogico', 'laboratorio', 'raton', 'lectura'],
  },
  ingles: {
    id: 'ingles',
    nombre: 'Inglés',
    color: '#E0321C',
    textColor: '#ffffff',
    bgBadge: 'bg-[#E0321C]/10 text-[#E0321C] border-[#E0321C]/25 dark:bg-[#E0321C]/25 dark:text-[#fca5a5]',
    aliases: ['ingles', 'english', 'idiomas', 'bilinguismo'],
  },
  socioemocional: {
    id: 'socioemocional',
    nombre: 'Habilidades Socioemocionales',
    color: '#F4C400',
    textColor: '#ffffff',
    bgBadge: 'bg-[#F4C400]/20 text-[#013a52] border-[#F4C400] dark:bg-[#F4C400]/25 dark:text-[#fde047]',
    aliases: ['socioemocional', 'socio', 'vida', 'colores', 'siembra', 'emocional'],
  },
  becas: {
    id: 'becas',
    nombre: 'Becas "Educando para el Futuro"',
    color: '#abd037',
    textColor: '#ffffff',
    bgBadge: 'bg-[#abd037]/15 text-[#013a52] border-[#abd037]/35 dark:bg-[#abd037]/25 dark:text-[#abd037]',
    aliases: ['becas', 'educando', 'futuro', 'institucional', 'liderazgo', 'general'],
  },
};

// Resuelve la configuración del programa a partir de cualquier término/categoría
export function resolveProgram(term) {
  if (!term) return PROGRAM_CONFIG.becas;
  const lower = String(term).toLowerCase().trim();
  for (const key of Object.keys(PROGRAM_CONFIG)) {
    const config = PROGRAM_CONFIG[key];
    if (config.aliases.some((alias) => lower.includes(alias))) {
      return config;
    }
  }
  return PROGRAM_CONFIG.becas;
}

// 1. Icono de Robótica: Cara de robot con conector superior y sonrisa
export function RoboticaIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Conector superior (antena con nodo) */}
      <line x1="12" y1="2" x2="12" y2="5" />
      <circle cx="12" cy="2" r="1" fill={color} />
      {/* Cara / cabeza del robot */}
      <rect x="4" y="5" width="16" height="15" rx="3.5" />
      {/* Pernos / oídos laterales */}
      <line x1="1.5" y1="12" x2="4" y2="12" strokeWidth="2.5" />
      <line x1="20" y1="12" x2="22.5" y2="12" strokeWidth="2.5" />
      {/* Ojos digitales */}
      <circle cx="8.5" cy="10" r="1.5" fill={color} />
      <circle cx="15.5" cy="10" r="1.5" fill={color} />
      {/* Sonrisa oficial FMO */}
      <path d="M8 14.5 Q 12 18 16 14.5" strokeWidth="2" />
    </svg>
  );
}

// 2. Icono de Nuevas Tecnologías: Laptop abierta con sonrisa en pantalla y nodos digitales superiores
export function TecnologiaIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Nodos digitales superiores (conexión inalámbrica / nube) */}
      <circle cx="12" cy="2" r="1" fill={color} />
      <path d="M8.5 3.5 A 5 5 0 0 1 15.5 3.5" strokeWidth="1.5" />
      {/* Pantalla de Laptop */}
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      {/* Ojos y Sonrisa en pantalla */}
      <circle cx="8.5" cy="8.5" r="1" fill={color} />
      <circle cx="15.5" cy="8.5" r="1" fill={color} />
      <path d="M9 11.5 Q 12 14 15 11.5" strokeWidth="1.8" />
      {/* Teclado / Base con apertura */}
      <path d="M2 18 L22 18 L20 20 L4 20 Z" />
      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" strokeWidth="1.5" />
    </svg>
  );
}

// 3. Icono de TeachLabs: Contenedor de laboratorio con sonrisa, cohete, lápiz y regla
export function TeachLabsIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Matraz / contenedor de laboratorio */}
      <path d="M9 2 L15 2 M10 2 L10 7 L4.5 17.5 C3.8 19 4.8 21 6.5 21 L17.5 21 C19.2 21 20.2 19 19.5 17.5 L14 7 L14 2" />
      {/* Marcas de regla en el cuello */}
      <line x1="13.5" y1="9" x2="15.5" y2="9" strokeWidth="1.5" />
      <line x1="13" y1="12" x2="15" y2="12" strokeWidth="1.5" />
      {/* Punta de cohete / lápiz superior */}
      <path d="M12 2 L13.5 0.5 L15 2" strokeWidth="1.5" />
      {/* Sonrisa en el líquido pedagógico */}
      <path d="M8.5 16 Q 12 19 15.5 16" strokeWidth="2" />
      {/* Burbujas creativas */}
      <circle cx="9" cy="13.5" r="0.8" fill={color} />
      <circle cx="15" cy="13.5" r="0.8" fill={color} />
    </svg>
  );
}

// 4. Icono de Inglés: Dos burbujas de diálogo sonrientes interactuando
export function InglesIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Burbuja principal (izquierda) con sonrisa */}
      <path d="M3 4 C3 2.5 4.5 1.5 6.5 1.5 L13.5 1.5 C15.5 1.5 17 2.5 17 4 L17 9 C17 10.5 15.5 11.5 13.5 11.5 L7.5 11.5 L4 14.5 L4.5 11.5 C3.5 11 3 10 3 9 Z" />
      <path d="M7 6 Q 10 8.5 13 6" strokeWidth="1.8" />
      {/* Burbuja interactiva secundaria (derecha) con sonrisa */}
      <path d="M13 11 C13 9.8 14 9 15.5 9 L19 9 C20.5 9 21.5 9.8 21.5 11 L21.5 15 C21.5 16.2 20.5 17 19 17 L17.5 17 L15.5 19.5 L16 17 C15 16.5 14.5 15.8 14.5 15 Z" strokeWidth="1.8" />
      <path d="M16 13.5 Q 17.5 15 19.5 13.5" strokeWidth="1.5" />
    </svg>
  );
}

// 5. Icono de Habilidades Socioemocionales: Silueta de mente/nube con ojos de corazón y sonrisa
export function SocioemocionalIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Silueta de mente / nube emocional */}
      <path d="M6.5 17 C4.5 17 3 15.5 3 13.5 C3 11.8 4.2 10.5 5.8 10.2 C5.8 7.5 8 5.5 11 5.5 C13.5 5.5 15.5 6.8 16.2 8.8 C17.2 8.2 18.5 8.5 19.5 9.5 C20.5 10.5 21 11.8 20.5 13.2 C21.5 14.2 21.2 15.8 20 16.8 C19.2 17.5 18 17.8 17 17.5 L7 17.5 Z" />
      {/* Ojos en forma de corazón */}
      <path d="M8 10.5 A 1 1 0 0 1 9.5 10.5 L9.5 11.8 L8 11 Z" fill={color} />
      <path d="M14.5 10.5 A 1 1 0 0 1 16 10.5 L16 11.8 L14.5 11 Z" fill={color} />
      {/* Sonrisa empática cálida */}
      <path d="M8.5 13.8 Q 12 16.8 15.5 13.8" strokeWidth="2" />
    </svg>
  );
}

// 6. Icono de Becas "Educando para el Futuro": Isotipo humano central rodeado de coronas de estrellas
export function BecasIcon({ size = 20, color = '#FFFFFF', className = '' }) {
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
      {/* Corona de estrellas minimalistas superiores */}
      <path d="M12 1.5 L12.5 3 L14 3.5 L12.5 4 L12 5.5 L11.5 4 L10 3.5 L11.5 3 Z" fill={color} strokeWidth="0" />
      <path d="M5.5 4 L6 5.2 L7.2 5.5 L6 6 L5.5 7 L5 6 L3.8 5.5 L5 5.2 Z" fill={color} strokeWidth="0" />
      <path d="M18.5 4 L19 5.2 L20.2 5.5 L19 6 L18.5 7 L18 6 L16.8 5.5 L18 5.2 Z" fill={color} strokeWidth="0" />
      {/* Isotipo humano con brazos abiertos al futuro */}
      <circle cx="12" cy="9" r="2.2" fill={color} />
      <path d="M5.5 12 C8 15 10 16 12 16 C14 16 16 15 18.5 12" strokeWidth="2.2" />
      <path d="M12 16 L12 22 M8.5 22 L12 19 L15.5 22" strokeWidth="2" />
    </svg>
  );
}

/**
 * ProgramBadgeIcon: Componente principal que adapta la presentación según variante:
 * - 'solid': Contenedor cuadrado/redondeado en color sólido del programa con icono SIEMPRE BLANCO (#FFFFFF).
 * - 'badge': Badge completo con icono blanco sobre círculo sólido y texto descriptivo al lado.
 * - 'icon': Renderiza directamente el SVG vectorial.
 */
export default function ProgramBadgeIcon({
  program = 'robotica',
  categoria = '',
  proyecto = '',
  size = 18,
  variant = 'solid', // 'solid' | 'badge' | 'icon'
  label = null,
  className = '',
  style = {},
}) {
  const config = resolveProgram(categoria || proyecto || program);

  const renderIcon = (iconColor = '#FFFFFF') => {
    switch (config.id) {
      case 'robotica':
        return <RoboticaIcon size={size} color={iconColor} />;
      case 'tecnologia':
        return <TecnologiaIcon size={size} color={iconColor} />;
      case 'teachlabs':
        return <TeachLabsIcon size={size} color={iconColor} />;
      case 'ingles':
        return <InglesIcon size={size} color={iconColor} />;
      case 'socioemocional':
        return <SocioemocionalIcon size={size} color={iconColor} />;
      case 'becas':
      default:
        return <BecasIcon size={size} color={iconColor} />;
    }
  };

  // 1. Solo Icono
  if (variant === 'icon') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} style={style}>
        {renderIcon('#FFFFFF')}
      </span>
    );
  }

  // 2. Contenedor Sólido Oficial (Regla de oro: icono SIEMPRE BLANCO)
  if (variant === 'solid') {
    const boxSize = Math.max(26, size + 8);
    return (
      <div
        className={`inline-flex items-center justify-center rounded-lg shadow-sm flex-shrink-0 transition-transform hover:scale-105 ${className}`}
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          backgroundColor: config.color,
          color: '#FFFFFF',
          ...style,
        }}
        title={`Programa Oficial: ${config.nombre}`}
        aria-label={config.nombre}
      >
        {renderIcon('#FFFFFF')}
      </div>
    );
  }

  // 3. Badge Completo Institucional (con contenedor de icono blanco + etiqueta)
  const displayLabel = label || config.nombre;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${config.bgBadge} ${className}`}
      style={style}
    >
      <span
        className="inline-flex items-center justify-center rounded-md p-1 shadow-xs flex-shrink-0"
        style={{
          backgroundColor: config.color,
          color: '#FFFFFF',
          width: `${size + 4}px`,
          height: `${size + 4}px`,
        }}
      >
        {renderIcon('#FFFFFF')}
      </span>
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

