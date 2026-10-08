import { useState } from 'react';
import { fmtDate, EMPLOYEES, SEDES, PROYECTOS, available, isOverdue, today } from '../services/mockData';

export default function PrestamosView({
  items = [],
  movements = [],
  loading = false,
  error = null,
  onRetry,
  onRegisterLoan,
  onRegisterDelivery,
  onReturnLoan,
}) {
  // Pestaña o bloque visible si se desea filtrar rápidamente
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'prestamos' | 'entregas'

  // Modales
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Estados formulario de Préstamos
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [loanPerson, setLoanPerson] = useState('');
  const [loanSede, setLoanSede] = useState('Medellín');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanMotive, setLoanMotive] = useState('');

  // Estados formulario de Entregas
  const [selectedConsumibleId, setSelectedConsumibleId] = useState('');
  const [deliveryQty, setDeliveryQty] = useState(1);
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliverySede, setDeliverySede] = useState('Medellín');
  const [deliveryMotive, setDeliveryMotive] = useState('');

  // Filtrados de movimientos
  const activeLoans = movements.filter((m) => m.type === 'prestamo' && m.status === 'activo');
  const recentDeliveries = movements.filter((m) => m.type === 'entrega');

  // Listados de items disponibles
  const equipos = items.filter((it) => it.itemType === 'equipo');
  const consumibles = items.filter((it) => it.itemType === 'consumible');

  // Equipo seleccionado para el formulario
  const currentEquipo = items.find((it) => it.id === selectedEquipoId);
  const availableUnits = currentEquipo ? (currentEquipo.units || []).filter((u) => u.status === 'disponible') : [];

  // Consumible seleccionado para entrega
  const currentConsumible = items.find((it) => it.id === selectedConsumibleId);
  const maxAvailableConsumible = currentConsumible ? currentConsumible.quantity : 0;

  // Toggle de selección de unidades en checkboxes
  const handleToggleUnit = (code) => {
    setSelectedUnits((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Manejador del Préstamo
  const handleSubmitLoan = (e) => {
    e.preventDefault();

    if (!selectedEquipoId) {
      alert('Por favor selecciona un equipo tecnológico.');
      return;
    }
    if (selectedUnits.length === 0) {
      alert('Debes seleccionar al menos una unidad o placa para realizar el préstamo.');
      return;
    }
    if (!loanPerson) {
      alert('Debes especificar el responsable o formador custodio.');
      return;
    }
    if (!loanExpectedDate) {
      alert('Indica la fecha de devolución pactada.');
      return;
    }
    // Validación de fecha no pasada
    if (loanExpectedDate < today()) {
      alert('La fecha de devolución no puede ser anterior a la fecha de hoy.');
      return;
    }

    onRegisterLoan({
      itemId: selectedEquipoId,
      person: loanPerson,
      sede: loanSede,
      expectedReturn: loanExpectedDate,
      motive: loanMotive || 'Préstamo para formación y actividades de sede',
      unitCodes: selectedUnits,
    });

    // Reset
    setShowLoanModal(false);
    setSelectedEquipoId('');
    setSelectedUnits([]);
    setLoanPerson('');
    setLoanExpectedDate('');
    setLoanMotive('');
  };

  // Manejador de la Entrega de Consumibles
  const handleSubmitDelivery = (e) => {
    e.preventDefault();

    if (!selectedConsumibleId) {
      alert('Selecciona un material o insumo consumible.');
      return;
    }
    if (deliveryQty <= 0) {
      alert('La cantidad a entregar debe ser mayor a cero.');
      return;
    }
    if (deliveryQty > maxAvailableConsumible) {
      alert(`No puedes entregar más de la cantidad disponible en bodega (${maxAvailableConsumible} unidades).`);
      return;
    }
    if (!deliveryPerson) {
      alert('Selecciona a la persona responsable que recibe el material.');
      return;
    }

    onRegisterDelivery({
      itemId: selectedConsumibleId,
      qty: Number(deliveryQty),
      person: deliveryPerson,
      sede: deliverySede,
      motive: deliveryMotive || 'Salida de material para taller / semillero',
    });

    // Reset
    setShowDeliveryModal(false);
    setSelectedConsumibleId('');
    setDeliveryQty(1);
    setDeliveryPerson('');
    setDeliveryMotive('');
  };

  return (
    <div className="prestamos-view">
      {/* BARRA SUPERIOR DE ACCIONES OPERATIVAS */}
      <div className="inventory-topbar">
        <div className="tab-buttons">
          <button
            type="button"
            className={`tab-btn ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSection('all')}
          >
            <span>Ver Todos</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeSection === 'prestamos' ? 'active' : ''}`}
            onClick={() => setActiveSection('prestamos')}
          >
            <span>🔄 Préstamos Activos</span>
            <span className="tab-badge">{activeLoans.length}</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeSection === 'entregas' ? 'active' : ''}`}
            onClick={() => setActiveSection('entregas')}
          >
            <span>📦 Entregas Realizadas</span>
            <span className="tab-badge">{recentDeliveries.length}</span>
          </button>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="btn small btn-primary"
            onClick={() => setShowLoanModal(true)}
          >
            + Nuevo préstamo
          </button>
          <button
            type="button"
            className="btn small btn-secondary"
            onClick={() => setShowDeliveryModal(true)}
          >
            + Entregar Consumibles
          </button>
        </div>
      </div>

      {/* =========================================================================
          BLOQUE 1: PRÉSTAMO DE EQUIPOS (RETORNABLES)
          ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'prestamos') && (
        <section>
          <div className="section-header">
            <h2>
              <span>Préstamos de Equipos en Campo (Retornables)</span>
              <span className="pill prestado">{activeLoans.length} préstamos activos</span>
            </h2>
            <span className="section-subtitle">
              Equipos de cómputo, tablets y proyectores asignados temporalmente a custodios en municipios
            </span>
          </div>

          {loading ? (
            <div className="panel empty" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                Cargando datos de Supabase...
              </strong>
              <p style={{ color: 'var(--text-dim)', marginTop: '6px', fontSize: '0.9rem' }}>
                Consultando préstamos activos en tiempo real
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
          ) : activeLoans.length === 0 ? (
            <div className="panel empty">
              <span>📦</span> {movements.length === 0 ? 'No hay registros en Supabase.' : 'No hay préstamos de equipos activos en este momento. Todos los equipos están en bodega.'}
            </div>
          ) : (
            <div className="panel table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Elemento</th>
                    <th>Placas / Unidades</th>
                    <th>Custodio Responsable</th>
                    <th>Sede / Municipio</th>
                    <th>Fecha Préstamo</th>
                    <th>Devolución Pactada</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((m) => {
                    const overdue = isOverdue(m);
                    return (
                      <tr key={m.id} className={overdue ? 'row-overdue' : 'row-active'}>
                        <td>
                          <div className="item-cell">
                            <strong className="item-title">{m.itemName}</strong>
                            {m.motive && (
                              <span className="item-motive" title={m.motive}>
                                {m.motive}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="units-tags">
                            {m.unitCodes && m.unitCodes.length > 0 ? (
                              m.unitCodes.map((code) => (
                                <span key={code} className="unit-tag mono-num">
                                  {code}
                                </span>
                              ))
                            ) : (
                              <span className="mono-num">{m.qty} und</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="person-name">{m.person}</span>
                        </td>
                        <td>
                          <span className="sede-badge municipal">{m.sede || 'Medellín'}</span>
                        </td>
                        <td className="mono-num">{fmtDate(m.date)}</td>
                        <td className="mono-num">
                          <span style={{ color: overdue ? 'var(--red)' : 'inherit', fontWeight: overdue ? 700 : 500 }}>
                            {fmtDate(m.expectedReturn)}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${overdue ? 'vencido' : 'prestado'}`}>
                            {overdue ? '⚠️ Vencido' : '● Al día'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn small btn-return"
                            title="Registrar devolución a bodega"
                            onClick={() => {
                              if (window.confirm(`¿Confirmar recepción y devolución a bodega de ${m.itemName} (${(m.unitCodes || []).join(', ')})?`)) {
                                onReturnLoan(m.id);
                              }
                            }}
                          >
                            ✓ Marcar devuelto
                          </button>
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
          BLOQUE 2: ENTREGA DE CONSUMIBLES (NO RETORNABLES)
          ========================================================================= */}
      {(activeSection === 'all' || activeSection === 'entregas') && (
        <section>
          <div className="section-header">
            <h2>
              <span>Entregas de Consumibles para Talleres (No Retornables)</span>
              <span className="pill default">{recentDeliveries.length} entregas registradas</span>
            </h2>
            <span className="section-subtitle">
              Salidas de insumos (cautines, Arduinos, motores) descontadas permanentemente de bodega
            </span>
          </div>

          <div className="panel table-responsive">
            {recentDeliveries.length === 0 ? (
              <div className="empty">
                <span>📦</span> {movements.length === 0 ? 'No hay registros en Supabase.' : 'Aún no se han registrado salidas de consumibles.'}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha Salida</th>
                    <th>Material Entregado</th>
                    <th>Cantidad</th>
                    <th>Recibe (Formador / Tallerista)</th>
                    <th>Sede / Destino</th>
                    <th>Proyecto / Motivo</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.slice(0, 15).map((m) => (
                    <tr key={m.id}>
                      <td className="mono-num">{fmtDate(m.date)}</td>
                      <td>
                        <strong className="item-title">{m.itemName}</strong>
                      </td>
                      <td className="mono-num">
                        <span className="qty-indicator">{m.qty} und</span>
                      </td>
                      <td>
                        <span className="person-name">{m.person}</span>
                      </td>
                      <td>
                        <span className="sede-badge">{m.sede || 'Medellín'}</span>
                      </td>
                      <td>
                        <span className="item-motive" title={m.motive}>{m.motive || 'Taller'}</span>
                      </td>
                      <td>
                        <span className="pill default">Consumido</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          MODAL 1: REGISTRAR PRÉSTAMO DE EQUIPOS (RETORNABLE)
          ========================================================================= */}
      {showLoanModal && (
        <div className="modal-backdrop" onClick={() => setShowLoanModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Préstamo de Equipo Tecnológico</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowLoanModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitLoan}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Selecciona el Equipo a Prestar *</label>
                  <select
                    required
                    value={selectedEquipoId}
                    onChange={(e) => {
                      setSelectedEquipoId(e.target.value);
                      setSelectedUnits([]);
                    }}
                  >
                    <option value="">-- Elige un equipo con unidades disponibles --</option>
                    {equipos
                      .filter((it) => available(it) > 0)
                      .map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Disponibles: {available(it)})
                        </option>
                      ))}
                  </select>
                </div>

                {selectedEquipoId && (
                  <div className="form-group full">
                    <label>
                      Unidades y Placas Disponibles (Selecciona al menos una) *
                    </label>
                    {availableUnits.length === 0 ? (
                      <div className="alert-box-warning">
                        ⚠️ No hay unidades disponibles de este equipo en bodega.
                      </div>
                    ) : (
                      <div className="units-checkbox-grid">
                        {availableUnits.map((u) => {
                          const isChecked = selectedUnits.includes(u.code);
                          return (
                            <label
                              key={u.code}
                              className={`unit-checkbox-card ${isChecked ? 'checked' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleUnit(u.code)}
                              />
                              <div className="card-info">
                                <span className="card-placa mono-num">{u.placa || u.code}</span>
                                <span className="card-sn mono-num">SN: {u.serial || '—'}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Solicitante / Formador Responsable *</label>
                  <input
                    required
                    list="formadores-list"
                    value={loanPerson}
                    placeholder="Selecciona o escribe el nombre..."
                    onChange={(e) => setLoanPerson(e.target.value)}
                  />
                  <datalist id="formadores-list">
                    {EMPLOYEES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Sede / Municipio de Destino *</label>
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
                  <small className="help-text">No se permiten fechas anteriores a hoy.</small>
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
                    placeholder="Ej. Taller de robótica móvil con estudiantes de grado 8°"
                    value={loanMotive}
                    onChange={(e) => setLoanMotive(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowLoanModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedEquipoId || selectedUnits.length === 0}
                >
                  Confirmar Préstamo ({selectedUnits.length} und)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REGISTRAR ENTREGA DE CONSUMIBLES (NO RETORNABLE)
          ========================================================================= */}
      {showDeliveryModal && (
        <div className="modal-backdrop" onClick={() => setShowDeliveryModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Salida de Insumos / Consumibles</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDeliveryModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Material o Insumo *</label>
                  <select
                    required
                    value={selectedConsumibleId}
                    onChange={(e) => setSelectedConsumibleId(e.target.value)}
                  >
                    <option value="">-- Elige un insumo de bodega --</option>
                    {consumibles.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.quantity <= 0}>
                        {c.name} (Stock disponible: {c.quantity} {c.unit || 'und'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad a Entregar *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={maxAvailableConsumible > 0 ? maxAvailableConsumible : 1}
                    value={deliveryQty}
                    onChange={(e) => setDeliveryQty(Number(e.target.value))}
                  />
                  {currentConsumible && (
                    <small className="help-text">
                      Máximo disponible en bodega: {maxAvailableConsumible} {currentConsumible.unit || 'und'}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Persona que Recibe (Formador / Líder) *</label>
                  <select
                    required
                    value={deliveryPerson}
                    onChange={(e) => setDeliveryPerson(e.target.value)}
                  >
                    <option value="">-- Selecciona formador --</option>
                    {EMPLOYEES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sede o Municipio de Destino *</label>
                  <select
                    required
                    value={deliverySede}
                    onChange={(e) => setDeliverySede(e.target.value)}
                  >
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Proyecto STEAM</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setDeliveryMotive(`${e.target.value} - `);
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
                  <label>Motivo de la Entrega</label>
                  <input
                    placeholder="Ej. Armado de robots seguidores de línea en La Ceja"
                    value={deliveryMotive}
                    onChange={(e) => setDeliveryMotive(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowDeliveryModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedConsumibleId || deliveryQty <= 0 || deliveryQty > maxAvailableConsumible}
                >
                  Confirmar Entrega y Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
