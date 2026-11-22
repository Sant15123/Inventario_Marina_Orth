/**
 * Constantes Oficiales de Proyectos STEAM — SIGA-FMO
 * Fundación Marina Orth
 *
 * Fuente única de verdad para la vinculación de solicitudes, préstamos,
 * evaluaciones de coordinación y movimientos de inventario.
 */

export const PROYECTOS_STEAM_OFICIALES = [
  {
    id: '6e097034-24ad-4353-a35a-6dfc2fa6d7b6',
    nombre: 'Aulas Conectadas STEAM',
    sede_municipio: 'El Carmen',
    descripcion: 'Dotación tecnológica e innovación educativa en sedes rurales',
    programa: 'Nuevas Tecnologías',
  },
  {
    id: 'd93bd1ab-ce93-4561-808e-996596fc34bd',
    nombre: 'Clubes de Innovación y Electrónica',
    sede_municipio: 'La Ceja',
    descripcion: 'Talleres prácticos de impresión 3D, sensores y electrónica básica',
    programa: 'Robótica',
  },
  {
    id: 'ffdb7a00-afb8-4d0c-ab82-3c27108a558a',
    nombre: 'Semilleros de Robótica Educativa',
    sede_municipio: 'Medellín',
    descripcion: 'Formación STEAM en programación y robótica para estudiantes',
    programa: 'Robótica',
  },
  {
    id: '1d431933-760d-469f-9024-a8b3bbce25f1',
    nombre: 'Siembra de colores',
    sede_municipio: 'Medellín',
    descripcion: 'Formación en habilidades socioemocionales y expresión artística',
    programa: 'Socioemocional',
  },
];

/**
 * Retorna la etiqueta amigable con la sede entre paréntesis si aplica.
 * Ej: "Aulas Conectadas STEAM (El Carmen)"
 */
export function formatProyectoLabel(proyecto) {
  if (!proyecto) return '';
  if (typeof proyecto === 'string') return proyecto;
  const nombre = proyecto.nombre || proyecto.label || proyecto.name || '';
  const sede = proyecto.sede_municipio || proyecto.sede || proyecto.municipio || '';
  return sede && !nombre.includes(`(${sede})`) ? `${nombre} (${sede})` : nombre;
}

/**
 * Mapa de alias históricos para garantizar retrocompatibilidad con
 * registros antiguos guardados en localStorage o bases de datos previas.
 */
const ALIAS_HISTORICOS = {
  'clubes de robótica': 'Semilleros de Robótica Educativa',
  'clubes de robotica': 'Semilleros de Robótica Educativa',
  'semillero steam': 'Semilleros de Robótica Educativa',
  'semilleros steam': 'Semilleros de Robótica Educativa',
  'semillero de robótica': 'Semilleros de Robótica Educativa',
  'semillero de robotica': 'Semilleros de Robótica Educativa',
  'ratón de biblioteca': 'Aulas Conectadas STEAM',
  'raton de biblioteca': 'Aulas Conectadas STEAM',
  'aulas conectadas': 'Aulas Conectadas STEAM',
  'siembra de colores': 'Siembra de colores',
  'clubes de innovación': 'Clubes de Innovación y Electrónica',
  'clubes de innovacion': 'Clubes de Innovación y Electrónica',
  'clubes de innovación y electrónica': 'Clubes de Innovación y Electrónica',
  'clubes de innovacion y electronica': 'Clubes de Innovación y Electrónica',
};

/**
 * Normaliza un nombre o id de proyecto al nombre canónico oficial.
 */
export function normalizeProyectoNombre(valor) {
  if (!valor) return '';
  const str = String(valor).trim();

  // 1. Si coincide con un ID oficial
  const porId = PROYECTOS_STEAM_OFICIALES.find((p) => p.id === str);
  if (porId) return porId.nombre;

  // 2. Extraer nombre limpio si viene con sede tipo "Nombre (Sede)"
  const cleanStr = str.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // 3. Coincidencia directa con nombres oficiales
  const matchExacto = PROYECTOS_STEAM_OFICIALES.find(
    (p) => p.nombre.toLowerCase() === str.toLowerCase() || p.nombre.toLowerCase() === cleanStr.toLowerCase()
  );
  if (matchExacto) return matchExacto.nombre;

  // 4. Coincidencia con alias históricos
  const aliasMatch = ALIAS_HISTORICOS[cleanStr.toLowerCase()] || ALIAS_HISTORICOS[str.toLowerCase()];
  if (aliasMatch) return aliasMatch;

  return str;
}

/**
 * Retorna el Programa FMO oficial asociado a un proyecto STEAM.
 */
export function getProyectoPrograma(valor) {
  if (!valor) return 'Robótica';
  const str = String(valor).trim();
  const proy = PROYECTOS_STEAM_OFICIALES.find(
    (p) => p.id === str || p.nombre.toLowerCase() === str.toLowerCase()
  );
  if (proy?.programa) return proy.programa;
  const lower = str.toLowerCase();
  if (lower.includes('robot')) return 'Robótica';
  if (lower.includes('conectad') || lower.includes('tecnolog') || lower.includes('electron')) return 'Nuevas Tecnologías';
  if (lower.includes('siembra') || lower.includes('color') || lower.includes('socio') || lower.includes('emocion')) return 'Socioemocional';
  if (lower.includes('teach') || lower.includes('lectur') || lower.includes('papel') || lower.includes('raton')) return 'TeachLabs';
  if (lower.includes('ingl') || lower.includes('english')) return 'Inglés';
  return 'Robótica';
}
