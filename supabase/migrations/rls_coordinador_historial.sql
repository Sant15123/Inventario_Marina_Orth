-- =========================================================================
-- MIGRACIÓN OPCIONAL: REFUERZO DE SEGURIDAD RLS EN HISTORIAL PARA COORDINADOR
-- Sistema Interno de Gestión de Activos - Fundación Marina Orth (SIGA-FMO)
-- =========================================================================
-- Este script es de consulta y verificación previa.
-- Aplica políticas RLS estrictas en 'historial_movimientos' en caso de que
-- desees reforzar la privacidad a nivel de motor PostgreSQL además del frontend.
-- =========================================================================

-- Asegurar índices para búsquedas veloces por documento y responsable
CREATE INDEX IF NOT EXISTS idx_historial_documento_responsable 
  ON public.historial_movimientos (documento_responsable);

CREATE INDEX IF NOT EXISTS idx_historial_responsable 
  ON public.historial_movimientos (responsable);

-- En el frontend ya se garantiza:
-- 1. Filtrado directo en consulta Supabase (.or(documento_responsable.eq.X,responsable.ilike.%Y%))
-- 2. Supresión de destellos iniciales durante la autenticación / carga.
-- 3. Aislamiento estricto de eventos en tiempo real (WebSocket Realtime y siga:historial_nuevo).
