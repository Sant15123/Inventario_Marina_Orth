import React, { useState } from 'react';
import { SEDES } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';
import {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
} from '../common/FmoProgramIcons';

const PROGRAMAS_FMO = [
  { id: 'Robótica', nombre: 'Robótica', Icon: RoboticaIcon },
  { id: 'Nuevas Tecnologías', nombre: 'Nuevas Tecnologías', Icon: NuevasTecnologiasIcon },
  { id: 'TeachLabs', nombre: 'TeachLabs', Icon: TeachLabsIcon },
  { id: 'Socioemocional', nombre: 'Socioemocional', Icon: SocioemocionalIcon },
  { id: 'Inglés', nombre: 'Inglés', Icon: InglesIcon },
];

export default function ModalNuevoProyectoSteam({ isOpen, onClose, onProyectoCreated }) {
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('Medellín');
  const [programa, setPrograma] = useState('Robótica');
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
        programa: programa,
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

      if (creado || payload) {
        const itemToSave = creado || payload;
        try {
          const cached = JSON.parse(localStorage.getItem('siga_proyectos_steam') || '[]');
          if (Array.isArray(cached)) {
            const updated = [itemToSave, ...cached.filter(p => p.id !== itemToSave.id && p.nombre !== itemToSave.nombre)];
            localStorage.setItem('siga_proyectos_steam', JSON.stringify(updated));
          }
        } catch (e) {}
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

            <div className="form-group full" style={{ marginBottom: '10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--text-h, #013a52)',
                  marginBottom: '8px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <span>Programa FMO *</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim, #6d6e71)' }}>
                  Selecciona el programa oficial
                </span>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                }}
              >
                {PROGRAMAS_FMO.map((p) => {
                  const isSelected = programa === p.id;
                  const IconComp = p.Icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPrograma(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid #abd037'
                          : '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: isSelected
                          ? 'rgba(171, 208, 55, 0.12)'
                          : 'var(--card-bg, #ffffff)',
                        color: isSelected ? '#013a52' : 'var(--text, #334155)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s ease',
                        fontFamily: "'Poppins', sans-serif",
                      }}
                      className={`group transition-transform active:scale-98 ${
                        isSelected
                          ? 'shadow-xs ring-1 ring-[#abd037]/40 dark:text-white'
                          : 'hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div style={{ flexShrink: 0, width: '22px', height: '22px' }}>
                        <IconComp size={22} className="w-full h-full" />
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isSelected ? 700 : 600,
                          lineHeight: 1.25,
                        }}
                        className={isSelected ? 'text-[#013a52] dark:text-white' : 'text-slate-700 dark:text-slate-200'}
                      >
                        {p.nombre}
                      </span>
                    </button>
                  );
                })}
              </div>
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
