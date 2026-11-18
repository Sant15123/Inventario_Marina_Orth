import React from 'react';
import {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
  BecasFmoIcon,
} from './FmoProgramIcons';

export {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
  BecasFmoIcon,
};

// Icono neutro institucional para General / Administración / Sin Asignar (Caja de inventario, nunca calendario)
export const NeutralAreaIcon = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="#6d6e71"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

export const PROGRAM_OPTIONS = [
  'Nuevas Tecnologías',
  'Robótica',
  'TeachLabs',
  'Habilidades Socioemocionales',
  'Inglés',
  'Becas "Educando para el Futuro"',
  'Administración / General',
];

/**
 * Normaliza una cadena eliminando acentos/tildes, espacios extras y pasando a minúsculas
 */
export function normalizeAreaText(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resuelve la configuración y estilos cromáticos del badge de Área / Programa
 * Soporta tildes (Robótica, Tecnologías, Inglés), sinónimos y subcategorías
 * con opción de programa predeterminado de respaldo.
 */
export function resolveAreaConfig(area, defaultProgram = null) {
  const norm = normalizeAreaText(area);
  const defNorm = normalizeAreaText(defaultProgram);

  // 1. Robótica (#0A3C63)
  if (
    norm.includes('robot') ||
    norm.includes('electron') ||
    norm.includes('herramient') ||
    norm.includes('impresion 3d') ||
    norm.includes('3d') ||
    norm.includes('sensor') ||
    norm.includes('cable') ||
    norm.includes('adaptador') ||
    norm.includes('arduino') ||
    norm.includes('lego') ||
    norm.includes('maker') ||
    norm.includes('motor') ||
    norm.includes('mecatron') ||
    norm.includes('dron') ||
    (norm.includes('consumible') && !norm.includes('papel'))
  ) {
    return {
      id: 'robotica',
      label: 'Robótica',
      badgeClass: 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]',
      Icon: RoboticaIcon,
    };
  }

  // 2. Nuevas Tecnologías (#2CACD0)
  if (
    norm.includes('tecnolog') ||
    norm.includes('comput') ||
    norm.includes('laptop') ||
    norm.includes('tablet') ||
    norm.includes('portatil') ||
    norm.includes('equipo') ||
    norm.includes('servidor') ||
    norm.includes('switch') ||
    norm.includes('router') ||
    norm.includes('pantalla') ||
    norm.includes('monitor')
  ) {
    return {
      id: 'tecnologia',
      label: 'Nuevas Tecnologías',
      badgeClass: 'bg-[#2CACD0]/15 text-[#013a52] border border-[#2CACD0]/40 dark:bg-[#2CACD0]/25 dark:text-[#67e8f9]',
      Icon: NuevasTecnologiasIcon,
    };
  }

  // 3. TeachLabs (#7b2cbf)
  if (
    norm.includes('teach') ||
    norm.includes('papel') ||
    norm.includes('lab') ||
    norm.includes('pedagog') ||
    norm.includes('educa') ||
    norm.includes('escolar') ||
    norm.includes('aula') ||
    norm.includes('docente') ||
    norm.includes('cuaderno') ||
    norm.includes('marcador') ||
    norm.includes('cartulina') ||
    norm.includes('resma') ||
    norm.includes('tinta') ||
    norm.includes('oficina')
  ) {
    return {
      id: 'teachlabs',
      label: 'TeachLabs',
      badgeClass: 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 dark:bg-[#7b2cbf]/25 dark:text-[#c084fc]',
      Icon: TeachLabsIcon,
    };
  }

  // 4. Habilidades Socioemocionales (#F4C400)
  if (
    norm.includes('socio') ||
    norm.includes('emocion') ||
    norm.includes('vida') ||
    norm.includes('habilidad') ||
    norm.includes('bienestar') ||
    norm.includes('psico')
  ) {
    return {
      id: 'socioemocional',
      label: 'Habilidades Socioemocionales',
      badgeClass: 'bg-[#F4C400]/20 text-[#013a52] border border-[#F4C400] dark:bg-[#F4C400]/25 dark:text-[#fde047]',
      Icon: SocioemocionalIcon,
    };
  }

  // 5. Inglés (#E0321C)
  if (
    norm.includes('ingl') ||
    norm.includes('english') ||
    norm.includes('idioma') ||
    norm.includes('biling') ||
    norm.includes('lengua')
  ) {
    return {
      id: 'ingles',
      label: 'Inglés',
      badgeClass: 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 dark:bg-[#E0321C]/25 dark:text-[#fca5a5]',
      Icon: InglesIcon,
    };
  }

  // 6. Becas "Educando para el Futuro" (#abd037)
  if (
    norm.includes('beca') ||
    norm.includes('futuro') ||
    norm.includes('educando')
  ) {
    return {
      id: 'becas',
      label: 'Becas "Educando para el Futuro"',
      badgeClass: 'bg-[#abd037]/15 text-[#013a52] border border-[#abd037]/35 dark:bg-[#abd037]/25 dark:text-[#abd037]',
      Icon: BecasFmoIcon,
    };
  }

  // Si no coincide y se proporcionó un defaultProgram, recurrir a él
  if (defNorm) {
    if (defNorm.includes('robot')) {
      return {
        id: 'robotica',
        label: 'Robótica',
        badgeClass: 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]',
        Icon: RoboticaIcon,
      };
    }
    if (defNorm.includes('teach') || defNorm.includes('papel')) {
      return {
        id: 'teachlabs',
        label: 'TeachLabs',
        badgeClass: 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 dark:bg-[#7b2cbf]/25 dark:text-[#c084fc]',
        Icon: TeachLabsIcon,
      };
    }
    if (defNorm.includes('tec') || defNorm.includes('equipo')) {
      return {
        id: 'tecnologia',
        label: 'Nuevas Tecnologías',
        badgeClass: 'bg-[#2CACD0]/15 text-[#013a52] border border-[#2CACD0]/40 dark:bg-[#2CACD0]/25 dark:text-[#67e8f9]',
        Icon: NuevasTecnologiasIcon,
      };
    }
    if (defNorm.includes('socio') || defNorm.includes('emocion')) {
      return {
        id: 'socioemocional',
        label: 'Habilidades Socioemocionales',
        badgeClass: 'bg-[#F4C400]/20 text-[#013a52] border border-[#F4C400] dark:bg-[#F4C400]/25 dark:text-[#fde047]',
        Icon: SocioemocionalIcon,
      };
    }
    if (defNorm.includes('ingl') || defNorm.includes('english')) {
      return {
        id: 'ingles',
        label: 'Inglés',
        badgeClass: 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 dark:bg-[#E0321C]/25 dark:text-[#fca5a5]',
        Icon: InglesIcon,
      };
    }
    if (defNorm.includes('beca') || defNorm.includes('futuro') || defNorm.includes('educando')) {
      return {
        id: 'becas',
        label: 'Becas "Educando para el Futuro"',
        badgeClass: 'bg-[#abd037]/15 text-[#013a52] border border-[#abd037]/35 dark:bg-[#abd037]/25 dark:text-[#abd037]',
        Icon: BecasFmoIcon,
      };
    }
  }

  // 7. Sin asignar o Administración / General
  if (!area) {
    return {
      id: 'general',
      label: 'Sin asignar',
      badgeClass: 'bg-slate-50 text-[#6d6e71] border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      Icon: NeutralAreaIcon,
    };
  }

  // 8. Cualquier otro valor explícito / Administración / General
  return {
    id: 'general',
    label: area,
    badgeClass: 'bg-slate-50 text-[#6d6e71] border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    Icon: NeutralAreaIcon,
  };
}

/**
 * ProgramAreaBadge - Badge oficial institucional para Área Asignada / Programa FMO
 */
export default function ProgramAreaBadge({
  area = '',
  defaultProgram = null,
  className = '',
  iconSize = 18,
  showIcon = true,
  style = {},
}) {
  const config = resolveAreaConfig(area, defaultProgram);
  const IconComponent = config.Icon;

  return (
    <span
      className={`program-area-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none shadow-2xs transition-all ${config.badgeClass} ${className}`}
      style={{
        fontFamily: "'Poppins', sans-serif",
        ...style,
      }}
      title={`Programa / Área FMO: ${config.label}`}
    >
      {showIcon && (
        <span
          className="flex-shrink-0 inline-flex items-center justify-center"
          style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
        >
          <IconComponent size={iconSize} className="w-full h-full" />
        </span>
      )}
      <span className="truncate">{config.label}</span>
    </span>
  );
}

/**
 * ProgramAreaSelect - Selector oficial controlado de Área Asignada / Programa FMO
 * con previsualización en vivo del badge institucional
 */
export function ProgramAreaSelect({
  value = '',
  onChange,
  name = 'area',
  id,
  className = '',
  showPreview = true,
  required = false,
  label = 'Área Asignada',
  defaultProgram = null,
}) {
  return (
    <div className="program-area-select-container">
      {label && (
        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        required={required}
        value={value || ''}
        onChange={onChange}
        className={`w-full bg-white text-[#013a52] font-semibold border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-xl px-3 py-2 text-sm outline-none transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 ${className}`}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <option value="">-- Seleccionar Programa / Área --</option>
        {PROGRAM_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {showPreview && value && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-[#6d6e71] dark:text-slate-400 font-medium">
            Previsualización en inventario:
          </span>
          <ProgramAreaBadge area={value} defaultProgram={defaultProgram} />
        </div>
      )}
    </div>
  );
}
