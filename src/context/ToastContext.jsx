import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowDownToLine,
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
      subtitle,
      message = '',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      isDanger = true,
      icon,
      onConfirm,
    }) => {
      setConfirmModal({
        isOpen: true,
        title,
        subtitle,
        message,
        confirmText,
        cancelText,
        isDanger,
        icon,
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

  // Helper específico para Devolución / Retorno a Bodega Institucional
  const showConfirmRetorno = useCallback(
    ({ nombreEquipo, placa, onConfirm }) => {
      showConfirmAction({
        title: '¿Confirmar Retorno a Bodega?',
        subtitle: 'Confirmación Operativa',
        message: (
          <>
            ¿Deseas confirmar la recepción y retorno a bodega de{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {nombreEquipo || 'Equipo'} {placa ? `(${placa})` : ''}
            </strong>
            ? Esta acción actualizará el estado del activo a{' '}
            <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-300 ml-1">
              Disponible
            </span>{' '}
            en el inventario institucional.
          </>
        ),
        confirmText: 'Confirmar Retorno',
        cancelText: 'Cancelar',
        isDanger: false,
        icon: 'return',
        onConfirm,
      });
    },
    [showConfirmAction]
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
        showConfirmRetorno,
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
      {/* MODAL DE CONFIRMACIÓN INSTITUCIONAL                            */}
      {/* ============================================================== */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={confirmModal.onCancel}
        >
          <div
            className="bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
              borderRadius: '16px',
              maxWidth: '28rem',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera y Cuerpo (Header & Content) */}
            <div className="pt-6 px-6">
              {/* Icono superior destacado */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  confirmModal.isDanger !== false
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : 'bg-lime-100 dark:bg-lime-950/40 text-lime-600 dark:text-lime-400'
                }`}
              >
                {confirmModal.isDanger !== false ? (
                  <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                ) : confirmModal.icon === 'return' ? (
                  <ArrowDownToLine className="w-6 h-6 text-lime-600 dark:text-lime-400" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-lime-600 dark:text-lime-400" />
                )}
              </div>

              {/* Subtítulo o categoría */}
              <span
                className={`text-xs uppercase font-bold tracking-wider block text-center ${
                  confirmModal.isDanger !== false
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-lime-600 dark:text-lime-400'
                }`}
              >
                {confirmModal.subtitle || (confirmModal.isDanger !== false ? 'Acción Crítica Institucional' : 'Confirmación Operativa')}
              </span>

              {/* Título principal */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center mt-1">
                {confirmModal.title}
              </h3>

              {/* Texto explicativo */}
              <div className="text-sm text-slate-600 dark:text-slate-300 text-center mt-2 px-4 leading-relaxed">
                {confirmModal.message}
              </div>
            </div>

            {/* Pie y Botones de Acción (Footer) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={confirmModal.onCancel}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2 cursor-pointer ${
                  confirmModal.isDanger !== false
                    ? 'text-white bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'text-slate-950 bg-[#84CC16] hover:bg-[#65A30D]'
                }`}
              >
                {confirmModal.isDanger !== false ? (
                  <span>✕</span>
                ) : (
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                )}
                <span>{confirmModal.confirmText}</span>
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
