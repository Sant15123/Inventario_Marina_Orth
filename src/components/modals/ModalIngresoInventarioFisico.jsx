import { useState, useEffect } from 'react';
import { PackagePlus, Check, Loader2, X } from 'lucide-react';
import { SEDES } from '../../services/mockData';

export default function ModalIngresoInventarioFisico({
  isOpen,
  onClose,
  initialData,
  sedesList = SEDES,
  onConfirm,
  submitting = false,
}) {
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({ ...initialData });
    } else {
      setFormData(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.sku.trim()) {
      alert('El código o SKU es obligatorio');
      return;
    }
    if (!formData.nombre || !formData.nombre.trim()) {
      alert('El nombre del artículo es obligatorio');
      return;
    }
    onConfirm(formData);
  };

  const listaSedes = Array.isArray(sedesList) && sedesList.length > 0 ? sedesList : SEDES;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          maxWidth: '640px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface, #0f172a)',
          border: '1px solid var(--line-strong, #334155)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          color: 'var(--text, #f8fafc)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
              }}
            >
              <PackagePlus size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                Ingreso a Inventario Físico (Alta de Catálogo)
              </h4>
              <span style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)' }}>
                Registra el insumo recibido con todos sus atributos técnicos en el inventario institucional
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario y Cuerpo con Scroll */}
        <form onSubmit={handleSubmit} style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            {/* Selector Módulo Destino */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '6px' }}>
                Módulo de Inventario Destino *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const rand = Math.floor(100 + Math.random() * 900);
                    setFormData({
                      ...formData,
                      tabla: 'consumibles',
                      categoria: 'Robótica',
                      sku: `ROB-NEW-${rand}`,
                    });
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                    backgroundColor: formData.tabla === 'consumibles' ? '#22c55e' : 'var(--bg, #0b1120)',
                    color: formData.tabla === 'consumibles' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                    border: `1px solid ${formData.tabla === 'consumibles' ? '#16a34a' : 'var(--line, #334155)'}`,
                  }}
                >
                  📦 Consumibles y Robótica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rand = Math.floor(100 + Math.random() * 900);
                    setFormData({
                      ...formData,
                      tabla: 'papeleria',
                      categoria: 'Papelería General',
                      sku: `PAP-NEW-${rand}`,
                    });
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                    backgroundColor: formData.tabla === 'papeleria' ? '#f59e0b' : 'var(--bg, #0b1120)',
                    color: formData.tabla === 'papeleria' ? '#020617' : 'var(--text-dim, #94a3b8)',
                    border: `1px solid ${formData.tabla === 'papeleria' ? '#d97706' : 'var(--line, #334155)'}`,
                  }}
                >
                  📄 Papelería Institucional
                </button>
              </div>
            </div>

            {/* Fila 1: Código / SKU y Nombre */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Código / SKU *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Nombre del Artículo / Insumo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Fila 2: Categoría / Subcategoría y Marca / Referencia */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Categoría / Subcategoría *
                </label>
                <select
                  value={formData.categoria || ''}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  {formData.tabla === 'papeleria' ? (
                    <>
                      <option value="Papelería General">Papelería General</option>
                      <option value="Cuadernos y Libretas">Cuadernos y Libretas</option>
                      <option value="Escritura y Marcadores">Escritura y Marcadores</option>
                      <option value="Adhesivos y Cintas">Adhesivos y Cintas</option>
                      <option value="Arte y Manualidades">Arte y Manualidades</option>
                    </>
                  ) : (
                    <>
                      <option value="Robótica">Robótica</option>
                      <option value="Sensores">Sensores</option>
                      <option value="Componentes Electrónicos">Componentes Electrónicos</option>
                      <option value="Herramientas">Herramientas</option>
                      <option value="Mecánica">Mecánica</option>
                      <option value="Impresión 3D">Impresión 3D</option>
                      <option value="Baterías y Energía">Baterías y Energía</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Marca / Referencia / Fabricante
                </label>
                <input
                  type="text"
                  value={formData.marca || ''}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Ej. Arduino, Pololu, Norma, etc."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Fila 3: Unidad de Medida y Valor Unitario */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Unidad de Medida
                </label>
                <select
                  value={formData.unidad || 'und'}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="und">Unidad (und)</option>
                  <option value="kit">Kit / Set</option>
                  <option value="pack">Pack / Paquete</option>
                  <option value="caja">Caja</option>
                  <option value="rollo">Rollo</option>
                  <option value="metro">Metro (m)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Valor Unitario ($ COP)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.valor_unitario || ''}
                  onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                  placeholder="Ej. 15000"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Fila 4: Cantidad Recibida y Stock Mínimo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Cantidad Recibida (Stock Actual) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.cantidad || 1}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Stock Mínimo (Alerta) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.minimo || 5}
                  onChange={(e) => setFormData({ ...formData, minimo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Fila 5: Sede y Ubicación en estante */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Sede Destino *
                </label>
                <select
                  value={formData.sede || 'Medellín'}
                  onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  {listaSedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                  Estante / Ubicación Física
                </label>
                <input
                  type="text"
                  value={formData.estante || ''}
                  onChange={(e) => setFormData({ ...formData, estante: e.target.value })}
                  placeholder="Ej. Bodega Central, Estante A-2, Caja 5"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #334155)',
                    backgroundColor: 'var(--bg, #0b1120)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Fila 6: Observaciones y Link de Referencia */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                Observaciones / Enlace de Referencia
              </label>
              <textarea
                rows={2}
                value={formData.observaciones || ''}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Detalles del paquete, enlace del proveedor o notas..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line, #334155)',
                  backgroundColor: 'var(--bg, #0b1120)',
                  color: 'var(--text, #f8fafc)',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  resize: 'none',
                }}
              />
            </div>
          </div>

          {/* Footer del Modal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 22px',
              borderTop: '1px solid var(--line, #1e293b)',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn ghost small"
              style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn small inline-flex items-center gap-1.5"
              style={{
                backgroundColor: '#22c55e',
                borderColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Registrando en inventario...</span>
                </>
              ) : (
                <>
                  <Check size={15} strokeWidth={2.5} />
                  <span>📥 Confirmar e Ingresar al Inventario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
