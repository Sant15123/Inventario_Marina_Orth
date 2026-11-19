-- =============================================================================
-- MIGRACIÓN OFICIAL SIGA-FMO: EQUIPOS DE ELECTRÓNICA & INSTRUMENTACIÓN
-- Fundación Marina Orth - Sistema Integrado de Gestión de Activos (SIGA-FMO)
-- =============================================================================

-- 1. Crear tabla oficial para Equipos de Electrónica (elementos reutilizables serializados)
CREATE TABLE IF NOT EXISTS public.equipos_electronica (
    id BIGSERIAL PRIMARY KEY,
    placa VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    subcategoria VARCHAR(100) DEFAULT 'Instrumentación',
    marca VARCHAR(100),
    modelo VARCHAR(100),
    serial VARCHAR(100),
    cantidad INT DEFAULT 1,
    condicion VARCHAR(50) DEFAULT 'Bueno',
    estado VARCHAR(50) DEFAULT 'Disponible',
    area_asignada VARCHAR(100) DEFAULT 'Robótica',
    sede VARCHAR(100) DEFAULT 'Medellín',
    ubicacion VARCHAR(255) DEFAULT 'Laboratorio de Robótica',
    responsable VARCHAR(255),
    fecha_adquisicion DATE DEFAULT CURRENT_DATE,
    valor_estimado NUMERIC(12, 2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices de aceleración para búsquedas, filtros de sede, área y préstamos
CREATE INDEX IF NOT EXISTS idx_equipos_electronica_placa ON public.equipos_electronica(placa);
CREATE INDEX IF NOT EXISTS idx_equipos_electronica_sede ON public.equipos_electronica(sede);
CREATE INDEX IF NOT EXISTS idx_equipos_electronica_estado ON public.equipos_electronica(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_electronica_area ON public.equipos_electronica(area_asignada);

-- 3. Habilitar Seguridad a Nivel de Filas (Row Level Security - RLS)
ALTER TABLE public.equipos_electronica ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS permisivas institucionales (lectura y gestión de inventario)
DROP POLICY IF EXISTS "Lectura pública de equipos de electrónica" ON public.equipos_electronica;
CREATE POLICY "Lectura pública de equipos de electrónica"
ON public.equipos_electronica
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Inserción de equipos de electrónica autenticada o pública" ON public.equipos_electronica;
CREATE POLICY "Inserción de equipos de electrónica autenticada o pública"
ON public.equipos_electronica
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Actualización de equipos de electrónica" ON public.equipos_electronica;
CREATE POLICY "Actualización de equipos de electrónica"
ON public.equipos_electronica
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Eliminación de equipos de electrónica" ON public.equipos_electronica;
CREATE POLICY "Eliminación de equipos de electrónica"
ON public.equipos_electronica
FOR DELETE
USING (true);

-- 5. Trigger para actualizar automáticamente 'updated_at'
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipos_electronica_updated_at ON public.equipos_electronica;
CREATE TRIGGER trg_equipos_electronica_updated_at
BEFORE UPDATE ON public.equipos_electronica
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 6. Semilla inicial de equipos de electrónica representativos (prefijo ELE-FMO-XXX)
INSERT INTO public.equipos_electronica (
    placa, nombre, subcategoria, marca, modelo, serial, cantidad, condicion, estado, area_asignada, sede, ubicacion, fecha_adquisicion, valor_estimado, observaciones
) VALUES
('ELE-FMO-001', 'Multímetro Digital Automotriz True RMS', 'Instrumentación', 'Uni-T', 'UT61E+', 'UT2026-001', 1, 'Excelente / Nuevo', 'Disponible', 'Robótica', 'Medellín', 'Taller de Electrónica - Estante A1', CURRENT_DATE, 380000, 'Equipo de alta precisión para talleres STEAM y medición de circuitos.'),
('ELE-FMO-002', 'Estación de Soldadura y Cautín Digital 60W', 'Herramienta Electrónica', 'Yihua', '936B', 'YH-936-042', 1, 'Bueno', 'Disponible', 'Robótica', 'Medellín', 'Mesa de Trabajo 3', CURRENT_DATE, 240000, 'Control térmico ESD Safe con soporte y esponja limpiadora.'),
('ELE-FMO-003', 'Fuente de Poder Regulable DC 30V 10A', 'Instrumentación', 'Wanptek', 'DPS3010U', 'WP-3010-88', 1, 'Bueno', 'Disponible', 'Robótica', 'Medellín', 'Laboratorio de Robótica', CURRENT_DATE, 450000, 'Display digital de 4 dígitos con protección contra sobrecorriente.'),
('ELE-FMO-004', 'Osciloscopio Digital Portátil 100MHz 2CH', 'Instrumentación', 'Hantek', 'DSO2D10', 'HT-2D10-15', 1, 'Bueno', 'Disponible', 'Robótica', 'Carmen de Viboral', 'Laboratorio STEAM Sede Carmen', CURRENT_DATE, 1250000, 'Incluye 2 sondas x1/x10 y generador de funciones integrado.'),
('ELE-FMO-005', 'Kit Educativo Arduino UNO R3 Reutilizable', 'Placas de Desarrollo', 'Arduino', 'UNO R3 Oficial', 'ARD-UNO-501', 1, 'Excelente / Nuevo', 'Disponible', 'Robótica', 'Medellín', 'Caja Organizadora 12', CURRENT_DATE, 115000, 'Microcontrolador ATmega328P para semilleros y clubes formativos.'),
('ELE-FMO-006', 'Tarjeta de Desarrollo ESP32 Wi-Fi + BT', 'Placas de Desarrollo', 'Espressif', 'NodeMCU-32S', 'ESP32-WROOM-09', 1, 'Excelente / Nuevo', 'Disponible', 'Robótica', 'Medellín', 'Gaveta E-02', CURRENT_DATE, 55000, 'Módulo IoT dual-core para proyectos conectados.'),
('ELE-FMO-007', 'Generador de Señales DDS Arbitrario 60MHz', 'Instrumentación', 'FeelTech', 'FY6900', 'FT-6900-22', 1, 'Bueno', 'Disponible', 'Robótica', 'Medellín', 'Taller Central', CURRENT_DATE, 520000, 'Generador de onda senoidal, cuadrada, rampa y pulsos.')
ON CONFLICT (placa) DO NOTHING;
