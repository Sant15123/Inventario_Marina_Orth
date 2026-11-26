import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PackagePlus,
  ClipboardList,
  Laptop,
  CheckCircle2,
  XCircle,
  Hourglass,
  RotateCcw,
  Eye,
  QrCode,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';
import inventoryApi from '../../services/inventoryApi';
import { fmtDate, formatearFechaSegura, today, SEDES, PROYECTOS } from '../../services/mockData';
import { normalizeProyectoNombre } from '../../constants/proyectos';
import ModalSolicitudMaterial from '../modals/ModalSolicitudMaterial';
import ModalDetalleActivo from '../modals/ModalDetalleActivo';
import ModalQR from '../modals/ModalQR';

const normalizeText = (val) =>
  String(val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export default function CoordinadorMisSolicitudesSection({
  items = [],
  movements = [],
  sedes: propSedes = [],
  proyectos: propProyectos = [],
}) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('solicitudes'); // 'solicitudes' | 'activos'
  const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const [solicitudesPerPage, setSolicitudesPerPage] = useState(5);
  const [modalMotivoRechazo, setModalMotivoRechazo] = useState(null);

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);
  const [modalQROpen, setModalQROpen] = useState(false);
  const [itemParaQR, setItemParaQR] = useState(null);

  const sedesList = useMemo(() => {
    return Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES;
  }, [propSedes]);

  const proyectosList = useMemo(() => {
    return Array.isArray(propProyectos) && propProyectos.length > 0 ? propProyectos : PROYECTOS;
  }, [propProyectos]);

  const currentUserNameNorm = useMemo(
    () => normalizeText(currentUser?.nombre || currentUser?.nombre_completo),
    [currentUser]
  );

  const matchesCurrentUser = useCallback(
    (record) => {
      if (!record || !currentUser) return false;
      const userIds = [currentUser.id, currentUser.documento].filter(Boolean).map(String);
      if (record.usuario_id && userIds.includes(String(record.usuario_id))) return true;
      const sNombre = normalizeText(record.usuario_nombre || record.solicitante_nombre);
      return Boolean(
        sNombre &&
          currentUserNameNorm &&
          (sNombre === currentUserNameNorm ||
            sNombre.includes(currentUserNameNorm) ||
            currentUserNameNorm.includes(sNombre))
      );
    },
    [currentUser, currentUserNameNorm]
  );

  const fetchMisSolicitudes = useCallback(async () => {
    try {
      setLoadingSolicitudes(true);
      let dataFinal = [];

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
                  tipo_item,
                  cantidad,
                  item_id,
                  nombre_item,
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
                proyecto_steam: s.proyecto_steam || s.proyecto_steam_id || s.proyecto || '',
              }));
            }
          } catch {
            // Fallback handled below
          }

          try {
            const { data: cData, error: cErr } = await supabase
              .from('solicitudes_compra')
              .select('*')
              .order('creado_en', { ascending: false });

            if (!cErr && Array.isArray(cData)) {
              compList = cData.map((sc) => {
                const itemsArr =
                  Array.isArray(sc.items) && sc.items.length > 0
                    ? sc.items
                    : [
                        {
                          id: sc.id,
                          nombre_item: sc.nombre_producto || 'Producto sugerido',
                          nombre_sugerido: sc.nombre_producto || 'Producto sugerido',
                          cantidad: Number(sc.cantidad || sc.cantidad_solicitada) || 1,
                        },
                      ];
                return {
                  ...sc,
                  tipo: 'SUGERENCIA_COMPRA',
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  motivo: sc.justificacion || 'Sugerencia de compra',
                  items: itemsArr,
                  items_solicitud: itemsArr,
                  is_solicitud_compra: true,
                };
              });
            }
          } catch {
            // Fallback handled below
          }

          dataFinal = [...invList, ...compList].sort(
            (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
          );
        }
      } catch {
        // Fallback to backend API
      }

      if (dataFinal.length === 0) {
        const apiData = await inventoryApi.getSolicitudes();
        if (Array.isArray(apiData)) {
          dataFinal = apiData;
        }
      }

      const misSols = (Array.isArray(dataFinal) ? dataFinal : []).filter(matchesCurrentUser);
      setSolicitudes(misSols);
    } catch (err) {
      console.warn('Error cargando solicitudes propias del coordinador:', err?.message);
      setSolicitudes([]);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [matchesCurrentUser]);

  useEffect(() => {
    fetchMisSolicitudes();

    let canal = null;
    try {
      if (supabase) {
        canal = supabase
          .channel(`coord-mis-solicitudes-${currentUser?.id || 'anon'}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_inventario' }, () => {
            fetchMisSolicitudes();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_compra' }, () => {
            fetchMisSolicitudes();
          })
          .subscribe();
      }
    } catch {
      // Realtime opcional
    }

    const handleRefresh = () => fetchMisSolicitudes();
    window.addEventListener('siga:solicitud_creada', handleRefresh);
    window.addEventListener('siga:solicitud_resuelta', handleRefresh);

    return () => {
      if (canal && supabase) {
        supabase.removeChannel(canal).catch?.(() => {});
      }
      window.removeEventListener('siga:solicitud_creada', handleRefresh);
      window.removeEventListener('siga:solicitud_resuelta', handleRefresh);
    };
  }, [fetchMisSolicitudes, currentUser?.id]);

  // Activos reales actualmente asignados al Coordinador en sesión (préstamos activos o custodia directa)
  const misActivosAsignados = useMemo(() => {
    if (!currentUserNameNorm) return [];

    const listado = [];
    const placasVistas = new Set();

    (movements || []).forEach((m) => {
      if (m.type !== 'prestamo' || m.status !== 'activo') return;
      const personNorm = normalizeText(m.person);
      if (
        !personNorm ||
        (!personNorm.includes(currentUserNameNorm) && !currentUserNameNorm.includes(personNorm))
      ) {
        return;
      }
      const placa = (m.unitCodes && m.unitCodes[0]) || m.itemId || 'P-ACT';
      placasVistas.add(placa);
      listado.push({
        placa,
        nombre: m.itemName || 'Equipo Tecnológico',
        modelo: m.modelo || 'Equipo FMO',
        serial: m.serial || '—',
        sede: m.sede || 'Medellín',
        ubicacion_estante: m.ubicacion_estante || 'En Custodia',
        fechaEntrega: m.date,
        fechaDevolucion: m.expectedReturn || '—',
        status: 'prestado',
      });
    });

    (items || []).forEach((item) => {
      if ((item.itemType === 'equipo' || item.itemType === 'electronica') && Array.isArray(item.units)) {
        item.units.forEach((u) => {
          const respNorm = normalizeText(u.responsable || u.custodio);
          const statusLow = normalizeText(u.status || u.estado);
          const enPrestamo = statusLow.includes('prest') || statusLow.includes('campo');
          if (
            enPrestamo &&
            respNorm &&
            (respNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(respNorm))
          ) {
            const placa = u.placa || u.code;
            if (placa && !placasVistas.has(placa)) {
              placasVistas.add(placa);
              listado.push({
                placa,
                nombre: item.name || item.nombre || 'Equipo Institucional',
                modelo: u.model || u.modelo || 'Estándar',
                serial: u.serial || '—',
                sede: u.sede || item.sede || 'Medellín',
                ubicacion_estante: u.ubicacion_estante || item.ubicacion || 'En Campo',
                fechaEntrega: item.dateAdded || today(),
                fechaDevolucion: '—',
                status: 'prestado',
              });
            }
          }
        });
      }
    });

    return listado;
  }, [movements, items, currentUserNameNorm]);

  // Determinar si una solicitud aprobada de préstamo ya tiene su movimiento devuelto
  const isSolicitudDevuelta = useCallback(
    (sol) => {
      const est = String(sol?.estado || '').toUpperCase();
      if (est === 'DEVUELTA' || est === 'DEVUELTO') return true;
      if (!est.startsWith('APROB') && est !== 'DESPACHADA' && est !== 'ENTREGADA') return false;

      const solItems =
        Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0
          ? sol.items_solicitud
          : Array.isArray(sol.items)
            ? sol.items
            : [];

      const itemNames = solItems
        .map((it) => normalizeText(it.nombre_item || it.nombre))
        .filter(Boolean);
      const itemIds = solItems.map((it) => String(it.item_id || '')).filter(Boolean);

      const matchedLoans = (movements || []).filter((m) => {
        if (m.type !== 'prestamo') return false;
        const personNorm = normalizeText(m.person);
        if (
          !personNorm ||
          (!personNorm.includes(currentUserNameNorm) && !currentUserNameNorm.includes(personNorm))
        ) {
          return false;
        }
        const mItemName = normalizeText(m.itemName);
        const mItemId = String(m.itemId || '');
        const matchItem =
          itemIds.includes(mItemId) ||
          itemNames.some((n) => mItemName.includes(n) || n.includes(mItemName));
        if (!matchItem) return false;

        const fechaSol = new Date(sol.creado_en || 0).getTime();
        const fechaMov = new Date(m.date || 0).getTime();
        return !fechaSol || !fechaMov || fechaMov >= fechaSol - 86400000;
      });

      return matchedLoans.length > 0 && matchedLoans.every((m) => m.status === 'cerrado');
    },
    [movements, currentUserNameNorm]
  );

  const renderEstadoBadge = (sol) => {
    const est = String(sol.estado || 'PENDIENTE').toUpperCase().trim();
    const rawTipo = String(sol.tipo_solicitud || sol.tipo || '').toUpperCase();
    const esCompra = rawTipo === 'SUGERENCIA_COMPRA' || sol.is_solicitud_compra;
    const obsRechazo =
      sol.observaciones_admin || sol.observaciones_coordinador || sol.motivo_rechazo || '';

    if (isSolicitudDevuelta(sol)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700/60">
          <RotateCcw size={12} />
          <span>Devuelta</span>
        </span>
      );
    }

    if (est === 'COMPRADA' || est === 'COMPRADO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300">
          <CheckCircle2 size={12} />
          <span>Comprada</span>
        </span>
      );
    }

    if (est === 'APROBADA' || est === 'APROBADO' || est === 'DESPACHADA' || est === 'ENTREGADA') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/60">
          <CheckCircle2 size={12} />
          <span>{esCompra ? 'Aprobada (Compra)' : 'Aprobada'}</span>
        </span>
      );
    }

    if (est === 'EN EVALUACION' || est === 'EN EVALUACIÓN' || est === 'EN_EVALUACION') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300">
          <Hourglass size={12} />
          <span>En Evaluación</span>
        </span>
      );
    }

    if (est === 'RECHAZADA' || est === 'RECHAZADO') {
      return (
        <div className="flex flex-col items-center gap-1">
          <span
            onClick={() => obsRechazo && setModalMotivoRechazo({ solicitud: sol, motivo: obsRechazo })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700/60"
            style={{ cursor: obsRechazo ? 'pointer' : 'default' }}
            title={obsRechazo ? `Ver motivo: ${obsRechazo}` : 'Solicitud rechazada'}
          >
            <XCircle size={12} />
            <span>Rechazada</span>
            {obsRechazo && <Info size={11} />}
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60">
        <Hourglass size={12} />
        <span>Pendiente</span>
      </span>
    );
  };

  const renderTipoLabel = (sol) => {
    const rawTipo = String(sol.tipo_solicitud || sol.tipo || '').toUpperCase();
    if (rawTipo === 'SUGERENCIA_COMPRA' || rawTipo.includes('COMPRA') || sol.is_solicitud_compra) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
          🛒 Sugerencia Compra
        </span>
      );
    }
    if (rawTipo.includes('CONSUMIB')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-lime-50 text-lime-900 border border-lime-300 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800/60">
          📦 Materiales / Insumos
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60">
        💻 Préstamo de Equipo
      </span>
    );
  };

  const handleVerDetalleEquipo = (eq) => {
    setActivoSeleccionado({
      placa: eq.placa,
      nombre: eq.nombre,
      modelo: eq.modelo,
      serial: eq.serial || '—',
      sede: eq.sede,
      ubicacion: eq.sede,
      ubicacion_estante: eq.ubicacion_estante || 'En Custodia',
      estado: 'En campo',
      custodio: currentUser?.nombre,
      categoria: 'Equipos de Cómputo / Electrónica',
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
      nombre: itemActual.nombre || itemActual.name || 'Equipo Institucional',
      name: itemActual.nombre || itemActual.name || 'Equipo Institucional',
      modelo: itemActual.modelo || itemActual.model || 'Estándar',
      serial: itemActual.serial || '—',
      sede: itemActual.sede || 'Medellín',
      estado: 'En Custodia',
      custodio: currentUser?.nombre || 'Coordinador',
    });
    setModalQROpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(solicitudes.length / solicitudesPerPage));
  const currentPage = Math.min(solicitudesPage, totalPages);
  const paginatedSolicitudes = solicitudes.slice(
    (currentPage - 1) * solicitudesPerPage,
    currentPage * solicitudesPerPage
  );

  return (
    <section className="space-y-4">
      {/* Cabecera con Botón de Nueva Solicitud */}
      <div
        className="section-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '4px',
        }}
      >
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Mis Solicitudes de Préstamo y Activos Asignados</span>
            <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
              {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''}
            </span>
          </h2>
          <span className="section-subtitle">
            Radica solicitudes personales de préstamo de equipos o insumos y consulta tus asignaciones vigentes (sujetas a aprobación de Administración)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setModalSolicitudOpen(true)}
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
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(171, 208, 55, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#96b82d';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#abd037';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title="Solicitar préstamo de equipo, materiales o sugerir compra"
        >
          <PackagePlus size={16} strokeWidth={2.4} style={{ color: '#013a52' }} />
          <span>+ Nueva Solicitud de Préstamo</span>
        </button>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('solicitudes')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'solicitudes'
              ? 'bg-[#abd037] text-[#013a52] border-[#96b82d] shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#abd037]'
          }`}
        >
          <ClipboardList size={14} />
          <span>Mis Solicitudes Radicadas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'solicitudes'
                ? 'bg-[#013a52] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {solicitudes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activos')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            activeTab === 'activos'
              ? 'bg-[#abd037] text-[#013a52] border-[#96b82d] shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#abd037]'
          }`}
        >
          <Laptop size={14} />
          <span>Mis Activos Asignados</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === 'activos'
                ? 'bg-[#013a52] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {misActivosAsignados.length}
          </span>
        </button>
      </div>

      {/* Contenido Pestaña 1: Mis Solicitudes Radicadas */}
      {activeTab === 'solicitudes' && (
        <div className="panel table-responsive">
          {loadingSolicitudes && solicitudes.length === 0 ? (
            <div className="empty" style={{ padding: '32px' }}>
              <span>⏳</span> Cargando tus solicitudes radicadas...
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="empty" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span>📋</span>
              <p style={{ margin: 0 }}>
                Aún no has radicado solicitudes personales de préstamo o insumos.
              </p>
            </div>
          ) : (
            <>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Fecha Radicado</th>
                    <th>Tipo de Solicitud</th>
                    <th>Ítems Solicitados</th>
                    <th>Sede</th>
                    <th>Motivo</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSolicitudes.map((sol) => {
                    const solItems =
                      Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0
                        ? sol.items_solicitud
                        : Array.isArray(sol.items)
                          ? sol.items
                          : [];
                    const fechaRad = sol.creado_en || sol.fecha_radicado || sol.created_at || '';
                    const nomProy = normalizeProyectoNombre(
                      sol.proyecto_steam || sol.proyecto_steam_id || sol.proyecto
                    );
                    const fDev = sol.fecha_devolucion_estimada || sol.fecha_requerida;

                    return (
                      <tr key={sol.id}>
                        <td className="mono-num" style={{ whiteSpace: 'nowrap' }}>
                          {fmtDate(fechaRad)}
                        </td>
                        <td>
                          <div className="flex flex-col items-start gap-1">
                            {renderTipoLabel(sol)}
                            {nomProy && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                • {nomProy}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {solItems.length > 0 ? (
                                solItems.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                                  >
                                    <span>{it.nombre_sugerido || it.nombre_item || it.nombre || 'Ítem'}</span>
                                    <strong style={{ color: '#65a30d' }}>x{it.cantidad || 1}</strong>
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">Sin ítems detallados</span>
                              )}
                            </div>
                            {(fDev || String(sol.tipo || '').toUpperCase().includes('EQUIPO') || String(sol.tipo || '').toUpperCase() === 'PRESTAMO') && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {String(sol.tipo || '').toUpperCase().includes('COMPRA') ? 'Fecha requerida:' : 'Retorno pactado:'}{' '}
                                {fDev && formatearFechaSegura(fDev) ? (
                                  <strong>{formatearFechaSegura(fDev)}</strong>
                                ) : (
                                  <span className="italic">Sin fecha pactada</span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="sede-badge municipal">{sol.sede || 'Medellín'}</span>
                        </td>
                        <td className="wrap" title={sol.motivo}>
                          {sol.motivo || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>{renderEstadoBadge(sol)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong>{(currentPage - 1) * solicitudesPerPage + 1}</strong> -{' '}
                  <strong>{Math.min(currentPage * solicitudesPerPage, solicitudes.length)}</strong>{' '}
                  de <strong>{solicitudes.length}</strong> solicitudes
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        border: '1px solid var(--line, #cbd5e1)',
                        background: 'var(--surface, #fff)',
                        color: 'var(--text)',
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={99999}>Todos</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setSolicitudesPage((p) => Math.max(1, p - 1))}
                  >
                    ← Anterior
                  </button>
                  <span style={{ fontWeight: 600 }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() => setSolicitudesPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Contenido Pestaña 2: Mis Activos Asignados */}
      {activeTab === 'activos' && (
        <div className="panel table-responsive">
          {misActivosAsignados.length === 0 ? (
            <div className="empty" style={{ padding: '32px' }}>
              <span>💻</span> No tienes activos asignados en custodia actualmente.
            </div>
          ) : (
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Equipo & Modelo</th>
                  <th>Sede</th>
                  <th>F. Entrega</th>
                  <th>F. Devolución</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {misActivosAsignados.map((eq, idx) => (
                  <tr key={eq.placa || idx}>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleVerDetalleEquipo(eq)}
                        className="badge-placa"
                      >
                        {eq.placa}
                      </button>
                    </td>
                    <td>
                      <div className="item-cell">
                        <strong className="item-title">{eq.nombre}</strong>
                        <span className="item-code">{eq.modelo}</span>
                      </div>
                    </td>
                    <td>
                      <span className="sede-badge municipal">{eq.sede}</span>
                    </td>
                    <td className="mono-num">{fmtDate(eq.fechaEntrega)}</td>
                    <td className="mono-num">
                      {eq.fechaDevolucion && eq.fechaDevolucion !== '—'
                        ? fmtDate(eq.fechaDevolucion)
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill prestado">En Custodia</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVerDetalleEquipo(eq)}
                          className="btn small ghost"
                          title="Ver detalle del equipo"
                        >
                          <Eye size={13} className="text-sky-500" />
                          <span>Detalle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerQR(eq)}
                          className="btn small ghost"
                          title="Ver código QR"
                        >
                          <QrCode size={14} style={{ color: '#84CC16' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Crear Solicitud (mismo flujo que rol usuario) */}
      {modalSolicitudOpen && (
        <ModalSolicitudMaterial
          isOpen={modalSolicitudOpen}
          onClose={() => setModalSolicitudOpen(false)}
          currentUser={currentUser}
          items={items}
          sedes={sedesList}
          proyectos={proyectosList}
          onSolicitudCreated={(nuevaSol) => {
            setSolicitudes((prev) => [nuevaSol, ...prev.filter((s) => s.id !== nuevaSol.id)]);
            setActiveTab('solicitudes');
            setSolicitudesPage(1);
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* Modal Detalle Activo */}
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

      {/* Modal QR */}
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
            if (activoSeleccionado) setModalDetalleOpen(true);
          }}
        />
      )}

      {/* Modal Motivo de Rechazo */}
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose-500" />
                <h4 className="font-bold text-slate-900 dark:text-white m-0">
                  Motivo del Rechazo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 m-0">
              {modalMotivoRechazo.motivo}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                className="px-4 py-1.5 rounded-lg bg-[#abd037] text-[#013a52] font-bold text-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
