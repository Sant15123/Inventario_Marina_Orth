import React, { useState, useEffect } from 'react';
import { Pencil, X, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../../services/supabase';
import inventoryApi from '../../services/inventoryApi';

export default function ModalEditarUsuario({
  isOpen,
  onClose,
  usuario,
  formData,
  onChangeFormData,
  onSubmit,
  loading = false,
  sedes: propSedes,
}) {
  const [sedes, setSedes] = useState(() => {
    if (Array.isArray(propSedes) && propSedes.length > 0) {
      return propSedes.map((s, idx) => (typeof s === 'string' ? { id: idx, nombre: s } : s));
    }
    return [];
  });
  const [cargandoSedes, setCargandoSedes] = useState(sedes.length === 0);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Evaluaciones de complejidad de contraseña (solo aplican si el usuario escribió algo)
  const passwordVal = formData?.password || '';
  const tienePassword = passwordVal.trim().length > 0;

  const validacionesPassword = {
    longitud: passwordVal.length >= 8,
    mayuscula: /[A-Z]/.test(passwordVal),
    minuscula: /[a-z]/.test(passwordVal),
    numero: /[0-9]/.test(passwordVal),
    especial: /[!@#$%^&*(),.?":{}|<>_\-]/.test(passwordVal),
  };

  const passwordValida = !tienePassword || Object.values(validacionesPassword).every(Boolean);

  useEffect(() => {
    if (!isOpen) {
      setMostrarPassword(false);
      return;
    }
    let isMounted = true;
    const cargarSedes = async () => {
      try {
        setCargandoSedes(true);
        let lista = [];

        // 1. Consulta directa con cliente de Supabase
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from('sedes')
              .select('id, nombre, activo')
              .order('nombre', { ascending: true });

            if (!error && Array.isArray(data) && data.length > 0) {
              lista = data.filter((s) => s.activo !== false);
            }
          }
        } catch (supaErr) {
          console.warn('Consulta directa a Supabase sedes:', supaErr.message);
        }

        // 2. Fallback a API backend si Supabase directo falló o no retornó datos
        if (lista.length === 0) {
          try {
            const apiData = await inventoryApi.getSedes();
            if (Array.isArray(apiData) && apiData.length > 0) {
              lista = apiData.map((s, idx) => (typeof s === 'string' ? { id: idx, nombre: s } : s));
            }
          } catch (apiErr) {
            console.warn('Fallback a API sedes:', apiErr.message);
          }
        }

        // 3. Fallback estricto de contingencia
        if (lista.length === 0) {
          lista = [
            { id: 1, nombre: 'Medellín' },
            { id: 2, nombre: 'Carmen de Viboral' },
            { id: 3, nombre: 'La Ceja' },
            { id: 4, nombre: 'El Retiro' },
            { id: 5, nombre: 'Nacional' },
          ];
        }

        if (isMounted) {
          setSedes(lista);
        }
      } catch (err) {
        console.error('Error al cargar sedes en ModalEditarUsuario:', err.message);
      } finally {
        if (isMounted) setCargandoSedes(false);
      }
    };

    cargarSedes();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (tienePassword && !passwordValida) return;
    if (onSubmit) onSubmit(e);
  };

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
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden"
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
          className="p-5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90"
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
          onSubmit={handleFormSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Cuerpo Scrolleable Interno */}
          <div
            className="overflow-y-auto flex-1 p-6 space-y-4"
            style={{
              padding: '24px',
              backgroundColor: 'var(--surface, #0f172a)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                  Documento de Identidad *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={20}
                  value={formData.documento}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    onChangeFormData({ ...formData, documento: val });
                  }}
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
                  inputMode="numeric"
                  required
                  maxLength={10}
                  value={formData.telefono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    onChangeFormData({ ...formData, telefono: val });
                  }}
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
                maxLength={70}
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
                maxLength={80}
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

            <div className="form-group" style={{ margin: 0 }}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  Contraseña (Opcional)
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Solo si deseas cambiarla
                </span>
              </div>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Dejar en blanco para mantener la actual"
                  value={formData.password || ''}
                  onChange={(e) => onChangeFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400/40 focus:border-lime-400 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg, #0f172a)',
                    color: 'var(--text, #f8fafc)',
                    borderColor: 'var(--line, #334155)',
                    padding: '8px 40px 8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Requisitos visuales en vivo */}
              {tienePassword && (
                <div
                  className="mt-2 p-2.5 rounded-lg border text-xs space-y-1.5 transition-all"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    borderColor: passwordValida ? 'rgba(132, 204, 22, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Requisitos para la nueva contraseña:</span>
                    <span className={passwordValida ? 'text-lime-400 font-bold' : 'text-amber-400'}>
                      {passwordValida ? '✓ Cumple requisitos' : 'Incompleto'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${validacionesPassword.longitud ? 'text-lime-400 font-medium' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${validacionesPassword.longitud ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-700 text-slate-400'}`}>
                        {validacionesPassword.longitud ? '✓' : '•'}
                      </span>
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1.5 ${validacionesPassword.mayuscula ? 'text-lime-400 font-medium' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${validacionesPassword.mayuscula ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-700 text-slate-400'}`}>
                        {validacionesPassword.mayuscula ? '✓' : '•'}
                      </span>
                      Una mayúscula (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${validacionesPassword.minuscula ? 'text-lime-400 font-medium' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${validacionesPassword.minuscula ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-700 text-slate-400'}`}>
                        {validacionesPassword.minuscula ? '✓' : '•'}
                      </span>
                      Una minúscula (a-z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${validacionesPassword.numero ? 'text-lime-400 font-medium' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${validacionesPassword.numero ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-700 text-slate-400'}`}>
                        {validacionesPassword.numero ? '✓' : '•'}
                      </span>
                      Un número (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${validacionesPassword.especial ? 'text-lime-400 font-medium' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${validacionesPassword.especial ? 'bg-lime-500/20 text-lime-400' : 'bg-slate-700 text-slate-400'}`}>
                        {validacionesPassword.especial ? '✓' : '•'}
                      </span>
                      Un carácter especial (!@#$%^&*...)
                    </div>
                  </div>
                </div>
              )}
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
                  value={formData.sede || ''}
                  onChange={(e) => onChangeFormData({ ...formData, sede: e.target.value })}
                  disabled={cargandoSedes}
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
                  {cargandoSedes ? (
                    <option value="">Cargando sedes...</option>
                  ) : (
                    sedes.map((sede) => (
                      <option key={sede.id || sede.nombre} value={sede.nombre}>
                        {sede.nombre}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="block text-slate-700 dark:text-slate-300 text-xs font-semibold mb-1">
                Cargo / Rol Operativo
              </label>
              <input
                type="text"
                maxLength={50}
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

          {/* Footer Fijo Abajo */}
          <div
            className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/90 flex-shrink-0 p-4 flex items-center justify-end gap-3"
            style={{
              backgroundColor: 'var(--surface-2, #0f172a)',
              borderTop: '1px solid var(--line, #1e293b)',
              padding: '16px',
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
              disabled={loading || (tienePassword && !passwordValida)}
              className="px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-md"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: (tienePassword && !passwordValida) ? '#475569' : '#84CC16',
                border: (tienePassword && !passwordValida) ? '1px solid #334155' : '1px solid #65A30D',
                color: (tienePassword && !passwordValida) ? '#94a3b8' : '#020617',
                fontSize: '13px',
                fontWeight: 800,
                cursor: loading || (tienePassword && !passwordValida) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: (tienePassword && !passwordValida) ? 'none' : '0 2px 12px rgba(132, 204, 22, 0.35)',
                transition: 'all 0.15s ease',
                opacity: loading || (tienePassword && !passwordValida) ? 0.6 : 1,
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
