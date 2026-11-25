/**
 * sessionManager.js - Control Estricto de Inactividad (1 Hora) y Cierre Automático por Sesión/Token Caducado
 * Sistema Integrado de Gestión de Activos (SIGA) - Fundación Marina Orth
 */

import { decodeToken, generateToken } from './jwtService.js';

// Constantes de configuración de seguridad
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 Hora = 3,600,000 ms
export const ACTIVITY_THROTTLE_MS = 15 * 1000; // 15 Segundos de throttle para no saturar localStorage
export const MOUSEMOVE_THROTTLE_MS = 2 * 1000; // 2 Segundos de throttle para eventos mousemove
export const CHECK_INTERVAL_MS = 60 * 1000; // Chequeo periódico cada 60 Segundos

export const STORAGE_KEYS = {
  TOKEN: 'siga_token',
  CURRENT_USER: 'siga_current_user',
  USER: 'siga_user',
  LAST_ACTIVITY: 'last_activity_at',
  LEGACY_LAST_ACTIVITY: 'siga_last_activity',
  SESSION_EXPIRED: 'siga_session_expired',
  SESSION_EXPIRED_REASON: 'siga_session_expired_reason',
  LOGOUT_REASON: 'logout_reason',
  REMEMBER_USER: 'siga_remember_user',
};

export const DEFAULT_EXPIRED_MESSAGE =
  'Tu sesión ha expirado por inactividad o token vencido. Inicia sesión nuevamente para continuar.';

// Estado interno en memoria
let lastRecordedActivityTime = 0;
let isLoggingOut = false;
let externalSignOutHandler = null;
const logoutListeners = new Set();

/**
 * Registra un manejador para cerrar sesión en Supabase u otros servicios externos
 */
export function registerSignOutHandler(handler) {
  externalSignOutHandler = handler;
}

/**
 * Registra una función listener que se ejecutará cuando ocurra un forceLogout
 */
export function onForceLogout(callback) {
  logoutListeners.add(callback);
  return () => {
    logoutListeners.delete(callback);
  };
}

/**
 * Registra actividad del usuario en localStorage con throttle
 * @param {boolean} force - Si es true, omite el throttle y guarda inmediatamente
 */
export function recordActivity(force = false) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (force || now - lastRecordedActivityTime >= ACTIVITY_THROTTLE_MS) {
    lastRecordedActivityTime = now;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(now));
      localStorage.setItem(STORAGE_KEYS.LEGACY_LAST_ACTIVITY, String(now));

      // Renovar silenciosamente el JWT si está próximo a vencer mientras el usuario sigue activo
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        const decoded = decodeToken(token);
        const nowSec = Math.floor(now / 1000);
        if (decoded && decoded.exp && decoded.exp > nowSec && decoded.exp - nowSec < 2 * 60 * 60) {
          const refreshed = generateToken(decoded);
          localStorage.setItem(STORAGE_KEYS.TOKEN, refreshed);
        }
      }
    } catch (_) {}
  }
}

/**
 * Obtiene la marca de tiempo de la última actividad registrada
 * @returns {number}
 */
export function getLastActivity() {
  if (typeof window === 'undefined') return 0;
  try {
    const saved =
      localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) ||
      localStorage.getItem(STORAGE_KEYS.LEGACY_LAST_ACTIVITY);
    if (!saved) return 0;
    const parsed = Number(saved);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

/**
 * Determina si la sesión actual ha caducado por superar 1 hora de inactividad
 * @returns {boolean}
 */
export function isSessionExpiredByInactivity() {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) return false;

  const lastActivity = getLastActivity();
  if (!lastActivity) {
    // Si hay token pero no se había registrado actividad, inicializarla
    recordActivity(true);
    return false;
  }

  const now = Date.now();
  return now - lastActivity >= INACTIVITY_TIMEOUT_MS;
}

/**
 * Valida integralmente si la sesión activa es válida:
 * 1. Que no se haya superado el límite de 2 horas de inactividad.
 * 2. Que exista una sesión/token válido y no expirado en su campo 'exp'.
 * @returns {{ isValid: boolean, reason: string | null, message: string }}
 */
export function validateActiveSession() {
  if (typeof window === 'undefined') {
    return { isValid: true, reason: null, message: '' };
  }

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    return {
      isValid: false,
      reason: 'no_token',
      message: 'No hay sesión activa.',
    };
  }

  // 1. Control de inactividad real de 2 horas (7,200,000 ms)
  if (isSessionExpiredByInactivity()) {
    return {
      isValid: false,
      reason: 'inactivity',
      message: 'inactividad',
    };
  }

  // 2. Control de expiración del token JWT (campo exp)
  try {
    const payload = decodeToken(token);
    if (!payload) {
      return {
        isValid: false,
        reason: 'invalid_token',
        message: 'token_caducado',
      };
    }

    if (payload.exp) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) {
        return {
          isValid: false,
          reason: 'token_expired',
          message: 'token_caducado',
        };
      }
    }
  } catch {
    return {
      isValid: false,
      reason: 'token_decode_error',
      message: 'token_caducado',
    };
  }

  return { isValid: true, reason: null, message: '' };
}

/**
 * Cierre forzoso de sesión por inactividad, token caducado o error 401
 * - Limpia tokens y datos de sesión en localStorage y sessionStorage
 * - Guarda el motivo ('inactividad' o 'token_caducado') en sessionStorage para la pantalla de Login
 * - Llama a signOut() en Supabase
 * - Redirige inmediatamente a /login con aviso explicativo
 * @param {string} [motivo]
 */
