import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  Phone,
  Mail,
  UserCheck,
  Package,
  User,
  Eye,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ModalNuevoUsuario from '../components/modals/ModalNuevoUsuario';
import ModalEditarUsuario from '../components/modals/ModalEditarUsuario';
import UserAvatar from '../components/common/UserAvatar';
import DetalleUsuarioModal from '../components/modals/DetalleUsuarioModal';
import ModuleConnectionState from '../components/common/ModuleConnectionState';
import { supabase } from '../services/supabase';
import inventoryApi from '../services/inventoryApi';
import { registrarAuditoria } from '../services/historyAuditService';
import { resolveAreaConfig } from '../components/common/ProgramAreaBadge';
import { RoboticaIcon } from '../components/common/FmoProgramIcons';

export default function UsuariosView({
  sedes: propSedes,
  searchTerm = '',
  busquedaGlobal = '',
  loading = false,
  error = null,
  isRetryingOrSlow = false,
  onRetry,
}) {
  const { usuarios, crearUsuario, editarUsuario, eliminarUsuario, currentUser, isAdmin, isSupervisor } = useAuth();
  const { showNewItemSuccess, showEditSuccess, showConfirmAction, showError } = useToast();

  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'administrador' | 'supervisor' | 'operador' | 'usuario'

  const [sedesList, setSedesList] = useState(() => (Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : []));

  useEffect(() => {
    let isMounted = true;
    const fetchSedes = async () => {
      try {
        let lista = [];
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from('sedes')
              .select('id, nombre, activo')
              .order('nombre', { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
              lista = data.filter((s) => s.activo !== false).map((s) => s.nombre || s.nombre_sede || s);
            }
          }
        } catch (sErr) {
          console.warn('Consulta directa Supabase sedes:', sErr.message);
        }

        if (lista.length === 0) {
          try {
            const apiRes = await inventoryApi.getSedes();
            if (Array.isArray(apiRes) && apiRes.length > 0) {
              lista = apiRes.map((s) => s.nombre || s.nombre_sede || s);
            }
          } catch (apiErr) {
            console.warn('Fallback API sedes:', apiErr.message);
          }
        }

        if (lista.length === 0) {
          lista = ['Medellín', 'Carmen de Viboral', 'La Ceja', 'El Retiro', 'Nacional'];
        }

        if (isMounted) {
          setSedesList(Array.from(new Set(lista)));
        }
      } catch (err) {
        console.warn('Error al cargar sedes en UsuariosView:', err.message);
      }
    };
    fetchSedes();

    const handleSedesChanged = () => {
      fetchSedes();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('siga:sedes_changed', handleSedesChanged);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('siga:sedes_changed', handleSedesChanged);
      }
    };
  }, []);

  // Estado para modal de Detalle de Usuario
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);

  const handleOpenDetalle = (u) => {
    setUsuarioDetalle(u);
    setModalDetalleOpen(true);
  };

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
    proyectos_asignados: [],
  });

  // 1. Deduplicación estricta de usuarios antes de filtrar (evita usuarios duplicados por id, documento o email)
  const usuariosUnicos = useMemo(() => {
    if (!Array.isArray(usuarios)) return [];
    const seen = new Set();
    const result = [];

    for (const u of usuarios) {
      if (!u) continue;
      const idKey = u.id ? `id:${String(u.id).toLowerCase().trim()}` : null;
      const docKey = u.documento ? `doc:${String(u.documento).toLowerCase().trim()}` : null;
      const emailKey = u.email ? `email:${String(u.email).toLowerCase().trim()}` : null;

      // Si ya vimos este usuario por ID, documento o email, omitir la fila duplicada
      if ((idKey && seen.has(idKey)) || (docKey && seen.has(docKey)) || (emailKey && seen.has(emailKey))) {
        continue;
      }

      if (idKey) seen.add(idKey);
      if (docKey) seen.add(docKey);
      if (emailKey) seen.add(emailKey);
      result.push(u);
    }

    return result;
  }, [usuarios]);

  // 2. Conteo reactivo por roles para las pestañas superiores (estrictamente normalizado)
  const adminCount = useMemo(
    () => usuariosUnicos.filter((u) => (u.rol || '').toLowerCase().trim() === 'administrador').length,
    [usuariosUnicos]
  );
  const coordCount = useMemo(
    () => usuariosUnicos.filter((u) => (u.rol || '').toLowerCase().trim() === 'coordinador').length,
    [usuariosUnicos]
  );
  const supCount = useMemo(
    () => usuariosUnicos.filter((u) => (u.rol || '').toLowerCase().trim() === 'supervisor').length,
    [usuariosUnicos]
  );
  const opCount = useMemo(
    () => usuariosUnicos.filter((u) => (u.rol || '').toLowerCase().trim() === 'operador').length,
    [usuariosUnicos]
  );
  const userCount = useMemo(
    () => usuariosUnicos.filter((u) => (u.rol || '').toLowerCase().trim() === 'usuario').length,
    [usuariosUnicos]
  );

  // 3. Filtrado reactivo de usuarios conectado al buscador del header superior y pestaña de rol
  const usuariosFiltrados = useMemo(() => {
    const query = (searchTerm || busquedaGlobal || '').toLowerCase().trim();
    const tabActual = (activeTab || 'todos').toLowerCase().trim();

    return usuariosUnicos.filter((usuario) => {
      // 1. Filtro estricto por Rol (Ver Todos, Admins, Coordinadores, Supervisores, Operadores, Usuarios)
      if (tabActual !== 'todos') {
        const rolNormalizado = (usuario.rol || '').toLowerCase().trim();
        if (rolNormalizado !== tabActual) {
          return false;
        }
      }

      // 2. Filtro por el Buscador Superior
      if (query !== '') {
        const matchNombre = (usuario.nombre || usuario.nombre_completo || '').toLowerCase().includes(query);
        const matchDocumento = String(usuario.documento || '').toLowerCase().includes(query);
        const matchEmail = (usuario.email || '').toLowerCase().includes(query);
        const matchCargo = (usuario.cargo || '').toLowerCase().includes(query);
        const matchSede = (usuario.sede || '').toLowerCase().includes(query);
        const matchTelefono = (usuario.telefono || '').toLowerCase().includes(query);

        return matchNombre || matchDocumento || matchEmail || matchCargo || matchSede || matchTelefono;
      }

      return true;
    });
  }, [usuariosUnicos, searchTerm, busquedaGlobal, activeTab]);

  // 4. Paginación de usuarios
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ITEMS_PER_PAGE_USUARIOS = itemsPerPage;

  // Resetear a página 1 cada vez que cambie la búsqueda o el filtro de rol superior
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, busquedaGlobal, activeTab]);

  const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / ITEMS_PER_PAGE_USUARIOS));
  const currentUsuariosPage = Math.min(currentPage, totalPages);
  const paginatedUsuarios = useMemo(() => {
    const start = (currentUsuariosPage - 1) * ITEMS_PER_PAGE_USUARIOS;
    return usuariosFiltrados.slice(start, start + ITEMS_PER_PAGE_USUARIOS);
  }, [usuariosFiltrados, currentUsuariosPage, ITEMS_PER_PAGE_USUARIOS]);

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
    const proys = Array.isArray(u.proyectos_asignados)
      ? u.proyectos_asignados
      : (typeof u.proyectos_asignados === 'string'
        ? (u.proyectos_asignados.startsWith('[') ? JSON.parse(u.proyectos_asignados) : [u.proyectos_asignados])
        : []);

    setFormDataEditar({
      documento: u.documento || '',
      nombre: u.nombre || '',
      telefono: u.telefono || '',
      email: u.email || '',
      password: '',
      rol: u.rol || 'usuario',
      cargo: u.cargo || '',
      sede: u.sede || 'Medellín',
      avatar_url: u.avatar_url || u.avatarUrl || u.foto_perfil || '',
      proyectos_asignados: proys,
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

    if (formDataEditar.rol === 'coordinador') {
      const proys = Array.isArray(formDataEditar.proyectos_asignados) ? formDataEditar.proyectos_asignados : [];
      if (proys.length === 0) {
        showError('Validación', 'Debes asignar al menos un Proyecto STEAM al Coordinador.');
        return;
      }
    }

    setGuardandoEdicion(true);
    try {
      const payloadParaEnviar = { ...formDataEditar };
      if (!payloadParaEnviar.password || !payloadParaEnviar.password.trim()) {
        delete payloadParaEnviar.password;
      } else {
        const pass = payloadParaEnviar.password.trim();
        // Validar complejidad institucional de contraseña
        const esValida =
          pass.length >= 8 &&
          /[A-Z]/.test(pass) &&
          /[a-z]/.test(pass) &&
          /[0-9]/.test(pass) &&
          /[@$!%*?&#]/.test(pass);

        if (!esValida) {
          showError(
            'Contraseña no válida',
            'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
          );
          setGuardandoEdicion(false);
          return;
        }
        payloadParaEnviar.password = pass;
      }

      await editarUsuario(usuarioEditando.id, payloadParaEnviar);

      const rolAnterior = (usuarioEditando.rol || 'usuario').toUpperCase();
      const rolNuevo = (formDataEditar.rol || 'usuario').toUpperCase();
      const huboCambioRol = rolAnterior !== rolNuevo;
      const proyAnteriores = Array.isArray(usuarioEditando.proyectos_asignados) ? usuarioEditando.proyectos_asignados : [];
      const proyNuevos = Array.isArray(formDataEditar.proyectos_asignados) ? formDataEditar.proyectos_asignados : [];
      const cambiaronProyectos = formDataEditar.rol === 'coordinador' && (
        proyAnteriores.length !== proyNuevos.length ||
        proyNuevos.some((p) => !proyAnteriores.includes(p))
      );
      const ejecutor = currentUser ? `${currentUser.nombre} (${currentUser.rol || 'Administrador'})` : 'Administrador FMO';

      try {
        if (cambiaronProyectos) {
          await registrarAuditoria({
            tipo: 'Asignación de Proyectos STEAM',
            elemento: formDataEditar.nombre,
            id_referencia: formDataEditar.documento,
            cantidad: proyNuevos.length,
            responsable: ejecutor,
            documento_responsable: currentUser?.documento || '',
            sede: formDataEditar.sede || 'Medellín',
            motivo: `Asignación/modificación de Proyectos STEAM al Coordinador: [${proyNuevos.join(', ')}]. Anterior: [${proyAnteriores.join(', ') || 'Ninguno'}].`,
          });
        }

        if (huboCambioRol) {
          await registrarAuditoria({
            tipo: 'Cambio de Rol',
            elemento: formDataEditar.nombre,
            id_referencia: formDataEditar.documento,
            cantidad: 1,
            responsable: ejecutor,
            documento_responsable: currentUser?.documento || '',
            sede: formDataEditar.sede || 'Medellín',
            motivo: `Modificación de privilegios de usuario: rol anterior [${rolAnterior}] ➔ rol nuevo [${rolNuevo}]. Cargo: ${formDataEditar.cargo || 'Funcionario FMO'}`,
          });
        } else if (!cambiaronProyectos) {
          await registrarAuditoria({
            tipo: 'Actualización',
            elemento: formDataEditar.nombre,
            id_referencia: formDataEditar.documento,
            cantidad: 1,
            responsable: ejecutor,
            documento_responsable: currentUser?.documento || '',
            sede: formDataEditar.sede || 'Medellín',
            motivo: `Actualización de ficha de usuario. Rol: [${rolNuevo}]. Correo: ${formDataEditar.email}. Cargo: ${formDataEditar.cargo || 'Funcionario FMO'}`,
          });
        }
      } catch (audErr) {
        console.warn('Aviso auditoria edicion usuario:', audErr?.message);
      }

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
            <span style={{ fontFamily: "'Poppins', sans-serif", letterSpacing: '0.02em', fontWeight: 600, color: 'var(--copper, #84CC16)' }}>{u.documento}</span>)?
          </p>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.85 }}>
            El usuario perderá inmediatamente sus privilegios de acceso y sus registros históricos quedarán archivados en auditoría.
          </p>
        </div>
      ),
      confirmText: 'Dar de Baja',
      cancelText: 'Cancelar',
      isDanger: true,
      onConfirm: async () => {
        eliminarUsuario(u.id);
        const ejecutor = currentUser ? `${currentUser.nombre} (${currentUser.rol || 'Administrador'})` : 'Administrador FMO';
        try {
          await registrarAuditoria({
            tipo: 'Baja',
            elemento: u.nombre,
            id_referencia: u.documento,
            cantidad: 1,
            responsable: ejecutor,
            documento_responsable: currentUser?.documento || '',
            sede: u.sede || 'Medellín',
            motivo: `Revocación de acceso y baja de usuario en el sistema. Rol revocado: [${(u.rol || 'usuario').toUpperCase()}]`,
          });
        } catch (audErr) {
          console.warn('Aviso auditoria baja usuario:', audErr?.message);
        }
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
      case 'coordinador':
        return (
          <span
            className="badge-role coordinador"
            title="Rol: Coordinador"
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
              backgroundColor: 'rgba(44, 172, 208, 0.15)',
              color: '#0284c7',
              border: '1px solid rgba(44, 172, 208, 0.35)',
            }}
          >
            <Compass style={{ width: '11px', height: '11px', flexShrink: 0 }} />
            <span>Coordinador</span>
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
            className={`tab-btn ${activeTab === 'coordinador' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('coordinador');
              setCurrentPage(1);
            }}
          >
            <span>🧭 Coordinadores</span>
            <span className="tab-badge">{coordCount}</span>
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
              {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
            </span>
          </h2>
          <span className="section-subtitle">
            Administración de personal, custodios STEAM y asignación de credenciales institucionales
          </span>
        </div>

        {/* =========================================================================
            TABLA PRINCIPAL (DISTRIBUCIÓN 100% BALANCEADA SIN COLISIONES)
            ========================================================================= */}
        <div className="panel" style={{ paddingBottom: '0', overflow: 'hidden' }}>
          {loading && usuarios.length === 0 ? (
            <ModuleConnectionState
              mode="loading"
              isRetryingOrSlow={isRetryingOrSlow}
              className="border-0 shadow-none"
            />
          ) : error && usuarios.length === 0 ? (
            <ModuleConnectionState
              mode="error"
              onRetry={onRetry}
              className="border-0 shadow-none"
            />
          ) : (
            <>
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: isAdmin ? '12%' : '14%', padding: '10px 8px', textAlign: 'center' }}>DOCUMENTO</th>
                <th style={{ width: isAdmin ? '24%' : '27%', padding: '10px 10px', textAlign: 'left' }}>USUARIO & CARGO</th>
                <th style={{ width: isAdmin ? '13%' : '15%', padding: '10px 8px', textAlign: 'left' }}>TELÉFONO</th>
                <th style={{ width: isAdmin ? '20%' : '23%', padding: '10px 8px', textAlign: 'left' }}>CORREO ELECTRÓNICO</th>
                <th style={{ width: isAdmin ? '11%' : '11%', padding: '10px 6px', textAlign: 'center' }}>SEDE</th>
                <th style={{ width: isAdmin ? '10%' : '10%', padding: '10px 6px', textAlign: 'center' }}>ROL</th>
                {isAdmin && <th style={{ width: '10%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>}
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
                paginatedUsuarios.map((u, idx) => {
                  const isCurrent = u.id === currentUser?.id;
                  const sedeCorta = formatSede(u.sede);

                  return (
                    <tr key={u.id ? `usr-${u.id}` : `usr-row-${idx}`} className="h-auto">
                      {/* 1. DOCUMENTO (Badge rectangular compacto) */}
                      <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <span className="badge-placa" style={{ cursor: 'default', fontSize: '11.5px', padding: '2px 7px' }} title={`Documento: ${u.documento}`}>
                          {u.documento}
                        </span>
                      </td>

                      {/* 2. USUARIO & CARGO (Avatar + Texto con elipsis limpia) */}
                      <td style={{ padding: '9px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                          <UserAvatar
                            nombre={u.nombre}
                            avatarUrl={u.avatar_url || u.avatarUrl || u.foto_perfil}
                            size="w-9 h-9 min-w-[36px] min-h-[36px] aspect-square"
                            textSize="text-xs"
                          />
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

                            {/* Proyectos STEAM Asignados (Solo para Coordinador) */}
                            {String(u.rol).toLowerCase() === 'coordinador' && Array.isArray(u.proyectos_asignados) && u.proyectos_asignados.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px',
                                  marginTop: '5px',
                                  maxWidth: '100%',
                                }}
                              >
                                {u.proyectos_asignados.map((proy, pIdx) => {
                                  const areaConf = resolveAreaConfig(proy);
                                  const Icono = areaConf?.Icon || RoboticaIcon;
                                  return (
                                    <span
                                      key={pIdx}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#abd037]/15 text-[#013a52] dark:text-[#abd037] border border-[#abd037]/35 max-w-[190px] shadow-2xs"
                                      title={`Proyecto STEAM Asignado: ${proy} (Programa: ${areaConf?.label || 'Oficial'})`}
                                      style={{
                                        fontFamily: "'Poppins', sans-serif",
                                        boxSizing: 'border-box',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: '12px',
                                          height: '12px',
                                          flexShrink: 0,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <Icono size={11} />
                                      </span>
                                      <span
                                        className="truncate block flex-1 min-w-0"
                                        style={{
                                          display: 'block',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {proy}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
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
                            style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px' }}
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
                              onClick={() => handleOpenDetalle(u)}
                              className="btn-icon-crud shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-slate-100 shadow-sm"
                              style={{
                                width: '26px',
                                height: '26px',
                                flexShrink: 0,
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#10b981',
                                transition: 'all 0.15s ease',
                              }}
                              title="Consultar ficha completa del usuario"
                            >
                              <Eye style={{ width: '13px', height: '13px' }} />
                            </button>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                <span>Filas:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-input, #fff)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={99999}>Todos</option>
                </select>
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
        </>
          )}
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
        sedes={sedesList}
      />

      {/* =========================================================================
          MODAL INSTITUCIONAL: EDITAR USUARIO
          ========================================================================= */}
      <DetalleUsuarioModal
        isOpen={modalDetalleOpen}
        onClose={() => setModalDetalleOpen(false)}
        usuario={usuarioDetalle}
        onEditar={handleOpenEditar}
        isAdmin={isAdmin}
      />

      <ModalEditarUsuario
        isOpen={modalEditarOpen}
        onClose={() => setModalEditarOpen(false)}
        usuario={usuarioEditando}
        formData={formDataEditar}
        onChangeFormData={setFormDataEditar}
        onSubmit={handleGuardarEdicion}
        loading={guardandoEdicion}
        sedes={sedesList}
      />
    </div>
  );
}
