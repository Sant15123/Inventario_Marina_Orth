-- Migración: Habilitar RLS y políticas permisivas para proyectos_steam
-- Fundación Marina Orth (SIGA-FMO)

ALTER TABLE public.proyectos_steam ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyectos_steam' AND policyname = 'proyectos_steam_select_all') THEN
    CREATE POLICY "proyectos_steam_select_all" ON public.proyectos_steam FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyectos_steam' AND policyname = 'proyectos_steam_insert_all') THEN
    CREATE POLICY "proyectos_steam_insert_all" ON public.proyectos_steam FOR INSERT TO public WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proyectos_steam' AND policyname = 'proyectos_steam_update_all') THEN
    CREATE POLICY "proyectos_steam_update_all" ON public.proyectos_steam FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END
$$;
