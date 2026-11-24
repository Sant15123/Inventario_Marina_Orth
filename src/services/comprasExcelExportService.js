import ExcelJS from 'exceljs';
import logoFmoUrl from '../assets/logo-marina-orth.png';

/**
 * Paleta oficial de marca Fundación Marina Orth (ARGB 8 dígitos)
 */
const FMO_COLORS = {
  azulInstitucional: 'FF013A52',
  verdeLima: 'FFABD037',
  verdeSuaveCebra: 'FFF4F9E8',
  fondoTarjetaMeta: 'FFF8FAFC',
  bordeNeutro: 'FFE2E8F0',
  bordeTabla: 'FFDCE4EC',
  bordeHeaderTabla: 'FF8FB524',
  textoEtiqueta: 'FF475569',
  textoPrincipal: 'FF0F172A',
  textoSecundario: 'FF334155',
  textoSubtituloHeader: 'FFCBD5E1',
  textoPie: 'FF64748B',
  blanco: 'FFFFFFFF',

  // Badges de estado
  badgeEvalBg: 'FFE0F2FE',
  badgeEvalText: 'FF0369A1',
  badgeAprobBg: 'FFF3E8FF',
  badgeAprobText: 'FF6B21A8',
  badgeCompBg: 'FFDCFCE7',
  badgeCompText: 'FF166534',
  badgeRechBg: 'FFFEE2E2',
  badgeRechText: 'FFB91C1C',
};

const ROLE_LABELS = {
  administrador: 'Administrador',
  admin: 'Administrador',
  coordinador: 'Coordinador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  usuario: 'Docente / Formador',
};

const ESTADO_FILTRO_LABELS = {
  pendientes: 'En Evaluación / Pendientes',
  aprobadas: 'Aprobadas',
  compradas: 'Compradas / Entregadas',
  rechazadas: 'Rechazadas',
};

const COL_WIDTHS = [18, 18, 26, 28, 28, 42, 20, 32, 22];

/**
 * Sanitiza texto para evitar caracteres de control ASCII que corrompen OpenXML.
 */
const sanitizarTexto = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  const raw = String(val);
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) {
      out += raw[i];
    }
  }
  const cleaned = out.trim();
  return cleaned || fallback;
};

/**
 * Formatea nombre y rol legible del usuario activo para auditoría.
 */
const formatGeneradoPor = (currentUser, isCoordinador) => {
  const nombre = sanitizarTexto(
    currentUser?.nombre || currentUser?.name || currentUser?.email,
    'Usuario SIGA-FMO'
  );
  const rawRol = String(
    currentUser?.rol || currentUser?.role || (isCoordinador ? 'coordinador' : 'administrador')
  )
    .toLowerCase()
    .trim();
  const rolLegible = ROLE_LABELS[rawRol] || (rawRol ? rawRol.charAt(0).toUpperCase() + rawRol.slice(1) : 'Administrador');
  return `${nombre} (${rolLegible})`;
};

/**
 * Construye resumen legible de los filtros activos aplicados al exportar.
 */
const buildFiltrosResumen = (filtros = {}) => {
  const {
    pestanaActiva,
    filtroSede,
    filtroProyecto,
    fechaDesde,
    fechaHasta,
    busqueda,
  } = filtros;

  const partes = [];
  if (pestanaActiva && pestanaActiva !== 'todas') {
    partes.push(`Estado: ${ESTADO_FILTRO_LABELS[pestanaActiva] || pestanaActiva}`);
  }
  if (filtroSede && filtroSede !== 'todas') {
    partes.push(`Sede: ${sanitizarTexto(filtroSede)}`);
  }
  if (filtroProyecto && filtroProyecto !== 'todos') {
    partes.push(`Proyecto: ${sanitizarTexto(filtroProyecto)}`);
  }
  if (fechaDesde || fechaHasta) {
    partes.push(`Fechas: ${fechaDesde || 'Inicio'} a ${fechaHasta || 'Hoy'}`);
  }
  if (busqueda && String(busqueda).trim()) {
    partes.push(`Búsqueda: "${sanitizarTexto(busqueda)}"`);
  }

  return partes.length > 0 ? partes.join('  •  ') : 'Sin filtros adicionales';
};

/**
 * Calcula altura de fila en puntos estimando saltos explícitos y ajuste de línea por ancho de columna.
 */
