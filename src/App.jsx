import { useState, useMemo, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './styles/index.css';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import ResumenView from './views/ResumenView';
import InventarioView from './views/InventarioView';
import PrestamosView from './views/PrestamosView';
import HistorialView from './views/HistorialView';
import DetalleActivoPublico from './views/DetalleActivoPublico';
import UsuariosView from './views/UsuariosView';
import MiPanelUsuarioView from './views/MiPanelUsuarioView';
import LoginView from './views/LoginView';
import ProtectedRoute from './components/auth/ProtectedRoute';

import { useAuth } from './context/AuthContext';
import { today, fmtDate, available, isOverdue } from './data/initialData';
import { SEDES } from './services/mockData';
import inventoryApi from './services/inventoryApi';
import { exportarLibroMaestroExcelFMO } from './services/excelExportService';

function App() {
  // Estado de tema oscuro/claro con persistencia en localStorage (Tema Claro por defecto)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('siga_theme') || localStorage.getItem('marina_orth_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('siga_theme', theme);
    localStorage.setItem('marina_orth_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const { currentUser, isAdmin, isSupervisor, isOperador, isUsuario } = useAuth();

  // Estado simple de navegación para las vistas
  const [currentView, setCurrentView] = useState('resumen');

  // Redirigir a 'mi-panel' si el rol activo es 'usuario'
  useEffect(() => {
    if (isUsuario && currentView !== 'mi-panel' && currentView !== 'historial') {
      setCurrentView('mi-panel');
    } else if (!isUsuario && currentView === 'mi-panel') {
      setCurrentView('resumen');
    }
  }, [isUsuario, currentView]);

  // Proteger vista de usuarios: solo accesible para Administradores y Supervisores (Operador y Usuario redirigidos)
  useEffect(() => {
    if (!isAdmin && !isSupervisor && currentView === 'usuarios') {
      setCurrentView(isUsuario ? 'mi-panel' : 'resumen');
    }
  }, [isAdmin, isSupervisor, isUsuario, currentView]);

  // Parámetros de navegación inicial para transferir filtros desde Resumen
  const [inventarioParams, setInventarioParams] = useState({ tab: 'equipos', stockFilter: 'todos' });
  const [prestamosParams, setPrestamosParams] = useState({ section: 'all', estado: 'todos' });

  const handleNavigateFromSummary = (view, params = {}) => {
    if (view === 'inventario') {
      setInventarioParams({
        tab: params.tab || 'equipos',
        stockFilter: params.stockFilter || 'todos',
      });
    } else if (view === 'prestamos') {
      setPrestamosParams({
        section: params.section || 'all',
        estado: params.estado || 'todos',
      });
    }
    setCurrentView(view);
  };

  // Estado de carga y error de la API de Supabase / Backend
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Estado del inventario y movimientos (inicializados estrictamente con arreglos vacíos)
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [sedesList, setSedesList] = useState(SEDES);

  // Cargar datos reales desde Supabase / PostgreSQL al iniciar la aplicación
  const refreshFromApi = async () => {
    try {
      setLoading(true);
      setApiError(null);

      const [activosData, consumiblesData, prestamosData, entregasData, remisionesData, historialData, sedesData] = await Promise.all([
        inventoryApi.getActivos(),
        inventoryApi.getConsumibles(),
        inventoryApi.getPrestamos(),
        inventoryApi.getEntregas().catch((err) => {
          console.warn('Aviso: no se pudieron cargar entregas de consumibles:', err.message);
          return [];
        }),
        inventoryApi.getRemisiones().catch((err) => {
          console.warn('Aviso: no se pudieron cargar remisiones:', err.message);
          return [];
        }),
        inventoryApi.getHistorial().catch((err) => {
          console.warn('Aviso: no se pudo cargar historial de movimientos:', err.message);
          return [];
        }),
        inventoryApi.getSedes().catch((err) => {
          console.warn('Aviso: no se pudieron cargar sedes:', err.message);
          return [];
        }),
      ]);

      if (Array.isArray(sedesData) && sedesData.length > 0) {
        const nombresApi = sedesData.map((s) => s.nombre || s).filter(Boolean);
        const combinadas = Array.from(new Set([...SEDES, ...nombresApi]));
        setSedesList(combinadas);
      }

      const newItems = [];

      // Mapear consumibles directamente desde la base de datos
      if (Array.isArray(consumiblesData)) {
        consumiblesData.forEach((c) => {
          const disp = Number(c.disponible) || 0;
          const min = Number(c.minimo) ?? 5;
          newItems.push({
            id: c.id,
            material: c.material || c.name || '',
            name: c.material || c.name || '',
            categoria: c.categoria || 'Robótica',
            category: c.categoria || 'Robótica',
            disponible: disp,
            quantity: disp,
            minimo: min,
            minStock: min,
            ubicacion: c.ubicacion || 'Oficina FMO',
            location: c.ubicacion || 'Oficina FMO',
            ubicacion_estante: c.ubicacion_estante || '',
            itemType: 'consumible',
            dateAdded: c.created_at ? c.created_at.split('T')[0] : today(),
          });
        });
      }

      // Mapear activos directamente desde la base de datos
      if (Array.isArray(activosData)) {
        activosData.forEach((a) => {
          const unitObj = {
            code: a.placa,
            placa: a.placa,
            model: a.modelo || a.marca || 'Estándar',
            serial: a.serial || '—',
            sede: a.sede || 'Medellín',
            ubicacion_estante: a.ubicacion_estante || '',
            status: a.estado === 'En campo' ? 'prestado' : (a.estado || 'disponible').toLowerCase(),
            responsable: a.custodio || (a.estado === 'En campo' ? 'Custodio Temporal' : 'Bodega Central'),
          };

          const existingEq = newItems.find(
            (it) => it.itemType === 'equipo' && it.name.toLowerCase() === a.nombre.toLowerCase()
          );

          if (existingEq) {
            existingEq.units.push(unitObj);
          } else {
            newItems.push({
              id: `eq-${a.id || a.placa}`,
              name: a.nombre,
              category: a.marca || 'Equipos de Cómputo',
              itemType: 'equipo',
              location: a.sede ? `Sede ${a.sede}` : 'Bodega Medellín',
              sede: a.sede || 'Medellín',
              ubicacion_estante: a.ubicacion_estante || '',
              minStock: 1,
              units: [unitObj],
              quantity: 0,
              dateAdded: a.created_at ? a.created_at.split('T')[0] : today(),
            });
          }
        });
      }

      setItems(newItems);

      const newMovs = [];
      const historialKeys = new Set();

      // 1. Mapear registros de auditoría directa desde historial_movimientos
      if (Array.isArray(historialData) && historialData.length > 0) {
        historialData.forEach((h) => {
          const rawTipo = String(h.tipo || '').toLowerCase();
          let mappedType = rawTipo;
          if (rawTipo.includes('devolu')) mappedType = 'devolucion';
          else if (rawTipo.includes('presta')) mappedType = 'prestamo';
          else if (rawTipo.includes('entreg') || rawTipo.includes('salida')) mappedType = 'entrega';
          else if (rawTipo.includes('baja')) mappedType = 'baja';
          else if (rawTipo.includes('actualiz')) mappedType = 'actualizacion';

          const dateStr = h.fecha ? h.fecha.split('T')[0] : (h.created_at ? h.created_at.split('T')[0] : today());
          const dedupeKey = `${mappedType}-${String(h.placa_o_id || '').toLowerCase()}-${dateStr}`;
          historialKeys.add(dedupeKey);

          newMovs.push({
            id: `mov-hist-${h.id}`,
            dbId: 500000 + Number(h.id || 0),
            type: mappedType,
            tipo: h.tipo,
            itemId: h.placa_o_id,
            itemName: h.elemento_nombre || (h.placa_o_id ? `Activo (${h.placa_o_id})` : 'Material / Equipo'),
            qty: Number(h.cantidad) || 1,
            unitCodes: h.placa_o_id ? [h.placa_o_id] : [],
            person: h.responsable || '—',
            sede: h.sede || 'Medellín',
            motivo: h.detalles || 'Movimiento registrado',
            motive: h.detalles || 'Movimiento registrado',
            date: dateStr,
            fullDate: h.fecha || h.created_at || new Date().toISOString(),
            status: 'cerrado',
          });
        });
      }

      // 2. Mapear préstamos directamente desde la base de datos (vital para los préstamos activos)
      if (Array.isArray(prestamosData)) {
        prestamosData.forEach((p) => {
          const isConsumible = p.tipo_item === 'consumible' || (p.placa_activo && (p.placa_activo.toUpperCase().startsWith('ROB') || p.placa_activo.toUpperCase().startsWith('MAT')));
          const cant = p.cantidad ? Number(p.cantidad) : 1;
          const fechaSalida = p.fecha_salida ? p.fecha_salida.split('T')[0] : today();
          const fechaDev = p.fecha_devolucion_real ? p.fecha_devolucion_real.split('T')[0] : null;
          const isActivo = p.estado === 'Activo';
          const loanKey = `prestamo-${String(p.placa_activo || '').toLowerCase()}-${fechaSalida}`;

          if (isActivo || !historialKeys.has(loanKey)) {
            newMovs.push({
              id: `mov-db-${p.id}`,
              dbId: p.id,
              type: 'prestamo',
              tipo_item: p.tipo_item || (isConsumible ? 'consumible' : 'activo'),
              itemId: p.placa_activo,
              itemName: p.nombre_activo || (isConsumible ? `Insumo (${p.placa_activo})` : `Activo (${p.placa_activo})`),
              qty: cant,
              unitCodes: [p.placa_activo],
              person: p.solicitante,
              sede: p.sede,
              motivo: p.motivo,
              motive: p.motivo || 'Préstamo operativo',
              date: fechaSalida,
              fullDate: p.fecha_salida || new Date().toISOString(),
              expectedReturn: p.fecha_devolucion_esperada ? p.fecha_devolucion_esperada.split('T')[0] : null,
              returnedDate: fechaDev,
              status: isActivo ? 'activo' : 'cerrado',
            });
          }

          // Si fue devuelto y no está aún registrado en historial_movimientos, mapear devolución
          if (p.estado === 'Devuelto' && fechaDev) {
            const devKey = `devolucion-${String(p.placa_activo || '').toLowerCase()}-${fechaDev}`;
            if (!historialKeys.has(devKey)) {
              newMovs.push({
                id: `mov-dev-${p.id}`,
                dbId: 400000 + Number(p.id || 0),
                type: 'devolucion',
                tipo: 'Devolución',
                itemId: p.placa_activo,
                itemName: p.nombre_activo || (isConsumible ? `Insumo (${p.placa_activo})` : `Activo (${p.placa_activo})`),
                qty: cant,
                unitCodes: [p.placa_activo],
                person: p.solicitante,
                sede: p.sede || 'Medellín',
                motivo: 'Retorno a bodega confirmado. Activo disponible.',
                motive: 'Retorno a bodega confirmado. Activo disponible.',
                date: fechaDev,
                fullDate: p.fecha_devolucion_real,
                returnedDate: fechaDev,
                status: 'cerrado',
              });
            }
          }
        });
      }

      // 3. Mapear remisiones agrupadas de consumibles directamente desde la base de datos
      const remisionIdsConocidos = new Set();
      if (Array.isArray(remisionesData)) {
        remisionesData.forEach((rem) => {
          remisionIdsConocidos.add(rem.remision_id);
          const rawItems = Array.isArray(rem.items) ? rem.items : [];
          const remDate = rem.fecha_entrega ? rem.fecha_entrega.split('T')[0] : (rem.created_at ? rem.created_at.split('T')[0] : today());
          const remKey = `entrega-${String(rem.remision_id || '').toLowerCase()}-${remDate}`;

          if (!historialKeys.has(remKey)) {
            newMovs.push({
              id: `rem-${rem.remision_id || rem.id}`,
              dbId: rem.id,
              remision_id: rem.remision_id,
              codigo_acta: rem.codigo_acta || rem.remision_id,
              type: 'entrega',
              isRemision: true,
              itemId: rem.remision_id,
              itemName: rawItems.length > 0 ? rawItems.map((it) => it.nombre || it.material).join(', ') : 'Remisión de Materiales',
              items: rawItems,
              total_items: rem.total_items || rawItems.length,
              total_unidades: rem.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
              qty: rem.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
              person: rem.responsable_recibe,
              responsable_recibe: rem.responsable_recibe,
              sede: rem.sede || 'Medellín',
              proyecto: rem.proyecto || '',
              motivo: rem.motivo || rem.proyecto || 'Salida de material para taller',
              motive: rem.motivo || rem.proyecto || 'Salida de material para taller',
              date: remDate,
              fullDate: rem.fecha_entrega || rem.created_at || new Date().toISOString(),
              fecha_entrega: rem.fecha_entrega || rem.created_at || new Date().toISOString(),
              status: 'cerrado',
            });
          }
        });
      }

      // 4. Mapear entregas de consumibles huérfanas (sin remisión asociada) para retrocompatibilidad
      if (Array.isArray(entregasData)) {
        entregasData.forEach((ent) => {
          if (ent.remision_id && remisionIdsConocidos.has(ent.remision_id)) {
            return;
          }
          const entDate = ent.created_at ? ent.created_at.split('T')[0] : today();
          const entKey = `entrega-${String(ent.material_id || '').toLowerCase()}-${entDate}`;

          if (!historialKeys.has(entKey)) {
            newMovs.push({
              id: `mov-ent-${ent.id}`,
              dbId: ent.id,
              remision_id: ent.remision_id || `REM-LEGACY-${ent.id}`,
              type: 'entrega',
              isRemision: false,
              itemId: ent.material_id,
              itemName: ent.material_nombre || `Consumible (${ent.material_id})`,
              items: [
                {
                  material_id: ent.material_id,
                  nombre: ent.material_nombre || `Consumible (${ent.material_id})`,
                  cantidad: Number(ent.cantidad) || 1,
                }
              ],
              total_items: 1,
              total_unidades: Number(ent.cantidad) || 1,
              qty: Number(ent.cantidad) || 1,
              person: ent.responsable,
              responsable_recibe: ent.responsable,
              sede: ent.sede || 'Medellín',
              proyecto: '',
              motivo: ent.proyecto_motivo || '',
              motive: ent.proyecto_motivo || 'Salida de material para taller',
              date: entDate,
              fullDate: ent.created_at || new Date().toISOString(),
              fecha_entrega: ent.created_at || new Date().toISOString(),
              status: 'cerrado',
            });
          }
        });
      }

      // Ordenar movimientos cronológicamente: los más recientes arriba
      newMovs.sort((a, b) => {
        const dateA = new Date(a.fullDate || a.date).getTime() || 0;
        const dateB = new Date(b.fullDate || b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return (Number(b.dbId) || 0) - (Number(a.dbId) || 0);
      });

      setMovements(newMovs);
    } catch (err) {
      console.error('Error al consultar datos de Supabase / backend:', err);
      setApiError(err.message || 'No se pudo conectar con el servidor backend');
      setItems([]);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para purgar cualquier caché local obsoleta y asegurar sincronización pura con Supabase
  const purgeLocalCache = () => {
    if (typeof window !== 'undefined') {
      const keysToRemove = [
        'marina_orth_items',
        'marina_orth_movements',
        'marina_orth:items',
        'marina_orth:materials',
        'marina_orth:movements',
        'marina-orth:materials',
        'marina-orth:quotes',
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  };

  useEffect(() => {
    purgeLocalCache();
    refreshFromApi();
  }, []);

  const handleSyncAndPurge = async () => {
    purgeLocalCache();
    await refreshFromApi();
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Limpiar la barra de búsqueda automáticamente al cambiar de pestaña o módulo en el dashboard
  useEffect(() => {
    setSearchTerm('');
  }, [currentView]);

  // Filtro de búsqueda rápida
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter((it) => {
      const matchBasic =
        (it.name && it.name.toLowerCase().includes(term)) ||
        (it.category && it.category.toLowerCase().includes(term)) ||
        (it.location && it.location.toLowerCase().includes(term)) ||
        (it.sede && it.sede.toLowerCase().includes(term)) ||
        (it.placa && it.placa.toLowerCase().includes(term)) ||
        (it.id && String(it.id).toLowerCase().includes(term)) ||
        (it.modelo && it.modelo.toLowerCase().includes(term)) ||
        (it.serial && it.serial.toLowerCase().includes(term)) ||
        (it.responsable && it.responsable.toLowerCase().includes(term)) ||
        (it.custodio && it.custodio.toLowerCase().includes(term));

      const matchUnits =
        it.units &&
        it.units.some(
          (u) =>
            (u.code && u.code.toLowerCase().includes(term)) ||
            (u.placa && u.placa.toLowerCase().includes(term)) ||
            (u.model && u.model.toLowerCase().includes(term)) ||
            (u.serial && u.serial.toLowerCase().includes(term)) ||
            (u.responsable && u.responsable.toLowerCase().includes(term)) ||
            (u.custodio && u.custodio.toLowerCase().includes(term))
        );

      return matchBasic || matchUnits;
    });
  }, [items, searchTerm]);

  const filteredMovements = useMemo(() => {
    if (!searchTerm.trim()) return movements;
    const term = searchTerm.toLowerCase();
    return movements.filter(
      (m) =>
        m.itemName.toLowerCase().includes(term) ||
        (m.person && m.person.toLowerCase().includes(term)) ||
        (m.motive && m.motive.toLowerCase().includes(term)) ||
        (m.unitCodes && m.unitCodes.some((c) => c.toLowerCase().includes(term)))
    );
  }, [movements, searchTerm]);

  // Manejadores de acciones con sincronización a la API de PostgreSQL
  const handleAddItem = async (data) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const itemType = data.itemType === 'equipo' ? 'equipo' : 'consumible';
    const newItem = {
      id,
      name: data.name,
      category: data.category || '',
      unit: data.unit || 'unidad',
      itemType,
      minStock: Number(data.minStock) || 0,
      location: data.location || '',
      notes: data.notes || '',
      dateAdded: today(),
    };

    if (itemType === 'equipo') {
      const parsedUnits = (data.unitsText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(',').map((p) => p.trim());
          return {
            code: parts[0] || '',
            placa: parts[0] || '',
            model: parts[1] || '',
            serial: parts[2] || '',
            status: 'disponible',
            sede: data.sede || 'Medellín',
          };
        })
        .filter((u) => u.code);

      newItem.units = parsedUnits;
      newItem.quantity = 0;
      setItems((prev) => [newItem, ...prev]);

      // Enviar activos a la API de PostgreSQL en segundo plano
      parsedUnits.forEach(async (u) => {
        try {
          await inventoryApi.createActivo({
            placa: u.code,
            nombre: data.name,
            marca: data.category || 'Tecnología',
            modelo: u.model || '',
            serial: u.serial || null,
            sede: data.sede || 'Medellín',
            estado: 'Disponible',
          });
        } catch (e) {
          console.warn('No se pudo guardar activo en la DB:', e.message);
        }
      });

      if (parsedUnits.length > 0) {
        setMovements((prev) => [
          {
            id: 'mov-' + Date.now().toString(36),
            type: 'ingreso',
            itemId: newItem.id,
            itemName: newItem.name,
            qty: parsedUnits.length,
            unitCodes: parsedUnits.map((u) => u.code),
            person: 'Registro inicial',
            motive: 'Alta de nuevo equipo',
            date: today(),
            status: 'cerrado',
          },
          ...prev,
        ]);
      }
    } else {
      newItem.quantity = Number(data.quantity) || 0;
      setItems((prev) => [newItem, ...prev]);
      setMovements((prev) => [
        {
          id: 'mov-' + Date.now().toString(36),
          type: 'ingreso',
          itemId: newItem.id,
          itemName: newItem.name,
          qty: newItem.quantity,
          person: 'Registro inicial',
          motive: 'Alta de nuevo material',
          date: today(),
          status: 'cerrado',
        },
        ...prev,
      ]);
    }
  };

  const handleEditItem = async (edited) => {
    try {
      // Si es un equipo tecnológico, actualizar en PostgreSQL via updateActivo
      if (edited.itemType === 'equipo') {
        const placaToUpdate = edited.placa || (edited.units && edited.units[0]?.placa) || (edited.units && edited.units[0]?.code);
        if (placaToUpdate) {
          await inventoryApi.updateActivo(placaToUpdate, {
            nombre: edited.name,
            marca: edited.category,
            sede: edited.sede,
            modelo: edited.modelo || undefined,
            serial: edited.serial || undefined,
          });
        }
      } else {
        // Consumible
        await inventoryApi.update(edited.id, {
          material: edited.name,
          categoria: edited.category,
          ubicacion: edited.location,
          disponible: edited.quantity,
          minimo: edited.minStock,
        });
      }
    } catch (err) {
      console.warn('Error al actualizar en base de datos:', err.message);
    } finally {
      await refreshFromApi();
    }
  };

  const handleRetireItem = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const qtyStr = window.prompt(`¿Cuántas unidades de "${item.name}" das de baja? (Disponibles: ${item.quantity})`);
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty <= 0 || qty > item.quantity) {
      alert('Cantidad inválida.');
      return;
    }
    const motive = window.prompt('Motivo de la baja') || 'Baja de material';
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - qty } : i))
    );
    setMovements((prev) => [
      {
        id: 'mov-' + Date.now().toString(36),
        type: 'baja',
        itemId,
        itemName: item.name,
        qty,
        person: '—',
        motive,
        date: today(),
        status: 'cerrado',
      },
      ...prev,
    ]);
  };

  // Registrar préstamo con transacción en PostgreSQL (soporta tanto activos como consumibles)
  const handleRegisterLoan = async (data) => {
    const isConsumible =
      data.tipo_item === 'consumible' ||
      (data.itemId && (data.itemId.toUpperCase().startsWith('ROB') || data.itemId.toUpperCase().startsWith('MAT')));

    if (isConsumible) {
      // 1. Préstamo de consumible con cantidad
      const finalCantidad = Math.max(1, parseInt(data.cantidad, 10) || 1);
      const itemId = data.itemId || (data.unitCodes && data.unitCodes[0]) || '';
      try {
        await inventoryApi.createPrestamo({
          item_id: itemId,
          placa_activo: itemId,
          tipo_item: 'consumible',
          cantidad: finalCantidad,
          solicitante: data.person,
          sede: data.sede || 'Medellín',
          motivo: data.motive || 'Préstamo de insumos para actividades formativas',
          fecha_salida: today(),
          fecha_devolucion_esperada: data.expectedReturn || today(),
        });
      } catch (err) {
        console.error('Error al registrar préstamo de consumible:', err);
        alert(`Error al registrar préstamo de consumible: ${err.message}`);
        throw err;
      }
    } else {
      // 2. Préstamo de equipo tecnológico por placas seleccionadas
      const unitCodes = Array.isArray(data.unitCodes) && data.unitCodes.length > 0 ? data.unitCodes : [data.itemId];
      for (const placa of unitCodes) {
        try {
          await inventoryApi.createPrestamo({
            item_id: placa,
            placa_activo: placa,
            tipo_item: 'activo',
            cantidad: 1,
            solicitante: data.person,
            sede: data.sede || 'Medellín',
            motivo: data.motive || 'Préstamo para formación',
            fecha_salida: today(),
            fecha_devolucion_esperada: data.expectedReturn || today(),
          });
        } catch (e) {
          console.error(`Error de persistencia para placa ${placa}:`, e.message);
          alert(`Error al registrar préstamo para ${placa}: ${e.message}`);
          throw e;
        }
      }
    }

    // Refrescar datos frescos desde la base de datos
    await refreshFromApi();
  };

  const handleRegisterDelivery = async (data) => {
    try {
      // Si viene una remisión agrupada con canasta de múltiples ítems
      if (Array.isArray(data.items) && data.items.length > 0) {
        await inventoryApi.createRemision({
          responsable_recibe: data.person || data.responsable_recibe,
          sede: data.sede || 'Medellín',
          proyecto: data.proyecto || '',
          motivo: data.motive || data.motivo || 'Salida de material para taller / semillero',
          items: data.items.map((it) => {
            const itemRef = items.find((i) => i.id === (it.material_id || it.id));
            return {
              material_id: it.material_id || it.id,
              nombre: it.material || it.nombre || it.material_nombre || itemRef?.name || itemRef?.material || `Consumible (${it.id})`,
              cantidad: Number(it.cantidad || it.cantidadEntrega) || 1,
            };
          }),
        });
      } else {
        // Fallback para entrega individual
        const item = items.find((i) => i.id === data.itemId);
        const itemName = item ? (item.name || item.material) : `Consumible (${data.itemId})`;

        await inventoryApi.createEntrega({
          material_id: data.itemId,
          material_nombre: itemName,
          cantidad: Number(data.qty) || 1,
          responsable: data.person,
          sede: data.sede || 'Medellín',
          proyecto_motivo: data.motive || 'Salida de material para taller / semillero',
          tipo: 'Consumido',
        });
      }
    } catch (err) {
      console.error('Error al persistir entrega/remisión en base de datos:', err);
      alert(`Error al guardar entrega en base de datos: ${err.message}`);
      throw err;
    }

    // Refrescar datos frescos desde la base de datos
    await refreshFromApi();
  };

  // Devolver préstamo y restaurar activo en PostgreSQL
  const handleReturnLoan = async (movId) => {
    const mov = movements.find((m) => m.id === movId);
    if (!mov) return;

    // Si tiene ID en la base de datos de PostgreSQL, llamar a PUT /api/prestamos/:id/devolver
    if (mov.dbId) {
      try {
        await inventoryApi.devolverPrestamo(mov.dbId);
      } catch (e) {
        console.warn('Error al marcar devuelto en PostgreSQL:', e.message);
      }
    } else if (mov.unitCodes && mov.unitCodes[0]) {
      // Si fue registrado por placa
      try {
        await inventoryApi.updateActivo(mov.unitCodes[0], {
          estado: 'Disponible',
          custodio: null,
          fecha_devolucion: null,
        });
      } catch (e) {
        console.warn('Error al marcar activo disponible en PostgreSQL:', e.message);
      }
    }

    // Refrescar datos reales desde la base de datos
    await refreshFromApi();
  };

  // Exportar Libro Maestro Excel corporativo institucional (.xlsx) con exceljs y file-saver
  const handleExportExcel = async () => {
    try {
      await exportarLibroMaestroExcelFMO();
    } catch (err) {
      console.error('Error al exportar reporte Excel:', err);
      alert(`No se pudo generar el reporte Excel: ${err.message || 'Error inesperado'}`);
    }
  };

  return (
    <Routes>
      {/* RUTA DE INICIO DE SESIÓN INSTITUCIONAL */}
      <Route
        path="/login"
        element={<LoginView theme={theme} onToggleTheme={toggleTheme} />}
      />

      {/* RUTA PÚBLICA / MÓVIL: FICHA DE ACTIVO POR CÓDIGO QR */}
      <Route
        path="/activo/:placa"
        element={<DetalleActivoPublico items={items} movements={movements} />}
      />
      <Route
        path="/activo/:id"
        element={<DetalleActivoPublico items={items} movements={movements} />}
      />

      {/* RUTA PRINCIPAL PROTEGIDA CON JWT: PANEL ADMINISTRATIVO */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="layout">
              <Sidebar currentView={currentView} onViewChange={setCurrentView} />

              <div className="main-wrapper">
                <Header
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onExportExcel={handleExportExcel}
                  onSync={handleSyncAndPurge}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onNavigate={handleNavigateFromSummary}
                />

                <main className="main-content">
                  {/* VISTA SIMPLIFICADA PARA ROL USUARIO: MIS SOLICITUDES Y ASIGNACIONES */}
                  {currentView === 'mi-panel' && (
                    <MiPanelUsuarioView
                      items={items}
                      movements={movements}
                      sedes={sedesList}
                    />
                  )}

                  {/* VISTA RESUMEN (ADMINISTRATIVO / SUPERVISOR / OPERADOR) */}
                  {!isUsuario && currentView === 'resumen' && (
                    <ResumenView
                      items={filteredItems}
                      movements={filteredMovements}
                      loading={loading}
                      error={apiError}
                      onRetry={refreshFromApi}
                      onNavigate={handleNavigateFromSummary}
                    />
                  )}

                  {/* VISTA INVENTARIO */}
                  {!isUsuario && currentView === 'inventario' && (
                    <InventarioView
                      items={filteredItems}
                      searchTerm={searchTerm}
                      loading={loading}
                      error={apiError}
                      onRetry={refreshFromApi}
                      onAddItem={handleAddItem}
                      onEditItem={handleEditItem}
                      onRetireItem={handleRetireItem}
                      onRegisterLoan={handleRegisterLoan}
                      initialTab={inventarioParams.tab}
                      initialStockFilter={inventarioParams.stockFilter}
                      sedes={sedesList}
                    />
                  )}

                  {/* VISTA PRÉSTAMOS Y ENTREGAS */}
                  {!isUsuario && currentView === 'prestamos' && (
                    <PrestamosView
                      items={filteredItems}
                      movements={filteredMovements}
                      loading={loading}
                      error={apiError}
                      onRetry={refreshFromApi}
                      onRegisterLoan={handleRegisterLoan}
                      onRegisterDelivery={handleRegisterDelivery}
                      onReturnLoan={handleReturnLoan}
                      initialSection={prestamosParams.section}
                      initialStatusFilter={prestamosParams.estado}
                      sedes={sedesList}
                      onSedeCreated={(nuevaSede) => {
                        const nombreSede = nuevaSede.nombre || nuevaSede;
                        setSedesList((prev) => Array.from(new Set([...prev, nombreSede])));
                      }}
                    />
                  )}

                  {/* VISTA HISTORIAL */}
                  {currentView === 'historial' && (
                    <HistorialView movements={filteredMovements} />
                  )}

                  {/* VISTA MÓDULO DE USUARIOS (VISIBLE PARA ADMINISTRADORES Y SUPERVISORES) */}
                  {!isUsuario && (isAdmin || isSupervisor) && currentView === 'usuarios' && (
                    <UsuariosView />
                  )}
                </main>

                <footer>
                  Registro interno · Fundación Marina Orth · Robótica & Nuevas Tecnologías · {fmtDate(today())}
                </footer>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;