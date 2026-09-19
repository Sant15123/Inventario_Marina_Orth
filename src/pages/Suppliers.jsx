import { useMaterials } from '../hooks/useMaterials'
import { isLowStock } from '../features/inventory/materials'

export default function Suppliers() {
  const { materials, loading } = useMaterials()

  const summary = materials.reduce((acc, m) => {
    const key = m.categoria || 'Sin categoría'
    if (!acc[key]) acc[key] = { count: 0, value: 0, low: 0 }
    acc[key].count += 1
    acc[key].value += Number(m.cantidad || 0) * Number(m.precio || 0)
    if (isLowStock(m)) acc[key].low += 1
    return acc
  }, {})

  const rows = Object.entries(summary)

  return (
    <section className="categories-page">
      <h1>Proveedores / Categorías</h1>
      <p className="subtitle">
        Materiales agrupados por categoría (proveedor).
      </p>

      {loading && <p>Cargando…</p>}

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Categoría (Proveedor)</th>
              <th>Materiales</th>
              <th>Valor total</th>
              <th>Bajo mínimo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>Sin categorías.</td>
              </tr>
            ) : (
              rows.map(([cat, info]) => (
                <tr key={cat}>
                  <td>
                    <strong>{cat}</strong>
                  </td>
                  <td>{info.count}</td>
                  <td>${Math.round(info.value).toLocaleString('es-MX')}</td>
                  <td>{info.low > 0 ? `${info.low} ⚠` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
