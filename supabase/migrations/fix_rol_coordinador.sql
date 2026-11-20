-- =============================================================================
-- MIGRACIÓN OFICIAL SIGA-FMO: HABILITAR ROL COORDINADOR Y USUARIO DEMO
-- Fundación Marina Orth - Sistema Integrado de Gestión de Activos (SIGA-FMO)
-- Archivo: supabase/migrations/fix_rol_coordinador.sql
-- =============================================================================

-- 0. Habilitar extensión criptográfica para generación segura de hashes bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Actualizar restricción CHECK en tabla física 'perfiles' y tabla 'usuarios'
DO $$
BEGIN
    -- Tabla física principal: public.perfiles
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'perfiles'
    ) THEN
        ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
        ALTER TABLE public.perfiles 
            ADD CONSTRAINT perfiles_rol_check 
            CHECK (LOWER(rol) IN ('administrador', 'supervisor', 'operador', 'usuario', 'coordinador'));
    END IF;

    -- Si 'usuarios' es una tabla física en algún entorno (o si se crean constraints en vistas actualizables)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usuarios' AND table_type = 'BASE TABLE'
    ) THEN
        ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
        ALTER TABLE public.usuarios 
            ADD CONSTRAINT usuarios_rol_check 
            CHECK (LOWER(rol) IN ('administrador', 'supervisor', 'operador', 'usuario', 'coordinador'));
    END IF;

    -- Si existe algún tipo ENUM de roles
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname IN ('rol_usuario', 'user_role', 'rol_enum')
    ) THEN
        BEGIN
            ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'coordinador';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
END $$;

-- 2. Actualizar Políticas de Seguridad RLS (Row Level Security)
-- Permitir que el Administrador y los servicios gestionen los perfiles y que Coordinador tenga acceso
ALTER TABLE IF EXISTS public.perfiles ENABLE ROW LEVEL SECURITY;

-- Política de lectura de perfiles (necesaria para listados de custodios, solicitantes y usuarios en el frontend)
DROP POLICY IF EXISTS "Permitir lectura perfiles" ON public.perfiles;
CREATE POLICY "Permitir lectura perfiles"
ON public.perfiles
FOR SELECT
USING (true);

-- Política de inserción de perfiles
DROP POLICY IF EXISTS "Permitir inserción perfiles" ON public.perfiles;
CREATE POLICY "Permitir inserción perfiles"
ON public.perfiles
FOR INSERT
WITH CHECK (true);

-- Política de actualización de perfiles (permite cambiar roles desde el módulo de Usuarios)
DROP POLICY IF EXISTS "Permitir actualización perfiles" ON public.perfiles;
CREATE POLICY "Permitir actualización perfiles"
ON public.perfiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Actualizar política de staff si existe para incluir 'coordinador'
DROP POLICY IF EXISTS staff_select_perfiles ON public.perfiles;
CREATE POLICY staff_select_perfiles ON public.perfiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles p
        WHERE p.id = auth.uid() AND LOWER(p.rol) IN ('administrador', 'supervisor', 'operador', 'coordinador')
    )
);

-- Asegurar políticas en tabla solicitudes_compra para el rol Coordinador
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'solicitudes_compra'
    ) THEN
        ALTER TABLE public.solicitudes_compra ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "solicitudes_compra_select_all" ON public.solicitudes_compra;
        CREATE POLICY "solicitudes_compra_select_all" ON public.solicitudes_compra FOR SELECT USING (true);

        DROP POLICY IF EXISTS "solicitudes_compra_insert_all" ON public.solicitudes_compra;
        CREATE POLICY "solicitudes_compra_insert_all" ON public.solicitudes_compra FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "solicitudes_compra_update_all" ON public.solicitudes_compra;
        CREATE POLICY "solicitudes_compra_update_all" ON public.solicitudes_compra FOR UPDATE USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "solicitudes_compra_delete_all" ON public.solicitudes_compra;
        CREATE POLICY "solicitudes_compra_delete_all" ON public.solicitudes_compra FOR DELETE USING (true);
    END IF;
END $$;

-- 3. Crear / Insertar el Usuario Demo Oficial de Coordinador en la Base de Datos
-- Credenciales: carolina.gomez@fmo.org (o coordinador@fmo.org) | coord123
INSERT INTO public.perfiles (
    id,
    documento,
    nombre_completo,
    email,
    telefono,
    rol,
    cargo,
    sede,
    password,
    activo,
    created_at,
    updated_at
) VALUES (
    'c819a1bc-70e4-4401-bb6e-fe3e280575e9',
    '1004567890',
    'Carolina Gómez',
    'carolina.gomez@fmo.org',
    '3157778899',
    'coordinador',
    'Coordinadora de Proyectos & Adquisiciones',
    'Medellín',
    crypt('coord123', gen_salt('bf')),
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    documento = '1004567890',
    nombre_completo = 'Carolina Gómez',
    email = 'carolina.gomez@fmo.org',
    telefono = '3157778899',
    rol = 'coordinador',
    cargo = 'Coordinadora de Proyectos & Adquisiciones',
    sede = 'Medellín',
    password = crypt('coord123', gen_salt('bf')),
    activo = true,
    updated_at = NOW();

-- Garantizar actualización por si el email ya existía con otro UUID
UPDATE public.perfiles
SET 
    rol = 'coordinador',
    cargo = 'Coordinadora de Proyectos & Adquisiciones',
    sede = 'Medellín',
    password = crypt('coord123', gen_salt('bf')),
    activo = true,
    updated_at = NOW()
WHERE email IN ('carolina.gomez@fmo.org', 'coordinador@fmo.org');

-- 4. Opcional: Si se utiliza Supabase Auth (auth.users), insertar usuario con su metadata
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud
        ) VALUES (
            'c819a1bc-70e4-4401-bb6e-fe3e280575e9',
            '00000000-0000-0000-0000-000000000000',
            'carolina.gomez@fmo.org',
            crypt('coord123', gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Carolina Gómez","rol":"coordinador","cargo":"Coordinadora de Proyectos & Adquisiciones","sede":"Medellín"}',
            NOW(),
            NOW(),
            'authenticated',
            'authenticated'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = 'carolina.gomez@fmo.org',
            encrypted_password = crypt('coord123', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Carolina Gómez","rol":"coordinador","cargo":"Coordinadora de Proyectos & Adquisiciones","sede":"Medellín"}',
            updated_at = NOW();
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- auth.users puede requerir permisos de superusuario en algunos entornos cloud
    RAISE NOTICE 'Inserción en auth.users omitida o gestionada por Supabase Auth: %', SQLERRM;
END $$;
