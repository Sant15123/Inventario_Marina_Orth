import React, { useState, useEffect } from 'react';
import {
  X,
  Laptop,
  Loader2,
  CheckCircle,
  Tag,
  MapPin,
  Calendar,
  Layers,
  Wrench,
  DollarSign,
  User,
} from 'lucide-react';
import { inventoryApi } from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';
import ProgramAreaBadge, { ProgramAreaSelect } from '../common/ProgramAreaBadge';

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

const SEDES_DEFAULT = ['Medellín', 'Carmen de Viboral', 'La Ceja', 'El Retiro', 'Santuario'];

export default function ModalRegistroEquipoTecnologico({
  isOpen,
  onClose,
  onEquipoCreated,
  onEquipoSaved,
  equipoAEditar = null,
  sedes = SEDES_DEFAULT,
  equiposExistentes = [],
}) {
  const { showNewItemSuccess, showEditSuccess, showError } = useToast();
  const isEditing = Boolean(equipoAEditar);

  const [submitting, setSubmitting] = useState(false);
  const [loadingPlaca, setLoadingPlaca] = useState(false);

  const initialForm = {
    id: '',
    placa: '',
    nombre: '',
    categoria: 'Portátiles',
    marca: '',
    modelo: '',
    serial: '',
    cantidad: 1,
    condicion: 'Bueno',
    estado: 'Disponible',
    area_asignada: 'Nuevas Tecnologías',
    sede: sedes[0] || 'Medellín',
    ubicacion: 'Sala de Sistemas / Oficina Medellín',
    responsable: 'Bodega Central',
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
      const placaReal = equipoAEditar.placa || equipoAEditar.codigo || equipoAEditar.code || equipoAEditar.id || '';
      setFormData({
        id: equipoAEditar.id || '',
        placa: placaReal,
        nombre: equipoAEditar.nombre || equipoAEditar.elemento || equipoAEditar.equipo || equipoAEditar.material || equipoAEditar.name || '',
        categoria: equipoAEditar.categoria || equipoAEditar.category || 'Portátiles',
        marca: equipoAEditar.marca || '',
        modelo: equipoAEditar.modelo || equipoAEditar.model || '',
        serial: equipoAEditar.serial || '',
        cantidad: Number(equipoAEditar.cantidad ?? 1),
        condicion: equipoAEditar.condicion || equipoAEditar.condicion_fisica || equipoAEditar.estado_fisico || 'Bueno',
        estado: equipoAEditar.estado_operativo || equipoAEditar.estado || 'Disponible',
        area_asignada: equipoAEditar.area_asignada || equipoAEditar.area_proceso || equipoAEditar.area || 'Nuevas Tecnologías',
        sede: equipoAEditar.sede || equipoAEditar.ubicacion || sedes[0] || 'Medellín',
        ubicacion: equipoAEditar.ubicacion || equipoAEditar.ubicacion_estante || 'Sala de Sistemas / Oficina Medellín',
        responsable: equipoAEditar.responsable || equipoAEditar.custodio || 'Bodega Central',
        fecha_adquisicion: equipoAEditar.fecha_compra
          ? String(equipoAEditar.fecha_compra).split('T')[0]
          : equipoAEditar.fecha_adquisicion
          ? String(equipoAEditar.fecha_adquisicion).split('T')[0]
          : new Date().toISOString().split('T')[0],
        valor_estimado: equipoAEditar.valor_compra !== undefined && equipoAEditar.valor_compra !== null
          ? String(equipoAEditar.valor_compra)
          : equipoAEditar.valor_estimado !== undefined && equipoAEditar.valor_estimado !== null
          ? String(equipoAEditar.valor_estimado)
          : '',
        observaciones: equipoAEditar.observaciones || equipoAEditar.descripcion || equipoAEditar.notas || '',
      });
      return;
    }

    // Modo creación: calcular siguiente placa tecnológica (ACT-FMO-XXX o PXX)
    let isMounted = true;
    const autocalcularPlaca = () => {
      setLoadingPlaca(true);
      try {
        const todos = Array.isArray(equiposExistentes) ? equiposExistentes : [];
        const numerosAct = todos
          .map((u) => {
            const raw = String(u.placa || u.code || u.id || '');
            const m = raw.match(/ACT-FMO-(\d+)/i) || raw.match(/P(\d+)/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => !isNaN(n) && n > 0);

        const maxNum = numerosAct.length > 0 ? Math.max(...numerosAct) : 0;
        const siguiente = maxNum + 1;
        const siguientePlaca = siguiente < 100
          ? `ACT-FMO-${String(siguiente).padStart(3, '0')}`
          : `ACT-FMO-${siguiente}`;

        if (isMounted) {
          setFormData((prev) => ({
            ...prev,
            placa: siguientePlaca,
          }));
        }
      } catch (err) {
        console.warn('Error al autocalcular placa de equipo tecnológico:', err);
      } finally {
        if (isMounted) setLoadingPlaca(false);
      }
    };

    autocalcularPlaca();

    return () => {
      isMounted = false;
    };
  }, [isOpen, equipoAEditar, equiposExistentes]);

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
    const serialLimpio = (formData.serial || '').trim();

    if (!nombreLimpio) {
      showError('Validación', 'El nombre del equipo tecnológico es obligatorio.');
      return;
    }

    if (!placaLimpia) {
      showError('Validación', 'La placa o código institucional del equipo es obligatoria.');
      return;
    }

    if (!serialLimpio) {
      showError('Validación', 'El número de serial (S/N) del fabricante es obligatorio.');
      return;
    }

    // Verificar placa duplicada solo en modo creación
    if (!isEditing && Array.isArray(equiposExistentes)) {
      const existe = equiposExistentes.some(
        (u) => String(u.placa || u.code || u.id || '').trim().toUpperCase() === placaLimpia
      );
      if (existe) {
        showError('Placa Duplicada', `La placa "${placaLimpia}" ya está registrada en otro activo tecnológico.`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        placa: placaLimpia,
        nombre: nombreLimpio,
        categoria: formData.categoria,
        marca: formData.marca?.trim() || formData.categoria,
        modelo: formData.modelo?.trim() || 'Estándar',
        serial: serialLimpio,
        cantidad: Number(formData.cantidad) || 1,
        condicion: formData.condicion,
        estado: formData.estado,
        area_asignada: formData.area_asignada || 'Nuevas Tecnologías',
        area: formData.area_asignada || 'Nuevas Tecnologías',
        sede: formData.sede || 'Medellín',
        ubicacion: formData.ubicacion?.trim() || 'Oficina Medellín',
        responsable: formData.responsable?.trim() || 'Bodega Central',
        custodio: formData.responsable?.trim() !== 'Bodega Central' ? formData.responsable?.trim() : null,
        fecha_compra: formData.fecha_adquisicion || null,
        fecha_adquisicion: formData.fecha_adquisicion || null,
        valor_compra: formData.valor_estimado !== '' ? Number(formData.valor_estimado) : null,
        observaciones: formData.observaciones?.trim() || '',
        descripcion: formData.observaciones?.trim() || '',
      };

      // 1. Guardar en Supabase directamente si está conectado
      if (supabase) {
        try {
          if (isEditing) {
            const targetId = equipoAEditar.id || equipoAEditar.dbId;
            let query = supabase.from('activos').update(payload);
            if (targetId && !String(targetId).startsWith('eq-')) {
              query = query.eq('id', targetId);
            } else {
              query = query.eq('placa', placaLimpia);
            }
            await query;
          } else {
            await supabase.from('activos').insert([payload]);
          }
        } catch (sbErr) {
          console.warn('Nota Supabase activos:', sbErr?.message);
        }
      }

      // 2. Invocar callbacks según el modo
      if (isEditing) {
        if (typeof onEquipoSaved === 'function') {
          await onEquipoSaved({ ...equipoAEditar, ...payload });
        }
        showEditSuccess(nombreLimpio || placaLimpia);
      } else {
        if (typeof onEquipoCreated === 'function') {
          await onEquipoCreated(payload);
        }
        showNewItemSuccess({
          nombre: nombreLimpio,
          codigo: placaLimpia,
          sedeOUbicacion: formData.ubicacion,
        });
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar equipo tecnológico:', err);
      showError('Error al guardar', err.message || 'No fue posible guardar el equipo.');
    } finally {
      setSubmitting(false);
    }
  };

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
          border: '1.5px solid rgba(171, 208, 55, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {/* ENCABEZADO INSTITUCIONAL */}
        <div
          style={{
            padding: '16px 22px',
            backgroundColor: '#013a52',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #abd037',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(171, 208, 55, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#abd037',
                flexShrink: 0,
              }}
            >
              <Laptop size={22} style={{ strokeWidth: 2.3 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '0.01em', color: '#ffffff' }}>
                {isEditing ? 'Editar Equipo Tecnológico' : 'Nuevo Equipo Tecnológico'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#cbd5e1' }}>
                Portátiles, computadores, tablets, proyectores y pantallas institucionales
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
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
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
                    placeholder="ACT-FMO-001"
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

            {/* FILA 2: Categoría / Tipo | Cantidad y Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                  Categoría / Tipo *
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)' }}>
                    Área Asignada / Programa FMO *
                  </label>
                  <ProgramAreaBadge area={formData.area_asignada} size="sm" />
                </div>
                <ProgramAreaSelect
                  value={formData.area_asignada}
                  onChange={(val) => setFormData((prev) => ({ ...prev, area_asignada: val }))}
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
                    placeholder="Ej. Sala de Innovación"
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
                  placeholder="Ej. Lenovo, HP, Dell, Apple, Epson"
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
                    placeholder="Ej. ThinkPad E14"
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
                    Serial (S/N) *
                  </label>
                  <input
                    type="text"
                    name="serial"
                    required
                    placeholder="Ej. PF2B3XYZ"
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
                  placeholder="Ej. Bodega Central o Nombre de Docente"
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

            {/* FILA 6: Fecha de Adquisición | Valor Estimado (COP) */}
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
                  placeholder="Ej. 2800000"
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

            {/* FILA 7: Observaciones / Especificaciones (RAM, Disco, Procesador) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-h, #013a52)', marginBottom: '4px' }}>
                Especificaciones Técnicas / Observaciones
              </label>
              <textarea
                name="observaciones"
                rows="2"
                placeholder="Ej. Procesador Intel Core i5 12va Gen, 16GB RAM DDR4, 512GB SSD NVMe. Incluye cargador original."
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
                backgroundColor: '#abd037',
                color: '#013a52',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(171, 208, 55, 0.4)',
                fontFamily: "'Poppins', sans-serif",
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#96b82d';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = '#abd037';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#013a52]" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} style={{ strokeWidth: 2.3 }} />
                  <span>{isEditing ? 'Guardar Cambios' : 'Registrar Equipo Tecnológico'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
