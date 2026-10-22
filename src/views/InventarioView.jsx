import { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Eye, Pencil, Trash2, X } from 'lucide-react';
import ModalQR from '../components/modals/ModalQR';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalEditarActivo from '../components/modals/ModalEditarActivo';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { available, SEDES, EMPLOYEES, PROYECTOS, today } from '../services/mockData';
import inventoryApi, { API_BASE_URL } from '../services/inventoryApi';
import { exportarLibroMaestroExcelFMO } from '../services/excelExportService';

import catalogoPapeleriaFMO from '../data/catalogoPapeleriaFMO.json';

// Catálogo oficial de Papelería institucional (Insumos de oficina y formación STEAM - 105 ítems)
const DEFAULT_PAPELERIA = catalogoPapeleriaFMO;

// Catálogo inicial de Mobiliario institucional (Mesas, sillas, armarios de sedes)
const DEFAULT_MOBILIARIO = [
  {
    id: 'MOB-001',
    placa: 'MOB-001',
    code: 'MOB-001',
    material: 'Mesa Modular de Robótica y Ensamble (6 Puestos)',
    name: 'Mesa Modular de Robótica y Ensamble (6 Puestos)',
    nombre: 'Mesa Modular de Robótica y Ensamble (6 Puestos)',
    categoria: 'Mobiliario',
    category: 'Mobiliario',
    itemType: 'mobiliario',
    disponible: 8,
    quantity: 8,
    sede: 'Medellín',
    ubicacion: 'Medellín',
    location: 'Medellín',
    ubicacion_estante: 'Zona Lab 1',
    estado: 'Bueno',
    condicion: 'Buen Estado',
    responsable: 'Bodega Central',
    descripcion: 'Mesa de estructura metálica reforzada con superficie de melamina antiestática para ensamble STEAM.',
  },
  {
    id: 'MOB-002',
    placa: 'MOB-002',
    code: 'MOB-002',
    material: 'Sillas Ergonómicas Giratorias con Rodachines',
    name: 'Sillas Ergonómicas Giratorias con Rodachines',
    nombre: 'Sillas Ergonómicas Giratorias con Rodachines',
    categoria: 'Mobiliario',
    category: 'Mobiliario',
    itemType: 'mobiliario',
    disponible: 32,
    quantity: 32,
    sede: 'Medellín',
    ubicacion: 'Medellín',
    location: 'Medellín',
    ubicacion_estante: 'Aula Central',
    estado: 'Bueno',
    condicion: 'Buen Estado',
    responsable: 'Bodega Central',
    descripcion: 'Sillas de oficina con espaldar en malla transpirable y regulación neumática de altura.',
  },
  {
    id: 'MOB-003',
    placa: 'MOB-003',
    code: 'MOB-003',
    material: 'Armario Metálico Modular de Seguridad para Kits',
    name: 'Armario Metálico Modular de Seguridad para Kits',
    nombre: 'Armario Metálico Modular de Seguridad para Kits',
    categoria: 'Mobiliario',
    category: 'Mobiliario',
    itemType: 'mobiliario',
    disponible: 4,
    quantity: 4,
    sede: 'Carmen de Viboral',
    ubicacion: 'Carmen de Viboral',
    location: 'Carmen de Viboral',
    ubicacion_estante: 'Bodega M1',
    estado: 'Bueno',
    condicion: 'Nuevo',
    responsable: 'Dolly Montoya',
    descripcion: 'Gabinete doble puerta con chapa de seguridad de 4 bandejas ajustables.',
  },
  {
    id: 'MOB-004',
    placa: 'MOB-004',
    code: 'MOB-004',
    material: 'Carro Móvil de Almacenamiento & Carga STEAM',
    name: 'Carro Móvil de Almacenamiento & Carga STEAM',
    nombre: 'Carro Móvil de Almacenamiento & Carga STEAM',
    categoria: 'Mobiliario',
    category: 'Mobiliario',
    itemType: 'mobiliario',
    disponible: 2,
    quantity: 2,
    sede: 'La Ceja',
    ubicacion: 'La Ceja',
    location: 'La Ceja',
    ubicacion_estante: 'Zona Carga',
    estado: 'Bueno',
    condicion: 'Buen Estado',
    responsable: 'Santiago Galeano',
    descripcion: 'Mueble con ruedas de uso rudo y regleta eléctrica interna para resguardo y carga simultánea.',
  },
];

// Mapeador consistente para consumibles con soporte a todos los campos
const mapConsumibleItem = (c) => {
  const disp = Number(c.disponible ?? c.quantity ?? 0);
  const min = Number(c.minimo ?? c.minStock ?? 5);
  return {
    id: c.id,
    material: c.material || c.name || '',
    name: c.material || c.name || '',
    categoria: c.categoria || c.category || 'Robótica',
    category: c.categoria || c.category || 'Robótica',
    disponible: disp,
    quantity: disp,
    minimo: min,
    minStock: min,
    ubicacion: c.ubicacion || c.location || 'Oficina FMO',
    location: c.ubicacion || c.location || 'Oficina FMO',
    ubicacion_estante: c.ubicacion_estante || '',
    itemType: 'consumible',
    // Ficha Técnica
    descripcion: c.descripcion || c.description || '',
    description: c.descripcion || c.description || '',
    caracteristicas: c.caracteristicas || '',
    // Estado del Ítem
    estado: c.estado || 'Bueno',
    condicion: c.condicion || 'Nuevo',
    responsable: c.responsable || '—',
    // Información Financiera
    valor_unitario: c.valor_unitario ?? c.valor_compra ?? null,
    valor_compra: c.valor_compra ?? c.valor_unitario ?? null,
    fecha_compra: c.fecha_compra || null,
    garantia: c.garantia || null,
    // Notas
    notas: c.notas || c.observaciones || c.notes || '',
    observaciones: c.observaciones || c.notas || '',
    dateAdded: c.created_at ? c.created_at.split('T')[0] : today(),
  };
};

// Mapeador consistente para equipos tecnológicos con soporte a todos los 21 campos
const mapEquipoItem = (a) => {
  const placa = a.placa || a.id || '';
  const modelo = a.modelo || a.model || 'Estándar';
  const serial = a.serial || '—';
  const estado = a.estado || 'Disponible';
  const status = estado === 'En campo' ? 'prestado' : estado.toLowerCase();
  const sede = a.sede || 'Medellín';
  const ubicacion = a.ubicacion || (a.sede ? `Sede ${a.sede}` : 'Bodega Medellín');
  const ubicacion_estante = a.ubicacion_estante || '';
  const custodio = a.custodio || (estado === 'En campo' ? 'Custodio Temporal' : 'Bodega Central');
  const responsable = a.responsable || custodio;

  return {
    id: `eq-${a.id || placa}`,
    dbId: a.id,
    placa: placa,
    code: placa,
    name: a.nombre,
    nombre: a.nombre,
    equipo: a.nombre,
    category: a.categoria || a.marca || 'Portátiles',
    categoria: a.categoria || a.marca || 'Portátiles',
    condicion: a.condicion || estado || 'Nuevo',
    estado: estado,
    area: a.area || 'Tecnología',
    ubicacion: ubicacion,
    location: ubicacion,
    ubicacion_estante: ubicacion_estante,
    sede: sede,
    cantidad: 1,
    disponible: status === 'disponible' ? 1 : 0,
    minStock: 1,
    minimo: 1,
    itemType: 'equipo',
    isEquipo: true,
    // Ficha técnica
    marca: a.marca || 'Estándar',
    modelo: modelo,
    model: modelo,
    serial: serial,
    caracteristica_1: a.caracteristica_1 || '',
    caracteristica_2: a.caracteristica_2 || '',
    caracteristica_3: a.caracteristica_3 || '',
    responsable: responsable,
    custodio: custodio,
    // Adquisición y adicionales
    proveedor: a.proveedor || '',
    valor_compra: a.valor_compra ?? null,
    valor_total: a.valor_total ?? null,
    fecha_compra: a.fecha_compra || null,
    fecha_vencimiento_garantia: a.fecha_vencimiento_garantia || null,
    claves_otros: a.claves_otros || '',
    observaciones: a.observaciones || '',
    descripcion: a.descripcion || '',
    notes: a.observaciones || a.descripcion || '',
    notas: a.observaciones || a.descripcion || '',
    dateAdded: a.created_at ? a.created_at.split('T')[0] : today(),
    units: [
      {
        code: placa,
        placa: placa,
        model: modelo,
        serial: serial,
        sede: sede,
        status: status,
        responsable: responsable,
        custodio: custodio,
        baseLocation: ubicacion,
        ubicacion_estante: ubicacion_estante,
      },
    ],
  };
};

// Número de filas por página para tablas de inventario (vista compacta sin scroll vertical excesivo)
const ITEMS_PER_PAGE = 5;

