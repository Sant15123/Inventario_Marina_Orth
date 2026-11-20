-- =============================================================================
-- MIGRACIÓN OFICIAL SIGA-FMO: ROL COORDINADOR Y FLUJO DE GESTIÓN DE COMPRAS
-- Fundación Marina Orth - Sistema Integrado de Gestión de Activos (SIGA-FMO)
-- =============================================================================

-- 1. Actualizar restricción CHECK en tabla de usuarios para aceptar el rol 'coordinador'
DO $$
BEGIN
    -- Intentar actualizar el check en public.usuarios si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usuarios'
    ) THEN
        ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
        ALTER TABLE public.usuarios 
            ADD CONSTRAINT usuarios_rol_check 
            CHECK (LOWER(rol) IN ('administrador', 'supervisor', 'operador', 'usuario', 'coordinador'));
    END IF;

    -- Intentar actualizar el check en public.perfiles si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'perfiles'
    ) THEN
        ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
        ALTER TABLE public.perfiles 
            ADD CONSTRAINT perfiles_rol_check 
            CHECK (LOWER(rol) IN ('administrador', 'supervisor', 'operador', 'usuario', 'coordinador'));
    END IF;
END $$;

-- 2. Asegurar estructura completa de la tabla 'solicitudes_compra'
CREATE TABLE IF NOT EXISTS public.solicitudes_compra (
    id BIGSERIAL PRIMARY KEY,
    usuario_id VARCHAR(100),
    usuario_nombre VARCHAR(255) NOT NULL,
    sede VARCHAR(100) DEFAULT 'Medellín',
    categoria_destino VARCHAR(100) DEFAULT 'consumibles',
    nombre_producto VARCHAR(255) NOT NULL,
    url_compra TEXT,
    cantidad INT DEFAULT 1,
    precio_estimado NUMERIC(14, 2) DEFAULT 0,
    fecha_requerida DATE,
    justificacion TEXT NOT NULL,
    prioridad VARCHAR(50) DEFAULT 'Media',
    estado VARCHAR(50) DEFAULT 'Pendiente',
    ingresado_inventario BOOLEAN DEFAULT FALSE,
    item_inventario_id VARCHAR(100),
    observaciones_admin TEXT,
    
    -- Campos del Flujo de Coordinación y Aprobación
    proyecto_steam VARCHAR(150),
    proyecto_steam_id VARCHAR(150),
    sede_destino VARCHAR(100),
    cantidad_aprobada INT,
    valor_estimado_compra NUMERIC(14, 2),
    evaluado_por VARCHAR(255),
    evaluado_por_id VARCHAR(100),
    fecha_evaluacion TIMESTAMP WITH TIME ZONE,
    observaciones_coordinador TEXT,
    
    -- Campos de Adquisición y Compra Realizada
    proveedor VARCHAR(255),
    numero_factura_orden VARCHAR(150),
    fecha_compra DATE,
    valor_total_compra NUMERIC(14, 2),
    items JSONB,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Si la tabla ya existía, añadir columnas faltantes de manera idempotente
DO $$
BEGIN
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proyecto_steam VARCHAR(150);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proyecto_steam_id VARCHAR(150);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS sede_destino VARCHAR(100);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS cantidad_aprobada INT;
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS valor_estimado_compra NUMERIC(14, 2);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS evaluado_por VARCHAR(255);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS evaluado_por_id VARCHAR(100);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS fecha_evaluacion TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS observaciones_coordinador TEXT;
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS proveedor VARCHAR(255);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS numero_factura_orden VARCHAR(150);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS fecha_compra DATE;
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS valor_total_compra NUMERIC(14, 2);
    ALTER TABLE public.solicitudes_compra ADD COLUMN IF NOT EXISTS items JSONB;
END $$;

-- 4. Índices de aceleración para el flujo de compras
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_estado ON public.solicitudes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_usuario ON public.solicitudes_compra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_sede ON public.solicitudes_compra(sede);
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_proyecto ON public.solicitudes_compra(proyecto_steam);
CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_creado ON public.solicitudes_compra(creado_en DESC);

-- 5. Habilitar Seguridad a Nivel de Filas (RLS)
ALTER TABLE public.solicitudes_compra ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de acceso (Permitir lectura y gestión para usuarios autenticados)
DROP POLICY IF EXISTS "Lectura de solicitudes de compra" ON public.solicitudes_compra;
CREATE POLICY "Lectura de solicitudes de compra"
ON public.solicitudes_compra
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Inserción de solicitudes de compra" ON public.solicitudes_compra;
CREATE POLICY "Inserción de solicitudes de compra"
ON public.solicitudes_compra
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Actualización de solicitudes de compra" ON public.solicitudes_compra;
CREATE POLICY "Actualización de solicitudes de compra"
ON public.solicitudes_compra
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Eliminación de solicitudes de compra" ON public.solicitudes_compra;
CREATE POLICY "Eliminación de solicitudes de compra"
ON public.solicitudes_compra
FOR DELETE
USING (true);
