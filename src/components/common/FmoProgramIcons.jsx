import React from 'react';

/**
 * FmoProgramIcons - Componentes SVG Oficiales de los Programas Institucionales FMO
 * (Manual de Marca Fundación Marina Orth v1.0, Páginas 24, 25, 28, 29 y 30)
 *
 * Trazo blanco (#FFFFFF) redondeado sobre círculo sólido del color oficial de cada programa:
 * 1. Robótica (#0A3C63): Cabeza de robot con antena superior, orejas y sonrisa
 * 2. TeachLabs (#7b2cbf): Módulo/cohete pedagógico con propulsores, destellos y sonrisa
 * 3. Nuevas Tecnologías (#2CACD0): Laptop con sonrisa y circuitos/nodos inferiores
 * 4. Inglés (#E0321C): Dos burbujas de diálogo sonrientes con líneas de expresión
 * 5. Habilidades Socioemocionales (#F4C400): Nube/mente superior + rostro sonriente con audífonos
 * 6. Becas / Institucional FMO (#abd037): Isotipo humano central rodeado de estrellas
 */

// 1. Robótica (#0A3C63) - Cabeza de robot con antena superior, orejas y sonrisa
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
    {/* Antena superior */}
    <circle cx="50" cy="20" r="4" stroke="#FFFFFF" strokeWidth="4" />
    <line x1="50" y1="24" x2="50" y2="33" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* Cabeza */}
    <rect x="27" y="33" width="46" height="38" rx="8" stroke="#FFFFFF" strokeWidth="4.5" />
    {/* Orejas */}
    <path d="M27 45H21C19.5 45 18.5 46 18.5 47.5V56.5C18.5 58 19.5 59 21 59H27" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    <path d="M73 45H79C80.5 45 81.5 46 81.5 47.5V56.5C81.5 58 80.5 59 79 59H73" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* Ojos y sonrisa */}
    <circle cx="40" cy="49" r="3" fill="#FFFFFF" />
    <circle cx="60" cy="49" r="3" fill="#FFFFFF" />
    <path d="M43 58C45.5 61 54.5 61 57 58" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 2. TeachLabs (#7b2cbf) - Módulo/cohete pedagógico con propulsores, destellos y sonrisa
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
    {/* Propulsor superior / punta */}
    <path d="M44 26L50 17L56 26" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 28L39 22M65 28L61 22" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
    {/* Cuerpo principal */}
    <rect x="28" y="31" width="44" height="36" rx="8" stroke="#FFFFFF" strokeWidth="4.5" />
    {/* Ojos y sonrisa */}
    <circle cx="40" cy="46" r="3" fill="#FFFFFF" />
    <circle cx="60" cy="46" r="3" fill="#FFFFFF" />
    <path d="M43 54C45.5 57 54.5 57 57 54" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* Patas / base */}
    <path d="M36 67L32 75M64 67L68 75" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* Destellos laterales */}
    <circle cx="33" cy="20" r="2" fill="#FFFFFF" />
    <circle cx="67" cy="20" r="2" fill="#FFFFFF" />
  </svg>
);

// 3. Nuevas Tecnologías (#2CACD0) - Circuitos arriba + Pantalla sonriente + Base laptop abajo
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
    
    {/* 5 Circuitos / Nodos saliendo hacia ARRIBA de la pantalla */}
    <path
      d="M50 38V21M42 38V29L36 24M58 38V29L64 24M33 38V34L27 32M67 38V34L73 32"
      stroke="#FFFFFF"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="50" cy="18" r="2.8" stroke="#FFFFFF" strokeWidth="2.5" />
    <circle cx="34" cy="22" r="2.8" stroke="#FFFFFF" strokeWidth="2.5" />
    <circle cx="66" cy="22" r="2.8" stroke="#FFFFFF" strokeWidth="2.5" />
    <circle cx="24" cy="32" r="2.8" stroke="#FFFFFF" strokeWidth="2.5" />
    <circle cx="76" cy="32" r="2.8" stroke="#FFFFFF" strokeWidth="2.5" />

    {/* Pantalla de Laptop */}
    <rect x="28" y="42" width="44" height="28" rx="4" stroke="#FFFFFF" strokeWidth="4" />

    {/* Ojitos arqueados felices y sonrisa */}
    <path d="M37 53C38.5 50.5 41.5 50.5 43 53" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M57 53C58.5 50.5 61.5 50.5 63 53" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M43 60C45.5 63.5 54.5 63.5 57 60" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" />

    {/* Base de Laptop ABAJO con muesca central */}
    <path
      d="M21 70H44V72H56V70H79L76 76H24L21 70Z"
      stroke="#FFFFFF"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
  </svg>
);

