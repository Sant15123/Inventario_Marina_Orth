-- =========================================================================
-- MIGRACIÓN: Actualización de Subcategorías en Consumibles de Robótica
-- Sistema Integrado de Gestión de Activos (SIGA) - Fundación Marina Orth
-- =========================================================================

-- 1. Eliminar de forma segura cualquier CHECK constraint existente sobre 'categoria' en 'consumibles'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'consumibles' AND column_name = 'categoria'
    ) LOOP
        EXECUTE 'ALTER TABLE public.consumibles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE;';
        RAISE NOTICE 'Constraint eliminado: %', r.constraint_name;
    END LOOP;
END $$;

-- 2. Asegurar que la columna 'categoria' exista y tenga tipo TEXT
ALTER TABLE public.consumibles
ALTER COLUMN categoria TYPE text;

-- 3. Documentación descriptiva de la columna
COMMENT ON COLUMN public.consumibles.categoria IS 'Subcategoría oficial para consumibles de robótica FMO: Energía y Baterías, Componentes Electrónicos, Sensores, Motores y Módulos, Cableado y Conectividad, Insumos de Soldadura, Impresión 3D y Prototipado, Mecánica y Ferretería, Repuestos de Kits Educativos';

-- 4. Constraint inclusivo: permite las 8 subcategorías oficiales y mantiene compatibilidad con valores históricos
ALTER TABLE public.consumibles
DROP CONSTRAINT IF EXISTS consumibles_categoria_check;

ALTER TABLE public.consumibles
ADD CONSTRAINT consumibles_categoria_check
CHECK (
    categoria IS NULL OR
    categoria IN (
        -- 8 Subcategorías oficiales FMO 2026
        'Energía y Baterías',
        'Componentes Electrónicos',
        'Sensores, Motores y Módulos',
        'Cableado y Conectividad',
        'Insumos de Soldadura',
        'Impresión 3D y Prototipado',
        'Mecánica y Ferretería',
        'Repuestos de Kits Educativos',
        -- Compatibilidad con registros antiguos
        'Robótica',
        'Electrónica',
        'Herramientas',
        'Impresión 3D',
        'Cables y Adaptadores',
        'Cómputo & Formación',
        'Papelería'
    )
);
