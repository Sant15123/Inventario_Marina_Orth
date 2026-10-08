import { fmtDate, available, isOverdue, getDaysDiff } from '../services/mockData';

export default function ResumenView({
  items = [],
  movements = [],
  loading = false,
  error = null,
  onRetry,
}) {
  // 1. Filtrado para alertas de stock (disponible <= minStock)
  const lowStockItems = items.filter((it) => available(it) <= (it.minStock || 0));

  // 2. Préstamos activos y vencidos
  const activeLoans = movements.filter((m) => m.type === 'prestamo' && m.status === 'activo');
  const overdueLoans = activeLoans.filter(isOverdue);

  if (loading) {
    return (
      <div className="resumen-container">
        <div className="panel empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
          <strong style={{ fontSize: '1.15rem', color: 'var(--text)' }}>
            Cargando datos de Supabase...
          </strong>
          <p style={{ color: 'var(--text-dim)', marginTop: '8px', fontSize: '0.95rem' }}>
            Obteniendo indicadores de inventario y préstamos en tiempo real
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resumen-container">
        <div className="panel empty" style={{ padding: '48px 20px', textAlign: 'center', borderColor: 'var(--red)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <strong style={{ color: 'var(--red)', fontSize: '1.2rem' }}>
            Error al conectar con el backend / Supabase
          </strong>
          <p style={{ color: 'var(--text-dim)', margin: '10px auto', maxWidth: '520px' }}>
            {error}
          </p>
          {onRetry && (
            <button
              type="button"
              className="btn small btn-primary"
              style={{ marginTop: '14px' }}
              onClick={onRetry}
            >
              🔄 Reintentar conexión
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="resumen-container">
      {/* 4 TARJETAS KPI SUPERIORES */}
      <div className="stats">
        {/* KPI 1: Materiales y Equipos */}
        <div className="stat">
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">📦</span>
            <span className="pill default">Total</span>
          </div>
          <div className="num mono-num">{items.length}</div>
          <div className="lbl">Materiales y Equipos registrados</div>
        </div>

        {/* KPI 2: En stock mínimo */}
        <div className={`stat ${lowStockItems.length > 0 ? 'alert' : ''}`}>
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">⚠️</span>
            {lowStockItems.length > 0 ? (
              <span className="pill low">{lowStockItems.length} crítico{lowStockItems.length !== 1 ? 's' : ''}</span>
            ) : (
              <span className="pill ok">Óptimo</span>
            )}
          </div>
          <div className="num mono-num">{lowStockItems.length}</div>
          <div className="lbl">En stock mínimo o por debajo</div>
        </div>

        {/* KPI 3: Préstamos activos */}
        <div className="stat highlight">
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">🔄</span>
            <span className="pill prestado">En campo</span>
          </div>
          <div className="num mono-num">{activeLoans.length}</div>
          <div className="lbl">Préstamos activos</div>
        </div>

        {/* KPI 4: Préstamos vencidos */}
        <div className={`stat ${overdueLoans.length > 0 ? 'alert' : ''}`}>
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">⏰</span>
            {overdueLoans.length > 0 ? (
              <span className="pill vencido">Acción requerida</span>
            ) : (
              <span className="pill ok">Al día</span>
            )}
          </div>
          <div className="num mono-num">{overdueLoans.length}</div>
          <div className="lbl">Préstamos vencidos</div>
        </div>
      </div>

      {/* TABLA 1: ALERTAS DE STOCK */}
      <section>
        <div className="section-header">
          <h2>
            <span>Alertas de stock</span>
            {lowStockItems.length > 0 && (
              <span className="pill low">
                {lowStockItems.length} por reabastecer
              </span>
            )}
          </h2>
          <span className="section-subtitle">
            Monitoreo en tiempo real de consumibles y equipos con existencias bajas
          </span>
        </div>

        <div className="panel table-responsive">
          {lowStockItems.length === 0 ? (
            <div className="empty">
              <span>✅</span> Todos los materiales y equipos se encuentran por encima de su stock de seguridad.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código / Material</th>
                  <th>Categoría</th>
                  <th>Disponible</th>
                  <th>Mínimo</th>
                  <th>Ubicación / Sede</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((it) => {
                  const disp = available(it);
                  const min = it.minStock || 0;
                  const isCritical = disp === 0;

                  return (
                    <tr key={it.id} className={isCritical ? 'row-critical' : 'row-warning'}>
                      <td>
                        <div className="item-cell">
                          <strong className="item-title">{it.name}</strong>
                          {it.codigoItem && (
                            <span className="item-code mono-num">{it.codigoItem}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">{it.category || 'General'}</span>
                      </td>
                      <td className="mono-num">
                        <span className={`qty-indicator ${isCritical ? 'qty-zero' : 'qty-low'}`}>
                          {disp} {it.unit || 'und'}
                        </span>
                      </td>
                      <td className="mono-num">
                        <span className="qty-min">{min} {it.unit || 'und'}</span>
                      </td>
                      <td>
                        <div className="location-cell">
                          <span className="location-name">{it.location || '—'}</span>
                          {it.sede && <span className="sede-badge">{it.sede}</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${isCritical ? 'vencido' : 'low'}`}>
                          {isCritical ? 'Sin stock' : 'Stock bajo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* TABLA 2: PRÉSTAMOS QUE REQUIEREN SEGUIMIENTO */}
      <section>
        <div className="section-header">
          <h2>
            <span>Préstamos que requieren seguimiento</span>
            {activeLoans.length > 0 && (
              <span className="pill prestado">{activeLoans.length} en curso</span>
            )}
          </h2>
          <span className="section-subtitle">
            Control de equipos en sedes, municipios y formadores de la Fundación Marina Orth
          </span>
        </div>

        <div className="panel table-responsive">
          {activeLoans.length === 0 ? (
            <div className="empty">
              <span>📋</span> {movements.length === 0 ? 'No hay registros en Supabase.' : 'No hay préstamos activos pendientes en este momento.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Placas / Unidades</th>
                  <th>Responsable</th>
                  <th>Sede / Municipio</th>
                  <th>Fecha Salida</th>
                  <th>Devolución Esperada</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((m) => {
                  const overdue = isOverdue(m);
                  const daysDiff = getDaysDiff(m.expectedReturn);

                  return (
                    <tr
                      key={m.id}
                      className={overdue ? 'row-overdue' : 'row-active'}
                    >
                      <td>
                        <div className="item-cell">
                          <strong className="item-title">{m.itemName}</strong>
                          {m.motive && (
                            <span className="item-motive" title={m.motive}>
                              {m.motive}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="units-tags">
                          {(m.unitCodes && m.unitCodes.length > 0) ? (
                            m.unitCodes.map((code) => (
                              <span key={code} className="unit-tag mono-num">
                                {code}
                              </span>
                            ))
                          ) : (
                            <span className="mono-num">{m.qty} und</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="person-cell">
                          <span className="person-name">{m.person}</span>
                        </div>
                      </td>
                      <td>
                        <span className="sede-badge municipal">
                          {m.sede || 'Medellín'}
                        </span>
                      </td>
                      <td className="mono-num">{fmtDate(m.date)}</td>
                      <td>
                        <div className="date-cell">
                          <span className="mono-num">{fmtDate(m.expectedReturn)}</span>
                          {overdue ? (
                            <span className="delay-text delay-overdue">
                              Retraso de {Math.abs(daysDiff)} día{Math.abs(daysDiff) !== 1 ? 's' : ''}
                            </span>
                          ) : daysDiff >= 0 ? (
                            <span className="delay-text delay-ok">
                              {daysDiff === 0 ? 'Vence hoy' : `Faltan ${daysDiff} días`}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${overdue ? 'vencido' : 'prestado'}`}>
                          {overdue ? '⚠️ Vencido' : '● Al día'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
