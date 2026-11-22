import React, { useState, useEffect } from 'react';
import { SEDES } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';
import { useProyectos } from '../../hooks/useProyectos';
import { getProyectoPrograma } from '../../constants/proyectos';
import {
  RoboticaIcon,
  NuevasTecnologiasIcon,
  TeachLabsIcon,
  SocioemocionalIcon,
  InglesIcon,
} from '../common/FmoProgramIcons';
import { Plus, Edit3, CheckCircle2, Check, FolderKanban } from 'lucide-react';

const PROGRAMAS_FMO = [
  { id: 'Robótica', nombre: 'Robótica', Icon: RoboticaIcon },
  { id: 'Nuevas Tecnologías', nombre: 'Nuevas Tecnologías', Icon: NuevasTecnologiasIcon },
  { id: 'TeachLabs', nombre: 'TeachLabs', Icon: TeachLabsIcon },
  { id: 'Socioemocional', nombre: 'Socioemocional', Icon: SocioemocionalIcon },
  { id: 'Inglés', nombre: 'Inglés', Icon: InglesIcon },
];

export default function ModalNuevoProyectoSteam({
  isOpen,
  onClose,
  onProyectoCreated,
  onProyectoUpdated,
  initialMode = 'crear',
}) {
  const { proyectos: listaProyectos, refetch: refetchProyectos } = useProyectos();

  const [modo, setModo] = useState(initialMode); // 'crear' | 'editar'
  const [proyectoAEditarId, setProyectoAEditarId] = useState('');
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('Medellín');
  const [programa, setPrograma] = useState('Robótica');
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar proyecto seleccionado al cambiar a modo editar
  useEffect(() => {
    if (modo === 'editar' && listaProyectos && listaProyectos.length > 0) {
      if (!proyectoAEditarId || !listaProyectos.some(p => p.id === proyectoAEditarId || p.nombre === proyectoAEditarId)) {
        cargarProyectoParaEdicion(listaProyectos[0]);
      }
    }
  }, [modo, listaProyectos]);

  if (!isOpen) return null;

  const cargarProyectoParaEdicion = (proj) => {
    if (!proj) return;
    const pId = proj.id || proj.nombre;
    setProyectoAEditarId(pId);
    setNombre(proj.nombre || '');
    setMunicipio(proj.sede_municipio || proj.sede || proj.municipio || 'Medellín');
    setPrograma(proj.programa || getProyectoPrograma(proj.nombre) || 'Robótica');
    setDescripcion(proj.descripcion || '');
    setError('');
    setSuccessMsg('');
  };

  const handleSelectProyectoAEditar = (pIdOrName) => {
    const proj = listaProyectos.find(
      (p) => p.id === pIdOrName || p.nombre === pIdOrName
    );
    if (proj) {
      cargarProyectoParaEdicion(proj);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del proyecto STEAM es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        nombre: nombre.trim(),
        sede_municipio: municipio,
        municipio: municipio,
        programa: programa,
        descripcion: descripcion.trim(),
      };

      if (modo === 'crear') {
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

        const itemToSave = creado || payload;
        try {
          const cached = JSON.parse(localStorage.getItem('siga_proyectos_steam') || '[]');
          if (Array.isArray(cached)) {
            const updated = [itemToSave, ...cached.filter((p) => p.id !== itemToSave.id && p.nombre !== itemToSave.nombre)];
            localStorage.setItem('siga_proyectos_steam', JSON.stringify(updated));
          }
        } catch (e) {}

        if (refetchProyectos) refetchProyectos();
        if (onProyectoCreated) onProyectoCreated(itemToSave);

        setSuccessMsg(`¡Proyecto STEAM "${itemToSave.nombre}" registrado exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        // Modo EDITAR
        const proyectoOriginal = listaProyectos.find(
          (p) => p.id === proyectoAEditarId || p.nombre === proyectoAEditarId
        );
        const targetId = proyectoOriginal?.id || proyectoAEditarId;

        let actualizado;
        try {
          actualizado = await inventoryApi.updateProyecto(targetId, payload);
        } catch (errApi) {
          console.warn('Fallback al actualizar proyecto localmente:', errApi);
          actualizado = {
            id: targetId,
            ...payload,
          };
        }

        const itemUpdated = actualizado || { id: targetId, ...payload };
        try {
          const cached = JSON.parse(localStorage.getItem('siga_proyectos_steam') || '[]');
          if (Array.isArray(cached)) {
            const updatedList = cached.map((p) =>
              (p.id && itemUpdated.id && p.id === itemUpdated.id) || p.nombre === proyectoOriginal?.nombre
                ? { ...p, ...itemUpdated }
                : p
            );
            localStorage.setItem('siga_proyectos_steam', JSON.stringify(updatedList));
          }
        } catch (e) {}

        if (refetchProyectos) refetchProyectos();
        if (onProyectoUpdated) onProyectoUpdated(itemUpdated);
        if (onProyectoCreated) onProyectoCreated(itemUpdated);

        setSuccessMsg(`¡Proyecto STEAM "${itemUpdated.nombre}" actualizado exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } catch (err) {
      setError(err.message || 'Error al procesar el proyecto STEAM');
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
        style={{ maxWidth: '540px', width: '100%', overflow: 'hidden' }}
      >
        {/* Encabezado del Modal */}
        <div className="modal-header" style={{ paddingBottom: '12px' }}>
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
              Catálogo de Iniciativas STEAM
            </span>
            <h3 style={{ margin: '2px 0 0 0' }}>
              {modo === 'crear' ? 'Nuevo Proyecto / Taller STEAM' : 'Editar Proyecto STEAM Existente'}
            </h3>
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

        {/* Pestañas de Modo: Crear Nuevo vs Editar Existente */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            padding: '0 20px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setModo('crear');
              setError('');
              setSuccessMsg('');
              setNombre('');
              setMunicipio('Medellín');
              setPrograma('Robótica');
              setDescripcion('');
            }}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              borderBottom: modo === 'crear' ? '3px solid #abd037' : '3px solid transparent',
              color: modo === 'crear' ? 'var(--text-h, #013a52)' : 'var(--text-dim, #6d6e71)',
              backgroundColor: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={15} style={{ color: modo === 'crear' ? '#abd037' : 'inherit' }} />
            <span>+ Crear Nuevo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModo('editar');
              setError('');
              setSuccessMsg('');
              if (listaProyectos && listaProyectos.length > 0) {
                cargarProyectoParaEdicion(listaProyectos[0]);
              }
            }}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              borderBottom: modo === 'editar' ? '3px solid #abd037' : '3px solid transparent',
              color: modo === 'editar' ? 'var(--text-h, #013a52)' : 'var(--text-dim, #6d6e71)',
              backgroundColor: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit3 size={14} style={{ color: modo === 'editar' ? '#abd037' : 'inherit' }} />
            <span>✏️ Editar Existente ({listaProyectos?.length || 0})</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body form-grid" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Mensajes de Alerta / Éxito */}
            {error && (
              <div
                className="form-group full"
                style={{
                  padding: '8px 12px',
                  background: 'var(--red-bg, rgba(239, 68, 68, 0.15))',
                  border: '1px solid var(--red-border, #ef4444)',
                  color: 'var(--red, #e11d48)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {successMsg && (
              <div
                className="form-group full"
                style={{
                  padding: '9px 13px',
                  background: 'rgba(171, 208, 55, 0.15)',
                  border: '1px solid #abd037',
                  color: '#285408',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} className="text-[#84CC16]" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Selector de Proyecto a Editar (visible solo en modo Editar) */}
            {modo === 'editar' && (
              <div
                className="form-group full"
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(171, 208, 55, 0.08)',
                  border: '1.5px solid rgba(171, 208, 55, 0.35)',
                  borderRadius: '10px',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    marginBottom: '6px',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <FolderKanban size={15} style={{ color: '#7b2cbf' }} />
                    <span>Selecciona el Proyecto a Editar *</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', fontWeight: 500 }}>
                    {listaProyectos.length} disponibles
                  </span>
                </label>

                <select
                  value={proyectoAEditarId}
                  onChange={(e) => handleSelectProyectoAEditar(e.target.value)}
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    borderColor: '#abd037',
                    backgroundColor: 'var(--surface, #ffffff)',
                  }}
                >
                  {listaProyectos.map((p) => {
                    const pVal = p.id || p.nombre;
                    const pSede = p.sede_municipio || p.sede || p.municipio;
                    const pProg = p.programa || getProyectoPrograma(p.nombre);
                    return (
                      <option key={pVal} value={pVal}>
                        {p.nombre} {pSede ? `(${pSede})` : ''} — [{pProg}]
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Nombre del Proyecto */}
            <div className="form-group full">
              <label>
                Nombre del Proyecto / Taller STEAM *
              </label>
              <input
                required
                type="text"
                placeholder="Ej. Club de Robótica Vex IQ / Taller Impresión 3D"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            {/* Municipio / Sede Principal */}
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

            {/* Selector de Programa FMO con íconos oficiales */}
            <div className="form-group full" style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-h, #013a52)',
                  marginBottom: '8px',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <span>Programa FMO *</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim, #6d6e71)' }}>
                  {modo === 'editar' ? 'Cambia el programa si corresponde' : 'Selecciona el programa oficial'}
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

            {/* Descripción u Objetivos */}
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

          {/* Footer del Modal */}
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
              }}
            >
              {submitting ? (
                'Procesando...'
              ) : modo === 'crear' ? (
                <>
                  <Plus size={16} />
                  <span>+ Crear Proyecto STEAM</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>💾 Guardar Cambios del Proyecto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
