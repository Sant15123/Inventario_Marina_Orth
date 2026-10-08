import { QRCodeSVG } from 'qrcode.react';

export default function ModalQR({ activo, onClose }) {
  if (!activo) return null;

  const placa = activo.placa || activo.code || 'S-PLACA';
  const nombre = activo.nombre || activo.name || 'Equipo Tecnológico';
  const serial = activo.serial || '—';
  const sede = activo.sede || 'Medellín';
  const estado = activo.estado || activo.status || 'Disponible';

  // URL dinámica que codifica el QR para abrir la ficha pública al escanearlo con el celular
  const qrUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/activo/${encodeURIComponent(placa)}`
      : `https://inventario.fundacionmarinaorth.org/activo/${encodeURIComponent(placa)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog qr-dialog no-print-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <h3>Etiqueta de Activo Fijo / Código QR</h3>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* ETIQUETA FÍSICA IMPRIMIBLE */}
        <div className="qr-printable-area">
          <div className="qr-card printable-label">
            {/* Encabezado Institucional */}
            <div className="qr-badge-header">
              <div className="badge-brand-row">
                <img
                  src="/logo-marina-orth.png"
                  alt="Marina Orth"
                  className="badge-mo-img"
                />
                <div className="badge-titles">
                  <strong>FUNDACIÓN MARINA ORTH</strong>
                  <span>SISTEMA DE CONTROL DE ACTIVOS FIJOS</span>
                </div>
              </div>
            </div>

            {/* Código QR con corrección de error 'H' */}
            <div className="qr-visual">
              <QRCodeSVG
                value={qrUrl}
                size={160}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>

            {/* Información Técnica del Activo */}
            <div className="qr-info">
              <div className="qr-placa mono-num">{placa}</div>
              <div className="qr-name">{nombre}</div>
              <div className="qr-details-row">
                <span className="qr-sub mono-num">S/N: {serial}</span>
                <span className="qr-dot">•</span>
                <span className="qr-sede">{sede}</span>
              </div>
              <div className="qr-scan-hint">Escanea para verificar estado y custodio</div>
            </div>
          </div>
        </div>

        {/* Botones de acción en pantalla (ocultos al imprimir) */}
        <div className="modal-footer no-print">
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
          >
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
          >
            🖨️ Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
