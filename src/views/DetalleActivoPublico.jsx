import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import inventoryApi from '../services/inventoryApi';
import { fmtDate } from '../services/mockData';

export default function DetalleActivoPublico() {
  const { placa } = useParams();

  // Estados para carga directa desde la API de PostgreSQL / Supabase
  const [apiActivo, setApiActivo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!placa) {
      setLoading(false);
      return;
    }

    setLoading(true);
    inventoryApi.getActivoByPlaca(placa)
      .then((data) => {
        if (isMounted) {
          setApiActivo(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'No se encontró el activo en la base de datos');
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
            <h3>Cargando información del activo...</h3>
            <p>Consultando base de datos PostgreSQL en tiempo real para placa <strong>"{placa}"</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. Si encontramos el activo directamente en la base de datos PostgreSQL
  if (apiActivo) {
    const estadoNorm = (apiActivo.estado || 'Disponible').toLowerCase();
    const isCampo = estadoNorm === 'en campo' || estadoNorm === 'prestado';
    const isDevuelto = estadoNorm === 'disponible';

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
            <div className="placa-highlight mono-num">{apiActivo.placa}</div>
            <h2 className="hero-title">{apiActivo.nombre}</h2>
            <div className="hero-category">
              <span className="category-tag">{apiActivo.marca || 'Tecnología'}</span>
              <span className="sede-badge municipal">{apiActivo.sede || 'Medellín'}</span>
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
              <span className="info-val">{apiActivo.marca || '—'} {apiActivo.modelo || ''}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Serial de Fábrica</span>
              <span className="info-val mono-num">{apiActivo.serial || '—'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Sede / Municipio</span>
              <span className="info-val">{apiActivo.sede || 'Medellín'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Base de Datos</span>
              <span className="info-val">PostgreSQL Persistente</span>
            </div>

            {/* Información de Custodio y Préstamo si está en campo */}
            {isCampo && (
              <div className="info-item full loan-box-details">
                <span className="info-label" style={{ color: 'var(--amber)' }}>
                  Detalles del Préstamo Activo
                </span>
                <div className="loan-subdetails">
                  <div>
                    <strong>Custodio Responsable:</strong> {apiActivo.custodio || 'Personal asignado'}
                  </div>
                  {apiActivo.fecha_devolucion && (
                    <div>
                      <strong>Devolución Esperada:</strong>{' '}
                      <span className="mono-num" style={{ fontWeight: 700 }}>
                        {fmtDate(apiActivo.fecha_devolucion)}
                      </span>
                    </div>
                  )}
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

  // 2. Si no se encontró en la base de datos o hubo error
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
          <h3>{error ? 'Error de consulta' : 'Activo no encontrado'}</h3>
          <p>
            {error || `No se encontró ningún equipo registrado en Supabase con la placa "${placa}".`}
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Volver al Panel General
          </Link>
        </div>
      </div>
    </div>
  );
}
