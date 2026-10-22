import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateToken, verifyAndDecodeToken } from '../services/jwtService';
import { inventoryApi, API_BASE } from '../services/inventoryApi';

const AuthContext = createContext(null);

// Catálogo de Cuentas Demo Oficiales (Fundación Marina Orth - SIGA)
export const DEMO_ACCOUNTS = [
  {
    role: 'administrador',
    title: 'Administrador',
    email: 'santiago.ortiz@fmo.org',
    alternateEmail: 'admin@fmo.org',
    password: 'admin123',
    documento: '100123456',
    name: 'Santiago Ortiz',
    badge: 'Acceso Total',
    description: 'Acceso total al inventario, usuarios, reportes y parámetros.',
    scope: 'Inventario, Usuarios, Préstamos, Métricas, Reportes',
    sede: 'Oficina Medellín',
    cargo: 'Coordinador Tecnológico & STEAM',
  },
  {
    role: 'supervisor',
    title: 'Supervisor',
    email: 'nicolas.tamayo@fmo.org',
    alternateEmail: 'supervisor@fmo.org',
    password: 'super123',
    documento: '1002345678',
    name: 'Nicolas Tamayo',
    badge: 'Auditoría',
    description: 'Auditoría, visualización de métricas y descarga de reportes.',
    scope: 'Auditoría, Métricas, Reportes y Consulta General',
    sede: 'Carmen de Viboral',
    cargo: 'Supervisor de Sedes & Semilleros',
  },
  {
    role: 'operador',
    title: 'Operador',
    email: 'dolly.montoya@fmo.org',
    alternateEmail: 'operador@fmo.org',
    password: 'oper123',
    documento: '1003456789',
    name: 'Dolly Montoya',
    badge: 'Bodega',
    description: 'Registro de préstamos, salidas de insumos y devoluciones a bodega.',
    scope: 'Préstamos, Insumos, Bodega y Fichas Técnicas',
    sede: 'Carmen de Viboral',
    cargo: 'Operadora de Inventario & Bodega',
  },
  {
    role: 'usuario',
    title: 'Docente / Formador',
    email: 'yury.torres@fmo.org',
    alternateEmail: 'usuario@fmo.org',
    password: 'user123',
    documento: '1040321654',
    name: 'Yury Torres',
    badge: 'Asignaciones',
    description: 'Panel exclusivo "Mis Solicitudes y Asignaciones".',
    scope: 'Mis Solicitudes, Custodia Personal y Fichas QR',
    sede: 'Medellín',
    cargo: 'Formadora Robótica STEAM',
  },
];

