import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Phone, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabase';

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

  // Cerrar con Escape
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

  // Validación: solo dígitos, espacios, guiones o signo +
  // Longitud de dígitos entre 7 y 15
  const esValido = useMemo(() => {
    const raw = telefono.trim();
    if (!raw) return false;
    const digitos = raw.replace(/\D/g, '');
    return digitos.length >= 7 && digitos.length <= 15;
  }, [telefono]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Permitir dígitos, espacios, guiones y signo + inicial
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
      setErrorValidacion('El número debe tener entre 7 y 15 dígitos (ej: 300 123 4567).');
      return;
    }

    if (!currentUser) {
      setErrorValidacion('No hay una sesión activa para actualizar.');
      return;
    }

    setSubmitting(true);
    setErrorValidacion('');

    try {
      // 1. Actualización directa en Supabase según restricción estricta
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
          // Intentar en tabla perfiles por fallback
          if (currentUser.id) {
            await supabase.from('perfiles').update({ telefono: telefonoLimpio }).eq('id', currentUser.id);
          }
        }
      }

      // 2. Sincronizar estado global AuthContext y localStorage
      if (typeof actualizarTelefono === 'function') {
        await actualizarTelefono(telefonoLimpio);
      }

      addToast('Teléfono de contacto actualizado con éxito.', 'success');
      onClose();
    } catch (err) {
      console.error('Error al actualizar teléfono:', err);
      setErrorValidacion(err.message || 'No fue posible guardar el teléfono. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(1, 58, 82, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{ fontFamily: "'Poppins', sans-serif" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-telefono-titulo"
      >
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#abd037]/20 flex items-center justify-center text-[#013a52] dark:text-[#abd037] shrink-0">
              <Phone className="w-5 h-5 text-[#013a52] dark:text-[#abd037]" />
            </div>
            <div>
              <h2
                id="modal-telefono-titulo"
                className="font-bold text-[#013a52] dark:text-white text-base sm:text-lg leading-tight m-0"
              >
                Actualizar Teléfono de Contacto
              </h2>
              <p className="text-xs text-[#6d6e71] dark:text-slate-400 m-0 mt-0.5">
                {currentUser?.nombre || 'Usuario en sesión'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-[#6d6e71] dark:text-slate-300 leading-relaxed m-0">
            Ingresa tu número de celular o teléfono institucional para facilitar la coordinación de préstamos, entregas y soporte técnico.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Número de teléfono / celular <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4 text-[#013a52]/60 dark:text-slate-400" />
              </span>
              <input
                type="tel"
                required
                autoFocus
                value={telefono}
                onChange={handleInputChange}
                placeholder="Ej: 300 123 4567"
                maxLength={20}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-[#013a52] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] transition-all"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              />
            </div>
            <p className="text-[11px] text-[#6d6e71] dark:text-slate-400 mt-1.5 m-0">
              Acepta entre 7 y 15 dígitos. Solo tú puedes editar este dato desde tu perfil.
            </p>
          </div>

          {errorValidacion && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorValidacion}</span>
            </div>
          )}

          {/* BOTONES INFERIORES */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-slate-300 dark:border-slate-700 text-[#6d6e71] dark:text-slate-300 hover:text-[#013a52] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 py-2 font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!esValido || submitting}
              className={`rounded-xl px-5 py-2 font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                esValido && !submitting
                  ? 'bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] shadow-sm hover:shadow'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
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
