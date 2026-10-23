import React, { useState, useMemo } from 'react';

/**
 * ModalActaPrestamo
 * Componente modal de previsualización e impresión formal para el
 * "ACTA / GUÍA DE PRÉSTAMO Y RESPONSABILIDAD DE ACTIVOS RETORNABLES"
 * Institución: Fundación Marina Orth - Robótica & Innovación STEAM
 */
export default function ModalActaPrestamo({
  loanData,
  itemsCatalog = [],
  usuarios = [],
  allActiveLoans = [],
  onClose,
}) {
  if (!loanData) return null;

  // Responsable / custodio principal
  const responsableNombre =
    loanData.person || loanData.solicitante || loanData.responsable || 'Custodio No Especificado';

  // Buscar datos complementarios del usuario en el catálogo de usuarios
  const usuarioInfo = useMemo(() => {
    if (!responsableNombre) return null;
    const lower = responsableNombre.toLowerCase().trim();
    return (
      usuarios.find(
        (u) =>
          (u.nombre && u.nombre.toLowerCase().trim() === lower) ||
          (u.nombre_completo && u.nombre_completo.toLowerCase().trim() === lower) ||
          (u.email && loanData.email && u.email.toLowerCase().trim() === loanData.email.toLowerCase().trim())
      ) || null
    );
  }, [usuarios, responsableNombre, loanData.email]);

  const documento =
    loanData.solicitante_documento ||
    loanData.documento ||
    usuarioInfo?.documento ||
    usuarioInfo?.cedula ||
    '—';

  const email =
    loanData.email ||
    loanData.correo ||
    usuarioInfo?.email ||
    usuarioInfo?.correo ||
    '—';

  const telefono =
    loanData.telefono ||
    usuarioInfo?.telefono ||
    usuarioInfo?.celular ||
    '—';

  const sede =
    loanData.sede ||
    usuarioInfo?.sede ||
    'Medellín';

  const area =
    loanData.proyecto ||
    loanData.area ||
    usuarioInfo?.cargo ||
    'Robótica & Innovación STEAM';

  const motivo =
    loanData.motive ||
    loanData.motivo ||
    'Préstamo para formación y actividades institucionales';

  // Obtener otros préstamos activos asociados a este mismo responsable para consolidación
  const prestamosDelMismoResponsable = useMemo(() => {
    if (!allActiveLoans || allActiveLoans.length === 0) return [];
    const lowerResp = responsableNombre.toLowerCase().trim();
    return allActiveLoans.filter((m) => {
      const respM = (m.person || m.solicitante || '').toLowerCase().trim();
      return respM === lowerResp;
    });
  }, [allActiveLoans, responsableNombre]);

  // Estado para alternar consolidación total de activos a cargo del custodio
  const hayMultiplesPrestamosActivos = prestamosDelMismoResponsable.length > 1;
  const [consolidarTodo, setConsolidarTodo] = useState(hayMultiplesPrestamosActivos);

  // Helper para buscar los datos detallados de una placa o código de activo en el catálogo
  const resolverDetalleActivo = (placaOCodigo, fallbackNombre = '') => {
    if (!placaOCodigo) {
      return {
        placa: 'S-PLACA',
        descripcion: fallbackNombre || 'Equipo Tecnológico',
        marcaModelo: 'Fundación Marina Orth',
        serial: '—',
        estado: 'Bueno / Operativo',
        observaciones: 'Equipo verificado para préstamo',
      };
    }

    const pUpper = String(placaOCodigo).toUpperCase().trim();

    // 1. Buscar en unidades hijas de los equipos del catálogo
    for (const item of itemsCatalog) {
      if (item.units && Array.isArray(item.units)) {
        const u = item.units.find(
          (unit) =>
            String(unit.code || '').toUpperCase().trim() === pUpper ||
            String(unit.placa || '').toUpperCase().trim() === pUpper
        );
        if (u) {
          const marca = item.category || u.marca || item.marca || 'FMO';
          const modelo = u.model || u.modelo || item.modelo || 'Estándar';
          return {
            placa: u.placa || u.code || placaOCodigo,
            descripcion: item.name || item.nombre || fallbackNombre || 'Equipo Tecnológico',
            marcaModelo: `${marca} ${modelo}`.trim(),
            serial: u.serial || item.serial || '—',
            estado: u.condicion || u.estado || item.condicion || 'Bueno / Operativo',
            observaciones:
              u.observaciones ||
              u.accesorios ||
              item.notes ||
              'Incluye cargador, cable de poder y accesorios correspondientes',
          };
        }
      }

      // 2. Coincidencia directa con item
      if (
        String(item.placa || '').toUpperCase().trim() === pUpper ||
        String(item.id || '').toUpperCase().trim() === pUpper ||
        String(item.code || '').toUpperCase().trim() === pUpper
      ) {
        const marca = item.category || item.marca || 'FMO';
        const modelo = item.modelo || 'Estándar';
        return {
          placa: item.placa || item.id || placaOCodigo,
          descripcion: item.name || item.nombre || fallbackNombre || 'Equipo Tecnológico',
          marcaModelo: `${marca} ${modelo}`.trim(),
          serial: item.serial || '—',
          estado: item.condicion || item.estado || 'Bueno / Operativo',
          observaciones: item.notes || 'Incluye cargador y accesorios estándar',
        };
      }
    }

    // 3. Fallback con lo que venga en el movimiento
    return {
      placa: placaOCodigo,
      descripcion: fallbackNombre || 'Equipo Tecnológico Retornable',
      marcaModelo: 'Marina Orth STEAM',
      serial: '—',
      estado: 'Bueno / Operativo',
      observaciones: 'Cargador original y periféricos funcionales',
    };
  };

  // Construir la lista consolidada de activos a listar en la tabla
  const equiposConsolidados = useMemo(() => {
    const listado = [];
    const placasVistas = new Set();

    if (consolidarTodo && prestamosDelMismoResponsable.length > 0) {
      // Consolidar todos los préstamos activos de este responsable
      prestamosDelMismoResponsable.forEach((loan) => {
        const codes =
          loan.unitCodes && loan.unitCodes.length > 0
            ? loan.unitCodes
            : [loan.placa || loan.itemId || loan.placa_activo].filter(Boolean);

        codes.forEach((code) => {
          const upper = String(code).toUpperCase().trim();
          if (!placasVistas.has(upper)) {
            placasVistas.add(upper);
            listado.push(resolverDetalleActivo(code, loan.itemName || loan.nombre_activo));
          }
        });
      });
    } else {
      // Solo el préstamo seleccionado actualmente
      const codes =
        loanData.unitCodes && loanData.unitCodes.length > 0
          ? loanData.unitCodes
          : [loanData.placa || loanData.itemId || loanData.placa_activo].filter(Boolean);

      codes.forEach((code) => {
        const upper = String(code).toUpperCase().trim();
        if (!placasVistas.has(upper)) {
          placasVistas.add(upper);
          listado.push(resolverDetalleActivo(code, loanData.itemName || loanData.nombre_activo));
        }
      });
    }

    return listado;
  }, [consolidarTodo, prestamosDelMismoResponsable, loanData, itemsCatalog]);

  // Radicado / Consecutivo oficial
  const radicado = useMemo(() => {
    if (loanData.codigo_acta) return loanData.codigo_acta;
    const year = new Date().getFullYear();
    const cleanId = String(loanData.id || loanData.dbId || Math.floor(1000 + Math.random() * 9000))
      .replace(/\D/g, '')
      .slice(-4)
      .padStart(4, '0');
    return `PREST-${year}-${cleanId}`;
  }, [loanData]);

  // Fechas formateadas
  const formatFecha = (d) => {
    if (!d) return '—';
    try {
      const parts = String(d).split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return d;
    } catch {
      return d;
    }
  };

  const fechaExpedicion = formatFecha(loanData.date || loanData.fecha_salida || new Date().toISOString());
  const fechaEstimadaDevolucion = formatFecha(
    loanData.expectedReturn || loanData.fecha_devolucion_esperada || 'No estipulada'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog print-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '820px',
          width: '100%',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '10px',
        }}
      >
        {/* BARRA SUPERIOR DE ACCIONES (PANTALLA - OCULTA AL IMPRIMIR) */}
        <div
          className="modal-header no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--line, #334155)',
            backgroundColor: 'var(--surface-2, #0f172a)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#f8fafc' }}>
                Guía / Acta de Préstamo de Activos Retornables
              </h3>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Radicado: <strong style={{ color: '#84CC16' }}>{radicado}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hayMultiplesPrestamosActivos && (
              <button
                type="button"
                className="btn small ghost no-print"
                onClick={() => setConsolidarTodo(!consolidarTodo)}
                title="Alternar entre consolidar todos los activos a cargo o solo este préstamo"
                style={{
                  fontSize: '11px',
                  padding: '5px 10px',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  backgroundColor: consolidarTodo ? 'rgba(132, 204, 22, 0.15)' : 'transparent',
                  color: consolidarTodo ? '#84CC16' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <span>{consolidarTodo ? '📦 Consolidando todo' : '📄 Solo este ítem'}</span>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                  }}
                >
                  {equiposConsolidados.length}
                </span>
              </button>
            )}

            <button
              type="button"
              className="btn small btn-primary no-print"
              onClick={handlePrint}
              style={{
                backgroundColor: '#84CC16',
                color: '#0f172a',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              Imprimir Documento
            </button>

            <button
              type="button"
              className="close-btn no-print"
              onClick={onClose}
              style={{ fontSize: '16px', padding: '4px 8px', color: '#94a3b8' }}
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* =========================================================================
            HOJA FÍSICA IMPRIMIBLE: GUÍA / ACTA OFICIAL DE PRÉSTAMO
            ========================================================================= */}
        <div
          className="acta-remision-sheet acta-prestamo-sheet"
          style={{
            padding: '28px 32px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {/* 1. ENCABEZADO INSTITUCIONAL */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '14px',
              marginBottom: '14px',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src="/logo-marina-orth.png"
                alt="Fundación Marina Orth"
                style={{
                  height: '46px',
                  maxWidth: '160px',
                  objectFit: 'contain',
                }}
              />
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '0.02em',
                    lineHeight: '1.2',
                  }}
                >
                  FUNDACIÓN MARINA ORTH
                </h2>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '11px',
                    color: '#475569',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  Robótica & Innovación STEAM • Bodega Central
                </p>
                <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#64748b' }}>
                  Sistema Integrado de Gestión de Activos (SIGA)
                </p>
              </div>
            </div>

            <div
              style={{
                textAlign: 'right',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                minWidth: '210px',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  fontWeight: 800,
                  color: '#64748b',
                  display: 'block',
                  letterSpacing: '0.05em',
                }}
              >
                RADICADO / CONSECUTIVO
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '0.04em',
                }}
              >
                {radicado}
              </span>
              <div style={{ marginTop: '3px', fontSize: '10px', color: '#475569', lineHeight: 1.35 }}>
                <div>
                  <strong>Expedición:</strong> {fechaExpedicion}
                </div>
                <div>
                  <strong style={{ color: '#b91c1c' }}>Devolución pactada:</strong> {fechaEstimadaDevolucion}
                </div>
              </div>
            </div>
          </div>

          {/* BANNER DE TÍTULO OFICIAL */}
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              textAlign: 'center',
              padding: '6px 12px',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: '#ffffff',
              }}
            >
              ACTA / GUÍA DE PRÉSTAMO Y RESPONSABILIDAD DE ACTIVOS RETORNABLES
            </h1>
          </div>

          {/* 2. DATOS DEL RESPONSABLE / SOLICITANTE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '18px',
              fontSize: '11px',
            }}
          >
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>
                RESPONSABLE / CUSTODIO
              </span>
              <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{responsableNombre}</strong>
            </div>

            <div>
              <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>
                DOCUMENTO DE IDENTIDAD
              </span>
              <strong style={{ fontSize: '12px', color: '#0f172a', fontFamily: 'monospace' }}>{documento}</strong>
            </div>

            <div>
              <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>
                SEDE / MUNICIPIO
              </span>
              <strong style={{ fontSize: '12px', color: '#0f172a' }}>{sede}</strong>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>
                CORREO INSTITUCIONAL / TELÉFONO
              </span>
              <span style={{ color: '#334155' }}>
                {email} {telefono !== '—' ? `• Tel: ${telefono}` : ''}
              </span>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ fontSize: '9.5px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, display: 'block' }}>
                ÁREA / PROYECTO STEAM / PROPÓSITO
              </span>
              <span style={{ color: '#334155', fontWeight: 600 }}>{area}</span>
              {motivo && motivo !== area && (
                <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                  {motivo}
                </span>
              )}
            </div>
          </div>

          {/* 3. DETALLE DE EQUIPOS RETORNABLES (TABLA CONSOLIDADA) */}
          <div style={{ marginBottom: '18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#0f172a',
                  letterSpacing: '0.02em',
                }}
              >
                Relación de Equipos Tecnológicos Retornables ({equiposConsolidados.length} ítem{equiposConsolidados.length !== 1 ? 's' : ''})
              </h4>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                * Verifique placas y estado físico antes de firmar
              </span>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #cbd5e1',
                fontSize: '10.5px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', width: '28px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '6px 8px', width: '95px' }}>Código / Placa</th>
                  <th style={{ padding: '6px 8px', width: '170px' }}>Descripción / Tipo</th>
                  <th style={{ padding: '6px 8px', width: '130px' }}>Marca y Modelo</th>
                  <th style={{ padding: '6px 8px', width: '100px' }}>Serial</th>
                  <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '6px 8px' }}>Observaciones / Accesorios</th>
                </tr>
              </thead>
              <tbody>
                {equiposConsolidados.map((eq, idx) => (
                  <tr
                    key={eq.placa + idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 800, color: '#0369a1' }}>
                      {eq.placa}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <strong style={{ color: '#0f172a' }}>{eq.descripcion}</strong>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#334155' }}>
                      {eq.marcaModelo}
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#475569', fontSize: '10px' }}>
                      {eq.serial}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          fontSize: '9.5px',
                          fontWeight: 700,
                        }}
                      >
                        {eq.estado}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', color: '#475569', fontSize: '10px', lineHeight: 1.3 }}>
                      {eq.observaciones}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                  <td colSpan="5" style={{ padding: '6px 8px', textAlign: 'right', fontSize: '10.5px' }}>
                    TOTAL EQUIPOS RETORNABLES ENTREGADOS:
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11.5px', color: '#0f172a' }}>
                    {equiposConsolidados.length} und
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 4. CLÁUSULA DE COMPROMISO Y RESPONSABILIDAD */}
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '9.5px',
              lineHeight: 1.45,
              color: '#334155',
              textAlign: 'justify',
              marginBottom: '26px',
              pageBreakInside: 'avoid',
            }}
          >
            <strong
              style={{
                display: 'block',
                color: '#0f172a',
                marginBottom: '4px',
                textTransform: 'uppercase',
                fontSize: '10px',
                letterSpacing: '0.02em',
              }}
            >
              Cláusula de Compromiso, Custodia y Devolución de Activos Retornables:
            </strong>
            El solicitante/custodio arriba identificado certifica haber recibido a entera satisfacción y en calidad de{' '}
            <strong>PRÉSTAMO TEMPORAL RETORNABLE</strong> los equipos y accesorios descritos en la presente acta, habiendo verificado
            su perfecto estado funcional y físico. El custodio asume formalmente la custodia, cuidado exclusivo y conservación de los
            mismos para las actividades pedagógicas y misionales de la <strong>Fundación Marina Orth</strong>, comprometiéndose
            a devolverlos a Bodega Central a más tardar en la fecha pactada ({fechaEstimadaDevolucion}) o ante solicitud de la
            coordinación. En caso de daño por negligencia, deterioro anormal o pérdida de cualquiera de los elementos y/o
            sus accesorios, el custodio responderá conforme a las políticas y reglamentos institucionales de gestión de activos.
          </div>

          {/* 5. BLOQUE DE FIRMAS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              paddingTop: '10px',
              pageBreakInside: 'avoid',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  borderBottom: '1px solid #0f172a',
                  height: '46px',
                  marginBottom: '6px',
                }}
              />
              <strong style={{ display: 'block', fontSize: '11.5px', color: '#0f172a' }}>
                Bodega Central / Coordinación de Inventario
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Entregado por (Almacén FMO - Gestión de Activos)
              </span>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px' }}>
                Fundación Marina Orth • Robótica STEAM
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  borderBottom: '1px solid #0f172a',
                  height: '46px',
                  marginBottom: '6px',
                }}
              />
              <strong style={{ display: 'block', fontSize: '11.5px', color: '#0f172a' }}>
                {responsableNombre}
              </strong>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Recibido Conforme (Custodio / Responsable)
              </span>
              <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px' }}>
                C.C. {documento !== '—' ? documento : '_______________________'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
