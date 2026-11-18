import React, { useState, useRef, useEffect } from 'react';
import UserAvatar from '../common/UserAvatar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User, ChevronDown, LogOut, KeyRound, ChevronRight, Phone } from 'lucide-react';
import ModalCambiarPassword from '../modals/ModalCambiarPassword';
import ActualizarTelefonoModal from '../modals/ActualizarTelefonoModal';
import NotificationBell from './NotificationBell';

/**
 * Header Component
 * Incluye barra de búsqueda rápida, selector de tema (oscuro/claro),
 * perfil interactivo de usuario con selector de rol, opción de cerrar sesión y descarga en Excel.
 */
export default function Header({
  searchTerm,
  onSearchChange,
  placeholder = 'Buscar equipo, consumible, código o responsable...',
  onExportExcel,
  onSync,
  theme = 'dark',
  onToggleTheme,
  onNavigate,
}) {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const { currentUser, usuarios, logout, isUsuario, isSupervisor } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [modalTelefonoAbierto, setModalTelefonoAbierto] = useState(false);
  const dropdownRef = useRef(null);

  // Resolver foto de perfil activa considerando tanto currentUser como el catálogo reactivo de usuarios
  const userAvatarUrl =
    currentUser?.avatar_url ||
    currentUser?.avatarUrl ||
    currentUser?.foto_perfil ||
    usuarios?.find(
      (u) =>
        (currentUser?.id && String(u.id) === String(currentUser.id)) ||
        (currentUser?.documento && String(u.documento) === String(currentUser.documento)) ||
        (currentUser?.email && String(u.email).toLowerCase() === String(currentUser.email).toLowerCase())
    )?.avatar_url ||
    usuarios?.find(
      (u) =>
        (currentUser?.id && String(u.id) === String(currentUser.id)) ||
        (currentUser?.documento && String(u.documento) === String(currentUser.documento)) ||
        (currentUser?.email && String(u.email).toLowerCase() === String(currentUser.email).toLowerCase())
    )?.avatarUrl ||
    null;

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
    navigate('/login', { replace: true });
    showInfo('Sesión Cerrada', 'Has cerrado tu sesión institucional de manera segura.');
  };

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
    switch (rol?.toLowerCase()) {
      case 'administrador':
        return 'bg-[#7b2cbf]/10 text-[#7b2cbf] border border-[#7b2cbf]/25 font-bold';
      case 'supervisor':
        return 'bg-amber-100 text-amber-800 border border-amber-300 font-bold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60';
      case 'operador':
        return 'bg-[#abd037]/15 text-[#4d7c0f] border border-[#abd037]/40 font-bold dark:bg-[#abd037]/25 dark:text-[#abd037]';
      case 'usuario':
      default:
        return 'bg-[#2CACD0]/15 text-[#013a52] dark:text-[#2CACD0] border border-[#2CACD0]/30 font-bold';
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
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar en el inventario"
          className="header-search-input focus:ring-2 focus:ring-[#abd037] focus:border-[#013a52] outline-none"
        />
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* CAMPANITA DE NOTIFICACIONES EN TIEMPO REAL (Oculta para rol 'usuario' y 'supervisor') */}
        {!isUsuario && !isSupervisor && (
          <NotificationBell
            onNavigateToSolicitudes={(targetData) => {
              if (onNavigate) {
                onNavigate('prestamos', targetData || { section: 'solicitudes' });
              }
            }}
          />
        )}

        {/* SELECTOR DE PERFIL Y ROL INTERACTIVO */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="user-profile-btn"
            title="Cambiar usuario o alternar rol para pruebas"
          >
            <UserAvatar
              nombre={currentUser?.nombre}
              avatarUrl={userAvatarUrl}
              size="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px]"
              textSize="text-[11px]"
            />
            <div className="user-profile-info">
              <span className="user-profile-name">
                {currentUser?.nombre}
              </span>
              <span className={`badge-role ${currentUser?.rol || 'usuario'} ${getRolBadgeClass(currentUser?.rol)}`}>
                {currentUser?.rol}
              </span>
            </div>
            <ChevronDown className="user-profile-chevron" />
          </button>

          {/* MENÚ DESPLEGABLE DE ROLES Y USUARIOS */}
          {userDropdownOpen && (
            <div className="user-profile-dropdown" style={{ width: '280px' }}>
              {/* Tarjeta de usuario en sesión */}
              <div
                style={{
                  padding: '10px 10px 8px 10px',
                  borderBottom: '1px solid var(--line)',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <UserAvatar
                    nombre={currentUser?.nombre}
                    avatarUrl={userAvatarUrl}
                    size="w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px]"
                    textSize="text-base"
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '12.5px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentUser?.nombre}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentUser?.email}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10.5px',
                        color: currentUser?.telefono ? '#6d6e71' : 'var(--text-dim)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                      title={currentUser?.telefono || 'Sin teléfono registrado'}
                    >
                      <Phone className="w-3 h-3 text-[#6d6e71] shrink-0" />
                      <span className="truncate">
                        {currentUser?.telefono || 'Sin teléfono registrado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span className={`badge-role ${currentUser?.rol || 'usuario'} ${getRolBadgeClass(currentUser?.rol)}`}>
                    {currentUser?.rol}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                    {currentUser?.sede || 'Medellín'}
                  </span>
                </div>
              </div>

              {/* BOTÓN ACTUALIZAR TELÉFONO */}
              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  setModalTelefonoAbierto(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 my-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 hover:border-[#013a52]/30 dark:hover:bg-slate-800 dark:hover:border-[#abd037]/40 hover:text-[#013a52] dark:hover:text-slate-100 transition-all cursor-pointer group"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#abd037]/20 flex items-center justify-center text-[#013a52] dark:text-[#abd037] group-hover:scale-105 transition-transform">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium text-[#013a52] dark:text-slate-200">Actualizar Teléfono</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#013a52] dark:group-hover:text-[#abd037] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  setModalPasswordAbierto(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 my-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:bg-lime-50 hover:border-lime-300 dark:hover:bg-slate-800 dark:hover:border-lime-500/40 hover:text-lime-800 dark:hover:text-lime-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-lime-100 dark:bg-lime-950/60 flex items-center justify-center text-lime-700 dark:text-lime-400 group-hover:scale-105 transition-transform">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <span>Cambiar mi Contraseña</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-lime-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* BOTÓN CERRAR SESIÓN */}
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="user-logout-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    color: '#f43f5e',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Cerrar sesión y limpiar token JWT de este dispositivo"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTÓN SINCRONIZAR SUPABASE (Oculto para rol 'usuario') */}


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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#abd037" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#013a52" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            className="btn-excel-header flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#abd037] bg-[#abd037]/15 hover:bg-[#abd037] text-[#013a52] font-bold transition-all text-xs shadow-sm cursor-pointer group"
            title="Descargar reporte consolidado en formato Excel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#013a52] group-hover:scale-105 transition-transform">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Excel</span>
          </button>
        )}
      </div>

      <ModalCambiarPassword
        isOpen={modalPasswordAbierto}
        onClose={() => setModalPasswordAbierto(false)}
      />

      <ActualizarTelefonoModal
        isOpen={modalTelefonoAbierto}
        onClose={() => setModalTelefonoAbierto(false)}
      />
    </header>
  );
}