const calcularAlturaFila = (textosConAncho) => {
  let maxLines = 1;
  textosConAncho.forEach(({ text, width }) => {
    const str = String(text || '');
    if (!str) return;
    const effectiveWidth = Math.max(8, width - 3);
    const paragraphs = str.split('\n');
    let cellLines = 0;
    paragraphs.forEach((p) => {
      cellLines += Math.max(1, Math.ceil(p.length / effectiveWidth));
    });
    if (cellLines > maxLines) maxLines = cellLines;
  });
  return Math.max(24, maxLines * 14.5 + 8);
};

/**
 * Obtiene estilo de badge corporativo para la columna Estado.
 */
const getEstadoExcelStyle = (estadoNorm) => {
  if (estadoNorm === 'aprobadas') {
    return { bg: FMO_COLORS.badgeAprobBg, text: FMO_COLORS.badgeAprobText };
  }
  if (estadoNorm === 'compradas') {
    return { bg: FMO_COLORS.badgeCompBg, text: FMO_COLORS.badgeCompText };
  }
  if (estadoNorm === 'rechazadas') {
    return { bg: FMO_COLORS.badgeRechBg, text: FMO_COLORS.badgeRechText };
  }
  return { bg: FMO_COLORS.badgeEvalBg, text: FMO_COLORS.badgeEvalText };
};

/**
 * Carga el logo oficial de Fundación Marina Orth como ArrayBuffer para incrustarlo en ExcelJS.
 */
const cargarLogoBuffer = async () => {
  const candidates = [logoFmoUrl, '/logo-fmo.png', '/logo-marina-orth.png'].filter(Boolean);
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.arrayBuffer();
      }
    } catch {
      // Continuar con la siguiente ruta candidata
    }
  }
  return null;
};

/**
 * Construye el Workbook y el buffer .xlsx corporativo del módulo Gestión de Compras (SIGA-FMO).
 */
