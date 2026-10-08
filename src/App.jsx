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

import { today, fmtDate, available, isOverdue } from './data/initialData';
import inventoryApi from './services/inventoryApi';

function App() {
  // Estado de tema oscuro/claro con persistencia en localStorage
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marina_orth_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('marina_orth_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Estado simple de navegación para las 4 vistas requeridas
  const [currentView, setCurrentView] = useState('resumen');

  // Estado de carga y error de la API de Supabase / Backend
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Estado del inventario y movimientos (inicializados estrictamente con arreglos vacíos)
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);

  // Cargar datos reales desde Supabase / PostgreSQL al iniciar la aplicación
  const refreshFromApi = async () => {
    try {
      setLoading(true);
      setApiError(null);

      const [activosData, consumiblesData, prestamosData] = await Promise.all([
        inventoryApi.getActivos(),
        inventoryApi.getConsumibles(),
        inventoryApi.getPrestamos(),
      ]);

      const newItems = [];

      // Mapear consumibles directamente desde la base de datos
      if (Array.isArray(consumiblesData)) {
        consumiblesData.forEach((c) => {
          newItems.push({
            id: c.id,
            name: c.material,
            category: c.categoria || 'Insumos',
            itemType: 'consumible',
            quantity: Number(c.disponible) || 0,
            minStock: Number(c.minimo) || 0,
            location: c.ubicacion || 'Bodega Medellín',
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
              minStock: 1,
              units: [unitObj],
              quantity: 0,
              dateAdded: a.created_at ? a.created_at.split('T')[0] : today(),
            });
          }
        });
      }

      setItems(newItems);

      // Mapear préstamos directamente desde la base de datos
      const newMovs = [];
      if (Array.isArray(prestamosData)) {
        prestamosData.forEach((p) => {
          newMovs.push({
            id: `mov-db-${p.id}`,
            dbId: p.id,
            type: 'prestamo',
            itemId: p.placa_activo,
            itemName: p.nombre_activo || `Activo (${p.placa_activo})`,
            qty: 1,
            unitCodes: [p.placa_activo],
            person: p.solicitante,
            sede: p.sede,
            motive: p.motivo || 'Préstamo operativo',
            date: p.fecha_salida ? p.fecha_salida.split('T')[0] : today(),
            expectedReturn: p.fecha_devolucion_esperada ? p.fecha_devolucion_esperada.split('T')[0] : null,
            returnedDate: p.fecha_devolucion_real ? p.fecha_devolucion_real.split('T')[0] : null,
            status: p.estado === 'Devuelto' ? 'cerrado' : 'activo',
          });
        });
      }

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

  useEffect(() => {
    refreshFromApi();
  }, []);

  // Guardar en localStorage cuando cambian items o movimientos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marina_orth_items', JSON.stringify(items));
    }
  }, [items]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marina_orth_movements', JSON.stringify(movements));
    }
  }, [movements]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filtro de búsqueda rápida
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(term) ||
        (it.category && it.category.toLowerCase().includes(term)) ||
        (it.location && it.location.toLowerCase().includes(term)) ||
        (it.units && it.units.some((u) => u.code.toLowerCase().includes(term) || (u.serial && u.serial.toLowerCase().includes(term))))
    );
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

  const handleEditItem = (edited) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === edited.id
          ? {
              ...i,
              name: edited.name,
              category: edited.category,
              unit: edited.unit,
              minStock: Number(edited.minStock) || 0,
              location: edited.location,
              notes: edited.notes,
            }
          : i
      )
    );
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

  // Registrar préstamo con transacción en PostgreSQL
  const handleRegisterLoan = async (data) => {
    const item = items.find((i) => i.id === data.itemId);
    const itemName = item ? item.name : 'Equipo';

    // 1. Persistir préstamo en PostgreSQL por cada placa seleccionada
    const createdDbLoans = [];
    for (const placa of data.unitCodes) {
      try {
        const dbRes = await inventoryApi.createPrestamo({
          placa_activo: placa,
          solicitante: data.person,
          sede: data.sede || 'Medellín',
          motivo: data.motive || 'Préstamo para formación',
          fecha_salida: today(),
          fecha_devolucion_esperada: data.expectedReturn || today(),
        });
        createdDbLoans.push(dbRes);
      } catch (e) {
        console.warn(`Aviso de persistencia para placa ${placa}:`, e.message);
      }
    }

    // 2. Actualizar estado local en React
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== data.itemId) return it;
        const updatedUnits = (it.units || []).map((u) =>
          data.unitCodes.includes(u.code) || data.unitCodes.includes(u.placa)
            ? { ...u, status: 'prestado', sede: data.sede || u.sede, responsable: data.person }
            : u
        );
        return { ...it, units: updatedUnits };
      })
    );

    setMovements((prev) => [
      {
        id: 'mov-' + Date.now().toString(36),
        dbId: createdDbLoans[0]?.id || null,
        type: 'prestamo',
        itemId: data.itemId,
        itemName: itemName,
        qty: data.unitCodes.length,
        unitCodes: data.unitCodes,
        person: data.person,
        sede: data.sede || 'Medellín',
        motive: data.motive || '',
        date: today(),
        expectedReturn: data.expectedReturn || null,
        returnedDate: null,
        status: 'activo',
      },
      ...prev,
    ]);
  };

  const handleRegisterDelivery = (data) => {
    const item = items.find((i) => i.id === data.itemId);
    if (!item) return;

    setItems((prev) =>
      prev.map((it) => (it.id === data.itemId ? { ...it, quantity: Math.max(0, it.quantity - data.qty) } : it))
    );

    setMovements((prev) => [
      {
        id: 'mov-' + Date.now().toString(36),
        type: 'entrega',
        itemId: data.itemId,
        itemName: item.name,
        qty: data.qty,
        person: data.person,
        sede: data.sede || 'Medellín',
        motive: data.motive || '',
        date: today(),
        status: 'cerrado',
      },
      ...prev,
    ]);
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
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== mov.itemId) return it;
        const updatedUnits = (it.units || []).map((u) =>
          (mov.unitCodes || []).includes(u.code) || (mov.unitCodes || []).includes(u.placa)
            ? { ...u, status: 'disponible', responsable: 'Bodega Central' }
            : u
        );
        return { ...it, units: updatedUnits };
      })
    );

    setMovements((prev) =>
      prev.map((m) => (m.id === movId ? { ...m, status: 'cerrado', returnedDate: today() } : m))
    );
  };

  // Exportar Excel en CSV amigable con UTF-8
  const handleExportExcel = () => {
    let csv = '\uFEFF';
    csv += 'REPORTE CONSOLIDADO DE INVENTARIO - FUNDACIÓN MARINA ORTH\n\n';

    csv += 'INVENTARIO\n';
    csv += 'Nombre,Tipo,Categoría,Disponible,Total,Mínimo,Ubicación\n';
    items.forEach((it) => {
      const tot = it.itemType === 'equipo' ? (it.units || []).filter((u) => u.status !== 'baja').length : it.quantity;
      csv += `"${it.name}","${it.itemType}","${it.category || ''}",${available(it)},${tot},${it.minStock},"${it.location || ''}"\n`;
    });

    csv += '\nPRÉSTAMOS ACTIVOS\n';
    csv += 'Elemento,Unidades,Solicitante,Salida,Devolución Esperada,Estado\n';
    movements
      .filter((m) => m.type === 'prestamo' && m.status === 'activo')
      .forEach((m) => {
        const est = isOverdue(m) ? 'Vencido' : 'Prestado';
        csv += `"${m.itemName}","${(m.unitCodes || []).join(', ')}","${m.person}","${m.date}","${m.expectedReturn || ''}","${est}"\n`;
      });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_marina_orth_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Routes>
      {/* RUTA PÚBLICA / MÓVIL: FICHA DE ACTIVO POR CÓDIGO QR */}
      <Route
        path="/activo/:placa"
        element={<DetalleActivoPublico items={items} movements={movements} />}
      />

      {/* RUTA PRINCIPAL: PANEL ADMINISTRATIVO */}
      <Route
        path="/*"
        element={
          <div className="layout">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />

            <div className="main-wrapper">
              <Header
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onExportExcel={handleExportExcel}
                theme={theme}
                onToggleTheme={toggleTheme}
              />

              <main className="main-content">
                {currentView === 'resumen' && (
                  <ResumenView
                    items={filteredItems}
                    movements={filteredMovements}
                    loading={loading}
                    error={apiError}
                    onRetry={refreshFromApi}
                  />
                )}

                {currentView === 'inventario' && (
                  <InventarioView
                    items={filteredItems}
                    loading={loading}
                    error={apiError}
                    onRetry={refreshFromApi}
                    onAddItem={handleAddItem}
                    onEditItem={handleEditItem}
                    onRetireItem={handleRetireItem}
                    onRegisterLoan={handleRegisterLoan}
                  />
                )}

                {currentView === 'prestamos' && (
                  <PrestamosView
                    items={filteredItems}
                    movements={filteredMovements}
                    loading={loading}
                    error={apiError}
                    onRetry={refreshFromApi}
                    onRegisterLoan={handleRegisterLoan}
                    onRegisterDelivery={handleRegisterDelivery}
                    onReturnLoan={handleReturnLoan}
                  />
                )}

                {currentView === 'historial' && (
                  <HistorialView movements={filteredMovements} />
                )}
              </main>

              <footer>
                Registro interno · Fundación Marina Orth · Robótica & Nuevas Tecnologías · {fmtDate(today())}
              </footer>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default App;