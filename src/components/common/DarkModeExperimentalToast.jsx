import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Sun, X } from 'lucide-react';

const AUTO_CLOSE_MS = 5500;
const EXIT_ANIMATION_MS = 220;

/**
 * DarkModeExperimentalToast: Notificación flotante institucional en tipografía Poppins
 * que avisa al usuario cuando cambia de Modo Claro a Modo Oscuro que la vista está en fase experimental.
 * Incluye autocierre (pausable al pasar el cursor), botón de cierre manual y opción rápida para volver a Modo Claro.
 */
export default function DarkModeExperimentalToast({
  open = false,
  onClose,
  onRevertToLight,
}) {
  const [rendered, setRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  const autoCloseTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const remainingRef = useRef(AUTO_CLOSE_MS);
  const startedAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const triggerClose = useCallback(() => {
    clearTimers();
    setIsClosing(true);
    exitTimerRef.current = setTimeout(() => {
      setRendered(false);
      setIsClosing(false);
      if (typeof onClose === 'function') {
        onClose();
      }
    }, EXIT_ANIMATION_MS);
  }, [clearTimers, onClose]);

  const startAutoCloseTimer = useCallback((duration) => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    startedAtRef.current = Date.now();
    remainingRef.current = duration;
    autoCloseTimerRef.current = setTimeout(() => {
      triggerClose();
    }, duration);
  }, [triggerClose]);

  useEffect(() => {
    clearTimers();
    if (open) {
      setRendered(true);
      setIsClosing(false);
      startAutoCloseTimer(AUTO_CLOSE_MS);
    } else if (rendered) {
      setIsClosing(true);
      exitTimerRef.current = setTimeout(() => {
        setRendered(false);
        setIsClosing(false);
      }, EXIT_ANIMATION_MS);
    }

    return () => {
      clearTimers();
    };
  }, [open, clearTimers, startAutoCloseTimer]);

  const handleMouseEnter = () => {
    if (!open || isClosing) return;
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
      const elapsed = Date.now() - startedAtRef.current;
      remainingRef.current = Math.max(800, remainingRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    if (!open || isClosing) return;
    startAutoCloseTimer(remainingRef.current);
  };

  if (!rendered) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`darkmode-exp-toast fixed bottom-5 right-5 z-50 max-w-sm bg-[#012A3C] border border-amber-500/50 shadow-xl font-['Poppins',sans-serif] ${
        isClosing ? 'darkmode-exp-toast--exit' : 'darkmode-exp-toast--enter'
      }`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div className="darkmode-exp-toast-icon" aria-hidden="true">
          <AlertTriangle size={18} className="text-amber-400" strokeWidth={2.2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <h4 className="darkmode-exp-toast-title text-sm font-semibold text-white">
              Modo Oscuro en fase experimental
            </h4>
            <button
              type="button"
              onClick={triggerClose}
              className="darkmode-exp-toast-close"
              aria-label="Cerrar notificación"
              title="Cerrar"
            >
              <X size={15} />
            </button>
          </div>

          <p className="darkmode-exp-toast-msg text-xs text-slate-300 mt-0.5 leading-relaxed">
            Esta vista aún se encuentra en desarrollo y podría presentar fallas visuales o problemas de contraste en algunos módulos.
          </p>

          {typeof onRevertToLight === 'function' && (
            <button
              type="button"
              onClick={() => {
                clearTimers();
                setRendered(false);
                setIsClosing(false);
                onRevertToLight();
              }}
              className="darkmode-exp-toast-revert"
            >
              <Sun size={12} />
              <span>Volver a Modo Claro</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
