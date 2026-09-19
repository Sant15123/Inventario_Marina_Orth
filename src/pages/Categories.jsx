import { useMaterials } from '../hooks/useMaterials'
import { isLowStock } from '../features/inventory/materials'

export default function Categories() {
  const { materials, loading } = useMaterials()

  const summary = materials.reduce((acc, m) => {
    const cat = m.categoria || 'Sin categoría'
    if (!acc[cat]) acc[cat] = { count: 0, value: 0, low: 0 }
    acc[cat].count += 1
    acc[cat].value += Number(m.cantidad || 0) * Number(m.precio || 0)
    if (isLowStock(m)) acc[cat].low += 1
    return acc
  }, {})

  const categories = Object.entries(summary)

  return (
    <section className="categories-page">
      <h1>Categorías de Materia Prima</h1>
      <p className="subtitle">
        Agrupación de materiales por categoría con stock y valor.
      </p>

      {loading && <p>Cargando…</p>}

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Materiales</th>
              <th>Unidades totales</th>
              <th>Valor total</th>
              <th>Bajo mínimo</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin categorías.</td>
              </tr>
            ) : (
              categories.map(([cat, info]) => (
                <tr key={cat}>
                  <td>
                    <strong>{cat}</strong>
                  </td>
                  <td>{info.count}</td>
                  <td>{info.value}</td>
                  <td>
                    ${Math.round(info.value).toLocaleString('es-MX')}
                  </td>
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
