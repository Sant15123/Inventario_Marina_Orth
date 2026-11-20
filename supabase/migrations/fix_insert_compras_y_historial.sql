-- =========================================================================
-- MIGRACIÓN DE HOTFIX: SIGA-FMO
-- 1. Permite inserción de solicitudes_compra sin fallos de tipo ni columnas
-- 2. Habilita políticas RLS en historial_movimientos para auditoría de usuarios
-- =========================================================================

-- 1. SOLICITUDES_COMPRA: Adecuación de columnas y tipos tolerantes
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS cantidad_solicitada integer DEFAULT 1;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS categoria text;

-- Permitir usuario_id como text para evitar errores 22P02 cuando se envía un documento o ID no-UUID
ALTER TABLE public.solicitudes_compra ALTER COLUMN usuario_id TYPE text USING usuario_id::text;

-- Eliminar restricciones CHECK en categoria o estado para aceptar tanto slugs como nombres institucionales
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.solicitudes_compra'::regclass 
      AND contype = 'c' 
      AND (conname LIKE '%categoria%' OR conname LIKE '%estado%')
  ) LOOP
    EXECUTE 'ALTER TABLE public.solicitudes_compra DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Asegurar políticas RLS permisivas en solicitudes_compra para usuarios autenticados y anon (Rol Usuario/Docente)
ALTER TABLE public.solicitudes_compra ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "solicitudes_compra_insert_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_insert_all" ON public.solicitudes_compra
    FOR INSERT TO public WITH CHECK (true);

  DROP POLICY IF EXISTS "solicitudes_compra_select_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_select_all" ON public.solicitudes_compra
    FOR SELECT TO public USING (true);

  DROP POLICY IF EXISTS "solicitudes_compra_update_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_update_all" ON public.solicitudes_compra
    FOR UPDATE TO public USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "solicitudes_compra_delete_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_delete_all" ON public.solicitudes_compra
    FOR DELETE TO public USING (true);
END $$;

-- 2. HISTORIAL_MOVIMIENTOS: Políticas RLS para inserción por usuarios autenticados / anon (Usuario, Coordinador, etc.)
ALTER TABLE public.historial_movimientos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "historial_movimientos_insert_all" ON public.historial_movimientos;
  CREATE POLICY "historial_movimientos_insert_all" ON public.historial_movimientos
    FOR INSERT TO public WITH CHECK (true);

  DROP POLICY IF EXISTS "historial_movimientos_select_all" ON public.historial_movimientos;
  CREATE POLICY "historial_movimientos_select_all" ON public.historial_movimientos
    FOR SELECT TO public USING (true);

  DROP POLICY IF EXISTS "historial_movimientos_update_all" ON public.historial_movimientos;
  CREATE POLICY "historial_movimientos_update_all" ON public.historial_movimientos
    FOR UPDATE TO public USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "historial_movimientos_delete_all" ON public.historial_movimientos;
  CREATE POLICY "historial_movimientos_delete_all" ON public.historial_movimientos
    FOR DELETE TO public USING (true);
END $$;
