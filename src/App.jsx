import { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import './styles/index.css';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

import ResumenView from './views/ResumenView';
import InventarioView from './views/InventarioView';
import PrestamosView from './views/PrestamosView';
import HistorialView from './views/HistorialView';
import DetalleActivoPublico from './views/DetalleActivoPublico';

import { INITIAL_DATA, today, fmtDate, available, isOverdue } from './data/initialData';

function App() {
  // Estado simple de navegación para las 4 vistas requeridas
  const [currentView, setCurrentView] = useState('resumen');

  // Estado del inventario y movimientos
  const [items, setItems] = useState(INITIAL_DATA.items);
  const [movements, setMovements] = useState(INITIAL_DATA.movements);
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

  // Manejadores de acciones
  const handleAddItem = (data) => {
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
          return { code: parts[0] || '', model: parts[1] || '', serial: parts[2] || '', status: 'disponible' };
        })
        .filter((u) => u.code);

      newItem.units = parsedUnits;
      newItem.quantity = 0;
      setItems((prev) => [newItem, ...prev]);

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

  const handleRegisterLoan = (data) => {
    const item = items.find((i) => i.id === data.itemId);
    if (!item) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== data.itemId) return it;
        const updatedUnits = (it.units || []).map((u) =>
          data.unitCodes.includes(u.code)
            ? { ...u, status: 'prestado', sede: data.sede || u.sede, responsable: data.person }
            : u
        );
        return { ...it, units: updatedUnits };
      })
    );

    setMovements((prev) => [
      {
        id: 'mov-' + Date.now().toString(36),
        type: 'prestamo',
        itemId: data.itemId,
        itemName: item.name,
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

  const handleReturnLoan = (movId) => {
    const mov = movements.find((m) => m.id === movId);
    if (!mov) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== mov.itemId) return it;
        const updatedUnits = (it.units || []).map((u) =>
          (mov.unitCodes || []).includes(u.code) ? { ...u, status: 'disponible' } : u
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
    let csv = '\uFEFF'; // BOM para soportar tildes en Excel
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
            {/* 2. Sidebar con encabezado y botones para las 4 vistas */}
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />

            <div className="main-wrapper">
              {/* 3. Header con búsqueda y descarga Excel */}
              <Header
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onExportExcel={handleExportExcel}
              />

              {/* 4. Contenedor de las 4 vistas principales */}
              <main className="main-content">
                {currentView === 'resumen' && (
                  <ResumenView items={filteredItems} movements={filteredMovements} />
                )}

                {currentView === 'inventario' && (
                  <InventarioView
                    items={filteredItems}
                    onAddItem={handleAddItem}
                    onEditItem={handleEditItem}
                    onRetireItem={handleRetireItem}
                  />
                )}

                {currentView === 'prestamos' && (
                  <PrestamosView
                    items={filteredItems}
                    movements={filteredMovements}
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