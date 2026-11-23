-- Migración: Habilitar RLS y políticas para tabla sedes
-- Fundación Marina Orth (SIGA-FMO)

ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sedes' AND policyname = 'sedes_select_all') THEN
    CREATE POLICY "sedes_select_all" ON public.sedes FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sedes' AND policyname = 'sedes_insert_all') THEN
    CREATE POLICY "sedes_insert_all" ON public.sedes FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sedes' AND policyname = 'sedes_update_all') THEN
    CREATE POLICY "sedes_update_all" ON public.sedes FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END
$$;
