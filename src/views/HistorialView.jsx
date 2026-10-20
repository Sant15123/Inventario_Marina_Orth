
import { useState, useMemo } from 'react';
import { fmtDate, isOverdue } from '../data/initialData';

export default function HistorialView({ movements = [] }) {
  const [filterType, setFilterType] = useState('todos'); // 'todos' | 'prestamo' | 'entrega' | 'baja'
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const typeLabel = {
    ingreso: 'Ingreso',
    prestamo: 'Préstamo',
    entrega: 'Entrega',
    baja: 'Baja',
  };

  const typePillClass = {
    ingreso: 'ok',
    prestamo: 'prestado',
    entrega: 'default',
    baja: 'low',
  };

  // Filtrado de movimientos
  const filteredList = useMemo(() => {
    if (filterType === 'todos') return movements;
    return movements.filter((m) => m.type === filterType);
  }, [movements, filterType]);

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
          <h2>
            <span>Historial Completo de Movimientos</span>
            <span className="pill default">{movements.length} transacciones registradas</span>
          </h2>
          <span className="section-subtitle">
            Auditoría cronológica de préstamos de equipos, salidas de consumibles y cambios de estado
          </span>
        </div>

        {/* BARRA DE FILTROS POR TIPO DE MOVIMIENTO */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn small ${filterType === 'todos' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('todos')}
          >
            Ver Todos ({movements.length})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'prestamo' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('prestamo')}
          >
            🔄 Préstamos ({movements.filter((m) => m.type === 'prestamo').length})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'entrega' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('entrega')}
          >
            📦 Entregas / Salidas ({movements.filter((m) => m.type === 'entrega').length})
          </button>
          <button
            type="button"
            className={`btn small ${filterType === 'baja' ? 'btn-primary' : 'ghost'}`}
            onClick={() => handleFilterChange('baja')}
          >
            ⚠️ Bajas ({movements.filter((m) => m.type === 'baja').length})
          </button>
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
                  <th style={{ width: '110px' }}>Fecha</th>
                  <th style={{ width: '110px' }}>Tipo</th>
                  <th>Elemento / Material</th>
                  <th style={{ width: '130px' }}>Cantidad / Placas</th>
                  <th>Responsable / Custodio</th>
                  <th style={{ width: '120px' }}>Sede</th>
                  <th>Motivo / Proyecto</th>
                  <th style={{ width: '140px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((m) => {
                  let statusText = 'Cerrado';
                  let statusClass = 'default';

                  if (m.status === 'activo') {
                    if (isOverdue(m)) {
                      statusText = 'Vencido';
                      statusClass = 'vencido';
                    } else {
                      statusText = 'Activo';
                      statusClass = 'prestado';
                    }
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
                      : `${m.qty || 1} und`;

                  return (
                    <tr key={m.id}>
                      <td className="mono-num">{fmtDate(m.date)}</td>
                      <td>
                        <span className={`pill ${typePillClass[m.type] || 'default'}`}>
                          {typeLabel[m.type] || m.type}
                        </span>
                      </td>
                      <td>
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
                      <td>
                        <span className="person-name">{m.person || '—'}</span>
                      </td>
                      <td>
                        <span className="sede-badge municipal">{m.sede || 'Medellín'}</span>
                      </td>
                      <td className="wrap" title={m.motive}>
                        {m.motive || '—'}
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


