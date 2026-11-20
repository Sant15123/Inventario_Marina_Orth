import React, { useState, useEffect } from 'react';
import { X, Laptop, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';
import ProgramAreaBadge, { ProgramAreaSelect } from '../common/ProgramAreaBadge';
import { getProgramTheme } from '../../utils/programThemes';

const CATEGORIAS_TECNOLOGICAS = [
  'Portátiles',
  'Tablets',
  'Proyectores',
  'Pantallas / Monitores',
  'Computadores de Escritorio',
  'Servidores & Redes',
  'Accesorios Tecnológicos',
  'Otro Equipo Tecnológico',
];

const CONDICIONES_TECNOLOGICAS = [
  'Excelente / Nuevo',
  'Bueno',
  'Regular',
  'Requiere Reparación',
];

const ESTADOS_OPERATIVOS = [
  'Disponible',
  'En campo / Prestado',
  'En mantenimiento',
  'De baja',
];

export default function ModalEditarActivo({
  isOpen,
  onClose,
  activo,
  equipo,
  onSaveSuccess,
  onSave,
  formData: externalFormData,
  setFormData: externalSetFormData,
  onSubmit: externalOnSubmit,
  submitting: externalSubmitting,
  sedes: propSedes,
}) {
  const { showEditSuccess, showError } = useToast();
  const itemActivo = activo || equipo;

  const [sedesList] = useState(() => (Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : ['Medellín', 'Carmen de Viboral', 'La Ceja', 'El Retiro', 'Santuario']));
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [internalFormData, setInternalFormData] = useState({
    placa: '',
    nombre: '',
    categoria: 'Portátiles',
    condicion: 'Bueno',
    estado: 'Disponible',
    area_asignada: 'Nuevas Tecnologías',
    sede: 'Medellín',
    ubicacion: 'Sala de Sistemas / Oficina Medellín',
    responsable: 'Bodega Central',
    marca: '',
    modelo: '',
    serial: '',
    cantidad: 1,
    fecha_adquisicion: '',
    valor_estimado: '',
    observaciones: '',
  });

  const isControlledForm = Boolean(externalFormData && externalSetFormData);
  const formData = isControlledForm ? externalFormData : internalFormData;
  const setFormData = isControlledForm ? externalSetFormData : setInternalFormData;
  const isSubmitting = externalSubmitting !== undefined ? externalSubmitting : internalSubmitting;

  useEffect(() => {
    if (!isOpen || !itemActivo) return;

    const sedeReal = itemActivo.sede || itemActivo.ubicacion || 'Medellín';
    const condicionReal = itemActivo.condicion || itemActivo.condicion_fisica || itemActivo.estado_fisico || 'Bueno';
    const estadoReal = itemActivo.estado_operativo || itemActivo.estado || (itemActivo.status === 'prestado' ? 'En campo / Prestado' : 'Disponible');

    const mapped = {
      placa: itemActivo.placa || itemActivo.codigo || itemActivo.code || itemActivo.id || '',
      nombre: itemActivo.nombre || itemActivo.elemento || itemActivo.equipo || itemActivo.material || itemActivo.name || '',
      categoria: itemActivo.categoria || itemActivo.category || 'Portátiles',
      condicion: condicionReal,
      estado: estadoReal,
      area_asignada: itemActivo.area_asignada || itemActivo.area_proceso || itemActivo.area || 'Nuevas Tecnologías',
      sede: sedeReal,
      ubicacion: itemActivo.ubicacion || itemActivo.ubicacion_estante || sedeReal,
      responsable: itemActivo.responsable || itemActivo.custodio || 'Bodega Central',
      marca: itemActivo.marca || '',
      modelo: itemActivo.modelo || itemActivo.model || '',
      serial: itemActivo.serial || '',
      cantidad: Number(itemActivo.cantidad ?? 1),
      fecha_adquisicion: itemActivo.fecha_compra
        ? String(itemActivo.fecha_compra).split('T')[0]
        : itemActivo.fecha_adquisicion
        ? String(itemActivo.fecha_adquisicion).split('T')[0]
        : '',
      valor_estimado: itemActivo.valor_compra !== undefined && itemActivo.valor_compra !== null
        ? String(itemActivo.valor_compra)
        : itemActivo.valor_estimado !== undefined && itemActivo.valor_estimado !== null
        ? String(itemActivo.valor_estimado)
        : '',
      observaciones: itemActivo.observaciones || itemActivo.descripcion || itemActivo.notas || '',
    };

    if (isControlledForm) {
      setFormData((prev) => ({ ...prev, ...mapped }));
    } else {
      setInternalFormData(mapped);
    }
  }, [isOpen, itemActivo, isControlledForm]);

  if (!isOpen || !itemActivo) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => {
      const val = type === 'number'
        ? (value === '' ? '' : Math.max(0, Number(value)))
        : value;
      return { ...prev, [name]: val };
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (externalOnSubmit) {
      return externalOnSubmit(e);
    }

    const nombreLimpio = (formData.nombre || '').trim();
    const placaLimpia = (formData.placa || itemActivo.placa || itemActivo.id || '').trim().toUpperCase();
    const serialLimpio = (formData.serial || '').trim();

    if (!nombreLimpio) {
      showError('Validación', 'El nombre del equipo tecnológico es obligatorio.');
      return;
    }

    if (!placaLimpia) {
      showError('Validación', 'La placa o código del equipo es obligatoria.');
      return;
    }

    if (!serialLimpio) {
      showError('Validación', 'El serial del fabricante es obligatorio.');
      return;
    }

    try {
      setInternalSubmitting(true);

      const areaAsignada = (typeof formData.area_asignada === 'string' && formData.area_asignada)
        ? formData.area_asignada
        : ((typeof formData.area === 'string' && formData.area) ? formData.area : 'Nuevas Tecnologías');
      const payload = {
        nombre: nombreLimpio,
        placa: placaLimpia,
        marca: formData.marca?.trim() || formData.categoria,
        modelo: formData.modelo?.trim() || 'Estándar',
        serial: serialLimpio,
        categoria: formData.categoria || 'Portátiles',
        condicion: formData.condicion || 'Bueno',
        estado: formData.estado || 'Disponible',
        area_asignada: areaAsignada,
        area: areaAsignada,
        ubicacion: formData.ubicacion?.trim() || 'Oficina Medellín',
        sede: formData.sede || 'Medellín',
        responsable: formData.responsable?.trim() || 'Bodega Central',
        custodio: formData.responsable?.trim() !== 'Bodega Central' ? formData.responsable?.trim() : null,
        fecha_compra: formData.fecha_adquisicion || null,
        fecha_adquisicion: formData.fecha_adquisicion || null,
        valor_compra: formData.valor_estimado !== '' ? Number(formData.valor_estimado) : null,
        observaciones: formData.observaciones?.trim() || '',
        descripcion: formData.observaciones?.trim() || '',
      };

      if (supabase) {
        try {
          const targetId = itemActivo.dbId || (itemActivo.id && !String(itemActivo.id).startsWith('eq-') ? itemActivo.id : null);
          let query = supabase.from('activos').update(payload);
          if (targetId) {
            query = query.eq('id', targetId);
          } else {
            query = query.eq('placa', placaLimpia);
          }
          await query;
        } catch (sbE) {
          console.warn('Aviso Supabase update activos:', sbE?.message);
        }
      }

      if (onSave) {
        await onSave({ ...itemActivo, ...payload });
      } else if (onSaveSuccess) {
        await onSaveSuccess({ ...itemActivo, ...payload });
      }

      onClose();
      showEditSuccess(nombreLimpio || placaLimpia);
    } catch (err) {
      console.error('Error al guardar equipo:', err);
      showError('Error al guardar cambios', err.message || 'Error desconocido');
    } finally {
      setInternalSubmitting(false);
    }
  };

  const currentTheme = getProgramTheme(
    typeof formData.area_asignada === 'string'
      ? formData.area_asignada
      : (typeof formData.area === 'string' ? formData.area : 'Nuevas Tecnologías'),
    'Nuevas Tecnologías'
  );

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(1, 58, 82, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '780px',
          backgroundColor: 'var(--surface-2, #ffffff)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -10px rgba(1, 58, 82, 0.35)',
          border: `1.5px solid ${currentTheme.cardBorder || currentTheme.accentBorder}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          fontFamily: "'Poppins', sans-serif",
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* ENCABEZADO INSTITUCIONAL DINÁMICO POR PROGRAMA FMO */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: currentTheme.headerBg,
            color: currentTheme.headerText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `3px solid ${currentTheme.accentBorder}`,
            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: currentTheme.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentTheme.iconColor,
                flexShrink: 0,
                transition: 'background-color 0.3s ease, color 0.3s ease',
              }}
            >
              <Laptop size={22} style={{ strokeWidth: 2.3 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '0.01em', color: currentTheme.headerText, transition: 'color 0.3s ease' }}>
                Editar Equipo Tecnológico
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: currentTheme.headerSubtext, transition: 'color 0.3s ease' }}>
                Modifica los datos del equipo y sus especificaciones técnicas institucionales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              color: currentTheme.headerText,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL FORMULARIO CON GRILLA DE 2 CAMPOS POR FILA */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 22px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* FILA 1: Nombre del Equipo | Código / Placa */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Nombre Del Equipo Tecnológico *
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Computador Portátil Lenovo ThinkPad E14"
                  value={formData.nombre || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#abd037')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line, #cbd5e1)')}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)' }}>
                    Código / Placa *
                  </label>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      backgroundColor: '#abd037',
                      color: '#013a52',
                      padding: '1px 7px',
                      borderRadius: '9999px',
                    }}
                  >
                    Activo institucional
                  </span>
                </div>
                <input
                  type="text"
                  name="placa"
                  required
                  value={formData.placa || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: '#013a52',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#abd037')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line, #cbd5e1)')}
                />
              </div>
            </div>

            {/* FILA 2: Categoría / Tipo | Cantidad y Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Categoría / Tipo *
                </label>
                <select
                  name="categoria"
                  value={formData.categoria || 'Portátiles'}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#abd037')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--line, #cbd5e1)')}
                >
                  {CATEGORIAS_TECNOLOGICAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    min="1"
                    required
                    value={formData.cantidad || 1}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Condición *
                  </label>
                  <select
                    name="condicion"
                    value={formData.condicion || 'Bueno'}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    {CONDICIONES_TECNOLOGICAS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FILA 3: Área Asignada / Programa FMO | Sede y Ubicación Física */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)' }}>
                    Área Asignada / Programa FMO <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <ProgramAreaBadge
                    area={typeof formData.area_asignada === 'string' ? formData.area_asignada : (formData.area || 'Nuevas Tecnologías')}
                    size="sm"
                  />
                </div>
                <ProgramAreaSelect
                  label={null}
                  showPreview={false}
                  value={typeof formData.area_asignada === 'string' ? formData.area_asignada : (formData.area || 'Nuevas Tecnologías')}
                  onChange={(e) => {
                    const val = typeof e === 'string' ? e : e?.target?.value || '';
                    setFormData((prev) => ({ ...prev, area_asignada: val, area: val }));
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Sede *
                  </label>
                  <select
                    name="sede"
                    value={formData.sede || 'Medellín'}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    {sedesList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Ubicación Física
                  </label>
                  <input
                    type="text"
                    name="ubicacion"
                    placeholder="Ej. Sala de Cómputo"
                    value={formData.ubicacion || ''}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FILA 4: Marca | Modelo y Serial */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Marca / Fabricante
                </label>
                <input
                  type="text"
                  name="marca"
                  placeholder="Ej. Lenovo, HP, Dell, Apple, Epson"
                  value={formData.marca || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Modelo
                  </label>
                  <input
                    type="text"
                    name="modelo"
                    placeholder="Ej. ThinkPad E14"
                    value={formData.modelo || ''}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                    Serial (S/N) *
                  </label>
                  <input
                    type="text"
                    name="serial"
                    required
                    placeholder="Ej. PF2B3XYZ"
                    value={formData.serial || ''}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FILA 5: Responsable / Custodio | Estado Operativo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Responsable / Custodio Asignado
                </label>
                <input
                  type="text"
                  name="responsable"
                  placeholder="Ej. Bodega Central o Nombre de Docente"
                  value={formData.responsable || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Estado Operativo *
                </label>
                <select
                  name="estado"
                  value={formData.estado || 'Disponible'}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 500,
                    outline: 'none',
                  }}
                >
                  {ESTADOS_OPERATIVOS.map((est) => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* FILA 6: Fecha de Adquisición | Valor Estimado (COP) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Fecha De Adquisición
                </label>
                <input
                  type="date"
                  name="fecha_adquisicion"
                  value={formData.fecha_adquisicion || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Valor / Costo Estimado (COP)
                </label>
                <input
                  type="text"
                  name="valor_estimado"
                  placeholder="Ej. 2800000"
                  value={formData.valor_estimado || ''}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    backgroundColor: 'var(--surface, #ffffff)',
                    color: 'var(--text, #0f172a)',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* FILA 7: Observaciones / Especificaciones (RAM, Disco, Procesador) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                Especificaciones Técnicas / Observaciones
              </label>
              <textarea
                name="observaciones"
                rows="2"
                placeholder="Ej. Procesador Intel Core i5 12va Gen, 16GB RAM DDR4, 512GB SSD NVMe. Incluye cargador original."
                value={formData.observaciones || ''}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: '1.5px solid var(--line, #cbd5e1)',
                  backgroundColor: 'var(--surface, #ffffff)',
                  color: 'var(--text, #0f172a)',
                  fontSize: '12.5px',
                  fontFamily: "'Poppins', sans-serif",
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* BOTONES INFERIORES */}
          <div
            style={{
              padding: '14px 22px',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              borderTop: '1px solid var(--line, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '11px',
                border: '1.5px solid var(--line, #cbd5e1)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim, #6d6e71)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '11px',
                backgroundColor: btnHover ? currentTheme.buttonHover : currentTheme.buttonBg,
                color: currentTheme.buttonText,
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 14px ${currentTheme.buttonBg}44`,
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={() => {
                if (!isSubmitting) setBtnHover(true);
              }}
              onMouseLeave={() => {
                if (!isSubmitting) setBtnHover(false);
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ color: currentTheme.buttonText }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ strokeWidth: 2.3, color: currentTheme.buttonText }} />
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
