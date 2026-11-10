import React from 'react';

export default function DetalleMovimientoModal({ movimiento: rawMovimiento, onClose }) {
  if (!rawMovimiento) return null;

  const movimiento = {
    ...rawMovimiento,
    elemento: rawMovimiento.itemName || rawMovimiento.elemento || rawMovimiento.elemento_nombre || rawMovimiento.material || 'Sin nombre',
    id_referencia: rawMovimiento.itemId || rawMovimiento.id_referencia || rawMovimiento.codigo || rawMovimiento.placa || rawMovimiento.placa_o_id || 'N/A',
    responsable: rawMovimiento.person || rawMovimiento.responsable || 'Bodega Central',
    sede: rawMovimiento.sede || 'OFICINA FMO',
    cantidad: rawMovimiento.qty ?? rawMovimiento.cantidad ?? 1,
    tipo: rawMovimiento.tipo || rawMovimiento.type || 'Actualización',
    fecha: rawMovimiento.date || rawMovimiento.fecha,
    motivo: rawMovimiento.motivo || rawMovimiento.motive || rawMovimiento.detalles || 'Actualización general registrada en el sistema.',
  };

  const cerrarModal = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">
              📋
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base" style={{ margin: 0 }}>Detalle del Movimiento</h3>
              <p className="text-xs text-slate-400 font-medium" style={{ margin: 0, marginTop: '2px' }}>
                Registro #{movimiento.id || 'N/A'} • {movimiento.fecha ? new Date(movimiento.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={cerrarModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tipo de Transacción Banner */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl mb-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Transacción</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ✏️ {movimiento.tipo || 'Actualización'}
          </span>
        </div>

        {/* Rejilla de Datos de Auditoría */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {/* Elemento y Código (Ancho completo) */}
          <div className="col-span-2 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elemento / Material</span>
              <p className="font-bold text-slate-800 text-sm" style={{ margin: 0 }}>{movimiento.elemento || 'Sin nombre'}</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              {movimiento.id_referencia || 'N/A'}
            </span>
          </div>

          {/* Responsable */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Responsable / Custodio</span>
            <p className="font-semibold text-slate-700 text-xs flex items-center gap-1.5 truncate" style={{ margin: 0 }}>
              👤 {movimiento.responsable || 'Bodega Central'}
            </p>
          </div>

          {/* Sede */}
          <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sede Institucional</span>
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
              {movimiento.sede || 'OFICINA FMO'}
            </span>
          </div>

          {/* Cantidad Afectada (Ancho completo) */}
          <div className="col-span-2 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad Afectada</span>
            <span className="font-bold text-slate-800 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              📦 {movimiento.cantidad ?? 1} unidad(es)
            </span>
          </div>
        </div>

        {/* Detalle del Motivo / Cambios Granulares */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl mb-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-emerald-700 text-xs">📝</span>
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Detalle del Cambio / Motivo de Auditoría
            </span>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 min-h-[50px] max-h-28 overflow-y-auto">
            <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap break-words" style={{ margin: 0 }}>
              {movimiento.motivo || 'Actualización general registrada en el sistema.'}
            </p>
          </div>
        </div>

        {/* Botón de Cierre Institucional */}
        <button
          onClick={cerrarModal}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          Cerrar Detalle
        </button>

      </div>
    </div>
  );
}
