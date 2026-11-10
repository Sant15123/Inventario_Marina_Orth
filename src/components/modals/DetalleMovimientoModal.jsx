import React from 'react';
import { fmtDate } from '../../data/initialData';

function getItemIcon(item, tipo) {
  const norm = String(item || '').toLowerCase();
  const tipoNorm = String(tipo || '').toLowerCase();
  if (norm.includes('computador') || norm.includes('portatil') || norm.includes('laptop') || norm.includes('pc')) return '💻';
  if (norm.includes('tablet') || norm.includes('ipad')) return '📱';
  if (norm.includes('impresora') || norm.includes('scanner')) return '🖨️';
  if (norm.includes('monitor') || norm.includes('pantalla')) return '🖥️';
  if (norm.includes('silla') || norm.includes('mesa') || norm.includes('escritorio') || norm.includes('archivador') || norm.includes('mueble')) return '🪑';
  if (norm.includes('papel') || norm.includes('resma') || norm.includes('cuaderno') || norm.includes('lapicero')) return '📦';
  if (tipoNorm.includes('prestamo')) return '🔄';
  if (tipoNorm.includes('entrega')) return '📦';
  if (tipoNorm.includes('baja') || tipoNorm.includes('elimin')) return '⚠️';
  if (tipoNorm.includes('ingreso') || tipoNorm.includes('alta')) return '📥';
  return '📋';
}

export default function DetalleMovimientoModal({ movimiento: rawMovimiento, onClose }) {
  if (!rawMovimiento) return null;

  const movimiento = {
    ...rawMovimiento,
    elemento: rawMovimiento.itemName || rawMovimiento.elemento || rawMovimiento.elemento_nombre || rawMovimiento.material || 'Sin nombre',
    id_referencia: rawMovimiento.itemId || rawMovimiento.id_referencia || rawMovimiento.codigo || rawMovimiento.placa || rawMovimiento.placa_o_id || 'N/A',
    responsable: rawMovimiento.person || rawMovimiento.responsable || 'Bodega Central',
    sede: rawMovimiento.sede || 'Medellín',
    cantidad: rawMovimiento.qty ?? rawMovimiento.cantidad ?? 1,
    tipo: rawMovimiento.tipo || rawMovimiento.type || 'Actualización',
    fecha: rawMovimiento.date || rawMovimiento.fecha,
    motivo: rawMovimiento.motivo || rawMovimiento.motive || rawMovimiento.detalles || 'Actualización general registrada en el sistema.',
  };

  const cerrarModal = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const itemIcon = getItemIcon(movimiento.elemento, movimiento.tipo);

  return (
    <div className="modal-backdrop" onClick={cerrarModal}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Cabecera del Modal */}
        <div className="modal-header">
          <h3>Detalle del Movimiento</h3>
          <button type="button" className="close-btn" onClick={cerrarModal} title="Cerrar modal">
            ✕
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Elemento / Activo Hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>{itemIcon}</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)', fontWeight: 700 }}>
                {movimiento.elemento}
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                ID Registro: #{movimiento.id || 'N/A'}
              </span>
            </div>
          </div>

          {/* Grilla de Datos Principales (Estilo Card 2x2 de Préstamos) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              background: 'var(--surface-2)',
              padding: '12px',
              borderRadius: '8px',
            }}
          >
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Custodio / Responsable
              </label>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text-h)' }}>
                {movimiento.responsable}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Sede / Destino
              </label>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text-h)' }}>
                {movimiento.sede}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Fecha Registro
              </label>
              <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text-h)' }}>
                {fmtDate(movimiento.fecha)}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Tipo de Transacción
              </label>
              <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--green, #84CC16)' }}>
                {movimiento.tipo}
              </p>
            </div>
          </div>

          {/* Placas / Unidades */}
          <div>
            <label
              style={{
                fontSize: '11px',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '4px',
                letterSpacing: '0.4px',
              }}
            >
              Placas / Unidades
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {movimiento.id_referencia && movimiento.id_referencia !== 'N/A' ? (
                <span
                  className="mono-num"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  {movimiento.id_referencia}
                </span>
              ) : (
                <span className="mono-num" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Sin placa / ID
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                ({movimiento.cantidad} {movimiento.cantidad === 1 ? 'unidad' : 'unidades'})
              </span>
            </div>
          </div>

          {/* Motivo / Observaciones */}
          <div>
            <label
              style={{
                fontSize: '11px',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '4px',
                letterSpacing: '0.4px',
              }}
            >
              Motivo / Observaciones
            </label>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--text)',
                background: 'var(--surface-1)',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '110px',
                overflowY: 'auto',
                lineHeight: '1.4',
              }}
            >
              {movimiento.motivo || 'Actualización general registrada en el sistema.'}
            </p>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={cerrarModal}
            style={{ minWidth: '100px' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
