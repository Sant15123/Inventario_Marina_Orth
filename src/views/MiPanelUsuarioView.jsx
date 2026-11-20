import ProgramBadgeIcon from '../components/common/ProgramBadgeIcon';
import FmoStarIcon from '../components/common/FmoStarIcon';
import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Laptop,
  Package,
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Eye,
  QrCode,
  MapPin,
  Tag,
  Layers,
  PackagePlus,
  Box,
  Hourglass,
  XCircle,
  Info,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fmtDate, formatearFechaSegura, today, SEDES, PROYECTOS } from '../services/mockData';
import { normalizeProyectoNombre } from '../constants/proyectos';
import { supabase } from '../services/supabase';
import inventoryApi from '../services/inventoryApi';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalQR from '../components/modals/ModalQR';
import ModalSolicitudMaterial from '../components/modals/ModalSolicitudMaterial';

// Normalizadores visuales institucionales
const formatSede = (sede) => {
  if (!sede) return 'Medellín';
  const s = sede.toLowerCase();
  if (s.includes('medell')) return 'Medellín';
  if (s.includes('carmen')) return 'Carmen de Viboral';
  if (s.includes('santa fe') || s.includes('santaf')) return 'Santa Fe';
  return sede;
};

const formatFechaCompacta = (d) => {
  if (!d || d === '—') return '—';
  try {
    const clean = String(d).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return d;
};

const renderTipoSolicitud = (solicitud) => {
  const tipo = String(solicitud.tipo_solicitud || solicitud.tipo || solicitud.tipoSolicitud || '').toUpperCase();
  const items = (Array.isArray(solicitud.items_solicitud) && solicitud.items_solicitud.length > 0)
    ? solicitud.items_solicitud
    : (Array.isArray(solicitud.items) && solicitud.items.length > 0 ? solicitud.items : []);

  // Detección exhaustiva de solicitud de compra: por tipo, por campos de ítems o por texto del motivo
  const esCompra =
    solicitud.is_solicitud_compra ||
    tipo === 'SUGERENCIA_COMPRA' ||
    tipo.includes('COMPRA') ||
    items.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || i.tipo_item === 'compra') ||
    (solicitud.motivo && (
      solicitud.motivo.toLowerCase().includes('compra') ||
      solicitud.motivo.toLowerCase().includes('batería') ||
      solicitud.motivo.toLowerCase().includes('bateria') ||
      solicitud.motivo.toLowerCase().includes('lipo')
    ));

  if (esCompra) {
    const rawCategories = [
      solicitud.categoria_destino,
      solicitud.categoria,
      ...items.map((i) => i.categoria_destino || i.categoria_sugerida || i.categoria),
    ]
      .filter(Boolean)
      .map((c) => String(c).toLowerCase().trim());

    const textoItems = items.map((it) => (it.nombre_item || it.nombre_sugerido || it.nombre || '')).join(' ').toLowerCase();
    const textoCompleto = `${textoItems} ${solicitud.motivo || ''} ${solicitud.justificacion || ''}`.toLowerCase();

    // 1. Equipos de Electrónica
    const esElectronica = rawCategories.some(
      (c) => c.includes('electron') || c.includes('electrónica')
    ) || (
      rawCategories.length === 0 && (
        textoCompleto.includes('electron') ||
        textoCompleto.includes('circuito') ||
        textoCompleto.includes('arduino') ||
        textoCompleto.includes('sensor') ||
        textoCompleto.includes('cautin') ||
        textoCompleto.includes('multimetro') ||
        textoCompleto.includes('servomotor')
      )
    );

    // 2. Papelería
    const esPapeleria = !esElectronica && (
      rawCategories.some(
        (c) => c.includes('papel') || c.includes('papelería')
      ) || (
        rawCategories.length === 0 && (
          textoCompleto.includes('papel') ||
          textoCompleto.includes('resma') ||
          textoCompleto.includes('cuaderno') ||
          textoCompleto.includes('cartulina') ||
          textoCompleto.includes('marcador')
        )
      )
    );

    if (esElectronica) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all bg-[#0284c7]/10 text-[#0284c7] border-[#0284c7]/30 dark:bg-[#0284c7]/20 dark:text-[#38bdf8] dark:border-[#0284c7]/40 shadow-2xs"
          style={{ whiteSpace: 'nowrap' }}
          title="Compra sugerida: Equipos de Electrónica"
        >
          <span
            className="inline-flex items-center justify-center flex-shrink-0 w-[18px] h-[18px] rounded-full bg-[#0284c7] text-white shadow-xs"
            aria-hidden="true"
          >
            <Cpu size={11} strokeWidth={2.4} />
          </span>
          <span className="truncate">🛒 Compra: Electrónica</span>
        </span>
      );
    }

    if (esPapeleria) {
      return <ProgramBadgeIcon program="teachlabs" variant="badge" label="🛒 Compra: Papelería" />;
    }

    // 3. Consumibles de Robótica (por defecto)
    return <ProgramBadgeIcon program="robotica" variant="badge" label="🛒 Compra: Robótica / Cons." />;
  }

  if (tipo.includes('CONSUMIBLE')) {
    return <ProgramBadgeIcon program="robotica" variant="badge" label="📦 Consumibles Robótica" />;
  }

  return <ProgramBadgeIcon program="tecnologia" variant="badge" label="💻 Equipo Retornable" />;
};



