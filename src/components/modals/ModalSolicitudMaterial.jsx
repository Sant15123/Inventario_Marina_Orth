import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  PackagePlus,
  Laptop,
  Package,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  FolderGit2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Check,
  ChevronDown,
  Loader2,
  ShoppingCart,
  ExternalLink,
  Store,
  Zap,
} from 'lucide-react';
import { today, PROYECTOS } from '../../services/mockData';
import inventoryApi from '../../services/inventoryApi';
import { supabase } from '../../services/supabase';
import { useProyectos } from '../../hooks/useProyectos';
import { getProyectoPrograma, PROYECTOS_STEAM_OFICIALES } from '../../constants/proyectos';
import ProgramAreaBadge, { resolveAreaConfig } from '../common/ProgramAreaBadge';
import { getProveedoresRecomendados } from '../../services/proveedoresService';
import { registrarAuditoria } from '../../services/historyAuditService';
import { useToast } from '../../context/ToastContext';
import {
  getAvailableStock,
  formatItemOptionLabel,
  fetchFreshPrestamosCatalog,
} from '../../services/prestamosCatalogService';

export default function ModalSolicitudMaterial({
  isOpen,
  onClose,
  currentUser,
  items = [],
  sedes = [],
  proyectos = [],
  onSolicitudCreated,
  showSuccess,
  showError,
}) {
  const toast = useToast();
  const [cantidadError, setCantidadError] = useState(false);

  // Helper centralizado para emitir alertas con el sistema global de toasts (esquina superior derecha, z-[999999])
  const triggerErrorToast = (titleOrMsg, details) => {
    const fn = showError || toast?.showError;
    if (typeof fn === 'function') {
      fn(titleOrMsg, details);
    }
  };

  // 1. Estados principales del formulario (declarados al inicio)
  const [tipoSolicitud, setTipoSolicitud] = useState('PRESTAMO_EQUIPO'); // 'PRESTAMO_EQUIPO' | 'CONSUMIBLES' | 'SUGERENCIA_COMPRA'
  const [sede, setSede] = useState(() => currentUser?.sede || sedes[0] || 'Medellín');
  const [proyectoId, setProyectoId] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [itemsSolicitud, setItemsSolicitud] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [cantidadInput, setCantidadInput] = useState(1);
  const [compraForm, setCompraForm] = useState({
    categoria: 'consumibles', // 'consumibles' | 'electronica' | 'papeleria'
    nombre: '',
    url: '',
    cantidad: 1,
    precio: '',
  });

  // Directorio de Proveedores Recomendados (cargados dinámicamente)
  const [proveedoresRecomendados, setProveedoresRecomendados] = useState([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  // Catálogo sincronizado en tiempo real desde Supabase para garantizar stock y disponibilidad exacta
  const [liveCatalog, setLiveCatalog] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetchFreshPrestamosCatalog(items).then((fresh) => {
      if (isMounted && Array.isArray(fresh) && fresh.length > 0) {
        setLiveCatalog(fresh);
      }
    }).catch((err) => {
      console.warn('[ModalSolicitudMaterial] Fallback a items de contexto:', err);
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, items]);

  const activeCatalog = (liveCatalog && liveCatalog.length > 0) ? liveCatalog : items;

  // Estado y ref para el selector con íconos de Proyecto STEAM
  const [dropdownProyectoOpen, setDropdownProyectoOpen] = useState(false);
  const dropdownProyectoRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownProyectoRef.current && !dropdownProyectoRef.current.contains(event.target)) {
        setDropdownProyectoOpen(false);
      }
    }
    if (dropdownProyectoOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownProyectoOpen]);

  useEffect(() => {
    let mounted = true;
    const fetchProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const data = await getProveedoresRecomendados();
        if (mounted) {
          setProveedoresRecomendados(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('[ModalSolicitudMaterial] Error cargando proveedores desde Supabase:', err);
        if (showError) {
          showError('Error al consultar tiendas recomendadas', err?.message || 'No se pudo conectar con Supabase.');
        }
      } finally {
        if (mounted) setLoadingProveedores(false);
      }
    };

    if (isOpen) {
      fetchProveedores();
    }

    const handleChanged = () => fetchProveedores();
    window.addEventListener('siga:proveedores_changed', handleChanged);
    return () => {
      mounted = false;
      window.removeEventListener('siga:proveedores_changed', handleChanged);
    };
  }, [isOpen]);

  // 2. Variables derivadas (evaluadas tras declarar todos los estados)
  const esCompra = tipoSolicitud === 'SUGERENCIA_COMPRA' || tipoSolicitud === 'compra';
  const esPrestamo = tipoSolicitud === 'PRESTAMO_EQUIPO';
  const esConsumibles = tipoSolicitud === 'CONSUMIBLES' || tipoSolicitud.includes('CONSUMIB');

  // Proyectos STEAM unificados (Fuente única de verdad)
  const { proyectos: proyectosFromHook, formatLabel } = useProyectos();
  const listaProyectos = useMemo(() => {
    const raw = Array.isArray(proyectosFromHook) && proyectosFromHook.length > 0
      ? proyectosFromHook
      : (Array.isArray(proyectos) && proyectos.length > 0 ? proyectos : PROYECTOS_STEAM_OFICIALES);

    return raw.map((p) => {
      if (typeof p === 'string') {
        const prog = getProyectoPrograma(p);
        return {
          id: p,
          nombre: p,
          sede_municipio: 'Medellín',
          programa: prog,
        };
      }
      return {
        ...p,
        nombre: p.nombre || p.name || '',
        sede_municipio: p.sede_municipio || p.sede || p.municipio || 'Medellín',
        programa: p.programa || getProyectoPrograma(p.nombre || p.name || ''),
      };
    });
  }, [proyectos, proyectosFromHook]);

  // Proyecto actualmente seleccionado y su configuración FMO
  const selectedProyectoObj = useMemo(() => {
    if (!proyectoId) return null;
    return (
      listaProyectos.find(
        (p) => p.nombre === proyectoId || p.id === proyectoId
      ) || { nombre: proyectoId, programa: getProyectoPrograma(proyectoId) }
    );
  }, [proyectoId, listaProyectos]);

  const selectedProyectoConfig = useMemo(() => {
    if (!selectedProyectoObj) return null;
    const prog = selectedProyectoObj.programa || getProyectoPrograma(selectedProyectoObj.nombre);
    return resolveAreaConfig(prog);
  }, [selectedProyectoObj]);

  // Catálogo disponible unificado y filtrado por disponibilidad real (> 0 unidades disponibles)
  const catalogoDisponible = useMemo(() => {
    if (tipoSolicitud === 'PRESTAMO_EQUIPO') {
      // Unifica Equipos Tecnológicos y Equipos de Electrónica (Retornables) con stock disponible > 0
      return (activeCatalog || []).filter(
        (it) => (it.itemType === 'equipo' || it.itemType === 'electronica') && getAvailableStock(it) > 0
      );
    }
    // Consumibles / insumos de robótica / papelería con stock disponible > 0
    return (activeCatalog || []).filter(
      (it) => it.itemType === 'consumible' && getAvailableStock(it) > 0
    );
  }, [activeCatalog, tipoSolicitud]);

  // Ítem actualmente seleccionado en el selector
  const currentItemInfo = useMemo(() => {
    if (!selectedItemId) return null;
    return catalogoDisponible.find((it) => String(it.id) === String(selectedItemId)) || null;
  }, [catalogoDisponible, selectedItemId]);

  // Stock disponible real del ítem seleccionado (calculado estrictamente, sin defaults artificiales a 1)
  const stockDisponibleItem = useMemo(() => {
    if (!currentItemInfo) return 0;
    return getAvailableStock(currentItemInfo);
  }, [currentItemInfo]);

  // Validación estricta para habilitar el botón "Enviar Solicitud"
  // Requiere: al menos un ítem agregado, fecha (si aplica), sede, proyecto STEAM y justificación
  const isFormValid = useMemo(() => {
    // 1. Al menos un ítem agregado
    const tieneItems = itemsSolicitud.length > 0 || (esCompra && Boolean(compraForm.nombre?.trim() && compraForm.url?.trim()));
    if (!tieneItems) return false;

    // 2. Fecha requerida (solo obligatoria para sugerencias de compra; opcional en préstamo de equipo)
    if (esCompra && !fechaEstimada) {
      return false;
    }

    // 3. Sede / Municipio destino
    if (!sede || !sede.trim()) return false;

    // 4. Proyecto STEAM vinculado (estrictamente obligatorio)
    if (!proyectoId || !proyectoId.trim()) return false;

    // 5. Motivo / Justificación pedagógica
    if (!motivo || !motivo.trim()) return false;

    return true;
  }, [itemsSolicitud.length, esCompra, compraForm.nombre, compraForm.url, tipoSolicitud, fechaEstimada, sede, proyectoId, motivo]);

  if (!isOpen) return null;

  // Cambiar tipo de solicitud (reinicia ítems seleccionados)
  const handleChangeTipo = (nuevoTipo) => {
    if (nuevoTipo === tipoSolicitud) return;
    setTipoSolicitud(nuevoTipo);
    setItemsSolicitud([]);
    setSelectedItemId('');
    setCantidadInput(1);
    setCompraForm({
      categoria: 'consumibles',
      nombre: '',
      url: '',
      cantidad: 1,
      precio: '',
    });
    setValidationError('');
  };

  // Agregar ítem de catálogo a la lista
  const handleAddItem = () => {
    setValidationError('');
    if (!selectedItemId || !currentItemInfo) {
      triggerErrorToast('Validación', 'Selecciona un artículo del catálogo para agregar.');
      return;
    }

    const qty = parseInt(cantidadInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setCantidadError(true);
      triggerErrorToast('Validación', 'La cantidad debe ser mayor a 0.');
      return;
    }

    // Calcular cantidad acumulada si el ítem ya estaba agregado en la lista
    const yaExiste = itemsSolicitud.find((it) => String(it.item_id) === String(currentItemInfo.id));
    const cantidadYaEnLista = yaExiste ? Number(yaExiste.cantidad || 0) : 0;
    const cantidadTotal = cantidadYaEnLista + qty;

    // Validación estricta sin revelar la cantidad exacta en inventario
    if (stockDisponibleItem <= 0 || cantidadTotal > stockDisponibleItem) {
      setCantidadError(true);
      triggerErrorToast(
        'Validación',
        'La cantidad solicitada supera la disponibilidad actual en inventario. Ingresa una cantidad menor o registra una Sugerencia de Compra.'
      );
      return;
    }

    setCantidadError(false);
    if (yaExiste) {
      setItemsSolicitud((prev) =>
        prev.map((it) =>
          String(it.item_id) === String(currentItemInfo.id)
            ? { ...it, cantidad: cantidadTotal }
            : it
        )
      );
    } else {
      const nuevoItem = {
        tipo_item: tipoSolicitud === 'PRESTAMO_EQUIPO' ? (currentItemInfo.itemType || 'equipo') : 'consumible',
        item_id: currentItemInfo.id,
        nombre_item: currentItemInfo.name || currentItemInfo.material || 'Artículo',
        cantidad: qty,
        unidad: currentItemInfo.unit || 'und',
      };
      setItemsSolicitud((prev) => [...prev, nuevoItem]);
    }

    setSelectedItemId('');
    setCantidadInput(1);
  };

  // Actualizar cantidad de un ítem existente en la lista con validación de stock
  const handleUpdateItemQty = (idx, newQty) => {
    const item = itemsSolicitud[idx];
    if (!item) return;
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    if (item.tipo_item !== 'compra') {
      const catItem = (activeCatalog || []).find((c) => String(c.id) === String(item.item_id));
      const availableStock = catItem ? getAvailableStock(catItem) : 0;

      if (availableStock <= 0 || qty > availableStock) {
        triggerErrorToast(
          'Validación',
          'La cantidad solicitada supera la disponibilidad actual en inventario. Ingresa una cantidad menor o registra una Sugerencia de Compra.'
        );
        return;
      }
    }

    setValidationError('');
    setItemsSolicitud((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, cantidad: qty } : it))
    );
  };

  // Agregar ítem sugerido de compra
  const handleAgregarCompra = () => {
    setValidationError('');
    if (!compraForm.nombre.trim()) {
      triggerErrorToast('Validación', 'Ingresa el nombre o especificación del producto sugerido.');
      return;
    }

    const urlTrimmed = (compraForm.url || '').trim();
    if (!urlTrimmed || !/^https?:\/\//i.test(urlTrimmed)) {
      triggerErrorToast('Validación', 'Debes ingresar un enlace de compra válido (https://...) para poder sugerir este material.');
      return;
    }

    const qty = parseInt(compraForm.cantidad, 10);
    if (isNaN(qty) || qty <= 0) {
      triggerErrorToast('Validación', 'La cantidad debe ser mayor a 0.');
      return;
    }
    const precioNum = compraForm.precio ? parseFloat(compraForm.precio) : 0;
    if (compraForm.precio && (isNaN(precioNum) || precioNum < 0)) {
      triggerErrorToast('Validación', 'El precio estimado debe ser un número válido.');
      return;
    }

    const rawCat = compraForm.categoria || 'consumibles';
    const catDestino = ['consumibles', 'electronica', 'papeleria'].includes(rawCat)
      ? rawCat
      : (rawCat.includes('electron') ? 'electronica' : (rawCat.includes('pape') ? 'papeleria' : 'consumibles'));

    const nuevoItem = {
      tipo_item: 'compra',
      item_id: null,
      nombre_item: compraForm.nombre.trim(),
      nombre_sugerido: compraForm.nombre.trim(),
      categoria_sugerida: catDestino, // 'consumibles' | 'electronica' | 'papeleria'
      url_compra: urlTrimmed,
      precio_estimado: precioNum || 0,
      cantidad: qty,
      unidad: 'und',
      ingresado_inventario: false,
    };

    setItemsSolicitud((prev) => [...prev, nuevoItem]);
    setCompraForm((prev) => ({
      ...prev,
      nombre: '',
      url: '',
      cantidad: 1,
      precio: '',
    }));
  };

  // Probar enlace de compra en pestaña nueva
  const handleTestUrl = () => {
    if (!compraForm.url.trim()) return;
    let url = compraForm.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Eliminar ítem de la lista
  const handleRemoveItem = (index) => {
    setItemsSolicitud((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Enviar la solicitud completa
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    let itemsParaEnviar = [...itemsSolicitud];
    if (itemsParaEnviar.length === 0) {
      if (esCompra && compraForm.nombre.trim()) {
        const urlTrimmed = (compraForm.url || '').trim();
        if (!urlTrimmed || !/^https?:\/\//i.test(urlTrimmed)) {
          triggerErrorToast('Validación', 'Debes ingresar un enlace de compra válido (https://...) para poder sugerir este material.');
          return;
        }
        const qty = parseInt(compraForm.cantidad, 10) || 1;
        const precioNum = compraForm.precio ? parseFloat(compraForm.precio) : 0;
        const rawCat = compraForm.categoria || 'consumibles';
        const catDestino = ['consumibles', 'electronica', 'papeleria'].includes(rawCat)
          ? rawCat
          : (rawCat.includes('electron') ? 'electronica' : (rawCat.includes('pape') ? 'papeleria' : 'consumibles'));
        const nuevoItem = {
          tipo_item: 'compra',
          item_id: null,
          nombre_item: compraForm.nombre.trim(),
          nombre_sugerido: compraForm.nombre.trim(),
          categoria_sugerida: catDestino,
          url_compra: urlTrimmed,
          precio_estimado: precioNum || 0,
          cantidad: qty,
          unidad: 'und',
          ingresado_inventario: false,
        };
        itemsParaEnviar = [nuevoItem];
        setItemsSolicitud(itemsParaEnviar);
      } else {
        triggerErrorToast(
          'Validación',
          esCompra
            ? 'Debes ingresar un producto y su enlace de compra válido (https://...) para sugerir material.'
            : 'Debes agregar al menos un artículo a la solicitud.'
        );
        return;
      }
    }

    if (tipoSolicitud === 'SUGERENCIA_COMPRA' || esCompra) {
      const itemInvalido = itemsParaEnviar.find((item) => {
        const u = (item.url_compra || '').trim();
        return !u || !/^https?:\/\//i.test(u);
      });
      if (itemInvalido) {
        triggerErrorToast('Validación', 'Debes ingresar un enlace de compra válido (https://...) para poder sugerir este material.');
        return;
      }
    }

    if (!motivo.trim()) {
      triggerErrorToast(
        'Validación',
        esCompra
          ? 'La justificación pedagógica / actividad es obligatoria.'
          : 'El motivo o justificación pedagógica es obligatorio.'
      );
      return;
    }

    if (esCompra && !fechaEstimada) {
      triggerErrorToast(
        'Validación',
        'La fecha ideal requerida es obligatoria para la sugerencia de compra.'
      );
      return;
    }

    if ((tipoSolicitud === 'PRESTAMO_EQUIPO' || esCompra) && fechaEstimada) {
      const fechaActual = today();
      if (fechaEstimada < fechaActual) {
        triggerErrorToast(
          'Validación',
          esCompra
            ? 'La fecha ideal requerida no puede ser una fecha pasada.'
            : 'La fecha estimada de devolución no puede ser una fecha pasada.'
        );
        return;
      }
    }

    if (!sede || !sede.trim()) {
      triggerErrorToast('Validación', 'Debes seleccionar una sede / municipio destino.');
      return;
    }

    if (!proyectoId || !proyectoId.trim()) {
      triggerErrorToast('Validación', 'Debes seleccionar un Proyecto STEAM vinculado para radicar la solicitud.');
      return;
    }

    // Doble validación estricta de stock antes de enviar (sin revelar cantidades exactas)
    if (tipoSolicitud === 'PRESTAMO_EQUIPO' || tipoSolicitud === 'CONSUMIBLES') {
      let catalogoVigente = activeCatalog;
      try {
        const fresh = await fetchFreshPrestamosCatalog(activeCatalog);
        if (Array.isArray(fresh) && fresh.length > 0) {
          catalogoVigente = fresh;
        }
      } catch (_) {}

      for (const item of itemsParaEnviar) {
        if (item.tipo_item === 'compra') continue;
        const catItem = (catalogoVigente || []).find((c) => String(c.id) === String(item.item_id));
        const availableStock = catItem ? getAvailableStock(catItem) : 0;
        const requestedQty = Number(item.cantidad || 1);

        if (availableStock <= 0 || requestedQty > availableStock) {
          setCantidadError(true);
          triggerErrorToast(
            'Validación',
            'La cantidad solicitada supera la disponibilidad actual en inventario. Ingresa una cantidad menor o registra una Sugerencia de Compra.'
          );
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setValidationError('');

      // FLUJO EXCLUSIVO PARA SUGERENCIA DE COMPRA -> TABLA DEDICADA 'solicitudes_compra'
      if (tipoSolicitud === 'SUGERENCIA_COMPRA') {
        const registrosCompra = itemsParaEnviar.map((item) => {
          const rawCat = String(item.categoria_sugerida || item.categoria_destino || item.categoria || 'consumibles').toLowerCase();
          const catDestino = ['consumibles', 'electronica', 'papeleria'].includes(rawCat)
            ? rawCat
            : (rawCat.includes('electron') ? 'electronica' : (rawCat.includes('pape') ? 'papeleria' : 'consumibles'));
          const urlValida = (item.url_compra || '').trim();
          return {
            usuario_id: currentUser?.id || currentUser?.documento || null,
            usuario_nombre: currentUser?.nombre_completo || currentUser?.nombre || 'Docente / Custodio',
            solicitante_nombre: currentUser?.nombre_completo || currentUser?.nombre || 'Docente / Custodio',
            solicitante_documento: currentUser?.documento || '',
            solicitante_correo: currentUser?.email || currentUser?.correo || '',
            solicitante_telefono: currentUser?.telefono || '',
            sede: sede || 'Medellín',
            sede_destino: sede || 'Medellín',
            proyecto_steam: (proyectoId || '').trim() || 'Robótica',
            proyecto_steam_id: (proyectoId || '').trim() || 'Robótica',
            categoria_destino: catDestino,
            nombre_producto: item.nombre_sugerido || item.nombre_producto || item.nombre_item || 'Producto sugerido',
            url_compra: urlValida,
            cantidad: Number(item.cantidad) || 1,
            cantidad_solicitada: Number(item.cantidad) || 1,
            precio_estimado: Number(item.precio_estimado) || 0,
            valor_estimado_compra: (Number(item.precio_estimado) || 0) * (Number(item.cantidad) || 1),
            fecha_requerida: fechaEstimada || null,
            justificacion: motivo.trim(),
            prioridad: 'Media',
            estado: 'Pendiente',
            ingresado_inventario: false,
            items: itemsParaEnviar.map((i) => {
              const rCat = String(i.categoria_sugerida || i.categoria_destino || catDestino).toLowerCase();
              const cDest = ['consumibles', 'electronica', 'papeleria'].includes(rCat)
                ? rCat
                : (rCat.includes('electron') ? 'electronica' : (rCat.includes('pape') ? 'papeleria' : 'consumibles'));
              return {
                nombre: i.nombre_sugerido || i.nombre_producto || i.nombre_item || 'Producto sugerido',
                categoria_sugerida: cDest,
                cantidad_solicitada: Number(i.cantidad) || 1,
                cantidad_aprobada: Number(i.cantidad) || 1,
                precio_estimado_unitario: Number(i.precio_estimado) || 0,
                url_compra: (i.url_compra || '').trim(),
              };
            }),
            creado_en: new Date().toISOString(),
          };
        });

        let resultadoCompra = null;
        try {
          resultadoCompra = await inventoryApi.createSolicitudesCompra(registrosCompra);
        } catch (errSup) {
          console.error('[ModalSolicitudMaterial] Error al radicar compra en Supabase:', {
            mensaje: errSup?.message || errSup,
            detalles: errSup?.details,
            pista: errSup?.hint,
          });
          const detalleMsg = errSup?.message || 'No se pudo registrar la solicitud en Supabase.';
          if (showError) {
            showError('Error al radicar solicitud de compra', detalleMsg);
          } else {
            setValidationError(`Error en base de datos: ${detalleMsg}`);
          }
          setSubmitting(false);
          return;
        }

        if (!resultadoCompra || resultadoCompra.length === 0) {
          const msg = 'No se obtuvo confirmación de Supabase al guardar la solicitud de compra.';
          if (showError) showError('Error en base de datos', msg);
          setSubmitting(false);
          return;
        }

        const primerReg = registrosCompra[0] || {};
        const solicitudCreadaCompra = resultadoCompra[0];

        const catLegible = primerReg.categoria_destino === 'electronica'
          ? 'Equipos de Electrónica'
          : (primerReg.categoria_destino === 'papeleria' ? 'Papelería' : 'Consumibles de Robótica');

        const radicadoCorto = solicitudCreadaCompra.radicado || (solicitudCreadaCompra.id ? `SC-${String(solicitudCreadaCompra.id).replace(/^#|^SC-|^SOL-/i, '').replace(/-/g, '').slice(0, 8).toUpperCase()}` : 'SC-NUEVA');

        const proyNombre = (proyectoId || '').trim() || primerReg.proyecto_steam || 'Robótica';

        try {
          await registrarAuditoria({
            tipo: 'Solicitud de Compra',
            elemento: primerReg.nombre_producto || 'Solicitud de Compra',
            id_referencia: radicadoCorto,
            cantidad: Number(primerReg.cantidad) || 1,
            responsable: `${currentUser?.nombre_completo || currentUser?.nombre || 'Docente FMO'} (${currentUser?.rol || 'Docente'})`,
            documento_responsable: currentUser?.documento || '',
            sede: sede || 'Medellín',
            motivo: `Radicación de solicitud de compra para proyecto ${proyNombre}. Categoría destino: ${catLegible}. Justificación: ${motivo.trim() || 'Sin justificación especificada'}`,
          });
        } catch (audErr) {
          console.warn('Aviso auditoría solicitud compra:', audErr?.message);
        }

        if (showSuccess) {
          showSuccess(
            '¡Solicitud radicada con éxito!',
            'El equipo administrativo la revisará pronto.'
          );
        }

        if (onSolicitudCreated) {
          onSolicitudCreated(solicitudCreadaCompra);
        }

        try {
          window.dispatchEvent(
            new CustomEvent('siga:solicitud_creada', { detail: solicitudCreadaCompra })
          );
        } catch (e) {
          console.warn('Error emitiendo evento de solicitud compra creada:', e);
        }

        onClose();
        return;
      }

      const fechaDevolucionVal =
        tipoSolicitud === 'PRESTAMO_EQUIPO' && fechaEstimada && String(fechaEstimada).trim() !== ''
          ? String(fechaEstimada).trim()
          : null;

      // 1. Cabecera con tipo_solicitud literal de BD: 'PRESTAMO_EQUIPO' | 'CONSUMIBLES' | 'SUGERENCIA_COMPRA'
      const payloadSolicitud = {
        usuario_id: currentUser?.id || currentUser?.documento || null,
        usuario_nombre: currentUser?.nombre || currentUser?.nombre_completo || 'Docente / Custodio',
        sede: sede || 'Medellín',
        tipo_solicitud: tipoSolicitud,
        proyecto_steam_id: (proyectoId || '').trim(),
        proyecto: (proyectoId || '').trim(),
        motivo: motivo.trim(),
        justificacion: motivo.trim(),
        fecha_devolucion_estimada: fechaDevolucionVal,
        estado: 'PENDIENTE',
        creado_en: new Date().toISOString(),
      };

      // 2. Normalizar ítems a insertar
      const itemsParaInsertar = itemsParaEnviar.map((item) => {
        if (tipoSolicitud === 'SUGERENCIA_COMPRA') {
          const rawCat = String(item.categoria_sugerida || item.categoria || 'consumibles').toLowerCase();
          const cat = ['consumibles', 'electronica', 'papeleria'].includes(rawCat)
            ? rawCat
            : (rawCat.includes('electron') ? 'electronica' : (rawCat.includes('pape') ? 'papeleria' : 'consumibles'));
          return {
            tipo_item: 'compra',
            item_id: null,
            nombre_item: item.nombre_sugerido || item.nombre_item || 'Artículo sugerido',
            cantidad: Number(item.cantidad) || 1,
            nombre_sugerido: item.nombre_sugerido || item.nombre_item || 'Artículo sugerido',
            categoria_sugerida: cat, // 'consumibles' | 'electronica' | 'papeleria'
            url_compra: (item.url_compra || '').trim(),
            precio_estimado: Number(item.precio_estimado) || 0,
            ingresado_inventario: false,
          };
        } else {
          return {
            tipo_item: item.tipo_item || (tipoSolicitud === 'CONSUMIBLES' ? 'consumible' : 'equipo'),
            item_id: item.item_id || null,
            nombre_item: item.nombre_item || 'Artículo',
            cantidad: Number(item.cantidad) || 1,
            nombre_sugerido: null,
            categoria_sugerida: null,
            url_compra: null,
            precio_estimado: 0,
            ingresado_inventario: false,
          };
        }
      });

      console.log('PAYLOAD ENVIADO:', payloadSolicitud, itemsParaInsertar);

      let solicitudCreada = null;
      let errorInsercion = null;

      // 3. Inserción directa en Supabase
      try {
        if (supabase) {
          const { data: solData, error: solErr } = await supabase
            .from('solicitudes_inventario')
            .insert(payloadSolicitud)
            .select()
            .single();

          if (solErr) throw solErr;

          let itemsFinales = [];
          if (itemsParaInsertar.length > 0) {
            const itemsConId = itemsParaInsertar.map((it) => ({
              ...it,
              solicitud_id: solData.id,
            }));

            const { data: itemsData, error: itemsErr } = await supabase
              .from('items_solicitud')
              .insert(itemsConId)
              .select();

            if (itemsErr) {
              console.error('Error insertando en items_solicitud:', itemsErr);
              itemsFinales = itemsConId;
            } else {
              itemsFinales = itemsData || itemsConId;
            }
          }

          solicitudCreada = {
            ...solData,
            tipo: tipoSolicitud,
            tipo_solicitud: tipoSolicitud,
            items: itemsFinales,
            items_solicitud: itemsFinales,
          };

          try {
            const local = localStorage.getItem('siga_solicitudes_inventario');
            const list = local ? JSON.parse(local) : [];
            list.unshift(solicitudCreada);
            localStorage.setItem('siga_solicitudes_inventario', JSON.stringify(list));
          } catch (e) {
            console.warn('Sync cache local error:', e);
          }
        }
      } catch (errSupabase) {
        console.warn('Inserción directa a Supabase falló, recurriendo a inventoryApi:', errSupabase);
        errorInsercion = errSupabase;
      }

      // 4. Fallback a inventoryApi si la conexión directa no fue posible
      if (!solicitudCreada) {
        const payloadApi = {
          ...payloadSolicitud,
          tipo: tipoSolicitud,
          tipoSolicitud: tipoSolicitud,
          items: itemsParaInsertar,
          items_solicitud: itemsParaInsertar,
        };
        const res = await inventoryApi.createSolicitud(payloadApi);
        if (res && (res.status === 200 || res.status === 201)) {
          solicitudCreada = res.data || payloadApi;
        } else {
          throw errorInsercion || new Error('No se pudo radicar la solicitud');
        }
      }

      if (showSuccess) {
        showSuccess(
          '¡Solicitud radicada con éxito!',
          'El equipo administrativo la revisará pronto.'
        );
      }

      if (onSolicitudCreated) {
        onSolicitudCreated(solicitudCreada);
      }

      // Emitir evento reactivo local para actualizar de inmediato el badge de la campanita y listas
      try {
        window.dispatchEvent(
          new CustomEvent('siga:solicitud_creada', { detail: solicitudCreada })
        );
      } catch (e) {
        console.warn('Error emitiendo evento de solicitud creada:', e);
      }

      // Cerrar modal
      onClose();
    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      const mensaje =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Error al conectar con el servidor';

      setValidationError(`Error: ${mensaje}`);
      if (showError) {
        showError('Error al enviar solicitud', `Error: ${mensaje}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 19, 43, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--surface, #0f172a)',
          borderColor: 'var(--line-strong, #1e293b)',
          color: 'var(--text, #f8fafc)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 2. Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{
            borderBottom: '1px solid var(--line, #1e293b)',
            backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'rgba(132, 204, 22, 0.15)',
                border: '1px solid rgba(132, 204, 22, 0.35)',
                color: '#84CC16',
              }}
            >
              <PackagePlus size={20} />
            </div>
            <div>
              <h2
                className="text-xl font-bold flex items-center gap-2.5"
                style={{ color: 'var(--text, #f8fafc)', margin: 0 }}
              >
                Solicitud de Equipos e Insumos
              </h2>
              <p
                className="text-xs font-normal mt-0.5"
                style={{ color: 'var(--text-dim, #94a3b8)', margin: 0 }}
              >
                Radica requerimientos de materiales tecnológicos para tus actividades pedagógicas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl transition-all cursor-pointer border-0 outline-none"
            title="Cerrar ventana"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              outline: 'none',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text, #ffffff)';
              e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(148, 163, 184, 0.12))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Formulario y cuerpo scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" style={{ margin: 0 }}>
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {/* 3. Tipo de Solicitud (Segmented Control / Tabs de 3 columnas fijas en una fila) */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                style={{ color: 'var(--text-dim, #94a3b8)' }}
              >
                Tipo de Solicitud
              </label>
              <div
                className="rounded-xl border"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px',
                  padding: '6px',
                  backgroundColor: 'var(--bg-alt, #0b1120)',
                  borderColor: 'var(--line, #1e293b)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleChangeTipo('PRESTAMO_EQUIPO')}
                  className="rounded-lg transition-all cursor-pointer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 8px',
                    fontSize: '13px',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    ...(tipoSolicitud === 'PRESTAMO_EQUIPO'
                      ? {
                          backgroundColor: '#84CC16',
                          color: '#020617',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(132, 204, 22, 0.25)',
                          border: '1px solid #84CC16',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-dim, #94a3b8)',
                          fontWeight: 500,
                          border: '1px solid transparent',
                        }),
                  }}
                  onMouseEnter={(e) => {
                    if (tipoSolicitud !== 'PRESTAMO_EQUIPO') {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(255, 255, 255, 0.05))';
                      e.currentTarget.style.color = 'var(--text, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tipoSolicitud !== 'PRESTAMO_EQUIPO') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                    }
                  }}
                >
                  <Laptop size={16} color={tipoSolicitud === "PRESTAMO_EQUIPO" ? "#FFFFFF" : "#6d6e71"} />
                  <span>Equipo Retornable</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeTipo('CONSUMIBLES')}
                  className="rounded-lg transition-all cursor-pointer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 8px',
                    fontSize: '13px',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    ...(tipoSolicitud === 'CONSUMIBLES'
                      ? {
                          backgroundColor: '#84CC16',
                          color: '#020617',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(132, 204, 22, 0.25)',
                          border: '1px solid #84CC16',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-dim, #94a3b8)',
                          fontWeight: 500,
                          border: '1px solid transparent',
                        }),
                  }}
                  onMouseEnter={(e) => {
                    if (tipoSolicitud !== 'CONSUMIBLES') {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(255, 255, 255, 0.05))';
                      e.currentTarget.style.color = 'var(--text, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tipoSolicitud !== 'CONSUMIBLES') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                    }
                  }}
                >
                  <Package size={16} color={tipoSolicitud === "CONSUMIBLES" ? "#FFFFFF" : "#6d6e71"} />
                  <span>Consumibles</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeTipo('SUGERENCIA_COMPRA')}
                  className="rounded-lg transition-all cursor-pointer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 8px',
                    fontSize: '13px',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    ...(esCompra
                      ? {
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                          border: '1px solid #6366f1',
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: 'var(--text-dim, #94a3b8)',
                          fontWeight: 500,
                          border: '1px solid transparent',
                        }),
                  }}
                  onMouseEnter={(e) => {
                    if (!esCompra) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover, rgba(255, 255, 255, 0.05))';
                      e.currentTarget.style.color = 'var(--text, #f8fafc)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!esCompra) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                    }
                  }}
                >
                  <ShoppingCart size={16} color={esCompra ? "#FFFFFF" : "#6d6e71"} />
                  <span>Sugerencia Compra</span>
                </button>
              </div>
            </div>

            {/* 4. Tarjeta de Selección / Formulario de Sugerencia */}
            {esCompra ? (
              <div
                className="rounded-xl p-4 space-y-4 border"
                style={{
                  backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                  borderColor: 'var(--line, #1e293b)',
                }}
              >
                <div className="flex items-center justify-between">
                  <label
                    className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: '#818cf8' }}
                  >
                    <ShoppingCart size={15} />
                    <span>Detalle del Producto a Sugerir para Compra</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Insumos o materiales no disponibles en bodega
                  </span>
                </div>

                {/* Fila 1: Categoría destino y Nombre del producto */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Categoría destino *
                    </label>
                    <select
                      value={compraForm.categoria}
                      onChange={(e) => setCompraForm({ ...compraForm, categoria: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    >
                      <option value="consumibles">Consumibles de Robótica</option>
                      <option value="electronica">Equipos de Electrónica</option>
                      <option value="papeleria">Papelería</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Nombre / Especificación del producto *
                    </label>
                    <input
                      type="text"
                      value={compraForm.nombre}
                      onChange={(e) => setCompraForm({ ...compraForm, nombre: e.target.value })}
                      placeholder="Ej. Batería LI-PO 3.7V 45mA, Servomotor MG996R, Resma Papel..."
                      className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Enlace de compra con botón lateral Probar */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Enlace De Compra (URL De Referencia) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        required={itemsSolicitud.length === 0}
                        value={compraForm.url}
                        onChange={(e) => {
                          setCompraForm({ ...compraForm, url: e.target.value });
                          if (validationError) setValidationError('');
                        }}
                        placeholder="https://articulo.mercadolibre.com.co/... o tienda virtual"
                        className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{
                          backgroundColor: 'var(--bg, #0b1120)',
                          borderColor: 'var(--line, #334155)',
                          color: 'var(--text, #f8fafc)',
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestUrl}
                      disabled={!compraForm.url.trim()}
                      title="Abrir enlace en nueva pestaña para verificar producto"
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border"
                      style={{
                        backgroundColor: compraForm.url.trim() ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                        borderColor: compraForm.url.trim() ? '#6366f1' : 'var(--line, #334155)',
                        color: compraForm.url.trim() ? '#818cf8' : 'var(--text-dim, #94a3b8)',
                        cursor: compraForm.url.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>🔗 Probar</span>
                    </button>
                  </div>
                </div>

                {/* Directorio de Proveedores Recomendados por la Fundación */}
                <div
                  style={{
                    backgroundColor: 'var(--surface-2, #f8fafc)',
                    border: '1.5px solid var(--line, #e2e8f0)',
                    borderRadius: '14px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {/* Encabezado en una sola fila */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#013a52',
                          color: '#abd037',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(1, 58, 82, 0.25)',
                        }}
                      >
                        <Store size={18} strokeWidth={2.4} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: 'var(--text-h, #013a52)',
                            lineHeight: 1.25,
                          }}
                        >
                          Proveedores Recomendados por la Fundación
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-dim, #6d6e71)',
                            marginTop: '2px',
                            lineHeight: 1.3,
                          }}
                        >
                          Consulta estas tiendas confiables para buscar el enlace de referencia de tu producto
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(171, 208, 55, 0.18)',
                        border: '1.5px solid #abd037',
                        color: 'var(--text-h, #013a52)',
                        fontSize: '11px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {proveedoresRecomendados.length} {proveedoresRecomendados.length === 1 ? 'sugerido' : 'sugeridos'}
                    </div>
                  </div>

                  {/* Listado con scroll suave max-h-52 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      paddingRight: '4px',
                    }}
                  >
                    {loadingProveedores ? (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: 'var(--text-dim, #6d6e71)',
                        }}
                      >
                        Cargando proveedores recomendados...
                      </div>
                    ) : proveedoresRecomendados.length === 0 ? (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontSize: '12px',
                          color: 'var(--text-dim, #6d6e71)',
                          border: '1.5px dashed var(--line, #cbd5e1)',
                          borderRadius: '10px',
                          backgroundColor: 'var(--surface, #ffffff)',
                        }}
                      >
                        No hay proveedores registrados en el directorio en este momento.
                      </div>
                    ) : (
                      proveedoresRecomendados.map((prov) => (
                        <div
                          key={prov.id}
                          style={{
                            backgroundColor: 'var(--surface, #ffffff)',
                            border: '1.5px solid var(--line, #e2e8f0)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '14px',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#abd037';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(171, 208, 55, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--line, #e2e8f0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  color: 'var(--text-h, #013a52)',
                                  fontFamily: "'Poppins', sans-serif",
                                }}
                              >
                                {prov.nombre}
                              </span>
                              <a
                                href={prov.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#0077b6',
                                  backgroundColor: 'rgba(0, 119, 182, 0.08)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  transition: 'background-color 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(0, 119, 182, 0.18)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(0, 119, 182, 0.08)';
                                }}
                                title="Abrir tienda en nueva pestaña"
                              >
                                <span>{prov.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                                <ExternalLink size={11} strokeWidth={2.4} />
                              </a>
                            </div>

                            <p
                              style={{
                                fontSize: '11.5px',
                                color: 'var(--text-dim, #6d6e71)',
                                marginTop: '4px',
                                marginBottom: 0,
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {prov.descripcion}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <a
                              href={prov.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '7px 13px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--text-h, #013a52)',
                                backgroundColor: 'transparent',
                                border: '1.5px solid var(--line-strong, rgba(1, 58, 82, 0.35))',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#013a52';
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.borderColor = '#013a52';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = 'var(--text-h, #013a52)';
                                e.currentTarget.style.borderColor = 'var(--line-strong, rgba(1, 58, 82, 0.35))';
                              }}
                            >
                              <span>Visitar Tienda</span>
                              <ExternalLink size={12} strokeWidth={2.2} />
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setCompraForm((prev) => ({ ...prev, url: prov.url }));
                                if (validationError) setValidationError('');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '7px 15px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#013a52',
                                backgroundColor: '#abd037',
                                border: 'none',
                                boxShadow: '0 2px 8px rgba(171, 208, 55, 0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Poppins', sans-serif",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#96bc28';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(171, 208, 55, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#abd037';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(171, 208, 55, 0.4)';
                              }}
                              title="Copiar el enlace de esta tienda en el formulario"
                            >
                              <span>Usar Tienda</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Fila 3: Cantidad, Precio Estimado y Botón Agregar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Cantidad requerida *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={compraForm.cantidad}
                      onChange={(e) => setCompraForm({ ...compraForm, cantidad: e.target.value })}
                      className="w-full rounded-lg px-3 py-2 text-sm text-center font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{
                        backgroundColor: 'var(--bg, #0b1120)',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text, #f8fafc)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Precio Estimado Unitario (COP)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={compraForm.precio}
                        onChange={(e) => setCompraForm({ ...compraForm, precio: e.target.value })}
                        placeholder="Ej. 25000"
                        className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{
                          backgroundColor: 'var(--bg, #0b1120)',
                          borderColor: 'var(--line, #334155)',
                          color: 'var(--text, #f8fafc)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAgregarCompra}
                      className="w-full font-bold text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      style={{
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        border: '1px solid #6366f1',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      <span>Agregar a la lista</span>
                    </button>
                  </div>
                </div>

                {/* Lista de productos sugeridos agregados */}
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-2">
                    Artículos sugeridos en esta solicitud ({itemsSolicitud.length}):
                  </label>
                  {itemsSolicitud.length === 0 ? (
                    <div
                      className="text-xs text-center py-4 rounded-lg border border-dashed"
                      style={{
                        backgroundColor: 'var(--bg-alt, rgba(11, 17, 32, 0.45))',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text-dim, #94a3b8)',
                      }}
                    >
                      Agrega al menos un artículo o insumo sugerido para compra.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {itemsSolicitud.map((it, idx) => {
                        const subtotal = (it.precio_estimado || 0) * (it.cantidad || 1);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-xl border text-sm shadow-sm transition-all gap-2"
                            style={{
                              backgroundColor: 'var(--bg, #0b1120)',
                              borderColor: 'var(--line, #334155)',
                            }}
                          >
                            <div className="flex flex-col gap-1 overflow-hidden flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                                  style={{
                                    backgroundColor:
                                      it.categoria_sugerida === 'electronica'
                                        ? 'rgba(0, 180, 216, 0.15)'
                                        : it.categoria_sugerida === 'papeleria'
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'rgba(99, 102, 241, 0.15)',
                                    color:
                                      it.categoria_sugerida === 'electronica'
                                        ? '#38bdf8'
                                        : it.categoria_sugerida === 'papeleria'
                                        ? '#fbbf24'
                                        : '#a5b4fc',
                                    border: `1px solid ${
                                      it.categoria_sugerida === 'electronica'
                                        ? 'rgba(0, 180, 216, 0.3)'
                                        : it.categoria_sugerida === 'papeleria'
                                        ? 'rgba(245, 158, 11, 0.3)'
                                        : 'rgba(99, 102, 241, 0.3)'
                                    }`,
                                  }}
                                >
                                  {it.categoria_sugerida === 'electronica'
                                    ? 'Equipos de Electrónica'
                                    : it.categoria_sugerida === 'papeleria'
                                    ? 'Papelería'
                                    : 'Consumibles de Robótica'}
                                </span>
                                <strong className="text-xs truncate text-slate-100 font-semibold">
                                  {it.nombre_sugerido || it.nombre_item}
                                </strong>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                <span>
                                  Cant: <strong className="text-slate-200">{it.cantidad} {it.unidad || 'und'}</strong>
                                </span>
                                {it.precio_estimado > 0 && (
                                  <>
                                    <span>·</span>
                                    <span>
                                      Unit: <strong className="text-emerald-400">${Number(it.precio_estimado).toLocaleString('es-CO')} COP</strong>
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Subtotal: <strong className="text-emerald-400 font-bold">${subtotal.toLocaleString('es-CO')} COP</strong>
                                    </span>
                                  </>
                                )}
                                {it.url_compra && (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={it.url_compra}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
                                    >
                                      <ExternalLink size={12} />
                                      <span>Ver enlace</span>
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Quitar artículo"
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--red, #f43f5e)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl p-4 space-y-3 border"
                style={{
                  backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.6))',
                  borderColor: 'var(--line, #1e293b)',
                }}
              >
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  Seleccionar Artículos del Catálogo
                </label>

                {/* Fila de controles */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedItemId}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setCantidadInput(1);
                      if (cantidadError) setCantidadError(false);
                      if (validationError) setValidationError('');
                    }}
                    className="flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: 'var(--line, #334155)',
                      color: 'var(--text, #f8fafc)',
                    }}
                  >
                    <option value="">
                      {tipoSolicitud === 'PRESTAMO_EQUIPO'
                        ? '-- Selecciona el equipo a prestar --'
                        : '-- Seleccionar material o insumo --'}
                    </option>
                    {catalogoDisponible.map((it) => (
                      <option key={it.id} value={it.id}>
                        {formatItemOptionLabel(it, { includeStock: false })}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={cantidadInput}
                    onChange={(e) => {
                      setCantidadInput(e.target.value);
                      if (cantidadError) setCantidadError(false);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Cant."
                    className={`w-20 rounded-lg px-3 py-2 text-sm text-center font-semibold border transition-all ${
                      cantidadError
                        ? 'border-red-500 ring-2 ring-red-500/20 text-red-400 focus:outline-none'
                        : 'focus:outline-none focus:ring-2 focus:ring-[#84CC16]'
                    }`}
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: cantidadError ? '#ef4444' : 'var(--line, #334155)',
                      color: cantidadError ? '#f87171' : 'var(--text, #f8fafc)',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedItemId}
                    className="font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: '#84CC16',
                      color: '#020617',
                      border: '1px solid #84CC16',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedItemId) e.currentTarget.style.backgroundColor = '#65A30D';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedItemId) e.currentTarget.style.backgroundColor = '#84CC16';
                    }}
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Agregar</span>
                  </button>
                </div>

                {/* Lista de Artículos Agregados */}
                <div>
                  {itemsSolicitud.length === 0 ? (
                    <div
                      className="text-xs text-center py-4 rounded-lg border border-dashed"
                      style={{
                        backgroundColor: 'var(--bg-alt, rgba(11, 17, 32, 0.45))',
                        borderColor: 'var(--line, #334155)',
                        color: 'var(--text-dim, #94a3b8)',
                      }}
                    >
                      Ningún artículo agregado aún a esta solicitud.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {itemsSolicitud.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm shadow-sm transition-all"
                          style={{
                            backgroundColor: 'var(--bg, #0b1120)',
                            borderColor: 'var(--line, #334155)',
                          }}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span
                              className="p-1.5 rounded-md shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor: 'rgba(132, 204, 22, 0.15)',
                                color: '#84CC16',
                              }}
                            >
                              {it.tipo_item === 'electronica' ? (
                                <Zap size={14} />
                              ) : it.tipo_item === 'equipo' ? (
                                <Laptop size={14} />
                              ) : (
                                <Package size={14} />
                              )}
                            </span>
                            <span
                              className="font-medium truncate text-xs"
                              style={{ color: 'var(--text, #f8fafc)' }}
                            >
                              {it.nombre_item}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div
                              className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 border"
                              style={{
                                backgroundColor: 'var(--bg-alt, rgba(30, 41, 59, 0.6))',
                                borderColor: 'var(--line, #334155)',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, it.cantidad - 1)}
                                disabled={it.cantidad <= 1}
                                className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text, #f8fafc)' }}
                                title="Disminuir cantidad"
                              >
                                -
                              </button>
                              <span
                                className="px-1.5 py-0.5 rounded text-xs font-bold min-w-[24px] text-center"
                                style={{
                                  backgroundColor: 'rgba(132, 204, 22, 0.18)',
                                  color: '#bef264',
                                }}
                              >
                                {it.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(idx, it.cantidad + 1)}
                                className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-pointer hover:bg-slate-700/50"
                                style={{ color: 'var(--text, #f8fafc)' }}
                                title="Aumentar cantidad"
                              >
                                +
                              </button>
                              <span className="text-[11px] text-slate-400 pl-0.5 pr-1">{it.unidad || 'und'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Quitar artículo"
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--red, #f43f5e)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(244, 63, 94, 0.12)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Campos de Formulario y Tipografía */}
            {/* Fecha de Devolución Pactada (Opcional para préstamos) o Fecha Ideal Requerida (Para sugerencias de compra) */}
            {(tipoSolicitud === 'PRESTAMO_EQUIPO' || esCompra) && (
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <Calendar size={14} style={{ color: '#6d6e71' }} />
                  <span>
                    {esCompra ? 'Fecha Ideal Requerida' : 'Fecha de devolución pactada (Opcional)'}
                  </span>
                  {esCompra && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="date"
                  min={today()}
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  required={esCompra}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                />
                <span
                  className="text-[11px] mt-1 block"
                  style={{ color: 'var(--text-muted, #64748b)' }}
                >
                  {esCompra
                    ? 'Fecha estimada en la que se necesita disponer de los materiales para las clases o actividades.'
                    : 'Opcional: fecha límite pactada para retornar los equipos a la bodega o sede central.'}
                </span>
              </div>
            )}

            {/* Sede / Municipio Destino y Proyecto STEAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <MapPin size={14} style={{ color: '#6d6e71' }} />
                  <span>Sede / Municipio Destino</span>
                  <span className="text-rose-400">*</span>
                </label>
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                  style={{
                    backgroundColor: 'var(--bg, #0b1120)',
                    borderColor: 'var(--line, #334155)',
                    color: 'var(--text, #f8fafc)',
                  }}
                >
                  {sedes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                  style={{ color: 'var(--text-dim, #94a3b8)' }}
                >
                  <FolderGit2 size={14} style={{ color: '#84CC16' }} />
                  <span>Proyecto STEAM Vinculado</span>
                  <span className="text-rose-400">*</span>
                </label>

                {/* Selector personalizado de Proyecto STEAM con íconos oficiales FMO */}
                <div ref={dropdownProyectoRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownProyectoOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all text-left"
                    style={{
                      backgroundColor: 'var(--bg, #0b1120)',
                      borderColor: dropdownProyectoOpen ? '#84CC16' : 'var(--line, #334155)',
                      color: 'var(--text, #f8fafc)',
                      minHeight: '44px',
                    }}
                    aria-expanded={dropdownProyectoOpen}
                    aria-haspopup="listbox"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {selectedProyectoConfig ? (
                        <>
                          <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                            <selectedProyectoConfig.Icon size={22} className="w-full h-full" />
                          </div>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-bold text-xs truncate text-[#013a52] dark:text-white" title={selectedProyectoObj?.nombre}>
                              {selectedProyectoObj?.nombre || proyectoId}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${selectedProyectoConfig.badgeClass}`}
                            >
                              {selectedProyectoConfig.label}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                          -- Selecciona un proyecto STEAM --
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2 ${
                        dropdownProyectoOpen ? 'rotate-180 text-[#84CC16]' : ''
                      }`}
                    />
                  </button>

                  {/* Menú desplegable con Íconos Oficiales FMO por proyecto */}
                  {dropdownProyectoOpen && (
                    <div
                      className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 z-50 p-1.5 space-y-1"
                      role="listbox"
                    >
                      {listaProyectos.map((p) => {
                        const val = p.nombre;
                        const sedeP = p.sede_municipio;
                        const prog = p.programa || getProyectoPrograma(val);
                        const config = resolveAreaConfig(prog);
                        const IconComp = config.Icon;
                        const isSelected = proyectoId === val;

                        return (
                          <div
                            key={p.id || val}
                            onClick={() => {
                              setProyectoId(val);
                              if (validationError) setValidationError('');
                              setDropdownProyectoOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#abd037]/15 border border-[#abd037]/60 text-[#013a52] dark:text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-transparent'
                            }`}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                                <IconComp size={26} className="w-full h-full" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#013a52] dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {val}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold ${config.badgeClass}`}>
                                    {config.label}
                                  </span>
                                </div>
                                {sedeP && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Sede: {sedeP}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check size={16} className="text-[#84CC16] flex-shrink-0 font-bold" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Input hidden para validación nativa de formulario */}
                  <input type="hidden" name="proyecto_steam_id" value={proyectoId} required />
                </div>
              </div>
            </div>

            {/* Motivo / Justificación */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mb-1.5"
                style={{ color: 'var(--text-dim, #94a3b8)' }}
              >
                <FileText size={14} style={{ color: esCompra ? '#818cf8' : '#84CC16' }} />
                <span>
                  {esCompra
                    ? 'Justificación Pedagógica / Actividad'
                    : 'Motivo / Justificación Pedagógica o Técnica'}
                </span>
                <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  esCompra
                    ? 'Describe detalladamente el taller, clase o actividad pedagógica que justifica esta solicitud de compra...'
                    : 'Describe detalladamente el taller, clase, evento o necesidad formativa que justifica esta solicitud...'
                }
                required
                className="w-full rounded-xl px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all"
                style={{
                  backgroundColor: 'var(--bg, #0b1120)',
                  borderColor: 'var(--line, #334155)',
                  color: 'var(--text, #f8fafc)',
                }}
              />
            </div>
          </div>

          {/* 6. Footer Fijo con Separación de Botones */}
          <div
            className="px-6 py-4 border-t flex items-center justify-between shrink-0"
            style={{
              borderTop: '1px solid var(--line, #1e293b)',
              backgroundColor: 'var(--surface-2, rgba(15, 23, 42, 0.85))',
            }}
          >
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="btn ghost"
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={submitting || !isFormValid}
              className="btn btn-primary"
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#84CC16',
                borderColor: '#84CC16',
                color: '#020617',
                cursor: submitting || !isFormValid ? 'not-allowed' : 'pointer',
                opacity: submitting || !isFormValid ? 0.5 : 1,
                boxShadow: submitting || !isFormValid ? 'none' : '0 4px 12px rgba(171, 208, 55, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  <span>Enviar Solicitud</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
