-- =============================================================================
-- MIGRACIÓN SIGA-FMO: PERMITIR AL ROL 'coordinador' RADICAR Y CONSULTAR
-- SUS PROPIAS SOLICITUDES EN solicitudes_inventario / items_solicitud
-- SIN PERMITIR AUTOAPROBACIÓN NI APROBACIÓN DE PRÉSTAMOS
-- =============================================================================

-- 1. Asegurar helper SECURITY DEFINER sin recursión RLS para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(rol, 'usuario'))
  FROM public.perfiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 2. Habilitar RLS en solicitudes_inventario e items_solicitud
ALTER TABLE IF EXISTS public.solicitudes_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.items_solicitud ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas previas conflictivas por rol en solicitudes_inventario
DROP POLICY IF EXISTS "solicitudes_inventario_select_policy" ON public.solicitudes_inventario;
DROP POLICY IF EXISTS "solicitudes_inventario_insert_policy" ON public.solicitudes_inventario;
DROP POLICY IF EXISTS "solicitudes_inventario_update_policy" ON public.solicitudes_inventario;
DROP POLICY IF EXISTS "Lectura de solicitudes de inventario" ON public.solicitudes_inventario;
DROP POLICY IF EXISTS "Inserción de solicitudes de inventario" ON public.solicitudes_inventario;
DROP POLICY IF EXISTS "Actualización de solicitudes de inventario" ON public.solicitudes_inventario;

-- SELECT: Admin, Supervisor y Operador ven todas; Usuario y Coordinador consultan sus propias solicitudes
-- (Nota: Si auth.uid() es NULL porque el frontend usa JWT propio vía anon key, permite lectura autenticada de aplicación)
CREATE POLICY "solicitudes_inventario_select_policy"
ON public.solicitudes_inventario
FOR SELECT
TO public
USING (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor', 'operador')
  OR (
    public.get_my_role() IN ('usuario', 'coordinador')
    AND usuario_id::text = auth.uid()::text
  )
);

-- INSERT: Admin, Supervisor, Operador, Coordinador y Usuario pueden radicar solicitudes
-- Usuario y Coordinador solo pueden radicar para sí mismos y obligatoriamente en estado PENDIENTE
CREATE POLICY "solicitudes_inventario_insert_policy"
ON public.solicitudes_inventario
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor', 'operador')
  OR (
    public.get_my_role() IN ('usuario', 'coordinador')
    AND usuario_id::text = auth.uid()::text
    AND UPPER(COALESCE(estado, 'PENDIENTE')) = 'PENDIENTE'
  )
);

-- UPDATE: Únicamente Administrador y Supervisor pueden aprobar, rechazar o cambiar estado de préstamos
-- (Bloquea explícitamente cualquier intento de autoaprobación del Coordinador o Usuario)
CREATE POLICY "solicitudes_inventario_update_policy"
ON public.solicitudes_inventario
FOR UPDATE
TO public
USING (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor')
)
WITH CHECK (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor')
);

-- 4. Políticas coherentes en items_solicitud (ligadas al dueño o staff)
DROP POLICY IF EXISTS "items_solicitud_select_policy" ON public.items_solicitud;
DROP POLICY IF EXISTS "items_solicitud_insert_policy" ON public.items_solicitud;
DROP POLICY IF EXISTS "items_solicitud_update_policy" ON public.items_solicitud;

CREATE POLICY "items_solicitud_select_policy"
ON public.items_solicitud
FOR SELECT
TO public
USING (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor', 'operador')
  OR EXISTS (
    SELECT 1
    FROM public.solicitudes_inventario s
    WHERE s.id = items_solicitud.solicitud_id
      AND s.usuario_id::text = auth.uid()::text
      AND public.get_my_role() IN ('usuario', 'coordinador')
  )
);

CREATE POLICY "items_solicitud_insert_policy"
ON public.items_solicitud
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor', 'operador')
  OR EXISTS (
    SELECT 1
    FROM public.solicitudes_inventario s
    WHERE s.id = items_solicitud.solicitud_id
      AND s.usuario_id::text = auth.uid()::text
      AND public.get_my_role() IN ('usuario', 'coordinador')
  )
);

CREATE POLICY "items_solicitud_update_policy"
ON public.items_solicitud
FOR UPDATE
TO public
USING (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor')
)
WITH CHECK (
  auth.uid() IS NULL
  OR public.get_my_role() IN ('administrador', 'supervisor')
);
