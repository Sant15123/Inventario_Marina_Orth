import React from 'react';
import { ArrowDownToLine, X, CheckCircle2, Check } from 'lucide-react';

export default function ModalConfirmarRetorno({
  isOpen,
  onClose,
  prestamo,
  confirmarRetorno,
  cargando = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden flex flex-col"
        style={{
          borderRadius: '16px',
          maxWidth: '28rem', // max-w-md (448px)
          width: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--surface, #0f172a)',
          borderColor: 'var(--line, #1e293b)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con Botón de Cierre */}
        <div
          className="p-5 pb-3 flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80"
          style={{
            borderBottom: '1px solid var(--line, #1e293b)',
            padding: '16px 20px 14px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="w-10 h-10 rounded-xl bg-lime-150/70 dark:bg-lime-950/60 border border-lime-300/60 dark:border-lime-500/30 flex items-center justify-center text-lime-700 dark:text-lime-400"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(132, 204, 22, 0.16)',
                border: '1px solid rgba(132, 204, 22, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#84CC16',
                flexShrink: 0,
              }}
            >
              <ArrowDownToLine className="w-5 h-5" style={{ width: '20px', height: '20px' }} />
            </div>
            <div>
              <span
                className="text-[10px] font-black uppercase tracking-wider text-lime-600 dark:text-lime-400"
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--copper, #84CC16)',
                  display: 'block',
                }}
              >
                Confirmación Operativa
              </span>
              <h3
                className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight"
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--text, #f8fafc)',
                  lineHeight: 1.25,
                }}
              >
                ¿Confirmar Retorno a Bodega?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-dim, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo: Ficha Descriptiva del Activo */}
        <div
          className="p-5 space-y-4"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'var(--surface, #0f172a)',
          }}
        >
          <p
            className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: 'var(--text-dim, #94a3b8)',
              lineHeight: 1.5,
            }}
          >
            Vas a confirmar el reintegro físico de este activo a la bodega institucional.
          </p>

          {/* Tarjeta de Resumen del Activo */}
          <div
            className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2"
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
              borderRadius: '12px',
              border: '1px solid var(--line, #1e293b)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
            >
              <span
                className="text-xs font-bold text-slate-800 dark:text-slate-100"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text, #f8fafc)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {prestamo?.equipo_nombre || prestamo?.itemName || 'Computador portátil'}
              </span>
              <span
                className="px-2 py-0.5 text-[11px] font-black tracking-wide rounded-md bg-lime-100 text-lime-800 dark:bg-lime-950/80 dark:text-lime-300 border border-lime-300/40"
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 900,
                  borderRadius: '6px',
                  backgroundColor: 'rgba(132, 204, 22, 0.15)',
                  color: '#84CC16',
                  border: '1px solid rgba(132, 204, 22, 0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {prestamo?.placa ||
                  (Array.isArray(prestamo?.unitCodes) && prestamo.unitCodes.length > 0
                    ? prestamo.unitCodes.join(', ')
                    : 'P33')}
              </span>
            </div>

            <div
              className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid var(--line, rgba(51, 65, 85, 0.4))',
                fontSize: '11.5px',
                color: 'var(--text-dim, #94a3b8)',
              }}
            >
              <span>Custodio que entrega:</span>
              <span
                className="font-medium text-slate-700 dark:text-slate-300"
                style={{ fontWeight: 600, color: 'var(--text, #e2e8f0)' }}
              >
                {prestamo?.custodio || prestamo?.person || 'Responsable'}
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '11.5px',
              color: '#34d399',
            }}
          >
            <CheckCircle2
              className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              style={{ width: '16px', height: '16px', flexShrink: 0, color: '#10b981' }}
            />
            <span>
              El equipo pasará automáticamente al estado <strong style={{ color: '#34d399' }}>Disponible</strong> en bodega.
            </span>
          </div>
        </div>

        {/* Footer Integrado en Tema Oscuro */}
        <div
          className="p-4 bg-slate-50 dark:bg-[#020617]/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5"
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--surface-2, #0b1320)',
            borderTop: '1px solid var(--line, #1e293b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            style={{
              padding: '7px 15px',
              borderRadius: '10px',
              backgroundColor: 'transparent',
              border: '1px solid var(--line, #334155)',
              color: 'var(--text-dim, #94a3b8)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarRetorno}
            disabled={cargando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#84CC16] hover:bg-[#65A30D] text-slate-950 transition-all shadow-sm cursor-pointer active:scale-95 border-0"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 18px',
              borderRadius: '10px',
              backgroundColor: '#84CC16',
              border: '1px solid #84CC16',
              color: '#020617',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1,
              boxShadow: '0 2px 10px rgba(132, 204, 22, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <Check className="w-3.5 h-3.5" style={{ width: '14px', height: '14px', strokeWidth: 3 }} />
            <span>{cargando ? 'Confirmando...' : 'Confirmar Retorno'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
