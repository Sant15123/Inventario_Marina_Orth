import { useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import { useMaterials } from '../hooks/useMaterials'
import {
  isLowStock,
  MATERIAL_CATEGORIES,
  LABORATORIES,
} from '../features/inventory/materials'
import { blankMaterial } from '../features/inventory/materials'

export default function Inventory() {
  const { materials, loading, createMaterial, updateMaterial, removeMaterial } =
    useMaterials()
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [formError, setFormError] = useState('')

  const openCreate = () => {
    setEditing(blankMaterial())
    setFormError('')
  }
  const openEdit = (m) => {
    setEditing({ ...m })
    setFormError('')
  }
  const closeForm = () => setEditing(null)

  const handleChange = (field, value) => {
    setEditing((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!editing.nombre?.trim() || Number(editing.cantidad) < 0) {
      setFormError('El nombre es obligatorio y la cantidad no puede ser negativa.')
      return
    }
    try {
      const payload = {
        nombre: editing.nombre,
        descripcion: editing.descripcion || '',
        cantidad: Number(editing.cantidad),
        precio: Number(editing.precio) || 0,
        categoria: editing.categoria || '',
        ubicacion: editing.ubicacion || '',
      }
      if (editing.id) {
        await updateMaterial(editing.id, payload)
      } else {
        const created = await createMaterial(payload)
        setEditing({ ...created })
      }
      if (!editing.id) setEditing(null)
    } catch (e) {
      setFormError(e.message || 'Error al guardar')
    }
  }

  const confirmDeleteMaterial = (m) => setConfirmDelete(m)
  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await removeMaterial(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setFormError(e.message || 'Error al eliminar')
    }
  }

  const rows = materials.map((m) => {
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
        <td className="actions">
          <Link
            to={`/inventory/${m.id}`}
            className="btn btn-outline"
            aria-label="Consultar"
            title="Consultar"
          >
            👁 Ver
          </Link>
          <button
            className="btn btn-outline"
            onClick={() => openEdit(m)}
            aria-label="Editar"
            title="Editar"
          >
            ✎ Editar
          </button>
          <button
            className="btn btn-danger"
            onClick={() => confirmDeleteMaterial(m)}
            aria-label="Eliminar"
            title="Eliminar"
          >
            🗑 Eliminar
          </button>
        </td>
      </tr>
    )
  })

  return (
    <section className="inventory-page">
      <div className="inventory-header">
        <div>
          <h1>Inventario de Materia Prima</h1>
          <p className="subtitle">
            Gestión completa: crear, consultar, editar y eliminar materiales.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo material
        </button>
      </div>

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Categoría</th>
              <th>Laboratorio</th>
              <th>Stock</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Cargando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin materiales.</td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'Editar material' : 'Nuevo material'}
          onClose={closeForm}
        >
          <form className="material-form" onSubmit={handleSubmit}>
            {formError && <div className="form-error">{formError}</div>}
            <label>
              Nombre *
              <input
                type="text"
                value={editing.nombre || ''}
                onChange={(e) => handleChange('nombre', e.target.value)}
                required
                placeholder="Ej. Tornillo hexagonal"
              />
            </label>
            <label>
              Descripción
              <textarea
                value={editing.descripcion || ''}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                rows={3}
                placeholder="Opcional"
              />
            </label>
            <div className="form-row">
              <label>
                Stock (cantidad) *
                <input
                  type="number"
                  min="0"
                  value={editing.cantidad || 0}
                  onChange={(e) => handleChange('cantidad', e.target.value)}
                  required
                />
              </label>
              <label>
                Precio unitario *
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.precio || 0}
                  onChange={(e) => handleChange('precio', e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Categoría
                <select
                  value={editing.categoria || ''}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {MATERIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Laboratorio
                <select
                  value={editing.ubicacion || ''}
                  onChange={(e) => handleChange('ubicacion', e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {LABORATORIES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                {editing.id ? '✓ Guardar cambios' : '✓ Crear material'}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={closeForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title="Detalle del material" onClose={() => setViewing(null)}>
          <div className="material-detail">
            <DetailRow label="ID" value={viewing.id} />
            <DetailRow label="Nombre" value={viewing.nombre} />
            <DetailRow label="Descripción" value={viewing.descripcion || '—'} />
            <DetailRow label="Categoría" value={viewing.categoria || '—'} />
            <DetailRow label="Laboratorio" value={viewing.ubicacion || '—'} />
            <DetailRow label="Cantidad" value={viewing.cantidad} />
            <DetailRow
              label="Precio unitario"
              value={
                viewing.precio
                  ? `$${Number(viewing.precio).toLocaleString('es-MX')}`
                  : '—'
              }
            />
            <DetailRow
              label="Estado"
              value={isLowStock(viewing) ? 'Bajo mínimo' : 'Disponible'}
            />
          </div>
          <div className="form-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                setViewing(null)
                openEdit(viewing)
              }}
            >
              ✎ Editar
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="¿Eliminar material?" onClose={() => setConfirmDelete(null)}>
          <p>
            ¿Estás seguro de eliminar <strong>{confirmDelete.nombre}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="form-actions">
            <button className="btn btn-danger" onClick={handleDelete}>
              Sí, eliminar
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
