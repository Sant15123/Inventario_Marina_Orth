-- =========================================================================
-- MIGRACIÓN DE HOTFIX: ACTUALIZACIÓN DE CATEGORÍAS EN SOLICITUDES_COMPRA
-- Fundación Marina Orth - SIGA-FMO
-- =========================================================================
-- Este script garantiza que solicitudes_compra acepte plenamente:
-- 1. 'Consumibles de Robótica' / 'consumibles'
-- 2. 'Equipos de Electrónica' / 'electronica'
-- 3. 'Papelería' / 'papeleria'
-- sin que ningún CHECK constraint bloquee la inserción de solicitudes.
-- =========================================================================

-- 1. Asegurar existencia de columnas necesarias con tipo de datos text
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS categoria_destino text DEFAULT 'consumibles';
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'consumibles';
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS cantidad_solicitada integer DEFAULT 1;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS creado_en timestamptz DEFAULT now();
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Eliminar cualquier restricción CHECK previa en categoria o categoria_destino
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.solicitudes_compra'::regclass 
      AND contype = 'c' 
      AND (conname LIKE '%categoria%' OR conname LIKE '%destino%')
  ) LOOP
    EXECUTE 'ALTER TABLE public.solicitudes_compra DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 3. Crear restricción CHECK tolerante para categoria_destino
ALTER TABLE public.solicitudes_compra 
  ADD CONSTRAINT solicitudes_compra_categoria_destino_check 
  CHECK (
    categoria_destino IS NULL OR 
    categoria_destino IN (
      'consumibles', 'electronica', 'papeleria',
      'Consumibles de Robótica', 'Equipos de Electrónica', 'Papelería',
      'Robótica', 'Electrónica'
    )
  );

-- 4. Crear restricción CHECK tolerante para categoria
ALTER TABLE public.solicitudes_compra 
  ADD CONSTRAINT solicitudes_compra_categoria_check 
  CHECK (
    categoria IS NULL OR 
    categoria IN (
      'consumibles', 'electronica', 'papeleria',
      'Consumibles de Robótica', 'Equipos de Electrónica', 'Papelería',
      'Robótica', 'Electrónica'
    )
  );

-- 5. Crear índices para optimizar la campana de notificaciones y la bandeja de compras
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_estado_creado 
  ON public.solicitudes_compra (estado, creado_en DESC);

-- 6. Reafirmar permisos RLS para usuarios de la aplicación
ALTER TABLE public.solicitudes_compra ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "solicitudes_compra_all_ops" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_all_ops" ON public.solicitudes_compra
    FOR ALL TO public USING (true) WITH CHECK (true);
END $$;
