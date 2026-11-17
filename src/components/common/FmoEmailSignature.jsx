import React, { useState } from 'react';
import { Mail, Check, Copy } from 'lucide-react';

/**
 * FmoEmailSignature - Plantilla Oficial de Firma y Notificación para Correo Electrónico
 * (Fundación Marina Orth - Manual de Identidad Visual v1.0, Página 17)
 *
 * REGLAS TÉCNICAS:
 * 1. Tipografía reglamentaria para correspondencia y correos externos: 'Aptos', 'Poppins', sans-serif.
 * 2. Banner institucional bicolor:
 *    - Tramo izquierdo en Verde FMO (#abd037): Datos del responsable, cargo y territorio.
 *    - Tramo derecho en Morado Estratégico (#7b2cbf): Logotipo oficial institucional en blanco (#FFFFFF).
 * 3. Funcionalidad: Permite copiar el bloque HTML con estilos inline para pegar en Outlook, Gmail o M365.
 */
export default function FmoEmailSignature({
  nombre = 'Santiago Galeano',
  cargo = 'Administrador de Inventario & Bodega Central',
  sede = 'Sede Medellín - Bodega Central STEAM',
  telefono = '(+574) 322 37 39',
  email = 'inventario@fundorth.org',
  asunto = '',
  mensajeCuerpo = '',
  className = '',
  style = {},
}) {
  const [copied, setCopied] = useState(false);

  // Generador de código HTML con estilos inline puros para máxima compatibilidad con clientes de correo
  const generateInlineHtml = () => {
    return `
<div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; max-width: 620px; color: #013a52; line-height: 1.5; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  ${
    asunto
      ? `<div style="padding-bottom: 12px; border-bottom: 2px solid #abd037; margin-bottom: 14px;">
           <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #013a52;">${asunto}</h3>
         </div>`
      : ''
  }
  ${
    mensajeCuerpo
      ? `<div style="font-size: 13.5px; color: #334155; margin-bottom: 18px; line-height: 1.6;">
           ${mensajeCuerpo}
         </div>`
      : ''
  }
  
  <!-- Banner de Firma Institucional Bicolor Oficial FMO (Página 17) -->
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <tr>
      <!-- Tramo Izquierdo: Verde FMO (#abd037) con datos del responsable -->
      <td style="background-color: #abd037; padding: 14px 18px; vertical-align: middle; width: 68%;">
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 14px; font-weight: 800; color: #013a52; line-height: 1.2;">
          ${nombre}
        </div>
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 11px; font-weight: 600; color: #013a52; opacity: 0.9; margin-top: 2px;">
          ${cargo}
        </div>
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 10px; color: #013a52; margin-top: 4px;">
          📍 ${sede} · 📞 ${telefono}
        </div>
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 10px; font-weight: 700; color: #013a52; margin-top: 2px;">
          ✉️ <a href="mailto:${email}" style="color: #013a52; text-decoration: underline;">${email}</a>
        </div>
      </td>

      <!-- Tramo Derecho: Morado Estratégico (#7b2cbf) con logotipo institucional en blanco -->
      <td style="background-color: #7b2cbf; padding: 14px 16px; text-align: center; vertical-align: middle; width: 32%;">
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 11px; font-weight: 900; color: #ffffff; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.15;">
          MARINA ORTH
        </div>
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 8.5px; font-weight: 700; color: #abd037; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 2px;">
          FOUNDATION
        </div>
        <div style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 7.5px; color: #ffffff; opacity: 0.85; margin-top: 4px; letter-spacing: 0.05em;">
          EDUCATING FOR THE FUTURE
        </div>
        <div style="margin-top: 6px;">
          <a href="https://www.fundorth.org" target="_blank" style="font-family: 'Aptos', 'Poppins', Arial, sans-serif; font-size: 8.5px; font-weight: 800; color: #ffffff; text-decoration: none; border-bottom: 1px dotted #abd037;">
            www.fundorth.org
          </a>
        </div>
      </td>
    </tr>
  </table>
</div>
`.trim();
  };

  const handleCopyHtml = async () => {
    try {
      const html = generateInlineHtml();
      if (navigator?.clipboard?.write) {
        // Copiar como HTML rico y texto plano simultáneamente
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          }),
        ]);
      } else if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(html);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Error al copiar al portapapeles:', e);
      setCopied(false);
    }
  };

  return (
    <div
      className={`fmo-email-template p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
      style={{
        fontFamily: "'Aptos', 'Poppins', sans-serif",
        ...style,
      }}
    >
      {/* Barra de Herramientas Superior */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-[#7b2cbf]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Plantilla de Correo & Firma Bicolor (Página 17)
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyHtml}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#abd037] hover:bg-[#96b82d] text-[#013a52] transition-all shadow-xs cursor-pointer"
          title="Copiar HTML formateado para pegar directamente en Outlook, Gmail o correo"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? '¡Copiado al portapapeles!' : 'Copiar para Correo'}</span>
        </button>
      </div>

      {/* Previsualización del Contenido */}
      {asunto && (
        <h4 className="text-sm font-extrabold text-[#013a52] dark:text-white mb-2 pb-1 border-b border-[#abd037]/40">
          {asunto}
        </h4>
      )}

      {mensajeCuerpo && (
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-line leading-relaxed">
          {mensajeCuerpo}
        </div>
      )}

      {/* Banner de Firma Institucional Bicolor Oficial */}
      <div className="overflow-hidden rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row">
          {/* Tramo Izquierdo: Verde FMO (#abd037) */}
          <div className="bg-[#abd037] p-3.5 sm:w-2/3 flex flex-col justify-center text-[#013a52]">
            <strong className="text-sm font-black leading-tight">{nombre}</strong>
            <span className="text-[11px] font-bold opacity-90">{cargo}</span>
            <div className="text-[10px] opacity-80 mt-1">
              📍 {sede} · 📞 {telefono}
            </div>
            <div className="text-[10px] font-bold mt-0.5">
              ✉️ <a href={`mailto:${email}`} className="underline hover:opacity-100">{email}</a>
            </div>
          </div>

          {/* Tramo Derecho: Morado Estratégico (#7b2cbf) con logo en blanco */}
          <div className="bg-[#7b2cbf] p-3.5 sm:w-1/3 flex flex-col items-center justify-center text-center text-white">
            <span className="text-[11px] font-black tracking-wider uppercase leading-tight">
              MARINA ORTH
            </span>
            <span className="text-[8.5px] font-bold text-[#abd037] tracking-widest uppercase">
              FOUNDATION
            </span>
            <span className="text-[7.5px] opacity-90 mt-1 uppercase tracking-wider">
              EDUCATING FOR THE FUTURE
            </span>
            <span className="text-[8.5px] font-bold mt-1.5 border-b border-[#abd037] text-white">
              www.fundorth.org
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