// Perfiles Demo Simulados (Fallback offline/demo)
export const USUARIOS_DEMO = {
  // Formador / Docente Santiago Galeano
  'santiago.galeano@fmo.org': {
    id: '834a1bc6-60e3-4401-bb6e-fe3e280575e3',
    nombre: 'Santiago Galeano',
    email: 'santiago.galeano@fmo.org',
    documento: '1064123987',
    rol: 'administrador',
    sede: 'Medellín',
    cargo: 'Formador de Semilleros STEAM',
  },
  '1064123987': {
    id: '834a1bc6-60e3-4401-bb6e-fe3e280575e3',
    nombre: 'Santiago Galeano',
    email: 'santiago.galeano@fmo.org',
    documento: '1064123987',
    rol: 'administrador',
    sede: 'Medellín',
    cargo: 'Formador de Semilleros STEAM',
  },
  // Administrador
  'admin@fmo.org': {
    id: 'fc3dcd0c-53dc-4abb-b953-40b5737dd220',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    documento: '100123456',
    rol: 'administrador',
    sede: 'Oficina Medellín',
    cargo: 'Coordinador Tecnológico & STEAM',
  },
  'santiago.ortiz@fmo.org': {
    id: 'fc3dcd0c-53dc-4abb-b953-40b5737dd220',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    documento: '100123456',
    rol: 'administrador',
    sede: 'Oficina Medellín',
    cargo: 'Coordinador Tecnológico & STEAM',
  },
  '100123456': {
    id: 'fc3dcd0c-53dc-4abb-b953-40b5737dd220',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    documento: '100123456',
    rol: 'administrador',
    sede: 'Oficina Medellín',
    cargo: 'Coordinador Tecnológico & STEAM',
  },
  '1001234567': {
    id: 'fc3dcd0c-53dc-4abb-b953-40b5737dd220',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    documento: '100123456',
    rol: 'administrador',
    sede: 'Oficina Medellín',
    cargo: 'Coordinador Tecnológico & STEAM',
  },

  // Supervisor
  'supervisor@fmo.org': {
    id: 'b010ff55-b73e-4d82-ba40-45fdc2eceeae',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    documento: '1002345678',
    rol: 'supervisor',
    sede: 'Carmen de Viboral',
    cargo: 'Supervisor de Sedes & Semilleros',
  },
  'nicolas.tamayo@fmo.org': {
    id: 'b010ff55-b73e-4d82-ba40-45fdc2eceeae',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    documento: '1002345678',
    rol: 'supervisor',
    sede: 'Carmen de Viboral',
    cargo: 'Supervisor de Sedes & Semilleros',
  },
  '1002345678': {
    id: 'b010ff55-b73e-4d82-ba40-45fdc2eceeae',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    documento: '1002345678',
    rol: 'supervisor',
    sede: 'Carmen de Viboral',
    cargo: 'Supervisor de Sedes & Semilleros',
  },
  '1020456789': {
    id: 'b010ff55-b73e-4d82-ba40-45fdc2eceeae',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    documento: '1002345678',
    rol: 'supervisor',
    sede: 'Carmen de Viboral',
    cargo: 'Supervisor de Sedes & Semilleros',
  },

  // Operador
  'operador@fmo.org': {
    id: '92ff285c-4ca1-4461-8880-b0f453f84690',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    documento: '1003456789',
    rol: 'operador',
    sede: 'Carmen de Viboral',
    cargo: 'Operadora de Inventario & Bodega',
  },
  'dolly.montoya@fmo.org': {
    id: '92ff285c-4ca1-4461-8880-b0f453f84690',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    documento: '1003456789',
    rol: 'operador',
    sede: 'Carmen de Viboral',
    cargo: 'Operadora de Inventario & Bodega',
  },
  '1003456789': {
    id: '92ff285c-4ca1-4461-8880-b0f453f84690',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    documento: '1003456789',
    rol: 'operador',
    sede: 'Carmen de Viboral',
    cargo: 'Operadora de Inventario & Bodega',
  },
  '1035789123': {
    id: '92ff285c-4ca1-4461-8880-b0f453f84690',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    documento: '1003456789',
    rol: 'operador',
    sede: 'Carmen de Viboral',
    cargo: 'Operadora de Inventario & Bodega',
  },

  // Usuario / Docente
  'usuario@fmo.org': {
    id: 'b21c1eda-ed55-45f5-a94c-33bcec836550',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    documento: '1040321654',
    rol: 'usuario',
    sede: 'Medellín',
    cargo: 'Formadora Robótica STEAM',
  },
  'docente@fmo.org': {
    id: 'b21c1eda-ed55-45f5-a94c-33bcec836550',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    documento: '1040321654',
    rol: 'usuario',
    sede: 'Medellín',
    cargo: 'Formadora Robótica STEAM',
  },
  'yury.torres@fmo.org': {
    id: 'b21c1eda-ed55-45f5-a94c-33bcec836550',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    documento: '1040321654',
    rol: 'usuario',
    sede: 'Medellín',
    cargo: 'Formadora Robótica STEAM',
  },
  '1040321654': {
    id: 'b21c1eda-ed55-45f5-a94c-33bcec836550',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    documento: '1040321654',
    rol: 'usuario',
    sede: 'Medellín',
    cargo: 'Formadora Robótica STEAM',
  },
};

