import { createClient } from '@supabase/supabase-js';
import { validateActiveSession, forceLogout, registerSignOutHandler } from './sessionManager';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://maaggiefwtdtwhzmazau.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWdnaWVmd3RkdHdoem1hemF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.signature';

/**
 * Interceptor global de fetch para peticiones Supabase
 * - Bloquea modificaciones si la sesión está caducada
 * - Intercepta respuestas 401 y errores de JWT expirado (PGRST301)
 */
const customSupabaseFetch = async (url, options = {}) => {
  const method = (options?.method || 'GET').toUpperCase();
  const isModifying = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // 1. Bloqueo inmediato de mutaciones si la sesión caducó
  if (isModifying) {
    const sessionCheck = validateActiveSession();
    if (!sessionCheck.isValid) {
      forceLogout(sessionCheck.message);
      throw new Error(`Operación bloqueada (${method}): Sesión caducada por inactividad o token vencido.`);
    }
  }

  const res = await fetch(url, options);

  // 2. Interceptar respuesta 401 Unauthorized
  if (res.status === 401) {
    forceLogout('Tu sesión ha expirado en la base de datos (401 Unauthorized). Inicia sesión nuevamente.');
    return res;
  }

  // 3. Interceptar errores de token expirado en respuestas fallidas (ej. PGRST301)
  if (!res.ok) {
    try {
      const clone = res.clone();
      const text = await clone.text().catch(() => '');
      if (
        text.includes('PGRST301') ||
        text.toLowerCase().includes('jwt expired') ||
        text.toLowerCase().includes('token is expired') ||
        text.toLowerCase().includes('invalid claim')
      ) {
        forceLogout('Tu sesión ha expirado en la base de datos (JWT vencido). Inicia sesión nuevamente.');
      }
    } catch (_) {}
  }

  return res;
};

/**
 * Cliente frontend de Supabase para consultas directas y suscripciones Realtime
 * a la base de datos institucional.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: customSupabaseFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Registrar manejador de signOut para sessionManager
registerSignOutHandler(async () => {
  try {
    if (supabase && supabase.auth && typeof supabase.auth.signOut === 'function') {
      await supabase.auth.signOut().catch(() => {});
    }
  } catch (_) {}
});

// Escuchar cambios de estado de autenticación en Supabase
try {
  if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        const token = typeof window !== 'undefined' ? localStorage.getItem('siga_token') : null;
        if (token) {
          forceLogout('Sesión cerrada en el servidor de autenticación.');
        }
      }
    });
  }
} catch (_) {}

export default supabase;
