/**
 * Asignación cromática y utilidades de marca oficial - Fundación Marina Orth v1.0
 * Define la paleta estricta por programa e iconografía institucional:
 * 1. Robótica / Consumibles: #0A3C63 (Azul Oscuro Robótica)
 * 2. Nuevas Tecnologías / Equipos Retornables: #2CACD0 (Azul Claro)
 * 3. TeachLabs / Papelería Pedagógica: #7b2cbf (Morado TeachLabs)
 * 4. Inglés: #E0321C (Rojo Inglés)
 * 5. Habilidades Socioemocionales / Siembra de Colores: #F4C400 (Amarillo)
 * 6. Becas / Institucional General: #abd037 (Verde FMO)
 */

export const FMO_COLORS = {
  robotica: '#0A3C63',
  tecnologia: '#2CACD0',
  teachlabs: '#7b2cbf',
  ingles: '#E0321C',
  socioemocional: '#F4C400',
  institucional: '#abd037',
  azulComplementario: '#013a52',
  grisInstitucional: '#6d6e71',
};

// Retorna las clases de badge para una categoría dada
export function getCategoryBadgeClass(categoria) {
  const cat = String(categoria || '').toLowerCase();
  if (cat.includes('robot') || cat.includes('consumib')) {
    return 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 font-bold dark:bg-[#0A3C63]/30 dark:text-[#93c5fd] dark:border-[#93c5fd]/30';
  }
  if (cat.includes('papel') || cat.includes('teach')) {
    return 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 font-bold dark:bg-[#7b2cbf]/25 dark:text-[#c084fc] dark:border-[#c084fc]/30';
  }
  if (cat.includes('equipo') || cat.includes('comput') || cat.includes('tecnol') || cat.includes('retornable')) {
    return 'bg-[#2CACD0]/15 text-[#013a52] border border-[#2CACD0]/40 font-bold dark:bg-[#2CACD0]/25 dark:text-[#2CACD0] dark:border-[#2CACD0]/50';
  }
  if (cat.includes('ingl') || cat.includes('english')) {
    return 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 font-bold dark:bg-[#E0321C]/25 dark:text-[#fca5a5] dark:border-[#fca5a5]/30';
  }
  if (cat.includes('socio') || cat.includes('vida') || cat.includes('colores')) {
    return 'bg-[#F4C400]/20 text-[#013a52] border border-[#F4C400] font-bold dark:bg-[#F4C400]/25 dark:text-[#fde047] dark:border-[#F4C400]/50';
  }
  // Becas / General / Fallback
  return 'bg-[#abd037]/15 text-[#013a52] border border-[#abd037]/35 font-bold dark:bg-[#abd037]/25 dark:text-[#abd037] dark:border-[#abd037]/50';
}

// Retorna las clases de badge para un proyecto STEAM
export function getProyectoBadgeClass(proyecto) {
  const p = String(proyecto || '').toLowerCase();
  if (p.includes('robot') || p.includes('clubes')) {
    return 'bg-[#0A3C63]/10 text-[#0A3C63] border border-[#0A3C63]/25 font-bold dark:bg-[#0A3C63]/30 dark:text-[#93c5fd]';
  }
  if (p.includes('semillero') || p.includes('steam') || p.includes('tecnol')) {
    return 'bg-[#2CACD0]/15 text-[#013a52] border border-[#2CACD0]/40 font-bold dark:bg-[#2CACD0]/25 dark:text-[#2CACD0]';
  }
  if (p.includes('raton') || p.includes('biblioteca') || p.includes('teach') || p.includes('lectura')) {
    return 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 font-bold dark:bg-[#7b2cbf]/25 dark:text-[#c084fc]';
  }
  if (p.includes('ingl') || p.includes('english')) {
    return 'bg-[#E0321C]/10 text-[#E0321C] border border-[#E0321C]/25 font-bold dark:bg-[#E0321C]/25 dark:text-[#fca5a5]';
  }
  if (p.includes('colores') || p.includes('siembra') || p.includes('socio') || p.includes('vida')) {
    return 'bg-[#F4C400]/20 text-[#013a52] border border-[#F4C400] font-bold dark:bg-[#F4C400]/25 dark:text-[#fde047]';
  }
  return 'bg-[#abd037]/15 text-[#013a52] border border-[#abd037]/35 font-bold dark:bg-[#abd037]/25 dark:text-[#abd037]';
}

// Retorna las clases para un contenedor de icono de programa (sólido con icono BLANCO)
export function getProgramIconContainerClass(programa) {
  const p = String(programa || '').toLowerCase();
  if (p.includes('robot') || p.includes('consumib')) {
    return 'bg-[#0A3C63] text-white flex items-center justify-center rounded-xl shadow-sm';
  }
  if (p.includes('equipo') || p.includes('tecnol') || p.includes('retornable')) {
    return 'bg-[#2CACD0] text-white flex items-center justify-center rounded-xl shadow-sm';
  }
  if (p.includes('papel') || p.includes('teach')) {
    return 'bg-[#7b2cbf] text-white flex items-center justify-center rounded-xl shadow-sm';
  }
  if (p.includes('ingl') || p.includes('english')) {
    return 'bg-[#E0321C] text-white flex items-center justify-center rounded-xl shadow-sm';
  }
  if (p.includes('socio') || p.includes('vida') || p.includes('colores')) {
    return 'bg-[#F4C400] text-white flex items-center justify-center rounded-xl shadow-sm';
  }
  return 'bg-[#abd037] text-[#013a52] flex items-center justify-center rounded-xl shadow-sm';
}

