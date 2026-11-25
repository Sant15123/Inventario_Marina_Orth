import FmoBrandLogo from '../common/FmoBrandLogo';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Box,
  HandCoins,
  History,
  Users,
  Laptop,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar Component
 * Proporciona el branding institucional "Marina Orth Foundation - Robótica"
 * y la navegación según el rol del usuario autenticado (incluyendo el módulo de Usuarios para Administradores).
 */
export default function Sidebar({ currentView, onViewChange }) {
  const { currentUser, isAdmin, isSupervisor, isUsuario, isCoordinador } = useAuth();

  // Elementos de navegación según el rol
  const navItems = isUsuario
    ? [
        {
          id: 'mi-panel',
          label: 'Mis Asignaciones',
          icon: <Laptop className="w-4 h-4" />,
        },
        {
          id: 'historial',
          label: 'Historial Personal',
          icon: <History className="w-4 h-4" />,
        },
      ]
    : isCoordinador
    ? [
        {
          id: 'resumen',
          label: 'Resumen',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'compras',
          label: 'Gestión de Compras',
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        {
          id: 'inventario',
          label: 'Inventario',
          icon: <Box className="w-4 h-4" />,
        },
        {
          id: 'historial',
          label: 'Historial',
          icon: <History className="w-4 h-4" />,
        },
      ]
    : [
        {
          id: 'resumen',
          label: 'Resumen',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'inventario',
          label: 'Inventario',
          icon: <Box className="w-4 h-4" />,
        },
        {
          id: 'prestamos',
          label: 'Préstamos y entregas',
          icon: <HandCoins className="w-4 h-4" />,
        },
        ...(isAdmin
          ? [
              {
                id: 'compras',
                label: 'Gestión de Compras',
                icon: <ShoppingCart className="w-4 h-4" />,
              },
            ]
          : []),
        {
          id: 'historial',
          label: 'Historial',
          icon: <History className="w-4 h-4" />,
        },
        // Módulo de Usuarios (Visible para Administradores y Supervisores en modo consulta)
        ...((isAdmin || isSupervisor)
          ? [
              {
                id: 'usuarios',
                label: 'Usuarios',
                icon: <Users className="w-4 h-4" />,
              },
            ]
          : []),
      ];

  const navRef = useRef(null);
  const itemRefs = useRef({});
  const hasMountedRef = useRef(false);
  const [pillStyle, setPillStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    ready: false,
  });
  const [enableTransition, setEnableTransition] = useState(false);

  const updatePillPosition = useCallback(() => {
    const activeEl = itemRefs.current[currentView];
    if (!activeEl) return;
    setPillStyle({
      top: activeEl.offsetTop,
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      height: activeEl.offsetHeight,
      ready: true,
    });
  }, [currentView]);

  useLayoutEffect(() => {
    updatePillPosition();

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      const prefersReduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        const rafId = requestAnimationFrame(() => setEnableTransition(true));
        return () => cancelAnimationFrame(rafId);
      }
    }
    return undefined;
  }, [updatePillPosition, currentUser?.rol]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return undefined;

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updatePillPosition();
      });
      observer.observe(navEl);
    }
    window.addEventListener('resize', updatePillPosition);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updatePillPosition);
    };
  }, [updatePillPosition]);

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header p-5">
          <FmoBrandLogo variant="auto" />
        </div>

        <nav
          ref={navRef}
          aria-label="Navegación principal"
          className="relative"
          style={{ marginTop: '20px', position: 'relative' }}
        >
          {pillStyle.ready && (
            <div
              aria-hidden="true"
              className={`sidebar-sliding-pill pointer-events-none z-0 ${
                enableTransition
                  ? 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  : ''
              }`}
              style={{
                position: 'absolute',
                top: `${pillStyle.top}px`,
                left: `${pillStyle.left}px`,
                width: `${pillStyle.width}px`,
                height: `${pillStyle.height}px`,
                borderRadius: 'var(--radius, 12px)',
                backgroundColor: '#abd037',
                boxShadow: '0 2px 10px rgba(171, 208, 55, 0.3)',
                transition: enableTransition
                  ? 'top 300ms cubic-bezier(0.22, 1, 0.36, 1), left 300ms cubic-bezier(0.22, 1, 0.36, 1), width 300ms cubic-bezier(0.22, 1, 0.36, 1), height 300ms cubic-bezier(0.22, 1, 0.36, 1)'
                  : 'none',
              }}
            />
          )}

          <ul className="nav-menu">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    ref={(el) => {
                      itemRefs.current[item.id] = el;
                    }}
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    className={`nav-item-btn group relative z-10 w-fit transition-colors duration-200 ${
                      isActive
                        ? 'active text-[#013a52] font-bold dark:text-[#013a52]'
                        : 'text-[#6d6e71] hover:text-[#013a52] dark:text-slate-300 dark:hover:text-[#abd037]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    style={isActive ? { color: '#013a52' } : {}}
                  >
                    <span
                      className={`dot transition-colors duration-200 ${
                        isActive
                          ? 'bg-[#013a52]'
                          : 'bg-slate-300 dark:bg-[#6d6e71]/40 group-hover:bg-[#013a52]'
                      }`}
                      style={isActive ? { backgroundColor: '#013a52' } : {}}
                      aria-hidden="true"
                    ></span>
                    <span
                      className={`nav-icon transition-colors duration-200 ${
                        isActive
                          ? 'text-[#013a52]'
                          : 'text-[#6d6e71] group-hover:text-[#013a52] dark:text-slate-400 dark:group-hover:text-[#abd037]'
                      }`}
                      style={isActive ? { color: '#013a52' } : {}}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className={`transition-colors duration-200 ${isActive ? 'text-[#013a52] font-bold' : ''}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
          Rol activo: <strong style={{ color: '#abd037', textTransform: 'capitalize' }}>{currentUser?.rol}</strong>
        </div>
        <p>Sistema Interno de Inventario</p>
        <p style={{ marginTop: '2px', opacity: 0.7 }}>v2.0 • React + Vite</p>
      </div>
    </aside>
  );
}
