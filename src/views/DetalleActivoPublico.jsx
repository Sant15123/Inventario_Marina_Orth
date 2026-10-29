import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import inventoryApi from '../services/inventoryApi';

// Función auxiliar de formateo seguro para evitar "Invalid Date"
const formatearFecha = (fechaRaw) => {
  if (!fechaRaw || fechaRaw === 'null' || fechaRaw === 'undefined' || fechaRaw === 'No data') {
    return 'No especificada';
  }

  if (typeof fechaRaw === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fechaRaw.trim())) {
    const [dia, mes, anio] = fechaRaw.trim().split('/');
    fechaRaw = `${anio}-${mes}-${dia}`;
  }

  const d = new Date(fechaRaw);
  if (isNaN(d.getTime())) {
    return typeof fechaRaw === 'string' ? fechaRaw : 'Pendiente';
  }

  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

export default function DetalleActivoPublico() {
  const params = useParams();
  const idODPlaca = params.id || params.placa;

  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!idODPlaca) {
      setLoading(false);
      return;
    }

    setLoading(true);
    inventoryApi.getItemUniversal(idODPlaca)
      .then((data) => {
        if (isMounted) {
          setItemData(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || `No se encontró ningún registro para el código "${idODPlaca}".`);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idODPlaca]);

  // Pantalla de carga
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
            <p>Consultando base de datos en tiempo real para el código <strong>"{idODPlaca}"</strong>.</p>
          </div>
        </div>
      </div>
    );
  }

  // Si encontramos el registro
  if (itemData) {
    const rawCode = String(itemData.placa || itemData.id || idODPlaca || '').trim();
    const codeLower = rawCode.toLowerCase();

    // Determinar categoría principal del objeto
    const isMobiliario = itemData.__tipo === 'mobiliario' || itemData.tipo === 'mobiliario' || codeLower.startsWith('mob');
    const isPapeleria = itemData.__tipo === 'papeleria' || itemData.tipo === 'papeleria' || codeLower.startsWith('pape') || itemData.categoria === 'Papelería';
    const isRobotica = itemData.__tipo === 'robotica' || itemData.tipo === 'robotica' || codeLower.startsWith('rob') || itemData.categoria === 'Robótica';
    const isTecnologia = !isMobiliario && !isPapeleria && !isRobotica;

    // Componente de encabezado común
    const HeaderPublico = ({ subtitulo }) => (
      <header className="public-header">
        <div className="public-brand">
          <img
            src="/logo-marina-orth.png"
            alt="Logo Fundación Marina Orth"
            className="brand-logo-img"
          />
          <div>
            <h1>Fundación Marina Orth</h1>
            <span>{subtitulo}</span>
          </div>
        </div>
        <Link to="/" className="back-link" title="Volver al panel administrativo">
          ← Panel
        </Link>
      </header>
    );

    // Componente de botones de acción común
    const AccionesPublicas = () => (
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
    );

    // =========================================================================
    // CASO 1: MOBILIARIO (MOB-XXXX)
    // =========================================================================
    if (isMobiliario) {
      const estadoConservacion = itemData.estado_conservacion || itemData.estado || itemData.condicion || 'Bueno';
      const estadoLower = estadoConservacion.toLowerCase();

      let badgeConservacionClass = 'ok';
      let badgeConservacionIcon = '✨';

      if (estadoLower.includes('excelente') || estadoLower.includes('nuevo')) {
        badgeConservacionClass = 'ok';
        badgeConservacionIcon = '⭐';
      } else if (estadoLower.includes('bueno')) {
        badgeConservacionClass = 'ok';
        badgeConservacionIcon = '✅';
      } else if (estadoLower.includes('regular')) {
        badgeConservacionClass = 'alerta';
        badgeConservacionIcon = '⚠️';
      } else if (estadoLower.includes('manten') || estadoLower.includes('repar')) {
        badgeConservacionClass = 'alerta';
        badgeConservacionIcon = '🔧';
      } else if (estadoLower.includes('malo') || estadoLower.includes('baja')) {
        badgeConservacionClass = 'low';
        badgeConservacionIcon = '❌';
      }

      return (
        <div className="public-asset-container">
          <div className="public-asset-card">
            <HeaderPublico subtitulo="Ficha Técnica de Mobiliario y Enseres" />

            {/* Identificador Principal */}
            <div className="public-hero">
              <div
                className="placa-highlight mono-num"
                style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#0284c7', borderColor: '#38bdf8' }}
              >
                {rawCode}
              </div>
              <h2 className="hero-title">{itemData.nombre || itemData.name || 'Mueble Modular'}</h2>
              <div className="hero-category">
                <span className="category-tag">
                  🪑 {itemData.categoria || itemData.subcategoria || 'Mobiliario'}
                </span>
                <span className="sede-badge municipal">
                  {itemData.sede || itemData.ubicacion || 'Medellín'}
                </span>
              </div>
            </div>

            {/* Badge de Estado de Conservación */}
            <div className="status-banner-box">
              <div className="status-label-group">
                <span className="label-dim">Estado de Conservación:</span>
                <span className={`pill ${badgeConservacionClass}`} style={{ fontSize: '13px', padding: '5px 12px' }}>
                  {badgeConservacionIcon} {estadoConservacion}
                </span>
              </div>
            </div>

            {/* Bloque Físico */}
            <div className="info-grid-details">
              <div className="info-item full">
                <span className="info-label" style={{ color: 'var(--copper)' }}>
                  📐 Bloque Físico y Características
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Material Predominante</span>
                <span className="info-val">{itemData.material || 'Madera / MDF / Metálico'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Color Institucional</span>
                <span className="info-val">{itemData.color || 'Estándar'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Dimensiones (Alto x Ancho x Prof.)</span>
                <span className="info-val mono-num">{itemData.dimensiones || 'No especificadas'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Cantidad Inventariada</span>
                <span className="info-val mono-num" style={{ fontWeight: 700 }}>
                  {itemData.cantidad ?? itemData.disponible ?? 1} unidad(es)
                </span>
              </div>
            </div>

            {/* Bloque Logístico */}
            <div className="info-grid-details">
              <div className="info-item full">
                <span className="info-label" style={{ color: 'var(--copper)' }}>
                  📍 Bloque Logístico y Ubicación
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Sede Formativa</span>
                <span className="info-val">{itemData.sede || 'Medellín'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Salón / Ubicación Específica</span>
                <span className="info-val">{itemData.ubicacion_especifica || itemData.ubicacion_estante || itemData.espacio || 'Área General'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Proveedor / Origen</span>
                <span className="info-val">{itemData.proveedor_origen || itemData.proveedor || itemData.origen || 'Dotación FMO'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Fecha de Ingreso</span>
                <span className="info-val mono-num">{formatearFecha(itemData.fecha_adquisicion || itemData.created_at)}</span>
              </div>

              {(itemData.observaciones || itemData.descripcion) && (
                <div className="info-item full">
                  <span className="info-label">Observaciones Físicas</span>
                  <p className="info-val" style={{ margin: '4px 0 0', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                    {itemData.observaciones || itemData.descripcion}
                  </p>
                </div>
              )}
            </div>

            <AccionesPublicas />

            <footer className="public-footer">
              Fundación Marina Orth · Dotación, Sillería & Mobiliario Escolar · Medellín - Antioquia
            </footer>
          </div>
        </div>
      );
    }

    // =========================================================================
    // CASO 2: PAPELERÍA O ROBÓTICA (PapeXXXX / RobXXXX)
    // =========================================================================
    if (isPapeleria || isRobotica) {
      const disponible = Number(itemData.disponible ?? itemData.quantity ?? 0);
      const defaultMin = isPapeleria ? 3 : 5;
      const minimo = Number(itemData.minimo ?? itemData.minStock ?? defaultMin);
      const esCritico = disponible <= minimo;

      const iconoModulo = isPapeleria ? '📚' : '🤖';
      const labelModulo = isPapeleria ? 'Papelería e Insumos' : 'Material de Robótica STEAM';
      const unidadMedida = itemData.unidad_medida || itemData.unidad || 'Unidades';

      return (
        <div className="public-asset-container">
          <div className="public-asset-card">
            <HeaderPublico subtitulo={`Ficha de Existencias: ${labelModulo}`} />

            {/* Identificador Principal y Código */}
            <div className="public-hero">
              <div
                className="placa-highlight mono-num"
                style={{
                  background: isPapeleria ? 'rgba(236, 72, 153, 0.12)' : 'rgba(132, 204, 22, 0.15)',
                  color: isPapeleria ? '#db2777' : '#365314',
                  borderColor: isPapeleria ? '#f472b6' : '#84cc16',
                }}
              >
                {rawCode}
              </div>
              <h2 className="hero-title">{itemData.material || itemData.nombre || itemData.name}</h2>
              <div className="hero-category">
                <span className="category-tag">
                  {iconoModulo} {itemData.categoria || (isPapeleria ? 'Papelería' : 'Robótica')}
                </span>
                <span className="sede-badge municipal">
                  {itemData.sede || itemData.ubicacion || 'Medellín'}
                </span>
              </div>
            </div>

            {/* Badge de Estado de Abastecimiento */}
            <div className="status-banner-box">
              <div className="status-label-group">
                <span className="label-dim">Estado de Abastecimiento:</span>
                {esCritico ? (
                  <span
                    className="pill low font-bold"
                    style={{
                      fontSize: '13px',
                      padding: '5px 14px',
                      animation: 'pulse 1.8s infinite',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #f87171',
                    }}
                  >
                    🔴 STOCK CRÍTICO ({disponible} de {minimo} mín.)
                  </span>
                ) : (
                  <span
                    className="pill ok font-bold"
                    style={{
                      fontSize: '13px',
                      padding: '5px 14px',
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                    }}
                  >
                    🟢 NORMAL ({disponible} disponibles)
                  </span>
                )}
              </div>
            </div>

            {/* Bloque de Existencias */}
            <div className="info-grid-details">
              <div className="info-item full">
                <span className="info-label" style={{ color: 'var(--copper)' }}>
                  📦 Bloque de Existencias y Stock
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Stock Actual Disponible</span>
                <span
                  className="info-val mono-num"
                  style={{
                    fontWeight: 800,
                    fontSize: '16px',
                    color: esCritico ? '#ef4444' : 'var(--text)',
                  }}
                >
                  {disponible} {unidadMedida}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Stock Mínimo de Alerta</span>
                <span className="info-val mono-num" style={{ fontWeight: 600 }}>
                  {minimo} {unidadMedida}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Unidad de Medida</span>
                <span className="info-val">{unidadMedida}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Condición / Estado</span>
                <span className="info-val">{itemData.condicion || itemData.estado || 'Bueno'}</span>
              </div>
            </div>

            {/* Bloque Logístico */}
            <div className="info-grid-details">
              <div className="info-item full">
                <span className="info-label" style={{ color: 'var(--copper)' }}>
                  📍 Bloque Logístico y Almacenamiento
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Sede Asignada</span>
                <span className="info-val">{itemData.sede || itemData.ubicacion || 'Medellín'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Estante / Gaveta / Caja</span>
                <span className="info-val">{itemData.ubicacion_estante || itemData.caja || itemData.espacio || 'Contenedor General'}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Fecha de Última Recarga / Ingreso</span>
                <span className="info-val mono-num">{formatearFecha(itemData.updated_at || itemData.created_at || itemData.fecha_adquisicion)}</span>
              </div>

              <div className="info-item">
                <span className="info-label">Responsable Asignado</span>
                <span className="info-val">{itemData.responsable || 'Custodio Bodega FMO'}</span>
              </div>

              {(itemData.descripcion || itemData.observaciones || itemData.caracteristicas) && (
                <div className="info-item full">
                  <span className="info-label">Descripción y Notas</span>
                  <p className="info-val" style={{ margin: '4px 0 0', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                    {[itemData.descripcion, itemData.caracteristicas, itemData.observaciones].filter(Boolean).join('\n')}
                  </p>
                </div>
              )}
            </div>

            <AccionesPublicas />

            <footer className="public-footer">
              Fundación Marina Orth · Material Pedagógico, Robótica & Insumos STEAM · Medellín - Antioquia
            </footer>
          </div>
        </div>
      );
    }

    // =========================================================================
    // CASO 3: TECNOLOGÍA (ACT-FMO-XXX)
    // =========================================================================
    const estadoNorm = String(itemData.estado || 'Disponible').toLowerCase();
    const isPrestado = estadoNorm.includes('campo') || estadoNorm.includes('prestado');
    const isMantenimiento = estadoNorm.includes('mantenimiento') || estadoNorm.includes('repar');
    const isBaja = estadoNorm.includes('baja');

    let badgeClass = 'ok';
    let badgeLabel = '✅ Disponible en Bodega';

    if (isPrestado) {
      badgeClass = 'prestado';
      badgeLabel = '🔄 En Préstamo / En Campo';
    } else if (isMantenimiento) {
      badgeClass = 'alerta';
      badgeLabel = '🔧 En Mantenimiento';
    } else if (isBaja) {
      badgeClass = 'low';
      badgeLabel = '❌ De Baja';
    }

    // Identificar especificaciones de procesador, RAM y disco si existen
    const especificacionesHardware = [
      itemData.procesador ? `Procesador: ${itemData.procesador}` : '',
      itemData.ram || itemData.memoria_ram ? `RAM: ${itemData.ram || itemData.memoria_ram}` : '',
      itemData.disco || itemData.almacenamiento ? `Disco: ${itemData.disco || itemData.almacenamiento}` : '',
      itemData.sistema_operativo ? `SO: ${itemData.sistema_operativo}` : '',
    ].filter(Boolean);

    return (
      <div className="public-asset-container">
        <div className="public-asset-card">
          <HeaderPublico subtitulo="Ficha Técnica de Equipo Tecnológico" />

          {/* Encabezado: Placa, Nombre del equipo */}
          <div className="public-hero">
            <div className="placa-highlight mono-num">{rawCode}</div>
            <h2 className="hero-title">{itemData.nombre || itemData.name || 'Equipo Tecnológico'}</h2>
            <div className="hero-category">
              <span className="category-tag">💻 {itemData.categoria || 'Tecnología'}</span>
              <span className="sede-badge municipal">{itemData.sede || 'Medellín'}</span>
            </div>
          </div>

          {/* Badge de Estado Operativo */}
          <div className="status-banner-box">
            <div className="status-label-group">
              <span className="label-dim">Estado Operativo:</span>
              <span className={`pill ${badgeClass}`} style={{ fontSize: '13px', padding: '5px 12px' }}>
                {badgeLabel}
              </span>
            </div>
          </div>

          {/* Bloque Hardware / Ficha Técnica */}
          <div className="info-grid-details">
            <div className="info-item full">
              <span className="info-label" style={{ color: 'var(--copper)' }}>
                ⚙️ Bloque Hardware y Ficha Técnica
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">Marca</span>
              <span className="info-val">{itemData.marca || '—'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Modelo</span>
              <span className="info-val">{itemData.modelo || '—'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Serial de Fábrica</span>
              <span className="info-val mono-num">{itemData.serial || itemData.serialNumber || '—'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Condición Física</span>
              <span className="info-val">{itemData.condicion || 'Buen Estado'}</span>
            </div>

            {especificacionesHardware.length > 0 && (
              <div className="info-item full">
                <span className="info-label">Especificaciones Internas</span>
                <span className="info-val mono-num" style={{ fontSize: '13px' }}>
                  {especificacionesHardware.join(' | ')}
                </span>
              </div>
            )}
          </div>

          {/* Bloque Logístico */}
          <div className="info-grid-details">
            <div className="info-item full">
              <span className="info-label" style={{ color: 'var(--copper)' }}>
                📍 Bloque Logístico y Asignación
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">Sede / Municipio</span>
              <span className="info-val">{itemData.sede || 'Medellín'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Ubicación Física Específica</span>
              <span className="info-val">{itemData.ubicacion || itemData.ubicacion_estante || 'Bodega Central'}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Fecha de Ingreso / Compra</span>
              <span className="info-val mono-num">{formatearFecha(itemData.fecha_compra || itemData.fecha_ingreso || itemData.created_at)}</span>
            </div>

            <div className="info-item">
              <span className="info-label">Responsable Actual</span>
              <span className="info-val">{itemData.responsable || itemData.custodio || 'Bodega Central'}</span>
            </div>

            {/* Si está en préstamo, destacar custodio y fecha prevista de retorno */}
            {isPrestado && (
              <div className="info-item full loan-box-details">
                <span className="info-label" style={{ color: 'var(--amber)' }}>
                  Detalles del Préstamo Activo
                </span>
                <div className="loan-subdetails">
                  <div>
                    <strong>Custodio Responsable:</strong> {itemData.custodio || itemData.responsable || 'Personal asignado'}
                  </div>
                  <div>
                    <strong>Devolución Estimada:</strong>{' '}
                    <span className="mono-num" style={{ fontWeight: 700 }}>
                      {formatearFecha(itemData.fecha_devolucion || itemData.fecha_devolucion_esperada)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {(itemData.observaciones || itemData.descripcion) && (
              <div className="info-item full">
                <span className="info-label">Observaciones</span>
                <p className="info-val" style={{ margin: '4px 0 0', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                  {itemData.observaciones || itemData.descripcion}
                </p>
              </div>
            )}
          </div>

          <AccionesPublicas />

          <footer className="public-footer">
            Fundación Marina Orth · Robótica, Nuevas Tecnologías & STEAM · Medellín - Antioquia
          </footer>
        </div>
      </div>
    );
  }

  // Vista cuando no se encuentra el ítem
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
            {error || `No se encontró ningún equipo o material registrado con el código "${idODPlaca}".`}
          </p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Volver al Panel General
          </Link>
        </div>
      </div>
    </div>
  );
}
