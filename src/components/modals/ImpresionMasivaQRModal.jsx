import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy } from 'lucide-react';

/**
 * Componente individual de Etiqueta QR Institucional (SIGA-FMO)
 * Proporciones calibradas para cuadrícula 2×2 (máximo 4 por hoja Carta).
 */
function EtiquetaQRCard({ etiqueta, isPrint = false }) {
  return (
    <div
      className={`border-2 border-dashed border-[#6d6e71]/60 rounded-xl p-4 flex flex-col items-center justify-between bg-white text-black break-inside-avoid box-border shadow-xs ${
        isPrint
          ? 'qr-card-2x2-print h-[11.2cm] min-h-[11.2cm] max-h-[11.5cm] print:shadow-none'
          : 'h-[260px] max-h-[260px]'
      }`}
      style={{
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        ...(isPrint ? { height: '11.2cm', minHeight: '11.2cm', maxHeight: '11.5cm' } : {}),
      }}
    >
      {/* 1. Encabezado FMO compacto en fila horizontal */}
      <div className="flex items-center justify-center gap-2 border-b-2 border-[#abd037] pb-2 w-full">
        <img
          src="/logo-marina-orth.png"
          alt="FMO"
          width="28"
          height="28"
          className="w-7 h-7 shrink-0 object-contain rounded-full"
          style={{ width: '28px', height: '28px', maxWidth: '28px', maxHeight: '28px', flexShrink: 0 }}
        />
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-bold text-[#013a52] leading-tight font-sans tracking-wide">
            FUNDACIÓN MARINA ORTH
          </span>
          <span className="text-[8px] text-[#6d6e71] uppercase tracking-wider font-semibold leading-tight">
            SISTEMA DE CONTROL DE ACTIVOS FIJOS
          </span>
        </div>
      </div>

      {/* 2. Código QR grande y nítido size={125} */}
      <div className="my-auto py-1 flex items-center justify-center bg-white">
        <QRCodeSVG
          value={etiqueta.qrUrl}
          size={125}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* 3. Pie de etiqueta */}
      <div className="w-full flex flex-col items-center justify-center pt-1.5 border-t border-slate-100">
        <div className="text-base font-black text-black tracking-wide mt-1 font-mono">
          {etiqueta.placa}
        </div>
        <div
          className="text-xs font-semibold text-[#013a52] line-clamp-1 truncate max-w-full text-center mt-0.5"
          title={etiqueta.nombre}
        >
          {etiqueta.nombre}
        </div>
        <div className="text-[10px] text-[#6d6e71] text-center truncate max-w-full mt-0.5">
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
  );
}

/**
 * ImpresionMasivaQRModal - Vista previa en pantalla e impresión por Portal en document.body
 * Formato oficial SIGA-FMO para hojas tamaño Carta (Letter) con cuadrícula 2x2 y salto de página limpio.
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
    document.body.classList.add('printing-qr-active');
    window.print();
  };

  if (!items || items.length === 0) return null;

  return (
    <>
      {/* ==============================================================
          1. MODAL EN PANTALLA (Visible solo en navegador, oculto en print)
          ============================================================== */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto no-print"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#0b1320] rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 dark:border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header de controles en modal */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f172a]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
                  title="Número de copias por cada etiqueta"
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

          {/* Área de Vista Previa de Cuadrícula 2x2 en Pantalla */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-slate-950/40">
            <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
              <span className="flex items-center gap-2">
                <span>📄</span>
                <span>
                  Mostrando <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} distribuidas en <strong>{paginasDeEtiquetas.length}</strong> {paginasDeEtiquetas.length === 1 ? 'hoja' : 'hojas'} tamaño Carta (cuadrícula fija 2×2, 4 por hoja).
                </span>
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 hidden md:inline">
                Tip: Selecciona tamaño Carta (Letter) y márgenes de 0.8 cm.
              </span>
            </div>

            <div className="w-full flex flex-col gap-6">
              {paginasDeEtiquetas.map((pagina, pageIdx) => (
                <div key={`screen-page-${pageIdx}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-[#013a52] mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Hoja {pageIdx + 1} de {paginasDeEtiquetas.length} (Carta 2×2)</span>
                    <span className="text-[11px] font-normal text-[#6d6e71]">
                      {pagina.length} {pagina.length === 1 ? 'etiqueta' : 'etiquetas'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {pagina.map((etiqueta) => (
                      <EtiquetaQRCard key={etiqueta.uniqueKey} etiqueta={etiqueta} isPrint={false} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer en pantalla */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0">
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

      {/* ==============================================================
          2. PORTAL DE IMPRESIÓN DIRECTO EN document.body (#qr-print-portal)
          Montado fuera de #root para impresión 100% limpia sin hojas en blanco
          ============================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="qr-print-portal" className="hidden print:block w-full bg-white m-0 p-0">
            {paginasDeEtiquetas.map((pagina, pageIdx) => (
              <div
                key={`qr-print-page-${pageIdx}`}
                className="qr-page-grid grid grid-cols-2 gap-4 w-full bg-white box-border"
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
