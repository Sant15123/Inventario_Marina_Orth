import React from 'react';
import { X, User, Mail, Phone, MapPin, Briefcase, ShieldCheck, FileText, Calendar, Edit3, Shield, UserCheck, Package } from 'lucide-react';

export default function DetalleUsuarioModal({
  isOpen,
  onClose,
  usuario,
  onEditar,
  isAdmin = false,
}) {
  if (!isOpen || !usuario) return null;

  // Iniciales del usuario
  const iniciales = usuario.nombre
    ? usuario.nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'U';

  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'administrador':
        return (
          <span
            className="badge-role administrador"
            title="Rol: Administrador"
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Shield style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            <span>Administrador</span>
          </span>
        );
      case 'supervisor':
        return (
          <span
            className="badge-role supervisor"
            title="Rol: Supervisor"
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <UserCheck style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            <span>Supervisor</span>
          </span>
        );
      case 'operador':
        return (
          <span
            className="badge-role operador"
            title="Rol: Operador"
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Package style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            <span>Operador</span>
          </span>
        );
      case 'usuario':
      default:
        return (
          <span
            className="badge-role usuario"
            title="Rol: Usuario"
            style={{
              fontSize: '11px',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <User style={{ width: '12px', height: '12px', flexShrink: 0 }} />
            <span>Usuario</span>
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 my-8"
        style={{
          borderRadius: '24px',
          maxWidth: '32rem', // max-w-lg
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--surface, #0f172a)',
          borderColor: 'var(--line, #1e293b)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO INSTITUCIONAL */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0,
              }}
            >
              <User style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--copper, #84CC16)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Control de Usuarios SIGA
              </span>
              <h3
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0"
                style={{ margin: 0, fontSize: '16px', lineHeight: 1.3, color: 'var(--text, #f8fafc)' }}
              >
                Ficha General del Usuario
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* CUERPO INFORMATIVO (Scrollable si es necesario) */}
        <div
          className="p-6 overflow-y-auto"
          style={{
            padding: '22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* CABECERA DEL PERFIL: Avatar, Nombre completo y Rol */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--line, #1e293b)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                minWidth: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
                color: '#0f172a',
                fontSize: '18px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(132, 204, 22, 0.3)',
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {iniciales}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text, #f8fafc)',
                    lineHeight: 1.25,
                  }}
                >
                  {usuario.nombre || 'Usuario Institucional'}
                </h4>
                {renderBadgeRol(usuario.rol)}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12.5px',
                  color: 'var(--text-dim, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Briefcase size={13} style={{ color: '#84CC16', flexShrink: 0 }} />
                <span>{usuario.cargo || 'Funcionario FMO'}</span>
              </p>
            </div>
          </div>

          {/* GRILLA DE DATOS CLAVE (2 Columnas) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
            }}
          >
            {/* 1. DOCUMENTO */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, #1e293b)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-dim, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FileText size={12} style={{ color: '#84CC16' }} />
                <span>Documento</span>
              </span>
              <div>
                <span
                  className="badge-placa"
                  style={{
                    fontSize: '12px',
                    padding: '2.5px 8px',
                    fontWeight: 700,
                    cursor: 'default',
                    display: 'inline-block',
                  }}
                >
                  {usuario.documento || 'No registrado'}
                </span>
              </div>
            </div>

            {/* 2. ESTADO DE CUENTA */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, #1e293b)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-dim, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ShieldCheck size={12} style={{ color: '#10b981' }} />
                <span>Estado de Cuenta</span>
              </span>
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2.5px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                    }}
                  />
                  <span>Activo</span>
                </span>
              </div>
            </div>

            {/* 3. CORREO ELECTRÓNICO */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, #1e293b)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                gridColumn: 'span 2',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-dim, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Mail size={12} style={{ color: '#38bdf8' }} />
                <span>Correo Electrónico</span>
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text, #f8fafc)',
                  wordBreak: 'break-all',
                }}
              >
                {usuario.email || 'Sin correo asociado'}
              </span>
            </div>

            {/* 4. TELÉFONO / CONTACTO */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, #1e293b)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-dim, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Phone size={12} style={{ color: '#f59e0b' }} />
                <span>Teléfono</span>
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text, #f8fafc)',
                }}
              >
                {usuario.telefono || '—'}
              </span>
            </div>

            {/* 5. SEDE INSTITUCIONAL */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--line, #1e293b)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'var(--text-dim, #94a3b8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <MapPin size={12} style={{ color: '#84CC16' }} />
                <span>Sede Asignada</span>
              </span>
              <div>
                <span
                  className="badge-sede"
                  style={{
                    fontSize: '11.5px',
                    padding: '2.5px 8px',
                    fontWeight: 700,
                    cursor: 'default',
                    display: 'inline-block',
                  }}
                >
                  {usuario.sede || 'Medellín'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div
          className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/90 dark:bg-slate-900/90 flex-shrink-0"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderTop: '1px solid var(--line, #1e293b)',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              backgroundColor: 'transparent',
              border: '1px solid var(--line, #334155)',
              color: 'var(--text-dim, #94a3b8)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cerrar
          </button>

          {isAdmin && onEditar && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditar(usuario);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-md shadow-green-500/20 flex items-center gap-2 transition-all"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                backgroundColor: '#84CC16',
                border: '1px solid #65A30D',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(132, 204, 22, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              <Edit3 size={14} />
              <span>Editar Usuario</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
