import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  PackagePlus,
  Search,
  Building2,
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  Receipt,
  FileCheck,
  PackageCheck,
  Send,
  X,
  Layers,
  ArrowRight,
  Sparkles,
  User,
  MapPin,
  Calendar,
  FolderKanban,
  Store,
  Quote,
} from 'lucide-react';
import ProgramAreaBadge from '../components/common/ProgramAreaBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import inventoryApi from '../services/inventoryApi';
import { fmtDate, today } from '../services/mockData';
import { useProyectos } from '../hooks/useProyectos';
import { normalizeProyectoNombre } from '../constants/proyectos';
import { getProveedoresRecomendados } from '../services/proveedoresService';
import ModalProveedoresRecomendados from '../components/modals/ModalProveedoresRecomendados';
import { registrarAuditoria } from '../services/historyAuditService';
import ExcelJS from 'exceljs';

// Muestras de prueba para el flujo de compras en caso de arranque sin datos en Supabase
const SOLICITUDES_COMPRA_DEMO = [
  {
    id: 'SC-2026-001',
    radicado: 'SC-2026-001',
    solicitante_nombre: 'Santiago Suárez Durán',
    solicitante_documento: '1038648135',
    solicitante_correo: 'santiago.suarez@fundaorth.org',
    solicitante_telefono: '300 123 4567',
    sede_destino: 'Medellín',
    proyecto_steam: 'Semilleros de Robótica Educativa',
    fecha_requerida: '2026-11-25',
    justificacion: 'Requerido para taller de programación de microcontroladores y sensores con jóvenes de secundaria.',
    items: [
      {
        nombre: 'Kit de Sensores 37 en 1 Arduino',
        categoria_sugerida: 'Consumibles de Robótica',
        cantidad_solicitada: 6,
        cantidad_aprobada: 6,
        precio_estimado_unitario: 85000,
        url_compra: 'https://articulo.mercadolibre.com.co/sensor-37-in-1',
      },
      {
        nombre: 'Cables Jumper Macho-Hembra 20cm (Paq x 40)',
        categoria_sugerida: 'Consumibles de Robótica',
        cantidad_solicitada: 12,
        cantidad_aprobada: 12,
        precio_estimado_unitario: 12000,
        url_compra: 'https://articulo.mercadolibre.com.co/jumper-cables',
      },
    ],
    estado: 'Pendiente',
    evaluado_por: null,
    fecha_evaluacion: null,
    observaciones_coordinador: '',
    valor_estimado_compra: 654000,
    proveedor: '',
    numero_factura_orden: '',
    fecha_compra: null,
    ingresado_inventario: false,
    creado_en: '2026-11-18T10:30:00Z',
  },
  {
    id: 'SC-2026-002',
    radicado: 'SC-2026-002',
    solicitante_nombre: 'Carolina Gómez',
    solicitante_documento: '43987123',
    solicitante_correo: 'carolina.gomez@fundaorth.org',
    solicitante_telefono: '312 987 6543',
    sede_destino: 'El Carmen de Viboral',
    proyecto_steam: 'Aulas Conectadas STEAM',
    fecha_requerida: '2026-11-28',
    justificacion: 'Materiales didácticos de papelería e insumos para el arranque del ciclo de laboratorios TeachLabs.',
    items: [
      {
        nombre: 'Resma de Papel Bond Carta 75g (Caja x 5)',
        categoria_sugerida: 'Papelería',
        cantidad_solicitada: 4,
        cantidad_aprobada: 4,
        precio_estimado_unitario: 95000,
        url_compra: 'https://panamericana.com.co/resma-bond',
      },
      {
        nombre: 'Marcadores Borrables para Tablero (Caja x 12 surtidos)',
        categoria_sugerida: 'Papelería',
        cantidad_solicitada: 6,
        cantidad_aprobada: 6,
        precio_estimado_unitario: 38000,
        url_compra: 'https://panamericana.com.co/marcadores-tablero',
      },
    ],
    estado: 'Aprobada',
    evaluado_por: 'Carolina Gómez (Coordinadora)',
    fecha_evaluacion: '2026-11-19T14:15:00Z',
    observaciones_coordinador: 'Aprobado 100% de los insumos según cupo presupuestal asignado a TeachLabs sede Carmen.',
    valor_estimado_compra: 608000,
    proveedor: 'Panamericana Librería y Papelería S.A.',
    numero_factura_orden: '',
    fecha_compra: null,
    ingresado_inventario: false,
    creado_en: '2026-11-17T09:00:00Z',
  },
  {
    id: 'SC-2026-003',
    radicado: 'SC-2026-003',
    solicitante_nombre: 'Juan Camilo Pérez',
    solicitante_documento: '1017234567',
    solicitante_correo: 'juan.perez@fundaorth.org',
    solicitante_telefono: '315 444 8899',
    sede_destino: 'Medellín',
    proyecto_steam: 'Clubes de Innovación y Electrónica',
    fecha_requerida: '2026-11-20',
    justificacion: 'Adquisición de hubs USB multipuerto tipo C para salas de cómputo y formación docente.',
    items: [
      {
        nombre: 'Hub USB-C 7 en 1 HDMI 4K',
        categoria_sugerida: 'Equipos de Electrónica',
        cantidad_solicitada: 3,
        cantidad_aprobada: 3,
        precio_estimado_unitario: 110000,
        url_compra: 'https://amazon.com/usb-c-hub',
      },
    ],
    estado: 'Comprada',
    evaluado_por: 'Carolina Gómez (Coordinadora)',
    fecha_evaluacion: '2026-11-15T11:00:00Z',
    observaciones_coordinador: 'Aprobado para dotación de portátiles institucionales.',
    valor_estimado_compra: 330000,
    valor_final_compra: 325000,
    proveedor: 'Tecnología Global Medellín SAS',
    numero_factura_orden: 'FAC-2026-8819',
    fecha_compra: '2026-11-18',
    ingresado_inventario: true,
    creado_en: '2026-11-14T08:20:00Z',
  },
];

// Normalizar estado crudo de la BD para pestañas y conteos
export const normalizeEstado = (st) => {
  const s = String(st || '').trim().toUpperCase();
  if (s === 'PENDIENTE' || s === 'EN_EVALUACION' || s === 'EN EVALUACIÓN' || s === 'EN EVALUACION') return 'pendientes';
  if (s === 'APROBADA' || s === 'APROBADO' || s === 'APROBADO_COMPRA' || s === 'APROBADA PARA COMPRA') return 'aprobadas';
  if (s === 'COMPRADA' || s === 'COMPRADO' || s === 'ENTREGADO_DIRECTO' || s === 'ENTREGADA') return 'compradas';
  if (s === 'RECHAZADA' || s === 'RECHAZADO') return 'rechazadas';
  return 'pendientes';
};

// Formato amigable y consistente de código radicado (conciso, sin desbordamiento de UUIDs)
export const formatRadicado = (id, radicado) => {
  const val = String(radicado || id || '').trim();
  if (!val) return 'SC-FMO';
  // Formatos ya humanizados de catálogo o series (ej. SC-2026-001 o #001)
  if (/^SC-\d{4}-\d+/i.test(val)) return val.toUpperCase();
  if (/^#?[A-Z]{2,4}-\d{3,4}$/i.test(val)) return val.toUpperCase();
  // Limpiar prefijos para recortar hash/UUID a 8 caracteres legibles
  const clean = val.replace(/^#|^SC-|^SOL-/i, '').replace(/-/g, '');
  const shortHash = clean.length > 8 ? clean.slice(0, 8) : clean;
  return `SC-${shortHash.toUpperCase()}`;
};

// 100% Robust extractors de datos de solicitud (compatibles con Supabase, mockData y modales)
export const getSolNombre = (sol) => {
  if (!sol) return 'Docente FMO';
  const val = sol.solicitante_nombre || sol.usuario_nombre || sol.solicitante || sol.nombre || sol.docente;
  if (val && String(val).trim()) return String(val).trim();
  return 'Docente FMO';
};

export const getSolSede = (sol) => {
  if (!sol) return 'Medellín';
  const val = sol.sede_destino || sol.sede || sol.ubicacion;
  if (val && String(val).trim()) return String(val).trim();
  return 'Medellín';
};

export const getSolProyecto = (sol) => {
  if (!sol) return 'Robótica Educativa';
  const val = sol.proyecto_steam || sol.proyecto_steam_id || sol.proyecto;
  if (val && String(val).trim()) return normalizeProyectoNombre(String(val).trim());
  return 'Robótica Educativa';
};

export const getSolFecha = (sol) => {
  if (!sol) return today();
  return sol.fecha_requerida || sol.fecha_devolucion_estimada || sol.creado_en || today();
};

export const getSolJustificacion = (sol) => {
  if (!sol) return 'Requerimiento pedagógico para proyectos de formación formativa STEAM.';
  const val = sol.justificacion || sol.motivo || sol.descripcion;
  if (val && String(val).trim()) return String(val).trim();
  return 'Requerimiento pedagógico para proyectos de formación formativa STEAM.';
};

export const getSolItems = (sol) => {
  if (!sol) return [];
  if (Array.isArray(sol.items) && sol.items.length > 0) return sol.items;
  if (Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0) return sol.items_solicitud;
  if (sol.nombre_producto) {
    return [
      {
        nombre: sol.nombre_producto,
        categoria_sugerida: formatCategoriaDestino(sol.categoria_destino || 'consumibles'),
        categoria_destino: getCategoriaSlug(sol.categoria_destino || 'consumibles'),
        cantidad_solicitada: Number(sol.cantidad) || 1,
        cantidad_aprobada: sol.cantidad_aprobada !== undefined ? Number(sol.cantidad_aprobada) : Number(sol.cantidad) || 1,
        precio_estimado_unitario: Number(sol.precio_estimado) || 0,
        url_compra: sol.url_compra || '',
      },
    ];
  }
  if (sol.motivo) {
    return [
      {
        nombre: sol.motivo,
        categoria_sugerida: 'Consumibles de Robótica',
        cantidad_solicitada: 1,
        cantidad_aprobada: 1,
        precio_estimado_unitario: Number(sol.valor_estimado_compra) || 0,
        url_compra: '',
      },
    ];
  }
  return [];
};

// Formateador y mapeador estricto para las 3 Categorías Destino (SIGA-FMO)
export const formatCategoriaDestino = (cat) => {
  const norm = String(cat || '').toLowerCase().trim();
  if (norm === 'electronica' || norm.includes('electrónica') || norm.includes('electronica')) {
    return 'Equipos de Electrónica';
  }
  if (norm === 'papeleria' || norm.includes('papelería') || norm.includes('papeleria')) {
    return 'Papelería';
  }
  return 'Consumibles de Robótica';
};

export const getCategoriaSlug = (cat) => {
  const norm = String(cat || '').toLowerCase().trim();
  if (norm === 'electronica' || norm.includes('electrónica') || norm.includes('electronica')) {
    return 'electronica';
  }
  if (norm === 'papeleria' || norm.includes('papelería') || norm.includes('papeleria')) {
    return 'papeleria';
  }
  return 'consumibles';
};

export const getCategoriaBadgeStyle = (cat) => {
  const slug = getCategoriaSlug(cat);
  if (slug === 'electronica') {
    return {
      backgroundColor: 'rgba(0, 180, 216, 0.12)',
      color: '#0284c7',
      border: '1px solid rgba(0, 180, 216, 0.35)',
    };
  }
  if (slug === 'papeleria') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#b45309',
      border: '1px solid rgba(245, 158, 11, 0.35)',
    };
  }
  return {
    backgroundColor: 'rgba(171, 208, 55, 0.15)',
    color: '#4d7c0f',
    border: '1px solid rgba(171, 208, 55, 0.35)',
  };
};

