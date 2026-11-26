import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Pencil, X, AlertCircle } from 'lucide-react';
import ProgramAreaBadge from '../common/ProgramAreaBadge';
import { inventoryApi } from '../../services/inventoryApi';

/**
 * ModalDetalleActivo: Componente modal unificado para consultar la ficha técnica
 * y detalle completo de un equipo tecnológico o material consumible.
 * Bloquea el renderizado de las secciones de detalle hasta recibir la respuesta real
 * del backend cuando se consulta por placa (fetchPlaca), evitando parpadeos y fallbacks engañosos.
 */
export default function ModalDetalleActivo({
  isOpen = true,
  item = null,
  fetchPlaca = null,
  headerPreview = null,
  mapFetchedItem = null,
  loading = false,
  readOnly = false,
  onClose,
  onEdit,
  onOpenQR,
}) {
  const [detalle, setDetalle] = useState(() => (fetchPlaca || loading ? null : item));
  const [loadingDetalle, setLoadingDetalle] = useState(() => Boolean(fetchPlaca || loading));
  const [errorDetalle, setErrorDetalle] = useState(null);

  const mapFetchedItemRef = useRef(mapFetchedItem);
  mapFetchedItemRef.current = mapFetchedItem;

  useEffect(() => {
    if (!isOpen) {
      setDetalle(null);
      setLoadingDetalle(false);
      setErrorDetalle(null);
      return;
    }

    if (!fetchPlaca) {
      setDetalle(item || null);
      setLoadingDetalle(Boolean(loading));
      setErrorDetalle(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    // Limpiar estado previo y bloquear renderizado hasta obtener respuesta real
    setDetalle(null);
    setLoadingDetalle(true);
    setErrorDetalle(null);

    (async () => {
      try {
        const activoFresco = await inventoryApi.getActivoByPlaca(fetchPlaca, {
          signal: controller.signal,
        });
        if (!isMounted || controller.signal.aborted) return;

        if (activoFresco) {
          const transformed = mapFetchedItemRef.current
            ? mapFetchedItemRef.current(activoFresco)
            : activoFresco;
          setDetalle(transformed);
        } else {
          setErrorDetalle('No se encontró información registrada para este equipo.');
        }
      } catch (err) {
        if (!isMounted || controller.signal.aborted || err?.name === 'AbortError') return;
        setErrorDetalle(err?.message || 'No se pudo cargar el detalle del equipo desde el servidor.');
      } finally {
        if (isMounted && !controller.signal.aborted) {
          setLoadingDetalle(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen, fetchPlaca, item, loading]);

  if (!isOpen || (!fetchPlaca && !item && !loadingDetalle && !errorDetalle)) return null;

  const isReady = !loadingDetalle && Boolean(detalle);

  const esEquipo = Boolean(
    detalle
      ? (detalle.isEquipo || detalle.serial || detalle.placa || detalle.marca || detalle.area || detalle.itemType === 'equipo')
      : (headerPreview?.isEquipo ?? Boolean(fetchPlaca))
  );

  const esActivo = Boolean(
    detalle && (detalle.isEquipo || detalle.serial || detalle.itemType === 'equipo' || (detalle.placa && String(detalle.placa).toUpperCase().startsWith('ACT-')))
  );
  const esMobiliario = Boolean(
    detalle && (
      detalle.itemType === 'mobiliario' ||
      detalle.categoria === 'Mobiliario' ||
      detalle.category === 'Mobiliario' ||
      (detalle.placa && String(detalle.placa).toUpperCase().startsWith('MOB-')) ||
      (detalle.codigo && String(detalle.codigo).toUpperCase().startsWith('MOB-')) ||
      Boolean(detalle.material_fabricacion) ||
      Boolean(detalle.dimensiones)
    )
  );
  const esElectronica = Boolean(
    detalle && (
      detalle.itemType === 'electronica' ||
      (detalle.placa && String(detalle.placa).toUpperCase().startsWith('ELE-')) ||
      (detalle.codigo && String(detalle.codigo).toUpperCase().startsWith('ELE-'))
    )
  );
  const esActivoOMobiliario = (esActivo || esMobiliario) && !esElectronica;

  // Estado operativo real (solo se calcula cuando ya cargó el detalle real)
  const rawEstado = String(detalle?.estado || detalle?.status || '').toLowerCase();
  const esPrestado = Boolean(detalle) && (
    rawEstado.includes('prest') ||
    rawEstado.includes('campo') ||
    Boolean(detalle?.custodio && detalle.custodio !== 'Bodega Central')
  );
  const estadoLabel = !detalle
    ? ''
    : esPrestado
      ? 'En Campo'
      : esEquipo
        ? (detalle.estado || 'Disponible')
        : (detalle.estado || 'Disponible');
  const estadoIsWarning =
    esPrestado ||
    estadoLabel.toLowerCase().includes('mantenimiento') ||
    estadoLabel.toLowerCase().includes('reparaci');

  const headerPlaca = detalle
    ? (detalle.placa || detalle.codigo || detalle.id || 'S/C')
    : (headerPreview?.placa || fetchPlaca || '...');
  const headerNombre = detalle
    ? (detalle.nombre || detalle.equipo || detalle.material || detalle.name || 'Sin nombre')
    : (headerPreview?.nombre || 'Consultando equipo...');

  // Helper para renderizar campos tipo Key-Value (Etiqueta: Valor)
  const renderKeyValue = (label, val, { isMono = false, isAccent = false, emptyText = 'No registrado' } = {}) => {
    const isEmpty =
      val === null ||
      val === undefined ||
      String(val).trim() === '' ||
      String(val).trim() === '—' ||
      String(val).trim() === 'No registrado';
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
          } ${isMono ? 'font-sans font-semibold tracking-wide' : ''}`}
          style={{ fontSize: '13.5px', lineHeight: 1.35 }}
        >
          {isEmpty ? emptyText : val}
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
              className="px-3 py-1 rounded-md text-xs font-sans font-bold tracking-wide shrink-0 transition-colors"
              style={{
                fontFamily: "'Poppins', sans-serif",
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
              {headerPlaca}
            </span>

            {/* Nombre del Elemento */}
            <h3
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate m-0"
              style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {headerNombre}
            </h3>

            {/* Badge de Estado Operativo (solo cuando cargó el detalle real) */}
            {isReady && (
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
            )}
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
            {onOpenQR && isReady && (
              <button
                type="button"
                onClick={() => onOpenQR(detalle)}
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
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border-0 outline-none"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal: Loader limpio mientras responde la API, error o detalle real */}
        {loadingDetalle ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '12px 0 8px',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px 12px',
                gap: '10px',
                textAlign: 'center',
              }}
            >
              <div
                className="siga-spinner"
                aria-hidden="true"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  border: '3px solid rgba(171, 208, 55, 0.25)',
                  borderTopColor: '#ABD037',
                }}
              />
              <strong style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-h, #013A52)' }}>
                Consultando ficha técnica del equipo...
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-dim, #64748b)' }}>
                Obteniendo datos reales y estado actualizado desde Supabase
              </span>
            </div>

            {/* Skeleton limpio de las dos tarjetas principales */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
              }}
              aria-hidden="true"
            >
              {[0, 1].map((cardIdx) => (
                <div
                  key={cardIdx}
                  style={{
                    backgroundColor: 'var(--surface-2, #131b26)',
                    border: '1px solid var(--line, #1e293b)',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '58%', height: '14px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '80%', height: '28px' }} />
                    <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '75%', height: '28px' }} />
                    <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '85%', height: '28px' }} />
                    <div className="table-loader-skeleton-cell animate-pulse" style={{ width: '70%', height: '28px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : errorDetalle && !detalle ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 20px',
              textAlign: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={34} style={{ color: '#EF4444' }} />
            <strong style={{ fontSize: '14.5px', color: 'var(--text-h, #013A52)' }}>
              No se pudo cargar el detalle del equipo
            </strong>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim, #64748b)', margin: 0, maxWidth: '420px' }}>
              {errorDetalle}
            </p>
          </div>
        ) : isReady ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1 overflow-y-auto"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              overflowY: 'auto',
            }}
          >
            {/* BLOQUE 1: Identificación y Clasificación */}
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
                {renderKeyValue('Categoría', detalle.categoria || detalle.category)}
                {renderKeyValue('Condición', detalle.condicion || detalle.estado_fisico)}
                <div
                  className="flex flex-col items-start gap-1 min-w-0"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', minWidth: 0 }}
                >
                  <span
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    Área / Programa FMO:
                  </span>
                  <ProgramAreaBadge
                    area={
                      detalle.area_asignada ||
                      detalle.area ||
                      (detalle.subtipo === 'papeleria' || detalle.categoria === 'Papelería' || detalle.category === 'Papelería' || String(detalle.id || '').toLowerCase().startsWith('pape')
                        ? 'TeachLabs'
                        : detalle.itemType === 'consumible' || detalle.subtipo === 'robotica' || String(detalle.id || '').toLowerCase().startsWith('rob')
                        ? 'Robótica'
                        : 'Nuevas Tecnologías')
                    }
                    defaultProgram={
                      detalle.subtipo === 'papeleria' || detalle.categoria === 'Papelería' || detalle.category === 'Papelería' || String(detalle.id || '').toLowerCase().startsWith('pape')
                        ? 'teachlabs'
                        : detalle.itemType === 'consumible' || detalle.subtipo === 'robotica' || String(detalle.id || '').toLowerCase().startsWith('rob')
                        ? 'robotica'
                        : 'tecnologia'
                    }
                    iconSize={16}
                    className="w-fit self-start px-3 py-1 gap-1.5"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      width: 'fit-content',
                      maxWidth: '100%',
                      alignSelf: 'flex-start',
                      padding: '5px 12px',
                      gap: '6px',
                    }}
                  />
                </div>
                {renderKeyValue(
                  'Stock Registrado',
                  `${detalle.cantidad ?? 1} und (${detalle.disponible !== undefined ? detalle.disponible : 1} disp.)`
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Descripción General:
                </span>
                <p
                  className={`text-xs m-0 leading-relaxed ${
                    detalle.descripcion || detalle.description
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500 italic'
                  }`}
                  style={{ fontSize: '13px', lineHeight: 1.45 }}
                >
                  {detalle.descripcion || detalle.description || 'Sin descripción registrada.'}
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
                {renderKeyValue('Marca / Fabricante', detalle.marca)}
                {renderKeyValue('Modelo Técnico', detalle.modelo || detalle.model)}
                {renderKeyValue('Serial de Fábrica', detalle.serial, { isMono: true })}
                {renderKeyValue(
                  'Responsable / Custodio',
                  detalle.responsable || detalle.custodio
                )}

                {/* Sede y Estante/Caja */}
                {renderKeyValue(
                  'Sede / Ubicación',
                  detalle.sede && detalle.ubicacion && detalle.sede !== detalle.ubicacion
                    ? `${detalle.sede} · ${detalle.ubicacion}`
                    : (detalle.ubicacion || detalle.sede)
                )}

                <div
                  className="flex flex-col items-start gap-1 min-w-0"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', minWidth: 0 }}
                >
                  <span
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    Estante / Caja / Gaveta:
                  </span>
                  {detalle.ubicacion_estante ? (
                    <span
                      className="inline-flex items-center gap-1.5 w-fit max-w-full self-start px-3 py-1 rounded-md text-xs font-semibold bg-lime-50 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300 border border-lime-200 dark:border-lime-700/60"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'fit-content',
                        maxWidth: '100%',
                        alignSelf: 'flex-start',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(171, 222, 22, 0.16)',
                        border: '1px solid rgba(171, 222, 22, 0.45)',
                        color: 'var(--green, #4d7c0f)',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span>📦</span>
                      <span>{detalle.ubicacion_estante}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">No registrado</span>
                  )}
                </div>
              </div>

              {/* Especificaciones Rápidas */}
              {esEquipo && (detalle.caracteristica_1 || detalle.caracteristica_2 || detalle.caracteristica_3) && (
                <div
                  className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-1.5"
                  style={{ paddingTop: '8px', borderTop: '1px solid var(--line, #1e293b)' }}
                >
                  {detalle.caracteristica_1 && (
                    <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-sans font-semibold tracking-wide text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      💻 {detalle.caracteristica_1}
                    </span>
                  )}
                  {detalle.caracteristica_2 && (
                    <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-sans font-semibold tracking-wide text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      ⚡ {detalle.caracteristica_2}
                    </span>
                  )}
                  {detalle.caracteristica_3 && (
                    <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-[11.5px] font-sans font-semibold tracking-wide text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      💾 {detalle.caracteristica_3}
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
                {renderKeyValue('Proveedor', detalle.proveedor)}
                {renderKeyValue(
                  esElectronica ? 'Valor Estimado (COP)' : 'Valor Compra',
                  (detalle.valor_compra ?? detalle.valor_estimado) != null &&
                    (detalle.valor_compra ?? detalle.valor_estimado) !== '' &&
                    Number.isFinite(Number(detalle.valor_compra ?? detalle.valor_estimado))
                    ? `$ ${Number(detalle.valor_compra ?? detalle.valor_estimado).toLocaleString('es-CO')}`
                    : null
                )}
                {renderKeyValue(
                  esElectronica ? 'Fecha Adquisición' : 'Fecha Compra',
                  (detalle.fecha_compra || detalle.fecha_adquisicion)
                    ? String(detalle.fecha_compra || detalle.fecha_adquisicion).split('T')[0]
                    : null
                )}
                {renderKeyValue(
                  'Vencimiento Garantía',
                  detalle.fecha_vencimiento_garantia || detalle.garantia
                    ? String(detalle.fecha_vencimiento_garantia || detalle.garantia).split('T')[0]
                    : null
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
                    <span className={`font-sans font-medium text-xs ${detalle.claves_otros ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`} style={{ fontSize: '12.5px' }}>
                      {detalle.claves_otros || '—'}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col gap-1 min-w-0 ${!esEquipo ? 'col-span-2' : ''}`} style={!esEquipo ? { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '3px' } : { display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>
                    Observaciones:
                  </span>
                  <p className={`text-xs ${detalle.observaciones || detalle.notas || detalle.notes ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 italic'} line-clamp-2 m-0 leading-relaxed`} style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
                    {detalle.observaciones || detalle.notas || detalle.notes || 'Sin observaciones registradas.'}
                  </p>
                </div>
              </div>

              {/* Estado Contable (Exclusivo Activos y Mobiliario) */}
              {esActivoOMobiliario && (
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800/60">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Estado en Contabilidad
                    </span>
                    {detalle.en_contabilidad ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
                        ✅ En Contabilidad
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">
                        ⏳ Pendiente / No registrado
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Barra Inferior de Acciones (Footer Fijo con Jerarquía Clara) */}
        <div
          className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-slate-200 dark:border-slate-800 shrink-0"
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid var(--line, #1e293b)',
            display: 'flex',
            justifyContent: !readOnly && onEdit ? 'space-between' : 'flex-end',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Botón Principal (Verde Lima Corporativo, deshabilitado mientras carga) */}
          {!readOnly && onEdit && (
            <button
              type="button"
              disabled={!isReady}
              onClick={() => {
                if (!isReady) return;
                onClose();
                onEdit(detalle);
              }}
              className="bg-[#84CC16] hover:bg-[#65A30D] text-slate-900 font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors text-xs sm:text-sm"
              style={{
                backgroundColor: '#84CC16',
                color: '#0f172a',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: isReady ? 'pointer' : 'not-allowed',
                opacity: isReady ? 1 : 0.5,
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
          )}

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
