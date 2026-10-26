import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, Inbox, Laptop, Box, ArrowRight, CheckCircle2, Radio } from 'lucide-react';
import supabase from '../../services/supabase';
import inventoryApi from '../../services/inventoryApi';

/**
 * NotificationBell Component
 * Campanita de notificaciones en tiempo real para la barra de navegación superior (Navbar).
 * Se conecta a Supabase Realtime sobre la tabla `solicitudes_inventario` para escuchar
 * eventos INSERT, UPDATE y DELETE de solicitudes pendientes.
 */
export default function NotificationBell({ onNavigateToSolicitudes }) {
  const [isOpen, setIsOpen] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPulsing, setIsPulsing] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const bellRef = useRef(null);

  // Filtrar estrictamente solicitudes con estado PENDIENTE
  const pendientes = useMemo(() => {
    return solicitudes.filter(
      (s) => String(s.estado || 'PENDIENTE').toUpperCase() === 'PENDIENTE'
    );
  }, [solicitudes]);

  const unreadCount = pendientes.length;

  // Activar animación suave en el badge
  const triggerBadgeAnimation = () => {
    setIsPulsing(true);
    setTimeout(() => {
      setIsPulsing(false);
    }, 1200);
  };

  // Carga inicial de solicitudes pendientes desde Supabase (con fallback tolerante a la API REST)
  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      // 1. Intentar consulta directa a Supabase
      const { data, error } = await supabase
        .from('solicitudes_inventario')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('creado_en', { ascending: false });

      if (!error && Array.isArray(data)) {
        setSolicitudes(data);
        return;
      }

      // 2. Si Supabase devuelve error de autenticación/clave o red, usar fallback tolerante de la API
      console.warn('Aviso Supabase solicitudes, usando servicio local:', error?.message);
      const fallbackData = await inventoryApi.getSolicitudes();
      if (Array.isArray(fallbackData)) {
        const pendientesFallback = fallbackData.filter(
          (s) => String(s.estado || 'PENDIENTE').toUpperCase() === 'PENDIENTE'
        );
        setSolicitudes(pendientesFallback);
      }
    } catch (err) {
      console.warn('Error al obtener solicitudes para notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Suscripción a eventos Realtime de Supabase
  useEffect(() => {
    cargarSolicitudes();

    let channel = null;
    try {
      channel = supabase
        .channel('solicitudes_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'solicitudes_inventario' },
          (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            triggerBadgeAnimation();

            setSolicitudes((prev) => {
              if (eventType === 'INSERT') {
                if (String(newRecord.estado || '').toUpperCase() === 'PENDIENTE') {
                  const filtered = prev.filter((item) => item.id !== newRecord.id);
                  return [newRecord, ...filtered];
                }
                return prev;
              }

              if (eventType === 'UPDATE') {
                if (String(newRecord.estado || '').toUpperCase() === 'PENDIENTE') {
                  const exists = prev.some((item) => item.id === newRecord.id);
                  return exists
                    ? prev.map((item) => (item.id === newRecord.id ? newRecord : item))
                    : [newRecord, ...prev];
                } else {
                  // Si cambió a APROBADA o RECHAZADA, se retira de la lista pendiente
                  return prev.filter((item) => item.id !== newRecord.id);
                }
              }

              if (eventType === 'DELETE') {
                return prev.filter((item) => item.id !== oldRecord.id);
              }

              return prev;
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeActive(false);
          }
        });
    } catch (subErr) {
      console.warn('Error configurando canal Realtime Supabase:', subErr);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Cerrar el popover al hacer clic afuera o con tecla Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleVerTodas = () => {
    setIsOpen(false);
    if (onNavigateToSolicitudes) {
      onNavigateToSolicitudes();
    }
  };

  const handleSelectSolicitud = (_sol) => {
    setIsOpen(false);
    if (onNavigateToSolicitudes) {
      onNavigateToSolicitudes();
    }
  };

  // Formato relativo de tiempo
  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Reciente';
    try {
      const date = new Date(dateString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div className="relative inline-block" ref={bellRef}>
      {/* BOTÓN CAMPANITA */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="notification-bell-btn relative p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#84cc16]/50"
        title={
          unreadCount > 0
            ? `${unreadCount} solicitud${unreadCount > 1 ? 'es' : ''} pendiente${unreadCount > 1 ? 's' : ''}`
            : 'Sin solicitudes pendientes'
        }
        aria-label="Notificaciones de solicitudes en tiempo real"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform duration-200 hover:scale-105" />

        {/* BADGE NUMÉRICO ROJO CON ANIMACIÓN SUAVE */}
        {unreadCount > 0 && (
          <span
            className={`notification-badge absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 shadow-md transition-all duration-300 pointer-events-none ${
              isPulsing ? 'scale-125 ring-4 ring-rose-400/40 animate-pulse' : 'scale-100'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* POPUP / BANDEJA DESPLEGABLE */}
      {isOpen && (
        <div
          className="notification-dropdown absolute right-0 mt-2.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2"
          role="dialog"
          aria-label="Panel de Notificaciones"
        >
          {/* HEADER DEL POPUP */}
          <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#84cc16]/15 text-[#84cc16] rounded-lg">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  Solicitudes Entrantes
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      realtimeActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                    }`}
                  />
                  <span>{realtimeActive ? 'Sincronizado en vivo' : 'Supabase Realtime'}</span>
                </div>
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* LISTA DE NOTIFICACIONES */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#84cc16] border-t-transparent rounded-full animate-spin" />
                <span>Cargando solicitudes...</span>
              </div>
            ) : pendientes.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Todo al día
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  No hay solicitudes pendientes de revisión en este momento.
                </p>
              </div>
            ) : (
              pendientes.slice(0, 5).map((sol) => {
                const esPrestamo =
                  sol.tipo_solicitud === 'PRESTAMO_EQUIPO' ||
                  sol.tipo_solicitud === 'equipo' ||
                  sol.placa;
                return (
                  <div
                    key={sol.id}
                    onClick={() => handleSelectSolicitud(sol)}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group flex items-start gap-3"
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        esPrestamo
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                      }`}
                    >
                      {esPrestamo ? (
                        <Laptop className="w-4 h-4" />
                      ) : (
                        <Box className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-[#84cc16] transition-colors">
                          {sol.usuario_nombre || 'Docente / Custodio'}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimeAgo(sol.creado_en || sol.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                        {sol.motivo || sol.observaciones || 'Sin motivo detallado'}
                      </p>

                      <div className="flex items-center gap-2">
                        {sol.sede && (
                          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            📍 {sol.sede}
                          </span>
                        )}
                        <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                          PENDIENTE
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER DEL POPUP */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleVerTodas}
              className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-[#84cc16] hover:bg-[#84cc16]/10 dark:hover:bg-[#84cc16]/15 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm group"
            >
              <span>Ver todas las solicitudes</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-[#84cc16]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
