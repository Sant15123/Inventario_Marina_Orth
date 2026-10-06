/**
 * SERVICIO DE DATOS MOCK - FUNDACIÓN MARINA ORTH
 * Sistema de Gestión de Inventario, Activos Fijos y Préstamos
 *
 * Sedes operativas: Medellín, El Carmen de Viboral, La Ceja, El Retiro, Nacional.
 * Proyectos clave: Clubes de Robótica, Ratón de Biblioteca, Semillero STEAM, Siembra de Colores.
 */

export const INITIAL_DATA = {
  // Activos Fijos y Consumibles de Robótica / Taller
  items: [
    // --- ACTIVOS FIJOS (Laptops, Tablets, Proyectores) ---
    {
      id: "act-thinkpad-l14",
      codigoItem: "ACT-LP-01",
      name: "Laptops Lenovo ThinkPad L14 Gen 3",
      category: "Cómputo & Formación",
      unit: "unidad",
      itemType: "equipo",
      quantity: 12,
      minStock: 3,
      location: "Medellín - Lab Robótica",
      sede: "Medellín",
      notes: "Intel Core i5, 16GB RAM, SSD 512GB. Equipos para formadores y laboratorios móviles.",
      dateAdded: "2026-01-15",
      units: [
        { code: "LP-01", placa: "P-01", model: "ThinkPad L14", serial: "PF-3X9011", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "LP-02", placa: "P-02", model: "ThinkPad L14", serial: "PF-3X9012", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "LP-03", placa: "P-03", model: "ThinkPad L14", serial: "PF-3X9013", status: "prestado", sede: "La Ceja", responsable: "Sebastián Mejía" },
        { code: "LP-04", placa: "P-04", model: "ThinkPad L14", serial: "PF-3X9014", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "LP-05", placa: "P-05", model: "ThinkPad L14", serial: "PF-3X9015", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "LP-06", placa: "P-06", model: "ThinkPad L14", serial: "PF-3X9016", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "LP-07", placa: "P-07", model: "ThinkPad L14", serial: "PF-3X9017", status: "disponible", sede: "El Retiro", responsable: "Bodega El Retiro" },
        { code: "LP-08", placa: "P-08", model: "ThinkPad L14", serial: "PF-3X9018", status: "disponible", sede: "El Retiro", responsable: "Bodega El Retiro" },
        { code: "LP-09", placa: "P-09", model: "ThinkPad L14", serial: "PF-3X9019", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "LP-10", placa: "P-10", model: "ThinkPad L14", serial: "PF-3X9020", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "LP-11", placa: "P-11", model: "ThinkPad L14", serial: "PF-3X9021", status: "disponible", sede: "Nacional", responsable: "Coordinación" },
        { code: "LP-12", placa: "P-12", model: "ThinkPad L14", serial: "PF-3X9022", status: "disponible", sede: "Nacional", responsable: "Coordinación" }
      ]
    },
    {
      id: "act-tab-samsung-a9",
      codigoItem: "ACT-TB-01",
      name: "Tablets Samsung Galaxy Tab A9+",
      category: "Nuevas Tecnologías",
      unit: "unidad",
      itemType: "equipo",
      quantity: 26,
      minStock: 8,
      location: "Medellín - Estante B10",
      sede: "Medellín",
      notes: "Tablets con estuche anti-golpes de uso rudo para niños de primaria y secundaria.",
      dateAdded: "2026-02-01",
      units: [
        { code: "T-01", placa: "T-01", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-001", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "T-02", placa: "T-02", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-002", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "T-03", placa: "T-03", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-003", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "T-04", placa: "T-04", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-004", status: "prestado", sede: "El Carmen", responsable: "Santiago Galeano" },
        { code: "T-05", placa: "T-05", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-005", status: "prestado", sede: "La Ceja", responsable: "Valeria Escobar" },
        { code: "T-06", placa: "T-06", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-006", status: "prestado", sede: "La Ceja", responsable: "Valeria Escobar" },
        { code: "T-07", placa: "T-07", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-007", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-08", placa: "T-08", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-008", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-09", placa: "T-09", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-009", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-10", placa: "T-10", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-010", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-11", placa: "T-11", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-011", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-12", placa: "T-12", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-012", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-13", placa: "T-13", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-013", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-14", placa: "T-14", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-014", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-15", placa: "T-15", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-015", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-16", placa: "T-16", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-016", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-17", placa: "T-17", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-017", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-18", placa: "T-18", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-018", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-19", placa: "T-19", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-019", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-20", placa: "T-20", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-020", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-21", placa: "T-21", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-021", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-22", placa: "T-22", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-022", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-23", placa: "T-23", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-023", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-24", placa: "T-24", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-024", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-25", placa: "T-25", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-025", status: "disponible", sede: "Medellín", responsable: "Bodega Central" },
        { code: "T-26", placa: "T-26", model: "Samsung Galaxy Tab A9+", serial: "SM-X210-026", status: "disponible", sede: "Medellín", responsable: "Bodega Central" }
      ]
    },
    {
      id: "act-proyector-epson",
      codigoItem: "ACT-PR-01",
      name: "Video Proyectores Láser Epson PowerLite",
      category: "Audiovisuales",
      unit: "unidad",
      itemType: "equipo",
      quantity: 4,
      minStock: 2,
      location: "Medellín - Bodega Audiovisual",
      sede: "Medellín",
      notes: "Proyectores de alta luminosidad 3600 lúmenes para eventos y talleres en sedes.",
      dateAdded: "2026-01-20",
      units: [
        { code: "PR-01", placa: "PR-01", model: "PowerLite E20", serial: "EPS-98211", status: "prestado", sede: "El Retiro", responsable: "Jorge Gutierrez" },
        { code: "PR-02", placa: "PR-02", model: "PowerLite E20", serial: "EPS-98212", status: "disponible", sede: "Medellín", responsable: "Bodega Audiovisual" },
        { code: "PR-03", placa: "PR-03", model: "PowerLite E20", serial: "EPS-98213", status: "disponible", sede: "La Ceja", responsable: "Sede La Ceja" },
        { code: "PR-04", placa: "PR-04", model: "PowerLite E20", serial: "EPS-98214", status: "disponible", sede: "Medellín", responsable: "Bodega Audiovisual" }
      ]
    },

    // --- CONSUMIBLES DE ROBÓTICA Y TALLER ---
    {
      id: "mat-arduino-uno",
      codigoItem: "MAT-ARD-01",
      name: "ARDUINO UNO R3 (Original + Cable)",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 3,
      minStock: 10,
      location: "Medellín - Estante A5 / Caja 2",
      sede: "Medellín",
      notes: "Microcontroladores ATmega328P para cursos formativos. ¡Alerta de reposición urgente!",
      dateAdded: "2026-02-10"
    },
    {
      id: "mat-cautines-60w",
      codigoItem: "MAT-CAU-01",
      name: "Cautines para Soldar 60W con Control Temp",
      category: "Herramientas de Taller",
      unit: "unidad",
      itemType: "consumible",
      quantity: 4,
      minStock: 8,
      location: "Medellín - Taller E2",
      sede: "Medellín",
      notes: "Incluye soporte y esponja limpiadora. Stock por debajo del mínimo para semilleros.",
      dateAdded: "2026-02-14"
    },
    {
      id: "mat-puente-h-l298n",
      codigoItem: "MAT-DRV-01",
      name: "Módulo Driver Motor Puente H L298N",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 24,
      minStock: 15,
      location: "Medellín - Gaveta E4",
      sede: "Medellín",
      notes: "Drivers para control de velocidad y sentido de giro en carritos seguidores de línea.",
      dateAdded: "2026-02-15"
    },
    {
      id: "mat-motores-dc",
      codigoItem: "MAT-MOT-01",
      name: "Motores DC TT Amarillo con Caja Reductora",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 8,
      minStock: 20,
      location: "Medellín - Gaveta F10",
      sede: "Medellín",
      notes: "Motores 3-6V de doble eje. Nivel de stock bajo tras la última entrega a sedes.",
      dateAdded: "2026-02-18"
    },
    {
      id: "mat-servo-sg90",
      codigoItem: "MAT-SRV-01",
      name: "Micro Servomotores SG90 9g",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 35,
      minStock: 15,
      location: "Medellín - Gaveta F12",
      sede: "Medellín",
      notes: "Servos para brazos robóticos y mecanismos mecánicos de estudiantes.",
      dateAdded: "2026-02-20"
    }
  ],

  // Movimientos: Préstamos, Entregas y Entradas
  movements: [
    // PRÉSTAMO VENCIDO 1 (Santiago Galeano - El Carmen)
    {
      id: "mov-prest-001",
      type: "prestamo",
      itemId: "act-tab-samsung-a9",
      itemName: "Tablets Samsung Galaxy Tab A9+",
      qty: 4,
      person: "Santiago Galeano",
      sede: "El Carmen",
      motive: "Clubes de Robótica - Taller Robótica Móvil",
      date: "2026-02-10",
      expectedReturn: "2026-02-28", // Vencido con respecto a la fecha actual
      returnedDate: null,
      status: "activo",
      unitCodes: ["T-01", "T-02", "T-03", "T-04"]
    },
    // PRÉSTAMO ACTIVO AL DÍA 2 (Valeria Escobar - La Ceja)
    {
      id: "mov-prest-002",
      type: "prestamo",
      itemId: "act-tab-samsung-a9",
      itemName: "Tablets Samsung Galaxy Tab A9+",
      qty: 2,
      person: "Valeria Escobar",
      sede: "La Ceja",
      motive: "Ratón de Biblioteca - Lectura Digital Infantil",
      date: "2026-03-25",
      expectedReturn: "2026-10-30", // Al día / En curso
      returnedDate: null,
      status: "activo",
      unitCodes: ["T-05", "T-06"]
    },
    // PRÉSTAMO VENCIDO 3 (Sebastián Mejía - La Ceja)
    {
      id: "mov-prest-003",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Sebastián Mejía",
      sede: "La Ceja",
      motive: "Semillero STEAM - Programación Python",
      date: "2026-03-01",
      expectedReturn: "2026-03-20", // Vencido
      returnedDate: null,
      status: "activo",
      unitCodes: ["LP-03"]
    },
    // PRÉSTAMO ACTIVO AL DÍA 4 (Santiago Galeano - El Carmen)
    {
      id: "mov-prest-004",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 2,
      person: "Santiago Galeano",
      sede: "El Carmen",
      motive: "Clubes de Robótica - Calibración Sensores",
      date: "2026-03-28",
      expectedReturn: "2026-11-15", // Al día
      returnedDate: null,
      status: "activo",
      unitCodes: ["LP-01", "LP-02"]
    },
    // PRÉSTAMO ACTIVO AL DÍA 5 (Jorge Gutierrez - El Retiro)
    {
      id: "mov-prest-005",
      type: "prestamo",
      itemId: "act-proyector-epson",
      itemName: "Video Proyectores Láser Epson PowerLite",
      qty: 1,
      person: "Jorge Gutierrez",
      sede: "El Retiro",
      motive: "Muestra de Proyectos Tecnológicos Municipales",
      date: "2026-04-01",
      expectedReturn: "2026-10-25", // Al día
      returnedDate: null,
      status: "activo",
      unitCodes: ["PR-01"]
    },

    // ENTREGAS DE CONSUMIBLES A FORMADORES (Cerradas)
    {
      id: "mov-ent-001",
      type: "entrega",
      itemId: "mat-arduino-uno",
      itemName: "ARDUINO UNO R3 (Original + Cable)",
      qty: 7,
      person: "Santiago Galeano",
      sede: "El Carmen",
      motive: "Clubes de Robótica - Kits de ensamblaje para estudiantes",
      date: "2026-03-12",
      status: "cerrado"
    },
    {
      id: "mov-ent-002",
      type: "entrega",
      itemId: "mat-motores-dc",
      itemName: "Motores DC TT Amarillo con Caja Reductora",
      qty: 12,
      person: "Sebastián Mejía",
      sede: "La Ceja",
      motive: "Taller Carritos Seguidores de Línea",
      date: "2026-03-14",
      status: "cerrado"
    },
    {
      id: "mov-ent-003",
      type: "entrega",
      itemId: "mat-cautines-60w",
      itemName: "Cautines para Soldar 60W con Control Temp",
      qty: 4,
      person: "Valeria Escobar",
      sede: "Ratón de Biblioteca",
      motive: "Dotación taller de soldadura electrónica",
      date: "2026-03-18",
      status: "cerrado"
    },

    // HISTORIAL DE INGRESOS A BODEGA (Cerrados)
    {
      id: "mov-ing-001",
      type: "ingreso",
      itemId: "mat-puente-h-l298n",
      itemName: "Módulo Driver Motor Puente H L298N",
      qty: 24,
      person: "Bigtrónica Proveedor",
      sede: "Medellín",
      motive: "Dotación inicial semestral de robótica",
      date: "2026-02-15",
      status: "cerrado"
    },
    {
      id: "mov-ing-002",
      type: "ingreso",
      itemId: "act-tab-samsung-a9",
      itemName: "Tablets Samsung Galaxy Tab A9+",
      qty: 26,
      person: "Donación Corporativa Samsung",
      sede: "Medellín",
      motive: "Dotación oficial de aula móvil",
      date: "2026-02-01",
      status: "cerrado"
    }
  ]
};

// Custodios y Formadores reales de la Fundación
export const EMPLOYEES = [
  'Santiago Galeano',
  'Sebastián Mejía',
  'Valeria Escobar',
  'Jorge Gutierrez',
  'Liliana Velásquez'
];

// Sedes operativas
export const SEDES = [
  'Medellín',
  'El Carmen',
  'La Ceja',
  'El Retiro',
  'Nacional'
];

// Proyectos institucionales
export const PROYECTOS = [
  'Clubes de Robótica',
  'Ratón de Biblioteca',
  'Semillero STEAM',
  'Siembra de Colores'
];

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formatea una fecha ISO a español legible (ej. 14 feb 2026)
 */
export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Calcula las unidades disponibles reales
 */
export function available(item) {
  if (item.itemType === 'equipo') {
    return (item.units || []).filter(u => u.status === 'disponible').length;
  }
  return item.quantity ?? 0;
}

/**
 * Verifica si un préstamo está en mora / vencido
 */
export function isOverdue(m) {
  return (
    m.type === 'prestamo' &&
    m.status === 'activo' &&
    m.expectedReturn &&
    m.expectedReturn < today()
  );
}

/**
 * Calcula días de diferencia para saber retraso o tiempo restante
 */
export function getDaysDiff(targetDate) {
  if (!targetDate) return 0;
  const t = new Date(targetDate + 'T00:00:00').getTime();
  const n = new Date(today() + 'T00:00:00').getTime();
  const diffTime = t - n;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
