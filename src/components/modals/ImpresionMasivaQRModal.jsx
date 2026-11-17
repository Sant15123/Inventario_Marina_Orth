import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Hash } from 'lucide-react';

/**
 * ImpresionMasivaQRModal - Reescritura Total con Estilos en Línea
 * Grilla real de 3 columnas garantizada, Header y Footer fijos sin pérdida en scroll.
 */
export default function ImpresionMasivaQRModal({
  items = [],
  allFilteredItems = [],
  onClose,
}) {
  const [modoImpresion, setModoImpresion] = useState(
    items && items.length > 0 ? 'seleccionados' : 'todos'
  );
  const [copiasPorItem, setCopiasPorItem] = useState(1);
  const [rangoDesde, setRangoDesde] = useState('');
  const [rangoHasta, setRangoHasta] = useState('');

  // Inicializar rango con primer y último código de la vista filtrada
  useEffect(() => {
    if (allFilteredItems && allFilteredItems.length > 0) {
      if (!rangoDesde) setRangoDesde(allFilteredItems[0].placa || allFilteredItems[0].code || allFilteredItems[0].codigo || '');
      if (!rangoHasta) {
        const defaultHastaIdx = Math.min(allFilteredItems.length - 1, 49);
        setRangoHasta(allFilteredItems[defaultHastaIdx].placa || allFilteredItems[defaultHastaIdx].code || allFilteredItems[defaultHastaIdx].codigo || '');
      }
    }
  }, [allFilteredItems]);

  // Cerrar modal al presionar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Limpiar clases al terminar impresión
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-qr-active');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-qr-active');
    };
  }, []);

  // Determinar la lista base según el modo seleccionado
  const itemsBase = useMemo(() => {
    if (modoImpresion === 'seleccionados' && items && items.length > 0) {
      return items;
    }
    if (modoImpresion === 'rango' && allFilteredItems && allFilteredItems.length > 0) {
      const desdeClean = (rangoDesde || '').trim().toLowerCase();
      const hastaClean = (rangoHasta || '').trim().toLowerCase();

      if (!desdeClean && !hastaClean) return allFilteredItems;

      let idxDesde = allFilteredItems.findIndex(
        (it) => (it.placa || it.code || it.codigo || '').toLowerCase() === desdeClean
      );
      let idxHasta = allFilteredItems.findIndex(
        (it) => (it.placa || it.code || it.codigo || '').toLowerCase() === hastaClean
      );

      if (idxDesde === -1 && desdeClean) {
        idxDesde = allFilteredItems.findIndex((it) =>
          (it.placa || it.code || it.codigo || '').toLowerCase().includes(desdeClean)
        );
      }
      if (idxHasta === -1 && hastaClean) {
        idxHasta = allFilteredItems.findIndex((it) =>
          (it.placa || it.code || it.codigo || '').toLowerCase().includes(hastaClean)
        );
      }

      if (idxDesde === -1) idxDesde = 0;
      if (idxHasta === -1) idxHasta = allFilteredItems.length - 1;

      const inicio = Math.min(idxDesde, idxHasta);
      const fin = Math.max(idxDesde, idxHasta);
      return allFilteredItems.slice(inicio, fin + 1);
    }
    // Modo 'todos'
    return allFilteredItems && allFilteredItems.length > 0 ? allFilteredItems : items;
  }, [modoImpresion, items, allFilteredItems, rangoDesde, rangoHasta]);

  // Expandir etiquetas según el número de copias configurado
  const etiquetasAImprimir = useMemo(() => {
    const copias = Math.max(1, Math.min(10, Number(copiasPorItem) || 1));
    const lista = [];
    (itemsBase || []).forEach((it, idx) => {
      const codigo = it.placa || it.code || it.codigo || it.id || 'S-COD';
      const nombre = it.nombre || it.name || it.material || it.parentName || 'Equipo';
      const serial = it.serial && it.serial !== '—' ? it.serial : '';
      const sede = it.sede || it.ubicacion || 'OFICINA FMO';
      const qrUrl =
        it.qrUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/activo/${encodeURIComponent(codigo)}`
          : `https://inventario.fundacionmarinaorth.org/activo/${encodeURIComponent(codigo)}`);

      for (let c = 0; c < copias; c++) {
        lista.push({
          uniqueKey: `${codigo}-${idx}-${c}`,
          codigo,
          nombre,
          serial,
          sede,
          qrUrl,
          copiaNumero: c + 1,
          totalCopias: copias,
        });
      }
    });
    return lista;
  }, [itemsBase, copiasPorItem]);

  // Agrupar en bloques de EXACTAMENTE 9 etiquetas (3 columnas × 3 filas) para hojas Carta
  const paginasDeEtiquetas = useMemo(() => {
    const paginas = [];
    for (let i = 0; i < etiquetasAImprimir.length; i += 9) {
      paginas.push(etiquetasAImprimir.slice(i, i + 9));
    }
    return paginas;
  }, [etiquetasAImprimir]);

  const handlePrint = () => {
    document.body.classList.add('printing-qr-active');
    window.print();
  };

  return (
    <>
      {/* ==============================================================
          1. ESTRUCTURA EXACTA DEL MODAL (Header Fijo + Scroll Interno + Footer Fijo)
          ============================================================== */}
      <div
        className="no-print"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(1, 58, 82, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* 1. HEADER FIJO (Nunca se mueve ni desaparece) */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              backgroundColor: '#ffffff',
            }}
          >
            {/* Fila superior: Título + Botón Cerrar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(171, 208, 55, 0.2)',
                    color: '#013a52',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Printer size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#013a52',
                    }}
                  >
                    Impresión Masiva de Etiquetas QR
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Fila inferior: Tabs de selección + Input Copias + Botón Imprimir */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              {/* Tabs de selección */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModoImpresion('seleccionados')}
                  disabled={!items || items.length === 0}
                  style={{
                    cursor: !items || items.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: !items || items.length === 0 ? 0.4 : 1,
                    backgroundColor: modoImpresion === 'seleccionados' ? '#013a52' : '#f1f5f9',
                    color: modoImpresion === 'seleccionados' ? '#ffffff' : '#6d6e71',
                    fontWeight: modoImpresion === 'seleccionados' ? 600 : 500,
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Solo seleccionados ({items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setModoImpresion('todos')}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: modoImpresion === 'todos' ? '#013a52' : '#f1f5f9',
                    color: modoImpresion === 'todos' ? '#ffffff' : '#6d6e71',
                    fontWeight: modoImpresion === 'todos' ? 600 : 500,
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Todos los de esta vista ({allFilteredItems.length})
                </button>

                <button
                  type="button"
                  onClick={() => setModoImpresion('rango')}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: modoImpresion === 'rango' ? '#013a52' : '#f1f5f9',
                    color: modoImpresion === 'rango' ? '#ffffff' : '#6d6e71',
                    fontWeight: modoImpresion === 'rango' ? 600 : 500,
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Hash size={14} />
                  <span>Por rango de códigos</span>
                </button>

                {/* Filtro Rango inline si está activo */}
                {modoImpresion === 'rango' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 500 }}>De:</span>
                    <input
                      type="text"
                      value={rangoDesde}
                      onChange={(e) => setRangoDesde(e.target.value)}
                      placeholder="ACT-FMO-001"
                      style={{
                        width: '85px',
                        padding: '2px 6px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '11px',
                        color: '#013a52',
                        outline: 'none',
                      }}
                    />
                    <span style={{ color: '#64748b', fontWeight: 500 }}>A:</span>
                    <input
                      type="text"
                      value={rangoHasta}
                      onChange={(e) => setRangoHasta(e.target.value)}
                      placeholder="ACT-FMO-050"
                      style={{
                        width: '85px',
                        padding: '2px 6px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '11px',
                        color: '#013a52',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Controles derechos: Copias + Botón Imprimir Verde #abd037 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label
                    htmlFor="copias-input-header"
                    style={{ fontSize: '12px', fontWeight: 600, color: '#6d6e71' }}
                  >
                    Copias:
                  </label>
                  <input
                    id="copias-input-header"
                    type="number"
                    min="1"
                    max="10"
                    value={copiasPorItem}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCopiasPorItem(isNaN(val) ? 1 : Math.max(1, Math.min(10, val)));
                    }}
                    style={{
                      width: '60px',
                      textAlign: 'center',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#013a52',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    backgroundColor: '#abd037',
                    color: '#013a52',
                    fontWeight: 700,
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <Printer size={16} />
                  <span>Imprimir ({etiquetasAImprimir.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. BODY CON SCROLL INTERNO Y GRILLA REAL DE 3 COLUMNAS */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              backgroundColor: '#f8fafc',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#6d6e71',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                Vista previa de impresión • <strong>{etiquetasAImprimir.length}</strong> etiquetas (
                {paginasDeEtiquetas.length} {paginasDeEtiquetas.length === 1 ? 'hoja' : 'hojas'} Carta)
              </span>
              <span>Formato: 3×3 (9 etiquetas por hoja)</span>
            </div>

            {etiquetasAImprimir.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '32px',
                  textAlign: 'center',
                  color: '#6d6e71',
                }}
              >
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>
                  No hay etiquetas para mostrar en esta selección.
                </p>
                <p style={{ fontSize: '12px', marginTop: '4px', color: '#94a3b8' }}>
                  Selecciona activos en la tabla o cambia al modo "Todos los de esta vista".
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', // ⚠️ FORZAR 3 COLUMNAS REALES UNO AL LADO DEL OTRO
                  gap: '14px',
                }}
              >
                {etiquetasAImprimir.map((item, idx) => (
                  <div
                    key={item.uniqueKey || idx}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1.5px dashed #94a3b8',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Encabezado compacto: Isotipo FMO (22x22px) + FUNDACIÓN MARINA ORTH */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderBottom: '2px solid #abd037',
                        paddingBottom: '6px',
                        marginBottom: '8px',
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src="/logo-marina-orth.png"
                        alt="FMO"
                        style={{
                          width: '22px',
                          height: '22px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          objectFit: 'contain',
                        }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: '#013a52',
                            lineHeight: 1.1,
                          }}
                        >
                          FUNDACIÓN MARINA ORTH
                        </div>
                        <div
                          style={{
                            fontSize: '7px',
                            fontWeight: 600,
                            color: '#6d6e71',
                          }}
                        >
                          CONTROL DE ACTIVOS FIJOS
                        </div>
                      </div>
                    </div>

                    {/* QR Compacto y Nítido */}
                    <div style={{ margin: '4px 0' }}>
                      <QRCodeSVG size={96} value={item.qrUrl} level="M" includeMargin={false} />
                    </div>

                    {/* Datos del equipo */}
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 900,
                        color: '#000000',
                        marginTop: '8px',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.codigo}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#013a52',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                        marginTop: '2px',
                      }}
                      title={item.nombre}
                    >
                      {item.nombre}
                    </div>
                    <div style={{ fontSize: '9px', color: '#6d6e71', marginTop: '2px' }}>
                      S/N: {item.serial || 'N/A'} •{' '}
                      <span style={{ color: '#659c1e', fontWeight: 700 }}>{item.sede}</span>
                      {item.totalCopias > 1 && (
                        <span style={{ color: '#6d6e71', marginLeft: '4px' }}>
                          (c.{item.copiaNumero})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. FOOTER FIJO */}
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid #e2e8f0',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6d6e71' }}>
              9 etiquetas por hoja Carta (3×3)
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  color: '#6d6e71',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#abd037',
                  color: '#013a52',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🖨️ Imprimir Hoja
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================
          PORTAL DE IMPRESIÓN DIRECTO EN document.body (#qr-print-portal)
          ============================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-portal" className="hidden print:block" style={{ width: '100%', margin: 0, padding: 0 }}>
            {paginasDeEtiquetas.map((pagina, pageIdx) => (
              <div
                key={`qr-print-page-${pageIdx}`}
                className="qr-page-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(3, 7.8cm)',
                  gap: '12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  pageBreakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'always' : 'auto',
                  breakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'page' : 'auto',
                }}
              >
                {pagina.map((item, idx) => (
                  <div
                    key={item.uniqueKey || idx}
                    className="qr-card-3x3-print"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1.5px dashed #6d6e71',
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                      justifyContent: 'space-between',
                      height: '7.8cm',
                      minHeight: '7.8cm',
                      maxHeight: '8.0cm',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Encabezado compacto */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderBottom: '2px solid #abd037',
                        paddingBottom: '5px',
                        marginBottom: '6px',
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src="/logo-marina-orth.png"
                        alt="FMO"
                        style={{
                          width: '22px',
                          height: '22px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          objectFit: 'contain',
                        }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: '#013a52',
                            lineHeight: 1.1,
                          }}
                        >
                          FUNDACIÓN MARINA ORTH
                        </div>
                        <div
                          style={{
                            fontSize: '7px',
                            fontWeight: 600,
                            color: '#6d6e71',
                          }}
                        >
                          CONTROL DE ACTIVOS FIJOS
                        </div>
                      </div>
                    </div>

                    {/* QR Compacto */}
                    <div style={{ margin: '4px 0' }}>
                      <QRCodeSVG size={96} value={item.qrUrl} level="M" includeMargin={false} />
                    </div>

                    {/* Datos del equipo */}
                    <div style={{ width: '100%', marginTop: '6px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 900,
                          color: '#000000',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {item.codigo}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#013a52',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          marginTop: '2px',
                        }}
                      >
                        {item.nombre}
                      </div>
                      <div style={{ fontSize: '9px', color: '#6d6e71', marginTop: '2px' }}>
                        S/N: {item.serial || 'N/A'} •{' '}
                        <span style={{ color: '#659c1e', fontWeight: 700 }}>{item.sede}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
