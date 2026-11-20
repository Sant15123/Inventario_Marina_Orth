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
} from 'lucide-react';
import ProgramAreaBadge from '../components/common/ProgramAreaBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import inventoryApi from '../services/inventoryApi';
import { fmtDate, today } from '../services/mockData';
import { useProyectos } from '../hooks/useProyectos';
import { normalizeProyectoNombre } from '../constants/proyectos';
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

// Formato amigable de código radicado
export const formatRadicado = (id, radicado) => {
  if (radicado && String(radicado).trim()) {
    const radStr = String(radicado).trim();
    if (radStr.length <= 14) return radStr;
    return `#${radStr.slice(0, 8).toUpperCase()}`;
  }
  if (id && String(id).trim()) {
    const idStr = String(id).trim();
    return `#${idStr.slice(0, 8).toUpperCase()}`;
  }
  return '#SOL-FMO';
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

  // 1. Carga inicial de solicitudes desde Supabase o localStorage con respaldo DEMO
  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getSolicitudesCompra();
      if (Array.isArray(data) && data.length > 0) {
        setSolicitudes(data);
      } else {
        // Inicializar desde localStorage o fallback semilla
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
    } catch (err) {
      console.warn('Fallback al cargar solicitudes de compra:', err.message);
      setSolicitudes(SOLICITUDES_COMPRA_DEMO);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();

    const handleSolicitudCreada = (e) => {
      const nueva = e.detail;
      if (nueva) {
        cargarSolicitudes();
      }
    };
    window.addEventListener('siga:solicitud_creada', handleSolicitudCreada);
    return () => window.removeEventListener('siga:solicitud_creada', handleSolicitudCreada);
  }, []);

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
      if (filtroSede !== 'todas' && sol.sede_destino !== filtroSede && sol.sede !== filtroSede) {
        return false;
      }

      // Filtro Proyecto STEAM (Unificado)
      if (filtroProyecto !== 'todos') {
        const canonicalSol = normalizeProyectoNombre(sol.proyecto_steam);
        const canonicalFiltro = normalizeProyectoNombre(filtroProyecto);
        if (canonicalSol !== canonicalFiltro && sol.proyecto_steam !== filtroProyecto) {
          return false;
        }
      }

      // Búsqueda libre
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = [
          sol.radicado,
          sol.solicitante_nombre,
          sol.solicitante_correo,
          sol.sede_destino,
          sol.proyecto_steam,
          sol.proveedor,
          sol.numero_factura_orden,
          sol.justificacion,
          Array.isArray(sol.items) ? sol.items.map((i) => i.nombre).join(' ') : '',
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
      if (s.sede_destino) set.add(s.sede_destino);
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
    if (Array.isArray(sol.items)) {
      sol.items.forEach((it, idx) => {
        iniciales[idx] = it.cantidad_aprobada !== undefined ? it.cantidad_aprobada : it.cantidad_solicitada || 1;
      });
    }
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
      const itemsActualizados = (solicitudAEvaluar.items || []).map((it, idx) => ({
        ...it,
        cantidad_aprobada: decisionFinal === 'Rechazada' ? 0 : Number(evalCantidadesAprobadas[idx] ?? it.cantidad_solicitada),
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

      await inventoryApi.updateSolicitudCompra(solicitudAEvaluar.id, patch);

      const actualizadas = solicitudes.map((s) => (s.id === solicitudAEvaluar.id ? { ...s, ...patch } : s));
      syncLocal(actualizadas);

      showSuccess(
        `Solicitud ${decisionFinal}`,
        `La solicitud ${solicitudAEvaluar.radicado} ha pasado al estado "${decisionFinal}".`
      );
      setModalEvaluarOpen(false);
      setSolicitudAEvaluar(null);
    } catch (err) {
      showError('Error al guardar evaluación', err.message || 'No se pudo actualizar la solicitud.');
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
    setCompraNotas('');
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

      await inventoryApi.updateSolicitudCompra(solicitudAComprar.id, patch);

      const actualizadas = solicitudes.map((s) => (s.id === solicitudAComprar.id ? { ...s, ...patch } : s));
      syncLocal(actualizadas);

      showSuccess(
        'Compra Registrada',
        `Se registró la compra para ${solicitudAComprar.radicado} (Factura: ${compraFactura}). Ya puedes ingresarla al inventario.`
      );
      setModalRegistrarCompraOpen(false);
      setSolicitudAComprar(null);
    } catch (err) {
      showError('Error al registrar compra', err.message || 'No se pudo guardar la compra.');
    } finally {
      setCompraSubmitting(false);
    }
  };

  // Acción rápida: Ingresar Ítems Comprados a la Bodega / Inventario Oficial
  const handleIngresarAInventario = async (sol) => {
    try {
      const patch = { ingresado_inventario: true };
      await inventoryApi.updateSolicitudCompra(sol.id, patch);

      const actualizadas = solicitudes.map((s) => (s.id === sol.id ? { ...s, ingresado_inventario: true } : s));
      syncLocal(actualizadas);

      showSuccess(
        'Ingreso a Bodega Confirmado',
        `Los ítems de ${sol.radicado} fueron precargados en el inventario oficial de la Fundación Marina Orth.`
      );
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

      // Relleno de datos
      solicitudesFiltradas.forEach((sol) => {
        const itemsStr = (sol.items || [])
          .map((i) => `${i.nombre} (Sol: ${i.cantidad_solicitada || 1}, Aprob: ${i.cantidad_aprobada ?? '—'})`)
          .join('; ');

        const row = worksheet.addRow([
          sol.radicado,
          fmtDate(sol.creado_en || sol.fecha_requerida),
          sol.solicitante_nombre,
          sol.sede_destino,
          sol.proyecto_steam,
          itemsStr,
          sol.estado,
          sol.proveedor ? `${sol.proveedor} (${sol.numero_factura_orden || 'S/N'})` : 'Pendiente de compra',
          sol.valor_final_compra || sol.valor_estimado_compra || 0,
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
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Solicitud & Evaluación
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '6px' }}>
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
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Aprobación & Adquisición
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '6px' }}>
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
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-h, #013a52)' }}>
              Compra & Recepción
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', marginTop: '6px' }}>
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
              minWidth: '980px',
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
                    width: '13%',
                    minWidth: '115px',
                    padding: '12px 14px',
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
                    width: '17%',
                    minWidth: '150px',
                    padding: '12px 12px',
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
                    width: '14%',
                    minWidth: '130px',
                    padding: '12px 10px',
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
                    width: '20%',
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
                    width: '16%',
                    minWidth: '165px',
                    padding: '12px 10px',
                    textAlign: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ESTADO
                </th>
                <th
                  style={{
                    width: '10%',
                    minWidth: '110px',
                    padding: '12px 10px',
                    textAlign: 'left',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  COMPRA & FACTURA
                </th>
                <th
                  style={{
                    width: '10%',
                    minWidth: '115px',
                    padding: '12px 12px',
                    textAlign: 'center',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((sol) => {
                const totalItems = Array.isArray(sol.items) ? sol.items.length : 0;
                const primerItem = sol.items && sol.items[0];
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
                    <td style={{ width: '13%', minWidth: '115px', padding: '12px 14px', verticalAlign: 'middle' }}>
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
                          {formatRadicado(sol.id, sol.radicado)}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-dim, #6d6e71)',
                            marginTop: '4px',
                            whiteSpace: 'nowrap',
                          }}
                          title={fmtDate(sol.creado_en || sol.fecha_requerida)}
                        >
                          {fmtDate(sol.creado_en || sol.fecha_requerida)}
                        </span>
                      </div>
                    </td>

                    {/* 2. Solicitante & Sede */}
                    <td style={{ width: '17%', minWidth: '150px', padding: '12px 12px', verticalAlign: 'middle', overflow: 'hidden' }}>
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
                          title={sol.solicitante_nombre || sol.solicitante || 'Sin asignar'}
                        >
                          {sol.solicitante_nombre || sol.solicitante || (
                            <span style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic', fontWeight: 400 }}>Sin asignar</span>
                          )}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {sol.sede_destino || sol.sede ? (
                            <span
                              className="sede-badge municipal"
                              style={{
                                fontSize: '10px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                              title={`Sede: ${sol.sede_destino || sol.sede}`}
                            >
                              {sol.sede_destino || sol.sede}
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>Sede sin asignar</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Proyecto STEAM */}
                    <td style={{ width: '14%', minWidth: '130px', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                        <ProgramAreaBadge area={sol.proyecto_steam || 'Robótica'} size="sm" />
                      </div>
                    </td>

                    {/* 4. Detalle de Ítems */}
                    <td style={{ width: '20%', minWidth: '170px', padding: '12px 12px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {primerItem ? (
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
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
                            <span>Sol: <strong style={{ color: 'var(--text-h, #013a52)' }}>{primerItem.cantidad_solicitada || 1}</strong></span>
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

                    {/* 5. Estado (Con ancho y estilo robusto sin solapamiento) */}
                    <td style={{ width: '16%', minWidth: '165px', padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            fontFamily: "'Poppins', sans-serif",
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            boxSizing: 'border-box',
                            ...estadoConfig.badgeStyle,
                          }}
                        >
                          <EstadoIcon style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{estadoConfig.label}</span>
                        </span>
                      </div>
                    </td>

                    {/* 6. Compra & Factura */}
                    <td style={{ width: '10%', minWidth: '110px', padding: '12px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {sol.proveedor ? (
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <strong
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--text-h, #013a52)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={sol.proveedor}
                          >
                            {sol.proveedor}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Fact: {sol.numero_factura_orden || 'S/N'}
                          </div>
                          {sol.valor_final_compra > 0 && (
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4d7c0f' }}>
                              ${sol.valor_final_compra.toLocaleString('es-CO')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted, #94a3b8)',
                            fontStyle: 'italic',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {normalizeEstado(sol.estado) === 'aprobadas' ? 'Pendiente orden' : 'No registrada'}
                        </span>
                      )}
                    </td>

                    {/* 7. Acciones */}
                    <td style={{ width: '10%', minWidth: '115px', padding: '12px 12px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(171, 208, 55, 0.2)',
                                color: '#4d7c0f',
                                border: '1px solid rgba(171, 208, 55, 0.45)',
                                flexShrink: 0,
                              }}
                              title="Los ítems ya están registrados en el inventario oficial"
                            >
                              <PackageCheck size={13} />
                              <span>Ingresado</span>
                            </span>
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
          MODAL 1: EVALUAR SOLICITUD DE COMPRA (2 COLUMNAS)
          ========================================================================= */}
      {modalEvaluarOpen && solicitudAEvaluar && (
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
            backgroundColor: 'rgba(1, 58, 82, 0.65)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '840px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface, #ffffff)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px -10px rgba(1, 58, 82, 0.35)',
              border: '1px solid var(--line, #e2e8f0)',
              overflow: 'hidden',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {/* Header del Modal */}
            <div
              className="p-5 flex items-center justify-between text-white shrink-0"
              style={{ backgroundColor: '#7B2CBF' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold m-0 text-white">
                    Evaluar Solicitud de Compra — {solicitudAEvaluar.radicado}
                  </h3>
                  <p className="text-xs text-purple-200 m-0 mt-0.5">
                    Revisión de justificación STEAM, verificación de stock en bodega y autorización de cantidades.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEvaluarOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido en 2 Columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', padding: '24px', overflowY: 'auto' }}>
              {/* Columna Izquierda: Información del Requerimiento */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#013a52] dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800 m-0">
                  1. Datos del Solicitante y Justificación
                </h4>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Docente / Solicitante:</span>{' '}
                    <strong className="text-[#013a52] dark:text-white font-bold">{solicitudAEvaluar.solicitante_nombre}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Sede / Municipio Destino:</span>{' '}
                    <strong className="text-[#013a52] dark:text-white font-bold">{solicitudAEvaluar.sede_destino}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Proyecto STEAM:</span>{' '}
                    <div className="inline-block ml-1">
                      <ProgramAreaBadge area={solicitudAEvaluar.proyecto_steam} size="sm" />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Fecha Requerida:</span>{' '}
                    <strong className="text-[#013a52] dark:text-white">{fmtDate(solicitudAEvaluar.fecha_requerida)}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Justificación Pedagógica / Necesidad:
                  </label>
                  <p className="text-xs text-slate-700 dark:text-slate-300 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 m-0 leading-relaxed italic">
                    "{solicitudAEvaluar.justificacion || 'Sin justificación registrada.'}"
                  </p>
                </div>

                {/* Lista de Ítems Solicitados con Enlace Externo */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-2">
                    Ítems Solicitados ({Array.isArray(solicitudAEvaluar.items) ? solicitudAEvaluar.items.length : 0}):
                  </label>
                  <div className="flex flex-col gap-2">
                    {(solicitudAEvaluar.items || []).map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#013a52] dark:text-white">{it.nombre}</strong>
                          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 text-[11px]">
                            Sol: {it.cantidad_solicitada || 1}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Categoría: {it.categoria_sugerida || 'Consumibles'}
                        </div>
                        {it.url_compra && (
                          <a
                            href={it.url_compra}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 mt-1.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver referencia comercial</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Cruce con Bodega y Decisión */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#013a52] dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800 m-0">
                  2. Cruce con Bodega y Dictamen Técnico
                </h4>

                {/* Alerta de Existencias en Bodega */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
                  <div className="font-bold text-[#013a52] dark:text-blue-300 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-4 h-4 text-[#2cacd0]" />
                    <span>Cruce Automático con Stock en Bodega:</span>
                  </div>
                  {(solicitudAEvaluar.items || []).map((it, idx) => {
                    const match = findStockEnBodega(it.nombre);
                    return (
                      <div key={idx} className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">{it.nombre}:</span>
                        {match ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                            {match.disponible || match.quantity || 0} disponibles en catálogo
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No disponible en bodega (Requiere compra)</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Ajuste de Cantidad Aprobada por Ítem */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-2">
                    Cantidades Aprobadas para Adquisición:
                  </label>
                  {(solicitudAEvaluar.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 mb-2 text-xs">
                      <span className="text-slate-700 dark:text-slate-300 truncate">{it.nombre}:</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[11px]">Aprobar:</span>
                        <input
                          type="number"
                          min="0"
                          max={it.cantidad_solicitada || 99}
                          value={evalCantidadesAprobadas[idx] ?? it.cantidad_solicitada}
                          onChange={(e) =>
                            setEvalCantidadesAprobadas((prev) => ({
                              ...prev,
                              [idx]: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                          className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Presupuesto Estimado */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Presupuesto Máximo Autorizado (COP):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      value={evalPresupuesto}
                      onChange={(e) => setEvalPresupuesto(e.target.value)}
                      placeholder="Ej: 650000"
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                    />
                  </div>
                </div>

                {/* Observaciones Obligatorias del Coordinador */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Concepto Técnico / Observaciones del Coordinador *:
                  </label>
                  <textarea
                    rows={3}
                    value={evalObservaciones}
                    onChange={(e) => setEvalObservaciones(e.target.value)}
                    placeholder="Describe el motivo de aprobación, ajustes presupuestales o justificación de rechazo..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                  />
                </div>
              </div>
            </div>

            {/* Pie de Acciones de Decisión */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setModalEvaluarOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-none cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {/* 1. Rechazar */}
                <button
                  type="button"
                  disabled={evalSubmitting}
                  onClick={() => handleGuardarEvaluacion('Rechazada')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                  style={{ backgroundColor: '#E0321C' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E0321C')}
                >
                  Rechazar Solicitud
                </button>

                {/* 2. Dejar en Evaluación */}
                <button
                  type="button"
                  disabled={evalSubmitting}
                  onClick={() => handleGuardarEvaluacion('En Evaluación')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                  style={{ backgroundColor: '#7B2CBF' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#63209E')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7B2CBF')}
                >
                  Dejar en Evaluación
                </button>

                {/* 3. Aprobar para Compra */}
                <button
                  type="button"
                  disabled={evalSubmitting}
                  onClick={() => handleGuardarEvaluacion('Aprobada')}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  style={{ backgroundColor: '#abd037', color: '#013a52' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#96b82d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#abd037')}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
                  <span>Aprobar para Compra</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REGISTRAR COMPRA EFECTUADA (COMPACTO)
          ========================================================================= */}
      {modalRegistrarCompraOpen && solicitudAComprar && (
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
            backgroundColor: 'rgba(1, 58, 82, 0.65)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface, #ffffff)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px -10px rgba(1, 58, 82, 0.35)',
              border: '1px solid var(--line, #e2e8f0)',
              overflow: 'hidden',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {/* Header del Modal */}
            <div
              className="p-5 flex items-center justify-between text-white shrink-0"
              style={{ backgroundColor: '#2CACD0' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold m-0 text-white">
                    Registrar Compra — {solicitudAComprar.radicado}
                  </h3>
                  <p className="text-xs text-sky-100 m-0 mt-0.5">
                    Ingresa los datos fiscales y la factura oficial de la adquisición.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRegistrarCompraOpen(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Compra */}
            <form onSubmit={handleGuardarRegistroCompra} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Proveedor */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Proveedor / Empresa Comercial *:
                  </label>
                  <input
                    type="text"
                    required
                    value={compraProveedor}
                    onChange={(e) => setCompraProveedor(e.target.value)}
                    placeholder="Ej: RobotShop Colombia, Panamericana, Homecenter"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
                  />
                </div>

                {/* Valor Total Facturado */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Valor Final Facturado (COP) *:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={compraValorFinal}
                      onChange={(e) => setCompraValorFinal(e.target.value)}
                      placeholder="Ej: 325000"
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
                    />
                  </div>
                </div>

                {/* N.° de Factura u Orden */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    N.° Factura / Orden de Compra *:
                  </label>
                  <input
                    type="text"
                    required
                    value={compraFactura}
                    onChange={(e) => setCompraFactura(e.target.value)}
                    placeholder="Ej: FAC-2026-9812"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
                  />
                </div>

                {/* Fecha de Compra */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Fecha de Compra *:
                  </label>
                  <input
                    type="date"
                    required
                    value={compraFecha}
                    onChange={(e) => setCompraFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
                  />
                </div>

                {/* Proyecto Destino (Solo Lectura) */}
                <div>
                  <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                    Proyecto Vinculado:
                  </label>
                  <div className="pt-1">
                    <ProgramAreaBadge area={solicitudAComprar.proyecto_steam} size="sm" />
                  </div>
                </div>
              </div>

              {/* Observaciones de Compra */}
              <div>
                <label className="block text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">
                  Notas de Compra / Garantía:
                </label>
                <textarea
                  rows={2}
                  value={compraNotas}
                  onChange={(e) => setCompraNotas(e.target.value)}
                  placeholder="Garantía de 12 meses, entregado con remisión en bodega..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
                />
              </div>

              {/* Pie de Acciones */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setModalRegistrarCompraOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-none cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={compraSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                  style={{ backgroundColor: '#2CACD0' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2292B3')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2CACD0')}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
                  <span>Confirmar Compra Realizada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: VER DETALLE COMPLETO DE LA SOLICITUD
          ========================================================================= */}
      {modalDetalleOpen && solicitudDetalle && (
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
            backgroundColor: 'rgba(1, 58, 82, 0.65)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface, #ffffff)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px -10px rgba(1, 58, 82, 0.35)',
              border: '1px solid var(--line, #e2e8f0)',
              overflow: 'hidden',
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <div className="p-5 flex items-center justify-between bg-slate-100 dark:bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#013a52] dark:text-white m-0">
                  Ficha de Solicitud de Compra — {solicitudDetalle.radicado}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalleOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-slate-500">Solicitante:</span>{' '}
                  <strong className="text-[#013a52] dark:text-white">{solicitudDetalle.solicitante_nombre}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Sede Destino:</span>{' '}
                  <strong className="text-[#013a52] dark:text-white">{solicitudDetalle.sede_destino}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Proyecto STEAM:</span>{' '}
                  <div className="inline-block ml-1">
                    <ProgramAreaBadge area={solicitudDetalle.proyecto_steam} size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Estado Actual:</span>{' '}
                  <strong className="font-bold text-[#013a52] dark:text-white">{solicitudDetalle.estado}</strong>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">Justificación:</h4>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 m-0 italic">
                  "{solicitudDetalle.justificacion}"
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#013a52] dark:text-slate-300 mb-2">Ítems Solicitados:</h4>
                <div className="flex flex-col gap-2">
                  {(solicitudDetalle.items || []).map((it, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <strong className="text-[#013a52] dark:text-white">{it.nombre}</strong>
                        <div className="text-[11px] text-slate-500">Cat: {it.categoria_sugerida}</div>
                      </div>
                      <div className="text-right">
                        <div>Sol: <strong>{it.cantidad_solicitada}</strong> | Aprob: <strong className="text-emerald-600">{it.cantidad_aprobada ?? '—'}</strong></div>
                        {it.url_compra && (
                          <a href={it.url_compra} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-600 font-bold inline-flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Link</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {solicitudDetalle.observaciones_coordinador && (
                <div>
                  <h4 className="text-xs font-bold text-[#013a52] dark:text-slate-300 mb-1">Observaciones de Coordinación:</h4>
                  <p className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800 m-0">
                    "{solicitudDetalle.observaciones_coordinador}"
                  </p>
                </div>
              )}

              {solicitudDetalle.proveedor && (
                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <div className="font-bold text-[#013a52] dark:text-cyan-200 mb-1">Datos de Compra y Factura:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>Proveedor: <strong>{solicitudDetalle.proveedor}</strong></div>
                    <div>Factura: <strong>{solicitudDetalle.numero_factura_orden}</strong></div>
                    <div>Fecha Compra: <strong>{fmtDate(solicitudDetalle.fecha_compra)}</strong></div>
                    <div>Valor Total: <strong className="text-emerald-700">${(solicitudDetalle.valor_final_compra || 0).toLocaleString('es-CO')}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 text-right">
              <button
                type="button"
                onClick={() => setModalDetalleOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#013a52] text-white cursor-pointer border-none"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
