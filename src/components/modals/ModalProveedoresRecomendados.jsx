import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Globe,
  Tag,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  getProveedoresRecomendados,
  createProveedorRecomendado,
  updateProveedorRecomendado,
  deleteProveedorRecomendado,
} from '../../services/proveedoresService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function ModalProveedoresRecomendados({ isOpen, onClose }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Sub-modal para Crear / Editar
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmación de eliminación
  const [proveedorParaEliminar, setProveedorParaEliminar] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const data = await getProveedoresRecomendados();
      setProveedores(data || []);
    } catch (err) {
      console.error('[ModalProveedoresRecomendados] Error cargando proveedores:', err);
      showError('Error al consultar proveedores', err?.message || 'No se pudieron cargar los proveedores desde Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarProveedores();
    }
  }, [isOpen]);

  // Filtrado reactivo por texto
  const proveedoresFiltrados = useMemo(() => {
    const q = (busqueda || '').toLowerCase().trim();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q)
    );
  }, [proveedores, busqueda]);

  const handleAbrirCrear = () => {
    setEditandoId(null);
    setFormNombre('');
    setFormUrl('');
    setFormDescripcion('');
    setFormError('');
    setModalFormOpen(true);
  };

  const handleAbrirEditar = (prov) => {
    setEditandoId(prov.id);
    setFormNombre(prov.nombre || '');
    setFormUrl(prov.url || '');
    setFormDescripcion(prov.descripcion || '');
    setFormError('');
    setModalFormOpen(true);
  };

  const handleGuardarForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const nom = formNombre.trim();
    let url = formUrl.trim();
    const desc = formDescripcion.trim();

    if (!nom) {
      setFormError('El nombre del proveedor es obligatorio.');
      return;
    }
    if (!url) {
      setFormError('La URL de la tienda es obligatoria.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    if (!desc) {
      setFormError('Ingresa una descripción de los productos que ofrece el proveedor.');
      return;
    }

    setSubmitting(true);
    try {
      if (editandoId) {
        await updateProveedorRecomendado(editandoId, {
          nombre: nom,
          url: url,
          descripcion: desc,
        }, user);
        showSuccess('Proveedor actualizado', `Se han actualizado los datos de "${nom}".`);
      } else {
        await createProveedorRecomendado(
          {
            nombre: nom,
            url: url,
            descripcion: desc,
          },
          user
        );
        showSuccess('Proveedor registrado', `"${nom}" ha sido agregado a las tiendas recomendadas.`);
      }

      setModalFormOpen(false);
      await cargarProveedores();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el proveedor.');
      showError('Error al guardar', err.message || 'Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmarEliminar = async () => {
    if (!proveedorParaEliminar) return;
    setDeleting(true);
    try {
      await deleteProveedorRecomendado(proveedorParaEliminar.id, user, proveedorParaEliminar.nombre);
      showSuccess('Proveedor eliminado', `Se retiró "${proveedorParaEliminar.nombre}" del directorio.`);
      setProveedorParaEliminar(null);
      await cargarProveedores();
    } catch (err) {
      showError('Error al eliminar', err.message || 'No se pudo eliminar el proveedor.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(1, 58, 82, 0.75)',
        backdropFilter: 'blur(5px)',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface, #ffffff)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(1, 58, 82, 0.5)',
          border: '1px solid var(--line, #e2e8f0)',
          overflow: 'hidden',
          fontFamily: "'Poppins', sans-serif",
          position: 'relative',
        }}
      >
        {/* =====================================================================
            1. HEADER INSTITUCIONAL FMO
            ===================================================================== */}
        <div
          style={{
            backgroundColor: '#013a52',
            borderBottom: '3px solid #abd037',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#abd037',
                color: '#013a52',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(171, 208, 55, 0.4)',
                flexShrink: 0,
              }}
            >
              <Store size={22} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Directorio de Proveedores Recomendados
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 9px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(171, 208, 55, 0.25)',
                    color: '#abd037',
                    border: '1px solid rgba(171, 208, 55, 0.4)',
                  }}
                >
                  {proveedores.length} {proveedores.length === 1 ? 'tienda' : 'tiendas'}
                </span>
              </div>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 400,
                }}
              >
                Tiendas de referencia oficiales para que los docentes coticen insumos pedagógicos y robótica.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
            title="Cerrar ventana"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* =====================================================================
            2. BARRA DE ACCIÓN: BUSCADOR & BOTÓN NUEVO
            ===================================================================== */}
        <div
          style={{
            padding: '14px 22px',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Buscador */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 240px',
              minWidth: '200px',
              maxWidth: '420px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #94a3b8)',
              }}
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tienda por nombre o insumo..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '12.5px',
                fontFamily: "'Poppins', sans-serif",
                borderRadius: '10px',
                border: '1px solid var(--line, #cbd5e1)',
                backgroundColor: 'var(--surface, #ffffff)',
                color: 'var(--text-h, #013a52)',
                outline: 'none',
              }}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Botón + Nuevo Proveedor */}
          <button
            type="button"
            onClick={handleAbrirCrear}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: '#abd037',
              color: '#013a52',
              border: 'none',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(171, 208, 55, 0.35)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#96b82d';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#abd037';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>+ Nuevo Proveedor Recomendado</span>
          </button>
        </div>

        {/* =====================================================================
            3. LISTADO DE TARJETAS DE PROVEEDORES
            ===================================================================== */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            maxHeight: 'calc(90vh - 170px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--surface, #ffffff)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim, #6d6e71)' }}>
              <span>Cargando directorio de proveedores...</span>
            </div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                borderRadius: '14px',
                border: '1.5px dashed var(--line, #cbd5e1)',
                backgroundColor: 'var(--surface-2, #f8fafc)',
              }}
            >
              <Store size={36} style={{ color: 'var(--text-muted, #94a3b8)', margin: '0 auto 10px', display: 'block' }} />
              <strong style={{ fontSize: '13.5px', color: 'var(--text-h, #013a52)', display: 'block' }}>
                {busqueda ? 'No se encontraron proveedores que coincidan' : 'No hay proveedores recomendados registrados aún'}
              </strong>
              <p style={{ fontSize: '12px', color: 'var(--text-dim, #6d6e71)', margin: '4px 0 14px' }}>
                {busqueda ? 'Prueba con otra palabra clave o limpia el buscador.' : 'Agrega el primer proveedor recomendado para orientar las compras de los docentes.'}
              </p>
              {!busqueda && (
                <button
                  type="button"
                  onClick={handleAbrirCrear}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#abd037',
                    color: '#013a52',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Registrar Proveedor</span>
                </button>
              )}
            </div>
          ) : (
            proveedoresFiltrados.map((prov) => (
              <div
                key={prov.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: '14px',
                  border: '1px solid var(--line, #e2e8f0)',
                  backgroundColor: 'var(--surface-2, #f8fafc)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#abd037';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(171, 208, 55, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Info Proveedor */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '7px',
                        backgroundColor: 'rgba(1, 58, 82, 0.08)',
                        color: '#013a52',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={14} />
                    </div>
                    <strong
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--text-h, #013a52)',
                      }}
                    >
                      {prov.nombre}
                    </strong>

                    {/* Enlace oficial */}
                    <a
                      href={prov.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(44, 172, 208, 0.12)',
                        color: '#0284c7',
                        border: '1px solid rgba(44, 172, 208, 0.3)',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(44, 172, 208, 0.22)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(44, 172, 208, 0.12)')}
                      title={`Visitar tienda oficial: ${prov.url}`}
                    >
                      <Globe size={11} />
                      <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prov.url.replace(/^https?:\/\/(www\.)?/i, '')}
                      </span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  {/* Descripción de productos */}
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12.5px',
                      color: 'var(--text-dim, #6d6e71)',
                      lineHeight: 1.45,
                    }}
                  >
                    {prov.descripcion}
                  </p>
                </div>

                {/* Botones Editar y Eliminar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleAbrirEditar(prov)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text-dim, #6d6e71)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#013a52';
                      e.currentTarget.style.color = '#013a52';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line, #cbd5e1)';
                      e.currentTarget.style.color = 'var(--text-dim, #6d6e71)';
                    }}
                    title="Editar información de la tienda"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setProveedorParaEliminar(prov)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    }}
                    title="Eliminar este proveedor recomendado"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* =====================================================================
            4. SUB-MODAL: CREAR / EDITAR PROVEEDOR
            ===================================================================== */}
        {modalFormOpen && (
          <div
            onClick={() => !submitting && setModalFormOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backgroundColor: 'rgba(1, 58, 82, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--surface, #ffffff)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--line, #cbd5e1)',
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              {/* Header Submodal */}
              <div
                style={{
                  backgroundColor: '#013a52',
                  borderBottom: '3px solid #abd037',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={18} style={{ color: '#abd037' }} />
                  <strong style={{ color: '#ffffff', fontSize: '14px' }}>
                    {editandoId ? 'Editar Proveedor Recomendado' : 'Nuevo Proveedor Recomendado'}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setModalFormOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleGuardarForm} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertCircle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Nombre del Proveedor */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '5px' }}>
                    Nombre del Proveedor / Tienda *:
                  </label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Sigma Electrónica / Dynamoelectronics"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text-h, #013a52)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 2. URL de la Tienda */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '5px' }}>
                    URL Oficial de la Tienda (Web) *:
                  </label>
                  <input
                    type="url"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://www.sigmaelectronica.net"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text-h, #013a52)',
                      fontSize: '13px',
                      fontFamily: "'Poppins', sans-serif",
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 3. Descripción de productos que venden */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-h, #013a52)', marginBottom: '5px' }}>
                    Descripción de productos que venden *:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Ej. Sensores especializados, placas Arduino/ESP32, motores y consumibles de robótica."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--line, #cbd5e1)',
                      backgroundColor: 'var(--surface, #ffffff)',
                      color: 'var(--text-h, #013a52)',
                      fontSize: '12.5px',
                      fontFamily: "'Poppins', sans-serif",
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Botones de acción del formulario */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setModalFormOpen(false)}
                    disabled={submitting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--line, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-dim, #6d6e71)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#abd037',
                      color: '#013a52',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{submitting ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            5. SUB-MODAL: CONFIRMAR ELIMINACIÓN
            ===================================================================== */}
        {proveedorParaEliminar && (
          <div
            onClick={() => !deleting && setProveedorParaEliminar(null)}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backgroundColor: 'rgba(1, 58, 82, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--surface, #ffffff)',
                borderRadius: '16px',
                padding: '22px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--line, #cbd5e1)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Trash2 size={22} />
              </div>

              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-h, #013a52)' }}>
                ¿Eliminar este proveedor recomendado?
              </h4>
              <p style={{ margin: '8px 0 18px', fontSize: '12.5px', color: 'var(--text-dim, #6d6e71)', lineHeight: 1.45 }}>
                Estás a punto de retirar a <strong>"{proveedorParaEliminar.nombre}"</strong>. Los usuarios ya no verán esta tienda en sus sugerencias de compra.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setProveedorParaEliminar(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-dim, #6d6e71)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmarEliminar}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: deleting ? 'wait' : 'pointer',
                  }}
                >
                  {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
