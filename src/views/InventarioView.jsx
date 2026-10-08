import { useState, useMemo } from 'react';
import ModalQR from '../components/modals/ModalQR';
import { available, SEDES, EMPLOYEES, PROYECTOS, today } from '../services/mockData';

export default function InventarioView({
  items = [],
  loading = false,
  error = null,
  onRetry,
  onAddItem,
  onEditItem,
  onRetireItem,
  onRegisterLoan,
}) {
  // Pestaña activa: 'equipos' | 'consumibles'
  const [activeTab, setActiveTab] = useState('equipos');

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalItemType, setModalItemType] = useState('equipo'); // 'equipo' | 'consumible'
  const [editingItem, setEditingItem] = useState(null);
  const [managingUnitsItem, setManagingUnitsItem] = useState(null);
  const [qrModalItem, setQrModalItem] = useState(null);
  const [quickLoanUnit, setQuickLoanUnit] = useState(null); // Unidad para préstamo rápido
  const [loanPerson, setLoanPerson] = useState('');
  const [loanSede, setLoanSede] = useState('Medellín');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanMotive, setLoanMotive] = useState('');

  // Filtro de estado para la vista de equipos
  const [filterSede, setFilterSede] = useState('todas');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Separación de listas
  const equipos = useMemo(() => items.filter((it) => it.itemType === 'equipo'), [items]);
  const consumibles = useMemo(() => items.filter((it) => it.itemType === 'consumible'), [items]);

  // Aplana las unidades individuales de equipos para visualización detallada por placas
  const allEquiposUnits = useMemo(() => {
    const list = [];
    equipos.forEach((eq) => {
      if (eq.units && eq.units.length > 0) {
        eq.units.forEach((u) => {
          list.push({
            parentItemId: eq.id,
            parentName: eq.name,
            parentCategory: eq.category,
            baseLocation: eq.location,
            ...u,
          });
        });
      } else {
        // En caso de que un equipo no tenga desglose de unidades
        list.push({
          parentItemId: eq.id,
          parentName: eq.name,
          parentCategory: eq.category,
          code: eq.codigoItem || 'SIN-COD',
          placa: '—',
          model: 'General',
          serial: '—',
          sede: eq.sede || 'Medellín',
          status: 'disponible',
          baseLocation: eq.location,
        });
      }
    });

    return list.filter((u) => {
      const matchSede = filterSede === 'todas' || (u.sede || '').toLowerCase() === filterSede.toLowerCase();
      const matchStatus = filterStatus === 'todos' || u.status === filterStatus;
      return matchSede && matchStatus;
    });
  }, [equipos, filterSede, filterStatus]);

  // Manejador apertura creación
  const handleOpenCreate = (type) => {
    setEditingItem(null);
    setModalItemType(type);
    setShowItemModal(true);
  };

  // Manejador apertura edición
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalItemType(item.itemType || 'consumible');
    setShowItemModal(true);
  };

  // Envío del formulario con validaciones
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name')?.toString().trim();
    const category = fd.get('category')?.toString().trim();
    const location = fd.get('location')?.toString().trim();
    const sede = fd.get('sede')?.toString() || 'Medellín';
    const notes = fd.get('notes')?.toString().trim();
    const minStock = Number(fd.get('minStock'));
    const quantity = Number(fd.get('quantity'));

    if (!name) {
      alert('El nombre del elemento es requerido.');
      return;
    }

    if (minStock < 0) {
      alert('El stock mínimo no puede ser negativo.');
      return;
    }

    if (modalItemType === 'consumible' && (quantity < 0 || isNaN(quantity))) {
      alert('La cantidad de existencias no puede ser negativa.');
      return;
    }

    if (editingItem) {
      onEditItem({
        ...editingItem,
        name,
        category,
        location,
        sede,
        notes,
        minStock,
        ...(modalItemType === 'consumible' ? { quantity } : {}),
      });
    } else {
      const unitsText = fd.get('unitsText')?.toString() || '';
      onAddItem({
        name,
        category,
        location,
        sede,
        notes,
        minStock,
        itemType: modalItemType,
        quantity: modalItemType === 'consumible' ? quantity : 0,
        unitsText,
      });
    }

    setShowItemModal(false);
    setEditingItem(null);
  };

  return (
    <div className="inventario-view">
      {/* HEADER DE LA SECCIÓN CON SELECTOR DE PESTAÑAS Y BOTONES */}
      <div className="inventory-topbar">
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'equipos' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipos')}
          >
            <span className="tab-icon">💻</span>
            <span>Equipos Tecnológicos (Préstamo)</span>
            <span className="tab-badge">{equipos.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'consumibles' ? 'active' : ''}`}
            onClick={() => setActiveTab('consumibles')}
          >
            <span className="tab-icon">🔌</span>
            <span>Consumibles y Robótica</span>
            <span className="tab-badge">{consumibles.length}</span>
          </button>
        </div>

        <div className="topbar-actions">
          {activeTab === 'equipos' ? (
            <button
              type="button"
              className="btn small btn-primary"
              onClick={() => handleOpenCreate('equipo')}
            >
              + Nuevo Equipo
            </button>
          ) : (
            <button
              type="button"
              className="btn small btn-primary"
              onClick={() => handleOpenCreate('consumible')}
            >
              + Nuevo Consumible
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          PESTAÑA 1: EQUIPOS TECNOLÓGICOS (Laptops, Tablets, Proyectores, etc.)
          ========================================================================= */}
      {activeTab === 'equipos' && (
        <section>
          {/* Barra de filtros para equipos */}
          <div className="filter-bar">
            <div className="filter-group">
              <label>Sede / Municipio:</label>
              <select value={filterSede} onChange={(e) => setFilterSede(e.target.value)}>
                <option value="todas">Todas las sedes</option>
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Estado:</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="disponible">Disponible</option>
                <option value="prestado">En Campo (Prestado)</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="baja">De Baja</option>
              </select>
            </div>

            <div className="filter-count">
              Mostrando <strong>{allEquiposUnits.length}</strong> unidades registradas
            </div>
          </div>

          {loading ? (
            <div className="panel empty" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                Cargando datos de Supabase...
              </strong>
              <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
                Consultando inventario de activos tecnológicos en tiempo real
              </p>
            </div>
          ) : error ? (
            <div className="panel empty" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <strong style={{ color: 'var(--red)', fontSize: '1.05rem' }}>
                Error al conectar con el backend / Supabase
              </strong>
              <p style={{ color: 'var(--text-dim)', margin: '8px auto', maxWidth: '500px' }}>
                {error}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="btn small btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={onRetry}
                >
                  🔄 Reintentar conexión
                </button>
              )}
            </div>
          ) : allEquiposUnits.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> {equipos.length === 0 ? 'No hay registros en Supabase.' : 'No se encontraron equipos con los filtros seleccionados.'}
            </div>
          ) : (
            <div className="panel table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Placa / Código</th>
                    <th>Equipo & Modelo</th>
                    <th>Serial</th>
                    <th>Sede / Ubicación</th>
                    <th>Responsable Actual</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allEquiposUnits.map((u, idx) => {
                    let pillClass = 'ok';
                    let statusLabel = 'Disponible';
                    if (u.status === 'prestado') {
                      pillClass = 'prestado';
                      statusLabel = 'En Campo';
                    } else if (u.status === 'mantenimiento') {
                      pillClass = 'alerta';
                      statusLabel = 'Mantenimiento';
                    } else if (u.status === 'baja') {
                      pillClass = 'low';
                      statusLabel = 'De Baja';
                    }

                    return (
                      <tr key={`${u.parentItemId}-${u.code}-${idx}`}>
                        <td>
                          <div className="placa-badge mono-num">
                            {u.placa || u.code}
                          </div>
                        </td>
                        <td>
                          <div className="item-cell">
                            <strong className="item-title">{u.parentName}</strong>
                            <span className="item-subtitle">{u.model || u.parentCategory}</span>
                          </div>
                        </td>
                        <td className="mono-num serial-text">
                          {u.serial || '—'}
                        </td>
                        <td>
                          <div className="location-cell">
                            <span className="sede-badge municipal">{u.sede || 'Medellín'}</span>
                            <span className="location-sub">{u.baseLocation || 'Bodega'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="responsable-name">
                            {u.status === 'prestado' ? (u.responsable || 'Custodio asignado') : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${pillClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            {u.status === 'disponible' && onRegisterLoan && (
                              <button
                                type="button"
                                className="btn small btn-primary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                title="Prestar este equipo a un custodio"
                                onClick={() => {
                                  setQuickLoanUnit(u);
                                  setLoanPerson('');
                                  setLoanSede(u.sede || 'Medellín');
                                  setLoanExpectedDate('');
                                  setLoanMotive('');
                                }}
                              >
                                🔄 Prestar
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-action-qr"
                              title="Ver e Imprimir Código QR del Activo"
                              onClick={() => setQrModalItem({
                                code: u.code,
                                placa: u.placa || u.code,
                                nombre: u.parentName,
                                name: u.parentName,
                                model: u.model,
                                serial: u.serial,
                                sede: u.sede || 'Medellín',
                                estado: u.status,
                              })}
                            >
                              <span className="qr-icon">⬛</span> Ver QR
                            </button>
                            <button
                              type="button"
                              className="btn small ghost"
                              title="Gestionar este tipo de equipo"
                              onClick={() => {
                                const parent = equipos.find(e => e.id === u.parentItemId);
                                if (parent) handleOpenEdit(parent);
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 2: CONSUMIBLES Y ROBÓTICA (Insumos, motores, placas, sensores)
          ========================================================================= */}
      {activeTab === 'consumibles' && (
        <section>
          <div className="section-header">
            <h2>
              <span>Insumos y Materiales de Taller / Robótica</span>
              <span className="pill default">{consumibles.length} ítems en catálogo</span>
            </h2>
            <span className="section-subtitle">
              Materiales para talleres de robótica y semilleros STEAM con control de stock mínimo
            </span>
          </div>

          {loading ? (
            <div className="panel empty" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                Cargando datos de Supabase...
              </strong>
              <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
                Consultando inventario de materiales e insumos en tiempo real
              </p>
            </div>
          ) : error ? (
            <div className="panel empty" style={{ padding: '36px', textAlign: 'center', borderColor: 'var(--red)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
              <strong style={{ color: 'var(--red)', fontSize: '1.05rem' }}>
                Error al conectar con el backend / Supabase
              </strong>
              <p style={{ color: 'var(--text-dim)', margin: '8px auto', maxWidth: '500px' }}>
                {error}
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="btn small btn-primary"
                  style={{ marginTop: '12px' }}
                  onClick={onRetry}
                >
                  🔄 Reintentar conexión
                </button>
              )}
            </div>
          ) : consumibles.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> No hay registros en Supabase.
            </div>
          ) : (
            <div className="panel table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Código / Material</th>
                    <th>Categoría</th>
                    <th>Disponible</th>
                    <th>Mínimo Requerido</th>
                    <th>Ubicación Física</th>
                    <th>Estado de Stock</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {consumibles.map((it) => {
                    const disp = it.quantity || 0;
                    const min = it.minStock || 0;
                    const isLow = disp <= min;
                    const isZero = disp === 0;

                    return (
                      <tr key={it.id} className={isZero ? 'row-critical' : isLow ? 'row-warning' : ''}>
                        <td>
                          <div className="item-cell">
                            <strong className="item-title">{it.name}</strong>
                            {it.codigoItem && (
                              <span className="item-code mono-num">{it.codigoItem}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="category-tag">{it.category || 'General'}</span>
                        </td>
                        <td className="mono-num">
                          <span className={`qty-indicator ${isZero ? 'qty-zero' : isLow ? 'qty-low' : ''}`}>
                            {disp} {it.unit || 'unidad'}
                          </span>
                        </td>
                        <td className="mono-num">
                          <span className="qty-min">{min} {it.unit || 'unidad'}</span>
                        </td>
                        <td>
                          <div className="location-cell">
                            <span className="location-name">{it.location || '—'}</span>
                            {it.sede && <span className="sede-badge">{it.sede}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`pill ${isZero ? 'vencido' : isLow ? 'low' : 'ok'}`}>
                            {isZero ? 'Agotado' : isLow ? 'Stock bajo' : 'Disponible'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              type="button"
                              className="btn-action-qr"
                              title="Generar QR de ubicación / estante"
                              onClick={() => setQrModalItem({
                                code: it.codigoItem || it.id,
                                placa: it.codigoItem || 'MAT-00',
                                name: it.name,
                                model: it.category,
                                serial: `Stock: ${disp} ${it.unit || 'und'}`,
                                sede: it.sede || 'Medellín',
                              })}
                            >
                              <span className="qr-icon">⬛</span> QR
                            </button>
                            <button
                              type="button"
                              className="btn small ghost"
                              onClick={() => handleOpenEdit(it)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn small ghost"
                              style={{ color: 'var(--red)' }}
                              onClick={() => onRetireItem(it.id)}
                            >
                              Dar Baja
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          MODAL: NUEVO / EDITAR ELEMENTO
          ========================================================================= */}
      {showItemModal && (
        <div className="modal-backdrop" onClick={() => setShowItemModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingItem ? 'Editar ' : 'Nuevo '}
                {modalItemType === 'equipo' ? 'Equipo Tecnológico' : 'Material / Consumible'}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowItemModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Nombre del Elemento *</label>
                  <input
                    required
                    name="name"
                    defaultValue={editingItem?.name || ''}
                    placeholder={
                      modalItemType === 'equipo'
                        ? 'Ej. Laptops Lenovo ThinkPad L14'
                        : 'Ej. ARDUINO UNO R3 con Cable USB'
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    name="category"
                    defaultValue={editingItem?.category || ''}
                    placeholder="Cómputo, Robótica, Audiovisuales..."
                  />
                </div>

                <div className="form-group">
                  <label>Sede Principal</label>
                  <select name="sede" defaultValue={editingItem?.sede || 'Medellín'}>
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {modalItemType === 'consumible' && (
                  <div className="form-group">
                    <label>Cantidad Inicial / Existencias *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      name="quantity"
                      defaultValue={editingItem ? editingItem.quantity : 1}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Stock Mínimo de Alerta *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    name="minStock"
                    defaultValue={editingItem?.minStock ?? 5}
                  />
                </div>

                <div className="form-group full">
                  <label>Ubicación Física en Bodega / Laboratorio</label>
                  <input
                    name="location"
                    defaultValue={editingItem?.location || ''}
                    placeholder="Ej. Estante A5 / Caja 2 - Lab Robótica"
                  />
                </div>

                {!editingItem && modalItemType === 'equipo' && (
                  <div className="form-group full">
                    <label>
                      Unidades y Placas iniciales (opcional, una por línea: Placa, Modelo, Serial)
                    </label>
                    <textarea
                      name="unitsText"
                      rows="3"
                      placeholder="P-01, ThinkPad L14, PF-3X9011&#10;P-02, ThinkPad L14, PF-3X9012"
                    />
                    <small className="help-text">
                      Puedes ingresar múltiples equipos de una sola vez separando por comas.
                    </small>
                  </div>
                )}

                <div className="form-group full">
                  <label>Notas u Observaciones</label>
                  <textarea
                    name="notes"
                    rows="2"
                    defaultValue={editingItem?.notes || ''}
                    placeholder="Detalles sobre garantía, estado general o especificaciones técnicas."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowItemModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ETIQUETA QR PARA IMPRESIÓN CON ModalQR
          ========================================================================= */}
      {qrModalItem && (
        <ModalQR
          activo={qrModalItem}
          onClose={() => setQrModalItem(null)}
        />
      )}

      {/* =========================================================================
          MODAL: PRÉSTAMO RÁPIDO DE UNIDAD DISPONIBLE
          ========================================================================= */}
      {quickLoanUnit && (
        <div className="modal-backdrop" onClick={() => setQuickLoanUnit(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>🔄 Nuevo Préstamo de Equipo</span>
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setQuickLoanUnit(null)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!loanPerson) {
                  alert('Debes indicar el Solicitante / Formador custodio.');
                  return;
                }
                if (!loanExpectedDate) {
                  alert('Debes seleccionar la fecha de devolución.');
                  return;
                }
                if (loanExpectedDate < today()) {
                  alert('La fecha de devolución no puede ser anterior a la fecha de hoy.');
                  return;
                }

                onRegisterLoan({
                  itemId: quickLoanUnit.parentItemId,
                  person: loanPerson,
                  sede: loanSede,
                  expectedReturn: loanExpectedDate,
                  motive: loanMotive || 'Préstamo asignado desde vista de inventario',
                  unitCodes: [quickLoanUnit.code],
                });

                setQuickLoanUnit(null);
              }}
            >
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Equipo y Placa Seleccionada</label>
                  <div className="pill prestado" style={{ display: 'inline-flex', padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}>
                    💻 {quickLoanUnit.parentName} · <strong>Placa: {quickLoanUnit.placa || quickLoanUnit.code}</strong> (SN: {quickLoanUnit.serial || '—'})
                  </div>
                </div>

                <div className="form-group">
                  <label>Solicitante / Formador Responsable *</label>
                  <input
                    required
                    list="inventario-formadores-list"
                    value={loanPerson}
                    placeholder="Selecciona o escribe el nombre..."
                    onChange={(e) => setLoanPerson(e.target.value)}
                  />
                  <datalist id="inventario-formadores-list">
                    {EMPLOYEES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Sede / Municipio Destino *</label>
                  <select
                    required
                    value={loanSede}
                    onChange={(e) => setLoanSede(e.target.value)}
                  >
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Devolución Pactada *</label>
                  <input
                    required
                    type="date"
                    min={today()}
                    value={loanExpectedDate}
                    onChange={(e) => setLoanExpectedDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Proyecto Vinculado</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setLoanMotive(`${e.target.value} - `);
                      }
                    }}
                  >
                    <option value="">-- Selecciona proyecto (opcional) --</option>
                    {PROYECTOS.map((proj) => (
                      <option key={proj} value={proj}>{proj}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Motivo y Observaciones del Préstamo</label>
                  <input
                    value={loanMotive}
                    placeholder="Ej. Clubes de Robótica - Taller de programación"
                    onChange={(e) => setLoanMotive(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setQuickLoanUnit(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
