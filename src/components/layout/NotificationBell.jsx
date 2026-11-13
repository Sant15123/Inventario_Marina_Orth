import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, Laptop, Box, ShoppingCart, ArrowRight, CheckCircle2 } from 'lucide-react';
import supabase from '../../services/supabase';
import inventoryApi from '../../services/inventoryApi';

/**
 * NotificationBell Component
 * Campanita de notificaciones en tiempo real para la barra de navegación superior (Navbar).
 * Estilizada bajo el sistema de diseño institucional de la Fundación Marina Orth (SIGA).
 */
export default function NotificationBell({ onNavigateToSolicitudes }) {
  const [isOpen, setIsOpen] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [contador, setContador] = useState(0);
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

  // Sincronizar el badge con el conteo o el estado contador
  const unreadCount = Math.max(contador, pendientes.length);

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
      // 1. Intentar consulta directa a Supabase de solicitudes_inventario y solicitudes_compra
      let inventarioList = [];
      let comprasList = [];

      try {
        const { data: invData, error: invErr } = await supabase
          .from('solicitudes_inventario')
          .select('*')
          .eq('estado', 'PENDIENTE')
          .order('creado_en', { ascending: false });
        if (!invErr && Array.isArray(invData)) inventarioList = invData;
      } catch (_) {}

      try {
        const { data: compData, error: compErr } = await supabase
          .from('solicitudes_compra')
          .select('*')
          .eq('estado', 'PENDIENTE')
          .order('creado_en', { ascending: false });
        if (!compErr && Array.isArray(compData)) {
          comprasList = compData.map((sc) => ({
            ...sc,
            tipo_solicitud: 'SUGERENCIA_COMPRA',
            tipo: 'SUGERENCIA_COMPRA',
            nombre_item: sc.nombre_producto,
            motivo: sc.justificacion,
            is_solicitud_compra: true,
          }));
        }
      } catch (_) {}

      if (inventarioList.length > 0 || comprasList.length > 0) {
        const total = [...inventarioList, ...comprasList].sort(
          (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
        );
        setSolicitudes(total);
        setContador(total.length);
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
        setContador(pendientesFallback.length);
      }
    } catch (err) {
      console.warn('Error al obtener solicitudes para notificaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Suscripción a eventos Realtime de Supabase
  useEffect(() => {
    // 1. Conteo y carga inicial
    cargarSolicitudes();

    // 2. Suscripción en vivo al canal Realtime
    let canal = null;
    try {
      canal = supabase
        .channel('solicitudes-inventario-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'solicitudes_inventario',
          },
          (payload) => {
            if (payload?.new && String(payload.new.estado).toUpperCase() === 'PENDIENTE') {
              triggerBadgeAnimation();
              setContador((prev) => prev + 1);
              setSolicitudes((prev) => {
                const filtered = prev.filter((s) => s.id !== payload.new.id);
                return [payload.new, ...filtered];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'solicitudes_inventario',
          },
          (payload) => {
            triggerBadgeAnimation();
            const oldEstado = String(payload.old?.estado || '').toUpperCase();
            const newEstado = String(payload.new?.estado || '').toUpperCase();

            // Si pasa de PENDIENTE a APROBADA o RECHAZADA
            if (oldEstado === 'PENDIENTE' && newEstado !== 'PENDIENTE') {
              setContador((prev) => Math.max(0, prev - 1));
              setSolicitudes((prev) => prev.filter((s) => s.id !== payload.new.id));
            } else if (newEstado === 'PENDIENTE') {
              setSolicitudes((prev) => {
                const exists = prev.some((s) => s.id === payload.new.id);
                if (!exists) {
                  setContador((c) => c + 1);
                  return [payload.new, ...prev];
                }
                return prev.map((s) => (s.id === payload.new.id ? payload.new : s));
              });
            } else {
              setSolicitudes((prev) => prev.filter((s) => s.id !== payload.new.id));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'solicitudes_inventario',
          },
          (payload) => {
            const idEliminado = payload.old?.id;
            if (idEliminado) {
              setContador((prev) => Math.max(0, prev - 1));
              setSolicitudes((prev) => prev.filter((s) => s.id !== idEliminado));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'solicitudes_compra',
          },
          (payload) => {
            if (payload?.new && String(payload.new.estado).toUpperCase() === 'PENDIENTE') {
              triggerBadgeAnimation();
              setContador((prev) => prev + 1);
              const formattedComp = {
                ...payload.new,
                tipo_solicitud: 'SUGERENCIA_COMPRA',
                tipo: 'SUGERENCIA_COMPRA',
                nombre_item: payload.new.nombre_producto,
                motivo: payload.new.justificacion,
                is_solicitud_compra: true,
              };
              setSolicitudes((prev) => [formattedComp, ...prev.filter((s) => s.id !== payload.new.id)]);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'solicitudes_compra',
          },
          (payload) => {
            triggerBadgeAnimation();
            const oldEstado = String(payload.old?.estado || '').toUpperCase();
            const newEstado = String(payload.new?.estado || '').toUpperCase();
            if (oldEstado === 'PENDIENTE' && newEstado !== 'PENDIENTE') {
              setContador((prev) => Math.max(0, prev - 1));
              setSolicitudes((prev) => prev.filter((s) => s.id !== payload.new.id));
            } else if (newEstado === 'PENDIENTE') {
              const formattedComp = {
                ...payload.new,
                tipo_solicitud: 'SUGERENCIA_COMPRA',
                tipo: 'SUGERENCIA_COMPRA',
                nombre_item: payload.new.nombre_producto,
                motivo: payload.new.justificacion,
                is_solicitud_compra: true,
              };
              setSolicitudes((prev) => {
                const exists = prev.some((s) => s.id === payload.new.id);
                if (!exists) {
                  setContador((c) => c + 1);
                  return [formattedComp, ...prev];
                }
                return prev.map((s) => (s.id === payload.new.id ? formattedComp : s));
              });
            } else {
              setSolicitudes((prev) => prev.filter((s) => s.id !== payload.new.id));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'solicitudes_compra',
          },
          (payload) => {
            const idEliminado = payload.old?.id;
            if (idEliminado) {
              setContador((prev) => Math.max(0, prev - 1));
              setSolicitudes((prev) => prev.filter((s) => s.id !== idEliminado));
            }
          }
        )
        .subscribe((status) => {
          console.log('Suscripción Realtime activa:', status);
          if (status === 'SUBSCRIBED') {
            setRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeActive(false);
          }
        });
    } catch (subErr) {
      console.warn('Error configurando canal Realtime Supabase:', subErr);
    }

    // 3. Listener local para sincronización reactiva inmediata entre pestañas o módulos
    const handleLocalSolicitudCreated = (event) => {
      const nuevaSol = event?.detail;
      if (nuevaSol && String(nuevaSol.estado || 'PENDIENTE').toUpperCase() === 'PENDIENTE') {
        triggerBadgeAnimation();
        setContador((prev) => prev + 1);
        setSolicitudes((prev) => {
          const filtered = prev.filter((s) => s.id !== nuevaSol.id);
          return [nuevaSol, ...filtered];
        });
      }
    };

    const handleLocalSolicitudResolved = (event) => {
      const resuelta = event?.detail;
      if (resuelta?.id) {
        setContador((prev) => Math.max(0, prev - 1));
        setSolicitudes((prev) => prev.filter((s) => s.id !== resuelta.id));
      }
    };

    window.addEventListener('siga:solicitud_creada', handleLocalSolicitudCreated);
    window.addEventListener('siga:solicitud_resuelta', handleLocalSolicitudResolved);

    return () => {
      if (canal) {
        supabase.removeChannel(canal);
      }
      window.removeEventListener('siga:solicitud_creada', handleLocalSolicitudCreated);
      window.removeEventListener('siga:solicitud_resuelta', handleLocalSolicitudResolved);
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

  // Helper para detectar si una solicitud es de compra
  const esCompraSolicitud = (sol) => {
    if (!sol) return false;
    const tipo = String(sol.tipo_solicitud || sol.tipo || sol.tipoSolicitud || '').toUpperCase().trim();
    const items = Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0
      ? sol.items_solicitud
      : (Array.isArray(sol.items) ? sol.items : []);
    if (sol.is_solicitud_compra || sol.categoria_destino) return true;
    return (
      tipo === 'SUGERENCIA_COMPRA' ||
      tipo === 'COMPRA' ||
      tipo.includes('COMPRA') ||
      items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || String(i.tipo_item || '').toLowerCase() === 'compra') ||
      (sol.motivo && (
        sol.motivo.toLowerCase().includes('compra') ||
        sol.motivo.toLowerCase().includes('batería') ||
        sol.motivo.toLowerCase().includes('bateria') ||
        sol.motivo.toLowerCase().includes('lipo')
      ))
    );
  };

  const handleVerTodas = () => {
    setIsOpen(false);
    const listaPendientes = pendientes.length > 0 ? pendientes : solicitudes;
    const primeraSol = listaPendientes[0] || null;
    const todasCompras = listaPendientes.length > 0 && listaPendientes.every((s) => esCompraSolicitud(s));
    const masRecienteEsCompra = primeraSol && esCompraSolicitud(primeraSol);

    const destinoCompras = todasCompras || masRecienteEsCompra;
    const targetSection = destinoCompras ? 'compras' : 'solicitudes';
    const tabParam = destinoCompras ? 'compras' : 'entrantes';

    try {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabParam);
      url.searchParams.delete('solicitudId');
      window.history.pushState({}, '', url);
    } catch (e) {
      console.warn(e);
    }

    if (onNavigateToSolicitudes) {
      onNavigateToSolicitudes({
        section: targetSection,
        tab: tabParam,
      });
    }
  };

  const handleSelectSolicitud = (sol) => {
    setIsOpen(false);
    const esCompra = esCompraSolicitud(sol);
    const targetSection = esCompra ? 'compras' : 'solicitudes';
    const tabParam = esCompra ? 'compras' : 'entrantes';

    try {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabParam);
      if (sol?.id) url.searchParams.set('solicitudId', sol.id);
      window.history.pushState({}, '', url);
    } catch (e) {
      console.warn(e);
    }

    if (onNavigateToSolicitudes) {
      onNavigateToSolicitudes({
        section: targetSection,
        tab: tabParam,
        solicitudId: sol?.id || null,
        solicitud: sol,
      });
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
    <div className="relative inline-block" ref={bellRef} style={{ position: 'relative' }}>
      {/* BOTÓN CAMPANITA */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="notification-bell-btn"
        title={
          unreadCount > 0
            ? `${unreadCount} solicitud${unreadCount > 1 ? 'es' : ''} pendiente${unreadCount > 1 ? 's' : ''}`
            : 'Sin solicitudes pendientes'
        }
        aria-label="Notificaciones de solicitudes en tiempo real"
        aria-expanded={isOpen}
      >
        <Bell size={18} />

        {/* BADGE NUMÉRICO ROJO CON ANIMACIÓN SUAVE */}
        {unreadCount > 0 && (
          <span
            className={`notification-badge ${isPulsing ? 'animate-pulse' : ''}`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* BANDEJA DESPLEGABLE INSTITUCIONAL */}
      {isOpen && (
        <div
          className="notification-dropdown"
          role="dialog"
          aria-label="Panel de Notificaciones"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CABECERA */}
          <div className="notification-header">
            <div className="notification-header-left">
              <div className="notification-header-icon">
                <Bell size={16} />
              </div>
              <div>
                <h4 className="notification-header-title">
                  Solicitudes Entrantes
                </h4>
                <div className="notification-header-sub">
                  <span
                    className="notification-live-dot"
                    style={{
                      backgroundColor: realtimeActive ? '#84CC16' : 'var(--text-muted)',
                      boxShadow: realtimeActive ? '0 0 6px rgba(132, 204, 22, 0.8)' : 'none',
                    }}
                  />
                  <span>{realtimeActive ? 'Sincronizado en vivo' : 'Supabase Realtime'}</span>
                </div>
              </div>
            </div>

            {unreadCount > 0 && (
              <span className="notification-count-badge">
                {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
              </span>
            )}
          </div>

          {/* LISTA SCROLLEABLE */}
          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #84CC16',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span style={{ fontSize: '12px' }}>Cargando solicitudes...</span>
              </div>
            ) : pendientes.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <CheckCircle2 size={22} />
                </div>
                <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                  Todo al día
                </strong>
                <p style={{ margin: 0, fontSize: '11.5px', maxWidth: '240px' }}>
                  No hay solicitudes pendientes de revisión en este momento.
                </p>
              </div>
            ) : (
              pendientes.slice(0, 6).map((sol) => {
                const rawTipo = String(sol.tipo_solicitud || sol.tipo || '').toLowerCase().trim();
                const esCompra = rawTipo === 'compra' || rawTipo === 'sugerencia_compra' || rawTipo.includes('compra');
                const esPrestamo = !esCompra && (
                  rawTipo === 'prestamo_equipo' ||
                  rawTipo === 'equipo' ||
                  rawTipo === 'prestamo' ||
                  Boolean(sol.placa)
                );

                return (
                  <div
                    key={sol.id}
                    onClick={() => handleSelectSolicitud(sol)}
                    className="notification-item"
                    role="button"
                    tabIndex={0}
                  >
                    {/* Icono Equipo / Consumible / Compra */}
                    <div
                      className={`notification-item-icon ${
                        esCompra ? 'compra' : esPrestamo ? 'equipo' : 'consumible'
                      }`}
                    >
                      {esCompra ? (
                        <ShoppingCart size={18} />
                      ) : esPrestamo ? (
                        <Laptop size={18} />
                      ) : (
                        <Box size={18} />
                      )}
                    </div>

                    {/* Información */}
                    <div className="notification-item-body">
                      <div className="notification-item-header">
                        <span className="notification-item-user">
                          {sol.usuario_nombre || 'Docente / Custodio'}
                        </span>
                        <span className="notification-item-time">
                          {formatTimeAgo(sol.creado_en || sol.created_at)}
                        </span>
                      </div>

                      <p className="notification-item-desc">
                        {sol.motivo || sol.observaciones || 'Solicitud de material para formación STEAM'}
                      </p>

                      <div className="notification-item-footer">
                        {sol.sede && (
                          <span className="notification-sede-chip">
                            📍 {sol.sede}
                          </span>
                        )}
                        <span className="notification-status-chip">
                          PENDIENTE
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PIE DE BANDEJA */}
          <div className="notification-footer">
            <button
              type="button"
              onClick={handleVerTodas}
              className="notification-btn-all"
            >
              <span>Ver todas las solicitudes</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
