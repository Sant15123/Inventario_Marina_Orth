import React, { useState } from 'react';
import inventoryApi from '../../services/inventoryApi';

export default function ModalNuevaSede({ isOpen, onClose, onSedeCreated }) {
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la sede es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        nombre: nombre.trim().toUpperCase(),
        municipio: municipio.trim() || nombre.trim(),
        direccion: direccion.trim() || null,
      };

      let creada;
      try {
        creada = await inventoryApi.createSede(payload);
      } catch (errApi) {
        console.warn('Fallback al registrar sede localmente:', errApi);
        creada = {
          id: `sede-${Date.now()}`,
          ...payload,
        };
      }

      if (onSedeCreated) {
        onSedeCreated(creada || payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar sede');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%' }}
      >
        <div className="modal-header">
          <div>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--copper, #84CC16)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
              }}
            >
              Catálogo Territorial FMO
            </span>
            <h3 style={{ margin: '2px 0 0 0' }}>Registrar Nueva Sede / Municipio</h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-grid">
            {error && (
              <div
                style={{
                  gridColumn: 'span 2',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '13px',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div className="form-group full">
              <label>
                Nombre de la Sede *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: SABANETA, ITAGÜÍ, URRAO, CARMEN DE VIBORAL"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (!municipio) {
                    setMunicipio(e.target.value);
                  }
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                Identificador de la sede o institución aliada.
              </span>
            </div>

            <div className="form-group full">
              <label>Municipio / Ciudad</label>
              <input
                type="text"
                placeholder="Ej: Sabaneta, Itagüí, Medellín..."
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label>Dirección o Ubicación de Referencia (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: Carrera 45 # 70-20, Casa de la Cultura, Colegio Aliado..."
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !nombre.trim()}
              style={{
                backgroundColor: '#84CC16',
                color: '#0B132B',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {submitting ? 'Guardando...' : 'Guardar Sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
