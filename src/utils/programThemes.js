/**
 * Sistema de Marca FMO v1.0 - Diccionario Central de Temas Dinámicos por Programa
 * (Manual de Marca Fundación Marina Orth, Secciones de Identidad Cromática)
 *
 * Colores oficiales:
 * - Robótica: #0A3C63 (Azul Oscuro)
 * - Nuevas Tecnologías: #2CACD0 (Azul Claro / Turquesa)
 * - TeachLabs: #7B2CBF (Morado)
 * - Habilidades Socioemocionales: #F4C400 (Amarillo)
 * - Inglés: #E0321C (Rojo)
 * - Becas "Educando para el Futuro" / Institucional: #ABD037 (Verde Lima FMO)
 * - Default / Administración: #013A52 (Azul Complementario FMO) con acento #ABD037
 */

export const PROGRAM_THEMES = {
  'Robótica': {
    name: 'Robótica',
    primary: '#0A3C63',      // Azul Oscuro Oficial (Robótica)
    headerBg: '#0A3C63',
    headerText: '#FFFFFF',
    headerSubtext: '#CBD5E1',
    accentBorder: '#0A3C63',
    buttonBg: '#0A3C63',
    buttonHover: '#072B47',
    buttonText: '#FFFFFF',
    iconBg: 'rgba(255, 255, 255, 0.14)',
    iconColor: '#FFFFFF',
    cardBorder: 'rgba(10, 60, 99, 0.35)',
  },
  'Nuevas Tecnologías': {
    name: 'Nuevas Tecnologías',
    primary: '#2CACD0',      // Azul Claro / Turquesa Oficial (Nuevas Tecnologías)
    headerBg: '#2CACD0',
    headerText: '#FFFFFF',
    headerSubtext: '#F0F9FF',
    accentBorder: '#2CACD0',
    buttonBg: '#2CACD0',
    buttonHover: '#2292B3',
    buttonText: '#FFFFFF',
    iconBg: 'rgba(255, 255, 255, 0.18)',
    iconColor: '#FFFFFF',
    cardBorder: 'rgba(44, 172, 208, 0.38)',
  },
  'TeachLabs': {
    name: 'TeachLabs',
    primary: '#7B2CBF',      // Morado Oficial (TeachLabs)
    headerBg: '#7B2CBF',
    headerText: '#FFFFFF',
    headerSubtext: '#F3E8FF',
    accentBorder: '#7B2CBF',
    buttonBg: '#7B2CBF',
    buttonHover: '#63209E',
    buttonText: '#FFFFFF',
    iconBg: 'rgba(255, 255, 255, 0.16)',
    iconColor: '#FFFFFF',
    cardBorder: 'rgba(123, 44, 191, 0.35)',
  },
  'Habilidades Socioemocionales': {
    name: 'Habilidades Socioemocionales',
    primary: '#F4C400',      // Amarillo Oficial (Habilidades Socioemocionales y para la Vida)
    headerBg: '#F4C400',
    headerText: '#013A52',   // Azul oscuro para máximo contraste legible
    headerSubtext: '#1E293B',
    accentBorder: '#F4C400',
    buttonBg: '#F4C400',
    buttonHover: '#D9AE00',
    buttonText: '#013A52',
    iconBg: 'rgba(1, 58, 82, 0.12)',
    iconColor: '#013A52',
    cardBorder: 'rgba(244, 196, 0, 0.45)',
  },
  'Inglés': {
    name: 'Inglés',
    primary: '#E0321C',      // Rojo Oficial (Inglés)
    headerBg: '#E0321C',
    headerText: '#FFFFFF',
    headerSubtext: '#FEE2E2',
    accentBorder: '#E0321C',
    buttonBg: '#E0321C',
    buttonHover: '#B92513',
    buttonText: '#FFFFFF',
    iconBg: 'rgba(255, 255, 255, 0.16)',
    iconColor: '#FFFFFF',
    cardBorder: 'rgba(224, 50, 28, 0.35)',
  },
  'Becas / Institucional': {
    name: 'Becas / Institucional',
    primary: '#ABD037',      // Verde FMO Oficial (Becas "Educando para el Futuro" / Administración)
    headerBg: '#ABD037',
    headerText: '#013A52',
    headerSubtext: '#1E293B',
    accentBorder: '#ABD037',
    buttonBg: '#ABD037',
    buttonHover: '#96B82D',
    buttonText: '#013A52',
    iconBg: 'rgba(1, 58, 82, 0.12)',
    iconColor: '#013A52',
    cardBorder: 'rgba(171, 208, 55, 0.45)',
  },
  // Tema por defecto cuando aún no se ha seleccionado programa o es Administración General
  default: {
    name: 'General / Administración',
    primary: '#013A52',      // Azul Complementario FMO
    headerBg: '#013A52',
    headerText: '#FFFFFF',
    headerSubtext: '#CBD5E1',
    accentBorder: '#ABD037',
    buttonBg: '#ABD037',
    buttonHover: '#96B82D',
    buttonText: '#013A52',
    iconBg: 'rgba(171, 208, 55, 0.18)',
    iconColor: '#ABD037',
    cardBorder: 'rgba(171, 208, 55, 0.45)',
  },
};

/**
 * Normaliza cadenas de texto eliminando acentos, tildes y pasando a minúsculas
 */
export function normalizeProgramName(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Obtiene el tema institucional FMO correspondiente al programa o área asignada
 * con resolución inteligente para variaciones de nombres, tildes y casos de respaldo.
 */
export function getProgramTheme(areaName, fallbackKey = 'default') {
  if (!areaName || typeof areaName !== 'string') {
    return PROGRAM_THEMES[fallbackKey] || PROGRAM_THEMES.default;
  }

  // Coincidencia exacta de clave
  if (PROGRAM_THEMES[areaName]) {
    return PROGRAM_THEMES[areaName];
  }

  const norm = normalizeProgramName(areaName);

  if (norm.includes('robot')) {
    return PROGRAM_THEMES['Robótica'];
  }
  if (norm.includes('tecnolog') || norm.includes('comput') || norm.includes('tic')) {
    return PROGRAM_THEMES['Nuevas Tecnologías'];
  }
  if (norm.includes('teach') || norm.includes('lab') || (norm.includes('papel') && !norm.includes('robot'))) {
    return PROGRAM_THEMES['TeachLabs'];
  }
  if (norm.includes('socio') || norm.includes('emocion') || norm.includes('vida')) {
    return PROGRAM_THEMES['Habilidades Socioemocionales'];
  }
  if (norm.includes('ingl') || norm.includes('english')) {
    return PROGRAM_THEMES['Inglés'];
  }
  if (norm.includes('beca') || norm.includes('futuro') || norm.includes('educando')) {
    return PROGRAM_THEMES['Becas / Institucional'];
  }

  return PROGRAM_THEMES[fallbackKey] || PROGRAM_THEMES.default;
}

export default PROGRAM_THEMES;
