-- =========================================================================
-- MIGRACIÓN DE HOTFIX: SIGA-FMO
-- 1. Elimina recursión infinita en RLS de perfiles/usuarios (Error 500)
-- 2. Crea tabla dedicada equipos_electronica y habilita RLS (Error 404)
-- =========================================================================

-- 1. FUNCIÓN SECURITY DEFINER PARA CONSULTAR ROL SIN RECURSIÓN RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(rol, 'usuario')) FROM public.perfiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. LIMPIEZA DE POLÍTICAS RECURSIVAS EN perfiles
DROP POLICY IF EXISTS "admin_all_perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "staff_select_perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "user_own_perfil" ON public.perfiles;
DROP POLICY IF EXISTS "user_update_own_perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Permitir lectura perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Permitir inserción perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Permitir actualización perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_delete_all" ON public.perfiles;

-- 3. POLÍTICAS LIMPIAS Y NO RECURSIVAS EN perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfiles_select_all" ON public.perfiles
  FOR SELECT TO public
  USING (true);

CREATE POLICY "perfiles_insert_all" ON public.perfiles
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "perfiles_update_all" ON public.perfiles
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "perfiles_delete_all" ON public.perfiles
  FOR DELETE TO public
  USING (true);

-- 4. VISTA COMPATIBLE usuarios SOBRE perfiles Y equipos SOBRE activos
CREATE OR REPLACE VIEW public.usuarios AS
SELECT
  id,
  documento,
  nombre_completo,
  telefono,
  email,
  rol,
  activo,
  sede,
  created_at,
  updated_at,
  cargo,
  password,
  avatar_url
FROM public.perfiles;

CREATE OR REPLACE VIEW public.equipos AS
SELECT * FROM public.activos;

-- 5. TABLA DEDICADA equipos_electronica
CREATE TABLE IF NOT EXISTS public.equipos_electronica (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  placa varchar NOT NULL UNIQUE,
  nombre varchar NOT NULL,
  subcategoria varchar DEFAULT 'Instrumentación',
  marca varchar DEFAULT '',
  modelo varchar DEFAULT '',
  serial varchar DEFAULT '',
  cantidad integer DEFAULT 1,
  condicion varchar DEFAULT 'Bueno',
  estado varchar DEFAULT 'Disponible',
  area_asignada varchar DEFAULT 'Robótica',
  sede varchar DEFAULT 'Medellín',
  ubicacion varchar DEFAULT 'Laboratorio de Robótica',
  responsable varchar,
  fecha_adquisicion date DEFAULT CURRENT_DATE,
  valor_estimado numeric DEFAULT 0,
  observaciones text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. POLÍTICAS RLS PARA equipos_electronica
ALTER TABLE public.equipos_electronica ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "equipos_electronica_select_all" ON public.equipos_electronica;
  CREATE POLICY "equipos_electronica_select_all" ON public.equipos_electronica
    FOR SELECT TO public USING (true);

  DROP POLICY IF EXISTS "equipos_electronica_insert_all" ON public.equipos_electronica;
  CREATE POLICY "equipos_electronica_insert_all" ON public.equipos_electronica
    FOR INSERT TO public WITH CHECK (true);

  DROP POLICY IF EXISTS "equipos_electronica_update_all" ON public.equipos_electronica;
  CREATE POLICY "equipos_electronica_update_all" ON public.equipos_electronica
    FOR UPDATE TO public USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "equipos_electronica_delete_all" ON public.equipos_electronica;
  CREATE POLICY "equipos_electronica_delete_all" ON public.equipos_electronica
    FOR DELETE TO public USING (true);
END $$;

-- 7. SEMILLA OFICIAL DE EQUIPOS DE ELECTRÓNICA
INSERT INTO public.equipos_electronica (
  placa, nombre, subcategoria, marca, modelo, serial, cantidad, condicion, estado, area_asignada, sede, ubicacion, fecha_adquisicion, valor_estimado, observaciones
)
VALUES
  ('ELE-FMO-001', 'Multímetro Digital Automotriz True RMS', 'Instrumentación', 'Uni-T', 'UT61E+', 'UT2026-001', 1, 'Excelente / Nuevo', 'Disponible', 'Robótica', 'Medellín', 'Taller de Electrónica - Estante A1', '2026-01-15', 380000, 'Equipo de alta precisión para talleres STEAM y medición de circuitos.'),
  ('ELE-FMO-002', 'Estación de Soldadura y Cautín Digital 60W', 'Herramienta Electrónica', 'Yihua', '936B', 'YH-936-042', 1, 'Bueno', 'Disponible', 'Robótica', 'Medellín', 'Mesa de Trabajo 3', '2026-02-01', 240000, 'Control térmico ESD Safe con soporte y esponja limpiadora.'),
  ('ELE-FMO-003', 'Fuente de Poder Regulable DC 30V 10A', 'Instrumentación', 'Wanptek', 'DPS3010U', 'WP-3010-88', 1, 'Bueno', 'Disponible', 'Robótica', 'Medellín', 'Laboratorio de Robótica', '2026-02-10', 450000, 'Display digital de 4 dígitos con protección contra sobrecorriente.'),
  ('ELE-FMO-004', 'Osciloscopio Digital Portátil 100MHz 2CH', 'Instrumentación', 'Hantek', 'DSO2D10', 'HT-2D10-15', 1, 'Bueno', 'Disponible', 'Robótica', 'El Carmen de Viboral', 'Laboratorio STEAM Sede Carmen', '2026-01-20', 1250000, 'Incluye 2 sondas x1/x10 y generador de funciones integrado.'),
  ('ELE-FMO-005', 'Kit Educativo Arduino UNO R3 Reutilizable', 'Placas de Desarrollo', 'Arduino', 'UNO R3 Oficial', 'ARD-UNO-501', 1, 'Excelente / Nuevo', 'Disponible', 'Robótica', 'San Jerónimo', 'Maletín STEAM #4', '2026-02-15', 120000, 'Placa con cable USB y microcontrolador ATmega328P para talleres.')
ON CONFLICT (placa) DO NOTHING;
