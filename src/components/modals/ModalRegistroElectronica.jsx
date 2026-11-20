import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Loader2,
  CheckCircle,
  Tag,
  MapPin,
  Calendar,
  Layers,
  Wrench,
  DollarSign,
} from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';
import ProgramAreaBadge, { ProgramAreaSelect } from '../common/ProgramAreaBadge';
import { getProgramTheme } from '../../utils/programThemes';

const SUBCATEGORIAS_ELECTRONICA = [
  'Instrumentación',
  'Placas de Desarrollo',
  'Herramienta Electrónica',
  'Kits Programables / STEAM',
  'Fuentes & Osciloscopios',
  'Sensores Especiales Reutilizables',
  'Otro Equipo Electrónico',
];

const CONDICIONES_ELECTRONICA = [
  'Excelente / Nuevo',
  'Bueno',
  'Regular',
  'Requiere Reparación',
];

const ESTADOS_OPERATIVOS = [
  'Disponible',
  'En Préstamo',
  'En Mantenimiento',
  'Baja',
];

const SEDES_DEFAULT = ['Medellín', 'Carmen de Viboral', 'La Ceja', 'El Retiro', 'Santuario'];

export default function ModalRegistroElectronica({
  isOpen,
  onClose,
  onEquipoCreated,
  onEquipoSaved,
  equipoAEditar = null,
  sedes = SEDES_DEFAULT,
}) {
  const { showNewItemSuccess, showEditSuccess, showError } = useToast();
  const isEditing = Boolean(equipoAEditar);

  const [submitting, setSubmitting] = useState(false);
  const [loadingPlaca, setLoadingPlaca] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  const initialForm = {
    id: '',
    placa: '',
    nombre: '',
    subcategoria: 'Instrumentación',
    marca: '',
    modelo: '',
    serial: '',
    cantidad: 1,
    condicion: 'Bueno',
    responsable: '',
    estado: 'Disponible',
    area_asignada: 'Robótica',
    sede: sedes[0] || 'Medellín',
    ubicacion: 'Laboratorio de Robótica',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    valor_estimado: '',
    observaciones: '',
  };

  const [formData, setFormData] = useState(initialForm);

  // Sincronizar formulario al abrir o cambiar de modo
  useEffect(() => {
    if (!isOpen) {
      setFormData(initialForm);
      return;
    }

    if (equipoAEditar) {
      const placaReal = equipoAEditar.placa || equipoAEditar.codigo || equipoAEditar.id || '';
      setFormData({
        id: equipoAEditar.id || '',
        placa: placaReal,
        nombre: equipoAEditar.nombre || equipoAEditar.material || equipoAEditar.name || '',
        subcategoria: equipoAEditar.subcategoria || equipoAEditar.categoria || 'Instrumentación',
        marca: equipoAEditar.marca || '',
        modelo: equipoAEditar.modelo || '',
        serial: equipoAEditar.serial || '',
        cantidad: Number(equipoAEditar.cantidad ?? 1),
        condicion: equipoAEditar.condicion || equipoAEditar.condicion_fisica || 'Bueno',
        responsable: equipoAEditar.responsable || equipoAEditar.custodio || '',
        estado: equipoAEditar.estado || 'Disponible',
        area_asignada: equipoAEditar.area_asignada || equipoAEditar.area || 'Robótica',
        sede: equipoAEditar.sede || equipoAEditar.ubicacion || sedes[0] || 'Medellín',
        ubicacion: equipoAEditar.ubicacion || 'Laboratorio de Robótica',
        fecha_adquisicion: equipoAEditar.fecha_adquisicion
          ? String(equipoAEditar.fecha_adquisicion).split('T')[0]
          : new Date().toISOString().split('T')[0],
        valor_estimado: equipoAEditar.valor_estimado !== undefined && equipoAEditar.valor_estimado !== null
          ? String(equipoAEditar.valor_estimado)
          : '',
        observaciones: equipoAEditar.observaciones || equipoAEditar.notas || '',
      });
      return;
    }

    // Modo creación: consultar consecutivo oficial ELE-FMO-XXX
    let isMounted = true;
    const fetchSiguientePlaca = async () => {
      setLoadingPlaca(true);
      try {
        const res = await inventoryApi.getSiguientePlacaElectronica();
        if (isMounted && res && res.placa) {
          setFormData((prev) => ({
            ...prev,
            placa: res.placa,
          }));
        }
      } catch (err) {
        console.warn('Fallo consulta automática de consecutivo electrónica:', err);
      } finally {
        if (isMounted) setLoadingPlaca(false);
      }
    };

    fetchSiguientePlaca();

    return () => {
      isMounted = false;
    };
  }, [isOpen, equipoAEditar]);

  if (!isOpen) return null;

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

    const nombreLimpio = (formData.nombre || '').trim();
    const placaLimpia = (formData.placa || '').trim().toUpperCase();

    if (!nombreLimpio) {
      showError('Validación', 'El nombre del equipo de electrónica es obligatorio.');
      return;
    }

    if (!placaLimpia) {
      showError('Validación', 'La placa o código consecutivo es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      const areaAsignada = (typeof formData.area_asignada === 'string' && formData.area_asignada)
        ? formData.area_asignada
        : ((typeof formData.area === 'string' && formData.area) ? formData.area : 'Robótica');
      const payload = {
        ...formData,
        area_asignada: areaAsignada,
        area: areaAsignada,
        nombre: nombreLimpio,
        placa: placaLimpia,
        cantidad: Math.max(1, Number(formData.cantidad) || 1),
        valor_estimado: formData.valor_estimado === '' ? 0 : Number(formData.valor_estimado),
        itemType: 'electronica',
        tipo: 'electronica',
      };

      if (isEditing) {
        // Actualizar registro existente
        await inventoryApi.updateEquipoElectronica(placaLimpia, payload);
        if (onEquipoSaved) {
          onEquipoSaved(payload);
        }
        showEditSuccess(nombreLimpio, `Placa ${placaLimpia} actualizada exitosamente en inventario.`);
      } else {
        // Crear nuevo registro
        const nuevo = await inventoryApi.createEquipoElectronica(payload);
        if (onEquipoCreated) {
          onEquipoCreated(nuevo || payload);
        }
        showNewItemSuccess(nombreLimpio, `Placa asignada: ${placaLimpia}. Guardado en base de datos.`);
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar equipo de electrónica:', err);
      showError('Error al Guardar', err.message || 'No se pudo guardar el equipo de electrónica.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentTheme = getProgramTheme(
    typeof formData.area_asignada === 'string' ? formData.area_asignada : 'Robótica',
    'Robótica'
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
              <Cpu size={22} style={{ strokeWidth: 2.3 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '0.01em', color: currentTheme.headerText, transition: 'color 0.3s ease' }}>
                {isEditing ? 'Editar Equipo de Electrónica' : 'Nuevo Equipo de Electrónica & Taller'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: currentTheme.headerSubtext, transition: 'color 0.3s ease' }}>
                Instrumentación, placas de desarrollo, herramientas y kits formativos reutilizables
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
                  Nombre del Equipo de Electrónica *
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Multímetro Digital Automotriz True RMS"
                  value={formData.nombre}
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
                    Consecutivo oficial
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="placa"
                    required
                    placeholder="ELE-FMO-001"
                    value={formData.placa}
                    onChange={handleChange}
                    disabled={loadingPlaca}
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
                  {loadingPlaca && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Loader2 size={16} className="animate-spin text-[#abd037]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FILA 2: Subcategoría / Tipo | Cantidad y Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Subcategoría / Tipo *
                </label>
                <select
                  name="subcategoria"
                  value={formData.subcategoria}
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
                  {SUBCATEGORIAS_ELECTRONICA.map((cat) => (
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
                    value={formData.cantidad}
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
                    value={formData.condicion}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '9px',
                      border: '1.5px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text, #0f172a)',
                      fontSize: '12.5px',
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    {CONDICIONES_ELECTRONICA.map((c) => (
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
                    area={typeof formData.area_asignada === 'string' ? formData.area_asignada : 'Robótica'}
                    size="sm"
                  />
                </div>
                <ProgramAreaSelect
                  label={null}
                  showPreview={false}
                  value={typeof formData.area_asignada === 'string' ? formData.area_asignada : 'Robótica'}
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
                    value={formData.sede}
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
                    {sedes.map((s) => (
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
                    placeholder="Ej. Taller de Robótica - Estante A1"
                    value={formData.ubicacion}
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
                  placeholder="Ej. Uni-T, Fluke, Arduino, Yihua"
                  value={formData.marca}
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
                    placeholder="Ej. UT61E+"
                    value={formData.modelo}
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
                    Serial (S/N)
                  </label>
                  <input
                    type="text"
                    name="serial"
                    placeholder="Ej. UT2026-001"
                    value={formData.serial}
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
                  placeholder="Ej. Docente STEAM o Taller Medellín"
                  value={formData.responsable}
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
                  value={formData.estado}
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

            {/* FILA 6: Fecha de Adquisición | Valor / Costo Estimado (COP) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Fecha De Adquisición
                </label>
                <input
                  type="date"
                  name="fecha_adquisicion"
                  value={formData.fecha_adquisicion}
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
                  placeholder="Ej. 380000"
                  value={formData.valor_estimado}
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

            {/* FILA 7: Observaciones / Ficha Técnica (Ancho completo) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                Especificaciones Técnicas / Observaciones
              </label>
              <textarea
                name="observaciones"
                rows={2}
                placeholder="Especificaciones técnicas, rango de medición, accesorios incluidos o notas de calibración..."
                value={formData.observaciones}
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
                onFocus={(e) => (e.target.style.borderColor = '#abd037')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--line, #cbd5e1)')}
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
              disabled={submitting}
              style={{
                padding: '9px 18px',
                borderRadius: '11px',
                border: '1.5px solid var(--line, #cbd5e1)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim, #6d6e71)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting}
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
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: `0 4px 14px ${currentTheme.buttonBg}44`,
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={() => {
                if (!submitting) setBtnHover(true);
              }}
              onMouseLeave={() => {
                if (!submitting) setBtnHover(false);
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ color: currentTheme.buttonText }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ strokeWidth: 2.3, color: currentTheme.buttonText }} />
                  <span>{isEditing ? 'Guardar Cambios' : 'Registrar Equipo de Electrónica'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