// Configuración visual y semántica de estados según Sistema de Marca FMO
export const getEstadoBadgeConfig = (rawEstado) => {
  const norm = String(rawEstado || '').trim().toUpperCase();

  if (norm === 'PENDIENTE') {
    return {
      label: 'Pendiente',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(245, 158, 11, 0.14)',
        color: '#b45309',
        border: '1px solid rgba(245, 158, 11, 0.4)',
      },
      Icon: Clock,
    };
  }
  if (norm === 'EN_EVALUACION' || norm === 'EN EVALUACIÓN' || norm === 'EN EVALUACION') {
    return {
      label: 'En Evaluación',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(44, 172, 208, 0.14)',
        color: '#0284c7',
        border: '1px solid rgba(44, 172, 208, 0.4)',
      },
      Icon: Sparkles,
    };
  }
  if (norm === 'APROBADO_COMPRA' || norm === 'APROBADA' || norm === 'APROBADO' || norm === 'APROBADA PARA COMPRA') {
    return {
      label: 'Aprobada (Compra)',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(123, 44, 191, 0.12)',
        color: '#7b2cbf',
        border: '1px solid rgba(123, 44, 191, 0.35)',
      },
      Icon: CheckCircle2,
    };
  }
  if (norm === 'ENTREGADO_DIRECTO' || norm === 'ENTREGADA') {
    return {
      label: 'Entregada',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        color: '#047857',
        border: '1px solid rgba(16, 185, 129, 0.4)',
      },
      Icon: PackageCheck,
    };
  }
  if (norm === 'COMPRADA' || norm === 'COMPRADO') {
    return {
      label: 'Comprada',
      badgeClass: 'bg-lime-100 text-emerald-900 border-lime-400 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(171, 208, 55, 0.22)',
        color: '#365314',
        border: '1px solid rgba(171, 208, 55, 0.6)',
      },
      Icon: PackageCheck,
    };
  }
  if (norm === 'RECHAZADA' || norm === 'RECHAZADO') {
    return {
      label: 'Rechazada',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/50',
      badgeStyle: {
        backgroundColor: 'rgba(244, 63, 94, 0.14)',
        color: '#be123c',
        border: '1px solid rgba(244, 63, 94, 0.4)',
      },
      Icon: XCircle,
    };
  }

  // Fallback
  return {
    label: rawEstado || 'Pendiente',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    badgeStyle: {
      backgroundColor: 'rgba(109, 110, 113, 0.1)',
      color: 'var(--text-dim, #6d6e71)',
      border: '1px solid var(--line, #e2e8f0)',
    },
    Icon: Clock,
  };
};

