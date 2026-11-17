import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy, ListFilter, Hash, CheckCircle2 } from 'lucide-react';

/**
 * Componente individual de Etiqueta QR Institucional (SIGA-FMO)
 * Proporciones fijas calibradas para cuadrícula 2×2 (exactamente 4 por hoja Carta).
 * Tamaño físico en papel: ~9.5 cm de ancho × 12 cm de alto (ideal para rotular y pegar en equipos).
 */
function EtiquetaQRCard({ etiqueta, isPrint = false }) {
  return (
    <div
      className={`border-2 border-dashed border-[#6d6e71]/60 rounded-xl p-3.5 flex flex-col items-center justify-between bg-white text-black break-inside-avoid box-border shadow-xs ${
        isPrint
          ? 'qr-card-2x2-print h-[12cm] min-h-[12cm] max-h-[12cm] print:shadow-none'
          : 'h-[275px] max-h-[275px] w-full'
      }`}
      style={{
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        ...(isPrint ? { height: '12cm', minHeight: '12cm', maxHeight: '12cm' } : {}),
      }}
    >
      {/* 1. Encabezado FMO institucional */}
      <div className="flex items-center justify-center gap-2.5 border-b-2 border-[#abd037] pb-2 w-full">
        <img
          src="/logo-marina-orth.png"
          alt="FMO"
          width="28"
          height="28"
          className="w-7 h-7 shrink-0 object-contain rounded-full shadow-2xs"
          style={{ width: '28px', height: '28px', maxWidth: '28px', maxHeight: '28px', flexShrink: 0 }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-[#013a52] leading-tight font-sans tracking-wide uppercase">
            Fundación Marina Orth
          </span>
          <span className="text-[8px] text-[#6d6e71] uppercase tracking-wider font-semibold leading-tight">
            Control de Activos Fijos
          </span>
        </div>
      </div>

      {/* 2. Código QR grande y nítido para escaneo rápido con pistola o celular */}
      <div className="my-auto py-1 flex items-center justify-center bg-white">
        <QRCodeSVG
          value={etiqueta.qrUrl}
          size={isPrint ? 132 : 118}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* 3. Datos del Activo / Equipo */}
      <div className="w-full flex flex-col items-center justify-center pt-2 border-t border-slate-200">
        {/* Placa / Código en grande y destacado */}
        <div className="text-sm font-black text-black tracking-wider font-mono bg-slate-100 px-3 py-0.5 rounded border border-slate-200 shadow-2xs">
          {etiqueta.placa}
        </div>

        {/* Nombre / Modelo del activo */}
        <div
          className="text-xs font-bold text-[#013a52] line-clamp-1 truncate max-w-full text-center mt-1 leading-snug"
          title={etiqueta.nombre}
        >
          {etiqueta.nombre}
        </div>

        {/* Serial y Ubicación */}
        <div className="text-[9.5px] text-[#6d6e71] truncate max-w-full text-center mt-0.5 font-medium">
          {etiqueta.serial ? `S/N: ${etiqueta.serial} • ` : ''}
          {etiqueta.sede || 'Oficina FMO'}
          {etiqueta.totalCopias > 1 && (
            <span className="no-print print:hidden font-semibold text-lime-700 ml-1">
              (c.{etiqueta.copiaNumero})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder para casillas vacías en la vista previa de pantalla.
 * Mantiene la cuadrícula 2x2 simétrica para que los stickers reales jamás cambien de tamaño.
 */
function SlotVacioCard({ index }) {
  return (
    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 h-[275px] max-h-[275px] w-full bg-slate-50/50 dark:bg-slate-900/30 select-none">
      <span className="text-2xl mb-1 opacity-40">🏷️</span>
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
        Espacio disponible para etiqueta
      </span>
      <span className="text-[10px] text-slate-400/80 dark:text-slate-600 text-center mt-1">
        (Cuadrícula fija 2×2 • 4 por hoja Carta)
      </span>
    </div>
  );
}

/**
 * ImpresionMasivaQRModal - Vista atractiva y calibrada de impresión de QRs
 * Imprime exactamente 4 etiquetas por hoja Carta (cuadrícula 2×2), siempre del mismo tamaño.
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

  // Agrupar en bloques de EXACTAMENTE 4 etiquetas (2 columnas × 2 filas = 4 por hoja Carta)
  const paginasDeEtiquetas = useMemo(() => {
    const paginas = [];
    for (let i = 0; i < etiquetasParaImprimir.length; i += 4) {
      paginas.push(etiquetasParaImprimir.slice(i, i + 4));
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
          1. MODAL EN PANTALLA (Visible solo en navegador, oculto en print)
          ============================================================== */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto no-print"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#0b1320] rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header del Modal */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-[#013a52] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#abd037] text-[#013a52] flex items-center justify-center font-bold shadow-sm">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
                  Impresión de Etiquetas QR para Equipos
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-[#abd037] border border-white/20">
                    Cuadrícula 2×2 (4 por hoja)
                  </span>
                </h3>
                <p className="text-xs text-slate-300 m-0 mt-0.5">
                  Tamaño fijo uniforme (~9.5 cm × 12 cm) listo para recortar y pegar en los equipos físicos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Selector de Copias por Ítem */}
              <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white font-semibold flex items-center gap-2 shadow-2xs">
                <Copy className="w-4 h-4 text-[#abd037]" />
                <label htmlFor="copias-item-input" className="text-xs font-semibold text-white">
                  Copias:
                </label>
                <input
                  id="copias-item-input"
                  type="number"
                  min="1"
                  max="10"
                  value={copiasPorItem}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setCopiasPorItem(isNaN(val) ? 1 : Math.max(1, Math.min(10, val)));
                  }}
                  className="w-12 text-center text-xs font-bold font-mono bg-white text-[#013a52] border-none rounded py-0.5 focus:outline-none focus:ring-2 focus:ring-[#abd037]"
                  title="Número de copias por cada etiqueta"
                />
              </div>

              {/* Botón Principal Imprimir */}
              <button
                type="button"
                onClick={handlePrint}
                className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-black px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] text-xs sm:text-sm active:scale-95"
                title="Abrir diálogo de impresión para enviar a la impresora"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas</span>
                <span className="bg-[#013a52] text-[#abd037] px-2 py-0.5 rounded-full text-xs font-black">
                  {etiquetasParaImprimir.length}
                </span>
              </button>

              {/* Botón Cerrar [X] */}
              <button
                type="button"
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BARRA DE MODOS DE SELECCIÓN: Seleccionados vs Todos vs Por Rango */}
          <div className="px-5 py-2.5 bg-slate-100/90 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#6d6e71] font-medium flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5" />
                <span>Selección:</span>
              </span>

              {/* Opción 1: Seleccionados */}
              <button
                type="button"
                onClick={() => setModoImpresion('seleccionados')}
                disabled={!items || items.length === 0}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modoImpresion === 'seleccionados'
                    ? 'bg-[#013a52] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                Solo seleccionados ({items.length})
              </button>

              {/* Opción 2: Todos los filtrados */}
              <button
                type="button"
                onClick={() => setModoImpresion('todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  modoImpresion === 'todos'
                    ? 'bg-[#013a52] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Todos los de esta vista ({allFilteredItems.length})
              </button>

              {/* Opción 3: Por rango de códigos */}
              <button
                type="button"
                onClick={() => setModoImpresion('rango')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  modoImpresion === 'rango'
                    ? 'bg-[#013a52] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Por rango de códigos</span>
              </button>
            </div>

            {/* Inputs de rango si está activo el modo Rango */}
            {modoImpresion === 'rango' && (
              <div className="flex items-center gap-2 animate-fade-in bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-[#abd037]">
                <label className="text-slate-600 dark:text-slate-300 font-medium">Desde:</label>
                <input
                  type="text"
                  value={rangoDesde}
                  onChange={(e) => setRangoDesde(e.target.value)}
                  placeholder="ej. ACT-FMO-001"
                  className="w-28 text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                />
                <label className="text-slate-600 dark:text-slate-300 font-medium">Hasta:</label>
                <input
                  type="text"
                  value={rangoHasta}
                  onChange={(e) => setRangoHasta(e.target.value)}
                  placeholder="ej. ACT-FMO-050"
                  className="w-28 text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                />
                <span className="text-[11px] font-bold text-[#013a52] dark:text-[#abd037]">
                  ({itemsBase.length} ítems en rango)
                </span>
              </div>
            )}
          </div>

          {/* Área de Vista Previa Atractiva: Hojas Carta Simuladas */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60 dark:bg-slate-950/60 flex flex-col items-center">
            {/* Banner Informativo */}
            <div className="mb-5 w-full max-w-3xl p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-950 dark:text-blue-200 shadow-2xs">
              <span className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#013a52] dark:text-[#abd037] shrink-0" />
                <span>
                  Mostrando <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} en <strong>{paginasDeEtiquetas.length}</strong> {paginasDeEtiquetas.length === 1 ? 'hoja Carta' : 'hojas Carta'} (formato exacto 2×2, 4 por hoja).
                </span>
              </span>
              <span className="text-[11px] text-[#013a52] dark:text-[#abd037] font-bold hidden md:inline">
                Tamaño de sticker fijo (~9.5 × 12 cm)
              </span>
            </div>

            {/* Hojas físicas simuladas */}
            <div className="w-full flex flex-col items-center gap-8 pb-4">
              {paginasDeEtiquetas.map((pagina, pageIdx) => {
                const emptySlotsCount = 4 - pagina.length;
                return (
                  <div
                    key={`screen-page-${pageIdx}`}
                    className="bg-white p-6 rounded-2xl border border-slate-300 shadow-xl w-full max-w-3xl flex flex-col transition-all hover:shadow-2xl"
                  >
                    {/* Encabezado de la Hoja Virtual */}
                    <div className="text-xs font-bold text-[#013a52] mb-4 pb-2 border-b-2 border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>📄</span>
                        <span>Hoja {pageIdx + 1} de {paginasDeEtiquetas.length} (Tamaño Carta - Cuadrícula 2×2)</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#6d6e71] bg-slate-100 px-2 py-0.5 rounded-full">
                        {pagina.length} {pagina.length === 1 ? 'etiqueta activa' : 'etiquetas activas'}
                      </span>
                    </div>

                    {/* Cuadrícula Fija 2×2 (Siempre 4 casillas del mismo tamaño) */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                      {/* Etiquetas Reales */}
                      {pagina.map((etiqueta) => (
                        <EtiquetaQRCard key={etiqueta.uniqueKey} etiqueta={etiqueta} isPrint={false} />
                      ))}

                      {/* Casillas Vacías Guía para asegurar que el tamaño NO cambie */}
                      {Array.from({ length: emptySlotsCount }).map((_, emptyIdx) => (
                        <SlotVacioCard key={`empty-screen-${pageIdx}-${emptyIdx}`} index={pagina.length + emptyIdx + 1} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer en pantalla */}
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Total: <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'sticker listo' : 'stickers listos'} • <strong>{paginasDeEtiquetas.length}</strong> {paginasDeEtiquetas.length === 1 ? 'hoja Carta' : 'hojas Carta'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-black px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] text-xs sm:text-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir ({etiquetasParaImprimir.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================
          2. PORTAL DE IMPRESIÓN DIRECTO EN document.body (#qr-print-portal)
          Montado fuera de #root para impresión 100% limpia sin hojas en blanco
          Paginado en bloques de EXACTAMENTE 4 etiquetas (2 columnas × 2 filas)
          ============================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-portal" className="hidden print:block w-full bg-white m-0 p-0">
            {paginasDeEtiquetas.map((pagina, pageIdx) => {
              const emptySlotsCount = 4 - pagina.length;
              return (
                <div
                  key={`qr-print-page-${pageIdx}`}
                  className="qr-page-grid grid grid-cols-2 gap-4 w-full bg-white box-border"
                  style={{
                    pageBreakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'always' : 'auto',
                    breakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'page' : 'auto',
                  }}
                >
                  {/* Etiquetas Reales */}
                  {pagina.map((etiqueta) => (
                    <EtiquetaQRCard key={etiqueta.uniqueKey} etiqueta={etiqueta} isPrint={true} />
                  ))}

                  {/* Celdas invisibles para completar la cuadrícula 2x2 y evitar que un sticker solitario se agrande */}
                  {Array.from({ length: emptySlotsCount }).map((_, emptyIdx) => (
                    <div
                      key={`empty-print-${pageIdx}-${emptyIdx}`}
                      className="qr-card-2x2-print"
                      style={{ visibility: 'hidden', border: 'none', background: 'transparent' }}
                    />
                  ))}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