export default function MiPanelUsuarioView({
  items = [],
  movements = [],
  sedes: propSedes,
  proyectos: propProyectos,
}) {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('equipos'); // 'equipos' | 'consumibles' | 'solicitudes'

  // Modal para ver detalle completo de activo (solo lectura)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);

  // Modal para ver código QR
  const [modalQROpen, setModalQROpen] = useState(false);
  const [itemParaQR, setItemParaQR] = useState(null);

  // Modal para solicitar nuevo equipo o material
  const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false);

  // Sedes y Proyectos dinámicos
  const sedesList = useMemo(() => {
    return Array.isArray(propSedes) && propSedes.length > 0 ? propSedes : SEDES;
  }, [propSedes]);

  const proyectosList = useMemo(() => {
    return Array.isArray(propProyectos) && propProyectos.length > 0 ? propProyectos : PROYECTOS;
  }, [propProyectos]);

  // Lista de Solicitudes realizadas por el usuario
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [modalMotivoRechazo, setModalMotivoRechazo] = useState(null);

  // Paginación de 5 en 5 para la pestaña "Mis Solicitudes"
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const SOLICITUDES_PER_PAGE = 5;

  // Cargar solicitudes del usuario
  const fetchSolicitudes = async () => {
    try {
      setSolicitudesLoading(true);
      let dataFinal = [];

      try {
        if (supabase) {
          let invList = [];
          let compList = [];

          try {
            const { data: invData, error: invErr } = await supabase
              .from('solicitudes_inventario')
              .select(`
                *,
                items_solicitud (
                  id,
                  cantidad,
                  item_id,
                  nombre_sugerido,
                  categoria_sugerida,
                  url_compra,
                  precio_estimado,
                  ingresado_inventario
                )
              `)
              .order('creado_en', { ascending: false });

            if (!invErr && Array.isArray(invData)) {
              invList = invData.map((s) => ({
                ...s,
                items: s.items_solicitud || [],
                tipo: s.tipo_solicitud || 'PRESTAMO_EQUIPO',
                proyecto_steam: s.proyecto_steam || s.proyecto_steam_id || s.proyecto || '',
                proyecto_steam_id: s.proyecto_steam_id || s.proyecto_steam || '',
                proyecto: s.proyecto || s.proyecto_steam || '',
              }));
            }
          } catch (_) {}

          try {
            const { data: cData, error: cErr } = await supabase
              .from('solicitudes_compra')
              .select('*')
              .order('creado_en', { ascending: false });

            if (!cErr && Array.isArray(cData)) {
              compList = cData.map((sc) => {
                const catDestino = String(sc.categoria_destino || sc.categoria || 'consumibles').toLowerCase();
                let catNormalizada = 'consumibles';
                if (catDestino.includes('electron') || catDestino.includes('electrónica')) {
                  catNormalizada = 'electronica';
                } else if (catDestino.includes('papel') || catDestino.includes('papelería')) {
                  catNormalizada = 'papeleria';
                }
                const fRad = sc.creado_en || sc.created_at || '';
                const proy = sc.proyecto_steam || sc.proyecto_steam_id || sc.proyecto || '';

                const singleItem = {
                  id: sc.id,
                  solicitud_id: sc.id,
                  tipo_item: 'compra',
                  item_id: sc.item_inventario_id || null,
                  nombre_item: sc.nombre_producto || 'Producto sugerido',
                  nombre_sugerido: sc.nombre_producto || 'Producto sugerido',
                  categoria_sugerida: sc.categoria_destino || catNormalizada,
                  categoria_destino: sc.categoria_destino || catNormalizada,
                  url_compra: sc.url_compra || null,
                  precio_estimado: Number(sc.precio_estimado) || 0,
                  cantidad: Number(sc.cantidad || sc.cantidad_solicitada) || 1,
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                };

                let itemsList = [];
                if (Array.isArray(sc.items) && sc.items.length > 0) {
                  itemsList = sc.items;
                } else if (typeof sc.items === 'string') {
                  try {
                    const parsed = JSON.parse(sc.items);
                    if (Array.isArray(parsed) && parsed.length > 0) itemsList = parsed;
                  } catch (_) {}
                }
                if (itemsList.length === 0) {
                  itemsList = [singleItem];
                }

                return {
                  id: sc.id,
                  usuario_id: sc.usuario_id,
                  usuario_nombre: sc.usuario_nombre,
                  sede: sc.sede || 'Medellín',
                  tipo: 'SUGERENCIA_COMPRA',
                  tipo_solicitud: 'SUGERENCIA_COMPRA',
                  tipoSolicitud: 'SUGERENCIA_COMPRA',
                  categoria_destino: sc.categoria_destino || catNormalizada,
                  categoria: sc.categoria || sc.categoria_destino || catNormalizada,
                  proyecto_steam: proy,
                  proyecto_steam_id: sc.proyecto_steam_id || proy,
                  proyecto: proy,
                  fecha_requerida: sc.fecha_requerida,
                  fecha_devolucion_estimada: sc.fecha_requerida,
                  motivo: sc.justificacion || 'Sugerencia de compra',
                  justificacion: sc.justificacion || 'Sugerencia de compra',
                  estado: sc.estado || 'PENDIENTE',
                  prioridad: sc.prioridad || 'Media',
                  ingresado_inventario: Boolean(sc.ingresado_inventario),
                  item_inventario_id: sc.item_inventario_id || null,
                  observaciones_admin: sc.observaciones_admin || null,
                  creado_en: fRad,
                  created_at: fRad,
                  fecha_radicado: fRad ? String(fRad).slice(0, 10) : '',
                  is_solicitud_compra: true,
                  items: itemsList,
                  items_solicitud: itemsList,
                };
              });
            }
          } catch (_) {}

          dataFinal = [...invList, ...compList].sort(
            (a, b) => new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
          );
        }
      } catch (errSup) {
        console.warn('Aviso consulta directa Supabase en MiPanelUsuarioView:', errSup);
      }

      if (dataFinal.length === 0) {
        const apiData = await inventoryApi.getSolicitudes();
        if (Array.isArray(apiData) && apiData.length > 0) {
          dataFinal = apiData;
        }
      }

      if (Array.isArray(dataFinal)) {
        const userId = currentUser?.id || currentUser?.documento;
        const nombreNorm = (currentUser?.nombre || '').toLowerCase().trim();
        const misSols = dataFinal.filter((s) => {
          if (userId && (s.usuario_id === userId || String(s.usuario_id) === String(userId))) return true;
          const sNombre = (s.usuario_nombre || '').toLowerCase().trim();
          return sNombre && nombreNorm && (sNombre.includes(nombreNorm) || nombreNorm.includes(sNombre));
        });
        setSolicitudes(misSols);
      } else {
        setSolicitudes([]);
      }
    } catch (err) {
      console.warn('Aviso: no se pudieron cargar solicitudes desde API:', err.message);
      setSolicitudes([]);
    } finally {
      setSolicitudesLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();

    // Suscripción Realtime a cambios en solicitudes para el solicitante
    let canal = null;
    const userId = currentUser?.id || currentUser?.documento;
    const nombreNorm = (currentUser?.nombre || '').toLowerCase().trim();

    const matchesUser = (record) => {
      if (!record) return false;
      if (userId && (record.usuario_id === userId || String(record.usuario_id) === String(userId))) return true;
      const sNombre = (record.usuario_nombre || '').toLowerCase().trim();
      return Boolean(sNombre && nombreNorm && (sNombre.includes(nombreNorm) || nombreNorm.includes(sNombre)));
    };

    try {
      if (supabase) {
        canal = supabase
          .channel(`cambios-solicitudes-usr-${userId || 'anon'}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes' },
            (payload) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                if (matchesUser(payload.new)) {
                  setSolicitudes((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]);
                }
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                if (matchesUser(payload.new)) {
                  setSolicitudes((prev) =>
                    prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
                  );
                }
              } else if (payload.eventType === 'DELETE' && payload.old) {
                setSolicitudes((prev) => prev.filter((s) => s.id !== payload.old.id));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes_inventario' },
            (payload) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                if (matchesUser(payload.new)) {
                  setSolicitudes((prev) => [payload.new, ...prev.filter((s) => s.id !== payload.new.id)]);
                }
              } else if (payload.eventType === 'UPDATE' && payload.new) {
                if (matchesUser(payload.new)) {
                  setSolicitudes((prev) =>
                    prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
                  );
                }
              } else if (payload.eventType === 'DELETE' && payload.old) {
                setSolicitudes((prev) => prev.filter((s) => s.id !== payload.old.id));
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'solicitudes_compra' },
            (payload) => {
              fetchSolicitudes();
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.warn('Realtime solicitudes usuario aviso:', e);
    }

    const handleLocalSol = () => fetchSolicitudes();
    window.addEventListener('siga:solicitud_creada', handleLocalSol);
    window.addEventListener('siga:solicitud_resuelta', handleLocalSol);

    return () => {
      if (canal && supabase) supabase.removeChannel(canal);
      window.removeEventListener('siga:solicitud_creada', handleLocalSol);
      window.removeEventListener('siga:solicitud_resuelta', handleLocalSol);
    };
  }, [currentUser]);

  // Normalizar nombre del usuario activo para match flexible
  const currentUserNameNorm = useMemo(() => {
    return (currentUser?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }, [currentUser]);

  // 1. Equipos Asignados a la custodia del usuario
  const misEquiposAsignados = useMemo(() => {
    // Buscar en movements de tipo 'prestamo'
    const prestamosDelUsuario = movements.filter((m) => {
      if (m.type !== 'prestamo') return false;
      const solicitanteNorm = (m.person || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return solicitanteNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(solicitanteNorm);
    });

    // También buscar en los ítems de tipo 'equipo' cuyas unidades tengan como responsable a este usuario
    const equiposDirectos = [];
    (items || []).forEach((item) => {
      if (item.itemType === 'equipo' && Array.isArray(item.units)) {
        item.units.forEach((u) => {
          const respNorm = (u.responsable || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          if (respNorm && (respNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(respNorm))) {
            equiposDirectos.push({
              placa: u.placa || u.code,
              nombre: item.name,
              modelo: u.model || 'Estándar',
              serial: u.serial || '—',
              sede: u.sede || item.sede || 'Medellín',
              ubicacion_estante: u.ubicacion_estante || item.ubicacion_estante || '',
              fechaEntrega: item.dateAdded || today(),
              fechaDevolucion: '2026-11-30',
              status: u.status || 'prestado',
              rawItem: item,
            });
          }
        });
      }
    });

    // Consolidar préstamos
    const listadoFinal = [];
    const placasVistas = new Set();

    prestamosDelUsuario.forEach((p) => {
      const placa = (p.unitCodes && p.unitCodes[0]) || p.itemId || 'P-ACT';
      placasVistas.add(placa);
      listadoFinal.push({
        placa,
        nombre: p.itemName || 'Equipo Tecnológico',
        modelo: 'Equipo Corporativo Lenovo / HP',
        serial: p.serial || 'PF1HL0-FMO',
        sede: p.sede || 'Medellín',
        ubicacion_estante: p.ubicacion_estante || 'En Campo',
        fechaEntrega: p.date,
        fechaDevolucion: p.expectedReturn || '—',
        status: p.status === 'activo' ? 'prestado' : 'devuelto',
        rawMov: p,
      });
    });

    equiposDirectos.forEach((eq) => {
      if (!placasVistas.has(eq.placa)) {
        listadoFinal.push(eq);
      }
    });

    // Si aún no hay asignaciones para este usuario (demo), mostrar equipos asignados representativos
    if (listadoFinal.length === 0) {
      return [
        {
          placa: 'P1',
          nombre: 'Laptops Lenovo ThinkPad L14 Gen 3',
          modelo: 'ThinkPad L14 Gen 3 (Core i5, 16GB RAM)',
          serial: 'PF1HL01A',
          sede: currentUser?.sede || 'Medellín',
          ubicacion_estante: 'En Campo - Lab STEAM',
          fechaEntrega: '2026-08-15',
          fechaDevolucion: '2026-11-30',
          status: 'prestado',
        },
        {
          placa: 'EQ-PR-02',
          nombre: 'Video Proyector Epson PowerLite E20',
          modelo: 'PowerLite E20 3400 Lúmenes HDMI',
          serial: 'EP-998877A',
          sede: currentUser?.sede || 'Medellín',
          ubicacion_estante: 'En Campo - Aula Móvil',
          fechaEntrega: '2026-09-01',
          fechaDevolucion: '2026-10-31',
          status: 'prestado',
        },
      ];
    }

    return listadoFinal;
  }, [movements, items, currentUserNameNorm, currentUser]);

  // 2. Consumibles e Insumos recibidos por el usuario (Agrupados por remisión)
  const misConsumiblesRecibidos = useMemo(() => {
    const entregasUsuario = movements.filter((m) => {
      if (m.type !== 'entrega') return false;
      const respNorm = (m.person || m.responsable_recibe || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return respNorm.includes(currentUserNameNorm) || currentUserNameNorm.includes(respNorm);
    });

    if (entregasUsuario.length === 0) {
      // Entregas de demostración vinculadas
      return [
        {
          id: 'rem-demo-01',
          remision_id: 'ACTA-2026-094',
          codigo_acta: 'ACTA-2026-094',
          date: '2026-09-15',
          sede: currentUser?.sede || 'Medellín',
          proyecto: 'Semillero STEAM & Robótica',
          motivo: 'Dotación de motores y sensores para taller de robótica móvil',
          items: [
            { nombre: 'ARDUINO UNO R3 (Original + Cable)', cantidad: 5 },
            { nombre: 'Motores DC TT Amarillo con Reductora', cantidad: 10 },
            { nombre: 'Sensores Ultrasónicos HC-SR04', cantidad: 8 },
            { nombre: 'Cables Jumpers Dupont (Paquete x40)', cantidad: 4 },
          ],
          total_unidades: 27,
        },
        {
          id: 'rem-demo-02',
          remision_id: 'ACTA-2026-102',
          codigo_acta: 'ACTA-2026-102',
          date: '2026-10-02',
          sede: currentUser?.sede || 'Medellín',
          proyecto: 'Clubes de Ciencia & STEAM',
          motivo: 'Suministros de papelería y bitácoras para estudiantes',
          items: [
            { nombre: 'Resmas de Papel Carta Reprograf (75g)', cantidad: 3 },
            { nombre: 'Marcadores Borrables Expo Surtidos (Caja)', cantidad: 2 },
            { nombre: 'Libretas de Bitácora STEAM Marina Orth', cantidad: 25 },
          ],
          total_unidades: 30,
        },
      ];
    }

    return entregasUsuario;
  }, [movements, currentUserNameNorm, currentUser]);

  const handleVerDetalleEquipo = (eq) => {
    setActivoSeleccionado({
      placa: eq.placa,
      nombre: eq.nombre,
      modelo: eq.modelo,
      serial: eq.serial || '—',
      sede: eq.sede,
      ubicacion: eq.sede,
      ubicacion_estante: eq.ubicacion_estante || 'En Campo',
      estado: eq.status === 'prestado' ? 'En campo' : 'Disponible',
      custodio: currentUser?.nombre,
      categoria: 'Equipos de Cómputo',
      fechaEntrega: eq.fechaEntrega,
      fechaDevolucion: eq.fechaDevolucion,
      condicion: 'Bueno',
      isEquipo: true,
    });
    setModalDetalleOpen(true);
  };

  const handleVerQR = (eq) => {
    const itemActual = eq || activoSeleccionado;
    if (!itemActual) return;
    setItemParaQR({
      ...itemActual,
      code: itemActual.placa || itemActual.code || itemActual.id,
      placa: itemActual.placa || itemActual.code || itemActual.id,
      nombre: itemActual.nombre || itemActual.name || 'Equipo Tecnológico',
      name: itemActual.nombre || itemActual.name || 'Equipo Tecnológico',
      modelo: itemActual.modelo || itemActual.model || 'Estándar',
      model: itemActual.modelo || itemActual.model || 'Estándar',
      serial: itemActual.serial || '—',
      sede: itemActual.sede || 'Medellín',
      estado: itemActual.status || itemActual.estado || 'En Custodia',
      status: itemActual.status || itemActual.estado || 'En Custodia',
      custodio: currentUser?.nombre || 'Docente Asignado',
    });
    setModalQROpen(true);
  };

  const usuario = currentUser;
  const pestanaActiva = activeTab;
  const setPestanaActiva = setActiveTab;
  const equiposAsignados = misEquiposAsignados;
  const remisiones = misConsumiblesRecibidos;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Mis Solicitudes y Asignaciones
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Solicita las herramientas, kits de robótica e insumos que necesitas para crear experiencias de aprendizaje que dejan huella en tus estudiantes.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bienvenido(a), <strong className="text-slate-800 dark:text-white font-bold">{usuario?.nombre || 'Docente'}</strong> 
            <span className="ml-1">(Doc. {usuario?.documento || '—'})</span> · <span>{usuario?.cargo || 'Formador STEAM'}</span>
          </p>
        </div>

        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setModalSolicitudOpen(true)}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: '#abd037',
              color: '#013a52',
              border: 'none',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '13.5px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(171, 208, 55, 0.45)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#96b82d';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(171, 208, 55, 0.55)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#abd037';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(171, 208, 55, 0.45)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Crear una nueva solicitud de equipos o materiales para tus actividades formativas"
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '7px',
                backgroundColor: 'rgba(1, 58, 82, 0.12)',
                color: '#013a52',
                flexShrink: 0,
              }}
            >
              <PackagePlus size={15} style={{ strokeWidth: 2.4, color: '#013a52' }} />
            </span>
            <span>+ Solicitar Equipo o Material</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación Institucionales FMO */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {[
          {
            id: 'equipos',
            label: 'Mis Equipos Asignados',
            icon: Laptop,
            count: equiposAsignados?.length || 0,
            ariaLabel: 'Ver equipos asignados bajo mi responsabilidad',
          },
          {
            id: 'consumibles',
            label: 'Mis Consumibles Recibidos',
            icon: Package,
            count: remisiones?.length || 0,
            ariaLabel: 'Ver consumibles y materiales recibidos',
          },
          {
            id: 'solicitudes',
            label: 'Mis Solicitudes',
            icon: ClipboardList,
            count: solicitudes?.length || 0,
            ariaLabel: 'Ver historial de mis solicitudes',
          },
        ].map((tab) => {
          const isActive = pestanaActiva === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPestanaActiva(tab.id)}
              aria-label={tab.ariaLabel}
              className={`group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'shadow-sm'
                  : 'hover:-translate-y-0.5'
              }`}
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 600,
                backgroundColor: isActive ? '#abd037' : 'var(--surface-2, #ffffff)',
                color: isActive ? '#013a52' : '#6d6e71',
                border: isActive ? '1.5px solid #96b82d' : '1.5px solid var(--line, #e2e8f0)',
                boxShadow: isActive ? '0 3px 12px rgba(171, 208, 55, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#abd037';
                  e.currentTarget.style.color = '#013a52';
                  e.currentTarget.style.backgroundColor = '#fafcf2';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
                  e.currentTarget.style.color = '#6d6e71';
                  e.currentTarget.style.backgroundColor = 'var(--surface-2, #ffffff)';
                }
              }}
            >
              {/* Contenedor Micro-badge para el Icono Vectorial */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '7px',
                  backgroundColor: isActive ? 'rgba(1, 58, 82, 0.12)' : 'rgba(109, 110, 113, 0.08)',
                  color: isActive ? '#013a52' : '#6d6e71',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Icon size={14.5} style={{ strokeWidth: 2.3 }} />
              </span>

              {/* Texto de la Pestaña */}
              <span style={{ letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>

              {/* Badge Contador Oficial */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.5px 8px',
                  minWidth: '20px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  backgroundColor: isActive ? '#013a52' : 'rgba(109, 110, 113, 0.12)',
                  color: isActive ? '#ffffff' : '#6d6e71',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 1px 3px rgba(1, 58, 82, 0.25)' : 'none',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          PESTAÑA 1: MIS EQUIPOS ASIGNADOS
          ========================================================================= */}
      {activeTab === 'equipos' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Dispositivos y Laptops Bajo Mi Responsabilidad</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {misEquiposAsignados.length} activos
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
              Equipos de cómputo y formación tecnológica asignados temporalmente para actividades pedagógicas
            </span>
          </div>

          <div className="panel" style={{ paddingBottom: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>PLACA</th>
                    <th style={{ width: '27%', padding: '10px 10px', textAlign: 'left' }}>EQUIPO & MODELO</th>
                    <th style={{ width: '13%', padding: '10px 8px', textAlign: 'center' }}>SEDE</th>
                    <th style={{ width: '13%', padding: '10px 8px', textAlign: 'center' }}>F. ENTREGA</th>
                    <th style={{ width: '14%', padding: '10px 8px', textAlign: 'center' }}>F. DEVOLUCIÓN</th>
                    <th style={{ width: '11%', padding: '10px 6px', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ width: '11%', padding: '10px 8px', textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {misEquiposAsignados.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No tienes equipos tecnológicos asignados en este momento.
                      </td>
                    </tr>
                  ) : (
                    misEquiposAsignados.map((eq, i) => (
                      <tr
                        key={i}
                        className="h-auto hover:bg-slate-500/5"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        {/* 1. PLACA */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => handleVerDetalleEquipo(eq)}
                            className="badge-placa"
                            title={`Consultar ficha técnica de ${eq.placa}`}
                          >
                            <span className="truncate">{eq.placa}</span>
                          </button>
                        </td>

                        {/* 2. EQUIPO & MODELO */}
                        <td style={{ padding: '9px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
                            <strong
                              className="item-title truncate"
                              title={eq.nombre}
                              style={{
                                fontSize: '12.5px',
                                color: 'var(--text-h)',
                                fontWeight: 700,
                                lineHeight: 1.25,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {eq.nombre}
                            </strong>
                            <span
                              title={eq.modelo}
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim)',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {eq.modelo}
                            </span>
                          </div>
                        </td>

                        {/* 3. SEDE */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                          <span
                            className="sede-badge municipal"
                            title={formatSede(eq.sede)}
                            style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-block' }}
                          >
                            {formatSede(eq.sede)}
                          </span>
                        </td>

                        {/* 4. FECHA DE ENTREGA */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '12px', color: 'var(--text)' }}>
                            {formatFechaCompacta(eq.fechaEntrega)}
                          </span>
                        </td>

                        {/* 5. FECHA DE DEVOLUCIÓN */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontFamily: "'Poppins', sans-serif",
                              fontSize: '12px',
                              color: 'var(--text)',
                            }}
                          >
                            {formatFechaCompacta(eq.fechaDevolucion)}
                          </span>
                        </td>

                        {/* 6. ESTADO */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            className={`pill ${eq.status === 'prestado' ? 'prestado' : 'ok'}`}
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                          >
                            {eq.status === 'prestado' ? 'En Custodia' : 'Reintegrado'}
                          </span>
                        </td>

                        {/* 7. ACCIONES */}
                        <td style={{ textAlign: 'center', padding: '9px 6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleVerDetalleEquipo(eq)}
                              className="btn small ghost"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11.5px',
                                borderRadius: '6px',
                                borderColor: 'var(--border)',
                              }}
                              title="Consultar ficha técnica completa del equipo"
                            >
                              <Eye style={{ width: '13px', height: '13px' }} className="text-sky-400" />
                              <span>Detalle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerQR(eq)}
                              className="btn small ghost"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                padding: '4px',
                                borderRadius: '6px',
                                borderColor: 'var(--border)',
                                cursor: 'pointer',
                              }}
                              title="Ver e Imprimir Código QR del Equipo"
                            >
                              <QrCode style={{ width: '14px', height: '14px', color: '#84CC16' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 2: MIS CONSUMIBLES RECIBIDOS
          ========================================================================= */}
      {activeTab === 'consumibles' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Historial de Entregas y Materiales Recibidos</span>
              <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {misConsumiblesRecibidos.length} remisiones
              </span>
            </h2>
            <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
              Insumos de robótica, electrónica y papelería entregados para el desarrollo de talleres STEAM
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {misConsumiblesRecibidos.map((rem, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 mb-4"
              >
                {/* Barra superior de la tarjeta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md text-xs font-sans font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {rem.codigo_acta || rem.remision_id || rem.id || `REM-${idx + 1}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                      Fecha: <strong className="text-slate-700 dark:text-slate-100 font-semibold">{fmtDate(rem.date || rem.fecha_entrega)}</strong>
                    </span>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-700/80 self-start sm:self-auto"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: 'fit-content',
                      maxWidth: 'max-content',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      color: 'var(--lime-color, #bef264)',
                    }}
                  >
                    <CheckCircle2 size={14} className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                    <span>Despacho Confirmado</span>
                  </span>
                </div>

                {/* Información de destino y proyecto */}
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">
                    Destino: <strong className="font-semibold text-slate-900 dark:text-white">{rem.sede || 'Medellín'}</strong> · Proyecto: <strong className="font-semibold text-slate-900 dark:text-white">{rem.proyecto || 'Talleres STEAM'}</strong>
                  </p>
                  {rem.motivo && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5">
                      Motivo: {rem.motivo}
                    </p>
                  )}
                </div>

                {/* Sección de Materiales Entregados */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-300 mb-2">
                    MATERIALES ENTREGADOS ({Array.isArray(rem.items) ? rem.items.length : 1} ÍTEMS):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(rem.items) && rem.items.length > 0 ? (
                      rem.items.map((it, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100"
                        >
                          <span style={{ color: 'var(--text, #f8fafc)' }}>📦 {it.nombre || it.material || 'Consumible'}</span>
                          <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-900 dark:bg-lime-950/80 dark:text-lime-300 font-bold text-[10px]" style={{ color: 'var(--lime-color, #bef264)' }}>
                            x{it.cantidad || it.cantidadEntrega || 1}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100">
                        <span style={{ color: 'var(--text, #f8fafc)' }}>📦 {rem.itemName || 'Material de Robótica'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-lime-100 text-lime-900 dark:bg-lime-950/80 dark:text-lime-300 font-bold text-[10px]" style={{ color: 'var(--lime-color, #bef264)' }}>
                          x{rem.qty || 1}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          PESTAÑA 3: MIS SOLICITUDES
          ========================================================================= */}
      {activeTab === 'solicitudes' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="section-header" style={{ marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Requerimientos de Equipos e Insumos</span>
                <span className="pill default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {solicitudes.length} solicitudes
                </span>
              </h2>
              <span className="section-subtitle" style={{ fontSize: '12.5px' }}>
                Solicita las herramientas, kits de robótica e insumos que necesitas para crear experiencias de aprendizaje que dejan huella en tus estudiantes.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalSolicitudOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: '#abd037',
                color: '#013a52',
                border: 'none',
                fontFamily: "'Poppins', sans-serif",
                fontSize: '12.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 10px rgba(171, 208, 55, 0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#96b82d';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#abd037';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <PackagePlus size={15} style={{ strokeWidth: 2.4, color: '#013a52' }} />
              <span>+ Nueva Solicitud</span>
            </button>
          </div>

          <div
            className="panel table-responsive"
            style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            {solicitudesLoading ? (
              <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>⏳</span> Cargando tus solicitudes...
              </div>
            ) : solicitudes.length === 0 ? (
              <div className="empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span>📋</span>
                <p>Aún no has radicado solicitudes. Usa el botón '+ Nueva Solicitud' cuando necesites equipos o materiales para tus talleres.</p>
                <button
                  type="button"
                  onClick={() => setModalSolicitudOpen(true)}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#abd037',
                    color: '#013a52',
                    border: 'none',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(171, 208, 55, 0.35)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#96b82d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#abd037';
                  }}
                >
                  <PackagePlus size={15} style={{ strokeWidth: 2.4, color: '#013a52' }} />
                  <span>+ Nueva Solicitud</span>
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: '120px', minWidth: '110px' }}>Fecha Radicado</th>
                    <th style={{ width: '140px' }}>Tipo de Solicitud</th>
                    <th style={{ minWidth: '220px' }}>Ítems Solicitados (Resumen)</th>
                    <th style={{ width: '120px' }}>Sede</th>
                    <th style={{ minWidth: '150px' }}>Motivo / Justificación</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes
                    .slice((solicitudesPage - 1) * SOLICITUDES_PER_PAGE, solicitudesPage * SOLICITUDES_PER_PAGE)
                    .map((sol) => {
                      const estadoUpper = String(sol.estado || 'PENDIENTE').toUpperCase();
                      const rawTipo = (sol.tipo_solicitud || sol.tipo || '').toUpperCase();
                      const solItems = (Array.isArray(sol.items_solicitud) && sol.items_solicitud.length > 0)
                        ? sol.items_solicitud
                        : (Array.isArray(sol.items) ? sol.items : []);
                      const esCompra =
                        rawTipo === 'SUGERENCIA_COMPRA' ||
                        rawTipo.includes('COMPRA') ||
                        solItems.some((i) => i.categoria_sugerida || i.url_compra || i.nombre_sugerido || String(i.tipo_item || '').toLowerCase() === 'compra') ||
                        (sol.motivo && (
                          sol.motivo.toLowerCase().includes('compra') ||
                          sol.motivo.toLowerCase().includes('batería') ||
                          sol.motivo.toLowerCase().includes('bateria') ||
                          sol.motivo.toLowerCase().includes('lipo')
                        ));
                      const esConsumible = !esCompra && rawTipo.includes('CONSUMIB');
                      const esPrestamo = !esCompra && !esConsumible;
                      const fechaRad = sol.creado_en || sol.fecha_radicado || sol.created_at || '';

                      return (
                        <tr key={sol.id} style={{ height: '52px' }}>
                          <td className="mono-num" style={{ whiteSpace: 'nowrap', padding: '10px 12px' }}>
                            {fmtDate(fechaRad)}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                              {renderTipoSolicitud(sol)}
                              {(() => {
                                const rawProy = sol.proyecto_steam || sol.proyecto_steam_id || sol.proyecto;
                                const nomProy = normalizeProyectoNombre(rawProy);
                                if (!nomProy) return null;
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-[#013a52] dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                    title={`Proyecto STEAM vinculado: ${nomProy}`}
                                    style={{ maxWidth: '210px' }}
                                  >
                                    <span style={{ color: '#84CC16', fontWeight: 800 }}>•</span>
                                    <span className="truncate">{nomProy}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {Array.isArray(sol.items) && sol.items.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {sol.items.map((it, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                      <span style={{ color: 'var(--text, #f8fafc)' }}>{it.nombre_sugerido || it.nombre_item || it.nombre}</span>
                                      <strong style={{ color: '#84CC16', fontWeight: 800 }}>x{it.cantidad}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '12px' }}>Sin ítems detallados</span>
                              )}
                              {(() => {
                                const fDev = sol.fecha_devolucion_estimada || sol.fecha_devolucion_esperada || sol.fecha_devolucion || sol.fecha_retorno || sol.fecha_limite;
                                if (!fDev) return null;
                                if (esCompra) {
                                  return (
                                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                                      Requerido para: <strong className="mono-num" style={{ color: '#15803d', fontWeight: 800 }}>{formatearFechaSegura(sol.fecha_requerida || fDev)}</strong>
                                    </span>
                                  );
                                }
                                if (esConsumible) return null;
                                return (
                                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)' }}>
                                    Retorno pactado: <strong className="mono-num" style={{ color: 'var(--text, #f8fafc)' }}>{formatearFechaSegura(fDev)}</strong>
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span className="sede-badge municipal" style={{ padding: '2px 8px', fontSize: '11px' }}>
                              {sol.sede || 'Medellín'}
                            </span>
                          </td>
                          <td className="wrap" title={sol.motivo} style={{ padding: '10px 12px', fontSize: '12.5px', color: 'var(--text, #f8fafc)' }}>
                            <div style={{ maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text, #f8fafc)' }}>
                              {sol.motivo || '—'}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {(() => {
                              const est = estadoUpper;
                              const obsCoord = sol.observaciones_coordinador || sol.observaciones_admin || sol.motivo_rechazo || '';

                              // 1. COMPRADA (Etapa 4 final)
                              if (est === 'COMPRADA' || est === 'COMPRADO') {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-400 dark:bg-cyan-950/40 dark:text-cyan-300"
                                      title="Adquisición efectuada por la Fundación. Ítems en proceso de entrega o ingreso a inventario."
                                    >
                                      <CheckCircle2 size={13} className="text-cyan-600 dark:text-cyan-400" />
                                      <span>Comprada</span>
                                    </span>
                                    <span style={{ fontSize: '10.5px', color: '#0284c7', fontWeight: 600 }}>
                                      En camino / Bodega
                                    </span>
                                  </div>
                                );
                              }

                              // 2. APROBADA PARA COMPRA (Etapa 3)
                              if (est === 'APROBADA' || est === 'APROBADO') {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span
                                      className="badge-estado-aprobado"
                                      title="Aprobada por la Coordinación STEAM para adquisición."
                                    >
                                      <CheckCircle2 size={13} />
                                      <span>Aprobada para Compra</span>
                                    </span>
                                    {obsCoord && (
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          color: 'var(--text-dim, #6d6e71)',
                                          maxWidth: '160px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                        title={`Observación Coordinador: ${obsCoord}`}
                                      >
                                        Coord: {obsCoord}
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              // 3. EN EVALUACIÓN (Etapa 2)
                              if (est === 'EN EVALUACION' || est === 'EN EVALUACIÓN') {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                                      title="En revisión técnica por el Coordinador STEAM y cruce con bodega."
                                    >
                                      <Hourglass size={13} className="text-purple-600 dark:text-purple-400" />
                                      <span>En Evaluación</span>
                                    </span>
                                    <span style={{ fontSize: '10.5px', color: '#7b2cbf', fontWeight: 600 }}>
                                      Revisión técnica
                                    </span>
                                  </div>
                                );
                              }

                              // 4. RECHAZADA
                              if (est === 'RECHAZADO' || est === 'RECHAZADA') {
                                const textoRechazo =
                                  obsCoord ||
                                  sol.nota_rechazo ||
                                  sol.justificacion_rechazo ||
                                  '';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span
                                      className="badge-estado-rechazado"
                                      style={{ cursor: textoRechazo ? 'pointer' : 'default' }}
                                      onClick={() => {
                                        if (textoRechazo) setModalMotivoRechazo({ solicitud: sol, motivo: textoRechazo });
                                      }}
                                      title={textoRechazo ? `Motivo: ${textoRechazo} (Click para leer completo)` : 'Solicitud no autorizada por Coordinación'}
                                    >
                                      <XCircle size={13} />
                                      <span>Rechazada</span>
                                      {textoRechazo && <Info size={11} style={{ marginLeft: '2px', opacity: 0.9 }} />}
                                    </span>
                                    {textoRechazo ? (
                                      <button
                                        type="button"
                                        onClick={() => setModalMotivoRechazo({ solicitud: sol, motivo: textoRechazo })}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          padding: '1px 4px',
                                          color: '#ef4444',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          maxWidth: '150px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          cursor: 'pointer',
                                          textDecoration: 'underline dotted',
                                          lineHeight: 1.2,
                                        }}
                                        title={`Motivo: ${textoRechazo} (Click para ver completo)`}
                                      >
                                        Motivo: {textoRechazo}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '10.5px', color: 'var(--text-dim, #94a3b8)', fontStyle: 'italic' }}>
                                        Sin motivo registrado
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              // 5. SOLICITADA / PENDIENTE (Etapa 1 por defecto)
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span
                                    className="badge-estado-pendiente"
                                    title="Solicitud radicada, pendiente de revisión por el Coordinador."
                                  >
                                    <Hourglass size={13} />
                                    <span>Solicitada</span>
                                  </span>
                                  <span style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 600 }}>
                                    Pendiente Coord.
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}

            {/* Paginación de 5 en 5 */}
            {solicitudes.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderTop: '1px solid var(--line)',
                  fontSize: '12.5px',
                  color: 'var(--text-dim)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  Mostrando{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {(solicitudesPage - 1) * SOLICITUDES_PER_PAGE + 1}
                  </strong>{' '}
                  -{' '}
                  <strong style={{ color: 'var(--text-h)' }}>
                    {Math.min(solicitudesPage * SOLICITUDES_PER_PAGE, solicitudes.length)}
                  </strong>{' '}
                  de <strong style={{ color: 'var(--text-h)' }}>{solicitudes.length}</strong> solicitudes
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={solicitudesPage <= 1}
                    onClick={() => setSolicitudesPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '3px 10px', fontSize: '12px', cursor: solicitudesPage <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ← Anterior
                  </button>

                  <span style={{ fontWeight: 600, color: 'var(--text)', padding: '0 4px', fontSize: '12px' }}>
                    Página {solicitudesPage} de {Math.max(1, Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE))}
                  </span>

                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={solicitudesPage >= Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE)}
                    onClick={() =>
                      setSolicitudesPage((p) =>
                        Math.min(Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE), p + 1)
                      )
                    }
                    style={{
                      padding: '3px 10px',
                      fontSize: '12px',
                      cursor:
                        solicitudesPage >= Math.ceil(solicitudes.length / SOLICITUDES_PER_PAGE)
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL DETALLE DE ACTIVO (CONSULTA / SOLO LECTURA) */}
      {modalDetalleOpen && activoSeleccionado && (
        <ModalDetalleActivo
          isOpen={modalDetalleOpen}
          onClose={() => setModalDetalleOpen(false)}
          item={activoSeleccionado}
          activo={activoSeleccionado}
          readOnly={true}
          onOpenQR={(it) => {
            setModalDetalleOpen(false);
            handleVerQR(it || activoSeleccionado);
          }}
        />
      )}

      {/* MODAL QR */}
      {modalQROpen && itemParaQR && (
        <ModalQR
          activo={itemParaQR}
          item={itemParaQR}
          onClose={() => {
            setModalQROpen(false);
            setItemParaQR(null);
          }}
          onBack={() => {
            setModalQROpen(false);
            if (activoSeleccionado) {
              setModalDetalleOpen(true);
            }
          }}
        />
      )}

      {/* MODAL SOLICITUD DE MATERIAL O EQUIPO */}
      {modalSolicitudOpen && (
        <ModalSolicitudMaterial
          isOpen={modalSolicitudOpen}
          onClose={() => setModalSolicitudOpen(false)}
          currentUser={currentUser}
          items={items}
          sedes={sedesList}
          proyectos={proyectosList}
          onSolicitudCreated={(nuevaSol) => {
            setSolicitudes((prev) => [nuevaSol, ...prev]);
            setActiveTab('solicitudes');
            setSolicitudesPage(1);
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      )}

      {/* MODAL DETALLE DE MOTIVO DE RECHAZO */}
      {modalMotivoRechazo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '16px',
          }}
          onClick={() => setModalMotivoRechazo(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--surface, #1e293b)',
              borderRadius: '16px',
              border: '1px solid var(--line, #334155)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              color: 'var(--text, #f8fafc)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--line, #334155)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                  }}
                >
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                    Motivo del Rechazo
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim, #94a3b8)' }}>
                    Retroalimentación registrada por Administración
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  lineHeight: 1,
                }}
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--line, #334155)',
                }}
              >
                <span style={{ color: 'var(--text-dim, #94a3b8)' }}>Sede solicitante:</span>
                <span style={{ fontWeight: 600 }}>{modalMotivoRechazo.solicitud?.sede || 'Medellín'}</span>
              </div>

              {modalMotivoRechazo.solicitud?.motivo && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ color: 'var(--text-dim, #94a3b8)' }}>Propósito original de la solicitud:</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text, #f8fafc)' }}>
                    "{modalMotivoRechazo.solicitud.motivo}"
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ef4444' }}>
                  Nota / Justificación del Administrador:
                </label>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'var(--text, #f8fafc)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {modalMotivoRechazo.motivo}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--line, #334155)',
                backgroundColor: 'var(--surface-2, #0b1320)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setModalMotivoRechazo(null)}
                className="btn"
                style={{
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#84CC16',
                  color: '#020617',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
