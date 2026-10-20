import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { inventoryApi } from './inventoryApi';

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
  dispBg: 'FFD9F99D', dispText: 'FF365314',     // Disponible / Devuelto: Verde lima claro (#D9F99D), texto (#365314)
  campoBg: 'FFFEF08A', campoText: 'FF854D0E',   // En campo / Prestado: Amarillo cálido (#FEF08A), texto (#854D0E)
  bajaBg: 'FFFEE2E2', bajaText: 'FF991B1B',     // De baja / Vencido: Fondo (#FEE2E2), texto (#991B1B)
  alertaBg: 'FFFEF3C7', alertaText: 'FF92400E', // Mantenimiento: Ámbar (#FEF3C7), texto (#92400E)
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
 * Sin errores XML, con nombres limpios de hojas, autofiltros delimitados y formato ARGB estricto.
 * 
 * @param {Object} options - Parámetros opcionales para precarga o filtros
 */
export async function exportarLibroMaestroExcelFMO(options = {}) {
  // 1. Consulta previa de datos
  let [activosRaw, consumiblesRaw, prestamosRaw] = await Promise.all([
    options.activos || inventoryApi.getActivos().catch(() => []),
    options.consumibles || inventoryApi.getConsumibles().catch(() => []),
    options.prestamos || inventoryApi.getPrestamos().catch(() => []),
  ]);

  const activos = Array.isArray(activosRaw) ? activosRaw : (activosRaw?.data || []);
  const consumibles = Array.isArray(consumiblesRaw) ? consumiblesRaw : (consumiblesRaw?.data || []);
  const prestamos = Array.isArray(prestamosRaw) ? prestamosRaw : (prestamosRaw?.data || []);

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

  // =========================================================================
  // HOJA 1: Resumen Ejecutivo (Estructura limpia libre de errores XML)
  // =========================================================================
  // 1. Crear la hoja sin filtros
  const sheetResumen = workbook.addWorksheet('Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FF84CC16' } },
  });

  // 2. Definir anchos limpios de columna
  sheetResumen.getColumn(1).width = 4;   // Margen izquierdo
  sheetResumen.getColumn(2).width = 32;  // Métrica / Categoría
  sheetResumen.getColumn(3).width = 16;  // Valor / Cantidad
  sheetResumen.getColumn(4).width = 6;   // Separador central
  sheetResumen.getColumn(5).width = 30;  // Métrica / Sede
  sheetResumen.getColumn(6).width = 16;  // Valor / Cantidad

  // 3. Título Banner (Merge simple horizontal de una sola fila)
  sheetResumen.mergeCells('B2:F2');
  const cellTitulo = sheetResumen.getCell('B2');
  cellTitulo.value = 'FUNDACIÓN MARINA ORTH - BALANCE CONSOLIDADO DE INVENTARIO';
  cellTitulo.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0B132B' } };
  cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  cellTitulo.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF84CC16' }, // Verde lima corporativo
  };
  sheetResumen.getRow(2).height = 30;

  // Subtítulo
  sheetResumen.mergeCells('B3:F3');
  const cellSub = sheetResumen.getCell('B3');
  cellSub.value = `Sistema SIGA | Reporte Oficial emitido el ${new Date().toLocaleDateString('es-CO')} | Total Activos: ${activos.length}`;
  cellSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFFFFFFF' } };
  cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
  cellSub.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF65A30D' }, // Verde lima oscuro
  };
  sheetResumen.getRow(3).height = 20;

  // Cálculos de métricas consolidadas
  const totalActivos = activos.length;
  const totalEnCampo = activos.filter((a) => {
    const est = (a.estado || '').toLowerCase();
    return est.includes('campo') || est === 'prestado';
  }).length;
  const totalConsumibles = consumibles.length;
  const totalAlertasStock = consumibles.filter((c) => {
    const disp = Number(c.disponible ?? 0);
    const min = Number(c.minimo ?? 0);
    return disp <= min;
  }).length;

  // Métricas adicionales para el bloque
  const totalDisponibles = activos.filter((a) => (a.estado || '').toLowerCase() === 'disponible').length;
  const totalMantenimiento = activos.filter((a) => (a.estado || '').toLowerCase().includes('mantenimiento')).length;

  // Distribución por Categorías
  const catMap = {};
  activos.forEach((a) => {
    const cat = a.categoria || a.category || 'Otros';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });
  const distribucionCategorias = Object.keys(catMap).map((k) => ({
    categoria: k,
    cantidad: catMap[k],
  })).sort((a, b) => b.cantidad - a.cantidad);

  // 4. Bloque de Indicadores Principales (KPIs) en celdas directas (Filas B y C)
  const kpiHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } }; // Verde bosque
  const kpiHeaderFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };

  sheetResumen.getCell('B5').value = 'MÉTRICAS CLAVE DEL SISTEMA';
  sheetResumen.getCell('B5').font = kpiHeaderFont;
  sheetResumen.getCell('B5').fill = kpiHeaderFill;

  sheetResumen.getCell('C5').value = 'VALOR';
  sheetResumen.getCell('C5').font = kpiHeaderFont;
  sheetResumen.getCell('C5').fill = kpiHeaderFill;
  sheetResumen.getCell('C5').alignment = { horizontal: 'center' };

  const metricas = [
    { label: 'Total Activos Tecnológicos', valor: totalActivos || 0 },
    { label: 'Equipos Disponibles en Sede', valor: totalDisponibles || 0 },
    { label: 'Activos Asignados en Campo / Préstamo', valor: totalEnCampo || 0 },
    { label: 'Equipos en Mantenimiento', valor: totalMantenimiento || 0 },
    { label: 'Total Insumos / Consumibles Robótica', valor: totalConsumibles || 0 },
    { label: 'Alertas por Stock Mínimo Crítico', valor: totalAlertasStock || 0 },
  ];

  let filaActual = 6;
  metricas.forEach((m, idx) => {
    const row = sheetResumen.getRow(filaActual);
    row.getCell(2).value = m.label;
    row.getCell(3).value = m.valor;
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(3).font = { bold: true };

    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF7FEE7'; // Alternado blanco y lima suave
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(2).border = {
      top: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } },
    };
    row.getCell(3).border = {
      top: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } },
    };
    filaActual++;
  });

  // 5. Mini tablas de distribución por Categoría a la derecha (Columnas E y F)
  sheetResumen.getCell('E5').value = 'DISTRIBUCIÓN POR CATEGORÍA';
  sheetResumen.getCell('E5').font = kpiHeaderFont;
  sheetResumen.getCell('E5').fill = kpiHeaderFill;

  sheetResumen.getCell('F5').value = 'EQUIPOS';
  sheetResumen.getCell('F5').font = kpiHeaderFont;
  sheetResumen.getCell('F5').fill = kpiHeaderFill;
  sheetResumen.getCell('F5').alignment = { horizontal: 'center' };

  let filaCat = 6;
  (distribucionCategorias || []).slice(0, 6).forEach((cat, idx) => {
    const row = sheetResumen.getRow(filaCat);
    row.getCell(5).value = cat.categoria || 'Sin categoría';
    row.getCell(6).value = cat.cantidad || 0;
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(6).font = { bold: true };

    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF7FEE7';
    row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(5).border = {
      top: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } },
    };
    row.getCell(6).border = {
      top: { style: 'thin', color: { argb: COLORS.borderLight } },
      bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
      left: { style: 'thin', color: { argb: COLORS.borderLight } },
      right: { style: 'thin', color: { argb: COLORS.borderLight } },
    };
    filaCat++;
  });

  // =========================================================================
  // HOJA 2: Activos Tecnologicos (Nombre limpio sin emojis)
  // =========================================================================
  const wsActivos = workbook.addWorksheet('Activos Tecnologicos', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  // Fila 1: Banner Superior (Estilizado exclusivamente en A1)
  wsActivos.mergeCells('A1:K1');
  const aT1 = wsActivos.getCell('A1');
  aT1.value = 'FUNDACIÓN MARINA ORTH - REPORTE DE ACTIVOS TECNOLÓGICOS';
  aT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  aT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  aT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsActivos.getRow(1).height = 28;

  // Fila 2: Subtítulo (Estilizado exclusivamente en A2)
  wsActivos.mergeCells('A2:K2');
  const aT2 = wsActivos.getCell('A2');
  aT2.value = `Catálogo Maestro de Equipos y Cómputo - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${activos.length} activos`;
  aT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  aT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  aT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsActivos.getRow(2).height = 20;

  // Fila 3: Línea decorativa (Estilizado exclusivamente en A3)
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
    { key: 'serial', header: 'Serial', align: 'center' },
    { key: 'condicion', header: 'Condición', align: 'center' },
    { key: 'estado', header: 'Estado', align: 'center' },
    { key: 'ubicacion', header: 'Sede / Ubicación', align: 'left' },
    { key: 'responsable', header: 'Responsable Actual', align: 'left' },
    { key: 'valor_compra', header: 'Valor Compra', align: 'right' },
  ];

  // Fila 5: Cabeceras
  const headerActivosRow = wsActivos.getRow(5);
  headerActivosRow.values = colsActivosDef.map((c) => c.header);
  headerActivosRow.height = 26;
  headerActivosRow.eachCell(styleHeaderCell);

  let rAIdx = 6;
  activos.forEach((a, idx) => {
    const isEven = idx % 2 === 0;
    const bg = isEven ? COLORS.zebraEven : COLORS.zebraOdd;

    const placa = a.placa || a.code || a.id || '—';
    const nombre = a.nombre || a.name || 'Equipo';
    const categoria = a.categoria || a.category || 'Tecnología';
    const marca = a.marca || 'Estándar';
    const modelo = a.modelo || a.model || 'General';
    const serial = a.serial || '—';
    const condicion = a.condicion || 'Bueno';
    const estado = a.estado || 'Disponible';
    const sede = a.sede || '';
    const ubicacion = a.ubicacion || a.location || '';
    const ubicacionStr = sede && !ubicacion.toLowerCase().includes(sede.toLowerCase())
      ? `${sede} - ${ubicacion}`
      : (ubicacion || sede || 'Medellín');
    const responsable = a.responsable || a.custodio || '—';
    const valor = Number(a.valor_compra ?? a.valor_total ?? 0);

    const row = wsActivos.addRow([
      placa,
      nombre,
      categoria,
      marca,
      modelo,
      serial,
      condicion,
      estado,
      ubicacionStr,
      responsable,
      valor > 0 ? valor : 0,
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

      if (colNumber === 1 || colNumber === 6) {
        cell.font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: COLORS.textPrimary } };
      }

      if (colNumber === 11) {
        cell.numFmt = '"$"#,##0.00';
      }

      // Badges de Estado
      if (colNumber === 8) {
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

  // Fila Total Activos
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

  // Rango de autoFilter estricto desde la cabecera hasta la última fila de datos (antes de totales)
  const ultimaFilaDatosActivos = Math.max(5, rAIdx - 1);
  wsActivos.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosActivos, column: 11 },
  };

  autoFitColumns(wsActivos, 1, 5, 4);

  // =========================================================================
  // HOJA 2: Robotica y Consumibles (Nombre limpio sin emojis)
  // =========================================================================
  const wsConsumibles = workbook.addWorksheet('Robotica y Consumibles', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  // Fila 1: Banner Superior
  wsConsumibles.mergeCells('A1:I1');
  const cT1 = wsConsumibles.getCell('A1');
  cT1.value = 'FUNDACIÓN MARINA ORTH - MATERIALES Y CONSUMIBLES DE ROBÓTICA';
  cT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  cT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  cT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsConsumibles.getRow(1).height = 28;

  // Fila 2: Subtítulo
  wsConsumibles.mergeCells('A2:I2');
  const cT2 = wsConsumibles.getCell('A2');
  cT2.value = `Control de Insumos y Stock en Bodega - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${consumibles.length} ítems`;
  cT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  cT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  cT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsConsumibles.getRow(2).height = 20;

  // Fila 3: Línea decorativa
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

  // Fila 5: Cabeceras
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

      // Alerta de Stock Mínimo
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

  // Fila Total Consumibles
  const totConsRow = wsConsumibles.getRow(rCIdx);
  totConsRow.getCell(1).value = 'TOTAL:';
  totConsRow.getCell(2).value = `${consumibles.length} tipos de materiales`;
  totConsRow.getCell(4).value = { formula: `SUM(D6:D${rCIdx - 1})` };
  totConsRow.getCell(5).value = { formula: `SUM(E6:E${rCIdx - 1})` };
  totConsRow.height = 24;

  totConsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerGreenDark } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: COLORS.limePrimary } },
      bottom: { style: 'medium', color: { argb: COLORS.limePrimary } },
    };
  });

  // Autofiltro delimitado
  const ultimaFilaDatosConsumibles = Math.max(5, rCIdx - 1);
  wsConsumibles.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: ultimaFilaDatosConsumibles, column: 9 },
  };

  autoFitColumns(wsConsumibles, 1, 5, 4);

  // =========================================================================
  // HOJA 3: Prestamos y Asignaciones (Nombre limpio sin emojis)
  // =========================================================================
  const wsPrestamos = workbook.addWorksheet('Prestamos y Asignaciones', {
    pageSetup: { orientation: 'landscape', paperSize: 9 },
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { tabColor: { argb: COLORS.limePrimary } },
  });

  // Fila 1: Banner Superior
  wsPrestamos.mergeCells('A1:G1');
  const pT1 = wsPrestamos.getCell('A1');
  pT1.value = 'FUNDACIÓN MARINA ORTH - CONTROL DE PRÉSTAMOS Y ASIGNACIONES';
  pT1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.titleDark } };
  pT1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limePrimary } };
  pT1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPrestamos.getRow(1).height = 28;

  // Fila 2: Subtítulo
  wsPrestamos.mergeCells('A2:G2');
  const pT2 = wsPrestamos.getCell('A2');
  pT2.value = `Trazabilidad de Custodias y Equipos en Campo - Emisión: ${fechaEmisionDDMMAAAA} | Total: ${prestamos.length} registros`;
  pT2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLORS.white } };
  pT2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.limeMedium } };
  pT2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsPrestamos.getRow(2).height = 20;

  // Fila 3: Línea decorativa
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

  // Fila 5: Cabeceras
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

      // Estado del préstamo
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

  // Fila Total Préstamos
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

  // Autofiltro delimitado
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