export async function construirLibroComprasExcel({
  solicitudes = [],
  currentUser = null,
  isCoordinador = false,
  filtros = {},
  helpers = {},
}) {
  const {
    formatRadicado = (id, rad) => String(rad || id || 'SC-FMO'),
    getSolNombre = (s) => s?.solicitante_nombre || 'Docente FMO',
    getSolSede = (s) => s?.sede_destino || s?.sede || 'Medellín',
    getSolProyecto = (s) => s?.proyecto_steam || 'Robótica Educativa',
    getSolFecha = (s) => s?.fecha_requerida || s?.creado_en || '',
    getSolItems = (s) => (Array.isArray(s?.items) ? s.items : []),
    normalizeEstado = (st) => {
      const n = String(st || '').toUpperCase();
      if (n.includes('APROB')) return 'aprobadas';
      if (n.includes('COMPR') || n.includes('ENTREG')) return 'compradas';
      if (n.includes('RECHAZ')) return 'rechazadas';
      return 'pendientes';
    },
    getEstadoBadgeConfig = (st) => ({ label: st || 'Pendiente' }),
    fmtDate = (d) => String(d || ''),
  } = helpers;

  const listaSolicitudes = Array.isArray(solicitudes) ? solicitudes : [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fundación Marina Orth - SIGA-FMO';
  workbook.lastModifiedBy = formatGeneradoPor(currentUser, isCoordinador);
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Gestión de Compras FMO', {
    properties: { tabColor: { argb: FMO_COLORS.verdeLima } },
    views: [{ showGridLines: false, state: 'frozen', ySplit: 9 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  // Configurar anchos holgados para evitar textos cortados
  worksheet.columns = COL_WIDTHS.map((width) => ({ width }));

  // =========================================================================
  // 1. ENCABEZADO INSTITUCIONAL CON LOGO (Filas 1 a 3)
  // =========================================================================
  worksheet.getRow(1).height = 26;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 20;

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 9; c++) {
      const cell = worksheet.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FMO_COLORS.azulInstitucional },
      };
      if (r === 3) {
        cell.border = {
          bottom: { style: 'thick', color: { argb: FMO_COLORS.verdeLima } },
        };
      }
    }
  }

  // Espacio reservado para logo oficial FMO (A1:B3)
  worksheet.mergeCells('A1:B3');

  // Títulos a la derecha del logo
  worksheet.mergeCells('C1:I1');
  const titleCell = worksheet.getCell('C1');
  titleCell.value = 'FUNDACIÓN MARINA ORTH';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: FMO_COLORS.blanco } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  worksheet.mergeCells('C2:I2');
  const subtitleCell = worksheet.getCell('C2');
  subtitleCell.value = 'REPORTE DE GESTIÓN DE COMPRAS Y ADQUISICIONES STEAM';
  subtitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: FMO_COLORS.verdeLima } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  worksheet.mergeCells('C3:I3');
  const mottoCell = worksheet.getCell('C3');
  mottoCell.value = 'Educating for the Future  •  Sistema SIGA-FMO';
  mottoCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: FMO_COLORS.textoSubtituloHeader } };
  mottoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Incrustar Logo FMO manteniendo proporción 1:1 original (447x447)
  const logoBuffer = await cargarLogoBuffer();
  if (logoBuffer) {
    const logoId = workbook.addImage({
      buffer: logoBuffer,
      extension: 'png',
    });
    worksheet.addImage(logoId, {
      tl: { col: 0.65, row: 0.18 },
      ext: { width: 68, height: 68 },
      editAs: 'oneCell',
    });
  }

  // =========================================================================
  // 2. SEPARADOR COMPACTO (Fila 4) Y METADATOS + KPIs (Filas 5 a 7)
  // =========================================================================
  worksheet.getRow(4).height = 10;

  const fechaEmision = new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const generadoPor = formatGeneradoPor(currentUser, isCoordinador);
  const filtrosResumen = buildFiltrosResumen(filtros);

  const totalSolicitudes = listaSolicitudes.length;
  const totalCompradasEntregadas = listaSolicitudes.filter(
    (s) => normalizeEstado(s.estado) === 'compradas'
  ).length;
  const totalInversionPrecalculada = listaSolicitudes.reduce((acc, sol) => {
    const val = Number(sol.valor_final_compra) || Number(sol.valor_estimado_compra) || 0;
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);

  const primeraFilaDatos = 10;
  const ultimaFilaDatos = totalSolicitudes > 0 ? primeraFilaDatos + totalSolicitudes - 1 : primeraFilaDatos;
  const filaTotal = totalSolicitudes > 0 ? ultimaFilaDatos + 1 : 11;

  // Aplicar fondo y bordes limpios a los dos bloques (A5:E7 y F5:I7)
  for (let r = 5; r <= 7; r++) {
    for (let c = 1; c <= 9; c++) {
      const cell = worksheet.getCell(r, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FMO_COLORS.fondoTarjetaMeta },
      };
      cell.border = {
        top: { style: r === 5 ? 'thin' : 'hair', color: { argb: FMO_COLORS.bordeNeutro } },
        bottom: { style: r === 7 ? 'thin' : 'hair', color: { argb: FMO_COLORS.bordeNeutro } },
        left: { style: c === 1 || c === 6 ? 'thin' : undefined, color: { argb: FMO_COLORS.bordeNeutro } },
        right: { style: c === 5 || c === 9 ? 'thin' : undefined, color: { argb: FMO_COLORS.bordeNeutro } },
      };
    }
  }

  worksheet.getRow(5).height = 22;
  worksheet.getRow(6).height = 22;
  worksheet.getRow(7).height = filtrosResumen.length > 68 ? 32 : 22;

  // Bloque Izquierdo: Datos de Auditoría (A5:E7)
  const auditLabels = [
    { row: 5, label: 'Fecha de emisión:', value: fechaEmision },
    { row: 6, label: 'Generado por:', value: generadoPor },
    { row: 7, label: 'Filtros aplicados:', value: filtrosResumen, wrap: true },
  ];

  auditLabels.forEach(({ row, label, value, wrap }) => {
    const lblCell = worksheet.getCell(row, 1);
    lblCell.value = label;
    lblCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: FMO_COLORS.textoEtiqueta } };
    lblCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    worksheet.mergeCells(row, 2, row, 5);
    const valCell = worksheet.getCell(row, 2);
    valCell.value = sanitizarTexto(value);
    valCell.font = { name: 'Calibri', size: 9.5, bold: row === 6, color: { argb: FMO_COLORS.textoPrincipal } };
    valCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: Boolean(wrap) };
  });

  // Bloque Derecho: KPIs del Reporte (F5:I7)
  worksheet.mergeCells('F5:H5');
  const kpiLbl1 = worksheet.getCell('F5');
  kpiLbl1.value = 'Total solicitudes exportadas:';
  kpiLbl1.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: FMO_COLORS.textoEtiqueta } };
  kpiLbl1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const kpiVal1 = worksheet.getCell('I5');
  kpiVal1.value = totalSolicitudes;
  kpiVal1.numFmt = '#,##0';
  kpiVal1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: FMO_COLORS.azulInstitucional } };
  kpiVal1.alignment = { vertical: 'middle', horizontal: 'right' };

  worksheet.mergeCells('F6:H6');
  const kpiLbl2 = worksheet.getCell('F6');
  kpiLbl2.value = 'Compras realizadas / entregadas:';
  kpiLbl2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: FMO_COLORS.textoEtiqueta } };
  kpiLbl2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const kpiVal2 = worksheet.getCell('I6');
  kpiVal2.value = totalCompradasEntregadas;
  kpiVal2.numFmt = '#,##0';
  kpiVal2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: FMO_COLORS.badgeCompText } };
  kpiVal2.alignment = { vertical: 'middle', horizontal: 'right' };

  worksheet.mergeCells('F7:H7');
  const kpiLbl3 = worksheet.getCell('F7');
  kpiLbl3.value = 'Inversión total del reporte (COP):';
  kpiLbl3.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: FMO_COLORS.azulInstitucional } };
  kpiLbl3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const kpiVal3 = worksheet.getCell('I7');
  kpiVal3.value =
    totalSolicitudes > 0
      ? { formula: `I${filaTotal}`, result: totalInversionPrecalculada }
      : 0;
  kpiVal3.numFmt = '"$"#,##0';
  kpiVal3.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: FMO_COLORS.azulInstitucional } };
  kpiVal3.alignment = { vertical: 'middle', horizontal: 'right' };

  // Fila 8: Separador compacto
  worksheet.getRow(8).height = 10;

  // =========================================================================
  // 3. ENCABEZADOS DE LA TABLA DE DATOS (Fila 9)
  // =========================================================================
  const headers = [
    'Radicado',
    'Fecha Radicado',
    'Solicitante',
    'Sede Destino',
    'Proyecto STEAM',
    'Ítems y Cantidades',
    'Estado',
    'Proveedor & Factura',
    'Valor Total (COP)',
  ];

  const headerRow = worksheet.getRow(9);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: FMO_COLORS.azulInstitucional } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: FMO_COLORS.verdeLima },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: FMO_COLORS.azulInstitucional } },
      bottom: { style: 'medium', color: { argb: FMO_COLORS.azulInstitucional } },
      left: { style: 'thin', color: { argb: FMO_COLORS.bordeHeaderTabla } },
      right: { style: 'thin', color: { argb: FMO_COLORS.bordeHeaderTabla } },
    };
  });

  // Autofiltro en encabezados
  worksheet.autoFilter = 'A9:I9';

  // =========================================================================
  // 4. FILAS DE DATOS (Desde Fila 10)
  // =========================================================================
  if (totalSolicitudes === 0) {
    worksheet.mergeCells('A10:I10');
    const emptyRow = worksheet.getRow(10);
    emptyRow.height = 30;
    const emptyCell = worksheet.getCell('A10');
    emptyCell.value = 'No se encontraron solicitudes de compra que coincidan con los filtros aplicados.';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: FMO_COLORS.textoPie } };
    emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 9; c++) {
      worksheet.getCell(10, c).border = {
        top: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
        bottom: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
        left: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
        right: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
      };
    }
  } else {
    listaSolicitudes.forEach((sol, idx) => {
      const rowNum = primeraFilaDatos + idx;
      const isZebra = idx % 2 === 1;
      const zebraFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isZebra ? FMO_COLORS.verdeSuaveCebra : FMO_COLORS.blanco },
      };

      const radicadoText = sanitizarTexto(formatRadicado(sol.id, sol.radicado), 'SC-FMO');
      const fechaText = sanitizarTexto(fmtDate(getSolFecha(sol)), '—');
      const solicitanteText = sanitizarTexto(getSolNombre(sol), 'Docente FMO');
      const sedeText = sanitizarTexto(getSolSede(sol), 'Medellín');
      const proyectoText = sanitizarTexto(getSolProyecto(sol), 'Robótica Educativa');

      const items = getSolItems(sol);
      const itemsText =
        items.length > 0
          ? items
              .map((i) => {
                const nom = sanitizarTexto(i.nombre, 'Ítem');
                const solQty = i.cantidad_solicitada || i.cantidad || 1;
                const aprobQty = i.cantidad_aprobada ?? '—';
                return `• ${nom} (Sol: ${solQty}, Aprob: ${aprobQty})`;
              })
              .join('\n')
          : 'Sin ítems detallados';

      const estadoNorm = normalizeEstado(sol.estado);
      const estadoConfig = getEstadoBadgeConfig(sol.estado);
      const estadoLabel = sanitizarTexto(estadoConfig?.label || sol.estado, 'Pendiente');
      const estadoStyle = getEstadoExcelStyle(estadoNorm);

      const proveedorText = sol.proveedor
        ? sanitizarTexto(`${sol.proveedor} (${sol.numero_factura_orden || 'S/N'})`)
        : estadoNorm === 'rechazadas'
          ? 'No aplica (Rechazada)'
          : 'Pendiente de compra';

      const rawValor = Number(sol.valor_final_compra) || Number(sol.valor_estimado_compra) || 0;
      const valorNumerico = Number.isFinite(rawValor) ? rawValor : 0;

      const row = worksheet.getRow(rowNum);
      row.values = [
        radicadoText,
        fechaText,
        solicitanteText,
        sedeText,
        proyectoText,
        itemsText,
        estadoLabel,
        proveedorText,
        valorNumerico,
      ];

      row.height = calcularAlturaFila([
        { text: radicadoText, width: COL_WIDTHS[0] },
        { text: solicitanteText, width: COL_WIDTHS[2] },
        { text: sedeText, width: COL_WIDTHS[3] },
        { text: proyectoText, width: COL_WIDTHS[4] },
        { text: itemsText, width: COL_WIDTHS[5] },
        { text: estadoLabel, width: COL_WIDTHS[6] },
        { text: proveedorText, width: COL_WIDTHS[7] },
      ]);

      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
          bottom: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
          left: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
          right: { style: 'thin', color: { argb: FMO_COLORS.bordeTabla } },
        };

        if (c === 7) {
          // Badge de estado coloreado
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: estadoStyle.bg },
          };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: estadoStyle.text } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        } else {
          cell.fill = zebraFill;
          cell.font = {
            name: 'Calibri',
            size: 9.5,
            bold: c === 1 || c === 9,
            color: { argb: c === 1 ? FMO_COLORS.azulInstitucional : FMO_COLORS.textoPrincipal },
          };

          if (c === 1 || c === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          } else if (c === 9) {
            cell.numFmt = '"$"#,##0';
            cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: false };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          }
        }
      }
    });
  }

  // =========================================================================
  // 5. FILA DE TOTALES CON FÓRMULA NATIVA Y PIE INSTITUCIONAL
  // =========================================================================
  const totalRow = worksheet.getRow(filaTotal);
  totalRow.height = 26;

  for (let c = 1; c <= 9; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: FMO_COLORS.azulInstitucional },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: FMO_COLORS.verdeLima } },
      bottom: { style: 'medium', color: { argb: FMO_COLORS.azulInstitucional } },
    };
  }

  worksheet.mergeCells(filaTotal, 1, filaTotal, 8);
  const totalLabelCell = worksheet.getCell(filaTotal, 1);
  totalLabelCell.value = 'TOTAL INVERSIÓN (COP):';
  totalLabelCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: FMO_COLORS.blanco } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const totalValueCell = worksheet.getCell(filaTotal, 9);
  totalValueCell.value =
    totalSolicitudes > 0
      ? { formula: `SUM(I${primeraFilaDatos}:I${ultimaFilaDatos})`, result: totalInversionPrecalculada }
      : 0;
  totalValueCell.numFmt = '"$"#,##0';
  totalValueCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: FMO_COLORS.verdeLima } };
  totalValueCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Pie institucional 2 filas debajo
  const filaPie = filaTotal + 2;
  worksheet.getRow(filaPie).height = 18;
  worksheet.mergeCells(filaPie, 1, filaPie, 9);
  const footerCell = worksheet.getCell(filaPie, 1);
  footerCell.value =
    'Documento de control interno generado por SIGA-FMO • Fundación Marina Orth • Todos los valores en Pesos Colombianos (COP).';
  footerCell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: FMO_COLORS.textoPie } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // =========================================================================
  // 6. GENERACIÓN DE BUFFER Y DESCARGA NATIVA POR BLOB
  // =========================================================================
  const buffer = await workbook.xlsx.writeBuffer();
  const fechaArchivo = new Date().toISOString().split('T')[0];
  const fileName = `SIGA_FMO_Gestion_Compras_${fechaArchivo}.xlsx`;
  return { workbook, buffer, fileName };
}

/**
 * Genera y descarga el reporte corporativo Excel (.xlsx) del módulo Gestión de Compras (SIGA-FMO).
 */
export async function exportarGestionComprasExcel(params) {
  const { buffer, fileName } = await construirLibroComprasExcel(params);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
