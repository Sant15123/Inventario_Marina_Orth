import React from 'react';
import { Pencil, X, Loader2 } from 'lucide-react';

export default function ModalEditarUsuario({
  isOpen,
  onClose,
  usuario,
  formData,
  onChangeFormData,
  onSubmit,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
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
      }}
      onClick={onClose}
    >
      {/* Tarjeta Modal: Compacta idéntica a modal de inventario max-w-lg */}
      <div
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          borderRadius: '16px',
          maxWidth: '32rem', // max-w-lg (512px)
          width: '100%',
          maxHeight: '90vh',
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
        {/* Cabecera Fija */}
        <div
          className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
          style={{
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.9))',
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--amber, #f59e0b)',
                flexShrink: 0,
              }}
            >
              <Pencil style={{ width: '16px', height: '16px' }} />
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
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0"
                style={{ margin: 0, fontSize: '15px', color: 'var(--text, #f8fafc)' }}
              >
                Editar Usuario
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors text-base"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--line, #334155)',
              backgroundColor: 'var(--surface, #1e293b)',
              color: 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="flex flex-col flex-1 min-h-0"
          style={{ margin: 0, display: 'flex', flexDirection: 'column' }}
        >
          {/* Cuerpo Scrolleable Interno */}
          <div
            className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]"
            style={{
              padding: '20px',
              backgroundColor: 'var(--surface, #0f172a)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Documento de Identidad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.documento}
                  onChange={(e) => onChangeFormData({ ...formData, documento: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                  }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.telefono}
                  onChange={(e) => onChangeFormData({ ...formData, telefono: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                  }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => onChangeFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                style={{
                  backgroundColor: 'var(--bg, #0f172a)',
                  color: 'var(--text, #f8fafc)',
                  borderColor: 'var(--line, #334155)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => onChangeFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                style={{
                  backgroundColor: 'var(--bg, #0f172a)',
                  color: 'var(--text, #f8fafc)',
                  borderColor: 'var(--line, #334155)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Rol Asignado *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => onChangeFormData({ ...formData, rol: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                  }}
                >
                  <option value="usuario">Usuario (Consulta y Solicitudes)</option>
                  <option value="operador">Operador (Inventario y Préstamos)</option>
                  <option value="supervisor">Supervisor (Auditoría y Sedes)</option>
                  <option value="administrador">Administrador (Control Total)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Sede Institucional
                </label>
                <select
                  value={formData.sede}
                  onChange={(e) => onChangeFormData({ ...formData, sede: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                  }}
                >
                  <option value="Medellín">Medellín</option>
                  <option value="Carmen de Viboral">Carmen de Viboral</option>
                  <option value="La Ceja">La Ceja</option>
                  <option value="El Retiro">El Retiro</option>
                  <option value="Nacional">Nacional</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                Cargo / Rol Operativo
              </label>
              <input
                type="text"
                placeholder="Ej: Formadora de Robótica STEAM"
                value={formData.cargo}
                onChange={(e) => onChangeFormData({ ...formData, cargo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                style={{
                  backgroundColor: 'var(--bg, #0f172a)',
                  color: 'var(--text, #f8fafc)',
                  borderColor: 'var(--line, #334155)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>

          {/* Footer Fijo Abajo (Homologado con modal de Inventario y Cambio de Contraseña) */}
          <div
            className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'var(--surface-2, #0f172a)',
              borderTop: '1px solid var(--line, #1e293b)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line, #334155)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#84CC16',
                border: '1px solid #65A30D',
                color: '#020617',
                fontSize: '13px',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 12px rgba(132, 204, 22, 0.35)',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar Cambios</span>
                  <span style={{ fontSize: '13px' }}>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