export default function GestionComprasView({
  itemsInventario = [],
  onNavigate,
  initialTab = 'todas',
}) {
  const { currentUser, isCoordinador, isAdmin } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  // Estados del listado de solicitudes de compra
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros reactivos
  const [pestanaActiva, setPestanaActiva] = useState(initialTab || 'todas'); // 'todas' | 'pendientes' | 'aprobadas' | 'compradas' | 'rechazadas'
  const [busqueda, setBusqueda] = useState('');
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroProyecto, setFiltroProyecto] = useState('todos');
  const { proyectos: proyectosSteamList, formatLabel: formatProyectoLabel } = useProyectos();

  useEffect(() => {
    if (initialTab) {
      setPestanaActiva(initialTab);
    }
  }, [initialTab]);

  // Modales
  const [modalEvaluarOpen, setModalEvaluarOpen] = useState(false);
  const [solicitudAEvaluar, setSolicitudAEvaluar] = useState(null);

  const [modalRegistrarCompraOpen, setModalRegistrarCompraOpen] = useState(false);
  const [solicitudAComprar, setSolicitudAComprar] = useState(null);

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [solicitudDetalle, setSolicitudDetalle] = useState(null);

  // Modal Directorio de Proveedores Recomendados
  const [modalProveedoresOpen, setModalProveedoresOpen] = useState(false);
  const [proveedoresCount, setProveedoresCount] = useState(0);

  // Cargar conteo de proveedores recomendados y suscribirse a actualizaciones
  useEffect(() => {
    let mounted = true;
    const fetchProveedoresCount = async () => {
      try {
        const list = await getProveedoresRecomendados();
        if (mounted) {
          setProveedoresCount(Array.isArray(list) ? list.length : 0);
        }
      } catch (err) {
        console.error('[GestionComprasView] Error al obtener conteo de proveedores:', err);
      }
    };

    fetchProveedoresCount();

    const handleProveedoresChanged = () => {
      fetchProveedoresCount();
    };

    window.addEventListener('siga:proveedores_changed', handleProveedoresChanged);
    return () => {
      mounted = false;
      window.removeEventListener('siga:proveedores_changed', handleProveedoresChanged);
    };
  }, []);

  // Estados del formulario de evaluación
  const [evalDecision, setEvalDecision] = useState('Aprobada');
  const [evalObservaciones, setEvalObservaciones] = useState('');
  const [evalPresupuesto, setEvalPresupuesto] = useState('');
  const [evalCantidadesAprobadas, setEvalCantidadesAprobadas] = useState({});
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  // Estados del formulario de registro de compra
  const [compraProveedor, setCompraProveedor] = useState('');
  const [compraValorFinal, setCompraValorFinal] = useState('');
  const [compraFactura, setCompraFactura] = useState('');
  const [compraFecha, setCompraFecha] = useState(today());
  const [compraNotas, setCompraNotas] = useState('');
  const [compraSubmitting, setCompraSubmitting] = useState(false);

  // Identificador estricto de solicitudes de compra (compatible con solicitudes_compra y solicitudes_inventario)
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
      Boolean(s.is_solicitud_compra) ||
      items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || String(i.tipo_item || '').toLowerCase() === 'compra') ||
      (s.motivo && (
        s.motivo.toLowerCase().includes('compra') ||
        s.motivo.toLowerCase().includes('batería') ||
        s.motivo.toLowerCase().includes('bateria') ||
        s.motivo.toLowerCase().includes('lipo')
      )) ||
      (s.justificacion && s.justificacion.toLowerCase().includes('compra'))
    );
  };

  // 1. Carga unificada de compras desde Supabase (solicitudes_compra + solicitudes_inventario con items)
  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      let dataFinal = [];

      try {
        const { supabase } = await import('../services/supabase');
        if (supabase) {
          let invList = [];
          let compList = [];

          // 1.1 Consultar solicitudes_inventario con sus items_solicitud
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
              invList = invData
                .filter(esSolicitudCompra)
                .map((s) => {
                  const solItems = (s.items_solicitud || []).map((it) => {
                    const cDest = getCategoriaSlug(it.categoria_sugerida || it.categoria_destino || s.categoria_destino);
                    const cNom = formatCategoriaDestino(it.categoria_sugerida || it.categoria_destino || s.categoria_destino);
                    return {
                      id: it.id,
                      nombre: it.nombre_sugerido || it.nombre_item || it.nombre || 'Producto sugerido',
                      nombre_sugerido: it.nombre_sugerido || it.nombre_item || it.nombre || 'Producto sugerido',
                      cantidad_solicitada: Number(it.cantidad) || 1,
                      cantidad: Number(it.cantidad) || 1,
                      cantidad_aprobada: it.cantidad_aprobada !== undefined ? it.cantidad_aprobada : Number(it.cantidad) || 1,
                      categoria_sugerida: cNom,
                      categoria_destino: cDest,
                      precio_estimado_unitario: Number(it.precio_estimado) || 0,
                      precio_estimado: Number(it.precio_estimado) || 0,
                      url_compra: it.url_compra || '',
                      ingresado_inventario: Boolean(it.ingresado_inventario),
                    };
                  });

                  const itemsFinales = solItems.length > 0 ? solItems : (
                    s.motivo || s.justificacion ? [{
                      id: `${s.id}-item`,
                      nombre: s.motivo || s.justificacion || 'Insumo pedagógico sugerido',
                      nombre_sugerido: s.motivo || s.justificacion || 'Insumo pedagógico sugerido',
                      cantidad_solicitada: 1,
                      cantidad_aprobada: 1,
                      precio_estimado_unitario: 0,
                      categoria_sugerida: formatCategoriaDestino(s.categoria_destino || 'consumibles'),
                      categoria_destino: getCategoriaSlug(s.categoria_destino || 'consumibles'),
                      url_compra: '',
                      ingresado_inventario: false,
                    }] : []
                  );

                  return {
                    ...s,
                    is_solicitud_compra: false,
                    radicado: s.radicado || s.id,
                    solicitante_nombre: s.solicitante_nombre || s.usuario_nombre || s.nombre || 'Docente FMO',
                    usuario_nombre: s.usuario_nombre || s.solicitante_nombre || s.nombre || 'Docente FMO',
                    solicitante_correo: s.solicitante_correo || s.usuario_correo || s.correo || '',
                    solicitante_documento: s.solicitante_documento || s.usuario_documento || s.documento || '',
                    solicitante_telefono: s.solicitante_telefono || s.usuario_telefono || s.telefono || '',
                    sede: s.sede_destino || s.sede || 'Medellín',
                    sede_destino: s.sede_destino || s.sede || 'Medellín',
                    proyecto_steam: s.proyecto_steam || s.proyecto_steam_id || s.proyecto || 'Robótica',
                    categoria_destino: getCategoriaSlug(s.categoria_destino || itemsFinales[0]?.categoria_destino),
                    categoria_nombre: formatCategoriaDestino(s.categoria_destino || itemsFinales[0]?.categoria_sugerida),
                    justificacion: s.justificacion || s.motivo || 'Requerimiento pedagógico institucional STEAM',
                    motivo: s.motivo || s.justificacion || 'Requerimiento pedagógico institucional STEAM',
                    fecha_requerida: s.fecha_requerida || s.fecha_devolucion_estimada || s.creado_en || today(),
                    items: itemsFinales,
                    items_solicitud: itemsFinales,
                    tipo: s.tipo_solicitud || 'SUGERENCIA_COMPRA',
                    tipo_solicitud: s.tipo_solicitud || 'SUGERENCIA_COMPRA',
                  };
                });
            }
          } catch (eInv) {
            console.warn('Aviso consulta solicitudes_inventario en GestionCompras:', eInv.message);
          }

          // 1.2 Consultar tabla dedicada solicitudes_compra
          try {
            const { data: cData, error: cErr } = await supabase
              .from('solicitudes_compra')
              .select('*')
              .order('creado_en', { ascending: false });

            if (!cErr && Array.isArray(cData)) {
              compList = cData.map((sc) => {
                const catDestinoSlug = getCategoriaSlug(sc.categoria_destino);
                const catDestinoNombre = formatCategoriaDestino(sc.categoria_destino);
                const singleItem = {
                  id: sc.id,
                  solicitud_id: sc.id,
                  tipo_item: 'compra',
                  item_id: sc.item_inventario_id || null,
                  nombre: sc.nombre_producto || sc.justificacion || 'Producto sugerido',
                  nombre_item: sc.nombre_producto || sc.justificacion || 'Producto sugerido',
                  nombre_sugerido: sc.nombre_producto || sc.justificacion || 'Producto sugerido',
                  categoria_sugerida: catDestinoNombre,
                  categoria_destino: catDestinoSlug,
                  url_compra: sc.url_compra || '',
                  precio_estimado_unitario: Number(sc.precio_estimado) || 0,
                  precio_estimado: Number(sc.precio_estimado) || 0,
                  cantidad_solicitada: Number(sc.cantidad) || 1,
                  cantidad_aprobada: sc.cantidad_aprobada !== undefined ? sc.cantidad_aprobada : Number(sc.cantidad) || 1,
                  cantidad: Number(sc.cantidad) || 1,
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                };

                let itemsList = [];
                if (Array.isArray(sc.items) && sc.items.length > 0) {
                  itemsList = sc.items.map((it, idx) => ({
                    id: it.id || `${sc.id}-${idx}`,
                    nombre: it.nombre || it.nombre_sugerido || it.nombre_producto || it.nombre_item || sc.nombre_producto || 'Producto sugerido',
                    nombre_sugerido: it.nombre_sugerido || it.nombre || it.nombre_producto || sc.nombre_producto || 'Producto sugerido',
                    cantidad_solicitada: Number(it.cantidad_solicitada || it.cantidad || sc.cantidad) || 1,
                    cantidad_aprobada: it.cantidad_aprobada !== undefined ? Number(it.cantidad_aprobada) : Number(it.cantidad_solicitada || it.cantidad || sc.cantidad) || 1,
                    precio_estimado_unitario: Number(it.precio_estimado_unitario || it.precio_estimado || sc.precio_estimado) || 0,
                    categoria_sugerida: formatCategoriaDestino(it.categoria_sugerida || it.categoria_destino || sc.categoria_destino),
                    categoria_destino: getCategoriaSlug(it.categoria_destino || it.categoria_sugerida || sc.categoria_destino),
                    url_compra: it.url_compra || sc.url_compra || '',
                    ingresado_inventario: Boolean(it.ingresado_inventario || sc.ingresado_inventario),
                  }));
                } else if (typeof sc.items === 'string') {
                  try {
                    const parsed = JSON.parse(sc.items);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      itemsList = parsed.map((it, idx) => ({
                        id: it.id || `${sc.id}-${idx}`,
                        nombre: it.nombre || it.nombre_sugerido || it.nombre_producto || it.nombre_item || sc.nombre_producto || 'Producto sugerido',
                        nombre_sugerido: it.nombre_sugerido || it.nombre || it.nombre_producto || sc.nombre_producto || 'Producto sugerido',
                        cantidad_solicitada: Number(it.cantidad_solicitada || it.cantidad || sc.cantidad) || 1,
                        cantidad_aprobada: it.cantidad_aprobada !== undefined ? Number(it.cantidad_aprobada) : Number(it.cantidad_solicitada || it.cantidad || sc.cantidad) || 1,
                        precio_estimado_unitario: Number(it.precio_estimado_unitario || it.precio_estimado || sc.precio_estimado) || 0,
                        categoria_sugerida: formatCategoriaDestino(it.categoria_sugerida || it.categoria_destino || sc.categoria_destino),
                        categoria_destino: getCategoriaSlug(it.categoria_destino || it.categoria_sugerida || sc.categoria_destino),
                        url_compra: it.url_compra || sc.url_compra || '',
                        ingresado_inventario: Boolean(it.ingresado_inventario || sc.ingresado_inventario),
                      }));
                    }
                  } catch (_) {}
                }

                if (itemsList.length === 0) {
                  itemsList = [singleItem];
                }

                return {
                  id: sc.id,
                  radicado: sc.radicado || sc.numero_orden || sc.id,
                  usuario_id: sc.usuario_id,
                  usuario_nombre: sc.usuario_nombre || sc.solicitante_nombre || 'Docente FMO',
                  solicitante_nombre: sc.solicitante_nombre || sc.usuario_nombre || 'Docente FMO',
                  solicitante_correo: sc.solicitante_correo || sc.usuario_correo || sc.correo || '',
                  solicitante_documento: sc.solicitante_documento || '',
                  solicitante_telefono: sc.solicitante_telefono || '',
                  sede: sc.sede || sc.sede_destino || 'Medellín',
                  sede_destino: sc.sede_destino || sc.sede || 'Medellín',
                  proyecto_steam: sc.proyecto_steam || sc.proyecto_steam_id || sc.proyecto || 'Robótica',
                  tipo: 'SUGERENCIA_COMPRA',
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  tipoSolicitud: 'SUGERENCIA_COMPRA',
                  categoria_destino: catDestinoSlug,
                  categoria_nombre: catDestinoNombre,
                  fecha_requerida: sc.fecha_requerida || sc.creado_en || today(),
                  fecha_devolucion_estimada: sc.fecha_requerida || sc.creado_en || today(),
                  motivo: sc.justificacion || 'Sugerencia de compra',
                  justificacion: sc.justificacion || 'Sugerencia de compra',
                  estado: sc.estado || 'PENDIENTE',
                  prioridad: sc.prioridad || 'Media',
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                  item_inventario_id: sc.item_inventario_id || null,
                  observaciones_admin: sc.observaciones_admin || null,
                  observaciones_coordinador: sc.observaciones_coordinador || null,
                  evaluado_por: sc.evaluado_por || null,
                  fecha_evaluacion: sc.fecha_evaluacion || null,
                  proveedor: sc.proveedor || '',
                  numero_factura_orden: sc.numero_factura_orden || '',
                  fecha_compra: sc.fecha_compra || null,
                  valor_final_compra: Number(sc.valor_final_compra || sc.valor_total_compra) || 0,
                  valor_estimado_compra: Number(sc.valor_estimado_compra) || (Number(sc.precio_estimado) * Number(sc.cantidad)) || 0,
                  observaciones_compra: sc.observaciones_compra || '',
                  creado_en: sc.creado_en,
                  created_at: sc.creado_en,
                  fecha_radicado: sc.creado_en ? String(sc.creado_en).slice(0, 10) : '',
                  is_solicitud_compra: true,
                  items: itemsList,
                  items_solicitud: itemsList,
                };
              });
            }
          } catch (eComp) {
            console.warn('Aviso consulta solicitudes_compra en GestionCompras:', eComp.message);
          }

          dataFinal = [...compList, ...invList].sort(
            (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
          );
        }
      } catch (errSup) {
        console.warn('Aviso consulta directa Supabase en GestionComprasView:', errSup.message);
      }

      if (dataFinal.length > 0) {
        setSolicitudes(dataFinal);
        syncLocal(dataFinal);
      } else {
        // Fallback a API o localStorage o DEMO
        const apiData = await inventoryApi.getSolicitudesCompra();
        if (Array.isArray(apiData) && apiData.length > 0) {
          setSolicitudes(apiData);
        } else {
          const cached = localStorage.getItem('siga_solicitudes_compra');
          if (cached) {
            try {
              setSolicitudes(JSON.parse(cached));
            } catch {
              setSolicitudes(SOLICITUDES_COMPRA_DEMO);
            }
          } else {
            setSolicitudes(SOLICITUDES_COMPRA_DEMO);
            localStorage.setItem('siga_solicitudes_compra', JSON.stringify(SOLICITUDES_COMPRA_DEMO));
          }
        }
      }
    } catch (err) {
      console.warn('Fallback al cargar solicitudes de compra:', err.message);
      setSolicitudes(SOLICITUDES_COMPRA_DEMO);
    } finally {
      setLoading(false);
    }
  };

  // Suscripción Realtime a cambios en solicitudes para sincronización inmediata
  useEffect(() => {
    cargarSolicitudes();

    let canal = null;
    (async () => {
      try {
        const { supabase } = await import('../services/supabase');
        if (supabase) {
          canal = supabase
            .channel('cambios-compras-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_compra' }, () => {
              cargarSolicitudes();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_inventario' }, () => {
              cargarSolicitudes();
            })
            .subscribe();
        }
      } catch (e) {
        console.warn('Aviso suscripción Realtime en compras:', e);
      }
    })();

    const handleSolicitudCambio = () => cargarSolicitudes();
    window.addEventListener('siga:solicitud_creada', handleSolicitudCambio);
    window.addEventListener('siga:solicitud_resuelta', handleSolicitudCambio);

    return () => {
      if (canal) {
        import('../services/supabase')
          .then(({ supabase }) => {
            if (supabase) supabase.removeChannel(canal);
          })
          .catch(() => {});
      }
      window.removeEventListener('siga:solicitud_creada', handleSolicitudCambio);
      window.removeEventListener('siga:solicitud_resuelta', handleSolicitudCambio);
    };
  }, []);

  // Extraer UUID puro (36 caracteres) para evitar colisiones con radicados formateados
  const getCleanUuid = (val) => {
    if (!val) return '';
    const str = String(val).trim();
    const match = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    return match ? match[0] : str;
  };

  // Persistir actualización en la tabla adecuada de Supabase (solicitudes_compra o solicitudes_inventario)
  const persistirCambioSolicitud = async (sol, patch) => {
    const targetUuid = getCleanUuid(sol.id || sol.solicitud_id);
    if (!targetUuid) {
      throw new Error('Identificador único inválido para actualizar la solicitud en Supabase.');
    }

    const { supabase } = await import('../services/supabase');
    if (!supabase) {
      throw new Error('No se pudo inicializar la conexión con Supabase.');
    }

    if (sol.is_solicitud_compra !== false) {
      const { data, error } = await supabase
        .from('solicitudes_compra')
        .update(patch)
        .eq('id', targetUuid)
        .select();

      if (error) {
        console.error('[GestionCompras] Error persistencia solicitudes_compra:', error);
        throw new Error(error.message || 'Error al persistir cambios en Supabase');
      }

      if (!data || data.length === 0) {
        console.error('[GestionCompras] 0 filas afectadas en solicitudes_compra para id:', targetUuid);
        throw new Error(`No se encontró el registro con ID ${targetUuid} en Supabase o no hubo cambios aplicados.`);
      }

      try {
        await inventoryApi.updateSolicitudCompra(targetUuid, patch);
      } catch (_) {}

      return data[0];
    } else {
      const invPatch = {
        estado: patch.estado,
        observaciones_admin: patch.observaciones_coordinador || patch.observaciones_compra || null,
      };
      const { data, error } = await supabase
        .from('solicitudes_inventario')
        .update(invPatch)
        .eq('id', targetUuid)
        .select();

      if (error) {
        console.error('[GestionCompras] Error persistencia solicitudes_inventario:', error);
        throw new Error(error.message || 'Error al persistir cambios en solicitudes_inventario');
      }

      if (!data || data.length === 0) {
        console.error('[GestionCompras] 0 filas afectadas en solicitudes_inventario para id:', targetUuid);
        throw new Error(`No se encontró el registro con ID ${targetUuid} en solicitudes_inventario.`);
      }

      try {
        await inventoryApi.updateSolicitudCompra(targetUuid, patch);
      } catch (_) {}

      return data[0];
    }
  };

  // Guardar en caché local ante cada cambio
  const syncLocal = (nuevas) => {
    setSolicitudes(nuevas);
    try {
      localStorage.setItem('siga_solicitudes_compra', JSON.stringify(nuevas));
    } catch (e) {
      console.warn('Error al guardar cache compras:', e);
    }
  };

  // Conteo dinámico de solicitudes por pestaña
  const conteos = useMemo(() => {
    const list = solicitudes || [];
    return {
      todas: list.length,
      pendientes: list.filter((s) => normalizeEstado(s.estado) === 'pendientes').length,
      aprobadas: list.filter((s) => normalizeEstado(s.estado) === 'aprobadas').length,
      compradas: list.filter((s) => normalizeEstado(s.estado) === 'compradas').length,
      rechazadas: list.filter((s) => normalizeEstado(s.estado) === 'rechazadas').length,
    };
  }, [solicitudes]);

  // Filtrado de solicitudes según pestaña activa y criterios de búsqueda
  const solicitudesFiltradas = useMemo(() => {
    return (solicitudes || []).filter((sol) => {
      // Filtro pestaña
      if (pestanaActiva !== 'todas' && normalizeEstado(sol.estado) !== pestanaActiva) {
        return false;
      }

      // Filtro Sede
      if (filtroSede !== 'todas') {
        const sedeSol = getSolSede(sol).toLowerCase().trim();
        const sedeFiltro = filtroSede.toLowerCase().trim();
        if (!sedeSol.includes(sedeFiltro) && !sedeFiltro.includes(sedeSol)) {
          return false;
        }
      }

      // Filtro Proyecto STEAM (Unificado)
      if (filtroProyecto !== 'todos') {
        const canonicalSol = normalizeProyectoNombre(getSolProyecto(sol));
        const canonicalFiltro = normalizeProyectoNombre(filtroProyecto);
        if (canonicalSol !== canonicalFiltro && getSolProyecto(sol) !== filtroProyecto) {
          return false;
        }
      }

      // Búsqueda libre
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const items = getSolItems(sol);
        const texto = [
          formatRadicado(sol.id, sol.radicado),
          sol.radicado,
          sol.id,
          getSolNombre(sol),
          sol.solicitante_correo || sol.correo || '',
          getSolSede(sol),
          getSolProyecto(sol),
          sol.proveedor || '',
          sol.numero_factura_orden || '',
          getSolJustificacion(sol),
          items.map((i) => i.nombre).join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }, [solicitudes, pestanaActiva, filtroSede, filtroProyecto, busqueda]);

  // Lista de sedes únicas para el selector
  const sedesList = useMemo(() => {
    const set = new Set();
    (solicitudes || []).forEach((s) => {
      const sede = getSolSede(s);
      if (sede) set.add(sede);
    });
    set.add('Medellín');
    set.add('El Carmen de Viboral');
    set.add('San Jerónimo');
    return Array.from(set);
  }, [solicitudes]);

  // Apertura de modal de Evaluación
  const handleAbrirEvaluar = (sol) => {
    setSolicitudAEvaluar(sol);
    setEvalDecision('Aprobada');
    setEvalObservaciones(sol.observaciones_coordinador || '');
    setEvalPresupuesto(sol.valor_estimado_compra || '');

    // Inicializar cantidades aprobadas con lo solicitado
    const iniciales = {};
    const items = getSolItems(sol);
    items.forEach((it, idx) => {
      iniciales[idx] = it.cantidad_aprobada !== undefined ? it.cantidad_aprobada : (it.cantidad_solicitada || it.cantidad || 1);
    });
    setEvalCantidadesAprobadas(iniciales);
    setModalEvaluarOpen(true);
  };

  // Guardar Evaluación del Coordinador
  const handleGuardarEvaluacion = async (decisionFinal) => {
    if (!evalObservaciones.trim()) {
      showError('Observación Obligatoria', 'Debes ingresar una observación o concepto técnico que justifique la decisión.');
      return;
    }

    setEvalSubmitting(true);
    try {
      const rawItems = getSolItems(solicitudAEvaluar);
      const itemsActualizados = rawItems.map((it, idx) => ({
        ...it,
        cantidad_aprobada: decisionFinal === 'Rechazada' ? 0 : Number(evalCantidadesAprobadas[idx] ?? it.cantidad_solicitada ?? it.cantidad ?? 1),
      }));

      const evaluadorNombre = currentUser
        ? `${currentUser.nombre} (${isCoordinador ? 'Coordinador' : 'Administrador'})`
        : 'Coordinación FMO';

      const patch = {
        estado: decisionFinal,
        evaluado_por: evaluadorNombre,
        fecha_evaluacion: new Date().toISOString(),
        observaciones_coordinador: evalObservaciones.trim(),
        valor_estimado_compra: Number(evalPresupuesto) || solicitudAEvaluar.valor_estimado_compra || 0,
        items: itemsActualizados,
      };

      // 1. Persistir estrictamente en Supabase primero (blindado con .select() y verificación de filas afectadas)
      const filaActualizada = await persistirCambioSolicitud(solicitudAEvaluar, patch);

      // 2. Solo tras confirmación de éxito en Supabase (data.length > 0) se actualiza el estado local
      const actualizadas = solicitudes.map((s) => (s.id === solicitudAEvaluar.id ? { ...s, ...patch, ...filaActualizada } : s));
      syncLocal(actualizadas);

      const tipoAuditoria = decisionFinal === 'Aprobada' || decisionFinal === 'Aprobada para Compra'
        ? 'Compra Aprobada'
        : (decisionFinal === 'Rechazada' ? 'Compra Rechazada' : 'En Evaluación');

      const rad = formatRadicado(solicitudAEvaluar.id, solicitudAEvaluar.radicado);
      const primerItem = rawItems[0] || {};
      const totalUnidadesAprobadas = itemsActualizados.reduce((acc, it) => acc + (Number(it.cantidad_aprobada) || 0), 0);

      try {
        await registrarAuditoria({
          tipo: tipoAuditoria,
          elemento: primerItem.nombre || `Solicitud ${rad}`,
          id_referencia: rad,
          cantidad: totalUnidadesAprobadas || 1,
          responsable: evaluadorNombre,
          documento_responsable: currentUser?.documento || '',
          sede: getSolSede(solicitudAEvaluar),
          motivo: `Evaluación de solicitud de compra: "${decisionFinal}". Concepto/observaciones: ${evalObservaciones.trim()}. Presupuesto asignado: $${Number(evalPresupuesto) || 0} COP`,
        });
      } catch (eAud) {
        console.warn('Aviso auditoria evaluacion compra:', eAud?.message);
      }

      showSuccess(
        `Solicitud ${decisionFinal}`,
        `La solicitud ${formatRadicado(solicitudAEvaluar.id, solicitudAEvaluar.radicado)} ha pasado al estado "${decisionFinal}".`
      );
      setModalEvaluarOpen(false);
      setSolicitudAEvaluar(null);
    } catch (err) {
      console.error('[handleGuardarEvaluacion] Error al persistir evaluación:', err);
      showError('Error al guardar evaluación', err.message || 'No se pudo actualizar la solicitud en Supabase. El estado anterior se mantiene intacto.');
    } finally {
      setEvalSubmitting(false);
    }
  };

  // Apertura de modal de Registrar Compra
  const handleAbrirRegistrarCompra = (sol) => {
    setSolicitudAComprar(sol);
    setCompraProveedor(sol.proveedor || '');
    setCompraValorFinal(sol.valor_final_compra || sol.valor_estimado_compra || '');
    setCompraFactura(sol.numero_factura_orden || '');
    setCompraFecha(sol.fecha_compra || today());
    setCompraNotas(sol.observaciones_compra || '');
    setModalRegistrarCompraOpen(true);
  };

  // Guardar Registro de Compra
  const handleGuardarRegistroCompra = async (e) => {
    e.preventDefault();
    if (!compraProveedor.trim()) {
      showError('Campo Requerido', 'Ingresa el nombre del proveedor o casa comercial.');
      return;
    }
    if (!compraFactura.trim()) {
      showError('Campo Requerido', 'Ingresa el número de orden de compra o factura.');
      return;
    }

    setCompraSubmitting(true);
    try {
      const patch = {
        estado: 'Comprada',
        proveedor: compraProveedor.trim(),
        valor_final_compra: Number(compraValorFinal) || 0,
        numero_factura_orden: compraFactura.trim(),
        fecha_compra: compraFecha || today(),
        observaciones_compra: compraNotas.trim(),
      };

      // 1. Persistir estrictamente en Supabase primero (blindado con .select() y verificación de filas afectadas)
      const filaActualizada = await persistirCambioSolicitud(solicitudAComprar, patch);

      // 2. Solo tras confirmación de éxito en Supabase (data.length > 0) se actualiza el estado local
      const actualizadas = solicitudes.map((s) => (s.id === solicitudAComprar.id ? { ...s, ...patch, ...filaActualizada } : s));
      syncLocal(actualizadas);

      const rad = formatRadicado(solicitudAComprar.id, solicitudAComprar.radicado);
      const primerItem = getSolItems(solicitudAComprar)[0] || {};
      const ejecutadoPor = currentUser
        ? `${currentUser.nombre} (${currentUser.rol || 'Administrador'})`
        : 'Administrador FMO';

      try {
        await registrarAuditoria({
          tipo: 'Compra Registrada',
          elemento: primerItem.nombre || `Compra ${rad}`,
          id_referencia: rad,
          cantidad: Number(solicitudAComprar.cantidad) || primerItem.cantidad_aprobada || 1,
          responsable: ejecutadoPor,
          documento_responsable: currentUser?.documento || '',
          sede: getSolSede(solicitudAComprar),
          motivo: `Compra materializada en proveedor: ${compraProveedor.trim()}. Factura / Orden: ${compraFactura.trim()}. Valor total: $${Number(compraValorFinal) || 0} COP. Fecha: ${compraFecha || today()}`,
        });
      } catch (eAud) {
        console.warn('Aviso auditoria registro compra:', eAud?.message);
      }

      showSuccess(
        'Compra Registrada',
        `Se registró la compra para ${formatRadicado(solicitudAComprar.id, solicitudAComprar.radicado)} (Factura: ${compraFactura}). Ya puedes ingresarla al inventario.`
      );
      setModalRegistrarCompraOpen(false);
      setSolicitudAComprar(null);
    } catch (err) {
      console.error('[handleGuardarCompra] Error al persistir compra:', err);
      showError('Error al registrar compra', err.message || 'No se pudo guardar la compra en Supabase. El estado anterior se mantiene intacto.');
    } finally {
      setCompraSubmitting(false);
    }
  };

  // Acción rápida: Ingresar Ítems Comprados a la Bodega / Inventario Oficial
  const handleIngresarAInventario = async (sol) => {
    try {
      const patch = { ingresado_inventario: true };
      await persistirCambioSolicitud(sol, patch);

      const actualizadas = solicitudes.map((s) => (s.id === sol.id ? { ...s, ingresado_inventario: true } : s));
      syncLocal(actualizadas);

      const primerItem = getSolItems(sol)[0];
      const catSlug = getCategoriaSlug(primerItem?.categoria_destino || sol.categoria_destino || primerItem?.categoria_sugerida);
      const catNombre = formatCategoriaDestino(primerItem?.categoria_destino || sol.categoria_destino || primerItem?.categoria_sugerida);
      const rad = formatRadicado(sol.id, sol.radicado);
      const ejecutadoPor = currentUser
        ? `${currentUser.nombre} (${currentUser.rol || 'Administrador'})`
        : 'Administrador FMO';

      try {
        await registrarAuditoria({
          tipo: 'Ingreso desde Compra',
          elemento: primerItem?.nombre || `Ingreso de compra ${rad}`,
          id_referencia: rad,
          cantidad: Number(primerItem?.cantidad_aprobada) || Number(sol.cantidad) || 1,
          responsable: ejecutadoPor,
          documento_responsable: currentUser?.documento || '',
          sede: getSolSede(sol),
          motivo: `Ingreso oficial de material comprado a la bodega e inventario en la categoría: ${catNombre}. Proveedor: ${sol.proveedor || 'N/A'}. Factura: ${sol.numero_factura_orden || 'N/A'}`,
        });
      } catch (eAud) {
        console.warn('Aviso auditoria ingreso inventario:', eAud?.message);
      }

      showSuccess(
        'Ingreso a Bodega Confirmado',
        `Los ítems de ${formatRadicado(sol.id, sol.radicado)} fueron precargados en la sección "${catNombre}" del inventario oficial FMO.`
      );

      if (typeof onNavigate === 'function') {
        onNavigate('inventario', { tab: catSlug });
      }
    } catch (err) {
      showError('Error al ingresar a inventario', err.message);
    }
  };

  // Exportar solicitudes filtradas a Excel con formato institucional FMO
  const handleExportarExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Fundación Marina Orth - SIGA FMO';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Gestión de Compras', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      // Cabecera Institucional
      worksheet.mergeCells('A1:I1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'FUNDACIÓN MARINA ORTH — CONTROL DE COMPRAS Y ADQUISICIONES STEAM';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF013A52' }, // Azul FMO
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 32;

      // Fila de encabezados de columna
      const headers = [
        'Radicado',
        'Fecha Radicado',
        'Solicitante',
        'Sede Destino',
        'Proyecto STEAM',
        'Ítems y Cantidades',
        'Estado',
        'Proveedor & Factura',
        'Valor Total (COP)',
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF013A52' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFABD037' }, // Verde FMO
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF013A52' } },
        };
      });

      // Relleno de datos con extractores robustos
      solicitudesFiltradas.forEach((sol) => {
        const items = getSolItems(sol);
        const itemsStr = items
          .map((i) => `${i.nombre} (Sol: ${i.cantidad_solicitada || i.cantidad || 1}, Aprob: ${i.cantidad_aprobada ?? '—'})`)
          .join('; ');

        const row = worksheet.addRow([
          formatRadicado(sol.id, sol.radicado),
          fmtDate(getSolFecha(sol)),
          getSolNombre(sol),
          getSolSede(sol),
          getSolProyecto(sol),
          itemsStr || 'Sin ítems detallados',
          sol.estado,
          sol.proveedor ? `${sol.proveedor} (${sol.numero_factura_orden || 'S/N'})` : 'Pendiente de compra',
          Number(sol.valor_final_compra) || Number(sol.valor_estimado_compra) || 0,
        ]);

        row.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Formato de moneda en columna de Valor Total
      worksheet.getColumn(9).numFmt = '"$"#,##0';

      // Ajuste automático de anchos de columna
      worksheet.columns.forEach((col, idx) => {
        if (idx === 5) {
          col.width = 38;
        } else {
          col.width = 18;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIGA_FMO_Gestion_Compras_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      showSuccess('Reporte Excel Generado', 'El archivo de compras se descargó exitosamente.');
    } catch (err) {
      showError('Error al exportar Excel', err.message);
    }
  };

  // Función auxiliar para verificar si un ítem ya existe en inventario físico
  const findStockEnBodega = (nombreItem) => {
    if (!nombreItem || !Array.isArray(itemsInventario)) return null;
    const clean = nombreItem.toLowerCase().trim();
    return itemsInventario.find((it) => {
      const itName = (it.name || it.material || it.nombre || '').toLowerCase();
      return itName.includes(clean) || clean.includes(itName);
    });
  };

  return (
    <div className="gestion-compras-view" style={{ width: '100%', fontFamily: "'Poppins', sans-serif" }}>
      {/* =========================================================================
          1. HEADER INSTITUCIONAL (ALINEADO CON MÓDULOS INVENTARIO Y RESUMEN)
          ========================================================================= */}
      <div
        className="section-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--text-h, #013a52)',
              margin: 0,
              flexWrap: 'wrap',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#abd037',
                color: '#013a52',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(171, 208, 55, 0.4)',
                flexShrink: 0,
              }}
            >
              <ShoppingCart size={20} strokeWidth={2.4} />
            </span>
            <span>Gestión de Compras y Adquisiciones</span>
            <span
              className="pill"
              style={{
                backgroundColor: 'rgba(171, 208, 55, 0.2)',
                color: 'var(--text-h, #013a52)',
                border: '1.5px solid #abd037',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: '999px',
              }}
            >
              Flujo Oficial SIGA-FMO
            </span>
          </h2>
          <p
            className="section-subtitle"
            style={{
              fontSize: '13px',
              color: 'var(--text-dim, #6d6e71)',
              margin: '4px 0 0 0',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Evaluación técnica de requerimientos pedagógicos, cruce con bodega y control de facturas institucionales.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Botón Directorio de Proveedores Recomendados */}
          <button
            type="button"
            onClick={() => setModalProveedoresOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '12px',
              backgroundColor: '#013a52',
              color: '#ffffff',
              border: '1.5px solid rgba(171, 208, 55, 0.45)',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(1, 58, 82, 0.25)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#024d6d';
              e.currentTarget.style.borderColor = '#abd037';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#013a52';
              e.currentTarget.style.borderColor = 'rgba(171, 208, 55, 0.45)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Ver y administrar el directorio oficial de proveedores y tiendas recomendadas"
          >
            <Store size={16} strokeWidth={2.4} style={{ color: '#abd037' }} />
            <span>Proveedores Recomendados</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 8px',
                borderRadius: '999px',
                backgroundColor: '#abd037',
                color: '#013a52',
              }}
            >
              {proveedoresCount}
            </span>
          </button>

          {/* Botón Exportar a Excel Institucional */}
          <button
            type="button"
            onClick={handleExportarExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '12px',
              backgroundColor: '#abd037',
              color: '#013a52',
              border: 'none',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(171, 208, 55, 0.35)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#96b82d';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 5px 14px rgba(171, 208, 55, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#abd037';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(171, 208, 55, 0.35)';
            }}
            title="Exportar listado actual a Excel con formato institucional"
          >
            <FileSpreadsheet size={16} strokeWidth={2.4} />
            <span>Exportar a Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. LAS 3 ETAPAS DEL FLUJO EN CUADRÍCULA HORIZONTAL (3 TARJETAS KPI)
          ========================================================================= */}
      <div className="compras-stats-grid">
        {/* Etapa 1: Solicitud & Evaluación */}
        <div
          className={`compras-step-card ${pestanaActiva === 'pendientes' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('pendientes')}
          role="button"
          tabIndex={0}
          style={{
            borderTop: '4px solid #f59e0b',
            borderTopColor: '#f59e0b',
          }}
          title="Ver solicitudes pendientes por evaluar"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                1
              </span>
              <span
                className="pill"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#b45309',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                }}
              >
                Etapa 1
              </span>
            </div>
            {pestanaActiva === 'pendientes' && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#013a52',
                  backgroundColor: '#abd037',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Filtro Activo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div
              className="num"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#f59e0b',
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1,
              }}
            >
              {conteos.pendientes}
            </div>
            <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Solicitud & Evaluación
            </div>
          </div>
          <div className="card-subtitle" style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '4px' }}>
            Revisión técnica y cruce con bodega
          </div>
        </div>

        {/* Etapa 2: Aprobación & Adquisición */}
        <div
          className={`compras-step-card ${pestanaActiva === 'aprobadas' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('aprobadas')}
          role="button"
          tabIndex={0}
          style={{
            borderTop: '4px solid #2cacd0',
            borderTopColor: '#2cacd0',
          }}
          title="Ver solicitudes aprobadas para compra"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  backgroundColor: '#2cacd0',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                2
              </span>
              <span
                className="pill"
                style={{
                  backgroundColor: 'rgba(44, 172, 208, 0.15)',
                  color: '#0284c7',
                  border: '1px solid rgba(44, 172, 208, 0.4)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                }}
              >
                Etapa 2
              </span>
            </div>
            {pestanaActiva === 'aprobadas' && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#013a52',
                  backgroundColor: '#abd037',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Filtro Activo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div
              className="num"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#2cacd0',
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1,
              }}
            >
              {conteos.aprobadas}
            </div>
            <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Aprobación & Adquisición
            </div>
          </div>
          <div className="card-subtitle" style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '4px' }}>
            Órdenes autorizadas pendientes de factura
          </div>
        </div>

        {/* Etapa 3: Compra & Recepción */}
        <div
          className={`compras-step-card ${pestanaActiva === 'compradas' ? 'active' : ''}`}
          onClick={() => setPestanaActiva('compradas')}
          role="button"
          tabIndex={0}
          style={{
            borderTop: '4px solid #abd037',
            borderTopColor: '#abd037',
          }}
          title="Ver compras finalizadas"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  backgroundColor: '#abd037',
                  color: '#013a52',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                3
              </span>
              <span
                className="pill"
                style={{
                  backgroundColor: 'rgba(171, 208, 55, 0.2)',
                  color: '#4d7c0f',
                  border: '1px solid rgba(171, 208, 55, 0.5)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                }}
              >
                Etapa 3
              </span>
            </div>
            {pestanaActiva === 'compradas' && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#013a52',
                  backgroundColor: '#abd037',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Filtro Activo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div
              className="num"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#4d7c0f',
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1,
              }}
            >
              {conteos.compradas}
            </div>
            <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Compra & Recepción
            </div>
          </div>
          <div className="card-subtitle" style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '4px' }}>
            Ingreso al inventario oficial FMO
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PESTAÑAS DE FILTRO POR ESTADO Y BUSCADOR RÁPIDO
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        {/* Pestañas de Estado con Contadores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'todas', label: 'Todas', count: conteos.todas },
            { id: 'pendientes', label: 'Pendientes por Evaluar', count: conteos.pendientes },
            { id: 'aprobadas', label: 'Aprobadas para Compra', count: conteos.aprobadas },
            { id: 'compradas', label: 'Compradas', count: conteos.compradas },
            { id: 'rechazadas', label: 'Rechazadas', count: conteos.rechazadas },
          ].map((tab) => {
            const isActive = pestanaActiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPestanaActiva(tab.id)}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 600,
                  backgroundColor: isActive ? '#abd037' : 'var(--surface, #ffffff)',
                  color: isActive ? '#013a52' : 'var(--text-dim, #6d6e71)',
                  border: isActive ? '1.5px solid #96b82d' : '1px solid var(--line, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '7px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? '0 2px 8px rgba(171, 208, 55, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#abd037';
                    e.currentTarget.style.color = 'var(--text, #013a52)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
                    e.currentTarget.style.color = 'var(--text-dim, #6d6e71)';
                  }
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: isActive ? '#013a52' : 'rgba(109, 110, 113, 0.12)',
                    color: isActive ? '#ffffff' : 'var(--text-dim, #6d6e71)',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador Rápido */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '380px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por radicado, solicitante, ítem o factura..."
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: busqueda ? '32px' : '12px',
              paddingTop: '8px',
              paddingBottom: '8px',
              fontSize: '13px',
              fontFamily: "'Poppins', sans-serif",
              borderRadius: '12px',
              border: '1px solid var(--line, #e2e8f0)',
              backgroundColor: 'var(--surface, #ffffff)',
              color: 'var(--text, #013a52)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#013a52';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(171, 208, 55, 0.5)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                padding: '2px',
              }}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. BARRA DE FILTROS SECUNDARIOS (SEDES Y PROYECTOS STEAM)
          ========================================================================= */}
      <div
        className="filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid var(--line, #e2e8f0)',
          backgroundColor: 'var(--surface, #ffffff)',
          marginBottom: '18px',
          flexWrap: 'wrap',
          fontSize: '12.5px',
          color: 'var(--text-dim, #6d6e71)',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text, #013a52)' }}>
          <Filter size={14} />
          <span>Filtros de auditoría:</span>
        </span>

        {/* Filtro Sede */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text, #013a52)' }}>Sede:</span>
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            style={{
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              border: '1px solid var(--line, #cbd5e1)',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              color: 'var(--text, #013a52)',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value="todas">Todas las sedes</option>
            {sedesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Filtro Proyecto STEAM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text, #013a52)' }}>Proyecto STEAM:</span>
          <select
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
            style={{
              borderRadius: '8px',
              padding: '5px 10px',
              fontSize: '12px',
              border: '1px solid var(--line, #cbd5e1)',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              color: 'var(--text, #013a52)',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 600,
              outline: 'none',
            }}
          >
            <option value="todos">Todos los proyectos</option>
            {(proyectosSteamList || []).map((p) => {
              const val = typeof p === 'string' ? p : p.nombre;
              const label = formatProyectoLabel ? formatProyectoLabel(p) : val;
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-dim, #6d6e71)' }}>
          Mostrando <strong style={{ color: 'var(--text, #013a52)' }}>{solicitudesFiltradas.length}</strong> de{' '}
          <strong style={{ color: 'var(--text, #013a52)' }}>{solicitudes.length}</strong> solicitudes registradas
        </div>
      </div>

      {/* =========================================================================
          5. TABLA AUDITADA DE SOLICITUDES DE COMPRA (SIN COLISIONES NI DESBORDAMIENTOS)
          ========================================================================= */}
      {solicitudesFiltradas.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface, #ffffff)',
            margin: '16px 0',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ShoppingCart size={44} style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 auto 10px', display: 'block' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h, #013a52)', margin: 0 }}>
            No se encontraron solicitudes de compra
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-dim, #6d6e71)', margin: '4px 0 0' }}>
            No hay requerimientos que coincidan con la pestaña seleccionada o los filtros aplicados.
          </p>
        </div>
      ) : (
        <div
          className="table-responsive"
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            borderRadius: '16px',
            border: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface, #ffffff)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '24px',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '850px',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface-2, #f8fafc)',
                  borderBottom: '2px solid #abd037',
                }}
              >
                <th
                  style={{
                    width: '11%',
                    minWidth: '105px',
                    padding: '12px 12px',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  RADICADO / FECHA
                </th>
                <th
                  style={{
                    width: '15%',
                    minWidth: '130px',
                    padding: '12px 10px',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  SOLICITANTE & SEDE
                </th>
                <th
                  style={{
                    width: '19%',
                    minWidth: '160px',
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  PROYECTO STEAM
                </th>
                <th
                  style={{
                    width: '22%',
                    minWidth: '170px',
                    padding: '12px 12px',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  DETALLE DE ÍTEMS
                </th>
                <th
                  style={{
                    width: '19%',
                    minWidth: '150px',
                    padding: '12px 10px',
                    textAlign: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ESTADO & COMPRA
                </th>
                <th
                  style={{
                    width: '14%',
                    minWidth: '125px',
                    padding: '12px 10px',
                    textAlign: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((sol) => {
                const solItems = getSolItems(sol);
                const totalItems = solItems.length;
                const primerItem = solItems[0];
                const solNombre = getSolNombre(sol);
                const solSede = getSolSede(sol);
                const solProyecto = getSolProyecto(sol);
                const solFecha = getSolFecha(sol);
                const radicadoFormat = formatRadicado(sol.id, sol.radicado);
                const estadoConfig = getEstadoBadgeConfig(sol.estado);
                const EstadoIcon = estadoConfig.Icon;

                return (
                  <tr
                    key={sol.id}
                    style={{
                      borderBottom: '1px solid var(--line, #e2e8f0)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, #f8fafc)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* 1. Radicado / Fecha */}
                    <td style={{ width: '11%', minWidth: '105px', padding: '12px 12px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(1, 58, 82, 0.08)',
                            color: 'var(--text-h, #013a52)',
                            border: '1px solid rgba(1, 58, 82, 0.2)',
                            fontFamily: "'Poppins', sans-serif",
                            whiteSpace: 'nowrap',
                          }}
                          title={sol.radicado || sol.id}
                        >
                          {radicadoFormat}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-dim, #6d6e71)',
                            marginTop: '4px',
                            whiteSpace: 'nowrap',
                          }}
                          title={fmtDate(solFecha)}
                        >
                          {fmtDate(solFecha)}
                        </span>
                      </div>
                    </td>

                    {/* 2. Solicitante & Sede */}
                    <td style={{ width: '15%', minWidth: '130px', padding: '12px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, overflow: 'hidden' }}>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--text-h, #013a52)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: "'Poppins', sans-serif",
                          }}
                          title={solNombre}
                        >
                          {solNombre}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            className="sede-badge municipal"
                            style={{
                              fontSize: '10px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={`Sede: ${solSede}`}
                          >
                            {solSede}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Proyecto STEAM */}
                    <td
                      style={{
                        width: '19%',
                        minWidth: '160px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minWidth: 0,
                          width: '100%',
                          maxWidth: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <ProgramAreaBadge area={solProyecto} label={solProyecto} size="sm" />
                      </div>
                    </td>

                    {/* 4. Detalle de Ítems */}
                    <td style={{ width: '22%', minWidth: '170px', padding: '12px 12px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {primerItem ? (
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                ...getCategoriaBadgeStyle(primerItem.categoria_destino || sol.categoria_destino || primerItem.categoria_sugerida),
                                padding: '1.5px 6px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.01em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                lineHeight: 1.2,
                              }}
                            >
                              {formatCategoriaDestino(primerItem.categoria_destino || sol.categoria_destino || primerItem.categoria_sugerida)}
                            </span>
                          </div>
                          <strong
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text, #013a52)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={primerItem.nombre}
                          >
                            {primerItem.nombre}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span>Sol: <strong style={{ color: 'var(--text-h, #013a52)' }}>{primerItem.cantidad_solicitada || primerItem.cantidad || 1}</strong></span>
                            {primerItem.cantidad_aprobada !== undefined && (
                              <span>· Aprob: <strong style={{ color: '#4d7c0f' }}>{primerItem.cantidad_aprobada}</strong></span>
                            )}
                            {totalItems > 1 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700 }}>
                                (+{totalItems - 1} más)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>Sin ítems detallados</span>
                      )}
                    </td>

                    {/* 5. Estado & Adquisición */}
                    <td style={{ width: '19%', minWidth: '150px', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '4px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 11px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            fontFamily: "'Poppins', sans-serif",
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            ...estadoConfig.badgeStyle,
                          }}
                        >
                          <EstadoIcon style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                          <span>{estadoConfig.label}</span>
                        </span>

                        {/* Subtexto fiscal / orden según etapa */}
                        {sol.proveedor ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${sol.proveedor} ${sol.numero_factura_orden ? `(Fact: ${sol.numero_factura_orden})` : ''}`}>
                            <span style={{ fontWeight: 600, color: 'var(--text-h, #013a52)' }}>{sol.proveedor}</span>
                            {sol.numero_factura_orden && <span> · Fact: {sol.numero_factura_orden}</span>}
                          </div>
                        ) : normalizeEstado(sol.estado) === 'aprobadas' ? (
                          <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 600, fontStyle: 'italic' }}>
                            Pendiente orden de compra
                          </span>
                        ) : normalizeEstado(sol.estado) === 'compradas' ? (
                          <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: 600 }}>
                            Compra efectuada
                          </span>
                        ) : normalizeEstado(sol.estado) === 'rechazadas' ? (
                          <span style={{ fontSize: '10.5px', color: '#e11d48', fontStyle: 'italic' }}>
                            Requerimiento declinado
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                            En evaluación técnica
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Acciones */}
                    <td style={{ width: '14%', minWidth: '125px', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {/* Botón Ver Detalle */}
                        <button
                          type="button"
                          onClick={() => {
                            setSolicitudDetalle(sol);
                            setModalDetalleOpen(true);
                          }}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: '1px solid var(--line, #cbd5e1)',
                            backgroundColor: 'var(--surface, #ffffff)',
                            color: 'var(--text-dim, #6d6e71)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#013a52';
                            e.currentTarget.style.color = '#013a52';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--line, #cbd5e1)';
                            e.currentTarget.style.color = 'var(--text-dim, #6d6e71)';
                          }}
                          title="Ver ficha completa de la solicitud"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Botón Evaluar (Etapa 1: Pendiente o En Evaluación) */}
                        {normalizeEstado(sol.estado) === 'pendientes' && (isCoordinador || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleAbrirEvaluar(sol)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#ffffff',
                              backgroundColor: '#7B2CBF',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#63209E')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7B2CBF')}
                            title="Evaluar requerimiento pedagógico y autorizar cantidades"
                          >
                            <FileCheck size={13} />
                            <span>Evaluar</span>
                          </button>
                        )}

                        {/* Botón Registrar Compra (Etapa 2: Aprobada) */}
                        {normalizeEstado(sol.estado) === 'aprobadas' && (isCoordinador || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleAbrirRegistrarCompra(sol)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#ffffff',
                              backgroundColor: '#2CACD0',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2292B3')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2CACD0')}
                            title="Registrar factura u orden de compra comercial"
                          >
                            <ShoppingCart size={13} />
                            <span>Comprar</span>
                          </button>
                        )}

                        {/* Botón + Ingresar a Inventario (Etapa 3: Comprada) */}
                        {normalizeEstado(sol.estado) === 'compradas' && (isCoordinador || isAdmin) && (
                          sol.ingresado_inventario ? (
                            <button
                              type="button"
                              onClick={() => {
                                const catSlug = getCategoriaSlug(primerItem?.categoria_destino || sol.categoria_destino || primerItem?.categoria_sugerida);
                                if (typeof onNavigate === 'function') {
                                  onNavigate('inventario', { tab: catSlug });
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(171, 208, 55, 0.2)',
                                color: '#4d7c0f',
                                border: '1px solid rgba(171, 208, 55, 0.45)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(171, 208, 55, 0.35)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(171, 208, 55, 0.2)';
                              }}
                              title="Los ítems ya están registrados en el inventario oficial. Haz clic para verlos"
                            >
                              <PackageCheck size={13} />
                              <span>Ingresado</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleIngresarAInventario(sol)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#013a52',
                                backgroundColor: '#abd037',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#96b82d')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#abd037')}
                              title="Precargar estos ítems adquiridos en el catálogo oficial de bodega"
                            >
                              <PackagePlus size={13} strokeWidth={2.4} />
                              <span>+ Bodega</span>
                            </button>
                          )
                        )}

                        {/* Estado Rechazado */}
                        {normalizeEstado(sol.estado) === 'rechazadas' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(244, 63, 94, 0.12)',
                              color: '#be123c',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              flexShrink: 0,
                            }}
                          >
                            <XCircle size={13} />
                            <span>Rechazada</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: EVALUAR SOLICITUD DE COMPRA (2 COLUMNAS INSTITUCIONAL FMO)
          ========================================================================= */}
      {modalEvaluarOpen && solicitudAEvaluar && (() => {
        const solItems = getSolItems(solicitudAEvaluar);
        const radicadoStr = formatRadicado(solicitudAEvaluar.id, solicitudAEvaluar.radicado);
        const solNombre = getSolNombre(solicitudAEvaluar);
        const solSede = getSolSede(solicitudAEvaluar);
        const solProyecto = getSolProyecto(solicitudAEvaluar);
        const solFecha = getSolFecha(solicitudAEvaluar);
        const solJustificacion = getSolJustificacion(solicitudAEvaluar);

        return (
          <div
            onClick={() => !evalSubmitting && setModalEvaluarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: 'rgba(1, 58, 82, 0.7)',
              backdropFilter: 'blur(5px)',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '860px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--surface, #ffffff)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(1, 58, 82, 0.45)',
                border: '1px solid var(--line, #e2e8f0)',
                overflow: 'hidden',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {/* Header Institucional FMO */}
              <div
                style={{
                  backgroundColor: '#013a52',
                  borderBottom: '3px solid #7B2CBF',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: '#7B2CBF',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(123, 44, 191, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    <FileCheck size={22} strokeWidth={2.4} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                        Evaluar Solicitud de Compra
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 9px',
                          borderRadius: '999px',
                          backgroundColor: '#abd037',
                          color: '#013a52',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {radicadoStr}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                      Revisión técnica de requerimientos pedagógicos, cruce con bodega y dictamen presupuestal.
                    </p>
                  </div>
                </div>

                {/* Botón Cerrar Translúcido */}
                <button
                  type="button"
                  onClick={() => setModalEvaluarOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  title="Cerrar modal"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              {/* Contenido en 2 Columnas */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '22px',
                  padding: '22px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--surface, #ffffff)',
                }}
              >
                {/* Columna Izquierda: Información del Requerimiento */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--text-h, #013a52)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      paddingBottom: '8px',
                      borderBottom: '1.5px solid var(--line, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7B2CBF' }}></span>
                    <span>1. Requerimiento Institucional & Justificación</span>
                  </div>

                  {/* Ficha de Solicitante y Sede */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--surface-2, #f8fafc)',
                      border: '1px solid var(--line, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim, #6d6e71)' }}>
                        <User size={14} style={{ color: '#013a52' }} />
                        <span>Docente / Solicitante:</span>
                      </div>
                      <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>{solNombre}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim, #6d6e71)' }}>
                        <MapPin size={14} style={{ color: '#2cacd0' }} />
                        <span>Sede / Municipio:</span>
                      </div>
                      <span className="sede-badge municipal" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {solSede}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim, #6d6e71)' }}>
                        <FolderKanban size={14} style={{ color: '#7B2CBF' }} />
                        <span>Proyecto STEAM:</span>
                      </div>
                      <ProgramAreaBadge area={solProyecto} size="sm" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim, #6d6e71)' }}>
                        <Calendar size={14} style={{ color: '#6d6e71' }} />
                        <span>Fecha Requerida:</span>
                      </div>
                      <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>{fmtDate(solFecha)}</strong>
                    </div>
                  </div>

                  {/* Justificación Pedagógica */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Justificación Pedagógica / Necesidad:
                    </label>
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--surface-2, #f8fafc)',
                        border: '1px solid var(--line, #e2e8f0)',
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: 'var(--text, #013a52)',
                        fontStyle: 'italic',
                        position: 'relative',
                      }}
                    >
                      "{solJustificacion}"
                    </div>
                  </div>

                  {/* Lista de Ítems Solicitados */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      <span>Ítems Solicitados ({solItems.length})</span>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {solItems.length === 0 ? (
                        <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-2, #f8fafc)', fontSize: '12px', color: 'var(--text-dim, #6d6e71)', fontStyle: 'italic' }}>
                          Sin ítems especificados en la solicitud.
                        </div>
                      ) : (
                        solItems.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: '1px solid var(--line, #e2e8f0)',
                              backgroundColor: 'var(--surface, #ffffff)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <strong style={{ fontSize: '12.5px', color: 'var(--text-h, #013a52)', fontWeight: 700 }}>
                                {it.nombre}
                              </strong>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#b45309',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Sol: {it.cantidad_solicitada || it.cantidad || 1}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>Categoría sugerida:</span>
                              <span
                                style={{
                                  ...getCategoriaBadgeStyle(it.categoria_destino || it.categoria_sugerida || solicitudAEvaluar.categoria_destino),
                                  padding: '1px 6px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                }}
                              >
                                {formatCategoriaDestino(it.categoria_sugerida || it.categoria_destino || solicitudAEvaluar.categoria_destino)}
                              </span>
                            </div>
                            {it.url_compra && (
                              <div style={{ marginTop: '6px' }}>
                                <a
                                  href={it.url_compra}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#0284c7',
                                    textDecoration: 'none',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  <ExternalLink size={12} />
                                  <span>Ver referencia comercial</span>
                                </a>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Cruce con Bodega y Decisión */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--text-h, #013a52)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      paddingBottom: '8px',
                      borderBottom: '1.5px solid var(--line, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2cacd0' }}></span>
                    <span>2. Cruce con Bodega & Dictamen Técnico</span>
                  </div>

                  {/* Alerta de Existencias en Bodega */}
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(44, 172, 208, 0.08)',
                      border: '1.5px solid rgba(44, 172, 208, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Building2 size={16} style={{ color: '#2cacd0' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#013a52' }}>
                        Cruce Automático con Stock en Bodega:
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {solItems.map((it, idx) => {
                        const match = findStockEnBodega(it.nombre);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', gap: '8px' }}>
                            <span style={{ color: 'var(--text-dim, #6d6e71)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {it.nombre}:
                            </span>
                            {match && (match.disponible > 0 || match.quantity > 0) ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#15803d',
                                  backgroundColor: 'rgba(22, 163, 74, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                ✓ {match.disponible || match.quantity} disponibles en catálogo
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#b45309',
                                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Sin stock (Requiere compra)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cantidades Aprobadas */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Cantidades Aprobadas para Adquisición:
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {solItems.map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--surface-2, #f8fafc)',
                            border: '1px solid var(--line, #e2e8f0)',
                            gap: '10px',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {it.nombre}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)' }}>Aprobar:</span>
                            <input
                              type="number"
                              min="0"
                              max={it.cantidad_solicitada || 999}
                              value={evalCantidadesAprobadas[idx] ?? it.cantidad_solicitada ?? 1}
                              onChange={(e) =>
                                setEvalCantidadesAprobadas((prev) => ({
                                  ...prev,
                                  [idx]: Math.max(0, parseInt(e.target.value) || 0),
                                }))
                              }
                              style={{
                                width: '64px',
                                padding: '6px 8px',
                                textAlign: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                                borderRadius: '8px',
                                border: '1.5px solid var(--line, #cbd5e1)',
                                backgroundColor: 'var(--surface, #ffffff)',
                                color: 'var(--text-h, #013a52)',
                                outline: 'none',
                                fontFamily: "'Poppins', sans-serif",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Presupuesto Máximo Autorizado con Prefix Box Separado */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Presupuesto Máximo Autorizado (COP):
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          padding: '0 12px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: 'var(--surface-2, #f1f5f9)',
                          color: 'var(--text-dim, #6d6e71)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRight: '1.5px solid var(--line, #cbd5e1)',
                          userSelect: 'none',
                        }}
                      >
                        $ COP
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={evalPresupuesto}
                        onChange={(e) => setEvalPresupuesto(e.target.value)}
                        placeholder="Ej: 650000"
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-h, #013a52)',
                          backgroundColor: 'transparent',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {/* Observaciones Obligatorias del Coordinador */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Concepto Técnico / Observaciones del Coordinador *:
                    </label>
                    <textarea
                      rows={3}
                      value={evalObservaciones}
                      onChange={(e) => setEvalObservaciones(e.target.value)}
                      placeholder="Describe el motivo de aprobación, ajustes presupuestales o justificación técnica de rechazo..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '12px',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        color: 'var(--text-h, #013a52)',
                        outline: 'none',
                        fontFamily: "'Poppins', sans-serif",
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pie de Acciones de Decisión */}
              <div
                style={{
                  padding: '16px 22px',
                  backgroundColor: 'var(--surface-2, #f8fafc)',
                  borderTop: '1px solid var(--line, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalEvaluarOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-dim, #6d6e71)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--line, #cbd5e1)',
                    cursor: 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Cancelar
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* 1. Rechazar */}
                  <button
                    type="button"
                    disabled={evalSubmitting}
                    onClick={() => handleGuardarEvaluacion('Rechazada')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#ffffff',
                      backgroundColor: '#E0321C',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E0321C')}
                  >
                    <XCircle size={15} />
                    <span>Rechazar Solicitud</span>
                  </button>

                  {/* 2. Dejar en Evaluación */}
                  <button
                    type="button"
                    disabled={evalSubmitting}
                    onClick={() => handleGuardarEvaluacion('En Evaluación')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#ffffff',
                      backgroundColor: '#7B2CBF',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#63209E')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7B2CBF')}
                  >
                    <Clock size={15} />
                    <span>Dejar en Evaluación</span>
                  </button>

                  {/* 3. Aprobar para Compra */}
                  <button
                    type="button"
                    disabled={evalSubmitting}
                    onClick={() => handleGuardarEvaluacion('Aprobada')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 18px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      backgroundColor: '#abd037',
                      color: '#013a52',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(171, 208, 55, 0.35)',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#96b82d')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#abd037')}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.4} />
                    <span>Aprobar para Compra</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 2: REGISTRAR COMPRA EFECTUADA (REDISEÑO INSTITUCIONAL FMO)
          ========================================================================= */}
      {modalRegistrarCompraOpen && solicitudAComprar && (() => {
        const radicadoStr = formatRadicado(solicitudAComprar.id, solicitudAComprar.radicado);
        const solNombre = getSolNombre(solicitudAComprar);
        const solSede = getSolSede(solicitudAComprar);
        const solProyecto = getSolProyecto(solicitudAComprar);
        const itemsAComprar = getSolItems(solicitudAComprar);

        return (
          <div
            onClick={() => !compraSubmitting && setModalRegistrarCompraOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: 'rgba(1, 58, 82, 0.7)',
              backdropFilter: 'blur(5px)',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--surface, #ffffff)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(1, 58, 82, 0.45)',
                border: '1px solid var(--line, #e2e8f0)',
                overflow: 'hidden',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {/* Header del Modal */}
              <div
                style={{
                  backgroundColor: '#013a52',
                  borderBottom: '3px solid #2CACD0',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: '#2CACD0',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(44, 172, 208, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    <Receipt size={22} strokeWidth={2.4} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                        Registrar Compra y Adquisición
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 9px',
                          borderRadius: '999px',
                          backgroundColor: '#2CACD0',
                          color: '#ffffff',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {radicadoStr}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                      Ingresa los datos fiscales, casa comercial y factura oficial de la compra.
                    </p>
                  </div>
                </div>

                {/* Botón Cerrar Translúcido */}
                <button
                  type="button"
                  onClick={() => setModalRegistrarCompraOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  title="Cerrar modal"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              {/* Formulario de Compra */}
              <form onSubmit={handleGuardarRegistroCompra} style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Resumen del Requerimiento Autorizado */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--surface-2, #f8fafc)',
                    border: '1px solid var(--line, #e2e8f0)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={14} style={{ color: '#013a52' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
                        {solNombre}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)' }}>·</span>
                      <MapPin size={13} style={{ color: '#2cacd0' }} />
                      <span style={{ fontSize: '11.5px', color: 'var(--text, #013a52)', fontWeight: 600 }}>
                        {solSede}
                      </span>
                    </div>
                    <ProgramAreaBadge area={solProyecto} size="sm" />
                  </div>

                  {/* Resumen de ítems autorizados */}
                  <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-dim, #6d6e71)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ítems Autorizados para Compra:
                    </span>
                    {itemsAComprar.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            style={{
                              ...getCategoriaBadgeStyle(it.categoria_destino || it.categoria_sugerida || solicitudAComprar?.categoria_destino),
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {formatCategoriaDestino(it.categoria_destino || it.categoria_sugerida || solicitudAComprar?.categoria_destino)}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-h, #013a52)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nombre}</span>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(171, 208, 55, 0.2)', color: '#365314', fontWeight: 700, flexShrink: 0 }}>
                          Cant: {it.cantidad_aprobada ?? it.cantidad_solicitada ?? 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
                  {/* Proveedor / Casa Comercial */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Proveedor / Empresa Comercial *:
                    </label>
                    <input
                      type="text"
                      required
                      value={compraProveedor}
                      onChange={(e) => setCompraProveedor(e.target.value)}
                      placeholder="Ej: RobotShop Colombia, Panamericana, Homecenter"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        color: 'var(--text-h, #013a52)',
                        outline: 'none',
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Valor Final Facturado con Prefix Box Separado */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Valor Final Facturado (COP) *:
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        overflow: 'hidden',
                      }}
                    >
                      <span
                        style={{
                          padding: '0 12px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: 'var(--surface-2, #f1f5f9)',
                          color: 'var(--text-dim, #6d6e71)',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRight: '1.5px solid var(--line, #cbd5e1)',
                          userSelect: 'none',
                        }}
                      >
                        $ COP
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={compraValorFinal}
                        onChange={(e) => setCompraValorFinal(e.target.value)}
                        placeholder="Ej: 325000"
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text-h, #013a52)',
                          backgroundColor: 'transparent',
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      />
                    </div>
                  </div>

                  {/* N.° de Factura u Orden */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      N.° Factura / Orden de Compra *:
                    </label>
                    <input
                      type="text"
                      required
                      value={compraFactura}
                      onChange={(e) => setCompraFactura(e.target.value)}
                      placeholder="Ej: FAC-2026-9812"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        color: 'var(--text-h, #013a52)',
                        outline: 'none',
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Fecha de Compra */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Fecha de Compra *:
                    </label>
                    <input
                      type="date"
                      required
                      value={compraFecha}
                      onChange={(e) => setCompraFecha(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: '1.5px solid var(--line, #cbd5e1)',
                        backgroundColor: 'var(--surface, #ffffff)',
                        color: 'var(--text-h, #013a52)',
                        outline: 'none',
                        fontFamily: "'Poppins', sans-serif",
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Proyecto Vinculado */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Proyecto Vinculado:
                    </label>
                    <div style={{ paddingTop: '4px' }}>
                      <ProgramAreaBadge area={solProyecto} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Observaciones de Compra */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Notas de Compra / Garantía:
                  </label>
                  <textarea
                    rows={2}
                    value={compraNotas}
                    onChange={(e) => setCompraNotas(e.target.value)}
                    placeholder="Garantía de 12 meses, entregado con remisión en bodega..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      fontSize: '12px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text-h, #013a52)',
                      outline: 'none',
                      fontFamily: "'Poppins', sans-serif",
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Pie de Acciones */}
                <div
                  style={{
                    paddingTop: '14px',
                    borderTop: '1px solid var(--line, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalRegistrarCompraOpen(false)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-dim, #6d6e71)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--line, #cbd5e1)',
                      cursor: 'pointer',
                      fontFamily: "'Poppins', sans-serif",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={compraSubmitting}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      backgroundColor: '#abd037',
                      color: '#013a52',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(171, 208, 55, 0.35)',
                      fontFamily: "'Poppins', sans-serif",
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#96b82d')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#abd037')}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.4} />
                    <span>Confirmar Compra Realizada</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL 3: VER DETALLE COMPLETO DE LA SOLICITUD (REDISEÑO INSTITUCIONAL FMO)
          ========================================================================= */}
      {modalDetalleOpen && solicitudDetalle && (() => {
        const radicadoStr = formatRadicado(solicitudDetalle.id, solicitudDetalle.radicado);
        const solNombre = getSolNombre(solicitudDetalle);
        const solSede = getSolSede(solicitudDetalle);
        const solProyecto = getSolProyecto(solicitudDetalle);
        const solFecha = getSolFecha(solicitudDetalle);
        const solJustificacion = getSolJustificacion(solicitudDetalle);
        const solItems = getSolItems(solicitudDetalle);
        const estadoConfig = getEstadoBadgeConfig(solicitudDetalle.estado);
        const EstadoIcon = estadoConfig.Icon;

        return (
          <div
            onClick={() => setModalDetalleOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              backgroundColor: 'rgba(1, 58, 82, 0.7)',
              backdropFilter: 'blur(5px)',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '680px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--surface, #ffffff)',
                borderRadius: '20px',
                boxShadow: '0 25px 50px -12px rgba(1, 58, 82, 0.45)',
                border: '1px solid var(--line, #e2e8f0)',
                overflow: 'hidden',
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {/* Header Institucional */}
              <div
                style={{
                  backgroundColor: '#013a52',
                  borderBottom: '3px solid #abd037',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#abd037',
                      color: '#013a52',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={20} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#ffffff' }}>
                      Ficha de Solicitud de Compra — {radicadoStr}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Auditoría integral del ciclo de adquisición SIGA-FMO
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalDetalleOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '10px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  title="Cerrar ficha"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              </div>

              {/* Contenido */}
              <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--surface-2, #f8fafc)',
                    border: '1px solid var(--line, #e2e8f0)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-dim, #6d6e71)' }}>Solicitante:</span>{' '}
                    <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>{solNombre}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim, #6d6e71)' }}>Sede Destino:</span>{' '}
                    <strong style={{ color: 'var(--text-h, #013a52)', fontWeight: 700 }}>{solSede}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-dim, #6d6e71)' }}>Proyecto STEAM:</span>
                    <ProgramAreaBadge area={solProyecto} size="sm" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-dim, #6d6e71)' }}>Estado Actual:</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        ...estadoConfig.badgeStyle,
                      }}
                    >
                      <EstadoIcon size={12} />
                      <span>{estadoConfig.label}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Justificación:
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-2, #f8fafc)',
                      border: '1px solid var(--line, #e2e8f0)',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: 'var(--text, #013a52)',
                    }}
                  >
                    "{solJustificacion}"
                  </p>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Ítems Solicitados ({solItems.length}):
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {solItems.map((it, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1px solid var(--line, #e2e8f0)',
                          backgroundColor: 'var(--surface, #ffffff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--text-h, #013a52)' }}>{it.nombre}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Cat:</span>
                            <span
                              style={{
                                ...getCategoriaBadgeStyle(it.categoria_destino || it.categoria_sugerida || solicitudDetalle?.categoria_destino),
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              {formatCategoriaDestino(it.categoria_sugerida || it.categoria_destino || solicitudDetalle?.categoria_destino)}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11.5px' }}>
                            Sol: <strong>{it.cantidad_solicitada || it.cantidad || 1}</strong> | Aprob:{' '}
                            <strong style={{ color: '#15803d' }}>{it.cantidad_aprobada ?? '—'}</strong>
                          </span>
                          {it.url_compra && (
                            <div style={{ marginTop: '2px' }}>
                              <a
                                href={it.url_compra}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  color: '#0284c7',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <ExternalLink size={11} />
                                <span>Referencia comercial</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {solicitudDetalle.observaciones_coordinador && (
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Concepto Técnico del Coordinador:
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(123, 44, 191, 0.08)',
                        border: '1px solid rgba(123, 44, 191, 0.25)',
                        fontSize: '12px',
                        color: '#4a1d96',
                      }}
                    >
                      "{solicitudDetalle.observaciones_coordinador}"
                    </p>
                  </div>
                )}

                {solicitudDetalle.proveedor && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(44, 172, 208, 0.08)',
                      border: '1px solid rgba(44, 172, 208, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#013a52', marginBottom: '8px' }}>
                      Datos de Compra y Factura:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', fontSize: '11.5px' }}>
                      <div>Proveedor: <strong>{solicitudDetalle.proveedor}</strong></div>
                      <div>Factura: <strong>{solicitudDetalle.numero_factura_orden || 'S/N'}</strong></div>
                      <div>Fecha Compra: <strong>{fmtDate(solicitudDetalle.fecha_compra)}</strong></div>
                      <div>
                        Valor Total: <strong style={{ color: '#15803d' }}>${Number(solicitudDetalle.valor_final_compra || 0).toLocaleString('es-CO')}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie */}
              <div
                style={{
                  padding: '14px 22px',
                  backgroundColor: 'var(--surface-2, #f8fafc)',
                  borderTop: '1px solid var(--line, #e2e8f0)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalDetalleOpen(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: '#013a52',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Proveedores Recomendados (Admin y Coordinador) */}
      <ModalProveedoresRecomendados
        isOpen={modalProveedoresOpen}
        onClose={() => setModalProveedoresOpen(false)}
      />
    </div>
  );
}
