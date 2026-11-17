import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy, Columns3, Columns4 } from 'lucide-react';

/**
 * ImpresionMasivaQRModal - Vista previa e impresión en cuadrícula de códigos QR
 * Optimizado para hojas tamaño Carta (Letter) con guías de corte y marca institucional FMO.
 *
 * @param {Array} items - Lista de ítems seleccionados para imprimir
 * @param {Function} onClose - Función para cerrar el modal
 */
export default function ImpresionMasivaQRModal({ items = [], onClose }) {
  const [columnas, setColumnas] = useState(3); // 3 o 4 columnas por hoja
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
      const sede = it.sede || it.ubicacion || 'Medellín';
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
        className="impresion-masiva-qr-modal bg-white dark:bg-[#0b1320] rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[94vh] overflow-hidden border border-slate-200 dark:border-slate-800 print:max-h-none print:h-auto print:shadow-none print:border-none print:w-full print:max-w-none print:bg-white print:text-black print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==============================================================
            CONTROLES SUPERIORES (Ocultos al imprimir mediante print:hidden)
            ============================================================== */}
        <div className="no-print print:hidden px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f172a]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#013a52] text-white flex items-center justify-center font-bold shadow-sm">
              <Printer className="w-5 h-5 text-[#abd037]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 m-0">
                Impresión Masiva de Etiquetas QR
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#abd037]/20 text-[#013a52] dark:text-[#abd037] border border-[#abd037]/40">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'} seleccionados
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                Cuadrícula optimizada para tamaño Carta (Letter) con guías de corte
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Densidad por Fila */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setColumnas(3)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  columnas === 3
                    ? 'bg-[#013a52] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="3 columnas por fila (12 a 15 QRs por hoja)"
              >
                <Columns3 className={`w-3.5 h-3.5 ${columnas === 3 ? 'text-[#abd037]' : ''}`} />
                <span>3 columnas</span>
              </button>
              <button
                type="button"
                onClick={() => setColumnas(4)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  columnas === 4
                    ? 'bg-[#013a52] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="4 columnas por fila (16 a 20 QRs por hoja - Compacto)"
              >
                <Columns4 className={`w-3.5 h-3.5 ${columnas === 4 ? 'text-[#abd037]' : ''}`} />
                <span>4 columnas (Compacto)</span>
              </button>
            </div>

            {/* Selector de Copias por Ítem */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 rounded-xl">
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <label htmlFor="copias-item-input" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
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
                className="w-12 text-center text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#abd037]"
                title="Número de copias por cada etiqueta (útil para tapa y cargador)"
              />
            </div>

            {/* Botón Principal Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] font-black text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
              title="Abrir diálogo de impresión del navegador"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Hoja</span>
              <span className="bg-[#013a52] text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {etiquetasParaImprimir.length}
              </span>
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==============================================================
            ÁREA DE CONTENIDO / HOJA DE IMPRESIÓN
            ============================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-slate-950/40 print:p-0 print:overflow-visible print:bg-white">
          {/* Aviso informativo sólo en pantalla */}
          <div className="no-print print:hidden mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
            <span className="flex items-center gap-2">
              <span>📄</span>
              <span>
                Mostrando <strong>{etiquetasParaImprimir.length}</strong> {etiquetasParaImprimir.length === 1 ? 'etiqueta' : 'etiquetas'} ({items.length} {items.length === 1 ? 'ítem' : 'ítems'} × {copiasPorItem} {copiasPorItem === 1 ? 'copia' : 'copias'}) en {columnas} columnas.
              </span>
            </span>
            <span className="text-[11px] text-blue-700 dark:text-blue-400 hidden md:inline">
              Tip: En el diálogo de impresión, asegúrate de activar "Gráficos de fondo" y márgenes mínimos.
            </span>
          </div>

          {/* Contenedor de Cuadrícula con Clases Fijas de Impresión */}
          <div
            className={`w-full mx-auto bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full ${
              columnas === 3 ? 'qr-print-grid-3' : 'qr-print-grid-4'
            }`}
            style={{
              display: 'grid',
              gridTemplateColumns: columnas === 3 ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {etiquetasParaImprimir.map((etiqueta) => (
              <div
                key={etiqueta.uniqueKey}
                className="qr-grid-label-card border border-dashed border-[#6d6e71]/60 rounded-lg p-2.5 text-center break-inside-avoid print:break-inside-avoid bg-white text-black flex flex-col items-center justify-between transition-colors shadow-sm print:shadow-none"
                style={{
                  boxSizing: 'border-box',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                  minHeight: columnas === 3 ? '220px' : '205px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderColor: 'rgba(109, 110, 113, 0.6)',
                }}
              >
                {/* 1. Encabezado Mini FMO con Isotipo Oficial */}
                <div
                  className="w-full flex items-center justify-center gap-1.5 pb-1 border-b border-[#abd037] mb-1.5"
                  style={{ borderBottom: '1.5px solid #abd037' }}
                >
                  <img
                    src="/logo-marina-orth.png"
                    alt="FMO"
                    className="w-3.5 h-3.5 object-contain rounded-full flex-shrink-0"
                    style={{ width: '14px', height: '14px', borderRadius: '50%' }}
                  />
                  <span
                    className="font-bold text-[9px] uppercase tracking-wider font-sans leading-none"
                    style={{ color: '#013a52', fontSize: '9px', fontWeight: 700 }}
                  >
                    Fundación Marina Orth
                  </span>
                </div>

                {/* 2. Código QR Centrado Nítido */}
                <div
                  className="flex items-center justify-center my-1 bg-white p-1 rounded"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <QRCodeSVG
                    value={etiqueta.qrUrl}
                    size={columnas === 3 ? 110 : 95}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                {/* 3. Código / Placa en Negrita Institucional */}
                <div
                  className="font-black text-xs font-mono tracking-tight leading-tight mt-1"
                  style={{ color: '#000000', fontSize: '12px', fontWeight: 900 }}
                >
                  {etiqueta.placa}
                </div>

                {/* 4. Nombre Corto del Ítem */}
                <div
                  className="text-[10px] font-medium truncate w-full max-w-full mt-0.5 leading-snug"
                  style={{ color: '#0f172a', fontSize: '10px', fontWeight: 600 }}
                  title={etiqueta.nombre}
                >
                  {etiqueta.nombre}
                </div>

                {/* 5. Serial / Sede */}
                <div
                  className="text-[8px] truncate w-full max-w-full mt-0.5"
                  style={{ color: '#6d6e71', fontSize: '8px' }}
                >
                  {etiqueta.serial ? `S/N: ${etiqueta.serial} • ` : ''}
                  {etiqueta.sede}
                  {etiqueta.totalCopias > 1 && (
                    <span className="no-print print:hidden font-semibold text-lime-700 ml-1">
                      (Copia {etiqueta.copiaNumero})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer en pantalla para acceso rápido */}
        <div className="no-print print:hidden px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {etiquetasParaImprimir.length} {etiquetasParaImprimir.length === 1 ? 'etiqueta lista' : 'etiquetas listas'} para imprimir
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#013a52] hover:bg-[#0A3C63] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-[#abd037] transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <span>🖨️</span>
              <span>Imprimir Cuadrícula</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
