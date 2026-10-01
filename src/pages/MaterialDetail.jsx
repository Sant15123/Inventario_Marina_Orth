import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { inventoryApi } from '../services/inventoryApi'
import { STORAGE_KEY, isLowStock } from '../features/inventory/materials'

export default function MaterialDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchMaterial() {
      setLoading(true)
      setError(null)
      try {
        // 1. Intentamos obtener el recurso directo del backend por ID
        const data = await inventoryApi.get(id)
        if (isMounted) {
          setMaterial(data)
        }
      } catch (err) {
        // 2. Si falla la red o el backend, intentamos fallback a localStorage
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          const items = stored ? JSON.parse(stored) : []
          const found = items.find((m) => String(m.id) === String(id))

          if (found && isMounted) {
            setMaterial(found)
            return
          }
        } catch {
          /* ignore */
        }

        if (isMounted) {
          setError(err.message || 'No fue posible cargar el material')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (id) {
      fetchMaterial()
    }

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <section className="material-detail-page">
        <div className="card">
          <p>Cargando información del material #{id}…</p>
        </div>
      </section>
    )
  }

  if (error || !material) {
    return (
      <section className="material-detail-page">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Material no encontrado</h2>
          <p className="subtitle">
            {error || `El material con identificador "${id}" no existe en la base de datos.`}
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/inventory" className="btn btn-primary">
              ← Volver al inventario
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const low = isLowStock(material)
  const totalValue = Number(material.cantidad || 0) * Number(material.precio || 0)

  return (
    <section className="material-detail-page">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/inventory" style={{ textDecoration: 'none', color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
            ← Volver a Inventario
          </Link>
          <h1 style={{ marginTop: '0.5rem' }}>{material.nombre}</h1>
          <p className="subtitle">ID: {material.id}</p>
        </div>
        <div>
          <span className={`status ${low ? 'low' : 'ok'}`} style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>
            {low ? 'Stock Bajo Mínimo' : 'Stock Disponible'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3>Información General</h3>
          <p style={{ marginTop: '1rem' }}>
            <strong>Descripción:</strong> {material.descripcion || 'Sin descripción'}
          </p>
          <p>
            <strong>Categoría:</strong> {material.categoria || 'Sin categoría'}
          </p>
          <p>
            <strong>Laboratorio / Ubicación:</strong> {material.ubicacion || 'No asignada'}
          </p>
        </div>

        <div className="card">
          <h3>Existencias y Costos</h3>
          <p style={{ marginTop: '1rem' }}>
            <strong>Unidades disponibles:</strong> {material.cantidad}
          </p>
          <p>
            <strong>Precio unitario:</strong> ${Number(material.precio || 0).toLocaleString('es-MX')}
          </p>
          <p>
            <strong>Valor total en inventario:</strong> ${Math.round(totalValue).toLocaleString('es-MX')}
          </p>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          className="btn btn-outline"
          onClick={() => navigate('/inventory')}
        >
          Ir a lista general
        </button>
      </div>
    </section>
  )
}
