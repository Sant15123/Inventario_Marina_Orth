import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView({ theme = 'light', onToggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, currentUser, authLoading } = useAuth();

  // El tema se rige directamente por la propiedad activa
  const isDark = theme === 'dark';

  // Si ya está autenticado, redirigir al panel correspondiente
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, location]);

  // Manejador robusto para alternar tema
  const handleToggleTheme = () => {
    if (typeof onToggleTheme === 'function') {
      onToggleTheme();
    } else {
      const newTheme = isDark ? 'light' : 'dark';
      const root = document.documentElement;
      root.setAttribute('data-theme', newTheme);
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('siga_theme', newTheme);
      localStorage.setItem('marina_orth_theme', newTheme);
    }
  };

  // Estados del formulario
  const [identificador, setIdentificador] = useState(() => {
    try {
      return localStorage.getItem('siga_remember_user') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordar, setRecordar] = useState(() => {
    try {
      return !!localStorage.getItem('siga_remember_user');
    } catch {
      return false;
    }
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Manejador de inicio de sesión
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setCargando(true);

    try {
      const result = await login({
        identifier: identificador,
        password,
        remember: recordar,
      });

      if (result?.success) {
        showInfo(
          '¡Bienvenido a SIGA!',
          `Sesión iniciada como ${result.user.nombre} (${result.user.rol.toUpperCase()}).`
        );
        const from = location.state?.from?.pathname || (result.user.rol === 'usuario' ? '/mi-panel' : '/');
        navigate(from, { replace: true });
      }
    } catch (err) {
      // Soporte para credenciales demo locales (Fallback offline/demo)
      const cleanId = String(identificador || '').trim().toLowerCase();
      if (USUARIOS_DEMO && USUARIOS_DEMO[cleanId]) {
        const fallbackUser = USUARIOS_DEMO[cleanId];
        if (typeof loginSimulado === 'function') {
          loginSimulado(fallbackUser);
        }
        showInfo(
          'Acceso Demo (Simulado)',
          `Sesión iniciada como ${fallbackUser.nombre} (${fallbackUser.rol.toUpperCase()}).`
        );
        const from = location.state?.from?.pathname || (fallbackUser.rol === 'usuario' ? '/mi-panel' : '/');
        navigate(from, { replace: true });
        return;
      }
      setErrorMsg(err.message || 'Error al validar credenciales. Por favor intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="login-page-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem 2.5rem 1rem',
        boxSizing: 'border-box',
        backgroundColor: isDark ? '#0B132B' : '#F1F5F9',
        fontFamily: 'var(--font-sans)',
        transition: 'background-color 0.2s ease',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Botón flotante superior derecho de Modo Claro / Modo Oscuro */}
      <button
        type="button"
        onClick={handleToggleTheme}
        className="theme-toggle-floating-btn"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          border: isDark ? '1px solid #334155' : '1px solid #CBD5E1',
          color: isDark ? '#F8FAFC' : '#0F172A',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.15s ease',
        }}
        title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        aria-label="Alternar tema visual"
      >
        {isDark ? (
          <>
            <Sun className="w-4 h-4" style={{ width: '16px', height: '16px', color: '#84CC16' }} />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4" style={{ width: '16px', height: '16px', color: '#475569' }} />
            <span>Modo Oscuro</span>
          </>
        )}
      </button>

      {/* Tarjeta Principal (Card de Login) */}
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '28rem',
          margin: 'auto',
          padding: '2rem',
          position: 'relative',
          borderRadius: '1rem',
          boxSizing: 'border-box',
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#1E293B' : '#E2E8F0',
          borderWidth: '1px',
          borderStyle: 'solid',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* Botón de tema adicional dentro de la tarjeta */}
        <button
          type="button"
          onClick={handleToggleTheme}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
            color: isDark ? '#84CC16' : '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          aria-label="Alternar tema visual en tarjeta"
        >
          {isDark ? (
            <Sun className="w-4 h-4" style={{ width: '16px', height: '16px', color: '#84CC16' }} />
          ) : (
            <Moon className="w-4 h-4" style={{ width: '16px', height: '16px', color: '#475569' }} />
          )}
        </button>

        {/* 2. Cabecera y Logo Controlado */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          {/* Limitar estrictamente el tamaño de la imagen */}
          <img
            src="/logo-fmo.png"
            alt="Fundación Marina Orth"
            style={{
              height: '56px',
              maxHeight: '56px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '0.75rem',
              display: 'block',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              marginBottom: '0.25rem',
              display: 'inline-block',
              backgroundColor: isDark ? 'rgba(26, 46, 5, 0.5)' : '#F7FEE7',
              color: isDark ? '#A3E635' : '#65A30D',
              border: isDark ? '1px solid rgba(132, 204, 22, 0.25)' : '1px solid #D9F99D',
            }}
          >
            Portal SIGA
          </span>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              lineHeight: '2rem',
              margin: '0.25rem 0 0 0',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            Iniciar Sesión
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              marginTop: '0.25rem',
              marginBottom: 0,
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            Ingresa tus credenciales oficiales para gestionar activos
          </p>
        </div>

        {/* Alerta de error si falla la validación */}
        {errorMsg && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              fontSize: '0.75rem',
              backgroundColor: isDark ? 'rgba(76, 5, 25, 0.4)' : '#FFF1F2',
              borderColor: isDark ? '#9F1239' : '#FECDD3',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: isDark ? '#FDA4AF' : '#BE123C',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div style={{ lineHeight: '1.4' }}>{errorMsg}</div>
          </div>
        )}

        {/* 3. Formulario con Iconos Integrados Dentro del Input */}
        <form onSubmit={handleSubmit}>
          {/* Campo Usuario / Documento */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '0.375rem',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
            >
              Correo Electrónico o Documento
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  color: isDark ? '#64748B' : '#94A3B8',
                }}
              >
                <Mail className="w-5 h-5" style={{ width: '18px', height: '18px' }} />
              </span>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="ej. santiago.ortiz@fmo.org o 100123456"
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '16px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  fontSize: '0.875rem',
                  borderRadius: '12px',
                  boxSizing: 'border-box',
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  border: isDark ? '1px solid #334155' : '1px solid #CBD5E1',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                required
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '0.375rem',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
            >
              Contraseña
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  color: isDark ? '#64748B' : '#94A3B8',
                }}
              >
                <Lock className="w-5 h-5" style={{ width: '18px', height: '18px' }} />
              </span>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '44px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  fontSize: '0.875rem',
                  borderRadius: '12px',
                  boxSizing: 'border-box',
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  border: isDark ? '1px solid #334155' : '1px solid #CBD5E1',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  paddingRight: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}
                title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                tabIndex={-1}
              >
                {mostrarPassword ? (
                  <EyeOff className="w-5 h-5" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ width: '18px', height: '18px' }} />
                )}
              </button>
            </div>
          </div>

          {/* 4. Checkbox y Enlace Auxiliar en una Sola Línea */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              marginBottom: '1.5rem',
              gap: '0.5rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: isDark ? '#94A3B8' : '#475569',
              }}
            >
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#84CC16', width: '15px', height: '15px' }}
              />
              <span>Recordar sesión</span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: isDark ? '#A3E635' : '#4D7C0F',
                textDecoration: 'underline',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* 5. Botón de Inicio de Sesión Institucional */}
          <button
            type="submit"
            disabled={cargando || authLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              color: '#020617',
              backgroundColor: '#84CC16',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.15s ease',
            }}
          >
            {cargando ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid #020617',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.6s linear infinite',
                  }}
                ></div>
                <span>Validando Sesión JWT...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión Institucional</span>
                <ArrowRight className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal Informativo de Recuperación de Contraseña */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '24rem',
              padding: '1.5rem',
              borderRadius: '1rem',
              position: 'relative',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#1E293B' : '#E2E8F0',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                backgroundColor: isDark ? 'rgba(132, 204, 22, 0.16)' : '#ECFCCB',
                color: '#84CC16',
              }}
            >
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}
            >
              Recuperar Contraseña
            </h3>

            <p
              style={{
                fontSize: '0.75rem',
                lineHeight: '1.25rem',
                marginBottom: '1rem',
                color: isDark ? '#CBD5E1' : '#475569',
              }}
            >
              Para restablecer tus credenciales institucionales, contacta al soporte tecnológico de la
              Fundación Marina Orth o a tu supervisor de sede.
            </p>

            <div
              style={{
                padding: '0.75rem',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                marginBottom: '1.25rem',
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                border: isDark ? '1px solid #334155' : '1px solid #E2E8F0',
              }}
            >
              <p
                style={{ color: isDark ? '#E2E8F0' : '#1E293B', margin: '0 0 4px 0', fontWeight: 600 }}
              >
                Coordinación Tecnológica FMO:
              </p>
              <p
                style={{ color: isDark ? '#94A3B8' : '#64748B', margin: 0 }}
              >
                Correo:{' '}
                <a
                  href="mailto:soporte@fmo.org"
                  style={{ color: '#84CC16', fontWeight: 600, textDecoration: 'underline' }}
                >
                  soporte@fmo.org
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '12px',
                fontWeight: 700,
                color: '#020617',
                backgroundColor: '#84CC16',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
