import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Key,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import inventoryApi from '../../services/inventoryApi';

export default function ModalNuevoUsuario({ isOpen, onClose, onUserCreated }) {
  const { crearUsuario, refetchUsuarios, usuarios = [] } = useAuth();
  const { addToast, showError } = useToast();

  const [formData, setFormData] = useState({
    documento: '',
    telefono: '',
    nombre: '',
    email: '',
    rol: 'usuario',
    sede: 'Medellín',
    cargo: '',
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Generador de contraseña segura (12 caracteres)
  const generarPasswordSegura = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@$!%*?&#';
    const allChars = uppercase + lowercase + numbers + symbols;

    // Garantizar al menos uno de cada tipo
    const u = uppercase[Math.floor(Math.random() * uppercase.length)];
    const l = lowercase[Math.floor(Math.random() * lowercase.length)];
    const n = numbers[Math.floor(Math.random() * numbers.length)];
    const s = symbols[Math.floor(Math.random() * symbols.length)];

    let rest = '';
    for (let i = 0; i < 8; i++) {
      rest += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar caracteres de forma aleatoria
    const passArray = (u + l + n + s + rest).split('');
    for (let i = passArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passArray[i], passArray[j]] = [passArray[j], passArray[i]];
    }

    const newPass = passArray.join('');
    setPassword(newPass);
    setConfirmPassword(newPass);
    copiarAlPortapapeles(newPass);
  };

  const copiarAlPortapapeles = (textoACopiar) => {
    const pass = textoACopiar || password;
    if (!pass) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pass).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => {
        fallbackCopyTextToClipboard(pass);
      });
    } else {
      fallbackCopyTextToClipboard(pass);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.warn('Error al copiar:', err);
    }
  };

  // Checklist de validación en tiempo real
  const validationChecks = useMemo(() => {
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[@$!%*?&#]/.test(password);
    const match = password.length > 0 && password === confirmPassword;

    const allValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSymbol && match;

    return {
      hasMinLen,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
      match,
      allValid,
    };
  }, [password, confirmPassword]);

  // Validación de campos obligatorios básicos
  const isFormValid = useMemo(() => {
    const hasDoc = Boolean(formData.documento?.trim());
    const hasTel = Boolean(formData.telefono?.trim());
    const hasName = Boolean(formData.nombre?.trim());
    const hasEmail = Boolean(formData.email?.trim());
    return hasDoc && hasTel && hasName && hasEmail && validationChecks.allValid;
  }, [formData, validationChecks.allValid]);

  if (!isOpen) return null;

  const handleReset = () => {
    setFormData({
      documento: '',
      telefono: '',
      nombre: '',
      email: '',
      rol: 'usuario',
      sede: 'Medellín',
      cargo: '',
    });
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCopied(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || submitting) return;

    // Verificar unicidad de documento en memoria
    const docExiste = usuarios.some(
      (u) => String(u.documento || '').trim() === formData.documento.trim()
    );
    if (docExiste) {
      showError('Documento Duplicado', `Ya existe un usuario con el documento ${formData.documento}.`);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        documento: formData.documento.trim(),
        nombre_completo: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim().toLowerCase(),
        rol: formData.rol || 'usuario',
        sede: formData.sede || 'Medellín',
        cargo: formData.cargo?.trim() || 'Funcionario FMO',
        password: password,
        activo: true,
      };

      // 1. Enviar payload completo a POST /api/usuarios
      let createdUser = null;
      try {
        const response = await inventoryApi.createUsuario(payload);
        if (response && (response.success || response.data)) {
          createdUser = response.data;
        }
      } catch (apiErr) {
        console.warn('API /api/usuarios error o fallback local:', apiErr.message);
        // Si el backend responde error 409 de duplicado
        if (apiErr.status === 409 || apiErr.response?.message?.includes('duplicado')) {
          showError('Usuario Duplicado', apiErr.response?.message || 'El documento o correo ya está registrado.');
          setSubmitting(false);
          return;
        }
      }

      // 2. Registrar en contexto local de usuarios / localStorage
      const localUser = crearUsuario({
        id: createdUser?.id,
        documento: payload.documento,
        nombre: payload.nombre_completo,
        email: payload.email,
        telefono: payload.telefono,
        rol: payload.rol,
        sede: payload.sede,
        cargo: payload.cargo,
        password: payload.password,
      });

      // 3. Invocar refetchUsuarios() para que el nuevo usuario aparezca reflejado inmediatamente
      if (refetchUsuarios) {
        await refetchUsuarios().catch((err) => console.warn('Error en refetchUsuarios:', err));
      }

      if (onUserCreated) {
        onUserCreated(createdUser || localUser);
      }

      // 4. Mostrar toast de éxito corporativo
      addToast({
        type: 'success',
        iconType: 'check',
        title: '¡Usuario Registrado!',
        message: 'Las credenciales han sido habilitadas en SIGA y Supabase.',
        duration: 5000,
      });

      // 5. Cerrar modal y limpiar
      handleReset();
      onClose();
    } catch (err) {
      console.error('Error al registrar usuario:', err);
      showError('Error al Registrar', err.message || 'No se pudo completar el registro del usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-hidden"
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
        overflow: 'hidden',
      }}
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
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
        }}
      >
        {/* Cabecera Fija (Header) */}
        <div
          className="p-5 pb-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800 shrink-0"
          style={{
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 20px 14px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="w-10 h-10 rounded-xl bg-lime-100 dark:bg-lime-950/60 border border-lime-300/60 dark:border-lime-500/30 flex items-center justify-center text-lime-700 dark:text-lime-400"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(132, 204, 22, 0.16)',
                border: '1px solid rgba(132, 204, 22, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#84CC16',
                flexShrink: 0,
              }}
            >
              <UserPlus className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <span
                className="text-[10px] font-black uppercase tracking-wider text-lime-600 dark:text-lime-400"
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--copper, #84CC16)',
                  display: 'block',
                  marginBottom: '2px',
                }}
              >
                Control de Usuarios SIGA
              </span>
              <h2
                className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--text, #f8fafc)',
                  lineHeight: 1.25,
                }}
              >
                Registrar Nuevo Usuario
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4. Cuerpo Scrolleable (El formulario DEBE tener flex-1 y overflow-hidden, el div interno overflow-y-auto) */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          {/* Cuerpo scrolleable interno */}
          <div
            className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0 pr-3.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
            style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: 'var(--surface, #0f172a)',
            }}
          >
            {/* 1. Documento y Teléfono */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Documento de Identidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1017123456"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Teléfono de Contacto *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 3001234567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            {/* 2. Nombre Completo */}
            <div className="form-group full">
              <label>Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Laura Cristina Gómez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            {/* 3. Correo Electrónico */}
            <div className="form-group full">
              <label>Correo Electrónico *</label>
              <input
                type="email"
                required
                placeholder="ejemplo@fmo.org o usuario@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* 4. Rol y Sede */}
            <div className="form-group">
              <label>Rol Asignado *</label>
              <select
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              >
                <option value="usuario">Usuario (Consulta y Solicitudes)</option>
                <option value="operador">Operador (Inventario y Préstamos)</option>
                <option value="supervisor">Supervisor (Auditoría y Sedes)</option>
                <option value="administrador">Administrador (Control Total)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sede Institucional</label>
              <select
                value={formData.sede}
                onChange={(e) => setFormData({ ...formData, sede: e.target.value })}
              >
                <option value="Medellín">Medellín</option>
                <option value="Carmen de Viboral">Carmen de Viboral</option>
                <option value="La Ceja">La Ceja</option>
                <option value="El Retiro">El Retiro</option>
                <option value="Nacional">Nacional</option>
              </select>
            </div>

            {/* 5. Cargo Operativo */}
            <div className="form-group full">
              <label>Cargo / Rol Operativo</label>
              <input
                type="text"
                placeholder="Ej: Formadora de Robótica STEAM"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              />
            </div>

            {/* ============================================================== */}
            {/* SECCIÓN 1: CREDENCIALES DE ACCESO                              */}
            {/* ============================================================== */}
            <div
              className="form-group full"
              style={{
                marginTop: '6px',
                padding: '14px',
                borderRadius: '10px',
                background: 'var(--surface-2, #f8fafc)',
                border: '1px solid var(--line, #e2e8f0)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Barra superior de la sección de credenciales */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key style={{ width: '15px', height: '15px', color: 'var(--copper, #84CC16)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                    Credenciales de Acceso
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Botón Generar Contraseña Segura */}
                  <button
                    type="button"
                    onClick={generarPasswordSegura}
                    title="Generar cadena aleatoria de 12 caracteres segura"
                    style={{
                      background: 'rgba(132, 204, 22, 0.14)',
                      border: '1px solid rgba(132, 204, 22, 0.45)',
                      color: 'var(--copper, #84CC16)',
                      borderRadius: '6px',
                      padding: '4px 9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles style={{ width: '12px', height: '12px' }} />
                    <span>Generar Contraseña Segura</span>
                  </button>

                  {/* Botón Copiar al Portapapeles */}
                  {password && (
                    <button
                      type="button"
                      onClick={() => copiarAlPortapapeles()}
                      title="Copiar contraseña generada al portapapeles"
                      style={{
                        background: copied ? 'rgba(16, 185, 129, 0.16)' : 'var(--surface, #ffffff)',
                        border: copied ? '1px solid #10b981' : '1px solid var(--line, #cbd5e1)',
                        color: copied ? '#059669' : 'var(--text-dim, #64748b)',
                        borderRadius: '6px',
                        padding: '4px 9px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {copied ? (
                        <>
                          <Check style={{ width: '12px', height: '12px', color: '#059669' }} />
                          <span style={{ color: '#059669', fontWeight: 700 }}>¡Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy style={{ width: '12px', height: '12px' }} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Campos de Contraseña */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Campo 1: Contraseña Inicial */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Contraseña Inicial *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim, #64748b)',
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {showPassword ? (
                        <EyeOff style={{ width: '15px', height: '15px' }} />
                      ) : (
                        <Eye style={{ width: '15px', height: '15px' }} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Campo 2: Confirmar Contraseña */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Confirmar Contraseña *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ width: '100%', paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim, #64748b)',
                        cursor: 'pointer',
                        padding: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {showConfirmPassword ? (
                        <EyeOff style={{ width: '15px', height: '15px' }} />
                      ) : (
                        <Eye style={{ width: '15px', height: '15px' }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* SECCIÓN 3: CHECKLIST DE VALIDACIÓN EN TIEMPO REAL              */}
              {/* ============================================================== */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--surface, #ffffff)',
                  border: '1px solid var(--line, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text-dim, #64748b)',
                    marginBottom: '2px',
                  }}
                >
                  Requisitos de Seguridad de Contraseña:
                </span>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '4px 12px',
                    fontSize: '11.5px',
                  }}
                >
                  {/* Requisito 1: Mínimo 8 caracteres */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.hasMinLen ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.hasMinLen ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.hasMinLen ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Mínimo 8 caracteres</span>
                  </div>

                  {/* Requisito 2: Al menos una mayúscula (A-Z) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.hasUpper ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.hasUpper ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.hasUpper ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Al menos una mayúscula (A-Z)</span>
                  </div>

                  {/* Requisito 3: Al menos una minúscula (a-z) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.hasLower ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.hasLower ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.hasLower ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Al menos una minúscula (a-z)</span>
                  </div>

                  {/* Requisito 4: Al menos un número (0-9) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.hasNumber ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.hasNumber ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.hasNumber ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Al menos un número (0-9)</span>
                  </div>

                  {/* Requisito 5: Al menos un carácter especial (@$!%*?&#) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.hasSymbol ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.hasSymbol ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.hasSymbol ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Al menos un carácter especial (@$!%*?&#)</span>
                  </div>

                  {/* Requisito 6: Ambas contraseñas coinciden exactamente */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: validationChecks.match ? '#059669' : '#94a3b8',
                      fontWeight: validationChecks.match ? 600 : 400,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {validationChecks.match ? (
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <XCircle style={{ width: '13px', height: '13px', color: '#94a3b8', flexShrink: 0 }} />
                    )}
                    <span>Ambas contraseñas coinciden exactamente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Pie de Página Fijo (Footer con Botones) */}
          <div
            className="p-4 bg-slate-50 dark:bg-[#020617]/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0"
            style={{
              padding: '14px 20px',
              backgroundColor: 'var(--surface-2, #0b1320)',
              borderTop: '1px solid var(--line, #1e293b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              style={{
                padding: '8px 16px',
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
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-0 ${
                isFormValid && !submitting
                  ? 'bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 shadow-sm cursor-pointer active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              style={{
                padding: '8px 20px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !isFormValid || submitting ? 'not-allowed' : 'pointer',
                opacity: !isFormValid || submitting ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {submitting ? 'Registrando...' : 'Registrar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
