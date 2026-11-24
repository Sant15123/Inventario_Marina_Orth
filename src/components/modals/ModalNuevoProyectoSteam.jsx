import React, { useState, useEffect, useCallback } from 'react';
import inventoryApi from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
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
  sedes: propSedes,
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
  const [listaSedes, setListaSedes] = useState([]);

  // Carga de sedes en vivo desde public.sedes en Supabase
  const fetchSedes = useCallback(async () => {
    try {
      if (supabase) {
        const { data, error: sbError } = await supabase
          .from('sedes')
          .select('id, nombre, municipio, direccion, activo')
          .order('nombre', { ascending: true });

        if (!sbError && Array.isArray(data) && data.length > 0) {
          const unicas = [];
          const seen = new Set();
          for (const s of data) {
            if (s.activo === false) continue;
            const norm = (s.nombre || '').trim().toLowerCase();
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            unicas.push({
              id: s.id || s.nombre,
              nombre: (s.nombre || '').trim(),
              municipio: (s.municipio || s.nombre || '').trim(),
            });
          }
          if (unicas.length > 0) {
            setListaSedes(unicas);
            return unicas;
          }
        }
      }

      // Fallback API
      const dataApi = await inventoryApi.getSedes();
      if (Array.isArray(dataApi) && dataApi.length > 0) {
        const unicas = [];
        const seen = new Set();
        for (const s of dataApi) {
          if (s.activo === false) continue;
          const norm = (s.nombre || '').trim().toLowerCase();
          if (!norm || seen.has(norm)) continue;
          seen.add(norm);
          unicas.push({
            id: s.id || s.nombre,
            nombre: (s.nombre || '').trim(),
            municipio: (s.municipio || s.nombre || '').trim(),
          });
        }
        if (unicas.length > 0) {
          setListaSedes(unicas);
          return unicas;
        }
      }
    } catch (err) {
      console.warn('[ModalNuevoProyectoSteam] Error al consultar public.sedes:', err.message);
    }

    // Fallback propSedes
    if (Array.isArray(propSedes) && propSedes.length > 0) {
      const seen = new Set();
      const fallbackList = [];
      for (const s of propSedes) {
        const n = (typeof s === 'string' ? s : s.nombre || '').trim();
        const norm = n.toLowerCase();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          fallbackList.push({
            id: typeof s === 'string' ? s : s.id || s.nombre,
            nombre: n,
            municipio: typeof s === 'string' ? s : s.municipio || s.nombre,
          });
        }
      }
      setListaSedes(fallbackList);
      return fallbackList;
    }

    return [];
  }, [propSedes]);

  // Consultar sedes cada vez que el modal se abre
  useEffect(() => {
    if (isOpen) {
      fetchSedes();
    }
  }, [isOpen, fetchSedes]);

  // Escuchar evento global siga:sedes_changed para sincronización inmediata sin recargar página
  useEffect(() => {
    const handleSedesChanged = () => {
      fetchSedes();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('siga:sedes_changed', handleSedesChanged);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('siga:sedes_changed', handleSedesChanged);
      }
    };
  }, [fetchSedes]);

  // Si propSedes se actualiza desde el padre, sincronizar listaSedes
  useEffect(() => {
    if (Array.isArray(propSedes) && propSedes.length > 0 && listaSedes.length === 0) {
      const seen = new Set();
      const fallbackList = [];
      for (const s of propSedes) {
        const n = (typeof s === 'string' ? s : s.nombre || '').trim();
        const norm = n.toLowerCase();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          fallbackList.push({
            id: typeof s === 'string' ? s : s.id || s.nombre,
            nombre: n,
            municipio: typeof s === 'string' ? s : s.municipio || s.nombre,
          });
        }
      }
      setListaSedes(fallbackList);
    }
  }, [propSedes, listaSedes.length]);

  // Selección predeterminada en modo creación una vez cargadas las sedes
  useEffect(() => {
    if (modo === 'crear' && (!municipio || municipio === 'Medellín') && listaSedes.length > 0) {
      const medellin = listaSedes.find(
        (s) => s.nombre.toLowerCase() === 'medellín' || s.nombre.toLowerCase() === 'medellin'
      );
      if (medellin) {
        setMunicipio(medellin.nombre);
      } else {
        setMunicipio(listaSedes[0].nombre);
      }
    }
  }, [listaSedes, modo]);

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

      if (modo === 'crear') {
        const payloadInsert = {
          nombre: nombre.trim(),
          sede_municipio: municipio,
          programa: programa,
          descripcion: descripcion.trim(),
          activo: true,
        };

        let creado = null;
        if (supabase) {
          const { data: insertedSupabase, error: errorInsert } = await supabase
            .from('proyectos_steam')
            .insert([payloadInsert])
            .select()
            .single();

          if (errorInsert) {
            console.error('Error al crear en Supabase proyectos_steam:', errorInsert);
            throw new Error(`Error en base de datos: ${errorInsert.message || 'No se pudo crear el proyecto STEAM'}`);
          }

          if (insertedSupabase) {
            creado = insertedSupabase;
          }
        }

        if (!creado) {
          creado = await inventoryApi.createProyecto(payloadInsert);
        }

        const itemToSave = creado || { id: `proj-${Date.now()}`, ...payloadInsert };

        try {
          const cached = JSON.parse(localStorage.getItem('siga_proyectos_steam') || '[]');
          if (Array.isArray(cached)) {
            const updated = [itemToSave, ...cached.filter((p) => p.id !== itemToSave.id && p.nombre !== itemToSave.nombre)];
            localStorage.setItem('siga_proyectos_steam', JSON.stringify(updated));
          }
        } catch (e) {}

        if (refetchProyectos) {
          await refetchProyectos();
        }
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

        const payloadUpdate = {
          nombre: nombre.trim(),
          sede_municipio: municipio,
          programa: programa,
          descripcion: descripcion.trim(),
        };

        let itemUpdated = null;

        // 1. Ejecutar UPDATE real directamente en Supabase si está disponible
        if (supabase) {
          let query = supabase.from('proyectos_steam').update(payloadUpdate);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetId));
          if (isUUID) {
            query = query.eq('id', targetId);
          } else if (proyectoOriginal?.nombre) {
            query = query.eq('nombre', proyectoOriginal.nombre);
          } else {
            query = query.eq('nombre', nombre.trim());
          }

          const { data: updatedSupabase, error: errorSupabase } = await query.select().single();

          if (errorSupabase) {
            console.error('Error al actualizar en Supabase proyectos_steam:', errorSupabase);
            throw new Error(`Error en base de datos: ${errorSupabase.message || 'No se pudo actualizar el proyecto'}`);
          }

          if (updatedSupabase) {
            itemUpdated = updatedSupabase;
          }
        }

        // 2. Si no se resolvió con cliente directo, utilizar inventoryApi
        if (!itemUpdated) {
          itemUpdated = await inventoryApi.updateProyecto(targetId, payloadUpdate);
        }

        const finalItem = itemUpdated || { id: targetId, ...payloadUpdate };

        // Sincronizar almacenamiento local
        try {
          const cached = JSON.parse(localStorage.getItem('siga_proyectos_steam') || '[]');
          if (Array.isArray(cached)) {
            const updatedList = cached.map((p) =>
              (p.id && finalItem.id && p.id === finalItem.id) || p.nombre === proyectoOriginal?.nombre
                ? { ...p, ...finalItem }
                : p
            );
            localStorage.setItem('siga_proyectos_steam', JSON.stringify(updatedList));
          }
        } catch (e) {}

        // Recargar catálogo de proyectos STEAM
        if (refetchProyectos) {
          await refetchProyectos();
        }
        if (onProyectoUpdated) onProyectoUpdated(finalItem);
        if (onProyectoCreated) onProyectoCreated(finalItem);

        setSuccessMsg(`¡Proyecto STEAM "${finalItem.nombre}" actualizado exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 800);
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
        className="modal-dialog flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      >
        {/* Encabezado del Modal (fijo) */}
        <div className="modal-header shrink-0" style={{ paddingBottom: '12px', flexShrink: 0 }}>
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

        {/* Pestañas de Modo: Crear Nuevo vs Editar Existente (fijas) */}
        <div
          className="shrink-0"
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            padding: '0 20px',
            flexShrink: 0,
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
            <span>Crear Nuevo</span>
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
            <span>Editar Existente ({listaProyectos?.length || 0})</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            margin: 0,
          }}
        >
          <div
            className="modal-body form-grid flex-1 overflow-y-auto"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 20px',
            }}
          >
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
                required
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              >
                {/* Si la sede actual del proyecto no está en listaSedes, mantenerla como opción para no romper datos */}
                {municipio && !listaSedes.some((s) => s.nombre.toLowerCase() === municipio.toLowerCase()) && (
                  <option value={municipio}>
                    {municipio}
                  </option>
                )}
                {listaSedes.map((s) => {
                  const tieneDistintoMunicipio =
                    s.municipio &&
                    s.municipio.trim().toLowerCase() !== s.nombre.trim().toLowerCase();
                  const label = tieneDistintoMunicipio
                    ? `${s.nombre} (${s.municipio})`
                    : s.nombre;
                  return (
                    <option key={s.id || s.nombre} value={s.nombre}>
                      {label}
                    </option>
                  );
                })}
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

          {/* Footer fijo abajo */}
          <div
            className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3 shrink-0"
            style={{
              borderTop: '1px solid var(--line, #e2e8f0)',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
              backgroundColor: 'var(--surface, #ffffff)',
            }}
          >
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              disabled={submitting}
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                background: 'transparent',
                border: '1px solid var(--line, #cbd5e1)',
                color: 'var(--text-dim, #64748b)',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || !nombre.trim()}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                backgroundColor: '#abd037',
                color: '#013a52',
                border: '1px solid #96bc28',
                boxShadow: '0 2px 8px rgba(171, 208, 55, 0.35)',
                cursor: submitting || !nombre.trim() ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #013a52',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  <span>Guardando...</span>
                </>
              ) : modo === 'crear' ? (
                <>
                  <Plus size={16} strokeWidth={2.5} style={{ color: '#013a52' }} />
                  <span>Crear Proyecto STEAM</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} style={{ color: '#013a52' }} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
