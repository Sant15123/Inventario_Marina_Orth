import FmoCobrandingBadge from '../components/common/FmoCobrandingBadge';
import ProgramAreaBadge, { ProgramAreaSelect } from '../components/common/ProgramAreaBadge';
import { getProgramTheme } from '../utils/programThemes';
import {
  FmoProgramBadge,
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
} from '../components/common/FmoProgramIcons';
import { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Eye, Pencil, Trash2, X, Laptop, Cpu, Plug, FileText, Armchair, Printer, Plus } from 'lucide-react';
import ModalQR from '../components/modals/ModalQR';
import ImpresionMasivaQRModal from '../components/modals/ImpresionMasivaQRModal';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalEditarActivo from '../components/modals/ModalEditarActivo';
import ModalRegistroMobiliario from '../components/modals/ModalRegistroMobiliario';
import ModalRegistroElectronica from '../components/modals/ModalRegistroElectronica';
import ModalRegistroEquipoTecnologico from '../components/modals/ModalRegistroEquipoTecnologico';
import ModalBajaConsumible from '../components/modals/ModalBajaConsumible';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { available, SEDES, EMPLOYEES, PROYECTOS, today } from '../services/mockData';
import inventoryApi, { API_BASE_URL } from '../services/inventoryApi';
import { exportarLibroMaestroExcelFMO } from '../services/excelExportService';
import { supabase } from '../services/supabase';

import catalogoPapeleriaFMO from '../data/catalogoPapeleriaFMO.json';

// Catálogo oficial de Papelería institucional (Insumos de oficina y formación STEAM - 105 ítems)
const DEFAULT_PAPELERIA = catalogoPapeleriaFMO;

// Mapeador consistente para consumibles con soporte a todos los campos
const mapConsumibleItem = (c) => {
  const disp = Number(c.disponible ?? c.quantity ?? 0);
  const min = Number(c.minimo ?? c.minStock ?? 5);
  const isPape = c.categoria === 'Papelería' || c.category === 'Papelería' || c.subtipo === 'papeleria' || String(c.id || '').toLowerCase().startsWith('pape');
  const defaultArea = isPape ? 'TeachLabs' : 'Robótica';
  const customAreas = (() => {
    try { return JSON.parse(localStorage.getItem('siga_custom_areas') || '{}'); } catch { return {}; }
  })();
  const savedArea = customAreas[c.id] || customAreas[c.codigo] || customAreas[c.placa];
  const resolvedArea = savedArea || c.area_asignada || c.area || defaultArea;
  return {
    id: c.id,
    material: c.material || c.name || '',
    name: c.material || c.name || '',
    categoria: c.categoria || c.category || (isPape ? 'Papelería' : 'Robótica'),
    category: c.categoria || c.category || (isPape ? 'Papelería' : 'Robótica'),
    area: resolvedArea,
    area_asignada: resolvedArea,
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
  const areaAsignada = a.area_asignada || a.area || a.programa || 'Nuevas Tecnologías';

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
    area: areaAsignada,
    area_asignada: areaAsignada,
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
    en_contabilidad: Boolean(a.en_contabilidad),
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
        area: areaAsignada,
        area_asignada: areaAsignada,
      },
    ],
  };
};

