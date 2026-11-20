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
    proyecto_steam: 'Robótica',
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
    proyecto_steam: 'TeachLabs',
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
    proyecto_steam: 'Nuevas Tecnologías',
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
      pendientes: list.filter((s) => s.estado === 'Pendiente' || s.estado === 'En Evaluación').length,
      aprobadas: list.filter((s) => s.estado === 'Aprobada').length,
      compradas: list.filter((s) => s.estado === 'Comprada').length,
      rechazadas: list.filter((s) => s.estado === 'Rechazada').length,
    };
  }, [solicitudes]);

  // Filtrado de solicitudes según pestaña activa y criterios de búsqueda
  const solicitudesFiltradas = useMemo(() => {
    return (solicitudes || []).filter((sol) => {
      // Filtro pestaña
      if (pestanaActiva === 'pendientes' && sol.estado !== 'Pendiente' && sol.estado !== 'En Evaluación') {
        return false;
      }
      if (pestanaActiva === 'aprobadas' && sol.estado !== 'Aprobada') {
        return false;
      }
      if (pestanaActiva === 'compradas' && sol.estado !== 'Comprada') {
        return false;
      }
      if (pestanaActiva === 'rechazadas' && sol.estado !== 'Rechazada') {
        return false;
      }

      // Filtro Sede
      if (filtroSede !== 'todas' && sol.sede_destino !== filtroSede) {
        return false;
      }

      // Filtro Proyecto STEAM
      if (filtroProyecto !== 'todos' && sol.proyecto_steam !== filtroProyecto) {
        return false;
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
    <div className="gestion-compras-view" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* =========================================================================
          1. HEADER INSTITUCIONAL Y STEPPER DE 3 ETAPAS
          ========================================================================= */}
      <div
        className="compras-header p-5 rounded-2xl mb-6 shadow-sm border"
        style={{
          background: 'linear-gradient(135deg, #013a52 0%, #0a3c63 100%)',
          color: '#ffffff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ backgroundColor: '#abd037', color: '#013a52' }}
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
                  Gestión de Compras y Adquisiciones
                </h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'rgba(171, 208, 55, 0.25)', color: '#abd037', border: '1px solid #abd037' }}
                >
                  Flujo Oficial SIGA-FMO
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 m-0 mt-0.5">
                Evaluación técnica de requerimientos pedagógicos, cruce con bodega y control de facturas institucionales.
              </p>
            </div>
          </div>

          {/* Botón Exportar a Excel */}
          <button
            type="button"
            onClick={handleExportarExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md self-start md:self-auto"
            style={{
              backgroundColor: '#abd037',
              color: '#013a52',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#96b82d';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#abd037';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Exportar listado actual a Excel con auditoría contable"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.3]" />
            <span>Exportar a Excel (.xlsx)</span>
          </button>
        </div>

        {/* Barra de Progreso Visual de 3 Etapas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/10">
          {/* Etapa 1 */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
              pestanaActiva === 'pendientes'
                ? 'bg-white/15 border-[#abd037] shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            onClick={() => setPestanaActiva('pendientes')}
            role="button"
            tabIndex={0}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: '#f59e0b', color: '#ffffff' }}
            >
              1
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Solicitud & Evaluación</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-extrabold">
                  {conteos.pendientes}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">Revisión técnica y cruce con bodega</div>
            </div>
          </div>

          {/* Etapa 2 */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
              pestanaActiva === 'aprobadas'
                ? 'bg-white/15 border-[#abd037] shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            onClick={() => setPestanaActiva('aprobadas')}
            role="button"
            tabIndex={0}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: '#2cacd0', color: '#ffffff' }}
            >
              2
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Aprobación & Adquisición</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/30 text-cyan-200 font-extrabold">
                  {conteos.aprobadas}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">Órdenes autorizadas pendientes de factura</div>
            </div>
          </div>

          {/* Etapa 3 */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
              pestanaActiva === 'compradas'
                ? 'bg-white/15 border-[#abd037] shadow-inner'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            onClick={() => setPestanaActiva('compradas')}
            role="button"
            tabIndex={0}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: '#abd037', color: '#013a52' }}
            >
              3
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Compra & Recepción</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#abd037]/30 text-[#abd037] font-extrabold">
                  {conteos.compradas}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">Ingreso al inventario oficial FMO</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. PESTAÑAS DE FILTRO Y BARRA DE BÚSQUEDA
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        {/* Pestañas de Estado con Contadores */}
        <div className="flex items-center gap-2 flex-wrap">
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
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-sm'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={{
                  backgroundColor: isActive ? '#abd037' : 'var(--surface-2, #ffffff)',
                  color: isActive ? '#013a52' : '#6d6e71',
                  border: isActive ? '1.5px solid #96b82d' : '1px solid var(--line, #e2e8f0)',
                  fontWeight: isActive ? 700 : 600,
                }}
              >
                <span>{tab.label}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{
                    backgroundColor: isActive ? '#013a52' : 'rgba(109, 110, 113, 0.12)',
                    color: isActive ? '#ffffff' : '#6d6e71',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Buscador Rápido */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por radicado, solicitante, ítem o factura..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#013a52] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#abd037]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filtros Secundarios: Sede y Proyecto STEAM */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-wrap text-xs font-semibold">
        <span className="text-[#6d6e71] flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5" />
          Filtros de auditoría:
        </span>

        {/* Filtro Sede */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#013a52] dark:text-slate-300 font-bold">Sede:</span>
          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="rounded-lg px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
          >
            <option value="todas">Todas las sedes</option>
            {sedesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Filtro Proyecto */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#013a52] dark:text-slate-300 font-bold">Proyecto STEAM:</span>
          <select
            value={filtroProyecto}
            onChange={(e) => setFiltroProyecto(e.target.value)}
            className="rounded-lg px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
          >
            <option value="todos">Todos los proyectos</option>
            <option value="Robótica">Robótica</option>
            <option value="TeachLabs">TeachLabs</option>
            <option value="Nuevas Tecnologías">Nuevas Tecnologías</option>
            <option value="Habilidades Socioemocionales">Habilidades Socioemocionales</option>
            <option value="Inglés">Inglés</option>
            <option value="Becas 'Educando para el Futuro'">Becas "Educando para el Futuro"</option>
          </select>
        </div>

        <div className="ml-auto text-[#6d6e71] text-xs">
          Mostrando <strong className="text-[#013a52] dark:text-white">{solicitudesFiltradas.length}</strong> de{' '}
          <strong>{solicitudes.length}</strong> solicitudes registradas
        </div>
      </div>

      {/* =========================================================================
          3. TABLA AUDITADA DE SOLICITUDES DE COMPRA
          ========================================================================= */}
      {solicitudesFiltradas.length === 0 ? (
        <div
          className="p-10 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 my-4 shadow-sm"
        >
          <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-base font-bold text-[#013a52] dark:text-white m-0">
            No se encontraron solicitudes de compra
          </h3>
          <p className="text-xs text-[#6d6e71] m-0 mt-1 max-w-md mx-auto">
            No hay requerimientos que coincidan con la pestaña seleccionada o los filtros aplicados.
          </p>
        </div>
      ) : (
        <div
          className="table-responsive rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto"
        >
          <table style={{ tableLayout: 'fixed', width: '100%', minWidth: '1150px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #abd037' }}>
                <th style={{ width: '13%', minWidth: '120px', padding: '12px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  RADICADO / FECHA
                </th>
                <th style={{ width: '18%', minWidth: '170px', padding: '12px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  SOLICITANTE & SEDE
                </th>
                <th style={{ width: '14%', minWidth: '135px', padding: '12px 10px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  PROYECTO STEAM
                </th>
                <th style={{ width: '22%', minWidth: '210px', padding: '12px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  DETALLE DE ÍTEMS
                </th>
                <th style={{ width: '12%', minWidth: '110px', padding: '12px 10px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  ESTADO
                </th>
                <th style={{ width: '14%', minWidth: '135px', padding: '12px 10px', textAlign: 'left', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  COMPRA & FACTURA
                </th>
                <th style={{ width: '17%', minWidth: '160px', padding: '12px 10px', textAlign: 'center', fontSize: '11.5px', fontWeight: 700, color: '#013a52' }}>
                  ACCIONES
                </th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((sol) => {
                const totalItems = Array.isArray(sol.items) ? sol.items.length : 0;
                const primerItem = sol.items && sol.items[0];

                // Badges de estado oficiales
                let badgeEstadoClass = 'bg-amber-100 text-amber-800 border-amber-300';
                if (sol.estado === 'En Evaluación') {
                  badgeEstadoClass = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300';
                } else if (sol.estado === 'Aprobada') {
                  badgeEstadoClass = 'bg-lime-100 text-emerald-900 border-lime-400 dark:bg-lime-950/40 dark:text-lime-300';
                } else if (sol.estado === 'Comprada') {
                  badgeEstadoClass = 'bg-cyan-100 text-cyan-900 border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300';
                } else if (sol.estado === 'Rechazada') {
                  badgeEstadoClass = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
                }

                return (
                  <tr
                    key={sol.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    style={{ borderBottom: '1px solid var(--line, #e2e8f0)' }}
                  >
                    {/* 1. Radicado / Fecha */}
                    <td style={{ width: '13%', minWidth: '120px', maxWidth: 0, padding: '10px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <span
                        className="badge-placa inline-block font-mono font-bold text-xs px-2.5 py-1 rounded-md"
                        style={{
                          backgroundColor: 'rgba(1, 58, 82, 0.08)',
                          color: '#013a52',
                          border: '1px solid rgba(1, 58, 82, 0.2)',
                        }}
                      >
                        {sol.radicado || sol.id}
                      </span>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        {fmtDate(sol.creado_en || sol.fecha_requerida)}
                      </div>
                    </td>

                    {/* 2. Solicitante & Sede */}
                    <td style={{ width: '18%', minWidth: '170px', maxWidth: 0, padding: '10px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <strong className="block text-xs font-bold text-[#013a52] dark:text-white truncate" title={sol.solicitante_nombre}>
                        {sol.solicitante_nombre}
                      </strong>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="sede-badge municipal truncate block text-[10px]"
                          title={`Sede: ${sol.sede_destino}`}
                        >
                          {sol.sede_destino}
                        </span>
                      </div>
                    </td>

                    {/* 3. Proyecto STEAM */}
                    <td style={{ width: '14%', minWidth: '135px', maxWidth: 0, padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <div className="flex justify-center items-center min-w-0">
                        <ProgramAreaBadge area={sol.proyecto_steam || 'Robótica'} size="sm" />
                      </div>
                    </td>

                    {/* 4. Detalle de Ítems */}
                    <td style={{ width: '22%', minWidth: '210px', maxWidth: 0, padding: '10px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {primerItem ? (
                        <div className="min-w-0">
                          <strong className="block text-xs font-semibold text-[#013a52] dark:text-slate-200 truncate" title={primerItem.nombre}>
                            {primerItem.nombre}
                          </strong>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>Sol: <strong className="text-[#013a52] dark:text-white">{primerItem.cantidad_solicitada || 1}</strong></span>
                            {primerItem.cantidad_aprobada !== undefined && (
                              <span>· Aprob: <strong className="text-emerald-700 dark:text-emerald-400">{primerItem.cantidad_aprobada}</strong></span>
                            )}
                            {totalItems > 1 && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                (+{totalItems - 1} más)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin ítems detallados</span>
                      )}
                    </td>

                    {/* 5. Estado */}
                    <td style={{ width: '12%', minWidth: '110px', maxWidth: 0, padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle', overflow: 'hidden' }}>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeEstadoClass}`}
                      >
                        {sol.estado === 'Pendiente' && <Clock className="w-3 h-3" />}
                        {sol.estado === 'En Evaluación' && <Sparkles className="w-3 h-3" />}
                        {sol.estado === 'Aprobada' && <CheckCircle2 className="w-3 h-3" />}
                        {sol.estado === 'Comprada' && <PackageCheck className="w-3 h-3" />}
                        {sol.estado === 'Rechazada' && <XCircle className="w-3 h-3" />}
                        <span>{sol.estado}</span>
                      </span>
                    </td>

                    {/* 6. Compra & Factura */}
                    <td style={{ width: '14%', minWidth: '135px', maxWidth: 0, padding: '10px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {sol.proveedor ? (
                        <div className="min-w-0">
                          <strong className="block text-xs font-bold text-[#013a52] dark:text-slate-200 truncate" title={sol.proveedor}>
                            {sol.proveedor}
                          </strong>
                          <div className="text-[11px] text-slate-500 truncate">
                            Fact: {sol.numero_factura_orden || 'S/N'}
                          </div>
                          {sol.valor_final_compra > 0 && (
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ${sol.valor_final_compra.toLocaleString('es-CO')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {sol.estado === 'Aprobada' ? 'Pendiente de orden' : 'No registrada'}
                        </span>
                      )}
                    </td>

                    {/* 7. Acciones */}
                    <td style={{ width: '17%', minWidth: '160px', padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {/* Botón Ver Detalle */}
                        <button
                          type="button"
                          onClick={() => {
                            setSolicitudDetalle(sol);
                            setModalDetalleOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#013a52] hover:border-[#013a52] transition-all cursor-pointer"
                          title="Ver detalle completo de la solicitud"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botón Evaluar (Etapa 1: Pendiente o En Evaluación) */}
                        {(sol.estado === 'Pendiente' || sol.estado === 'En Evaluación') && (isCoordinador || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleAbrirEvaluar(sol)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                            style={{ backgroundColor: '#7B2CBF' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#63209E')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#7B2CBF')}
                            title="Evaluar requerimiento pedagógico y autorizar cantidades"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Evaluar</span>
                          </button>
                        )}

                        {/* Botón Registrar Compra (Etapa 2: Aprobada) */}
                        {sol.estado === 'Aprobada' && (isCoordinador || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleAbrirRegistrarCompra(sol)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                            style={{ backgroundColor: '#2CACD0' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2292B3')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2CACD0')}
                            title="Registrar factura u orden de compra comercial"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Registrar Compra</span>
                          </button>
                        )}

                        {/* Botón + Ingresar a Inventario (Etapa 3: Comprada) */}
                        {sol.estado === 'Comprada' && (isCoordinador || isAdmin) && (
                          sol.ingresado_inventario ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                              title="Los ítems ya están registrados en el inventario oficial"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>En Inventario</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleIngresarAInventario(sol)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                              style={{ backgroundColor: '#abd037', color: '#013a52' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#96b82d')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#abd037')}
                              title="Precargar estos ítems adquiridos en el catálogo oficial de bodega"
                            >
                              <PackagePlus className="w-3.5 h-3.5 stroke-[2.4]" />
                              <span>+ Ingresar a Bodega</span>
                            </button>
                          )
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => !evalSubmitting && setModalEvaluarOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Poppins', sans-serif" }}
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
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => !compraSubmitting && setModalRegistrarCompraOpen(false)}
        >
          <div
            className="w-full max-w-xl flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Poppins', sans-serif" }}
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
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#013a52] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2cacd0]"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setModalDetalleOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Poppins', sans-serif" }}
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
