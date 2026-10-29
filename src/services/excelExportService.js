import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { inventoryApi } from './inventoryApi';
import { supabase } from './supabase';
import catalogoPapeleriaFMO from '../data/catalogoPapeleriaFMO.json';

/**
 * Paleta Institucional Verde Lima Fundación Marina Orth
 * Formato ARGB estricto: 8 caracteres hexadecimales sin '#'
 */
const COLORS = {
  // Banner Principal
  limePrimary: 'FF84CC16',      // Verde Lima corporativo (#84CC16)
  limeMedium: 'FF65A30D',       // Verde Lima medio (#65A30D)
  limeLight: 'FFBEF264',        // Verde Lima claro (#BEF264)
  
  // Cabeceras y Fondos Oscuros Institucionales
  headerGreenDark: 'FF14532D',  // Verde bosque oscuro institucional (#14532D)
  headerBorderLime: 'FF84CC16', // Borde inferior Verde Lima (#84CC16)
  titleDark: 'FF0B132B',        // Texto oscuro contrastante (#0B132B)
  white: 'FFFFFFFF',            // Blanco (#FFFFFF)
  
  // Zebra Striping
  zebraEven: 'FFFFFFFF',        // Blanco (#FFFFFF)
  zebraOdd: 'FFF7FEE7',         // Verde lima muy sutil (#F7FEE7 / lima 50)
  
  // Bordes y Textos
  borderLight: 'FFE2E8F0',      // Slate-200
  borderDark: 'FF166534',       // Verde 800
  textPrimary: 'FF0F172A',      // Slate-900
  
  // Badges de Estados según requerimiento institucional
  dispBg: 'FFD9F99D', dispText: 'FF365314',     // Disponible / Devuelto / Normal: Verde lima claro
  campoBg: 'FFFEF08A', campoText: 'FF854D0E',   // En campo / Prestado: Amarillo cálido
  bajaBg: 'FFFEE2E2', bajaText: 'FF991B1B',     // De baja / Vencido / Crítico: Rojo suave
  alertaBg: 'FFFEF3C7', alertaText: 'FF92400E', // Mantenimiento / Regular: Ámbar
};

/**
 * Aplica estilos limpios y estrictos a las cabeceras de columnas (Fila 5)
 */
function styleHeaderCell(cell) {
  cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.borderDark } },
    bottom: { style: 'double', color: { argb: COLORS.headerBorderLime } },
    left: { style: 'thin', color: { argb: COLORS.borderDark } },
    right: { style: 'thin', color: { argb: COLORS.borderDark } },
  };
}

/**
 * Ajusta automáticamente el ancho de columnas en base al contenido
 */
function autoFitColumns(worksheet, minCol = 1, startRow = 5, margin = 4) {
  worksheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber < startRow) return;
      let val = cell.value;
      if (typeof val === 'object' && val !== null && val.result !== undefined) {
        val = val.result;
      }
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.length > maxLength) maxLength = strVal.length;
      }
    });
    const safeLength = Math.max(maxLength + margin, 12);
    col.width = safeLength;
  });
}

/**
 * Genera y descarga el Libro de Trabajo Maestro Multi-hoja institucional (SIGA FMO)
 * Incluye Resumen Ejecutivo con 3 bloques exhaustivos, Activos Tecnológicos, Robótica y Consumibles,
 * Mobiliario, Papelería y Préstamos.
 * 
 * @param {Object} options - Parámetros opcionales para precarga o filtros
 */