// Número de filas por página por defecto para tablas de inventario (configurable reactivamente)
const DEFAULT_ITEMS_PER_PAGE = 25;

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
  sedes: propSedes,
}) {
  // Sedes dinámicas obtenidas de props o base de datos / catálogo
  const [sedesList, setSedesList] = useState(() => (Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES));

  useEffect(() => {
    let isMounted = true;
    const fetchSedesInventario = async () => {
      try {
        let lista = [];
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from('sedes')
              .select('id, nombre, activo')
              .order('nombre', { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
              lista = data.filter((s) => s.activo !== false).map((s) => s.nombre || s.nombre_sede || s);
            }
          }
        } catch (sErr) {
          console.warn('Consulta directa Supabase sedes:', sErr.message);
        }

        if (lista.length === 0) {
          try {
            const apiRes = await inventoryApi.getSedes();
            if (Array.isArray(apiRes) && apiRes.length > 0) {
              lista = apiRes.map((s) => s.nombre || s.nombre_sede || s);
            }
          } catch (apiErr) {
            console.warn('Fallback API sedes:', apiErr.message);
          }
        }

        const cleanLista = lista.map((s) => (s || '').replace(/Medell[^x-]*n/g, 'Medellín')).filter(Boolean);
        const base = Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES;
        const combinadas = Array.from(new Set([...cleanLista, ...base]));
        if (isMounted) {
          setSedesList(combinadas);
        }
      } catch (err) {
        console.warn('Error al cargar sedes en InventarioView:', err.message);
      }
    };
    fetchSedesInventario();
    return () => { isMounted = false; };
  }, [propSedes]);

  // Pestaña activa: 'equipos' | 'consumibles'
  const [activeTab, setActiveTab] = useState(initialTab);
  // Filtro de stock para consumibles: 'todos' | 'minimo'
  const [filterStockConsumibles, setFilterStockConsumibles] = useState(initialStockFilter);

  // Hook de autenticación y roles de usuario
  const { currentUser, isAdmin, isSupervisor, isOperador, isCoordinador } = useAuth();
  const canEditInventory = !isSupervisor && !isCoordinador;

  // Hook del sistema de notificaciones/alertas personalizadas FMO
  const { showEditSuccess, showConfirmBaja, showConfirmAction, showNewItemSuccess, showLoanSuccess, showError, showInfo, showSuccess } = useToast();

  // Sincronizar si cambian las props iniciales
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialStockFilter) setFilterStockConsumibles(initialStockFilter);
  }, [initialStockFilter]);

  // Estados locales para carga directa en caso de montaje autónomo
  const [localItems, setLocalItems] = useState([]);
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
  const effectiveItems = Array.isArray(localItems) && localItems.length > 0 ? localItems : (Array.isArray(items) ? items : []);
  const effectiveLoading = localLoading || loading;
  const effectiveError = localError || error;

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalItemType, setModalItemType] = useState('equipo'); // 'equipo' | 'consumible'
  const [editingItem, setEditingItem] = useState(null);
  const [managingUnitsItem, setManagingUnitsItem] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);

  // Paginación reactiva configurable (10, 25, 50, 100 o Todos)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const ITEMS_PER_PAGE = itemsPerPage;

  // Selección múltiple para impresión masiva de códigos QR en cuadrícula (SIGA-FMO)
  const [selectedQRs, setSelectedQRs] = useState([]);
  const [modalImpresionMasivaOpen, setModalImpresionMasivaOpen] = useState(false);

  const normalizeItemForQR = (rawItem, type = 'equipo') => {
    if (!rawItem) return null;
    let placa = '';
    let nombre = '';
    let serial = '—';
    let sede = 'Medellín';
    let area = 'Nuevas Tecnologías';
    let categoria = '';

    if (type === 'equipo') {
      placa = rawItem.placa || rawItem.code || 'S-PLACA';
      nombre = rawItem.parentName || rawItem.nombre || 'Equipo Tecnológico';
      serial = rawItem.serial || '—';
      sede = rawItem.sede || 'Medellín';
      area = rawItem.area_asignada || rawItem.area || rawItem.programa || 'Nuevas Tecnologías';
      categoria = rawItem.parentCategory || rawItem.categoria || 'Portátiles';
    } else if (type === 'electronica') {
      placa = rawItem.placa || rawItem.code || rawItem.id || 'S-PLACA';
      nombre = rawItem.nombre || rawItem.material || rawItem.name || 'Equipo de Electrónica';
      serial = rawItem.serial || rawItem.modelo || '—';
      sede = rawItem.sede || rawItem.ubicacion || 'Medellín';
      area = rawItem.area_asignada || rawItem.area || rawItem.programa || 'Robótica';
      categoria = rawItem.subcategoria || rawItem.categoria || 'Electrónica';
    } else if (type === 'consumible') {
      placa = rawItem.id || rawItem.code || 'S-COD';
      nombre = rawItem.material || rawItem.name || rawItem.nombre || 'Material de Robótica';
      serial = rawItem.serial || rawItem.categoria || '—';
      sede = rawItem.ubicacion || rawItem.sede || 'Medellín';
      area = rawItem.area_asignada || rawItem.area || rawItem.programa || rawItem.categoria || 'Robótica';
      categoria = rawItem.categoria || rawItem.category || 'Robótica';
    } else if (type === 'papeleria') {
      placa = rawItem.id || rawItem.placa || 'S-COD';
      nombre = rawItem.material || rawItem.name || rawItem.nombre || 'Insumo de Papelería';
      serial = rawItem.serial || rawItem.categoria || '—';
      sede = rawItem.ubicacion || rawItem.sede || 'Medellín';
      area = rawItem.area_asignada || rawItem.area || rawItem.programa || 'TeachLabs';
      categoria = rawItem.categoria || 'Papelería';
    } else if (type === 'mobiliario') {
      placa = rawItem.placa || rawItem.code || rawItem.id || 'S-PLACA';
      nombre = rawItem.nombre || rawItem.material || rawItem.name || 'Mueble Modular';
      serial = rawItem.serial || rawItem.material || '—';
      sede = rawItem.sede || rawItem.ubicacion || 'Medellín';
      area = rawItem.area_proceso || rawItem.area || 'General';
      categoria = rawItem.categoria || 'Mobiliario';
    }

    const qrUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/activo/${encodeURIComponent(placa)}`
        : `https://inventario.fundacionmarinaorth.org/activo/${encodeURIComponent(placa)}`;

    return {
      id: placa,
      placa,
      nombre,
      serial,
      sede,
      area,
      categoria,
      qrUrl,
      type,
    };
  };

  const isQRSelected = (placa) => {
    return selectedQRs.some((x) => x.placa === placa);
  };

  const toggleSelectQR = (rawItem, type) => {
    const norm = normalizeItemForQR(rawItem, type);
    if (!norm) return;
    setSelectedQRs((prev) => {
      const exists = prev.some((x) => x.placa === norm.placa);
      if (exists) {
        return prev.filter((x) => x.placa !== norm.placa);
      } else {
        return [...prev, norm];
      }
    });
  };

  const toggleSelectAllVisible = (visibleList, type) => {
    const normalizedList = (visibleList || []).map((item) => normalizeItemForQR(item, type)).filter(Boolean);
    const allVisibleSelected =
      normalizedList.length > 0 &&
      normalizedList.every((norm) => selectedQRs.some((x) => x.placa === norm.placa));

    if (allVisibleSelected) {
      const visiblePlacas = new Set(normalizedList.map((x) => x.placa));
      setSelectedQRs((prev) => prev.filter((x) => !visiblePlacas.has(x.placa)));
    } else {
      setSelectedQRs((prev) => {
        const existingPlacas = new Set(prev.map((x) => x.placa));
        const toAdd = normalizedList.filter((x) => !existingPlacas.has(x.placa));
        return [...prev, ...toAdd];
      });
    }
  };

  const clearQRSelection = () => {
    setSelectedQRs([]);
  };

  const getCurrentTabFilteredItems = () => {
    if (activeTab === 'equipos') {
      return (allEquiposUnits || []).map((u) => normalizeItemForQR(u, 'equipo'));
    }
    if (activeTab === 'electronica') {
      return (electronicaFiltrada || []).map((e) => normalizeItemForQR(e, 'electronica'));
    }
    if (activeTab === 'consumibles') {
      return (consumibles || []).map((c) => normalizeItemForQR(c, 'consumible'));
    }
    if (activeTab === 'papeleria') {
      return (papeleriaFiltrada || []).map((p) => normalizeItemForQR(p, 'papeleria'));
    }
    if (activeTab === 'mobiliario') {
      return (mobiliarioFiltrado || []).map((m) => normalizeItemForQR(m, 'mobiliario'));
    }
    return [];
  };

  const selectAllFilteredInCurrentTab = () => {
    const list = getCurrentTabFilteredItems();
    setSelectedQRs((prev) => {
      const existingPlacas = new Set(prev.map((x) => x.placa));
      const toAdd = list.filter((x) => !existingPlacas.has(x.placa));
      return [...prev, ...toAdd];
    });
  };

  const deselectAllFilteredInCurrentTab = () => {
    const list = getCurrentTabFilteredItems();
    const placasToRemove = new Set(list.map((x) => x.placa));
    setSelectedQRs((prev) => prev.filter((x) => !placasToRemove.has(x.placa)));
  };

  const renderQRSelectionBanner = () => {
    const currentList = getCurrentTabFilteredItems();
    const areAllCurrentFilteredSelected =
      currentList.length > 0 &&
      currentList.every((item) => selectedQRs.some((x) => x.placa === item.placa));

    if (selectedQRs.length === 0) return null;

    return (
      <div className="mb-3.5 bg-[#013a52]/5 border border-[#013a52]/20 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in no-print">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-[#013a52] text-[#abd037] font-bold text-xs flex items-center justify-center shadow-xs">
            {selectedQRs.length}
          </span>
          <span className="text-xs sm:text-sm text-[#013a52] font-medium">
            {selectedQRs.length === 1 ? '1 ítem seleccionado' : `${selectedQRs.length} ítems seleccionados`}
          </span>

          {/* Botón rápido para seleccionar o deseleccionar todos los registros de la vista actual */}
          {currentList.length > 0 && (
            <button
              type="button"
              onClick={areAllCurrentFilteredSelected ? deselectAllFilteredInCurrentTab : selectAllFilteredInCurrentTab}
              className="bg-[#013a52] hover:bg-[#0A3C63] text-[#abd037] font-bold text-xs px-3 py-1.5 rounded-lg border border-[#abd037]/50 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
              title="Seleccionar o deseleccionar todos los registros filtrados en esta vista sin cambiar de página"
            >
              <span>{areAllCurrentFilteredSelected ? '✓' : '⚡'}</span>
              <span>
                {areAllCurrentFilteredSelected
                  ? `Deseleccionar los ${currentList.length} de esta vista`
                  : `Seleccionar todos los ${currentList.length} registros de esta vista`}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalImpresionMasivaOpen(true)}
            className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] text-xs sm:text-sm"
            title="Abrir vista previa e impresión de etiquetas QR (12 stickers por hoja)"
          >
            <span>🖨️</span>
            <span>Imprimir QRs Seleccionados</span>
            <span className="bg-[#013a52] text-[#abd037] px-2 py-0.5 rounded-full text-xs font-bold">
              {selectedQRs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={clearQRSelection}
            className="bg-white border border-slate-300 text-[#6d6e71] hover:text-[#013a52] hover:border-[#013a52] font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer text-xs"
            title="Deseleccionar todos los ítems"
          >
            Limpiar selección
          </button>
        </div>
      </div>
    );
  };
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
  const rawConsumibles = useMemo(() => (Array.isArray(effectiveItems) ? effectiveItems : []).filter((it) => it && it.itemType === 'consumible' && it.categoria !== 'Papelería' && it.categoria !== 'Mobiliario'), [effectiveItems]);
  const equipos = useMemo(() => (Array.isArray(effectiveItems) ? effectiveItems : []).filter((it) => it && it.itemType === 'equipo' && it.categoria !== 'Mobiliario'), [effectiveItems]);

  // Estados y consulta directa a Supabase/API para PAPELERÍA (Sin datos de prueba o residuales de localStorage)
  const [papeleria, setPapeleria] = useState([]);
  const [loadingPapeleria, setLoadingPapeleria] = useState(false);

  // Consulta directa a la tabla 'papeleria' de Supabase
  const cargarPapeleria = async () => {
    try {
      setLoadingPapeleria(true);
      // Purgar datos de prueba u obsoletos en localStorage
      try {
        const cached = localStorage.getItem('siga_papeleria');
        if (cached) {
          const parsed = JSON.parse(cached);
          const sanitized = Array.isArray(parsed)
            ? parsed.filter(p => !String(p.id).toLowerCase().includes('prueba') && !String(p.id).toLowerCase().includes('pape5016') && !String(p.material || '').toLowerCase().includes('prueba'))
            : [];
          if (sanitized.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
            localStorage.setItem('siga_papeleria', JSON.stringify(sanitized));
          }
        }
      } catch (_) {}

      const { data, error } = await supabase
        .from('papeleria')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn('Error consultando tabla papeleria en Supabase:', error.message);
        // Fallback a DEFAULT_PAPELERIA depurado
        setPapeleria(Array.isArray(DEFAULT_PAPELERIA) ? DEFAULT_PAPELERIA.filter(p => !String(p.id).toLowerCase().includes('prueba') && !String(p.id).toLowerCase().includes('pape5016')) : []);
      } else if (Array.isArray(data) && data.length > 0) {
        // Excluir cualquier registro de prueba que pudiera filtrarse
        const cleanData = data.filter(p => !String(p.id).toLowerCase().includes('prueba') && !String(p.id).toLowerCase().includes('pape5016') && !String(p.material || '').toLowerCase().includes('prueba'));
        setPapeleria(cleanData);
      } else {
        setPapeleria([]);
      }
    } catch (err) {
      console.warn('Excepción al cargar papelería desde Supabase:', err.message);
      setPapeleria([]);
    } finally {
      setLoadingPapeleria(false);
    }
  };

  useEffect(() => {
    cargarPapeleria();
  }, []);

  // Estados y consulta directa a Supabase para MOBILIARIO (Sin datos quemados/mock)
  const [mobiliario, setMobiliario] = useState([]);
  const [loadingMobiliario, setLoadingMobiliario] = useState(false);

  // Consulta directa a la tabla 'mobiliario' de Supabase
  const cargarMobiliario = async () => {
    try {
      setLoadingMobiliario(true);
      // Limpiar rastro de localStorage obsoleto si existía
      try {
        localStorage.removeItem('siga_mobiliario');
      } catch (_) {}

      const { data, error } = await supabase
        .from('mobiliario')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error consultando tabla mobiliario en Supabase:', error.message);
        // Si la tabla no está creada o hay error, data es vacío
        setMobiliario([]);
      } else {
        setMobiliario(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Excepción al cargar mobiliario desde Supabase:', err.message);
      setMobiliario([]);
    } finally {
      setLoadingMobiliario(false);
    }
  };

  useEffect(() => {
    cargarMobiliario();
  }, []);

  // Estados y consulta directa a Supabase/API para EQUIPOS DE ELECTRÓNICA & INSTRUMENTACIÓN (SIGA-FMO)
  const [electronica, setElectronica] = useState([]);
  const [loadingElectronica, setLoadingElectronica] = useState(false);
  const [modalRegistroElectronicaOpen, setModalRegistroElectronicaOpen] = useState(false);
  const [electronicaSeleccionada, setElectronicaSeleccionada] = useState(null);
  const [filterSedeElectronica, setFilterSedeElectronica] = useState('todas');
  const [filterStatusElectronica, setFilterStatusElectronica] = useState('todos');
  const [electronicaPage, setElectronicaPage] = useState(1);

  const cargarElectronica = async () => {
    try {
      setLoadingElectronica(true);
      const data = await inventoryApi.getEquiposElectronica();
      setElectronica(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Excepción al cargar equipos de electrónica:', err.message);
      setElectronica([]);
    } finally {
      setLoadingElectronica(false);
    }
  };

  useEffect(() => {
    cargarElectronica();
  }, []);

  const handleOpenCreateElectronica = () => {
    setElectronicaSeleccionada(null);
    setModalRegistroElectronicaOpen(true);
  };

  const handleOpenEditElectronica = (item) => {
    setElectronicaSeleccionada(item);
    setModalRegistroElectronicaOpen(true);
  };

  const handleDeleteElectronica = (item) => {
    const placa = item.placa || item.id || item.code;
    const nombre = item.nombre || item.material || item.name || 'Equipo de Electrónica';
    showConfirmBaja({
      codigo: placa,
      nombre,
      onConfirm: async () => {
        try {
          await inventoryApi.deleteEquipoElectronica(placa, 'Baja técnica registrada por el usuario');
          setElectronica((prev) => prev.filter((e) => (e.placa || e.id) !== placa));
          showEditSuccess(nombre, `Equipo con placa ${placa} dado de baja exitosamente.`);
        } catch (err) {
          showError('Error', err.message || 'No se pudo dar de baja el equipo.');
        }
      },
    });
  };

  // Filtros y paginación para Papelería
  const [filterStockPapeleria, setFilterStockPapeleria] = useState('todos');
  const [filterCajaPapeleria, setFilterCajaPapeleria] = useState('todas');
  const [papeleriaPage, setPapeleriaPage] = useState(1);

  // Filtros y paginación para Mobiliario
  const [filterSedeMobiliario, setFilterSedeMobiliario] = useState('todas');
  const [mobiliarioPage, setMobiliarioPage] = useState(1);

  // Lista unificada de Papelería exclusivamente desde Supabase y catálogo verificado
  const rawPapeleria = useMemo(() => {
    const customAreas = (() => {
      try { return JSON.parse(localStorage.getItem('siga_custom_areas') || '{}'); } catch { return {}; }
    })();
    const baseList = Array.isArray(papeleria) && papeleria.length > 0
      ? papeleria
      : effectiveItems.filter((it) => it.categoria === 'Papelería' || it.category === 'Papelería' || String(it.id).toUpperCase().startsWith('PAP') || it.subtipo === 'papeleria');
    
    // Filtrado estricto: excluir cualquier elemento de prueba que no guarde relación con el inventario institucional
    return baseList.filter((p) => {
      const idStr = String(p.id || '').toLowerCase();
      const matStr = String(p.material || p.name || '').toLowerCase();
      return !idStr.includes('prueba') && !idStr.includes('pape5016') && !matStr.includes('prueba');
    }).map((p) => {
      const savedArea = customAreas[p.id] || customAreas[p.codigo] || customAreas[p.placa];
      if (savedArea) {
        return { ...p, area: savedArea, area_asignada: savedArea };
      }
      return p;
    });
  }, [papeleria, effectiveItems]);

  // Lista unificada de Mobiliario exclusivamente desde Supabase y registros en sesión
  const rawMobiliario = useMemo(() => {
    return Array.isArray(mobiliario) ? mobiliario : [];
  }, [mobiliario]);

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
  }, [papeleriaFiltrada, currentPapeleriaPage, ITEMS_PER_PAGE]);

  // Paginación de Mobiliario (filas configurables por página)
  const totalMobiliarioPages = Math.max(1, Math.ceil(mobiliarioFiltrado.length / ITEMS_PER_PAGE));
  const currentMobiliarioPage = Math.min(mobiliarioPage, totalMobiliarioPages);
  const paginatedMobiliario = useMemo(() => {
    const start = (currentMobiliarioPage - 1) * ITEMS_PER_PAGE;
    return mobiliarioFiltrado.slice(start, start + ITEMS_PER_PAGE);
  }, [mobiliarioFiltrado, currentMobiliarioPage, ITEMS_PER_PAGE]);

  // Lista unificada y filtrado para EQUIPOS DE ELECTRÓNICA & INSTRUMENTACIÓN
  const rawElectronica = electronica;

  const electronicaFiltrada = useMemo(() => {
    const term = normalizeText(searchTerm);
    return rawElectronica.filter((e) => {
      // 1. Buscador global reactivo
      if (term) {
        const placa = normalizeText(e.placa || e.id || e.code || '');
        const nombre = normalizeText(e.nombre || e.material || e.name || '');
        const subcat = normalizeText(e.subcategoria || e.categoria || '');
        const marca = normalizeText(e.marca || '');
        const modelo = normalizeText(e.modelo || '');
        const serial = normalizeText(e.serial || '');
        const sede = normalizeText(e.sede || e.ubicacion || '');
        const area = normalizeText(e.area_asignada || e.area || '');

        const match =
          placa.includes(term) ||
          nombre.includes(term) ||
          subcat.includes(term) ||
          marca.includes(term) ||
          modelo.includes(term) ||
          serial.includes(term) ||
          sede.includes(term) ||
          area.includes(term);

        if (!match) return false;
      }

      // 2. Filtro Sede
      if (filterSedeElectronica !== 'todas') {
        const itemSede = normalizeSedeName(e.sede || e.ubicacion || 'Medellín');
        if (itemSede !== normalizeSedeName(filterSedeElectronica)) {
          return false;
        }
      }

      // 3. Filtro Estado Operativo
      if (filterStatusElectronica !== 'todos') {
        const itemStatus = String(e.estado || 'disponible').toLowerCase().trim();
        if (itemStatus !== filterStatusElectronica.toLowerCase().trim()) {
          return false;
        }
      }

      return true;
    });
  }, [rawElectronica, filterSedeElectronica, filterStatusElectronica, searchTerm]);

  // Paginación de Equipos de Electrónica
  const totalElectronicaPages = Math.max(1, Math.ceil(electronicaFiltrada.length / ITEMS_PER_PAGE));
  const currentElectronicaPage = Math.min(electronicaPage, totalElectronicaPages);
  const paginatedElectronica = useMemo(() => {
    const start = (currentElectronicaPage - 1) * ITEMS_PER_PAGE;
    return electronicaFiltrada.slice(start, start + ITEMS_PER_PAGE);
  }, [electronicaFiltrada, currentElectronicaPage, ITEMS_PER_PAGE]);

  const areAllVisibleElectronicaSelected =
    (paginatedElectronica || []).length > 0 &&
    (paginatedElectronica || []).every((e) => isQRSelected(e.placa || e.code || e.id || 'S-PLACA'));

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

  // Estado para el modal dedicado de Mobiliario (Creación y Edición)
  const [modalRegistroMobiliarioOpen, setModalRegistroMobiliarioOpen] = useState(false);
  const [muebleSeleccionado, setMuebleSeleccionado] = useState(null);

  const handleOpenCreateMobiliario = () => {
    setMuebleSeleccionado(null);
    setModalRegistroMobiliarioOpen(true);
  };

  const handleOpenEditMobiliario = (item) => {
    setMuebleSeleccionado(item);
    setModalRegistroMobiliarioOpen(true);
  };

  // Eliminación / Baja con confirmación para Papelería y Mobiliario
  const handleDeletePapeleria = (item) => {
    showConfirmBaja({
      codigo: item.id,
      nombre: item.material || item.name,
      onConfirm: async () => {
        setPapeleria((prev) => prev.filter((p) => p.id !== item.id));
        try {
          if (supabase) {
            await supabase
              .from('papeleria')
              .delete()
              .eq('id', item.id);
          }
          await inventoryApi.remove(item.id);
        } catch (e) {
          // OK si falla endpoint api secundario
        }
        // Purgar de localStorage si estuviese almacenado
        try {
          const cached = localStorage.getItem('siga_papeleria');
          if (cached) {
            const parsed = JSON.parse(cached);
            const filtered = Array.isArray(parsed) ? parsed.filter((p) => p.id !== item.id) : [];
            localStorage.setItem('siga_papeleria', JSON.stringify(filtered));
          }
        } catch (_) {}
      },
    });
  };

  const handleEliminarMobiliario = async (item) => {
    const user = currentUser;
    const toast = {
      success: (msg) => showSuccess('Baja Registrada', msg),
      error: (msg) => showError('Error al dar de baja', msg),
    };

    try {
      // 1. Registrar el movimiento en el historial
      if (supabase) {
        const payloadHistorial = {
          tipo: 'Baja',
          elemento: item.nombre || item.descripcion || item.elemento || 'Mobiliario',
          id_referencia: item.codigo || item.placa || item.id,
          cantidad: Number(item.cantidad) || 1,
          responsable: user?.nombre || 'Administrador',
          sede: item.sede || item.espacio_asignado || 'Oficina Medellín',
          motivo: 'Baja de mobiliario por descarte o eliminación de inventario',
          fecha: new Date().toISOString()
        };

        let { error: errorHistorial } = await supabase
          .from('historial_movimientos')
          .insert([payloadHistorial]);

        if (errorHistorial) {
          console.error('Error registrando auditoría en historial:', errorHistorial);
          // Si el esquema de historial utiliza 'codigo' en lugar de 'id_referencia' (PGRST204)
          if (errorHistorial.code === 'PGRST204' && String(errorHistorial.message || '').includes('id_referencia')) {
            const retryPayload = { ...payloadHistorial, codigo: payloadHistorial.id_referencia };
            delete retryPayload.id_referencia;
            const { error: retryError } = await supabase.from('historial_movimientos').insert([retryPayload]);
            if (retryError) {
              console.error('Error en reintento con columna codigo:', retryError);
            }
          }
        }
      }

      // 2. Eliminar el registro en la tabla mobiliario
      if (supabase) {
        let deleteQuery = supabase.from('mobiliario').delete();
        if (item.id) {
          deleteQuery = deleteQuery.eq('id', item.id);
        } else {
          deleteQuery = deleteQuery.eq('placa', item.placa || item.codigo);
        }
        const { error: errorDelete } = await deleteQuery;
        if (errorDelete) throw errorDelete;
      }

      try {
        await inventoryApi.remove(item.placa || item.codigo || item.id);
      } catch (_) {}

      // 3. Actualizar estado local
      setMobiliario((prev) => prev.filter((m) => m.id !== item.id && (!item.placa || m.placa !== item.placa)));
      toast.success('Mobiliario eliminado y registrado en el historial de bajas');
    } catch (err) {
      console.error('Error al dar de baja:', err);
      toast.error('No se pudo eliminar el mobiliario');
    }
  };

  const handleDeleteMobiliario = (item) => {
    const code = item.placa || item.code || item.id;
    showConfirmBaja({
      codigo: code,
      nombre: item.nombre || item.material || item.name,
      onConfirm: async () => {
        await handleEliminarMobiliario(item);
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
          const unitPlaca = u.placa || u.code || eq.placa || eq.id || '—';
          const unitArea = u.area_asignada || u.area || u.programa || eq.area_asignada || eq.area || 'Nuevas Tecnologías';
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
            placa: unitPlaca,
            code: unitPlaca,
            ...u,
            id: u.id || u.dbId || unitPlaca,
            dbId: u.dbId || (u.id && !String(u.id).startsWith('eq-') ? u.id : eq.dbId),
            area_asignada: unitArea,
            area: unitArea,
          });
        });
      } else {
        // En caso de activo plano sin array units
        const eqPlaca = eq.placa || eq.codigoItem || eq.id || 'SIN-COD';
        const eqArea = eq.area_asignada || eq.area || eq.programa || 'Nuevas Tecnologías';
        list.push({
          id: eq.id || eqPlaca,
          dbId: eq.dbId,
          parentItemId: eq.id,
          parentName: eq.nombre || eq.name,
          nombre: eq.nombre || eq.name,
          parentCategory: eq.categoria || eq.category,
          code: eqPlaca,
          placa: eqPlaca,
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
          area_asignada: eqArea,
          area: eqArea,
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
    area: 'Robótica',
    area_asignada: 'Robótica',
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
    en_contabilidad: false,
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
        en_contabilidad: Boolean(equipoParaEditar.en_contabilidad),
      });
    }
  }, [equipoParaEditar, modalEditarEquipoOpen]);

  // Modal de QR para Consumible
  const [qrConsumibleItem, setQrConsumibleItem] = useState(null);

  // Estado para Modal Institucional de Baja de Consumibles
  const [consumibleParaBaja, setConsumibleParaBaja] = useState(null);

  // Manejador para abrir modal institucional de baja con validaciones previas de stock y estado
  const handleDeleteConsumable = (item) => {
    const stock = Number(item.disponible ?? item.quantity ?? item.stock ?? 0);
    const esBaja = (item.estado || '').toLowerCase().trim() === 'baja';

    if (esBaja) {
      showError('Material en baja', 'No es posible dar de baja este insumo: el material ya cuenta con estado de Baja o se encuentra completamente retirado.');
      return;
    }

    if (stock <= 0) {
      showError('Stock no disponible', 'No es posible dar de baja este insumo: el stock disponible ya es 0.');
      return;
    }

    setConsumibleParaBaja(item);
  };

  const handleConfirmarBajaConsumible = async ({ materialId, cantidadBaja, motivo }) => {
    try {
      setLocalLoading(true);
      if (onRetireItem) {
        await onRetireItem({ materialId, cantidadBaja, motivo });
      }

      try {
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
      } catch (refreshErr) {
        console.warn('Advertencia secundaria al refrescar vista:', refreshErr);
      }

      const msg = `Se dieron de baja ${cantidadBaja} unidad(es) de ${consumibleParaBaja?.material || consumibleParaBaja?.name || 'material'}.`;
      if (typeof showSuccess === 'function') {
        showSuccess('Baja confirmada', msg);
      } else if (typeof showInfo === 'function') {
        showInfo('Baja confirmada', msg);
      }
    } catch (err) {
      console.error('Error capturado durante la baja en InventarioView:', err);
      if (typeof showError === 'function') {
        showError('Error al dar de baja', err?.message || 'No se pudo procesar la baja del material');
      }
      throw err;
    } finally {
      setLocalLoading(false);
    }
  };

  // Paginación para Consumibles (5 filas por página para vista compacta sin scroll vertical)
  const [consumiblesPage, setConsumiblesPage] = useState(1);
  const totalConsumiblesPages = Math.max(1, Math.ceil(consumibles.length / ITEMS_PER_PAGE));
  const currentConsumiblesPage = Math.min(consumiblesPage, totalConsumiblesPages);

  const paginatedConsumibles = useMemo(() => {
    const start = (currentConsumiblesPage - 1) * ITEMS_PER_PAGE;
    return consumibles.slice(start, start + ITEMS_PER_PAGE);
  }, [consumibles, currentConsumiblesPage, ITEMS_PER_PAGE]);

  // Paginación para Equipos Tecnológicos (5 filas por página)
  const [equiposPage, setEquiposPage] = useState(1);
  const totalEquiposPages = Math.max(1, Math.ceil(allEquiposUnits.length / ITEMS_PER_PAGE));
  const currentEquiposPage = Math.min(equiposPage, totalEquiposPages);

  const paginatedEquiposUnits = useMemo(() => {
    const start = (currentEquiposPage - 1) * ITEMS_PER_PAGE;
    return allEquiposUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [allEquiposUnits, currentEquiposPage, ITEMS_PER_PAGE]);

  // Verificación de selección completa para encabezados de tablas (SIGA-FMO)
  const areAllVisibleEquiposSelected =
    (paginatedEquiposUnits || []).length > 0 &&
    (paginatedEquiposUnits || []).every((u) => isQRSelected(u.placa || u.code || 'S-PLACA'));

  const areAllVisibleConsumiblesSelected =
    (paginatedConsumibles || []).length > 0 &&
    (paginatedConsumibles || []).every((it) => isQRSelected(it.id || it.code || 'S-COD'));

  const areAllVisiblePapeleriaSelected =
    (paginatedPapeleria || []).length > 0 &&
    (paginatedPapeleria || []).every((it) => isQRSelected(it.id || it.placa || 'S-COD'));

  const areAllVisibleMobiliarioSelected =
    (paginatedMobiliario || []).length > 0 &&
    (paginatedMobiliario || []).every((m) => isQRSelected(m.placa || m.code || m.id || 'S-PLACA'));

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
        activos: dataActivos && dataActivos.length > 0 ? dataActivos : undefined,
        electronica: rawElectronica && rawElectronica.length > 0 ? rawElectronica : undefined,
        papeleria: rawPapeleria && rawPapeleria.length > 0 ? rawPapeleria : undefined,
        mobiliario: rawMobiliario && rawMobiliario.length > 0 ? rawMobiliario : undefined,
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
        en_contabilidad: Boolean(formDataNuevoEquipo.en_contabilidad),
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

    // Prioridad por pestaña activa o tipo de ítem
    if (activeTab === 'mobiliario' || item.itemType === 'mobiliario') {
      handleOpenEditMobiliario(item);
      return;
    }

    if (
      activeTab === 'consumibles' ||
      activeTab === 'papeleria' ||
      item.itemType === 'consumible' ||
      item.categoria === 'Robótica' ||
      item.categoria === 'Papelería' ||
      String(item.id || item.codigo || item.placa || '').toLowerCase().startsWith('rob') ||
      String(item.id || item.codigo || item.placa || '').toLowerCase().startsWith('pape')
    ) {
      handleOpenEditarConsumible(item);
      return;
    }

    const esEquipo = Boolean(item.isEquipo || item.itemType === 'equipo' || item.serial || item.units);
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

      // Priorizar datos de la fila de inventario si vino seleccionada
      const itemCombinado = { ...equipo, ...equipoFresco };
      const sedeReal = itemCombinado.sede || itemCombinado.ubicacion || itemCombinado.ubicacion_fisica || 'Medellín';
      const condicionReal = itemCombinado.condicion_fisica || itemCombinado.condicion || itemCombinado.estado_fisico || itemCombinado.estado || 'Bueno';

      // Sincronizar el estado del formulario con los datos en tiempo real
      setFormDataEditarEquipo({
        id: itemCombinado.id,
        placa: itemCombinado.placa || itemCombinado.codigo || idOPlaca || '',
        nombre: itemCombinado.nombre || itemCombinado.elemento || itemCombinado.equipo || itemCombinado.material || itemCombinado.name || '',
        modelo: itemCombinado.modelo || itemCombinado.model || '',
        serial: itemCombinado.serial || '',
        categoria: itemCombinado.categoria || itemCombinado.category || 'Portátiles',
        condicion: condicionReal,
        condicion_fisica: condicionReal,
        area: itemCombinado.area_asignada || itemCombinado.area_proceso || itemCombinado.area || 'Nuevas Tecnologías',
        area_asignada: itemCombinado.area_asignada || itemCombinado.area_proceso || itemCombinado.area || 'Nuevas Tecnologías',
        area_proceso: itemCombinado.area_proceso || itemCombinado.area || 'Tecnología',
        sede: sedeReal,
        ubicacion: itemCombinado.ubicacion || sedeReal,
        ubicacion_estante: itemCombinado.ubicacion_estante || '',
        cantidad: 1, // Fijo en 1
        descripcion: (itemCombinado.descripcion_general || itemCombinado.descripcion) && (itemCombinado.descripcion_general || itemCombinado.descripcion) !== 'Sin descripción general registrada.'
          ? (itemCombinado.descripcion_general || itemCombinado.descripcion)
          : '',
        descripcion_general: (itemCombinado.descripcion_general || itemCombinado.descripcion) && (itemCombinado.descripcion_general || itemCombinado.descripcion) !== 'Sin descripción general registrada.'
          ? (itemCombinado.descripcion_general || itemCombinado.descripcion)
          : '',
        marca: itemCombinado.marca || '',
        procesador: itemCombinado.procesador || itemCombinado.caracteristica_1 || '',
        memoria_ram: itemCombinado.memoria_ram || itemCombinado.caracteristica_2 || '',
        almacenamiento: itemCombinado.almacenamiento || itemCombinado.caracteristica_3 || '',
        caracteristica_1: itemCombinado.caracteristica_1 || itemCombinado.procesador || '',
        caracteristica_2: itemCombinado.caracteristica_2 || itemCombinado.memoria_ram || '',
        caracteristica_3: itemCombinado.caracteristica_3 || itemCombinado.almacenamiento || '',
        responsable: itemCombinado.responsable || itemCombinado.custodio || 'Bodega Central',
        proveedor: itemCombinado.proveedor || '',
        fecha_adquisicion: itemCombinado.fecha_adquisicion || (itemCombinado.fecha_compra ? itemCombinado.fecha_compra.split('T')[0] : ''),
        fecha_compra: itemCombinado.fecha_compra ? itemCombinado.fecha_compra.split('T')[0] : (itemCombinado.fecha_adquisicion || ''),
        valor_comercial: itemCombinado.valor_comercial || itemCombinado.valor_compra || '',
        valor_compra: itemCombinado.valor_compra !== '' && itemCombinado.valor_compra != null ? itemCombinado.valor_compra : (itemCombinado.valor_comercial || ''),
        valor_total: itemCombinado.valor_total !== '' && itemCombinado.valor_total != null ? itemCombinado.valor_total : '',
        estado_operativo: itemCombinado.estado_operativo || itemCombinado.estado || 'Disponible',
        fecha_vencimiento_garantia: itemCombinado.fecha_vencimiento_garantia ? itemCombinado.fecha_vencimiento_garantia.split('T')[0] : (itemCombinado.garantia ? itemCombinado.garantia.split('T')[0] : ''),
        claves_otros: itemCombinado.claves_otros || '',
        observaciones: itemCombinado.observaciones || itemCombinado.notas || itemCombinado.notes || '',
      });

      setEquipoParaEditar(itemCombinado);
      setModalEditarEquipoOpen(true);
    } catch (error) {
      console.error('Error al consultar datos en tiempo real del equipo:', error);
      const sedeReal = equipo.sede || equipo.ubicacion || equipo.ubicacion_fisica || 'Medellín';
      const condicionReal = equipo.condicion_fisica || equipo.condicion || equipo.estado_fisico || equipo.estado || 'Bueno';

      // Fallback al objeto actual si falla la red
      setFormDataEditarEquipo({
        id: equipo.id,
        placa: equipo.placa || equipo.codigo || equipo.code || equipo.id || '',
        nombre: equipo.nombre || equipo.elemento || equipo.equipo || equipo.material || equipo.name || '',
        modelo: equipo.modelo || equipo.model || '',
        serial: equipo.serial || '',
        categoria: equipo.categoria || equipo.category || 'Portátiles',
        condicion: condicionReal,
        condicion_fisica: condicionReal,
        area: equipo.area_asignada || equipo.area_proceso || equipo.area || 'Nuevas Tecnologías',
        area_asignada: equipo.area_asignada || equipo.area_proceso || equipo.area || 'Nuevas Tecnologías',
        area_proceso: equipo.area_proceso || equipo.area || 'Tecnología',
        sede: sedeReal,
        ubicacion: equipo.ubicacion || sedeReal,
        ubicacion_estante: equipo.ubicacion_estante || '',
        cantidad: 1,
        descripcion: (equipo.descripcion_general || equipo.descripcion) && (equipo.descripcion_general || equipo.descripcion) !== 'Sin descripción general registrada.'
          ? (equipo.descripcion_general || equipo.descripcion)
          : '',
        descripcion_general: (equipo.descripcion_general || equipo.descripcion) && (equipo.descripcion_general || equipo.descripcion) !== 'Sin descripción general registrada.'
          ? (equipo.descripcion_general || equipo.descripcion)
          : '',
        marca: equipo.marca || '',
        procesador: equipo.procesador || equipo.caracteristica_1 || '',
        memoria_ram: equipo.memoria_ram || equipo.caracteristica_2 || '',
        almacenamiento: equipo.almacenamiento || equipo.caracteristica_3 || '',
        caracteristica_1: equipo.caracteristica_1 || equipo.procesador || '',
        caracteristica_2: equipo.caracteristica_2 || equipo.memoria_ram || '',
        caracteristica_3: equipo.caracteristica_3 || equipo.almacenamiento || '',
        responsable: equipo.responsable || equipo.custodio || 'Bodega Central',
        proveedor: equipo.proveedor || '',
        fecha_adquisicion: equipo.fecha_adquisicion || (equipo.fecha_compra ? equipo.fecha_compra.split('T')[0] : ''),
        fecha_compra: equipo.fecha_compra ? equipo.fecha_compra.split('T')[0] : (equipo.fecha_adquisicion || ''),
        valor_comercial: equipo.valor_comercial || equipo.valor_compra || '',
        valor_compra: equipo.valor_compra || equipo.valor_comercial || '',
        valor_total: equipo.valor_total || '',
        estado_operativo: equipo.estado_operativo || equipo.estado || 'Disponible',
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

    const placaIdentificador = (equipoParaEditar.placa || (equipoParaEditar.units && equipoParaEditar.units[0]?.placa) || equipoParaEditar.code || '').trim();
    const placaNueva = (formDataEditarEquipo.placa || placaIdentificador).trim();
    const nombre = formDataEditarEquipo.nombre?.trim();
    const serial = formDataEditarEquipo.serial?.trim();
    const rawArea = typeof formDataEditarEquipo.area_asignada === 'string'
      ? formDataEditarEquipo.area_asignada
      : (typeof formDataEditarEquipo.area === 'string' ? formDataEditarEquipo.area : '');
    const areaAsignada = rawArea.trim() || 'Nuevas Tecnologías';

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
        area: areaAsignada,
        area_asignada: areaAsignada,
        ubicacion: formDataEditarEquipo.ubicacion?.trim() || 'Oficina Medellín',
        ubicacion_estante: formDataEditarEquipo.ubicacion_estante?.trim() || '',
        sede: formDataEditarEquipo.ubicacion || formDataEditarEquipo.sede || 'Medellín',
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
        en_contabilidad: Boolean(formDataEditarEquipo.en_contabilidad),
      };

      // 1. UPDATE en Supabase (Guardar solo el registro editado filtrando exclusivamente por id o placa única)
      if (supabase) {
        const payloadSupabase = {
          nombre,
          marca: payload.marca,
          modelo: payload.modelo,
          serial: payload.serial,
          categoria: payload.categoria,
          condicion: payload.condicion,
          area_asignada: areaAsignada,
          area: areaAsignada,
          ubicacion: payload.ubicacion,
          ubicacion_estante: payload.ubicacion_estante,
          sede: payload.sede,
          responsable: payload.responsable,
          custodio: payload.custodio,
          estado: payload.estado,
          descripcion: payload.descripcion,
          observaciones: payload.observaciones,
        };

        const targetDbId = equipoParaEditar.dbId || (equipoParaEditar.id && !String(equipoParaEditar.id).startsWith('eq-') ? equipoParaEditar.id : null);
        const targetPlaca = (placaIdentificador || placaNueva).trim();

        // ⚠️ NUNCA filtrar por nombre ni omitir .eq('id', ...) o .eq('placa', ...)
        try {
          if (targetDbId) {
            await supabase.from('equipos').update(payloadSupabase).eq('id', targetDbId);
          } else if (targetPlaca) {
            await supabase.from('equipos').update(payloadSupabase).eq('placa', targetPlaca);
          }
        } catch (sbE) {
          console.warn('Aviso Supabase update equipos:', sbE?.message);
        }

        try {
          if (targetDbId) {
            await supabase.from('activos').update(payloadSupabase).eq('id', targetDbId);
          } else if (targetPlaca) {
            await supabase.from('activos').update(payloadSupabase).eq('placa', targetPlaca);
          }
        } catch (sbE2) {
          console.warn('Aviso Supabase update activos:', sbE2?.message);
        }
      }

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

      // 2. Actualizar inmediatamente el estado local de React sin requerir F5 (modificando SOLO el ítem editado)
      setLocalItems((prev) => {
        const base = Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(items) ? items : []);
        const targetId = equipoParaEditar.id;
        const targetDbId = equipoParaEditar.dbId;
        const targetPlacaUpper = (placaIdentificador || placaNueva).trim().toUpperCase();

        return base.map((eq) => {
          const isDirectMatch = Boolean(
            (targetId && eq.id === targetId) ||
            (targetDbId && eq.dbId === targetDbId) ||
            (targetPlacaUpper && String(eq.placa || eq.code || '').toUpperCase() === targetPlacaUpper)
          );

          const hasMatchingUnit = Boolean(
            eq.units && eq.units.some((u) => {
              const uPlaca = String(u.placa || u.code || '').trim().toUpperCase();
              return (
                (targetId && (u.id === targetId || u.parentItemId === targetId)) ||
                (targetDbId && u.dbId === targetDbId) ||
                (targetPlacaUpper && uPlaca === targetPlacaUpper)
              );
            })
          );

          if (!isDirectMatch && !hasMatchingUnit) {
            return eq;
          }

          if (eq.units && eq.units.length > 0) {
            const updatedUnits = eq.units.map((u) => {
              const uPlaca = String(u.placa || u.code || '').trim().toUpperCase();
              const isThisUnit = Boolean(
                (targetId && u.id === targetId) ||
                (targetDbId && u.dbId === targetDbId) ||
                (targetPlacaUpper && uPlaca === targetPlacaUpper)
              );

              if (!isThisUnit) {
                return u; // ⚠️ Unidad hermana no modificada, conserva su área asignada independiente
              }

              return {
                ...u,
                placa: placaNueva,
                code: placaNueva,
                model: payload.modelo,
                serial: payload.serial,
                sede: payload.sede,
                baseLocation: payload.ubicacion,
                ubicacion: payload.ubicacion,
                ubicacion_estante: payload.ubicacion_estante,
                responsable: payload.responsable,
                custodio: payload.custodio,
                status: payload.estado === 'En campo' ? 'prestado' : payload.estado.toLowerCase(),
                area_asignada: areaAsignada,
                area: areaAsignada,
              };
            });

            const isSingleUnit = eq.units.length === 1;
            return {
              ...eq,
              ...(isSingleUnit ? payload : {}),
              ...(isSingleUnit ? { area_asignada: areaAsignada, area: areaAsignada } : {}),
              units: updatedUnits,
            };
          }

          return {
            ...eq,
            ...payload,
            area_asignada: areaAsignada,
            area: areaAsignada,
            id: eq.id || `eq-${placaNueva}`,
            placa: placaNueva,
            code: placaNueva,
          };
        });
      });

      // Refrescar inventario
      await cargarConsumibles();
      setModalEditarEquipoOpen(false);
      setEquipoParaEditar(null);

      // Notificación Toast de Edición Exitosa Institucional
      showEditSuccess(String(formDataEditarEquipo.nombre || formDataEditarEquipo.placa || placaNueva || 'Equipo'));
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
    const customAreas = (() => {
      try { return JSON.parse(localStorage.getItem('siga_custom_areas') || '{}'); } catch { return {}; }
    })();
    const itemId = item.id || item.codigo || item.placa || '';
    const esPapeleria = activeTab === 'papeleria' || item.categoria === 'Papelería' || item.category === 'Papelería' || item.subtipo === 'papeleria' || String(itemId).toLowerCase().startsWith('pape');
    const savedArea = customAreas[itemId];
    const areaInicial = savedArea || item.area_asignada || item.area || (esPapeleria ? 'TeachLabs' : 'Robótica');
    setFormDataEditar({
      id: item.codigo || item.id_referencia || item.placa || item.id || '',
      material: item.material || item.name || '',
      categoria: esPapeleria ? 'Papelería' : (item.categoria || item.category || 'Robótica'),
      subtipo: esPapeleria ? 'papeleria' : (item.subtipo || 'robotica'),
      area: areaInicial,
      area_asignada: areaInicial,
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
    if (!idOriginal) {
      showError('Validación', 'El identificador del registro a editar es obligatorio.');
      return;
    }
    const nuevoId = (formDataEditar.id || '').trim();
    const esPapeleria = activeTab === 'papeleria' || itemParaEditar.subtipo === 'papeleria' || itemParaEditar.categoria === 'Papelería' || String(itemParaEditar.id || '').toLowerCase().startsWith('pape');
    const areaAsignada = formDataEditar.area_asignada || formDataEditar.area || (esPapeleria ? 'TeachLabs' : 'Robótica');

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
        area: areaAsignada,
        area_asignada: areaAsignada,
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

      // 1. Guardar permanentemente en localStorage para garantizar resistencia ante recargas
      try {
        const customAreas = JSON.parse(localStorage.getItem('siga_custom_areas') || '{}');
        customAreas[idOriginal] = areaAsignada;
        if (finalId) customAreas[finalId] = areaAsignada;
        localStorage.setItem('siga_custom_areas', JSON.stringify(customAreas));

        if (esPapeleria) {
          const cachedPape = JSON.parse(localStorage.getItem('siga_papeleria') || '[]');
          const updatedPape = cachedPape.map(p =>
            String(p.id).toLowerCase() === String(idOriginal).toLowerCase()
              ? { ...p, ...payload, area: areaAsignada, area_asignada: areaAsignada }
              : p
          );
          localStorage.setItem('siga_papeleria', JSON.stringify(updatedPape));
        }
      } catch (_) {}

      // 2. Si el ítem es de papelería, actualizar en localPapeleria (aislado por ID estricto)
      if (esPapeleria) {
        setPapeleria((prev) => {
          if (!Array.isArray(prev)) return [];
          return prev.map((p) =>
            String(p.id).toLowerCase() === String(idOriginal).toLowerCase()
              ? {
                  ...p,
                  ...payload,
                  area: areaAsignada,
                  area_asignada: areaAsignada,
                  id: finalId,
                  placa: finalId,
                  name: payload.material,
                  quantity: payload.disponible,
                  minStock: payload.minimo,
                  location: payload.ubicacion,
                  caja: payload.ubicacion_estante,
                }
              : p
          );
        });
      }

      // 3. Actualizar estado local inmediato optimista (aislado por ID / placa estricto)
      setLocalItems((prev) => {
        const base = Array.isArray(prev) && prev.length > 0 ? prev : (Array.isArray(items) ? items : []);
        return base.map((it) =>
          String(it.id).toLowerCase() === String(idOriginal).toLowerCase() ||
          (it.placa && String(it.placa).toLowerCase() === String(idOriginal).toLowerCase())
            ? {
                ...it,
                ...payload,
                area: areaAsignada,
                area_asignada: areaAsignada,
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
        );
      });

      // 4. UPDATE en Supabase para consumibles / papelería filtrando estrictamente por id único
      if (supabase && idOriginal) {
        const payloadConsumibleSb = {
          material: payload.material,
          categoria: payload.categoria,
          ubicacion: payload.ubicacion,
          ubicacion_estante: payload.ubicacion_estante,
          disponible: payload.disponible,
          minimo: payload.minimo,
          estado: payload.estado,
          condicion: payload.condicion,
          descripcion: payload.descripcion,
          observaciones: payload.observaciones,
          area_asignada: areaAsignada,
          area: areaAsignada,
        };

        try {
          if (esPapeleria) {
            await supabase.from('papeleria').update(payloadConsumibleSb).eq('id', idOriginal);
          } else {
            await supabase.from('consumibles').update(payloadConsumibleSb).eq('id', idOriginal);
          }
        } catch (sbE) {
          console.warn('Aviso Supabase update consumible:', sbE?.message);
        }
      }

      // 5. UPDATE al backend vía inventoryApi con token de autorización
      try {
        await inventoryApi.update(idOriginal, {
          ...payload,
          area: areaAsignada,
          area_asignada: areaAsignada,
        });
      } catch (apiErr) {
        console.warn('Aviso API update consumible:', apiErr?.message);
      }

      // 6. Notificar al gestor superior onEditItem si está disponible
      if (onEditItem) {
        try {
          await onEditItem({
            ...itemParaEditar,
            id: finalId,
            name: payload.material,
            material: payload.material,
            category: payload.categoria,
            categoria: payload.categoria,
            area: areaAsignada,
            area_asignada: areaAsignada,
            location: payload.ubicacion,
            ubicacion: payload.ubicacion,
            quantity: payload.disponible,
            disponible: payload.disponible,
            minStock: payload.minimo,
            minimo: payload.minimo,
            itemType: esPapeleria ? 'papeleria' : 'consumible',
          });
        } catch (_) {}
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
        setPapeleria((prev) => {
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
        setPapeleria((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.map((p) =>
            p.id === item.id
              ? { ...p, disponible: newStock, quantity: newStock }
              : p
          );
        });
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

  const themeEditarConsumible = getProgramTheme(
    formDataEditar.area_asignada || formDataEditar.area || (isPapeleriaEdit ? 'TeachLabs' : 'Robótica'),
    isPapeleriaEdit ? 'TeachLabs' : 'Robótica'
  );

  const themeNuevoConsumible = getProgramTheme(
    formDataNuevo.area_asignada || formDataNuevo.area || (isPapeleriaNuevo ? 'TeachLabs' : 'Robótica'),
    isPapeleriaNuevo ? 'TeachLabs' : 'Robótica'
  );

  return (
    <div className="inventario-view">
      {/* HEADER DE LA SECCIÓN CON SELECTOR DE PESTAÑAS Y BOTONES */}
      <div
        className="inventory-topbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div
          className="tab-buttons"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: 'transparent',
            padding: 0,
            border: 'none',
          }}
        >
          {[
            { id: 'equipos', label: 'Equipos Tecnológicos', icon: Laptop, count: equipos.length },
            { id: 'electronica', label: 'Equipos de Electrónica', icon: Cpu, count: rawElectronica.length },
            { id: 'consumibles', label: 'Consumibles de Robótica', icon: Plug, count: consumibles.length },
            { id: 'papeleria', label: 'Papelería', icon: FileText, count: rawPapeleria.length },
            { id: 'mobiliario', label: 'Mobiliario', icon: Armchair, count: mobiliarioFiltrado.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all duration-150 cursor-pointer ${
                  isActive ? 'shadow-sm' : 'hover:-translate-y-0.5'
                }`}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 600,
                  backgroundColor: isActive ? '#abd037' : 'var(--surface-2, #ffffff)',
                  color: isActive ? '#013a52' : '#6d6e71',
                  border: isActive ? '1.5px solid #96b82d' : '1.5px solid var(--line, #e2e8f0)',
                  boxShadow: isActive ? '0 3px 12px rgba(171, 208, 55, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#abd037';
                    e.currentTarget.style.color = '#013a52';
                    e.currentTarget.style.backgroundColor = '#fafcf2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
                    e.currentTarget.style.color = '#6d6e71';
                    e.currentTarget.style.backgroundColor = 'var(--surface-2, #ffffff)';
                  }
                }}
              >
                {/* Micro-badge para Icono */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '7px',
                    backgroundColor: isActive ? 'rgba(1, 58, 82, 0.12)' : 'rgba(109, 110, 113, 0.08)',
                    color: isActive ? '#013a52' : '#6d6e71',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} style={{ strokeWidth: 2.2 }} />
                </span>

                {/* Texto de la pestaña */}
                <span style={{ letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </span>

                {/* Badge contador reactivo */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1px 7px',
                    minWidth: '20px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isActive ? '#013a52' : 'rgba(109, 110, 113, 0.12)',
                    color: isActive ? '#ffffff' : '#6d6e71',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 1px 3px rgba(1, 58, 82, 0.25)' : 'none',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón Imprimir QRs */}
          <button
            type="button"
            onClick={() => setModalImpresionMasivaOpen(true)}
            title="Imprimir etiquetas QR para rotulado institucional (9 por hoja Carta 3×3)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '12px',
              backgroundColor: '#013a52',
              color: '#ffffff',
              border: '1.5px solid rgba(171, 208, 55, 0.5)',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 3px 10px rgba(1, 58, 82, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0A3C63';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 5px 14px rgba(1, 58, 82, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#013a52';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(1, 58, 82, 0.25)';
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '7px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Printer size={14} style={{ strokeWidth: 2.2 }} />
            </span>
            <span>Imprimir QRs</span>
            {selectedQRs.length > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5px 7px',
                  borderRadius: '9999px',
                  backgroundColor: '#abd037',
                  color: '#013a52',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                }}
              >
                {selectedQRs.length}
              </span>
            )}
          </button>

          {/* Botón Dinámico "+ Nuevo [Elemento]" */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'equipos') handleOpenCreate('equipo');
                else if (activeTab === 'electronica') handleOpenCreateElectronica();
                else if (activeTab === 'papeleria') handleOpenCreatePapeleria();
                else if (activeTab === 'mobiliario') handleOpenCreateMobiliario();
                else handleOpenCreate('consumible');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                backgroundColor: '#abd037',
                color: '#013a52',
                border: 'none',
                fontFamily: "'Poppins', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(171, 208, 55, 0.45)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#96b82d';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(171, 208, 55, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#abd037';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(171, 208, 55, 0.45)';
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(1, 58, 82, 0.12)',
                  color: '#013a52',
                  flexShrink: 0,
                }}
              >
                <Plus size={15} style={{ strokeWidth: 2.6 }} />
              </span>
              <span>
                {activeTab === 'equipos'
                  ? 'Nuevo Equipo Tecnológico'
                  : activeTab === 'electronica'
                  ? 'Nuevo Equipo de Electrónica'
                  : activeTab === 'papeleria'
                  ? 'Nueva Papelería'
                  : activeTab === 'mobiliario'
                  ? 'Nuevo Mobiliario'
                  : 'Nuevo Consumible'}
              </span>
            </button>
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

          {/* Módulo de Cobranding Oficial FMO & Sede Aliada (Página 8) */}
          {filterSede && filterSede !== 'todas' && (
            <div style={{ marginBottom: '8px' }}>
              <FmoCobrandingBadge sede={filterSede} alianza={`Alcaldía / Sede ${filterSede}`} height={30} />
            </div>
          )}

          {/* Barra de filtros para equipos */}
          <div className="filter-bar" style={{ marginBottom: '4px', padding: '8px 14px' }}>
            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Sede / Municipio:</label>
              <select
                value={filterSede}
                onChange={(e) => {
                  setFilterSede(e.target.value);
                  setEquiposPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
              >
                <option value="todas">Todas las sedes</option>
                {(sedesList || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Estado:</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setEquiposPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
              >
                <option value="todos">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="prestado">En campo (Prestado)</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="baja">De baja</option>
              </select>
            </div>

            <div className="filter-count text-[#6d6e71] text-sm">
              Mostrando <strong className="font-bold text-[#013a52]">{allEquiposUnits.length}</strong> de <strong className="font-bold text-[#013a52]">{totalEquiposRegistrados}</strong> equipos registrados
            </div>
          </div>

          {/* Banner de Selección Múltiple QR */}
          {renderQRSelectionBanner()}

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
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '1050px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '42px', padding: '10px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={areAllVisibleEquiposSelected}
                        onChange={() => toggleSelectAllVisible(paginatedEquiposUnits, 'equipo')}
                        aria-label="Seleccionar todos los equipos visibles"
                        className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                        title="Seleccionar o deseleccionar todos los equipos visibles"
                      />
                    </th>
                    <th style={{ width: '11%', padding: '10px 8px' }}>PLACA / CÓDIGO</th>
                    <th style={{ width: '20%', padding: '10px 8px' }}>EQUIPO & MODELO</th>
                    <th style={{ width: '12%', padding: '10px 8px' }}>SERIAL</th>
                    <th style={{ width: '16%', padding: '10px 8px' }}>SEDE / UBICACIÓN</th>
                    <th style={{ width: '13%', padding: '10px 8px' }}>RESPONSABLE ACTUAL</th>
                    <th style={{ width: '11%', textAlign: 'center', padding: '10px 8px' }}>ESTADO</th>
                    <th style={{ width: '14%', textAlign: 'center', padding: '10px 6px' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedEquiposUnits || []).map((u, idx) => {
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
                    const isChecked = isQRSelected(placa);

                    return (
                      <tr
                        key={`${u.parentItemId}-${u.code}-${idx}`}
                        className={`h-auto transition-colors ${isChecked ? 'bg-lime-50/40 dark:bg-lime-950/20' : ''}`}
                      >
                        {/* Checkbox de selección individual */}
                        <td className="py-2.5" style={{ width: '42px', padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectQR(u, 'equipo')}
                            aria-label={`Seleccionar ${placa} para impresión QR`}
                            className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                          />
                        </td>

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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                {u.model || 'Estándar'}
                              </span>
                              <ProgramAreaBadge
                                area={u.area_asignada || u.area || u.programa || 'Nuevas Tecnologías'}
                                defaultProgram="tecnologia"
                                iconSize={14}
                              />
                            </div>
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
                            {canEditInventory && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar equipo"
                                onClick={() => {
                                  const parent = equipos.find(e => e.id === u.parentItemId);
                                  handleOpenEdit({
                                    ...(parent || {}),
                                    ...u,
                                    id: u.id || u.parentItemId || placa,
                                    dbId: u.dbId || (parent && parent.dbId),
                                    area_asignada: u.area_asignada || u.area || (parent && (parent.area_asignada || parent.area)) || 'Nuevas Tecnologías',
                                    area: u.area_asignada || u.area || (parent && (parent.area_asignada || parent.area)) || 'Nuevas Tecnologías',
                                    placa: placa,
                                    codigo: placa,
                                  });
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
                  {Array.from({ length: Math.max(0, Math.min(ITEMS_PER_PAGE, 5) - paginatedEquiposUnits.length) }).map((_, phIdx) => (
                    <tr key={`ph-equipos-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={8} style={{ padding: '0 14px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6d6e71]">
                    <span>Filas:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItemsPerPage(val);
                        setEquiposPage(1);
                        setConsumiblesPage(1);
                        setPapeleriaPage(1);
                        setMobiliarioPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-[#013a52] outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={99999}>Todos</option>
                    </select>
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
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 2: EQUIPOS DE ELECTRÓNICA & INSTRUMENTACIÓN (Reutilizables / FMO)
          ========================================================================= */}
      {activeTab === 'electronica' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="section-header" style={{ marginBottom: '6px', paddingBottom: '2px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#013a52' }}>
              <span>Control de Equipos de Electrónica & Instrumentación</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700, backgroundColor: 'rgba(1, 58, 82, 0.08)', color: '#013a52', border: '1px solid rgba(1, 58, 82, 0.15)' }}>
                {rawElectronica.length} equipos en catálogo
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px', marginTop: '2px', color: '#6d6e71' }}>
              Multímetros, osciloscopios, fuentes regulables, estaciones de soldadura, tarjetas programables y kits reutilizables
            </span>
          </div>

          {/* Barra de Filtros reactiva */}
          <div className="filter-bar" style={{ marginBottom: '6px', padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)', backgroundColor: 'var(--surface, #ffffff)' }}>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filtro Sede */}
              <div className="filter-group flex items-center gap-2">
                <label className="text-[#6d6e71] font-semibold text-xs" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Sede / Ubicación:
                </label>
                <select
                  value={filterSedeElectronica}
                  onChange={(e) => {
                    setFilterSedeElectronica(e.target.value);
                    setElectronicaPage(1);
                  }}
                  className="rounded-lg text-xs font-semibold px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#013a52] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <option value="todas">Todas las sedes ({rawElectronica.length})</option>
                  {sedesList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado */}
              <div className="filter-group flex items-center gap-2">
                <label className="text-[#6d6e71] font-semibold text-xs" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Estado:
                </label>
                <select
                  value={filterStatusElectronica}
                  onChange={(e) => {
                    setFilterStatusElectronica(e.target.value);
                    setElectronicaPage(1);
                  }}
                  className="rounded-lg text-xs font-semibold px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#013a52] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="disponible">Disponible</option>
                  <option value="en préstamo">En Préstamo</option>
                  <option value="en mantenimiento">En Mantenimiento</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            </div>

            <div className="filter-count text-[#6d6e71] text-xs font-medium" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Mostrando <strong className="font-bold text-[#013a52]">{electronicaFiltrada.length}</strong> de <strong className="font-bold text-[#013a52]">{rawElectronica.length}</strong> equipos registrados
            </div>
          </div>

          {/* Banner de Selección Múltiple QR */}
          {renderQRSelectionBanner()}

          {electronicaFiltrada.length === 0 ? (
            <div className="panel empty" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>⚡</span>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-h, #013a52)', fontWeight: 600 }}>
                No hay equipos de electrónica registrados con los filtros seleccionados.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-dim, #6d6e71)' }}>
                Registra uno nuevo con el botón superior "+ Nuevo Equipo de Electrónica".
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)', backgroundColor: 'var(--surface, #ffffff)' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '1150px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #abd037' }}>
                    <th style={{ width: '42px', minWidth: '42px', maxWidth: '42px', padding: '10px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={areAllVisibleElectronicaSelected}
                        onChange={() => toggleSelectAllVisible(paginatedElectronica, 'electronica')}
                        aria-label="Seleccionar todos los equipos visibles"
                        className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                        title="Seleccionar o deseleccionar todos los equipos visibles"
                      />
                    </th>
                    <th style={{ width: '12%', minWidth: '110px', padding: '10px 8px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      PLACA / CÓDIGO
                    </th>
                    <th style={{ width: '22%', minWidth: '210px', padding: '10px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      EQUIPO & MODELO
                    </th>
                    <th style={{ width: '14%', minWidth: '130px', padding: '10px 8px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      SUBCATEGORÍA
                    </th>
                    <th style={{ width: '13%', minWidth: '125px', padding: '10px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      PROGRAMA FMO
                    </th>
                    <th style={{ width: '16%', minWidth: '150px', padding: '10px 8px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      SEDE / UBICACIÓN
                    </th>
                    <th style={{ width: '10%', minWidth: '95px', padding: '10px 8px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      ESTADO
                    </th>
                    <th style={{ width: '13%', minWidth: '130px', padding: '10px 6px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                      ACCIONES
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedElectronica || []).map((e) => {
                    const code = e.placa || e.code || e.id;
                    const nombre = e.nombre || e.material || e.name || 'Equipo de Electrónica';
                    const sede = e.sede || e.ubicacion || 'Medellín';
                    const subcat = e.subcategoria || e.categoria || 'Instrumentación';
                    const estado = e.estado || 'Disponible';
                    const estadoLower = estado.toLowerCase();
                    const isSelected = isQRSelected(code);

                    return (
                      <tr key={code} className={isSelected ? 'bg-[#abd037]/10' : ''} style={{ borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                        {/* Checkbox */}
                        <td style={{ width: '42px', minWidth: '42px', maxWidth: '42px', textAlign: 'center', padding: '8px 4px', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQR(normalizeItemForQR(e, 'electronica'))}
                            className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                          />
                        </td>

                        {/* Placa / Código */}
                        <td style={{ width: '12%', minWidth: '110px', maxWidth: 0, padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setItemParaDetalle(normalizeItemForQR(e, 'electronica'))}
                            className="badge-placa"
                            title={`Ver ficha técnica de ${code}`}
                            style={{
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: '11.5px',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              color: '#013a52',
                              backgroundColor: 'rgba(1, 58, 82, 0.08)',
                              border: '1px solid rgba(1, 58, 82, 0.18)',
                              padding: '2.5px 7px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {code}
                          </button>
                        </td>

                        {/* Equipo & Modelo */}
                        <td style={{ width: '22%', minWidth: '210px', maxWidth: 0, padding: '8px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title truncate block"
                              title={nombre}
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: 'var(--text-h, #013a52)',
                                lineHeight: '1.25',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {nombre}
                            </strong>
                            <span
                              className="truncate block"
                              title={[e.marca, e.modelo, e.serial ? `S/N: ${e.serial}` : ''].filter(Boolean).join(' · ')}
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim, #6d6e71)',
                                marginTop: '2px',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {[e.marca, e.modelo].filter(Boolean).join(' ') || 'Equipo institucional'}
                              {e.serial ? ` · S/N: ${e.serial}` : ''}
                            </span>
                          </div>
                        </td>

                        {/* Subcategoría */}
                        <td style={{ width: '14%', minWidth: '130px', maxWidth: 0, padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                            <span
                              className="truncate inline-block"
                              title={subcat}
                              style={{
                                display: 'inline-block',
                                padding: '2.5px 8px',
                                borderRadius: '9999px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: 'var(--surface-2, #f1f5f9)',
                                color: 'var(--text-h, #013a52)',
                                border: '1px solid var(--line, #e2e8f0)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {subcat}
                            </span>
                          </div>
                        </td>

                        {/* Programa FMO */}
                        <td style={{ width: '13%', minWidth: '125px', maxWidth: 0, textAlign: 'center', padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                            <ProgramAreaBadge area={e.area_asignada || 'Robótica'} size="sm" />
                          </div>
                        </td>

                        {/* Sede / Ubicación */}
                        <td style={{ width: '16%', minWidth: '150px', maxWidth: 0, padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                            <span
                              className="sede-badge municipal truncate block"
                              title={`Sede: ${sede}`}
                              style={{
                                maxWidth: '100%',
                                fontSize: '11px',
                                padding: '2px 7px',
                                display: 'inline-block',
                                lineHeight: '1.25',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {sede}
                            </span>
                            {e.ubicacion && (
                              <span
                                className="truncate block"
                                title={`Ubicación física: ${e.ubicacion}`}
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-dim, #6d6e71)',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {e.ubicacion}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ width: '10%', minWidth: '95px', maxWidth: 0, textAlign: 'center', padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minWidth: 0 }}>
                            <span
                              className={`pill ${
                                estadoLower.includes('dispon')
                                  ? 'ok'
                                  : estadoLower.includes('prest')
                                  ? 'prestado'
                                  : estadoLower.includes('manten')
                                  ? 'alerta'
                                  : 'low'
                              }`}
                              style={{
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '2.5px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {estado}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td style={{ width: '13%', minWidth: '130px', maxWidth: '140px', textAlign: 'center', padding: '8px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
                              title="Ver e Imprimir Código QR"
                              onClick={() => setQrModalItem(normalizeItemForQR(e, 'electronica'))}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <QrCode size={14} />
                            </button>

                            {/* 👁️ Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud shrink-0"
                              title="Ver ficha técnica completa"
                              onClick={() => setItemParaDetalle(normalizeItemForQR(e, 'electronica'))}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2, #f8fafc)',
                                border: '1px solid var(--line, #e2e8f0)',
                                borderRadius: '7px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-h, #013a52)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Eye size={14} />
                            </button>

                            {/* ✏️ Editar */}
                            {canEditInventory && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar equipo de electrónica"
                                onClick={() => handleOpenEditElectronica(e)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  borderRadius: '7px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#d97706',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Pencil size={14} />
                              </button>
                            )}

                            {/* 🗑️ Baja / Eliminar */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Dar de baja equipo de electrónica"
                                onClick={() => handleDeleteElectronica(e)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  borderRadius: '7px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#ef4444',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Paginación de Electrónica */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderTop: '1px solid var(--line, #e2e8f0)',
                  fontSize: '12px',
                  color: 'var(--text-dim, #6d6e71)',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>
                    {electronicaFiltrada.length === 0 ? 0 : (currentElectronicaPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>
                    {Math.min(currentElectronicaPage * ITEMS_PER_PAGE, electronicaFiltrada.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>{electronicaFiltrada.length}</strong>{' '}
                  {electronicaFiltrada.length !== rawElectronica.length
                    ? `(filtrados de ${rawElectronica.length} registrados)`
                    : 'equipos registrados'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={currentElectronicaPage <= 1}
                    onClick={() => setElectronicaPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-[#013a52] dark:text-slate-100 transition-colors cursor-pointer"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    Anterior
                  </button>
                  <span className="font-bold text-[#013a52] dark:text-slate-200 text-xs" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Pág. {currentElectronicaPage} de {totalElectronicaPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentElectronicaPage >= totalElectronicaPages}
                    onClick={() => setElectronicaPage((p) => Math.min(totalElectronicaPages, p + 1))}
                    className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-[#013a52] dark:text-slate-100 transition-colors cursor-pointer"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 3: CONSUMIBLES DE ROBÓTICA (Insumos, motores, cables, sensores)
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
            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Estado de Stock:</label>
              <select
                value={filterStockConsumibles}
                onChange={(e) => {
                  setFilterStockConsumibles(e.target.value);
                  setConsumiblesPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
              >
                <option value="todos">Todos los materiales ({countConsumiblesTodos})</option>
                <option value="minimo">⚠️ Solo Stock Bajo ({countConsumiblesMinimo})</option>
                <option value="optimo">✓ Stock Óptimo ({countConsumiblesOptimo})</option>
              </select>
            </div>

            <div className="filter-count text-[#6d6e71] text-sm">
              Mostrando <strong className="font-bold text-[#013a52]">{consumibles.length}</strong> de <strong className="font-bold text-[#013a52]">{countConsumiblesTodos}</strong> materiales registrados
            </div>
          </div>

          {/* Banner de Selección Múltiple QR */}
          {renderQRSelectionBanner()}

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
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
              <table className="w-full table-fixed" style={{ tableLayout: 'fixed', width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '42px', padding: '10px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={areAllVisibleConsumiblesSelected}
                        onChange={() => toggleSelectAllVisible(paginatedConsumibles, 'consumible')}
                        aria-label="Seleccionar todos los consumibles visibles"
                        className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                        title="Seleccionar o deseleccionar todos los consumibles visibles"
                      />
                    </th>
                    <th className="w-[27%] text-left px-3" style={{ width: '27%', padding: '10px 12px', textAlign: 'left' }}>CÓDIGO / MATERIAL</th>
                    <th className="w-[15%] text-center px-2" style={{ width: '15%', padding: '10px 8px', textAlign: 'center' }}>CATEGORÍA</th>
                    <th className="w-[11%] text-center px-2" style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>DISPONIBLE</th>
                    <th className="w-[18%] text-left px-3" style={{ width: '18%', padding: '10px 12px', textAlign: 'left' }}>UBICACIÓN FÍSICA</th>
                    <th className="w-[12%] text-center px-2" style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>ESTADO DE STOCK</th>
                    <th className="w-[14%] text-center px-2" style={{ width: '14%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedConsumibles || []).map((it) => {
                    const disp = Number(it.disponible ?? it.quantity ?? 0);
                    const min = Number(it.minimo ?? it.minStock ?? 5);
                    const isZero = disp <= 0;
                    const isLow = !isZero && disp <= min;
                    const matName = it.material || it.name || 'Sin nombre';
                    const ubi = it.ubicacion || it.location || 'Oficina FMO';
                    const isChecked = isQRSelected(it.id || it.code || 'S-COD');

                    return (
                      <tr
                        key={it.id}
                        className={`${isZero ? 'row-critical' : isLow ? 'row-warning' : ''} ${isChecked ? 'bg-lime-50/40 dark:bg-lime-950/20' : ''} h-auto transition-colors`}
                      >
                        {/* Checkbox de selección individual */}
                        <td className="py-2.5" style={{ width: '42px', padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectQR(it, 'consumible')}
                            aria-label={`Seleccionar ${it.id} para impresión QR`}
                            className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                          />
                        </td>

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
                          <ProgramAreaBadge
                            area={it.area_asignada || it.area || it.programa || it.categoria || it.category || 'Robótica'}
                            defaultProgram="robotica"
                            iconSize={15}
                          />
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
                            {canEditInventory && (
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

                            {/* 🗑️ Dar de Baja / Eliminar (Solo Administrador) */}
                            {isAdmin && (() => {
                              const stock = Number(it.disponible ?? it.quantity ?? it.stock ?? 0);
                              const esBaja = (it.estado || '').toLowerCase().trim() === 'baja';
                              const deshabilitado = stock <= 0 || esBaja;

                              return (
                                <button
                                  type="button"
                                  className="btn-icon-crud shrink-0"
                                  title={
                                    esBaja
                                      ? "Material ya retirado / Dado de baja"
                                      : stock <= 0
                                      ? "No es posible dar de baja: stock disponible en 0"
                                      : "Dar de baja material / insumo"
                                  }
                                  onClick={() => handleDeleteConsumable(it)}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    flexShrink: 0,
                                    background: deshabilitado ? 'rgba(148, 163, 184, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                                    border: deshabilitado ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: deshabilitado ? 'not-allowed' : 'pointer',
                                    opacity: deshabilitado ? 0.4 : 1,
                                    color: deshabilitado ? '#94a3b8' : 'var(--red, #ef4444)',
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
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, Math.min(ITEMS_PER_PAGE, 5) - paginatedConsumibles.length) }).map((_, phIdx) => (
                    <tr key={`ph-consumibles-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
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
                    {consumibles.length === 0 ? 0 : (currentConsumiblesPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentConsumiblesPage * ITEMS_PER_PAGE, consumibles.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{consumibles.length}</strong> materiales
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6d6e71]">
                    <span>Filas:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItemsPerPage(val);
                        setEquiposPage(1);
                        setConsumiblesPage(1);
                        setPapeleriaPage(1);
                        setMobiliarioPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-[#013a52] outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={99999}>Todos</option>
                    </select>
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
            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Contenedor:</label>
              <select
                value={filterCajaPapeleria}
                onChange={(e) => {
                  setFilterCajaPapeleria(e.target.value);
                  setPapeleriaPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
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

            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Estado de Stock:</label>
              <select
                value={filterStockPapeleria}
                onChange={(e) => {
                  setFilterStockPapeleria(e.target.value);
                  setPapeleriaPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
              >
                <option value="todos">Todos los Insumos ({rawPapeleria.length})</option>
                <option value="minimo">⚠️ Solo Stock Bajo (≤ 3 unid.)</option>
                <option value="optimo">✓ Stock Óptimo (&gt; 3 unid.)</option>
              </select>
            </div>

            <div className="filter-count text-[#6d6e71] text-sm">
              Mostrando <strong className="font-bold text-[#013a52]">{papeleriaFiltrada.length}</strong> de <strong className="font-bold text-[#013a52]">{rawPapeleria.length}</strong> insumos de papelería
            </div>
          </div>

          {/* Banner de Selección Múltiple QR */}
          {renderQRSelectionBanner()}

          {papeleriaFiltrada.length === 0 ? (
            <div className="panel empty">
              <span>📄</span> No se encontraron insumos de papelería con los filtros seleccionados.
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '42px', padding: '10px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={areAllVisiblePapeleriaSelected}
                        onChange={() => toggleSelectAllVisible(paginatedPapeleria, 'papeleria')}
                        aria-label="Seleccionar todos los insumos de papelería visibles"
                        className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                        title="Seleccionar o deseleccionar todos los insumos visibles"
                      />
                    </th>
                    <th style={{ width: '11%', padding: '10px 12px', textAlign: 'left' }}>CÓDIGO / PLACA</th>
                    <th style={{ width: '24%', padding: '10px 12px', textAlign: 'left' }}>MATERIAL / NOMBRE</th>
                    <th style={{ width: '10%', padding: '10px 6px', textAlign: 'center' }}>CANTIDAD</th>
                    <th style={{ width: '17%', padding: '10px 8px', textAlign: 'center' }}>CONDICIÓN</th>
                    <th style={{ width: '19%', padding: '10px 14px', textAlign: 'left' }}>UBICACIÓN</th>
                    <th style={{ width: '16%', padding: '10px 12px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedPapeleria || []).map((it) => {
                    const disp = Number(it.disponible ?? it.quantity ?? 0);
                    const isZero = disp <= 0;
                    const isLow = disp > 0 && disp <= 3;
                    const matName = it.material || it.name || 'Sin nombre';
                    const ubi = it.ubicacion || it.location || 'Oficina FMO';
                    const estante = it.ubicacion_estante || it.caja || 'Fuera de cajas';
                    const esNuevo = String(it.condicion || '').toLowerCase().includes('nuevo') && !String(it.condicion || '').toLowerCase().includes('usado');
                    const esUsado = String(it.condicion || '').toLowerCase().includes('usad') && !String(it.condicion || '').toLowerCase().includes('nuevo');
                    const code = it.id || it.placa || 'S-COD';
                    const isChecked = isQRSelected(code);

                    return (
                      <tr
                        key={it.id}
                        className={`${isZero ? 'row-critical' : isLow ? 'row-warning' : ''} ${isChecked ? 'bg-lime-50/40 dark:bg-lime-950/20' : ''} h-auto transition-colors`}
                      >
                        {/* Checkbox de selección individual */}
                        <td className="py-2.5" style={{ width: '42px', padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectQR(it, 'papeleria')}
                            aria-label={`Seleccionar ${code} para impresión QR`}
                            className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                          />
                        </td>

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <ProgramAreaBadge
                                area={it.area_asignada || it.area || it.programa || it.categoria || 'TeachLabs'}
                                defaultProgram="teachlabs"
                                iconSize={13}
                              />
                            </div>
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

                        {/* 4. CONDICION: Badge estilo boton institucional con texto comprimido y tooltip */}
                        <td className="py-2.5" style={{ textAlign: 'center', verticalAlign: 'middle', padding: '8px 6px', overflow: 'hidden', maxWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
                            {esNuevo ? (
                              <span className="badge-condicion nuevo" title="Condición: Nuevos" style={{ maxWidth: '100%', minWidth: 0 }}>
                                <span className="badge-condicion-dot" />
                                <span className="badge-condicion-text">Nuevos</span>
                              </span>
                            ) : esUsado ? (
                              <span className="badge-condicion usado" title="Condición: Usados" style={{ maxWidth: '100%', minWidth: 0 }}>
                                <span className="badge-condicion-dot" />
                                <span className="badge-condicion-text">Usados</span>
                              </span>
                            ) : (
                              <span className="badge-condicion mixto" title={`Condición: ${it.condicion || 'Nuevos y Usados'}`} style={{ maxWidth: '100%', minWidth: 0 }}>
                                <span className="badge-condicion-dot" />
                                <span className="badge-condicion-text">{it.condicion || 'Nuevos y Usados'}</span>
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
                            {canEditInventory && (
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
                  {Array.from({ length: Math.max(0, Math.min(ITEMS_PER_PAGE, 5) - paginatedPapeleria.length) }).map((_, phIdx) => (
                    <tr key={`ph-papeleria-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
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
                    {papeleriaFiltrada.length === 0 ? 0 : (currentPapeleriaPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentPapeleriaPage * ITEMS_PER_PAGE, papeleriaFiltrada.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{papeleriaFiltrada.length}</strong> insumos de papelería
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6d6e71]">
                    <span>Filas:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItemsPerPage(val);
                        setEquiposPage(1);
                        setConsumiblesPage(1);
                        setPapeleriaPage(1);
                        setMobiliarioPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-[#013a52] outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={99999}>Todos</option>
                    </select>
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
            <div className="filter-group flex items-center gap-2">
              <label className="text-[#6d6e71] font-medium text-sm">Sede / Ubicación:</label>
              <select
                value={filterSedeMobiliario}
                onChange={(e) => {
                  setFilterSedeMobiliario(e.target.value);
                  setMobiliarioPage(1);
                }}
                className="bg-white text-[#013a52] font-semibold text-sm border border-slate-300 focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] rounded-md px-3 py-1.5 outline-none shadow-xs"
              >
                <option value="todas">Todas las sedes ({rawMobiliario.length})</option>
                {sedesList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-count text-[#6d6e71] text-sm">
              Mostrando <strong className="font-bold text-[#013a52]">{mobiliarioFiltrado.length}</strong> de <strong className="font-bold text-[#013a52]">{rawMobiliario.length}</strong> muebles registrados
            </div>
          </div>

          {/* Banner de Selección Múltiple QR */}
          {renderQRSelectionBanner()}

          {mobiliarioFiltrado.length === 0 ? (
            <div className="panel empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🪑</span>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text, #f8fafc)', fontWeight: 600 }}>
                No hay mobiliario registrado en esta sede o catálogo.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-dim, #94a3b8)' }}>
                Registra uno nuevo con el botón superior.
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', borderRadius: '14px', border: '1px solid var(--line, #e2e8f0)' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '42px', padding: '10px 4px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={areAllVisibleMobiliarioSelected}
                        onChange={() => toggleSelectAllVisible(paginatedMobiliario, 'mobiliario')}
                        aria-label="Seleccionar todos los muebles visibles"
                        className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                        title="Seleccionar o deseleccionar todos los muebles visibles"
                      />
                    </th>
                    <th style={{ width: '15%', padding: '10px 14px', textAlign: 'left' }}>PLACA / CÓDIGO</th>
                    <th style={{ width: '26%', padding: '10px 12px', textAlign: 'left' }}>MOBILIARIO & DESCRIPCIÓN</th>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>CANTIDAD</th>
                    <th style={{ width: '17%', padding: '10px 12px', textAlign: 'left' }}>SEDE / ESPACIO ASIGNADO</th>
                    <th style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ width: '16%', padding: '10px 16px', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedMobiliario || []).map((m) => {
                    const code = m.placa || m.code || m.id;
                    const nombre = m.nombre || m.material || m.name || 'Mueble Modular';
                    const sede = m.sede || m.ubicacion || 'Medellín';
                    const cant = Number(m.disponible ?? m.quantity ?? 1);
                    const isChecked = isQRSelected(code);

                    return (
                      <tr key={code} className={`h-auto transition-colors ${isChecked ? 'bg-lime-50/40 dark:bg-lime-950/20' : 'hover:bg-slate-500/5'}`}>
                        {/* Checkbox de selección individual */}
                        <td className="py-2.5" style={{ width: '42px', padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectQR(m, 'mobiliario')}
                            aria-label={`Seleccionar ${code} para impresión QR`}
                            className="w-4 h-4 rounded cursor-pointer accent-[#abd037] focus:ring-1 focus:ring-[#013a52]"
                          />
                        </td>

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
                            {canEditInventory && (
                              <button
                                type="button"
                                className="btn-icon-crud shrink-0"
                                title="Editar mobiliario"
                                onClick={() => handleOpenEditMobiliario(m)}
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
                  {Array.from({ length: Math.max(0, Math.min(ITEMS_PER_PAGE, 5) - paginatedMobiliario.length) }).map((_, phIdx) => (
                    <tr key={`ph-mobiliario-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
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
                    {mobiliarioFiltrado.length === 0 ? 0 : (currentMobiliarioPage - 1) * ITEMS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentMobiliarioPage * ITEMS_PER_PAGE, mobiliarioFiltrado.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{mobiliarioFiltrado.length}</strong> muebles
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="flex items-center gap-1.5 text-xs text-[#6d6e71]">
                    <span>Filas:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItemsPerPage(val);
                        setEquiposPage(1);
                        setConsumiblesPage(1);
                        setPapeleriaPage(1);
                        setMobiliarioPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-[#013a52] outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={99999}>Todos</option>
                    </select>
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
                    maxLength={90}
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
                    maxLength={50}
                    defaultValue={editingItem?.category || ''}
                    placeholder="Cómputo, Robótica, Audiovisuales..."
                  />
                </div>

                <div className="form-group">
                  <label>Sede Principal</label>
                  <select name="sede" defaultValue={editingItem?.sede || 'Medellín'}>
                    {sedesList.map((s) => (
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
                      max="99999"
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
                    max="99999"
                    name="minStock"
                    defaultValue={editingItem?.minStock ?? 5}
                  />
                </div>

                <div className="form-group full">
                  <label>Ubicación Física en Bodega / Laboratorio</label>
                  <input
                    name="location"
                    maxLength={70}
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
                          background: 'rgba(132, 204, 22, 0.1)',
                          color: 'var(--copper)',
                          border: '1px solid rgba(132, 204, 22, 0.4)',
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
                            maxLength={25}
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
                            maxLength={60}
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
                            maxLength={60}
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
                    maxLength={350}
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
          MODAL: IMPRESIÓN MASIVA DE ETIQUETAS QR EN CUADRÍCULA (SIGA-FMO)
          ========================================================================= */}
      {modalImpresionMasivaOpen && (
        <ImpresionMasivaQRModal
          items={selectedQRs}
          allFilteredItems={getCurrentTabFilteredItems()}
          onClose={() => setModalImpresionMasivaOpen(false)}
        />
      )}

      {/* =========================================================================
          BARRA FLOTANTE DE IMPRESIÓN QR (Visible en cualquier vista cuando hay selección)
          ========================================================================= */}
      {selectedQRs.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-40 bg-[#013a52] text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-[#abd037] flex items-center gap-4 animate-bounce-short no-print"
          style={{ boxShadow: '0 10px 25px -5px rgba(1, 58, 82, 0.5), 0 8px 10px -6px rgba(171, 208, 55, 0.3)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#013a52] border border-[#abd037] text-[#abd037] font-bold text-xs flex items-center justify-center shadow-xs">
              {selectedQRs.length}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-tight">
                {selectedQRs.length} {selectedQRs.length === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
              </span>
              <span className="text-[10px] text-slate-300 leading-tight">
                9 QR por hoja Carta (Cuadrícula 3×3)
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-600/70" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalImpresionMasivaOpen(true)}
              className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.03]"
              title="Abrir vista previa de impresión en cuadrícula 2x2"
            >
              <span>🖨️</span>
              <span>Imprimir QRs</span>
            </button>
            <button
              type="button"
              onClick={clearQRSelection}
              className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
              title="Deseleccionar todos los ítems"
            >
              Limpiar
            </button>
          </div>
        </div>
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
                    maxLength={90}
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
                    {sedesList.map((s) => (
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
                    maxLength={140}
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
                    maxLength={140}
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
            handleOpenEdit(it);
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
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0b1320] border rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface, #0b1320)',
              border: `1.5px solid ${themeEditarConsumible.cardBorder || themeEditarConsumible.accentBorder}`,
              borderRadius: '16px',
              maxWidth: '56rem',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo con Tematización Dinámica FMO */}
            <div
              className="p-5 border-b shrink-0 flex items-center justify-between"
              style={{
                backgroundColor: themeEditarConsumible.headerBg,
                borderBottom: `3px solid ${themeEditarConsumible.accentBorder}`,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                transition: 'background-color 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  style={{
                    backgroundColor: themeEditarConsumible.iconBg,
                    color: themeEditarConsumible.iconColor,
                    border: `1px solid ${themeEditarConsumible.accentBorder}`,
                    fontFamily: "'Poppins', sans-serif",
                    letterSpacing: '0.02em',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {formDataEditar.id || formDataEditar.codigo || itemParaEditar.codigo || itemParaEditar.id_referencia || itemParaEditar.placa || itemParaEditar.id || ''}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold m-0" style={{ margin: 0, fontSize: '15px', color: themeEditarConsumible.headerText, transition: 'color 0.3s ease' }}>
                    {isPapeleriaEdit ? 'Editar Insumo de Papelería' : 'Editar Material / Consumible'}
                  </h3>
                  <p className="text-[11px] sm:text-xs m-0" style={{ margin: '2px 0 0 0', fontSize: '12px', color: themeEditarConsumible.headerSubtext, transition: 'color 0.3s ease' }}>
                    {isPapeleriaEdit ? 'Actualiza los datos y existencias del insumo de papelería' : 'Actualiza la placa, ficha técnica y existencias en el inventario'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={editConsumibleSubmitting}
                onClick={() => setModalEditarOpen(false)}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: themeEditarConsumible.headerText,
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.backgroundColor = 'transparent'; }}
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
                className="flex items-center justify-between gap-2 max-w-4xl mx-auto"
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
                          ? '#84CC16'
                          : isDone
                            ? 'rgba(132, 204, 22, 0.12)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: isActive
                          ? '#0f172a'
                          : isDone
                            ? '#84CC16'
                            : 'var(--text-dim, #94a3b8)',
                        border: isActive
                          ? '1px solid #84CC16'
                          : isDone
                            ? '1px solid rgba(132, 204, 22, 0.35)'
                            : '1px solid var(--line, #334155)',
                        boxShadow: isActive ? '0 2px 10px rgba(132, 204, 22, 0.3)' : 'none',
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
                              ? '#84CC16'
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
                className="p-4 sm:p-5 text-sm overflow-y-auto flex-1"
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
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Identificación y Clasificación
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Nombre del Elemento (Izquierda) + Código / Placa (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Nombre Del Elemento / Material *
                        </label>
                        <input
                          required
                          type="text"
                          name="material"
                          maxLength={90}
                          value={formDataEditar.material || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, material: e.target.value })}
                          placeholder={isPapeleriaEdit ? "Ej. Carpetas de Cartón Yute Oficio" : "Ej. ARDUINO UNO R3 con Cable USB"}
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
                          Código / Placa *
                        </label>
                        <input
                          required
                          type="text"
                          name="id"
                          maxLength={25}
                          value={formDataEditar.id || ''}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, id: e.target.value })}
                          placeholder={isPapeleriaEdit ? "Ej. Pape0036" : "Ej. Rob0043"}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 2: Categoría (Izquierda) + Cantidad / Stock (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Categoría *
                        </label>
                        {isPapeleriaEdit ? (
                          <input
                            type="text"
                            readOnly
                            value={formDataEditar.categoria || 'Papelería'}
                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 cursor-not-allowed opacity-90"
                            style={{
                              backgroundColor: 'var(--bg, #0f172a)',
                              color: 'var(--text, #f8fafc)',
                              borderColor: 'var(--line, #334155)',
                            }}
                          />
                        ) : (
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
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Cantidad / Stock *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          max="99999"
                          name="disponible"
                          value={formDataEditar.disponible ?? 0}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, disponible: e.target.value })}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 3: Condición / Unidad (Izquierda) + Área Asignada / Programa FMO con Badge (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Condición / Unidad
                        </label>
                        <select
                          name="condicion"
                          value={formDataEditar.condicion || (isPapeleriaEdit ? 'Nuevos' : 'Bueno')}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, condicion: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          {isPapeleriaEdit ? (
                            <>
                              <option value="Nuevos">Nuevos</option>
                              <option value="Usados">Usados</option>
                              <option value="Mixto">Mixto</option>
                            </>
                          ) : (
                            <>
                              <option value="Nuevo">Nuevo</option>
                              <option value="Bueno">Bueno</option>
                              <option value="Regular">Regular</option>
                              <option value="Usado">Usado</option>
                              <option value="Donación">Donación</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <ProgramAreaSelect
                          label="Área Asignada / Programa FMO"
                          value={formDataEditar.area_asignada || formDataEditar.area || (isPapeleriaEdit ? 'TeachLabs' : 'Robótica')}
                          defaultProgram={isPapeleriaEdit ? 'teachlabs' : 'robotica'}
                          showPreview={false}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, area: e.target.value, area_asignada: e.target.value })}
                        />
                        <div
                          className="h-[36px] px-3 py-1 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-between"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Distintivo en tabla:</span>
                          <ProgramAreaBadge
                            area={formDataEditar.area_asignada || formDataEditar.area || (isPapeleriaEdit ? 'TeachLabs' : 'Robótica')}
                            defaultProgram={isPapeleriaEdit ? 'teachlabs' : 'robotica'}
                            iconSize={16}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fila 4: Descripción General */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Descripción General
                      </label>
                      <textarea
                        name="descripcion"
                        rows={2}
                        maxLength={350}
                        value={formDataEditar.descripcion || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, descripcion: e.target.value })}
                        placeholder="Descripción general del material o propósito institucional..."
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

                {/* PASO 2: ESPECIFICACIONES */}
                {pasoActual === 2 && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Ubicación y Especificaciones Técnicas
                      </h4>
                    </div>

                    {/* Fila 1: Sede / Ubicación Física | Estante / Gaveta */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Sede / Ubicación Física
                        </label>
                        <select
                          name="ubicacion"
                          value={formDataEditar.ubicacion || formDataEditar.sede || sedesList[0] || 'Medellín'}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, ubicacion: e.target.value, sede: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          {formDataEditar.ubicacion && !sedesList.includes(formDataEditar.ubicacion) && (
                            <option value={formDataEditar.ubicacion}>{formDataEditar.ubicacion}</option>
                          )}
                          {sedesList.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estante / Caja / Gaveta
                        </label>
                        <input
                          type="text"
                          name="ubicacion_estante"
                          maxLength={70}
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

                    {/* Fila 2: Stock Mínimo De Alerta * | Características */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Stock Mínimo De Alerta *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          max="99999"
                          name="minimo"
                          value={formDataEditar.minimo ?? (isPapeleriaEdit ? 3 : 5)}
                          onChange={(e) => setFormDataEditar({ ...formDataEditar, minimo: e.target.value })}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Características
                        </label>
                        <input
                          type="text"
                          name="caracteristicas"
                          maxLength={120}
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
                    </div>

                    {/* Fila 3: Estado | Condición */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
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

                    {/* Fila 4: Detalle Técnico / Observaciones */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Detalle Técnico / Observaciones
                      </label>
                      <textarea
                        name="descripcion_tecnica"
                        rows={2}
                        maxLength={300}
                        value={formDataEditar.descripcion_tecnica || ''}
                        onChange={(e) => setFormDataEditar({ ...formDataEditar, descripcion_tecnica: e.target.value })}
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
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Adquisición, Garantía y Notas
                      </h4>
                    </div>

                    {/* Fila 1: Valor Compra | Fecha Compra */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Compra ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="999999999"
                          step="any"
                          name="valor_compra"
                          value={formDataEditar.valor_compra ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setFormDataEditar({ ...formDataEditar, valor_compra: '', valor_total: '' });
                              return;
                            }
                            const clamped = Math.min(999999999, Math.max(0, Number(val)));
                            setFormDataEditar({
                              ...formDataEditar,
                              valor_compra: clamped,
                              valor_total: clamped,
                            });
                          }}
                          placeholder="Ej. 25000"
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
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
                    </div>

                    {/* Fila 2: Vencimiento Garantía */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
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
                      <div></div>
                    </div>

                    {/* Fila 3: Notas u Observaciones */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows={2}
                        maxLength={300}
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
                        backgroundColor: themeEditarConsumible.buttonBg,
                        border: 'none',
                        color: themeEditarConsumible.buttonText,
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 2px 12px ${themeEditarConsumible.buttonBg}44`,
                        transition: 'all 0.3s ease',
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
                              borderTopColor: themeEditarConsumible.buttonText,
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
          sedes={sedesList}
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
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0b1320] border rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--surface, #0b1320)',
              border: `1.5px solid ${themeNuevoConsumible.cardBorder || themeNuevoConsumible.accentBorder}`,
              borderRadius: '16px',
              maxWidth: '56rem',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.3s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Fijo con Tematización Dinámica FMO */}
            <div
              className="p-5 border-b shrink-0 flex items-center justify-between"
              style={{
                backgroundColor: themeNuevoConsumible.headerBg,
                borderBottom: `3px solid ${themeNuevoConsumible.accentBorder}`,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                transition: 'background-color 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  style={{
                    backgroundColor: themeNuevoConsumible.iconBg,
                    color: themeNuevoConsumible.iconColor,
                    border: `1px solid ${themeNuevoConsumible.accentBorder}`,
                    fontFamily: "'Poppins', sans-serif",
                    letterSpacing: '0.02em',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {formDataNuevo.id || '+ Nuevo'}
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold m-0" style={{ margin: 0, fontSize: '15px', color: themeNuevoConsumible.headerText, transition: 'color 0.3s ease' }}>
                    {isPapeleriaNuevo ? 'Nuevo Insumo de Papelería' : 'Nuevo Material / Consumible'}
                  </h3>
                  <p className="text-[11px] sm:text-xs m-0" style={{ margin: '2px 0 0 0', fontSize: '12px', color: themeNuevoConsumible.headerSubtext, transition: 'color 0.3s ease' }}>
                    {isPapeleriaNuevo ? 'Registra un nuevo material institucional para el catálogo de papelería' : 'Registra la ficha técnica y existencias iniciales en el inventario'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={newConsumibleSubmitting}
                onClick={() => setModalNuevoOpen(false)}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: themeNuevoConsumible.headerText,
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.backgroundColor = 'transparent'; }}
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
                className="flex items-center justify-between gap-2 max-w-4xl mx-auto"
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
                          ? '#84CC16'
                          : isDone
                            ? 'rgba(132, 204, 22, 0.12)'
                            : 'rgba(30, 41, 59, 0.4)',
                        color: isActive
                          ? '#0f172a'
                          : isDone
                            ? '#84CC16'
                            : 'var(--text-dim, #94a3b8)',
                        border: isActive
                          ? '1px solid #84CC16'
                          : isDone
                            ? '1px solid rgba(132, 204, 22, 0.35)'
                            : '1px solid var(--line, #334155)',
                        boxShadow: isActive ? '0 2px 10px rgba(132, 204, 22, 0.3)' : 'none',
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
                              ? '#84CC16'
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
                className="p-4 sm:p-5 text-sm overflow-y-auto flex-1"
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'var(--surface, #0b1320)',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                {/* PASO 1: DATOS OPERATIVOS */}
                {pasoActualNuevo === 1 && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Identificación y Clasificación
                      </h4>
                      <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
                    </div>

                    {/* Fila 1: Nombre del Elemento (Izquierda) + Código / Placa (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Nombre Del Elemento / Material *
                        </label>
                        <input
                          required
                          type="text"
                          name="material"
                          maxLength={90}
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

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold">
                            Código Del Ítem *
                          </label>
                          <span className="text-[10px] text-lime-600 dark:text-lime-400 font-medium">
                            {isPapeleriaNuevo ? 'Formato PapeXXXX' : 'Formato RobXXXX'}
                          </span>
                        </div>
                        <input
                          required
                          type="text"
                          name="id"
                          maxLength={25}
                          readOnly={false}
                          disabled={false}
                          value={formDataNuevo.id || ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, id: e.target.value })}
                          placeholder={isPapeleriaNuevo ? "Ej. Pape2012" : "Ej. Rob0143"}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 2: Categoría (Izquierda) + Cantidad / Stock (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Categoría *
                        </label>
                        {isPapeleriaNuevo ? (
                          <input
                            type="text"
                            readOnly
                            value={formDataNuevo.categoria || 'Papelería'}
                            className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 cursor-not-allowed opacity-90"
                            style={{
                              backgroundColor: 'var(--bg, #0f172a)',
                              color: 'var(--text, #f8fafc)',
                              borderColor: 'var(--line, #334155)',
                            }}
                          />
                        ) : (
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
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Cantidad Inicial *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          max="99999"
                          name="disponible"
                          value={formDataNuevo.disponible ?? 10}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, disponible: e.target.value })}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Fila 3: Condición / Unidad * (Izquierda) + Área Asignada / Programa FMO con Badge (Derecha) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Condición / Unidad *
                        </label>
                        <select
                          required
                          name="condicion"
                          value={formDataNuevo.condicion || (isPapeleriaNuevo ? 'Nuevos' : 'Bueno')}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, condicion: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          {isPapeleriaNuevo ? (
                            <>
                              <option value="Nuevos">Nuevos</option>
                              <option value="Usados">Usados</option>
                              <option value="Mixto">Mixto</option>
                            </>
                          ) : (
                            <>
                              <option value="Nuevo">Nuevo</option>
                              <option value="Bueno">Bueno</option>
                              <option value="Regular">Regular</option>
                              <option value="Usado">Usado</option>
                              <option value="Donación">Donación</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <ProgramAreaSelect
                          label="Área Asignada / Programa FMO"
                          value={formDataNuevo.area_asignada || formDataNuevo.area || (isPapeleriaNuevo ? 'TeachLabs' : 'Robótica')}
                          defaultProgram={isPapeleriaNuevo ? 'teachlabs' : 'robotica'}
                          showPreview={false}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, area: e.target.value, area_asignada: e.target.value })}
                        />
                        <div
                          className="h-[36px] px-3 py-1 bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-between"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Distintivo en tabla:</span>
                          <ProgramAreaBadge
                            area={formDataNuevo.area_asignada || formDataNuevo.area || (isPapeleriaNuevo ? 'TeachLabs' : 'Robótica')}
                            defaultProgram={isPapeleriaNuevo ? 'teachlabs' : 'robotica'}
                            iconSize={16}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fila 4: Descripción General */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Descripción General
                      </label>
                      <textarea
                        name="descripcion"
                        rows={2}
                        maxLength={350}
                        value={formDataNuevo.descripcion || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, descripcion: e.target.value })}
                        placeholder="Descripción general del material o propósito institucional..."
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

                {/* PASO 2: ESPECIFICACIONES */}
                {pasoActualNuevo === 2 && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Ubicación y Especificaciones Técnicas
                      </h4>
                    </div>

                    {/* Fila 1: Sede / Ubicación Física | Estante / Gaveta */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Sede / Ubicación Física
                        </label>
                        <select
                          name="ubicacion"
                          value={formDataNuevo.ubicacion || formDataNuevo.sede || sedesList[0] || 'Medellín'}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, ubicacion: e.target.value, sede: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          {formDataNuevo.ubicacion && !sedesList.includes(formDataNuevo.ubicacion) && (
                            <option value={formDataNuevo.ubicacion}>{formDataNuevo.ubicacion}</option>
                          )}
                          {sedesList.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Estante / Caja / Gaveta
                        </label>
                        <input
                          type="text"
                          name="ubicacion_estante"
                          maxLength={70}
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

                    {/* Fila 2: Stock Mínimo De Alerta * | Características */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Stock Mínimo De Alerta *
                        </label>
                        <input
                          required
                          type="number"
                          min="0"
                          max="99999"
                          name="minimo"
                          value={formDataNuevo.minimo ?? (isPapeleriaNuevo ? 3 : 5)}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, minimo: e.target.value })}
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                          style={{
                            backgroundColor: 'var(--bg, #0f172a)',
                            color: 'var(--text, #f8fafc)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Características
                        </label>
                        <input
                          type="text"
                          name="caracteristicas"
                          maxLength={120}
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
                    </div>

                    {/* Fila 3: Estado | Condición */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
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

                    {/* Fila 4: Detalle Técnico / Observaciones */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Detalle Técnico / Observaciones
                      </label>
                      <textarea
                        name="descripcion_tecnica"
                        rows={2}
                        maxLength={300}
                        value={formDataNuevo.descripcion_tecnica || ''}
                        onChange={(e) => setFormDataNuevo({ ...formDataNuevo, descripcion_tecnica: e.target.value })}
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
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line, #1e293b)', paddingBottom: '6px', marginBottom: '14px' }}>
                      <h4
                        className="font-bold text-xs uppercase tracking-wider m-0"
                        style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                      >
                        Adquisición, Garantía y Notas
                      </h4>
                    </div>

                    {/* Fila 1: Valor Compra | Fecha Compra */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                          Valor Compra ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="999999999"
                          step="any"
                          name="valor_compra"
                          value={formDataNuevo.valor_compra ?? ''}
                          onChange={(e) => setFormDataNuevo({ ...formDataNuevo, valor_compra: e.target.value })}
                          placeholder="Ej. 35000"
                          className="w-full font-sans tracking-wide bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
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
                    </div>

                    {/* Fila 2: Vencimiento Garantía */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', marginBottom: '12px' }}>
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
                      <div></div>
                    </div>

                    {/* Fila 3: Notas u Observaciones */}
                    <div style={{ marginBottom: '12px' }}>
                      <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                        Notas u Observaciones
                      </label>
                      <textarea
                        name="observaciones"
                        rows={2}
                        maxLength={300}
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
                        backgroundColor: '#84CC16',
                        border: '1px solid #84CC16',
                        color: '#020617',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(132, 204, 22, 0.3)',
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
                        backgroundColor: themeNuevoConsumible.buttonBg,
                        border: 'none',
                        color: themeNuevoConsumible.buttonText,
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 2px 12px ${themeNuevoConsumible.buttonBg}44`,
                        transition: 'all 0.3s ease',
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
                              borderTopColor: themeNuevoConsumible.buttonText,
                              display: 'inline-block',
                            }}
                          />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>{isPapeleriaNuevo ? 'Guardar Insumo' : 'Guardar Consumible'}</span>
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
        <ModalRegistroEquipoTecnologico
          isOpen={modalNuevoEquipoOpen}
          onClose={() => setModalNuevoEquipoOpen(false)}
          equiposExistentes={rawEquiposUnits}
          sedes={sedesList}
          onEquipoCreated={async (nuevoEquipo) => {
            if (onAddItem) {
              await onAddItem({
                name: nuevoEquipo.nombre,
                category: nuevoEquipo.categoria,
                location: nuevoEquipo.ubicacion,
                sede: nuevoEquipo.sede,
                notes: nuevoEquipo.observaciones,
                minStock: 1,
                itemType: 'equipo',
                quantity: 0,
                unidades: [
                  {
                    code: nuevoEquipo.placa,
                    placa: nuevoEquipo.placa,
                    model: nuevoEquipo.modelo || 'Estándar',
                    serial: nuevoEquipo.serial,
                    sede: nuevoEquipo.sede,
                    status: 'disponible',
                    responsable: nuevoEquipo.responsable,
                  }
                ],
                unitsText: nuevoEquipo.placa + ', ' + (nuevoEquipo.modelo || 'Estándar') + ', ' + nuevoEquipo.serial,
              });
            }
            if (onRetry) {
              await onRetry();
            } else {
              await cargarConsumibles();
            }
          }}
        />
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

      {/* Modal Dedicado para Registro y Edición de Mobiliario y Enseres */}
      <ModalRegistroMobiliario
        isOpen={modalRegistroMobiliarioOpen}
        onClose={() => {
          setModalRegistroMobiliarioOpen(false);
          setMuebleSeleccionado(null);
        }}
        sedes={sedesList}
        muebleAEditar={muebleSeleccionado}
        onMobiliarioSaved={(muebleActualizado) => {
          if (muebleActualizado) {
            setMobiliario((prev) => {
              const existe = prev.some((m) => m.id === muebleActualizado.id || m.placa === muebleActualizado.placa);
              if (existe) {
                return prev.map((m) => (m.id === muebleActualizado.id || m.placa === muebleActualizado.placa ? { ...m, ...muebleActualizado } : m));
              }
              return [muebleActualizado, ...prev];
            });
          }
          if (typeof cargarMobiliario === 'function') {
            cargarMobiliario();
          }
          if (typeof cargarConsumibles === 'function') {
            cargarConsumibles();
          } else if (typeof onRetry === 'function') {
            onRetry();
          }
          setModalRegistroMobiliarioOpen(false);
          setMuebleSeleccionado(null);
        }}
        onMobiliarioCreated={(nuevoMobiliario) => {
          if (nuevoMobiliario) {
            setMobiliario((prev) => [nuevoMobiliario, ...prev.filter((m) => m.placa !== nuevoMobiliario.placa && m.id !== nuevoMobiliario.id)]);
          }
          if (typeof cargarMobiliario === 'function') {
            cargarMobiliario();
          }
          if (typeof cargarConsumibles === 'function') {
            cargarConsumibles();
          } else if (typeof onRetry === 'function') {
            onRetry();
          }
          setModalRegistroMobiliarioOpen(false);
          setMuebleSeleccionado(null);
        }}
      />
      {/* =========================================================================
          MODAL: REGISTRO Y EDICIÓN DE EQUIPOS DE ELECTRÓNICA & INSTRUMENTACIÓN (SIGA-FMO)
          ========================================================================= */}
      <ModalRegistroElectronica
        isOpen={modalRegistroElectronicaOpen}
        onClose={() => {
          setModalRegistroElectronicaOpen(false);
          setElectronicaSeleccionada(null);
        }}
        sedes={sedesList}
        equipoAEditar={electronicaSeleccionada}
        onEquipoSaved={(equipoActualizado) => {
          if (equipoActualizado) {
            setElectronica((prev) => {
              const existe = prev.some((e) => e.placa === equipoActualizado.placa || e.id === equipoActualizado.id);
              if (existe) {
                return prev.map((e) => (e.placa === equipoActualizado.placa || e.id === equipoActualizado.id ? { ...e, ...equipoActualizado } : e));
              }
              return [equipoActualizado, ...prev];
            });
          }
          if (typeof cargarElectronica === 'function') {
            cargarElectronica();
          }
          setModalRegistroElectronicaOpen(false);
          setElectronicaSeleccionada(null);
        }}
        onEquipoCreated={(nuevoEquipo) => {
          if (nuevoEquipo) {
            setElectronica((prev) => [nuevoEquipo, ...prev.filter((e) => e.placa !== nuevoEquipo.placa && e.id !== nuevoEquipo.id)]);
          }
          if (typeof cargarElectronica === 'function') {
            cargarElectronica();
          }
          setModalRegistroElectronicaOpen(false);
          setElectronicaSeleccionada(null);
        }}
      />
      {/* =========================================================================
          MODAL: DAR DE BAJA MATERIAL / CONSUMIBLE
          ========================================================================= */}
      <ModalBajaConsumible
        material={consumibleParaBaja}
        isOpen={Boolean(consumibleParaBaja)}
        onClose={() => setConsumibleParaBaja(null)}
        onConfirmarBaja={handleConfirmarBajaConsumible}
      />
    </div>
  );
}
