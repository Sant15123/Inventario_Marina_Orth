import React from 'react';
import {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
} from './FmoProgramIcons';

// Icono neutro institucional para General / Administración / Sin Asignar
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
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const PROGRAM_OPTIONS = [
  'Nuevas Tecnologías',
  'Robótica',
  'TeachLabs',
  'Habilidades Socioemocionales',
  'Inglés',
  'Administración / General',
];

/**
 * Resuelve la configuración y estilos cromáticos del badge de Área / Programa
 */
export function resolveAreaConfig(area) {
  if (!area) {
    return {
      id: 'general',
      label: 'Sin asignar',
      badgeClass: 'bg-slate-50 text-[#6d6e71] border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      Icon: NeutralAreaIcon,
    };
  }

  const str = String(area).toLowerCase().trim();

  // 1. Robótica (#0A3C63)
  if (str.includes('robot')) {
    return {
      id: 'robotica',
      label: 'Robótica',
      badgeClass: 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]',
      Icon: RoboticaIcon,
    };
  }

  // 2. Nuevas Tecnologías (#2CACD0)
  if (
    str.includes('tecnolog') ||
    str.includes('computo') ||
    str.includes('laptop') ||
    str.includes('tablet') ||
    str.includes('equipo')
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
    str.includes('teach') ||
    str.includes('papel') ||
    str.includes('lab') ||
    str.includes('pedagog')
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
    str.includes('socio') ||
    str.includes('emocion') ||
    str.includes('vida') ||
    str.includes('habilidad')
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
    str.includes('ingl') ||
    str.includes('english') ||
    str.includes('idioma') ||
    str.includes('biling')
  ) {
    return {
      id: 'ingles',
      label: 'Inglés',
      badgeClass: 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 dark:bg-[#E0321C]/25 dark:text-[#fca5a5]',
      Icon: InglesIcon,
    };
  }

  // 6. Cualquier otro valor / Administración / General
  return {
    id: 'general',
    label: area || 'Administración / General',
    badgeClass: 'bg-slate-50 text-[#6d6e71] border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    Icon: NeutralAreaIcon,
  };
}

/**
 * ProgramAreaBadge - Badge oficial institucional para Área Asignada / Programa FMO
 */
export default function ProgramAreaBadge({
  area = '',
  className = '',
  iconSize = 18,
  showIcon = true,
  style = {},
}) {
  const config = resolveAreaConfig(area);
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
          <ProgramAreaBadge area={value} />
        </div>
      )}
    </div>
  );
}
