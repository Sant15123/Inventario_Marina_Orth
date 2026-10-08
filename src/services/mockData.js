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
    // =========================================================================
    // 1. EQUIPOS TECNOLÓGICOS SERIALIZADOS
    // =========================================================================

    // --- COMPUTADORES PORTÁTILES (15 unidades Lenovo ThinkPad P1 a P15) ---
    {
      id: "act-thinkpad-l14",
      codigoItem: "ACT-LP-01",
      name: "Laptops Lenovo ThinkPad L14 Gen 3",
      category: "Cómputo & Formación",
      unit: "unidad",
      itemType: "equipo",
      quantity: 15,
      minStock: 4,
      location: "Medellín - Lab Robótica / Oficina Fundación",
      sede: "Medellín",
      notes: "Intel Core i5 / i7 / Xeon, 16GB/32GB RAM, SSD 512GB NVMe, Windows 10/11 Pro. Equipos corporativos para profesionales y laboratorios móviles de robótica.",
      dateAdded: "2026-01-15",
      units: [
        {
          code: "LP-01",
          placa: "P1",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL01A",
          status: "prestado",
          sede: "Medellín",
          responsable: "Yury Torres"
        },
        {
          code: "LP-02",
          placa: "P2",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL02B",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Dolly Montoya"
        },
        {
          code: "LP-03",
          placa: "P3",
          model: "ThinkPad L14 Gen 3 (Core i7, 32GB RAM, Win 11 Pro)",
          serial: "PF1HL03C",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Nicolas Tamayo"
        },
        {
          code: "LP-04",
          placa: "P4",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 10 Pro)",
          serial: "PF1HL04D",
          status: "prestado",
          sede: "Medellín",
          responsable: "Sofia Muñoz"
        },
        {
          code: "LP-05",
          placa: "P5",
          model: "ThinkPad L14 Gen 3 (Core i7, 32GB RAM, Win 11 Pro)",
          serial: "PF1HL05E",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-06",
          placa: "P6",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL06F",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-07",
          placa: "P7",
          model: "ThinkPad L14 Gen 3 (Intel Xeon E3, 32GB RAM, Win 11 Pro Workstation)",
          serial: "PF1HL07G",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-08",
          placa: "P8",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 10 Pro)",
          serial: "PF1HL08H",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-09",
          placa: "P9",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL09I",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-10",
          placa: "P10",
          model: "ThinkPad L14 Gen 3 (Core i7, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL10J",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-11",
          placa: "P11",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL11K",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-12",
          placa: "P12",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 10 Pro)",
          serial: "PF1HL12L",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-13",
          placa: "P13",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL13M",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-14",
          placa: "P14",
          model: "ThinkPad L14 Gen 3 (Core i7, 32GB RAM, Win 11 Pro)",
          serial: "PF1HL14N",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        },
        {
          code: "LP-15",
          placa: "P15",
          model: "ThinkPad L14 Gen 3 (Core i5, 16GB RAM, Win 11 Pro)",
          serial: "PF1HL15O",
          status: "disponible",
          sede: "Medellín",
          responsable: "Oficina Fundación"
        }
      ]
    },

    // --- TABLETS SAMSUNG GALAXY TAB A9+ (10 unidades T-01 a T-10) ---
    {
      id: "act-tab-samsung-a9",
      codigoItem: "ACT-TB-01",
      name: "Tablets Samsung Galaxy Tab A9+",
      category: "Nuevas Tecnologías",
      unit: "unidad",
      itemType: "equipo",
      quantity: 10,
      minStock: 3,
      location: "Medellín - Estante B10",
      sede: "Medellín",
      notes: "Tablets 11 pulgadas con estuche anti-golpes de uso rudo asignadas para proyectos como Clubes de Robótica y lectura digital.",
      dateAdded: "2026-02-01",
      units: [
        {
          code: "T-01",
          placa: "T-01",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-001",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Nicolas Tamayo"
        },
        {
          code: "T-02",
          placa: "T-02",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-002",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Nicolas Tamayo"
        },
        {
          code: "T-03",
          placa: "T-03",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-003",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Nicolas Tamayo"
        },
        {
          code: "T-04",
          placa: "T-04",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-004",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Nicolas Tamayo"
        },
        {
          code: "T-05",
          placa: "T-05",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-005",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        },
        {
          code: "T-06",
          placa: "T-06",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-006",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        },
        {
          code: "T-07",
          placa: "T-07",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-007",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        },
        {
          code: "T-08",
          placa: "T-08",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-008",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        },
        {
          code: "T-09",
          placa: "T-09",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-009",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        },
        {
          code: "T-10",
          placa: "T-10",
          model: "Samsung Galaxy Tab A9+ (64GB, Wi-Fi)",
          serial: "SN-SMX210-010",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Central"
        }
      ]
    },

    // --- VIDEOPROYECTORES (Incluye VP0003 asignado en Carmen de Viboral) ---
    {
      id: "act-videoproyectores",
      codigoItem: "ACT-PR-01",
      name: "Video Proyectores Láser Epson PowerLite",
      category: "Audiovisuales",
      unit: "unidad",
      itemType: "equipo",
      quantity: 4,
      minStock: 2,
      location: "Medellín - Bodega Audiovisual",
      sede: "Medellín",
      notes: "Proyectores de alta luminosidad 3600 lúmenes para eventos formativos, proyecciones STEAM y talleres en sedes.",
      dateAdded: "2026-01-20",
      units: [
        {
          code: "VP-01",
          placa: "VP0001",
          model: "PowerLite E20 3600 Lumens",
          serial: "EPS-98211-A",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Audiovisual"
        },
        {
          code: "VP-02",
          placa: "VP0002",
          model: "PowerLite E20 3600 Lumens",
          serial: "EPS-98212-B",
          status: "disponible",
          sede: "Medellín",
          responsable: "Bodega Audiovisual"
        },
        {
          code: "VP-03",
          placa: "VP0003",
          model: "PowerLite E20 3600 Lumens",
          serial: "EPS-98213-C",
          status: "prestado",
          sede: "Carmen de Viboral",
          responsable: "Dolly Montoya"
        },
        {
          code: "VP-04",
          placa: "VP0004",
          model: "PowerLite E20 3600 Lumens",
          serial: "EPS-98214-D",
          status: "disponible",
          sede: "La Ceja",
          responsable: "Sede La Ceja"
        }
      ]
    },

    // --- IMPRESORAS 3D CREALITY (Disponibles en Medellín) ---
    {
      id: "act-impresoras-3d",
      codigoItem: "ACT-3D-01",
      name: "Impresoras 3D Creality Ender-3 V3 SE",
      category: "Nuevas Tecnologías",
      unit: "unidad",
      itemType: "equipo",
      quantity: 3,
      minStock: 1,
      location: "Medellín - Laboratorio de Fabricación Digital",
      sede: "Medellín",
      notes: "Impresoras de extrusión directa de filamento PLA para prototipado rápido en proyectos y semilleros STEAM.",
      dateAdded: "2026-02-05",
      units: [
        {
          code: "3D-01",
          placa: "3D-01",
          model: "Creality Ender-3 V3 SE (Auto Leveling)",
          serial: "CRL-3DV3-01",
          status: "disponible",
          sede: "Medellín",
          responsable: "Laboratorio Digital"
        },
        {
          code: "3D-02",
          placa: "3D-02",
          model: "Creality Ender-3 V3 SE (Auto Leveling)",
          serial: "CRL-3DV3-02",
          status: "disponible",
          sede: "Medellín",
          responsable: "Laboratorio Digital"
        },
        {
          code: "3D-03",
          placa: "3D-03",
          model: "Creality Ender-3 V3 SE (Auto Leveling)",
          serial: "CRL-3DV3-03",
          status: "disponible",
          sede: "Medellín",
          responsable: "Laboratorio Digital"
        }
      ]
    },

    // =========================================================================
    // 2. CONSUMIBLES Y ROBÓTICA
    // (Con stocks configurados para disparar alertas de stock bajo)
    // =========================================================================
    {
      id: "mat-arduino-uno",
      codigoItem: "MAT-ARD-01",
      name: "ARDUINO UNO R3 (Original + Cable)",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 3, // Stock crítico: 3 <= minStock 10
      minStock: 10,
      location: "Medellín - Estante A5 / Caja 2",
      sede: "Medellín",
      notes: "Microcontroladores ATmega328P para cursos formativos y Clubes de Robótica. ¡Alerta de reposición urgente!",
      dateAdded: "2026-02-10"
    },
    {
      id: "mat-cautines-60w",
      codigoItem: "MAT-CAU-01",
      name: "Cautines para Soldar 60W con Control Temp",
      category: "Herramientas de Taller",
      unit: "unidad",
      itemType: "consumible",
      quantity: 4, // Stock crítico: 4 <= minStock 8
      minStock: 8,
      location: "Medellín - Taller E2",
      sede: "Medellín",
      notes: "Incluye soporte y esponja limpiadora. Stock por debajo del mínimo para semilleros y talleres de soldadura.",
      dateAdded: "2026-02-14"
    },
    {
      id: "mat-motores-dc",
      codigoItem: "MAT-MOT-01",
      name: "Motores DC TT Amarillo con Caja Reductora",
      category: "Electrónica & Robótica",
      unit: "unidad",
      itemType: "consumible",
      quantity: 8, // Stock crítico: 8 <= minStock 20
      minStock: 20,
      location: "Medellín - Gaveta F10",
      sede: "Medellín",
      notes: "Motores 3-6V de doble eje. Nivel de stock bajo tras la última entrega a sedes y colegios aliados.",
      dateAdded: "2026-02-18"
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
      notes: "Drivers para control de velocidad y sentido de giro en robots seguidores de línea y mini-sumo.",
      dateAdded: "2026-02-15"
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
      notes: "Servos para brazos robóticos y mecanismos mecánicos construidos por estudiantes.",
      dateAdded: "2026-02-20"
    },
    {
      id: "mat-cajas-resistencias",
      codigoItem: "MAT-RES-01",
      name: "Cajas de Resistencias Surtidas (600 pcs, 1/4W)",
      category: "Electrónica & Robótica",
      unit: "caja",
      itemType: "consumible",
      quantity: 14,
      minStock: 5,
      location: "Medellín - Estante A3 / Gaveta 08",
      sede: "Medellín",
      notes: "Kits con valores desde 10Ω hasta 1MΩ con película metálica de tolerancia al 1% para prácticas escolares.",
      dateAdded: "2026-02-25"
    },
    {
      id: "mat-pasta-soldar",
      codigoItem: "MAT-PST-01",
      name: "Pasta para Soldar y Desoxidante (50g)",
      category: "Herramientas de Taller",
      unit: "tarro",
      itemType: "consumible",
      quantity: 12,
      minStock: 6,
      location: "Medellín - Taller E2 / Armario Químicos",
      sede: "Medellín",
      notes: "Flux no corrosivo para estaño en circuitos impresos y empalmes de cables de robótica.",
      dateAdded: "2026-03-02"
    }
  ],

  // =========================================================================
  // 3. MOVIMIENTOS: PRÉSTAMOS ACTIVOS E HISTORIAL
  // (Con préstamos vencidos y vigentes de septiembre / octubre 2026)
  // =========================================================================
  movements: [
    // PRÉSTAMO ACTIVO 1 - VENCIDO (Yury Torres - Medellín)
    // Fecha pactada: 2026-09-30 (ya superada con respecto al 08 de octubre de 2026) -> Muestra badge "Vencido" en rojo
    {
      id: "mov-prest-001",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Yury Torres",
      sede: "Medellín",
      motive: "Capacitación Docente en Pensamiento Computacional",
      date: "2026-09-10",
      expectedReturn: "2026-09-30", // Vencido
      returnedDate: null,
      status: "activo",
      unitCodes: ["P1"]
    },

    // PRÉSTAMO ACTIVO 2 - VENCIDO (Dolly Montoya - Carmen de Viboral)
    // Fecha pactada: 2026-10-02 (ya superada) -> Muestra badge "Vencido" en rojo
    {
      id: "mov-prest-002",
      type: "prestamo",
      itemId: "act-videoproyectores",
      itemName: "Video Proyectores Láser Epson PowerLite",
      qty: 1,
      person: "Dolly Montoya",
      sede: "Carmen de Viboral",
      motive: "Taller Interinstitucional Robótica & Comunidad",
      date: "2026-09-18",
      expectedReturn: "2026-10-02", // Vencido
      returnedDate: null,
      status: "activo",
      unitCodes: ["VP0003"]
    },

    // PRÉSTAMO ACTIVO 3 - AL DÍA (Dolly Montoya - Carmen de Viboral)
    // Fecha pactada: 2026-10-25 -> Al día
    {
      id: "mov-prest-003",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Dolly Montoya",
      sede: "Carmen de Viboral",
      motive: "Semillero STEAM - Coordinación Académica Carmen",
      date: "2026-09-22",
      expectedReturn: "2026-10-25", // Vigente
      returnedDate: null,
      status: "activo",
      unitCodes: ["P2"]
    },

    // PRÉSTAMO ACTIVO 4 - AL DÍA (Nicolas Tamayo - Carmen de Viboral)
    // Lote de Tablets Samsung T-01 a T-04 para Clubes de Robótica
    {
      id: "mov-prest-004",
      type: "prestamo",
      itemId: "act-tab-samsung-a9",
      itemName: "Tablets Samsung Galaxy Tab A9+",
      qty: 4,
      person: "Nicolas Tamayo",
      sede: "Carmen de Viboral",
      motive: "Clubes de Robótica - Programación por Bloques con Tablets",
      date: "2026-09-25",
      expectedReturn: "2026-10-31", // Vigente
      returnedDate: null,
      status: "activo",
      unitCodes: ["T-01", "T-02", "T-03", "T-04"]
    },

    // PRÉSTAMO ACTIVO 5 - AL DÍA (Nicolas Tamayo - Carmen de Viboral)
    // Laptop P3 para programación de robots
    {
      id: "mov-prest-005",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Nicolas Tamayo",
      sede: "Carmen de Viboral",
      motive: "Clubes de Robótica - Programación y Calibración de Sensores",
      date: "2026-09-25",
      expectedReturn: "2026-11-15", // Vigente
      returnedDate: null,
      status: "activo",
      unitCodes: ["P3"]
    },

    // PRÉSTAMO ACTIVO 6 - AL DÍA (Sofia Muñoz - Medellín)
    // Laptop P4 para semillero
    {
      id: "mov-prest-006",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Sofia Muñoz",
      sede: "Medellín",
      motive: "Ratón de Biblioteca - Apoyo Técnico en Biblioteca Comunitaria",
      date: "2026-10-01",
      expectedReturn: "2026-10-28", // Vigente
      returnedDate: null,
      status: "activo",
      unitCodes: ["P4"]
    },

    // HISTORIAL: PRÉSTAMO YA DEVUELTO (Santiago Galeano - La Ceja)
    {
      id: "mov-prest-007",
      type: "prestamo",
      itemId: "act-thinkpad-l14",
      itemName: "Laptops Lenovo ThinkPad L14 Gen 3",
      qty: 1,
      person: "Santiago Galeano",
      sede: "La Ceja",
      motive: "Taller Intensivo Micro:bit",
      date: "2026-08-10",
      expectedReturn: "2026-08-25",
      returnedDate: "2026-08-24", // Devuelto a tiempo
      status: "cerrado",
      unitCodes: ["P5"]
    },

    // ENTREGAS DE CONSUMIBLES A FORMADORES (Cerradas)
    {
      id: "mov-ent-001",
      type: "entrega",
      itemId: "mat-arduino-uno",
      itemName: "ARDUINO UNO R3 (Original + Cable)",
      qty: 7,
      person: "Nicolas Tamayo",
      sede: "Carmen de Viboral",
      motive: "Clubes de Robótica - Kits de ensamblaje para estudiantes de secundaria",
      date: "2026-09-12",
      status: "cerrado"
    },
    {
      id: "mov-ent-002",
      type: "entrega",
      itemId: "mat-motores-dc",
      itemName: "Motores DC TT Amarillo con Caja Reductora",
      qty: 12,
      person: "Dolly Montoya",
      sede: "Carmen de Viboral",
      motive: "Semillero STEAM - Construcción de carritos autónomos seguidores de línea",
      date: "2026-09-15",
      status: "cerrado"
    },
    {
      id: "mov-ent-003",
      type: "entrega",
      itemId: "mat-cautines-60w",
      itemName: "Cautines para Soldar 60W con Control Temp",
      qty: 4,
      person: "Yury Torres",
      sede: "Medellín",
      motive: "Dotación taller de soldadura electrónica en sede central",
      date: "2026-09-20",
      status: "cerrado"
    },
    {
      id: "mov-ent-004",
      type: "entrega",
      itemId: "mat-cajas-resistencias",
      itemName: "Cajas de Resistencias Surtidas (600 pcs, 1/4W)",
      qty: 3,
      person: "Sofia Muñoz",
      sede: "Medellín",
      motive: "Prácticas de electrónica básica y circuitos serie-paralelo",
      date: "2026-09-28",
      status: "cerrado"
    },

    // HISTORIAL DE INGRESOS A BODEGA (Cerrados)
    {
      id: "mov-ing-001",
      type: "ingreso",
      itemId: "mat-puente-h-l298n",
      itemName: "Módulo Driver Motor Puente H L298N",
      qty: 24,
      person: "Proveedor Bigtrónica Medellín",
      sede: "Medellín",
      motive: "Dotación semestral de insumos de robótica",
      date: "2026-09-01",
      status: "cerrado"
    },
    {
      id: "mov-ing-002",
      type: "ingreso",
      itemId: "act-impresoras-3d",
      itemName: "Impresoras 3D Creality Ender-3 V3 SE",
      qty: 3,
      person: "Donación Fundación Marina Orth",
      sede: "Medellín",
      motive: "Adquisición de equipamiento para laboratorio de fabricación digital",
      date: "2026-09-05",
      status: "cerrado"
    },
    {
      id: "mov-ing-003",
      type: "ingreso",
      itemId: "act-tab-samsung-a9",
      itemName: "Tablets Samsung Galaxy Tab A9+",
      qty: 10,
      person: "Donación Corporativa Samsung Colombia",
      sede: "Medellín",
      motive: "Dotación oficial de aula móvil para instituciones aliadas",
      date: "2026-09-08",
      status: "cerrado"
    }
  ]
};

// Custodios y Formadores reales de la Fundación
export const EMPLOYEES = [
  'Yury Torres',
  'Dolly Montoya',
  'Nicolas Tamayo',
  'Sofia Muñoz',
  'Santiago Galeano',
  'Sebastián Mejía',
  'Valeria Escobar',
  'Jorge Gutierrez',
  'Liliana Velásquez'
];

// Sedes operativas
export const SEDES = [
  'Medellín',
  'Carmen de Viboral',
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
    return (item.units || []).filter((u) => u.status === 'disponible').length;
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
    Boolean(m.expectedReturn) &&
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
