import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import inventoryApi from '../services/inventoryApi';
import { fmtDate } from '../services/mockData';

// Función auxiliar de formateo seguro para evitar "Invalid Date"
const formatearFecha = (fechaRaw) => {
  if (!fechaRaw || fechaRaw === 'null' || fechaRaw === 'undefined' || fechaRaw === 'No data') {
    return 'No especificada';
  }

  // Si viene en formato DD/MM/YYYY (ej: "15/10/2026"), convertirlo a ISO YYYY-MM-DD
  if (typeof fechaRaw === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fechaRaw.trim())) {
    const [dia, mes, anio] = fechaRaw.trim().split('/');
    fechaRaw = `${anio}-${mes}-${dia}`;
  }

  // Si viene con timestamp ISO (ej: 2026-10-15T00:00:00Z), tomar la parte de la fecha
  const d = new Date(fechaRaw);
  if (isNaN(d.getTime())) {
    // Si sigue siendo inválida, mostrar el texto crudo o fallback seguro
    return typeof fechaRaw === 'string' ? fechaRaw : 'Pendiente';
  }

  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC', // Evita que se desfase 1 día por la zona horaria local
  });
};

export default function DetalleActivoPublico() {
  const { placa } = useParams();

  // Estados para carga directa desde la API de PostgreSQL / Supabase
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!placa) {
      setLoading(false);
      return;
    }

    setLoading(true);
    inventoryApi.getItemUniversal(placa)
      .then((data) => {
        if (isMounted) {
          setItemData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || `No se encontró ningún registro para el código "${placa}".`);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [placa]);

  // Si está cargando desde la API
  if (loading) {
    return (
      <div className="public-asset-container">
        <div className="public-asset-card not-found">
          <div className="public-brand">
            <img src="/logo-marina-orth.png" alt="Logo Fundación Marina Orth" className="brand-logo-img" />
            <div>
              <h2>Fundación Marina Orth</h2>
              <span>Sistema de Control de Inventario</span>
            </div>
          </div>
          <div className="not-found-content">
            <span className="error-icon">⏳</span>
            <h3>Cargando información del inventario...</h3>
            <p>Consultando base de datos en tiempo real para el código <strong>"{placa}"</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si encontramos el registro en la base de datos (sea equipo o consumible)
  if (itemData) {
    const isConsumible = itemData.__tipo === 'consumible' || Boolean(itemData.material && !itemData.serial);

    if (isConsumible) {
      // -------------------------------------------------------------
      // VISTA ADAPTADA: MATERIAL / CONSUMIBLE DE ROBÓTICA
      // -------------------------------------------------------------
      const disponible = Number(itemData.disponible ?? itemData.quantity ?? 0);
      const minimo = Number(itemData.minimo ?? itemData.minStock ?? 5);
      const esAlertaStock = disponible <= minimo;

      const estadoTexto = itemData.estado || 'Bueno';
      const condicionTexto = itemData.condicion || 'Nuevo';

      let stockBadgeClass = 'ok';
      let stockBadgeLabel = `✅ Stock Disponible: ${disponible} unidades`;

      if (disponible === 0) {
        stockBadgeClass = 'low';
        stockBadgeLabel = '❌ Agotado en Bodega (0 unidades)';
      } else if (esAlertaStock) {
        stockBadgeClass = 'alerta';
        stockBadgeLabel = `⚠️ Alerta de Stock Mínimo (${disponible} de ${minimo} mín.)`;
      }

      return (
        <div className="public-asset-container">
          <div className="public-asset-card">
            {/* Cabecera institucional */}
            <header className="public-header">
              <div className="public-brand">
                <img
                  src="/logo-marina-orth.png"
                  alt="Logo Fundación Marina Orth"
                  className="brand-logo-img"
                />
                <div>
                  <h1>Fundación Marina Orth</h1>
                  <span>Ficha Técnica de Material / Robótica</span>
                </div>
              </div>
              <Link to="/" className="back-link" title="Volver al panel administrativo">
                ← Panel
              </Link>
            </header>

            {/* Identificador Principal y Código Rob */}
            <div className="public-hero">
              <div className="placa-highlight mono-num" style={{ background: '#ecfccb', color: '#365314', borderColor: '#84cc16' }}>
                {itemData.id}
              </div>
              <h2 className="hero-title">{itemData.material || itemData.nombre || 'Material de Robótica'}</h2>
              <div className="hero-category">
                <span className="category-tag" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
                  🤖 {itemData.categoria || 'Robótica'}
                </span>
                <span className="sede-badge municipal">
                  {itemData.ubicacion || 'Oficina FMO'}
                </span>
              </div>
            </div>

            {/* Estado de Disponibilidad de Stock */}
            <div className="status-banner-box">
              <div className="status-label-group">
                <span className="label-dim">Disponibilidad en Bodega:</span>
                <span className={`pill ${stockBadgeClass}`} style={{ fontSize: '13px', padding: '5px 12px' }}>
                  {stockBadgeLabel}
                </span>
              </div>
            </div>

            {/* Ficha Técnica / Datos Principales */}
            <div className="info-grid-details">
              <div className="info-item">
                <span className="info-label">Stock Actual en Bodega</span>
                <span className="info-val mono-num" style={{ fontWeight: 700, fontSize: '15px' }}>
                  {disponible} unidades
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Punto de Reorden (Stock Mínimo)</span>
                <span className="info-val mono-num">{minimo} unidades</span>
              </div>

              <div className="info-item">
                <span className="info-label">Condición del Material</span>
                <span className="info-val">{condicionTexto}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Estado Operativo</span>
                <span className="info-val">{estadoTexto}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Ubicación Física</span>
                <span className="info-val">{itemData.ubicacion || 'Oficina FMO'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Área Asignada</span>
                <span className="info-val">{itemData.area || 'Robótica'}</span>
              </div>

              {(itemData.descripcion || itemData.caracteristicas || itemData.observaciones) && (
                <div className="info-item full">
                  <span className="info-label">Descripción y Características</span>
                  <p className="info-val" style={{ margin: '4px 0 0', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                    {[itemData.descripcion, itemData.caracteristicas, itemData.observaciones].filter(Boolean).join('\n')}
                  </p>
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

    // -------------------------------------------------------------
    // VISTA PARA EQUIPOS TECNOLÓGICOS (Laptop, Tablet, Proyector)
    // -------------------------------------------------------------
    const estadoNorm = (itemData.estado || 'Disponible').toLowerCase();
    const isCampo = estadoNorm === 'en campo' || estadoNorm === 'prestado';

    let badgeClass = 'ok';
    let badgeLabel = '✅ Disponible en Bodega';

    if (isCampo) {
      badgeClass = 'prestado';
      badgeLabel = '🔄 En Campo (Préstamo Activo)';
    } else if (estadoNorm === 'mantenimiento') {
      badgeClass = 'alerta';
      badgeLabel = '🔧 En Mantenimiento';
    } else if (estadoNorm === 'baja') {
      badgeClass = 'low';
      badgeLabel = '❌ De Baja';
    }

    return (
      <div className="public-asset-container">
        <div className="public-asset-card">
          {/* Cabecera institucional */}
          <header className="public-header">
            <div className="public-brand">
              <img
                src="/logo-marina-orth.png"
                alt="Logo Fundación Marina Orth"
                className="brand-logo-img"
              />
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
            <div className="placa-highlight mono-num">{itemData.placa || itemData.id}</div>
            <h2 className="hero-title">{itemData.nombre || 'Equipo Tecnológico'}</h2>
            <div className="hero-category">
              <span className="category-tag">{itemData.marca || itemData.categoria || 'Tecnología'}</span>
              <span className="sede-badge municipal">{itemData.sede || 'Medellín'}</span>
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
              <span className="info-val">{itemData.marca || '—'} {itemData.modelo || ''}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Serial de Fábrica</span>
              <span className="info-val mono-num">{itemData.serial || '—'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Sede / Municipio</span>
              <span className="info-val">{itemData.sede || 'Medellín'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Ubicación Física</span>
              <span className="info-val">{itemData.ubicacion || 'Bodega Central'}</span>
            </div>

            {/* Información de Custodio y Préstamo si está en campo */}
            {isCampo && (
              <div className="info-item full loan-box-details">
                <span className="info-label" style={{ color: 'var(--amber)' }}>
                  Detalles del Préstamo Activo
                </span>
                <div className="loan-subdetails">
                  <div>
                    <strong>Custodio Responsable:</strong> {itemData.custodio || itemData.responsable || 'Personal asignado'}
                  </div>
                  <div>
                    <strong>Devolución Esperada:</strong>{' '}
                    <span className="mono-num" style={{ fontWeight: 700 }}>
                      {formatearFecha(itemData.fecha_devolucion)}
                    </span>
                  </div>
                </div>
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

  // Si no se encontró en la base de datos o hubo error
  return (
    <div className="public-asset-container">
      <div className="public-asset-card not-found">
        <div className="public-brand">
          <img
            src="/logo-marina-orth.png"
            alt="Logo Fundación Marina Orth"
            className="brand-logo-img"
          />
          <div>
            <h2>Fundación Marina Orth</h2>
            <span>Sistema de Control de Inventario</span>
          </div>
        </div>
        <div className="not-found-content">
          <span className="error-icon">⚠️</span>
          <h3>{error ? 'Error de consulta' : 'Ítem no encontrado'}</h3>
          <p>
            {error || `No se encontró ningún equipo o material registrado con el código "${placa}".`}
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Volver al Panel General
          </Link>
        </div>
      </div>
    </div>
  );
}
