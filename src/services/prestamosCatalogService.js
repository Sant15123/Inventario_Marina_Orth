/**
 * prestamosCatalogService.js
 * Servicio unificado para el catálogo y disponibilidad de equipos prestables (SIGA-FMO)
 * Unifica la vista de Administrador (Préstamos y entregas) con la vista de Usuario (Nueva Solicitud)
 */

import { supabase } from './supabase';

/**
 * Calcula con precisión el stock disponible real de cualquier ítem del catálogo:
 * - Para Equipos Tecnológicos y de Electrónica: cuenta únicamente las unidades con status === 'disponible'
 *   (excluye prestados, en mantenimiento, dados de baja o dañados).
 * - Para Consumibles e insumos: toma la cantidad disponible no negativa.
 * 
 * @param {Object} item - Objeto de ítem de inventario
 * @returns {number} Cantidad disponible (entero >= 0)
 */
export function getAvailableStock(item) {
  if (!item) return 0;

  // Equipos retornables (Tecnológicos y Electrónica)
  if (item.itemType === 'equipo' || item.itemType === 'electronica') {
    if (Array.isArray(item.units) && item.units.length > 0) {
      return item.units.filter((u) => {
        const st = String(u.status || '').toLowerCase().trim();
        return st === 'disponible';
      }).length;
    }
    // Si no tiene arreglo de units mapeado, validar propiedad disponible / quantity
    const q = Number(item.disponible ?? item.quantity ?? 0);
    return isNaN(q) ? 0 : Math.max(0, q);
  }

  // Consumibles / Insumos
  const q = Number(item.disponible ?? item.quantity ?? 0);
  return isNaN(q) ? 0 : Math.max(0, q);
}

/**
 * Formatea la etiqueta de cada opción en los desplegables de selección de equipos y materiales.
 * Formato institucional estándar:
 * Nombre [Marca/Código] — Tipo/Categoría (X disp.)
 * Ejemplos:
 * - "Multímetro Digital Automotriz True RMS — Electrónica (1 disp.)"
 * - "Portátil Lenovo ThinkPad E14 — Tecnológico (3 disp.)"
 * - "Filamento PLA Blanco 1kg — Filamentos 3D (12 disp.)"
 * 
 * @param {Object} it - Objeto de ítem
 * @returns {string} Texto formateado para el <option>
 */
export function formatItemOptionLabel(it) {
  if (!it) return '';
  const disp = getAvailableStock(it);
  const dispStr = `${disp} disp.`;
  const nombre = it.name || it.material || 'Artículo';

  if (it.itemType === 'electronica') {
    const marca = (it.marca || '').trim();
    const placa = (it.placa || '').trim();
    let marcaOCodigo = '';

    if (marca && !nombre.toLowerCase().includes(marca.toLowerCase())) {
      marcaOCodigo = marca;
    } else if (placa && !nombre.toLowerCase().includes(placa.toLowerCase())) {
      marcaOCodigo = placa;
    }

    const extra = marcaOCodigo ? ` [${marcaOCodigo}]` : '';
    return `${nombre}${extra} — Electrónica (${dispStr})`;
  }

  if (it.itemType === 'equipo') {
    const rawCat = (it.category || '').trim();
    const marca = (it.marca || (rawCat && rawCat !== 'Equipos de Cómputo' ? rawCat : '') || '').trim();
    const placa = (it.placa || '').trim();
    let marcaOCodigo = '';

    if (marca && !nombre.toLowerCase().includes(marca.toLowerCase())) {
      marcaOCodigo = marca;
    } else if (placa && !nombre.toLowerCase().includes(placa.toLowerCase())) {
      marcaOCodigo = placa;
    }

    const extra = marcaOCodigo ? ` [${marcaOCodigo}]` : '';
    return `${nombre}${extra} — Tecnológico (${dispStr})`;
  }

  // Consumible u otro insumo
  const cat = it.categoria || it.category || 'Consumible';
  return `${nombre} — ${cat} (${dispStr})`;
}

/**
 * Filtra los equipos retornables (Tecnológicos + Electrónica) disponibles para préstamo
 * @param {Array} itemsList
 * @returns {Array}
 */
export function filterEquiposPrestables(itemsList = []) {
  return (itemsList || []).filter((it) => {
    const esPrestable = it.itemType === 'equipo' || it.itemType === 'electronica';
    return esPrestable && getAvailableStock(it) > 0;
  });
}

/**
 * Filtra consumibles disponibles con stock > 0
 * @param {Array} itemsList
 * @returns {Array}
 */
export function filterConsumiblesDisponibles(itemsList = []) {
  return (itemsList || []).filter((it) => {
    return it.itemType === 'consumible' && getAvailableStock(it) > 0;
  });
}

/**
 * Consulta el estado más actualizado de activos, equipos de electrónica y consumibles
 * directamente en Supabase para evitar datos desactualizados en caché o localStorage.
 * 
 * @param {Array} fallbackItems - Arreglo base por si Supabase no responde
 * @returns {Promise<Array>} Lista unificada de items con stock en tiempo real
 */
