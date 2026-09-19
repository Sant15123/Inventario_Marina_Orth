import { useState } from 'react'
import { useMaterials } from '../hooks/useMaterials'
import {
  isLowStock,
  LABORATORIES,
} from '../features/inventory/materials'

export const Dashboard = () => {
  const { materials, loading, error, refresh } = useMaterials()
  const [labFilter, setLabFilter] = useState('all')

  const filtered =
    labFilter === 'all'
      ? materials
      : materials.filter((m) => m.ubicacion === labFilter)

  const lowStockItems = filtered.filter(isLowStock)
  const totalValue = filtered.reduce(
    (sum, m) => sum + Number(m.cantidad || 0) * Number(m.precio || 0),
    0,
  )

  const labsSummary = materials.reduce((acc, m) => {
    const lab = m.ubicacion || 'Sin ubicación'
    acc[lab] = (acc[lab] || 0) + 1
    return acc
  }, {})

  const kpis = [
    { label: 'Materiales totales', value: filtered.length, color: 'lime' },
    {
      label: 'Bajo mínimo',
      value: lowStockItems.length,
      color: 'orange',
      warning: lowStockItems.length > 0,
    },
    {
      label: 'Valor de inventario',
      value: `$${Math.round(totalValue).toLocaleString('es-MX')}`,
      color: 'dark',
    },
  ]

  if (loading) {
    return (
      <section className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <p className="subtitle">Cargando inventario…</p>
      </section>
    )
  }

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">
            Visibilidad en tiempo real de materiales, stock y laboratorios.
          </p>
        </div>
        <div className="lab-filter">
          <label>Filtrar por laboratorio</label>
          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
          >
            <option value="all">Todas las ubicaciones</option>
            {LABORATORIES.map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          No se pudo conectar al servidor (
          {error}). Mostrando datos locales.
          <button className="btn btn-outline" onClick={refresh}>
            Reintentar
          </button>
        </div>
      )}

      <div className="kpis">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`kpi-card ${kpi.warning ? 'warning' : ''} kpi-${kpi.color}`}
          >
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="labs-summary">
        {Object.entries(labsSummary).map(([lab, count]) => (
          <span key={lab} className="lab-chip">
            {lab}: {count}
          </span>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Categoría</th>
              <th>Laboratorio</th>
              <th>Stock</th>
              <th>Precio unitario</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const low = isLowStock(m)
              return (
                <tr key={m.id} className={low ? 'low-stock' : ''}>
                  <td>
                    <strong>{m.nombre}</strong>
                  </td>
                  <td>{m.categoria || '—'}</td>
                  <td>{m.ubicacion || '—'}</td>
                  <td>{m.cantidad}</td>
                  <td>${Number(m.precio).toLocaleString('es-MX')}</td>
                  <td>
                    <span className={`status ${low ? 'low' : 'ok'}`}>
                      {low ? 'Bajo mínimo' : 'Disponible'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Dashboard
