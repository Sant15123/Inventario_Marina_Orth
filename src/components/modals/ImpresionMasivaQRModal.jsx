import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy, ListFilter, Hash } from 'lucide-react';

/**
 * Componente individual de Etiqueta QR Institucional (SIGA-FMO)
 * Diseño oficial estandarizado en 3 columnas (9 etiquetas por hoja Carta).
 */
function EtiquetaQRCard({ etiqueta, isPrint = false }) {
  return (
    <div
      className={`bg-white border border-dashed border-[#6d6e71]/50 rounded-xl p-4 flex flex-col items-center text-center shadow-2xs break-inside-avoid w-full ${
        isPrint ? 'qr-card-3x3-print p-3 justify-between' : ''
      }`}
      style={{
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        ...(isPrint ? { height: '7.8cm', minHeight: '7.8cm', maxHeight: '8.0cm' } : {}),
      }}
    >
      {/* 1. Encabezado de la etiqueta institucional */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b-2 border-[#abd037] w-full justify-center">
        <img
          src="/logo-marina-orth.png"
          alt="FMO"
          width="24"
          height="24"
          className="w-6 h-6 shrink-0 object-contain rounded-full"
          style={{ width: '24px', height: '24px', maxWidth: '24px', maxHeight: '24px', flexShrink: 0 }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-extrabold text-[#013a52] leading-none tracking-tight uppercase">
            FUNDACIÓN MARINA ORTH
          </span>
          <span className="text-[7px] font-semibold text-[#6d6e71] tracking-wider mt-0.5 uppercase">
            CONTROL DE ACTIVOS FIJOS
          </span>
        </div>
      </div>

      {/* 2. Código QR nítido */}
      <div className="my-1 flex items-center justify-center bg-white">
        <QRCodeSVG
          value={etiqueta.qrUrl}
          size={105}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* 3. Datos del Activo (espaciados y limpios) */}
      <div className="w-full flex flex-col items-center justify-center mt-1">
        {/* Placa / Código */}
        <div className="font-mono font-black text-sm text-[#000000] tracking-widest mt-1">
          {etiqueta.placa}
        </div>

        {/* Nombre del equipo */}
        <div
          className="text-xs font-semibold text-[#013a52] line-clamp-1 mt-0.5 max-w-full"
          title={etiqueta.nombre}
        >
          {etiqueta.nombre}
        </div>

        {/* Subtexto: S/N y Sede resaltada */}
        <div className="text-[10px] text-[#6d6e71] mt-1 max-w-full truncate">
          {etiqueta.serial ? `S/N: ${etiqueta.serial} • ` : ''}
          <span className="font-semibold text-[#659c1e]">{etiqueta.sede || 'OFICINA FMO'}</span>
          {etiqueta.totalCopias > 1 && (
            <span className="text-[#6d6e71] font-normal ml-1 no-print">
              (c.{etiqueta.copiaNumero})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ImpresionMasivaQRModal - Rediseño Profesional (SIGA-FMO)
 * Header y Footer fijos con scroll interno exclusivo en el área de etiquetas.
 * Formato: 9 etiquetas por hoja Carta (3 columnas × 3 filas).
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
      if (!rangoDesde) setRangoDesde(allFilteredItems[0].placa || allFilteredItems[0].code || '');
      if (!rangoHasta) {
        const defaultHastaIdx = Math.min(allFilteredItems.length - 1, 49);
        setRangoHasta(allFilteredItems[defaultHastaIdx].placa || allFilteredItems[defaultHastaIdx].code || '');
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
        (it) => (it.placa || it.code || '').toLowerCase() === desdeClean
      );
      let idxHasta = allFilteredItems.findIndex(
        (it) => (it.placa || it.code || '').toLowerCase() === hastaClean
      );

      // Búsqueda por inclusión si no hubo coincidencia exacta
      if (idxDesde === -1 && desdeClean) {
        idxDesde = allFilteredItems.findIndex((it) =>
          (it.placa || it.code || '').toLowerCase().includes(desdeClean)
        );
      }
      if (idxHasta === -1 && hastaClean) {
        idxHasta = allFilteredItems.findIndex((it) =>
          (it.placa || it.code || '').toLowerCase().includes(hastaClean)
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
  const etiquetasParaImprimir = useMemo(() => {
    const copias = Math.max(1, Math.min(10, Number(copiasPorItem) || 1));
    const lista = [];
    (itemsBase || []).forEach((it, itemIdx) => {
      const placa = it.placa || it.code || it.id || 'S-PLACA';
      const nombre = it.nombre || it.name || it.material || it.parentName || 'Equipo Tecnológico';
      const serial = it.serial && it.serial !== '—' ? it.serial : '';
      const sede = it.sede || it.ubicacion || 'OFICINA FMO';
      const qrUrl =
        it.qrUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/activo/${encodeURIComponent(placa)}`
          : `https://inventario.fundacionmarinaorth.org/activo/${encodeURIComponent(placa)}`);

      for (let c = 0; c < copias; c++) {
        lista.push({
          uniqueKey: `${placa}-${itemIdx}-${c}`,
          placa,
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

  // Agrupar en bloques de EXACTAMENTE 9 etiquetas (3 columnas × 3 filas) para hojas tamaño Carta
  const paginasDeEtiquetas = useMemo(() => {
    const paginas = [];
    for (let i = 0; i < etiquetasParaImprimir.length; i += 9) {
      paginas.push(etiquetasParaImprimir.slice(i, i + 9));
    }
    return paginas;
  }, [etiquetasParaImprimir]);

  const handlePrint = () => {
    document.body.classList.add('printing-qr-active');
    window.print();
  };

  return (
    <>
      {/* ==============================================================
          1. MODAL FLOTANTE EN PANTALLA (Header & Footer Fijos, Scroll Interno)
          ============================================================== */}
      <div
        className="fixed inset-0 z-50 bg-[#013a52]/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 no-print"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="flex flex-col max-h-[88vh] w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER FIJO */}
          <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#abd037]/20 text-[#013a52] p-2 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#013a52] m-0">
                    Impresión Masiva de Etiquetas QR
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de filtros / acciones limpia debajo del título */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
              {/* Píldoras de selección (Tabs) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModoImpresion('seleccionados')}
                  disabled={!items || items.length === 0}
                  className={`cursor-pointer transition-all ${
                    modoImpresion === 'seleccionados'
                      ? 'bg-[#013a52] text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-xs'
                      : 'bg-slate-100 text-[#6d6e71] hover:text-[#013a52] font-medium px-3.5 py-1.5 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  Solo seleccionados ({items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setModoImpresion('todos')}
                  className={`cursor-pointer transition-all ${
                    modoImpresion === 'todos'
                      ? 'bg-[#013a52] text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-xs'
                      : 'bg-slate-100 text-[#6d6e71] hover:text-[#013a52] font-medium px-3.5 py-1.5 rounded-lg text-xs'
                  }`}
                >
                  Todos los de esta vista ({allFilteredItems.length})
                </button>

                <button
                  type="button"
                  onClick={() => setModoImpresion('rango')}
                  className={`cursor-pointer transition-all flex items-center gap-1 ${
                    modoImpresion === 'rango'
                      ? 'bg-[#013a52] text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-xs'
                      : 'bg-slate-100 text-[#6d6e71] hover:text-[#013a52] font-medium px-3.5 py-1.5 rounded-lg text-xs'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>Por rango de códigos</span>
                </button>

                {/* Filtro Rango inline si está activo */}
                {modoImpresion === 'rango' && (
                  <div className="flex items-center gap-1.5 ml-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-xs">
                    <span className="text-slate-500 font-medium">De:</span>
                    <input
                      type="text"
                      value={rangoDesde}
                      onChange={(e) => setRangoDesde(e.target.value)}
                      placeholder="ACT-FMO-001"
                      className="w-24 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-[#013a52] text-xs focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                    />
                    <span className="text-slate-500 font-medium">A:</span>
                    <input
                      type="text"
                      value={rangoHasta}
                      onChange={(e) => setRangoHasta(e.target.value)}
                      placeholder="ACT-FMO-050"
                      className="w-24 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-[#013a52] text-xs focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                    />
                  </div>
                )}
              </div>

              {/* Controles derechos: Copias y Botón Imprimir */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="copias-input" className="text-xs font-semibold text-[#6d6e71]">
                    Copias:
                  </label>
                  <input
                    id="copias-input"
                    type="number"
                    min="1"
                    max="10"
                    value={copiasPorItem}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCopiasPorItem(isNaN(val) ? 1 : Math.max(1, Math.min(10, val)));
                    }}
                    className="w-16 text-center border border-slate-300 rounded-lg py-1 text-sm font-bold text-[#013a52] focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold px-5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir ({etiquetasParaImprimir.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* BODY CON SCROLL INTERNO EXCLUSIVO */}
          <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6">
            {/* Indicador discreto */}
            <div className="text-xs text-[#6d6e71] mb-4 font-medium flex items-center justify-between">
              <span>
                Vista previa de impresión • <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} ({paginasDeEtiquetas.length} {paginasDeEtiquetas.length === 1 ? 'hoja Carta' : 'hojas Carta'})
              </span>
              <span className="hidden sm:inline text-slate-400">
                Formato: 3×3 (9 etiquetas por hoja)
              </span>
            </div>

            {/* Cuadrícula limpia de 3 columnas (SIN cajas vacías placeholder) */}
            {etiquetasParaImprimir.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-[#6d6e71]">
                <p className="font-semibold text-sm">No hay etiquetas para mostrar en esta selección.</p>
                <p className="text-xs mt-1 text-slate-400">Selecciona activos en la tabla o cambia al modo "Todos los de esta vista".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {etiquetasParaImprimir.map((etiqueta) => (
                  <EtiquetaQRCard
                    key={etiqueta.uniqueKey}
                    etiqueta={etiqueta}
                    isPrint={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* FOOTER FIJO */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
            <span className="text-xs text-[#6d6e71] font-medium">
              Formato optimizado para papel Carta (9 etiquetas por hoja)
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-[#6d6e71] hover:text-[#013a52] font-medium text-sm transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold px-5 py-2 rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ahora</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================
          2. PORTAL DE IMPRESIÓN DIRECTO EN document.body (#qr-print-portal)
          Montado fuera de #root para impresión 100% limpia sin hojas en blanco
          Paginado en bloques de EXACTAMENTE 9 etiquetas (3 columnas × 3 filas)
          ============================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-portal" className="hidden print:block w-full bg-white m-0 p-0">
            {paginasDeEtiquetas.map((pagina, pageIdx) => (
              <div
                key={`qr-print-page-${pageIdx}`}
                className="qr-page-grid grid grid-cols-3 gap-3 w-full bg-white box-border"
                style={{
                  pageBreakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'always' : 'auto',
                  breakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'page' : 'auto',
                }}
              >
                {pagina.map((etiqueta) => (
                  <EtiquetaQRCard key={etiqueta.uniqueKey} etiqueta={etiqueta} isPrint={true} />
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
