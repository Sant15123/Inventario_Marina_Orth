
import { useState, useMemo, useEffect } from 'react';
import { fmtDate, isOverdue } from '../data/initialData';
import { useAuth } from '../context/AuthContext';
import BarraFiltrosHistorial from '../components/historial/BarraFiltrosHistorial';
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

export default function HistorialView({ movements = [] }) {
  const { currentUser, isUsuario, isOperador, isSupervisor } = useAuth();
  const [filterType, setFiltroTipo] = useState('TODOS');
  const setFilterType = setFiltroTipo; // 'todos' | 'prestamo' | 'entrega' | 'devolucion' | 'baja'
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState(null);
  const ITEMS_PER_PAGE = 5;

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
      return movements;
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
      return movements.filter((m) => {
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
    return movements.filter((m) => {
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
  }, [movements, isUsuario, isOperador, currentUser]);

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
                <span className="pill default">{movements.length} transacciones registradas</span>
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
      {movimientoSeleccionado && (() => {
        const movimiento = {
          ...movimientoSeleccionado,
          elemento: movimientoSeleccionado.itemName || movimientoSeleccionado.elemento || movimientoSeleccionado.material || 'Sin nombre',
          id_referencia: movimientoSeleccionado.itemId || movimientoSeleccionado.id_referencia || movimientoSeleccionado.codigo || movimientoSeleccionado.placa || 'N/A',
          responsable: movimientoSeleccionado.person || movimientoSeleccionado.responsable || 'Bodega Central',
          sede: movimientoSeleccionado.sede || 'OFICINA FMO',
          cantidad: movimientoSeleccionado.qty ?? movimientoSeleccionado.cantidad ?? 1,
          tipo: typeLabel[normalizeType(movimientoSeleccionado)] || movimientoSeleccionado.tipo || movimientoSeleccionado.type || 'Actualización',
          fecha: movimientoSeleccionado.date || movimientoSeleccionado.fecha,
          motivo: movimientoSeleccionado.motivo || movimientoSeleccionado.motive || movimientoSeleccionado.detalles || 'Actualización general registrada en el sistema.',
        };

        const cerrarModal = () => setMovimientoSeleccionado(null);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
              
              {/* Cabecera */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
                    📋
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base" style={{ margin: 0 }}>Detalle del Movimiento</h3>
                    <p className="text-xs text-slate-400 font-medium" style={{ margin: 0, marginTop: '2px' }}>
                      Registro #{movimiento.id || 'N/A'} • {movimiento.fecha ? new Date(movimiento.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha N/A'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Tipo de Transacción Banner */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Transacción</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  ✏️ {movimiento.tipo || 'Actualización'}
                </span>
              </div>

              {/* Rejilla de Datos de Auditoría */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {/* Elemento y Código (Ancho completo) */}
                <div className="col-span-2 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elemento / Material</span>
                    <p className="font-bold text-slate-800 text-sm" style={{ margin: 0 }}>{movimiento.elemento || 'Sin nombre'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    {movimiento.id_referencia || 'N/A'}
                  </span>
                </div>

                {/* Responsable */}
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Responsable / Custodio</span>
                  <p className="font-semibold text-slate-700 text-xs flex items-center gap-1.5 truncate" style={{ margin: 0 }}>
                    👤 {movimiento.responsable || 'Bodega Central'}
                  </p>
                </div>

                {/* Sede */}
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sede Institucional</span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                    {movimiento.sede || 'OFICINA FMO'}
                  </span>
                </div>

                {/* Cantidad Afectada (Ancho completo) */}
                <div className="col-span-2 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad Afectada</span>
                  <span className="font-bold text-slate-800 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    📦 {movimiento.cantidad ?? 1} unidad(es)
                  </span>
                </div>
              </div>

              {/* Detalle del Motivo / Cambios Granulares */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl mb-5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-emerald-700 text-xs">📝</span>
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                    Detalle del Cambio / Motivo de Auditoría
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 min-h-[50px] max-h-[120px] overflow-y-auto">
                  <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ margin: 0 }}>
                    {movimiento.motivo || 'Actualización general registrada en el sistema.'}
                  </p>
                </div>
              </div>

              {/* Botón de Cierre Institucional */}
              <button
                onClick={cerrarModal}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                Cerrar Detalle
              </button>

            </div>
          </div>
        );
      })()}
    </div>
  );
}


