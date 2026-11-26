import ProgramBadgeIcon from '../components/common/ProgramBadgeIcon';
import FmoStarIcon from '../components/common/FmoStarIcon';
import FmoPrintLetterhead from '../components/common/FmoPrintLetterhead';
import FmoPrintFooter from '../components/common/FmoPrintFooter';
import { useState, useMemo, useEffect, useRef } from 'react';
import { fmtDate, formatearFechaSegura, EMPLOYEES, SEDES, PROYECTOS, available, isOverdue, esPrestamoVencido, today } from '../services/mockData';
import { PROYECTOS_STEAM_OFICIALES, formatProyectoLabel } from '../constants/proyectos';
import { supabase } from '../services/supabase';
import ModalQR from '../components/modals/ModalQR';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalEditarActivo from '../components/modals/ModalEditarActivo';
import ModalNuevoUsuarioRapido from '../components/modals/ModalNuevoUsuarioRapido';
import ModalNuevoProyectoSteam from '../components/modals/ModalNuevoProyectoSteam';
import ModalNuevaSede from '../components/modals/ModalNuevaSede';
import ModalConfirmarRetorno from '../components/modals/ModalConfirmarRetorno';
import ModalActaPrestamo from '../components/modals/ModalActaPrestamo';
import ModalGestionSolicitud from '../components/modals/ModalGestionSolicitud';
import EditarPrestamoModal from '../components/modals/EditarPrestamoModal';
import SearchableUserSelect from '../components/common/SearchableUserSelect';
import { Building2, FolderKanban, Plus, CheckSquare, Clock, Inbox, Eye, Laptop, Box, XCircle, Info, ShoppingCart, ExternalLink, PackagePlus, Search, FileSpreadsheet, Download, RotateCcw, X, ChevronDown, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TableLoader from '../components/common/TableLoader';
import ModuleConnectionState from '../components/common/ModuleConnectionState';
import { useToast } from '../context/ToastContext';
import inventoryApi, { API_BASE_URL } from '../services/inventoryApi';
import { formatItemOptionLabel } from '../services/prestamosCatalogService';

const renderTipoSolicitud = (solicitud) => {
  const tipo = String(solicitud.tipo_solicitud || solicitud.tipo || solicitud.tipoSolicitud || '').toUpperCase();
  const items = (Array.isArray(solicitud.items_solicitud) && solicitud.items_solicitud.length > 0)
    ? solicitud.items_solicitud
    : (Array.isArray(solicitud.items) && solicitud.items.length > 0 ? solicitud.items : []);

  // Detección exhaustiva de solicitud de compra: por tipo, por campos de ítems o por texto del motivo
  const esCompra =
    tipo === 'SUGERENCIA_COMPRA' ||
    tipo.includes('COMPRA') ||
    items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || i.tipo_item === 'compra') ||
    (solicitud.motivo && (
      solicitud.motivo.toLowerCase().includes('compra') ||
      solicitud.motivo.toLowerCase().includes('batería') ||
      solicitud.motivo.toLowerCase().includes('bateria')
    ));

  if (esCompra) {
    const categorias = [
      ...new Set(
        items
          .map((i) => (i.categoria_sugerida || i.categoria || i.categoria_destino)?.toLowerCase())
          .filter(Boolean)
      ),
    ];

    let etiqueta = 'Compra: Insumos';
    if (categorias.length === 1) {
      if (categorias[0].includes('consumible') || categorias[0].includes('robotica')) {
        etiqueta = 'Compra: Robótica / Cons.';
      } else if (categorias[0].includes('papeleria')) {
        etiqueta = 'Compra: Papelería';
      }
    } else if (categorias.length > 1) {
      etiqueta = 'Compra: Robótica y Papelería';
    } else {
      // Inferencia contextual si los ítems vinieron sin categoría explícita
      const textoItems = items.map((it) => (it.nombre_item || it.nombre_sugerido || '')).join(' ').toLowerCase();
      const textoCompleto = (textoItems + ' ' + (solicitud.motivo || '')).toLowerCase();
      if (textoCompleto.includes('bater') || textoCompleto.includes('robot') || textoCompleto.includes('lipo') || textoCompleto.includes('li-po')) {
        etiqueta = 'Compra: Robótica / Cons.';
      } else if (textoCompleto.includes('papel') || textoCompleto.includes('resma') || textoCompleto.includes('cuaderno') || textoCompleto.includes('cartulina')) {
        etiqueta = 'Compra: Papelería';
      }
    }

    if (etiqueta.includes('Papelería')) {
      return <ProgramBadgeIcon program="teachlabs" variant="badge" label={`🛒 ${etiqueta}`} />;
    }
    return <ProgramBadgeIcon program="robotica" variant="badge" label={`🛒 ${etiqueta}`} />;
  }

  if (tipo.includes('CONSUMIBLE')) {
    return <ProgramBadgeIcon program="robotica" variant="badge" label="📦 Consumibles Robótica" />;
  }

  return <ProgramBadgeIcon program="tecnologia" variant="badge" label="💻 Equipo Retornable" />;
};




