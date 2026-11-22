-- Migración: Agregar columna programa a proyectos_steam
-- Fundación Marina Orth (SIGA-FMO)

ALTER TABLE public.proyectos_steam
ADD COLUMN IF NOT EXISTS programa text DEFAULT 'Robótica';

-- Actualizar registros existentes con sus programas correspondientes
UPDATE public.proyectos_steam
SET programa = 'Nuevas Tecnologías'
WHERE nombre ILIKE '%Aulas Conectadas%' AND (programa IS NULL OR programa = 'Robótica');

UPDATE public.proyectos_steam
SET programa = 'Socioemocional'
WHERE nombre ILIKE '%Siembra de colores%' AND (programa IS NULL OR programa = 'Robótica');

UPDATE public.proyectos_steam
SET programa = 'Robótica'
WHERE programa IS NULL;
