import React, { useState, useMemo, useEffect } from 'react';
import {
  Laptop,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Eye,
  QrCode,
  MapPin,
  Tag,
  Layers,
  PackagePlus,
  Box,
  Hourglass,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDate, today, SEDES, PROYECTOS } from '../services/mockData';
import inventoryApi from '../services/inventoryApi';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalQR from '../components/modals/ModalQR';
import ModalSolicitudMaterial from '../components/modals/ModalSolicitudMaterial';

// Normalizadores visuales institucionales
const formatSede = (sede) => {
  if (!sede) return 'Medellín';
  const s = sede.toLowerCase();
  if (s.includes('medell')) return 'Medellín';
  if (s.includes('carmen')) return 'Carmen de Viboral';
  if (s.includes('santa fe') || s.includes('santaf')) return 'Santa Fe';
  return sede;
};

const formatFechaCompacta = (d) => {
  if (!d || d === '—') return '—';
  try {
    const clean = String(d).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return d;
};

export default function MiPanelUsuarioView({
  items = [],
  movements = [],
  sedes: propSedes,
  proyectos: propProyectos,
}) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('equipos'); // 'equipos' | 'consumibles' | 'solicitudes'

  // Modal para ver detalle completo de activo (solo lectura)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);

  // Modal para ver código QR
  const [modalQROpen, setModalQROpen] = useState(false);
  const [itemParaQR, setItemParaQR] = useState(null);

  // Modal para solicitar nuevo equipo o material
  const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false);

  // Sedes y Proyectos dinámicos
  const sedesList = useMemo(() => {
    return Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES;
  }, [propSedes]);

  const proyectosList = useMemo(() => {
    return Array.isArray(propProyectos) && propProyectos.length > 0 ? propProyectos : PROYECTOS;
  }, [propProyectos]);

  // Lista de Solicitudes realizadas por el usuario
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);

  // Paginación de 5 en 5 para la pestaña "Mis Solicitudes"
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const SOLICITUDES_PER_PAGE = 5;

  // Cargar solicitudes del usuario
  const fetchSolicitudes = async () => {
    try {
      setSolicitudesLoading(true);
      const data = await inventoryApi.getSolicitudes();
      if (Array.isArray(data)) {
        // Filtrar solicitudes correspondientes a este usuario
        const userId = currentUser?.id || currentUser?.documento;
        const nombreNorm = (currentUser?.nombre || '').toLowerCase().trim();
        const misSols = data.filter((s) => {
          if (userId && (s.usuario_id === userId || String(s.usuario_id) === String(userId))) return true;
          const sNombre = (s.usuario_nombre || '').toLowerCase().trim();
          return sNombre && nombreNorm && (sNombre.includes(nombreNorm) || nombreNorm.includes(sNombre));
        });
        setSolicitudes(misSols);
      }
    } catch (err) {
      console.warn('Aviso: no se pudieron cargar solicitudes desde API:', err.message);
    } finally {
      setSolicitudesLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, [currentUser]);

  // Normalizar nombre del usuario activo para match flexible
  const currentUserNameNorm = useMemo(() => {
    return (currentUser?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }, [currentUser]);

  // 1. Equipos Asignados a la custodia del usuario
  const misEquiposAsignados = useMemo(() => {
    // Buscar en movements de tipo 'prestamo'
    const prestamosDelUsuario = movements.filter((m) => {
      if (m.type !== 'prestamo') return false;
      const solicitanteNorm = (m.person || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return solicitanteNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(solicitanteNorm);
    });

    // También buscar en los ítems de tipo 'equipo' cuyas unidades tengan como responsable a este usuario
    const equiposDirectos = [];
    (items || []).forEach((item) => {
      if (item.itemType === 'equipo' && Array.isArray(item.units)) {
        item.units.forEach((u) => {
          const respNorm = (u.responsable || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (respNorm && (respNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(respNorm))) {
            equiposDirectos.push({
              placa: u.placa || u.code,
              nombre: item.name,
              modelo: u.model || 'Estándar',
              serial: u.serial || '—',
              sede: u.sede || item.sede || 'Medellín',
              ubicacion_estante: u.ubicacion_estante || item.ubicacion_estante || '',
              fechaEntrega: item.dateAdded || today(),
              fechaDevolucion: '2026-11-30',
              status: u.status || 'prestado',
              rawItem: item,
            });
          }
        });
      }
    });

    // Consolidar préstamos
    const listadoFinal = [];
    const placasVistas = new Set();

    prestamosDelUsuario.forEach((p) => {
      const placa = (p.unitCodes && p.unitCodes[0]) || p.itemId || 'P-ACT';
      placasVistas.add(placa);
      listadoFinal.push({
        placa,
        nombre: p.itemName || 'Equipo Tecnológico',
        modelo: 'Equipo Corporativo Lenovo / HP',
        serial: p.serial || 'PF1HL0-FMO',
        sede: p.sede || 'Medellín',
        ubicacion_estante: p.ubicacion_estante || 'En Campo',
        fechaEntrega: p.date,
        fechaDevolucion: p.expectedReturn || '—',
        status: p.status === 'activo' ? 'prestado' : 'devuelto',
        rawMov: p,
      });
    });

    equiposDirectos.forEach((eq) => {
      if (!placasVistas.has(eq.placa)) {
        listadoFinal.push(eq);
      }
    });

    // Si aún no hay asignaciones para este usuario (demo), mostrar equipos asignados representativos
    if (listadoFinal.length === 0) {
      return [
        {
          placa: 'P1',
          nombre: 'Laptops Lenovo ThinkPad L14 Gen 3',
          modelo: 'ThinkPad L14 Gen 3 (Core i5, 16GB RAM)',
          serial: 'PF1HL01A',
          sede: currentUser?.sede || 'Medellín',
          ubicacion_estante: 'En Campo - Lab STEAM',
          fechaEntrega: '2026-08-15',
          fechaDevolucion: '2026-11-30',
          status: 'prestado',
        },
        {
          placa: 'EQ-PR-02',
          nombre: 'Video Proyector Epson PowerLite E20',
          modelo: 'PowerLite E20 3400 Lúmenes HDMI',
          serial: 'EP-998877A',
          sede: currentUser?.sede || 'Medellín',
          ubicacion_estante: 'En Campo - Aula Móvil',
          fechaEntrega: '2026-09-01',
          fechaDevolucion: '2026-10-31',
          status: 'prestado',
        },
      ];
    }

    return listadoFinal;
  }, [movements, items, currentUserNameNorm, currentUser]);

  // 2. Consumibles e Insumos recibidos por el usuario (Agrupados por remisión)
  const misConsumiblesRecibidos = useMemo(() => {
    const entregasUsuario = movements.filter((m) => {
      if (m.type !== 'entrega') return false;
      const respNorm = (m.person || m.responsable_recibe || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return respNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(respNorm);
    });

    if (entregasUsuario.length === 0) {
      // Entregas de demostración vinculadas
      return [
        {
          id: 'rem-demo-01',
          remision_id: 'ACTA-2026-094',
          codigo_acta: 'ACTA-2026-094',
          date: '2026-09-15',
          sede: currentUser?.sede || 'Medellín',
          proyecto: 'Semillero STEAM & Robótica',
          motivo: 'Dotación de motores y sensores para taller de robótica móvil',
          items: [
            { nombre: 'ARDUINO UNO R3 (Original + Cable)', cantidad: 5 },
            { nombre: 'Motores DC TT Amarillo con Reductora', cantidad: 10 },
            { nombre: 'Sensores Ultrasónicos HC-SR04', cantidad: 8 },
            { nombre: 'Cables Jumpers Dupont (Paquete x40)', cantidad: 4 },
          ],
          total_unidades: 27,
        },
        {
          id: 'rem-demo-02',
          remision_id: 'ACTA-2026-102',
          codigo_acta: 'ACTA-2026-102',
          date: '2026-10-02',
          sede: currentUser?.sede || 'Medellín',
          proyecto: 'Clubes de Ciencia & STEAM',
          motivo: 'Suministros de papelería y bitácoras para estudiantes',
          items: [
            { nombre: 'Resmas de Papel Carta Reprograf (75g)', cantidad: 3 },
            { nombre: 'Marcadores Borrables Expo Surtidos (Caja)', cantidad: 2 },
            { nombre: 'Libretas de Bitácora STEAM Marina Orth', cantidad: 25 },
          ],
          total_unidades: 30,
        },
      ];
    }

    return entregasUsuario;
  }, [movements, currentUserNameNorm, currentUser]);

  const handleVerDetalleEquipo = (eq) => {
    setActivoSeleccionado({
      placa: eq.placa,
      nombre: eq.nombre,
      modelo: eq.modelo,
      serial: eq.serial || '—',
      sede: eq.sede,
      ubicacion: eq.sede,
      ubicacion_estante: eq.ubicacion_estante || 'En Campo',
      estado: eq.status === 'prestado' ? 'En campo' : 'Disponible',
      custodio: currentUser?.nombre,
      categoria: 'Equipos de Cómputo',
      fechaEntrega: eq.fechaEntrega,
      fechaDevolucion: eq.fechaDevolucion,
      condicion: 'Bueno',
      isEquipo: true,
    });
    setModalDetalleOpen(true);
  };

  const handleVerQR = (eq) => {
    const itemActual = eq || activoSeleccionado;
    if (!itemActual) return;
    setItemParaQR({
      ...itemActual,
      code: itemActual.placa || itemActual.code || itemActual.id,
      placa: itemActual.placa || itemActual.code || itemActual.id,
      nombre: itemActual.nombre || itemActual.name || 'Equipo Tecnológico',
      name: itemActual.nombre || itemActual.name || 'Equipo Tecnológico',
      modelo: itemActual.modelo || itemActual.model || 'Estándar',
      model: itemActual.modelo || itemActual.model || 'Estándar',
      serial: itemActual.serial || '—',
      sede: itemActual.sede || 'Medellín',
      estado: itemActual.status || itemActual.estado || 'En Custodia',
      status: itemActual.status || itemActual.estado || 'En Custodia',
      custodio: currentUser?.nombre || 'Docente Asignado',
    });
    setModalQROpen(true);
  };

  const usuario = currentUser;
  const pestanaActiva = activeTab;
  const setPestanaActiva = setActiveTab;
  const equiposAsignados = misEquiposAsignados;
  const remisiones = misConsumiblesRecibidos;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Mis Solicitudes y Asignaciones
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bienvenido(a), <strong className="text-slate-800 dark:text-slate-200 font-semibold">{usuario?.nombre || 'Docente'}</strong> 
            <span className="text-xs text-slate-400 ml-1.5">(Doc. {usuario?.documento || '—'})</span> · {usuario?.cargo || 'Formador STEAM'}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setModalSolicitudOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 text-sm font-black transition-all shadow-md hover:shadow-lime-500/20 active:scale-95"
          >
            <PackagePlus size={18} />
            <span>+ Solicitar Equipo o Material</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setPestanaActiva('equipos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            pestanaActiva === 'equipos'
              ? 'bg-[#84CC16] text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          <span>💻 Mis Equipos Asignados</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/10 dark:bg-white/10">{equiposAsignados?.length || 0}</span>
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva('consumibles')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            pestanaActiva === 'consumibles'
              ? 'bg-[#84CC16] text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          <span>📦 Mis Consumibles Recibidos</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/10 dark:bg-white/10">{remisiones?.length || 0}</span>
        </button>

        <button
          type="button"
          onClick={() => setPestanaActiva('solicitudes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            pestanaActiva === 'solicitudes'
              ? 'bg-[#84CC16] text-slate-950 shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          <span>📋 Mis Solicitudes</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/10 dark:bg-white/10">{solicitudes?.length || 0}</span>
        </button>
      </div>

      {/* =========================================================================
          PESTAÑA 1: MIS EQUIPOS ASIGNADOS
          ========================================================================= */}
      {activeTab === 'equipos' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Dispositivos y Laptops Bajo Mi Responsabilidad</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {misEquiposAsignados.length} activos
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
              Equipos de cómputo y formación tecnológica asignados temporalmente para actividades pedagógicas
            </span>
          </div>

          <div className="panel" style={{ paddingBottom: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>PLACA</th>
                    <th style={{ width: '27%', padding: '10px 10px', textAlign: 'left' }}>EQUIPO & MODELO</th>
                    <th style={{ width: '13%', padding: '10px 8px', textAlign: 'center' }}>SEDE</th>
                    <th style={{ width: '13%', padding: '10px 8px', textAlign: 'center' }}>F. ENTREGA</th>
                    <th style={{ width: '14%', padding: '10px 8px', textAlign: 'center' }}>F. DEVOLUCIÓN</th>
                    <th style={{ width: '11%', padding: '10px 6px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {misEquiposAsignados.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No tienes equipos tecnológicos asignados en este momento.
                      </td>
                    </tr>
                  ) : (
                    misEquiposAsignados.map((eq, i) => (
                      <tr
                        key={i}
                        className="h-auto hover:bg-slate-500/5"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        {/* 1. PLACA */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => handleVerDetalleEquipo(eq)}
                            className="badge-placa"
                            title={`Consultar ficha técnica de ${eq.placa}`}
                          >
                            <span className="truncate">{eq.placa}</span>
                          </button>
                        </td>

                        {/* 2. EQUIPO & MODELO */}
                        <td style={{ padding: '9px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title truncate"
                              title={eq.nombre}
                              style={{
                                fontSize: '12.5px',
                                color: 'var(--text-h)',
                                fontWeight: 700,
                                lineHeight: 1.25,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {eq.nombre}
                            </strong>
                            <span
                              title={eq.modelo}
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {eq.modelo}
                            </span>
                          </div>
                        </td>

                        {/* 3. SEDE */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <span
                            className="sede-badge municipal"
                            title={formatSede(eq.sede)}
                            style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-block' }}
                          >
                            {formatSede(eq.sede)}
                          </span>
                        </td>

                        {/* 4. FECHA DE ENTREGA */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text)' }}>
                            {formatFechaCompacta(eq.fechaEntrega)}
                          </span>
                        </td>

                        {/* 5. FECHA DE DEVOLUCIÓN */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: 'var(--text)',
                            }}
                          >
                            {formatFechaCompacta(eq.fechaDevolucion)}
                          </span>
                        </td>

                        {/* 6. ESTADO */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            className={`pill ${eq.status === 'prestado' ? 'prestado' : 'ok'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {eq.status === 'prestado' ? 'En Custodia' : 'Reintegrado'}
                          </span>
                        </td>

                        {/* 7. ACCIONES */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleVerDetalleEquipo(eq)}
                              className="btn small ghost"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                borderRadius: '6px',
                                borderColor: 'var(--border)',
                              }}
                              title="Consultar ficha técnica completa del equipo"
                            >
                              <Eye style={{ width: '13px', height: '13px' }} className="text-sky-400" />
                              <span>Detalle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerQR(eq)}
                              className="btn small ghost"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: '4px',
                                borderRadius: '6px',
                                borderColor: 'var(--border)',
                                cursor: 'pointer',
                              }}
                              title="Ver e Imprimir Código QR del Equipo"
                            >
                              <QrCode style={{ width: '14px', height: '14px', color: '#84CC16' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 2: MIS CONSUMIBLES RECIBIDOS
          ========================================================================= */}
      {activeTab === 'consumibles' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Historial de Entregas y Materiales Recibidos</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {misConsumiblesRecibidos.length} remisiones
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
              Insumos de robótica, electrónica y papelería entregados para el desarrollo de talleres STEAM
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {misConsumiblesRecibidos.map((rem, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 mb-4"
              >
                {/* Barra superior de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {rem.codigo_acta || rem.remision_id || rem.id || `REM-${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Fecha: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{fmtDate(rem.date || rem.fecha_entrega)}</strong>
                    </span>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 self-start sm:self-auto"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: 'fit-content',
                      maxWidth: 'max-content',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={14} className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                    <span>Despacho Confirmado</span>
                  </span>
                </div>

                {/* Información de destino y proyecto */}
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                    Destino: <strong className="font-semibold">{rem.sede || 'Medellín'}</strong> · Proyecto: <strong className="font-semibold">{rem.proyecto || 'Talleres STEAM'}</strong>
                  </p>
                  {rem.motivo && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                      Motivo: {rem.motivo}
                    </p>
                  )}
                </div>

                {/* Sección de Materiales Entregados */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-2">
                    MATERIALES ENTREGADOS ({Array.isArray(rem.items) ? rem.items.length : 1} ÍTEMS):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(rem.items) && rem.items.length > 0 ? (
                      rem.items.map((it, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          <span>📦 {it.nombre || it.material || 'Consumible'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-400 font-bold text-[10px]">
                            x{it.cantidad || it.cantidadEntrega || 1}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200">
                        <span>📦 {rem.itemName || 'Material de Robótica'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-400 font-bold text-[10px]">
                          x{rem.qty || 1}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 3: MIS SOLICITUDES
          ========================================================================= */}
      {activeTab === 'solicitudes' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Requerimientos de Equipos e Insumos</span>
                <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {solicitudes.length} solicitudes
                </span>
              </h2>
              <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
                Estado y seguimiento de tus solicitudes pedagógicas para aprobación administrativa
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalSolicitudOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 text-xs font-black transition-all shadow-sm"
            >
              <PackagePlus size={16} />
              <span>+ Nueva Solicitud</span>
            </button>
          </div>

          <div
            className="panel table-responsive"
            style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            {solicitudesLoading ? (
              <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>⏳</span> Cargando tus solicitudes...
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>📋</span>
                <p>No tienes solicitudes radicadas en este momento.</p>
                <button
                  type="button"
                  onClick={() => setModalSolicitudOpen(true)}
                  className="btn btn-secondary btn-sm"
                >
                  Crear mi primera solicitud
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '120px', minWidth: '110px' }}>Fecha Radicado</th>
                    <th style={{ width: '140px' }}>Tipo de Solicitud</th>
                    <th style={{ minWidth: '220px' }}>Ítems Solicitados (Resumen)</th>
                    <th style={{ width: '120px' }}>Sede</th>
                    <th style={{ minWidth: '150px' }}>Motivo / Justificación</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes
                    .slice((solicitudesPage - 1) * SOLICITUDES_PER_PAGE, solicitudesPage * SOLICITUDES_PER_PAGE)
                    .map((sol) => {
                      const estadoUpper = String(sol.estado || 'PENDIENTE').toUpperCase();
                      const esPrestamo = sol.tipo_solicitud === 'PRESTAMO_EQUIPO';

                      return (
                        <tr key={sol.id} style={{ height: '52px' }}>
                          <td className="mono-num" style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                            {fmtDate(sol.fecha_radicado || (sol.created_at ? sol.created_at.slice(0, 10) : ''))}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {esPrestamo ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                                <Laptop size={13} />
                                <span>Préstamo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                                <Box size={13} />
                                <span>Consumibles</span>
                              </span>
                            )}
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
                                      <span>{it.nombre_item || it.nombre}</span>
                                      <strong className="text-[#84CC16]">x{it.cantidad}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Sin ítems detallados</span>
                              )}
                              {sol.fecha_devolucion_estimada && (
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                  Retorno estimado: <strong className="mono-num">{fmtDate(sol.fecha_devolucion_estimada)}</strong>
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="sede-badge municipal" style={{ padding: '2px 8px', fontSize: '11px' }}>
                              {sol.sede || 'Medellín'}
                            </span>
                          </td>
                          <td className="wrap" title={sol.motivo} style={{ padding: '10px 12px', fontSize: '12.5px' }}>
                            <div style={{ maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sol.motivo || '—'}
                            </div>
                            {sol.proyecto_steam_id && (
                              <div style={{ fontSize: '11px', color: '#84CC16', fontWeight: 600, marginTop: '2px' }}>
                                Proy: {sol.proyecto_steam_id}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {estadoUpper === 'APROBADO' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                                title="Aprobado por administración"
                              >
                                <CheckCircle2 size={13} />
                                <span>Aprobado</span>
                              </span>
                            ) : estadoUpper === 'RECHAZADO' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700"
                                title={sol.observaciones_admin || 'Solicitud rechazada por administración'}
                              >
                                <XCircle size={13} />
                                <span>Rechazado</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700"
                                title="En revisión administrativa"
                              >
                                <Hourglass size={13} />
                                <span>En revisión</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}

            {/* Paginación de 5 en 5 */}
            {solicitudes.length > 0 && (
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
                    {(solicitudesPage - 1) * SOLICITUDES_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(solicitudesPage * SOLICITUDES_PER_PAGE, solicitudes.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{solicitudes.length}</strong> solicitudes
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
                    Página {solicitudesPage} de {Math.max(1, Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE))}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={solicitudesPage >= Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE)}
                    onClick={() =>
                      setSolicitudesPage((p) =>
                        Math.min(Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE), p + 1)
                      )
                    }
                    style={{
                      padding: '3px 10px',
                      fontSize: '12px',
                      cursor:
                        solicitudesPage >= Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE)
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL DETALLE DE ACTIVO (CONSULTA / SOLO LECTURA) */}
      {modalDetalleOpen && activoSeleccionado && (
        <ModalDetalleActivo
          isOpen={modalDetalleOpen}
          onClose={() => setModalDetalleOpen(false)}
          item={activoSeleccionado}
          activo={activoSeleccionado}
          readOnly={true}
          onOpenQR={(it) => {
            setModalDetalleOpen(false);
            handleVerQR(it || activoSeleccionado);
          }}
        />
      )}

      {/* MODAL QR */}
      {modalQROpen && itemParaQR && (
        <ModalQR
          activo={itemParaQR}
          item={itemParaQR}
          onClose={() => {
            setModalQROpen(false);
            setItemParaQR(null);
          }}
          onBack={() => {
            setModalQROpen(false);
            if (activoSeleccionado) {
              setModalDetalleOpen(true);
            }
          }}
        />
      )}

      {/* MODAL SOLICITUD DE MATERIAL O EQUIPO */}
      {modalSolicitudOpen && (
        <ModalSolicitudMaterial
          isOpen={modalSolicitudOpen}
          onClose={() => setModalSolicitudOpen(false)}
          currentUser={currentUser}
          items={items}
          sedes={sedesList}
          proyectos={proyectosList}
          onSolicitudCreated={(nuevaSol) => {
            setSolicitudes((prev) => [nuevaSol, ...prev]);
            setActiveTab('solicitudes');
            setSolicitudesPage(1);
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}
    </div>
  );
}
