import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Package,
  Wrench,
  Clock,
  Laptop,
  Check,
  Sparkles,
  Pencil,
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    codigo: '',
    confirmText: 'Confirmar Baja',
    cancelText: 'Cancelar',
    onConfirm: null,
    onCancel: null,
  });

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      type = 'success', // 'success' | 'info' | 'warning' | 'error' | 'custom'
      title,
      message,
      badge,
      iconType, // 'check' | 'pencil' | 'package' | 'laptop' | 'clock' | 'wrench' | 'alert'
      duration = 4500,
    }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, badge, iconType, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  // 1. Toast de Edición Exitosa
  const showEditSuccess = useCallback(
    (nombreOCodigo) => {
      return addToast({
        type: 'success',
        iconType: 'pencil',
        title: '¡Actualización Exitosa!',
        message: `La ficha técnica y disponibilidad de ${nombreOCodigo} han sido actualizadas en el inventario institucional.`,
      });
    },
    [addToast]
  );

  // Modal de Confirmación Genérico Institucional
  const showConfirmAction = useCallback(
    ({
      title = '¿Confirmar acción?',
      message = '',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      isDanger = true,
      onConfirm,
    }) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        isDanger,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          if (onConfirm) await onConfirm();
        },
        onCancel: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        },
      });
    },
    []
  );

  // 2. Modal de Confirmación Previa para Dar de Baja (Acción Crítica / Destructiva)
  const showConfirmBaja = useCallback(
    ({ codigo, nombre, onConfirm }) => {
      showConfirmAction({
        title: `¿Dar de baja activo ${codigo ? `[${codigo}]` : ''}?`,
        message: `¿Seguro que deseas dar de baja el activo ${codigo || ''}${nombre ? ` (${nombre})` : ''}? Esta acción registrará el motivo de retiro (daño irreparable, obsolescencia o pérdida) y modificará el stock histórico.`,
        confirmText: 'Confirmar Baja',
        cancelText: 'Cancelar',
        isDanger: true,
        onConfirm: async () => {
          if (onConfirm) await onConfirm();
          addToast({
            type: 'warning',
            iconType: 'alert',
            title: 'Activo Dado de Baja',
            message: 'Activo dado de baja correctamente. Se ha actualizado el inventario operativo.',
          });
        },
      });
    },
    [showConfirmAction, addToast]
  );

  // 3. Toast de Creación / Nuevo Registro
  const showNewItemSuccess = useCallback(
    ({ nombre, codigo, sedeOUbicacion }) => {
      return addToast({
        type: 'success',
        iconType: 'package',
        badge: codigo,
        title: '¡Nuevo Registro Incorporado!',
        message: `Se agregó exitosamente ${nombre || 'el ítem'} con el identificador ${codigo || 'asignado'}${sedeOUbicacion ? ` en ${sedeOUbicacion}` : ''}.`,
      });
    },
    [addToast]
  );

  // 4a. Toast de Préstamo Retornable
  const showLoanSuccess = useCallback(
    ({ codigo, custodio, fechaDevolucion }) => {
      return addToast({
        type: 'info',
        iconType: 'laptop',
        badge: codigo,
        title: 'Préstamo Registrado',
        message: `El equipo ${codigo || 'tecnológico'} fue asignado en custodia a ${custodio || 'responsable'} hasta el ${fechaDevolucion || 'plazo pactado'}.`,
      });
    },
    [addToast]
  );

  // 4b. Toast de Entrega de Consumibles de Taller
  const showDeliverySuccess = useCallback(
    ({ totalConsumibles, codigoRemision }) => {
      return addToast({
        type: 'success',
        iconType: 'wrench',
        badge: codigoRemision,
        title: 'Despacho de Materiales Confirmado',
        message: `Se registraron ${totalConsumibles || 'los'} consumibles bajo la Remisión ${codigoRemision || 'oficial'} para el taller STEAM. Stock actualizado.`,
      });
    },
    [addToast]
  );

  // Helpers genéricos de error / info
  const showError = useCallback(
    (titleOrMsg, details) => {
      return addToast({
        type: 'error',
        iconType: 'alert',
        title: details ? titleOrMsg : 'Error',
        message: details || titleOrMsg,
      });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title, message) => {
      return addToast({
        type: 'info',
        iconType: 'check',
        title,
        message,
      });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        showEditSuccess,
        showConfirmBaja,
        showConfirmAction,
        showNewItemSuccess,
        showLoanSuccess,
        showDeliverySuccess,
        showError,
        showInfo,
      }}
    >
      {children}

      {/* ============================================================== */}
      {/* CONTENEDOR FLOTANTE DE TOASTS SUPERIOR DERECHO                 */}
      {/* ============================================================== */}
      <div
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2"
        style={{ pointerEvents: 'none' }}
      >
        {toasts.map((toast) => {
          const isLime = toast.type === 'success';
          const isInfo = toast.type === 'info';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-xl shadow-2xl transition-all duration-300 animate-slide-in border-l-4 ${
                isLime
                  ? 'border-l-[#84CC16] bg-[#0B132B] text-slate-100 border border-slate-700/60'
                  : isInfo
                  ? 'border-l-[#38BDF8] bg-[#0B132B] text-slate-100 border border-slate-700/60'
                  : isWarning
                  ? 'border-l-amber-500 bg-[#0B132B] text-slate-100 border border-slate-700/60'
                  : 'border-l-rose-500 bg-[#0B132B] text-slate-100 border border-slate-700/60'
              }`}
              style={{
                backgroundColor: 'var(--surface-modal, #0B132B)',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
              }}
            >
              {/* Ícono Temático */}
              <div
                className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${
                  isLime
                    ? 'bg-[#84CC16]/20 text-[#84CC16]'
                    : isInfo
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
                style={{
                  width: '36px',
                  height: '36px',
                }}
              >
                {toast.iconType === 'pencil' && <Pencil className="w-5 h-5 text-[#84CC16]" />}
                {toast.iconType === 'package' && <Package className="w-5 h-5 text-[#84CC16]" />}
                {toast.iconType === 'laptop' && <Laptop className="w-5 h-5 text-[#38BDF8]" />}
                {toast.iconType === 'wrench' && <Wrench className="w-5 h-5 text-[#84CC16]" />}
                {toast.iconType === 'clock' && <Clock className="w-5 h-5 text-[#38BDF8]" />}
                {toast.iconType === 'alert' && <AlertTriangle className="w-5 h-5" />}
                {(!toast.iconType || toast.iconType === 'check') && (
                  <CheckCircle2 className={`w-5 h-5 ${isLime ? 'text-[#84CC16]' : 'text-[#38BDF8]'}`} />
                )}
              </div>

              {/* Contenido Textual */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide m-0">
                    {toast.title}
                  </h4>
                  {toast.badge && (
                    <span
                      className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold uppercase tracking-wider bg-lime-500/20 text-[#84CC16] border border-lime-400/40"
                    >
                      {toast.badge}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-slate-300 leading-snug m-0">
                  {toast.message}
                </p>
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* MODAL DE CONFIRMACIÓN PREVIA PARA DAR DE BAJA / ACCIÓN CRÍTICA */}
      {/* ============================================================== */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(11, 19, 43, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={confirmModal.onCancel}
        >
          <div
            className="relative w-full max-w-md bg-[#0B132B] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100"
            style={{
              backgroundColor: 'var(--surface-modal, #0B132B)',
              border: '1px solid var(--line, #334155)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera con Ícono Institucional */}
            <div className="flex items-center gap-3.5 mb-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmModal.isDanger !== false
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {confirmModal.isDanger !== false ? (
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                )}
              </div>
              <div>
                <span
                  className={`text-[11px] font-mono font-bold tracking-wider uppercase block ${
                    confirmModal.isDanger !== false ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {confirmModal.isDanger !== false ? 'Acción Crítica Institucional' : 'Confirmación Operativa'}
                </span>
                <h3 className="text-base font-bold text-white m-0 leading-snug">
                  {confirmModal.title}
                </h3>
              </div>
            </div>

            {/* Mensaje descriptivo */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
              {confirmModal.message}
            </p>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={confirmModal.onCancel}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-800/80 transition-all cursor-pointer"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--line, #334155)',
                  color: 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                }}
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer shadow-md flex items-center gap-1.5 ${
                  confirmModal.isDanger !== false
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-[#84CC16] hover:bg-[#65A30D] !text-slate-950 font-bold shadow-lime-500/20'
                }`}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  backgroundColor: confirmModal.isDanger !== false ? '#e11d48' : '#84CC16',
                  color: confirmModal.isDanger !== false ? '#ffffff' : '#020617',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {confirmModal.isDanger !== false ? <span>✕</span> : <span>✓</span>} {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider');
  }
  return context;
}

export default ToastProvider;