export async function exportarLibroMaestroExcelFMO(options = {}) {
  // 1. Consulta paralela de datos de las 5 colecciones
  let [activosRaw, consumiblesRaw, prestamosRaw, mobiliarioRaw, papeleriaRaw] = await Promise.all([
    options.activos ? Promise.resolve(options.activos) : inventoryApi.getActivos().catch(() => []),
    options.consumibles ? Promise.resolve(options.consumibles) : inventoryApi.getConsumibles().catch(() => []),
    options.prestamos ? Promise.resolve(options.prestamos) : inventoryApi.getPrestamos().catch(() => []),
    options.mobiliario ? Promise.resolve(options.mobiliario) : (async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase.from('mobiliario').select('*').order('created_at', { ascending: false });
          if (!error && Array.isArray(data) && data.length > 0) return data;
        }
      } catch (_) {}
      return inventoryApi.getMobiliario().catch(() => []);
    })(),
    options.papeleria ? Promise.resolve(options.papeleria) : (async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase.from('papeleria').select('*').order('id', { ascending: true });
          if (!error && Array.isArray(data) && data.length > 0) return data;
        }
      } catch (_) {}
      return Array.isArray(catalogoPapeleriaFMO) ? catalogoPapeleriaFMO : [];
    })(),
  ]);

  const activos = Array.isArray(activosRaw) ? activosRaw : (activosRaw?.data || []);
  const consumibles = Array.isArray(consumiblesRaw) ? consumiblesRaw : (consumiblesRaw?.data || []);
  const prestamos = Array.isArray(prestamosRaw) ? prestamosRaw : (prestamosRaw?.data || []);
  const mobiliario = Array.isArray(mobiliarioRaw) ? mobiliarioRaw : (mobiliarioRaw?.data || []);
  const papeleria = Array.isArray(papeleriaRaw) ? papeleriaRaw : (papeleriaRaw?.data || []);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación Marina Orth - SIGA';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Fecha actual formateada
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();
  const fechaEmisionDDMMAAAA = `${dia}/${mes}/${anio}`;
  const fechaArchivoYYYYMMDD = `${anio}${mes}${dia}`;

  // Cálculos de métricas globales
  const totalActivos = activos.length;
  const totalMobiliario = mobiliario.length;
  const totalConsumibles = consumibles.length;
  const totalPapeleria = papeleria.length;

  const roboticaAlertas = consumibles.filter((c) => {
    const disp = Number(c.disponible ?? c.quantity ?? 0);
    const min = Number(c.minimo ?? c.minStock ?? 5);
    return disp <= min;
  });

  const papeleriaAlertas = papeleria.filter((p) => {
    const disp = Number(p.disponible ?? p.quantity ?? 0);
    const min = Number(p.minimo ?? p.minStock ?? 3);
    return disp <= min;
  });

  // Top 10 de materiales que requieren reabastecimiento urgente (combinando Robótica y Papelería)
  const listaAlertas = [
    ...roboticaAlertas.map((c) => ({
      nombre: c.material || c.name || 'Insumo Robótica',
      tipo: 'Robótica / STEAM',
      disponible: Number(c.disponible ?? c.quantity ?? 0),
      minimo: Number(c.minimo ?? c.minStock ?? 5),
      diferencia: Number(c.disponible ?? c.quantity ?? 0) - Number(c.minimo ?? c.minStock ?? 5),
    })),
    ...papeleriaAlertas.map((p) => ({
      nombre: p.material || p.name || 'Insumo Papelería',
      tipo: 'Papelería / Didáctico',
      disponible: Number(p.disponible ?? p.quantity ?? 0),
      minimo: Number(p.minimo ?? p.minStock ?? 3),
      diferencia: Number(p.disponible ?? p.quantity ?? 0) - Number(p.minimo ?? p.minStock ?? 3),
    })),
  ].sort((a, b) => a.diferencia - b.diferencia).slice(0, 10);

  // Estados de conservación de Mobiliario
  const estadosMobiliario = { Excelente: 0, Bueno: 0, Regular: 0, Malo: 0 };
  mobiliario.forEach((m) => {
    const est = String(m.estado_conservacion || m.estado || m.condicion || '').toLowerCase();
    if (est.includes('excelente') || est.includes('nuevo')) {
      estadosMobiliario.Excelente++;
    } else if (est.includes('regular') || est.includes('repar') || est.includes('manten')) {
      estadosMobiliario.Regular++;
    } else if (est.includes('malo') || est.includes('danad') || est.includes('baja')) {
      estadosMobiliario.Malo++;
    } else {
      estadosMobiliario.Bueno++;
    }
  });

  // Consolidado de bienes por Sede institucional
  const sedesClave = ['Medellín', 'Santuario', 'Villa del Socorro'];
  const sedesMap = {};
  sedesClave.forEach((s) => {
    sedesMap[s] = { equipos: 0, mobiliario: 0, total: 0 };
  });
  sedesMap['Otras Sedes / Sin Asignar'] = { equipos: 0, mobiliario: 0, total: 0 };

  const getSedeBucket = (sedeStr) => {
    const s = String(sedeStr || '').toLowerCase();
    if (s.includes('medell')) return 'Medellín';
    if (s.includes('santuario')) return 'Santuario';
    if (s.includes('villa') || s.includes('socorro')) return 'Villa del Socorro';
    return 'Otras Sedes / Sin Asignar';
  };

  activos.forEach((a) => {
    const b = getSedeBucket(a.sede || a.ubicacion);
    if (!sedesMap[b]) sedesMap[b] = { equipos: 0, mobiliario: 0, total: 0 };
    sedesMap[b].equipos++;
    sedesMap[b].total++;
  });

  mobiliario.forEach((m) => {
    const b = getSedeBucket(m.sede || m.ubicacion);
    if (!sedesMap[b]) sedesMap[b] = { equipos: 0, mobiliario: 0, total: 0 };
    sedesMap[b].mobiliario++;
    sedesMap[b].total++;
  });

  // =========================================================================
  // HOJA 1: Resumen Ejecutivo (Reestructurada con 3 Bloques Exhaustivos)
  // =========================================================================
  const sheetResumen = workbook.addWorksheet('Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FF84CC16' } },
  });

  sheetResumen.getColumn(1).width = 4;   // Margen
  sheetResumen.getColumn(2).width = 38;  // Concepto / Nombre
  sheetResumen.getColumn(3).width = 22;  // Tipo / Detalle
  sheetResumen.getColumn(4).width = 16;  // Stock / Valor
  sheetResumen.getColumn(5).width = 16;  // Mínimo / Valor 2
  sheetResumen.getColumn(6).width = 18;  // Estado / Alerta

  // Título Banner
  sheetResumen.mergeCells('B2:F2');
  const cellTitulo = sheetResumen.getCell('B2');
  cellTitulo.value = 'FUNDACIÓN MARINA ORTH - BALANCE CONSOLIDADO DE INVENTARIO';
  cellTitulo.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0B132B' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF84CC16' } };
  sheetResumen.getRow(2).height = 30;

  // Subtítulo
  sheetResumen.mergeCells('B3:F3');
  const cellSub = sheetResumen.getCell('B3');
  cellSub.value = `Sistema SIGA | Reporte Oficial emitido el ${fechaEmisionDDMMAAAA} | Total Existencias: ${totalActivos + totalMobiliario + totalConsumibles + totalPapeleria} registros`;
  cellSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
  cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
  cellSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF65A30D' } };
  sheetResumen.getRow(3).height = 20;

  let rIdx = 5;

  const aplicarEstiloSeccion = (rowNum, titulo) => {
    sheetResumen.mergeCells(`B${rowNum}:F${rowNum}`);
    const c = sheetResumen.getCell(`B${rowNum}`);
    c.value = titulo;
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } }; // Verde institucional oscuro
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sheetResumen.getRow(rowNum).height = 24;
  };

  const aplicarFilaSubheader = (rowNum, valores) => {
    const row = sheetResumen.getRow(rowNum);
    valores.forEach((val, i) => {
      const c = row.getCell(i + 2);
      c.value = val;
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
      c.alignment = { horizontal: i >= 2 ? 'center' : 'left', vertical: 'middle' };
      c.border = {
        top: { style: 'thin', color: { argb: COLORS.borderDark } },
        bottom: { style: 'thin', color: { argb: COLORS.borderDark } },
        left: { style: 'thin', color: { argb: COLORS.borderDark } },
        right: { style: 'thin', color: { argb: COLORS.borderDark } },
      };
    });
    row.height = 20;
  };

  // -------------------------------------------------------------------------
  // BLOQUE 1: BALANCE GENERAL DE EXISTENCIAS
  // -------------------------------------------------------------------------
  aplicarEstiloSeccion(rIdx, '1. BALANCE GENERAL DE EXISTENCIAS');
  rIdx++;
  aplicarFilaSubheader(rIdx, ['Categoría de Inventario', 'Tipo de Control', 'Total Registros', 'Disponibilidad', 'Estado Operativo']);
  rIdx++;

  const existenciasData = [
    ['Equipos Tecnológicos (Cómputo / Robótica)', 'Placa ACT-FMO / Serial', totalActivos, `${activos.filter(a => (a.estado||'').toLowerCase() === 'disponible').length} en bodega`, 'Operativo'],
    ['Muebles y Enseres de Sedes', 'Placa MOB-XXXX', totalMobiliario, `${mobiliario.filter(m => (m.estado||'').toLowerCase() === 'bueno' || (m.estado_conservacion||'').toLowerCase() === 'bueno').length} operativos`, 'Dotación'],
    ['Referencias Materiales de Robótica STEAM', 'Código Rob-XXXX', totalConsumibles, `${roboticaAlertas.length} en alerta`, roboticaAlertas.length > 0 ? 'Reabastecer' : 'Óptimo'],
    ['Referencias de Papelería e Insumos', 'Código Pape-XXXX', totalPapeleria, `${papeleriaAlertas.length} en alerta`, papeleriaAlertas.length > 0 ? 'Reabastecer' : 'Óptimo'],
  ];

  existenciasData.forEach((rowVals, idx) => {
    const row = sheetResumen.getRow(rIdx);
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF7FEE7';
    rowVals.forEach((val, cIdx) => {
      const c = row.getCell(cIdx + 2);
      c.value = val;
      c.font = { name: 'Calibri', size: 10, bold: cIdx === 0 || cIdx === 2, color: { argb: COLORS.textPrimary } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      c.alignment = { horizontal: cIdx >= 2 ? 'center' : 'left', vertical: 'middle' };
      c.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };
    });
    row.height = 20;
    rIdx++;
  });

  rIdx++;

  // -------------------------------------------------------------------------
  // BLOQUE 2: SEMÁFORO Y ALERTAS DE STOCK MÍNIMO
  // -------------------------------------------------------------------------
  aplicarEstiloSeccion(rIdx, '2. SEMÁFORO Y ALERTAS DE STOCK MÍNIMO (REABASTECIMIENTO)');
  rIdx++;
  
  // Resumen semáforo en fila doble
  const rowSem = sheetResumen.getRow(rIdx);
  sheetResumen.mergeCells(`B${rIdx}:C${rIdx}`);
  rowSem.getCell(2).value = `Insumos de Robótica con Stock Bajo (≤ Mínimo): ${roboticaAlertas.length}`;
  rowSem.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: roboticaAlertas.length > 0 ? 'FF991B1B' : 'FF166534' } };
  rowSem.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: roboticaAlertas.length > 0 ? 'FFFEE2E2' : 'FFDCFCE7' } };
  rowSem.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

  sheetResumen.mergeCells(`D${rIdx}:F${rIdx}`);
  rowSem.getCell(4).value = `Insumos de Papelería con Stock Bajo (≤ Mínimo): ${papeleriaAlertas.length}`;
  rowSem.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: papeleriaAlertas.length > 0 ? 'FF991B1B' : 'FF166534' } };
  rowSem.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: papeleriaAlertas.length > 0 ? 'FFFEE2E2' : 'FFDCFCE7' } };
  rowSem.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  rowSem.height = 22;
  rIdx++;

  // Subcabecera Top 10
  aplicarFilaSubheader(rIdx, ['Top 10 Materiales que Requieren Reabastecimiento Urgente', 'Tipo de Insumo', 'Stock Actual', 'Mínimo Requerido', 'Estado Alerta']);
  rIdx++;

  if (listaAlertas.length === 0) {
    const row = sheetResumen.getRow(rIdx);
    sheetResumen.mergeCells(`B${rIdx}:F${rIdx}`);
    row.getCell(2).value = '✅ Todos los insumos de Robótica y Papelería se encuentran por encima del umbral mínimo de seguridad.';
    row.getCell(2).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF166534' } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 20;
    rIdx++;
  } else {
    listaAlertas.forEach((item, idx) => {
      const row = sheetResumen.getRow(rIdx);
      const rowVals = [item.nombre, item.tipo, item.disponible, item.minimo, 'CRÍTICO'];
      rowVals.forEach((val, cIdx) => {
        const c = row.getCell(cIdx + 2);
        c.value = val;
        c.font = { name: 'Calibri', size: 10, bold: cIdx === 2 || cIdx === 4, color: cIdx === 4 ? { argb: 'FF991B1B' } : { argb: COLORS.textPrimary } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cIdx === 4 ? 'FFFEE2E2' : (idx % 2 === 0 ? 'FFFFFFFF' : 'FFF7FEE7') } };
        c.alignment = { horizontal: cIdx >= 2 ? 'center' : 'left', vertical: 'middle' };
        c.border = {
          top: { style: 'thin', color: { argb: COLORS.borderLight } },
          bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
          left: { style: 'thin', color: { argb: COLORS.borderLight } },
          right: { style: 'thin', color: { argb: COLORS.borderLight } },
        };
      });
      row.height = 19;
      rIdx++;
    });
  }

  rIdx++;

  // -------------------------------------------------------------------------
  // BLOQUE 3: ESTADO FÍSICO Y DISTRIBUCIÓN
  // -------------------------------------------------------------------------
  aplicarEstiloSeccion(rIdx, '3. ESTADO FÍSICO Y DISTRIBUCIÓN POR SEDE');
  rIdx++;

  // Subheader Mobiliario y Sedes
  aplicarFilaSubheader(rIdx, ['Estado de Conservación (Mobiliario)', 'Cantidad Muebles', 'Sede Formativa FMO', 'Equipos Cómputo', 'Mobiliario Sede']);
  rIdx++;

  const estadosArr = [
    { label: 'Excelente / Como Nuevo', val: estadosMobiliario.Excelente },
    { label: 'Bueno / Totalmente Funcional', val: estadosMobiliario.Bueno },
    { label: 'Regular / Requiere Mantenimiento', val: estadosMobiliario.Regular },
    { label: 'Malo / Candidato a Baja', val: estadosMobiliario.Malo },
  ];

  const sedesRows = [
    { sede: 'Medellín', eq: sedesMap['Medellín']?.equipos || 0, mob: sedesMap['Medellín']?.mobiliario || 0 },
    { sede: 'Santuario', eq: sedesMap['Santuario']?.equipos || 0, mob: sedesMap['Santuario']?.mobiliario || 0 },
    { sede: 'Villa del Socorro', eq: sedesMap['Villa del Socorro']?.equipos || 0, mob: sedesMap['Villa del Socorro']?.mobiliario || 0 },
    { sede: 'Otras Sedes / Sin Asignar', eq: sedesMap['Otras Sedes / Sin Asignar']?.equipos || 0, mob: sedesMap['Otras Sedes / Sin Asignar']?.mobiliario || 0 },
  ];

  for (let i = 0; i < 4; i++) {
    const row = sheetResumen.getRow(rIdx);
    const est = estadosArr[i];
    const s = sedesRows[i];
    const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF7FEE7';

    // Col B y C: Mobiliario
    row.getCell(2).value = est.label;
    row.getCell(2).font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(3).value = est.val;
    row.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.textPrimary } };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(3).alignment = { horizontal: 'center' };

    // Col D, E y F: Sedes
    row.getCell(4).value = s.sede;
    row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.textPrimary } };
    row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };

    row.getCell(5).value = `${s.eq} equipos`;
    row.getCell(5).font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(5).alignment = { horizontal: 'center' };

    row.getCell(6).value = `${s.mob} muebles`;
    row.getCell(6).font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(6).alignment = { horizontal: 'center' };

    for (let c = 2; c <= 6; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };
    }
    row.height = 20;
    rIdx++;
  }

  // =========================================================================
  // HOJA 2: Activos Tecnologicos
  // =========================================================================
  const wsActivos = workbook.addWorksheet('Activos Tecnologicos', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  wsActivos.mergeCells('A1:K1');
  const aT1 = wsActivos.getCell('A1');
  aT1.value = 'FUNDACIÓN MARINA ORTH - REPORTE DE ACTIVOS TECNOLÓGICOS';
  aT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  aT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  aT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsActivos.getRow(1).height = 28;

  wsActivos.mergeCells('A2:K2');
  const aT2 = wsActivos.getCell('A2');
  aT2.value = `Catálogo Maestro de Equipos y Cómputo - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${activos.length} activos`;
  aT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  aT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  aT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsActivos.getRow(2).height = 20;

  wsActivos.mergeCells('A3:K3');
  const aT3 = wsActivos.getCell('A3');
  aT3.value = '';
  aT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeLight } };
  wsActivos.getRow(3).height = 4;
  wsActivos.getRow(4).height = 8;

  const colsActivosDef = [
    { key: 'placa', header: 'Placa / Código', align: 'center' },
    { key: 'nombre', header: 'Nombre del Equipo', align: 'left' },
    { key: 'categoria', header: 'Categoría', align: 'left' },
    { key: 'marca', header: 'Marca', align: 'left' },
    { key: 'modelo', header: 'Modelo', align: 'left' },
    { key: 'serial', header: 'Número de Serie', align: 'left' },
    { key: 'sede', header: 'Sede Asignada', align: 'left' },
    { key: 'responsable', header: 'Responsable / Custodio', align: 'left' },
    { key: 'estado', header: 'Estado Físico', align: 'center' },
    { key: 'condicion', header: 'Condición', align: 'center' },
    { key: 'valor', header: 'Valor Comercial', align: 'right' },
  ];

  const headerActRow = wsActivos.getRow(5);
  headerActRow.values = colsActivosDef.map((c) => c.header);
  headerActRow.height = 26;
  headerActRow.eachCell(styleHeaderCell);

  let rAIdx = 6;
  activos.forEach((a, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const placa = a.placa || a.code || a.id || 'S/P';
    const nombre = a.nombre || a.name || a.material || 'Equipo Tecnológico';
    const categoria = a.categoria || a.category || 'Tecnología';
    const marca = a.marca || a.brand || '—';
    const modelo = a.modelo || a.model || '—';
    const serial = a.serial || a.serialNumber || '—';
    const sede = a.sede || a.ubicacion || a.location || 'Medellín';
    const responsable = a.responsable || a.custodio || a.assignedTo || 'Bodega Central';
    const estado = a.estado || 'Disponible';
    const condicion = a.condicion || 'Buen Estado';
    const valor = Number(a.valor_unitario ?? a.valor_compra ?? a.precio ?? 0);

    const row = wsActivos.addRow([
      placa,
      nombre,
      categoria,
      marca,
      modelo,
      serial,
      sede,
      responsable,
      estado,
      condicion,
      valor,
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = colsActivosDef[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { horizontal: colDef ? colDef.align : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };

      if (colNumber === 1) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      if (colNumber === 11) {
        cell.numFmt = '"$"#,##0.00';
      }

      if (colNumber === 9) {
        const est = String(cell.value || '').toLowerCase().trim();
        if (est === 'disponible') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dispBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.dispText } };
        } else if (est.includes('campo') || est === 'prestado') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.campoBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.campoText } };
        } else if (est.includes('baja')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bajaBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.bajaText } };
        } else if (est.includes('mantenimiento') || est.includes('repar')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.alertaBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.alertaText } };
        }
      }
    });

    rAIdx++;
  });

  const totActRow = wsActivos.getRow(rAIdx);
  totActRow.getCell(1).value = 'TOTAL:';
  totActRow.getCell(2).value = `${activos.length} activos inventariados`;
  totActRow.getCell(11).value = { formula: `SUM(K6:K${rAIdx - 1})` };
  totActRow.getCell(11).numFmt = '"$"#,##0.00';
  totActRow.height = 24;

  totActRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: colNumber === 11 ? 'right' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  const ultimaFilaDatosActivos = Math.max(5, rAIdx - 1);
  wsActivos.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosActivos, column: 11 },
  };
  autoFitColumns(wsActivos, 1, 5, 4);

  // =========================================================================
  // HOJA 3: Robotica y Consumibles
  // =========================================================================
  const wsConsumibles = workbook.addWorksheet('Robotica y Consumibles', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  wsConsumibles.mergeCells('A1:I1');
  const cT1 = wsConsumibles.getCell('A1');
  cT1.value = 'FUNDACIÓN MARINA ORTH - MATERIALES Y CONSUMIBLES DE ROBÓTICA';
  cT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  cT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  cT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsConsumibles.getRow(1).height = 28;

  wsConsumibles.mergeCells('A2:I2');
  const cT2 = wsConsumibles.getCell('A2');
  cT2.value = `Control de Insumos y Stock en Bodega - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${consumibles.length} ítems`;
  cT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  cT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  cT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsConsumibles.getRow(2).height = 20;

  wsConsumibles.mergeCells('A3:I3');
  const cT3 = wsConsumibles.getCell('A3');
  cT3.value = '';
  cT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeLight } };
  wsConsumibles.getRow(3).height = 4;
  wsConsumibles.getRow(4).height = 8;

  const colsConsumiblesDef = [
    { key: 'codigo', header: 'Código', align: 'center' },
    { key: 'material', header: 'Material / Insumo', align: 'left' },
    { key: 'categoria', header: 'Categoría', align: 'left' },
    { key: 'disponible', header: 'Stock Disponible', align: 'center' },
    { key: 'minimo', header: 'Stock Mínimo', align: 'center' },
    { key: 'condicion', header: 'Condición', align: 'center' },
    { key: 'estado', header: 'Estado', align: 'center' },
    { key: 'ubicacion', header: 'Ubicación Física', align: 'left' },
    { key: 'observaciones', header: 'Observaciones', align: 'left' },
  ];

  const headerConsRow = wsConsumibles.getRow(5);
  headerConsRow.values = colsConsumiblesDef.map((c) => c.header);
  headerConsRow.height = 26;
  headerConsRow.eachCell(styleHeaderCell);

  let rCIdx = 6;
  consumibles.forEach((c, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const idCod = c.id || `Rob${String(idx + 1).padStart(4, '0')}`;
    const material = c.material || c.name || 'Insumo';
    const categoria = c.categoria || c.category || 'Robótica';
    const disp = Number(c.disponible ?? c.quantity ?? 0);
    const min = Number(c.minimo ?? c.minStock ?? 5);
    const condicion = c.condicion || 'Nuevo';
    const estado = c.estado || 'Bueno';
    const ubicacion = c.ubicacion || c.location || 'Oficina FMO';
    const observaciones = c.observaciones || c.descripcion || c.description || '—';
    const esAlerta = disp <= min;

    const row = wsConsumibles.addRow([
      idCod,
      material,
      categoria,
      disp,
      min,
      condicion,
      estado,
      ubicacion,
      observaciones,
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = colsConsumiblesDef[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { horizontal: colDef ? colDef.align : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };

      if (colNumber === 1) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      if (colNumber === 4 && esAlerta) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFB91C1C' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFF87171' } },
          bottom: { style: 'thin', color: { argb: 'FFF87171' } },
          left: { style: 'thin', color: { argb: 'FFF87171' } },
          right: { style: 'thin', color: { argb: 'FFF87171' } },
        };
      }
    });

    rCIdx++;
  });

  const totConsRow = wsConsumibles.getRow(rCIdx);
  totConsRow.getCell(1).value = 'TOTAL:';
  totConsRow.getCell(2).value = `${consumibles.length} tipos de materiales`;
  totConsRow.getCell(4).value = { formula: `SUM(D6:D${rCIdx - 1})` };
  totConsRow.getCell(5).value = { formula: `SUM(E6:E${rCIdx - 1})` };
  totConsRow.height = 24;

  totConsRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  const ultimaFilaDatosConsumibles = Math.max(5, rCIdx - 1);
  wsConsumibles.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosConsumibles, column: 9 },
  };
  autoFitColumns(wsConsumibles, 1, 5, 4);

  // =========================================================================
  // HOJA 4: Mobiliario (NUEVA HOJA)
  // =========================================================================
  const wsMobiliario = workbook.addWorksheet('Mobiliario', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  wsMobiliario.mergeCells('A1:M1');
  const mT1 = wsMobiliario.getCell('A1');
  mT1.value = 'FUNDACIÓN MARINA ORTH - INVENTARIO DE MOBILIARIO Y ENSERES';
  mT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  mT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  mT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsMobiliario.getRow(1).height = 28;

  wsMobiliario.mergeCells('A2:M2');
  const mT2 = wsMobiliario.getCell('A2');
  mT2.value = `Dotación, Mesas de Robótica y Sillería - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${mobiliario.length} muebles`;
  mT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  mT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  mT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsMobiliario.getRow(2).height = 20;

  wsMobiliario.mergeCells('A3:M3');
  const mT3 = wsMobiliario.getCell('A3');
  mT3.value = '';
  mT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeLight } };
  wsMobiliario.getRow(3).height = 4;
  wsMobiliario.getRow(4).height = 8;

  const colsMobiliarioDef = [
    { key: 'placa', header: 'Placa / Código', align: 'center' },
    { key: 'nombre', header: 'Nombre del Mueble', align: 'left' },
    { key: 'categoria', header: 'Categoría', align: 'left' },
    { key: 'sede', header: 'Sede Formativa', align: 'left' },
    { key: 'ubicacion_especifica', header: 'Ubicación Específica', align: 'left' },
    { key: 'material', header: 'Material Principal', align: 'left' },
    { key: 'color', header: 'Color', align: 'center' },
    { key: 'dimensiones', header: 'Dimensiones', align: 'center' },
    { key: 'estado_conservacion', header: 'Estado Conservación', align: 'center' },
    { key: 'cantidad', header: 'Cantidad', align: 'center' },
    { key: 'fecha_adquisicion', header: 'Fecha Adquisición', align: 'center' },
    { key: 'proveedor_origen', header: 'Proveedor / Origen', align: 'left' },
    { key: 'observaciones', header: 'Observaciones', align: 'left' },
  ];

  const headerMobRow = wsMobiliario.getRow(5);
  headerMobRow.values = colsMobiliarioDef.map((c) => c.header);
  headerMobRow.height = 26;
  headerMobRow.eachCell(styleHeaderCell);

  let rMIdx = 6;
  mobiliario.forEach((m, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const placa = m.placa || m.code || m.id || 'S/P';
    const nombre = m.nombre || m.name || m.material || 'Mobiliario';
    const categoria = m.categoria || m.subcategoria || m.category || 'Mesas y Escritorios';
    const sede = m.sede || m.ubicacion || 'Medellín';
    const ubicacionEsp = m.ubicacion_especifica || m.ubicacion_estante || m.espacio || '—';
    const material = m.material || '—';
    const color = m.color || '—';
    const dimensiones = m.dimensiones || '—';
    const estado = m.estado_conservacion || m.estado || m.condicion || 'Bueno';
    const cantidad = Number(m.cantidad ?? m.disponible ?? 1);
    const fechaAdq = m.fecha_adquisicion ? String(m.fecha_adquisicion).split('T')[0] : '—';
    const proveedor = m.proveedor_origen || m.proveedor || m.origen || '—';
    const obs = m.observaciones || m.descripcion || '—';

    const row = wsMobiliario.addRow([
      placa,
      nombre,
      categoria,
      sede,
      ubicacionEsp,
      material,
      color,
      dimensiones,
      estado,
      cantidad,
      fechaAdq,
      proveedor,
      obs,
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = colsMobiliarioDef[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { horizontal: colDef ? colDef.align : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };

      if (colNumber === 1) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      // Estilo de Estado
      if (colNumber === 9) {
        const estStr = String(cell.value || '').toLowerCase();
        if (estStr.includes('excelente') || estStr.includes('nuevo')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dispBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.dispText } };
        } else if (estStr.includes('bueno')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dispBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.dispText } };
        } else if (estStr.includes('regular')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.alertaBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.alertaText } };
        } else if (estStr.includes('malo') || estStr.includes('baja')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bajaBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.bajaText } };
        }
      }
    });

    rMIdx++;
  });

  const totMobRow = wsMobiliario.getRow(rMIdx);
  totMobRow.getCell(1).value = 'TOTAL:';
  totMobRow.getCell(2).value = `${mobiliario.length} muebles registrados`;
  totMobRow.getCell(10).value = { formula: `SUM(J6:J${rMIdx - 1})` };
  totMobRow.height = 24;

  totMobRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  const ultimaFilaDatosMobiliario = Math.max(5, rMIdx - 1);
  wsMobiliario.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosMobiliario, column: 13 },
  };
  autoFitColumns(wsMobiliario, 1, 5, 4);

  // =========================================================================
  // HOJA 5: Papeleria (NUEVA HOJA)
  // =========================================================================
  const wsPapeleria = workbook.addWorksheet('Papeleria', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  wsPapeleria.mergeCells('A1:H1');
  const paT1 = wsPapeleria.getCell('A1');
  paT1.value = 'FUNDACIÓN MARINA ORTH - INVENTARIO DE PAPELERÍA E INSUMOS EDUCATIVOS';
  paT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  paT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  paT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPapeleria.getRow(1).height = 28;

  wsPapeleria.mergeCells('A2:H2');
  const paT2 = wsPapeleria.getCell('A2');
  paT2.value = `Control de Insumos Pedagógicos y Oficina - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${papeleria.length} referencias`;
  paT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  paT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  paT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPapeleria.getRow(2).height = 20;

  wsPapeleria.mergeCells('A3:H3');
  const paT3 = wsPapeleria.getCell('A3');
  paT3.value = '';
  paT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeLight } };
  wsPapeleria.getRow(3).height = 4;
  wsPapeleria.getRow(4).height = 8;

  const colsPapeleriaDef = [
    { key: 'id', header: 'Código', align: 'center' },
    { key: 'material', header: 'Material / Insumo', align: 'left' },
    { key: 'categoria', header: 'Categoría', align: 'left' },
    { key: 'sede', header: 'Sede Asignada', align: 'left' },
    { key: 'disponible', header: 'Stock Disponible', align: 'center' },
    { key: 'minimo', header: 'Stock Mínimo', align: 'center' },
    { key: 'estado_alerta', header: 'Estado Alerta', align: 'center' },
    { key: 'ubicacion', header: 'Ubicación / Contenedor', align: 'left' },
  ];

  const headerPapRow = wsPapeleria.getRow(5);
  headerPapRow.values = colsPapeleriaDef.map((c) => c.header);
  headerPapRow.height = 26;
  headerPapRow.eachCell(styleHeaderCell);

  let rPaIdx = 6;
  papeleria.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const idCod = p.id || `Pape${String(idx + 1).padStart(4, '0')}`;
    const material = p.material || p.name || 'Insumo Papelería';
    const categoria = p.categoria || p.category || 'Papelería';
    const sede = p.sede || p.ubicacion_sede || 'Medellín';
    const disp = Number(p.disponible ?? p.quantity ?? 0);
    const min = Number(p.minimo ?? p.minStock ?? 3);
    const estadoAlerta = disp <= min ? 'CRÍTICO' : 'NORMAL';
    const ubicacion = p.ubicacion_estante || p.caja || p.ubicacion || p.location || 'Bodega General';

    const row = wsPapeleria.addRow([
      idCod,
      material,
      categoria,
      sede,
      disp,
      min,
      estadoAlerta,
      ubicacion,
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = colsPapeleriaDef[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { horizontal: colDef ? colDef.align : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };

      if (colNumber === 1) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      if (colNumber === 7) {
        if (estadoAlerta === 'CRÍTICO') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dispBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.dispText } };
        }
      }
    });

    rPaIdx++;
  });

  const totPapRow = wsPapeleria.getRow(rPaIdx);
  totPapRow.getCell(1).value = 'TOTAL:';
  totPapRow.getCell(2).value = `${papeleria.length} referencias inventariadas`;
  totPapRow.getCell(5).value = { formula: `SUM(E6:E${rPaIdx - 1})` };
  totPapRow.getCell(6).value = { formula: `SUM(F6:F${rPaIdx - 1})` };
  totPapRow.height = 24;

  totPapRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  const ultimaFilaDatosPapeleria = Math.max(5, rPaIdx - 1);
  wsPapeleria.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosPapeleria, column: 8 },
  };
  autoFitColumns(wsPapeleria, 1, 5, 4);

  // =========================================================================
  // HOJA 6: Prestamos y Asignaciones
  // =========================================================================
  const wsPrestamos = workbook.addWorksheet('Prestamos y Asignaciones', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  wsPrestamos.mergeCells('A1:G1');
  const pT1 = wsPrestamos.getCell('A1');
  pT1.value = 'FUNDACIÓN MARINA ORTH - CONTROL DE PRÉSTAMOS Y ASIGNACIONES';
  pT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  pT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  pT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPrestamos.getRow(1).height = 28;

  wsPrestamos.mergeCells('A2:G2');
  const pT2 = wsPrestamos.getCell('A2');
  pT2.value = `Trazabilidad de Custodias y Equipos en Campo - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${prestamos.length} registros`;
  pT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  pT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  pT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPrestamos.getRow(2).height = 20;

  wsPrestamos.mergeCells('A3:G3');
  const pT3 = wsPrestamos.getCell('A3');
  pT3.value = '';
  pT3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeLight } };
  wsPrestamos.getRow(3).height = 4;
  wsPrestamos.getRow(4).height = 8;

  const colsPrestamosDef = [
    { key: 'codigo', header: 'Código Préstamo', align: 'center' },
    { key: 'responsable', header: 'Responsable / Formador', align: 'left' },
    { key: 'sede', header: 'Sede Destino', align: 'left' },
    { key: 'activo', header: 'Activo Asignado (Placa y Nombre)', align: 'left' },
    { key: 'fecha_salida', header: 'Fecha Salida', align: 'center' },
    { key: 'fecha_devolucion', header: 'Fecha Devolución Estimada', align: 'center' },
    { key: 'estado', header: 'Estado del Préstamo', align: 'center' },
  ];

  const headerPresRow = wsPrestamos.getRow(5);
  headerPresRow.values = colsPrestamosDef.map((c) => c.header);
  headerPresRow.height = 26;
  headerPresRow.eachCell(styleHeaderCell);

  let rPIdx = 6;
  prestamos.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const idPrestamo = p.id ? `PR-${String(p.id).padStart(4, '0')}` : `PR-${idx + 1}`;
    const solicitante = p.solicitante || p.person || 'Formador FMO';
    const sede = p.sede || 'Medellín';
    const placa = p.placa_activo || (p.unitCodes ? p.unitCodes.join(', ') : 'S/P');
    const nomActivo = p.nombre_activo || p.itemName || '';
    const activoFull = nomActivo ? `[${placa}] ${nomActivo}` : placa;
    const fSalida = p.fecha_salida ? String(p.fecha_salida).split('T')[0] : (p.date || '—');
    const fDevolucion = p.fecha_devolucion_esperada ? String(p.fecha_devolucion_esperada).split('T')[0] : (p.expectedReturn || '—');
    const estado = p.estado || (p.status === 'devuelto' ? 'Devuelto' : 'En campo');

    const row = wsPrestamos.addRow([
      idPrestamo,
      solicitante,
      sede,
      activoFull,
      fSalida,
      fDevolucion,
      estado,
    ]);

    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = colsPrestamosDef[colNumber - 1];
      cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.textPrimary } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { horizontal: colDef ? colDef.align : 'left', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.borderLight } },
        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
        left: { style: 'thin', color: { argb: COLORS.borderLight } },
        right: { style: 'thin', color: { argb: COLORS.borderLight } },
      };

      if (colNumber === 1) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      if (colNumber === 7) {
        const est = String(cell.value || '').toLowerCase().trim();
        if (est === 'devuelto' || est === 'completado') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.dispBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.dispText } };
        } else if (est.includes('campo') || est === 'activo' || est === 'prestado') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.campoBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.campoText } };
        } else if (est.includes('vencid') || est.includes('mora')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.bajaBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.bajaText } };
        }
      }
    });

    rPIdx++;
  });

  const totPresRow = wsPrestamos.getRow(rPIdx);
  totPresRow.getCell(1).value = 'TOTAL:';
  totPresRow.getCell(2).value = `${prestamos.length} asignaciones gestionadas`;
  totPresRow.height = 24;

  totPresRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  const ultimaFilaDatosPrestamos = Math.max(5, rPIdx - 1);
  wsPrestamos.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosPrestamos, column: 7 },
  };
  autoFitColumns(wsPrestamos, 1, 5, 4);

  // =========================================================================
  // 5. AJUSTE SEGURO DEL BUFFER Y DESCARGA
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const nombreArchivo = `Reporte_Consolidado_SIGA_FMO_${fechaArchivoYYYYMMDD}.xlsx`;
  saveAs(blob, nombreArchivo);
}

// Mantener compatibilidad con llamadas anteriores
export const exportarReporteExcelFMO = exportarLibroMaestroExcelFMO;
