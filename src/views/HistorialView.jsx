
import { useState, useMemo, useEffect } from 'react';
import { fmtDate, isOverdue } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import BarraFiltrosHistorial from '../components/historial/BarraFiltrosHistorial';
import DetalleMovimientoModal from '../components/modals/DetalleMovimientoModal';
import { supabase } from '../services/supabase';
import inventoryApi from '../services/inventoryApi';
import {
  Eye,
  X,
  History,
  User,
  MapPin,
  Package,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export { BarraFiltrosHistorial };

function formatHistorialItem(h) {
  if (!h) return null;
  const rawTipo = String(h.type || h.tipo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  let mappedType = rawTipo;
  if (rawTipo.includes('devolu') || rawTipo.includes('retorn')) mappedType = 'devolucion';
  else if (rawTipo.includes('presta') || rawTipo.includes('prst') || rawTipo.includes('loan')) mappedType = 'prestamo';
  else if (rawTipo.includes('entreg') || rawTipo.includes('salida') || rawTipo.includes('despacho')) mappedType = 'entrega';
  else if (rawTipo.includes('baja') || rawTipo.includes('descarte') || rawTipo.includes('retiro')) mappedType = 'baja';
  else if (rawTipo.includes('actualiz') || rawTipo.includes('modific') || rawTipo.includes('edit') || rawTipo.includes('cambio') || rawTipo.includes('update')) mappedType = 'actualizacion';
  else if (rawTipo.includes('ingres') || rawTipo.includes('alta') || rawTipo.includes('creac') || rawTipo.includes('nuevo')) mappedType = 'ingreso';
  else if (rawTipo.includes('elimin') || rawTipo.includes('borr') || rawTipo.includes('delete')) mappedType = 'eliminacion';

  const finalId = String(h.id_referencia || h.itemId || h.codigo || h.placa || h.placa_o_id || '').trim();
  const finalName = h.elemento || h.itemName || h.elemento_nombre || (finalId ? `Activo (${finalId})` : 'Material / Registro');
  const finalMotivo = h.motivo || h.motive || h.detalles || 'Movimiento registrado';
  const rawFecha = h.fecha || h.fullDate || h.date || h.created_at || new Date().toISOString();
  const dateStr = typeof rawFecha === 'string' && rawFecha.includes('T') ? rawFecha.split('T')[0] : (h.date || new Date().toISOString().split('T')[0]);

  return {
    id: h.id ? (String(h.id).startsWith('mov-hist-') ? h.id : `mov-hist-${h.id}`) : `mov-hist-${Date.now()}`,
    dbId: Number(h.dbId || h.id) || Date.now(),
    type: mappedType,
    tipo: h.tipo || mappedType,
    itemId: finalId,
    id_referencia: finalId,
    itemName: finalName,
    elemento: finalName,
    qty: Number(h.qty ?? h.cantidad ?? 1),
    cantidad: Number(h.qty ?? h.cantidad ?? 1),
    unitCodes: finalId ? [finalId] : (h.unitCodes || []),
    person: h.person || h.responsable || 'Administrador',
    responsable: h.responsable || h.person || 'Administrador',
    sede: h.sede || 'Medellín',
    motivo: finalMotivo,
    motive: finalMotivo,
    detalles: finalMotivo,
    date: dateStr,
    fecha: rawFecha,
    fullDate: rawFecha,
    status: h.status || 'cerrado',
  };
}

export default function HistorialView({ movements = [] }) {
  const { currentUser, isUsuario, isOperador, isSupervisor } = useAuth();
  const [filterType, setFiltroTipo] = useState('TODOS');
  const setFilterType = setFiltroTipo; // 'todos' | 'prestamo' | 'entrega' | 'devolucion' | 'baja'
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const ITEMS_PER_PAGE = 5;

  const [historial, setHistorial] = useState(() => (Array.isArray(movements) ? movements : []));

  useEffect(() => {
    if (Array.isArray(movements) && movements.length > 0) {
      setHistorial((prev) => {
        const propKeys = new Set(movements.map((m) => String(m.id || m.dbId)));
        const localesNuevos = prev.filter((p) => !propKeys.has(String(p.id || p.dbId)));
        return [...localesNuevos, ...movements];
      });
    }
  }, [movements]);

  const fetchHistorial = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('historial_movimientos')
          .select('*')
          .order('fecha', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          setHistorial(data.map(formatHistorialItem));
          return;
        }
      }
      const apiData = await inventoryApi.getHistorial();
      if (Array.isArray(apiData) && apiData.length > 0) {
        setHistorial(apiData.map(formatHistorialItem));
      }
    } catch (err) {
      console.warn('Aviso al cargar historial:', err.message);
    }
  };

  useEffect(() => {
    // Carga inicial
    fetchHistorial();

    // Suscripción en vivo por WebSocket a historial_movimientos
    let canalHistorial = null;
    try {
      if (supabase) {
        canalHistorial = supabase
          .channel('cambios-historial-realtime')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'historial_movimientos',
            },
            (payload) => {
              const nuevo = payload.new;
              if (nuevo) {
                const nuevoMovimiento = formatHistorialItem(nuevo);
                // Insertar al inicio de la lista de estado para que aparezca arriba de inmediato
                setHistorial((prev) => {
                  const exists = prev.some(
                    (m) =>
                      String(m.id) === String(nuevoMovimiento.id) ||
                      (m.dbId && String(m.dbId) === String(nuevoMovimiento.dbId))
                  );
                  if (exists) return prev;
                  return [nuevoMovimiento, ...prev];
                });
              }
            }
          )
          .subscribe();
      }
    } catch (err) {
      console.warn('Error configurando canal Realtime en HistorialView:', err);
    }

    // Limpieza al desmontar el componente
    return () => {
      if (canalHistorial && supabase) {
        supabase.removeChannel(canalHistorial);
      }
    };
  }, []);

  const typeLabel = {
    ingreso: 'Ingreso',
    prestamo: 'Préstamo',
    entrega: 'Entrega / Salida',
    baja: 'Baja',
    devolucion: 'Devolución',
    actualizacion: 'Actualización',
    eliminacion: 'Eliminación',
  };

  const typePillClass = {
    ingreso: 'ok',
    prestamo: 'prestado',
    entrega: 'default',
    baja: 'low',
    devolucion: 'ok',
    actualizacion: 'default',
    eliminacion: 'low',
  };

  // Helper de badge y estilos de auditoría según el tipo de movimiento
  const getTypeBadge = (norm) => {
    switch (norm) {
      case 'ingreso':
        return {
          label: 'Ingreso',
          icon: '📥',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
        };
      case 'actualizacion':
        return {
          label: 'Actualización',
          icon: '✏️',
          badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-700/60',
        };
      case 'baja':
        return {
          label: 'Baja',
          icon: '⚠️',
          badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
        };
      case 'eliminacion':
        return {
          label: 'Eliminación',
          icon: '🗑️',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-700/60',
        };
      case 'prestamo':
        return {
          label: 'Préstamo',
          icon: '🔄',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
        };
      case 'entrega':
        return {
          label: 'Entrega / Salida',
          icon: '📦',
          badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700/60',
        };
      case 'devolucion':
        return {
          label: 'Devolución',
          icon: '↩️',
          badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-700/60',
        };
      default:
        return {
          label: 'Movimiento',
          icon: '📋',
          badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        };
    }
  };

  // Normalizador de tipo para filtros y etiquetas unificadas
  const normalizeType = (m) => {
    const raw = String(m?.type || m?.tipo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (raw.includes('devolu') || raw.includes('retorn')) return 'devolucion';
    if (raw.includes('actualiz') || raw.includes('edit') || raw.includes('modific') || raw.includes('cambio') || raw.includes('update')) return 'actualizacion';
    if (raw.includes('presta') || raw.includes('prst') || raw.includes('loan')) return 'prestamo';
    if (raw.includes('entreg') || raw.includes('salida') || raw.includes('despacho')) return 'entrega';
    if (raw.includes('baja') || raw.includes('descarte') || raw.includes('retiro')) return 'baja';
    if (raw.includes('ingres') || raw.includes('alta') || raw.includes('creac') || raw.includes('nuevo')) return 'ingreso';
    if (raw.includes('elimin') || raw.includes('borr') || raw.includes('delete')) return 'eliminacion';
    return raw;
  };

  // 1. Filtrado de movimientos base según el rol activo
  const userMovements = useMemo(() => {
    // Supervisor y Admin tienen auditoría cronológica global de todas las sedes
    if (!isUsuario && !isOperador) {
      return historial;
    }

    const nombreNorm = (currentUser?.nombre || currentUser?.nombre_completo || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const docNorm = String(currentUser?.documento || '').trim();
    const sedeNorm = String(currentUser?.sede || currentUser?.ubicacion || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Rol Operador: movimientos correspondientes a su sede o a sus custodias operativas
    if (isOperador) {
      return historial.filter((m) => {
        const mSede = String(m.sede || m.ubicacion || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        const resp = String(m.person || m.responsable || m.responsable_recibe || m.solicitante || m.custodio || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();

        const matchSede = Boolean(sedeNorm && (mSede.includes(sedeNorm) || sedeNorm.includes(mSede)));
        const matchName = Boolean(nombreNorm && (resp.includes(nombreNorm) || nombreNorm.includes(resp)));
        const matchDoc = Boolean(docNorm && resp.includes(docNorm));

        return matchSede || matchName || matchDoc;
      });
    }

    // Rol Usuario regular: solo sus propios movimientos personales
    return historial.filter((m) => {
      const normT = normalizeType(m);
      if (normT === 'ingreso' || normT === 'actualizacion') return false;

      const resp = String(m.person || m.responsable || m.responsable_recibe || m.solicitante || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const matchName = Boolean(nombreNorm && (resp.includes(nombreNorm) || nombreNorm.includes(resp)));
      const matchDoc = Boolean(docNorm && resp.includes(docNorm));

      return matchName || matchDoc;
    });
  }, [historial, isUsuario, isOperador, currentUser]);

  // Conteos dinámicos por tipo basados en los movimientos visibles del usuario
  const countPrestamos = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'prestamo').length, [userMovements]);
  const countEntregas = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'entrega').length, [userMovements]);
  const countDevoluciones = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'devolucion').length, [userMovements]);
  const countBajas = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'baja').length, [userMovements]);
  const countIngresos = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'ingreso').length, [userMovements]);
  const countActualizaciones = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'actualizacion').length, [userMovements]);
  const countEliminaciones = useMemo(() => (userMovements || []).filter((m) => normalizeType(m) === 'eliminacion').length, [userMovements]);

  // Filtrado de movimientos según tipo de movimiento y rango de fechas (Desde - Hasta)
  const filteredList = useMemo(() => {
    return (userMovements || []).filter((m) => {
      // 1. Filtro por tipo de movimiento
      if (filterType && filterType.toUpperCase() !== 'TODOS') {
        const norm = normalizeType(m);
        const fNorm = filterType.toLowerCase().trim();
        const match =
          norm === fNorm ||
          (fNorm.includes('presta') && norm === 'prestamo') ||
          (fNorm.includes('entreg') && norm === 'entrega') ||
          (fNorm.includes('devolu') && norm === 'devolucion') ||
          (fNorm.includes('ingres') && norm === 'ingreso') ||
          (fNorm.includes('actualiz') && norm === 'actualizacion') ||
          (fNorm.includes('baja') && norm === 'baja') ||
          (fNorm.includes('elimin') && norm === 'eliminacion');
        if (!match) return false;
      }

      // 2. Filtro por rango de fechas puntual o intervalo
      if (fechaDesde || fechaHasta) {
        const rawDate = m.date || m.fecha || m.fullDate || m.created_at;
        if (!rawDate) return false;
        const movDateStr = String(rawDate).split('T')[0];

        if (fechaDesde && movDateStr < fechaDesde) {
          return false;
        }
        if (fechaHasta && movDateStr > fechaHasta) {
          return false;
        }
      }

      return true;
    });
  }, [userMovements, filterType, fechaDesde, fechaHasta]);

  // Resetear a página 1 cuando cambia el rango de fechas o el tipo
  useEffect(() => {
    setCurrentPage(1);
  }, [fechaDesde, fechaHasta, filterType]);

  const handleResetFechas = () => {
    setFechaDesde('');
    setFechaHasta('');
    setCurrentPage(1);
  };

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredList, currentPage]);

  const handleFilterChange = (type) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  return (
    <div className="historial-view">
      <section>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          {isUsuario ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight" style={{ margin: 0 }}>
                  Mi Historial Personal
                </h1>
                <span className="pill default">
                  {userMovements.length} movimientos registrados
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" style={{ margin: '4px 0 0 0' }}>
                Registro cronológico de tus solicitudes, equipos en préstamo y materiales entregados.
              </p>
            </div>
          ) : isOperador ? (
            <div>
              <h2>
                <span>Historial de Movimientos de Sede</span>
                <span className="pill default">{userMovements.length} transacciones registradas</span>
              </h2>
              <span className="section-subtitle">
                Registro y trazabilidad de préstamos, salidas y devoluciones correspondientes a tu sede ({currentUser?.sede || 'Asignada'})
              </span>
            </div>
          ) : (
            <div>
              <h2>
                <span>Historial Completo de Movimientos</span>
                <span className="pill default">{userMovements.length} transacciones registradas</span>
              </h2>
              <span className="section-subtitle">
                Auditoría cronológica global de préstamos de equipos, salidas de consumibles y cambios de estado en todas las sedes
              </span>
            </div>
          )}
        </div>

        {/* BARRA DE FILTROS POR TIPO DE MOVIMIENTO CON PÍLDORAS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
          <button
            type="button"
            className={`btn small ${(filterType === 'TODOS' || filterType === 'todos') ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('TODOS')}
          >
            Ver Todos ({userMovements.length})
          </button>
          <button
            type="button"
            className={`btn small ${filterType.toLowerCase() === 'prestamo' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('prestamo')}
          >
            🔄 {isUsuario ? 'Mis Préstamos' : 'Préstamos'} ({countPrestamos})
          </button>
          <button
            type="button"
            className={`btn small ${filterType.toLowerCase() === 'entrega' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('entrega')}
          >
            📦 {isUsuario ? 'Mis Entregas' : 'Entregas / Salidas'} ({countEntregas})
          </button>
          <button
            type="button"
            className={`btn small ${filterType.toLowerCase() === 'devolucion' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('devolucion')}
          >
            ↩️ {isUsuario ? 'Mis Devoluciones' : 'Devoluciones'} ({countDevoluciones})
          </button>
          {!isUsuario && (
            <>
              <button
                type="button"
                className={`btn small ${filterType.toLowerCase() === 'ingreso' ? 'btn-primary' : 'ghost'}`}
                onClick={() => handleFilterChange('ingreso')}
                title="Altas, creaciones y nuevos ingresos"
              >
                📥 Ingresos ({countIngresos})
              </button>
              <button
                type="button"
                className={`btn small ${filterType.toLowerCase() === 'actualizacion' ? 'btn-primary' : 'ghost'}`}
                onClick={() => handleFilterChange('actualizacion')}
                title="Modificaciones y actualizaciones técnicas"
              >
                ✏️ Actualizaciones ({countActualizaciones})
              </button>
              <button
                type="button"
                className={`btn small ${filterType.toLowerCase() === 'baja' ? 'btn-primary' : 'ghost'}`}
                onClick={() => handleFilterChange('baja')}
              >
                ⚠️ Bajas ({countBajas})
              </button>
              {countEliminaciones > 0 && (
                <button
                  type="button"
                  className={`btn small ${filterType.toLowerCase() === 'eliminacion' ? 'btn-primary' : 'ghost'}`}
                  onClick={() => handleFilterChange('eliminacion')}
                >
                  🗑️ Eliminaciones ({countEliminaciones})
                </button>
              )}
            </>
          )}
        </div>

        {/* BARRA DE FILTROS UNIFICADA: SELECTOR DE TIPO Y RANGO DE FECHAS */}
        <div style={{ marginBottom: '14px' }}>
          <BarraFiltrosHistorial
            filtroTipo={filterType}
            setFiltroTipo={handleFilterChange}
            fechaDesde={fechaDesde}
            setFechaDesde={setFechaDesde}
            fechaHasta={fechaHasta}
            setFechaHasta={setFechaHasta}
            onResetFechas={handleResetFechas}
            totalCount={userMovements.length}
            countPrestamos={countPrestamos}
            countEntregas={countEntregas}
            countDevoluciones={countDevoluciones}
            countIngresos={countIngresos}
            countActualizaciones={countActualizaciones}
            countBajas={countBajas}
            countEliminaciones={countEliminaciones}
            isUsuario={isUsuario}
          />
        </div>

        <div className="panel table-responsive" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {filteredList.length === 0 ? (
            <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>📋</span> No se encontraron movimientos para el filtro seleccionado.
            </div>
          ) : (
            <table className="historial-compact-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px', minWidth: '100px' }}>Fecha</th>
                  <th style={{ width: '110px' }}>Tipo</th>
                  <th style={{ minWidth: '220px' }}>Elemento / Material</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Cant. / Placas</th>
                  {!isUsuario && <th style={{ width: '170px', minWidth: '140px' }}>Responsable / Custodio</th>}
                  <th style={{ width: '120px' }}>Sede</th>
                  <th style={{ minWidth: '150px' }}>Motivo / Proyecto</th>
                  <th style={{ width: '110px' }}>Estado</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((m) => {
                  let statusText = 'Cerrado';
                  let statusClass = 'default';
                  const norm = normalizeType(m);

                  if (m.status === 'activo') {
                    if (isOverdue(m)) {
                      statusText = 'Vencido';
                      statusClass = 'vencido';
                    } else {
                      statusText = 'Activo';
                      statusClass = 'prestado';
                    }
                  } else if (norm === 'devolucion') {
                    statusText = 'Completado';
                    statusClass = 'ok';
                  } else if (m.type === 'prestamo' && m.returnedDate) {
                    statusText = `Devuelto (${fmtDate(m.returnedDate)})`;
                    statusClass = 'ok';
                  } else if (m.type === 'entrega') {
                    statusText = 'Consumido';
                    statusClass = 'default';
                  }

                  const displayUnits =
                    m.unitCodes && m.unitCodes.length > 0 && !m.unitCodes.includes(m.itemId)
                      ? m.unitCodes.join(', ')
                      : `${m.qty || m.cantidad || 1} und`;

                  const displayMotivo = m.motivo || m.motive || m.detalles;

                  return (
                    <tr
                      key={m.id}
                      style={{ height: '48px', cursor: 'pointer' }}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      onClick={() => setMovimientoSeleccionado(m)}
                    >
                      <td className="mono-num" style={{ whiteSpace: 'nowrap', padding: '8px 12px' }}>
                        {fmtDate(m.date)}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          className={`pill ${typePillClass[norm] || typePillClass[m.type] || 'default'}`}
                          style={{ padding: '2px 8px', fontSize: '11.5px' }}
                        >
                          {typeLabel[norm] || typeLabel[m.type] || m.type || m.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '13px', lineHeight: 1.3 }}>{m.itemName}</strong>
                          {m.itemId && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                              ID: {m.itemId}
                            </span>
                          )}
                          {(m.motivo || m.motive || m.detalles) && (
                            <p
                              className="text-[11px] text-slate-500 font-normal truncate max-w-sm mt-0.5"
                              style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={m.motivo || m.motive || m.detalles}
                            >
                              {m.motivo || m.motive || m.detalles}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="wrap mono-num" style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span className="qty-indicator" style={{ padding: '2px 6px', fontSize: '11.5px' }}>
                          {displayUnits}
                        </span>
                      </td>
                      {!isUsuario && (
                        <td style={{ padding: '8px 12px' }}>
                          <span className="person-name" style={{ fontSize: '12.5px' }}>
                            {m.person || m.responsable || '—'}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '8px 12px' }}>
                        <span className="sede-badge municipal" style={{ padding: '2px 8px', fontSize: '11px' }}>
                          {m.sede || 'Medellín'}
                        </span>
                      </td>
                      <td className="wrap" title={displayMotivo} style={{ padding: '8px 12px', fontSize: '12.5px' }}>
                        {displayMotivo || '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`pill ${statusClass}`} style={{ padding: '2px 8px', fontSize: '11.5px' }}>
                          {statusText}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-icon-crud shrink-0"
                          title="Ver detalle de auditoría"
                          onClick={() => setMovimientoSeleccionado(m)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            color: '#3b82f6',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* CONTROLES DE PAGINACIÓN */}
          {filteredList.length > 0 && (
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
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </strong>{' '}
                -{' '}
                <strong style={{ color: 'var(--text-h)' }}>
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredList.length)}
                </strong>{' '}
                de <strong style={{ color: 'var(--text-h)' }}>{filteredList.length}</strong> movimientos
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn small ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '3px 10px', fontSize: '12px', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  ← Anterior
                </button>

                <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  className="btn small ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '3px 10px', fontSize: '12px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          MODAL DE DETALLE DEL MOVIMIENTO Y AUDITORÍA (OJO / VER)
          ========================================================================= */}
      <DetalleMovimientoModal
        movimiento={movimientoSeleccionado}
        onClose={() => setMovimientoSeleccionado(null)}
      />
    </div>
  );
}


