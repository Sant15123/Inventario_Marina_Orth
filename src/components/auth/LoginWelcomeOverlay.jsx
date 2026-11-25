import React, { useEffect, useRef, useState } from 'react';

const SPLASH_IMAGES = [
  'https://maaggiefwtdtwhzmazau.supabase.co/storage/v1/object/public/splash-fmo/images%20(1).jpg',
  'https://maaggiefwtdtwhzmazau.supabase.co/storage/v1/object/public/splash-fmo/images%20(2).jpg',
  'https://maaggiefwtdtwhzmazau.supabase.co/storage/v1/object/public/splash-fmo/images.jpg',
];

const ROLE_LABELS = {
  administrador: 'Administrador',
  admin: 'Administrador',
  coordinador: 'Coordinador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  usuario: 'Usuario',
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
  const [bgImage] = useState(
    () => SPLASH_IMAGES[Math.floor(Math.random() * SPLASH_IMAGES.length)]
  );
  const [bgError, setBgError] = useState(false);

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
    }, 2220);

    const finishTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem('siga_welcome_transition');
      } catch {
        // Ignore storage error
      }
      setVisible(false);
      if (typeof onCompleteRef.current === 'function') onCompleteRef.current();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [visible]);

  if (!visible || !user) return null;

  const isDark = theme === 'dark';
  const displayName = user.nombre_completo || user.nombre || user.name || 'Usuario FMO';
  const rawCargo = String(user.cargo || user.cargo_operativo || '').trim();
  const rawRole = String(user.rol || user.role || 'usuario').toLowerCase().trim();
  const roleFallback =
    ROLE_LABELS[rawRole] || (rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1) : 'Usuario');
  const badgeLabel = rawCargo || roleFallback;

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
        transition: 'opacity 280ms ease-out',
        pointerEvents: fadingOut ? 'none' : 'all',
        fontFamily: "'Poppins', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Fotografía oficial FMO de fondo con velo institucional */}
      {!bgError && bgImage && (
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          onError={() => setBgError(true)}
          className="animate-welcome-bg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(135deg, rgba(8, 17, 32, 0.86) 0%, rgba(1, 58, 82, 0.80) 100%)'
            : 'linear-gradient(135deg, rgba(1, 58, 82, 0.82) 0%, rgba(11, 19, 43, 0.84) 100%)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
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
            {badgeLabel}
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
