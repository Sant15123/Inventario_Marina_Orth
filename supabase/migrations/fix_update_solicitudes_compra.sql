-- Migration: Soporte completo y persistencia real para Gestión de Compras SIGA-FMO
-- Agrega columnas necesarias para evaluación técnica, orden de compra y trazabilidad

ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS solicitante_nombre text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS solicitante_documento text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS solicitante_correo text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS solicitante_telefono text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS sede_destino text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proyecto_steam text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proyecto_steam_id text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS radicado text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS evaluado_por text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS fecha_evaluacion timestamptz;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS observaciones_coordinador text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS valor_estimado_compra numeric DEFAULT 0;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS valor_final_compra numeric DEFAULT 0;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS cantidad_aprobada integer DEFAULT 1;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proveedor text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS numero_factura_orden text;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS fecha_compra date;
ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS observaciones_compra text;

-- Asegurar políticas permisivas de UPDATE, INSERT y SELECT para anon y authenticated
DO $$
BEGIN
  DROP POLICY IF EXISTS "solicitudes_compra_update_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_update_all" ON public.solicitudes_compra
    FOR UPDATE TO public USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "solicitudes_compra_select_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_select_all" ON public.solicitudes_compra
    FOR SELECT TO public USING (true);

  DROP POLICY IF EXISTS "solicitudes_compra_insert_all" ON public.solicitudes_compra;
  CREATE POLICY "solicitudes_compra_insert_all" ON public.solicitudes_compra
    FOR INSERT TO public WITH CHECK (true);
END $$;
