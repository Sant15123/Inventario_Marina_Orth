import { useParams, Link } from 'react-router-dom';
import { INITIAL_DATA, fmtDate, isOverdue } from '../services/mockData';

export default function DetalleActivoPublico({ items = INITIAL_DATA.items, movements = INITIAL_DATA.movements }) {
  const { placa } = useParams();

  // 1. Normalizar placa para búsqueda insensible a mayúsculas
  const searchPlaca = (placa || '').trim().toLowerCase();

  // 2. Buscar en equipos tecnológicos (unidades individuales por placa o código)
  let foundEquipo = null;
  let foundUnit = null;

  for (const item of items) {
    if (item.units && item.units.length > 0) {
      const u = item.units.find(
        (unit) =>
          (unit.placa && unit.placa.toLowerCase() === searchPlaca) ||
          (unit.code && unit.code.toLowerCase() === searchPlaca)
      );
      if (u) {
        foundEquipo = item;
        foundUnit = u;
        break;
      }
    }
  }

  // Si no se encontró como unidad, buscar por código general o id
  if (!foundUnit) {
    const direct = items.find(
      (it) =>
        (it.codigoItem && it.codigoItem.toLowerCase() === searchPlaca) ||
        (it.id && it.id.toLowerCase() === searchPlaca)
    );
    if (direct) {
      foundEquipo = direct;
    }
  }

  // 3. Caso no encontrado
  if (!foundEquipo) {
    return (
      <div className="public-asset-container">
        <div className="public-asset-card not-found">
          <div className="public-brand">
            <div className="brand-logo-circle">MO</div>
            <div>
              <h2>Fundación Marina Orth</h2>
              <span>Sistema de Control de Inventario</span>
            </div>
          </div>
          <div className="not-found-content">
            <span className="error-icon">⚠️</span>
            <h3>Activo no encontrado</h3>
            <p>
              No se encontró ningún equipo o material registrado con la placa o identificador{' '}
              <strong>"{placa}"</strong>.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Volver al Panel General
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Datos del activo encontrado
  const isUnitEquipo = Boolean(foundUnit);
  const placaMostrar = foundUnit?.placa || foundUnit?.code || foundEquipo.codigoItem || placa;
  const nombreMostrar = foundEquipo.name;
  const modeloMarca = foundUnit?.model || foundEquipo.category || 'Equipo Institucional';
  const serialMostrar = foundUnit?.serial || '—';
  const sedeMostrar = foundUnit?.sede || foundEquipo.sede || 'Medellín';
  const estadoActual = foundUnit ? foundUnit.status : 'disponible';

  // Buscar préstamo activo si está en campo
  const activeLoan = movements.find(
    (m) =>
      m.type === 'prestamo' &&
      m.status === 'activo' &&
      m.unitCodes &&
      (m.unitCodes.includes(foundUnit?.code) || m.unitCodes.includes(foundUnit?.placa))
  );

  const overdue = activeLoan ? isOverdue(activeLoan) : false;

  // Clases y etiquetas del badge de estado
  let badgeClass = 'ok';
  let badgeLabel = '✅ Disponible en Bodega';

  if (estadoActual === 'prestado') {
    if (overdue) {
      badgeClass = 'vencido';
      badgeLabel = '⚠️ En Campo (Préstamo Vencido)';
    } else {
      badgeClass = 'prestado';
      badgeLabel = '🔄 En Campo (Préstamo Activo)';
    }
  } else if (estadoActual === 'mantenimiento') {
    badgeClass = 'alerta';
    badgeLabel = '🔧 En Mantenimiento';
  } else if (estadoActual === 'baja') {
    badgeClass = 'low';
    badgeLabel = '❌ De Baja';
  }

  const custodioAsignado =
    estadoActual === 'prestado'
      ? (activeLoan?.person || foundUnit?.responsable || 'Custodio Temporal')
      : 'Bodega Central';

  return (
    <div className="public-asset-container">
      <div className="public-asset-card">
        {/* Cabecera institucional */}
        <header className="public-header">
          <div className="public-brand">
            <div className="brand-logo-circle">MO</div>
            <div>
              <h1>Fundación Marina Orth</h1>
              <span>Ficha Técnica y Trazabilidad del Activo</span>
            </div>
          </div>
          <Link to="/" className="back-link" title="Volver al panel administrativo">
            ← Panel
          </Link>
        </header>

        {/* Identificador Principal y Placa */}
        <div className="public-hero">
          <div className="placa-highlight mono-num">{placaMostrar}</div>
          <h2 className="hero-title">{nombreMostrar}</h2>
          <div className="hero-category">
            <span className="category-tag">{foundEquipo.category || 'Tecnología'}</span>
            <span className="sede-badge municipal">{sedeMostrar}</span>
          </div>
        </div>

        {/* Estado Operativo con Badge Destacado */}
        <div className="status-banner-box">
          <div className="status-label-group">
            <span className="label-dim">Estado Operativo:</span>
            <span className={`pill ${badgeClass}`} style={{ fontSize: '13px', padding: '5px 12px' }}>
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Ficha Técnica / Datos Principales */}
        <div className="info-grid-details">
          <div className="info-item">
            <span className="info-label">Marca / Modelo</span>
            <span className="info-val">{modeloMarca}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Serial de Fábrica</span>
            <span className="info-val mono-num">{serialMostrar}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Sede / Municipio</span>
            <span className="info-val">{sedeMostrar}</span>
          </div>

          <div className="info-item">
            <span className="info-label">Ubicación Física</span>
            <span className="info-val">{foundEquipo.location || 'Laboratorio STEAM / Bodega'}</span>
          </div>

          {/* Información de Custodio y Préstamo si está en campo */}
          {estadoActual === 'prestado' && (
            <div className="info-item full loan-box-details">
              <span className="info-label" style={{ color: 'var(--amber)' }}>
                Detalles del Préstamo Activo
              </span>
              <div className="loan-subdetails">
                <div>
                  <strong>Custodio Responsable:</strong> {custodioAsignado}
                </div>
                {activeLoan && (
                  <>
                    <div>
                      <strong>Proyecto / Motivo:</strong> {activeLoan.motive || 'Actividades de Formación'}
                    </div>
                    <div>
                      <strong>Fecha de Préstamo:</strong> {fmtDate(activeLoan.date)}
                    </div>
                    <div>
                      <strong>Devolución Esperada:</strong>{' '}
                      <span className="mono-num" style={{ color: overdue ? 'var(--red)' : 'inherit', fontWeight: 700 }}>
                        {fmtDate(activeLoan.expectedReturn)} {overdue ? '(Vencido)' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {foundEquipo.notes && (
            <div className="info-item full">
              <span className="info-label">Observaciones</span>
              <p className="info-notes">{foundEquipo.notes}</p>
            </div>
          )}
        </div>

        {/* Acciones para móvil */}
        <div className="public-actions">
          <button
            type="button"
            className="btn btn-secondary full-btn"
            onClick={() => window.print()}
          >
            🖨️ Imprimir Ficha
          </button>
          <Link to="/" className="btn btn-primary full-btn" style={{ textAlign: 'center' }}>
            Ir al Sistema Administrativo
          </Link>
        </div>

        <footer className="public-footer">
          Fundación Marina Orth · Robótica, Nuevas Tecnologías & STEAM · Medellín - Antioquia
        </footer>
      </div>
    </div>
  );
}
