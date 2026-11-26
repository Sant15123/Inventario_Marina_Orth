-- Permitir fecha_devolucion_estimada / fecha_devolucion_esperada nula en solicitudes de préstamo
ALTER TABLE IF EXISTS public.solicitudes_inventario
  ALTER COLUMN fecha_devolucion_estimada DROP NOT NULL;

ALTER TABLE IF EXISTS public.solicitudes_prestamo
  ALTER COLUMN fecha_devolucion_esperada DROP NOT NULL;
