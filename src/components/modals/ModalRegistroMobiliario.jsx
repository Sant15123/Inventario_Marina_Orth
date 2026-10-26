import React, { useState, useEffect } from 'react';
import {
  X,
  Armchair,
  MapPin,
  Tag,
  Building2,
  Hash,
  Layers,
  Palette,
  Maximize2,
  ShieldCheck,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
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

const ESTADOS_CONSERVACION = [
  'Excelente / Nuevo',
  'Bueno',
  'Regular',
  'Requiere Reparación',
];

export default function ModalRegistroMobiliario({
  isOpen,
  onClose,
  onMobiliarioCreated,
  sedes = SEDES_DEFAULT,
}) {
  const { showNewItemSuccess, showError } = useToast();

  const [paso, setPaso] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlaca, setLoadingPlaca] = useState(false);

  // Form State
  const initialForm = {
    // Paso 1: Identificación y Ubicación
    nombre: '',
    placa: '',
    categoria: 'Mesas y Escritorios',
    sede: sedes[0] || 'Medellín',
    ubicacion: '',
    cantidad: 1,

    // Paso 2: Atributos Físicos
    material: 'Madera / MDF',
    color: '',
    dimensiones: '',
    estado: 'Bueno',

    // Paso 3: Adquisición y Observaciones
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    proveedor: '',
    observaciones: '',
  };

  const [formData, setFormData] = useState(initialForm);

  // Obtener autocompletado consecutivo de placa MOB-XXXX al abrir modal
  useEffect(() => {
    if (!isOpen) {
      setPaso(1);
      setFormData(initialForm);
      return;
    }

    let isMounted = true;
    const fetchSiguientePlaca = async () => {
      setLoadingPlaca(true);
      try {
        const res = await inventoryApi.getSiguientePlacaMobiliario();
        if (isMounted && res?.placa) {
          setFormData((prev) => ({ ...prev, placa: res.placa }));
        }
      } catch (err) {
        console.warn('No se pudo autogenerar placa desde API:', err);
      } finally {
        if (isMounted) setLoadingPlaca(false);
      }
    };

    fetchSiguientePlaca();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Math.max(1, Number(value))) : value,
    }));
  };

  const handleValidarPaso1 = () => {
    if (!formData.nombre.trim()) {
      showError('Campo Requerido', 'Ingresa el nombre del mueble o enser (ej: "Mesa de Trabajo Robótica").');
      return false;
    }
    if (!formData.placa.trim()) {
      showError('Campo Requerido', 'La placa o código institucional (ej: MOB-0001) es obligatoria.');
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
      const payload = {
        placa: formData.placa.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        categoria: 'Mobiliario',
        subcategoria: formData.categoria,
        category: 'Mobiliario',
        itemType: 'mobiliario',
        sede: formData.sede,
        ubicacion: formData.sede,
        ubicacion_estante: formData.ubicacion.trim() || 'Área General',
        espacio: formData.ubicacion.trim(),
        cantidad: Number(formData.cantidad) || 1,
        disponible: Number(formData.cantidad) || 1,
        material: formData.material,
        color: formData.color.trim(),
        dimensiones: formData.dimensiones.trim(),
        estado: formData.estado,
        condicion: formData.estado,
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

      // 1. Despachar a POST /api/mobiliario
      let result;
      try {
        result = await inventoryApi.createMobiliario(payload);
      } catch (apiErr) {
        console.warn('API error al crear mobiliario, usando respuesta local:', apiErr);
        result = { ...payload, id: payload.placa, localSaved: true };
      }

      // 2. Notificar al componente padre
      if (onMobiliarioCreated) {
        onMobiliarioCreated(result || payload);
      }

      // 3. Emitir Toast
      showNewItemSuccess({
        nombre: formData.nombre,
        codigo: payload.placa,
        sedeOUbicacion: `${formData.sede}${formData.ubicacion ? ` (${formData.ubicacion})` : ''}`,
      });

      // 4. Cerrar modal y reiniciar
      onClose();
    } catch (err) {
      console.error('Error al guardar mobiliario:', err);
      showError('Error al Registrar', err.message || 'No fue posible registrar el mobiliario.');
    } finally {
      setSubmitting(false);
    }
  };

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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        className="relative w-full max-w-lg md:max-w-xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface, #0f172a)',
          border: '1px solid var(--line-strong, #1e293b)',
          borderRadius: '18px',
          maxWidth: '38rem',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div
          className="p-5 shrink-0 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.95))',
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 22px',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: 'rgba(132, 204, 22, 0.15)',
                border: '1px solid rgba(132, 204, 22, 0.35)',
                color: '#84CC16',
              }}
            >
              <Armchair size={22} />
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'var(--mono, monospace)',
                  color: '#84CC16',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  display: 'block',
                  letterSpacing: '0.04em',
                }}
              >
                {formData.placa || 'MOB-XXXX'} • DOTACIÓN FMO
              </span>
              <h3
                className="font-bold text-slate-900 dark:text-white m-0"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  color: 'var(--text-h, #ffffff)',
                }}
              >
                Registro de Nuevo Mobiliario
              </h3>
              <p
                className="m-0"
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--text-dim, #94a3b8)',
                }}
              >
                Mesas, sillería, estantes y enseres para espacios formativos
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-transparent hover:bg-slate-800 transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper Wizard (3 Pasos) */}
        <div
          className="px-5 py-3 shrink-0"
          style={{
            padding: '10px 22px',
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.75))',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              width: '100%',
            }}
          >
            {[
              { paso: 1, label: '1. Identificación', desc: 'Nombre y Sede' },
              { paso: 2, label: '2. Atributos Físicos', desc: 'Material y Estado' },
              { paso: 3, label: '3. Adquisición', desc: 'Fecha y Proveedor' },
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
                  className="rounded-xl border transition-all cursor-pointer text-left"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: isActive
                      ? '#84CC16'
                      : isDone
                      ? 'rgba(132, 204, 22, 0.12)'
                      : 'rgba(30, 41, 59, 0.4)',
                    borderColor: isActive
                      ? '#84CC16'
                      : isDone
                      ? 'rgba(132, 204, 22, 0.35)'
                      : 'var(--line, #334155)',
                    color: isActive
                      ? '#020617'
                      : isDone
                      ? '#84CC16'
                      : 'var(--text-dim, #94a3b8)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800 }}>{item.label}</div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      opacity: isActive ? 0.85 : 0.7,
                      marginTop: '1px',
                    }}
                  >
                    {item.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario Scrolleable */}
        <form onSubmit={paso === 3 ? handleSubmit : handleSiguiente} className="flex-1 flex flex-col overflow-hidden">
          <div
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
            style={{
              padding: '20px 22px',
              maxHeight: 'calc(92vh - 210px)',
              overflowY: 'auto',
            }}
          >
            {/* PASO 1: Identificación y Ubicación */}
            {paso === 1 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Nombre del Mueble / Enser */}
                <div>
                  <label
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                    style={{ color: 'var(--text-dim, #94a3b8)' }}
                  >
                    <Armchair size={14} style={{ color: '#84CC16' }} />
                    <span>Nombre del Mueble / Enser</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Mesa de Trabajo Robótica STEAM 6 Puestos"
                    required
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: 'var(--line, #334155)',
                      color: 'var(--text, #f8fafc)',
                    }}
                  />
                </div>

                {/* Código / Placa y Categoría */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center justify-between mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag size={14} style={{ color: '#84CC16' }} />
                        Código / Placa Institucional <span className="text-rose-400">*</span>
                      </span>
                      {loadingPlaca && (
                        <span className="flex items-center gap-1 text-[11px] text-lime-400 font-normal">
                          <Loader2 size={11} className="animate-spin" /> asignando...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      name="placa"
                      value={formData.placa}
                      onChange={handleChange}
                      placeholder="MOB-0001"
                      required
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold uppercase border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: '#84CC16',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Layers size={14} style={{ color: '#84CC16' }} />
                      <span>Categoría</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    >
                      {CATEGORIAS_MOBILIARIO.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sede Institucional y Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Building2 size={14} style={{ color: '#84CC16' }} />
                      <span>Sede Institucional</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="sede"
                      value={formData.sede}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
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
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Hash size={14} style={{ color: '#84CC16' }} />
                      <span>Cantidad</span>
                    </label>
                    <input
                      type="number"
                      name="cantidad"
                      min="1"
                      value={formData.cantidad}
                      onChange={handleChange}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all text-center font-bold"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>
                </div>

                {/* Ubicación Específica */}
                <div>
                  <label
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                    style={{ color: 'var(--text-dim, #94a3b8)' }}
                  >
                    <MapPin size={14} style={{ color: '#84CC16' }} />
                    <span>Ubicación Específica / Aula / Laboratorio</span>
                  </label>
                  <input
                    type="text"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleChange}
                    placeholder="Ej. Laboratorio STEAM 1, Sala de Reuniones Principal"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: 'var(--line, #334155)',
                      color: 'var(--text, #f8fafc)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* PASO 2: Atributos Físicos (NO Hardware) */}
            {paso === 2 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div
                  className="p-3 rounded-xl border flex items-center gap-2.5"
                  style={{
                    backgroundColor: 'rgba(132, 204, 22, 0.08)',
                    borderColor: 'rgba(132, 204, 22, 0.25)',
                    color: 'var(--text, #f8fafc)',
                    fontSize: '12.5px',
                  }}
                >
                  <ShieldCheck size={18} style={{ color: '#84CC16', flexShrink: 0 }} />
                  <span>
                    Este registro es exclusivo para <strong>muebles y enseres físicos</strong>. No requiere RAM, procesador ni ficha técnica de cómputo.
                  </span>
                </div>

                {/* Material Principal y Color Predominante */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Layers size={14} style={{ color: '#84CC16' }} />
                      <span>Material Principal</span>
                    </label>
                    <select
                      name="material"
                      value={formData.material}
                      onChange={handleChange}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
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
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Palette size={14} style={{ color: '#84CC16' }} />
                      <span>Color Predominante</span>
                    </label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      placeholder="Ej. Gris Grafito / Negro"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>
                </div>

                {/* Dimensiones aproximadas y Estado de Conservación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Maximize2 size={14} style={{ color: '#84CC16' }} />
                      <span>Dimensiones Aproximadas</span>
                    </label>
                    <input
                      type="text"
                      name="dimensiones"
                      value={formData.dimensiones}
                      onChange={handleChange}
                      placeholder="Largo x Ancho x Alto cm (ej: 140 x 70 x 75 cm)"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <ShieldCheck size={14} style={{ color: '#84CC16' }} />
                      <span>Estado de Conservación</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    >
                      {ESTADOS_CONSERVACION.map((est) => (
                        <option key={est} value={est}>
                          {est}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: Adquisición y Observaciones */}
            {paso === 3 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Fecha de Adquisición y Origen / Proveedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Calendar size={14} style={{ color: '#84CC16' }} />
                      <span>Fecha de Adquisición / Registro</span>
                    </label>
                    <input
                      type="date"
                      name="fecha_adquisicion"
                      value={formData.fecha_adquisicion}
                      onChange={handleChange}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                      style={{ color: 'var(--text-dim, #94a3b8)' }}
                    >
                      <Truck size={14} style={{ color: '#84CC16' }} />
                      <span>Origen / Donante / Proveedor</span>
                    </label>
                    <input
                      type="text"
                      name="proveedor"
                      value={formData.proveedor}
                      onChange={handleChange}
                      placeholder="Ej. Donación Fundación / Compra Dotación"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>
                </div>

                {/* Observaciones adicionales */}
                <div>
                  <label
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
                    style={{ color: 'var(--text-dim, #94a3b8)' }}
                  >
                    <FileText size={14} style={{ color: '#84CC16' }} />
                    <span>Observaciones Adicionales</span>
                  </label>
                  <textarea
                    rows={4}
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Detalles físicos específicos: ruedas con freno de seguridad, gaveta con cerradura y llave, rayón leve en costado izquierdo, etc."
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: 'var(--line, #334155)',
                      color: 'var(--text, #f8fafc)',
                    }}
                  />
                </div>

                {/* Resumen Final de Registro */}
                <div
                  className="p-3.5 rounded-xl border flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.45)',
                    borderColor: 'var(--line, #334155)',
                    fontSize: '12px',
                  }}
                >
                  <span className="font-bold text-slate-200">Resumen previo a guardar:</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                    <span>
                      Placa: <strong className="text-lime-400 font-mono">{formData.placa}</strong>
                    </span>
                    <span>
                      Mueble: <strong className="text-slate-200">{formData.nombre || '—'}</strong>
                    </span>
                    <span>
                      Sede: <strong className="text-slate-200">{formData.sede}</strong>
                    </span>
                    <span>
                      Cantidad: <strong className="text-slate-200">{formData.cantidad}</strong>
                    </span>
                    <span>
                      Estado: <strong className="text-slate-200">{formData.estado}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Fijo con Navegación */}
          <div
            className="p-4 border-t flex items-center justify-between shrink-0"
            style={{
              borderTop: '1px solid var(--line, #1e293b)',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.95))',
              padding: '14px 22px',
            }}
          >
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="btn ghost"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {paso > 1 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAnterior}
                  className="btn ghost"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Anterior
                </button>
              )}

              {paso < 3 ? (
                <button
                  type="button"
                  onClick={handleSiguiente}
                  className="btn btn-primary"
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    backgroundColor: '#84CC16',
                    borderColor: '#84CC16',
                    color: '#020617',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)',
                  }}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    padding: '9px 22px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#84CC16',
                    borderColor: '#84CC16',
                    color: '#020617',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Guardar Mobiliario</span>
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
