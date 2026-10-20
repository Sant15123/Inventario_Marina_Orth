import { useState, useEffect } from 'react';
import { fmtDate, available, isOverdue, getDaysDiff, today } from '../services/mockData';
import inventoryApi from '../services/inventoryApi';

export default function ResumenView({
  items = [],
  movements = [],
  loading = false,
  error = null,
  onRetry,
  onNavigate,
}) {
  // Estados locales para consulta directa en caso de montaje autónomo
  const [localItems, setLocalItems] = useState(null);
  const [localMovements, setLocalMovements] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Consulta automática en tiempo real al montar la vista de Resumen
  useEffect(() => {
    let isMounted = true;
    const fetchDirect = async () => {
      try {
        setLocalLoading(true);
        setLocalError(null);
        if (onRetry) {
          await onRetry();
        } else {
          const [activosData, consumiblesData, prestamosData] = await Promise.all([
            inventoryApi.getActivos(),
            inventoryApi.getConsumibles(),
            inventoryApi.getPrestamos(),
          ]);

          if (!isMounted) return;

          const loadedItems = [];
          if (Array.isArray(consumiblesData)) {
            consumiblesData.forEach((c) => {
              const disp = Number(c.disponible) || 0;
              const min = Number(c.minimo) ?? 5;
              loadedItems.push({
                id: c.id,
                material: c.material || c.name || '',
                name: c.material || c.name || '',
                categoria: c.categoria || 'Robótica',
                category: c.categoria || 'Robótica',
                disponible: disp,
                quantity: disp,
                minimo: min,
                minStock: min,
                ubicacion: c.ubicacion || 'Oficina FMO',
                location: c.ubicacion || 'Oficina FMO',
                itemType: 'consumible',
                dateAdded: c.created_at ? c.created_at.split('T')[0] : today(),
              });
            });
          }

          if (Array.isArray(activosData)) {
            activosData.forEach((a) => {
              loadedItems.push({
                id: `eq-${a.id || a.placa}`,
                name: a.nombre,
                category: a.marca || 'Equipos de Cómputo',
                itemType: 'equipo',
                location: a.sede ? `Sede ${a.sede}` : 'Bodega Medellín',
                sede: a.sede || 'Medellín',
                minStock: 1,
                quantity: 0,
                units: [
                  {
                    code: a.placa,
                    placa: a.placa,
                    model: a.modelo || a.marca || 'Estándar',
                    serial: a.serial || '—',
                    sede: a.sede || 'Medellín',
                    status: a.estado === 'En campo' ? 'prestado' : (a.estado || 'disponible').toLowerCase(),
                    responsable: a.custodio || (a.estado === 'En campo' ? 'Custodio Temporal' : 'Bodega Central'),
                  },
                ],
                dateAdded: a.created_at ? a.created_at.split('T')[0] : today(),
              });
            });
          }

          const loadedMovs = [];
          if (Array.isArray(prestamosData)) {
            prestamosData.forEach((p) => {
              loadedMovs.push({
                id: `mov-db-${p.id}`,
                dbId: p.id,
                type: 'prestamo',
                itemId: p.placa_activo,
                itemName: p.nombre_activo || `Activo (${p.placa_activo})`,
                qty: 1,
                unitCodes: [p.placa_activo],
                person: p.solicitante,
                sede: p.sede,
                motive: p.motivo || 'Préstamo operativo',
                date: p.fecha_salida ? p.fecha_salida.split('T')[0] : today(),
                expectedReturn: p.fecha_devolucion_esperada ? p.fecha_devolucion_esperada.split('T')[0] : null,
                returnedDate: p.fecha_devolucion_real ? p.fecha_devolucion_real.split('T')[0] : null,
                status: p.estado === 'Devuelto' ? 'cerrado' : 'activo',
              });
            });
          }

          setLocalItems(loadedItems);
          setLocalMovements(loadedMovs);
        }
      } catch (err) {
        if (isMounted) {
          setLocalError(err.message || 'Error al consultar Supabase');
        }
      } finally {
        if (isMounted) {
          setLocalLoading(false);
        }
      }
    };

    fetchDirect();

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveItems = localItems !== null ? localItems : items;
  const effectiveMovements = localMovements !== null ? localMovements : movements;
  const effectiveLoading = localLoading || loading;
  const effectiveError = localError || error;

  // 1. Filtrado para alertas de stock (disponible <= minStock)
  const lowStockItems = effectiveItems.filter((it) => available(it) <= (it.minStock || 0));

  // 2. Préstamos activos y vencidos
  const activeLoans = effectiveMovements.filter((m) => m.type === 'prestamo' && m.status === 'activo');
  const overdueLoans = activeLoans.filter(isOverdue);

  if (effectiveLoading) {
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

  if (effectiveError) {
    return (
      <div className="resumen-container">
        <div className="panel empty" style={{ padding: '48px 20px', textAlign: 'center', borderColor: 'var(--red)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <strong style={{ color: 'var(--red)', fontSize: '1.2rem' }}>
            Error al conectar con el backend / Supabase
          </strong>
          <p style={{ color: 'var(--text-dim)', margin: '10px auto', maxWidth: '520px' }}>
            {effectiveError}
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
        <div
          className="stat cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigate) {
              onNavigate('inventario', { tab: 'equipos', stockFilter: 'todos' });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onNavigate) onNavigate('inventario', { tab: 'equipos', stockFilter: 'todos' });
            }
          }}
          title="Ver todos los materiales y equipos en Inventario"
        >
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">📦</span>
            <span className="pill default">Total</span>
          </div>
          <div className="num mono-num">{items.length}</div>
          <div className="lbl">Materiales y Equipos registrados</div>
        </div>

        {/* KPI 2: En stock mínimo */}
        <div
          className={`stat ${lowStockItems.length > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigate) {
              onNavigate('inventario', { tab: 'consumibles', stockFilter: 'minimo' });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onNavigate) onNavigate('inventario', { tab: 'consumibles', stockFilter: 'minimo' });
            }
          }}
          title="Ver consumibles en stock mínimo en Inventario"
        >
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
        <div
          className="stat highlight cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigate) {
              onNavigate('prestamos', { section: 'prestamos', estado: 'Activo' });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onNavigate) onNavigate('prestamos', { section: 'prestamos', estado: 'Activo' });
            }
          }}
          title="Ver préstamos activos en Préstamos y entregas"
        >
          <div className="stat-header">
            <span className="stat-icon" aria-hidden="true">🔄</span>
            <span className="pill prestado">En campo</span>
          </div>
          <div className="num mono-num">{activeLoans.length}</div>
          <div className="lbl">Préstamos activos</div>
        </div>

        {/* KPI 4: Préstamos vencidos */}
        <div
          className={`stat ${overdueLoans.length > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md`}
          role="button"
          tabIndex={0}
          onClick={() => {
            if (onNavigate) {
              onNavigate('prestamos', { section: 'prestamos', estado: 'Vencido' });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (onNavigate) onNavigate('prestamos', { section: 'prestamos', estado: 'Vencido' });
            }
          }}
          title="Ver préstamos vencidos en Préstamos y entregas"
        >
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
