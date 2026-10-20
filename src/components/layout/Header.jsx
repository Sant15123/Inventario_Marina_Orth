import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Shield, ChevronDown, Check, UserCheck } from 'lucide-react';

/**
 * Header Component
 * Incluye barra de búsqueda rápida, selector de tema (oscuro/claro),
 * perfil interactivo de usuario con selector de rol y descarga en Excel.
 */
export default function Header({
  searchTerm,
  onSearchChange,
  onExportExcel,
  onSync,
  theme = 'dark',
  onToggleTheme,
}) {
  const isDark = theme === 'dark';
  const { currentUser, usuarios, seleccionarUsuarioActivo, cambiarRolActivo, isUsuario } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estilos de badge de rol
  const getRolBadgeClass = (rol) => {
    switch (rol) {
      case 'administrador':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'supervisor':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'operador':
        return 'bg-lime-100 text-lime-800 dark:bg-lime-950/70 dark:text-[#84CC16] border-lime-300 dark:border-lime-700/60';
      case 'usuario':
      default:
        return 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    }
  };

  return (
    <header className="header-bar">
      <div className="header-search">
        <span className="header-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="search"
          placeholder="Buscar equipo, consumible, código o responsable..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar en el inventario"
        />
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* SELECTOR DE PERFIL Y ROL INTERACTIVO */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="user-profile-btn"
            title="Cambiar usuario o alternar rol para pruebas"
          >
            <div className="user-avatar-circle">
              {currentUser?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="user-profile-info">
              <span className="user-profile-name">
                {currentUser?.nombre}
              </span>
              <span className={`badge-role ${currentUser?.rol || 'usuario'}`}>
                {currentUser?.rol}
              </span>
            </div>
            <ChevronDown className="user-profile-chevron" />
          </button>

          {/* MENÚ DESPLEGABLE DE ROLES Y USUARIOS */}
          {userDropdownOpen && (
            <div className="user-profile-dropdown">
              <div className="user-dropdown-header">
                Cambiar Usuario Activo (Pruebas de Rol)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {usuarios.map((usr) => {
                  const isSelected = usr.id === currentUser?.id;
                  return (
                    <button
                      key={usr.id}
                      type="button"
                      onClick={() => {
                        seleccionarUsuarioActivo(usr);
                        setUserDropdownOpen(false);
                      }}
                      className={`user-dropdown-item ${isSelected ? 'active' : ''}`}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{usr.nombre}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>
                          {usr.cargo || usr.sede}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge-role ${usr.rol || 'usuario'}`}>
                          {usr.rol}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#84CC16]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="user-dropdown-footer">
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', padding: '0 4px 4px 4px', fontWeight: 600 }}>
                  Alternar rol directamente:
                </span>
                <div className="user-role-grid">
                  {['administrador', 'supervisor', 'operador', 'usuario'].map((rolName) => (
                    <button
                      key={rolName}
                      type="button"
                      onClick={() => {
                        cambiarRolActivo(rolName);
                        setUserDropdownOpen(false);
                      }}
                      className={`user-role-btn ${currentUser?.rol === rolName ? 'active' : ''}`}
                    >
                      {rolName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN SINCRONIZAR SUPABASE (Oculto para rol 'usuario') */}
        {onSync && !isUsuario && (
          <button
            type="button"
            onClick={onSync}
            className="btn small ghost"
            style={{
              borderColor: 'var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: '500',
            }}
            title="Sincronizar en tiempo real con Supabase y purgar datos locales obsoletos"
          >
            <span>🔄</span>
            <span>Sincronizar</span>
          </button>
        )}

        {/* SELECTOR DE TEMA CLARO / OSCURO */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ABDE16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4d7c0f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </span>
            <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        )}

        {/* DESCARGA EXCEL (Oculta para rol 'usuario') */}
        {!isUsuario && (
          <button
            type="button"
            onClick={onExportExcel}
            className="btn secondary small"
            title="Descargar reporte consolidado en formato Excel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Excel</span>
          </button>
        )}
      </div>
    </header>
  );
}