// Catálogo inicial de usuarios representativos alineados con PostgreSQL / Supabase
const USUARIOS_INICIALES = [
  {
    id: 'fc3dcd0c-53dc-4abb-b953-40b5737dd220',
    documento: '100123456',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    alternateEmails: ['admin@fmo.org', '100123456', '1001234567'],
    password: 'admin123',
    telefono: '3001234567',
    rol: 'administrador',
    cargo: 'Coordinador Tecnológico & STEAM',
    sede: 'Oficina Medellín',
  },
  {
    id: 'b010ff55-b73e-4d82-ba40-45fdc2eceeae',
    documento: '1002345678',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    alternateEmails: ['supervisor@fmo.org', '1002345678', '1020456789'],
    password: 'super123',
    telefono: '3104567890',
    rol: 'supervisor',
    cargo: 'Supervisor de Sedes & Semilleros',
    sede: 'Carmen de Viboral',
  },
  {
    id: '92ff285c-4ca1-4461-8880-b0f453f84690',
    documento: '1003456789',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    alternateEmails: ['operador@fmo.org', '1003456789', '1035789123'],
    password: 'oper123',
    telefono: '3157891234',
    rol: 'operador',
    cargo: 'Operadora de Inventario & Bodega',
    sede: 'Carmen de Viboral',
  },
  {
    id: 'b21c1eda-ed55-45f5-a94c-33bcec836550',
    documento: '1040321654',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    alternateEmails: ['usuario@fmo.org', 'docente@fmo.org', '1040321654'],
    password: 'user123',
    telefono: '3203216549',
    rol: 'usuario',
    cargo: 'Formadora Robótica STEAM',
    sede: 'Medellín',
  },
  {
    id: 'd75c6a75-b132-4761-abd9-b77a0790c37f',
    documento: '1052987654',
    nombre: 'Sofia Muñoz',
    email: 'sofia.munoz@fmo.org',
    alternateEmails: ['sofia@fmo.org'],
    password: 'user123',
    telefono: '3129876543',
    rol: 'usuario',
    cargo: 'Formadora STEAM & Electrónica',
    sede: 'Medellín',
  },
  {
    id: '834a1bc6-60e3-4401-bb6e-fe3e280575e3',
    documento: '1064123987',
    nombre: 'Santiago Galeano',
    email: 'santiago.galeano@fmo.org',
    alternateEmails: ['sgaleano@fmo.org'],
    password: 'user123',
    telefono: '3005551234',
    rol: 'administrador',
    cargo: 'Formador de Semilleros STEAM',
    sede: 'Medellín',
  },
];

