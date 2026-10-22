import React, { useState } from 'react';
import { SEDES } from '../../services/mockData';

export default function ModalNuevoUsuarioRapido({ isOpen, onClose, onUserCreated }) {
  const [formData, setFormData] = useState({
    documento: '',
    nombre: '',
    email: '',
    telefono: '',
    rol: 'usuario',
    cargo: 'Formador STEAM',
    sede: 'Medellín',
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.documento.trim() || !formData.nombre.trim()) {
      setError('Documento y Nombre son campos obligatorios.');
      return;
    }

    const newUser = {
      ...formData,
      id: `usr-${Date.now().toString().slice(-4)}`,
    };

    if (onUserCreated) {
      onUserCreated(newUser);
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px', width: '100%' }}
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
              Gestión de Custodios SIGA
            </span>
            <h3 style={{ margin: '2px 0 0 0' }}>Registrar Nuevo Custodio / Usuario</h3>
          </div>
          <button
            type="button"
            className="close-btn"
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

            <div className="form-group">
              <label>Cédula / Documento *</label>
              <input
                required
                type="text"
                placeholder="Ej. 1001234567"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Rol en Sistema *</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                <option value="usuario">Usuario / Formador</option>
                <option value="operador">Operador de Bodega</option>
                <option value="supervisor">Supervisor</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>

            <div className="form-group full">
              <label>Nombre Completo *</label>
              <input
                required
                type="text"
                placeholder="Ej. Laura Victoria Gómez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@fmo.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Teléfono / Celular</label>
              <input
                type="tel"
                placeholder="3001234567"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Sede Predeterminada *</label>
              <select
                value={formData.sede}
                onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
              >
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cargo / Especialidad</label>
              <input
                type="text"
                placeholder="Ej. Docente Robótica"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              + Guardar y Seleccionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
