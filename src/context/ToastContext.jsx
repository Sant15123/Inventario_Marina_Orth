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
  ShieldCheck,
  LogOut,
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
      isCenter = false,
    }) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, type, title, message, badge, iconType, duration, isCenter };

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

  const isSessionToast = useCallback((toast) => {
    if (toast.isCenter) return true;
    const title = String(toast.title || '').toLowerCase();
    return (
      title.includes('sesión') ||
      title.includes('sesion') ||
      title.includes('bienvenido') ||
      title.includes('acceso rápido') ||
      title.includes('acceso rapido') ||
      title.includes('login') ||
      title.includes('logout')
    );
  }, []);

  const showInfo = useCallback(
    (title, message, options = {}) => {
      const isSession =
        String(title || '').toLowerCase().includes('sesión') ||
        String(title || '').toLowerCase().includes('sesion') ||
        String(title || '').toLowerCase().includes('bienvenido') ||
        String(title || '').toLowerCase().includes('acceso rápido') ||
        String(title || '').toLowerCase().includes('acceso rapido') ||
        Boolean(options?.isCenter);

      return addToast({
        type: options?.type || 'info',
        iconType: options?.iconType || (isSession ? 'shield' : 'check'),
        title,
        message,
        isCenter: isSession,
        duration: options?.duration || (isSession ? 3800 : 4500),
      });
    },
    [addToast]
  );

  const showAuthAlert = useCallback(
    ({ title, message, type = 'success', duration = 3800 }) => {
      return addToast({
        type,
        title,
        message,
        duration,
        isCenter: true,
      });
    },
    [addToast]
  );

  const centerToasts = toasts.filter(isSessionToast);
  const cornerToasts = toasts.filter((t) => !isSessionToast(t));

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
        showAuthAlert,
      }}
    >
      {children}

      {/* ============================================================== */}
      {/* ALERTA INSTITUCIONAL EN MITAD DE LA PANTALLA (LOGIN / LOGOUT)  */}
      {/* ============================================================== */}
      {centerToasts.map((toast) => {
        const isLogout =
          String(toast.title || '').toLowerCase().includes('cerrada') ||
          String(toast.title || '').toLowerCase().includes('logout');

        return (
          <div
            key={toast.id}
            className="toast-center-backdrop"
            onClick={() => removeToast(toast.id)}
            role="alert"
            aria-live="assertive"
          >
            <div
              className="toast-center-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar discreto */}
              <button
                type="button"
                className="toast-center-close"
                onClick={() => removeToast(toast.id)}
                title="Cerrar notificación"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Tag / Chip Institucional */}
              <div className="toast-center-chip">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fundación Marina Orth · SIGA</span>
              </div>

              {/* Contenedor del Ícono con Iluminación */}
              <div className={`toast-center-icon-wrap ${isLogout ? 'info' : 'success'}`}>
                {isLogout ? (
                  <LogOut className="w-7 h-7" />
                ) : (
                  <ShieldCheck className="w-7 h-7" />
                )}
              </div>

              {/* Título Principal */}
              <h3 className="toast-center-title">
                {toast.title}
              </h3>

              {/* Mensaje descriptivo */}
              <p className="toast-center-message">
                {toast.message}
              </p>

              {/* Botón Continuar / Entendido */}
              <button
                type="button"
                className="toast-center-btn"
                onClick={() => removeToast(toast.id)}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Continuar</span>
              </button>

              {/* Barra de progreso de auto-cierre */}
              {toast.duration > 0 && (
                <div
                  className="toast-center-progress-bar"
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* ============================================================== */}
      {/* CONTENEDOR FLOTANTE SUPERIOR DERECHO (TOASTS OPERATIVOS)       */}
      {/* ============================================================== */}
      <div className="toast-container-top-right">
        {cornerToasts.map((toast) => {
          const isLime = toast.type === 'success';
          const isInfo = toast.type === 'info';
          const isWarning = toast.type === 'warning';
          const typeClass = isLime ? 'success' : isInfo ? 'info' : isWarning ? 'warning' : 'error';

          return (
            <div
              key={toast.id}
              className={`toast-item ${typeClass}`}
            >
              {/* Ícono Temático */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: isLime
                    ? 'rgba(132, 204, 22, 0.16)'
                    : isInfo
                    ? 'rgba(56, 189, 248, 0.16)'
                    : isWarning
                    ? 'rgba(245, 158, 11, 0.16)'
                    : 'rgba(244, 63, 94, 0.16)',
                  color: isLime
                    ? '#84CC16'
                    : isInfo
                    ? '#38BDF8'
                    : isWarning
                    ? '#FBBF24'
                    : '#FB7185',
                }}
              >
                {toast.iconType === 'pencil' && <Pencil className="w-4 h-4" />}
                {toast.iconType === 'package' && <Package className="w-4 h-4" />}
                {toast.iconType === 'laptop' && <Laptop className="w-4 h-4" />}
                {toast.iconType === 'wrench' && <Wrench className="w-4 h-4" />}
                {toast.iconType === 'clock' && <Clock className="w-4 h-4" />}
                {toast.iconType === 'alert' && <AlertTriangle className="w-4 h-4" />}
                {(!toast.iconType || toast.iconType === 'check' || toast.iconType === 'shield') && (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>

              {/* Contenido Textual */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, lineHeight: 1.2 }}>
                    {toast.title}
                  </h4>
                  {toast.badge && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        backgroundColor: 'rgba(132, 204, 22, 0.18)',
                        color: '#84CC16',
                        border: '1px solid rgba(132, 204, 22, 0.4)',
                      }}
                    >
                      {toast.badge}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.4, opacity: 0.85 }}>
                  {toast.message}
                </p>
              </div>

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  opacity: 0.6,
                  cursor: 'pointer',
                  padding: '3px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
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