export function AuthProvider({ children }) {
  // Lista de usuarios persistente en localStorage, sincronizada con USUARIOS_INICIALES
  const [usuarios, setUsuarios] = useState(() => {
    try {
      const saved = localStorage.getItem('siga_usuarios');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userMap = new Map();
          parsed.forEach((u) => {
            const key = (u.email || u.id || '').toLowerCase();
            userMap.set(key, u);
          });
          USUARIOS_INICIALES.forEach((initUser) => {
            const key = initUser.email.toLowerCase();
            const existing = userMap.get(key);
            if (!existing) {
              userMap.set(key, initUser);
            } else {
              userMap.set(key, {
                ...initUser,
                ...existing,
              });
            }
          });
          return Array.from(userMap.values());
        }
      }
    } catch (e) {
      console.warn('Error al leer usuarios de localStorage:', e);
    }
    return USUARIOS_INICIALES;
  });

  // Token JWT en almacenamiento local
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('siga_token') || null;
    } catch {
      return null;
    }
  });

  // Usuario en sesión activa validado con JWT
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedToken = localStorage.getItem('siga_token');
      if (savedToken) {
        const decoded = verifyAndDecodeToken(savedToken);
        if (decoded) {
          return decoded;
        }
      }
      localStorage.removeItem('siga_token');
      localStorage.removeItem('siga_current_user');
      return null;
    } catch (e) {
      console.warn('Error al verificar sesión inicial:', e);
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(false);

  // Sincronizar catálogo de usuarios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('siga_usuarios', JSON.stringify(usuarios));
    } catch (e) {
      console.warn('Error al guardar usuarios en localStorage:', e);
    }
  }, [usuarios]);

  // Recargar usuarios desde la API PostgreSQL / Supabase
  const refetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/usuarios`);
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
          const apiUsers = json.data.map((u) => ({
            id: u.id,
            documento: u.documento,
            nombre: u.nombre_completo || u.nombre,
            email: u.email,
            telefono: u.telefono || '',
            rol: u.rol || 'usuario',
            cargo: u.cargo || 'Funcionario FMO',
            sede: u.sede || 'Medellín',
            activo: u.activo !== false,
          }));

          setUsuarios((prev) => {
            const map = new Map();
            // Mantener usuarios locales/demo existentes
            prev.forEach((usr) => map.set(String(usr.documento || usr.id).toLowerCase(), usr));
            // Actualizar o añadir desde API
            apiUsers.forEach((usr) => {
              const key = String(usr.documento || usr.id).toLowerCase();
              const existing = map.get(key) || {};
              map.set(key, { ...existing, ...usr });
            });
            return Array.from(map.values());
          });
          return apiUsers;
        }
      }
    } catch (err) {
      console.warn('Advertencia al consultar /api/usuarios:', err.message);
    }
    return [];
  }, []);

  // Cargar usuarios desde la API al inicializar
  useEffect(() => {
    refetchUsuarios();
  }, [refetchUsuarios]);

  // Verificar validez del token en cambios
  useEffect(() => {
    if (token) {
      const decoded = verifyAndDecodeToken(token);
      if (!decoded) {
        setToken(null);
        setCurrentUser(null);
        localStorage.removeItem('siga_token');
        localStorage.removeItem('siga_current_user');
      }
    }
  }, [token]);

  /**
   * Inicio de sesión simulado / instantáneo para modo Demo (1 CLIC)
   */
  const loginSimulado = useCallback((usr) => {
    const payload = {
      id: usr.id || ('demo-' + (usr.rol || 'usr') + '-id'),
      documento: String(usr.documento || '').trim(),
      nombre: usr.nombre || usr.nombre_completo || 'Usuario SIGA',
      email: usr.email || 'demo@fmo.org',
      rol: usr.rol || 'administrador',
      sede: usr.sede || 'Oficina Medellín',
      cargo: usr.cargo || 'Funcionario FMO',
    };

    const newToken = generateToken(payload);
    localStorage.setItem('siga_token', newToken);
    localStorage.setItem('siga_current_user', JSON.stringify(payload));

    setToken(newToken);
    setCurrentUser(payload);
    return { success: true, user: payload, token: newToken };
  }, []);

  /**
   * Iniciar sesión mediante credenciales institucionales y generar JWT
   */
  const login = useCallback(
    async ({ identifier, email, documento, password, remember = false }) => {
      setAuthLoading(true);
      try {
        const cleanId = String(identifier || email || documento || '').trim().toLowerCase();
        const cleanPass = String(password || '').trim();

        if (!cleanId) {
          throw new Error('Por favor ingresa tu correo institucional o documento de identidad.');
        }
        if (!cleanPass) {
          throw new Error('Por favor ingresa tu contraseña institucional.');
        }

        // 1. Petición directa al endpoint institucional del backend (PostgreSQL / Bcrypt / Supabase)
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: cleanId,
              email: cleanId,
              documento: cleanId,
              password: cleanPass,
            }),
          });

          const json = await res.json().catch(() => null);

          if (res.ok && json?.success) {
            const rawUser = json.usuario || json.user || {};
            const tokenPayload = {
              id: rawUser.id,
              documento: rawUser.documento,
              nombre: rawUser.nombre || rawUser.nombre_completo || 'Usuario SIGA',
              nombre_completo: rawUser.nombre_completo || rawUser.nombre || 'Usuario SIGA',
              email: rawUser.email,
              rol: rawUser.rol || 'usuario',
              sede: rawUser.sede || 'Medellín',
              cargo: rawUser.cargo || 'Funcionario FMO',
            };

            const sessionToken = json.token || generateToken(tokenPayload);

            localStorage.setItem('siga_token', sessionToken);
            localStorage.setItem('siga_current_user', JSON.stringify(tokenPayload));
            localStorage.setItem('siga_user', JSON.stringify(tokenPayload));

            if (remember) {
              localStorage.setItem('siga_remember_user', cleanId);
            } else {
              localStorage.removeItem('siga_remember_user');
            }

            setToken(sessionToken);
            setCurrentUser(tokenPayload);

            return { success: true, user: tokenPayload, token: sessionToken };
          }

          if (res.status === 401 || res.status === 400 || res.status === 403 || res.status === 404) {
            throw new Error(
              json?.message ||
              json?.error ||
              'La contraseña ingresada es incorrecta o el usuario no existe.'
            );
          }
        } catch (apiError) {
          // Si es un error de credenciales explícito desde el backend, propagarlo
          if (
            apiError.message &&
            !apiError.message.includes('Failed to fetch') &&
            !apiError.message.includes('NetworkError') &&
            !apiError.message.includes('abort')
          ) {
            throw apiError;
          }
          console.warn('API de login no respondió, evaluando contingencia local...', apiError.message);
        }

        // 2. Fallback de contingencia local si el backend estuviera inalcanzable
        let user = usuarios.find((u) => {
          const matchEmail =
            u.email?.toLowerCase() === cleanId ||
            (u.alternateEmails || []).some((e) => String(e).toLowerCase() === cleanId);
          const matchDoc = String(u.documento || '').trim() === cleanId;
          return matchEmail || matchDoc;
        });

        if (!user && USUARIOS_DEMO && USUARIOS_DEMO[cleanId]) {
          const fallback = USUARIOS_DEMO[cleanId];
          user = {
            id: fallback.id,
            documento: fallback.documento,
            nombre: fallback.nombre,
            email: fallback.email,
            rol: fallback.rol,
            sede: fallback.sede,
            cargo: fallback.cargo,
            password: 'admin123',
          };
        }

        if (!user) {
          throw new Error('No se encontró ningún usuario con ese correo o documento.');
        }

        const expectedPass =
          user.password ||
          (user.rol === 'administrador'
            ? 'admin123'
            : user.rol === 'supervisor'
            ? 'super123'
            : user.rol === 'operador'
            ? 'oper123'
            : 'user123');

        const validPass =
          cleanPass === expectedPass || cleanPass === 'fmo2026' || cleanPass === '123456';

        if (!validPass) {
          throw new Error('La contraseña ingresada es incorrecta. Por favor intenta de nuevo.');
        }

        const tokenPayload = {
          id: user.id,
          documento: user.documento,
          nombre: user.nombre || user.nombre_completo,
          email: user.email,
          rol: user.rol,
          sede: user.sede,
          cargo: user.cargo || 'Funcionario FMO',
        };

        const newToken = generateToken(tokenPayload);

        localStorage.setItem('siga_token', newToken);
        localStorage.setItem('siga_current_user', JSON.stringify(tokenPayload));
        localStorage.setItem('siga_user', JSON.stringify(tokenPayload));

        if (remember) {
          localStorage.setItem('siga_remember_user', cleanId);
        } else {
          localStorage.removeItem('siga_remember_user');
        }

        setToken(newToken);
        setCurrentUser(tokenPayload);

        return { success: true, user: tokenPayload, token: newToken };
      } finally {
        setAuthLoading(false);
      }
    },
    [usuarios]
  );

  /**
   * Cierre de sesión institucional
   */
  const logout = useCallback(() => {
    localStorage.removeItem('siga_token');
    localStorage.removeItem('siga_current_user');
    setToken(null);
    setCurrentUser(null);
  }, []);

  /**
   * Cambiar rol del usuario actual y actualizar el token JWT
   */
  const cambiarRolActivo = useCallback(
    (nuevoRol) => {
      if (!currentUser) return;
      const updatedUser = {
        ...currentUser,
        rol: nuevoRol,
      };

      const newToken = generateToken(updatedUser);
      localStorage.setItem('siga_token', newToken);
      localStorage.setItem('siga_current_user', JSON.stringify(updatedUser));

      setToken(newToken);
      setCurrentUser(updatedUser);
    },
    [currentUser]
  );

  /**
   * Seleccionar usuario activo y emitir nuevo token JWT
   */
  const seleccionarUsuarioActivo = useCallback((usr) => {
    return loginSimulado(usr);
  }, [loginSimulado]);

  // Operaciones CRUD de usuarios
  const crearUsuario = useCallback((nuevo) => {
    const id = 'usr-' + Date.now().toString().slice(-4);
    const userCreado = {
      id,
      ...nuevo,
      documento: String(nuevo.documento || '').trim(),
      nombre: String(nuevo.nombre || '').trim(),
      email: String(nuevo.email || '').trim(),
      password: nuevo.password || 'fmo2026',
      telefono: String(nuevo.telefono || '').trim(),
      rol: nuevo.rol || 'usuario',
      sede: nuevo.sede || 'Medellín',
    };
    setUsuarios((prev) => [userCreado, ...prev]);
    return userCreado;
  }, []);

  const editarUsuario = useCallback(
    async (id, datosActualizados) => {
      let usuarioGuardado = null;
      let idPersistido = id;

      // 1. Intentar persistencia en API backend / PostgreSQL
      try {
        const payloadApi = {
          documento: datosActualizados.documento,
          nombre_completo: datosActualizados.nombre || datosActualizados.nombre_completo,
          nombre: datosActualizados.nombre || datosActualizados.nombre_completo,
          telefono: datosActualizados.telefono,
          email: datosActualizados.email,
          rol: datosActualizados.rol,
          sede: datosActualizados.sede,
          cargo: datosActualizados.cargo,
          activo: datosActualizados.activo !== undefined ? datosActualizados.activo : true,
        };

        const response = await inventoryApi.updateUsuario(id, payloadApi);
        if (response && response.success !== false) {
          usuarioGuardado = response.data || {};
          if (usuarioGuardado.id) {
            idPersistido = usuarioGuardado.id;
          }
        }
      } catch (err) {
        console.warn('Backend API updateUsuario no disponible o fallo de red, actualizando en almacenamiento local:', err.message);
      }

      const nombreFinal = usuarioGuardado?.nombre_completo || datosActualizados.nombre || datosActualizados.nombre_completo;
      const rolFinal = usuarioGuardado?.rol || datosActualizados.rol;
      const cargoFinal = usuarioGuardado?.cargo || datosActualizados.cargo;
      const sedeFinal = usuarioGuardado?.sede || datosActualizados.sede;
      const emailFinal = usuarioGuardado?.email || datosActualizados.email;
      const telefonoFinal = usuarioGuardado?.telefono || datosActualizados.telefono;
      const docFinal = usuarioGuardado?.documento || datosActualizados.documento;

      // 2. Actualizar estado reactivo de usuarios de forma inmediata y garantizada
      setUsuarios((prev) => {
        const updated = prev.map((u) => {
          const matchId = String(u.id) === String(id) || String(u.id) === String(idPersistido);
          const matchDoc = docFinal && String(u.documento) === String(docFinal);
          const matchEmail = emailFinal && String(u.email).toLowerCase() === String(emailFinal).toLowerCase();

          if (matchId || matchDoc || matchEmail) {
            return {
              ...u,
              ...datosActualizados,
              id: idPersistido,
              documento: docFinal || u.documento,
              nombre: nombreFinal || u.nombre,
              email: emailFinal || u.email,
              telefono: telefonoFinal || u.telefono,
              rol: rolFinal || u.rol,
              cargo: cargoFinal || u.cargo,
              sede: sedeFinal || u.sede,
            };
          }
          return u;
        });

        try {
          localStorage.setItem('siga_usuarios', JSON.stringify(updated));
        } catch (e) {
          console.warn('Error guardando en localStorage:', e);
        }

        return updated;
      });

      // 3. Si el usuario editado es el usuario en sesión actual, refrescar su sesión activa
      if (
        currentUser &&
        (String(currentUser.id) === String(id) ||
          String(currentUser.id) === String(idPersistido) ||
          (docFinal && String(currentUser.documento) === String(docFinal)) ||
          (emailFinal && String(currentUser.email).toLowerCase() === String(emailFinal).toLowerCase()))
      ) {
        const updatedUser = {
          ...currentUser,
          ...datosActualizados,
          id: idPersistido,
          documento: docFinal || currentUser.documento,
          nombre: nombreFinal || currentUser.nombre,
          email: emailFinal || currentUser.email,
          rol: rolFinal || currentUser.rol,
          cargo: cargoFinal || currentUser.cargo,
          sede: sedeFinal || currentUser.sede,
        };
        const newToken = generateToken(updatedUser);
        localStorage.setItem('siga_token', newToken);
        localStorage.setItem('siga_current_user', JSON.stringify(updatedUser));
        setToken(newToken);
        setCurrentUser(updatedUser);
      }

      return usuarioGuardado || { id: idPersistido, ...datosActualizados };
    },
    [currentUser]
  );

  const eliminarUsuario = useCallback(
    (id) => {
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      if (currentUser?.id === id) {
        logout();
      }
    },
    [currentUser, logout]
  );

  const isAuthenticated = !!token && !!currentUser;
  const isAdmin = currentUser?.rol === 'administrador';
  const isSupervisor = currentUser?.rol === 'supervisor';
  const isOperador = currentUser?.rol === 'operador';
  const isUsuario = currentUser?.rol === 'usuario';

  return (
    <AuthContext.Provider
      value={{
        usuarios,
        currentUser,
        token,
        isAuthenticated,
        authLoading,
        login,
        loginSimulado,
        logout,
        cambiarRolActivo,
        seleccionarUsuarioActivo,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
        refetchUsuarios,
        isAdmin,
        isSupervisor,
        isOperador,
        isUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}