import { useState, useMemo, useEffect } from 'react';
import { fmtDate, EMPLOYEES, SEDES, PROYECTOS, available, isOverdue, today } from '../services/mockData';
import ModalQR from '../components/modals/ModalQR';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalEditarActivo from '../components/modals/ModalEditarActivo';
import { useToast } from '../context/ToastContext';
import inventoryApi, { API_BASE_URL } from '../services/inventoryApi';

export default function PrestamosView({
  items = [],
  movements = [],
  loading = false,
  error = null,
  onRetry,
  onRegisterLoan,
  onRegisterDelivery,
  onReturnLoan,
  initialSection = 'all',
  initialStatusFilter = 'todos', // 'todos' | 'Activo' | 'Vencido'
}) {
  // Pestaña o bloque visible si se desea filtrar rápidamente
  const [activeSection, setActiveSection] = useState(initialSection); // 'all' | 'prestamos' | 'entregas'
  const [filterEstadoPrestamo, setFilterEstadoPrestamo] = useState(initialStatusFilter); // 'todos' | 'Activo' | 'Vencido'

  // Notificaciones y Modales Institucionales FMO
  const { showLoanSuccess, showDeliverySuccess, showConfirmAction, showConfirmRetorno, showEditSuccess, showError, showInfo } = useToast();

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (initialStatusFilter) setFilterEstadoPrestamo(initialStatusFilter);
  }, [initialStatusFilter]);

  // Modales
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Estados formulario de Préstamos (Solo Equipos Tecnológicos Retornables)
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [loanPerson, setLoanPerson] = useState('');
  const [loanSede, setLoanSede] = useState('Medellín');
  const [loanExpectedDate, setLoanExpectedDate] = useState('');
  const [loanMotive, setLoanMotive] = useState('');

  // Estados formulario de Entregas (Insumos y Consumibles No Retornables - Canasta Múltiple)
  const [itemsEntrega, setItemsEntrega] = useState([]); // [{ id, material, cantidadEntrega, disponible, unit }]
  const [consumibleSeleccionadoId, setConsumibleSeleccionadoId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliverySede, setDeliverySede] = useState('Medellín');
  const [deliveryProyecto, setDeliveryProyecto] = useState('');
  const [deliveryMotive, setDeliveryMotive] = useState('');
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  // Filtrados de movimientos
  const rawActiveLoans = useMemo(
    () => movements.filter((m) => m.type === 'prestamo' && m.status === 'activo'),
    [movements]
  );

  const activeLoans = useMemo(() => {
    if (filterEstadoPrestamo === 'Vencido') {
      return rawActiveLoans.filter(isOverdue);
    }
    if (filterEstadoPrestamo === 'Activo') {
      return rawActiveLoans.filter((m) => !isOverdue(m));
    }
    return rawActiveLoans;
  }, [rawActiveLoans, filterEstadoPrestamo]);

  const recentDeliveries = movements.filter((m) => m.type === 'entrega');

  // Listados de items disponibles
  const equipos = items.filter((it) => it.itemType === 'equipo');
  const consumibles = items.filter((it) => it.itemType === 'consumible');

  // Equipo seleccionado para el formulario
  const currentEquipo = items.find((it) => it.id === selectedEquipoId);
  const availableUnits = currentEquipo ? (currentEquipo.units || []).filter((u) => u.status === 'disponible') : [];

  // Toggle de selección de unidades en checkboxes
  const handleToggleUnit = (code) => {
    setSelectedUnits((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Manejador del Préstamo (Solo Equipos Tecnológicos Retornables)
  const handleSubmitLoan = async (e) => {
    e.preventDefault();

    if (!selectedEquipoId) {
      showError('Validación', 'Por favor selecciona un equipo tecnológico.');
      return;
    }
    if (selectedUnits.length === 0) {
      showError('Validación', 'Debes seleccionar al menos una unidad o placa para realizar el préstamo.');
      return;
    }

    if (!loanPerson) {
      showError('Validación', 'Debes especificar el responsable o formador custodio.');
      return;
    }
    if (!loanExpectedDate) {
      showError('Validación', 'Indica la fecha de devolución pactada.');
      return;
    }
    // Validación de fecha no pasada
    if (loanExpectedDate < today()) {
      showError('Fecha Inválida', 'La fecha de devolución no puede ser anterior a la fecha de hoy.');
      return;
    }

    try {
      if (onRegisterLoan) {
        await onRegisterLoan({
          tipo_item: 'activo',
          itemId: selectedEquipoId,
          person: loanPerson,
          sede: loanSede,
          expectedReturn: loanExpectedDate,
          motive: loanMotive || 'Préstamo para formación y actividades de sede',
          unitCodes: selectedUnits,
        });
      }

      if (onRetry) {
        await onRetry();
      }

      // Copiar valores para la notificación
      const targetPlacas = [...selectedUnits];
      const targetCustodio = loanPerson;
      const targetFecha = loanExpectedDate;

      // Reset
      setShowLoanModal(false);
      setSelectedEquipoId('');
      setSelectedUnits([]);
      setLoanPerson('');
      setLoanExpectedDate('');
      setLoanMotive('');

      // Notificación institucional FMO STEAM para Préstamo Retornable
      showLoanSuccess({
        codigo: targetPlacas.join(', '),
        custodio: targetCustodio,
        fechaDevolucion: targetFecha,
      });
    } catch (err) {
      console.error('Error al registrar préstamo:', err);
      showError('Error al registrar préstamo', err.message || 'Error del servidor');
    }
  };

  // Consumible seleccionado temporalmente para agregar a la canasta
  const consumibleSeleccionado = items.find((it) => it.id === consumibleSeleccionadoId);
  const maxAvailableConsumible = consumibleSeleccionado ? (consumibleSeleccionado.quantity ?? consumibleSeleccionado.disponible ?? 0) : 0;

  // Ya agregado a la canasta
  const cantidadYaEnCanasta = useMemo(() => {
    if (!consumibleSeleccionadoId) return 0;
    const encontrado = itemsEntrega.find((it) => it.id === consumibleSeleccionadoId);
    return encontrado ? encontrado.cantidadEntrega : 0;
  }, [itemsEntrega, consumibleSeleccionadoId]);

  const maxAgregable = Math.max(0, maxAvailableConsumible - cantidadYaEnCanasta);

  // Agregar insumo a la canasta
  const handleAgregarItemEntrega = () => {
    if (!consumibleSeleccionado) {
      showError('Validación', 'Por favor selecciona un material o insumo consumible.');
      return;
    }
    const cant = Number(cantidadInput);
    if (isNaN(cant) || cant <= 0) {
      showError('Cantidad Inválida', 'La cantidad a entregar debe ser mayor a 0.');
      return;
    }
    if (cant > maxAgregable) {
      showError('Stock Insuficiente', `Solo hay ${maxAgregable} unidades disponibles adicionales para agregar a la lista (Stock total: ${maxAvailableConsumible}).`);
      return;
    }

    setItemsEntrega((prev) => {
      const idx = prev.findIndex((it) => it.id === consumibleSeleccionado.id);
      if (idx >= 0) {
        const actualizados = [...prev];
        actualizados[idx] = {
          ...actualizados[idx],
          cantidadEntrega: actualizados[idx].cantidadEntrega + cant,
        };
        return actualizados;
      }
      return [
        ...prev,
        {
          id: consumibleSeleccionado.id,
          material: consumibleSeleccionado.material || consumibleSeleccionado.name,
          disponible: maxAvailableConsumible,
          unit: consumibleSeleccionado.unit || 'und',
          cantidadEntrega: cant,
        },
      ];
    });

    // Resetear selector temporal
    setConsumibleSeleccionadoId('');
    setCantidadInput(1);
  };

  // Eliminar insumo de la canasta
  const handleEliminarItemEntrega = (id) => {
    setItemsEntrega((prev) => prev.filter((it) => it.id !== id));
  };

  // Manejador de la Entrega Múltiple de Consumibles
  const handleSubmitDelivery = async (e) => {
    e.preventDefault();

    if (!deliveryPerson) {
      showError('Validación', 'Selecciona a la persona responsable que recibe el material.');
      return;
    }
    if (!deliverySede) {
      showError('Validación', 'Selecciona la sede o municipio de destino.');
      return;
    }
    if (itemsEntrega.length === 0) {
      showError('Validación', 'Debes agregar al menos 1 material o insumo a la lista de entrega.');
      return;
    }

    const motivoFinal = [deliveryProyecto, deliveryMotive].filter(Boolean).join(' - ') || 'Salida de material para taller / semillero';

    try {
      setDeliverySubmitting(true);
      if (onRegisterDelivery) {
        await onRegisterDelivery({
          person: deliveryPerson,
          responsable_recibe: deliveryPerson,
          sede: deliverySede,
          proyecto: deliveryProyecto,
          motivo: deliveryMotive,
          motive: motivoFinal,
          items: itemsEntrega.map((it) => ({
            material_id: it.id,
            id: it.id,
            nombre: it.material,
            material: it.material,
            cantidad: Number(it.cantidadEntrega),
            cantidadEntrega: Number(it.cantidadEntrega),
          })),
        });
      }

      if (onRetry) {
        await onRetry();
      }

      const totalItemsDespachados = itemsEntrega.length;
      const actaId = `ACTA-${Date.now().toString().slice(-4)}`;

      // Reset
      setShowDeliveryModal(false);
      setItemsEntrega([]);
      setConsumibleSeleccionadoId('');
      setCantidadInput(1);
      setDeliveryPerson('');
      setDeliveryProyecto('');
      setDeliveryMotive('');

      // Notificación institucional FMO STEAM para Despacho de Consumibles
      showDeliverySuccess({
        totalConsumibles: totalItemsDespachados,
        codigoRemision: actaId,
      });
    } catch (err) {
      console.error('Error al registrar entrega de consumibles:', err);
      showError('Error al registrar entrega', err.message || 'Error inesperado');
    } finally {
      setDeliverySubmitting(false);
    }
  };

  // Paginación fija de 5 filas para préstamos activos
  const [currentLoanPage, setCurrentLoanPage] = useState(1);
  const LOANS_PER_PAGE = 5;
  const totalLoanPages = Math.max(1, Math.ceil(activeLoans.length / LOANS_PER_PAGE));
  const paginatedLoans = activeLoans.slice(
    (currentLoanPage - 1) * LOANS_PER_PAGE,
    currentLoanPage * LOANS_PER_PAGE
  );

  // Modales de acciones para préstamos
  const [detailLoan, setDetailLoan] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editPerson, setEditPerson] = useState('');
  const [editSede, setEditSede] = useState('Medellín');
  const [editMotive, setEditMotive] = useState('');
  const [qrLoanItem, setQrLoanItem] = useState(null);
  const [remisionParaImprimir, setRemisionParaImprimir] = useState(null);

  // Estados para Modal de Detalle / Ficha Técnica (Reutilizable universal)
  const [activoDetalleSeleccionado, setActivoDetalleSeleccionado] = useState(null);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);

  // Estados para Modal de Edición de Equipo
  const [equipoParaEditar, setEquipoParaEditar] = useState(null);
  const [modalEditarEquipoOpen, setModalEditarEquipoOpen] = useState(false);
  const [pasoActualEditarEquipo, setPasoActualEditarEquipo] = useState(1);
  const [editEquipoSubmitting, setEditEquipoSubmitting] = useState(false);
  const [formDataEditarEquipo, setFormDataEditarEquipo] = useState({});

  // Lógica de apertura y carga de datos completos para el modal de detalle
  const abrirModalDetalle = async (placaIdentificador, fallbackMovimiento = null) => {
    if (!placaIdentificador && !fallbackMovimiento) return;
    const searchPlaca = String(placaIdentificador || '').replace(/^eq-/, '').trim();

    // 1. Buscar en la lista global de activos / items pasada por props
    const equipoEnItems = items.find((it) => {
      if (it.placa && String(it.placa).trim().toLowerCase() === searchPlaca.toLowerCase()) return true;
      if (it.id && String(it.id).replace(/^eq-/, '').trim().toLowerCase() === searchPlaca.toLowerCase()) return true;
      if (it.units && it.units.some((u) => String(u.placa || u.code).trim().toLowerCase() === searchPlaca.toLowerCase())) return true;
      return false;
    });

    const unitInfo = equipoEnItems?.units?.find(
      (u) => String(u.placa || u.code).trim().toLowerCase() === searchPlaca.toLowerCase()
    );

    // 2. Construir objeto base inmediato
    const baseEquipo = {
      ...(equipoEnItems || {}),
      id: searchPlaca,
      placa: searchPlaca,
      codigo: searchPlaca,
      nombre: fallbackMovimiento?.itemName || equipoEnItems?.nombre || equipoEnItems?.name || `Equipo ${searchPlaca}`,
      equipo: fallbackMovimiento?.itemName || equipoEnItems?.equipo || equipoEnItems?.name || `Equipo ${searchPlaca}`,
      categoria: equipoEnItems?.categoria || equipoEnItems?.category || 'Portátiles',
      condicion: equipoEnItems?.condicion || 'Bueno',
      estado: 'En campo',
      status: 'prestado',
      area: equipoEnItems?.area || 'Tecnología',
      sede: fallbackMovimiento?.sede || equipoEnItems?.sede || 'Medellín',
      ubicacion: equipoEnItems?.ubicacion || fallbackMovimiento?.sede || 'Medellín',
      ubicacion_estante: unitInfo?.ubicacion_estante || equipoEnItems?.ubicacion_estante || '',
      responsable: fallbackMovimiento?.person || fallbackMovimiento?.responsable || equipoEnItems?.responsable || 'Custodio Temporal',
      custodio: fallbackMovimiento?.person || fallbackMovimiento?.responsable || equipoEnItems?.custodio || 'Custodio Temporal',
      marca: unitInfo?.marca || equipoEnItems?.marca || 'Estándar',
      modelo: unitInfo?.model || equipoEnItems?.modelo || equipoEnItems?.model || 'Estándar',
      serial: unitInfo?.serial || equipoEnItems?.serial || '—',
      caracteristica_1: equipoEnItems?.caracteristica_1 || '',
      caracteristica_2: equipoEnItems?.caracteristica_2 || '',
      caracteristica_3: equipoEnItems?.caracteristica_3 || '',
      proveedor: equipoEnItems?.proveedor || '',
      valor_compra: equipoEnItems?.valor_compra || null,
      valor_total: equipoEnItems?.valor_total || null,
      fecha_compra: equipoEnItems?.fecha_compra || null,
      fecha_vencimiento_garantia: equipoEnItems?.fecha_vencimiento_garantia || null,
      claves_otros: equipoEnItems?.claves_otros || '',
      observaciones: fallbackMovimiento?.motive || equipoEnItems?.observaciones || equipoEnItems?.notes || '',
      descripcion: equipoEnItems?.descripcion || `Equipo actualmente prestado a ${fallbackMovimiento?.person || 'custodio'}.`,
      isEquipo: true,
      itemType: 'equipo',
    };

    setActivoDetalleSeleccionado(baseEquipo);
    setMostrarModalDetalle(true);

    // 3. Consultar datos frescos desde backend para asegurar ficha técnica completa
    try {
      if (searchPlaca) {
        const activoFresco = await inventoryApi.getActivoByPlaca(searchPlaca);
        if (activoFresco) {
          setActivoDetalleSeleccionado({
            ...baseEquipo,
            ...activoFresco,
            placa: searchPlaca,
            codigo: searchPlaca,
            estado: 'En campo',
            status: 'prestado',
            responsable: fallbackMovimiento?.person || activoFresco.responsable || 'Custodio Temporal',
            custodio: fallbackMovimiento?.person || activoFresco.custodio || 'Custodio Temporal',
            isEquipo: true,
          });
        }
      }
    } catch (_) {
      // Usar baseEquipo local si la red falla
    }
  };

  // Abrir modal de edición desde el detalle o directamente
  const handleAbrirEditarEquipo = async (equipo) => {
    if (!equipo) return;
    setPasoActualEditarEquipo(1);
    const idOPlaca = String(equipo.placa || equipo.codigo || equipo.id || '').replace(/^eq-/, '').trim();

    try {
      const res = await fetch(`${API_BASE_URL}/api/activos/${encodeURIComponent(idOPlaca)}`);
      const data = await res.json().catch(() => null);
      const equipoFresco = (data && data.data) ? data.data : (data || equipo);

      setFormDataEditarEquipo({
        ...equipoFresco,
        placa: equipoFresco.placa || equipoFresco.codigo || idOPlaca || '',
        nombre: equipoFresco.nombre || equipoFresco.equipo || equipoFresco.material || equipoFresco.name || '',
        categoria: equipoFresco.categoria || equipoFresco.category || 'Portátiles',
        condicion: equipoFresco.condicion || equipoFresco.estado_fisico || equipoFresco.estado || 'Bueno',
        area: equipoFresco.area || 'Tecnología',
        ubicacion: equipoFresco.ubicacion || equipoFresco.sede || 'Oficina Medellín',
        ubicacion_estante: equipoFresco.ubicacion_estante || '',
        descripcion: (equipoFresco.descripcion && equipoFresco.descripcion !== 'Sin descripción general registrada.') ? equipoFresco.descripcion : '',
        marca: equipoFresco.marca || '',
        modelo: equipoFresco.modelo || equipoFresco.model || '',
        serial: equipoFresco.serial || '',
        caracteristica_1: equipoFresco.caracteristica_1 || '',
        caracteristica_2: equipoFresco.caracteristica_2 || '',
        caracteristica_3: equipoFresco.caracteristica_3 || '',
        responsable: equipoFresco.responsable || equipoFresco.custodio || 'Bodega Central',
        proveedor: equipoFresco.proveedor || '',
        valor_compra: equipoFresco.valor_compra !== '' && equipoFresco.valor_compra != null ? equipoFresco.valor_compra : '',
        fecha_compra: equipoFresco.fecha_compra ? equipoFresco.fecha_compra.split('T')[0] : '',
        fecha_vencimiento_garantia: equipoFresco.fecha_vencimiento_garantia ? equipoFresco.fecha_vencimiento_garantia.split('T')[0] : '',
        claves_otros: equipoFresco.claves_otros || '',
        observaciones: equipoFresco.observaciones || equipoFresco.notas || '',
      });

      setEquipoParaEditar(equipoFresco);
      setModalEditarEquipoOpen(true);
    } catch (_) {
      setFormDataEditarEquipo({
        ...equipo,
        placa: idOPlaca,
        nombre: equipo.nombre || equipo.equipo || equipo.name || '',
      });
      setEquipoParaEditar(equipo);
      setModalEditarEquipoOpen(true);
    }
  };

  const handleSubmitEditarEquipo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!equipoParaEditar) return;

    try {
      setEditEquipoSubmitting(true);
      const placaTarget = formDataEditarEquipo.placa || equipoParaEditar.placa;
      await inventoryApi.updateActivo(placaTarget, {
        nombre: formDataEditarEquipo.nombre?.trim(),
        marca: formDataEditarEquipo.marca?.trim(),
        modelo: formDataEditarEquipo.modelo?.trim(),
        serial: formDataEditarEquipo.serial?.trim(),
        categoria: formDataEditarEquipo.categoria,
        condicion: formDataEditarEquipo.condicion,
        area: formDataEditarEquipo.area?.trim(),
        ubicacion: formDataEditarEquipo.ubicacion?.trim(),
        ubicacion_estante: formDataEditarEquipo.ubicacion_estante?.trim(),
        descripcion: formDataEditarEquipo.descripcion?.trim(),
        caracteristica_1: formDataEditarEquipo.caracteristica_1?.trim(),
        caracteristica_2: formDataEditarEquipo.caracteristica_2?.trim(),
        caracteristica_3: formDataEditarEquipo.caracteristica_3?.trim(),
        responsable: formDataEditarEquipo.responsable?.trim(),
        proveedor: formDataEditarEquipo.proveedor?.trim(),
        valor_compra: formDataEditarEquipo.valor_compra !== '' ? formDataEditarEquipo.valor_compra : null,
        fecha_compra: formDataEditarEquipo.fecha_compra || null,
        fecha_vencimiento_garantia: formDataEditarEquipo.fecha_vencimiento_garantia || null,
        claves_otros: formDataEditarEquipo.claves_otros || null,
        observaciones: formDataEditarEquipo.observaciones || null,
      });

      if (onRetry) await onRetry();
      setModalEditarEquipoOpen(false);
      setEquipoParaEditar(null);
      showEditSuccess(formDataEditarEquipo.nombre || formDataEditarEquipo.placa);
    } catch (err) {
      showError('Error al actualizar', err.message || 'Error del servidor');
    } finally {
      setEditEquipoSubmitting(false);
    }
  };

  const handleOpenEditLoan = (loan) => {
    setEditingLoan(loan);
    setEditExpectedDate(loan.expectedReturn || '');
    setEditPerson(loan.person || '');
    setEditSede(loan.sede || 'Medellín');
    setEditMotive(loan.motive || '');
  };

  const handleSaveEditLoan = async (e) => {
    e.preventDefault();
    if (!editingLoan) return;

    // Actualizar movimiento localmente y refrescar
    editingLoan.expectedReturn = editExpectedDate;
    editingLoan.person = editPerson;
    editingLoan.sede = editSede;
    editingLoan.motive = editMotive;

    setEditingLoan(null);
    if (onRetry) await onRetry();
  };

  // Formateador compacto DD/MM/YYYY
  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    // Si viene en formato YYYY-MM-DD
    if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
      const parts = fechaStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return '—';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
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
              {filterEstadoPrestamo !== 'todos' ? (
                <span
                  className={`pill ${filterEstadoPrestamo === 'Vencido' ? 'vencido' : 'prestado'}`}
                  style={{ cursor: 'pointer', fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => setFilterEstadoPrestamo('todos')}
                  title="Clic para mostrar todos los préstamos"
                >
                  {filterEstadoPrestamo === 'Vencido' ? '⏰ Filtro: Vencidos' : '🔄 Filtro: Activos en plazo'} ({activeLoans.length}) ✕
                </span>
              ) : (
                <span className="pill prestado">{activeLoans.length} préstamos activos</span>
              )}
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
            <div className="panel" style={{ paddingBottom: '4px', overflow: 'hidden' }}>
              <table className="w-full table-fixed" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead className="bg-[#131b26] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="w-[24%] py-3 px-4 text-left truncate" style={{ width: '24%', padding: '10px 14px', textAlign: 'left' }}>EQUIPO</th>
                    <th className="w-[10%] py-3 px-2 text-center truncate" style={{ width: '10%', padding: '10px 8px', textAlign: 'center' }}>PLACA</th>
                    <th className="w-[18%] py-3 px-3 text-left truncate" style={{ width: '18%', padding: '10px 12px', textAlign: 'left' }}>RESPONSABLE</th>
                    <th className="w-[12%] py-3 px-2 text-center truncate" style={{ width: '12%', padding: '10px 8px', textAlign: 'center' }}>SEDE</th>
                    <th className="w-[11%] py-3 px-2 text-center truncate" style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>F. PRÉSTAMO</th>
                    <th className="w-[11%] py-3 px-2 text-center truncate" style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>F. ENTREGA</th>
                    <th className="w-[14%] py-3 px-3 text-center truncate" style={{ width: '14%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLoans.map((m) => {
                    const overdue = isOverdue(m);
                    const firstCode = m.unitCodes && m.unitCodes.length > 0 ? m.unitCodes[0] : (m.placa || m.itemId);
                    const fechaSalida = m.date || m.fecha_salida || m.created_at;
                    const fechaDevolucion = m.expectedReturn || m.fecha_devolucion_esperada || m.fecha_devolucion;

                    return (
                      <tr key={m.id} className={`${overdue ? 'row-overdue' : 'row-active'} h-auto`}>
                        {/* 1. ELEMENTO */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title"
                              title={m.itemName}
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-h)',
                                lineHeight: '1.25',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m.itemName}
                            </strong>
                            {m.motive && (
                              <span
                                className="item-motive"
                                title={m.motive}
                                style={{
                                  fontSize: '11.5px',
                                  color: 'var(--text-dim)',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m.motive}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. PLACAS / UNIDADES (CENTRADAS E INTERACTIVAS) */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <div className="units-tags" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', overflow: 'hidden', maxWidth: '100%', flexWrap: 'wrap' }}>
                            {m.unitCodes && m.unitCodes.length > 0 ? (
                              m.unitCodes.map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => abrirModalDetalle(code, m)}
                                  className="badge-placa"
                                  title={`Ver ficha técnica y detalle completo del equipo (${code})`}
                                >
                                  {code}
                                </button>
                              ))
                            ) : (
                              <button
                                type="button"
                                onClick={() => abrirModalDetalle(m.placa || m.itemId, m)}
                                className="badge-placa"
                                title="Ver ficha técnica del equipo"
                              >
                                {m.placa || `${m.qty || 1} und`}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. CUSTODIO RESPONSABLE */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span
                            className="person-name"
                            title={m.person}
                            style={{ fontSize: '12.5px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}
                          >
                            {m.person}
                          </span>
                        </td>

                        {/* 4. SEDE / MUNICIPIO (CENTRADO Y COMPACTO) */}
                        <td className="py-2.5" style={{ paddingLeft: '8px', paddingRight: '8px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50" title={m.sede || 'Medellín'}>
                            {m.sede || 'Medellín'}
                          </span>
                        </td>

                        {/* 5. FECHA PRÉSTAMO (DD/MM/YYYY CENTRADO) */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span className="mono-num" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1' }}>
                            {formatFecha(fechaSalida)}
                          </span>
                        </td>

                        {/* 6. DEVOLUCIÓN PACTADA (DD/MM/YYYY CENTRADO) */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '8px', paddingRight: '8px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            className="mono-num"
                            title={overdue ? 'Préstamo vencido' : 'En plazo'}
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: overdue ? 'var(--red, #ef4444)' : '#cbd5e1',
                              fontWeight: overdue ? 800 : 500,
                            }}
                          >
                            {overdue ? '⚠️ ' : ''}{formatFecha(fechaDevolucion)}
                          </span>
                        </td>

                        {/* 7. ACCIONES: 📷 QR, 👁️ Ver, ✏️ Editar, ✅ Devolución */}
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div
                            className="flex items-center justify-center gap-1.5"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 2px',
                            }}
                          >
                            {/* 1. 📷 Código QR */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Ver código QR y comprobante de entrega"
                              onClick={() => {
                                setQrLoanItem({
                                  code: firstCode,
                                  placa: firstCode,
                                  nombre: m.itemName,
                                  name: m.itemName,
                                  sede: m.sede || 'Medellín',
                                  responsable: m.person,
                                  fechaPrestamo: m.date,
                                  fechaDevolucion: m.expectedReturn,
                                  motivo: m.motive,
                                });
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#06b6d4',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="5" height="5" x="3" y="3" rx="1" />
                                <rect width="5" height="5" x="16" y="3" rx="1" />
                                <rect width="5" height="5" x="3" y="16" rx="1" />
                                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                                <path d="M21 21v.01" />
                                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                                <path d="M3 12h.01" />
                                <path d="M12 3h.01" />
                                <path d="M12 16v.01" />
                                <path d="M16 12h1" />
                                <path d="M21 12v.01" />
                                <path d="M12 21v-1" />
                              </svg>
                            </button>

                            {/* 2. 👁️ Consultar / Ver Detalle */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Ver información completa del préstamo"
                              onClick={() => setDetailLoan(m)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'var(--surface-2)',
                                border: '1px solid var(--line)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* 3. ✏️ Editar */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Editar fecha pactada o custodio"
                              onClick={() => handleOpenEditLoan(m)}
                              style={{
                                width: '28px',
                                height: '28px',
                                flexShrink: 0,
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--amber, #f59e0b)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>

                            {/* 4. ✅ Check Verde / Devolución */}
                            <button
                              type="button"
                              className="btn-icon-crud w-7 h-7 flex items-center justify-center rounded shrink-0"
                              title="Registrar devolución y retorno a bodega"
                              onClick={() => {
                                const unitCodesStr = (m.unitCodes || []).filter(Boolean).join(', ');
                                showConfirmRetorno({
                                  nombreEquipo: m.itemName,
                                  placa: unitCodesStr,
                                  onConfirm: async () => {
                                    if (onReturnLoan) {
                                      await onReturnLoan(m.id);
                                    }
                                    if (onRetry) {
                                      await onRetry();
                                    }
                                    showInfo('Retorno Confirmado', `Equipo ${m.itemName} (${unitCodesStr}) reintegrado a bodega.`);
                                  },
                                });
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
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
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* FILAS PLACEHOLDER PARA MANTENER LA ALTURA EXACTA SI HAY MENOS DE 5 REGISTROS */}
                  {Array.from({ length: Math.max(0, LOANS_PER_PAGE - paginatedLoans.length) }).map((_, phIdx) => (
                    <tr key={`ph-loans-${phIdx}`} style={{ height: '56px', opacity: 0.25 }}>
                      <td colSpan={7} style={{ padding: '0 8px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                        &nbsp;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* CONTROLES DE PAGINACIÓN COMPACTA (5 FILAS POR PÁGINA) */}
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
                    {activeLoans.length === 0 ? 0 : (currentLoanPage - 1) * LOANS_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(currentLoanPage * LOANS_PER_PAGE, activeLoans.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{activeLoans.length}</strong> préstamos
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentLoanPage <= 1}
                    onClick={() => setCurrentLoanPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentLoanPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {currentLoanPage} de {totalLoanPages}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={currentLoanPage >= totalLoanPages}
                    onClick={() => setCurrentLoanPage((p) => Math.min(totalLoanPages, p + 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: currentLoanPage >= totalLoanPages ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
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
                    <th style={{ width: '130px' }}>Fecha y Código</th>
                    <th>Materiales Entregados (Canasta)</th>
                    <th style={{ width: '180px' }}>Recibe (Formador)</th>
                    <th style={{ width: '120px' }}>Sede</th>
                    <th>Proyecto / Motivo</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeliveries.map((m) => {
                    const rawItems = Array.isArray(m.items) && m.items.length > 0 ? m.items : [
                      {
                        material_id: m.itemId,
                        nombre: m.itemName,
                        cantidad: m.qty || 1,
                      }
                    ];
                    const totalUnidades = m.total_unidades || rawItems.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
                    const totalItems = rawItems.length;
                    const codigoRemision = m.codigo_acta || m.remision_id || `REM-${m.id.replace(/^mov-ent-/, '')}`;

                    return (
                      <tr key={m.id} className="h-auto">
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <div className="mono-num" style={{ fontWeight: 600 }}>{fmtDate(m.date)}</div>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '11px',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'inline-block',
                              marginTop: '3px',
                            }}
                          >
                            {codigoRemision}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          {/* Lista compacta de chips/ítems */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                            {rawItems.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  color: 'var(--text, #f8fafc)',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'var(--mono)',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    backgroundColor: 'rgba(171, 222, 22, 0.12)',
                                    color: '#ABDE16',
                                    border: '1px solid rgba(171, 222, 22, 0.3)',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  [{it.cantidad} und]
                                </span>
                                <strong style={{ fontWeight: 600 }}>{it.nombre || it.material}</strong>
                                {it.material_id && (
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim, #94a3b8)', fontFamily: 'var(--mono)' }}>
                                    ({it.material_id})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Badge resumen */}
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: 'var(--text-dim, #94a3b8)',
                              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.5))',
                              border: '1px solid var(--line, #334155)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📦 {totalItems} {totalItems === 1 ? 'material' : 'materiales'} ({totalUnidades} und en total)
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <span className="person-name" style={{ fontWeight: 600 }}>{m.person || m.responsable_recibe}</span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50">
                            {m.sede || 'Medellín'}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ paddingLeft: '12px', paddingRight: '12px' }}>
                          <span className="item-motive" title={m.motive || m.motivo || m.proyecto}>
                            {m.proyecto && <strong style={{ color: '#ABDE16', display: 'block', fontSize: '11px' }}>{m.proyecto}</strong>}
                            {m.motive || m.motivo || 'Salida de bodega'}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ textAlign: 'center', paddingLeft: '12px', paddingRight: '12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setRemisionParaImprimir({
                                remision_id: codigoRemision,
                                codigo_acta: codigoRemision,
                                fecha_entrega: m.fecha_entrega || m.date,
                                responsable_recibe: m.person || m.responsable_recibe,
                                sede: m.sede || 'Medellín',
                                proyecto: m.proyecto || '',
                                motivo: m.motive || m.motivo || 'Salida de bodega',
                                items: rawItems,
                                total_items: totalItems,
                                total_unidades: totalUnidades,
                              });
                            }}
                            className="btn small"
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Imprimir Acta de Entrega / Hoja de Guía"
                          >
                            <span>🖨️</span> Imprimir Guía
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
          MODAL 2: REGISTRAR ENTREGA DE CONSUMIBLES (NO RETORNABLE - MÚLTIPLES ÍTEMS)
          ========================================================================= */}
      {showDeliveryModal && (
        <div className="modal-backdrop" onClick={() => !deliverySubmitting && setShowDeliveryModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '100%' }}>
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-dim, #94a3b8)',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  Salida de Bodega • No Retornable
                </span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Registrar Salida de Insumos / Consumibles</h3>
              </div>
              <button
                type="button"
                disabled={deliverySubmitting}
                className="close-btn"
                onClick={() => setShowDeliveryModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. DATOS GENERALES DE LA ENTREGA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Fila superior: Persona que Recibe y Sede o Municipio */}
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Persona Que Recibe (Formador / Líder) *</label>
                      <select
                        required
                        value={deliveryPerson}
                        onChange={(e) => setDeliveryPerson(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- Selecciona formador o custodio --</option>
                        {EMPLOYEES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Sede O Municipio De Destino *</label>
                      <select
                        required
                        value={deliverySede}
                        onChange={(e) => setDeliverySede(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        {SEDES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Fila intermedia: Proyecto STEAM y Motivo */}
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', margin: 0 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Proyecto STEAM (opcional)</label>
                      <select
                        value={deliveryProyecto}
                        onChange={(e) => setDeliveryProyecto(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- Ninguno / General --</option>
                        {PROYECTOS.map((proj) => (
                          <option key={proj} value={proj}>{proj}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>Motivo De La Entrega</label>
                      <input
                        placeholder="Ej. Armado de robots seguidores o semilleros"
                        value={deliveryMotive}
                        onChange={(e) => setDeliveryMotive(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN: LISTA DE INSUMOS A ENTREGAR */}
                <div
                  style={{
                    backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.4))',
                    border: '1px solid var(--line, #334155)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '12.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#ABDE16',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📦</span> Lista de Insumos a Entregar
                    </h4>
                    {/* Badge contador total */}
                    <span
                      style={{
                        backgroundColor: itemsEntrega.length > 0 ? 'rgba(171, 222, 22, 0.15)' : 'var(--surface, #0f172a)',
                        color: itemsEntrega.length > 0 ? '#ABDE16' : 'var(--text-dim, #94a3b8)',
                        border: itemsEntrega.length > 0 ? '1px solid rgba(171, 222, 22, 0.35)' : '1px solid var(--line, #334155)',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: '20px',
                      }}
                    >
                      Total materiales: {itemsEntrega.length} {itemsEntrega.length === 1 ? 'ítem' : 'ítems'} | {itemsEntrega.reduce((acc, it) => acc + it.cantidadEntrega, 0)} unidades
                    </span>
                  </div>

                  {/* Selector temporal + Cantidad + Botón Agregar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 110px auto',
                      gap: '8px',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                        Seleccionar Consumible de Bodega
                      </label>
                      <select
                        value={consumibleSeleccionadoId}
                        onChange={(e) => {
                          setConsumibleSeleccionadoId(e.target.value);
                          setCantidadInput(1);
                        }}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      >
                        <option value="">-- Elige un insumo --</option>
                        {consumibles.map((c) => {
                          const enCanasta = (itemsEntrega.find((it) => it.id === c.id)?.cantidadEntrega) || 0;
                          const disponibleReal = (c.quantity ?? c.disponible ?? 0) - enCanasta;
                          const estaAgotado = disponibleReal <= 0;
                          return (
                            <option key={c.id} value={c.id} disabled={estaAgotado}>
                              {c.id} - {c.name || c.material} (Disp: {disponibleReal} {c.unit || 'und'}){estaAgotado ? ' [Agotado]' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '4px' }}>
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={maxAgregable > 0 ? maxAgregable : 1}
                        value={cantidadInput}
                        disabled={!consumibleSeleccionadoId || maxAgregable <= 0}
                        onChange={(e) => setCantidadInput(Math.max(1, Number(e.target.value)))}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAgregarItemEntrega}
                      disabled={!consumibleSeleccionadoId || maxAgregable <= 0}
                      className="btn"
                      style={{
                        backgroundColor: '#ABDE16',
                        color: '#0f172a',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: (!consumibleSeleccionadoId || maxAgregable <= 0) ? 'not-allowed' : 'pointer',
                        opacity: (!consumibleSeleccionadoId || maxAgregable <= 0) ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      + Agregar a la lista
                    </button>
                  </div>

                  {consumibleSeleccionado && (
                    <small style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)', margin: 0 }}>
                      Stock total en bodega: <strong style={{ color: 'var(--text, #f8fafc)' }}>{maxAvailableConsumible} {consumibleSeleccionado.unit || 'und'}</strong>
                      {cantidadYaEnCanasta > 0 && ` (Ya en canasta: ${cantidadYaEnCanasta})`}
                      {' • '}Disponible para agregar: <strong style={{ color: maxAgregable > 0 ? '#ABDE16' : '#ef4444' }}>{maxAgregable}</strong>
                    </small>
                  )}

                  {/* Tabla / Lista de Ítems Agregados */}
                  <div
                    style={{
                      border: '1px solid var(--line, #334155)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--surface, #0b1320)',
                    }}
                  >
                    {itemsEntrega.length === 0 ? (
                      <div
                        style={{
                          padding: '24px 16px',
                          textAlign: 'center',
                          color: 'var(--text-dim, #94a3b8)',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>📋</span>
                        No has agregado ningún insumo a esta entrega todavía. Selecciona arriba y pulsa <strong>"+ Agregar a la lista"</strong>.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr
                            style={{
                              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                              borderBottom: '1px solid var(--line, #334155)',
                              color: 'var(--text-dim, #94a3b8)',
                              textAlign: 'left',
                            }}
                          >
                            <th style={{ padding: '8px 12px', fontWeight: 600 }}>Material</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Cantidad a entregar</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>Stock restante</th>
                            <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsEntrega.map((item) => {
                            const stockRestante = item.disponible - item.cantidadEntrega;
                            return (
                              <tr
                                key={item.id}
                                style={{
                                  borderBottom: '1px solid var(--line, rgba(51, 65, 85, 0.5))',
                                }}
                              >
                                <td style={{ padding: '8px 12px' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text, #f8fafc)' }}>{item.material}</div>
                                  <div style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: 'var(--text-dim, #94a3b8)' }}>{item.id}</div>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      fontFamily: 'var(--mono)',
                                      fontWeight: 700,
                                      fontSize: '12.5px',
                                      color: '#ABDE16',
                                      backgroundColor: 'rgba(171, 222, 22, 0.1)',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(171, 222, 22, 0.25)',
                                    }}
                                  >
                                    {item.cantidadEntrega} {item.unit}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: stockRestante <= 5 ? '#eab308' : 'var(--text-dim, #94a3b8)' }}>
                                  <span style={{ fontFamily: 'var(--mono)' }}>{stockRestante}</span> {item.unit}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarItemEntrega(item.id)}
                                    title="Eliminar de la lista"
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      color: '#ef4444',
                                      borderRadius: '6px',
                                      padding: '4px 8px',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={deliverySubmitting}
                  onClick={() => setShowDeliveryModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede}
                  style={{
                    backgroundColor: (deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede) ? undefined : '#ABDE16',
                    color: (deliverySubmitting || itemsEntrega.length === 0 || !deliveryPerson || !deliverySede) ? undefined : '#0f172a',
                    fontWeight: 700,
                  }}
                >
                  {deliverySubmitting ? 'Registrando Entrega...' : `Confirmar Entrega y Descontar Stock (${itemsEntrega.length} ${itemsEntrega.length === 1 ? 'material' : 'materiales'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETALLE DEL PRÉSTAMO
          ========================================================================= */}
      {detailLoan && (
        <div className="modal-backdrop" onClick={() => setDetailLoan(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Detalle del Préstamo Activo</h3>
              <button type="button" className="close-btn" onClick={() => setDetailLoan(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem' }}>💻</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>{detailLoan.itemName}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ID Registro: #{detailLoan.id}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Custodio</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detailLoan.person}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Sede / Destino</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detailLoan.sede || 'Medellín'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fecha Salida</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{fmtDate(detailLoan.date)}</p>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Devolución Esperada</label>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: isOverdue(detailLoan) ? 'var(--red)' : 'var(--emerald, #10b981)' }}>
                    {isOverdue(detailLoan) ? '⚠️ ' : ''}{fmtDate(detailLoan.expectedReturn)}
                  </p>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Placas / Unidades Prestadas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {detailLoan.unitCodes && detailLoan.unitCodes.length > 0 ? (
                    detailLoan.unitCodes.map((code) => (
                      <span key={code} className="mono-num" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="mono-num">{detailLoan.qty || 1} und</span>
                  )}
                </div>
              </div>

              {detailLoan.motive && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Motivo / Observaciones</label>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', background: 'var(--surface-1)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    {detailLoan.motive}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setDetailLoan(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDITAR PRÉSTAMO
          ========================================================================= */}
      {editingLoan && (
        <div className="modal-backdrop" onClick={() => setEditingLoan(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Editar Préstamo</h3>
              <button type="button" className="close-btn" onClick={() => setEditingLoan(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditLoan}>
              <div className="modal-body form-grid">
                <div className="form-group full">
                  <label>Equipo</label>
                  <input type="text" disabled value={editingLoan.itemName} style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Custodio / Responsable *</label>
                  <input
                    required
                    list="formadores-list-edit"
                    value={editPerson}
                    onChange={(e) => setEditPerson(e.target.value)}
                  />
                  <datalist id="formadores-list-edit">
                    {EMPLOYEES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Sede / Municipio *</label>
                  <select value={editSede} onChange={(e) => setEditSede(e.target.value)}>
                    {SEDES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full">
                  <label>Fecha de Devolución Pactada *</label>
                  <input
                    required
                    type="date"
                    value={editExpectedDate}
                    onChange={(e) => setEditExpectedDate(e.target.value)}
                  />
                </div>
                <div className="form-group full">
                  <label>Motivo u Observaciones</label>
                  <input
                    value={editMotive}
                    onChange={(e) => setEditMotive(e.target.value)}
                    placeholder="Observaciones del préstamo..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn ghost" onClick={() => setEditingLoan(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CÓDIGO QR / ACTA DEL PRÉSTAMO
          ========================================================================= */}
      {qrLoanItem && (
        <ModalQR
          activo={qrLoanItem}
          onClose={() => {
            setQrLoanItem(null);
            setActivoDetalleSeleccionado(null);
          }}
          onBack={() => {
            const temp = qrLoanItem;
            setQrLoanItem(null);
            setActivoDetalleSeleccionado(temp);
            setMostrarModalDetalle(true);
          }}
        />
      )}

      {/* =========================================================================
          MODAL: HOJA DE GUÍA / ACTA DE REMISIÓN DE CONSUMIBLES (IMPRIMIBLE)
          ========================================================================= */}
      {remisionParaImprimir && (
        <div className="modal-backdrop" onClick={() => setRemisionParaImprimir(null)}>
          <div
            className="modal-dialog print-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '100%', padding: '0', overflow: 'hidden' }}
          >
            {/* Header del Modal en Pantalla (oculto al imprimir) */}
            <div
              className="modal-header no-print"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid var(--line, #334155)',
                backgroundColor: 'var(--surface-2, #0f172a)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🖨️</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                  Guía de Salida / Remisión: {remisionParaImprimir.codigo_acta || remisionParaImprimir.remision_id}
                </h3>
              </div>
              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn small btn-primary no-print"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#ABDE16',
                    color: '#0f172a',
                    fontWeight: 700,
                    padding: '6px 14px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🖨️</span> Imprimir Documento
                </button>
                <button
                  type="button"
                  className="close-btn no-print"
                  onClick={() => setRemisionParaImprimir(null)}
                  style={{ fontSize: '16px', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL IMPRIMIBLE: GUÍA DE REMISIÓN / ACTA DE ENTREGA */}
            <div
              className="acta-remision-sheet"
              style={{
                padding: '30px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* Encabezado Institucional */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    FUNDACIÓN MARINA ORTH
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                    Sistema de Gestión de Inventario y Bodega Central de Robótica
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                    Acta de Salida y Remisión Oficial de Materiales e Insumos
                  </p>
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 14px',
                  }}
                >
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', display: 'block' }}>
                    N° DE REMISIÓN / ACTA
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {remisionParaImprimir.codigo_acta || remisionParaImprimir.remision_id}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    Fecha: {formatFecha(remisionParaImprimir.fecha_entrega || remisionParaImprimir.date || today())}
                  </span>
                </div>
              </div>

              {/* Ficha de Información de la Entrega */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  marginBottom: '22px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    PERSONA QUE RECIBE (CUSTODIO / FORMADOR)
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{remisionParaImprimir.responsable_recibe}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    SEDE / MUNICIPIO DE DESTINO
                  </span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{remisionParaImprimir.sede}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    PROYECTO STEAM / PROGRAMA
                  </span>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{remisionParaImprimir.proyecto || 'General / Formación'}</span>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    MOTIVO / PROPÓSITO DE LA SALIDA
                  </span>
                  <span style={{ color: '#334155' }}>{remisionParaImprimir.motivo || 'Salida de bodega para talleres'}</span>
                </div>
              </div>

              {/* Tabla Detallada de Insumos Entregados */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '12.5px', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>
                  Detalle de Materiales Entregados (Total: {remisionParaImprimir.total_items || remisionParaImprimir.items.length} ítems • {remisionParaImprimir.total_unidades} unidades)
                </h4>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px 10px', width: '110px' }}>Código</th>
                      <th style={{ padding: '8px 10px' }}>Descripción del Material / Insumo</th>
                      <th style={{ padding: '8px 10px', width: '100px', textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Condición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remisionParaImprimir.items.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                          {item.material_id || item.id || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <strong style={{ color: '#0f172a' }}>{item.nombre || item.material}</strong>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                          {item.cantidad || item.cantidadEntrega} und
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>
                          Consumido
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                      <td colSpan="3" style={{ padding: '8px 10px', textAlign: 'right' }}>
                        TOTAL UNIDADES ENTREGADAS:
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px' }}>
                        {remisionParaImprimir.total_unidades} und
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cláusula de Entrega */}
              <p style={{ fontSize: '10.5px', color: '#64748b', lineHeight: 1.4, margin: '0 0 28px', textAlign: 'justify' }}>
                * Mediante la presente remisión, se deja constancia de la salida física y definitiva de los materiales e insumos
                relacionados arriba, descontándose del inventario general de la Fundación Marina Orth para su destinación a los proyectos
                institucionales y actividades pedagógicas correspondientes.
              </p>

              {/* Casillas de Firmas Oficiales */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  paddingTop: '20px',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '50px', marginBottom: '8px' }}></div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>
                    {remisionParaImprimir.responsable_recibe}
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Firma de Quien Recibe (Custodio / Formador)</span>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>C.C. _______________________</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #0f172a', height: '50px', marginBottom: '8px' }}></div>
                  <strong style={{ display: 'block', fontSize: '12px', color: '#0f172a' }}>
                    Bodega Central / Coordinación de Inventario
                  </strong>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Firma de Quien Entrega (Almacén FMO)</span>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Fundación Marina Orth</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONSULTA / DETALLE DEL EQUIPO (DESDE CLIC EN PLACA)
          ========================================================================= */}
      {mostrarModalDetalle && activoDetalleSeleccionado && (
        <ModalDetalleActivo
          item={activoDetalleSeleccionado}
          onClose={() => {
            setMostrarModalDetalle(false);
            setActivoDetalleSeleccionado(null);
          }}
          onEdit={(it) => {
            setMostrarModalDetalle(false);
            handleAbrirEditarEquipo(it);
          }}
          onOpenQR={(it) => {
            // Cerrar modal de detalle y abrir QR transfiriendo el activo
            const itemActual = it || activoDetalleSeleccionado;
            setMostrarModalDetalle(false);
            setQrLoanItem({
              ...itemActual,
              code: itemActual.placa || itemActual.codigo || itemActual.id,
              placa: itemActual.placa || itemActual.codigo || itemActual.id,
              nombre: itemActual.nombre || itemActual.equipo || itemActual.name,
              name: itemActual.nombre || itemActual.equipo || itemActual.name,
              model: itemActual.modelo || itemActual.model,
              serial: itemActual.serial,
              sede: itemActual.sede || 'Medellín',
              estado: itemActual.estado || itemActual.status,
            });
          }}
        />
      )}

      {/* =========================================================================
          MODAL: EDITAR EQUIPO TECNOLÓGICO (DESDE DETALLE DE PRÉSTAMO)
          ========================================================================= */}
      {modalEditarEquipoOpen && equipoParaEditar && (
        <ModalEditarActivo
          isOpen={modalEditarEquipoOpen}
          onClose={() => {
            setModalEditarEquipoOpen(false);
            setEquipoParaEditar(null);
          }}
          activo={equipoParaEditar}
          equipo={equipoParaEditar}
          formData={formDataEditarEquipo}
          setFormData={setFormDataEditarEquipo}
          pasoActual={pasoActualEditarEquipo}
          setPasoActual={setPasoActualEditarEquipo}
          onSubmit={handleSubmitEditarEquipo}
          submitting={editEquipoSubmitting}
        />
      )}
    </div>
  );
}
