import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
} from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';

const CATEGORIAS_MOBILIARIO = [
  'Mesas y Escritorios',
  'Sillas y Bancos',
  'Archivadores y Lockers',
  'Estanterías',
  'Tableros',
  'Otros',
];

const SEDES_DEFAULT = ['Medellín', 'Santuario', 'Villa del Socorro'];

const MATERIALES_OPCIONES = [
  'Madera / MDF',
  'Metal / Acero',
  'Plástico / Polipropileno',
  'Malla / Ergonómico',
  'Mixto (Metal y Madera)',
  'Otro',
];

const CONDICIONES_FISICAS = [
  'Bueno',
  'Excelente / Nuevo',
  'Regular',
  'Requiere Reparación',
];

const ESTADOS_OPERATIVOS = [
  'Disponible',
  'En Uso',
  'Mantenimiento',
  'De Baja',
];

export default function ModalRegistroMobiliario({
  isOpen,
  onClose,
  onMobiliarioCreated,
  onMobiliarioSaved,
  muebleAEditar = null,
  sedes = SEDES_DEFAULT,
}) {
  const { showNewItemSuccess, showEditSuccess, showError } = useToast();

  const isEditing = Boolean(muebleAEditar);

  const [paso, setPaso] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlaca, setLoadingPlaca] = useState(false);

  // Form State
  const initialForm = {
    id: '',
    codigo: '',
    placa: '',
    nombre: '',
    categoria: 'Mesas y Escritorios',
    condicion_fisica: 'Bueno',
    sede: sedes[0] || 'Medellín',
    ubicacion: '',
    material: 'Madera / MDF',
    color: '',
    dimensiones: '',
    disponible: 1,
    cantidad: 1,
    area_proceso: 'General',
    responsable: '',
    estado_operativo: 'Disponible',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    proveedor: '',
    observaciones: '',
  };

  const [formData, setFormData] = useState(initialForm);

  // Sincronizar estado del formulario con muebleAEditar o autocompletar placa si es nuevo
  useEffect(() => {
    if (!isOpen) {
      setPaso(1);
      setFormData(initialForm);
      return;
    }

    if (muebleAEditar) {
      setPaso(1);
      const codigoReal = muebleAEditar.codigo || muebleAEditar.placa || muebleAEditar.id_referencia || muebleAEditar.code || '';
      const cantReal = Number(muebleAEditar.disponible ?? muebleAEditar.stock ?? muebleAEditar.cantidad ?? 1);
      setFormData({
        id: muebleAEditar.id || '',
        codigo: codigoReal,
        placa: codigoReal,
        nombre: muebleAEditar.nombre || muebleAEditar.elemento || muebleAEditar.material || muebleAEditar.name || '',
        categoria: muebleAEditar.categoria || muebleAEditar.subcategoria || muebleAEditar.category || 'Mobiliario',
        material: muebleAEditar.material_fabricacion || muebleAEditar.material || 'Madera / MDF',
        color: muebleAEditar.color || '',
        dimensiones: muebleAEditar.dimensiones || '',
        sede: muebleAEditar.sede || muebleAEditar.ubicacion_fisica || muebleAEditar.ubicacion || sedes[0] || 'Medellín',
        ubicacion: muebleAEditar.ubicacion_especifica || muebleAEditar.ubicacion_estante || muebleAEditar.espacio || '',
        condicion_fisica: muebleAEditar.condicion_fisica || muebleAEditar.estado_conservacion || muebleAEditar.estado || muebleAEditar.condicion || 'Bueno',
        disponible: cantReal,
        cantidad: cantReal,
        area_proceso: muebleAEditar.area_proceso || muebleAEditar.area || 'General',
        responsable: muebleAEditar.responsable || muebleAEditar.custodio || '',
        estado_operativo: muebleAEditar.estado_operativo || (muebleAEditar.estado === 'En Uso' || muebleAEditar.estado === 'Mantenimiento' ? muebleAEditar.estado : 'Disponible'),
        fecha_adquisicion: muebleAEditar.fecha_adquisicion ? String(muebleAEditar.fecha_adquisicion).split('T')[0] : new Date().toISOString().split('T')[0],
        proveedor: muebleAEditar.proveedor_origen || muebleAEditar.proveedor || muebleAEditar.origen || '',
        observaciones: muebleAEditar.observaciones || muebleAEditar.notas || '',
      });
      return;
    }

    // Si es creación, buscar consecutivo
    let isMounted = true;
    const fetchSiguientePlaca = async () => {
      setLoadingPlaca(true);
      try {
        const res = await inventoryApi.getSiguientePlacaMobiliario();
        if (isMounted && res && res.placa) {
          setFormData((prev) => ({
            ...prev,
            codigo: res.placa,
            placa: res.placa,
          }));
        }
      } catch (err) {
        console.warn('Fallo consulta automática de consecutivo:', err);
      } finally {
        if (isMounted) setLoadingPlaca(false);
      }
    };

    fetchSiguientePlaca();

    return () => {
      isMounted = false;
    };
  }, [isOpen, muebleAEditar]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => {
      const val = type === 'number' ? (value === '' ? '' : Math.max(1, Math.min(9999, Number(value)))) : value;
      const updated = { ...prev, [name]: val };
      if (name === 'disponible') updated.cantidad = val;
      if (name === 'cantidad') updated.disponible = val;
      if (name === 'codigo') updated.placa = val;
      if (name === 'placa') updated.codigo = val;
      return updated;
    });
  };

  const handleValidarPaso1 = () => {
    if (!formData.nombre?.trim()) {
      showError('Validación', 'El Nombre del mueble es obligatorio.');
      return false;
    }
    const codigoActual = formData.codigo || formData.placa;
    if (!codigoActual?.trim()) {
      showError('Validación', 'El Código o Placa del mobiliario es obligatorio.');
      return false;
    }
    if (!formData.categoria) {
      showError('Validación', 'La Categoría es obligatoria.');
      return false;
    }
    if (!formData.sede) {
      showError('Validación', 'La Sede institucional es obligatoria.');
      return false;
    }
    return true;
  };

  const handleSiguiente = (e) => {
    if (e) e.preventDefault();
    if (paso === 1) {
      if (!handleValidarPaso1()) return;
      setPaso(2);
    } else if (paso === 2) {
      setPaso(3);
    }
  };

  const handleAnterior = () => {
    setPaso((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!handleValidarPaso1()) {
      setPaso(1);
      return;
    }

    setSubmitting(true);
    try {
      const codigoFinal = (formData.codigo || formData.placa || '').trim().toUpperCase();
      const cantFinal = Number(formData.disponible ?? formData.cantidad ?? 1) || 1;

      const payload = {
        codigo: codigoFinal,
        placa: codigoFinal,
        id_referencia: codigoFinal,
        nombre: formData.nombre.trim(),
        elemento: formData.nombre.trim(),
        categoria: 'Mobiliario',
        subcategoria: formData.categoria,
        category: 'Mobiliario',
        itemType: 'mobiliario',
        sede: formData.sede,
        ubicacion: formData.sede,
        ubicacion_fisica: formData.sede,
        ubicacion_estante: formData.ubicacion.trim() || 'Área General',
        espacio: formData.ubicacion.trim(),
        cantidad: cantFinal,
        disponible: cantFinal,
        stock: cantFinal,
        material: formData.material,
        material_fabricacion: formData.material,
        color: formData.color.trim(),
        dimensiones: formData.dimensiones.trim(),
        estado: formData.condicion_fisica,
        condicion: formData.condicion_fisica,
        condicion_fisica: formData.condicion_fisica,
        estado_conservacion: formData.condicion_fisica,
        espacio_asignado: formData.ubicacion.trim() || formData.sede,
        responsable: formData.responsable.trim(),
        custodio: formData.responsable.trim(),
        estado_operativo: formData.estado_operativo,
        fecha_adquisicion: formData.fecha_adquisicion || null,
        proveedor: formData.proveedor.trim(),
        origen: formData.proveedor.trim(),
        observaciones: formData.observaciones.trim(),
        descripcion: [
          formData.categoria,
          formData.material ? `Material: ${formData.material}` : '',
          formData.dimensiones ? `Dim: ${formData.dimensiones}` : '',
          formData.color ? `Color: ${formData.color}` : '',
          formData.observaciones ? `Notas: ${formData.observaciones}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      };

      // Salvaguarda explícita contra columnas no existentes en la tabla mobiliario de Supabase
      delete payload.area;
      delete payload.area_proceso;

      if (isEditing) {
        // === MODO EDICIÓN (UPDATE) ===
        const updatePayload = {
          nombre: formData.nombre.trim(),
          elemento: formData.nombre.trim(),
          codigo: codigoFinal,
          placa: codigoFinal,
          id_referencia: codigoFinal,
          categoria: formData.categoria,
          subcategoria: formData.categoria,
          sede: formData.sede,
          ubicacion: formData.sede,
          ubicacion_fisica: formData.sede,
          ubicacion_especifica: formData.ubicacion.trim(),
          ubicacion_estante: formData.ubicacion.trim() || 'Área General',
          espacio: formData.ubicacion.trim(),
          espacio_asignado: formData.ubicacion.trim() || formData.sede,
          material: formData.material,
          material_fabricacion: formData.material,
          color: formData.color.trim(),
          dimensiones: formData.dimensiones.trim(),
          estado_conservacion: formData.condicion_fisica,
          condicion_fisica: formData.condicion_fisica,
          estado: formData.condicion_fisica,
          condicion: formData.condicion_fisica,
          cantidad: cantFinal,
          disponible: cantFinal,
          stock: cantFinal,
          responsable: formData.responsable.trim(),
          custodio: formData.responsable.trim(),
          estado_operativo: formData.estado_operativo,
          fecha_adquisicion: formData.fecha_adquisicion || null,
          proveedor_origen: formData.proveedor.trim(),
          proveedor: formData.proveedor.trim(),
          origen: formData.proveedor.trim(),
          observaciones: formData.observaciones.trim(),
          descripcion: [
            formData.categoria,
            formData.material ? `Material: ${formData.material}` : '',
            formData.dimensiones ? `Dim: ${formData.dimensiones}` : '',
            formData.color ? `Color: ${formData.color}` : '',
            formData.observaciones ? `Notas: ${formData.observaciones}` : '',
          ]
            .filter(Boolean)
            .join(' | '),
          updated_at: new Date().toISOString(),
        };

        // Salvaguarda explícita contra columnas no existentes en la tabla mobiliario de Supabase
        delete updatePayload.area;
        delete updatePayload.area_proceso;

        let updatedResult = null;
        try {
          if (supabase) {
            const query = supabase
              .from('mobiliario')
              .update(updatePayload);

            if (muebleAEditar.id) {
              query.eq('id', muebleAEditar.id);
            } else {
              query.eq('placa', codigoFinal);
            }

            const { data: supaUpdated, error: supaUpErr } = await query.select();
            if (supaUpErr) {
              console.error('Error al actualizar mobiliario en Supabase:', supaUpErr);
              throw supaUpErr;
            }
            if (supaUpdated && supaUpdated.length > 0) {
              updatedResult = supaUpdated[0];
            }
          }
        } catch (sUpErr) {
          console.error('Fallo update directo en Supabase:', sUpErr);
          throw sUpErr;
        }

        if (!updatedResult) {
          try {
            updatedResult = await inventoryApi.update(muebleAEditar.id || codigoFinal, updatePayload);
          } catch (apiUpErr) {
            console.warn('API update advertencia, usando payload local:', apiUpErr.message);
            updatedResult = { ...muebleAEditar, ...updatePayload, id: muebleAEditar.id || codigoFinal, placa: codigoFinal, codigo: codigoFinal };
          }
        }

        const finalItem = updatedResult || { ...muebleAEditar, ...updatePayload, id: muebleAEditar.id || codigoFinal, placa: codigoFinal, codigo: codigoFinal };

        if (onMobiliarioSaved) {
          onMobiliarioSaved(finalItem);
        } else if (onMobiliarioCreated) {
          onMobiliarioCreated(finalItem);
        }

        showEditSuccess({
          nombre: formData.nombre,
          codigo: codigoFinal,
          tipo: 'Mobiliario',
        });

        onClose();
        return;
      }

      // === MODO CREACIÓN (INSERT) ===
      let result = null;
      try {
        if (supabase) {
          const { data: supaData, error: supaErr } = await supabase
            .from('mobiliario')
            .insert([payload])
            .select()
            .single();

          if (!supaErr && supaData) {
            result = supaData;
          } else if (supaErr) {
            console.warn('Supabase insert advertencia (intentando vía API REST):', supaErr.message);
          }
        }
      } catch (sErr) {
        console.warn('Fallo directo en Supabase:', sErr.message);
      }

      if (!result) {
        try {
          result = await inventoryApi.createMobiliario(payload);
        } catch (apiErr) {
          console.warn('API error al crear mobiliario, usando respuesta local:', apiErr);
          result = { ...payload, id: payload.placa, localSaved: true };
        }
      }

      if (onMobiliarioSaved) {
        onMobiliarioSaved(result || payload);
      } else if (onMobiliarioCreated) {
        onMobiliarioCreated(result || payload);
      }

      showNewItemSuccess({
        nombre: formData.nombre,
        codigo: payload.placa,
        sedeOUbicacion: `${formData.sede}${formData.ubicacion ? ` (${formData.ubicacion})` : ''}`,
      });

      onClose();
    } catch (err) {
      console.error('Error al procesar mobiliario:', err);
      showError(isEditing ? 'Error al Actualizar' : 'Error al Registrar', err.message || 'No fue posible guardar los cambios del mobiliario.');
    } finally {
      setSubmitting(false);
    }
  };

  const codigoHeader = formData.codigo || formData.placa || (muebleAEditar && (muebleAEditar.codigo || muebleAEditar.placa || muebleAEditar.id_referencia || muebleAEditar.id)) || 'MOB-001';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface, #0b1320)',
          border: '1px solid var(--line, #1e293b)',
          borderRadius: '16px',
          maxWidth: '36rem',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--mono)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '12px',
                fontWeight: 600,
                display: 'block',
                marginBottom: '2px',
              }}
            >
              {codigoHeader}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0" style={{ margin: 0, fontSize: '15px' }}>
              {isEditing ? 'Editar Mobiliario' : 'Nuevo Mobiliario'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0" style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
              {isEditing
                ? 'Modifica los datos del mobiliario y sus especificaciones físicas'
                : 'Mesas, sillería, estantes y enseres para espacios formativos'}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Fijo bajo el Header: Pastillas Redondeadas */}
        <div
          className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f172a]/50 shrink-0"
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
            flexShrink: 0,
          }}
        >
          <div
            className="flex items-center justify-between gap-2 max-w-xl mx-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
            }}
          >
            {[
              { paso: 1, label: 'Identificación', icono: '1' },
              { paso: 2, label: 'Ficha Técnica', icono: '2' },
              { paso: 3, label: 'Asignación / Estado', icono: '3' },
            ].map((item) => {
              const isActive = paso === item.paso;
              const isDone = paso > item.paso;
              return (
                <button
                  key={item.paso}
                  type="button"
                  onClick={() => {
                    if (item.paso === 1 || handleValidarPaso1()) {
                      setPaso(item.paso);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-lime-400 hover:bg-lime-300 text-slate-950 border-lime-400 shadow-sm'
                      : isDone
                        ? 'bg-lime-950/40 text-lime-400 border-lime-500/40 hover:bg-lime-900/40'
                        : 'bg-slate-200 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-800'
                  }`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive
                      ? '#84CC16'
                      : isDone
                        ? 'rgba(132, 204, 22, 0.12)'
                        : 'rgba(30, 41, 59, 0.4)',
                    color: isActive
                      ? '#0f172a'
                      : isDone
                        ? '#84CC16'
                        : 'var(--text-dim, #94a3b8)',
                    border: isActive
                      ? '1px solid #84CC16'
                      : isDone
                        ? '1px solid rgba(132, 204, 22, 0.35)'
                        : '1px solid var(--line, #334155)',
                    boxShadow: isActive ? '0 2px 10px rgba(132, 204, 22, 0.3)' : 'none',
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950 font-extrabold'
                        : isDone
                          ? 'text-lime-400 font-bold'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold'
                    }`}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      backgroundColor: isActive
                        ? 'rgba(15, 23, 42, 0.2)'
                        : isDone
                          ? 'transparent'
                          : 'rgba(148, 163, 184, 0.2)',
                      color: isActive
                        ? '#0f172a'
                        : isDone
                          ? '#84CC16'
                          : 'var(--text-dim, #94a3b8)',
                    }}
                  >
                    {isDone ? '✓' : item.icono}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario Estructurado con Flex y Scroll interno */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {/* Cuerpo del Formulario con scroll vertical */}
          <div
            className="p-5 text-sm overflow-y-auto flex-1"
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--surface, #0b1320)',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* PESTAÑA 1: IDENTIFICACIÓN */}
            {paso === 1 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Identificación y Ubicación
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
                </div>

                {/* Fila 1: Código / Placa y Nombre del Mueble en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Código / Placa *
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        name="codigo"
                        maxLength={25}
                        value={formData.codigo}
                        onChange={handleChange}
                        placeholder="Ej: MOB-001"
                        disabled={isEditing}
                        className={`w-full font-mono rounded-lg px-3 py-1.5 text-sm border focus:outline-none transition-colors ${
                          isEditing
                            ? 'opacity-80 cursor-not-allowed text-slate-400'
                            : 'focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400'
                        }`}
                        style={{
                          backgroundColor: 'var(--bg, #0f172a)',
                          color: isEditing ? 'var(--text-dim, #94a3b8)' : 'var(--text, #f8fafc)',
                          borderColor: 'var(--line, #334155)',
                        }}
                      />
                      {loadingPlaca && (
                        <div className="absolute right-3 top-2 flex items-center gap-1 text-[11px] text-lime-400">
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Nombre Del Mueble *
                    </label>
                    <input
                      required
                      type="text"
                      name="nombre"
                      maxLength={90}
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Ej. Mesa de Trabajo Robótica STEAM"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Categoría y Condición Física en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Categoría *
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {CATEGORIAS_MOBILIARIO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Condición Física
                    </label>
                    <select
                      name="condicion_fisica"
                      value={formData.condicion_fisica}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {CONDICIONES_FISICAS.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fila 3: Sede Institucional y Espacio / Ubicación en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Sede Institucional *
                    </label>
                    <select
                      name="sede"
                      value={formData.sede}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {sedes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Espacio / Área Específica
                    </label>
                    <input
                      type="text"
                      name="ubicacion"
                      maxLength={70}
                      value={formData.ubicacion}
                      onChange={handleChange}
                      placeholder="Ej. Sala Robótica, Oficina 2, Bodega"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: FICHA TÉCNICA */}
            {paso === 2 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Especificaciones Físicas y Dimensiones
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
                </div>

                {/* Fila 1: Material de Fabricación y Color en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Material de Fabricación
                    </label>
                    <select
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {MATERIALES_OPCIONES.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      name="color"
                      maxLength={40}
                      value={formData.color}
                      onChange={handleChange}
                      placeholder="Ej. Blanco / Gris / Madera clara"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Dimensiones y Cantidad en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Dimensiones (Alto x Ancho x Profundidad)
                    </label>
                    <input
                      type="text"
                      name="dimensiones"
                      maxLength={50}
                      value={formData.dimensiones}
                      onChange={handleChange}
                      placeholder="Ej. 75cm x 160cm x 80cm"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Cantidad / Unidades *
                    </label>
                    <input
                      required
                      type="number"
                      name="disponible"
                      min={1}
                      max={9999}
                      value={formData.disponible}
                      onChange={handleChange}
                      className="w-full font-mono bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: ASIGNACIÓN / ESTADO */}
            {paso === 3 && (
              <div className="space-y-3 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <h4
                    className="font-bold text-xs uppercase tracking-wider m-0 text-lime-600 dark:text-lime-400"
                    style={{ color: '#84CC16', margin: 0, fontSize: '12px', fontWeight: 700 }}
                  >
                    Asignación, Estado y Observaciones
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">* Campos obligatorios</span>
                </div>

                {/* Fila 1: Área / Proceso y Responsable en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Área / Proceso
                    </label>
                    <input
                      type="text"
                      name="area_proceso"
                      maxLength={60}
                      value={formData.area_proceso}
                      onChange={handleChange}
                      placeholder="Ej. Innovación STEAM, Administrativa..."
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Responsable / Asignado
                    </label>
                    <input
                      type="text"
                      name="responsable"
                      maxLength={80}
                      value={formData.responsable}
                      onChange={handleChange}
                      placeholder="Ej. Bodega Central o Custodio"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Estado Operativo y Fecha de Adquisición en 2 Columnas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Estado Operativo
                    </label>
                    <select
                      name="estado_operativo"
                      value={formData.estado_operativo}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    >
                      {ESTADOS_OPERATIVOS.map((eo) => (
                        <option key={eo} value={eo}>
                          {eo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Fecha de Adquisición / Registro
                    </label>
                    <input
                      type="date"
                      name="fecha_adquisicion"
                      value={formData.fecha_adquisicion}
                      onChange={handleChange}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                      style={{
                        backgroundColor: 'var(--bg, #0f172a)',
                        color: 'var(--text, #f8fafc)',
                        borderColor: 'var(--line, #334155)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 3: Observaciones */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Observaciones Físicas o Notas
                  </label>
                  <textarea
                    rows={2}
                    name="observaciones"
                    maxLength={350}
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Detalles físicos específicos: ruedas con freno de seguridad, llave incluida, etc."
                    className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors resize-none"
                    style={{
                      backgroundColor: 'var(--bg, #0f172a)',
                      color: 'var(--text, #f8fafc)',
                      borderColor: 'var(--line, #334155)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Fijo Abajo */}
          <div
            className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'var(--surface-2, #0f172a)',
              borderTop: '1px solid var(--line, #1e293b)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            {/* Botón Cancelar (Izquierda) */}
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line, #334155)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            {/* Botones de Navegación del Asistente (Derecha) */}
            <div
              className="flex items-center gap-2.5"
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              {paso > 1 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAnterior}
                  className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--surface, #1e293b)',
                    border: '1px solid var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ← Anterior
                </button>
              )}

              {paso < 3 ? (
                <button
                  type="button"
                  onClick={handleSiguiente}
                  className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md text-slate-950"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#84CC16',
                    border: '1px solid #65A30D',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(163, 230, 53, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Siguiente</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md bg-[#84CC16] hover:bg-[#65A30D] text-slate-950"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#84CC16',
                    border: '1px solid #65A30D',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 12px rgba(132, 204, 22, 0.35)',
                    transition: 'all 0.15s ease',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{isEditing ? 'Guardando...' : 'Registrando...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar Cambios</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
