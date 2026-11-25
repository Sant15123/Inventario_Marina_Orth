import React, { useEffect, useRef, useState } from 'react';

const ROLE_LABELS = {
  administrador: 'Administrador',
  admin: 'Administrador',
  coordinador: 'Coordinador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  usuario: 'Docente / Formador',
};

const checkReducedMotion = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
};

export default function LoginWelcomeOverlay({
  user,
  theme = 'light',
  onFadeStart,
  onComplete,
}) {
  const [visible, setVisible] = useState(() => {
    try {
      if (checkReducedMotion()) {
        sessionStorage.removeItem('siga_welcome_transition');
        return false;
      }
      return sessionStorage.getItem('siga_welcome_transition') === '1';
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  const onFadeStartRef = useRef(onFadeStart);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onFadeStartRef.current = onFadeStart;
    onCompleteRef.current = onComplete;
  }, [onFadeStart, onComplete]);

  useEffect(() => {
    if (!visible) return undefined;

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
      if (typeof onFadeStartRef.current === 'function') onFadeStartRef.current();
    }, 850);

    const finishTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem('siga_welcome_transition');
      } catch {
        // Ignore storage error
      }
      setVisible(false);
      if (typeof onCompleteRef.current === 'function') onCompleteRef.current();
    }, 1070);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [visible]);

  if (!visible || !user) return null;

  const isDark = theme === 'dark';
  const displayName = user.nombre_completo || user.nombre || user.name || 'Usuario FMO';
  const rawRole = String(user.rol || user.role || 'usuario').toLowerCase().trim();
  const roleLabel = ROLE_LABELS[rawRole] || (rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1) : 'Usuario');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Bienvenido, ${displayName}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: isDark ? '#081120' : '#013A52',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 220ms ease-out',
        pointerEvents: fadingOut ? 'none' : 'all',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          gap: '14px',
        }}
      >
        <div
          className="animate-welcome-logo"
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            padding: '4px',
            backgroundColor: 'rgba(171, 208, 55, 0.14)',
            border: '2px solid rgba(171, 208, 55, 0.5)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="/logo-fmo.png"
            alt="Fundación Marina Orth"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '50%',
            }}
          />
        </div>

        <div className="animate-welcome-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
            }}
          >
            Bienvenido, {displayName}
          </h2>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.03em',
              backgroundColor: 'rgba(171, 208, 55, 0.16)',
              color: '#ABD037',
              border: '1px solid rgba(171, 208, 55, 0.4)',
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Barra de progreso delgada animada en verde lima (#ABD037) */}
        <div
          style={{
            width: '220px',
            height: '4px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            overflow: 'hidden',
            marginTop: '6px',
          }}
        >
          <div
            className="animate-welcome-progress"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '9999px',
              backgroundColor: '#ABD037',
            }}
          />
        </div>
      </div>
    </div>
  );
}