export async function forceLogout(motivo = DEFAULT_EXPIRED_MESSAGE) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    const finalMsg = motivo || DEFAULT_EXPIRED_MESSAGE;

    // Determinar la causa normalizada ('inactividad' o 'token_caducado')
    let reasonKey = 'token_caducado';
    const strMotivo = String(finalMsg).toLowerCase();
    if (
      strMotivo === 'inactividad' ||
      strMotivo.includes('inactiv') ||
      strMotivo.includes('1 hora') ||
      strMotivo.includes('2 hora') ||
      isSessionExpiredByInactivity()
    ) {
      reasonKey = 'inactividad';
    } else {
      reasonKey = 'token_caducado';
    }

    // 1. Guardar motivo de expiración en sessionStorage para que LoginView muestre el banner persistente
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.LOGOUT_REASON,
        reasonKey === 'inactividad' ? 'inactivity' : 'token_expired'
      );
      sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED_REASON, reasonKey);
      sessionStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED, finalMsg);
    } catch (_) {}

    // 2. Limpiar llaves de autenticación y sesión
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_LAST_ACTIVITY);
    } catch (_) {}

    // 3. Ejecutar signOut externo (Supabase)
    if (typeof externalSignOutHandler === 'function') {
      try {
        await externalSignOutHandler();
      } catch (_) {}
    }

    // 4. Notificar a todos los escuchas registrados (como AuthContext)
    logoutListeners.forEach((listener) => {
      try {
        listener(finalMsg);
      } catch (err) {
        console.warn('Error en listener de forceLogout:', err);
      }
    });

    // 5. Disparar evento global en window
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('siga:session-expired', {
          detail: { motivo: finalMsg },
        })
      );

      // Redirigir a login de manera segura e inmediata si no estamos ya allí
      if (window.location && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  } finally {
    // Permitir futuros cierres si el usuario vuelve a autenticarse
    setTimeout(() => {
      isLoggingOut = false;
    }, 800);
  }
}

/**
 * Inicializa el observador global de inactividad e intercepción de interacciones
 * @returns {Function} Función para remover los event listeners
 */
export function initSessionGuard() {
  if (typeof window === 'undefined') return () => {};

  let lastMouseMoveAt = 0;

  // Intercepción inmediata ante cualquier intento de interacción
  const handleUserActivity = (e) => {
    // Aplicar throttle a mousemove para no afectar rendimiento
    if (e && e.type === 'mousemove') {
      const now = Date.now();
      if (now - lastMouseMoveAt < MOUSEMOVE_THROTTLE_MS) return;
      lastMouseMoveAt = now;
    }

    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    // Si no hay token guardado (pantalla de login o visitante), permitir interacción normal
    if (!token) return;

    // Validar sesión antes de permitir que la acción se ejecute
    const sessionCheck = validateActiveSession();
    if (!sessionCheck.isValid) {
      if (e && e.type !== 'mousemove') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation();
        }
      }
      forceLogout(sessionCheck.message || DEFAULT_EXPIRED_MESSAGE);
      return;
    }

    // Si la sesión sigue vigente, registrar actividad throttled
    recordActivity(false);
  };

  // Eventos de interacción real del usuario con captura en fase capture para interceptar antes
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach((eventType) => {
    window.addEventListener(eventType, handleUserActivity, {
      capture: true,
      passive: eventType === 'mousemove' || eventType === 'scroll',
    });
  });

  // Chequeo periódico cada 60 segundos
  const intervalId = setInterval(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    const sessionCheck = validateActiveSession();
    if (!sessionCheck.isValid) {
      forceLogout(sessionCheck.message || DEFAULT_EXPIRED_MESSAGE);
    }
  }, CHECK_INTERVAL_MS);

  // Validar tiempo transcurrido al volver a enfocar la pestaña o ventana (si estuvo suspendida en segundo plano)
  const handleFocusOrVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return;

    const sessionCheck = validateActiveSession();
    if (!sessionCheck.isValid) {
      forceLogout(sessionCheck.message || DEFAULT_EXPIRED_MESSAGE);
    } else {
      recordActivity(false);
    }
  };
  document.addEventListener('visibilitychange', handleFocusOrVisibility);
  window.addEventListener('focus', handleFocusOrVisibility);

  // Sincronización entre pestañas mediante el evento storage
  const handleStorageChange = (e) => {
    if (e.key === STORAGE_KEYS.TOKEN && !e.newValue) {
      forceLogout('La sesión fue cerrada en otra pestaña.');
    } else if (
      (e.key === STORAGE_KEYS.LAST_ACTIVITY || e.key === STORAGE_KEYS.LEGACY_LAST_ACTIVITY) &&
      e.newValue
    ) {
      const val = Number(e.newValue);
      if (!isNaN(val) && val > lastRecordedActivityTime) {
        lastRecordedActivityTime = val;
      }
    }
  };
  window.addEventListener('storage', handleStorageChange);

  return () => {
    activityEvents.forEach((eventType) => {
      window.removeEventListener(eventType, handleUserActivity, { capture: true });
    });
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    window.removeEventListener('focus', handleFocusOrVisibility);
    window.removeEventListener('storage', handleStorageChange);
  };
}