export default function InventarioView({
  items = [],
  searchTerm = '',
  loading = false,
  error = null,
  onRetry,
  onAddItem,
  onEditItem,
  onRetireItem,
  onRegisterLoan,
  initialTab = 'equipos',
  initialStockFilter = 'todos',
}) {
  // Pestaña activa: 'equipos' | 'consumibles'
  const [activeTab, setActiveTab] = useState(initialTab);
  // Filtro de stock para consumibles: 'todos' | 'minimo'
  const [filterStockConsumibles, setFilterStockConsumibles] = useState(initialStockFilter);

  // Hook de autenticación y roles de usuario
  const { currentUser, isAdmin, isSupervisor, isOperador } = useAuth();

  // Hook del sistema de notificaciones/alertas personalizadas FMO
  const { showEditSuccess, showConfirmBaja, showConfirmAction, showNewItemSuccess, showLoanSuccess, showError, showInfo } = useToast();

  // Sincronizar si cambian las props iniciales
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialStockFilter) setFilterStockConsumibles(initialStockFilter);
  }, [initialStockFilter]);

  // Estados locales para carga directa en caso de montaje autónomo
  const [localItems, setLocalItems] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Función para recargar consumibles y activos desde el backend
  const cargarConsumibles = async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      if (onRetry) {
        await onRetry();
      } else {
        const [activosData, consumiblesData] = await Promise.all([
          inventoryApi.getActivos(),
          inventoryApi.getConsumibles(),
        ]);

        const loaded = [];
        if (Array.isArray(consumiblesData)) {
          consumiblesData.forEach((c) => {
            loaded.push(mapConsumibleItem(c));
          });
        }

        if (Array.isArray(activosData)) {
          activosData.forEach((a) => {
            loaded.push(mapEquipoItem(a));
          });
        }
        setLocalItems(loaded);
      }
    } catch (err) {
      setLocalError(err.message || 'Error al conectar con la base de datos');
    } finally {
      setLocalLoading(false);
    }
  };

  // Consulta automática en tiempo real al montar la vista de Inventario
  useEffect(() => {
    cargarConsumibles();
  }, []);

  // Determinar los datos vigentes (props del App o estado local)
  const effectiveItems = localItems !== null ? localItems : items;
  const effectiveLoading = localLoading || loading;
  const effectiveError = localError || error;

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalItemType, setModalItemType] = useState('equipo'); // 'equipo' | 'consumible'
  const [editingItem, setEditingItem] = useState(null);
  const [managingUnitsItem, setManagingUnitsItem] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [quickLoanUnit, setQuickLoanUnit] = useState(null); // Unidad para préstamo rápido
  const [loanPerson, setLoanPerson] = useState('');
  const [loanSede, setLoanSede] = useState('Medellín');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanMotive, setLoanMotive] = useState('');

  // Filtro de estado para la vista de equipos
  const [filterSede, setFilterSede] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Estado dinámico para unidades y placas del modal de Nuevo Equipo
  const [unidades, setUnidades] = useState([
    { placa: '', modelo: '', serial: '' }
  ]);

  const agregarUnidad = () => {
    setUnidades((prev) => [...prev, { placa: '', modelo: '', serial: '' }]);
  };

  const actualizarUnidad = (index, campo, valor) => {
    setUnidades((prev) =>
      prev.map((u, i) => (i === index ? { ...u, [campo]: valor } : u))
    );
  };

  const eliminarUnidad = (index) => {
    setUnidades((prev) => prev.filter((_, i) => i !== index));
  };

  // Separación de listas principales
  const rawConsumibles = useMemo(() => effectiveItems.filter((it) => it.itemType === 'consumible' && it.categoria !== 'Papelería' && it.categoria !== 'Mobiliario'), [effectiveItems]);
  const equipos = useMemo(() => effectiveItems.filter((it) => it.itemType === 'equipo' && it.categoria !== 'Mobiliario'), [effectiveItems]);

  // Estados persistentes y filtrado para PAPELERÍA
  const [localPapeleria, setLocalPapeleria] = useState(() => {
    try {
      const saved = localStorage.getItem('siga_papeleria');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo papelería de localStorage:', e);
    }
    return DEFAULT_PAPELERIA;
  });

  useEffect(() => {
    try {
      localStorage.setItem('siga_papeleria', JSON.stringify(localPapeleria));
    } catch (e) {
      console.warn('Error guardando papelería en localStorage:', e);
    }
  }, [localPapeleria]);

  // Estados persistentes y filtrado para MOBILIARIO
  const [localMobiliario, setLocalMobiliario] = useState(() => {
    try {
      const saved = localStorage.getItem('siga_mobiliario');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo mobiliario de localStorage:', e);
    }
    return DEFAULT_MOBILIARIO;
  });

  useEffect(() => {
    try {
      localStorage.setItem('siga_mobiliario', JSON.stringify(localMobiliario));
    } catch (e) {
      console.warn('Error guardando mobiliario en localStorage:', e);
    }
  }, [localMobiliario]);

  // Filtros y paginación para Papelería
  const [filterStockPapeleria, setFilterStockPapeleria] = useState('todos');
  const [filterCajaPapeleria, setFilterCajaPapeleria] = useState('todas');
  const [papeleriaPage, setPapeleriaPage] = useState(1);

  // Filtros y paginación para Mobiliario
  const [filterSedeMobiliario, setFilterSedeMobiliario] = useState('todas');
  const [mobiliarioPage, setMobiliarioPage] = useState(1);

  // Lista unificada de Papelería
  const rawPapeleria = useMemo(() => {
    const fromApi = effectiveItems.filter((it) => it.categoria === 'Papelería' || it.category === 'Papelería' || String(it.id).toUpperCase().startsWith('PAP') || it.subtipo === 'papeleria');
    const apiIds = new Set(fromApi.map((i) => i.id));
    const merged = [...fromApi];
    localPapeleria.forEach((p) => {
      if (!apiIds.has(p.id)) merged.push(p);
    });
    return merged;
  }, [effectiveItems, localPapeleria]);

  // Lista unificada de Mobiliario
  const rawMobiliario = useMemo(() => {
    const fromApi = effectiveItems.filter((it) => it.categoria === 'Mobiliario' || it.category === 'Mobiliario' || String(it.id).toUpperCase().startsWith('MOB') || it.itemType === 'mobiliario');
    const apiIds = new Set(fromApi.map((i) => i.id || i.placa));
    const merged = [...fromApi];
    localMobiliario.forEach((m) => {
      if (!apiIds.has(m.id) && !apiIds.has(m.placa)) merged.push(m);
    });
    return merged;
  }, [effectiveItems, localMobiliario]);

  // Función auxiliar para normalizar texto eliminando diacríticos / tildes y pasando a minúsculas
  const normalizeText = (text) => {
    if (!text && text !== 0) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Filtrado reactivo de Papelería (Stock, Contenedor / Caja y Buscador)
  const papeleriaFiltrada = useMemo(() => {
    let list = rawPapeleria;

    // Filtro por Estado de Stock (Stock bajo <= 3 según catálogo oficial)
    if (filterStockPapeleria === 'minimo') {
      list = list.filter((c) => {
        const disp = Number(c.disponible ?? c.quantity ?? 0);
        return disp <= 3;
      });
    } else if (filterStockPapeleria === 'optimo') {
      list = list.filter((c) => {
        const disp = Number(c.disponible ?? c.quantity ?? 0);
        return disp > 3;
      });
    }

    // Filtro por Caja / Contenedor
    if (filterCajaPapeleria !== 'todas') {
      const targetCaja = normalizeText(filterCajaPapeleria);
      list = list.filter((c) => {
        const estante = normalizeText(c.ubicacion_estante || c.caja);
        if (targetCaja.includes('fuera')) {
          return estante.includes('fuera');
        }
        return estante.includes(targetCaja) || targetCaja.includes(estante);
      });
    }

    const term = normalizeText(searchTerm);
    if (!term) return list;

    return list.filter((p) => {
      return (
        normalizeText(p.id).includes(term) ||
        normalizeText(p.material || p.name).includes(term) ||
        normalizeText(p.descripcion).includes(term) ||
        normalizeText(p.condicion).includes(term) ||
        normalizeText(p.ubicacion || p.location).includes(term) ||
        normalizeText(p.ubicacion_estante || p.caja).includes(term)
      );
    });
  }, [rawPapeleria, filterStockPapeleria, filterCajaPapeleria, searchTerm]);

  // Filtrado reactivo de Mobiliario
  const mobiliarioFiltrado = useMemo(() => {
    let list = rawMobiliario;
    if (filterSedeMobiliario !== 'todas') {
      const targetSede = normalizeText(filterSedeMobiliario);
      list = rawMobiliario.filter((m) => {
        const uSede = normalizeText(m.sede || m.ubicacion);
        return uSede.includes(targetSede) || targetSede.includes(uSede);
      });
    }

    const term = normalizeText(searchTerm);
    if (!term) return list;

    return list.filter((m) => {
      return (
        normalizeText(m.placa || m.id || m.code).includes(term) ||
        normalizeText(m.nombre || m.material || m.name).includes(term) ||
        normalizeText(m.sede || m.ubicacion).includes(term) ||
        normalizeText(m.ubicacion_estante).includes(term) ||
        normalizeText(m.responsable).includes(term)
      );
    });
  }, [rawMobiliario, filterSedeMobiliario, searchTerm]);

  // Paginación de Papelería (5 filas por página)
  const totalPapeleriaPages = Math.max(1, Math.ceil(papeleriaFiltrada.length / ITEMS_PER_PAGE));
  const currentPapeleriaPage = Math.min(papeleriaPage, totalPapeleriaPages);
  const paginatedPapeleria = useMemo(() => {
    const start = (currentPapeleriaPage - 1) * ITEMS_PER_PAGE;
    return papeleriaFiltrada.slice(start, start + ITEMS_PER_PAGE);
  }, [papeleriaFiltrada, currentPapeleriaPage]);

  // Paginación de Mobiliario (5 filas por página)
  const totalMobiliarioPages = Math.max(1, Math.ceil(mobiliarioFiltrado.length / ITEMS_PER_PAGE));
  const currentMobiliarioPage = Math.min(mobiliarioPage, totalMobiliarioPages);
  const paginatedMobiliario = useMemo(() => {
    const start = (currentMobiliarioPage - 1) * ITEMS_PER_PAGE;
    return mobiliarioFiltrado.slice(start, start + ITEMS_PER_PAGE);
  }, [mobiliarioFiltrado, currentMobiliarioPage]);

  // Handlers para Nuevo Insumo de Papelería y Mobiliario
  const handleOpenCreatePapeleria = () => {
    // Autogenerar código sugerido con formato PapeXXXX según el consecutivo o correlativo
    const papeNumbers = (rawPapeleria || [])
      .map((p) => {
        const m = String(p.id || '').match(/pape(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);
    const maxNum = papeNumbers.length > 0 ? Math.max(...papeNumbers) : 2011;
    const siguienteCodigo = `Pape${maxNum + 1}`;

    setFormDataNuevo({
      ...initialFormNuevo,
      id: siguienteCodigo,
      material: '',
      categoria: 'Papelería',
      ubicacion: 'Oficina FMO',
      ubicacion_estante: 'CAJA #1',
      disponible: 10,
      minimo: 3,
      condicion: 'Nuevos',
      estado: 'Bueno',
      descripcion: '',
    });
    setPasoActualNuevo(1);
    setModalNuevoOpen(true);
  };

  const handleOpenCreateMobiliario = () => {
    setFormDataNuevoEquipo({
      ...initialFormNuevoEquipo,
      placa: `MOB-${Date.now().toString().slice(-4)}`,
      nombre: '',
      categoria: 'Mobiliario',
      area: 'Infraestructura',
      ubicacion: 'Oficina Medellín',
      ubicacion_estante: 'Zona Lab 1',
      condicion: 'Buen Estado',
    });
    setPasoActualEquipo(1);
    setModalNuevoEquipoOpen(true);
  };

  // Eliminación / Baja con confirmación para Papelería y Mobiliario
  const handleDeletePapeleria = (item) => {
    showConfirmBaja({
      codigo: item.id,
      nombre: item.material || item.name,
      onConfirm: async () => {
        setLocalPapeleria((prev) => prev.filter((p) => p.id !== item.id));
        try {
          await inventoryApi.remove(item.id);
        } catch (e) {
          // OK si es ítem local
        }
      },
    });
  };

  const handleDeleteMobiliario = (item) => {
    const code = item.placa || item.code || item.id;
    showConfirmBaja({
      codigo: code,
      nombre: item.nombre || item.material || item.name,
      onConfirm: async () => {
        setLocalMobiliario((prev) => prev.filter((m) => m.id !== item.id && m.placa !== item.placa));
        try {
          await inventoryApi.remove(code);
        } catch (e) {
          // OK si es ítem local
        }
      },
    });
  };

  // Conteos dinámicos para los botones de estado de stock en consumibles
  const countConsumiblesTodos = rawConsumibles.length;
  const countConsumiblesMinimo = useMemo(() => {
    return rawConsumibles.filter((c) => {
      const disp = Number(c.disponible ?? c.quantity ?? 0);
      const min = Number(c.minimo ?? c.minStock ?? 5);
      return disp <= min;
    }).length;
  }, [rawConsumibles]);

  const countConsumiblesOptimo = useMemo(() => {
    return rawConsumibles.filter((c) => {
      const disp = Number(c.disponible ?? c.quantity ?? 0);
      const min = Number(c.minimo ?? c.minStock ?? 5);
      return disp > min;
    }).length;
  }, [rawConsumibles]);

  // Consumibles filtrados por stock según el botón seleccionado ('todos' | 'minimo' | 'optimo') y buscador reactivo
  const consumibles = useMemo(() => {
    let list = rawConsumibles;
    if (filterStockConsumibles === 'minimo') {
      list = rawConsumibles.filter((c) => {
        const disp = Number(c.disponible ?? c.quantity ?? 0);
        const min = Number(c.minimo ?? c.minStock ?? 5);
        return disp <= min;
      });
    } else if (filterStockConsumibles === 'optimo') {
      list = rawConsumibles.filter((c) => {
        const disp = Number(c.disponible ?? c.quantity ?? 0);
        const min = Number(c.minimo ?? c.minStock ?? 5);
        return disp > min;
      });
    }

    const term = normalizeText(searchTerm);
    if (!term) return list;

    return list.filter((c) => {
      return (
        normalizeText(c.id).includes(term) ||
        normalizeText(c.material || c.name).includes(term) ||
        normalizeText(c.categoria || c.category).includes(term) ||
        normalizeText(c.ubicacion || c.location).includes(term) ||
        normalizeText(c.ubicacion_estante).includes(term)
      );
    });
  }, [rawConsumibles, filterStockConsumibles, searchTerm]);

  // Reset de paginación consistente al cambiar búsqueda global o filtros
  useEffect(() => {
    setEquiposPage(1);
    setConsumiblesPage(1);
  }, [searchTerm, filterSede, filterStatus, filterStockConsumibles]);

  // Render plano de todas las unidades de equipos devueltas por PostgreSQL / Supabase
  const rawEquiposUnits = useMemo(() => {
    const list = [];
    equipos.forEach((eq) => {
      if (eq.units && eq.units.length > 0) {
        eq.units.forEach((u) => {
          list.push({
            parentItemId: eq.id,
            parentName: eq.nombre || eq.name,
            nombre: eq.nombre || eq.name,
            parentCategory: eq.categoria || eq.category,
            baseLocation: eq.ubicacion || eq.location || u.baseLocation || (u.sede ? `Sede ${u.sede}` : 'Bodega'),
            ubicacion: eq.ubicacion || eq.location || u.ubicacion || u.baseLocation || (u.sede ? `Sede ${u.sede}` : 'Bodega'),
            ubicacion_estante: u.ubicacion_estante || eq.ubicacion_estante || '',
            sede: u.sede || eq.sede || 'Medellín',
            estado: eq.estado || (u.status === 'prestado' ? 'En campo' : 'Disponible'),
            responsable: u.responsable || eq.responsable || eq.custodio || '—',
            modelo: u.model || u.modelo || eq.modelo || eq.model || 'General',
            serial: u.serial || eq.serial || '—',
            placa: u.placa || u.code || eq.placa || eq.id || '—',
            code: u.code || u.placa || eq.placa || eq.id || '—',
            ...u,
          });
        });
      } else {
        // En caso de activo plano sin array units
        list.push({
          parentItemId: eq.id,
          parentName: eq.nombre || eq.name,
          nombre: eq.nombre || eq.name,
          parentCategory: eq.categoria || eq.category,
          code: eq.placa || eq.codigoItem || eq.id || 'SIN-COD',
          placa: eq.placa || eq.id || '—',
          model: eq.modelo || eq.model || 'General',
          modelo: eq.modelo || eq.model || 'General',
          serial: eq.serial || '—',
          sede: eq.sede || 'Medellín',
          estado: eq.estado || 'Disponible',
          status: eq.estado ? (eq.estado === 'En campo' ? 'prestado' : eq.estado.toLowerCase()) : 'disponible',
          baseLocation: eq.ubicacion || eq.location || (eq.sede ? `Sede ${eq.sede}` : 'Bodega'),
          ubicacion: eq.ubicacion || eq.location || (eq.sede ? `Sede ${eq.sede}` : 'Bodega'),
          ubicacion_estante: eq.ubicacion_estante || '',
          responsable: eq.responsable || eq.custodio || '—',
        });
      }
    });
    return list;
  }, [equipos]);

  // Total de equipos registrados sin filtrar
  const totalEquiposRegistrados = rawEquiposUnits.length;

  // Render plano con filtros y buscador reactivo
  const allEquiposUnits = useMemo(() => {
    const term = normalizeText(searchTerm);

    return rawEquiposUnits.filter((u) => {
      // 1. Buscador global reactivo (coincidencias ignorando mayúsculas/minúsculas y acentos)
      // Placa / Código (item.placa o item.id)
      // Nombre y Modelo (item.nombre, item.modelo)
      // Serial (item.serial)
      // Responsable (item.responsable)
      const matchSearch =
        !term ||
        normalizeText(u.placa).includes(term) ||
        normalizeText(u.code).includes(term) ||
        normalizeText(u.parentItemId).includes(term) ||
        normalizeText(u.id).includes(term) ||
        normalizeText(u.nombre).includes(term) ||
        normalizeText(u.parentName).includes(term) ||
        normalizeText(u.modelo).includes(term) ||
        normalizeText(u.model).includes(term) ||
        normalizeText(u.serial).includes(term) ||
        normalizeText(u.responsable).includes(term) ||
        normalizeText(u.custodio).includes(term) ||
        normalizeText(u.ubicacion_estante).includes(term) ||
        normalizeText(u.ubicacion).includes(term) ||
        normalizeText(u.parentCategory).includes(term);

      // 2. Filtro Sede / Municipio: filtra por item.ubicacion o item.sede
      const targetSede = normalizeText(filterSede);
      const uSede = normalizeText(u.sede);
      const uUbicacion = normalizeText(u.ubicacion || u.baseLocation);
      const matchSede =
        targetSede === 'todas' ||
        !targetSede ||
        uSede === targetSede ||
        uUbicacion.includes(targetSede) ||
        targetSede.includes(uSede);

      // 3. Filtro Estado: filtra por item.estado ("Disponible", "En campo", etc.)
      const targetStatus = normalizeText(filterStatus);
      const uEstado = normalizeText(u.estado);
      const uStatus = normalizeText(u.status);
      let matchStatus = targetStatus === 'todos' || !targetStatus;
      if (!matchStatus) {
        if (targetStatus === 'disponible') {
          matchStatus = uStatus === 'disponible' || uEstado === 'disponible';
        } else if (targetStatus === 'prestado' || targetStatus === 'en campo') {
          matchStatus = uStatus === 'prestado' || uEstado.includes('campo') || uStatus.includes('campo');
        } else if (targetStatus === 'mantenimiento' || targetStatus.includes('repara')) {
          matchStatus = uStatus === 'mantenimiento' || uEstado.includes('mantenimiento') || uEstado.includes('repara');
        } else if (targetStatus === 'baja' || targetStatus === 'de baja') {
          matchStatus = uStatus === 'baja' || uEstado.includes('baja');
        } else {
          matchStatus = uStatus === targetStatus || uEstado === targetStatus;
        }
      }

      return matchSearch && matchSede && matchStatus;
    });
  }, [rawEquiposUnits, searchTerm, filterSede, filterStatus]);

  // Modal de movimiento rápido de stock (Ingreso / Salida)
  const [stockMovementModal, setStockMovementModal] = useState(null); // { item, type: 'ingreso' | 'salida' }
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // Modal de detalle sólo lectura para CRUD (estados solicitados)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState(null);
  const [editConsumibleSubmitting, setEditConsumibleSubmitting] = useState(false);
  const [formDataEditar, setFormDataEditar] = useState({});
  const [pasoActual, setPasoActual] = useState(1);

  // Estados para Wizard Form de Nuevo Consumible
  const initialFormNuevo = {
    id: '',
    material: '',
    categoria: 'Robótica',
    ubicacion: 'Oficina FMO',
    ubicacion_estante: '',
    disponible: 10,
    minimo: 5,
    caracteristicas: '',
    estado: 'Bueno',
    condicion: 'Nuevo',
    descripcion: '',
    valor_compra: '',
    fecha_compra: '',
    fecha_vencimiento_garantia: '',
    observaciones: '',
  };
  const [formDataNuevo, setFormDataNuevo] = useState(initialFormNuevo);
  const [pasoActualNuevo, setPasoActualNuevo] = useState(1);

  // Estados para Wizard Form de Nuevo Equipo Tecnológico (21 campos organizados en 3 pasos)
  const initialFormNuevoEquipo = {
    // PASO 1: Identificación y Clasificación
    placa: '',
    nombre: '',
    categoria: 'Portátiles',
    condicion: 'Nuevo',
    cantidad: 1,
    area: 'Tecnología',
    descripcion: '',

    // PASO 2: Ficha Técnica y Asignación
    marca: '',
    modelo: '',
    serial: '',
    caracteristica_1: '',
    caracteristica_2: '',
    caracteristica_3: '',
    ubicacion: 'Oficina Medellín',
    ubicacion_estante: '',
    responsable: 'Bodega Central',

    // PASO 3: Adquisición, Garantía y Accesos
    proveedor: '',
    valor_compra: '',
    valor_total: '',
    fecha_compra: '',
    fecha_vencimiento_garantia: '',
    claves_otros: '',
    observaciones: '',
  };
  const [modalNuevoEquipoOpen, setModalNuevoEquipoOpen] = useState(false);
  const [formDataNuevoEquipo, setFormDataNuevoEquipo] = useState(initialFormNuevoEquipo);
  const [pasoActualEquipo, setPasoActualEquipo] = useState(1);
  const [newEquipoSubmitting, setNewEquipoSubmitting] = useState(false);

  // Estados para Wizard Form de Editar Equipo Tecnológico (3 Pasos)
  const [modalEditarEquipoOpen, setModalEditarEquipoOpen] = useState(false);
  const [equipoParaEditar, setEquipoParaEditar] = useState(null);
  const [formDataEditarEquipo, setFormDataEditarEquipo] = useState(initialFormNuevoEquipo);
  const [pasoActualEditarEquipo, setPasoActualEditarEquipo] = useState(1);
  const [editEquipoSubmitting, setEditEquipoSubmitting] = useState(false);

  const [consumibleSeleccionado, setConsumibleSeleccionado] = useState(null);
  const itemSeleccionado = consumibleSeleccionado;
  const setItemSeleccionado = setConsumibleSeleccionado;
  const [newConsumibleSubmitting, setNewConsumibleSubmitting] = useState(false);

  // Modal de QR para Consumible

  // Sincronizar datos del formulario cuando cambia el equipo a editar o abre el modal
  useEffect(() => {
    if (equipoParaEditar) {
      setFormDataEditarEquipo({
        placa: equipoParaEditar.placa || equipoParaEditar.codigo || (equipoParaEditar.units && equipoParaEditar.units[0]?.placa) || '',
        nombre: equipoParaEditar.nombre || equipoParaEditar.equipo || equipoParaEditar.material || equipoParaEditar.name || '',
        categoria: equipoParaEditar.categoria || equipoParaEditar.category || 'Portátiles',
        condicion: equipoParaEditar.condicion || equipoParaEditar.estado_fisico || equipoParaEditar.estado || 'Bueno',
        cantidad: 1,
        area: equipoParaEditar.area || 'Tecnología',
        ubicacion: equipoParaEditar.ubicacion || equipoParaEditar.sede || equipoParaEditar.location || 'Oficina Medellín',
        ubicacion_estante: equipoParaEditar.ubicacion_estante || (equipoParaEditar.units && equipoParaEditar.units[0]?.ubicacion_estante) || '',
        descripcion: (equipoParaEditar.descripcion && equipoParaEditar.descripcion !== 'Sin descripción general registrada.')
          ? equipoParaEditar.descripcion
          : '',
        marca: equipoParaEditar.marca || (equipoParaEditar.units && equipoParaEditar.units[0]?.marca) || '',
        modelo: equipoParaEditar.modelo || (equipoParaEditar.units && equipoParaEditar.units[0]?.model) || '',
        serial: equipoParaEditar.serial || (equipoParaEditar.units && equipoParaEditar.units[0]?.serial) || '',
        caracteristica_1: equipoParaEditar.caracteristica_1 || '',
        caracteristica_2: equipoParaEditar.caracteristica_2 || '',
        caracteristica_3: equipoParaEditar.caracteristica_3 || '',
        responsable: equipoParaEditar.responsable || equipoParaEditar.custodio || 'Bodega Central',
        proveedor: equipoParaEditar.proveedor || '',
        valor_compra: equipoParaEditar.valor_compra ?? equipoParaEditar.valor_unitario ?? '',
        valor_total: equipoParaEditar.valor_total ?? '',
        fecha_compra: equipoParaEditar.fecha_compra ? equipoParaEditar.fecha_compra.split('T')[0] : '',
        fecha_vencimiento_garantia: equipoParaEditar.fecha_vencimiento_garantia || equipoParaEditar.garantia ? (equipoParaEditar.fecha_vencimiento_garantia || equipoParaEditar.garantia).split('T')[0] : '',
        claves_otros: equipoParaEditar.claves_otros || '',
        observaciones: equipoParaEditar.observaciones || equipoParaEditar.notas || equipoParaEditar.notes || '',
      });
    }
  }, [equipoParaEditar, modalEditarEquipoOpen]);

  // Modal de QR para Consumible
  const [qrConsumibleItem, setQrConsumibleItem] = useState(null);

  // Manejador para eliminar consumible con confirmación previa institucional
  const handleDeleteConsumable = (item) => {
    const nombre = item.material || item.name;
    const codigo = item.id;

    showConfirmBaja({
      codigo,
      nombre,
      onConfirm: async () => {
        try {
          setLocalLoading(true);
          await inventoryApi.remove(codigo);

          if (onRetireItem) {
            await onRetireItem(codigo);
          }

          if (onRetry) {
            await onRetry();
          } else {
            const [activosData, consumiblesData] = await Promise.all([
              inventoryApi.getActivos(),
              inventoryApi.getConsumibles(),
            ]);
            const loaded = [];
            if (Array.isArray(consumiblesData)) {
              consumiblesData.forEach((c) => {
                loaded.push(mapConsumibleItem(c));
              });
            }
            if (Array.isArray(activosData)) {
              activosData.forEach((a) => {
                loaded.push(mapEquipoItem(a));
              });
            }
            setLocalItems(loaded);
          }
        } catch (err) {
          showError('Error al dar de baja material', err.message || 'Error del servidor');
        } finally {
          setLocalLoading(false);
        }
      },
    });
  };

  // Paginación para Consumibles (5 filas por página para vista compacta sin scroll vertical)
  const [consumiblesPage, setConsumiblesPage] = useState(1);
  const totalConsumiblesPages = Math.max(1, Math.ceil(consumibles.length / ITEMS_PER_PAGE));
  const currentConsumiblesPage = Math.min(consumiblesPage, totalConsumiblesPages);

  const paginatedConsumibles = useMemo(() => {
    const start = (currentConsumiblesPage - 1) * ITEMS_PER_PAGE;
    return consumibles.slice(start, start + ITEMS_PER_PAGE);
  }, [consumibles, currentConsumiblesPage]);

  // Paginación para Equipos Tecnológicos (5 filas por página)
  const [equiposPage, setEquiposPage] = useState(1);
  const totalEquiposPages = Math.max(1, Math.ceil(allEquiposUnits.length / ITEMS_PER_PAGE));
  const currentEquiposPage = Math.min(equiposPage, totalEquiposPages);

  const paginatedEquiposUnits = useMemo(() => {
    const start = (currentEquiposPage - 1) * ITEMS_PER_PAGE;
    return allEquiposUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [allEquiposUnits, currentEquiposPage]);

  // Manejador para dar de baja / eliminar activo tecnológico con confirmación institucional
  const handleDeleteEquipo = (u) => {
    const placa = u.placa || u.code;
    const nombre = u.parentName || u.nombre;

    showConfirmBaja({
      codigo: placa,
      nombre,
      onConfirm: async () => {
        try {
          setLocalLoading(true);
          await inventoryApi.remove(placa);

          if (onRetireItem) {
            await onRetireItem(u.parentItemId, placa);
          }

          if (onRetry) {
            await onRetry();
          } else {
            const [activosData, consumiblesData] = await Promise.all([
              inventoryApi.getActivos(),
              inventoryApi.getConsumibles(),
            ]);
            const loaded = [];
            if (Array.isArray(consumiblesData)) {
              consumiblesData.forEach((c) => {
                loaded.push(mapConsumibleItem(c));
              });
            }
            if (Array.isArray(activosData)) {
              activosData.forEach((a) => {
                loaded.push(mapEquipoItem(a));
              });
            }
            setLocalItems(loaded);
          }
        } catch (err) {
          showError('Error al dar de baja activo', err.message || 'Error del servidor');
        } finally {
          setLocalLoading(false);
        }
      },
    });
  };

  // Descargar reporte Excel maestro multi-hoja institucional (.xlsx) Fundación Marina Orth
  const handleDescargarReporteExcel = async () => {
    try {
      // Usar los activos actuales de la vista si están filtrados o consultar toda la base de datos
      const dataActivos = allEquiposUnits && allEquiposUnits.length > 0 ? allEquiposUnits : rawEquiposUnits;
      await exportarLibroMaestroExcelFMO({
        activos: dataActivos.length > 0 ? dataActivos : undefined,
      });
    } catch (error) {
      console.error('Error al exportar reporte Excel:', error);
      showError('Error al exportar', `No se pudo generar el reporte Excel: ${error.message || 'Error inesperado'}`);
    }
  };

  // Función para autocalcular el siguiente consecutivo de la secuencia P (ej: P1, P2... P57)
  const calcularSiguientePlacaP = (listaUnidades = []) => {
    const listado = Array.isArray(listaUnidades) && listaUnidades.length > 0 ? listaUnidades : (rawEquiposUnits || []);
    const numerosP = listado
      .map((a) => a.placa || a.code || a.id)
      .filter(Boolean)
      .map((p) => {
        const match = String(p).trim().match(/^P(\d+)$/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null);

    const maxP = numerosP.length > 0 ? Math.max(...numerosP) : 0;
    return `P${maxP + 1}`;
  };

  // Función para autocalcular el siguiente consecutivo de la secuencia Rob (ej: Rob0001 ... Rob0142 -> Rob0143)
  const calcularSiguienteCodigoRob = (listaConsumibles = []) => {
    const listado = Array.isArray(listaConsumibles) && listaConsumibles.length > 0 ? listaConsumibles : (rawConsumibles || []);
    const numerosRob = listado
      .map((c) => c.id || c.codigo)
      .filter(Boolean)
      .map((id) => {
        const match = String(id).trim().match(/^Rob(\d+)$/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null);

    const maxRob = numerosRob.length > 0 ? Math.max(...numerosRob) : 142;
    const siguienteNumero = maxRob + 1;
    return `Rob${String(siguienteNumero).padStart(4, '0')}`;
  };

  // Manejador apertura creación
  const handleOpenCreate = (type) => {
    if (type === 'consumible') {
      const siguienteCodigoRob = calcularSiguienteCodigoRob(rawConsumibles);
      setFormDataNuevo({
        ...initialFormNuevo,
        id: siguienteCodigoRob,
      });
      setPasoActualNuevo(1);
      setModalNuevoOpen(true);
      return;
    }
    if (type === 'equipo') {
      const siguientePlaca = calcularSiguientePlacaP(rawEquiposUnits);
      setFormDataNuevoEquipo({
        ...initialFormNuevoEquipo,
        placa: siguientePlaca,
      });
      setPasoActualEquipo(1);
      setModalNuevoEquipoOpen(true);
      return;
    }
    setEditingItem(null);
    setModalItemType(type);
    setUnidades([{ placa: '', modelo: '', serial: '' }]);
    setShowItemModal(true);
  };

  // Manejador para el registro de Nuevo Equipo Tecnológico en el Backend
  const handleSubmitNuevoEquipo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const placa = (formDataNuevoEquipo.placa || formDataNuevoEquipo.id || '').trim();
    const nombre = formDataNuevoEquipo.nombre?.trim();
    const categoria = formDataNuevoEquipo.categoria?.trim() || 'Equipos de Cómputo';
    const condicion = formDataNuevoEquipo.condicion || 'Nuevo';
    const cantidad = Number(formDataNuevoEquipo.cantidad) || 1;
    const area = formDataNuevoEquipo.area?.trim() || 'Tecnología';
    const descripcion = formDataNuevoEquipo.descripcion?.trim() || '';

    // Ficha técnica
    const marca = formDataNuevoEquipo.marca?.trim() || categoria;
    const modelo = formDataNuevoEquipo.modelo?.trim() || '';
    const serial = formDataNuevoEquipo.serial?.trim();
    const caracteristica_1 = formDataNuevoEquipo.caracteristica_1?.trim() || '';
    const caracteristica_2 = formDataNuevoEquipo.caracteristica_2?.trim() || '';
    const caracteristica_3 = formDataNuevoEquipo.caracteristica_3?.trim() || '';
    const ubicacion = formDataNuevoEquipo.ubicacion?.trim() || 'Oficina Medellín';
    const ubicacion_estante = formDataNuevoEquipo.ubicacion_estante?.trim() || '';
    const responsable = formDataNuevoEquipo.responsable?.trim() || 'Bodega Central';

    // Adquisición
    const proveedor = formDataNuevoEquipo.proveedor?.trim() || '';
    const valor_compra = formDataNuevoEquipo.valor_compra !== '' ? Number(formDataNuevoEquipo.valor_compra) : null;
    const valor_total = formDataNuevoEquipo.valor_total !== '' ? Number(formDataNuevoEquipo.valor_total) : null;
    const fecha_compra = formDataNuevoEquipo.fecha_compra || null;
    const fecha_vencimiento_garantia = formDataNuevoEquipo.fecha_vencimiento_garantia || null;
    const claves_otros = formDataNuevoEquipo.claves_otros?.trim() || '';
    const observaciones = formDataNuevoEquipo.observaciones?.trim() || '';

    // Validaciones de campos requeridos
    if (!placa) {
      showError('Validación', 'La Placa / Código del equipo es obligatorio.');
      setPasoActualEquipo(1);
      return;
    }

    // Verificar unicidad de la placa en los registros actuales
    const placaExiste = (rawEquiposUnits || []).some(
      (u) => String(u.placa || u.code || '').trim().toLowerCase() === placa.toLowerCase()
    );
    if (placaExiste) {
      showError('Placa Duplicada', `La placa o código "${placa}" ya se encuentra registrada en otro equipo tecnológico. Por favor ingresa una placa única.`);
      setPasoActualEquipo(1);
      return;
    }

    if (!nombre) {
      showError('Validación', 'El Nombre del equipo es obligatorio.');
      setPasoActualEquipo(1);
      return;
    }
    if (!serial) {
      showError('Validación', 'El Serial del equipo es obligatorio.');
      setPasoActualEquipo(2);
      return;
    }

    try {
      setNewEquipoSubmitting(true);

      // Consolidar notas con características y observaciones
      const specList = [caracteristica_1, caracteristica_2, caracteristica_3].filter(Boolean).join(' | ');
      const combinedNotes = [
        descripcion,
        specList ? `Características: ${specList}` : null,
        proveedor ? `Proveedor: ${proveedor}` : null,
        claves_otros ? `Accesos/Claves: ${claves_otros}` : null,
        observaciones ? `Notas: ${observaciones}` : null
      ].filter(Boolean).join('\n');

      // 1. Enviar directamente al endpoint de activos de la API
      const activoPayload = {
        placa,
        nombre,
        marca: marca || categoria,
        modelo: modelo || 'Estándar',
        serial,
        categoria,
        condicion,
        area,
        ubicacion,
        ubicacion_estante,
        sede: ubicacion.includes('Carmen') ? 'El Carmen' : 'Medellín',
        cantidad: 1,
        descripcion,
        caracteristica_1,
        caracteristica_2,
        caracteristica_3,
        responsable,
        custodio: responsable !== 'Bodega Central' ? responsable : null,
        estado: condicion || 'Disponible',
        proveedor,
        valor_compra,
        valor_total,
        fecha_compra,
        fecha_vencimiento_garantia,
        claves_otros,
        observaciones,
        fecha_devolucion: null,
      };

      const response = await fetch(`${API_BASE_URL}/api/activos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activoPayload),
      });

      const responseJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responseJson?.message || responseJson?.error || `Error ${response.status} al registrar equipo`);
      }

      // Asegurar persistencia completa de los 21 campos llamando al endpoint PUT de actualización de activos
      await fetch(`${API_BASE_URL}/api/activos/${encodeURIComponent(placa)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activoPayload),
      }).catch(() => null);

      // 2. Notificar al handler padre de la App si existe
      if (onAddItem) {
        await onAddItem({
          name: nombre,
          category: categoria,
          location: ubicacion,
          sede: ubicacion.includes('Carmen') ? 'El Carmen' : 'Medellín',
          notes: combinedNotes,
          minStock: 1,
          itemType: 'equipo',
          quantity: 0,
          unidades: [
            {
              code: placa,
              placa,
              model: modelo || 'Estándar',
              serial,
              sede: ubicacion.includes('Carmen') ? 'El Carmen' : 'Medellín',
              status: 'disponible',
              responsable,
            }
          ],
          unitsText: `${placa}, ${modelo || 'Estándar'}, ${serial}`,
        });
      }

      // 3. Refrescar inventario completo
      if (onRetry) {
        await onRetry();
      } else {
        const [activosData, consumiblesData] = await Promise.all([
          inventoryApi.getActivos(),
          inventoryApi.getConsumibles(),
        ]);
        const loaded = [];
        if (Array.isArray(consumiblesData)) {
          consumiblesData.forEach((c) => {
            loaded.push(mapConsumibleItem(c));
          });
        }
        if (Array.isArray(activosData)) {
          activosData.forEach((a) => {
            loaded.push(mapEquipoItem(a));
          });
        }
        setLocalItems(loaded);
      }

      // 4. Limpiar formulario y cerrar modal
      setFormDataNuevoEquipo({ ...initialFormNuevoEquipo });
      setPasoActualEquipo(1);
      setModalNuevoEquipoOpen(false);

      // Notificación institucional FMO STEAM para nuevo equipo
      showNewItemSuccess({
        nombre: nombre || 'Equipo Tecnológico',
        codigo: placa,
        sedeOUbicacion: ubicacion || 'Inventario Institucional',
      });
    } catch (err) {
      showError('Error al registrar equipo', err.message || 'Error del servidor');
    } finally {
      setNewEquipoSubmitting(false);
    }
  };

  // Manejador apertura edición
  const handleOpenEdit = (item) => {
    if (!item) return;
    const esEquipo = Boolean(item.isEquipo || item.itemType === 'equipo' || item.serial || item.placa || item.marca || item.units);
    if (esEquipo) {
      handleOpenEditarEquipo(item);
      return;
    }
    handleOpenEditarConsumible(item);
  };

  // Abrir modal de edición para equipo tecnológico consultando en tiempo real a la API/BD
  const handleAbrirEditarEquipo = async (equipo) => {
    if (!equipo) return;
    setPasoActualEditarEquipo(1);

    try {
      const idOPlaca = (equipo.placa || (equipo.units && equipo.units[0]?.placa) || equipo.code || equipo.id || '').replace(/^eq-/, '').trim();
      // Petición directa para obtener los datos más recientes de Supabase / Backend
      const res = await fetch(`${API_BASE_URL}/api/activos/${encodeURIComponent(idOPlaca)}`);
      const data = await res.json().catch(() => null);

      const equipoFresco = (data && data.data) ? data.data : (data || equipo);

      // Sincronizar el estado del formulario con los datos en tiempo real
      setFormDataEditarEquipo({
        ...equipoFresco,
        placa: equipoFresco.placa || equipoFresco.codigo || idOPlaca || '',
        nombre: equipoFresco.nombre || equipoFresco.equipo || equipoFresco.material || equipoFresco.name || '',
        categoria: equipoFresco.categoria || equipoFresco.category || 'Portátiles',
        condicion: equipoFresco.condicion || equipoFresco.estado_fisico || equipoFresco.estado || 'Bueno',
        area: equipoFresco.area || 'Tecnología',
        ubicacion: equipoFresco.ubicacion || equipoFresco.sede || equipoFresco.location || 'Oficina Medellín',
        ubicacion_estante: equipoFresco.ubicacion_estante || '',
        cantidad: 1, // Fijo en 1
        descripcion: (equipoFresco.descripcion && equipoFresco.descripcion !== 'Sin descripción general registrada.')
          ? equipoFresco.descripcion
          : '',
        marca: equipoFresco.marca || '',
        modelo: equipoFresco.modelo || equipoFresco.model || '',
        serial: equipoFresco.serial || '',
        caracteristica_1: equipoFresco.caracteristica_1 || '',
        caracteristica_2: equipoFresco.caracteristica_2 || '',
        caracteristica_3: equipoFresco.caracteristica_3 || '',
        responsable: equipoFresco.responsable || equipoFresco.custodio || 'Bodega Central',
        proveedor: equipoFresco.proveedor || '',
        valor_compra: equipoFresco.valor_compra !== '' && equipoFresco.valor_compra != null ? equipoFresco.valor_compra : '',
        valor_total: equipoFresco.valor_total !== '' && equipoFresco.valor_total != null ? equipoFresco.valor_total : '',
        fecha_compra: equipoFresco.fecha_compra ? equipoFresco.fecha_compra.split('T')[0] : '',
        fecha_vencimiento_garantia: equipoFresco.fecha_vencimiento_garantia ? equipoFresco.fecha_vencimiento_garantia.split('T')[0] : (equipoFresco.garantia ? equipoFresco.garantia.split('T')[0] : ''),
        claves_otros: equipoFresco.claves_otros || '',
        observaciones: equipoFresco.observaciones || equipoFresco.notas || equipoFresco.notes || '',
      });

      setEquipoParaEditar(equipoFresco);
      setModalEditarEquipoOpen(true);
    } catch (error) {
      console.error('Error al consultar datos en tiempo real del equipo:', error);
      // Fallback al objeto actual si falla la red
      setFormDataEditarEquipo({
        ...equipo,
        placa: equipo.placa || equipo.codigo || equipo.code || equipo.id || '',
        nombre: equipo.nombre || equipo.equipo || equipo.material || equipo.name || '',
        categoria: equipo.categoria || equipo.category || 'Portátiles',
        condicion: equipo.condicion || equipo.estado_fisico || equipo.estado || 'Bueno',
        area: equipo.area || 'Tecnología',
        ubicacion: equipo.ubicacion || equipo.location || 'Oficina Medellín',
        ubicacion_estante: equipo.ubicacion_estante || '',
        cantidad: 1,
        descripcion: (equipo.descripcion && equipo.descripcion !== 'Sin descripción general registrada.')
          ? equipo.descripcion
          : '',
        marca: equipo.marca || '',
        modelo: equipo.modelo || equipo.model || '',
        serial: equipo.serial || '',
        caracteristica_1: equipo.caracteristica_1 || '',
        caracteristica_2: equipo.caracteristica_2 || '',
        caracteristica_3: equipo.caracteristica_3 || '',
        responsable: equipo.responsable || equipo.custodio || 'Bodega Central',
        proveedor: equipo.proveedor || '',
        valor_compra: equipo.valor_compra || '',
        valor_total: equipo.valor_total || '',
        fecha_compra: equipo.fecha_compra || '',
        fecha_vencimiento_garantia: equipo.fecha_vencimiento_garantia || '',
        claves_otros: equipo.claves_otros || '',
        observaciones: equipo.observaciones || '',
      });
      setEquipoParaEditar(equipo);
      setModalEditarEquipoOpen(true);
    }
  };
  const handleOpenEditarEquipo = handleAbrirEditarEquipo;

  // Enviar actualización de Equipo Tecnológico al backend
  const handleSubmitEditarEquipo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!equipoParaEditar) return;

    const placaIdentificador = (equipoParaEditar.placa || (equipoParaEditar.units && equipoParaEditar.units[0]?.placa) || equipoParaEditar.id || '').trim();
    const placaNueva = (formDataEditarEquipo.placa || placaIdentificador).trim();
    const nombre = formDataEditarEquipo.nombre?.trim();
    const serial = formDataEditarEquipo.serial?.trim();

    if (!placaNueva) {
      showError('Validación', 'La Placa / Código del equipo es obligatoria.');
      setPasoActualEditarEquipo(1);
      return;
    }
    if (!nombre) {
      showError('Validación', 'El Nombre del equipo es obligatorio.');
      setPasoActualEditarEquipo(1);
      return;
    }
    if (!serial) {
      showError('Validación', 'El Serial del equipo es obligatorio.');
      setPasoActualEditarEquipo(2);
      return;
    }

    try {
      setEditEquipoSubmitting(true);

      const payload = {
        nombre,
        equipo: nombre,
        marca: formDataEditarEquipo.marca?.trim() || formDataEditarEquipo.categoria || 'Estándar',
        modelo: formDataEditarEquipo.modelo?.trim() || 'Estándar',
        serial,
        categoria: formDataEditarEquipo.categoria || 'Portátiles',
        condicion: formDataEditarEquipo.condicion || 'Nuevo',
        area: formDataEditarEquipo.area?.trim() || 'Tecnología',
        ubicacion: formDataEditarEquipo.ubicacion?.trim() || 'Oficina Medellín',
        ubicacion_estante: formDataEditarEquipo.ubicacion_estante?.trim() || '',
        sede: formDataEditarEquipo.ubicacion?.includes('Carmen') ? 'El Carmen' : 'Medellín',
        cantidad: 1,
        descripcion: formDataEditarEquipo.descripcion?.trim() || '',
        caracteristica_1: formDataEditarEquipo.caracteristica_1?.trim() || '',
        caracteristica_2: formDataEditarEquipo.caracteristica_2?.trim() || '',
        caracteristica_3: formDataEditarEquipo.caracteristica_3?.trim() || '',
        responsable: formDataEditarEquipo.responsable?.trim() || 'Bodega Central',
        custodio: formDataEditarEquipo.responsable !== 'Bodega Central' ? formDataEditarEquipo.responsable : null,
        estado: formDataEditarEquipo.condicion || 'Disponible',
        proveedor: formDataEditarEquipo.proveedor?.trim() || '',
        valor_compra: formDataEditarEquipo.valor_compra !== '' ? formDataEditarEquipo.valor_compra : null,
        valor_total: formDataEditarEquipo.valor_total !== '' ? formDataEditarEquipo.valor_total : null,
        fecha_compra: formDataEditarEquipo.fecha_compra || null,
        fecha_vencimiento_garantia: formDataEditarEquipo.fecha_vencimiento_garantia || null,
        claves_otros: formDataEditarEquipo.claves_otros?.trim() || '',
        observaciones: formDataEditarEquipo.observaciones?.trim() || '',
      };

      // Intentar actualizar vía PUT /api/activos/:placa o /api/equipos/:id
      const res = await fetch(`${API_BASE_URL}/api/activos/${encodeURIComponent(placaIdentificador || placaNueva)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Fallback a /api/equipos/:id si la API usa equipos
        const fallbackRes = await fetch(`${API_BASE_URL}/api/equipos/${encodeURIComponent(equipoParaEditar.id || placaIdentificador)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => null);

        if (!fallbackRes || !fallbackRes.ok) {
          throw new Error(data?.message || data?.error || `Error ${res.status} al actualizar equipo`);
        }
      }
      // Sync selected item state after successful update con formato unificado
      const rawActualizado = data?.data || data;
      const equipoActualizado = rawActualizado ? mapEquipoItem(rawActualizado) : null;
      if (equipoActualizado) {
        setItemSeleccionado(equipoActualizado);
      }


      // Refrescar inventario
      await cargarConsumibles();
      setModalEditarEquipoOpen(false);
      setEquipoParaEditar(null);

      // Notificación Toast de Edición Exitosa Institucional
      showEditSuccess(formDataEditarEquipo.nombre || formDataEditarEquipo.placa || placaNueva);
    } catch (err) {
      showError('Error al guardar cambios', err.message || 'Error del servidor');
    } finally {
      setEditEquipoSubmitting(false);
    }
  };

  // Abrir modal de edición para consumibles con pre-llenado
  const handleOpenEditarConsumible = (item) => {
    setItemParaEditar(item);
    setPasoActual(1);
    const esPapeleria = activeTab === 'papeleria' || item.categoria === 'Papelería' || item.category === 'Papelería' || item.subtipo === 'papeleria' || String(item.id || '').toLowerCase().startsWith('pape');
    setFormDataEditar({
      id: item.id || item.placa || item.codigo || '',
      material: item.material || item.name || '',
      categoria: esPapeleria ? 'Papelería' : (item.categoria || item.category || 'Robótica'),
      subtipo: esPapeleria ? 'papeleria' : (item.subtipo || 'robotica'),
      ubicacion: item.ubicacion || item.location || 'Oficina FMO',
      ubicacion_estante: item.ubicacion_estante || '',
      disponible: item.disponible ?? item.quantity ?? 0,
      minimo: item.minimo ?? item.minStock ?? (esPapeleria ? 3 : 5),
      caracteristicas: item.caracteristicas || '',
      estado: item.estado || 'Bueno',
      condicion: item.condicion || (esPapeleria ? 'Nuevos' : 'Nuevo'),
      descripcion: item.descripcion || item.description || '',
      valor_compra: item.valor_compra ?? item.valor_unitario ?? '',
      fecha_compra: item.fecha_compra ? item.fecha_compra.split('T')[0] : '',
      fecha_vencimiento_garantia: item.fecha_vencimiento_garantia || item.garantia ? (item.fecha_vencimiento_garantia || item.garantia).split('T')[0] : '',
      observaciones: item.observaciones || item.notas || item.notes || '',
    });
    setModalEditarOpen(true);
  };

  // Enviar actualización de consumible al backend PUT /api/consumibles/:id
  const handleSubmitEditarConsumible = async (e) => {
    e.preventDefault();
    if (!itemParaEditar) return;

    const idOriginal = itemParaEditar.id;
    const nuevoId = (formDataEditar.id || '').trim();
    const esPapeleria = activeTab === 'papeleria' || itemParaEditar.subtipo === 'papeleria' || itemParaEditar.categoria === 'Papelería' || String(itemParaEditar.id || '').toLowerCase().startsWith('pape');

    // Validación de código / placa para consumibles y papelería
    if (!nuevoId) {
      showError('Validación', `El código o placa del ${esPapeleria ? 'insumo de papelería' : 'consumible'} es obligatorio.`);
      setPasoActual(1);
      return;
    }
    if (nuevoId.toLowerCase() !== String(idOriginal).toLowerCase()) {
      const listToCheck = esPapeleria ? rawPapeleria : rawConsumibles;
      const idDuplicado = (listToCheck || []).some(
        (c) => String(c.id || '').trim().toLowerCase() === nuevoId.toLowerCase() && String(c.id).toLowerCase() !== String(idOriginal).toLowerCase()
      );
      if (idDuplicado) {
        showError('Código / Placa Duplicado', `El código o placa "${nuevoId}" ya está en uso.`);
        setPasoActual(1);
        return;
      }
    }

    try {
      setEditConsumibleSubmitting(true);
      const categoriaFinal = esPapeleria ? 'Papelería' : (formDataEditar.categoria?.trim() || 'Robótica');
      const finalId = nuevoId || idOriginal;
      const payload = {
        id: finalId,
        nuevo_id: finalId,
        placa: finalId,
        codigo: finalId,
        material: formDataEditar.material?.trim(),
        categoria: categoriaFinal,
        category: categoriaFinal,
        subtipo: esPapeleria ? 'papeleria' : (formDataEditar.subtipo || 'robotica'),
        ubicacion: formDataEditar.ubicacion?.trim() || 'Oficina FMO',
        sede: formDataEditar.ubicacion?.trim() || 'Oficina FMO',
        ubicacion_estante: formDataEditar.ubicacion_estante?.trim() || '',
        caja: formDataEditar.ubicacion_estante?.trim() || '',
        disponible: parseInt(formDataEditar.disponible, 10) || 0,
        minimo: parseInt(formDataEditar.minimo, 10) || (esPapeleria ? 3 : 5),
        caracteristicas: formDataEditar.caracteristicas?.trim() || null,
        estado: formDataEditar.estado || 'Bueno',
        condicion: formDataEditar.condicion || (esPapeleria ? 'Nuevos' : 'Nuevo'),
        descripcion: formDataEditar.descripcion?.trim() || null,
        valor_compra: formDataEditar.valor_compra !== '' ? formDataEditar.valor_compra : null,
        fecha_compra: formDataEditar.fecha_compra || null,
        fecha_vencimiento_garantia: formDataEditar.fecha_vencimiento_garantia || null,
        observaciones: formDataEditar.observaciones?.trim() || null,
      };

      // Si el ítem es de papelería, actualizar en localPapeleria
      if (esPapeleria) {
        setLocalPapeleria((prev) =>
          prev.map((p) =>
            p.id === idOriginal
              ? {
                ...p,
                ...payload,
                id: finalId,
                placa: finalId,
                name: payload.material,
                quantity: payload.disponible,
                minStock: payload.minimo,
                location: payload.ubicacion,
                caja: payload.ubicacion_estante,
              }
              : p
          )
        );
      }

      // Actualizar estado local inmediato optimista
      setLocalItems((prev) =>
        prev.map((it) =>
          it.id === idOriginal
            ? {
                ...it,
                ...payload,
                id: finalId,
                placa: finalId,
                code: finalId,
                name: payload.material,
                material: payload.material,
                disponible: payload.disponible,
                quantity: payload.disponible,
                minimo: payload.minimo,
                minStock: payload.minimo,
                ubicacion: payload.ubicacion,
                location: payload.ubicacion,
                ubicacion_estante: payload.ubicacion_estante,
              }
            : it
        )
      );

      try {
        const primaryUrl = esPapeleria
          ? `${API_BASE_URL}/api/papeleria/${encodeURIComponent(idOriginal)}`
          : `${API_BASE_URL}/api/consumibles/${encodeURIComponent(idOriginal)}`;

        let res = await fetch(primaryUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        // Si era papelería y falla el endpoint puntual de papelería, intentar fallback a consumibles
        if (!res.ok && esPapeleria) {
          const fallbackUrl = `${API_BASE_URL}/api/consumibles/${encodeURIComponent(idOriginal)}`;
          res = await fetch(fallbackUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (res.ok) {
          await cargarConsumibles();
        }
      } catch (_) {
        // En caso de que no exista tabla en backend o falle la red, ya se encuentra reflejado optimistamente
      }

      setModalEditarOpen(false);
      setItemParaEditar(null);

      // Notificación Toast de Edición Exitosa Institucional
      showEditSuccess(formDataEditar.material || finalId);
    } catch (err) {
      showError('Error al guardar cambios', err.message || 'Error del servidor');
    } finally {
      setEditConsumibleSubmitting(false);
    }
  };

  // Función reutilizable para abrir el modal de consulta / detalle con datos locales o de backend
  const abrirModalDetalle = async (placaOCodigo, fallbackData = null) => {
    if (!placaOCodigo && !fallbackData) return;
    const searchCode = String(placaOCodigo || '').replace(/^eq-/, '').trim();

    // Buscar en el estado local de equipos
    const parent = equipos.find(e => {
      const p = String(e.placa || (e.units && e.units[0]?.placa) || e.code || e.id || '').replace(/^eq-/, '').trim();
      return p === searchCode;
    });

    const baseDetalle = {
      ...(parent || fallbackData || {}),
      id: searchCode || fallbackData?.id || fallbackData?.placa,
      placa: searchCode || fallbackData?.placa || fallbackData?.id,
      equipo: fallbackData?.parentName || fallbackData?.itemName || parent?.name || searchCode,
      nombre: fallbackData?.parentName || fallbackData?.itemName || parent?.name || searchCode,
      name: fallbackData?.parentName || fallbackData?.itemName || parent?.name || searchCode,
      categoria: parent?.categoria || fallbackData?.parentCategory || 'Portátiles',
      category: parent?.category || fallbackData?.parentCategory || 'Portátiles',
      condicion: parent?.condicion || fallbackData?.status || 'Bueno',
      area: parent?.area || 'Tecnología',
      ubicacion: parent?.ubicacion || `${fallbackData?.sede || 'Medellín'} - ${fallbackData?.baseLocation || 'Bodega'}`,
      ubicacion_estante: parent?.ubicacion_estante || fallbackData?.ubicacion_estante || '',
      cantidad: 1,
      disponible: (fallbackData?.status === 'disponible' || parent?.disponible) ? 1 : 0,
      minimo: 1,
      marca: parent?.marca || fallbackData?.marca || 'Estándar',
      modelo: fallbackData?.model || parent?.modelo || 'Estándar',
      serial: fallbackData?.serial || parent?.serial || '—',
      caracteristica_1: parent?.caracteristica_1 || '',
      caracteristica_2: parent?.caracteristica_2 || '',
      caracteristica_3: parent?.caracteristica_3 || '',
      responsable: (fallbackData?.status === 'prestado' ? (fallbackData?.responsable || fallbackData?.custodio || 'Custodio') : (parent?.responsable || 'Bodega Central')),
      proveedor: parent?.proveedor || '',
      valor_compra: parent?.valor_compra || null,
      valor_total: parent?.valor_total || null,
      fecha_compra: parent?.fecha_compra || null,
      fecha_vencimiento_garantia: parent?.fecha_vencimiento_garantia || null,
      claves_otros: parent?.claves_otros || '',
      observaciones: parent?.observaciones || parent?.notes || fallbackData?.motive || '',
      descripcion: parent?.descripcion || `Equipo registrado con serial ${fallbackData?.serial || parent?.serial || '—'} y modelo ${fallbackData?.model || parent?.modelo || 'Estándar'}.`,
      isEquipo: true,
    };

    setItemSeleccionado(baseDetalle);
    setModalDetalleOpen(true);

    // Consultar activo fresco desde backend para asegurar última versión sincronizada
    try {
      if (searchCode) {
        const activoFresco = await inventoryApi.getActivoByPlaca(searchCode);
        if (activoFresco) {
          setItemSeleccionado(mapEquipoItem(activoFresco));
        }
      }
    } catch (_) {
      // Fallback con datos locales si falla la petición puntual
    }
  };

  // Manejador para el registro de Nuevo Consumible con todos los campos
  const handleSubmitNuevoConsumible = async (e) => {
    e.preventDefault();

    const id = formDataNuevo.id?.trim();
    const material = formDataNuevo.material?.trim();
    const esPapeleria = activeTab === 'papeleria' || formDataNuevo.categoria === 'Papelería' || String(id || '').toLowerCase().startsWith('pape');
    const categoria = esPapeleria ? 'Papelería' : (formDataNuevo.categoria?.trim() || 'Robótica');
    const ubicacion = formDataNuevo.ubicacion?.trim() || 'Oficina FMO';
    const ubicacion_estante = formDataNuevo.ubicacion_estante?.trim() || '';
    const disponible = Number(formDataNuevo.disponible);
    const minimo = Number(formDataNuevo.minimo ?? (esPapeleria ? 3 : 5));

    // Validaciones de obligatorios
    if (!id) {
      showError('Validación', 'El código del ítem es obligatorio (ej: Pape2012 o Rob0143).');
      setPasoActualNuevo(1);
      return;
    }

    // Validación de unicidad: Verificar que el código no exista previamente en consumibles ni papelería
    const idExiste = (categoria === 'Papelería' ? rawPapeleria : rawConsumibles || []).some(
      (c) => String(c.id || c.codigo || '').trim().toLowerCase() === id.toLowerCase()
    );
    if (idExiste) {
      showError('Código Duplicado', `El código "${id}" ya se encuentra registrado para otro insumo. Por favor ingresa un código único.`);
      setPasoActualNuevo(1);
      return;
    }
    if (!material) {
      showError('Validación', 'El nombre del material es obligatorio.');
      setPasoActualNuevo(1);
      return;
    }
    if (!categoria) {
      showError('Validación', 'Debes seleccionar una categoría.');
      setPasoActualNuevo(1);
      return;
    }
    if (isNaN(disponible) || disponible < 0) {
      showError('Validación', 'La cantidad inicial debe ser un número mayor o igual a 0.');
      setPasoActualNuevo(1);
      return;
    }

    // Sección 2: Especificaciones Técnicas (Opcional)
    const descripcion = formDataNuevo.descripcion?.trim() || null;
    const caracteristicas = formDataNuevo.caracteristicas?.trim() || null;
    const estado = formDataNuevo.estado || 'Bueno';
    const condicion = formDataNuevo.condicion || 'Nuevos';

    // Sección 3: Datos de Compra y Observaciones (Opcional)
    const valor_compra = formDataNuevo.valor_compra !== '' && !isNaN(Number(formDataNuevo.valor_compra)) ? Number(formDataNuevo.valor_compra) : null;
    const fecha_compra = formDataNuevo.fecha_compra || null;
    const garantia = formDataNuevo.fecha_vencimiento_garantia || null;
    const observaciones = formDataNuevo.observaciones?.trim() || null;

    const payload = {
      id,
      material,
      name: material,
      categoria,
      category: categoria,
      disponible,
      quantity: disponible,
      minimo,
      minStock: minimo,
      ubicacion,
      location: ubicacion,
      ubicacion_estante,
      caja: ubicacion_estante,
      descripcion,
      description: descripcion,
      caracteristicas,
      estado,
      condicion,
      valor_compra,
      valor_unitario: valor_compra,
      fecha_compra,
      garantia,
      fecha_vencimiento_garantia: garantia,
      observaciones,
      notas: observaciones,
      itemType: 'consumible',
      subtipo: categoria === 'Papelería' ? 'papeleria' : 'robotica',
    };

    try {
      setNewConsumibleSubmitting(true);

      // Si es de papelería, registrar en localPapeleria
      if (categoria === 'Papelería') {
        setLocalPapeleria((prev) => {
          const sinEste = prev.filter((p) => p.id !== id);
          return [payload, ...sinEste];
        });
      }

      // 1. Enviar directamente a la API de consumibles con fetch POST
      try {
        const response = await fetch(`${API_BASE_URL}/api/consumibles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          await cargarConsumibles();
        }
      } catch (_) {
        // En caso de que el backend no tenga tabla o falle la red, ya se encuentra persistido en localPapeleria
      }

      // 2. Notificar al handler padre si existe
      if (onAddItem) {
        await onAddItem({
          name: material,
          category: categoria,
          location: ubicacion,
          sede: ubicacion || 'Oficina FMO',
          notes: observaciones || descripcion,
          minStock: minimo,
          itemType: 'consumible',
          quantity: disponible,
          ...payload,
        });
      }

      // 3. Limpiar formulario y cerrar modal
      setFormDataNuevo({ ...initialFormNuevo });
      setPasoActualNuevo(1);
      setModalNuevoOpen(false);

      // Notificación institucional FMO STEAM para nuevo insumo
      showNewItemSuccess({
        nombre: material || (categoria === 'Papelería' ? 'Insumo de Papelería' : 'Consumible de Robótica'),
        codigo: id,
        sedeOUbicacion: `${ubicacion || ''} ${ubicacion_estante || ''}`.trim() || 'Inventario Central',
      });
    } catch (err) {
      showError('Error al registrar consumible', err.message || 'Error del servidor');
    } finally {
      setNewConsumibleSubmitting(false);
    }
  };

  const handleCreateConsumableSubmit = handleSubmitNuevoConsumible;

  // Apertura modal de movimiento rápido
  const handleOpenMovementModal = (item, type) => {
    setStockMovementModal({ item, type });
    setMovementQty(1);
    setMovementReason('');
  };

  // Confirmar movimiento rápido (Ingreso / Salida) en Supabase
  const handleStockMovementSubmit = async (e) => {
    e.preventDefault();
    if (!stockMovementModal) return;

    const { item, type } = stockMovementModal;
    const qty = parseInt(movementQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showError('Cantidad Inválida', 'Por favor ingresa una cantidad válida mayor a 0');
      return;
    }

    const currentStock = Number(item.disponible ?? item.quantity ?? 0);
    if (type === 'salida' && qty > currentStock) {
      showError('Stock Insuficiente', `No puedes egresar más unidades (${qty}) de las disponibles en inventario (${currentStock}).`);
      return;
    }

    const newStock = type === 'ingreso' ? currentStock + qty : currentStock - qty;

    try {
      setMovementSubmitting(true);

      // Si es ítem de papelería, actualizar en localPapeleria
      if (item.subtipo === 'papeleria' || item.categoria === 'Papelería' || String(item.id).startsWith('Pape')) {
        setLocalPapeleria((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, disponible: newStock, quantity: newStock }
              : p
          )
        );
      }

      try {
        await inventoryApi.update(item.id, {
          disponible: newStock,
        });
      } catch (_) {
        // En caso de que no exista tabla en backend o falle la red, ya se encuentra reflejado en localPapeleria
      }

      // Refrescar inventario si corresponde
      if (onRetry) {
        await onRetry().catch(() => { });
      }

      setStockMovementModal(null);
      showInfo('Movimiento Registrado', `Se actualizó el stock de ${item.material || item.name} (${type === 'ingreso' ? `+${qty}` : `-${qty}`} unidades).`);
    } catch (err) {
      showError('Error de Movimiento', err.message || 'Error del servidor');
    } finally {
      setMovementSubmitting(false);
    }
  };

  // Envío del formulario con validaciones y persistencia directa a la API
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name')?.toString().trim();
    const category = fd.get('category')?.toString().trim();
    const location = fd.get('location')?.toString().trim();
    const sede = fd.get('sede')?.toString() || 'Medellín';
    const notes = fd.get('notes')?.toString().trim();
    const minStock = Number(fd.get('minStock'));
    const quantity = Number(fd.get('quantity'));

    if (!name) {
      showError('Validación', 'El nombre del elemento es requerido.');
      return;
    }

    if (minStock < 0) {
      showError('Validación', 'El stock mínimo no puede ser negativo.');
      return;
    }

    if (modalItemType === 'consumible' && (quantity < 0 || isNaN(quantity))) {
      showError('Validación', 'La cantidad de existencias no puede ser negativa.');
      return;
    }

    if (editingItem) {
      const editedPayload = {
        ...editingItem,
        name,
        category,
        location,
        sede,
        notes,
        minStock,
        ...(modalItemType === 'consumible' ? { quantity } : {}),
      };

      try {
        setLocalLoading(true);
        // 1. Si es equipo, actualizar directamente en Supabase/PostgreSQL usando su placa
        if (modalItemType === 'equipo') {
          const targetPlaca = editingItem.placa || (editingItem.units && editingItem.units[0]?.placa) || (editingItem.units && editingItem.units[0]?.code);
          if (targetPlaca) {
            await inventoryApi.updateActivo(targetPlaca, {
              nombre: name,
              marca: category,
              sede,
            });
          }
        } else {
          // Consumible
          await inventoryApi.update(editingItem.id, {
            material: name,
            categoria: category,
            ubicacion: location,
            disponible: quantity,
            minimo: minStock,
          });
        }
      } catch (err) {
        console.warn('Advertencia al guardar en API:', err.message);
      }

      // Propagar al padre si existe handler
      if (onEditItem) {
        await onEditItem(editedPayload);
      }

      // 2. Refrescar datos desde la base de datos para garantizar consistencia
      if (onRetry) {
        await onRetry();
      } else {
        const [activosData, consumiblesData] = await Promise.all([
          inventoryApi.getActivos(),
          inventoryApi.getConsumibles(),
        ]);
        const loaded = [];
        if (Array.isArray(consumiblesData)) {
          consumiblesData.forEach((c) => {
            const disp = Number(c.disponible) || 0;
            const min = Number(c.minimo) ?? 5;
            loaded.push({
              id: c.id,
              material: c.material || c.name || '',
              name: c.material || c.name || '',
              categoria: c.categoria || 'Robótica',
              category: c.categoria || 'Robótica',
              disponible: disp,
              quantity: disp,
              minimo: min,
              minStock: min,
              ubicacion: c.ubicacion || 'Oficina FMO',
              location: c.ubicacion || 'Oficina FMO',
              itemType: 'consumible',
              dateAdded: c.created_at ? c.created_at.split('T')[0] : today(),
            });
          });
        }
        if (Array.isArray(activosData)) {
          activosData.forEach((a) => {
            loaded.push({
              id: `eq-${a.id || a.placa}`,
              name: a.nombre,
              category: a.marca || 'Equipos de Cómputo',
              itemType: 'equipo',
              location: a.sede ? `Sede ${a.sede}` : 'Bodega Medellín',
              sede: a.sede || 'Medellín',
              minStock: 1,
              quantity: 0,
              units: [
                {
                  code: a.placa,
                  placa: a.placa,
                  model: a.modelo || a.marca || 'Estándar',
                  serial: a.serial || '—',
                  sede: a.sede || 'Medellín',
                  status: a.estado === 'En campo' ? 'prestado' : (a.estado || 'disponible').toLowerCase(),
                  responsable: a.custodio || (a.estado === 'En campo' ? 'Custodio Temporal' : 'Bodega Central'),
                },
              ],
              dateAdded: a.created_at ? a.created_at.split('T')[0] : today(),
            });
          });
        }
        setLocalItems(loaded);
      }
      setLocalLoading(false);
    } else {
      // Filtrar unidades que tengan al menos placa o serial diligenciado
      const unidadesValidas = modalItemType === 'equipo'
        ? unidades.filter((u) => (u.placa && u.placa.trim()) || (u.serial && u.serial.trim()))
        : [];

      // Generar formato compatible unitsText para retrocompatibilidad
      const unitsText = unidadesValidas
        .map((u) => `${u.placa.trim()}, ${u.modelo.trim()}, ${u.serial.trim()}`)
        .join('\n');

      if (onAddItem) {
        await onAddItem({
          name,
          category,
          location,
          sede,
          notes,
          minStock,
          itemType: modalItemType,
          quantity: modalItemType === 'consumible' ? quantity : 0,
          unidades: unidadesValidas,
          unitsText,
        });
      }
    }

    setShowItemModal(false);
    setEditingItem(null);
  };

  const isPapeleriaEdit = Boolean(
    activeTab === 'papeleria' ||
    itemParaEditar?.categoria === 'Papelería' ||
    itemParaEditar?.category === 'Papelería' ||
    itemParaEditar?.subtipo === 'papeleria' ||
    String(itemParaEditar?.id || '').toLowerCase().startsWith('pape')
  );

  const isPapeleriaNuevo = Boolean(
    activeTab === 'papeleria' ||
    formDataNuevo?.categoria === 'Papelería' ||
    formDataNuevo?.category === 'Papelería' ||
    formDataNuevo?.subtipo === 'papeleria' ||
    String(formDataNuevo?.id || '').toLowerCase().startsWith('pape')
  );

  return (
    <div className="inventario-view">
      {/* HEADER DE LA SECCIÓN CON SELECTOR DE PESTAÑAS Y BOTONES */}
      <div className="inventory-topbar">
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'equipos' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipos')}
          >
            <span className="tab-icon">💻</span>
            <span>Equipos Tecnológicos</span>
            <span className="tab-badge">{equipos.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'consumibles' ? 'active' : ''}`}
            onClick={() => setActiveTab('consumibles')}
          >
            <span className="tab-icon">🔌</span>
            <span>Consumibles y Robótica</span>
            <span className="tab-badge">{consumibles.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'papeleria' ? 'active' : ''}`}
            onClick={() => setActiveTab('papeleria')}
          >
            <span className="tab-icon">📄</span>
            <span>Papelería</span>
            <span className="tab-badge">{rawPapeleria.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'mobiliario' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobiliario')}
          >
            <span className="tab-icon">🪑</span>
            <span>Mobiliario</span>
            <span className="tab-badge">{mobiliarioFiltrado.length}</span>
          </button>
        </div>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn small secondary"
            onClick={handleDescargarReporteExcel}
            title="Descargar reporte oficial en formato Excel (.xlsx)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Descargar reporte Excel</span>
          </button>

          {isAdmin && (
            activeTab === 'equipos' ? (
              <button
                type="button"
                className="btn small btn-primary"
                onClick={() => handleOpenCreate('equipo')}
              >
                + Nuevo Equipo
              </button>
            ) : activeTab === 'papeleria' ? (
              <button
                type="button"
                className="btn small btn-primary"
                onClick={handleOpenCreatePapeleria}
              >
                + Nuevo Insumo
              </button>
            ) : activeTab === 'mobiliario' ? (
              <button
                type="button"
                className="btn small btn-primary"
                onClick={handleOpenCreateMobiliario}
              >
                + Nuevo Mobiliario
              </button>
            ) : (
              <button
                type="button"
                className="btn small btn-primary"
                onClick={() => handleOpenCreate('consumible')}
              >
                + Nuevo Consumible
              </button>
            )
          )}
        </div>
      </div>

      {/* =========================================================================
          PESTAÑA 1: EQUIPOS TECNOLÓGICOS (Laptops, Tablets, Proyectores, etc.)
          ========================================================================= */}
      {activeTab === 'equipos' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="section-header" style={{ marginBottom: '4px', paddingBottom: '2px' }}>
            <h2>
              <span>Equipos Tecnológicos y Dispositivos</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {totalEquiposRegistrados} equipos en catálogo
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px', marginTop: '2px' }}>
              Gestión, trazabilidad y control de préstamos para equipos de cómputo, tablets y periféricos
            </span>
          </div>

          {/* Barra de filtros para equipos */}
          <div className="filter-bar" style={{ marginBottom: '4px', padding: '8px 14px' }}>
            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Sede / Municipio:</label>
              <select
                value={filterSede}
                onChange={(e) => {
                  setFilterSede(e.target.value);
                  setEquiposPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todas">Todas las sedes</option>
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Estado:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setEquiposPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todos">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="prestado">En campo (Prestado)</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="baja">De baja</option>
              </select>
            </div>

            <div className="filter-count" style={{ fontSize: '12.5px' }}>
              Mostrando <strong>{allEquiposUnits.length}</strong> de <strong>{totalEquiposRegistrados}</strong> equipos registrados
            </div>
          </div>

          {effectiveLoading ? (
            <div className="panel empty" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                Cargando datos de Supabase...
              </strong>
              <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
                Consultando inventario de activos tecnológicos en tiempo real
              </p>
            </div>
          ) : effectiveError ? (
            <div className="panel empty" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <strong style={{ color: 'var(--red)', fontSize: '1.05rem' }}>
                Error al conectar con el backend / Supabase
              </strong>
              <p style={{ color: 'var(--text-dim)', margin: '8px auto', maxWidth: '500px' }}>
                {effectiveError}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="btn small btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={onRetry}
                >
                  🔄 Reintentar conexión
                </button>
              )}
            </div>
          ) : allEquiposUnits.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> {equipos.length === 0 ? 'No hay registros en Supabase.' : 'No se encontraron equipos con los filtros seleccionados.'}
            </div>
          ) : (
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '11%', padding: '10px 8px' }}>PLACA / CÓDIGO</th>
                    <th style={{ width: '20%', padding: '10px 8px' }}>EQUIPO & MODELO</th>
                    <th style={{ width: '12%', padding: '10px 8px' }}>SERIAL</th>
                    <th style={{ width: '17%', padding: '10px 8px' }}>SEDE / UBICACIÓN</th>
                    <th style={{ width: '13%', padding: '10px 8px' }}>RESPONSABLE ACTUAL</th>
                    <th style={{ width: '12%', textAlign: 'center', padding: '10px 8px' }}>ESTADO</th>
                    <th style={{ width: '15%', textAlign: 'center', padding: '10px 6px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEquiposUnits.map((u, idx) => {
                    let pillClass = 'ok';
                    let statusLabel = 'Disponible';
                    if (u.status === 'prestado') {
                      pillClass = 'prestado';
                      statusLabel = 'En campo';
                    } else if (u.status === 'mantenimiento') {
                      pillClass = 'alerta';
                      statusLabel = 'Mantenimiento';
                    } else if (u.status === 'baja') {
                      pillClass = 'low';
                      statusLabel = 'De baja';
                    }

                    const placa = u.placa || u.code || 'S-PLACA';

                    return (
                      <tr key={`${u.parentItemId}-${u.code}-${idx}`} className="h-auto">
                        {/* 1. PLACA / CÓDIGO (Interactivo: abre detalle completo) */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => abrirModalDetalle(placa, u)}
                            className="badge-placa"
                            title="Ver ficha técnica y detalle completo"
                          >
                            <span className="truncate">{placa}</span>
                          </button>
                        </td>

                        {/* 2. EQUIPO & MODELO */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title"
                              title={u.parentName}
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-h)',
                                lineHeight: '1.25',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {u.parentName}
                            </strong>
                            <span
                              title={u.model || u.parentCategory || 'Estándar'}
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--text-dim)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {u.model || u.parentCategory || 'Estándar'}
                            </span>
                          </div>
                        </td>

                        {/* 3. SERIAL */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span className="mono-num" title={u.serial || '—'} style={{ fontSize: '12px', color: 'var(--text)' }}>
                            {u.serial || '—'}
                          </span>
                        </td>

                        {/* 4. SEDE / UBICACIÓN */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', justifyContent: 'center', minWidth: 0 }}>
                            <span
                              className="sede-badge municipal truncate"
                              title={`Sede: ${u.sede || 'Medellín'}`}
                              style={{ maxWidth: '100%', fontSize: '11px', padding: '2px 7px', display: 'inline-block', lineHeight: '1.25' }}
                            >
                              {u.sede || 'Medellín'}
                            </span>
                            {u.ubicacion_estante ? (
                              <span
                                className="estante-tag truncate"
                                title={`Estante/Contenedor: ${u.ubicacion_estante}`}
                                style={{ maxWidth: '100%', marginTop: 0, display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', padding: '1px 6px', lineHeight: '1.2' }}
                              >
                                <span>📦</span>
                                <span>{u.ubicacion_estante}</span>
                              </span>
                            ) : (
                              u.baseLocation &&
                              !u.baseLocation.toLowerCase().replace(/sede\s*|oficina\s*/gi, '').trim().includes((u.sede || '').toLowerCase().replace(/sede\s*|oficina\s*/gi, '').trim()) && (
                                <span
                                  className="location-sub font-medium text-slate-800 dark:text-slate-200 truncate"
                                  title={u.baseLocation}
                                  style={{ fontSize: '11px', maxWidth: '100%', color: 'var(--text-dim)' }}
                                >
                                  {u.baseLocation}
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* 5. RESPONSABLE ACTUAL */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span
                            className="responsable-name"
                            title={u.status === 'prestado' ? (u.responsable || 'Custodio asignado') : '—'}
                            style={{ fontSize: '12.5px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {u.status === 'prestado' ? (u.responsable || 'Custodio asignado') : '—'}
                          </span>
                        </td>

                        {/* 6. ESTADO */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '6px', paddingRight: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {u.status === 'prestado' ? (
                            <span
                              className="pill"
                              style={{
                                background: 'var(--amber-bg)',
                                color: 'var(--amber)',
                                borderColor: 'var(--amber-border)',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '2px 8px',
                              }}
                            >
                              En campo
                            </span>
                          ) : u.status === 'mantenimiento' ? (
                            <span
                              className="pill"
                              style={{
                                background: 'var(--amber-bg)',
                                color: 'var(--amber)',
                                borderColor: 'var(--amber-border)',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '2px 8px',
                              }}
                            >
                              Mantenimiento
                            </span>
                          ) : u.status === 'baja' ? (
                            <span className="pill low" style={{ fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                              De baja
                            </span>
                          ) : (
                            <span className="pill ok" style={{ fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                              Disponible
                            </span>
                          )}
                        </td>

                        {/* 7. ACCIONES: 📷 QR, 👁️ Ver, ✏️ Editar, 🗑️ Eliminar */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '6px', paddingRight: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 2px',
                            }}
                          >
                            {/* 📷 QR */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver e Imprimir Código QR del Equipo"
                              onClick={() => setQrModalItem({
                                code: u.code,
                                placa: u.placa || u.code,
                                nombre: u.parentName,
                                name: u.parentName,
                                model: u.model,
                                serial: u.serial,
                                sede: u.sede || 'Medellín',
                                estado: u.status,
                              })}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M3 12h.01" />
                                <path d="M12 3h.01" />
                                <path d="M12 16v.01" />
                                <path d="M16 12h1" />
                                <path d="M21 12v.01" />
                                <path d="M12 21v-1" />
                              </svg>
                            </button>

                            {/* 👁️ Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver detalle del equipo"
                              onClick={() => abrirModalDetalle(placa, u)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* ✏️ Editar (Oculto para Supervisor) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar equipo"
                                onClick={() => {
                                  const parent = equipos.find(e => e.id === u.parentItemId);
                                  if (parent) {
                                    handleOpenEdit({
                                      ...parent,
                                      placa,
                                    });
                                  }
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--amber, #f59e0b)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                            )}

                            {/* 🗑️ Eliminar (Solo Administrador) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Eliminar o dar de baja el equipo"
                                onClick={() => handleDeleteEquipo(u)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--red, #ef4444)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedEquiposUnits.length) }).map((_, phIdx) => (
                    <tr key={`ph-equipos-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={7} style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTROLES DE PAGINACIÓN COMPACTA (5 FILAS POR PÁGINA) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderTop: '1px solid var(--line)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {allEquiposUnits.length === 0 ? 0 : (currentEquiposPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentEquiposPage * ITEMS_PER_PAGE, allEquiposUnits.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{allEquiposUnits.length}</strong> {allEquiposUnits.length !== totalEquiposRegistrados ? `(filtrados de ${totalEquiposRegistrados} registrados)` : 'equipos registrados'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentEquiposPage <= 1}
                    onClick={() => setEquiposPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentEquiposPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentEquiposPage} de {totalEquiposPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentEquiposPage >= totalEquiposPages}
                    onClick={() => setEquiposPage((p) => Math.min(totalEquiposPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentEquiposPage >= totalEquiposPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 2: CONSUMIBLES Y ROBÓTICA (Insumos, motores, placas, sensores)
          ========================================================================= */}
      {activeTab === 'consumibles' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="section-header" style={{ marginBottom: '4px', paddingBottom: '2px' }}>
            <h2>
              <span>Insumos y Materiales de Taller / Robótica</span>
              {filterStockConsumibles === 'minimo' ? (
                <span
                  className="pill low"
                  style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => {
                    setFilterStockConsumibles('todos');
                    setConsumiblesPage(1);
                  }}
                  title="Clic para mostrar todos los consumibles"
                >
                  ⚠️ Filtro: Stock mínimo ({consumibles.length}) ✕
                </span>
              ) : filterStockConsumibles === 'optimo' ? (
                <span
                  className="pill ok"
                  style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => {
                    setFilterStockConsumibles('todos');
                    setConsumiblesPage(1);
                  }}
                  title="Clic para mostrar todos los consumibles"
                >
                  ✓ Filtro: Stock óptimo ({consumibles.length}) ✕
                </span>
              ) : (
                <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {consumibles.length} ítems en catálogo
                </span>
              )}
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px', marginTop: '2px' }}>
              Materiales para talleres de robótica y semilleros STEAM con control de stock mínimo
            </span>
          </div>

          {/* Barra de filtros para consumibles con el mismo diseño que equipos tecnológicos */}
          <div className="filter-bar" style={{ marginBottom: '4px', padding: '8px 14px' }}>
            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Estado de Stock:</label>
              <select
                value={filterStockConsumibles}
                onChange={(e) => {
                  setFilterStockConsumibles(e.target.value);
                  setConsumiblesPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todos">Todos los materiales ({countConsumiblesTodos})</option>
                <option value="minimo">⚠️ Solo Stock Bajo ({countConsumiblesMinimo})</option>
                <option value="optimo">✓ Stock Óptimo ({countConsumiblesOptimo})</option>
              </select>
            </div>

            <div className="filter-count" style={{ fontSize: '12.5px' }}>
              Mostrando <strong>{consumibles.length}</strong> de <strong>{countConsumiblesTodos}</strong> materiales registrados
            </div>
          </div>

          {effectiveLoading ? (
            <div className="panel empty" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                Cargando datos de Supabase...
              </strong>
              <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
                Consultando inventario de materiales e insumos en tiempo real
              </p>
            </div>
          ) : effectiveError ? (
            <div className="panel empty" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <strong style={{ color: 'var(--red)', fontSize: '1.05rem' }}>
                Error al conectar con el backend / Supabase
              </strong>
              <p style={{ color: 'var(--text-dim)', margin: '8px auto', maxWidth: '500px' }}>
                {effectiveError}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="btn small btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={onRetry}
                >
                  🔄 Reintentar conexión
                </button>
              )}
            </div>
          ) : consumibles.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> No hay registros en Supabase.
            </div>
          ) : (
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table className="w-full table-fixed" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th className="w-[28%] text-left px-4" style={{ width: '28%', padding: '10px 14px', textAlign: 'left' }}>CÓDIGO / MATERIAL</th>
                    <th className="w-[15%] text-center px-2" style={{ width: '15%', padding: '10px 8px', textAlign: 'center' }}>CATEGORÍA</th>
                    <th className="w-[12%] text-center px-2" style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>DISPONIBLE</th>
                    <th className="w-[18%] text-left px-3" style={{ width: '18%', padding: '10px 12px', textAlign: 'left' }}>UBICACIÓN FÍSICA</th>
                    <th className="w-[13%] text-center px-2" style={{ width: '13%', padding: '10px 8px', textAlign: 'center' }}>ESTADO DE STOCK</th>
                    <th className="w-[14%] text-center px-2" style={{ width: '14%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsumibles.map((it) => {
                    const disp = Number(it.disponible ?? it.quantity ?? 0);
                    const min = Number(it.minimo ?? it.minStock ?? 5);
                    const isZero = disp <= 0;
                    const isLow = !isZero && disp <= min;
                    const matName = it.material || it.name || 'Sin nombre';
                    const ubi = it.ubicacion || it.location || 'Oficina FMO';

                    return (
                      <tr key={it.id} className={`${isZero ? 'row-critical' : isLow ? 'row-warning' : ''} h-auto`}>
                        {/* 1. CÓDIGO / MATERIAL: Badge con código y a debajo nombre en negrita */}
                        <td className="py-2.5" style={{ paddingLeft: '14px', paddingRight: '14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden', gap: '3px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setItemSeleccionado(it);
                                setModalDetalleOpen(true);
                              }}
                              className="badge-placa"
                              title={`Ver detalle de ${it.id}`}
                            >
                              <span className="truncate">{it.id}</span>
                            </button>
                            <strong
                              className="item-title"
                              title={matName}
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-h)',
                                lineHeight: '1.2',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {matName}
                            </strong>
                          </div>
                        </td>

                        {/* 2. CATEGORÍA: Tag redondeado */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span
                            className="category-tag"
                            title={it.categoria || it.category || 'Robótica'}
                            style={{
                              fontSize: '11.5px',
                              padding: '2px 8px',
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {it.categoria || it.category || 'Robótica'}
                          </span>
                        </td>

                        {/* 3. DISPONIBLE: Indicador numérico con unidad según diseño institucional */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {disp} <span className="text-xs text-slate-500 font-normal">{it.unit || 'und'}</span>
                          </div>
                        </td>

                        {/* 4. UBICACIÓN FÍSICA */}
                        <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200" title={ubi} style={{ fontSize: '12.5px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ubi}
                            </span>
                            {it.ubicacion_estante && (
                              <span
                                className="estante-tag"
                                title={`Estante/Contenedor: ${it.ubicacion_estante}`}
                              >
                                📦 {it.ubicacion_estante}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. ESTADO DE STOCK */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {isZero ? (
                            <span className="pill vencido" style={{ fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                              Agotado
                            </span>
                          ) : isLow ? (
                            <span
                              className="pill"
                              style={{
                                background: 'var(--amber-bg)',
                                color: 'var(--amber)',
                                borderColor: 'var(--amber-border)',
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '2px 8px',
                              }}
                            >
                              Stock bajo
                            </span>
                          ) : (
                            <span className="pill ok" style={{ fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                              Disponible
                            </span>
                          )}
                        </td>

                        {/* 6. ACCIONES CRUD: 📷 QR, 👁️ Ver, ✏️ Editar, 🗑️ Eliminar */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {/* 📷 QR */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Generar e imprimir Código QR"
                              onClick={() => setQrConsumibleItem(it)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M3 12h.01" />
                                <path d="M12 3h.01" />
                                <path d="M12 16v.01" />
                                <path d="M16 12h1" />
                                <path d="M21 12v.01" />
                                <path d="M12 21v-1" />
                              </svg>
                            </button>

                            {/* 👁️ Ver / Consultar */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver detalle del material"
                              onClick={() => {
                                setItemSeleccionado(it);
                                setModalDetalleOpen(true);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* ✏️ Editar (Oculto para Supervisor) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar material"
                                onClick={() => handleOpenEdit(it)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--amber, #f59e0b)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                            )}

                            {/* 🗑️ Eliminar (Solo Administrador) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Eliminar material"
                                onClick={() => handleDeleteConsumable(it)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--red, #ef4444)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedConsumibles.length) }).map((_, phIdx) => (
                    <tr key={`ph-consumibles-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={6} style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTROLES DE PAGINACIÓN COMPACTA (5 FILAS POR PÁGINA) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderTop: '1px solid var(--line)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {consumibles.length === 0 ? 0 : (currentConsumiblesPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentConsumiblesPage * ITEMS_PER_PAGE, consumibles.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{consumibles.length}</strong> materiales
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentConsumiblesPage <= 1}
                    onClick={() => setConsumiblesPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentConsumiblesPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentConsumiblesPage} de {totalConsumiblesPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentConsumiblesPage >= totalConsumiblesPages}
                    onClick={() => setConsumiblesPage((p) => Math.min(totalConsumiblesPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentConsumiblesPage >= totalConsumiblesPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 3: PAPELERÍA (Insumos de oficina y formación STEAM)
          ========================================================================= */}
      {activeTab === 'papeleria' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="section-header" style={{ marginBottom: '4px', paddingBottom: '2px' }}>
            <h2>
              <span>Control de Papelería & Guías STEAM</span>
              {filterStockPapeleria === 'minimo' ? (
                <span
                  className="pill low"
                  style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => {
                    setFilterStockPapeleria('todos');
                    setPapeleriaPage(1);
                  }}
                  title="Clic para mostrar todos los insumos"
                >
                  ⚠️ Filtro: Stock bajo ({papeleriaFiltrada.length}) ✕
                </span>
              ) : filterStockPapeleria === 'optimo' ? (
                <span
                  className="pill ok"
                  style={{ fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => {
                    setFilterStockPapeleria('todos');
                    setPapeleriaPage(1);
                  }}
                  title="Clic para mostrar todos los insumos"
                >
                  ✓ Filtro: Stock óptimo ({papeleriaFiltrada.length}) ✕
                </span>
              ) : (
                <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {papeleriaFiltrada.length} insumos en catálogo
                </span>
              )}
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px', marginTop: '2px' }}>
              Control de existencias de insumos de oficina y formación STEAM (resmas, lápices, marcadores, bitácoras)
            </span>
          </div>

          {/* Barra de filtros con el mismo diseño que Equipos y Consumibles */}
          <div className="filter-bar" style={{ marginBottom: '4px', padding: '8px 14px' }}>
            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Contenedor:</label>
              <select
                value={filterCajaPapeleria}
                onChange={(e) => {
                  setFilterCajaPapeleria(e.target.value);
                  setPapeleriaPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todas">Todas las cajas</option>
                <option value="CAJA #1">CAJA #1</option>
                <option value="CAJA #2">CAJA #2</option>
                <option value="CAJA #3">CAJA #3</option>
                <option value="CAJA #4">CAJA #4</option>
                <option value="CAJA #5">CAJA #5</option>
                <option value="CAJA #6">CAJA #6</option>
                <option value="CAJA #7">CAJA #7</option>
                <option value="CAJA #8">CAJA #8</option>
                <option value="CAJA #9">CAJA #9</option>
                <option value="CAJA #10">CAJA #10</option>
                <option value="CAJA #11">CAJA #11</option>
                <option value="Fuera de cajas">Fuera de cajas</option>
              </select>
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Estado de Stock:</label>
              <select
                value={filterStockPapeleria}
                onChange={(e) => {
                  setFilterStockPapeleria(e.target.value);
                  setPapeleriaPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todos">Todos los Insumos ({rawPapeleria.length})</option>
                <option value="minimo">⚠️ Solo Stock Bajo (≤ 3 unid.)</option>
                <option value="optimo">✓ Stock Óptimo (&gt; 3 unid.)</option>
              </select>
            </div>

            <div className="filter-count" style={{ fontSize: '12.5px' }}>
              Mostrando <strong>{papeleriaFiltrada.length}</strong> de <strong>{rawPapeleria.length}</strong> insumos de papelería
            </div>
          </div>

          {papeleriaFiltrada.length === 0 ? (
            <div className="panel empty">
              <span>📄</span> No se encontraron insumos de papelería con los filtros seleccionados.
            </div>
          ) : (
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '11%', padding: '10px 12px', textAlign: 'left' }}>CÓDIGO / PLACA</th>
                    <th style={{ width: '25%', padding: '10px 12px', textAlign: 'left' }}>MATERIAL / NOMBRE</th>
                    <th style={{ width: '10%', padding: '10px 6px', textAlign: 'center' }}>CANTIDAD</th>
                    <th style={{ width: '18%', padding: '10px 8px', textAlign: 'center' }}>CONDICIÓN</th>
                    <th style={{ width: '19%', padding: '10px 14px', textAlign: 'left' }}>UBICACIÓN</th>
                    <th style={{ width: '17%', padding: '10px 12px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPapeleria.map((it) => {
                    const disp = Number(it.disponible ?? it.quantity ?? 0);
                    const isZero = disp <= 0;
                    const isLow = disp > 0 && disp <= 3;
                    const matName = it.material || it.name || 'Sin nombre';
                    const ubi = it.ubicacion || it.location || 'Oficina FMO';
                    const estante = it.ubicacion_estante || it.caja || 'Fuera de cajas';
                    const esNuevo = String(it.condicion || '').toLowerCase().includes('nuevo') && !String(it.condicion || '').toLowerCase().includes('usado');
                    const esUsado = String(it.condicion || '').toLowerCase().includes('usad') && !String(it.condicion || '').toLowerCase().includes('nuevo');

                    return (
                      <tr key={it.id} className={`${isZero ? 'row-critical' : isLow ? 'row-warning' : ''} h-auto`}>
                        {/* 1. CÓDIGO / PLACA: Badge interactivo estándar */}
                        <td className="py-2.5" style={{ paddingLeft: '14px', paddingRight: '14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setItemSeleccionado({
                                ...it,
                                id: it.id,
                                placa: it.id,
                                nombre: it.material || it.name,
                                name: it.material || it.name,
                                equipo: it.material || it.name,
                                material: it.material || it.name,
                                categoria: 'Papelería',
                                category: 'Papelería',
                                disponible: disp,
                                quantity: disp,
                                ubicacion: ubi,
                                ubicacion_estante: estante,
                                condicion: it.condicion || 'Nuevos',
                                estado: it.estado || 'Bueno',
                                descripcion: it.descripcion || 'Insumo de papelería institucional FMO.',
                                isEquipo: false,
                              });
                              setModalDetalleOpen(true);
                            }}
                            className="badge-placa"
                            title={`Ver ficha técnica y detalle de ${it.id}`}
                          >
                            <span className="truncate">{it.id}</span>
                          </button>
                        </td>

                        {/* 2. MATERIAL / NOMBRE: En negrita con descripción breve debajo */}
                        <td className="py-2.5" style={{ paddingLeft: '14px', paddingRight: '14px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, gap: '2px' }}>
                            <strong
                              className="item-title truncate max-w-xs"
                              title={matName}
                              style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 700, lineHeight: '1.25' }}
                            >
                              {matName}
                            </strong>
                            {it.descripcion ? (
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--text-dim)',
                                  lineHeight: '1.2',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                                title={it.descripcion}
                              >
                                {it.descripcion}
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                Sin descripción adicional
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. CANTIDAD / DISPONIBLE: Indicador numérico y badge de alerta si <= 3 */}
                        <td className="py-2.5" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {disp} <span className="text-xs text-slate-500 font-normal">und</span>
                            </div>
                            {isZero ? (
                              <span className="pill vencido" style={{ fontWeight: 700, fontSize: '10px', padding: '1px 6px' }}>
                                Agotado
                              </span>
                            ) : isLow ? (
                              <span
                                className="pill"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#d97706',
                                  borderColor: 'rgba(245, 158, 11, 0.4)',
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                }}
                              >
                                Stock Bajo
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* 4. CONDICIÓN: Badge estilo botón institucional acorde al diseño del sistema */}
                        <td className="py-2.5" style={{ textAlign: 'center', verticalAlign: 'middle', padding: '10px 6px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
                            {esNuevo ? (
                              <span className="badge-condicion nuevo" title="Condición: Nuevos">
                                <span className="badge-condicion-dot" />
                                <span>Nuevos</span>
                              </span>
                            ) : esUsado ? (
                              <span className="badge-condicion usado" title="Condición: Usados">
                                <span className="badge-condicion-dot" />
                                <span>Usados</span>
                              </span>
                            ) : (
                              <span className="badge-condicion mixto" title={`Condición: ${it.condicion || 'Nuevos y Usados'}`}>
                                <span className="badge-condicion-dot" />
                                <span>{it.condicion || 'Nuevos y Usados'}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. UBICACIÓN: Sede acompañada del contenedor con icono 📦 CAJA #X */}
                        <td style={{ padding: '0 14px', verticalAlign: 'middle' }}>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <span className="font-medium text-slate-800 dark:text-slate-200" title={ubi} style={{ fontSize: '12.5px', display: 'block' }}>
                              {ubi}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                              <span>📦</span>
                              <span className="font-semibold text-lime-700 dark:text-lime-400">{estante}</span>
                            </span>
                          </div>
                        </td>

                        {/* 6. ACCIONES: Idénticas a Equipos Tecnológicos y Consumibles */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {/* 📷 QR */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Generar e imprimir Código QR"
                              onClick={() => setQrConsumibleItem({
                                ...it,
                                placa: it.id,
                                nombre: it.material || it.name,
                              })}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M3 12h.01" />
                                <path d="M12 3h.01" />
                                <path d="M12 16v.01" />
                                <path d="M16 12h1" />
                                <path d="M21 12v.01" />
                                <path d="M12 21v-1" />
                              </svg>
                            </button>

                            {/* 👁️ Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver detalle del material"
                              onClick={() => {
                                setItemSeleccionado({
                                  ...it,
                                  id: it.id,
                                  placa: it.id,
                                  nombre: it.material || it.name,
                                  name: it.material || it.name,
                                  equipo: it.material || it.name,
                                  material: it.material || it.name,
                                  categoria: 'Papelería',
                                  category: 'Papelería',
                                  disponible: disp,
                                  quantity: disp,
                                  ubicacion: ubi,
                                  ubicacion_estante: estante,
                                  condicion: it.condicion || 'Nuevos',
                                  estado: it.estado || 'Bueno',
                                  descripcion: it.descripcion || 'Insumo de papelería institucional FMO.',
                                  isEquipo: false,
                                });
                                setModalDetalleOpen(true);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* ✏️ Editar (Oculto para Supervisor) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar material"
                                onClick={() => handleOpenEdit(it)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--amber, #f59e0b)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                            )}

                            {/* 🗑️ Eliminar (Solo Administrador) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Eliminar material"
                                onClick={() => handleDeletePapeleria(it)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--red, #ef4444)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedPapeleria.length) }).map((_, phIdx) => (
                    <tr key={`ph-papeleria-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={6} style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTROLES DE PAGINACIÓN COMPACTA (5 FILAS POR PÁGINA) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderTop: '1px solid var(--line)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {papeleriaFiltrada.length === 0 ? 0 : (currentPapeleriaPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentPapeleriaPage * ITEMS_PER_PAGE, papeleriaFiltrada.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{papeleriaFiltrada.length}</strong> insumos de papelería
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentPapeleriaPage <= 1}
                    onClick={() => setPapeleriaPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentPapeleriaPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentPapeleriaPage} de {totalPapeleriaPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentPapeleriaPage >= totalPapeleriaPages}
                    onClick={() => setPapeleriaPage((p) => Math.min(totalPapeleriaPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentPapeleriaPage >= totalPapeleriaPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 4: MOBILIARIO (Mesas, sillas, armarios y muebles modulares de sedes)
          ========================================================================= */}
      {activeTab === 'mobiliario' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="section-header" style={{ marginBottom: '4px', paddingBottom: '2px' }}>
            <h2>
              <span>Control de Mobiliario & Muebles Modulares</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {rawMobiliario.length} muebles en catálogo
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px', marginTop: '2px' }}>
              Control de mesas de robótica, sillas ergonómicas, armarios modulares y dotación de sedes
            </span>
          </div>

          {/* Barra de Filtros con el mismo diseño que Equipos y Consumibles */}
          <div className="filter-bar" style={{ marginBottom: '4px', padding: '8px 14px' }}>
            <div className="filter-group">
              <label style={{ fontSize: '12px' }}>Sede / Ubicación:</label>
              <select
                value={filterSedeMobiliario}
                onChange={(e) => {
                  setFilterSedeMobiliario(e.target.value);
                  setMobiliarioPage(1);
                }}
                style={{ padding: '4px 10px', fontSize: '12.5px' }}
              >
                <option value="todas">Todas las sedes ({rawMobiliario.length})</option>
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-count" style={{ fontSize: '12.5px' }}>
              Mostrando <strong>{mobiliarioFiltrado.length}</strong> de <strong>{rawMobiliario.length}</strong> muebles registrados
            </div>
          </div>

          {mobiliarioFiltrado.length === 0 ? (
            <div className="panel empty">
              <span>🪑</span> No se encontró mobiliario con los filtros seleccionados.
            </div>
          ) : (
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '15%', padding: '10px 14px', textAlign: 'left' }}>PLACA / CÓDIGO</th>
                    <th style={{ width: '27%', padding: '10px 12px', textAlign: 'left' }}>MOBILIARIO & DESCRIPCIÓN</th>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>CANTIDAD</th>
                    <th style={{ width: '18%', padding: '10px 12px', textAlign: 'left' }}>SEDE / ESPACIO ASIGNADO</th>
                    <th style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ width: '17%', padding: '10px 16px', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMobiliario.map((m) => {
                    const code = m.placa || m.code || m.id;
                    const nombre = m.nombre || m.material || m.name || 'Mueble Modular';
                    const sede = m.sede || m.ubicacion || 'Medellín';
                    const cant = Number(m.disponible ?? m.quantity ?? 1);

                    return (
                      <tr key={code} className="h-auto hover:bg-slate-500/5">
                        {/* 1. Placa / Código */}
                        <td className="py-2.5" style={{ paddingLeft: '14px', paddingRight: '14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setItemSeleccionado(m);
                              setModalDetalleOpen(true);
                            }}
                            className="badge-placa"
                            title={`Ver ficha técnica y detalle de ${code}`}
                          >
                            <span className="truncate">{code}</span>
                          </button>
                        </td>

                        {/* 2. Nombre & Descripción con max-w y truncate */}
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px', verticalAlign: 'middle' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-h)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {nombre}
                          </strong>
                          {m.descripcion && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {m.descripcion}
                            </span>
                          )}
                        </td>

                        {/* 3. Cantidad con unidad según diseño institucional */}
                        <td className="py-2.5" style={{ textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {cant} <span className="text-xs text-slate-500 font-normal">{m.unit || 'und'}</span>
                          </div>
                        </td>

                        {/* 4. Sede / Espacio asignado con badge compacto */}
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div className="flex flex-col gap-1 items-start justify-center">
                            <span className="inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50">
                              {sede}
                            </span>
                            {m.ubicacion_estante && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                <span>📦</span>
                                <span className="font-semibold text-lime-700 dark:text-lime-400">{m.ubicacion_estante}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Estado */}
                        <td className="py-2.5" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span className="pill ok" style={{ fontWeight: 700, fontSize: '11px', padding: '2px 8px' }}>
                            {m.condicion || m.estado || 'Buen Estado'}
                          </span>
                        </td>

                        {/* 6. Acciones: Idénticas a Equipos Tecnológicos y Consumibles */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            {/* 📷 QR */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Generar e imprimir Código QR"
                              onClick={() => setQrConsumibleItem({ ...m, placa: code, nombre })}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M3 12h.01" />
                                <path d="M12 3h.01" />
                                <path d="M12 16v.01" />
                                <path d="M16 12h1" />
                                <path d="M21 12v.01" />
                                <path d="M12 21v-1" />
                              </svg>
                            </button>

                            {/* 👁️ Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver detalle de mobiliario"
                              onClick={() => {
                                setItemSeleccionado(m);
                                setModalDetalleOpen(true);
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* ✏️ Editar (Oculto para Supervisor) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar mobiliario"
                                onClick={() => handleOpenEdit(m)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--amber, #f59e0b)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </button>
                            )}

                            {/* 🗑️ Eliminar (Solo Administrador) */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Dar de baja o eliminar mobiliario"
                                onClick={() => handleDeleteMobiliario(m)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: 'var(--red, #ef4444)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedMobiliario.length) }).map((_, phIdx) => (
                    <tr key={`ph-mobiliario-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={6} style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTROLES DE PAGINACIÓN COMPACTA (5 FILAS POR PÁGINA) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderTop: '1px solid var(--line)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {mobiliarioFiltrado.length === 0 ? 0 : (currentMobiliarioPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentMobiliarioPage * ITEMS_PER_PAGE, mobiliarioFiltrado.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{mobiliarioFiltrado.length}</strong> muebles
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentMobiliarioPage <= 1}
                    onClick={() => setMobiliarioPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentMobiliarioPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentMobiliarioPage} de {totalMobiliarioPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentMobiliarioPage >= totalMobiliarioPages}
                    onClick={() => setMobiliarioPage((p) => Math.min(totalMobiliarioPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentMobiliarioPage >= totalMobiliarioPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          MODAL: NUEVO / EDITAR ELEMENTO
          ========================================================================= */}
      {showItemModal && (
        <div className="modal-backdrop" onClick={() => setShowItemModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingItem ? 'Editar ' : 'Nuevo '}
                {modalItemType === 'equipo' ? 'Equipo Tecnológico' : 'Material / Consumible'}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowItemModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Nombre del Elemento *</label>
                  <input
                    required
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    placeholder={
                      modalItemType === 'equipo'
                        ? 'Ej. Laptops Lenovo ThinkPad L14'
                        : 'Ej. ARDUINO UNO R3 con Cable USB'
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    name="category"
                    defaultValue={editingItem?.category || ''}
                    placeholder="Cómputo, Robótica, Audiovisuales..."
                  />
                </div>

                <div className="form-group">
                  <label>Sede Principal</label>
                  <select name="sede" defaultValue={editingItem?.sede || 'Medellín'}>
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {modalItemType === 'consumible' && (
                  <div className="form-group">
                    <label>Cantidad Inicial / Existencias *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      name="quantity"
                      defaultValue={editingItem ? editingItem.quantity : 1}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Stock Mínimo de Alerta *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    name="minStock"
                    defaultValue={editingItem?.minStock ?? 5}
                  />
                </div>

                <div className="form-group full">
                  <label>Ubicación Física en Bodega / Laboratorio</label>
                  <input
                    name="location"
                    defaultValue={editingItem?.location || ''}
                    placeholder="Ej. Estante A5 / Caja 2 - Lab Robótica"
                  />
                </div>

                {!editingItem && modalItemType === 'equipo' && (
                  <div className="form-group full" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                      <label style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        Unidades / Placas Físicas (Opcional)
                      </label>
                      <button
                        type="button"
                        onClick={agregarUnidad}
                        className="btn small"
                        style={{
                          padding: '5px 12px',
                          fontSize: '12px',
                          background: 'rgba(171, 222, 22, 0.1)',
                          color: 'var(--copper)',
                          border: '1px solid rgba(171, 222, 22, 0.4)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        + Agregar otra unidad
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unidades.map((u, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--line)',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Ej: P-01 (Placa)"
                            value={u.placa}
                            onChange={(e) => actualizarUnidad(idx, 'placa', e.target.value)}
                            style={{
                              width: '28%',
                              minWidth: '70px',
                              padding: '7px 10px',
                              fontSize: '12.5px',
                              fontFamily: 'var(--mono)',
                              background: 'var(--bg)',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              color: 'var(--text)',
                              boxSizing: 'border-box',
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Ej: ThinkPad L14 (Modelo)"
                            value={u.modelo}
                            onChange={(e) => actualizarUnidad(idx, 'modelo', e.target.value)}
                            style={{
                              flex: 1,
                              minWidth: '100px',
                              padding: '7px 10px',
                              fontSize: '12.5px',
                              background: 'var(--bg)',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              color: 'var(--text)',
                              boxSizing: 'border-box',
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Ej: PF-3X9011 (Serial)"
                            value={u.serial}
                            onChange={(e) => actualizarUnidad(idx, 'serial', e.target.value)}
                            style={{
                              flex: 1,
                              minWidth: '90px',
                              padding: '7px 10px',
                              fontSize: '12.5px',
                              fontFamily: 'var(--mono)',
                              background: 'var(--bg)',
                              border: '1px solid var(--line)',
                              borderRadius: '6px',
                              color: 'var(--text)',
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            title="Eliminar fila"
                            onClick={() => eliminarUnidad(idx)}
                            style={{
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: 'var(--red)',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--red-bg)';
                              e.currentTarget.style.borderColor = 'var(--red-border)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <Trash2 style={{ width: '15px', height: '15px' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <small className="help-text">
                      Ingresa la placa, modelo y serial para cada equipo individual. Si no agregas unidades, el equipo se creará con stock en cero.
                    </small>
                  </div>
                )}

                <div className="form-group full">
                  <label>Notas u Observaciones</label>
                  <textarea
                    name="notes"
                    rows="2"
                    defaultValue={editingItem?.notes || ''}
                    placeholder="Detalles sobre garantía, estado general o especificaciones técnicas."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowItemModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ETIQUETA QR PARA IMPRESIÓN CON ModalQR
          ========================================================================= */}
      {qrModalItem && (
        <ModalQR
          activo={qrModalItem}
          onClose={() => {
            setQrModalItem(null);
            setItemSeleccionado(null);
          }}
          onBack={() => {
            const temp = qrModalItem;
            setQrModalItem(null);
            setItemSeleccionado(temp);
            setModalDetalleOpen(true);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: PRÉSTAMO RÁPIDO DE UNIDAD DISPONIBLE
          ========================================================================= */}
      {quickLoanUnit && (
        <div className="modal-backdrop" onClick={() => setQuickLoanUnit(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>🔄 Nuevo Préstamo de Equipo</span>
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setQuickLoanUnit(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!loanPerson) {
                  showError('Validación', 'Debes indicar el Solicitante / Formador custodio.');
                  return;
                }
                if (!loanExpectedDate) {
                  showError('Validación', 'Debes seleccionar la fecha de devolución.');
                  return;
                }
                if (loanExpectedDate < today()) {
                  showError('Fecha Inválida', 'La fecha de devolución no puede ser anterior a la fecha de hoy.');
                  return;
                }

                if (onRegisterLoan) {
                  await onRegisterLoan({
                    itemId: quickLoanUnit.parentItemId,
                    person: loanPerson,
                    sede: loanSede,
                    expectedReturn: loanExpectedDate,
                    motive: loanMotive || 'Préstamo asignado desde vista de inventario',
                    unitCodes: [quickLoanUnit.code || quickLoanUnit.placa],
                  });
                }

                // Refrescar datos
                if (onRetry) {
                  await onRetry();
                }

                const targetPlaca = quickLoanUnit.placa || quickLoanUnit.code;
                const targetCustodio = loanPerson;
                const targetDev = loanExpectedDate;
                setQuickLoanUnit(null);
                setLoanPerson('');
                setLoanExpectedDate('');

                // Toast Institucional para Préstamo Retornable
                showLoanSuccess({
                  codigo: targetPlaca,
                  custodio: targetCustodio,
                  fechaDevolucion: targetDev,
                });
              }}
            >
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Equipo y Placa Seleccionada</label>
                  <div className="pill prestado" style={{ display: 'inline-flex', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}>
                    💻 {quickLoanUnit.parentName} · <strong>Placa: {quickLoanUnit.placa || quickLoanUnit.code}</strong> (SN: {quickLoanUnit.serial || '—'})
                  </div>
                </div>

                <div className="form-group">
                  <label>Solicitante / Formador Responsable *</label>
                  <input
                    required
                    list="inventario-formadores-list"
                    value={loanPerson}
                    placeholder="Selecciona o escribe el nombre..."
                    onChange={(e) => setLoanPerson(e.target.value)}
                  />
                  <datalist id="inventario-formadores-list">
                    {EMPLOYEES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Sede / Municipio Destino *</label>
                  <select
                    required
                    value={loanSede}
                    onChange={(e) => setLoanSede(e.target.value)}
                  >
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Devolución Pactada *</label>
                  <input
                    required
                    type="date"
                    min={today()}
                    value={loanExpectedDate}
                    onChange={(e) => setLoanExpectedDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Proyecto Vinculado</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setLoanMotive(`${e.target.value} - `);
                      }
                    }}
                  >
                    <option value="">-- Selecciona proyecto (opcional) --</option>
                    {PROYECTOS.map((proj) => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Motivo y Observaciones del Préstamo</label>
                  <input
                    value={loanMotive}
                    placeholder="Ej. Clubes de Robótica - Taller de programación"
                    onChange={(e) => setLoanMotive(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setQuickLoanUnit(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: MOVIMIENTO RÁPIDO DE CONSUMIBLES (SALIDA / INGRESO)
          ========================================================================= */}
      {stockMovementModal && (
        <div className="modal-backdrop" onClick={() => !movementSubmitting && setStockMovementModal(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>
                {stockMovementModal.type === 'ingreso' ? '📦 Reabastecer Stock (Ingreso)' : '📤 Registrar Salida de Material'}
              </h3>
              <button
                type="button"
                className="close-btn"
                disabled={movementSubmitting}
                onClick={() => setStockMovementModal(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStockMovementSubmit}>
              <div className="modal-body form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="mono-num" style={{ fontWeight: 700, fontSize: '12px' }}>
                      {stockMovementModal.item.id}
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-h)' }}>
                      {stockMovementModal.item.material || stockMovementModal.item.name}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: 'var(--text-dim)' }}>
                    <span>Categoría: <strong>{stockMovementModal.item.categoria || stockMovementModal.item.category || 'Robótica'}</strong></span>
                    <span>Disponible actual: <strong>{Number(stockMovementModal.item.disponible ?? stockMovementModal.item.quantity ?? 0)}</strong></span>
                  </div>
                </div>

                <div className="form-group full">
                  <label>
                    {stockMovementModal.type === 'ingreso' ? 'Cantidad a Ingresar *' : 'Cantidad a Retirar / Salida *'}
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={stockMovementModal.type === 'salida' ? Number(stockMovementModal.item.disponible ?? stockMovementModal.item.quantity ?? 0) : undefined}
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    style={{ fontSize: '16px', fontWeight: 700 }}
                  />
                  {stockMovementModal.type === 'salida' && (
                    <small style={{ color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Máximo disponible para retirar: {Number(stockMovementModal.item.disponible ?? stockMovementModal.item.quantity ?? 0)} unidades
                    </small>
                  )}
                </div>

                <div className="form-group full">
                  <label>Motivo o Referencia (Opcional)</label>
                  <input
                    type="text"
                    value={movementReason}
                    placeholder={
                      stockMovementModal.type === 'ingreso'
                        ? 'Ej. Compra de suministros, donación o reabastecimiento'
                        : 'Ej. Taller de robótica El Carmen, práctica de electrónica'
                    }
                    onChange={(e) => setMovementReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={movementSubmitting}
                  onClick={() => setStockMovementModal(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`btn ${stockMovementModal.type === 'ingreso' ? 'btn-primary' : 'secondary'}`}
                  disabled={movementSubmitting}
                  style={
                    stockMovementModal.type === 'salida'
                      ? { background: 'var(--red, #ef4444)', borderColor: 'var(--red, #ef4444)', color: '#fff' }
                      : {}
                  }
                >
                  {movementSubmitting
                    ? 'Guardando...'
                    : stockMovementModal.type === 'ingreso'
                      ? 'Confirmar Ingreso'
                      : 'Confirmar Salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONSULTAR DETALLE DEL MATERIAL / EQUIPO (SÓLO LECTURA)
          ========================================================================= */}
      {modalDetalleOpen && itemSeleccionado && (
        <ModalDetalleActivo
          item={itemSeleccionado}
          onClose={() => {
            setModalDetalleOpen(false);
            setItemSeleccionado(null);
          }}
          onEdit={(it) => {
            setModalDetalleOpen(false);
            setItemSeleccionado(null);
            const esEquipo = Boolean(
              it.isEquipo || it.serial || it.placa || it.marca || it.area || it.itemType === "equipo"
            );
            if (esEquipo) {
              handleAbrirEditarEquipo(it);
            } else {
              handleOpenEdit(it);
            }
          }}
          onOpenQR={(it) => {
            // Cerrar de inmediato el modal de detalle y transferir el activo al modal de QR
            const itemActual = it || itemSeleccionado;
            setModalDetalleOpen(false);
            setQrModalItem({
              ...itemActual,
              code: itemActual.placa || itemActual.id,
              placa: itemActual.placa || itemActual.id,
              nombre: itemActual.nombre || itemActual.equipo || itemActual.material || itemActual.name,
              name: itemActual.nombre || itemActual.equipo || itemActual.material || itemActual.name,
              model: itemActual.modelo || itemActual.model,
              serial: itemActual.serial,
              sede: itemActual.sede || "Medellín",
              estado: itemActual.estado || itemActual.status,
            });
          }}
        />
      )}

      {/* =========================================================================
          MODAL: EDITAR MATERIAL / CONSUMIBLE
          ========================================================================= */}
      {modalEditarOpen && itemParaEditar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={() => !editConsumibleSubmitting && setModalEditarOpen(false)}
        >
          <div
            className="relative w-full max-w-lg md:max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface, #0b1320)',
              border: '1px solid var(--line, #1e293b)',
              borderRadius: '16px',
              maxWidth: '36rem',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo Arriba */}
            <div
              className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
              style={{
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
                borderBottom: '1px solid var(--line, #1e293b)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="bg-lime-950/60 text-lime-400 border border-lime-500/40 font-mono font-semibold text-xs px-2.5 py-1 rounded-md"
                >
                  {formDataEditar.id || itemParaEditar.id}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0">
                    {isPapeleriaEdit ? 'Editar Insumo de Papelería' : 'Editar Material / Consumible'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0">
                    {isPapeleriaEdit ? 'Actualiza los datos y existencias del insumo de papelería' : 'Actualiza la placa, ficha técnica y existencias en el inventario'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={editConsumibleSubmitting}
                onClick={() => setModalEditarOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Fijo bajo el Header */}
            <div
              className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a]/50 shrink-0"
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--line, #1e293b)',
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                flexShrink: 0,
              }}
            >
              <div
                className="flex items-center justify-between gap-2 max-w-xl mx-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                }}
              >
                {[
                  { paso: 1, label: 'Datos Operativos', icono: '1' },
                  { paso: 2, label: 'Especificaciones', icono: '2' },
                  { paso: 3, label: 'Adquisición y Notas', icono: '3' },
                ].map((item) => {
                  const isActive = pasoActual === item.paso;
                  const isDone = pasoActual > item.paso;
                  return (
                    <button
                      key={item.paso}
                      type="button"
                      onClick={() => setPasoActual(item.paso)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive
                        ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 border-lime-400 shadow-sm'
                        : isDone
                          ? 'bg-lime-950/40 text-lime-400 border-lime-500/40 hover:bg-lime-900/40'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive
                          ? '#ABDE16'
                          : isDone
                            ? 'rgba(171, 222, 22, 0.12)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: isActive
                          ? '#0f172a'
                          : isDone
                            ? '#ABDE16'
                            : 'var(--text-dim, #94a3b8)',
                        border: isActive
                          ? '1px solid #ABDE16'
                          : isDone
                            ? '1px solid rgba(171, 222, 22, 0.35)'
                            : '1px solid var(--line, #334155)',
                        boxShadow: isActive ? '0 2px 10px rgba(171, 222, 22, 0.3)' : 'none',
                      }}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive
                          ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                          : isDone
                            ? 'text-lime-400 font-bold'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold'
                          }`}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          backgroundColor: isActive
                            ? 'rgba(15, 23, 42, 0.2)'
                            : isDone
                              ? 'transparent'
                              : 'rgba(148, 163, 184, 0.2)',
                          color: isActive
                            ? '#0f172a'
                            : isDone
                              ? '#ABDE16'
                              : 'var(--text-dim, #94a3b8)',
                        }}
                      >
                        {isDone ? '✓' : item.icono}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulario Estructurado con Flex y Scroll interno */}
            <form
              onSubmit={handleSubmitEditarConsumible}
              className="flex flex-col flex-1 overflow-hidden"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              {/* Cuerpo del Formulario con scroll vertical */}
              <div
                className="p-5 text-sm overflow-y-auto flex-1"
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--surface, #0b1320)',
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* PASO 1: DATOS OPERATIVOS */}
                {pasoActual === 1 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Datos Operativos
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Nombre del Elemento / Material (Ancho Completo) */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Nombre Del Elemento / Material *
                      </label>
                      <input
                        required
                        type="text"
                        name="material"
                        value={formDataEditar.material || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, material: e.target.value })}
                        placeholder="Ej. ARDUINO UNO R3 con Cable USB"
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    {/* Fila 2: Código / Placa y (Condición si es Papelería, o Categoría si es Consumibles) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Código / Placa *
                        </label>
                        <input
                          required
                          type="text"
                          name="id"
                          value={formDataEditar.id || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, id: e.target.value })}
                          placeholder={isPapeleriaEdit ? "Ej. Pape0036" : "Ej. Rob0043"}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        {isPapeleriaEdit ? (
                          <>
                            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                              Condición del Insumo
                            </label>
                            <select
                              name="condicion"
                              value={formDataEditar.condicion || 'Nuevos'}
                              onChange={(e) => setFormDataEditar({ ...formDataEditar, condicion: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                              style={{
                                backgroundColor: 'var(--bg, #0f172a)',
                                color: 'var(--text, #f8fafc)',
                                borderColor: 'var(--line, #334155)',
                              }}
                            >
                              <option value="Nuevos">Nuevos</option>
                              <option value="Usados">Usados</option>
                              <option value="Mixto">Mixto</option>
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                              Categoría *
                            </label>
                            <select
                              name="categoria"
                              value={formDataEditar.categoria || 'Robótica'}
                              onChange={(e) => setFormDataEditar({ ...formDataEditar, categoria: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                              style={{
                                backgroundColor: 'var(--bg, #0f172a)',
                                color: 'var(--text, #f8fafc)',
                                borderColor: 'var(--line, #334155)',
                              }}
                            >
                              <option value="Robótica">Robótica</option>
                              <option value="Electrónica">Electrónica</option>
                              <option value="Herramientas">Herramientas</option>
                              <option value="Impresión 3D">Impresión 3D</option>
                              <option value="Cables y Adaptadores">Cables y Adaptadores</option>
                              <option value="Cómputo & Formación">Cómputo & Formación</option>
                            </select>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fila 3: Sede / Ubicación Física y Estante / Caja / Gaveta (en 2 columnas balanceadas) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Sede / Ubicación Física
                        </label>
                        <input
                          type="text"
                          name="ubicacion"
                          value={formDataEditar.ubicacion || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, ubicacion: e.target.value })}
                          placeholder="Ej. Oficina FMO"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estante / Caja / Gaveta
                        </label>
                        <input
                          type="text"
                          name="ubicacion_estante"
                          value={formDataEditar.ubicacion_estante || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, ubicacion_estante: e.target.value })}
                          placeholder="Ej. Caja Rimax 12, Estantería B-1"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 4: Cantidad / Disponibles * y Stock Mínimo De Alerta * (en 2 columnas balanceadas) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Cantidad / Disponibles *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          name="disponible"
                          value={formDataEditar.disponible ?? 0}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, disponible: e.target.value })}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Stock Mínimo De Alerta *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          name="minimo"
                          value={formDataEditar.minimo ?? (isPapeleriaEdit ? 3 : 5)}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, minimo: e.target.value })}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 2: ESPECIFICACIONES */}
                {pasoActual === 2 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Especificaciones y Condición
                      </h4>
                    </div>

                    {/* Características */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Características
                      </label>
                      <input
                        type="text"
                        name="caracteristicas"
                        value={formDataEditar.caracteristicas || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, caracteristicas: e.target.value })}
                        placeholder="Marcas, presentación, conectores, voltajes..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    {/* Estado y Condición en 2 Columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estado
                        </label>
                        <select
                          name="estado"
                          value={formDataEditar.estado || 'Bueno'}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, estado: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Bueno">Bueno</option>
                          <option value="Regular">Regular</option>
                          <option value="Malo">Malo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Condición
                        </label>
                        <select
                          name="condicion"
                          value={formDataEditar.condicion || 'Nuevo'}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, condicion: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Nuevo">Nuevo</option>
                          <option value="Usado">Usado</option>
                          <option value="Donación">Donación</option>
                        </select>
                      </div>
                    </div>

                    {/* Descripción Técnica */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Descripción Técnica
                      </label>
                      <textarea
                        name="descripcion"
                        rows="2"
                        value={formDataEditar.descripcion || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, descripcion: e.target.value })}
                        placeholder="Descripción técnica del componente o material..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* PASO 3: ADQUISICIÓN Y NOTAS */}
                {pasoActual === 3 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Adquisición, Garantía y Notas
                      </h4>
                    </div>

                    {/* Fila: Valor de Compra, Fecha Compra, Vencimiento Garantía */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Compra ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="valor_compra"
                          value={formDataEditar.valor_compra ?? ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, valor_compra: e.target.value })}
                          placeholder="Ej. 35000"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Fecha Compra
                        </label>
                        <input
                          type="date"
                          name="fecha_compra"
                          value={formDataEditar.fecha_compra || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, fecha_compra: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Vencimiento Garantía
                        </label>
                        <input
                          type="date"
                          name="fecha_vencimiento_garantia"
                          value={formDataEditar.fecha_vencimiento_garantia || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, fecha_vencimiento_garantia: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Notas u Observaciones */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows="2"
                        value={formDataEditar.observaciones || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, observaciones: e.target.value })}
                        placeholder="Detalles sobre proveedores, donaciones o especificaciones..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fijo Abajo (Siempre Visible) */}
              <div
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: 'var(--surface-2, #0f172a)',
                  borderTop: '1px solid var(--line, #1e293b)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                {/* Botón Cancelar (Izquierda) */}
                <button
                  type="button"
                  disabled={editConsumibleSubmitting}
                  onClick={() => setModalEditarOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--line, #334155)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancelar
                </button>

                {/* Botones de Navegación del Asistente (Derecha) */}
                <div
                  className="flex items-center gap-2.5"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  {pasoActual > 1 && (
                    <button
                      type="button"
                      disabled={editConsumibleSubmitting}
                      onClick={() => setPasoActual((prev) => prev - 1)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--surface, #1e293b)',
                        border: '1px solid var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>←</span> Anterior
                    </button>
                  )}

                  {pasoActual < 3 && (
                    <button
                      type="button"
                      disabled={editConsumibleSubmitting}
                      onClick={() => setPasoActual((prev) => prev + 1)}
                      className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#a3e635',
                        border: '1px solid #84cc16',
                        color: '#020617',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(163, 230, 53, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Siguiente</span>
                      <span>→</span>
                    </button>
                  )}

                  {pasoActual === 3 && (
                    <button
                      type="submit"
                      disabled={editConsumibleSubmitting}
                      className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#ABDE16',
                        border: '1px solid #96c412',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 12px rgba(171, 222, 22, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {editConsumibleSubmitting ? (
                        <>
                          <span
                            className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '2px solid rgba(15, 23, 42, 0.2)',
                              borderTopColor: '#0f172a',
                              display: 'inline-block',
                            }}
                          />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Guardar Cambios</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDITAR EQUIPO TECNOLÓGICO (REUTILIZANDO ModalEditarActivo)
          ========================================================================= */}
      {modalEditarEquipoOpen && equipoParaEditar && (
        <ModalEditarActivo
          isOpen={modalEditarEquipoOpen}
          onClose={() => setModalEditarEquipoOpen(false)}
          activo={equipoParaEditar}
          equipo={equipoParaEditar}
          formData={formDataEditarEquipo}
          setFormData={setFormDataEditarEquipo}
          pasoActual={pasoActualEditarEquipo}
          setPasoActual={setPasoActualEditarEquipo}
          onSubmit={handleSubmitEditarEquipo}
          submitting={editEquipoSubmitting}
        />
      )}


      {/* =========================================================================
          MODAL: REGISTRO DE NUEVO CONSUMIBLE (+ NUEVO CONSUMIBLE) - 3 PASOS WIZARD
          ========================================================================= */}
      {modalNuevoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={() => !newConsumibleSubmitting && setModalNuevoOpen(false)}
        >
          <div
            className="relative w-full max-w-lg md:max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface, #0b1320)',
              border: '1px solid var(--line, #1e293b)',
              borderRadius: '16px',
              maxWidth: '36rem',
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo Arriba */}
            <div
              className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
              style={{
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
                borderBottom: '1px solid var(--line, #1e293b)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="bg-lime-950/60 text-lime-400 border border-lime-500/40 font-mono font-semibold text-xs px-2.5 py-1 rounded-md"
                >
                  {formDataNuevo.id || '+ Nuevo'}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0">
                    {isPapeleriaNuevo ? 'Nuevo Insumo de Papelería' : 'Nuevo Material / Consumible'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0">
                    {isPapeleriaNuevo ? 'Registra un nuevo material institucional para el catálogo de papelería' : 'Registra la ficha técnica y existencias iniciales en el inventario'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={newConsumibleSubmitting}
                onClick={() => setModalNuevoOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Fijo bajo el Header */}
            <div
              className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a]/50 shrink-0"
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--line, #1e293b)',
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                flexShrink: 0,
              }}
            >
              <div
                className="flex items-center justify-between gap-2 max-w-xl mx-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                }}
              >
                {[
                  { paso: 1, label: 'Datos Operativos', icono: '1' },
                  { paso: 2, label: 'Especificaciones', icono: '2' },
                  { paso: 3, label: 'Adquisición y Notas', icono: '3' },
                ].map((item) => {
                  const isActive = pasoActualNuevo === item.paso;
                  const isDone = pasoActualNuevo > item.paso;
                  return (
                    <button
                      key={item.paso}
                      type="button"
                      onClick={() => setPasoActualNuevo(item.paso)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive
                        ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 border-lime-400 shadow-sm'
                        : isDone
                          ? 'bg-lime-950/40 text-lime-400 border-lime-500/40 hover:bg-lime-900/40'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive
                          ? '#ABDE16'
                          : isDone
                            ? 'rgba(171, 222, 22, 0.12)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: isActive
                          ? '#0f172a'
                          : isDone
                            ? '#ABDE16'
                            : 'var(--text-dim, #94a3b8)',
                        border: isActive
                          ? '1px solid #ABDE16'
                          : isDone
                            ? '1px solid rgba(171, 222, 22, 0.35)'
                            : '1px solid var(--line, #334155)',
                        boxShadow: isActive ? '0 2px 10px rgba(171, 222, 22, 0.3)' : 'none',
                      }}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive
                          ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                          : isDone
                            ? 'text-lime-400 font-bold'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold'
                          }`}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          backgroundColor: isActive
                            ? 'rgba(15, 23, 42, 0.2)'
                            : isDone
                              ? 'transparent'
                              : 'rgba(148, 163, 184, 0.2)',
                          color: isActive
                            ? '#0f172a'
                            : isDone
                              ? '#ABDE16'
                              : 'var(--text-dim, #94a3b8)',
                        }}
                      >
                        {isDone ? '✓' : item.icono}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulario Estructurado con Flex sin scroll */}
            <form
              onSubmit={handleSubmitNuevoConsumible}
              className="flex flex-col flex-1 overflow-hidden"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              {/* Cuerpo del Formulario */}
              <div
                className="p-5 text-sm overflow-y-auto flex-1"
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--surface, #0b1320)',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {/* PASO 1: DATOS OPERATIVOS */}
                {pasoActualNuevo === 1 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Datos Operativos
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Nombre del Elemento / Material (Ancho Completo) */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Nombre Del Elemento / Material *
                      </label>
                      <input
                        required
                        type="text"
                        name="material"
                        value={formDataNuevo.material || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, material: e.target.value })}
                        placeholder={isPapeleriaNuevo ? "Ej. Carpetas de Cartón Yute Oficio" : "Ej. Sensor Ultrasónico HC-SR04 o Arduino UNO"}
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    {/* Fila 2: Código / Placa y (Condición si es Papelería, o Categoría si es Consumible) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Código Del Ítem *
                        </label>
                        <input
                          required
                          type="text"
                          name="id"
                          readOnly={false}
                          disabled={false}
                          value={formDataNuevo.id || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, id: e.target.value })}
                          placeholder={isPapeleriaNuevo ? "Ej. Pape2012" : "Ej. Rob0143"}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-dim, #94a3b8)', lineHeight: 1.3 }}>
                          <span className="text-lime-600 font-semibold" style={{ color: '#84cc16', fontWeight: 600 }}>ℹ Consecutivo:</span>{' '}
                          {isPapeleriaNuevo ? 'Formato institucional PapeXXXX sugerido.' : 'Sigue el consecutivo sugerido.'}
                        </p>
                      </div>

                      <div>
                        {isPapeleriaNuevo ? (
                          <>
                            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                              Condición del Insumo *
                            </label>
                            <select
                              required
                              name="condicion"
                              value={formDataNuevo.condicion || 'Nuevos'}
                              onChange={(e) => setFormDataNuevo({ ...formDataNuevo, condicion: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                              style={{
                                backgroundColor: 'var(--bg, #0f172a)',
                                color: 'var(--text, #f8fafc)',
                                borderColor: 'var(--line, #334155)',
                              }}
                            >
                              <option value="Nuevos">Nuevos</option>
                              <option value="Usados">Usados</option>
                              <option value="Mixto">Mixto</option>
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                              Categoría *
                            </label>
                            <select
                              required
                              name="categoria"
                              value={formDataNuevo.categoria || 'Robótica'}
                              onChange={(e) => setFormDataNuevo({ ...formDataNuevo, categoria: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                              style={{
                                backgroundColor: 'var(--bg, #0f172a)',
                                color: 'var(--text, #f8fafc)',
                                borderColor: 'var(--line, #334155)',
                              }}
                            >
                              <option value="Robótica">Robótica</option>
                              <option value="Electrónica">Electrónica</option>
                              <option value="Herramientas">Herramientas</option>
                              <option value="Impresión 3D">Impresión 3D</option>
                              <option value="Cables y Adaptadores">Cables y Adaptadores</option>
                              <option value="Cómputo & Formación">Cómputo & Formación</option>
                            </select>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Fila 3: Sede / Ubicación Física y Estante / Caja / Gaveta (en 2 columnas balanceadas) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Sede / Ubicación Física
                        </label>
                        <input
                          type="text"
                          name="ubicacion"
                          value={formDataNuevo.ubicacion || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, ubicacion: e.target.value })}
                          placeholder="Ej. Oficina FMO"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estante / Caja / Gaveta
                        </label>
                        <input
                          type="text"
                          name="ubicacion_estante"
                          value={formDataNuevo.ubicacion_estante || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, ubicacion_estante: e.target.value })}
                          placeholder="Ej. Caja Rimax 12, Estantería B-1"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 4: Cantidad / Disponibles * y Stock Mínimo De Alerta * (en 2 columnas balanceadas) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Cantidad Inicial / Existencias *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          name="disponible"
                          value={formDataNuevo.disponible ?? 10}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, disponible: e.target.value })}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Stock Mínimo De Alerta *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          name="minimo"
                          value={formDataNuevo.minimo ?? (isPapeleriaNuevo ? 3 : 5)}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, minimo: e.target.value })}
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 2: ESPECIFICACIONES */}
                {pasoActualNuevo === 2 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Especificaciones y Condición
                      </h4>
                    </div>

                    {/* Características */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Características
                      </label>
                      <input
                        type="text"
                        name="caracteristicas"
                        value={formDataNuevo.caracteristicas || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, caracteristicas: e.target.value })}
                        placeholder="Marcas, presentación, conectores, voltajes..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    {/* Estado y Condición en 2 Columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estado
                        </label>
                        <select
                          name="estado"
                          value={formDataNuevo.estado || 'Bueno'}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, estado: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Bueno">Bueno</option>
                          <option value="Regular">Regular</option>
                          <option value="Malo">Malo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Condición
                        </label>
                        <select
                          name="condicion"
                          value={formDataNuevo.condicion || 'Nuevos'}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, condicion: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Nuevos">Nuevos</option>
                          <option value="Usados">Usados</option>
                          <option value="Nuevos y Usados">Nuevos y Usados</option>
                          <option value="Donación">Donación</option>
                        </select>
                      </div>
                    </div>

                    {/* Descripción Técnica */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Descripción Técnica
                      </label>
                      <textarea
                        name="descripcion"
                        rows="2"
                        value={formDataNuevo.descripcion || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, descripcion: e.target.value })}
                        placeholder="Descripción técnica del componente o material..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* PASO 3: ADQUISICIÓN Y NOTAS */}
                {pasoActualNuevo === 3 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Adquisición, Garantía y Notas
                      </h4>
                    </div>

                    {/* Fila: Valor de Compra, Fecha Compra, Vencimiento Garantía */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Compra ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="valor_compra"
                          value={formDataNuevo.valor_compra ?? ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, valor_compra: e.target.value })}
                          placeholder="Ej. 35000"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Fecha Compra
                        </label>
                        <input
                          type="date"
                          name="fecha_compra"
                          value={formDataNuevo.fecha_compra || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, fecha_compra: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Vencimiento Garantía
                        </label>
                        <input
                          type="date"
                          name="fecha_vencimiento_garantia"
                          value={formDataNuevo.fecha_vencimiento_garantia || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, fecha_vencimiento_garantia: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Notas u Observaciones */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows="2"
                        value={formDataNuevo.observaciones || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, observaciones: e.target.value })}
                        placeholder="Detalles sobre proveedores, donaciones o especificaciones..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fijo Abajo (Siempre Visible) */}
              <div
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: 'var(--surface-2, #0f172a)',
                  borderTop: '1px solid var(--line, #1e293b)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                {/* Botón Cancelar (Izquierda) */}
                <button
                  type="button"
                  disabled={newConsumibleSubmitting}
                  onClick={() => setModalNuevoOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--line, #334155)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancelar
                </button>

                {/* Botones de Navegación del Asistente (Derecha) */}
                <div
                  className="flex items-center gap-2.5"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <button
                    type="button"
                    disabled={pasoActualNuevo === 1 || newConsumibleSubmitting}
                    onClick={() => pasoActualNuevo > 1 && setPasoActualNuevo((prev) => prev - 1)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${pasoActualNuevo === 1
                      ? 'opacity-40 cursor-not-allowed bg-slate-800/40 text-slate-500 border border-slate-700/40'
                      : 'cursor-pointer hover:bg-slate-800 text-slate-200'
                      }`}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: pasoActualNuevo === 1 ? 'rgba(30, 41, 59, 0.3)' : 'var(--surface, #1e293b)',
                      border: '1px solid var(--line, #334155)',
                      color: pasoActualNuevo === 1 ? 'var(--text-dim, #64748b)' : 'var(--text, #f8fafc)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: pasoActualNuevo === 1 ? 'not-allowed' : 'pointer',
                      opacity: pasoActualNuevo === 1 ? 0.45 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>←</span> Anterior
                  </button>

                  {pasoActualNuevo < 3 && (
                    <button
                      type="button"
                      disabled={newConsumibleSubmitting}
                      onClick={() => {
                        // Validación rápida de paso 1 al avanzar
                        if (pasoActualNuevo === 1) {
                          if (!formDataNuevo.id?.trim()) {
                            showError('Validación', 'El código del ítem es obligatorio (ej: Rob0143).');
                            return;
                          }
                          if (!formDataNuevo.material?.trim()) {
                            showError('Validación', 'El nombre del material es obligatorio.');
                            return;
                          }
                          if (formDataNuevo.disponible === '' || isNaN(Number(formDataNuevo.disponible)) || Number(formDataNuevo.disponible) < 0) {
                            showError('Validación', 'La cantidad inicial debe ser un número mayor o igual a 0.');
                            return;
                          }
                        }
                        setPasoActualNuevo((prev) => prev + 1);
                      }}
                      className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#ABDE16',
                        border: '1px solid #ABDE16',
                        color: '#020617',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(171, 222, 22, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Siguiente</span>
                      <span>→</span>
                    </button>
                  )}

                  {pasoActualNuevo === 3 && (
                    <button
                      type="submit"
                      disabled={newConsumibleSubmitting}
                      className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#ABDE16',
                        border: '1px solid #96c412',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 12px rgba(171, 222, 22, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {newConsumibleSubmitting ? (
                        <>
                          <span
                            className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '2px solid rgba(15, 23, 42, 0.2)',
                              borderTopColor: '#0f172a',
                              display: 'inline-block',
                            }}
                          />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Guardar Consumible</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTRO DE NUEVO EQUIPO TECNOLÓGICO (DISEÑO FIEL A IMAGEN 1)
          ========================================================================= */}
      {modalNuevoEquipoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={() => !newEquipoSubmitting && setModalNuevoEquipoOpen(false)}
        >
          <div
            className="relative w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface, #0b1320)',
              border: '1px solid var(--line, #1e293b)',
              borderRadius: '16px',
              maxWidth: '36rem',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo Idéntico a la Imagen 1 */}
            <div
              className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
              style={{
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
                borderBottom: '1px solid var(--line, #1e293b)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  {formDataNuevoEquipo.placa ? formDataNuevoEquipo.placa : '+ Activo'}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0" style={{ margin: 0, fontSize: '15px' }}>
                  Registro de Nuevo Equipo Tecnológico
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
                  Ingresa los datos del equipo y sus especificaciones técnicas
                </p>
              </div>
              <button
                type="button"
                disabled={newEquipoSubmitting}
                onClick={() => setModalNuevoEquipoOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Fijo bajo el Header Idéntico a la Imagen 1 */}
            <div
              className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a]/50 shrink-0"
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--line, #1e293b)',
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                flexShrink: 0,
              }}
            >
              <div
                className="flex items-center justify-between gap-2 max-w-xl mx-auto"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                }}
              >
                {[
                  { paso: 1, label: 'Identificación', icono: '1' },
                  { paso: 2, label: 'Ficha Técnica', icono: '2' },
                  { paso: 3, label: 'Adquisición y Notas', icono: '3' },
                ].map((item) => {
                  const isActive = pasoActualEquipo === item.paso;
                  const isDone = pasoActualEquipo > item.paso;
                  return (
                    <button
                      key={item.paso}
                      type="button"
                      onClick={() => setPasoActualEquipo(item.paso)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive
                        ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 border-lime-400 shadow-sm'
                        : isDone
                          ? 'bg-lime-950/40 text-lime-400 border-lime-500/40 hover:bg-lime-900/40'
                          : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive
                          ? '#ABDE16'
                          : isDone
                            ? 'rgba(171, 222, 22, 0.12)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: isActive
                          ? '#0f172a'
                          : isDone
                            ? '#ABDE16'
                            : 'var(--text-dim, #94a3b8)',
                        border: isActive
                          ? '1px solid #ABDE16'
                          : isDone
                            ? '1px solid rgba(171, 222, 22, 0.35)'
                            : '1px solid var(--line, #334155)',
                        boxShadow: isActive ? '0 2px 10px rgba(171, 222, 22, 0.3)' : 'none',
                      }}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive
                          ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                          : isDone
                            ? 'text-lime-400 font-bold'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold'
                          }`}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          backgroundColor: isActive
                            ? 'rgba(15, 23, 42, 0.2)'
                            : isDone
                              ? 'transparent'
                              : 'rgba(148, 163, 184, 0.2)',
                          color: isActive
                            ? '#0f172a'
                            : isDone
                              ? '#ABDE16'
                              : 'var(--text-dim, #94a3b8)',
                        }}
                      >
                        {isDone ? '✓' : item.icono}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formulario Estructurado sin scroll innecesario */}
            <form
              onSubmit={handleSubmitNuevoEquipo}
              className="flex flex-col flex-1 overflow-hidden"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              {/* Cuerpo del Formulario */}
              <div
                className="p-5 text-sm overflow-y-auto flex-1"
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--surface, #0b1320)',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {/* ==========================================
                    PASO 1: Identificación y Clasificación
                    ========================================== */}
                {pasoActualEquipo === 1 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Identificación y Clasificación
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Nombre del Elemento / Equipo (Ancho Completo) */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Nombre Del Elemento / Equipo *
                      </label>
                      <input
                        required
                        type="text"
                        name="nombre"
                        value={formDataNuevoEquipo.nombre || ''}
                        onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, nombre: e.target.value })}
                        placeholder="Ej. Portátil Lenovo ThinkPad L14"
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    {/* Fila 2: Código / Placa y Categoría en 2 Columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Código / Placa *
                        </label>
                        <input
                          required
                          type="text"
                          name="placa"
                          readOnly={false}
                          disabled={false}
                          value={formDataNuevoEquipo.placa || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, placa: e.target.value })}
                          placeholder="Ej: P57 o PLA-901"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-dim, #94a3b8)', lineHeight: 1.3 }}>
                          <span className="text-lime-600 font-semibold" style={{ color: '#84cc16', fontWeight: 600 }}>ℹ Código sugerido automáticamente:</span>{' '}
                          Sigue el consecutivo institucional, pero puedes modificarlo si el equipo ya cuenta con otra placa física.
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Categoría *
                        </label>
                        <select
                          name="categoria"
                          value={formDataNuevoEquipo.categoria || 'Portátiles'}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, categoria: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Portátiles">Portátiles / Laptops</option>
                          <option value="Tablets">Tablets</option>
                          <option value="Robótica y Sensores">Robótica y Sensores</option>
                          <option value="Proyectores y Audio">Proyectores y Audio</option>
                          <option value="Cámaras y Video">Cámaras y Video</option>
                          <option value="Impresoras 3D">Impresoras 3D</option>
                          <option value="Redes y Servidores">Redes y Servidores</option>
                          <option value="Otros Equipos">Otros Equipos</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila 3: Cantidad y Condición en 2 Columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          name="cantidad"
                          value={1}
                          readOnly
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Condición
                        </label>
                        <select
                          name="condicion"
                          value={formDataNuevoEquipo.condicion || 'Nuevo'}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, condicion: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <option value="Nuevo">Nuevo</option>
                          <option value="Usado">Usado</option>
                          <option value="Donación">Donación</option>
                        </select>
                      </div>
                    </div>

                    {/* Fila 4: Área Asignada y Descripción */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Área Asignada
                      </label>
                      <input
                        type="text"
                        name="area"
                        value={formDataNuevoEquipo.area || ''}
                        onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, area: e.target.value })}
                        placeholder="Ej. Formación, Robótica, Administración..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Descripción General
                      </label>
                      <textarea
                        name="descripcion"
                        rows="2"
                        value={formDataNuevoEquipo.descripcion || ''}
                        onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, descripcion: e.target.value })}
                        placeholder="Descripción general del equipo o propósito institucional..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ==========================================
                    PASO 2: Ficha Técnica y Asignación
                    ========================================== */}
                {pasoActualEquipo === 2 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Especificaciones y Ficha Técnica
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Marca, Modelo, Serial * en 3 Columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Marca
                        </label>
                        <input
                          type="text"
                          name="marca"
                          value={formDataNuevoEquipo.marca || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, marca: e.target.value })}
                          placeholder="Ej. Lenovo, Dell, HP..."
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Modelo
                        </label>
                        <input
                          type="text"
                          name="modelo"
                          value={formDataNuevoEquipo.modelo || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, modelo: e.target.value })}
                          placeholder="Ej. ThinkPad L14"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Serial *
                        </label>
                        <input
                          required
                          type="text"
                          name="serial"
                          value={formDataNuevoEquipo.serial || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, serial: e.target.value })}
                          placeholder="Ej. PF-3X9011"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 2: Características 1, 2 y 3 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Característica 1
                        </label>
                        <input
                          type="text"
                          name="caracteristica_1"
                          value={formDataNuevoEquipo.caracteristica_1 || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, caracteristica_1: e.target.value })}
                          placeholder="Ej. RAM 16GB / i5"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Característica 2
                        </label>
                        <input
                          type="text"
                          name="caracteristica_2"
                          value={formDataNuevoEquipo.caracteristica_2 || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, caracteristica_2: e.target.value })}
                          placeholder="Ej. SSD 512GB"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Característica 3
                        </label>
                        <input
                          type="text"
                          name="caracteristica_3"
                          value={formDataNuevoEquipo.caracteristica_3 || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, caracteristica_3: e.target.value })}
                          placeholder="Ej. Pantalla 14 FHD"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 3: Sede / Ubicación Física, Estante/Caja/Gaveta y Responsable */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Sede / Ubicación Física
                        </label>
                        <input
                          type="text"
                          name="ubicacion"
                          value={formDataNuevoEquipo.ubicacion || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, ubicacion: e.target.value })}
                          placeholder="Ej. Oficina Medellín"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estante / Caja / Gaveta
                        </label>
                        <input
                          type="text"
                          name="ubicacion_estante"
                          value={formDataNuevoEquipo.ubicacion_estante || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, ubicacion_estante: e.target.value })}
                          placeholder="Ej. Estante A-2, Caja 05, Gaveta 3"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Responsable / Custodio
                        </label>
                        <input
                          type="text"
                          name="responsable"
                          value={formDataNuevoEquipo.responsable || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, responsable: e.target.value })}
                          placeholder="Ej. Bodega Central o Custodio"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ==========================================
                    PASO 3: Adquisición, Garantía y Accesos
                    ========================================== */}
                {pasoActualEquipo === 3 && (
                  <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#ABDE16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Adquisición, Garantía y Notas
                      </h4>
                      <span className="text-[11px] text-slate-400">Datos de compra y observaciones</span>
                    </div>

                    {/* Fila 1: Proveedor, Valor Unitario, Valor Total */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Proveedor
                        </label>
                        <input
                          type="text"
                          name="proveedor"
                          value={formDataNuevoEquipo.proveedor || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, proveedor: e.target.value })}
                          placeholder="Ej. Lenovo Colombia"
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Unitario ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="valor_compra"
                          value={formDataNuevoEquipo.valor_compra ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const qty = Number(formDataNuevoEquipo.cantidad) || 1;
                            setFormDataNuevoEquipo({
                              ...formDataNuevoEquipo,
                              valor_compra: val,
                              valor_total: val !== '' ? Number(val) * qty : '',
                            });
                          }}
                          placeholder="Ej. 2800000"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Total ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          name="valor_total"
                          value={formDataNuevoEquipo.valor_total ?? ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, valor_total: e.target.value })}
                          placeholder="Ej. 2800000"
                          className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 2: Fecha Compra y Vencimiento Garantía */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Fecha Compra
                        </label>
                        <input
                          type="date"
                          name="fecha_compra"
                          value={formDataNuevoEquipo.fecha_compra || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, fecha_compra: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Vencimiento Garantía
                        </label>
                        <input
                          type="date"
                          name="fecha_vencimiento_garantia"
                          value={formDataNuevoEquipo.fecha_vencimiento_garantia || ''}
                          onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, fecha_vencimiento_garantia: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 3: Claves y Observaciones */}
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Claves / Credenciales de Acceso
                      </label>
                      <textarea
                        name="claves_otros"
                        rows="2"
                        value={formDataNuevoEquipo.claves_otros || ''}
                        onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, claves_otros: e.target.value })}
                        placeholder="PIN de acceso, usuario administrador o credenciales..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows="2"
                        value={formDataNuevoEquipo.observaciones || ''}
                        onChange={(e) => setFormDataNuevoEquipo({ ...formDataNuevoEquipo, observaciones: e.target.value })}
                        placeholder="Comentarios adicionales, estado del paquete, donante..."
                        className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Fijo Abajo Idéntico a la Imagen 1 */}
              <div
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
                style={{
                  backgroundColor: 'var(--surface-2, #0f172a)',
                  borderTop: '1px solid var(--line, #1e293b)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                {/* Botón Cancelar (Izquierda) */}
                <button
                  type="button"
                  disabled={newEquipoSubmitting}
                  onClick={() => setModalNuevoEquipoOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--line, #334155)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Cancelar
                </button>

                {/* Botones de Navegación del Asistente (Derecha) */}
                <div
                  className="flex items-center gap-2.5"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  {pasoActualEquipo > 1 && (
                    <button
                      type="button"
                      disabled={newEquipoSubmitting}
                      onClick={() => setPasoActualEquipo((prev) => prev - 1)}
                      className="cursor-pointer hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--surface, #1e293b)',
                        border: '1px solid var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>←</span> Anterior
                    </button>
                  )}

                  {pasoActualEquipo < 3 && (
                    <button
                      type="button"
                      disabled={newEquipoSubmitting}
                      onClick={() => {
                        // Validación de paso 1
                        if (pasoActualEquipo === 1) {
                          if (!formDataNuevoEquipo.nombre?.trim()) {
                            showError('Validación', 'El Nombre del equipo es obligatorio.');
                            return;
                          }
                          if (!formDataNuevoEquipo.placa?.trim()) {
                            showError('Validación', 'La Placa / Código del equipo es obligatorio (ej: FMO-EQ-005).');
                            return;
                          }
                        }
                        // Validación de paso 2
                        if (pasoActualEquipo === 2) {
                          if (!formDataNuevoEquipo.serial?.trim()) {
                            showError('Validación', 'El Serial del equipo es obligatorio.');
                            return;
                          }
                        }
                        setPasoActualEquipo((prev) => prev + 1);
                      }}
                      className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#ABDE16',
                        border: '1px solid #ABDE16',
                        color: '#020617',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(171, 222, 22, 0.3)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Siguiente</span>
                      <span>→</span>
                    </button>
                  )}

                  {pasoActualEquipo === 3 && (
                    <button
                      type="submit"
                      disabled={newEquipoSubmitting}
                      className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#ABDE16',
                        border: '1px solid #96c412',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 12px rgba(171, 222, 22, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {newEquipoSubmitting ? (
                        <>
                          <span
                            className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '2px solid rgba(15, 23, 42, 0.2)',
                              borderTopColor: '#0f172a',
                              display: 'inline-block',
                            }}
                          />
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Registrar Equipo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CÓDIGO QR FLOTANTE PARA MATERIAL / CONSUMIBLE
          ========================================================================= */}
      {qrConsumibleItem && (
        <div
          className="modal-backdrop"
          onClick={() => setQrConsumibleItem(null)}
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
          }}
        >
          <div
            className="modal-dialog qr-dialog no-print-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', textAlign: 'center', padding: '24px' }}
          >
            <div className="modal-header no-print" style={{ marginBottom: '14px', borderBottom: 'none', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📷</span>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Código QR del Material</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setQrConsumibleItem(null)}
              >
                ✕
              </button>
            </div>

            {/* Tarjeta con QR y datos (Etiqueta Imprimible) */}
            <div
              className="printable-label"
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
                color: '#0f172a',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <img src="/logo-marina-orth.png" alt="Marina Orth" style={{ height: '24px', objectFit: 'contain' }} />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', color: '#0f172a' }}>
                  FUNDACIÓN MARINA ORTH
                </span>
              </div>

              <div
                id="consumible-qr-svg-container"
                style={{
                  background: '#ffffff',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '14px',
                }}
              >
                <QRCodeSVG
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/activo/${encodeURIComponent(qrConsumibleItem.id)}`
                      : `FMO-${qrConsumibleItem.id}`
                  }
                  size={170}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>

              <span
                className="mono-num qr-placa"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  padding: '3px 12px',
                  borderRadius: '4px',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                  display: 'inline-block',
                }}
              >
                {qrConsumibleItem.id}
              </span>

              <strong className="qr-name" style={{ fontSize: '14px', color: '#0f172a', marginBottom: '4px' }}>
                {qrConsumibleItem.material || qrConsumibleItem.name}
              </strong>

              <span className="qr-sede" style={{ fontSize: '12px', color: '#64748b' }}>
                {qrConsumibleItem.categoria || qrConsumibleItem.category || 'Robótica'} • {qrConsumibleItem.ubicacion || 'Oficina FMO'}
              </span>
            </div>

            {/* Botones de acción (ocultos en impresión) */}
            <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn small ghost no-print"
                onClick={() => setQrConsumibleItem(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn small btn-primary no-print"
                onClick={() => window.print()}
              >
                🖨️ Imprimir Etiqueta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
