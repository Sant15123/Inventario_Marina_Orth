import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fmtDate, isOverdue } from '../services/mockData';

export default function ActivoPublicoView({ items = [], movements = [] }) {
  const { placa } = useParams();

  // Buscar el equipo y la unidad correspondiente por placa o código
  let foundItem = null;
  let foundUnit = null;

  for (const item of items) {
    if (item.units && item.units.length > 0) {
      const u = item.units.find(
        (unit) =>
          (unit.placa && unit.placa.toLowerCase() === (placa || '').toLowerCase()) ||
          (unit.code && unit.code.toLowerCase() === (placa || '').toLowerCase())
      );
      if (u) {
        foundItem = item;
        foundUnit = u;
        break;
      }
    }
  }

  // Si no se encuentra como equipo con unidades, buscar si coincide con el código de un consumible
  if (!foundUnit) {
    const directItem = items.find(
      (it) =>
        (it.codigoItem && it.codigoItem.toLowerCase() === (placa || '').toLowerCase()) ||
        it.id.toLowerCase() === (placa || '').toLowerCase()
    );
    if (directItem) {
      foundItem = directItem;
    }
  }

  // Préstamos históricos o activos asociados a este código/placa
  const activeLoan = movements.find(
    (m) =>
      m.type === 'prestamo' &&
      m.status === 'activo' &&
      m.unitCodes &&
      (m.unitCodes.includes(foundUnit?.code) || m.unitCodes.includes(foundUnit?.placa))
  );

  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://inventario.fundacionmarinaorth.org/activo/${placa}`;

  if (!foundItem) {
    return (
      <div className="public-asset-container">
        <div className="public-asset-card not-found">
          <div className="public-brand">
            <div className="brand-logo-circle">MO</div>
            <div>
              <h2>Fundación Marina Orth</h2>
              <span>Sistema de Control de Activos</span>
            </div>
          </div>
          <div className="not-found-content">
            <span className="error-icon">⚠️</span>
            <h3>Activo no encontrado</h3>
            <p>
              No se encontró ningún equipo o material registrado con la placa o identificador <strong>{placa}</strong>.
            </p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Volver al Panel General
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEquipo = foundItem.itemType === 'equipo';
  const status = foundUnit ? foundUnit.status : 'disponible';
  const overdue = activeLoan ? isOverdue(activeLoan) : false;

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
          <Link to="/" className="back-link" title="Ir al panel administrativo">
            ← Panel
          </Link>
        </header>

        {/* Identificador Principal */}
        <div className="public-hero">
          <div className="placa-highlight mono-num">
            {foundUnit?.placa || foundUnit?.code || foundItem.codigoItem || placa}
          </div>
          <h2 className="hero-title">{foundItem.name}</h2>
          <div className="hero-category">
            <span className="category-tag">{foundItem.category || 'Tecnología'}</span>
            <span className="sede-badge municipal">
              {foundUnit?.sede || foundItem.sede || 'Medellín'}
            </span>
          </div>
        </div>

        {/* Código QR Verificable con qrcode.react */}
        <div className="public-qr-section">
          <div className="qr-wrapper">
            <QRCodeSVG
              value={currentUrl}
              size={140}
              level="M"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
          <span className="qr-caption mono-num">ID: {foundUnit?.code || placa}</span>
        </div>

        {/* Estado Operativo Actual */}
        <div className="status-banner-box">
          <div className="status-label-group">
            <span className="label-dim">Estado Actual:</span>
            {status === 'prestado' ? (
              <span className={`pill ${overdue ? 'vencido' : 'prestado'}`}>
                {overdue ? '⚠️ En Campo (Préstamo Vencido)' : '🔄 En Campo (Préstamo Activo)'}
              </span>
            ) : status === 'mantenimiento' ? (
              <span className="pill alerta">🔧 En Mantenimiento</span>
            ) : status === 'baja' ? (
              <span className="pill low">❌ De Baja</span>
            ) : (
              <span className="pill ok">✅ Disponible en Bodega</span>
            )}
          </div>
        </div>

        {/* Datos Técnicos y Custodia */}
        <div className="info-grid-details">
          {isEquipo && foundUnit && (
            <>
              <div className="info-item">
                <span className="info-label">Modelo</span>
                <span className="info-val">{foundUnit.model || 'No especificado'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Serial del Fabricante</span>
                <span className="info-val mono-num">{foundUnit.serial || '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Custodio Asignado</span>
                <span className="info-val">
                  {status === 'prestado'
                    ? (activeLoan?.person || foundUnit.responsable || 'Custodio Temporal')
                    : 'Bodega Central'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Sede Operativa</span>
                <span className="info-val">{foundUnit.sede || foundItem.sede || 'Medellín'}</span>
              </div>
            </>
          )}

          {!isEquipo && (
            <>
              <div className="info-item">
                <span className="info-label">Existencias Disponibles</span>
                <span className="info-val mono-num">{foundItem.quantity} {foundItem.unit || 'und'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Stock Mínimo</span>
                <span className="info-val mono-num">{foundItem.minStock} {foundItem.unit || 'und'}</span>
              </div>
            </>
          )}

          <div className="info-item full">
            <span className="info-label">Ubicación Física</span>
            <span className="info-val">{foundItem.location || 'Laboratorio STEAM / Bodega'}</span>
          </div>

          {activeLoan && (
            <div className="info-item full loan-box-details">
              <span className="info-label">Préstamo Activo en Curso</span>
              <div className="loan-subdetails">
                <div><strong>Proyecto:</strong> {activeLoan.motive || 'Actividades de Formación'}</div>
                <div><strong>Fecha de Salida:</strong> {fmtDate(activeLoan.date)}</div>
                <div><strong>Retorno Pactado:</strong> {fmtDate(activeLoan.expectedReturn)}</div>
              </div>
            </div>
          )}

          {foundItem.notes && (
            <div className="info-item full">
              <span className="info-label">Observaciones</span>
              <p className="info-notes">{foundItem.notes}</p>
            </div>
          )}
        </div>

        {/* Botones de acción móvil */}
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
