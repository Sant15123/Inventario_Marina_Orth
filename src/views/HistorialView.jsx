
import { useState, useMemo } from 'react';
import { fmtDate, isOverdue } from '../data/initialData';
import { useAuth } from '../context/AuthContext';

export default function HistorialView({ movements = [] }) {
  const { currentUser, isUsuario, isOperador, isSupervisor } = useAuth();
  const [filterType, setFilterType] = useState('todos'); // 'todos' | 'prestamo' | 'entrega' | 'devolucion' | 'baja'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const typeLabel = {
    ingreso: 'Ingreso',
    prestamo: 'Préstamo',
    entrega: 'Entrega',
    baja: 'Baja',
    devolucion: 'Devolución',
    actualizacion: 'Actualización',
  };

  const typePillClass = {
    ingreso: 'ok',
    prestamo: 'prestado',
    entrega: 'default',
    baja: 'low',
    devolucion: 'ok',
    actualizacion: 'default',
  };

  // Normalizador de tipo para filtros y etiquetas unificadas
  const normalizeType = (m) => {
    const raw = String(m.type || m.tipo || '').toLowerCase().trim();
    if (raw === 'devolucion' || raw === 'devolución') return 'devolucion';
    if (raw === 'actualizacion' || raw === 'actualización') return 'actualizacion';
    if (raw === 'prestamo' || raw === 'préstamo') return 'prestamo';
    if (raw === 'entrega' || raw === 'salida') return 'entrega';
    if (raw === 'baja') return 'baja';
    if (raw === 'ingreso') return 'ingreso';
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
  const countPrestamos = useMemo(() => userMovements.filter((m) => normalizeType(m) === 'prestamo').length, [userMovements]);
  const countEntregas = useMemo(() => userMovements.filter((m) => normalizeType(m) === 'entrega').length, [userMovements]);
  const countDevoluciones = useMemo(() => userMovements.filter((m) => normalizeType(m) === 'devolucion').length, [userMovements]);
  const countBajas = useMemo(() => userMovements.filter((m) => normalizeType(m) === 'baja').length, [userMovements]);

  // Filtrado de movimientos según pestaña seleccionada
  const filteredList = useMemo(() => {
    if (filterType === 'todos') return userMovements;
    return userMovements.filter((m) => normalizeType(m) === filterType);
  }, [userMovements, filterType]);

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

        {/* BARRA DE FILTROS POR TIPO DE MOVIMIENTO */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn small ${filterType === 'todos' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('todos')}
          >
            Ver Todos ({userMovements.length})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'prestamo' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('prestamo')}
          >
            🔄 {isUsuario ? 'Mis Préstamos' : 'Préstamos'} ({countPrestamos})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'entrega' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('entrega')}
          >
            📦 {isUsuario ? 'Mis Entregas' : 'Entregas / Salidas'} ({countEntregas})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'devolucion' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('devolucion')}
          >
            ↩️ {isUsuario ? 'Mis Devoluciones' : 'Devoluciones'} ({countDevoluciones})
          </button>
          {!isUsuario && (
            <button
              type="button"
              className={`btn small ${filterType === 'baja' ? 'btn-primary' : 'ghost'}`}
              onClick={() => handleFilterChange('baja')}
            >
              ⚠️ Bajas ({countBajas})
            </button>
          )}
        </div>

        <div className="panel table-responsive">
          {filteredList.length === 0 ? (
            <div className="empty">
              <span>📋</span> No se encontraron movimientos para el filtro seleccionado.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: isUsuario ? '140px' : '110px' }}>Fecha</th>
                  <th style={{ width: '110px' }}>Tipo</th>
                  <th style={{ flex: isUsuario ? 1 : 'initial' }}>Elemento / Material</th>
                  <th style={{ width: '130px' }}>Cantidad / Placas</th>
                  {!isUsuario && <th>Responsable / Custodio</th>}
                  <th style={{ width: '120px' }}>Sede</th>
                  <th>Motivo / Proyecto</th>
                  <th style={{ width: '140px' }}>Estado</th>
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

                  return (
                    <tr key={m.id}>
                      <td className="mono-num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.date)}</td>
                      <td>
                        {norm === 'devolucion' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Devolución
                          </span>
                        ) : norm === 'actualizacion' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            Actualización
                          </span>
                        ) : (
                          <span className={`pill ${typePillClass[m.type] || 'default'}`}>
                            {typeLabel[m.type] || m.type || m.tipo}
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: isUsuario ? '220px' : 'auto' }}>
                        <strong>{m.itemName}</strong>
                        {m.itemId && (
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            ID: {m.itemId}
                          </div>
                        )}
                      </td>
                      <td className="wrap mono-num">
                        <span className="qty-indicator">{displayUnits}</span>
                      </td>
                      {!isUsuario && (
                        <td>
                          <span className="person-name">{m.person || m.responsable || '—'}</span>
                        </td>
                      )}
                      <td>
                        <span className="sede-badge municipal">{m.sede || 'Medellín'}</span>
                      </td>
                      <td className="wrap" title={m.motive || m.motivo || m.detalles}>
                        {m.motive || m.motivo || m.detalles || '—'}
                      </td>
                      <td>
                        <span className={`pill ${statusClass}`}>{statusText}</span>
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
    </div>
  );
}