export default function PrestamosView({
  items = [],
  movements = [],
  sedes: propSedes,
  onSedeCreated: propOnSedeCreated,
  onSedeUpdated: propOnSedeUpdated,
  loading = false,
  error = null,
  isRetryingOrSlow = false,
  onRetry,
  onRegisterLoan,
  onRegisterDelivery,
  onReturnLoan,
  initialSection = 'all',
  initialStatusFilter = 'todos', // 'todos' | 'Activo' | 'Vencido'
  initialSolicitudId = null,
}) {
  const { usuarios = [], crearUsuario, isAdmin, isSupervisor, isOperador } = useAuth();

  // Pestaña o bloque visible si se desea filtrar rápidamente
  const [activeSection, setActiveSection] = useState(initialSection); // 'all' | 'prestamos' | 'entregas'
  const [filterEstadoPrestamo, setFilterEstadoPrestamo] = useState(initialStatusFilter); // 'todos' | 'Activo' | 'Vencido'
  const [versionActualizaciones, setVersionActualizaciones] = useState(0);

  // Notificaciones y Modales Institucionales FMO
  const { showLoanSuccess, showDeliverySuccess, showConfirmAction, showConfirmRetorno, showEditSuccess, showError, showInfo, showSuccess } = useToast();

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setFilterEstadoPrestamo(initialStatusFilter || 'todos');
  }, [initialStatusFilter]);

  // Al salir del módulo de préstamos, limpiar el filtro y retornar al estado por defecto
  useEffect(() => {
    return () => {
      setFilterEstadoPrestamo('todos');
    };
  }, []);

  // Catálogo dinámico de Proyectos STEAM poblado desde /api/proyectos (con respaldo oficial unificado)
  const [proyectosList, setProyectosList] = useState(() => PROYECTOS_STEAM_OFICIALES);
  const [showProyectoModal, setShowProyectoModal] = useState(false);

  // Catálogo dinámico de Sedes poblado desde /api/sedes y propSedes
  const [sedesList, setSedesList] = useState(() => (Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : []));
  const [showSedeModal, setShowSedeModal] = useState(false);

  useEffect(() => {
    if (Array.isArray(propSedes) && propSedes.length > 0) {
      setSedesList(propSedes);
    }
  }, [propSedes]);

  // Estado para ModalConfirmarRetorno
  const [modalRetornoOpen, setModalRetornoOpen] = useState(false);
  const [prestamoParaRetorno, setPrestamoParaRetorno] = useState(null);
  const [cargandoRetorno, setCargandoRetorno] = useState(false);
  const [modalMotivoRechazo, setModalMotivoRechazo] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProyectos = async () => {
      try {
        const data = await inventoryApi.getProyectos();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const sorted = [...data].sort((a, b) =>
              (a.nombre || '').localeCompare(b.nombre || '', 'es')
            );
            setProyectosList(sorted);
          } else {
            setProyectosList(PROYECTOS_STEAM_OFICIALES);
          }
        }
      } catch {
        if (isMounted) {
          setProyectosList(PROYECTOS_STEAM_OFICIALES);
        }
      }
    };

    const fetchSedes = async () => {
      try {
        const data = await inventoryApi.getSedes();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const nombres = data
            .filter((s) => s.activo !== false)
            .map((s) => (typeof s === 'string' ? s : s.nombre || '').trim())
            .filter(Boolean);
          const seen = new Set();
          const unicas = [];
          for (const n of nombres) {
            const lower = n.toLowerCase();
            if (!seen.has(lower)) {
              seen.add(lower);
              unicas.push(n);
            }
          }
          setSedesList(unicas);
        }
      } catch (err) {
        console.warn('Aviso: no se pudieron cargar sedes desde API:', err.message);
      }
    };

    fetchProyectos();
    fetchSedes();

    const handleSedesChanged = (e) => {
      fetchSedes();
      if (e?.detail?.sede) {
        const s = e.detail.sede;
        const nombreNuevo = (s.nombre || s || '').trim();
        const nombreViejo = (s._prevNombre || s.nombre || '').trim();
        if (e.detail.action === 'update' && nombreViejo) {
          setSedesList((prev) => Array.from(new Set(prev.map((item) => ((item || '').trim().toLowerCase() === nombreViejo.toLowerCase() ? nombreNuevo : item)))));
        } else if (nombreNuevo) {
          setSedesList((prev) => Array.from(new Set([...prev, nombreNuevo])));
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('siga:sedes_changed', handleSedesChanged);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('siga:sedes_changed', handleSedesChanged);
      }
    };
  }, []);

  // Bandeja de Solicitudes Entrantes (Rol Administrador / Supervisor)
  const [solicitudesList, setSolicitudesList] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const [solicitudParaGestionar, setSolicitudParaGestionar] = useState(null);
  const [modalGestionOpen, setModalGestionOpen] = useState(false);
  const [solicitudesPerPage, setSolicitudesPerPage] = useState(5);
  const SOLICITUDES_PER_PAGE = solicitudesPerPage;

  const fetchSolicitudes = async () => {
    try {
      setSolicitudesLoading(true);
      let dataFinal = [];

      // Consulta directa a Supabase garantizando inclusión inmediata de solicitudes_compra
      try {
        if (supabase) {
          let invList = [];
          let compList = [];

          try {
            const { data: invData, error: invErr } = await supabase
              .from('solicitudes_inventario')
              .select(`
                *,
                items_solicitud (
                  id,
                  cantidad,
                  item_id,
                  nombre_sugerido,
                  categoria_sugerida,
                  url_compra,
                  precio_estimado,
                  ingresado_inventario
                )
              `)
              .order('creado_en', { ascending: false });

            if (!invErr && Array.isArray(invData)) {
              invList = invData.map((s) => ({
                ...s,
                items: s.items_solicitud || [],
                tipo: s.tipo_solicitud || 'PRESTAMO_EQUIPO',
              }));
            }
          } catch (_) {}

          try {
            const { data: cData, error: cErr } = await supabase
              .from('solicitudes_compra')
              .select('*')
              .order('creado_en', { ascending: false });

            if (!cErr && Array.isArray(cData)) {
              compList = cData.map((sc) => {
                const catDestino = String(sc.categoria_destino || 'consumibles').toLowerCase();
                const singleItem = {
                  id: sc.id,
                  solicitud_id: sc.id,
                  tipo_item: 'compra',
                  item_id: sc.item_inventario_id || null,
                  nombre_item: sc.nombre_producto || 'Producto sugerido',
                  nombre_sugerido: sc.nombre_producto || 'Producto sugerido',
                  categoria_sugerida: catDestino,
                  categoria_destino: catDestino,
                  url_compra: sc.url_compra || null,
                  precio_estimado: Number(sc.precio_estimado) || 0,
                  cantidad: Number(sc.cantidad) || 1,
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                };

                return {
                  id: sc.id,
                  usuario_id: sc.usuario_id,
                  usuario_nombre: sc.usuario_nombre,
                  sede: sc.sede || 'Medellín',
                  tipo: 'SUGERENCIA_COMPRA',
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  tipoSolicitud: 'SUGERENCIA_COMPRA',
                  categoria_destino: catDestino,
                  fecha_requerida: sc.fecha_requerida,
                  fecha_devolucion_estimada: sc.fecha_requerida,
                  motivo: sc.justificacion || 'Sugerencia de compra',
                  justificacion: sc.justificacion || 'Sugerencia de compra',
                  estado: sc.estado || 'PENDIENTE',
                  prioridad: sc.prioridad || 'Media',
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                  item_inventario_id: sc.item_inventario_id || null,
                  observaciones_admin: sc.observaciones_admin || null,
                  creado_en: sc.creado_en,
                  created_at: sc.creado_en,
                  fecha_radicado: sc.creado_en ? String(sc.creado_en).slice(0, 10) : '',
                  is_solicitud_compra: true,
                  items: [singleItem],
                  items_solicitud: [singleItem],
                };
              });
            }
          } catch (_) {}

          dataFinal = [...invList, ...compList].sort(
            (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
          );
        }
      } catch (errSup) {
        console.warn('Aviso consulta directa Supabase en PrestamosView:', errSup);
      }

      if (dataFinal.length === 0) {
        const apiData = await inventoryApi.getSolicitudes();
        if (Array.isArray(apiData) && apiData.length > 0) {
          dataFinal = apiData;
        }
      }

      setSolicitudesList(dataFinal);
    } catch (err) {
      console.warn('Aviso: no se pudieron cargar solicitudes:', err.message);
      setSolicitudesList([]);
    } finally {
      setSolicitudesLoading(false);
    }
  };

  // Sincronizar sección y solicitud desde URL o props (?tab=compras&solicitudId=...)
  useEffect(() => {
    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const tabParam = searchParams ? searchParams.get('tab') : null;
      const solIdParam = (searchParams ? searchParams.get('solicitudId') : null) || initialSolicitudId;

      if (tabParam === 'compras' || initialSection === 'compras') {
        setActiveSection('solicitudes');
      } else if (tabParam === 'entrantes' || tabParam === 'solicitudes' || initialSection === 'solicitudes') {
        setActiveSection('solicitudes');
      }

      if (solIdParam && Array.isArray(solicitudesList) && solicitudesList.length > 0) {
        const found = solicitudesList.find((s) => String(s.id) === String(solIdParam));
        if (found) {
          setSolicitudParaGestionar(found);
          setModalGestionOpen(true);
          // Limpiar query param para evitar reaperturas accidentales al recargar
          if (typeof window !== 'undefined' && window.history && window.location) {
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('solicitudId');
            window.history.replaceState({}, '', cleanUrl);
          }
        }
      }
    } catch (e) {
      console.warn('Error leyendo parámetros de navegación de solicitudes:', e);
    }
  }, [initialSection, initialSolicitudId, solicitudesList]);

  useEffect(() => {
    fetchSolicitudes();

    // Suscripción Realtime a cambios en solicitudes (para reflejar inserciones, aprobaciones y rechazos en vivo)
    let canal = null;
    try {
      if (supabase) {
        canal = supabase
          .channel('cambios-solicitudes-admin')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes' },
            (payload) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                setSolicitudesList((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]);
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                setSolicitudesList((prev) =>
                  prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
                );
              } else if (payload.eventType === 'DELETE' && payload.old) {
                setSolicitudesList((prev) => prev.filter((s) => s.id !== payload.old.id));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes_inventario' },
            (payload) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                setSolicitudesList((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]);
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                setSolicitudesList((prev) =>
                  prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
                );
              } else if (payload.eventType === 'DELETE' && payload.old) {
                setSolicitudesList((prev) => prev.filter((s) => s.id !== payload.old.id));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes_compra' },
            (payload) => {
              fetchSolicitudes();
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime solicitudes admin aviso:', e);
    }

    // Listener local de eventos reactivos del cliente
    const handleLocalSol = () => fetchSolicitudes();
    window.addEventListener('siga:solicitud_creada', handleLocalSol);
    window.addEventListener('siga:solicitud_resuelta', handleLocalSol);

    return () => {
      if (canal && supabase) supabase.removeChannel(canal);
      window.removeEventListener('siga:solicitud_creada', handleLocalSol);
      window.removeEventListener('siga:solicitud_resuelta', handleLocalSol);
    };
  }, []);

  // Helper para identificar sugerencias de compra de forma estricta
  const esSolicitudCompra = (s) => {
    if (!s) return false;
    const tipo = String(s.tipo_solicitud || s.tipo || s.tipoSolicitud || '').toUpperCase().trim();
    const items = Array.isArray(s.items_solicitud) && s.items_solicitud.length > 0
      ? s.items_solicitud
      : (Array.isArray(s.items) && s.items.length > 0 ? s.items : []);
    return (
      tipo === 'SUGERENCIA_COMPRA' ||
      tipo === 'COMPRA' ||
      tipo.includes('COMPRA') ||
      items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || String(i.tipo_item || '').toLowerCase() === 'compra') ||
      (s.motivo && (
        s.motivo.toLowerCase().includes('compra') ||
        s.motivo.toLowerCase().includes('batería') ||
        s.motivo.toLowerCase().includes('bateria') ||
        s.motivo.toLowerCase().includes('lipo')
      ))
    );
  };

  // Separación estricta entre préstamos/consumibles estándar y compras/adquisiciones
  const solicitudesEstandar = useMemo(() => {
    return solicitudesList.filter((s) => !esSolicitudCompra(s));
  }, [solicitudesList]);

  const solicitudesCompras = useMemo(() => {
    return solicitudesList.filter((s) => esSolicitudCompra(s));
  }, [solicitudesList]);

  // Conteo de solicitudes pendientes estándar
  const solicitudesPendientesCount = useMemo(() => {
    return solicitudesEstandar.filter((s) => String(s.estado || 'PENDIENTE').toUpperCase() === 'PENDIENTE').length;
  }, [solicitudesEstandar]);

  // Modales
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [targetModalForUser, setTargetModalForUser] = useState('loan'); // 'loan' | 'delivery'

  // Estados formulario de Préstamos (Solo Equipos Tecnológicos Retornables)
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [loanPerson, setLoanPerson] = useState('');
  const [loanPersonDocumento, setLoanPersonDocumento] = useState('');
  const [loanPersonEmail, setLoanPersonEmail] = useState('');
  const [loanSede, setLoanSede] = useState('Medellín');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanProyecto, setLoanProyecto] = useState('');
  const [loanMotive, setLoanMotive] = useState('');

  // Estados formulario de Entregas (Insumos y Consumibles No Retornables - Canasta Múltiple)
  const [itemsEntrega, setItemsEntrega] = useState([]); // [{ id, material, cantidadEntrega, disponible, unit }]
  const [consumibleSeleccionadoId, setConsumibleSeleccionadoId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliveryPersonDocumento, setDeliveryPersonDocumento] = useState('');
  const [deliveryPersonEmail, setDeliveryPersonEmail] = useState('');
  const [deliverySede, setDeliverySede] = useState('Medellín');
  const [deliveryProyecto, setDeliveryProyecto] = useState('');
  const [deliveryMotive, setDeliveryMotive] = useState('');
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  // Filtrados de movimientos
  const rawActiveLoans = useMemo(
    () =>
      movements.filter((m) => {
        const isPrestamo = (m.type || '').toLowerCase() === 'prestamo';
        const isActivo =
          (m.status || '').toLowerCase() === 'activo' ||
          (m.estado || '').toLowerCase() === 'activo';
        const isNotReturned =
          !m.returnedDate &&
          !m.fecha_devolucion_real &&
          (m.estado || '').toLowerCase() !== 'devuelto';
        return isPrestamo && isActivo && isNotReturned;
      }),
    [movements, versionActualizaciones]
  );

  const vencidosCount = useMemo(() => rawActiveLoans.filter(isOverdue).length, [rawActiveLoans]);
  const alDiaCount = useMemo(() => rawActiveLoans.filter((m) => !isOverdue(m)).length, [rawActiveLoans]);

  const activeLoans = useMemo(() => {
    if (filterEstadoPrestamo === 'Vencido') {
      return rawActiveLoans.filter(isOverdue);
    }
    if (filterEstadoPrestamo === 'Activo') {
      return rawActiveLoans.filter((m) => !isOverdue(m));
    }
    return rawActiveLoans;
  }, [rawActiveLoans, filterEstadoPrestamo]);

  const recentDeliveries = movements.filter((m) => m.type === 'entrega');

  // Listados de items disponibles (Equipos Tecnológicos y Equipos de Electrónica Retornables)
  const equipos = items.filter((it) => it.itemType === 'equipo' || it.itemType === 'electronica');
  const consumibles = items.filter((it) => it.itemType === 'consumible');

  // Equipo seleccionado para el formulario
  const currentEquipo = items.find((it) => it.id === selectedEquipoId);
  const availableUnits = currentEquipo ? (currentEquipo.units || []).filter((u) => u.status === 'disponible') : [];

  // Toggle de selección de unidades en checkboxes
  const handleToggleUnit = (code) => {
    setSelectedUnits((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Manejador del Préstamo (Solo Equipos Tecnológicos Retornables)
  const handleSubmitLoan = async (e) => {
    e.preventDefault();

    if (!selectedEquipoId) {
      showError('Validación', 'Por favor selecciona un equipo tecnológico.');
      return;
    }
    if (selectedUnits.length === 0) {
      showError('Validación', 'Debes seleccionar al menos una unidad o placa para realizar el préstamo.');
      return;
    }

    if (!loanPerson) {
      showError('Validación', 'Debes especificar el responsable o formador custodio.');
      return;
    }
    const fechaEsperadaNormalizada =
      loanExpectedDate && String(loanExpectedDate).trim() !== ''
        ? String(loanExpectedDate).trim()
        : null;

    // Validación de fecha no pasada (solo si se ingresó fecha)
    if (fechaEsperadaNormalizada && fechaEsperadaNormalizada < today()) {
      showError('Fecha Inválida', 'La fecha de devolución no puede ser anterior a la fecha de hoy.');
      return;
    }

    try {
      if (onRegisterLoan) {
        await onRegisterLoan({
          tipo_item: 'activo',
          itemId: selectedEquipoId,
          person: loanPerson,
          solicitante: loanPerson,
          solicitante_documento: loanPersonDocumento,
          email: loanPersonEmail,
          sede: loanSede,
          proyecto: loanProyecto,
          expectedReturn: fechaEsperadaNormalizada,
          motive: loanMotive || 'Préstamo para formación y actividades de sede',
          unitCodes: selectedUnits,
        });
      }

      if (onRetry) {
        await onRetry();
      }

      // Copiar valores para la notificación y generación de acta
      const equipoObj = items.find((it) => it.id === selectedEquipoId);
      const targetPlacas = [...selectedUnits];
      const targetCustodio = loanPerson;
      const targetDoc = loanPersonDocumento;
      const targetEmail = loanPersonEmail;
      const targetSede = loanSede;
      const targetProyecto = loanProyecto;
      const targetFecha = loanExpectedDate;
      const targetMotivo = loanMotive;

      // Reset
      setShowLoanModal(false);
      setSelectedEquipoId('');
      setSelectedUnits([]);
      setLoanPerson('');
      setLoanPersonDocumento('');
      setLoanPersonEmail('');
      setLoanProyecto('');
      setLoanExpectedDate('');
      setLoanMotive('');

      // Notificación institucional FMO STEAM para Préstamo Retornable
      showLoanSuccess({
        codigo: targetPlacas.join(', '),
        custodio: targetCustodio,
        fechaDevolucion: targetFecha,
      });

      // Generar y abrir de inmediato la Guía / Acta de Préstamo oficial imprimible
      setPrestamoParaActa({
        id: 'prest-' + Date.now(),
        codigo_acta: `PREST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        itemName: equipoObj?.name || 'Equipo Tecnológico Retornable',
        itemId: selectedEquipoId,
        unitCodes: targetPlacas,
        person: targetCustodio,
        solicitante: targetCustodio,
        solicitante_documento: targetDoc,
        email: targetEmail,
        sede: targetSede,
        proyecto: targetProyecto,
        expectedReturn: targetFecha,
        date: today(),
        motive: targetMotivo || 'Préstamo para formación y actividades de sede',
      });
    } catch (err) {
      console.error('Error al registrar préstamo:', err);
      showError('Error al registrar préstamo', err.message || 'Error del servidor');
    }
  };

  // Consumible seleccionado temporalmente para agregar a la canasta
  const consumibleSeleccionado = items.find((it) => it.id === consumibleSeleccionadoId);
  const maxAvailableConsumible = consumibleSeleccionado ? (consumibleSeleccionado.quantity ?? consumibleSeleccionado.disponible ?? 0) : 0;

  // Ya agregado a la canasta
  const cantidadYaEnCanasta = useMemo(() => {
    if (!consumibleSeleccionadoId) return 0;
    const encontrado = itemsEntrega.find((it) => it.id === consumibleSeleccionadoId);
    return encontrado ? encontrado.cantidadEntrega : 0;
  }, [itemsEntrega, consumibleSeleccionadoId]);

  const maxAgregable = Math.max(0, maxAvailableConsumible - cantidadYaEnCanasta);

  // Agregar insumo a la canasta
  const handleAgregarItemEntrega = () => {
    if (!consumibleSeleccionado) {
      showError('Validación', 'Por favor selecciona un material o insumo consumible.');
      return;
    }
    const cant = Number(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      showError('Cantidad Inválida', 'La cantidad a entregar debe ser mayor a 0.');
      return;
    }
    if (cant > maxAgregable) {
      showError('Stock Insuficiente', `Solo hay ${maxAgregable} unidades disponibles adicionales para agregar a la lista (Stock total: ${maxAvailableConsumible}).`);
      return;
    }

    setItemsEntrega((prev) => {
      const idx = prev.findIndex((it) => it.id === consumibleSeleccionado.id);
      if (idx >= 0) {
        const actualizados = [...prev];
        actualizados[idx] = {
          ...actualizados[idx],
          cantidadEntrega: actualizados[idx].cantidadEntrega + cant,
        };
        return actualizados;
      }
      return [
        ...prev,
        {
          id: consumibleSeleccionado.id,
          material: consumibleSeleccionado.material || consumibleSeleccionado.name,
          disponible: maxAvailableConsumible,
          unit: consumibleSeleccionado.unit || 'und',
          cantidadEntrega: cant,
        },
      ];
    });

    // Resetear selector temporal
    setConsumibleSeleccionadoId('');
    setCantidadInput(1);
  };

  // Eliminar insumo de la canasta
  const handleEliminarItemEntrega = (id) => {
    setItemsEntrega((prev) => prev.filter((it) => it.id !== id));
  };

  // Manejador de la Entrega Múltiple de Consumibles
  const handleSubmitDelivery = async (e) => {
    e.preventDefault();

    if (!deliveryPerson) {
      showError('Validación', 'Selecciona a la persona responsable que recibe el material.');
      return;
    }
    if (!deliverySede) {
      showError('Validación', 'Selecciona la sede o municipio de destino.');
      return;
    }
    if (itemsEntrega.length === 0) {
      showError('Validación', 'Debes agregar al menos 1 material o insumo a la lista de entrega.');
      return;
    }

    const motivoFinal = [deliveryProyecto, deliveryMotive].filter(Boolean).join(' - ') || 'Salida de material para taller / semillero';

    try {
      setDeliverySubmitting(true);
      if (onRegisterDelivery) {
        await onRegisterDelivery({
          person: deliveryPerson,
          responsable_recibe: deliveryPerson,
          responsable_documento: deliveryPersonDocumento,
          email: deliveryPersonEmail,
          sede: deliverySede,
          proyecto: deliveryProyecto,
          motivo: deliveryMotive,
          motive: motivoFinal,
          items: itemsEntrega.map((it) => ({
            material_id: it.id,
            id: it.id,
            nombre: it.material,
            material: it.material,
            cantidad: Number(it.cantidadEntrega),
            cantidadEntrega: Number(it.cantidadEntrega),
          })),
        });
      }

      if (onRetry) {
        await onRetry();
      }

      const totalItemsDespachados = itemsEntrega.length;
      const actaId = `ACTA-${Date.now().toString().slice(-4)}`;

      // Reset
      setShowDeliveryModal(false);
      setItemsEntrega([]);
      setConsumibleSeleccionadoId('');
      setCantidadInput(1);
      setDeliveryPerson('');
      setDeliveryPersonDocumento('');
      setDeliveryPersonEmail('');
      setDeliveryProyecto('');
      setDeliveryMotive('');

      // Notificación institucional FMO STEAM para Despacho de Consumibles
      showDeliverySuccess({
        totalConsumibles: totalItemsDespachados,
        codigoRemision: actaId,
      });
    } catch (err) {
      console.error('Error al registrar entrega de consumibles:', err);
      showError('Error al registrar entrega', err.message || 'Error inesperado');
    } finally {
      setDeliverySubmitting(false);
    }
  };

  // Paginación para préstamos activos
  const [currentLoanPage, setCurrentLoanPage] = useState(1);
  const [loansPerPage, setLoansPerPage] = useState(5);
  const LOANS_PER_PAGE = loansPerPage;
  const totalLoanPages = Math.max(1, Math.ceil(activeLoans.length / LOANS_PER_PAGE));
  const paginatedLoans = activeLoans.slice(
    (currentLoanPage - 1) * LOANS_PER_PAGE,
    currentLoanPage * LOANS_PER_PAGE
  );

  // Resetear a la página 1 cuando cambia el filtro de estado o la sección
  useEffect(() => {
    setCurrentLoanPage(1);
  }, [filterEstadoPrestamo, activeSection]);

  // Modales de acciones para préstamos
  const [detailLoan, setDetailLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [qrLoanItem, setQrLoanItem] = useState(null);
  const [remisionParaImprimir, setRemisionParaImprimir] = useState(null);
  const [prestamoParaActa, setPrestamoParaActa] = useState(null);

  // Estados para Modal de Detalle / Ficha Técnica (Reutilizable universal)
  const [activoDetalleSeleccionado, setActivoDetalleSeleccionado] = useState(null);
  const [detalleFetchPlaca, setDetalleFetchPlaca] = useState(null);
  const [detalleHeaderPreview, setDetalleHeaderPreview] = useState(null);
  const [detalleFallbackContext, setDetalleFallbackContext] = useState(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);

  // Estados para Modal de Edición de Equipo
  const [equipoParaEditar, setEquipoParaEditar] = useState(null);
  const [modalEditarEquipoOpen, setModalEditarEquipoOpen] = useState(false);
  const [pasoActualEditarEquipo, setPasoActualEditarEquipo] = useState(1);
  const [editEquipoSubmitting, setEditEquipoSubmitting] = useState(false);
  const [formDataEditarEquipo, setFormDataEditarEquipo] = useState({});

  // Lógica de apertura y carga de datos completos para el modal de detalle
  const abrirModalDetalle = (placaIdentificador, fallbackMovimiento = null) => {
    if (!placaIdentificador && !fallbackMovimiento) return;
    const searchPlaca = String(placaIdentificador || fallbackMovimiento?.itemId || fallbackMovimiento?.placa || '').replace(/^eq-/, '').trim();
    if (!searchPlaca) return;

    setActivoDetalleSeleccionado(null);
    setDetalleFetchPlaca(searchPlaca);
    setDetalleHeaderPreview({
      placa: searchPlaca,
      nombre: fallbackMovimiento?.itemName || `Equipo ${searchPlaca}`,
      isEquipo: true,
    });
    setDetalleFallbackContext(fallbackMovimiento || null);
    setMostrarModalDetalle(true);
  };

  // Abrir modal de edición desde el detalle o directamente
  const handleAbrirEditarEquipo = async (equipo) => {
    if (!equipo) return;
    setPasoActualEditarEquipo(1);
    const idOPlaca = String(equipo.placa || equipo.codigo || equipo.id || '').replace(/^eq-/, '').trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/activos/${encodeURIComponent(idOPlaca)}`);
      const data = await res.json().catch(() => null);
      const equipoFresco = (data && data.data) ? data.data : (data || equipo);

      setFormDataEditarEquipo({
        ...equipoFresco,
        placa: equipoFresco.placa || equipoFresco.codigo || idOPlaca || '',
        nombre: equipoFresco.nombre || equipoFresco.equipo || equipoFresco.material || equipoFresco.name || '',
        categoria: equipoFresco.categoria || equipoFresco.category || 'Portátiles',
        condicion: equipoFresco.condicion || equipoFresco.estado_fisico || equipoFresco.estado || 'Bueno',
        area: equipoFresco.area || 'Tecnología',
        ubicacion: equipoFresco.ubicacion || equipoFresco.sede || 'Oficina Medellín',
        ubicacion_estante: equipoFresco.ubicacion_estante || '',
        descripcion: (equipoFresco.descripcion && equipoFresco.descripcion !== 'Sin descripción general registrada.') ? equipoFresco.descripcion : '',
        marca: equipoFresco.marca || '',
        modelo: equipoFresco.modelo || equipoFresco.model || '',
        serial: equipoFresco.serial || '',
        caracteristica_1: equipoFresco.caracteristica_1 || '',
        caracteristica_2: equipoFresco.caracteristica_2 || '',
        caracteristica_3: equipoFresco.caracteristica_3 || '',
        responsable: equipoFresco.responsable || equipoFresco.custodio || 'Bodega Central',
        proveedor: equipoFresco.proveedor || '',
        valor_compra: equipoFresco.valor_compra !== '' && equipoFresco.valor_compra != null ? equipoFresco.valor_compra : '',
        fecha_compra: equipoFresco.fecha_compra ? equipoFresco.fecha_compra.split('T')[0] : '',
        fecha_vencimiento_garantia: equipoFresco.fecha_vencimiento_garantia ? equipoFresco.fecha_vencimiento_garantia.split('T')[0] : '',
        claves_otros: equipoFresco.claves_otros || '',
        observaciones: equipoFresco.observaciones || equipoFresco.notas || '',
      });

      setEquipoParaEditar(equipoFresco);
      setModalEditarEquipoOpen(true);
    } catch (_) {
      setFormDataEditarEquipo({
        ...equipo,
        placa: idOPlaca,
        nombre: equipo.nombre || equipo.equipo || equipo.name || '',
      });
      setEquipoParaEditar(equipo);
      setModalEditarEquipoOpen(true);
    }
  };

  const handleSubmitEditarEquipo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!equipoParaEditar) return;

    try {
      setEditEquipoSubmitting(true);
      const placaTarget = formDataEditarEquipo.placa || equipoParaEditar.placa;
      await inventoryApi.updateActivo(placaTarget, {
        nombre: formDataEditarEquipo.nombre?.trim(),
        marca: formDataEditarEquipo.marca?.trim(),
        modelo: formDataEditarEquipo.modelo?.trim(),
        serial: formDataEditarEquipo.serial?.trim(),
        categoria: formDataEditarEquipo.categoria,
        condicion: formDataEditarEquipo.condicion,
        area: formDataEditarEquipo.area?.trim(),
        ubicacion: formDataEditarEquipo.ubicacion?.trim(),
        ubicacion_estante: formDataEditarEquipo.ubicacion_estante?.trim(),
        descripcion: formDataEditarEquipo.descripcion?.trim(),
        caracteristica_1: formDataEditarEquipo.caracteristica_1?.trim(),
        caracteristica_2: formDataEditarEquipo.caracteristica_2?.trim(),
        caracteristica_3: formDataEditarEquipo.caracteristica_3?.trim(),
        responsable: formDataEditarEquipo.responsable?.trim(),
        proveedor: formDataEditarEquipo.proveedor?.trim(),
        valor_compra: formDataEditarEquipo.valor_compra !== '' ? formDataEditarEquipo.valor_compra : null,
        fecha_compra: formDataEditarEquipo.fecha_compra || null,
        fecha_vencimiento_garantia: formDataEditarEquipo.fecha_vencimiento_garantia || null,
        claves_otros: formDataEditarEquipo.claves_otros || null,
        observaciones: formDataEditarEquipo.observaciones || null,
      });

      if (onRetry) await onRetry();
      setModalEditarEquipoOpen(false);
      setEquipoParaEditar(null);
      showEditSuccess(formDataEditarEquipo.nombre || formDataEditarEquipo.placa);
    } catch (err) {
      showError('Error al actualizar', err.message || 'Error del servidor');
    } finally {
      setEditEquipoSubmitting(false);
    }
  };

  const handleOpenEditLoan = (loan) => {
    setEditingLoan(loan);
  };

  const handleActualizarPrestamo = async (prestamoId, data) => {
    const loanObj = movements.find((m) => m.id === prestamoId) || editingLoan;

    // Extraer la clave primaria real del registro en la tabla 'prestamos'
    // Se previene el uso de IDs sintéticos de historial (ej. 500275)
    let rawDbId =
      loanObj?.prestamoId ||
      loanObj?.prestamo_id ||
      loanObj?.uuid ||
      (loanObj?.dbId && Number(loanObj.dbId) < 500000 ? loanObj.dbId : null) ||
      (String(prestamoId).startsWith('mov-db-') ? String(prestamoId).replace('mov-db-', '') : null) ||
      (loanObj?.id && String(loanObj.id).startsWith('mov-db-') ? String(loanObj.id).replace('mov-db-', '') : null);

    // Si aún tiene id sintético de historial (>= 500000), buscar en la lista de movimientos el préstamo real por placa
    if (!rawDbId || Number(rawDbId) >= 500000) {
      const placa = loanObj?.unitCodes?.[0] || loanObj?.itemId || loanObj?.placa;
      const prestamoReal = movements.find(
        (m) => (m.type || '').toLowerCase() === 'prestamo' &&
               String(m.id).startsWith('mov-db-') &&
               (m.unitCodes?.[0] === placa || m.itemId === placa)
      );
      if (prestamoReal) {
        rawDbId = prestamoReal.dbId || String(prestamoReal.id).replace('mov-db-', '');
      }
    }

    const targetDbId = rawDbId || prestamoId;

    const fechaNormalizada =
      data.fecha_devolucion_esperada && String(data.fecha_devolucion_esperada).trim() !== ''
        ? String(data.fecha_devolucion_esperada).trim()
        : null;

    // 1. Intentar actualizar directamente en Supabase si está disponible
    // Se envía ÚNICAMENTE las columnas existentes en la tabla 'prestamos' (fecha_devolucion_esperada, motivo, sede)
    // NO se envía 'proyecto' ni 'proyecto_steam' para evitar el error PGRST204
    try {
      if (supabase && targetDbId && !isNaN(Number(targetDbId)) && Number(targetDbId) < 500000) {
        const updateFields = {
          fecha_devolucion_esperada: fechaNormalizada,
        };
        // En la base de datos la columna es 'motivo'
        if (data.observaciones !== undefined) {
          updateFields.motivo = data.observaciones;
        } else if (data.motivo !== undefined) {
          updateFields.motivo = data.motivo;
        }
        if (data.sede) {
          updateFields.sede = data.sede;
        }

        const { error: sbError } = await supabase
          .from('prestamos')
          .update(updateFields)
          .eq('id', Number(targetDbId));

        if (sbError) {
          console.error('Error de Supabase al actualizar préstamo:', sbError);
          throw sbError;
        }
      }
    } catch (sbErr) {
      console.warn('Actualización directa Supabase prestamo:', sbErr.message || sbErr);
      // Si el error no es de red ni fatal, permitir que inventoryApi intente como fallback
    }

    // 2. Actualizar vía inventoryApi (backend REST o fallback estructurado)
    try {
      if (inventoryApi.updatePrestamo && targetDbId && Number(targetDbId) < 500000) {
        await inventoryApi.updatePrestamo(targetDbId, {
          fecha_devolucion_esperada: fechaNormalizada,
          observaciones: data.observaciones,
          motivo: data.motivo || data.observaciones,
          sede: data.sede,
        });
      }
    } catch (apiErr) {
      console.warn('Actualización API prestamo:', apiErr.message || apiErr);
    }

    // 3. Actualizar fecha de devolución del activo asociado si aplica
    try {
      const placa = loanObj?.unitCodes?.[0] || loanObj?.itemId || loanObj?.placa;
      if (placa && inventoryApi.updateActivo) {
        await inventoryApi.updateActivo(placa, {
          fecha_devolucion: fechaNormalizada,
          ...(data.sede ? { sede: data.sede } : {}),
        });
      }
    } catch (_) { }

    // 4. Actualizar el objeto reactivo en memoria
    if (loanObj) {
      loanObj.expectedReturn = fechaNormalizada;
      loanObj.fecha_devolucion_esperada = fechaNormalizada;
      loanObj.fecha_entrega = fechaNormalizada;
      loanObj.fecha_limite = fechaNormalizada;
      if (data.observaciones !== undefined) {
        loanObj.motive = data.observaciones;
        loanObj.motivo = data.observaciones;
      }
      if (data.sede) {
        loanObj.destination = data.sede;
        loanObj.sede = data.sede;
      }
      if (data.proyecto_steam) {
        loanObj.project = data.proyecto_steam;
        loanObj.proyecto = data.proyecto_steam;
      }
      if (data.custodio_id) {
        loanObj.custodian = data.custodio_id;
        loanObj.responsable = data.custodio_id;
      }
    }

    setVersionActualizaciones((v) => v + 1);
    showSuccess('Préstamo actualizado', 'Se guardaron los cambios del préstamo exitosamente.');
    if (onRetry) await onRetry();
  };

  // Formateador compacto DD/MM/YYYY
  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    // Si viene en formato YYYY-MM-DD
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      const parts = fechaStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="prestamos-view">
      {/* BARRA SUPERIOR DE ACCIONES OPERATIVAS */}
      <div className="inventory-topbar">
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('all');
              setFilterEstadoPrestamo('todos');
            }}
          >
            <span>Ver Todos</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeSection === 'prestamos' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('prestamos');
              setFilterEstadoPrestamo('todos');
            }}
          >
            <span>🔄 Préstamos Activos</span>
            <span className="tab-badge">{activeLoans.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeSection === 'entregas' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('entregas');
              setFilterEstadoPrestamo('todos');
            }}
          >
            <span>📦 Entregas Realizadas</span>
            <span className="tab-badge">{recentDeliveries.length}</span>
          </button>
          {(isAdmin || isSupervisor) && (
            <button
              type="button"
              className={`tab-btn ${activeSection === 'solicitudes' ? 'active bg-[#abd037] text-[#013a52] font-bold shadow-sm' : ''}`}
              onClick={() => {
                setActiveSection('solicitudes');
                setFilterEstadoPrestamo('todos');
              }}
              style={
                activeSection === 'solicitudes'
                  ? { backgroundColor: '#abd037', color: '#013a52', fontWeight: 700 }
                  : solicitudesPendientesCount > 0
                    ? { borderBottom: '2px solid #abd037' }
                    : {}
              }
            >
              <span>📥 Solicitudes Entrantes</span>
              {solicitudesPendientesCount > 0 ? (
                <span
                  className={`tab-badge ${activeSection === 'solicitudes' ? 'bg-[#013a52] text-white font-bold px-2.5 py-0.5 rounded-full text-xs' : 'bg-[#abd037] text-[#013a52] font-bold'}`}
                  style={{
                    background: activeSection === 'solicitudes' ? '#013a52' : '#abd037',
                    color: activeSection === 'solicitudes' ? '#ffffff' : '#013a52',
                    fontWeight: 800,
                  }}
                  title={`${solicitudesPendientesCount} solicitudes estándar pendientes por gestionar`}
                >
                  {solicitudesPendientesCount} nuevas
                </span>
              ) : (
                <span
                  className={`tab-badge ${activeSection === 'solicitudes' ? 'bg-[#013a52] text-white font-bold px-2.5 py-0.5 rounded-full text-xs' : ''}`}
                  style={activeSection === 'solicitudes' ? { background: '#013a52', color: '#ffffff', fontWeight: 700 } : {}}
                >
                  {solicitudesEstandar.length}
                </span>
              )}
            </button>
          )}

        </div>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón + Nueva Sede: visible para Administradores y Supervisores (#2CACD0) */}
          {(isAdmin || isSupervisor) && (
            <button
              type="button"
              className="btn-topbar-action btn-topbar-sede"
              onClick={() => setShowSedeModal(true)}
              title="Registrar nueva sede o municipio de operación FMO"
            >
              <Building2 size={15} style={{ color: '#2CACD0' }} />
              <span>+ Nueva Sede</span>
            </button>
          )}

          {!isSupervisor && (
            <>
              {/* Botón + Proyecto STEAM (#7b2cbf) */}
              <button
                type="button"
                className="btn-topbar-action btn-topbar-steam"
                onClick={() => setShowProyectoModal(true)}
                title="Registrar nuevo Proyecto STEAM"
              >
                <FolderKanban size={15} style={{ color: '#7b2cbf' }} />
                <span>+ Proyecto STEAM</span>
              </button>

              {/* Botón + Nuevo préstamo (#abd037) - Acción Principal */}
              <button
                type="button"
                className="btn-topbar-action btn-topbar-loan"
                onClick={() => setShowLoanModal(true)}
                title="Registrar nuevo préstamo de equipo (retornable)"
              >
                <Plus size={16} strokeWidth={2.5} style={{ color: '#013a52' }} />
                <span>+ Nuevo préstamo</span>
              </button>

              {/* Botón + Entregar Consumibles (#013a52 con icono verde) */}
              <button
                type="button"
                className="btn-topbar-action btn-topbar-delivery"
                onClick={() => setShowDeliveryModal(true)}
                title="Registrar entrega o consumo de insumos y consumibles"
              >
                <PackagePlus size={15} style={{ color: '#abd037' }} />
                <span>+ Entregar Consumibles</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          BLOQUE 1: PRÉSTAMO DE EQUIPOS (RETORNABLES)
          ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'prestamos') && (
        <section>
          <div
            className="section-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Préstamos de Equipos en Campo (Retornables)</span>
                <span className="pill prestado" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {rawActiveLoans.length} total en campo
                </span>
              </h2>
              <span className="section-subtitle">
                Equipos de cómputo, tablets y proyectores asignados temporalmente a custodios en municipios
              </span>
            </div>

            {/* 2 BOTONES PARA VER PRÉSTAMOS ACTIVOS Y VENCIDOS */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`tab-btn ${filterEstadoPrestamo === 'Activo' ? 'active' : ''}`}
                onClick={() => setFilterEstadoPrestamo(filterEstadoPrestamo === 'Activo' ? 'todos' : 'Activo')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterEstadoPrestamo === 'Activo' ? '2px solid #84CC16' : '1px solid var(--line)',
                  background: filterEstadoPrestamo === 'Activo' ? 'rgba(132, 204, 22, 0.16)' : 'var(--surface-1)',
                  color: filterEstadoPrestamo === 'Activo' ? 'var(--text-h)' : 'var(--text)',
                  transition: 'all 0.15s ease',
                }}
                title={filterEstadoPrestamo === 'Activo' ? 'Filtro activo. Clic para ver todos' : 'Ver únicamente préstamos activos en plazo'}
              >
                <span>🟢</span>
                <span>Préstamos Activos</span>
                <span
                  className="tab-badge"
                  style={{
                    marginLeft: '4px',
                    background: filterEstadoPrestamo === 'Activo' ? '#84CC16' : 'var(--surface-2)',
                    color: filterEstadoPrestamo === 'Activo' ? '#0B132B' : 'var(--text)',
                    fontWeight: 700,
                  }}
                >
                  {alDiaCount}
                </span>
              </button>

              <button
                type="button"
                className={`tab-btn ${filterEstadoPrestamo === 'Vencido' ? 'active' : ''}`}
                onClick={() => setFilterEstadoPrestamo(filterEstadoPrestamo === 'Vencido' ? 'todos' : 'Vencido')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterEstadoPrestamo === 'Vencido' ? '2px solid #ef4444' : '1px solid var(--line)',
                  background: filterEstadoPrestamo === 'Vencido' ? 'rgba(239, 68, 68, 0.16)' : 'var(--surface-1)',
                  color: filterEstadoPrestamo === 'Vencido' ? '#ef4444' : 'var(--text)',
                  transition: 'all 0.15s ease',
                }}
                title={filterEstadoPrestamo === 'Vencido' ? 'Filtro activo. Clic para ver todos' : 'Ver únicamente préstamos con fecha vencida'}
              >
                <span>⚠️</span>
                <span>⏰ Filtro: Vencidos</span>
                <span
                  className="tab-badge"
                  style={{
                    marginLeft: '4px',
                    background: vencidosCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-2)',
                    color: vencidosCount > 0 ? '#ef4444' : 'var(--text-dim)',
                    fontWeight: 700,
                  }}
                >
                  {vencidosCount}
                </span>
              </button>

              {filterEstadoPrestamo !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setFilterEstadoPrestamo('todos')}
                  style={{
                    fontSize: '12px',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px dashed var(--line)',
                    background: 'transparent',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Restablecer y ver todos los préstamos"
                >
                  ✕ Ver todos
                </button>
              )}
            </div>
          </div>

          {loading ? (
            isRetryingOrSlow ? (
              <ModuleConnectionState mode="loading" isRetryingOrSlow={true} />
            ) : (
              <TableLoader
                title="Sincronizando préstamos..."
                subtitle="Consultando préstamos activos en tiempo real"
                icon={Repeat}
              />
            )
          ) : error ? (
            <ModuleConnectionState
              mode="error"
              onRetry={onRetry}
            />
          ) : activeLoans.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> {movements.length === 0 ? 'No hay registros en Supabase.' : 'No hay préstamos de equipos activos en este momento. Todos los equipos están en bodega.'}
            </div>
          ) : (
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table className="w-full table-fixed" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-[#131b26] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="w-[21%] py-3 px-3 text-left truncate" style={{ width: '21%', padding: '10px 12px', textAlign: 'left' }}>EQUIPO</th>
                    <th className="w-[10%] py-3 px-2 text-center truncate" style={{ width: '10%', padding: '10px 6px', textAlign: 'center' }}>PLACA</th>
                    <th className="w-[16%] py-3 px-3 text-left truncate" style={{ width: '16%', padding: '10px 10px', textAlign: 'left' }}>RESPONSABLE</th>
                    <th className="w-[12%] min-w-[100px] py-3 px-2 text-center truncate" style={{ width: '12%', minWidth: '100px', padding: '10px 6px', textAlign: 'center' }}>SEDE</th>
                    <th className="w-[11%] min-w-[95px] py-3 px-2 text-center truncate" style={{ width: '11%', minWidth: '95px', padding: '10px 6px', textAlign: 'center' }}>F. PRÉSTAMO</th>
                    <th className="w-[12%] min-w-[100px] py-3 px-2 text-center truncate" style={{ width: '12%', minWidth: '100px', padding: '10px 6px', textAlign: 'center' }}>F. ENTREGA</th>
                    <th className="w-[18%] py-3 px-3 text-center truncate" style={{ width: '18%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLoans.map((m) => {
                    const overdue = isOverdue(m);
                    const firstCode = m.unitCodes && m.unitCodes.length > 0 ? m.unitCodes[0] : (m.placa || m.itemId);
                    const fechaSalida = m.date || m.fecha_salida || m.created_at;
                    const fechaDevolucion =
                      m.fecha_devolucion_esperada ||
                      m.expectedReturn ||
                      m.fecha_entrega ||
                      m.fecha_devolucion ||
                      m.fecha_limite;

                    return (
                      <tr key={m.id} className={`${overdue ? 'row-overdue' : 'row-active'} h-auto`}>
                        {/* 1. ELEMENTO */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title"
                              title={m.itemName}
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
                              {m.itemName}
                            </strong>
                            {m.motive && (
                              <span
                                className="item-motive"
                                title={m.motive}
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--text-dim)',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.motive}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. PLACAS / UNIDADES (CENTRADAS E INTERACTIVAS) */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div className="units-tags" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', overflow: 'hidden', maxWidth: '100%', flexWrap: 'wrap' }}>
                            {m.unitCodes && m.unitCodes.length > 0 ? (
                              m.unitCodes.map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => abrirModalDetalle(code, m)}
                                  className="badge-placa"
                                  title={`Ver ficha técnica y detalle completo del equipo (${code})`}
                                >
                                  {code}
                                </button>
                              ))
                            ) : (
                              <button
                                type="button"
                                onClick={() => abrirModalDetalle(m.placa || m.itemId, m)}
                                className="badge-placa"
                                title="Ver ficha técnica del equipo"
                              >
                                {m.placa || `${m.qty || 1} und`}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. CUSTODIO RESPONSABLE */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span
                            className="person-name"
                            title={m.person}
                            style={{ fontSize: '12.5px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}
                          >
                            {m.person}
                          </span>
                        </td>

                        {/* 4. SEDE / MUNICIPIO (CENTRADO CON TOOLTIP NATIVO) */}
                        <td className="px-2 py-3 text-center whitespace-nowrap overflow-hidden max-w-[130px]" style={{ padding: '0 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', maxWidth: '130px', overflow: 'hidden' }}>
                          <span
                            className="sede-badge municipal truncate"
                            title={`Sede: ${m.sede || 'Medellín'}`}
                            style={{
                              fontSize: '11px',
                              padding: '2px 7px',
                              display: 'inline-block',
                              maxWidth: '100%',
                              lineHeight: '1.25',
                              verticalAlign: 'middle',
                            }}
                          >
                            {m.sede || 'Medellín'}
                          </span>
                        </td>

                        {/* 5. FECHA PRÉSTAMO (DD/MM/YYYY CENTRADO) */}
                        <td className="px-2 py-2.5 text-center whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 min-w-[95px]" style={{ textAlign: 'center', paddingLeft: '6px', paddingRight: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span className="mono-num text-xs font-medium text-slate-700 dark:text-slate-200" style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px' }}>
                            {formatFecha(fechaSalida)}
                          </span>
                        </td>

                        {/* 6. DEVOLUCIÓN PACTADA (DD/MM/YYYY CENTRADO O SIN FECHA PACTADA) */}
                        <td className="px-2 py-2.5 text-center whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-200 min-w-[100px]" style={{ textAlign: 'center', paddingLeft: '6px', paddingRight: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {fechaDevolucion ? (
                            <span
                              className="mono-num text-xs font-medium"
                              title={overdue ? 'Préstamo vencido' : 'En plazo'}
                              style={{
                                fontFamily: "'Poppins', sans-serif",
                                fontSize: '12px',
                                color: overdue ? 'var(--red, #ef4444)' : undefined,
                                fontWeight: overdue ? 800 : 500,
                              }}
                            >
                              {overdue ? '⚠️ ' : ''}{formatFecha(fechaDevolucion)}
                            </span>
                          ) : (
                            <span
                              className="text-xs italic text-slate-400 dark:text-slate-500"
                              title="Préstamo sin fecha de devolución pactada"
                              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)' }}
                            >
                              Sin fecha pactada
                            </span>
                          )}
                        </td>

                        {/* 7. ACCIONES: 📷 QR, 👁️ Ver, ✏️ Editar, ✅ Devolución */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            className="flex items-center justify-center gap-1.5"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 2px',
                            }}
                          >
                            {/* 1. 📷 Código QR */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Ver código QR y comprobante de entrega"
                              onClick={() => {
                                setQrLoanItem({
                                  code: firstCode,
                                  placa: firstCode,
                                  nombre: m.itemName,
                                  name: m.itemName,
                                  sede: m.sede || 'Medellín',
                                  responsable: m.person,
                                  fechaPrestamo: m.date,
                                  fechaDevolucion: m.expectedReturn,
                                  motivo: m.motive,
                                });
                              }}
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

                            {/* 2. 👁️ Consultar / Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Ver información completa del préstamo"
                              onClick={() => setDetailLoan(m)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyItems: 'center',
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

                            {/* 3. 🖨️ Imprimir Guía / Acta de Préstamo Retornable */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Imprimir Guía / Acta de Préstamo y Responsabilidad"
                              onClick={() => setPrestamoParaActa(m)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#818cf8',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect width="12" height="8" x="6" y="14" />
                              </svg>
                            </button>

                            {/* 3. ✏️ Editar (Solo Operador y Admin) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                                title="Editar fecha pactada o custodio"
                                onClick={() => handleOpenEditLoan(m)}
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

                            {/* 4. ✅ Check Verde / Devolución (Solo Operador y Admin) */}
                            {!isSupervisor && (
                              <button
                                type="button"
                                className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                                title="Registrar devolución y retorno a bodega"
                                onClick={() => {
                                  const unitCodesStr = (m.unitCodes || []).filter(Boolean).join(', ');
                                  setPrestamoParaRetorno({
                                    ...m,
                                    equipo_nombre: m.itemName,
                                    placa: unitCodesStr,
                                    custodio: m.person,
                                  });
                                  setModalRetornoOpen(true);
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  flexShrink: 0,
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#10b981',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {loansPerPage <= 5 && Array.from({ length: Math.max(0, 5 - paginatedLoans.length) }).map((_, phIdx) => (
                    <tr key={`ph-loans-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={7} style={{ padding: '0 8px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
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
                    {activeLoans.length === 0 ? 0 : (currentLoanPage - 1) * LOANS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentLoanPage * LOANS_PER_PAGE, activeLoans.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{activeLoans.length}</strong> préstamos
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span>Filas:</span>
                    <select
                      value={loansPerPage}
                      onChange={(e) => {
                        setLoansPerPage(Number(e.target.value));
                        setCurrentLoanPage(1);
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-input, #fff)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value={5}>5</option>
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
                      disabled={currentLoanPage <= 1}
                      onClick={() => setCurrentLoanPage((p) => Math.max(1, p - 1))}
                      style={{ padding: '3px 10px', fontSize: '12px', cursor: currentLoanPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Anterior
                    </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentLoanPage} de {totalLoanPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentLoanPage >= totalLoanPages}
                    onClick={() => setCurrentLoanPage((p) => Math.min(totalLoanPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentLoanPage >= totalLoanPages ? 'not-allowed' : 'pointer' }}
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
          BLOQUE 2: ENTREGA DE CONSUMIBLES (NO RETORNABLES)
          ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'entregas') && (
        <section>
          <div className="section-header">
            <h2>
              <span>Entregas de Consumibles para Talleres (No Retornables)</span>
              <span className="pill default">{recentDeliveries.length} entregas registradas</span>
            </h2>
            <span className="section-subtitle">
              Salidas de insumos (cautines, Arduinos, motores) descontadas permanentemente de bodega
            </span>
          </div>

          <div className="panel table-responsive">
            {recentDeliveries.length === 0 ? (
              <div className="empty">
                <span>📦</span> {movements.length === 0 ? 'No hay registros en Supabase.' : 'Aún no se han registrado salidas de consumibles.'}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Fecha y Código</th>
                    <th>Materiales Entregados (Canasta)</th>
                    <th style={{ width: '180px' }}>Recibe (Formador)</th>
                    <th style={{ width: '120px' }}>Sede</th>
                    <th>Proyecto / Motivo</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.map((m) => {
                    const rawItems = Array.isArray(m.items) && m.items.length > 0 ? m.items : [
                      {
                        material_id: m.itemId,
                        nombre: m.itemName,
                        cantidad: m.qty || 1,
                      }
                    ];
                    const totalUnidades = m.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
                    const totalItems = rawItems.length;
                    const codigoRemision = m.codigo_acta || m.remision_id || `REM-${m.id.replace(/^mov-ent-/, '')}`;

                    return (
                      <tr key={m.id} className="h-auto">
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <div className="mono-num" style={{ fontWeight: 600 }}>{fmtDate(m.date)}</div>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '11px',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'inline-block',
                              marginTop: '3px',
                            }}
                          >
                            {codigoRemision}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          {/* Lista compacta de chips/ítems */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                            {rawItems.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  color: 'var(--text, #f8fafc)',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'var(--mono)',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    backgroundColor: 'rgba(132, 204, 22, 0.12)',
                                    color: '#84CC16',
                                    border: '1px solid rgba(132, 204, 22, 0.3)',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  [{it.cantidad} und]
                                </span>
                                <strong style={{ fontWeight: 600 }}>{it.nombre || it.material}</strong>
                                {it.material_id && (
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim, #94a3b8)', fontFamily: 'var(--mono)' }}>
                                    ({it.material_id})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Badge resumen */}
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: 'var(--text-dim, #94a3b8)',
                              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.5))',
                              border: '1px solid var(--line, #334155)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📦 {totalItems} {totalItems === 1 ? 'material' : 'materiales'} ({totalUnidades} und en total)
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <span className="person-name" style={{ fontWeight: 600 }}>{m.person || m.responsable_recibe}</span>
                        </td>
                        <td style={{ padding: '0 12px', verticalAlign: 'middle', maxWidth: '160px' }}>
                          <span
                            className="sede-badge municipal"
                            title={m.sede || 'Medellín'}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              display: 'inline-block',
                              maxWidth: '140px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                            }}
                          >
                            {m.sede || 'Medellín'}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <span className="item-motive" title={m.motive || m.motivo || m.proyecto}>
                            {m.proyecto && <strong style={{ color: '#84CC16', display: 'block', fontSize: '11px' }}>{m.proyecto}</strong>}
                            {m.motive || m.motivo || 'Salida de bodega'}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '12px', paddingRight: '12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setRemisionParaImprimir({
                                remision_id: codigoRemision,
                                codigo_acta: codigoRemision,
                                fecha_entrega: m.fecha_entrega || m.date,
                                responsable_recibe: m.person || m.responsable_recibe,
                                sede: m.sede || 'Medellín',
                                proyecto: m.proyecto || '',
                                motivo: m.motive || m.motivo || 'Salida de bodega',
                                items: rawItems,
                                total_items: totalItems,
                                total_unidades: totalUnidades,
                              });
                            }}
                            className="btn small"
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Imprimir Acta de Entrega / Hoja de Guía"
                          >
                            <span>🖨️</span> Imprimir Guía
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOQUE 3: BANDEJA DE SOLICITUDES ENTRANTES (ROL ADMIN / SUPERVISOR)
          ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'solicitudes') && (isAdmin || isSupervisor) && (
        <section>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2>
                <span>Bandeja de Gestión y Aprobación de Solicitudes</span>
                <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {solicitudesEstandar.length} solicitudes registradas
                </span>
                {solicitudesPendientesCount > 0 && (
                  <span className="pill low" style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(132, 204, 22, 0.15)', color: '#84CC16', border: '1px solid rgba(132, 204, 22, 0.4)' }}>
                    ⏳ {solicitudesPendientesCount} pendiente{solicitudesPendientesCount > 1 ? 's' : ''} de revisión
                  </span>
                )}
              </h2>
              <span className="section-subtitle">
                Acompaña a los docentes y formadores STEAM gestionando el préstamo de equipos y el despacho oportuno de materiales a cada territorio.
              </span>
            </div>
          </div>

          <div
            className="panel table-responsive"
            style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            {solicitudesLoading ? (
              <TableLoader
                title="Cargando datos..."
                subtitle="Sincronizando bandeja de solicitudes entrelazadas"
                showSkeleton={false}
              />
            ) : solicitudesEstandar.length === 0 ? (
              <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>✨</span> ¡Todo al día! En este momento no hay solicitudes pendientes por revisar.
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '125px', minWidth: '115px' }}>Fecha Radicado</th>
                    <th style={{ minWidth: '160px' }}>Solicitante / Custodio</th>
                    <th style={{ width: '140px' }}>Tipo</th>
                    <th style={{ minWidth: '220px' }}>Resumen de Ítems</th>
                    <th style={{ width: '120px' }}>Fecha Retorno</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Estado</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesEstandar
                    .slice((solicitudesPage - 1) * SOLICITUDES_PER_PAGE, solicitudesPage * SOLICITUDES_PER_PAGE)
                    .map((sol) => {
                      const estadoUpper = String(sol.estado || 'PENDIENTE').toUpperCase();
                      const rawTipo = (sol.tipo_solicitud || sol.tipo || '').toUpperCase();
                      const solItems = (Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0)
                        ? sol.items_solicitud
                        : (Array.isArray(sol.items) ? sol.items : []);
                      const esCompra =
                        rawTipo === 'SUGERENCIA_COMPRA' ||
                        rawTipo.includes('COMPRA') ||
                        solItems.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido);
                      const esConsumible = !esCompra && rawTipo.includes('CONSUMIB');
                      const esPrestamo = !esCompra && !esConsumible;
                      const fechaRad = sol.creado_en || sol.fecha_radicado || sol.created_at || '';

                      return (
                        <tr key={sol.id} style={{ height: '52px' }}>
                          <td className="mono-num" style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                            {fmtDate(fechaRad)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div>
                              <strong style={{ fontSize: '12.5px', color: 'var(--text-h)' }}>
                                {sol.usuario_nombre || 'Docente'}
                              </strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                Sede: <span
                                  className="sede-badge municipal"
                                  title={sol.sede || 'Medellín'}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    display: 'inline-block',
                                    maxWidth: '140px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  {sol.sede || 'Medellín'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {renderTipoSolicitud(sol)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {Array.isArray(sol.items) && sol.items.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {sol.items.map((it, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                    >
                                      <span>{it.nombre_sugerido || it.nombre_item || it.nombre}</span>
                                      <strong className="text-[#84CC16]">x{it.cantidad}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Sin ítems detallados</span>
                              )}
                              {sol.motivo && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-dim)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '260px',
                                  }}
                                  title={sol.motivo}
                                >
                                  "{sol.motivo}"
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="mono-num" style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                            {(() => {
                              const fDev = sol.fecha_devolucion || sol.fecha_retorno || sol.fecha_limite || sol.fecha_devolucion_estimada;
                              if (esCompra) {
                                return fDev ? (
                                  <span title="Fecha ideal requerida" style={{ color: '#818cf8', fontWeight: 600 }}>
                                    {formatearFechaSegura(fDev)}
                                  </span>
                                ) : '—';
                              }
                              if (!esPrestamo) return '—';
                              return fDev ? formatearFechaSegura(fDev) : 'No especificada';
                            })()}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {estadoUpper === 'APROBADO' || estadoUpper === 'APROBADA' ? (
                              <span className="badge-estado-aprobado">
                                <span>Aprobado</span>
                              </span>
                            ) : estadoUpper === 'RECHAZADO' || estadoUpper === 'RECHAZADA' ? (
                              (() => {
                                const textoRechazo =
                                  sol.observaciones_admin ||
                                  sol.motivo_rechazo ||
                                  sol.nota_rechazo ||
                                  sol.justificacion_rechazo ||
                                  '';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span
                                      className="badge-estado-rechazado"
                                      style={{ cursor: textoRechazo ? 'pointer' : 'default' }}
                                      onClick={() => {
                                        if (textoRechazo) setModalMotivoRechazo({ solicitud: sol, motivo: textoRechazo });
                                      }}
                                      title={textoRechazo ? `Motivo: ${textoRechazo} (Click para leer completo)` : 'Rechazado por administración'}
                                    >
                                      <XCircle size={13} />
                                      <span>Rechazado</span>
                                      {textoRechazo && <Info size={11} style={{ marginLeft: '2px', opacity: 0.9 }} />}
                                    </span>
                                    {textoRechazo ? (
                                      <button
                                        type="button"
                                        onClick={() => setModalMotivoRechazo({ solicitud: sol, motivo: textoRechazo })}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: '1px 4px',
                                          color: '#ef4444',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          maxWidth: '150px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          cursor: 'pointer',
                                          textDecoration: 'underline dotted',
                                          lineHeight: 1.2,
                                        }}
                                        title={`Motivo: ${textoRechazo} (Click para ver completo)`}
                                      >
                                        Motivo: {textoRechazo}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                        Sin motivo registrado
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="badge-estado-pendiente">
                                <span>Pendiente</span>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const textoRechazo =
                                  sol.observaciones_admin ||
                                  sol.motivo_rechazo ||
                                  sol.nota_rechazo ||
                                  sol.justificacion_rechazo ||
                                  '';
                                if ((estadoUpper === 'RECHAZADO' || estadoUpper === 'RECHAZADA') && textoRechazo) {
                                  setModalMotivoRechazo({ solicitud: sol, motivo: textoRechazo });
                                } else {
                                  setSolicitudParaGestionar(sol);
                                  setModalGestionOpen(true);
                                }
                              }}
                              className="btn small"
                              style={{
                                backgroundColor: (estadoUpper === 'PENDIENTE') ? '#84CC16' : 'rgba(255, 255, 255, 0.08)',
                                color: (estadoUpper === 'PENDIENTE') ? '#0B132B' : 'var(--text)',
                                fontWeight: 700,
                                padding: '4px 10px',
                                fontSize: '11.5px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                              title={estadoUpper === 'RECHAZADO' || estadoUpper === 'RECHAZADA' ? 'Ver motivo y detalles del rechazo' : 'Revisar solicitud y autorizar despacho'}
                            >
                              <CheckSquare size={13} />
                              <span>{estadoUpper === 'PENDIENTE' ? 'Gestionar' : 'Ver Detalle'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}

            {/* Paginación de 5 en 5 para la bandeja de solicitudes estándar */}
            {solicitudesEstandar.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
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
                    {solicitudesEstandar.length === 0 ? 0 : (solicitudesPage - 1) * SOLICITUDES_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(solicitudesPage * SOLICITUDES_PER_PAGE, solicitudesEstandar.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{solicitudesEstandar.length}</strong> solicitudes
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span>Filas:</span>
                    <select
                      value={solicitudesPerPage}
                      onChange={(e) => {
                        setSolicitudesPerPage(Number(e.target.value));
                        setSolicitudesPage(1);
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--bg-input, #fff)',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value={5}>5</option>
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
                      disabled={solicitudesPage <= 1}
                      onClick={() => setSolicitudesPage((p) => Math.max(1, p - 1))}
                      style={{ padding: '3px 10px', fontSize: '12px', cursor: solicitudesPage <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ← Anterior
                    </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {solicitudesPage} de {Math.max(1, Math.ceil(solicitudesEstandar.length / SOLICITUDES_PER_PAGE))}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={solicitudesPage >= Math.ceil(solicitudesEstandar.length / SOLICITUDES_PER_PAGE)}
                    onClick={() =>
                      setSolicitudesPage((p) =>
                        Math.min(Math.ceil(solicitudesEstandar.length / SOLICITUDES_PER_PAGE), p + 1)
                      )
                    }
                    style={{
                      padding: '3px 10px',
                      fontSize: '12px',
                      cursor:
                        solicitudesPage >= Math.ceil(solicitudesEstandar.length / SOLICITUDES_PER_PAGE)
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          MODAL 1: REGISTRAR PRÉSTAMO DE EQUIPOS (RETORNABLE)
          ========================================================================= */}
      {showLoanModal && (
        <div className="modal-backdrop" onClick={() => setShowLoanModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Préstamo de Equipo Tecnológico</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowLoanModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLoan}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Selecciona el Equipo a Prestar *</label>
                  <select
                    required
                    value={selectedEquipoId}
                    onChange={(e) => {
                      setSelectedEquipoId(e.target.value);
                      setSelectedUnits([]);
                    }}
                  >
                    <option value="">-- Elige un equipo con unidades disponibles --</option>
                    {equipos
                      .filter((it) => available(it) > 0)
                      .map((it) => (
                        <option key={it.id} value={it.id}>
                          {formatItemOptionLabel(it, { includeStock: true })}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedEquipoId && (
                  <div className="form-group full">
                    <label>
                      Unidades y Placas Disponibles (Selecciona al menos una) *
                    </label>
                    {availableUnits.length === 0 ? (
                      <div className="alert-box-warning">
                        ⚠️ No hay unidades disponibles de este equipo en bodega.
                      </div>
                    ) : (
                      <div className="units-checkbox-grid">
                        {availableUnits.map((u) => {
                          const isChecked = selectedUnits.includes(u.code);
                          return (
                            <label
                              key={u.code}
                              className={`unit-checkbox-card ${isChecked ? 'checked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleUnit(u.code)}
                              />
                              <div className="card-info">
                                <span className="card-placa mono-num">{u.placa || u.code}</span>
                                <span className="card-sn mono-num">SN: {u.serial || '—'}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group full" style={{ marginBottom: '4px' }}>
                  <SearchableUserSelect
                    usuarios={usuarios}
                    value={loanPerson}
                    label="Custodio / Solicitante Responsable *"
                    placeholder="Buscar por nombre completo, cédula o rol..."
                    onSelectUser={(u) => {
                      setLoanPerson(u.nombre || u.nombre_completo || '');
                      setLoanPersonDocumento(u.documento || u.cedula || '');
                      setLoanPersonEmail(u.email || '');
                      if (u.sede) setLoanSede(u.sede);
                    }}
                    onOpenNewUserModal={() => {
                      setTargetModalForUser('loan');
                      setShowNewUserModal(true);
                    }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }}>Sede / Municipio de Destino *</label>
                    {(isAdmin || isSupervisor) && (
                      <button
                        type="button"
                        onClick={() => setShowSedeModal(true)}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        + Nueva sede
                      </button>
                    )}
                  </div>
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
                  <label>Fecha Devolución Pactada (Opcional)</label>
                  <input
                    type="date"
                    min={today()}
                    value={loanExpectedDate}
                    onChange={(e) => setLoanExpectedDate(e.target.value)}
                  />
                  <small className="help-text">Opcional. No se permiten fechas anteriores a hoy.</small>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }}>Proyecto STEAM Vinculado</label>
                    <button
                      type="button"
                      onClick={() => setShowProyectoModal(true)}
                      style={{ background: 'none', border: 'none', color: '#84CC16', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      + Nuevo proyecto
                    </button>
                  </div>
                  <select
                    value={loanProyecto}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLoanProyecto(val);
                      if (val) {
                        setLoanMotive(`${val} - `);
                      }
                    }}
                  >
                    <option value="">-- Selecciona proyecto STEAM (opcional) --</option>
                    {proyectosList.map((proj) => (
                      <option key={proj.id || proj.nombre} value={proj.nombre}>
                        {proj.nombre} {proj.sede_municipio || proj.municipio ? `(${proj.sede_municipio || proj.municipio})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Motivo y Observaciones del Préstamo</label>
                  <input
                    maxLength={140}
                    placeholder="Ej. Taller de robótica móvil con estudiantes de grado 8°"
                    value={loanMotive}
                    onChange={(e) => setLoanMotive(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowLoanModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedEquipoId || selectedUnits.length === 0}
                >
                  Confirmar Préstamo ({selectedUnits.length} und)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REGISTRAR ENTREGA DE CONSUMIBLES (NO RETORNABLE - MÚLTIPLES ÍTEMS)
          ========================================================================= */}
      {showDeliveryModal && (
        <div className="modal-backdrop" onClick={() => !deliverySubmitting && setShowDeliveryModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  Salida de Bodega • No Retornable
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Registrar Salida de Insumos / Consumibles</h3>
              </div>
              <button
                type="button"
                disabled={deliverySubmitting}
                className="close-btn"
                onClick={() => setShowDeliveryModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. DATOS GENERALES DE LA ENTREGA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Selector con búsqueda de Custodio / Responsable */}
                  <div>
                    <SearchableUserSelect
                      usuarios={usuarios}
                      value={deliveryPerson}
                      label="Persona Que Recibe (Custodio / Formador Líder) *"
                      placeholder="Buscar por nombre completo, cédula o rol..."
                      onSelectUser={(u) => {
                        setDeliveryPerson(u.nombre || u.nombre_completo || '');
                        setDeliveryPersonDocumento(u.documento || u.cedula || '');
                        setDeliveryPersonEmail(u.email || '');
                        if (u.sede) setDeliverySede(u.sede);
                      }}
                      onOpenNewUserModal={() => {
                        setTargetModalForUser('delivery');
                        setShowNewUserModal(true);
                      }}
                    />
                  </div>

                  {/* Fila intermedia: Sede y Proyecto STEAM */}
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Sede O Municipio De Destino *</label>
                        {(isAdmin || isSupervisor) && (
                          <button
                            type="button"
                            onClick={() => setShowSedeModal(true)}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            + Nueva
                          </button>
                        )}
                      </div>
                      <select
                        required
                        value={deliverySede}
                        onChange={(e) => setDeliverySede(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        {sedesList.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Proyecto STEAM (opcional)</label>
                        <button
                          type="button"
                          onClick={() => setShowProyectoModal(true)}
                          style={{ background: 'none', border: 'none', color: '#84CC16', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          + Nuevo
                        </button>
                      </div>
                      <select
                        value={deliveryProyecto}
                        onChange={(e) => setDeliveryProyecto(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- Ninguno / General --</option>
                        {proyectosList.map((proj) => (
                          <option key={proj.id || proj.nombre} value={proj.nombre}>
                            {proj.nombre} {proj.sede_municipio || proj.municipio ? `(${proj.sede_municipio || proj.municipio})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Motivo de la entrega */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>Motivo De La Entrega</label>
                    <input
                      maxLength={140}
                      placeholder="Ej. Armado de robots seguidores o semilleros"
                      value={deliveryMotive}
                      onChange={(e) => setDeliveryMotive(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* 2. SECCIÓN: LISTA DE INSUMOS A ENTREGAR */}
                <div
                  style={{
                    backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.4))',
                    border: '1px solid var(--line, #334155)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '12.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#84CC16',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📦</span> Lista de Insumos a Entregar
                    </h4>
                    {/* Badge contador total */}
                    <span
                      style={{
                        backgroundColor: itemsEntrega.length > 0 ? 'rgba(132, 204, 22, 0.15)' : 'var(--surface, #0f172a)',
                        color: itemsEntrega.length > 0 ? '#84CC16' : 'var(--text-dim, #94a3b8)',
                        border: itemsEntrega.length > 0 ? '1px solid rgba(132, 204, 22, 0.35)' : '1px solid var(--line, #334155)',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: '20px',
                      }}
                    >
                      Total materiales: {itemsEntrega.length} {itemsEntrega.length === 1 ? 'ítem' : 'ítems'} | {itemsEntrega.reduce((acc, it) => acc + it.cantidadEntrega, 0)} unidades
                    </span>
                  </div>

                  {/* Selector temporal + Cantidad + Botón Agregar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 110px auto',
                      gap: '8px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                        Seleccionar Consumible de Bodega
                      </label>
                      <select
                        value={consumibleSeleccionadoId}
                        onChange={(e) => {
                          setConsumibleSeleccionadoId(e.target.value);
                          setCantidadInput(1);
                        }}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      >
                        <option value="">-- Elige un insumo --</option>
                        {consumibles.map((c) => {
                          const enCanasta = (itemsEntrega.find((it) => it.id === c.id)?.cantidadEntrega) || 0;
                          const disponibleReal = (c.quantity ?? c.disponible ?? 0) - enCanasta;
                          const estaAgotado = disponibleReal <= 0;
                          return (
                            <option key={c.id} value={c.id} disabled={estaAgotado}>
                              {c.id} - {c.name || c.material} (Disp: {disponibleReal} {c.unit || 'und'}){estaAgotado ? ' [Agotado]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={maxAgregable > 0 ? maxAgregable : 1}
                        value={cantidadInput}
                        disabled={!consumibleSeleccionadoId || maxAgregable <= 0}
                        onChange={(e) => setCantidadInput(Math.max(1, Number(e.target.value)))}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAgregarItemEntrega}
                      disabled={!consumibleSeleccionadoId || maxAgregable <= 0}
                      className="btn"
                      style={{
                        backgroundColor: '#84CC16',
                        color: '#020617',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: (!consumibleSeleccionadoId || maxAgregable <= 0) ? 'not-allowed' : 'pointer',
                        opacity: (!consumibleSeleccionadoId || maxAgregable <= 0) ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      + Agregar a la lista
                    </button>
                  </div>

                  {consumibleSeleccionado && (
                    <small style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', margin: 0 }}>
                      Stock total en bodega: <strong style={{ color: 'var(--text, #f8fafc)' }}>{maxAvailableConsumible} {consumibleSeleccionado.unit || 'und'}</strong>
                      {cantidadYaEnCanasta > 0 && ` (Ya en canasta: ${cantidadYaEnCanasta})`}
                      {' • '}Disponible para agregar: <strong style={{ color: maxAgregable > 0 ? '#84CC16' : '#ef4444' }}>{maxAgregable}</strong>
                    </small>
                  )}

                  {/* Tabla / Lista de Ítems Agregados */}
                  <div
                    style={{
                      border: '1px solid var(--line, #334155)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--surface, #0b1320)',
                    }}
                  >
                    {itemsEntrega.length === 0 ? (
                      <div
                        style={{
                          padding: '24px 16px',
                          textAlign: 'center',
                          color: 'var(--text-dim, #94a3b8)',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📋</span>
                        No has agregado ningún insumo a esta entrega todavía. Selecciona arriba y pulsa <strong>"+ Agregar a la lista"</strong>.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                              borderBottom: '1px solid var(--line, #334155)',
                              color: 'var(--text-dim, #94a3b8)',
                              textAlign: 'left',
                            }}
                          >
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Material</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Cantidad a entregar</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Stock restante</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsEntrega.map((item) => {
                            const stockRestante = item.disponible - item.cantidadEntrega;
                            return (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: '1px solid var(--line, rgba(51, 65, 85, 0.5))',
                                }}
                              >
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text, #f8fafc)' }}>{item.material}</div>
                                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--text-dim, #94a3b8)' }}>{item.id}</div>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      fontFamily: 'var(--mono)',
                                      fontWeight: 700,
                                      fontSize: '12.5px',
                                      color: '#84CC16',
                                      backgroundColor: 'rgba(132, 204, 22, 0.12)',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(132, 204, 22, 0.3)',
                                    }}
                                  >
                                    {item.cantidadEntrega} {item.unit}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: stockRestante <= 5 ? '#eab308' : 'var(--text-dim, #94a3b8)' }}>
                                  <span style={{ fontFamily: 'var(--mono)' }}>{stockRestante}</span> {item.unit}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarItemEntrega(item.id)}
                                    title="Eliminar de la lista"
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      color: '#ef4444',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={deliverySubmitting}
                  onClick={() => setShowDeliveryModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede}
                  style={{
                    backgroundColor: (deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede) ? undefined : '#84CC16',
                    color: (deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede) ? undefined : '#020617',
                    fontWeight: 700,
                  }}
                >
                  {deliverySubmitting ? 'Registrando Entrega...' : `Confirmar Entrega y Descontar Stock (${itemsEntrega.length} ${itemsEntrega.length === 1 ? 'material' : 'materiales'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETALLE DEL PRÉSTAMO
          ========================================================================= */}
      {detailLoan && (
        <div className="modal-backdrop" onClick={() => setDetailLoan(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Detalle del Préstamo Activo</h3>
              <button type="button" className="close-btn" onClick={() => setDetailLoan(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem' }}>💻</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>{detailLoan.itemName}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ID Registro: #{detailLoan.id}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Custodio</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detailLoan.person}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Sede / Destino</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detailLoan.sede || 'Medellín'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fecha Salida</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{fmtDate(detailLoan.date)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Devolución Esperada</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: !detailLoan.expectedReturn ? 'var(--text-dim)' : isOverdue(detailLoan) ? 'var(--red)' : 'var(--green, #84CC16)' }}>
                    {!detailLoan.expectedReturn
                      ? 'Sin fecha pactada'
                      : `${isOverdue(detailLoan) ? '⚠️ ' : ''}${fmtDate(detailLoan.expectedReturn)}`}
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Placas / Unidades Prestadas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {detailLoan.unitCodes && detailLoan.unitCodes.length > 0 ? (
                    detailLoan.unitCodes.map((code) => (
                      <span key={code} className="mono-num" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="mono-num">{detailLoan.qty || 1} und</span>
                  )}
                </div>
              </div>

              {detailLoan.motive && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Motivo / Observaciones</label>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', background: 'var(--surface-1)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    {detailLoan.motive}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  const loanToPrint = detailLoan;
                  setDetailLoan(null);
                  setPrestamoParaActa(loanToPrint);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(132, 204, 22, 0.15)',
                  color: '#84CC16',
                  border: '1px solid rgba(132, 204, 22, 0.35)',
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                Imprimir Acta de Préstamo
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDetailLoan(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDITAR PRÉSTAMO
          ========================================================================= */}
      <EditarPrestamoModal
        prestamo={editingLoan}
        isOpen={Boolean(editingLoan)}
        onClose={() => setEditingLoan(null)}
        onActualizar={handleActualizarPrestamo}
        sedes={sedesList}
        usuarios={usuarios}
        proyectos={proyectosList}
      />

      {/* =========================================================================
          MODAL: CÓDIGO QR / ACTA DEL PRÉSTAMO
          ========================================================================= */}
      {qrLoanItem && (
        <ModalQR
          activo={qrLoanItem}
          onClose={() => {
            setQrLoanItem(null);
            setActivoDetalleSeleccionado(null);
            setDetalleFetchPlaca(null);
            setDetalleHeaderPreview(null);
            setDetalleFallbackContext(null);
          }}
          onBack={() => {
            const temp = qrLoanItem;
            setQrLoanItem(null);
            setDetalleFetchPlaca(null);
            setDetalleHeaderPreview(null);
            setActivoDetalleSeleccionado(temp);
            setMostrarModalDetalle(true);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: HOJA DE GUÍA / ACTA DE REMISIÓN DE CONSUMIBLES (IMPRIMIBLE)
          ========================================================================= */}
      {remisionParaImprimir && (
        <div className="modal-backdrop" onClick={() => setRemisionParaImprimir(null)}>
          <div
            className="modal-dialog print-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '100%', padding: '0', overflow: 'hidden' }}
          >
            {/* Header del Modal en Pantalla (oculto al imprimir) */}
            <div
              className="modal-header no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--line, #334155)',
                backgroundColor: 'var(--surface-2, #0f172a)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🖨️</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                  Guía de Salida / Remisión: {remisionParaImprimir.codigo_acta || remisionParaImprimir.remision_id}
                </h3>
              </div>
              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn small btn-primary no-print"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#84CC16',
                    color: '#020617',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🖨️</span> Imprimir Documento
                </button>
                <button
                  type="button"
                  className="close-btn no-print"
                  onClick={() => setRemisionParaImprimir(null)}
                  style={{ fontSize: '16px', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL IMPRIMIBLE: GUÍA DE REMISIÓN / ACTA DE ENTREGA */}
            <div
              className="acta-remision-sheet"
              style={{
                padding: '30px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontFamily: "'Poppins', sans-serif",
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* ENCABEZADO INSTITUCIONAL OFICIAL FMO (PÁGINA 61) */}
              <FmoPrintLetterhead
                titulo="Acta de Salida y Remisión Oficial de Insumos"
                subtitulo="Sistema Integrado de Gestión de Activos (SIGA) • Bodega Central de Robótica"
                radicado={remisionParaImprimir.codigo_acta || remisionParaImprimir.remision_id}
                fecha={formatFecha(remisionParaImprimir.fecha_entrega || remisionParaImprimir.date || today())}
              />

              {/* Ficha de Información de la Entrega */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  marginBottom: '22px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    PERSONA QUE RECIBE (CUSTODIO / FORMADOR)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{remisionParaImprimir.responsable_recibe}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    SEDE / MUNICIPIO DE DESTINO
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{remisionParaImprimir.sede}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    PROYECTO STEAM / PROGRAMA
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{remisionParaImprimir.proyecto || 'General / Formación'}</span>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    MOTIVO / PROPÓSITO DE LA SALIDA
                  </span>
                  <span style={{ color: '#334155' }}>{remisionParaImprimir.motivo || 'Salida de bodega para talleres'}</span>
                </div>
              </div>

              {/* Tabla Detallada de Insumos Entregados */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>
                  Detalle de Materiales Entregados (Total: {remisionParaImprimir.total_items || remisionParaImprimir.items.length} ítems • {remisionParaImprimir.total_unidades} unidades)
                </h4>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 10px', width: '110px' }}>Código</th>
                      <th style={{ padding: '8px 10px' }}>Descripción del Material / Insumo</th>
                      <th style={{ padding: '8px 10px', width: '100px', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Condición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remisionParaImprimir.items.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontFamily: "'Poppins', sans-serif", letterSpacing: '0.02em', fontWeight: 700, color: '#0284c7' }}>
                          {item.material_id || item.id || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <strong style={{ color: '#0f172a' }}>{item.nombre || item.material}</strong>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '12px' }}>
                          {item.cantidad || item.cantidadEntrega} und
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                          Consumido
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                      <td colSpan="3" style={{ padding: '8px 10px', textAlign: 'right' }}>
                        TOTAL UNIDADES ENTREGADAS:
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '13px' }}>
                        {remisionParaImprimir.total_unidades} und
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cláusula de Entrega */}
              <p style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.4, margin: '0 0 28px', textAlign: 'justify' }}>
                * Mediante la presente remisión, se deja constancia de la salida física y definitiva de los materiales e insumos
                relacionados arriba, descontándose del inventario general de la Fundación Marina Orth para su destinación a los proyectos
                institucionales y actividades pedagógicas correspondientes.
              </p>

              {/* Casillas de Firmas Oficiales */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  paddingTop: '20px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '50px', marginBottom: '8px' }}></div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>
                    {remisionParaImprimir.responsable_recibe}
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Firma de Quien Recibe (Custodio / Formador)</span>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>C.C. _______________________</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '50px', marginBottom: '8px' }}></div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>
                    Bodega Central / Coordinación de Inventario
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Firma de Quien Entrega (Almacén FMO)</span>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Fundación Marina Orth</div>
                </div>
              </div>

              {/* PIE DE PÁGINA INSTITUCIONAL FIJO (PÁGINA 61) */}
              <FmoPrintFooter />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: GUÍA / ACTA DE PRÉSTAMO Y RESPONSABILIDAD DE ACTIVOS RETORNABLES (IMPRIMIBLE)
          ========================================================================= */}
      {prestamoParaActa && (
        <ModalActaPrestamo
          loanData={prestamoParaActa}
          itemsCatalog={items}
          usuarios={usuarios}
          allActiveLoans={rawActiveLoans}
          onClose={() => setPrestamoParaActa(null)}
        />
      )}
      {mostrarModalDetalle && (activoDetalleSeleccionado || detalleFetchPlaca) && (
        <ModalDetalleActivo
          isOpen={mostrarModalDetalle}
          item={activoDetalleSeleccionado}
          fetchPlaca={detalleFetchPlaca}
          headerPreview={detalleHeaderPreview}
          mapFetchedItem={(activoFresco) => ({
            ...activoFresco,
            id: activoFresco.id || detalleFetchPlaca,
            placa: activoFresco.placa || detalleFetchPlaca,
            codigo: activoFresco.placa || detalleFetchPlaca,
            nombre: activoFresco.nombre || detalleFallbackContext?.itemName || '',
            equipo: activoFresco.nombre || detalleFallbackContext?.itemName || '',
            categoria: activoFresco.categoria || '',
            condicion: activoFresco.condicion || activoFresco.estado_fisico || '',
            estado: activoFresco.estado || (detalleFallbackContext ? 'En campo' : 'Disponible'),
            status: (activoFresco.estado || '').toLowerCase().includes('campo') || detalleFallbackContext ? 'prestado' : 'disponible',
            responsable: detalleFallbackContext?.person || detalleFallbackContext?.responsable || activoFresco.responsable || activoFresco.custodio || '',
            custodio: detalleFallbackContext?.person || detalleFallbackContext?.responsable || activoFresco.custodio || '',
            isEquipo: true,
            itemType: 'equipo',
          })}
          onClose={() => {
            setMostrarModalDetalle(false);
            setActivoDetalleSeleccionado(null);
            setDetalleFetchPlaca(null);
            setDetalleHeaderPreview(null);
            setDetalleFallbackContext(null);
          }}
          onEdit={(it) => {
            setMostrarModalDetalle(false);
            setActivoDetalleSeleccionado(null);
            setDetalleFetchPlaca(null);
            setDetalleHeaderPreview(null);
            setDetalleFallbackContext(null);
            handleAbrirEditarEquipo(it);
          }}
          onOpenQR={(it) => {
            // Cerrar modal de detalle y abrir QR transfiriendo el activo
            const itemActual = it || activoDetalleSeleccionado;
            if (!itemActual) return;
            setMostrarModalDetalle(false);
            setDetalleFetchPlaca(null);
            setDetalleHeaderPreview(null);
            setDetalleFallbackContext(null);
            setQrLoanItem({
              ...itemActual,
              code: itemActual.placa || itemActual.codigo || itemActual.id,
              placa: itemActual.placa || itemActual.codigo || itemActual.id,
              nombre: itemActual.nombre || itemActual.equipo || itemActual.name,
              name: itemActual.nombre || itemActual.equipo || itemActual.name,
              model: itemActual.modelo || itemActual.model,
              serial: itemActual.serial,
              sede: itemActual.sede || 'Medellín',
              estado: itemActual.estado || itemActual.status,
            });
          }}
        />
      )}

      {/* =========================================================================
          MODAL: EDITAR EQUIPO TECNOLÓGICO (DESDE DETALLE DE PRÉSTAMO)
          ========================================================================= */}
      {modalEditarEquipoOpen && equipoParaEditar && (
        <ModalEditarActivo
          isOpen={modalEditarEquipoOpen}
          onClose={() => {
            setModalEditarEquipoOpen(false);
            setEquipoParaEditar(null);
          }}
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
          MODAL: REGISTRAR NUEVO CUSTODIO / USUARIO RÁPIDO
          ========================================================================= */}
      {showNewUserModal && (
        <ModalNuevoUsuarioRapido
          isOpen={showNewUserModal}
          onClose={() => setShowNewUserModal(false)}
          onUserCreated={(newUser) => {
            const userCreado = crearUsuario ? crearUsuario(newUser) : newUser;
            if (targetModalForUser === 'loan') {
              setLoanPerson(userCreado.nombre);
              setLoanPersonDocumento(userCreado.documento);
              setLoanPersonEmail(userCreado.email);
              if (userCreado.sede) setLoanSede(userCreado.sede);
            } else if (targetModalForUser === 'editLoan') {
              setEditPerson(userCreado.nombre);
              if (userCreado.sede) setEditSede(userCreado.sede);
            } else {
              setDeliveryPerson(userCreado.nombre);
              setDeliveryPersonDocumento(userCreado.documento);
              setDeliveryPersonEmail(userCreado.email);
              if (userCreado.sede) setDeliverySede(userCreado.sede);
            }
            showInfo('Custodio Creado', `Usuario ${userCreado.nombre} registrado y seleccionado.`);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: REGISTRAR NUEVA SEDE / MUNICIPIO
          ========================================================================= */}
      {showSedeModal && (
        <ModalNuevaSede
          isOpen={showSedeModal}
          onClose={() => setShowSedeModal(false)}
          onSedeCreated={(nuevaS) => {
            const nombreS = nuevaS.nombre || nuevaS;
            setSedesList((prev) => Array.from(new Set([...prev, nombreS])));
            setLoanSede(nombreS);
            setDeliverySede(nombreS);
            if (propOnSedeCreated) {
              propOnSedeCreated(nuevaS);
            }
            showInfo('Sede Registrada', `Sede "${nombreS}" registrada exitosamente.`);
          }}
          onSedeUpdated={(sedeAct) => {
            const nombreNuevo = (sedeAct.nombre || sedeAct || '').trim();
            const nombreViejo = (sedeAct._prevNombre || sedeAct.nombre || '').trim();
            setSedesList((prev) => Array.from(new Set(prev.map((s) => ((s || '').trim().toLowerCase() === nombreViejo.toLowerCase() ? nombreNuevo : s)))));
            if (loanSede.trim().toLowerCase() === nombreViejo.toLowerCase()) setLoanSede(nombreNuevo);
            if (deliverySede.trim().toLowerCase() === nombreViejo.toLowerCase()) setDeliverySede(nombreNuevo);
            if (propOnSedeUpdated) {
              propOnSedeUpdated(sedeAct);
            }
            showInfo('Sede Actualizada', `Sede "${nombreNuevo}" actualizada exitosamente.`);
          }}
          sedes={sedesList}
        />
      )}

      {/* =========================================================================
          MODAL: REGISTRAR NUEVO PROYECTO STEAM
          ========================================================================= */}
      {showProyectoModal && (
        <ModalNuevoProyectoSteam
          isOpen={showProyectoModal}
          onClose={() => setShowProyectoModal(false)}
          sedes={sedesList}
          onProyectoCreated={(nuevoP) => {
            setProyectosList((prev) => [nuevoP, ...prev]);
            setLoanProyecto(nuevoP.nombre);
            setDeliveryProyecto(nuevoP.nombre);
            showInfo('Proyecto Creado', `Proyecto STEAM "${nuevoP.nombre}" registrado exitosamente.`);
          }}
          onProyectoUpdated={(actP) => {
            setProyectosList((prev) =>
              prev.map((p) =>
                (p.id && actP.id && p.id === actP.id) || p.nombre === actP.nombre ? { ...p, ...actP } : p
              )
            );
            showInfo('Proyecto Actualizado', `Proyecto STEAM "${actP.nombre}" actualizado exitosamente.`);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: CONFIRMAR RETORNO / DEVOLUCIÓN A BODEGA
          ========================================================================= */}
      <ModalConfirmarRetorno
        isOpen={modalRetornoOpen}
        onClose={() => {
          setModalRetornoOpen(false);
          setPrestamoParaRetorno(null);
        }}
        prestamo={prestamoParaRetorno}
        cargando={cargandoRetorno}
        confirmarRetorno={async () => {
          if (!prestamoParaRetorno) return;
          setCargandoRetorno(true);
          try {
            if (onReturnLoan) {
              await onReturnLoan(prestamoParaRetorno.id);
            }
            if (onRetry) {
              await onRetry();
            }
            showInfo(
              'Retorno Confirmado',
              `Equipo ${prestamoParaRetorno.equipo_nombre} (${prestamoParaRetorno.placa}) reintegrado a bodega.`
            );
            setModalRetornoOpen(false);
            setPrestamoParaRetorno(null);
          } catch (err) {
            showError('Error en Devolución', err.message || 'No fue posible confirmar el retorno.');
          } finally {
            setCargandoRetorno(false);
          }
        }}
      />

      {/* =========================================================================
          MODAL: GESTIÓN Y APROBACIÓN DE SOLICITUDES ENTRANTES (ADMIN / SUPERVISOR)
          ========================================================================= */}
      {modalGestionOpen && solicitudParaGestionar && (
        <ModalGestionSolicitud
          isOpen={modalGestionOpen}
          onClose={() => {
            setModalGestionOpen(false);
            setSolicitudParaGestionar(null);
          }}
          solicitud={solicitudParaGestionar}
          items={items}
          onSolicitudResolved={async (solicitudActualizada) => {
            // Actualizar la lista local de solicitudes
            setSolicitudesList((prev) =>
              prev.map((s) => (String(s.id) === String(solicitudActualizada.id) ? { ...s, ...solicitudActualizada } : s))
            );
            // Si hay callback de recarga de datos globales, invocarlo
            if (onRetry) {
              await onRetry();
            }
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* =========================================================================
          MODAL: DETALLE DE MOTIVO DE RECHAZO (HOMOLOGADO CON VISTA USUARIO)
          ========================================================================= */}
      {modalMotivoRechazo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '16px',
          }}
          onClick={() => setModalMotivoRechazo(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface, #1e293b)',
              borderRadius: '16px',
              border: '1px solid var(--line, #334155)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              color: 'var(--text, #f8fafc)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--line, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                  }}
                >
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                    Motivo del Rechazo
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)' }}>
                    Retroalimentación registrada por Administración
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  lineHeight: 1,
                }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--line, #334155)',
                }}
              >
                <span style={{ color: 'var(--text-dim, #94a3b8)' }}>Sede solicitante:</span>
                <span style={{ fontWeight: 600 }}>{modalMotivoRechazo.solicitud?.sede || 'Medellín'}</span>
              </div>

              {modalMotivoRechazo.solicitud?.usuario_nombre && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--line, #334155)',
                  }}
                >
                  <span style={{ color: 'var(--text-dim, #94a3b8)' }}>Custodio solicitante:</span>
                  <span style={{ fontWeight: 600 }}>{modalMotivoRechazo.solicitud.usuario_nombre}</span>
                </div>
              )}

              {modalMotivoRechazo.solicitud?.motivo && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: 'var(--text-dim, #94a3b8)' }}>Propósito original de la solicitud:</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text, #f8fafc)' }}>
                    "{modalMotivoRechazo.solicitud.motivo}"
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ef4444' }}>
                  Nota / Justificación del Administrador:
                </label>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'var(--text, #f8fafc)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {modalMotivoRechazo.motivo}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--line, #334155)',
                backgroundColor: 'var(--surface-2, #0b1320)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                className="btn"
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#84CC16',
                  color: '#020617',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
