import FmoBrandLogo from '../common/FmoBrandLogo';
import React from 'react';
import {
  LayoutDashboard,
  Box,
  HandCoins,
  History,
  Users,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Sidebar Component
 * Proporciona el branding institucional "Marina Orth Foundation - Robótica"
 * y la navegación según el rol del usuario autenticado (incluyendo el módulo de Usuarios para Administradores).
 */
export default function Sidebar({ currentView, onViewChange }) {
  const { currentUser, isAdmin, isSupervisor, isUsuario } = useAuth();

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

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header p-5">
          <FmoBrandLogo variant="auto" />
        </div>

        <nav aria-label="Navegación principal" style={{ marginTop: '20px' }}>
          <ul className="nav-menu">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onViewChange(item.id)}
                    className={`nav-item-btn group ${
                      isActive
                        ? 'active bg-[#abd037] text-[#013a52] font-bold dark:bg-[#abd037] dark:text-[#013a52]'
                        : 'text-[#6d6e71] hover:text-[#013a52] dark:text-slate-300 dark:hover:text-[#abd037]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    style={isActive ? { backgroundColor: '#abd037', color: '#013a52' } : {}}
                  >
                    <span
                      className={`dot ${
                        isActive
                          ? 'bg-[#013a52]'
                          : 'bg-slate-300 dark:bg-[#6d6e71]/40 group-hover:bg-[#013a52]'
                      }`}
                      style={isActive ? { backgroundColor: '#013a52' } : {}}
                      aria-hidden="true"
                    ></span>
                    <span
                      className={`nav-icon ${
                        isActive
                          ? 'text-[#013a52]'
                          : 'text-[#6d6e71] group-hover:text-[#013a52] dark:text-slate-400 dark:group-hover:text-[#abd037]'
                      }`}
                      style={isActive ? { color: '#013a52' } : {}}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className={isActive ? 'text-[#013a52] font-bold' : ''}>{item.label}</span>
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
