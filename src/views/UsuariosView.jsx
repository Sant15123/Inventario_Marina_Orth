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
  UserCheck,
  Package,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ModalNuevoUsuario from '../components/modals/ModalNuevoUsuario';
import ModalEditarUsuario from '../components/modals/ModalEditarUsuario';

export default function UsuariosView() {
  const { usuarios, crearUsuario, editarUsuario, eliminarUsuario, currentUser, isAdmin, isSupervisor } = useAuth();
  const { showNewItemSuccess, showEditSuccess, showConfirmAction, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'administrador' | 'supervisor' | 'operador' | 'usuario'
  const [filterSede, setFilterSede] = useState('todos');

  // Estado para modal de Nuevo Usuario
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);

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
    password: '',
  });

  // Conteo reactivo por roles para las pestañas superiores
  const adminCount = useMemo(() => usuarios.filter((u) => u.rol === 'administrador').length, [usuarios]);
  const supCount = useMemo(() => usuarios.filter((u) => u.rol === 'supervisor').length, [usuarios]);
  const opCount = useMemo(() => usuarios.filter((u) => u.rol === 'operador').length, [usuarios]);
  const userCount = useMemo(() => usuarios.filter((u) => u.rol === 'usuario').length, [usuarios]);

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

      const matchTab = activeTab === 'todos' || u.rol === activeTab;
      const matchSede =
        filterSede === 'todos' ||
        (u.sede || '').toLowerCase().includes(filterSede.toLowerCase());

      return matchSearch && matchTab && matchSede;
    });
  }, [usuarios, searchTerm, activeTab, filterSede]);

  // Paginación estándar (5 registros por página)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE_USUARIOS = 5;

  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_PER_PAGE_USUARIOS));
  const currentUsuariosPage = Math.min(currentPage, totalPages);
  const paginatedUsuarios = useMemo(() => {
    const start = (currentUsuariosPage - 1) * ITEMS_PER_PAGE_USUARIOS;
    return usuariosFiltrados.slice(start, start + ITEMS_PER_PAGE_USUARIOS);
  }, [usuariosFiltrados, currentUsuariosPage]);

  // Resumir nombre de Sede para que nunca desborde ni se sobreponga
  const formatSede = (sede) => {
    if (!sede) return 'Medellín';
    const s = String(sede).toLowerCase();
    if (s.includes('carmen')) return 'El Carmen';
    if (s.includes('medell')) return 'Medellín';
    if (s.includes('ceja')) return 'La Ceja';
    if (s.includes('retiro')) return 'El Retiro';
    if (s.includes('nacional')) return 'Nacional';
    return sede;
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

    const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const handleGuardarEdicion = async (e) => {
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

    setGuardandoEdicion(true);
    try {
      const payloadParaEnviar = { ...formDataEditar };
      if (!payloadParaEnviar.password || !payloadParaEnviar.password.trim()) {
        delete payloadParaEnviar.password;
      } else {
        payloadParaEnviar.password = payloadParaEnviar.password.trim();
      }

      await editarUsuario(usuarioEditando.id, payloadParaEnviar);
      setModalEditarOpen(false);
      showEditSuccess(`Usuario ${formDataEditar.nombre}`);
      setUsuarioEditando(null);
    } catch (err) {
      console.error('Error al guardar edición de usuario en base de datos:', err);
      showError(
        'Error de Persistencia',
        `No se pudo guardar la actualización en la base de datos: ${err.message || 'Error del servidor'}`
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Dar de baja / Eliminar usuario con confirmación institucional
  const handleEliminarUsuario = (u) => {
    if (u.id === currentUser?.id) {
      showError('Acción no permitida', 'No puedes dar de baja o eliminar el usuario con el que has iniciado sesión.');
      return;
    }

    showConfirmAction({
      title: 'Dar de baja usuario',
      subtitle: 'Revocación de Acceso Institucional',
      icon: 'user-x',
      message: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0 }}>
            ¿Estás seguro de que deseas dar de baja y revocar el acceso a{' '}
            <strong style={{ color: 'var(--text, #ffffff)' }}>{u.nombre}</strong> (Documento:{' '}
            <span style={{ fontFamily: 'monospace', color: 'var(--copper, #84CC16)' }}>{u.documento}</span>)?
          </p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
            El usuario perderá inmediatamente sus privilegios de acceso y sus registros históricos quedarán archivados en auditoría.
          </p>
        </div>
      ),
      confirmText: 'Dar de Baja',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: () => {
        eliminarUsuario(u.id);
        showEditSuccess(`Usuario ${u.nombre} dado de baja exitosamente`);
      },
    });
  };

  // Renderizador de Badge de Rol conciso, sin overflow ni colisiones
  const renderBadgeRol = (rol) => {
    switch (rol) {
      case 'administrador':
        return (
          <span
            className="badge-role administrador"
            title="Rol: Administrador"
            style={{
              fontSize: '11px',
              padding: '2.5px 7px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Shield style={{ width: '11px', height: '11px', flexShrink: 0 }} />
            <span>Admin</span>
          </span>
        );
      case 'supervisor':
        return (
          <span
            className="badge-role supervisor"
            title="Rol: Supervisor"
            style={{
              fontSize: '11px',
              padding: '2.5px 7px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <UserCheck style={{ width: '11px', height: '11px', flexShrink: 0 }} />
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
              padding: '2.5px 7px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <Package style={{ width: '11px', height: '11px', flexShrink: 0 }} />
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
              padding: '2.5px 7px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <User style={{ width: '11px', height: '11px', flexShrink: 0 }} />
            <span>Usuario</span>
          </span>
        );
    }
  };

  return (
    <div className="usuarios-view">
      {/* =========================================================================
          BARRA SUPERIOR DE PESTAÑAS Y ACCIÓN PRINCIPAL (ESTILO PRESTAMOSVIEW)
          ========================================================================= */}
      <div className="inventory-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div className="tab-buttons" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('todos');
              setCurrentPage(1);
            }}
          >
            <span>Ver Todos</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'administrador' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('administrador');
              setCurrentPage(1);
            }}
          >
            <span>🛡️ Admins</span>
            <span className="tab-badge">{adminCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'supervisor' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('supervisor');
              setCurrentPage(1);
            }}
          >
            <span>👁️ Supervisores</span>
            <span className="tab-badge">{supCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'operador' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('operador');
              setCurrentPage(1);
            }}
          >
            <span>📦 Operadores</span>
            <span className="tab-badge">{opCount}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'usuario' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('usuario');
              setCurrentPage(1);
            }}
          >
            <span>👥 Usuarios</span>
            <span className="tab-badge">{userCount}</span>
          </button>
        </div>

        {isAdmin && (
          <div className="topbar-actions">
            <button
              type="button"
              className="btn small btn-primary"
              onClick={() => setModalNuevoOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus style={{ width: '14px', height: '14px' }} />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECCIÓN PRINCIPAL: CONTROL Y GESTIÓN DE USUARIOS
          ========================================================================= */}
      <section>
        <div className="section-header">
          <h2>
            <span>Control y Gestión de Usuarios</span>
            <span className="pill prestado">
              {usuarios.length} usuarios registrados
            </span>
          </h2>
          <span className="section-subtitle">
            Administración de personal, custodios STEAM y asignación de credenciales institucionales
          </span>
        </div>

        {/* =========================================================================
            BARRA DE FILTROS COMPACTA (SIN SOBREPOSICIONES)
            ========================================================================= */}
        <div
          className="filter-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
            <div className="filter-group" style={{ flex: '1 1 260px', maxWidth: '380px' }}>
              <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Buscar:</label>
              <input
                type="search"
                placeholder="Buscar por nombre, documento o correo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '5px 10px', fontSize: '12.5px', width: '100%' }}
              />
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Sede:</label>
              <select
                value={filterSede}
                onChange={(e) => {
                  setFilterSede(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '5px 10px', fontSize: '12.5px' }}
              >
                <option value="todos">Todas las sedes</option>
                <option value="medell">Medellín</option>
                <option value="carmen">El Carmen</option>
                <option value="ceja">La Ceja</option>
                <option value="retiro">El Retiro</option>
                <option value="nacional">Nacional</option>
              </select>
            </div>
          </div>

          <div className="filter-count" style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
            Mostrando <strong>{paginatedUsuarios.length}</strong> de <strong>{usuariosFiltrados.length}</strong> usuarios
          </div>
        </div>

        {/* =========================================================================
            TABLA PRINCIPAL (DISTRIBUCIÓN 100% BALANCEADA SIN COLISIONES)
            ========================================================================= */}
        <div className="panel" style={{ paddingBottom: '0', overflow: 'hidden' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: isAdmin ? '12%' : '14%', padding: '10px 8px', textAlign: 'center' }}>DOCUMENTO</th>
                <th style={{ width: isAdmin ? '25%' : '27%', padding: '10px 10px', textAlign: 'left' }}>USUARIO & CARGO</th>
                <th style={{ width: isAdmin ? '13%' : '15%', padding: '10px 8px', textAlign: 'left' }}>TELÉFONO</th>
                <th style={{ width: isAdmin ? '21%' : '23%', padding: '10px 8px', textAlign: 'left' }}>CORREO ELECTRÓNICO</th>
                <th style={{ width: isAdmin ? '11%' : '11%', padding: '10px 6px', textAlign: 'center' }}>SEDE</th>
                <th style={{ width: isAdmin ? '10%' : '10%', padding: '10px 6px', textAlign: 'center' }}>ROL</th>
                {isAdmin && <th style={{ width: '8%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>}
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? '7' : '6'} style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-dim)' }}>
                    <span>👥</span> No se encontraron usuarios con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const sedeCorta = formatSede(u.sede);

                  return (
                    <tr key={u.id} className="h-auto">
                      {/* 1. DOCUMENTO (Badge rectangular compacto) */}
                      <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span className="badge-placa" style={{ cursor: 'default', fontSize: '11.5px', padding: '2px 7px' }} title={`Documento: ${u.documento}`}>
                          {u.documento}
                        </span>
                      </td>

                      {/* 2. USUARIO & CARGO (Avatar + Texto con elipsis limpia) */}
                      <td style={{ padding: '9px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                          <div
                            className="user-avatar-circle"
                            style={{
                              width: '28px',
                              height: '28px',
                              minWidth: '28px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {u.nombre?.charAt(0) || 'U'}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                minWidth: 0,
                                overflow: 'hidden',
                              }}
                            >
                              <strong
                                className="item-title truncate"
                                title={u.nombre}
                                style={{
                                  fontSize: '12.5px',
                                  color: 'var(--text-h)',
                                  fontWeight: 700,
                                  lineHeight: 1.25,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {u.nombre}
                              </strong>
                              {isCurrent && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: 'var(--copper)',
                                    fontWeight: 800,
                                    letterSpacing: '0.02em',
                                    flexShrink: 0,
                                  }}
                                >
                                  (Tú)
                                </span>
                              )}
                            </div>
                            <span
                              className="item-motive truncate"
                              title={u.cargo || 'Personal Institucional FMO'}
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim)',
                                display: 'block',
                                lineHeight: 1.2,
                                marginTop: '1.5px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {u.cargo || 'Personal Institucional FMO'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. TELÉFONO */}
                      <td style={{ padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text)' }}>
                          <Phone style={{ width: '12px', height: '12px', flexShrink: 0, color: 'var(--text-dim)' }} />
                          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                            {u.telefono || '—'}
                          </span>
                        </div>
                      </td>

                      {/* 4. CORREO ELECTRÓNICO */}
                      <td style={{ padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text)', maxWidth: '100%', overflow: 'hidden' }}>
                          <Mail style={{ width: '12px', height: '12px', flexShrink: 0, color: 'var(--text-dim)' }} />
                          <span
                            className="truncate"
                            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}
                            title={u.email}
                          >
                            {u.email || '—'}
                          </span>
                        </div>
                      </td>

                      {/* 5. SEDE (Texto resumido en badge municipal sin desborde) */}
                      <td style={{ padding: '9px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span
                          className="sede-badge municipal"
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 6px',
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Sede: ${u.sede || 'Medellín'}`}
                        >
                          {sedeCorta}
                        </span>
                      </td>

                      {/* 6. ROL (Badge conciso sin solapamiento) */}
                      <td style={{ padding: '9px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {renderBadgeRol(u.rol)}
                      </td>

                      {/* 7. ACCIONES (Botones compactos centrados, solo para Administrador) */}
                      {isAdmin && (
                        <td style={{ padding: '9px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditar(u)}
                              className="btn-icon-crud shrink-0"
                              style={{
                                width: '26px',
                                height: '26px',
                                flexShrink: 0,
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
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
                              <Pencil style={{ width: '12px', height: '12px' }} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminarUsuario(u)}
                              disabled={isCurrent}
                              className="btn-icon-crud shrink-0"
                              style={{
                                width: '26px',
                                height: '26px',
                                flexShrink: 0,
                                background: isCurrent ? 'var(--surface-2, rgba(148, 163, 184, 0.1))' : 'rgba(244, 63, 94, 0.12)',
                                border: isCurrent ? '1px solid var(--line, rgba(148, 163, 184, 0.2))' : '1px solid rgba(244, 63, 94, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isCurrent ? 'not-allowed' : 'pointer',
                                color: isCurrent ? 'var(--text-dim, #94a3b8)' : 'var(--red, #f43f5e)',
                                opacity: isCurrent ? 0.35 : 1,
                                transition: 'all 0.15s ease',
                              }}
                              title={isCurrent ? 'No puedes dar de baja tu propio usuario activo' : 'Dar de baja o revocar acceso'}
                            >
                              <Trash2 style={{ width: '12px', height: '12px' }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* =========================================================================
              CONTROLES DE PAGINACIÓN COMPACTA (IDÉNTICOS A PRESTAMOSVIEW)
              ========================================================================= */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              borderTop: '1px solid var(--line)',
              fontSize: '12.5px',
              color: 'var(--text-dim)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              Mostrando{' '}
              <strong style={{ color: 'var(--text-h)' }}>
                {usuariosFiltrados.length === 0 ? 0 : (currentUsuariosPage - 1) * ITEMS_PER_PAGE_USUARIOS + 1}
              </strong>{' '}
              -{' '}
              <strong style={{ color: 'var(--text-h)' }}>
                {Math.min(currentUsuariosPage * ITEMS_PER_PAGE_USUARIOS, usuariosFiltrados.length)}
              </strong>{' '}
              de <strong style={{ color: 'var(--text-h)' }}>{usuariosFiltrados.length}</strong> usuarios registrados
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn small ghost"
                disabled={currentUsuariosPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '3px 10px', fontSize: '12px', cursor: currentUsuariosPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                ← Anterior
              </button>

              <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 6px', fontSize: '12px' }}>
                Página {currentUsuariosPage} de {totalPages}
              </span>

              <button
                type="button"
                className="btn small ghost"
                disabled={currentUsuariosPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '3px 10px', fontSize: '12px', cursor: currentUsuariosPage >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODAL INSTITUCIONAL: REGISTRAR NUEVO USUARIO
          ========================================================================= */}
      <ModalNuevoUsuario
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onUserCreated={() => {
          setCurrentPage(1);
        }}
      />

      {/* =========================================================================
          MODAL INSTITUCIONAL: EDITAR USUARIO
          ========================================================================= */}
      <ModalEditarUsuario
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        usuario={usuarioEditando}
        formData={formDataEditar}
        onChangeFormData={setFormDataEditar}
        onSubmit={handleGuardarEdicion}
        loading={guardandoEdicion}
      />
    </div>
  );
}
