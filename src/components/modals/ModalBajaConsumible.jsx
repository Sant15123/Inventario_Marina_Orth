import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ModalBajaConsumible = ({ material, isOpen, onClose, onConfirmarBaja }) => {
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!isOpen || !material) return null;

  const stockDisponible = material.cantidad ?? material.stock ?? material.disponible ?? material.quantity ?? 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cantNum = parseInt(cantidad, 10);
    if (isNaN(cantNum) || cantNum <= 0) {
      alert('La cantidad a dar de baja debe ser mayor a 0.');
      return;
    }

    if (cantNum > stockDisponible) {
      alert(`La cantidad no puede superar el stock disponible (${stockDisponible}).`);
      return;
    }

    try {
      setCargando(true);
      await onConfirmarBaja({
        materialId: material.id,
        cantidadBaja: cantNum,
        motivo: motivo.trim() || 'Baja de material confirmada por administrador'
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al procesar la baja del material.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="font-bold text-base">Dar de Baja Material</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Elemento seleccionado:</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {material.nombre || material.nombre_material || material.material || material.name}
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ID: {material.id_referencia || material.codigo || material.id}
            </span>
            <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-300">Stock Actual en Bodega:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {stockDisponible} {material.unidad_medida || 'und'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cantidad a Dar de Baja *
            </label>
            <input
              type="number"
              min={1}
              max={stockDisponible}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Motivo o Justificación de la Baja *
            </label>
            <textarea
              rows={3}
              maxLength={250}
              placeholder="Ej: Material deteriorado, avería irreversible en taller STEAM..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || stockDisponible <= 0}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
            >
              {cargando ? 'Procesando...' : 'Confirmar Baja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalBajaConsumible;
