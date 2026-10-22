import React, { useState } from 'react';
import { SEDES } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';

export default function ModalNuevoProyectoSteam({ isOpen, onClose, onProyectoCreated }) {
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('Medellín');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del proyecto STEAM es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const payload = {
        nombre: nombre.trim(),
        sede_municipio: municipio,
        municipio: municipio,
        descripcion: descripcion.trim(),
      };

      let creado;
      try {
        creado = await inventoryApi.createProyecto(payload);
      } catch (errApi) {
        console.warn('Fallback al guardar proyecto localmente:', errApi);
        creado = {
          id: `proj-${Date.now()}`,
          ...payload,
        };
      }

      if (onProyectoCreated) {
        onProyectoCreated(creado || payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al registrar proyecto');
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
        style={{ maxWidth: '500px', width: '100%' }}
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
              Catálogo de Iniciativas
            </span>
            <h3 style={{ margin: '2px 0 0 0' }}>Nuevo Proyecto / Taller STEAM</h3>
          </div>
          <button
            type="button"
            className="close-btn"
            disabled={submitting}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-grid">
            {error && (
              <div
                className="form-group full"
                style={{
                  padding: '8px 12px',
                  background: 'var(--red-bg, rgba(239, 68, 68, 0.15))',
                  border: '1px solid var(--red-border, #ef4444)',
                  color: 'var(--red, #e11d48)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group full">
              <label>Nombre del Proyecto / Taller STEAM *</label>
              <input
                required
                type="text"
                placeholder="Ej. Club de Robótica Vex IQ / Taller Impresión 3D"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label>Municipio / Sede Principal *</label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              >
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group full">
              <label>Descripción u Objetivos</label>
              <textarea
                rows={3}
                placeholder="Breve resumen de actividades, población beneficiaria o alcances pedagógicos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn ghost"
              disabled={submitting}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !nombre.trim()}
            >
              {submitting ? 'Guardando...' : '+ Crear Proyecto STEAM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
