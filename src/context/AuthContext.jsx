import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Catálogo inicial de usuarios representativos de la Fundación Marina Orth
const USUARIOS_INICIALES = [
  {
    id: 'usr-001',
    documento: '1017123456',
    nombre: 'Santiago Ortiz',
    email: 'santiago.ortiz@fmo.org',
    telefono: '3001234567',
    rol: 'administrador',
    cargo: 'Coordinador Tecnológico & STEAM',
    sede: 'Medellín',
  },
  {
    id: 'usr-002',
    documento: '1020456789',
    nombre: 'Nicolas Tamayo',
    email: 'nicolas.tamayo@fmo.org',
    telefono: '3104567890',
    rol: 'supervisor',
    cargo: 'Supervisor de Sedes & Semilleros',
    sede: 'Carmen de Viboral',
  },
  {
    id: 'usr-003',
    documento: '1035789123',
    nombre: 'Dolly Montoya',
    email: 'dolly.montoya@fmo.org',
    telefono: '3157891234',
    rol: 'operador',
    cargo: 'Operadora de Inventario & Bodega',
    sede: 'Carmen de Viboral',
  },
  {
    id: 'usr-004',
    documento: '1040321654',
    nombre: 'Yury Torres',
    email: 'yury.torres@fmo.org',
    telefono: '3203216549',
    rol: 'usuario',
    cargo: 'Formadora Robótica STEAM',
    sede: 'Medellín',
  },
  {
    id: 'usr-005',
    documento: '1052987654',
    nombre: 'Sofia Muñoz',
    email: 'sofia.munoz@fmo.org',
    telefono: '3129876543',
    rol: 'usuario',
    cargo: 'Formadora STEAM & Electrónica',
    sede: 'Medellín',
  },
  {
    id: 'usr-006',
    documento: '1064123987',
    nombre: 'Santiago Galeano',
    email: 'santiago.galeano@fmo.org',
    telefono: '3011239876',
    rol: 'usuario',
    cargo: 'Formador de Semilleros STEAM',
    sede: 'La Ceja',
  },
];

export function AuthProvider({ children }) {
  // Lista de usuarios persistente en localStorage
  const [usuarios, setUsuarios] = useState(() => {
    try {
      const saved = localStorage.getItem('siga_usuarios');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Error al leer usuarios de localStorage:', e);
    }
    return USUARIOS_INICIALES;
  });

  // Usuario en sesión activa (por defecto Administrador)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('siga_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.rol) return parsed;
      }
    } catch (e) {
      console.warn('Error al leer usuario activo de localStorage:', e);
    }
    return USUARIOS_INICIALES[0]; // Santiago Ortiz (administrador)
  });

  // Sincronizar usuarios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('siga_usuarios', JSON.stringify(usuarios));
    } catch (e) {
      console.warn('Error al guardar usuarios en localStorage:', e);
    }
  }, [usuarios]);

  // Sincronizar usuario actual en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('siga_current_user', JSON.stringify(currentUser));
    } catch (e) {
      console.warn('Error al guardar usuario activo en localStorage:', e);
    }
  }, [currentUser]);

  // Cambiar rol del usuario actual o cambiar de usuario
  const cambiarRolActivo = (nuevoRol) => {
    setCurrentUser((prev) => ({
      ...prev,
      rol: nuevoRol,
    }));
  };

  const seleccionarUsuarioActivo = (user) => {
    setCurrentUser(user);
  };

  // Operaciones CRUD de usuarios
  const crearUsuario = (nuevo) => {
    const id = `usr-${Date.now().toString().slice(-4)}`;
    const userCreado = {
      id,
      ...nuevo,
      documento: String(nuevo.documento || '').trim(),
      nombre: String(nuevo.nombre || '').trim(),
      email: String(nuevo.email || '').trim(),
      telefono: String(nuevo.telefono || '').trim(),
      rol: nuevo.rol || 'usuario',
      sede: nuevo.sede || 'Medellín',
    };
    setUsuarios((prev) => [userCreado, ...prev]);
    return userCreado;
  };

  const editarUsuario = (id, datosActualizados) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...datosActualizados } : u))
    );
    // Si se editó el usuario activo, actualizarlo
    if (currentUser?.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...datosActualizados }));
    }
  };

  const eliminarUsuario = (id) => {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    // Si se eliminó el usuario en sesión, regresar a admin
    if (currentUser?.id === id) {
      setCurrentUser(USUARIOS_INICIALES[0]);
    }
  };

  const isAdmin = currentUser?.rol === 'administrador';
  const isSupervisor = currentUser?.rol === 'supervisor';
  const isOperador = currentUser?.rol === 'operador';
  const isUsuario = currentUser?.rol === 'usuario';

  return (
    <AuthContext.Provider
      value={{
        usuarios,
        currentUser,
        setCurrentUser,
        cambiarRolActivo,
        seleccionarUsuarioActivo,
        crearUsuario,
        editarUsuario,
        eliminarUsuario,
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

export default AuthContext;
