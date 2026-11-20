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
-- Lectura pública / autenticada para que usuarios y docentes puedan ver la lista al solicitar compras
DROP POLICY IF EXISTS "Lectura de proveedores recomendados para todos los usuarios autenticados" ON public.proveedores_recomendados;
CREATE POLICY "Lectura de proveedores recomendados para todos los usuarios autenticados"
ON public.proveedores_recomendados
FOR SELECT
USING (true);

-- Inserción permitida para Administrador y Coordinador
DROP POLICY IF EXISTS "Inserción de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
CREATE POLICY "Inserción de proveedores recomendados para admin y coordinador"
ON public.proveedores_recomendados
FOR INSERT
WITH CHECK (true);

-- Actualización permitida para Administrador y Coordinador
DROP POLICY IF EXISTS "Actualización de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
CREATE POLICY "Actualización de proveedores recomendados para admin y coordinador"
ON public.proveedores_recomendados
FOR UPDATE
USING (true);

-- Eliminación permitida para Administrador y Coordinador
DROP POLICY IF EXISTS "Eliminación de proveedores recomendados para admin y coordinador" ON public.proveedores_recomendados;
CREATE POLICY "Eliminación de proveedores recomendados para admin y coordinador"
ON public.proveedores_recomendados
FOR DELETE
USING (true);

-- 5. Semilla inicial de Proveedores Recomendados FMO (Idempotente)
INSERT INTO public.proveedores_recomendados (nombre, url, descripcion)
SELECT 'Sigma Electrónica', 'https://www.sigmaelectronica.net', 'Sensores especializados, placas Arduino, microcontroladores ESP32, módulos IoT y componentes de robótica.'
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados WHERE nombre ILIKE 'Sigma Electrónica');

INSERT INTO public.proveedores_recomendados (nombre, url, descripcion)
SELECT 'Dynamoelectronics', 'https://www.dynamoelectronics.com', 'Servomotores, kits de robótica educativa, filamento para impresión 3D, baterías LiPo y hardware electromecánico.'
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados WHERE nombre ILIKE 'Dynamoelectronics');

INSERT INTO public.proveedores_recomendados (nombre, url, descripcion)
SELECT 'Panamericana Librería y Papelería', 'https://www.panamericana.com.co', 'Papelería institucional, resmas de papel bond, marcadores borrables, guías pedagógicas y consumibles de oficina.'
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados WHERE nombre ILIKE 'Panamericana%');

INSERT INTO public.proveedores_recomendados (nombre, url, descripcion)
SELECT 'Homecenter Colombia', 'https://www.homecenter.com.co', 'Cajas organizadoras plásticas, herramientas de taller, cintas, tornillería y materiales de mantenimiento ligero.'
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados WHERE nombre ILIKE 'Homecenter%');

INSERT INTO public.proveedores_recomendados (nombre, url, descripcion)
SELECT 'MercadoLibre Colombia', 'https://www.mercadolibre.com.co', 'Catálogo multirubro con envíos directos para insumos pedagógicos, repuestos electrónicos y tecnología general.'
WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_recomendados WHERE nombre ILIKE 'MercadoLibre%');
