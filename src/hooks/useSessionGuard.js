/**
 * useSessionGuard.js - Hook React para inicializar el observador de sesión institucional
 * Sistema Integrado de Gestión de Activos (SIGA) - Fundación Marina Orth
 */

import { useEffect } from 'react';
import { initSessionGuard, validateActiveSession, forceLogout } from '../services/sessionManager';

export function useSessionGuard() {
  useEffect(() => {
    const cleanup = initSessionGuard();
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  return { validateActiveSession, forceLogout };
}

export default useSessionGuard;
