import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Shield,
  Phone,
  Mail,
  CreditCard,
  X,
  Check,
  UserCheck,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function UsuariosView() {
  const { usuarios, crearUsuario, editarUsuario, eliminarUsuario, currentUser } = useAuth();
  const { showNewItemSuccess, showEditSuccess, showConfirmAction, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('todos');

  // Estado para modal de Nuevo Usuario
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [formDataNuevo, setFormDataNuevo] = useState({
    documento: '',
    nombre: '',
    telefono: '',
    email: '',
    rol: 'usuario',
    cargo: '',
    sede: 'Medellín',
  });

  // Estado para modal de Editar Usuario
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formDataEditar, setFormDataEditar] = useState({
    documento: '',
    nombre: '',
    telefono: '',
    email: '',
    rol: 'usuario',
    cargo: '',
    sede: 'Medellín',
  });

  // Filtrado reactivo de usuarios
  const usuariosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return usuarios.filter((u) => {
      const matchSearch =
        !term ||
        u.nombre?.toLowerCase().includes(term) ||
        u.documento?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.telefono?.toLowerCase().includes(term) ||
        u.cargo?.toLowerCase().includes(term);

      const matchRol = filterRol === 'todos' || u.rol === filterRol;
      return matchSearch && matchRol;
    });
  }, [usuarios, searchTerm, filterRol]);

  // Manejo de Creación de Usuario
  const handleCrearUsuario = (e) => {
    e.preventDefault();
    if (!formDataNuevo.documento?.trim()) {
      showError('Validación', 'El documento de identidad es requerido.');
      return;
    }
    if (!formDataNuevo.nombre?.trim()) {
      showError('Validación', 'El nombre completo es requerido.');
      return;
    }
    if (!formDataNuevo.telefono?.trim()) {
      showError('Validación', 'El teléfono de contacto es requerido.');
      return;
    }
    if (!formDataNuevo.email?.trim()) {
      showError('Validación', 'El correo electrónico es requerido.');
      return;
    }

    // Verificar unicidad del documento
    const existe = usuarios.some(
      (u) => u.documento.trim() === formDataNuevo.documento.trim()
    );
    if (existe) {
      showError('Documento Duplicado', `Ya existe un usuario con el documento ${formDataNuevo.documento}.`);
      return;
    }

    const nuevo = crearUsuario(formDataNuevo);
    setModalNuevoOpen(false);
    setFormDataNuevo({
      documento: '',
      nombre: '',
      telefono: '',
      email: '',
      rol: 'usuario',
      cargo: '',
      sede: 'Medellín',
    });

    showNewItemSuccess({
      nombre: nuevo.nombre,
      codigo: `DOC-${nuevo.documento}`,
      sedeOUbicacion: `Rol: ${nuevo.rol.toUpperCase()}`,
    });
  };

  // Manejo de Edición de Usuario
  const handleOpenEditar = (u) => {
    setUsuarioEditando(u);
    setFormDataEditar({
      documento: u.documento || '',
      nombre: u.nombre || '',
      telefono: u.telefono || '',
      email: u.email || '',
      rol: u.rol || 'usuario',
      cargo: u.cargo || '',
      sede: u.sede || 'Medellín',
    });
    setModalEditarOpen(true);
  };

  const handleGuardarEdicion = (e) => {
    e.preventDefault();
    if (!usuarioEditando) return;

    if (!formDataEditar.documento?.trim()) {
      showError('Validación', 'El documento de identidad es requerido.');
      return;
    }
    if (!formDataEditar.nombre?.trim()) {
      showError('Validación', 'El nombre completo es requerido.');
      return;
    }
    if (!formDataEditar.telefono?.trim()) {
      showError('Validación', 'El teléfono es requerido.');
      return;
    }
    if (!formDataEditar.email?.trim()) {
      showError('Validación', 'El correo electrónico es requerido.');
      return;
    }

    editarUsuario(usuarioEditando.id, formDataEditar);
    setModalEditarOpen(false);
    showEditSuccess(`Usuario ${formDataEditar.nombre}`);
    setUsuarioEditando(null);
  };

  // Dar de baja / Eliminar usuario con confirmación institucional
  const handleEliminarUsuario = (u) => {
    if (u.id === currentUser?.id) {
      showError('Acción no permitida', 'No puedes eliminar el usuario con el que has iniciado sesión.');
      return;
    }

    showConfirmAction({
      title: '¿Dar de baja usuario?',
      message: `¿Seguro que deseas dar de baja o revocar el acceso a ${u.nombre} (${u.documento})? Esta acción actualizará los registros del sistema institucional.`,
      confirmText: 'Dar de Baja',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        eliminarUsuario(u.id);
        showEditSuccess(`Usuario ${u.nombre} dado de baja`);
      },
    });
  };

  // Paginación estándar de usuarios
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE_USUARIOS = 5;

  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_PER_PAGE_USUARIOS));
  const paginatedUsuarios = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE_USUARIOS;
    return usuariosFiltrados.slice(start, start + ITEMS_PER_PAGE_USUARIOS);
  }, [usuariosFiltrados, currentPage]);

  // Renderizador de Badge de Rol con badges redondeados tipo píldora estándar
  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'administrador':
        return (
          <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800">
            <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Administrador
          </span>
        );
      case 'supervisor':
        return (
          <span className="bg-amber-50 border border-amber-200 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
            <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Supervisor
          </span>
        );
      case 'operador':
        return (
          <span className="bg-lime-50 border border-lime-300 text-lime-800 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1 dark:bg-lime-950/70 dark:text-lime-300 dark:border-lime-700">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
            Operador
          </span>
        );
      case 'usuario':
      default:
        return (
          <span className="bg-sky-50 border border-sky-200 text-sky-700 font-semibold px-2.5 py-0.5 rounded-full text-xs inline-flex items-center gap-1 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Usuario
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 2. CABECERA ESTÁNDAR (HEADER DE SECCIÓN) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span>Gestión de Usuarios</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              {usuarios.length} usuarios registrados
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración de personal, custodios STEAM y niveles de acceso institucional
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoOpen(true)}
          className="bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* 3. ESTANDARIZACIÓN DE LA BARRA DE FILTROS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, correo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Rol:</label>
            <select
              value={filterRol}
              onChange={(e) => {
                setFilterRol(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-lime-500"
            >
              <option value="todos">Todos los Roles ({usuarios.length})</option>
              <option value="administrador">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
              <option value="usuario">Usuario</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando <strong className="font-semibold text-slate-700 dark:text-slate-200">{usuariosFiltrados.length}</strong> de <strong className="font-semibold text-slate-700 dark:text-slate-200">{usuarios.length}</strong> registros
        </div>
      </div>

      {/* 4. TABLA DE USUARIOS Y ACCIONES ESTÁNDAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">DOCUMENTO</th>
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">NOMBRE COMPLETO</th>
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">TELÉFONO</th>
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">CORREO ELECTRÓNICO</th>
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase text-center">ROL</th>
                <th className="py-3 px-4 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Documento */}
                      <td className="py-3 px-4 text-sm">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {u.documento}
                        </span>
                      </td>

                      {/* Nombre Completo y Cargo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-[#84CC16] flex items-center justify-center font-bold text-xs shrink-0">
                            {u.nombre?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.nombre}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-[#65A30D] dark:text-[#84CC16]">
                                  (Tú)
                                </span>
                              )}
                            </div>
                            {u.cargo && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {u.cargo} · {u.sede || 'Medellín'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.telefono || '—'}</span>
                        </div>
                      </td>

                      {/* Correo Electrónico */}
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{u.email || '—'}</span>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4 text-center">
                        {renderBadgeRol(u.rol)}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-4 text-center" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditar(u)}
                            className="btn-icon-crud shrink-0"
                            style={{
                              width: '28px',
                              height: '28px',
                              flexShrink: 0,
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: 'var(--amber, #f59e0b)',
                              transition: 'all 0.15s ease',
                            }}
                            title="Editar usuario"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEliminarUsuario(u)}
                            disabled={isCurrent}
                            className="btn-icon-crud shrink-0"
                            style={{
                              width: '28px',
                              height: '28px',
                              flexShrink: 0,
                              background: isCurrent ? 'var(--surface-2, rgba(148, 163, 184, 0.1))' : 'rgba(239, 68, 68, 0.1)',
                              border: isCurrent ? '1px solid var(--line, rgba(148, 163, 184, 0.2))' : '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isCurrent ? 'not-allowed' : 'pointer',
                              color: isCurrent ? 'var(--text-dim, #94a3b8)' : 'var(--red, #ef4444)',
                              opacity: isCurrent ? 0.4 : 1,
                              transition: 'all 0.15s ease',
                            }}
                            title={isCurrent ? 'No puedes dar de baja tu propio usuario activo' : 'Dar de baja o eliminar usuario'}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" x2="10" y1="11" y2="17" />
                              <line x1="14" x2="14" y1="11" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINACIÓN INFERIOR ESTÁNDAR */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <div>
            Mostrando <strong>{usuariosFiltrados.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE_USUARIOS + 1}</strong> - <strong>{Math.min(currentPage * ITEMS_PER_PAGE_USUARIOS, usuariosFiltrados.length)}</strong> de <strong>{usuariosFiltrados.length}</strong> registros
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              ← Anterior
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-200 px-1">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-300"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: REGISTRAR NUEVO USUARIO
          ========================================================================= */}
      {modalNuevoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 19, 43, 0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setModalNuevoOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0B132B] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100"
            style={{ backgroundColor: 'var(--surface-modal, #0B132B)', border: '1px solid var(--border, #334155)', borderRadius: '16px', maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(132, 204, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#84CC16' }}>
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Registrar Nuevo Usuario</h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Ingresa los datos requeridos para habilitar el acceso institucional</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Documento de Identidad *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 1017123456"
                    value={formDataNuevo.documento}
                    onChange={(e) => setFormDataNuevo({ ...formDataNuevo, documento: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3001234567"
                    value={formDataNuevo.telefono}
                    onChange={(e) => setFormDataNuevo({ ...formDataNuevo, telefono: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Cristina Gómez"
                  value={formDataNuevo.nombre}
                  onChange={(e) => setFormDataNuevo({ ...formDataNuevo, nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@fmo.org o usuario@gmail.com"
                  value={formDataNuevo.email}
                  onChange={(e) => setFormDataNuevo({ ...formDataNuevo, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Rol Asignado *
                  </label>
                  <select
                    value={formDataNuevo.rol}
                    onChange={(e) => setFormDataNuevo({ ...formDataNuevo, rol: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  >
                    <option value="usuario">Usuario (Consulta y Solicitudes)</option>
                    <option value="operador">Operador (Inventario y Préstamos)</option>
                    <option value="supervisor">Supervisor (Auditoría y Sedes)</option>
                    <option value="administrador">Administrador (Control Total)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Sede Institucional
                  </label>
                  <select
                    value={formDataNuevo.sede}
                    onChange={(e) => setFormDataNuevo({ ...formDataNuevo, sede: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  >
                    <option value="Medellín">Medellín</option>
                    <option value="Carmen de Viboral">Carmen de Viboral</option>
                    <option value="La Ceja">La Ceja</option>
                    <option value="El Retiro">El Retiro</option>
                    <option value="Nacional">Nacional</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Cargo / Rol Operativo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Formador Robótica, Asistente de Proyectos STEAM..."
                  value={formDataNuevo.cargo}
                  onChange={(e) => setFormDataNuevo({ ...formDataNuevo, cargo: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevoOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#84CC16', color: '#0B132B', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                >
                  Registrar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDITAR USUARIO Y CAMBIAR ROL
          ========================================================================= */}
      {modalEditarOpen && usuarioEditando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 19, 43, 0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setModalEditarOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0B132B] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden text-slate-100"
            style={{ backgroundColor: 'var(--surface-modal, #0B132B)', border: '1px solid var(--border, #334155)', borderRadius: '16px', maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(132, 204, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#84CC16' }}>
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Editar Usuario & Permisos</h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Modifica la información o asigna un nuevo rol operativo</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Documento de Identidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDataEditar.documento}
                    onChange={(e) => setFormDataEditar({ ...formDataEditar, documento: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formDataEditar.telefono}
                    onChange={(e) => setFormDataEditar({ ...formDataEditar, telefono: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formDataEditar.nombre}
                  onChange={(e) => setFormDataEditar({ ...formDataEditar, nombre: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formDataEditar.email}
                  onChange={(e) => setFormDataEditar({ ...formDataEditar, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#84CC16', marginBottom: '4px' }}>
                    Rol Asignado *
                  </label>
                  <select
                    value={formDataEditar.rol}
                    onChange={(e) => setFormDataEditar({ ...formDataEditar, rol: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #84CC16', background: '#070D1F', color: '#ffffff', fontSize: '13px', fontWeight: 700 }}
                  >
                    <option value="usuario">Usuario (Consulta y Solicitudes)</option>
                    <option value="operador">Operador (Inventario y Préstamos)</option>
                    <option value="supervisor">Supervisor (Auditoría y Sedes)</option>
                    <option value="administrador">Administrador (Control Total)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Sede Institucional
                  </label>
                  <select
                    value={formDataEditar.sede}
                    onChange={(e) => setFormDataEditar({ ...formDataEditar, sede: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                  >
                    <option value="Medellín">Medellín</option>
                    <option value="Carmen de Viboral">Carmen de Viboral</option>
                    <option value="La Ceja">La Ceja</option>
                    <option value="El Retiro">El Retiro</option>
                    <option value="Nacional">Nacional</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Cargo / Rol Operativo
                </label>
                <input
                  type="text"
                  value={formDataEditar.cargo}
                  onChange={(e) => setFormDataEditar({ ...formDataEditar, cargo: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#070D1F', color: '#ffffff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  type="button"
                  onClick={() => setModalEditarOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#84CC16', color: '#0B132B', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
