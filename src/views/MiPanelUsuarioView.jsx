import React, { useState, useMemo } from 'react';
import {
  Laptop,
  Package,
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fmtDate, today } from '../services/mockData';
import ModalDetalleActivo from '../components/modals/ModalDetalleActivo';
import ModalQR from '../components/modals/ModalQR';

export default function MiPanelUsuarioView({ items = [], movements = [] }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('equipos'); // 'equipos' | 'consumibles'

  // Modal para ver detalle completo de activo (solo lectura)
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);

  // Modal para ver código QR
  const [modalQROpen, setModalQROpen] = useState(false);
  const [itemParaQR, setItemParaQR] = useState(null);

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
      serial: eq.serial,
      sede: eq.sede,
      ubicacion: eq.sede,
      ubicacion_estante: eq.ubicacion_estante,
      estado: eq.status === 'prestado' ? 'En campo' : 'Disponible',
      custodio: currentUser?.nombre,
      categoria: 'Equipos de Cómputo',
    });
    setModalDetalleOpen(true);
  };

  const handleVerQR = (eq) => {
    setItemParaQR({
      placa: eq.placa,
      nombre: eq.nombre,
      modelo: eq.modelo,
      serial: eq.serial,
      sede: eq.sede,
      custodio: currentUser?.nombre,
    });
    setModalQROpen(true);
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* TARJETA DE BIENVENIDA INSTITUCIONAL PARA EL ROL USUARIO */}
      <div
        className="panel"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 19, 43, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(132, 204, 22, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(132, 204, 22, 0.15)', border: '1px solid rgba(132, 204, 22, 0.3)', color: '#84CC16', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
              <User className="w-3.5 h-3.5" />
              <span>Panel Personal del Formador STEAM</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Mis Solicitudes y Asignaciones
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Bienvenido(a), <strong>{currentUser?.nombre}</strong> (Doc. {currentUser?.documento}) · {currentUser?.cargo || 'Formador(a) Institucional'} en {currentUser?.sede || 'Medellín'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ padding: '10px 18px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#84CC16' }}>
                {misEquiposAsignados.length}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Equipos en Custodia</span>
            </div>

            <div style={{ padding: '10px 18px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 800, color: '#38BDF8' }}>
                {misConsumiblesRecibidos.length}
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Remisiones de Material</span>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE PESTAÑAS (SOLO CONSULTA / ASIGNACIONES PERSONALES) */}
      <div className="tab-buttons" style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('equipos')}
          className={`tab-btn ${activeTab === 'equipos' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Laptop className="w-4 h-4 text-[#84CC16]" />
          <span>Mis Equipos Asignados</span>
          <span className="tab-badge">{misEquiposAsignados.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('consumibles')}
          className={`tab-btn ${activeTab === 'consumibles' ? 'active' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Package className="w-4 h-4 text-[#38BDF8]" />
          <span>Mis Consumibles Recibidos</span>
          <span className="tab-badge">{misConsumiblesRecibidos.length}</span>
        </button>
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

          <div className="panel" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-header, rgba(0,0,0,0.02))' }}>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>PLACA</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>EQUIPO & MODELO</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>SERIAL</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>SEDE / ESPACIO</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>FECHA ENTREGA</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)' }}>DEVOLUCIÓN PACTADA</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)', textAlign: 'center' }}>ESTADO</th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-dim)', textAlign: 'center' }}>FICHA TÉCNICA</th>
                  </tr>
                </thead>
                <tbody>
                  {misEquiposAsignados.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No tienes equipos tecnológicos asignados en este momento.
                      </td>
                    </tr>
                  ) : (
                    misEquiposAsignados.map((eq, i) => (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid var(--border)' }}
                        className="hover:bg-slate-500/5"
                      >
                        {/* Placa */}
                        <td style={{ padding: '12px 14px' }}>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-950/80 text-sky-400 border border-sky-800/60">
                            {eq.placa}
                          </span>
                        </td>

                        {/* Nombre y Modelo */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                            {eq.nombre}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                            {eq.modelo}
                          </div>
                        </td>

                        {/* Serial */}
                        <td style={{ padding: '12px 14px', fontSize: '12.5px', fontFamily: 'monospace', color: 'var(--text)' }}>
                          {eq.serial}
                        </td>

                        {/* Sede y Ubicación */}
                        <td style={{ padding: '12px 14px' }}>
                          <div className="flex flex-col gap-1 items-start justify-center">
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {eq.sede}
                            </span>
                            {eq.ubicacion_estante && (
                              <span className="text-[11px] font-mono text-slate-500">
                                📦 {eq.ubicacion_estante}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fecha de Entrega */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{fmtDate(eq.fechaEntrega)}</span>
                          </div>
                        </td>

                        {/* Fecha de Devolución */}
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{fmtDate(eq.fechaDevolucion)}</span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {eq.status === 'prestado' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <Clock className="w-3 h-3" />
                              En Custodia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Reintegrado
                            </span>
                          )}
                        </td>

                        {/* Ficha Técnica (Solo Consulta) */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                              title="Ver ficha técnica completa del equipo"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                              <span>Detalle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerQR(eq)}
                              className="btn small ghost"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                borderColor: 'var(--border)',
                              }}
                              title="Ver código QR del equipo"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#84CC16]" />
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {misConsumiblesRecibidos.map((rem, idx) => (
              <div
                key={idx}
                className="panel"
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-lime-500/20 text-[#84CC16] border border-lime-400/30">
                        {rem.codigo_acta || rem.remision_id || `ACTA-${idx + 1}`}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        Fecha de despacho: <strong>{fmtDate(rem.date || rem.fecha_entrega)}</strong>
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      Destino: {rem.sede || 'Medellín'} · Proyecto: {rem.proyecto || 'Talleres STEAM'}
                    </div>
                    {rem.motivo && (
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                        Motivo: {rem.motivo}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Despacho Confirmado
                  </span>
                </div>

                {/* Lista de Insumos de la Remisión */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Materiales Entregados ({Array.isArray(rem.items) ? rem.items.length : 1} ítems):
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                    {Array.isArray(rem.items) && rem.items.length > 0 ? (
                      rem.items.map((it, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'var(--surface-header, rgba(0,0,0,0.02))',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text)' }}>
                            📦 {it.nombre || it.material || 'Consumible'}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#84CC16', padding: '1px 6px', borderRadius: '4px', background: 'rgba(132, 204, 22, 0.15)' }}>
                            x{it.cantidad || it.cantidadEntrega || 1}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--surface-header, rgba(0,0,0,0.02))',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text)' }}>
                          📦 {rem.itemName || 'Material de Robótica'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#84CC16', padding: '1px 6px', borderRadius: '4px', background: 'rgba(132, 204, 22, 0.15)' }}>
                          x{rem.qty || 1}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MODAL DETALLE DE ACTIVO (CONSULTA / SOLO LECTURA) */}
      {modalDetalleOpen && activoSeleccionado && (
        <ModalDetalleActivo
          isOpen={modalDetalleOpen}
          onClose={() => setModalDetalleOpen(false)}
          activo={activoSeleccionado}
          readOnly={true}
        />
      )}

      {/* MODAL QR */}
      {modalQROpen && itemParaQR && (
        <ModalQR
          isOpen={modalQROpen}
          onClose={() => setModalQROpen(false)}
          item={itemParaQR}
        />
      )}
    </div>
  );
}
