-- =============================================================================
-- MIGRACIÓN OFICIAL SIGA-FMO: ASIGNACIÓN DE PROYECTOS STEAM A COORDINADORES
-- Fundación Marina Orth - Sistema Integrado de Gestión de Activos (SIGA-FMO)
-- Archivo: supabase/migrations/add_proyectos_asignados_coordinador.sql
-- =============================================================================

-- 1. Agregar columna 'proyectos_asignados' en la tabla física oficial 'perfiles'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'perfiles'
    ) THEN
        ALTER TABLE public.perfiles 
            ADD COLUMN IF NOT EXISTS proyectos_asignados text[] DEFAULT '{}';
            
        COMMENT ON COLUMN public.perfiles.proyectos_asignados IS 
            'Lista de nombres canónicos o identificadores de Proyectos STEAM asignados al Coordinador';
    END IF;

    -- Si 'usuarios' es una tabla física en algún ambiente
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usuarios' AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.usuarios 
            ADD COLUMN IF NOT EXISTS proyectos_asignados text[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Crear índice GIN para optimizar consultas de arrays en 'proyectos_asignados'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name = 'proyectos_asignados'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_perfiles_proyectos_asignados 
            ON public.perfiles USING GIN (proyectos_asignados);
    END IF;
END $$;

-- 3. Función auxiliar de seguridad (SECURITY DEFINER) para obtener proyectos del coordinador
-- Evita recursión infinita en políticas RLS sobre solicitudes_compra
CREATE OR REPLACE FUNCTION public.get_coordinador_proyectos(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_proyectos text[];
BEGIN
    SELECT proyectos_asignados INTO v_proyectos
    FROM public.perfiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_proyectos, ARRAY[]::text[]);
END;
$$;

-- Otorgar permisos de ejecución para roles autenticados y de servicio
GRANT EXECUTE ON FUNCTION public.get_coordinador_proyectos(uuid) TO authenticated, service_role, anon;

-- 4. Asignar proyectos por defecto a coordinadores existentes de prueba (opcional)
UPDATE public.perfiles
SET proyectos_asignados = ARRAY['Clubes de Innovación y Electrónica', 'Semilleros de Robótica Educativa']::text[]
WHERE LOWER(rol) = 'coordinador' 
  AND (proyectos_asignados IS NULL OR cardinality(proyectos_asignados) = 0);

-- Fin de migración add_proyectos_asignados_coordinador.sql