// 4. Inglés (#E0321C) - Dos burbujas de diálogo sonrientes con líneas de expresión
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
    {/* Rayos de expresión superiores */}
    <path d="M35 23L32 17M44 21L44 15M53 23L56 17" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
    {/* Burbuja trasera derecha */}
    <path d="M56 36C66.5 36 75 43.5 75 52.5C75 56.5 73.3 60.1 70.5 63L73 70L65.5 67.2C62.7 68.4 59.4 69 56 69C51.2 69 46.8 67.4 43.5 64.8" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="54" cy="50" r="2.3" fill="#FFFFFF" />
    <circle cx="64" cy="50" r="2.3" fill="#FFFFFF" />
    <path d="M55 56C57 58.5 61 58.5 63 56" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
    {/* Burbuja frontal izquierda */}
    <path d="M42 30C30.4 30 21 38.2 21 48.2C21 52.6 22.8 56.6 25.9 59.8L23 67.5L31.4 64.4C34.6 65.7 38.2 66.5 42 66.5C53.6 66.5 63 58.3 63 48.2C63 38.2 53.6 30 42 30Z" fill="#E0321C" stroke="#FFFFFF" strokeWidth="4.2" strokeLinejoin="round" />
    <circle cx="35" cy="45" r="2.5" fill="#FFFFFF" />
    <circle cx="49" cy="45" r="2.5" fill="#FFFFFF" />
    <path d="M37 52C39.5 55 44.5 55 47 52" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

// 5. Habilidades Socioemocionales (#F4C400) - Nube/mente superior + rostro sonriente con audífonos
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
    {/* Nube / Mente superior */}
    <path d="M37 37C33.5 37 31 34.5 31 31.5C31 29 32.8 27 35 26.3C35.8 22.5 39.2 19.8 43.2 19.8C45.8 19.8 48.1 21 49.6 22.8C51.1 21 53.4 19.8 56 19.8C60 19.8 63.4 22.5 64.2 26.3C66.4 27 68.2 29 68.2 31.5C68.2 34.5 65.7 37 62.2 37" stroke="#FFFFFF" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    {/* Rostro circular con audífonos */}
    <circle cx="50" cy="55" r="18" stroke="#FFFFFF" strokeWidth="4.2" />
    <rect x="26" y="48" width="5" height="14" rx="2.5" fill="#FFFFFF" />
    <rect x="69" y="48" width="5" height="14" rx="2.5" fill="#FFFFFF" />
    {/* Base / cuello */}
    <path d="M42 73V78H58V73" stroke="#FFFFFF" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    {/* Ojos y sonrisa */}
    <circle cx="44" cy="52" r="2.6" fill="#FFFFFF" />
    <circle cx="56" cy="52" r="2.6" fill="#FFFFFF" />
    <path d="M44 60C46.5 63 53.5 63 56 60" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" />
  </svg>
);

// 6. Becas / Institucional FMO (#abd037)
export const BecasFmoIcon = ({ className = 'w-5 h-5', size, style }) => (
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
    <circle cx="50" cy="36" r="6" fill="#FFFFFF" />
    <path d="M32 39C38 46 45 48 50 48C55 48 62 46 68 39L63 49L53 68H47L37 49L32 39Z" fill="#FFFFFF" />
    <circle cx="50" cy="50" r="32" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="6 6" />
  </svg>
);

// Alias para compatibilidad con importaciones existentes
export const BecasIcon = BecasFmoIcon;

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
    Icon: BecasFmoIcon,
    aliases: ['becas', 'educando', 'futuro', 'general', 'institucional'],
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
  TeachLabsIcon,
  NuevasTecnologiasIcon,
  InglesIcon,
  SocioemocionalIcon,
  BecasFmoIcon,
  BecasIcon,
  FmoProgramIcon,
  FmoProgramBadge,
  FMO_PROGRAMS,
  resolveFmoProgram,
};
