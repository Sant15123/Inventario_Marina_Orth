import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Phone, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';
import UserAvatar from '../common/UserAvatar';

export default function ActualizarTelefonoModal({ isOpen, onClose }) {
  const { currentUser, actualizarTelefono } = useAuth();
  const { addToast } = useToast();

  const [telefono, setTelefono] = useState('');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Inicializar con el teléfono actual del usuario al abrir
  useEffect(() => {
    if (isOpen) {
      setTelefono(currentUser?.telefono || '');
      setErrorValidacion('');
      setSubmitting(false);
    }
  }, [isOpen, currentUser?.telefono]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, submitting, onClose]);

  // Validación: longitud entre 7 y 15 dígitos numéricos
  const esValido = useMemo(() => {
    const raw = telefono.trim();
    if (!raw) return false;
    const digitos = raw.replace(/\D/g, '');
    return digitos.length >= 7 && digitos.length <= 15;
  }, [telefono]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Permitir dígitos, espacios, guiones y signo +
    if (/^[0-9+\s-]*$/.test(val)) {
      setTelefono(val);
      if (errorValidacion) setErrorValidacion('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const telefonoLimpio = telefono.trim();

    const digitos = telefonoLimpio.replace(/\D/g, '');
    if (digitos.length < 7 || digitos.length > 15) {
      setErrorValidacion('El número debe contener entre 7 y 15 dígitos (ej. 300 123 4567).');
      return;
    }

    if (!currentUser) {
      setErrorValidacion('No se encontró una sesión activa de usuario.');
      return;
    }

    setSubmitting(true);
    setErrorValidacion('');

    try {
      // 1. Actualización directa y segura en Supabase (solo su propio registro)
      if (supabase) {
        let query = supabase.from('usuarios').update({ telefono: telefonoLimpio });
        if (currentUser.id) {
          query = query.eq('id', currentUser.id);
        } else if (currentUser.email) {
          query = query.eq('email', currentUser.email.toLowerCase());
        } else if (currentUser.correo) {
          query = query.eq('correo', currentUser.correo.toLowerCase());
        }
        const { error: supaErr } = await query;
        if (supaErr) {
          console.warn('Nota de Supabase usuarios:', supaErr.message);
          // Fallback en perfiles si la vista 'usuarios' no responde directamente
          if (currentUser.id) {
            await supabase.from('perfiles').update({ telefono: telefonoLimpio }).eq('id', currentUser.id);
          }
        }
      }

      // 2. Sincronizar estado global AuthContext, localStorage y catálogo en memoria
      if (typeof actualizarTelefono === 'function') {
        await actualizarTelefono(telefonoLimpio);
      }

      addToast({
        type: 'success',
        iconType: 'check',
        title: '¡Teléfono actualizado!',
        message: 'Tu número de contacto ha sido guardado con éxito en el sistema.',
      });

      onClose();
    } catch (err) {
      console.error('Error al actualizar teléfono:', err);
      setErrorValidacion(err.message || 'No fue posible guardar el número. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(1, 58, 82, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'var(--surface, #ffffff)',
          border: '1px solid var(--line, #e2e8f0)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(1, 58, 82, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Poppins', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-telefono-titulo"
      >
        {/* LÍNEA DECORATIVA SUPERIOR CON IDENTIDAD DE MARCA FMO */}
        <div
          style={{
            height: '4px',
            width: '100%',
            background: 'linear-gradient(90deg, #abd037 0%, #013a52 100%)',
          }}
        />

        {/* CABECERA INSTITUCIONAL */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--surface-2, #f8fafc)',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(171, 208, 55, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#013a52',
                flexShrink: 0,
              }}
            >
              <Phone size={18} style={{ width: '18px', height: '18px', color: '#013a52', strokeWidth: 2.2 }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#6d6e71',
                  display: 'block',
                  lineHeight: 1.2,
                }}
              >
                Perfil Institucional FMO
              </span>
              <h3
                id="modal-telefono-titulo"
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--text-h, #013a52)',
                  margin: '2px 0 0 0',
                  lineHeight: 1.25,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Actualizar Teléfono
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            title="Cerrar modal"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(1, 58, 82, 0.08)';
              e.currentTarget.style.color = '#013a52';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
            }}
          >
            <X size={18} style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px' }}>
            {/* Tarjeta de usuario en sesión */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(1, 58, 82, 0.04)',
                border: '1px solid rgba(1, 58, 82, 0.08)',
                marginBottom: '16px',
              }}
            >
              <UserAvatar
                nombre={currentUser?.nombre}
                avatarUrl={currentUser?.avatar_url || currentUser?.avatarUrl}
                size="w-9 h-9 min-w-[36px] min-h-[36px]"
                textSize="text-xs"
              />
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: 'var(--text-h, #013a52)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {currentUser?.nombre}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-dim, #6d6e71)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {currentUser?.email}
                </div>
              </div>
            </div>

            {/* Campo de Entrada de Teléfono */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-h, #013a52)',
                  marginBottom: '6px',
                }}
              >
                Número de Celular o Teléfono <span style={{ color: '#e11d48' }}>*</span>
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(171, 208, 55, 0.25)',
                    color: '#013a52',
                    pointerEvents: 'none',
                    flexShrink: 0,
                  }}
                >
                  <Phone size={12} style={{ width: '12px', height: '12px', strokeWidth: 2.2 }} />
                </div>
                <input
                  type="tel"
                  required
                  autoFocus
                  value={telefono}
                  onChange={handleInputChange}
                  placeholder="Ej: 300 123 4567"
                  maxLength={20}
                  style={{
                    width: '100%',
                    height: '42px',
                    paddingLeft: '44px',
                    paddingRight: '14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'Poppins', sans-serif",
                    color: 'var(--text-h, #013a52)',
                    backgroundColor: 'var(--bg, #ffffff)',
                    border: '1.5px solid var(--line, #cbd5e1)',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#013a52';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(171, 208, 55, 0.35)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line, #cbd5e1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--text-dim, #6d6e71)',
                  marginTop: '6px',
                  marginBottom: 0,
                  lineHeight: 1.35,
                }}
              >
                Acepta entre 7 y 15 dígitos. Este dato se usará para coordinar entregas y préstamos de activos institucionales.
              </p>
            </div>

            {/* Mensaje de Error si aplica */}
            {errorValidacion && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  marginTop: '14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#dc2626',
                  fontSize: '11.5px',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={15} style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                <span>{errorValidacion}</span>
              </div>
            )}
          </div>

          {/* PIE DE PÁGINA CON BOTONES */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--surface-2, #f8fafc)',
              borderTop: '1px solid var(--line, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line, #cbd5e1)',
                backgroundColor: 'transparent',
                color: 'var(--text-dim, #6d6e71)',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: "'Poppins', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#013a52';
                e.currentTarget.style.borderColor = '#013a52';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-dim, #6d6e71)';
                e.currentTarget.style.borderColor = 'var(--line, #cbd5e1)';
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!esValido || submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                fontSize: '12.5px',
                fontWeight: 700,
                fontFamily: "'Poppins', sans-serif",
                borderRadius: '8px',
                border: 'none',
                backgroundColor: esValido && !submitting ? '#abd037' : '#e2e8f0',
                color: esValido && !submitting ? '#013a52' : '#94a3b8',
                cursor: esValido && !submitting ? 'pointer' : 'not-allowed',
                boxShadow: esValido && !submitting ? '0 2px 8px rgba(171, 208, 55, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ width: '14px', height: '14px' }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check size={14} style={{ width: '14px', height: '14px', strokeWidth: 2.5 }} />
                  <span>Guardar Teléfono</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
