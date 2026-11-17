import React from 'react';

/**
 * FmoProgramIcons - Componentes SVG Oficiales de los Programas Institucionales FMO
 * (Manual de Marca Fundación Marina Orth v1.0, Páginas 24, 25, 28, 29 y 30)
 *
 * REGLA CROMÁTICA OFICIAL:
 * - Robótica (#0A3C63): Fondo #0A3C63/10, texto #0A3C63. Icono interno con trazo blanco sobre fondo #0A3C63.
 * - Nuevas Tecnologías (#2CACD0): Fondo #2CACD0/15, texto #013a52. Icono interno con trazo blanco sobre fondo #2CACD0.
 * - TeachLabs (#7b2cbf): Fondo #7b2cbf/10, texto #7b2cbf. Icono interno con trazo blanco sobre fondo #7b2cbf.
 * - Socioemocional (#F4C400): Fondo #F4C400/20, texto #013a52. Icono interno con trazo blanco sobre fondo #F4C400.
 * - Inglés (#E0321C): Fondo #E0321C/10, texto #E0321C. Icono interno con trazo blanco sobre fondo #E0321C.
 * - Becas "Educando para el Futuro" (#abd037): Fondo #abd037/15, texto #013a52.
 */

// 1. Robótica: Cara de robot con conector superior y sonrisa (#0A3C63)
export const RoboticaIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Robótica FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#0A3C63" />
    <path
      d="M30 42H70V70C70 75.5 65.5 80 60 80H40C34.5 80 30 75.5 30 70V42Z"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M40 30H60V42H40V30Z"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="50" y1="30" x2="50" y2="18" stroke="white" strokeWidth="5" strokeLinecap="round" />
    <circle cx="50" cy="15" r="4" fill="white" />
  </svg>
);

// 2. Nuevas Tecnologías: Laptop abierta con sonrisa en pantalla y nodos de conectividad (#2CACD0)
export const NuevasTecnologiasIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Nuevas Tecnologías FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#2CACD0" />
    <path
      d="M22 62H78V66C78 68.2 76.2 70 74 70H26C23.8 70 22 68.2 22 66V62Z"
      fill="white"
    />
    <rect
      x="28"
      y="30"
      width="44"
      height="32"
      rx="4"
      stroke="white"
      strokeWidth="5"
    />
  </svg>
);

// 3. TeachLabs: Contenedor de laboratorio con sonrisa (#7b2cbf)
export const TeachLabsIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="TeachLabs FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#7b2cbf" />
    <path
      d="M32 42H68V75C68 77.8 65.8 80 63 80H37C34.2 80 32 77.8 32 75V42Z"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M42 42V32C42 30.9 42.9 30 44 30H56C57.1 30 58 30.9 58 32V42"
      stroke="white"
      strokeWidth="5"
    />
  </svg>
);

// 4. Habilidades Socioemocionales: Mente/nube con sonrisa (#F4C400)
export const SocioemocionalIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Socioemocional FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#F4C400" />
    <path
      d="M32 50 C28 42 36 34 44 38 C48 30 62 30 66 38 C74 34 82 42 78 50 C84 58 76 68 68 66 C64 74 46 74 42 66 C34 68 26 58 32 50 Z"
      stroke="white"
      strokeWidth="4"
      fill="#F4C400"
    />
    <circle cx="44" cy="48" r="4" fill="white" />
    <circle cx="64" cy="48" r="4" fill="white" />
    <path d="M46 58 Q 54 64 62 58" stroke="white" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 5. Inglés: Burbujas de diálogo sonrientes interactuando (#E0321C)
export const InglesIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Inglés FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#E0321C" />
    <path
      d="M28 35 H62 C66 35 70 39 70 43 V55 C70 59 66 63 62 63 H42 L32 71 V63 H28 C24 63 20 59 20 55 V43 C20 39 24 35 28 35 Z"
      stroke="white"
      strokeWidth="4"
      fill="#E0321C"
    />
    <path d="M38 49 Q 44 54 50 49" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="36" cy="44" r="2.5" fill="white" />
    <circle cx="52" cy="44" r="2.5" fill="white" />
  </svg>
);

// 6. Becas "Educando para el Futuro" (#abd037)
export const BecasIcon = ({ className = 'w-5 h-5', size, style }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    width={size}
    height={size}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Becas FMO"
  >
    <circle cx="50" cy="50" r="48" fill="#abd037" />
    <circle cx="50" cy="34" r="8" fill="white" />
    <path
      d="M32 64 C32 52 40 48 50 48 C60 48 68 52 68 64 V70 H32 Z"
      stroke="white"
      strokeWidth="4"
      fill="white"
    />
  </svg>
);

