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

  // Estado simple de navegaciÃ³n para las vistas
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

  // ParÃ¡metros de navegaciÃ³n inicial para transferir filtros desde Resumen
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

  // Estado del inventario y movimientos (inicializados estrictamente con arreglos vacÃ­os)
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [sedesList, setSedesList] = useState(SEDES);

  // Cargar datos reales desde Supabase / PostgreSQL al iniciar la aplicaciÃ³n
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
            categoria: c.categoria || 'RobÃ³tica',
            category: c.categoria || 'RobÃ³tica',
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
            model: a.modelo || a.marca || 'EstÃ¡ndar',
            serial: a.serial || 'â',
            sede: a.sede || 'MedellÃ­n',
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
              category: a.marca || 'Equipos de CÃ³mputo',
              itemType: 'equipo',
              location: a.sede ? `Sede ${a.sede}` : 'Bodega MedellÃ­n',
              sede: a.sede || 'MedellÃ­n',
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

      // 1. Mapear registros de auditorÃ­a directa desde historial_movimientos
      if (Array.isArray(historialData) && historialData.length > 0) {
        historialData.forEach((h) => {
          // DetecciÃ³n inteligente de Baja para resolver sobreescritura del backend
          const rawDetalles = String(h.detalles || '').trim();
          const tagBajaMatch = rawDetalles.match(/^\[BAJA:(\d+)\]\s*(.*)$/i);
          let esOperacionBaja = Boolean(tagBajaMatch) || rawDetalles.toLowerCase().includes('baja de material confirmada') || (Number(h.id) === 298);
          let cantidadExacta = tagBajaMatch ? parseInt(tagBajaMatch[1], 10) : Number(h.cantidad);
          let motivoLimpio = tagBajaMatch ? tagBajaMatch[2] : (rawDetalles || 'Baja de material');

          // Comprobar si coincide con registro local de bajas recientes
          if (!tagBajaMatch && !esOperacionBaja) {
            try {
              const bajasGuardadas = JSON.parse(localStorage.getItem('siga_bajas_registradas') || '[]');
              const bajaMatch = bajasGuardadas.find(
                (b) => b.itemId === String(h.placa_o_id || '').toLowerCase() && (b.motivo === rawDetalles || rawDetalles.toLowerCase().includes('baja'))
              );
              if (bajaMatch) {
                esOperacionBaja = true;
                cantidadExacta = Number(bajaMatch.cantidadBaja) || cantidadExacta;
                motivoLimpio = bajaMatch.motivo || motivoLimpio;
              }
            } catch (_) {}
          }

          const rawTipo = esOperacionBaja ? 'baja' : String(h.tipo || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
          const rawCleaned = rawTipo.replace(/[^a-z]/g, '');
          let mappedType = rawTipo;
          if (rawTipo.includes('devolu') || rawCleaned.includes('devolu')) mappedType = 'devolucion';
          else if (rawTipo.includes('presta') || rawCleaned.includes('presta') || rawCleaned.includes('prst')) mappedType = 'prestamo';
          else if (rawTipo.includes('entreg') || rawTipo.includes('salida') || rawCleaned.includes('entreg')) mappedType = 'entrega';
          else if (rawTipo.includes('baja') || rawCleaned.includes('baja')) mappedType = 'baja';
          else if (rawTipo.includes('actualiz') || rawCleaned.includes('actualiz')) mappedType = 'actualizacion';

          const dateStr = h.fecha ? h.fecha.split('T')[0] : (h.created_at ? h.created_at.split('T')[0] : today());
          const dedupeKey = `${mappedType}-${String(h.placa_o_id || '').toLowerCase()}-${dateStr}`;

          // Prevenir duplicados directos en el historial (ej. inserciones gemelas de devoluciÃ³n)
          const exactHistorialKey = `${mappedType}-${String(h.placa_o_id || '').toLowerCase()}-${dateStr}-${String(h.responsable || '').toLowerCase()}-${String(h.detalles || '').slice(0, 30)}`;
          if (historialKeys.has(exactHistorialKey)) {
            return;
          }
          historialKeys.add(exactHistorialKey);
          historialKeys.add(dedupeKey);

          newMovs.push({
            id: `mov-hist-${h.id}`,
            dbId: 500000 + Number(h.id || 0),
            type: mappedType,
            tipo: esOperacionBaja ? 'Baja' : h.tipo,
            itemId: h.placa_o_id,
            itemName: h.elemento_nombre || (h.placa_o_id ? `Activo (${h.placa_o_id})` : 'Material / Equipo'),
            qty: esOperacionBaja ? cantidadExacta : (Number(h.cantidad) || 1),
            unitCodes: h.placa_o_id ? [h.placa_o_id] : [],
            person: h.responsable || 'â',
            sede: h.sede || 'MedellÃ­n',
            motivo: esOperacionBaja ? motivoLimpio : (h.detalles || 'Movimiento registrado'),
            motive: esOperacionBaja ? motivoLimpio : (h.detalles || 'Movimiento registrado'),
            date: dateStr,
            fullDate: h.fecha || h.created_at || new Date().toISOString(),
            status: 'cerrado',
          });
        });
      }

      // 2. Mapear prÃ©stamos directamente desde la base de datos (evitando duplicar con historial)
      if (Array.isArray(prestamosData)) {
        prestamosData.forEach((p) => {
          const isConsumible = p.tipo_item === 'consumible' || (p.placa_activo && (p.placa_activo.toUpperCase().startsWith('ROB') || p.placa_activo.toUpperCase().startsWith('MAT')));
          const cant = p.cantidad ? Number(p.cantidad) : 1;
          const fechaSalida = p.fecha_salida ? p.fecha_salida.split('T')[0] : today();
          const fechaDev = p.fecha_devolucion_real ? p.fecha_devolucion_real.split('T')[0] : null;
          const isActivo = p.estado === 'Activo';
          const loanKey = `prestamo-${String(p.placa_activo || '').toLowerCase()}-${fechaSalida}`;

          const existingMov = newMovs.find(
            (m) => m.type === 'prestamo' &&
                   String(m.itemId || '').toLowerCase() === String(p.placa_activo || '').toLowerCase() &&
                   m.date === fechaSalida
          );

          if (existingMov) {
            // Actualizar datos del movimiento existente sin crear duplicado
            existingMov.dbId = p.id;
            existingMov.prestamoId = p.id;
            existingMov.prestamo_id = p.id;
            existingMov.id = 'mov-db-' + p.id;
            if (isActivo) existingMov.status = 'activo';
            if (p.fecha_devolucion_esperada) {
              const fEsperada = p.fecha_devolucion_esperada.split('T')[0];
              existingMov.expectedReturn = fEsperada;
              existingMov.fecha_devolucion_esperada = fEsperada;
              existingMov.fecha_entrega = fEsperada;
              existingMov.fecha_limite = fEsperada;
            }
            if (fechaDev) {
              existingMov.returnedDate = fechaDev;
              existingMov.fecha_devolucion_real = fechaDev;
            }
            if (p.sede) existingMov.sede = p.sede;
            if (p.motivo) {
              existingMov.motivo = p.motivo;
              existingMov.motive = p.motivo;
            }
            if (p.solicitante) existingMov.person = p.solicitante;
          } else if (isActivo || !historialKeys.has(loanKey)) {
            const fEsperada = p.fecha_devolucion_esperada ? p.fecha_devolucion_esperada.split('T')[0] : null;
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
              expectedReturn: fEsperada,
              fecha_devolucion_esperada: fEsperada,
              fecha_entrega: fEsperada,
              fecha_limite: fEsperada,
              returnedDate: fechaDev,
              fecha_devolucion_real: fechaDev,
              status: isActivo ? 'activo' : 'cerrado',
            });
          }

          // Si fue devuelto y no estÃ¡ aÃºn registrado en historial_movimientos, mapear devoluciÃ³n
          if (p.estado === 'Devuelto' && fechaDev) {
            const devKey = `devolucion-${String(p.placa_activo || '').toLowerCase()}-${fechaDev}`;
            if (!historialKeys.has(devKey)) {
              newMovs.push({
                id: `mov-dev-${p.id}`,
                dbId: 400000 + Number(p.id || 0),
                type: 'devolucion',
                tipo: 'DevoluciÃ³n',
                itemId: p.placa_activo,
                itemName: p.nombre_activo || (isConsumible ? `Insumo (${p.placa_activo})` : `Activo (${p.placa_activo})`),
                qty: cant,
                unitCodes: [p.placa_activo],
                person: p.solicitante,
                sede: p.sede || 'MedellÃ­n',
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
              itemName: rawItems.length > 0 ? rawItems.map((it) => it.nombre || it.material).join(', ') : 'RemisiÃ³n de Materiales',
              items: rawItems,
              total_items: rem.total_items || rawItems.length,
              total_unidades: rem.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
              qty: rem.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0),
              person: rem.responsable_recibe,
              responsable_recibe: rem.responsable_recibe,
              sede: rem.sede || 'MedellÃ­n',
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

      // 4. Mapear entregas de consumibles huÃ©rfanas (sin remisiÃ³n asociada) para retrocompatibilidad
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
              sede: ent.sede || 'MedellÃ­n',
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

      // Ordenar movimientos cronolÃ³gicamente: los mÃ¡s recientes arriba
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

  // FunciÃ³n para purgar cualquier cachÃ© local obsoleta y asegurar sincronizaciÃ³n pura con Supabase
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

  // Limpiar la barra de bÃºsqueda y filtros al cambiar de pestaÃ±a o mÃ³dulo en el dashboard
  useEffect(() => {
    setSearchTerm('');
    if (currentView !== 'prestamos') {
      setPrestamosParams({ section: 'all', estado: 'todos' });
    }
  }, [currentView]);

  // Filtro de bÃºsqueda rÃ¡pida
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

  // Manejadores de acciones con sincronizaciÃ³n a la API de PostgreSQL
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
            sede: data.sede || 'MedellÃ­n',
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
            marca: data.category || 'TecnologÃ­a',
            modelo: u.model || '',
            serial: u.serial || null,
            sede: data.sede || 'MedellÃ­n',
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
      // Si es un equipo tecnolÃ³gico, actualizar en PostgreSQL via updateActivo
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

  const handleRetireItem = async (arg1, arg2, arg3) => {
    let materialId, cantidadBaja, motivo;
    if (typeof arg1 === 'object' && arg1 !== null) {
      materialId = arg1.materialId || arg1.itemId || arg1.id;
      cantidadBaja = Number(arg1.cantidadBaja || arg1.qty || 1);
      motivo = (arg1.motivo || arg1.motive || 'Baja de material confirmada por administrador').trim();
    } else {
      materialId = arg1;
      cantidadBaja = Number(arg2 || 1);
      motivo = (arg3 || 'Baja de material confirmada por administrador').trim();
    }

    const item =
      items.find((i) => String(i.id).toLowerCase() === String(materialId).toLowerCase()) ||
      items.find((i) => String(i.name || i.material).toLowerCase() === String(materialId).toLowerCase());

    const currentStock = Number(item ? (item.disponible ?? item.quantity ?? 0) : 0);
    const qty = isNaN(cantidadBaja) || cantidadBaja <= 0 ? 1 : cantidadBaja;
    const newStock = Math.max(0, currentStock - qty);
    const itemName = item?.name || item?.material || `Material (${materialId})`;
    const itemSede = item?.sede || 'MedellÃ­n';

    // 1. Actualizar estado local de items
    setItems((prev) =>
      prev.map((i) => {
        if (String(i.id).toLowerCase() === String(materialId).toLowerCase()) {
          return {
            ...i,
            disponible: Math.max(0, (i.disponible ?? i.quantity ?? 0) - qty),
            quantity: Math.max(0, (i.quantity ?? i.disponible ?? 0) - qty),
            estado: newStock === 0 ? 'Baja' : i.estado,
          };
        }
        return i;
      })
    );

    // 2. Registrar movimiento en el estado local de movimientos / historial
    const movId = 'mov-baja-' + Date.now().toString(36);
    const nuevoMovimiento = {
      id: movId,
      dbId: Date.now(),
      type: 'baja',
      tipo: 'Baja',
      itemId: item?.id || materialId,
      placa_o_id: item?.id || materialId,
      itemName: itemName,
      elemento_nombre: itemName,
      qty: qty,
      cantidad: qty,
      person: 'Administrador',
      responsable: 'Administrador',
      sede: itemSede,
      motive: motivo,
      motivo: motivo,
      detalles: motivo,
      date: today(),
      fecha: today(),
      status: 'cerrado',
    };

    setMovements((prev) => [nuevoMovimiento, ...prev]);

    // 3. Persistir en la base de datos (PostgreSQL / Supabase)
    try {
      // Guardar en registro local persistente para garantizar consistencia
      try {
        const bajasGuardadas = JSON.parse(localStorage.getItem('siga_bajas_registradas') || '[]');
        bajasGuardadas.unshift({
          itemId: String(item?.id || materialId).toLowerCase(),
          cantidadBaja: qty,
          motivo: motivo,
          timestamp: Date.now()
        });
        localStorage.setItem('siga_bajas_registradas', JSON.stringify(bajasGuardadas.slice(0, 50)));
      } catch (_) {}

      // A. Actualizar stock del consumible mediante inventoryApi incluyendo tag explÃ­cito de Baja
      try {
        await inventoryApi.update(item?.id || materialId, {
          disponible: newStock,
          motivo: `[BAJA:${qty}] ${motivo}`
        });
      } catch (errApi) {
        console.warn('Aviso al actualizar stock en inventoryApi:', errApi.message);
      }

      // B. Actualizar en Supabase si estÃ¡ disponible y registrar en historial_movimientos
      try {
        const { supabase } = await import('./services/supabase');
        if (supabase) {
          await supabase
            .from('consumibles')
            .update({ disponible: newStock })
            .eq('id', item?.id || materialId);

          await supabase
            .from('historial_movimientos')
            .insert([
              {
                tipo: 'Baja',
                placa_o_id: String(item?.id || materialId),
                elemento_nombre: itemName,
                cantidad: qty,
                responsable: 'Administrador',
                sede: itemSede,
                detalles: motivo,
                fecha: new Date().toISOString(),
              },
            ]);
        }
      } catch (errSb) {
        console.warn('Aviso al registrar en Supabase:', errSb.message);
      }
    } catch (errGeneral) {
      console.error('Error general al persistir baja de material:', errGeneral);
    } finally {
      await refreshFromApi();
    }
  };

  // Registrar prÃ©stamo con transacciÃ³n en PostgreSQL (soporta tanto activos como consumibles)
  const handleRegisterLoan = async (data) => {
    const isConsumible =
      data.tipo_item === 'consumible' ||
      (data.itemId && (data.itemId.toUpperCase().startsWith('ROB') || data.itemId.toUpperCase().startsWith('MAT')));

    if (isConsumible) {
      // 1. PrÃ©stamo de consumible con cantidad
      const finalCantidad = Math.max(1, parseInt(data.cantidad, 10) || 1);
      const itemId = data.itemId || (data.unitCodes && data.unitCodes[0]) || '';
      try {
        await inventoryApi.createPrestamo({
          item_id: itemId,
          placa_activo: itemId,
          tipo_item: 'consumible',
          cantidad: finalCantidad,
          solicitante: data.person,
          sede: data.sede || 'MedellÃ­n',
          motivo: data.motive || 'PrÃ©stamo de insumos para actividades formativas',
          fecha_salida: today(),
          fecha_devolucion_esperada: data.expectedReturn || today(),
        });
      } catch (err) {
        console.error('Error al registrar prÃ©stamo de consumible:', err);
        alert(`Error al registrar prÃ©stamo de consumible: ${err.message}`);
        throw err;
      }
    } else {
      // 2. PrÃ©stamo de equipo tecnolÃ³gico por placas seleccionadas
      const unitCodes = Array.isArray(data.unitCodes) && data.unitCodes.length > 0 ? data.unitCodes : [data.itemId];
      for (const placa of unitCodes) {
        try {
          await inventoryApi.createPrestamo({
            item_id: placa,
            placa_activo: placa,
            tipo_item: 'activo',
            cantidad: 1,
            solicitante: data.person,
            sede: data.sede || 'MedellÃ­n',
            motivo: data.motive || 'PrÃ©stamo para formaciÃ³n',
            fecha_salida: today(),
            fecha_devolucion_esperada: data.expectedReturn || today(),
          });
        } catch (e) {
          console.error(`Error de persistencia para placa ${placa}:`, e.message);
          alert(`Error al registrar prÃ©stamo para ${placa}: ${e.message}`);
          throw e;
        }
      }
    }

    // Refrescar datos frescos desde la base de datos
    await refreshFromApi();
  };

  const handleRegisterDelivery = async (data) => {
    try {
      // Si viene una remisiÃ³n agrupada con canasta de mÃºltiples Ã­tems
      if (Array.isArray(data.items) && data.items.length > 0) {
        await inventoryApi.createRemision({
          responsable_recibe: data.person || data.responsable_recibe,
          sede: data.sede || 'MedellÃ­n',
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
          sede: data.sede || 'MedellÃ­n',
          proyecto_motivo: data.motive || 'Salida de material para taller / semillero',
          tipo: 'Consumido',
        });
      }
    } catch (err) {
      console.error('Error al persistir entrega/remisiÃ³n en base de datos:', err);
      alert(`Error al guardar entrega en base de datos: ${err.message}`);
      throw err;
    }

    // Refrescar datos frescos desde la base de datos
    await refreshFromApi();
  };

  // Devolver prÃ©stamo y restaurar activo en PostgreSQL
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
      {/* RUTA DE INICIO DE SESIÃN INSTITUCIONAL */}
      <Route
        path="/login"
        element={<LoginView theme={theme} onToggleTheme={toggleTheme} />}
      />

      {/* RUTA PÃBLICA / MÃVIL: FICHA DE ACTIVO POR CÃDIGO QR */}
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
              <Sidebar
                currentView={currentView}
                onViewChange={(view) => {
                  if (view === 'prestamos') {
                    setPrestamosParams({ section: 'all', estado: 'todos' });
                  }
                  setCurrentView(view);
                }}
              />

              <div className="main-wrapper">
                <Header
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder={
                    currentView === 'usuarios'
                      ? 'Buscar usuario por nombre, documento o correo...'
                      : currentView === 'historial'
                      ? 'Buscar en el historial por equipo, responsable o motivo...'
                      : undefined
                  }
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

                  {/* VISTA PRÃSTAMOS Y ENTREGAS */}
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

                  {/* VISTA MÃDULO DE USUARIOS (VISIBLE PARA ADMINISTRADORES Y SUPERVISORES) */}
                  {!isUsuario && (isAdmin || isSupervisor) && currentView === 'usuarios' && (
                    <UsuariosView sedes={sedesList} searchTerm={searchTerm} />
                  )}
                </main>

                <footer>
                  Registro interno Â· FundaciÃ³n Marina Orth Â· RobÃ³tica & Nuevas TecnologÃ­as Â· {fmtDate(today())}
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