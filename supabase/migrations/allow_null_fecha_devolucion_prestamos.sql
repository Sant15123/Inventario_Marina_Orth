-- Permitir fecha de devolución pactada opcional (NULL) en la tabla prestamos
ALTER TABLE IF EXISTS public.prestamos
  ALTER COLUMN fecha_devolucion_esperada DROP NOT NULL;

ALTER TABLE IF EXISTS public.activos
  ALTER COLUMN fecha_devolucion DROP NOT NULL;