export const FMO_PROGRAMS = {
  robotica: {
    id: 'robotica',
    nombre: 'Robótica',
    color: '#0A3C63',
    bgBadge: 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]',
    Icon: RoboticaIcon,
    aliases: ['robotica', 'robot', 'consumible', 'consumibles', 'electronica', 'arduino', 'stem', 'clubes'],
  },
  tecnologia: {
    id: 'tecnologia',
    nombre: 'Nuevas Tecnologías',
    color: '#2CACD0',
    bgBadge: 'bg-[#2CACD0]/15 text-[#013a52] border border-[#2CACD0]/40 dark:bg-[#2CACD0]/25 dark:text-[#67e8f9]',
    Icon: NuevasTecnologiasIcon,
    aliases: ['tecnologia', 'computo', 'equipo', 'equipos', 'laptop', 'tablet', 'retornable', 'pantalla', 'semillero'],
  },
  teachlabs: {
    id: 'teachlabs',
    nombre: 'TeachLabs',
    color: '#7b2cbf',
    bgBadge: 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 dark:bg-[#7b2cbf]/25 dark:text-[#c084fc]',
    Icon: TeachLabsIcon,
    aliases: ['teachlabs', 'teachlab', 'papeleria', 'pedagogico', 'laboratorio', 'resma', 'cartulina', 'marcador', 'raton', 'lectura'],
  },
  socioemocional: {
    id: 'socioemocional',
    nombre: 'Habilidades Socioemocionales',
    color: '#F4C400',
    bgBadge: 'bg-[#F4C400]/20 text-[#013a52] border border-[#F4C400] dark:bg-[#F4C400]/25 dark:text-[#fde047]',
    Icon: SocioemocionalIcon,
    aliases: ['socioemocional', 'socio', 'vida', 'colores', 'siembra', 'emocional'],
  },
  ingles: {
    id: 'ingles',
    nombre: 'Inglés',
    color: '#E0321C',
    bgBadge: 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 dark:bg-[#E0321C]/25 dark:text-[#fca5a5]',
    Icon: InglesIcon,
    aliases: ['ingles', 'english', 'idiomas', 'bilinguismo'],
  },
  becas: {
    id: 'becas',
    nombre: 'Becas "Educando para el Futuro"',
    color: '#abd037',
    bgBadge: 'bg-[#abd037]/15 text-[#013a52] border border-[#abd037]/35 dark:bg-[#abd037]/25 dark:text-[#abd037]',
    Icon: BecasIcon,
    aliases: ['becas', 'educando', 'futuro', 'general'],
  },
};

/**
 * Resuelve la clave de programa a partir del texto de categoría o programa
 */
export function resolveFmoProgram(term) {
  if (!term) return FMO_PROGRAMS.robotica;
  const lower = String(term).toLowerCase().trim();
  for (const key of Object.keys(FMO_PROGRAMS)) {
    const prog = FMO_PROGRAMS[key];
    if (prog.aliases.some((alias) => lower.includes(alias))) {
      return prog;
    }
  }
  return FMO_PROGRAMS.robotica;
}

/**
 * FmoProgramIcon - Renderiza el icono SVG del programa según categoría o nombre
 */
export function FmoProgramIcon({ program, categoria, className = 'w-5 h-5', size, style }) {
  const resolved = resolveFmoProgram(program || categoria);
  const IconComponent = resolved.Icon;
  return <IconComponent className={className} size={size} style={style} />;
}

/**
 * FmoProgramBadge - Badge oficial institucional con icono blanco en contenedor sólido
 * y estilos cromáticos reglamentarios (Fondo con opacidad, borde y texto de alto contraste)
 */
export function FmoProgramBadge({
  program,
  categoria,
  label,
  iconSize = 16,
  showIcon = true,
  className = '',
  style = {},
}) {
  const resolved = resolveFmoProgram(program || categoria);
  const displayLabel = label || resolved.nombre;
  const IconComponent = resolved.Icon;

  return (
    <span
      className={`fmo-program-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none ${resolved.bgBadge} ${className}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        ...style,
      }}
      title={`Programa Oficial: ${resolved.nombre}`}
    >
      {showIcon && (
        <span className="flex-shrink-0 inline-flex items-center justify-center" style={{ width: iconSize, height: iconSize }}>
          <IconComponent size={iconSize} className="w-full h-full" />
        </span>
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

export default {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
  BecasIcon,
  FmoProgramIcon,
  FmoProgramBadge,
  FMO_PROGRAMS,
  resolveFmoProgram,
};
