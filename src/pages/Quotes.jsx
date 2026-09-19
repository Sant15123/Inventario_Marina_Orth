import { useState } from 'react'
import Modal from '../components/Modal'
import { calculateQuote } from '../features/quotes/calculator'
import { useMaterials } from '../hooks/useMaterials'
import { useQuotes } from '../hooks/UseQuotes'

export default function Quotes() {
  const { materials, loading: loadingMaterials } = useMaterials()
  const {
    quotes,
    loading: loadingQuotes,
    createQuote,
    updateQuote,
    removeQuote,
  } = useQuotes()

  const [editingId, setEditingId] = useState(null)
  const [cliente, setCliente] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [activeId, setActiveId] = useState('')
  const [activeQty, setActiveQty] = useState(1)
  const [formError, setFormError] = useState('')
  const [viewing, setViewing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const available = materials.filter((m) => Number(m.cantidad) > 0)

  const addToQuote = () => {
    if (!activeId) return
    const material = materials.find((m) => m.id === activeId)
    if (!material) return

    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.id === activeId)
      if (existing) {
        return prev.map((i) =>
          i.id === activeId
            ? { ...i, quantity: i.quantity + Number(activeQty) }
            : i,
        )
      }
      return [...prev, { ...material, quantity: Number(activeQty) }]
    })
    setActiveQty(1)
  }

  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateQty = (id, qty) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Number(qty) } : i)),
    )
  }

  const quote = calculateQuote(
    selectedItems.map((i) => ({
      quantity: i.quantity,
      price: Number(i.precio) || 0,
    })),
  )

  const resetBuilder = () => {
    setEditingId(null)
    setCliente('')
    setSelectedItems([])
    setFormError('')
  }

  const handleSave = () => {
    setFormError('')
    if (!cliente.trim()) {
      setFormError('Ingresa el nombre del cliente.')
      return
    }
    if (selectedItems.length === 0) {
      setFormError('Agrega al menos un material a la cotización.')
      return
    }

    const payload = {
      cliente: cliente.trim(),
      items: selectedItems.map((i) => ({
        id: i.id,
        nombre: i.nombre,
        precio: Number(i.precio) || 0,
        quantity: Number(i.quantity),
      })),
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
    }

    if (editingId) {
      updateQuote(editingId, payload)
    } else {
      createQuote(payload)
    }
    resetBuilder()
  }

  const openEdit = (q) => {
    setEditingId(q.id)
    setCliente(q.cliente)
    setSelectedItems(q.items.map((i) => ({ ...i })))
    setFormError('')
    setViewing(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    removeQuote(confirmDelete.id)
    if (editingId === confirmDelete.id) resetBuilder()
    setConfirmDelete(null)
  }

  return (
    <section className="quotes-page">
      <h1>Cotización de Compras</h1>
      <p className="subtitle">
        Agrega materiales del inventario disponible, calcula el total
        automáticamente (incluye IVA 16%) y guarda la cotización para el
        cliente.
      </p>

      {loadingMaterials && <p>Cargando inventario…</p>}

      <div className="quote-builder">
        {formError && <div className="form-error">{formError}</div>}

        <label className="quote-client">
          Cliente *
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre del cliente o empresa"
          />
        </label>

        <div className="quote-selector">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            disabled={loadingMaterials}
          >
            <option value="">Seleccionar material</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} ({m.categoria || '—'}) — $
                {Number(m.precio).toLocaleString('es-MX')} / {m.ubicacion}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={activeQty}
            onChange={(e) => setActiveQty(e.target.value)}
          />
          <button className="btn btn-orange" onClick={addToQuote}>
            + Agregar
          </button>
        </div>

        <div className="quote-items">
          <table className="quote-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Unitario</th>
                <th>Total</th>
                <th>✕</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan={5}>Sin materiales agregados.</td>
                </tr>
              ) : (
                selectedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQty(item.id, e.target.value)}
                      />
                    </td>
                    <td>${Number(item.precio).toLocaleString('es-MX')}</td>
                    <td>
                      $
                      {(item.quantity * Number(item.precio)).toLocaleString(
                        'es-MX',
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline"
                        onClick={() => removeItem(item.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="quote-totals">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>${quote.subtotal.toLocaleString('es-MX')}</span>
          </div>
          <div className="total-row">
            <span>IVA (16%):</span>
            <span>${quote.tax.toLocaleString('es-MX')}</span>
          </div>
          <div className="total-row total">
            <strong>Total:</strong>
            <strong>${quote.total.toLocaleString('es-MX')}</strong>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {editingId ? '✓ Guardar cambios' : '✓ Guardar cotización'}
          </button>
          {editingId && (
            <button className="btn btn-outline" onClick={resetBuilder}>
              Cancelar edición
            </button>
          )}
        </div>
      </div>

      <div className="inventory-header quotes-list-header">
        <div>
          <h2>Cotizaciones guardadas</h2>
          <p className="subtitle">Historial de cotizaciones generadas.</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Materiales</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loadingQuotes ? (
              <tr>
                <td colSpan={5}>Cargando…</td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin cotizaciones guardadas.</td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className={editingId === q.id ? 'low-stock' : ''}>
                  <td>
                    <strong>{q.cliente}</strong>
                  </td>
                  <td>{new Date(q.createdAt).toLocaleDateString('es-MX')}</td>
                  <td>{q.items.length}</td>
                  <td>${Number(q.total).toLocaleString('es-MX')}</td>
                  <td className="actions">
                    <button
                      className="btn btn-outline"
                      onClick={() => setViewing(q)}
                      aria-label="Consultar"
                      title="Consultar"
                    >
                      👁 Ver
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => openEdit(q)}
                      aria-label="Editar"
                      title="Editar"
                    >
                      ✎ Editar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => setConfirmDelete(q)}
                      aria-label="Eliminar"
                      title="Eliminar"
                    >
                      🗑 Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal
          title={`Cotización — ${viewing.cliente}`}
          onClose={() => setViewing(null)}
          wide
        >
          <div className="material-detail">
            <DetailRow label="Cliente" value={viewing.cliente} />
            <DetailRow
              label="Fecha"
              value={new Date(viewing.createdAt).toLocaleString('es-MX')}
            />
          </div>
          <table className="quote-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Cantidad</th>
                <th>Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {viewing.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.quantity}</td>
                  <td>${Number(item.precio).toLocaleString('es-MX')}</td>
                  <td>
                    $
                    {(item.quantity * Number(item.precio)).toLocaleString(
                      'es-MX',
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="quote-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>${Number(viewing.subtotal).toLocaleString('es-MX')}</span>
            </div>
            <div className="total-row">
              <span>IVA (16%):</span>
              <span>${Number(viewing.tax).toLocaleString('es-MX')}</span>
            </div>
            <div className="total-row total">
              <strong>Total:</strong>
              <strong>${Number(viewing.total).toLocaleString('es-MX')}</strong>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => openEdit(viewing)}>
              ✎ Editar
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title="¿Eliminar cotización?"
          onClose={() => setConfirmDelete(null)}
        >
          <p>
            ¿Estás seguro de eliminar la cotización de{' '}
            <strong>{confirmDelete.cliente}</strong>? Esta acción no se puede
            deshacer.
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