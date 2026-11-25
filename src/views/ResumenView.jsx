import ProgramBadgeIcon from '../components/common/ProgramBadgeIcon';
import FmoStarIcon from '../components/common/FmoStarIcon';
import FmoSignatureMotif from '../components/common/FmoSignatureMotif';
import { getCategoryBadgeClass } from '../services/fmoBranding';
import { useState, useEffect } from 'react';
import { fmtDate, available, isOverdue, getDaysDiff, today } from '../services/mockData';
import inventoryApi from '../services/inventoryApi';
import { useAuth } from '../context/AuthContext';
import CoordinadorMisSolicitudesSection from '../components/coordinador/CoordinadorMisSolicitudesSection';

export default function ResumenView({
  items = [],
  movements = [],
  sedes = [],
  loading = false,
  error = null,
  onRetry,
  onNavigate,
}) {
  // Estado para KPIs rápidos desde /api/dashboard/kpis o cálculo paralelo
  const [kpisData, setKpisData] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  // Hook de autenticación para rol Coordinador
  const { isCoordinador } = useAuth();
  const [comprasCount, setComprasCount] = useState({ pendientes: 0, aprobadas: 0, compradasMes: 0 });

  useEffect(() => {
    const fetchComprasCounts = async () => {
      try {
        let list = await inventoryApi.getSolicitudesCompra();
        if (!Array.isArray(list) || list.length === 0) {
          const cached = localStorage.getItem('siga_solicitudes_compra');
          if (cached) list = JSON.parse(cached);
        }
        if (Array.isArray(list)) {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          const pendientes = list.filter((s) => s.estado === 'Pendiente' || s.estado === 'En Evaluación').length;
          const aprobadas = list.filter((s) => s.estado === 'Aprobada').length;
          const compradasMes = list.filter((s) => {
            if (s.estado !== 'Comprada') return false;
            const f = new Date(s.fecha_compra || s.creado_en || Date.now());
            return f.getMonth() === currentMonth && f.getFullYear() === currentYear;
          }).length;
          setComprasCount({ pendientes, aprobadas, compradasMes });
        }
      } catch (e) {
        console.warn('Error al cargar conteos compras en resumen:', e);
      }
    };
    fetchComprasCounts();
  }, []);

  // Estados locales para consulta de tablas (alertas de stock y préstamos)
  const [localItems, setLocalItems] = useState(null);
  const [localMovements, setLocalMovements] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // 1. Carga inmediata y no bloqueante de KPIs en paralelo (< 2 segundos)
  useEffect(() => {
    let isMounted = true;
    const fetchKPIs = async () => {
      try {
        setKpisLoading(true);
        // Intentar consultar el endpoint ligero de KPIs
        const kpis = await inventoryApi.getDashboardKPIs();
        if (isMounted && kpis && typeof kpis === 'object') {
          setKpisData(kpis);
        }
      } catch (err) {
        console.warn('No se pudo cargar KPIs ligeros de inmediato:', err.message);
      } finally {
        if (isMounted) {
          setKpisLoading(false);
        }
      }
    };

    fetchKPIs();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Consulta automática en segundo plano para poblar tablas de stock y préstamos
  useEffect(() => {
    let isMounted = true;
    const fetchDirect = async () => {
      try {
        setLocalLoading(true);
        setLocalError(null);
        if (onRetry) {
          await onRetry();
        } else {
          const [activosData, electronicaData, consumiblesData, prestamosData] = await Promise.all([
            inventoryApi.getActivos(),
            inventoryApi.getEquiposElectronica().catch(() => []),
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

          if (Array.isArray(electronicaData)) {
            electronicaData.forEach((e) => {
              loadedItems.push({
                id: `ele-${e.id || e.placa}`,
                name: e.nombre,
                category: e.subcategoria || 'Instrumentación',
                itemType: 'electronica',
                location: e.ubicacion || e.sede || 'Medellín',
                sede: e.sede || 'Medellín',
                minStock: 1,
                quantity: 1,
                units: [
                  {
                    code: e.placa,
                    placa: e.placa,
                    model: e.modelo || e.marca || 'Estándar',
                    serial: e.serial || '—',
                    sede: e.sede || 'Medellín',
                    status: (e.estado || 'disponible').toLowerCase(),
                    responsable: e.responsable || 'Bodega Central',
                  },
                ],
                dateAdded: e.fecha_adquisicion || today(),
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
  // Limitar a las 5 alertas más críticas (menor disponibilidad primero)
  const alertasVisibles = [...lowStockItems]
    .sort((a, b) => available(a) - available(b))
    .slice(0, 5);

  // 2. Préstamos activos y vencidos
  const activeLoans = effectiveMovements.filter((m) => m.type === 'prestamo' && m.status === 'activo');
  const overdueLoans = activeLoans.filter(isOverdue);
  // Limitar a los 5 préstamos prioritarios (vencidos primero, luego próximos a vencer)
  const prestamosVisibles = [...activeLoans]
    .sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(a.expectedReturn || '9999-12-31') - new Date(b.expectedReturn || '9999-12-31');
    })
    .slice(0, 5);

  // Valores finales de métricas calculados con fallback inteligente
  const totalItemsCount = kpisData?.totalItems !== undefined ? kpisData.totalItems : effectiveItems.length;
  const stockCriticoCount = kpisData?.stockCritico !== undefined ? kpisData.stockCritico : lowStockItems.length;
  const prestamosActivosCount = kpisData?.prestamosActivos !== undefined ? kpisData.prestamosActivos : activeLoans.length;
  const prestamosVencidosCount = kpisData?.prestamosVencidos !== undefined ? kpisData.prestamosVencidos : overdueLoans.length;
  const showKpiSkeleton = kpisLoading && kpisData === null && effectiveItems.length === 0;

  if (effectiveError && !kpisData && effectiveItems.length === 0) {
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
        {isCoordinador ? (
          <>
            {/* KPI 1 Coordinador: Solicitudes Pendientes por Evaluar */}
            <div
              className={`stat fmo-impact-featured ${comprasCount.pendientes > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden`}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate && onNavigate('compras', { tab: 'pendientes' })}
              title="Ver solicitudes pendientes por evaluar"
            >
              <FmoSignatureMotif color="#7B2CBF" opacity={0.18} className="absolute -right-6 -bottom-6 pointer-events-none" width={180} height={110} variant="ribbon" />
              <div className="stat-header relative z-10">
                <span className="stat-icon" aria-hidden="true" style={{ background: 'rgba(123, 44, 191, 0.2)', color: '#7B2CBF', borderRadius: '10px', padding: '4px 6px' }}>⏳</span>
                <span className="pill default" style={{ backgroundColor: '#7B2CBF', color: '#ffffff', fontWeight: 800 }}>Etapa 1</span>
              </div>
              <div className="num mono-num relative z-10" style={{ color: '#7B2CBF', fontWeight: 900, fontFamily: "'Poppins', sans-serif", fontSize: '32px' }}>
                {comprasCount.pendientes}
              </div>
              <div className="lbl relative z-10" style={{ color: 'var(--text-h, #013a52)', fontWeight: 600 }}>Solicitudes por Evaluar</div>
            </div>

            {/* KPI 2 Coordinador: Aprobadas Pendientes de Compra */}
            <div
              className="stat fmo-card-robotica cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden"
              role="button"
              tabIndex={0}
              onClick={() => onNavigate && onNavigate('compras', { tab: 'aprobadas' })}
              title="Ver solicitudes aprobadas listas para cotizar y comprar"
            >
              <FmoSignatureMotif color="#2CACD0" opacity={0.12} className="absolute -right-6 -bottom-6 pointer-events-none" width={160} height={100} variant="flourish" />
              <div className="stat-header relative z-10">
                <span className="stat-icon" aria-hidden="true" style={{ background: 'rgba(44, 172, 208, 0.2)', color: '#0284c7', borderRadius: '10px', padding: '4px 6px' }}>📝</span>
                <span className="pill ok" style={{ backgroundColor: '#2CACD0', color: '#ffffff', fontWeight: 800 }}>Etapa 2</span>
              </div>
              <div className="num mono-num relative z-10" style={{ color: '#0284c7', fontWeight: 900, fontFamily: "'Poppins', sans-serif", fontSize: '32px' }}>
                {comprasCount.aprobadas}
              </div>
              <div className="lbl relative z-10" style={{ color: 'var(--text-h, #013a52)', fontWeight: 600 }}>Aprobadas para Compra</div>
            </div>

            {/* KPI 3 Coordinador: Compradas en el Mes */}
            <div
              className="stat fmo-card-computo cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden"
              role="button"
              tabIndex={0}
              onClick={() => onNavigate && onNavigate('compras', { tab: 'compradas' })}
              title="Ver historial de compras realizadas en el mes"
            >
              <FmoSignatureMotif color="#abd037" opacity={0.15} className="absolute -right-6 -bottom-6 pointer-events-none" width={160} height={100} variant="curve" />
              <div className="stat-header relative z-10">
                <span className="stat-icon" aria-hidden="true" style={{ background: 'rgba(171, 208, 55, 0.25)', color: '#013a52', borderRadius: '10px', padding: '4px 6px' }}>🛒</span>
                <span className="pill ok" style={{ backgroundColor: '#abd037', color: '#013a52', fontWeight: 800 }}>Etapa 3</span>
              </div>
              <div className="num mono-num relative z-10" style={{ color: '#013a52', fontWeight: 900, fontFamily: "'Poppins', sans-serif", fontSize: '32px' }}>
                {comprasCount.compradasMes}
              </div>
              <div className="lbl relative z-10" style={{ color: 'var(--text-h, #013a52)', fontWeight: 600 }}>Compradas en el Mes</div>
            </div>

            {/* KPI 4 Coordinador: Alertas de Stock Bajo en Bodega */}
            <div
              className={`stat fmo-card-teachlabs ${stockCriticoCount > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden`}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate && onNavigate('inventario', { tab: 'consumibles', stockFilter: 'minimo' })}
              title="Ver ítems en stock mínimo en bodega"
            >
              <FmoSignatureMotif color="#E0321C" opacity={0.10} className="absolute -right-6 -bottom-6 pointer-events-none" width={160} height={100} variant="flourish" />
              <div className="stat-header relative z-10">
                <span className="stat-icon" aria-hidden="true">⚠️</span>
                {stockCriticoCount > 0 ? (
                  <span className="pill low">{stockCriticoCount} crítico{stockCriticoCount !== 1 ? 's' : ''}</span>
                ) : (
                  <span className="pill ok">Óptimo</span>
                )}
              </div>
              <div className="num mono-num relative z-10" style={{ fontWeight: 900, fontFamily: "'Poppins', sans-serif", fontSize: '32px' }}>
                {stockCriticoCount}
              </div>
              <div className="lbl relative z-10" style={{ color: 'var(--text-h, #013a52)', fontWeight: 600 }}>Alertas de Stock Bajo</div>
            </div>
          </>
        ) : (
          <>
        {/* KPI 1: Materiales y Equipos (Tarjeta Destacada de Impacto FMO) */}
        <div
          className="stat fmo-impact-featured cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl relative overflow-hidden"
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
          {/* Recurso Gráfico Oficial FMO - Trazo Manuscrito Orth (Pág. 22) */}
          <FmoSignatureMotif
            color="#abd037"
            opacity={0.18}
            className="absolute -right-6 -bottom-6 pointer-events-none"
            width={180}
            height={110}
            variant="ribbon"
          />
          <div className="stat-header relative z-10">
            <span className="stat-icon" aria-hidden="true" style={{ background: 'rgba(171, 208, 55, 0.2)', color: '#abd037', borderRadius: '10px', padding: '4px 6px' }}>📦</span>
            <span className="pill default" style={{ backgroundColor: '#abd037', color: '#013a52', fontWeight: 800 }}>Total FMO</span>
          </div>
          <div className="num mono-num relative z-10" style={{ color: '#abd037', fontWeight: 900, fontFamily: "'Poppins', sans-serif", fontSize: '32px' }}>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '48px', height: '32px' }} />
            ) : (
              totalItemsCount
            )}
          </div>
          <div className="lbl relative z-10" style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>Materiales y Equipos registrados</div>
        </div>

        {/* KPI 2: En stock mínimo (Robótica & Consumibles Críticos) */}
        <div
          className={`stat fmo-card-robotica ${stockCriticoCount > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden`}
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
          {/* Recurso Gráfico Oficial FMO */}
          <FmoSignatureMotif
            color="#6d6e71"
            opacity={0.08}
            className="absolute -right-6 -bottom-6 pointer-events-none"
            width={160}
            height={100}
            variant="flourish"
          />
          <div className="stat-header relative z-10">
            <span className="stat-icon" aria-hidden="true">⚠️</span>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '56px', height: '18px', borderRadius: '999px' }} />
            ) : stockCriticoCount > 0 ? (
              <span className="pill low">{stockCriticoCount} crítico{stockCriticoCount !== 1 ? 's' : ''}</span>
            ) : (
              <span className="pill ok">Óptimo</span>
            )}
          </div>
          <div className="num mono-num relative z-10" style={{ fontWeight: 900, fontFamily: "'Poppins', sans-serif" }}>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '38px', height: '32px' }} />
            ) : (
              stockCriticoCount
            )}
          </div>
          <div className="lbl relative z-10">En stock mínimo o por debajo</div>
        </div>

        {/* KPI 3: Préstamos activos (Cómputo & Nuevas Tecnologías) */}
        <div
          className="stat fmo-card-computo cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden"
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
          {/* Recurso Gráfico Oficial FMO */}
          <FmoSignatureMotif
            color="#013a52"
            opacity={0.08}
            className="absolute -right-6 -bottom-6 pointer-events-none"
            width={160}
            height={100}
            variant="curve"
          />
          <div className="stat-header relative z-10">
            <span className="stat-icon" aria-hidden="true">🔄</span>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '60px', height: '18px', borderRadius: '999px' }} />
            ) : (
              <span className="pill prestado" style={{ backgroundColor: 'rgba(44, 172, 208, 0.15)', color: '#013a52', borderColor: 'rgba(44, 172, 208, 0.35)', fontWeight: 700 }}>En campo</span>
            )}
          </div>
          <div className="num mono-num relative z-10" style={{ fontWeight: 900, fontFamily: "'Poppins', sans-serif" }}>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '38px', height: '32px' }} />
            ) : (
              prestamosActivosCount
            )}
          </div>
          <div className="lbl relative z-10">Préstamos activos</div>
        </div>

        {/* KPI 4: Préstamos vencidos (TeachLabs / Seguimiento) */}
        <div
          className={`stat fmo-card-teachlabs ${prestamosVencidosCount > 0 ? 'alert' : ''} cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md relative overflow-hidden`}
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
          {/* Recurso Gráfico Oficial FMO */}
          <FmoSignatureMotif
            color="#7b2cbf"
            opacity={0.10}
            className="absolute -right-6 -bottom-6 pointer-events-none"
            width={160}
            height={100}
            variant="flourish"
          />
          <div className="stat-header relative z-10">
            <span className="stat-icon" aria-hidden="true">⏰</span>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '56px', height: '18px', borderRadius: '999px' }} />
            ) : prestamosVencidosCount > 0 ? (
              <span className="pill vencido">Acción requerida</span>
            ) : (
              <span className="pill ok">Al día</span>
            )}
          </div>
          <div className="num mono-num relative z-10" style={{ fontWeight: 900, fontFamily: "'Poppins', sans-serif" }}>
            {showKpiSkeleton ? (
              <span className="kpi-skeleton-box animate-pulse" style={{ width: '38px', height: '32px' }} />
            ) : (
              prestamosVencidosCount
            )}
          </div>
          <div className="lbl relative z-10">Préstamos vencidos</div>
        </div>
          </>
        )}
      </div>

      {/* SECCIÓN EXCLUSIVA PARA COORDINADOR: MIS SOLICITUDES DE PRÉSTAMO Y ACTIVOS ASIGNADOS */}
      {isCoordinador && (
        <CoordinadorMisSolicitudesSection
          items={effectiveItems}
          movements={effectiveMovements}
          sedes={sedes}
        />
      )}

      {/* TABLA 1: ALERTAS DE STOCK */}
      <section className="font-['Poppins',sans-serif]">
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-[#013A52] dark:text-white m-0">
              Alertas de stock
            </h2>
            {lowStockItems.length > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] dark:bg-[#450A0A]/70 dark:text-[#FCA5A5] dark:border-[#991B1B] whitespace-nowrap">
                {lowStockItems.length} por reabastecer
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1 mb-0">
            Monitoreo en tiempo real de consumibles y equipos con existencias bajas
          </p>
        </div>

        <div className="panel table-responsive overflow-hidden">
          {effectiveLoading && effectiveItems.length === 0 ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '36px', width: '100%' }} />
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '32px', width: '100%' }} />
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '32px', width: '100%' }} />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="empty">
              <span>✅</span> Todos los materiales y equipos se encuentran por encima de su stock de seguridad.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/70 border-b-2 border-[#ABD037]">
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Código / Material
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Categoría
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Disponible
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mínimo
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ubicación / Sede
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {alertasVisibles.map((it) => {
                  const disp = available(it);
                  const min = it.minStock || 0;
                  const isCritical = disp === 0;

                  return (
                    <tr
                      key={it.id}
                      className={`transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/50 ${
                        isCritical ? 'bg-[#FEF2F2]/60 dark:bg-[#450A0A]/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-[13.5px] font-semibold text-[#013A52] dark:text-slate-100 leading-snug">
                            {it.name}
                          </strong>
                          {it.codigoItem && (
                            <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                              {it.codigoItem}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          <ProgramBadgeIcon categoria={it.category} variant="icon" size={13} />
                          <span>{it.category || 'General'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span
                          className={`inline-flex justify-center min-w-[64px] px-2.5 py-1 rounded-lg text-xs tabular-nums ${
                            isCritical
                              ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#F87171] dark:bg-[#7F1D1D]/70 dark:text-[#FECACA] dark:border-[#EF4444] font-bold'
                              : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] dark:bg-[#450A0A]/60 dark:text-[#FCA5A5] dark:border-[#B91C1C] font-semibold'
                          }`}
                        >
                          {disp} {it.unit || 'und'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                          {min} {it.unit || 'und'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <FmoStarIcon indicator="sede" size={12} color="#6d6e71" />
                            <span>{it.location || '—'}</span>
                          </span>
                          {it.sede && (
                            <span className="whitespace-nowrap text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                              {it.sede}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full whitespace-nowrap bg-[#DC2626] text-white border border-[#B91C1C] dark:bg-[#B91C1C] dark:text-white">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
                            <span>Sin stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full whitespace-nowrap bg-[#FEF2F2] text-[#DC2626] border border-[#F87171] dark:bg-[#450A0A]/60 dark:text-[#FCA5A5] dark:border-[#DC2626]">
                            <span>Stock bajo</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {lowStockItems.length > 5 && (
            <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando las <strong className="font-semibold text-slate-700 dark:text-slate-200">5</strong> alertas más críticas de{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{lowStockItems.length}</strong> registradas.
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('inventario')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#013A52] dark:text-[#ABD037] border border-slate-200 dark:border-slate-700 hover:border-[#013A52] dark:hover:border-[#ABD037] rounded-xl px-4 py-2 transition-all cursor-pointer bg-transparent"
                >
                  Ver inventario completo →
                </button>
              )}
            </div>
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
          {effectiveLoading && effectiveMovements.length === 0 ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '36px', width: '100%' }} />
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '32px', width: '100%' }} />
              <div className="kpi-skeleton-box animate-pulse" style={{ height: '32px', width: '100%' }} />
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="empty">
              <span>📋</span> {effectiveMovements.length === 0 ? 'No hay registros de préstamos en la base de datos.' : 'No hay préstamos activos pendientes en este momento.'}
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
                {prestamosVisibles.map((m) => {
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
          {activeLoans.length > 5 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.02)',
                fontSize: '0.88rem',
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>
                Mostrando los <strong>5</strong> préstamos más urgentes de <strong>{activeLoans.length}</strong> activos.
              </span>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('prestamos')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Ver todos los préstamos →
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
