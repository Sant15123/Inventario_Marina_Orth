import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Bell, Laptop, Box, ShoppingCart, ArrowRight, CheckCircle2 } from 'lucide-react';
import supabase from '../../services/supabase';
import inventoryApi from '../../services/inventoryApi';
import { useAuth } from '../../context/AuthContext';
import { normalizeProyectoNombre } from '../../constants/proyectos';

/**
 * NotificationBell Component
 * Campanita de notificaciones en tiempo real para la barra de navegación superior (Navbar).
 * Estilizada bajo el sistema de diseño institucional de la Fundación Marina Orth (SIGA).
 */
export default function NotificationBell({ onNavigateToSolicitudes }) {
  const { currentUser, isCoordinador, isAdmin } = useAuth();
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
      (s) => String(s.estado || 'PENDIENTE').toUpperCase().includes('PENDIENTE')
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

  // Helper para verificar si una solicitud pertenece a los proyectos asignados al Coordinador
  const matchProyectoCoordinador = useCallback(
    (sol) => {
      if (!isCoordinador) return true;
      const raw = currentUser?.proyectos_asignados;
      let misProyectos = [];
      if (Array.isArray(raw)) misProyectos = raw;
      else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) misProyectos = parsed;
        } catch (_) {
          misProyectos = [raw];
        }
      }
      if (!misProyectos || misProyectos.length === 0) return false;

      const pNom = normalizeProyectoNombre(sol.proyecto_steam || sol.proyecto_steam_id || sol.proyecto || '');
      const pId = String(sol.proyecto_steam_id || '');
      const pRaw = String(sol.proyecto_steam || sol.proyecto || '').trim().toLowerCase();

      return misProyectos.some((mp) => {
        const mpNorm = normalizeProyectoNombre(mp);
        return (
          mpNorm === pNom ||
          (pId && String(mp) === pId) ||
          String(mp).trim().toLowerCase() === pRaw
        );
      });
    },
    [isCoordinador, currentUser?.proyectos_asignados]
  );

  // Carga inicial de solicitudes pendientes desde Supabase
  const cargarSolicitudes = async () => {
    try {
      setLoading(true);

      // A. Para rol COORDINADOR: Conectar DIRECTA Y EXCLUSIVAMENTE a la tabla 'solicitudes_compra'
      if (isCoordinador) {
        if (supabase) {
          const { data: compData, error: compErr } = await supabase
            .from('solicitudes_compra')
            .select('*')
            .or('estado.ilike.pendiente,estado.ilike.pendientes,estado.eq.Pendiente,estado.eq.PENDIENTE')
            .order('creado_en', { ascending: false });

          if (!compErr && Array.isArray(compData)) {
            const list = compData
              .filter(matchProyectoCoordinador)
              .map((sc) => ({
                ...sc,
                id: sc.id,
                tipo_solicitud: 'SUGERENCIA_COMPRA',
                tipo: 'SUGERENCIA_COMPRA',
                nombre_item: sc.nombre_producto || sc.justificacion || 'Producto sugerido',
                motivo: sc.justificacion || sc.motivo || 'Solicitud de compra pendiente',
                fecha: sc.creado_en || sc.created_at,
                creado_en: sc.creado_en || sc.created_at,
                sede: sc.sede || sc.sede_destino || 'Medellín',
                usuario_nombre: sc.solicitante_nombre || sc.usuario_nombre || 'Docente FMO',
                is_solicitud_compra: true,
              }));
            setSolicitudes(list);
            setContador(list.length);
            return;
          }
        }
        setSolicitudes([]);
        setContador(0);
        return;
      }

      // B. Para otros roles administrativos (Administrador / Operador):
      let inventarioList = [];
      let comprasList = [];
      let invError = null;
      let compError = null;

      try {
        const { data: invData, error: invErr } = await supabase
          .from('solicitudes_inventario')
          .select('*')
          .or('estado.ilike.pendiente,estado.ilike.pendientes')
          .order('creado_en', { ascending: false });

        if (!invErr && Array.isArray(invData)) {
          // Filtrar estrictamente: descartar registros huérfanos que sean de compras (se gestionan en solicitudes_compra)
          inventarioList = invData.filter((s) => {
            const t = String(s.tipo_solicitud || s.tipo || '').toUpperCase();
            return t !== 'SUGERENCIA_COMPRA' && t !== 'COMPRA';
          });
        } else if (invErr) {
          invError = invErr;
        }
      } catch (e1) {
        invError = e1;
      }

      try {
        const { data: compData, error: compErr } = await supabase
          .from('solicitudes_compra')
          .select('*')
          .or('estado.ilike.pendiente,estado.ilike.pendientes,estado.eq.Pendiente,estado.eq.PENDIENTE')
          .order('creado_en', { ascending: false });

        if (!compErr && Array.isArray(compData)) {
          comprasList = compData.map((sc) => ({
            ...sc,
            id: sc.id,
            tipo_solicitud: 'SUGERENCIA_COMPRA',
            tipo: 'SUGERENCIA_COMPRA',
            nombre_item: sc.nombre_producto || sc.justificacion || 'Producto sugerido',
            motivo: sc.justificacion || sc.motivo || 'Solicitud de compra pendiente',
            fecha: sc.creado_en || sc.created_at,
            creado_en: sc.creado_en || sc.created_at,
            sede: sc.sede || sc.sede_destino || 'Medellín',
            usuario_nombre: sc.solicitante_nombre || sc.usuario_nombre || 'Docente FMO',
            is_solicitud_compra: true,
          }));
        } else if (compErr) {
          compError = compErr;
        }
      } catch (e2) {
        compError = e2;
      }

      if (!invError && !compError) {
        const total = [...inventarioList, ...comprasList].sort(
          (a, b) => new Date(b.creado_en || b.created_at || 0) - new Date(a.creado_en || a.created_at || 0)
        );
        setSolicitudes(total);
        setContador(total.length);
        return;
      }

      // Si sólo respondió la consulta de compras sin error
      if (!compError && Array.isArray(comprasList)) {
        setSolicitudes(comprasList);
        setContador(comprasList.length);
        return;
      }

      setSolicitudes([]);
      setContador(0);
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
      if (supabase) {
        let canalBuilder = supabase.channel('notificaciones-siga-realtime');

        // Escuchar eventos en solicitudes_compra
        canalBuilder = canalBuilder
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'solicitudes_compra',
            },
            (payload) => {
              if (payload?.new && String(payload.new.estado || '').toUpperCase().includes('PENDIENTE')) {
                if (isCoordinador && !matchProyectoCoordinador(payload.new)) {
                  return;
                }
                triggerBadgeAnimation();
                const formattedComp = {
                  ...payload.new,
                  id: payload.new.id,
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  tipo: 'SUGERENCIA_COMPRA',
                  nombre_item: payload.new.nombre_producto || payload.new.justificacion || 'Producto sugerido',
                  motivo: payload.new.justificacion || payload.new.motivo || 'Solicitud de compra pendiente',
                  fecha: payload.new.creado_en || payload.new.created_at || new Date().toISOString(),
                  creado_en: payload.new.creado_en || payload.new.created_at || new Date().toISOString(),
                  sede: payload.new.sede || payload.new.sede_destino || 'Medellín',
                  usuario_nombre: payload.new.solicitante_nombre || payload.new.usuario_nombre || 'Docente FMO',
                  is_solicitud_compra: true,
                };
                setContador((prev) => prev + 1);
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
              const newEstado = String(payload.new?.estado || '').toUpperCase();
              const pertenece = matchProyectoCoordinador(payload.new);
              if (newEstado.includes('PENDIENTE') && pertenece) {
                const formattedComp = {
                  ...payload.new,
                  id: payload.new.id,
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  tipo: 'SUGERENCIA_COMPRA',
                  nombre_item: payload.new.nombre_producto || payload.new.justificacion || 'Producto sugerido',
                  motivo: payload.new.justificacion || payload.new.motivo || 'Solicitud de compra pendiente',
                  fecha: payload.new.creado_en || payload.new.created_at,
                  creado_en: payload.new.creado_en || payload.new.created_at,
                  sede: payload.new.sede || payload.new.sede_destino || 'Medellín',
                  usuario_nombre: payload.new.solicitante_nombre || payload.new.usuario_nombre || 'Docente FMO',
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
                setSolicitudes((prev) => {
                  const exists = prev.some((s) => s.id === payload.new.id);
                  if (exists) {
                    setContador((prev) => Math.max(0, prev - 1));
                    return prev.filter((s) => s.id !== payload.new.id);
                  }
                  return prev;
                });
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
          );

        // Si NO es rol Coordinador, escuchar también solicitudes_inventario (préstamos físicos)
        if (!isCoordinador) {
          canalBuilder = canalBuilder
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'solicitudes_inventario',
              },
              (payload) => {
                const t = String(payload.new?.tipo_solicitud || payload.new?.tipo || '').toUpperCase();
                if (t === 'SUGERENCIA_COMPRA' || t === 'COMPRA') return;
                if (payload?.new && String(payload.new.estado).toUpperCase() === 'PENDIENTE') {
                  triggerBadgeAnimation();
                  setContador((prev) => prev + 1);
                  setSolicitudes((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]);
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
                const oldEstado = String(payload.old?.estado || '').toUpperCase();
                const newEstado = String(payload.new?.estado || '').toUpperCase();
                if (oldEstado === 'PENDIENTE' && newEstado !== 'PENDIENTE') {
                  setContador((prev) => Math.max(0, prev - 1));
                  setSolicitudes((prev) => prev.filter((s) => s.id !== payload.new.id));
                } else if (newEstado === 'PENDIENTE') {
                  setSolicitudes((prev) => {
                    const exists = prev.some((s) => s.id === payload.new.id);
                    if (!exists) setContador((c) => c + 1);
                    return exists ? prev.map((s) => (s.id === payload.new.id ? payload.new : s)) : [payload.new, ...prev];
                  });
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
            );
        }

        canal = canalBuilder.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeActive(false);
          }
        });
      }
    } catch (subErr) {
      console.warn('Error configurando canal Realtime Supabase:', subErr);
    }

    // 3. Listener local para sincronización reactiva inmediata entre pestañas o módulos
    const handleLocalSolicitudCreated = (event) => {
      const nuevaSol = event?.detail;
      if (nuevaSol) {
        const est = String(nuevaSol.estado || 'PENDIENTE').toUpperCase();
        if (est.includes('PENDIENTE')) {
          triggerBadgeAnimation();
          const formatted = {
            ...nuevaSol,
            id: nuevaSol.id,
            tipo_solicitud: 'SUGERENCIA_COMPRA',
            tipo: 'SUGERENCIA_COMPRA',
            nombre_item: nuevaSol.nombre_producto || nuevaSol.nombre_item || nuevaSol.justificacion || 'Producto sugerido',
            motivo: nuevaSol.justificacion || nuevaSol.motivo || 'Solicitud de compra pendiente',
            fecha: nuevaSol.creado_en || nuevaSol.created_at || new Date().toISOString(),
            creado_en: nuevaSol.creado_en || nuevaSol.created_at || new Date().toISOString(),
            sede: nuevaSol.sede || nuevaSol.sede_destino || 'Medellín',
            usuario_nombre: nuevaSol.solicitante_nombre || nuevaSol.usuario_nombre || 'Docente FMO',
            is_solicitud_compra: true,
          };
          setSolicitudes((prev) => [formatted, ...prev.filter((s) => s.id !== nuevaSol.id)]);
          setContador((c) => c + 1);
        }
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
      if (canal && supabase) {
        supabase.removeChannel(canal);
      }
      window.removeEventListener('siga:solicitud_creada', handleLocalSolicitudCreated);
      window.removeEventListener('siga:solicitud_resuelta', handleLocalSolicitudResolved);
    };
  }, [isCoordinador, currentUser?.proyectos_asignados, matchProyectoCoordinador]);

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
    const destinoCompras = isCoordinador || listaPendientes.some((s) => esCompraSolicitud(s));
    const targetSection = destinoCompras ? 'compras' : 'solicitudes';
    const tabParam = destinoCompras ? 'pendientes' : 'entrantes';

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
        view: targetSection,
        section: targetSection,
        tab: tabParam,
      });
    }
  };

  const handleSelectSolicitud = (sol) => {
    setIsOpen(false);
    const esCompra = isCoordinador || esCompraSolicitud(sol);
    const targetSection = esCompra ? 'compras' : 'solicitudes';
    const tabParam = esCompra ? 'pendientes' : 'entrantes';

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
        view: targetSection,
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
        <Bell size={18} className="siga-bell-shake" />

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
                      className={`notification-item-icon ${esCompra ? 'compra' : esPrestamo ? 'equipo' : 'consumible'
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