export async function fetchFreshPrestamosCatalog(fallbackItems = []) {
  if (!supabase) return fallbackItems;

  try {
    const [activosRes, electronicaRes, consumiblesRes] = await Promise.all([
      supabase.from('activos').select('*'),
      supabase.from('equipos_electronica').select('*'),
      supabase.from('consumibles').select('*'),
    ]);

    const activosData = activosRes.data;
    const electronicaData = electronicaRes.data;
    const consumiblesData = consumiblesRes.data;

    // Si ninguna consulta respondió exitosamente, mantener fallback
    if (!activosData && !electronicaData && !consumiblesData) {
      return fallbackItems;
    }

    const freshItems = [];

    // 1. Mapear consumibles
    if (Array.isArray(consumiblesData)) {
      consumiblesData.forEach((c) => {
        const disp = Number(c.disponible) || 0;
        const min = Number(c.minimo) ?? 5;
        const isPape = c.categoria === 'Papelería' || c.subtipo === 'papeleria' || String(c.id || '').toLowerCase().startsWith('pape');
        const resolvedArea = c.area_asignada || c.area || (isPape ? 'TeachLabs' : 'Robótica');

        freshItems.push({
          id: c.id,
          material: c.material || c.name || '',
          name: c.material || c.name || '',
          categoria: c.categoria || (isPape ? 'Papelería' : 'Robótica'),
          category: c.categoria || (isPape ? 'Papelería' : 'Robótica'),
          area: resolvedArea,
          area_asignada: resolvedArea,
          disponible: disp,
          quantity: disp,
          minimo: min,
          minStock: min,
          ubicacion: c.ubicacion || 'Oficina FMO',
          location: c.ubicacion || 'Oficina FMO',
          ubicacion_estante: c.ubicacion_estante || '',
          itemType: 'consumible',
        });
      });
    }

    // 2. Mapear activos tecnológicos agrupados por nombre
    if (Array.isArray(activosData)) {
      activosData.forEach((a) => {
        const itemArea = a.area_asignada || a.area || a.programa || 'Nuevas Tecnologías';
        const unitObj = {
          id: a.id,
          dbId: a.id,
          code: a.placa,
          placa: a.placa,
          model: a.modelo || a.marca || 'Estándar',
          serial: a.serial || '—',
          sede: a.sede || 'Medellín',
          ubicacion_estante: a.ubicacion_estante || '',
          status: a.estado === 'En campo' ? 'prestado' : (a.estado || 'disponible').toLowerCase(),
          responsable: a.custodio || (a.estado === 'En campo' ? 'Custodio Temporal' : 'Bodega Central'),
          area: itemArea,
          area_asignada: itemArea,
        };

        const existingEq = freshItems.find(
          (it) => it.itemType === 'equipo' && (it.name || '').toLowerCase() === (a.nombre || '').toLowerCase()
        );

        if (existingEq) {
          existingEq.units.push(unitObj);
        } else {
          freshItems.push({
            id: `eq-${a.id || a.placa}`,
            dbId: a.id,
            name: a.nombre,
            marca: a.marca || '',
            category: a.marca || 'Equipos de Cómputo',
            itemType: 'equipo',
            location: a.sede ? `Sede ${a.sede}` : 'Bodega Medellín',
            sede: a.sede || 'Medellín',
            ubicacion_estante: a.ubicacion_estante || '',
            area: itemArea,
            area_asignada: itemArea,
            minStock: 1,
            units: [unitObj],
            quantity: 0,
          });
        }
      });
    }

    // 3. Mapear equipos de electrónica
    if (Array.isArray(electronicaData)) {
      electronicaData.forEach((e) => {
        const unitObj = {
          code: e.placa,
          placa: e.placa,
          model: `${e.marca || ''} ${e.modelo || ''}`.trim() || e.nombre,
          serial: e.serial || '—',
          status: String(e.estado || '').toLowerCase().includes('prest')
            ? 'prestado'
            : (e.estado || 'disponible').toLowerCase(),
          responsable: e.responsable || (String(e.estado || '').toLowerCase().includes('prest') ? 'En Préstamo' : 'Bodega Central'),
          area: e.area_asignada || 'Robótica',
          area_asignada: e.area_asignada || 'Robótica',
          sede: e.sede || 'Medellín',
        };

        freshItems.push({
          id: `ele-${e.id || e.placa}`,
          dbId: e.id,
          placa: e.placa,
          marca: e.marca || '',
          name: e.nombre,
          category: e.subcategoria || 'Instrumentación',
          categoria: e.subcategoria || 'Instrumentación',
          subcategoria: e.subcategoria || 'Instrumentación',
          itemType: 'electronica',
          location: e.ubicacion || e.sede || 'Medellín',
          sede: e.sede || 'Medellín',
          area: e.area_asignada || 'Robótica',
          area_asignada: e.area_asignada || 'Robótica',
          minStock: 1,
          units: [unitObj],
          quantity: 1,
        });
      });
    }

    return freshItems.length > 0 ? freshItems : fallbackItems;
  } catch (err) {
    console.warn('[prestamosCatalogService] No se pudo refrescar catálogo vivo de Supabase:', err);
    return fallbackItems;
  }
}
