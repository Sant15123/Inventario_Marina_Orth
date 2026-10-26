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
  UserX,
  ShieldAlert,
  Trash2,
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

  const showSuccess = useCallback(
    (title, message) => {
      return addToast({
        type: 'success',
        iconType: 'check',
        title: title || 'Operación Exitosa',
        message: message || title || 'Acción completada con éxito.',
        duration: 4000,
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
        showSuccess,
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
      {/* MODAL INSTITUCIONAL DE CONFIRMACIÓN DE ACCIÓN / BAJA           */}
      {/* ============================================================== */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '16px',
          }}
          onClick={confirmModal.onCancel}
        >
          <div
            className="rounded-2xl border flex flex-col max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{
              borderRadius: '18px',
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: 'var(--surface, #0f172a)',
              borderColor: 'var(--line-strong, #1e293b)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--line, rgba(255, 255, 255, 0.05))',
              overflow: 'hidden',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Institucional Fija con Icono Temático y Botón X */}
            <div
              className="flex items-center justify-between border-b"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--line, #1e293b)',
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      confirmModal.isDanger !== false
                        ? 'rgba(244, 63, 94, 0.14)'
                        : 'rgba(132, 204, 22, 0.15)',
                    border:
                      confirmModal.isDanger !== false
                        ? '1px solid rgba(244, 63, 94, 0.35)'
                        : '1px solid rgba(132, 204, 22, 0.35)',
                    color:
                      confirmModal.isDanger !== false ? 'var(--red, #f43f5e)' : '#84CC16',
                    flexShrink: 0,
                  }}
                >
                  {confirmModal.icon === 'user-x' ? (
                    <UserX size={18} strokeWidth={2.2} />
                  ) : confirmModal.icon === 'trash' ? (
                    <Trash2 size={18} strokeWidth={2.2} />
                  ) : confirmModal.icon === 'return' ? (
                    <ArrowDownToLine size={18} strokeWidth={2.2} />
                  ) : confirmModal.isDanger !== false ? (
                    <ShieldAlert size={18} strokeWidth={2.2} />
                  ) : (
                    <CheckCircle2 size={18} strokeWidth={2.2} />
                  )}
                </div>
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--text, #f8fafc)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {confirmModal.title}
                  </h4>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color:
                        confirmModal.isDanger !== false
                          ? 'var(--red, #f43f5e)'
                          : 'var(--copper, #84CC16)',
                      marginTop: '2px',
                    }}
                  >
                    {confirmModal.subtitle ||
                      (confirmModal.isDanger !== false
                        ? 'Acción Crítica Institucional'
                        : 'Confirmación Operativa')}
                  </span>
                </div>
              </div>

              {/* Botón de cierre X idéntico a los demás modales */}
              <button
                type="button"
                onClick={confirmModal.onCancel}
                className="close-btn"
                aria-label="Cerrar modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Mensaje Explicativo */}
            <div
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {confirmModal.isDanger !== false && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.22)',
                  }}
                >
                  <AlertTriangle
                    size={16}
                    style={{ color: 'var(--red, #f43f5e)', marginTop: '2px', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      lineHeight: '1.45',
                      color: 'var(--text-dim, #cbd5e1)',
                    }}
                  >
                    Esta operación modificará los accesos y registros del sistema SIGA. Asegúrate de verificar antes de proceder.
                  </span>
                </div>
              )}

              <div
                style={{
                  fontSize: '13.5px',
                  lineHeight: '1.55',
                  color: 'var(--text, #f1f5f9)',
                }}
              >
                {confirmModal.message}
              </div>
            </div>

            {/* Pie y Botones de Acción (Footer idéntico a modales SIGA) */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--line, #1e293b)',
                backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={confirmModal.onCancel}
                className="btn ghost"
                style={{
                  padding: '7px 15px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '10px',
                }}
              >
                {confirmModal.cancelText}
              </button>

              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="btn"
                style={{
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  ...(confirmModal.isDanger !== false
                    ? {
                        backgroundColor: 'var(--red, #e11d48)',
                        borderColor: 'var(--red, #e11d48)',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                      }
                    : {
                        backgroundColor: '#84CC16',
                        borderColor: '#84CC16',
                        color: '#0f172a',
                        boxShadow: '0 4px 12px rgba(132, 204, 22, 0.25)',
                      }),
                }}
              >
                {confirmModal.isDanger !== false ? (
                  <UserX size={15} strokeWidth={2.2} />
                ) : (
                  <Check size={15} strokeWidth={2.5} />
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
