import React, { useState, useEffect } from 'react';
import inventoryApi from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
import { SEDES } from '../../services/mockData';
import { Building2, Plus, Edit3, Check, CheckCircle2 } from 'lucide-react';

export default function ModalNuevaSede({
  isOpen,
  onClose,
  onSedeCreated,
  onSedeUpdated,
  sedes: propSedes,
  initialMode = 'crear',
}) {
  const [modo, setModo] = useState(initialMode); // 'crear' | 'editar'
  const [listaSedes, setListaSedes] = useState([]);
  const [sedeAEditarId, setSedeAEditarId] = useState('');
  const [nombre, setNombre] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [direccion, setDireccion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cargar sedes al abrir el modal
  const fetchSedes = async () => {
    try {
      const data = await inventoryApi.getSedes();
      if (Array.isArray(data) && data.length > 0) {
        setListaSedes(data);
        return data;
      }
    } catch (err) {
      console.warn('Aviso: no se pudieron cargar sedes desde API:', err.message);
    }
    // Fallback con mockData o propSedes
    const baseNames = Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES;
    const fallbackList = baseNames.map((s) => ({
      id: typeof s === 'string' ? s : s.id || s.nombre,
      nombre: typeof s === 'string' ? s : s.nombre,
      municipio: typeof s === 'string' ? s : s.municipio || s.nombre,
      direccion: typeof s === 'string' ? '' : s.direccion || '',
    }));
    setListaSedes(fallbackList);
    return fallbackList;
  };

  useEffect(() => {
    if (isOpen) {
      fetchSedes().then((sedesCargadas) => {
        if (modo === 'editar' && sedesCargadas && sedesCargadas.length > 0) {
          cargarSedeParaEdicion(sedesCargadas[0]);
        }
      });
    }
  }, [isOpen]);

  // Sincronizar selección al cambiar a modo editar
  useEffect(() => {
    if (modo === 'editar' && listaSedes && listaSedes.length > 0) {
      if (!sedeAEditarId || !listaSedes.some((s) => s.id === sedeAEditarId || s.nombre === sedeAEditarId)) {
        cargarSedeParaEdicion(listaSedes[0]);
      }
    }
  }, [modo, listaSedes]);

  if (!isOpen) return null;

  const cargarSedeParaEdicion = (sede) => {
    if (!sede) return;
    const sId = sede.id || sede.nombre;
    setSedeAEditarId(sId);
    setNombre(sede.nombre || '');
    setMunicipio(sede.municipio || sede.nombre || '');
    setDireccion(sede.direccion || '');
    setError('');
    setSuccessMsg('');
  };

  const handleSelectSedeAEditar = (sIdOrName) => {
    const sede = listaSedes.find((s) => s.id === sIdOrName || s.nombre === sIdOrName);
    if (sede) {
      cargarSedeParaEdicion(sede);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la sede es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      if (modo === 'crear') {
        const payloadInsert = {
          nombre: nombre.trim(),
          municipio: municipio.trim() || nombre.trim(),
          direccion: direccion.trim() || null,
          activo: true,
        };

        let creada = null;
        if (supabase) {
          const { data: insertedSupabase, error: errorInsert } = await supabase
            .from('sedes')
            .insert([payloadInsert])
            .select()
            .single();

          if (errorInsert) {
            console.error('Error al insertar sede en Supabase:', errorInsert);
            throw new Error(`Error en base de datos: ${errorInsert.message || 'No se pudo registrar la sede'}`);
          }
          if (insertedSupabase) {
            creada = insertedSupabase;
          }
        }

        if (!creada) {
          creada = await inventoryApi.createSede(payloadInsert);
        }

        const itemToSave = creada || { id: `sede-${Date.now()}`, ...payloadInsert };

        await fetchSedes();
        if (onSedeCreated) {
          onSedeCreated(itemToSave);
        }

        setSuccessMsg(`¡Sede "${itemToSave.nombre}" registrada exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        // Modo EDITAR
        const sedeOriginal = listaSedes.find((s) => s.id === sedeAEditarId || s.nombre === sedeAEditarId);
        const targetId = sedeOriginal?.id || sedeAEditarId;

        const payloadUpdate = {
          nombre: nombre.trim(),
          municipio: municipio.trim() || nombre.trim(),
          direccion: direccion.trim() || null,
        };

        let sedeActualizada = null;
        if (supabase) {
          let query = supabase.from('sedes').update(payloadUpdate);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetId));
          if (isUUID) {
            query = query.eq('id', targetId);
          } else if (sedeOriginal?.nombre) {
            query = query.eq('nombre', sedeOriginal.nombre);
          } else {
            query = query.eq('nombre', nombre.trim());
          }

          const { data: updatedSupabase, error: errorSupabase } = await query.select().single();
          if (errorSupabase) {
            console.error('Error al actualizar sede en Supabase:', errorSupabase);
            throw new Error(`Error en base de datos: ${errorSupabase.message || 'No se pudo actualizar la sede'}`);
          }
          if (updatedSupabase) {
            sedeActualizada = updatedSupabase;
          }
        }

        if (!sedeActualizada) {
          sedeActualizada = await inventoryApi.updateSede(targetId, payloadUpdate);
        }

        const finalItem = sedeActualizada || { id: targetId, ...payloadUpdate };
        finalItem._prevNombre = sedeOriginal?.nombre;

        await fetchSedes();

        if (onSedeUpdated) {
          onSedeUpdated(finalItem);
        }
        if (onSedeCreated) {
          onSedeCreated(finalItem);
        }

        setSuccessMsg(`¡Sede "${finalItem.nombre}" actualizada exitosamente!`);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la sede');
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
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      >
        {/* Encabezado fijo */}
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
              Catálogo Territorial FMO
            </span>
            <h3 style={{ margin: '2px 0 0 0' }}>
              {modo === 'crear' ? 'Registrar Nueva Sede / Municipio' : 'Editar Sede / Municipio Existente'}
            </h3>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Pestañas fijas: Crear Nueva vs Editar Existente */}
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
              setMunicipio('');
              setDireccion('');
            }}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              borderBottom: modo === 'crear' ? '3px solid #2CACD0' : '3px solid transparent',
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
            <Plus size={15} style={{ color: modo === 'crear' ? '#2CACD0' : 'inherit' }} />
            <span>Crear Nueva</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModo('editar');
              setError('');
              setSuccessMsg('');
              if (listaSedes && listaSedes.length > 0) {
                cargarSedeParaEdicion(listaSedes[0]);
              }
            }}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              borderBottom: modo === 'editar' ? '3px solid #2CACD0' : '3px solid transparent',
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
            <Edit3 size={14} style={{ color: modo === 'editar' ? '#2CACD0' : 'inherit' }} />
            <span>Editar Existente ({listaSedes?.length || 0})</span>
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
            {/* Alerta de Error */}
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
                ⚠️ {error}
              </div>
            )}

            {/* Mensaje de Éxito */}
            {successMsg && (
              <div
                className="form-group full"
                style={{
                  padding: '9px 13px',
                  background: 'rgba(44, 172, 208, 0.15)',
                  border: '1px solid #2CACD0',
                  color: '#013a52',
                  borderRadius: 'var(--radius-sm, 6px)',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} style={{ color: '#2CACD0' }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Selector de Sede a Editar (visible solo en modo Editar) */}
            {modo === 'editar' && (
              <div
                className="form-group full"
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(44, 172, 208, 0.08)',
                  border: '1.5px solid rgba(44, 172, 208, 0.35)',
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
                    <Building2 size={15} style={{ color: '#2CACD0' }} />
                    <span>Selecciona la Sede a Editar *</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #6d6e71)', fontWeight: 500 }}>
                    {listaSedes.length} disponibles
                  </span>
                </label>

                <select
                  value={sedeAEditarId}
                  onChange={(e) => handleSelectSedeAEditar(e.target.value)}
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    borderColor: '#2CACD0',
                    backgroundColor: 'var(--surface, #ffffff)',
                  }}
                >
                  {listaSedes.map((s) => {
                    const sVal = s.id || s.nombre;
                    return (
                      <option key={sVal} value={sVal}>
                        {s.nombre} {s.municipio && s.municipio !== s.nombre ? `(${s.municipio})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="form-group full">
              <label>Nombre de la Sede *</label>
              <input
                type="text"
                required
                autoFocus={modo === 'crear'}
                placeholder="Ej: SABANETA, ITAGÜÍ, URRAO, CARMEN DE VIBORAL"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (modo === 'crear' && !municipio) {
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
                backgroundColor: modo === 'crear' ? '#2CACD0' : '#abd037',
                color: modo === 'crear' ? '#ffffff' : '#013a52',
                border: modo === 'crear' ? '1px solid #2395b5' : '1px solid #96bc28',
                boxShadow: modo === 'crear' ? '0 2px 8px rgba(44, 172, 208, 0.35)' : '0 2px 8px rgba(171, 208, 55, 0.35)',
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
                      border: modo === 'crear' ? '2px solid #ffffff' : '2px solid #013a52',
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
                  <Plus size={16} strokeWidth={2.5} style={{ color: '#ffffff' }} />
                  <span>Guardar Sede</span>
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
