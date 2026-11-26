-- Habilitar Supabase Realtime y verificar políticas SELECT para solicitudes de Usuario
ALTER TABLE IF EXISTS public.solicitudes_inventario REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.solicitudes_compra REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.prestamos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'solicitudes_inventario')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solicitudes_inventario'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_inventario;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'solicitudes_compra')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solicitudes_compra'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_compra;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prestamos')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prestamos'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prestamos;
  END IF;
END $$;

-- Asegurar lectura SELECT al usuario dueño en solicitudes_inventario
ALTER TABLE IF EXISTS public.solicitudes_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solicitudes_inventario_select_policy" ON public.solicitudes_inventario;
CREATE POLICY "solicitudes_inventario_select_policy"
ON public.solicitudes_inventario
FOR SELECT
TO public
USING (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor', 'operador')
  OR (
    public.get_my_role() IN ('usuario', 'coordinador')
    AND usuario_id::text = auth.uid()::text
  )
);
