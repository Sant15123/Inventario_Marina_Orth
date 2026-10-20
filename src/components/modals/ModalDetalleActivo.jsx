import React from 'react';
import { QrCode, Pencil } from 'lucide-react';

/**
 * ModalDetalleActivo: Componente modal unificado para consultar la ficha técnica
 * y detalle completo de un equipo tecnológico o material consumible.
 * Soporta consulta, visualización de todos los 21 campos técnicos/financieros,
 * botón para generar/imprimir QR y botón para disparar la edición del equipo.
 */
export default function ModalDetalleActivo({
  item,
  onClose,
  onEdit,
  onOpenQR,
}) {
  if (!item) return null;

  const esEquipo = Boolean(
    item.isEquipo || item.serial || item.placa || item.marca || item.area || item.itemType === 'equipo'
  );

  // Estado operativo inferido o explícito
  const rawEstado = (item.estado || item.status || item.condicion || '').toLowerCase();
  const esPrestado = rawEstado.includes('prest') || Boolean(item.custodio && item.custodio !== 'Bodega Central');
  const estadoLabel = esPrestado
    ? 'En Campo'
    : esEquipo
      ? (item.estado || 'En Bodega')
      : (item.estado || 'Disponible');
  const estadoIsWarning =
    esPrestado ||
    estadoLabel.toLowerCase().includes('mantenimiento') ||
    estadoLabel.toLowerCase().includes('reparaci');

  // Helper para renderizar campos tipo Key-Value (Etiqueta: Valor)
  const renderKeyValue = (label, val, { isMono = false, isAccent = false } = {}) => {
    const isEmpty = val === null || val === undefined || val === '' || val === '—';
    return (
      <div className="flex flex-col gap-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span
          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
          style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}
        >
          {label}:
        </span>
        <span
          className={`text-sm ${
            isEmpty
              ? 'text-slate-400 dark:text-slate-500 font-normal'
              : isAccent
                ? 'font-bold text-lime-600 dark:text-lime-400'
                : 'font-semibold text-slate-900 dark:text-slate-100'
          } ${isMono ? 'font-mono' : ''}`}
          style={{ fontSize: '13.5px', lineHeight: 1.35 }}
        >
          {isEmpty ? '—' : val}
        </span>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      {/* Contenedor Modal Universal */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0b1320] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-slate-800 dark:text-slate-200 transition-colors"
        style={{
          backgroundColor: 'var(--surface, #0b1320)',
          border: '1px solid var(--line, #1e293b)',
          borderRadius: '16px',
          maxWidth: '56rem',
          width: '100%',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '20px 24px',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal con Jerarquía Visual */}
        <div
          className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--line, #1e293b)',
            marginBottom: '14px',
            flexShrink: 0,
          }}
        >
          <div
            className="flex items-center gap-3 min-w-0 flex-wrap"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}
          >
            {/* Badge de Placa / Identificador adaptado al tema institucional */}
            <span
              className="px-3 py-1 rounded-md text-xs font-mono font-bold tracking-wider shrink-0 transition-colors"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                flexShrink: 0,
                backgroundColor: esEquipo
                  ? 'rgba(56, 189, 248, 0.12)'
                  : 'rgba(171, 222, 22, 0.16)',
                color: esEquipo ? '#0284c7' : '#65a30d',
                border: esEquipo
                  ? '1px solid rgba(56, 189, 248, 0.4)'
                  : '1px solid rgba(171, 222, 22, 0.45)',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              {item.placa || item.codigo || item.id || 'S/C'}
            </span>

            {/* Nombre del Elemento */}
            <h3
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate m-0"
              style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {item.nombre || item.equipo || item.material || item.name}
            </h3>

            {/* Badge de Estado Operativo */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                estadoIsWarning
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${estadoIsWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {estadoLabel}
            </span>
          </div>

          {/* Acciones Superiores: Código QR y Cerrar (Alineación horizontal limpia y espaciada) */}
          <div
            className="flex items-center gap-3 shrink-0 ml-auto pl-2"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            {onOpenQR && (
              <button
                type="button"
                onClick={() => onOpenQR(item)}
                className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold shadow-sm"
                title="Generar e imprimir Código QR"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#38bdf8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Código QR</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-sm"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--line, #334155)',
                backgroundColor: 'var(--surface-2, #1e293b)',
                color: 'var(--text-dim, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '15px',
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido en 3 Bloques en Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 overflow-y-auto"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          {/* BLOQUE 1: Identificación / Operativos */}
          <div
            className="bg-slate-50/80 dark:bg-[#131b26] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--surface-2, #131b26)',
              border: '1px solid var(--line, #1e293b)',
              padding: '14px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-2">
              <span className="text-sm">🏷️</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 m-0">
                Identificación y Clasificación
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {renderKeyValue('Categoría', item.categoria || item.category)}
              {renderKeyValue('Condición', item.condicion || item.estado_fisico || 'Bueno')}
              {renderKeyValue('Área / Proceso', item.area || 'Tecnología')}
              {renderKeyValue(
                'Stock Registrado',
                `${item.cantidad || 1} und (${item.disponible !== undefined ? item.disponible : 1} disp.)`
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Descripción General:
              </span>
              <p
                className="text-xs text-slate-700 dark:text-slate-300 m-0 leading-relaxed"
                style={{ fontSize: '13px', lineHeight: 1.45 }}
              >
                {item.descripcion ||
                  item.description ||
                  `Equipo estándar registrado bajo la placa ${item.placa || item.codigo || '—'}.`}
              </p>
            </div>
          </div>

          {/* BLOQUE 2: Ficha Técnica y Asignación */}
          <div
            className="bg-slate-50/80 dark:bg-[#131b26] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--surface-2, #131b26)',
              border: '1px solid var(--line, #1e293b)',
              padding: '14px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-2">
              <span className="text-sm">⚙️</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 m-0">
                Ficha Técnica y Asignación
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {renderKeyValue('Marca / Fabricante', item.marca || 'Estándar')}
              {renderKeyValue('Modelo Técnico', item.modelo || item.model || 'Estándar')}
              {renderKeyValue('Serial de Fábrica', item.serial, { isMono: true })}
              {renderKeyValue(
                'Responsable / Custodio',
                item.responsable || item.custodio || 'Bodega Central'
              )}

              {/* Sede y Estante/Caja */}
              <div className="flex flex-col gap-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sede / Ubicación:
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.ubicacion || item.sede || 'Oficina Medellín'}
                </span>
              </div>

              <div className="flex flex-col gap-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estante / Caja / Gaveta:
                </span>
                {item.ubicacion_estante ? (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-lime-50 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300 border border-lime-200 dark:border-lime-700/60 w-fit"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(171, 222, 22, 0.16)',
                      border: '1px solid rgba(171, 222, 22, 0.45)',
                      color: 'var(--green, #4d7c0f)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <span>📦</span>
                    <span>{item.ubicacion_estante}</span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">—</span>
                )}
              </div>
            </div>

            {/* Especificaciones Rápidas */}
            {esEquipo && (item.caracteristica_1 || item.caracteristica_2 || item.caracteristica_3) && (
              <div
                className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-1.5"
                style={{ paddingTop: '8px', borderTop: '1px solid var(--line, #1e293b)' }}
              >
                {item.caracteristica_1 && (
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-mono text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    💻 {item.caracteristica_1}
                  </span>
                )}
                {item.caracteristica_2 && (
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-mono text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    ⚡ {item.caracteristica_2}
                  </span>
                )}
                {item.caracteristica_3 && (
                  <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-mono text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    💾 {item.caracteristica_3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* BLOQUE 3: Adquisición, Garantía y Credenciales */}
          <div
            className="md:col-span-2 bg-slate-50/80 dark:bg-[#131b26] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3"
            style={{
              gridColumn: '1 / -1',
              backgroundColor: 'var(--surface-2, #131b26)',
              border: '1px solid var(--line, #1e293b)',
              padding: '14px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/60 pb-2">
              <span className="text-sm">🛡️</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 m-0">
                Adquisición, Garantía y Credenciales
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
              {renderKeyValue('Proveedor', item.proveedor)}
              {renderKeyValue(
                'Valor Compra',
                item.valor_compra != null && item.valor_compra !== ''
                  ? `$ ${Number(item.valor_compra).toLocaleString('es-CO')}`
                  : null
              )}
              {renderKeyValue(
                'Fecha Compra',
                item.fecha_compra ? item.fecha_compra.split('T')[0] : '—'
              )}
              {renderKeyValue(
                'Vencimiento Garantía',
                item.fecha_vencimiento_garantia || item.garantia
                  ? (item.fecha_vencimiento_garantia || item.garantia).split('T')[0]
                  : '—'
              )}
            </div>

            <div
              className="pt-2.5 border-t border-slate-200 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
              style={{ paddingTop: '10px', borderTop: '1px solid var(--line, #1e293b)' }}
            >
              {esEquipo && (
                <div className="flex flex-col gap-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
                    Claves / Credenciales:
                  </span>
                  <span className={`font-mono text-xs ${item.claves_otros ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`} style={{ fontSize: '12.5px' }}>
                    {item.claves_otros || '—'}
                  </span>
                </div>
              )}
              <div className={`flex flex-col gap-1 min-w-0 ${!esEquipo ? 'col-span-2' : ''}`} style={!esEquipo ? { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '3px' } : { display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
                  Observaciones:
                </span>
                <p className={`text-xs ${item.observaciones || item.notas || item.notes ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 italic'} line-clamp-2 m-0 leading-relaxed`} style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
                  {item.observaciones || item.notas || item.notes || 'Sin observaciones registradas.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra Inferior de Acciones (Footer Fijo con Jerarquía Clara) */}
        <div
          className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0"
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid var(--line, #1e293b)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Botón Principal (Verde Lima Corporativo) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onEdit) onEdit(item);
            }}
            className="bg-[#84CC16] hover:bg-[#65A30D] text-slate-900 font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors cursor-pointer text-xs sm:text-sm"
            style={{
              backgroundColor: '#84CC16',
              color: '#0f172a',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>{esEquipo ? 'Editar este equipo' : 'Editar este material'}</span>
          </button>

          {/* Botón Secundario / Neutro */}
          <button
            type="button"
            onClick={onClose}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--line, #cbd5e1)',
              color: 'var(--text-dim, #64748b)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
