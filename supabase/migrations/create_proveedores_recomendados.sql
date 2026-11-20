-- =============================================================================
-- MIGRACIÓN OFICIAL SIGA-FMO: TABLA DE PROVEEDORES RECOMENDADOS
-- Fundación Marina Orth - Sistema Integrado de Gestión de Activos (SIGA-FMO)
-- =============================================================================

-- 1. Crear tabla proveedores_recomendados si no existe
CREATE TABLE IF NOT EXISTS public.proveedores_recomendados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    url TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para acelerar búsquedas
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON public.proveedores_recomendados(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_created_at ON public.proveedores_recomendados(created_at DESC);

-- 3. Habilitar Seguridad a Nivel de Filas (RLS)
ALTER TABLE public.proveedores_recomendados ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad (RLS)
-- Permitir lectura pública y autenticada (para que docentes y coordinadores consulten el catálogo)
DROP POLICY IF EXISTS "Lectura de proveedores recomendados para todos los usuarios autenticados" ON public.proveedores_recomendados;
DROP POLICY IF EXISTS "proveedores_recomendados_select_all" ON public.proveedores_recomendados;
CREATE POLICY "proveedores_recomendados_select_all"
ON public.proveedores_recomendados
FOR SELECT
TO anon, authenticated
USING (true);

-- Inserción permitida
DROP POLICY IF EXISTS "Inserción de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
DROP POLICY IF EXISTS "proveedores_recomendados_insert_all" ON public.proveedores_recomendados;
CREATE POLICY "proveedores_recomendados_insert_all"
ON public.proveedores_recomendados
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Actualización permitida
DROP POLICY IF EXISTS "Actualización de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
DROP POLICY IF EXISTS "proveedores_recomendados_update_all" ON public.proveedores_recomendados;
CREATE POLICY "proveedores_recomendados_update_all"
ON public.proveedores_recomendados
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Eliminación permitida
DROP POLICY IF EXISTS "Eliminación de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
DROP POLICY IF EXISTS "proveedores_recomendados_delete_all" ON public.proveedores_recomendados;
CREATE POLICY "proveedores_recomendados_delete_all"
ON public.proveedores_recomendados
FOR DELETE
TO anon, authenticated
USING (true);

-- 5. Semilla inicial opcional (solo se inserta si la tabla está completamente vacía)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados LIMIT 1) THEN
        INSERT INTO public.proveedores_recomendados (nombre, url, descripcion) VALUES
        ('Sigma Electrónica', 'https://www.sigmaelectronica.net', 'Sensores especializados, placas Arduino, microcontroladores ESP32, módulos IoT y componentes de robótica.'),
        ('Dynamoelectronics', 'https://www.dynamoelectronics.com', 'Servomotores, kits de robótica educativa, filamento para impresión 3D, baterías LiPo y hardware electromecánico.'),
        ('Panamericana Librería y Papelería', 'https://www.panamericana.com.co', 'Papelería institucional, resmas de papel bond, marcadores borrables, guías pedagógicas y consumibles de oficina.'),
        ('Homecenter Colombia', 'https://www.homecenter.com.co', 'Cajas organizadoras plásticas, herramientas de taller, cintas, tornillería y materiales de mantenimiento ligero.'),
        ('MercadoLibre Colombia', 'https://www.mercadolibre.com.co', 'Catálogo multirubro con envíos directos para insumos pedagógicos, repuestos electrónicos y tecnología general.');
    END IF;
END $$;
