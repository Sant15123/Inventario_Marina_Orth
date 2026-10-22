import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente envoltorio para protección de rutas según autenticación y roles institucionales
 * @param {Object} props
 * @param {React.ReactNode} props.children Vista protegida a renderizar
 * @param {Array<string>} [props.allowedRoles] Lista de roles con permiso de acceso
 * @param {string} [props.fallbackPath] Ruta opcional de redirección
 */
export default function ProtectedRoute({ children, allowedRoles, fallbackPath = '/' }) {
  const { isAuthenticated, currentUser, authLoading } = useAuth();
  const location = useLocation();

  // Estado de carga de sesión
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B132B] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#84CC16]/20 border-t-[#84CC16] rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 tracking-wider font-semibold uppercase">
            Verificando Sesión Institucional...
          </p>
        </div>
      </div>
    );
  }

  // 1. Si no hay token JWT válido o usuario activo, redirigir inmediatamente a /login
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Si se especificaron roles permitidos y el rol del usuario no está en la lista
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.rol)) {
    // Si el usuario autenticado tiene rol 'usuario', redirigir por defecto a su panel
    if (currentUser.rol === 'usuario') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}
