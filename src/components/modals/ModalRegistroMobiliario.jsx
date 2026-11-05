import React, { useState, useEffect } from 'react';
import {
  X,
  Armchair,
  MapPin,
  Tag,
  Layers,
  Palette,
  Maximize2,
  Calendar,
  Truck,
  FileText,
  Loader2,
  CheckCircle2,
  User,
  Activity,
  Briefcase,
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
  'Excelente / Nuevo',
  'Bueno',
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
      showError('Campo Requerido', 'Ingresa el nombre del mueble o enser (ej: "Mesa de Trabajo Robótica").');
      return false;
    }
    const codigoActual = formData.codigo || formData.placa;
    if (!codigoActual?.trim()) {
      showError('Campo Requerido', 'El código o placa institucional (ej: MOB-0001) es obligatorio.');
      return false;
    }
    if (!formData.categoria) {
      showError('Campo Requerido', 'Selecciona una categoría de mobiliario.');
      return false;
    }
    if (!formData.sede) {
      showError('Campo Requerido', 'Selecciona la sede institucional.');
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
        area: formData.area_proceso.trim(),
        area_proceso: formData.area_proceso.trim(),
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
          area: formData.area_proceso.trim(),
          area_proceso: formData.area_proceso.trim(),
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

            const { data: supaUpdated, error: supaUpErr } = await query.select().single();
            if (!supaUpErr && supaUpdated) {
              updatedResult = supaUpdated;
            } else if (supaUpErr) {
              console.warn('Supabase update advertencia:', supaUpErr.message);
            }
          }
        } catch (sUpErr) {
          console.warn('Fallo update directo en Supabase:', sUpErr.message);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white dark:bg-[#0b1320] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Institucional */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#0b1320]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60 shadow-sm">
              <Armchair size={20} />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 mb-1">
                {codigoHeader}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight m-0">
                {isEditing ? 'Editar Mobiliario' : 'Nuevo Mobiliario'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {isEditing
                  ? 'Modifica los datos del mobiliario y sus especificaciones físicas'
                  : 'Mesas, sillería, estantes y enseres para espacios formativos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegador de Pestañas (Píldoras Superiores) */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]/50 shrink-0">
          <div className="flex items-center gap-2">
            {[
              { paso: 1, label: '1. Identificación' },
              { paso: 2, label: '2. Ficha Técnica' },
              { paso: 3, label: '3. Asignación / Estado' },
            ].map((tab) => {
              const isActive = paso === tab.paso;
              return (
                <button
                  key={tab.paso}
                  type="button"
                  onClick={() => {
                    if (tab.paso === 1 || handleValidarPaso1()) {
                      setPaso(tab.paso);
                    }
                  }}
                  className={`flex-1 transition-all cursor-pointer text-center ${
                    isActive
                      ? 'bg-emerald-500 text-white font-semibold rounded-lg px-3 py-1.5 shadow-sm text-xs'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg px-3 py-1.5 text-xs hover:bg-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario con Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
            {/* PESTAÑA 1: IDENTIFICACIÓN */}
            {paso === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Código / Placa y Nombre del Mueble */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Código / Placa *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="codigo"
                        maxLength={25}
                        value={formData.codigo}
                        onChange={handleChange}
                        placeholder="Ej. MOB-001"
                        required
                        disabled={isEditing}
                        className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono font-bold uppercase border focus:outline-none transition-all ${
                          isEditing
                            ? 'opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        }`}
                      />
                      {loadingPlaca && (
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-emerald-600">
                          <Loader2 size={12} className="animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Nombre del Mueble *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      maxLength={90}
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Ej. Mesa de Trabajo Robótica STEAM"
                      required
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Categoría y Condición Física */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Categoría *
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      {CONDICIONES_FISICAS.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sede / Ubicación Física */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Sede Institucional *
                    </label>
                    <select
                      name="sede"
                      value={formData.sede}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: FICHA TÉCNICA */}
            {paso === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Material de Fabricación y Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Material de Fabricación
                    </label>
                    <select
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Dimensiones y Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Cantidad / Unidades
                    </label>
                    <input
                      type="number"
                      name="disponible"
                      min={1}
                      max={9999}
                      value={formData.disponible}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Banner Informativo */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                  <Armchair size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Ficha para <strong>mobiliario y enseres físicos</strong>. Diseñada para trazabilidad de puestos de trabajo y dotación institucional.
                  </span>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: ASIGNACIÓN / ESTADO */}
            {paso === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Área / Proceso y Responsable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                      placeholder="Ej. Innovación STEAM, Administrativa"
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Responsable / Custodio Asignado
                    </label>
                    <input
                      type="text"
                      name="responsable"
                      maxLength={80}
                      value={formData.responsable}
                      onChange={handleChange}
                      placeholder="Ej. Santiago Galeano o Bodega Central"
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Estado Operativo y Fecha de Adquisición */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                      Estado Operativo
                    </label>
                    <select
                      name="estado_operativo"
                      value={formData.estado_operativo}
                      onChange={handleChange}
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                      className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                    Observaciones Físicas o Notas
                  </label>
                  <textarea
                    rows={3}
                    name="observaciones"
                    maxLength={350}
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Detalles físicos específicos: ruedas con freno de seguridad, llave incluida, etc."
                    className="w-full rounded-xl px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pie de Modal */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a] flex items-center justify-between shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2.5">
              {paso > 1 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAnterior}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  Anterior
                </button>
              )}

              {paso < 3 ? (
                <button
                  type="button"
                  onClick={handleSiguiente}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl shadow-md text-xs transition-colors cursor-pointer"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2 rounded-xl shadow-md text-xs transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{isEditing ? 'Guardando...' : 'Registrando...'}</span>
                    </>
                  ) : (
                    <span>Guardar Cambios →</span>
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
