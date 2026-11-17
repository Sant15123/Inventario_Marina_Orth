import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy } from 'lucide-react';

/**
 * ImpresionMasivaQRModal - Impresión de etiquetas QR en cuadrícula fija de 4 por hoja (2x2)
 * Formato oficial SIGA-FMO para hojas tamaño Carta (Letter) con guías de corte y marca institucional.
 *
 * @param {Array} items - Lista de ítems seleccionados para imprimir
 * @param {Function} onClose - Función para cerrar el modal
 */
export default function ImpresionMasivaQRModal({ items = [], onClose }) {
  const [copiasPorItem, setCopiasPorItem] = useState(1);

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

  // Expandir etiquetas según el número de copias configurado
  const etiquetasParaImprimir = useMemo(() => {
    const copias = Math.max(1, Math.min(10, Number(copiasPorItem) || 1));
    const lista = [];
    items.forEach((it, itemIdx) => {
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
  }, [items, copiasPorItem]);

  // Agrupar en páginas de exactamente 4 etiquetas (2 columnas x 2 filas)
  const paginasDeEtiquetas = useMemo(() => {
    const paginas = [];
    for (let i = 0; i < etiquetasParaImprimir.length; i += 4) {
      paginas.push(etiquetasParaImprimir.slice(i, i + 4));
    }
    return paginas;
  }, [etiquetasParaImprimir]);

  const handlePrint = () => {
    window.print();
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto print:p-0 print:static print:bg-white print:overflow-visible print:z-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="impresion-masiva-qr-modal bg-white dark:bg-[#0b1320] rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 dark:border-slate-800 print:max-h-none print:h-auto print:shadow-none print:border-none print:w-full print:max-w-none print:bg-white print:text-black print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==============================================================
            CONTROLES SUPERIORES (Ocultos al imprimir mediante print:hidden)
            ============================================================== */}
        <div className="no-print print:hidden px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f172a]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#013a52] text-white flex items-center justify-center font-bold shadow-sm">
              <Printer className="w-5 h-5 text-[#abd037]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                Impresión Masiva de Etiquetas QR
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#013a52]/10 text-[#013a52] dark:text-[#abd037] border border-[#013a52]/20 dark:border-[#abd037]/30">
                  Cuadrícula 2×2 (4 por hoja)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {items.length} {items.length === 1 ? 'ítem seleccionado' : 'ítems seleccionados'} • {etiquetasParaImprimir.length} {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} ({paginasDeEtiquetas.length} {paginasDeEtiquetas.length === 1 ? 'hoja Carta' : 'hojas Carta'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Copias por Ítem */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[#013a52] font-semibold flex items-center gap-2 shadow-2xs">
              <Copy className="w-4 h-4 text-[#6d6e71]" />
              <label htmlFor="copias-item-input" className="text-xs font-semibold text-[#013a52]">
                Copias por ítem:
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
                className="w-12 text-center text-xs font-bold font-mono bg-white border border-slate-300 rounded py-0.5 text-[#013a52] focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                title="Número de copias por cada etiqueta (útil para tapa y cargador)"
              />
            </div>

            {/* Botón Principal Imprimir Hoja */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
              title="Abrir diálogo de impresión del navegador"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Hoja</span>
              <span className="bg-[#013a52] text-[#abd037] px-2 py-0.5 rounded-full text-xs font-bold">
                {etiquetasParaImprimir.length}
              </span>
            </button>

            {/* Botón Cerrar [X] */}
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-300 text-[#6d6e71] hover:bg-slate-100 hover:text-[#013a52] font-medium rounded-xl p-2 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==============================================================
            ÁREA DE CONTENIDO / HOJAS DE IMPRESIÓN (ID #printable-qr-grid)
            ============================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-slate-950/40 print:p-0 print:overflow-visible print:bg-white">
          {/* Aviso informativo sólo en pantalla */}
          <div className="no-print print:hidden mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
            <span className="flex items-center gap-2">
              <span>📄</span>
              <span>
                Mostrando <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} distribuidas en <strong>{paginasDeEtiquetas.length}</strong> {paginasDeEtiquetas.length === 1 ? 'hoja' : 'hojas'} tamaño Carta (máximo 4 QR por hoja en formato 2×2).
              </span>
            </span>
            <span className="text-[11px] text-blue-700 dark:text-blue-400 hidden md:inline">
              Tip: En el diálogo de impresión, selecciona tamaño Carta (Letter) y márgenes de 0.8 cm.
            </span>
          </div>

          {/* Contenedor Imprimible Maestro con ID estricto para CSS @media print */}
          <div id="printable-qr-grid" className="w-full flex flex-col gap-6 print:gap-0 print:m-0 print:p-0 print:w-full">
            {paginasDeEtiquetas.map((pagina, pageIdx) => (
              <div
                key={`qr-page-${pageIdx}`}
                className={`qr-page-grid grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs print:shadow-none print:border-none print:p-0 print:m-0 print:w-full ${
                  pageIdx < paginasDeEtiquetas.length - 1 ? 'break-after-page' : ''
                }`}
                style={{
                  pageBreakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'always' : 'auto',
                  breakAfter: pageIdx < paginasDeEtiquetas.length - 1 ? 'page' : 'auto',
                }}
              >
                {pagina.map((etiqueta) => (
                  <div
                    key={etiqueta.uniqueKey}
                    className="qr-card-2x2 border-2 border-dashed border-[#6d6e71]/60 rounded-2xl p-6 flex flex-col items-center justify-between bg-white text-black break-inside-avoid shadow-xs print:shadow-none box-border"
                    style={{
                      minHeight: '410px',
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {/* 1. Encabezado institucional FMO */}
                    <div className="w-full flex flex-col items-center justify-center pb-2.5 border-b-2 border-[#abd037]">
                      <div className="flex items-center justify-center gap-2">
                        <img
                          src="/logo-marina-orth.png"
                          alt="FMO"
                          className="w-7 h-7 object-contain rounded-full flex-shrink-0"
                        />
                        <span className="font-bold text-sm text-[#013a52] uppercase tracking-wide font-sans">
                          Fundación Marina Orth
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6d6e71] uppercase tracking-wider font-semibold mt-0.5">
                        Sistema de Control de Activos Fijos
                      </span>
                    </div>

                    {/* 2. Código QR grande y nítido en el centro (size=170) */}
                    <div className="my-auto py-3 flex items-center justify-center bg-white">
                      <QRCodeSVG
                        value={etiqueta.qrUrl}
                        size={170}
                        level="M"
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>

                    {/* 3. Pie de etiqueta con Placa, Nombre y Sede/Serial */}
                    <div className="w-full flex flex-col items-center justify-center pt-2.5 border-t border-slate-100">
                      <div className="font-black text-xl text-[#000000] tracking-wider font-mono">
                        {etiqueta.placa}
                      </div>
                      <div
                        className="font-semibold text-sm text-[#013a52] truncate max-w-full text-center mt-0.5"
                        title={etiqueta.nombre}
                      >
                        {etiqueta.nombre}
                      </div>
                      <div className="text-xs text-[#6d6e71] text-center truncate max-w-full mt-0.5">
                        {etiqueta.serial ? `S/N: ${etiqueta.serial} • ` : ''}
                        {etiqueta.sede || 'OFICINA FMO'}
                        {etiqueta.totalCopias > 1 && (
                          <span className="no-print print:hidden font-semibold text-lime-700 ml-1">
                            (Copia {etiqueta.copiaNumero})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ==============================================================
            FOOTER EN PANTALLA
            ============================================================== */}
        <div className="no-print print:hidden px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {etiquetasParaImprimir.length} {etiquetasParaImprimir.length === 1 ? 'etiqueta lista' : 'etiquetas listas'} • {paginasDeEtiquetas.length} {paginasDeEtiquetas.length === 1 ? 'hoja de impresión' : 'hojas de impresión'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-300 text-[#6d6e71] hover:bg-slate-100 hover:text-[#013a52] font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-bold px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Hoja</span>
              <span className="bg-[#013a52] text-[#abd037] px-2 py-0.5 rounded-full text-xs font-bold">
                {etiquetasParaImprimir.length}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
