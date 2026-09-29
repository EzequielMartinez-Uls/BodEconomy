import ExcelJS from 'exceljs';
import {
  AppState,
  CashShift,
  PettyCashShift,
  PettyCashTransaction,
  TablewareItem,
  TablewareLoss,
} from '../types';
import { getLocalTodayStr, extractLocalDateStr } from '../utils/dateUtils';

// ============================================================================
// PALETA CORPORATIVA "EL BODEGÓN" PARA EXCEL
// ============================================================================
const COLOR_BRAND_GREEN = 'FF1C6856'; // Verde Oscuro Bodegón
const COLOR_BRAND_DARK = 'FF154F42';  // Verde Acento Profundo
const COLOR_HEADER_SLATE = 'FF334155'; // Gris Azulado Profesional
const COLOR_ZEBRA_LIGHT = 'FFF8FAFC';  // Blanco Hueso / Slate Claro
const COLOR_BORDER_GRAY = 'FFCBD5E1';  // Borde fino
const COLOR_WHITE = 'FFFFFFFF';
const COLOR_SUCCESS_BG = 'FFD1FAE5';   // Verde suave para Cuadrado
const COLOR_SUCCESS_TEXT = 'FF065F46';
const COLOR_DANGER_BG = 'FFFEE2E2';    // Rojo suave para Faltante
const COLOR_DANGER_TEXT = 'FF991B1B';
const COLOR_WARNING_BG = 'FFFEF3C7';   // Amarillo suave para Sobrante
const COLOR_WARNING_TEXT = 'FF92400E';

const FONT_NAME = 'Calibri';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
  left: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
  right: { style: 'thin', color: { argb: COLOR_BORDER_GRAY } },
};

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'double', color: { argb: 'FF000000' } },
};

// ============================================================================
// HELPER PARA DESCARGA DIRECTA DE ARCHIVO EXCEL
// ============================================================================
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 1. REPORTE PRINCIPAL: ACTA DE CIERRE Y CONCILIACIÓN DE CAJA
// ============================================================================
export async function exportShiftToExcel(shift: CashShift, state: AppState): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón ERP';
  wb.lastModifiedBy = shift.closedBy || shift.openedBy;
  wb.created = new Date();

  // --------------------------------------------------------------------------
  // HOJA 1: RESUMEN EJECUTIVO Y AUDITORÍA DE CAJA
  // --------------------------------------------------------------------------
  const wsSummary = wb.addWorksheet('Resumen de Cierre', {
    views: [{ showGridLines: true }],
  });

  wsSummary.columns = [
    { width: 34 }, // A: Concepto / Rubro
    { width: 22 }, // B: Detalle / Entidad
    { width: 18 }, // C: Monto C$
    { width: 16 }, // D: % / Notas
    { width: 20 }, // E: Referencia
  ];

  // Título Principal
  wsSummary.mergeCells('A1:E2');
  const titleCell = wsSummary.getCell('A1');
  titleCell.value = 'RESTAURANTE EL BODEGÓN — ACTA OFICIAL DE CIERRE Y ARQUEO DE CAJA';
  titleCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: COLOR_WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Subtítulo
  wsSummary.mergeCells('A3:E3');
  const subtitleCell = wsSummary.getCell('A3');
  subtitleCell.value = `DOCUMENTO CONTABLE OFICIAL • FECHA DE JORNADA: ${shift.date} • T/C: C$ ${shift.exchangeRate.toFixed(2)}`;
  subtitleCell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_DARK } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  let rowIdx = 5;

  const addSectionHeader = (title: string) => {
    wsSummary.mergeCells(`A${rowIdx}:E${rowIdx}`);
    const cell = wsSummary.getCell(`A${rowIdx}`);
    cell.value = title;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    wsSummary.getRow(rowIdx).height = 24;
    rowIdx++;
  };

  const addDataRow = (
    concepto: string,
    detalle: string,
    montoNIO?: number | null,
    extra?: string,
    isBold = false,
    isTotal = false
  ) => {
    const row = wsSummary.getRow(rowIdx);
    row.getCell(1).value = concepto;
    row.getCell(2).value = detalle;
    if (montoNIO !== undefined && montoNIO !== null) {
      row.getCell(3).value = montoNIO;
      row.getCell(3).numFmt = '"C$"#,##0.00;("C$"#,##0.00);"-"';
      row.getCell(3).alignment = { horizontal: 'right' };
    }
    if (extra) {
      row.getCell(4).value = extra;
      row.getCell(4).alignment = { horizontal: 'center' };
    }

    row.font = { name: FONT_NAME, size: 10, bold: isBold };

    if (isTotal) {
      row.getCell(1).border = DOUBLE_BOTTOM_BORDER;
      row.getCell(2).border = DOUBLE_BOTTOM_BORDER;
      row.getCell(3).border = DOUBLE_BOTTOM_BORDER;
      row.getCell(4).border = DOUBLE_BOTTOM_BORDER;
      row.getCell(5).border = DOUBLE_BOTTOM_BORDER;
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
    } else {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).border = THIN_BORDER;
      }
    }
    rowIdx++;
  };

  // 1. DATOS GENERALES DEL TURNO
  addSectionHeader('1. INFORMACIÓN GENERAL Y AUDITORÍA DEL TURNO');
  addDataRow('Estado de la Caja', shift.status === 'CLOSED' ? 'CERRADO Y CONCILIADO' : 'TURNO ABIERTO', null, shift.status);
  addDataRow('Responsable de Apertura', shift.openedBy, null, new Date(shift.openedAt).toLocaleTimeString());
  addDataRow('Responsable de Cierre', shift.closedBy || 'Pendiente', null, shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString() : 'N/A');
  addDataRow('Tasa de Cambio Oficial', `C$ ${shift.exchangeRate.toFixed(2)} por US$ 1.00`);
  rowIdx++;

  // 2. FONDO DE APERTURA
  addSectionHeader('2. COMPOSICIÓN DEL FONDO INICIAL (APERTURA)');
  addDataRow('Efectivo Físico en Córdobas (NIO)', 'Billetes y monedas locales', shift.totalOpeningNIO);
  addDataRow('Efectivo Físico en Dólares (USD)', `US$ ${shift.totalOpeningUSD.toFixed(2)}`, shift.totalOpeningUSD * shift.exchangeRate, `US$ ${shift.totalOpeningUSD.toFixed(2)}`);
  addDataRow('TOTAL FONDO INICIAL DE APERTURA', 'Equivalente Total en Córdobas', shift.totalOpeningEquivNIO, '100%', true, true);
  rowIdx++;

  // 3. VENTAS Y CONCILIACIÓN MULTIBANCO
  const totalGross = shift.totalGrossSales || 0;
  const cardsBAC = shift.cardsBAC || 0;
  const cardsFicohsa = shift.cardsFicohsa || 0;
  const cardsBanpro = shift.cardsBanpro || 0;
  const cardsLafise = shift.cardsLafise || 0;
  const totalCards = shift.totalCards || (cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise);
  const salesCash = shift.salesCashSystem || 0;
  const salesPY = shift.salesPedidosYa || 0;

  addSectionHeader('3. VENTAS POR CANAL Y CONCILIACIÓN MULTIBANCO');
  addDataRow('Ventas en Efectivo (Loyverse POS)', 'Recaudación en gaveta de caja general', salesCash, totalGross > 0 ? `${((salesCash / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('Tarjetas Datafast BAC Credomatic', 'POS BAC', cardsBAC, totalGross > 0 ? `${((cardsBAC / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('Tarjetas Datafast Banco Ficohsa', 'POS Ficohsa', cardsFicohsa, totalGross > 0 ? `${((cardsFicohsa / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('Tarjetas Datafast Banpro Promerica', 'POS Banpro', cardsBanpro, totalGross > 0 ? `${((cardsBanpro / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('Tarjetas Datafast Banco LAFISE', 'POS LAFISE', cardsLafise, totalGross > 0 ? `${((cardsLafise / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('SUBTOTAL TODAS LAS TARJETAS POS', 'Consolidado Datafast', totalCards, totalGross > 0 ? `${((totalCards / totalGross) * 100).toFixed(1)}%` : '0%', true);
  addDataRow('Ventas por Aplicación PedidosYa', 'Delivery externo digital', salesPY, totalGross > 0 ? `${((salesPY / totalGross) * 100).toFixed(1)}%` : '0%');
  addDataRow('TOTAL VENTAS BRUTAS DEL DÍA', 'Ingresos Operativos Totales', totalGross, '100%', true, true);
  rowIdx++;

  // 4. PROPINAS
  addSectionHeader('4. RECAUDACIÓN Y DISTRIBUCIÓN DE PROPINAS');
  addDataRow('Total Propina Recaudada', 'Porcentaje de servicio en ventas', shift.totalTipCollected || 0);
  addDataRow('Personal / Colaboradores en Turno', `${shift.staffCount || 0} personas`);
  addDataRow('Monto de Propina Individual', 'Por cada colaborador en turno', shift.individualTip || 0);
  addDataRow('Estado de Pago de Propinas', shift.tipPaid ? 'PAGADAS EN EFECTIVO' : 'NO PAGADAS / PENDIENTES', null, shift.tipPaid ? 'Liquidado' : 'Pendiente');
  rowIdx++;

  // 5. DEDUCCIONES, TRASLADOS Y RESERVAS
  addSectionHeader('5. DEDUCCIONES, RETIROS Y RESERVAS FINANCIERAS');
  addDataRow('Traslado a Caja Chica', 'Para fondo y gastos del día', shift.transferToPettyCash || 0);
  addDataRow('Pago de Horas Extras en Efectivo', 'Planilla operativa', shift.overtimePaidCash || 0);
  addDataRow('Pago de Días Extraordinarios en Efectivo', 'Feriados / Domingos', shift.extraDaysPaidCash || 0);
  addDataRow('Reserva Tributaria DGI', 'Aportes fiscales reservados', shift.reserveDGI || 0);
  addDataRow('Reserva de Planilla Quincenal', 'Fondo de sueldos', shift.reservePayroll || 0);
  addDataRow('Reserva de Vacaciones e Indemnización', 'Prestaciones de ley', shift.reserveVacations || 0);
  addDataRow('Retiro Socios / Snyder', 'Retiro de utilidades / aportes', shift.reserveSnyder || 0);
  addDataRow('TOTAL RETIROS Y RESERVAS DEL DÍA', 'Total Salidas de Efectivo', shift.totalWithdrawals || 0, '', true, true);
  rowIdx++;

  // 6. RESULTADO DEL ARQUEO Y CUADRE
  addSectionHeader('6. RESULTADO DEL ARQUEO FÍSICO Y AUDITORÍA');
  const expectedCash = shift.expectedCashNIO || 0;
  const actualCash = shift.actualCashNIO || shift.totalClosingEquivNIO || 0;
  const diffNIO = shift.differenceNIO !== undefined ? shift.differenceNIO : (actualCash - expectedCash);

  addDataRow('Efectivo Teórico Esperado (Sistema)', 'Fondo Inicial + Ventas Efectivo - Retiros', expectedCash, '', true);
  addDataRow('Efectivo Físico Real Contado en Gaveta', 'Conteo físico exacto de billetes y monedas', actualCash, '', true);
  addDataRow('DIFERENCIA DE CAJA (Faltante / Sobrante)', diffNIO === 0 ? 'Exacto (C$ 0.00)' : diffNIO > 0 ? `Sobrante (+C$ ${diffNIO.toFixed(2)})` : `Faltante (-C$ ${Math.abs(diffNIO).toFixed(2)})`, diffNIO, '', true, true);

  // Badge de Diagnóstico
  const diagRow = wsSummary.getRow(rowIdx);
  diagRow.getCell(1).value = 'DIAGNÓSTICO FINAL DE AUDITORÍA:';
  diagRow.getCell(1).font = { name: FONT_NAME, size: 11, bold: true };
  const diagCell = diagRow.getCell(2);
  diagCell.value = shift.auditStatus === 'SQUARED' || diffNIO === 0 ? '✓ CUADRADO EXACTO' : diffNIO > 0 ? '▲ SOBRANTE' : '▼ FALTANTE';
  diagCell.font = { name: FONT_NAME, size: 11, bold: true };
  diagCell.alignment = { horizontal: 'center' };

  if (shift.auditStatus === 'SQUARED' || diffNIO === 0) {
    diagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUCCESS_BG } };
    diagCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_SUCCESS_TEXT } };
  } else if (diffNIO < 0) {
    diagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DANGER_BG } };
    diagCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_DANGER_TEXT } };
  } else {
    diagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WARNING_BG } };
    diagCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_WARNING_TEXT } };
  }
  rowIdx += 2;

  // Notas
  if (shift.closingNotes || shift.openingNotes) {
    wsSummary.mergeCells(`A${rowIdx}:E${rowIdx}`);
    wsSummary.getCell(`A${rowIdx}`).value = `OBSERVACIONES: Apertura: "${shift.openingNotes || 'Sin notas'}" | Cierre: "${shift.closingNotes || 'Sin notas'}"`;
    wsSummary.getCell(`A${rowIdx}`).font = { name: FONT_NAME, size: 9, italic: true };
    rowIdx += 2;
  }

  // Firmas
  rowIdx++;
  wsSummary.mergeCells(`A${rowIdx}:B${rowIdx}`);
  wsSummary.mergeCells(`D${rowIdx}:E${rowIdx}`);
  wsSummary.getCell(`A${rowIdx}`).value = '_____________________________________\nCajero(a) Responsable en Turno';
  wsSummary.getCell(`D${rowIdx}`).value = '_____________________________________\nAdministrador(a) / Auditor de Caja';
  wsSummary.getCell(`A${rowIdx}`).alignment = { horizontal: 'center', wrapText: true };
  wsSummary.getCell(`D${rowIdx}`).alignment = { horizontal: 'center', wrapText: true };
  wsSummary.getCell(`A${rowIdx}`).font = { name: FONT_NAME, size: 9, bold: true };
  wsSummary.getCell(`D${rowIdx}`).font = { name: FONT_NAME, size: 9, bold: true };

  // --------------------------------------------------------------------------
  // HOJA 2: ARQUEO DETALLADO DE BILLETES Y MONEDAS
  // --------------------------------------------------------------------------
  const wsDenom = wb.addWorksheet('Arqueo de Billetes', {
    views: [{ showGridLines: true }],
  });

  wsDenom.columns = [
    { width: 28 }, // A: Denominación
    { width: 14 }, // B: Valor Unitario
    { width: 16 }, // C: Cant. Apertura
    { width: 20 }, // D: Subtotal Apertura
    { width: 16 }, // E: Cant. Cierre
    { width: 20 }, // F: Subtotal Cierre
    { width: 18 }, // G: Dif. Cantidad
    { width: 20 }, // H: Variación C$
  ];

  wsDenom.mergeCells('A1:H2');
  const dTitle = wsDenom.getCell('A1');
  dTitle.value = 'DESGLOSE COMPLETO DE DENOMINACIONES — APERTURA VS CIERRE';
  dTitle.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const dHeaders = [
    'Denominación',
    'Valor Unit.',
    'Cant. Apertura',
    'Subtotal Apertura',
    'Cant. Cierre',
    'Subtotal Cierre',
    'Dif. Cantidad',
    'Variación Neta',
  ];
  const hRow = wsDenom.getRow(4);
  dHeaders.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    c.alignment = { horizontal: i >= 1 ? 'right' : 'left', vertical: 'middle' };
  });
  hRow.height = 24;

  let dIdx = 5;

  const nioDenoms: [string, number][] = [
    ['Billete de C$ 1,000', 1000],
    ['Billete de C$ 500', 500],
    ['Billete de C$ 200', 200],
    ['Billete de C$ 100', 100],
    ['Billete de C$ 50', 50],
    ['Billete de C$ 20', 20],
    ['Billete de C$ 10', 10],
    ['Moneda de C$ 5', 5],
    ['Moneda de C$ 1', 1],
    ['Moneda de C$ 0.50', 0.5],
  ];

  const openingNIO = shift.openingNIO as unknown as Record<string | number, number>;
  const closingNIO = (shift.closingNIO || {}) as unknown as Record<string | number, number>;

  nioDenoms.forEach(([label, val]) => {
    const r = wsDenom.getRow(dIdx);
    const cantOpen = openingNIO[val] || 0;
    const totOpen = cantOpen * val;
    const cantClose = closingNIO[val] || 0;
    const totClose = cantClose * val;
    const difCant = cantClose - cantOpen;
    const difTot = totClose - totOpen;

    r.getCell(1).value = label;
    r.getCell(2).value = val;
    r.getCell(2).numFmt = '"C$"#,##0.00';
    r.getCell(3).value = cantOpen;
    r.getCell(3).numFmt = '#,##0';
    r.getCell(4).value = totOpen;
    r.getCell(4).numFmt = '"C$"#,##0.00';
    r.getCell(5).value = cantClose;
    r.getCell(5).numFmt = '#,##0';
    r.getCell(6).value = totClose;
    r.getCell(6).numFmt = '"C$"#,##0.00';
    r.getCell(7).value = difCant;
    r.getCell(7).numFmt = '+#,##0;-#,##0;0';
    r.getCell(8).value = difTot;
    r.getCell(8).numFmt = '"+"#,##0.00;"-"#,##0.00;0.00';

    for (let c = 1; c <= 8; c++) {
      r.getCell(c).border = THIN_BORDER;
      r.getCell(c).font = { name: FONT_NAME, size: 9.5 };
    }
    dIdx++;
  });

  // Subtotal NIO
  const rTotNIO = wsDenom.getRow(dIdx);
  rTotNIO.getCell(1).value = 'SUBTOTAL CÓRDOBAS (NIO)';
  rTotNIO.getCell(4).value = shift.totalOpeningNIO;
  rTotNIO.getCell(4).numFmt = '"C$"#,##0.00';
  rTotNIO.getCell(6).value = shift.totalClosingNIO || 0;
  rTotNIO.getCell(6).numFmt = '"C$"#,##0.00';
  rTotNIO.getCell(8).value = (shift.totalClosingNIO || 0) - shift.totalOpeningNIO;
  rTotNIO.getCell(8).numFmt = '"C$"#,##0.00';
  for (let c = 1; c <= 8; c++) {
    rTotNIO.getCell(c).border = DOUBLE_BOTTOM_BORDER;
    rTotNIO.getCell(c).font = { name: FONT_NAME, size: 10, bold: true };
    rTotNIO.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
  }
  dIdx += 2;

  // Dólares USD
  const usdDenoms: [string, number][] = [
    ['Billete de US$ 100', 100],
    ['Billete de US$ 50', 50],
    ['Billete de US$ 20', 20],
    ['Billete de US$ 10', 10],
    ['Billete de US$ 5', 5],
    ['Billete de US$ 2', 2],
    ['Billete de US$ 1', 1],
  ];

  const openingUSD = shift.openingUSD as unknown as Record<string | number, number>;
  const closingUSD = (shift.closingUSD || {}) as unknown as Record<string | number, number>;

  usdDenoms.forEach(([label, val]) => {
    const r = wsDenom.getRow(dIdx);
    const cantOpen = openingUSD[val] || 0;
    const totOpen = cantOpen * val;
    const cantClose = closingUSD[val] || 0;
    const totClose = cantClose * val;
    const difCant = cantClose - cantOpen;
    const difTot = totClose - totOpen;

    r.getCell(1).value = label;
    r.getCell(2).value = val;
    r.getCell(2).numFmt = '"$"#,##0.00';
    r.getCell(3).value = cantOpen;
    r.getCell(3).numFmt = '#,##0';
    r.getCell(4).value = totOpen;
    r.getCell(4).numFmt = '"$"#,##0.00';
    r.getCell(5).value = cantClose;
    r.getCell(5).numFmt = '#,##0';
    r.getCell(6).value = totClose;
    r.getCell(6).numFmt = '"$"#,##0.00';
    r.getCell(7).value = difCant;
    r.getCell(7).numFmt = '+#,##0;-#,##0;0';
    r.getCell(8).value = difTot;
    r.getCell(8).numFmt = '"+"#,##0.00;"-"#,##0.00;0.00';

    for (let c = 1; c <= 8; c++) {
      r.getCell(c).border = THIN_BORDER;
      r.getCell(c).font = { name: FONT_NAME, size: 9.5 };
    }
    dIdx++;
  });

  // Subtotal USD
  const rTotUSD = wsDenom.getRow(dIdx);
  rTotUSD.getCell(1).value = 'SUBTOTAL DÓLARES (USD)';
  rTotUSD.getCell(4).value = shift.totalOpeningUSD;
  rTotUSD.getCell(4).numFmt = '"$"#,##0.00';
  rTotUSD.getCell(6).value = shift.totalClosingUSD || 0;
  rTotUSD.getCell(6).numFmt = '"$"#,##0.00';
  for (let c = 1; c <= 8; c++) {
    rTotUSD.getCell(c).border = DOUBLE_BOTTOM_BORDER;
    rTotUSD.getCell(c).font = { name: FONT_NAME, size: 10, bold: true };
    rTotUSD.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
  }
  dIdx += 2;

  // Gran Total Equivalente
  const rGrand = wsDenom.getRow(dIdx);
  rGrand.getCell(1).value = `TOTAL EQUIVALENTE EN CÓRDOBAS (T/C ${shift.exchangeRate.toFixed(2)})`;
  rGrand.getCell(4).value = shift.totalOpeningEquivNIO;
  rGrand.getCell(4).numFmt = '"C$"#,##0.00';
  rGrand.getCell(6).value = shift.totalClosingEquivNIO || 0;
  rGrand.getCell(6).numFmt = '"C$"#,##0.00';
  rGrand.getCell(8).value = (shift.totalClosingEquivNIO || 0) - shift.totalOpeningEquivNIO;
  rGrand.getCell(8).numFmt = '"C$"#,##0.00';
  for (let c = 1; c <= 8; c++) {
    rGrand.getCell(c).border = DOUBLE_BOTTOM_BORDER;
    rGrand.getCell(c).font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_WHITE } };
    rGrand.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  }

  // --------------------------------------------------------------------------
  // HOJA 3: COMPRAS Y GASTOS DE CAJA CHICA DEL DÍA
  // --------------------------------------------------------------------------
  const dayTransactions = (state.pettyCashTransactions || []).filter(
    (tx) => extractLocalDateStr(tx.date) === shift.date
  );

  const wsPetty = wb.addWorksheet('Caja Chica del Día', {
    views: [{ showGridLines: true }],
  });

  wsPetty.columns = [
    { width: 8 },  // A: N°
    { width: 12 }, // B: Hora
    { width: 16 }, // C: Tipo
    { width: 22 }, // D: Rubro / Categoría
    { width: 26 }, // E: Proveedor / Establecimiento
    { width: 32 }, // F: Concepto / Detalle
    { width: 16 }, // G: Factura / Recibo
    { width: 16 }, // H: Método
    { width: 18 }, // I: Monto C$
    { width: 22 }, // J: Registrado Por
  ];

  wsPetty.mergeCells('A1:J2');
  const pTitle = wsPetty.getCell('A1');
  pTitle.value = `RESTAURANTE EL BODEGÓN — COMPRAS Y EGRESOS DE CAJA CHICA (${shift.date})`;
  pTitle.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  pTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  pTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  const pHeaders = [
    'N°',
    'Hora',
    'Tipo',
    'Categoría',
    'Proveedor',
    'Concepto',
    'N° Comprobante',
    'Método',
    'Monto (C$)',
    'Registrado Por',
  ];
  const pHRow = wsPetty.getRow(4);
  pHeaders.forEach((h, i) => {
    const c = pHRow.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    c.alignment = { horizontal: i === 8 ? 'right' : 'center', vertical: 'middle' };
  });
  pHRow.height = 24;

  let pIdx = 5;
  let totExpenses = 0;
  let totInflows = 0;

  if (dayTransactions.length === 0) {
    wsPetty.mergeCells(`A5:J5`);
    const noDataCell = wsPetty.getCell('A5');
    noDataCell.value = 'No se registraron movimientos de caja chica en esta fecha contable.';
    noDataCell.font = { name: FONT_NAME, size: 10, italic: true };
    noDataCell.alignment = { horizontal: 'center' };
    pIdx = 6;
  } else {
    dayTransactions.forEach((tx, i) => {
      const r = wsPetty.getRow(pIdx);
      if (tx.type === 'EXPENSE') totExpenses += tx.amount;
      else totInflows += tx.amount;

      r.getCell(1).value = i + 1;
      r.getCell(2).value = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      r.getCell(3).value = tx.type === 'EXPENSE' ? 'COMPRA / GASTO' : 'REEMBOLSO / INGRESO';
      r.getCell(4).value = tx.category;
      r.getCell(5).value = tx.vendor;
      r.getCell(6).value = tx.notes || tx.vendor;
      r.getCell(7).value = tx.receiptNumber || 'Sin factura';
      r.getCell(8).value = tx.method === 'CASH' ? 'Efectivo' : tx.method === 'CARD' ? 'Tarjeta' : 'Transferencia';
      r.getCell(9).value = tx.type === 'EXPENSE' ? -tx.amount : tx.amount;
      r.getCell(9).numFmt = '"C$"#,##0.00;("C$"#,##0.00);"-"';
      r.getCell(10).value = tx.registeredBy;

      for (let c = 1; c <= 10; c++) {
        r.getCell(c).border = THIN_BORDER;
        r.getCell(c).font = { name: FONT_NAME, size: 9 };
      }
      if (pIdx % 2 === 0) {
        r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
      }
      pIdx++;
    });

    const totRow = wsPetty.getRow(pIdx);
    totRow.getCell(1).value = 'TOTAL EGRESOS / COMPRAS DEL DÍA:';
    wsPetty.mergeCells(`A${pIdx}:H${pIdx}`);
    totRow.getCell(1).alignment = { horizontal: 'right' };
    totRow.getCell(9).value = totExpenses;
    totRow.getCell(9).numFmt = '"C$"#,##0.00';
    for (let c = 1; c <= 10; c++) {
      totRow.getCell(c).border = DOUBLE_BOTTOM_BORDER;
      totRow.getCell(c).font = { name: FONT_NAME, size: 10, bold: true };
      totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
    }
  }

  // Guardar archivo
  await saveWorkbook(wb, `Bodegon_Cierre_${shift.date}_${shift.openedBy}.xlsx`);
}

// ============================================================================
// 2. REPORTE EXCEL: GASTOS DIARIOS DE CAJA CHICA (COMPRAS)
// ============================================================================
export async function exportPettyCashExpensesToExcel(
  dateStr: string,
  transactions: PettyCashTransaction[],
  currentBalance: number,
  adminName: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón ERP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Gastos Caja Chica', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 8 },  // A: N°
    { width: 12 }, // B: Hora
    { width: 22 }, // C: Categoría
    { width: 26 }, // D: Proveedor
    { width: 34 }, // E: Concepto
    { width: 16 }, // F: Factura
    { width: 16 }, // G: Método
    { width: 18 }, // H: Monto C$
    { width: 20 }, // I: Registrado Por
  ];

  ws.mergeCells('A1:I2');
  const title = ws.getCell('A1');
  title.value = `RESTAURANTE EL BODEGÓN — REPORTE DE CAJA CHICA (COMPRAS Y GASTOS)`;
  title.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A3:I3');
  const sub = ws.getCell('A3');
  sub.value = `FECHA: ${dateStr} • ADMINISTRADOR: ${adminName} • SALDO EN MANO: C$ ${currentBalance.toFixed(2)}`;
  sub.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_DARK } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['N°', 'Hora', 'Categoría', 'Proveedor', 'Concepto', 'N° Factura', 'Método', 'Monto C$', 'Registrado Por'];
  const hRow = ws.getRow(5);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    c.alignment = { horizontal: i === 7 ? 'right' : 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  let rIdx = 6;
  let tot = 0;
  transactions.filter(t => t.type === 'EXPENSE').forEach((t, i) => {
    tot += t.amount;
    const r = ws.getRow(rIdx);
    r.getCell(1).value = i + 1;
    r.getCell(2).value = new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    r.getCell(3).value = t.category;
    r.getCell(4).value = t.vendor;
    r.getCell(5).value = t.notes || t.vendor;
    r.getCell(6).value = t.receiptNumber || 'Sin factura';
    r.getCell(7).value = t.method === 'CASH' ? 'Efectivo' : 'Transferencia';
    r.getCell(8).value = t.amount;
    r.getCell(8).numFmt = '"C$"#,##0.00';
    r.getCell(9).value = t.registeredBy;

    for (let c = 1; c <= 9; c++) {
      r.getCell(c).border = THIN_BORDER;
      r.getCell(c).font = { name: FONT_NAME, size: 9.5 };
    }
    if (rIdx % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
    }
    rIdx++;
  });

  const totRow = ws.getRow(rIdx);
  totRow.getCell(1).value = 'TOTAL GASTOS Y COMPRAS DEL DÍA:';
  ws.mergeCells(`A${rIdx}:G${rIdx}`);
  totRow.getCell(1).alignment = { horizontal: 'right' };
  totRow.getCell(8).value = tot;
  totRow.getCell(8).numFmt = '"C$"#,##0.00';
  for (let c = 1; c <= 9; c++) {
    totRow.getCell(c).border = DOUBLE_BOTTOM_BORDER;
    totRow.getCell(c).font = { name: FONT_NAME, size: 10, bold: true };
    totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
  }

  await saveWorkbook(wb, `Bodegon_CajaChica_${dateStr}.xlsx`);
}

// ============================================================================
// 3. REPORTE EXCEL: ACTA DE CIERRE DIARIO DE CAJA CHICA
// ============================================================================
export async function exportPettyCashClosingToExcel(
  shift: PettyCashShift,
  transactions: PettyCashTransaction[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón ERP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Acta Cierre Caja Chica', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 34 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
  ];

  ws.mergeCells('A1:D2');
  const title = ws.getCell('A1');
  title.value = `RESTAURANTE EL BODEGÓN — ACTA DE CIERRE DE CAJA CHICA`;
  title.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  let rIdx = 4;
  const addRow = (label: string, detail: string, amount?: number | null, isBold = false) => {
    const r = ws.getRow(rIdx);
    r.getCell(1).value = label;
    r.getCell(2).value = detail;
    if (amount !== undefined && amount !== null) {
      r.getCell(3).value = amount;
      r.getCell(3).numFmt = '"C$"#,##0.00';
      r.getCell(3).alignment = { horizontal: 'right' };
    }
    r.font = { name: FONT_NAME, size: 10, bold: isBold };
    for (let c = 1; c <= 4; c++) r.getCell(c).border = THIN_BORDER;
    rIdx++;
  };

  addRow('Fecha de Jornada', shift.date, null, true);
  addRow('Responsable de Apertura', shift.openedBy, null);
  addRow('Responsable de Cierre', shift.closedBy || 'N/A', null);
  addRow('Fondo del Día Anterior', 'Remanente anterior', shift.previousDayRemaining);
  addRow('Traslado de Caja General', 'Fondeo operativo', shift.generalCashTransfer);
  addRow('Aporte Extra / Depósito Jefe', 'Aporte extraordinario', shift.bossContribution);
  addRow('TOTAL FONDO INICIAL', 'Fondo base disponible', shift.initialBalance, true);
  addRow('Total Egresos / Compras Hoy', 'Gastos acumulados', shift.totalExpenses || 0);
  addRow('Saldo Teórico en Gaveta', 'Inicial + Fondeos - Gastos', shift.expectedBalance || 0, true);
  addRow('Saldo Real Físico Contado', 'Arqueo en efectivo', shift.actualCashCounted || 0, true);
  const diff = shift.difference ?? 0;
  addRow('Diferencia de Cuadre', diff === 0 ? 'Exacto' : diff > 0 ? 'Sobrante' : 'Faltante', diff, true);

  await saveWorkbook(wb, `Bodegon_CierreCajaChica_${shift.date}.xlsx`);
}

// ============================================================================
// 4. REPORTE EXCEL: HISTORIAL DE CIERRES DE CAJA CHICA
// ============================================================================
export async function exportPettyCashHistoryToExcel(shifts: PettyCashShift[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón ERP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Historial Cierres', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 14 }, // Fecha
    { width: 18 }, // Apertura por
    { width: 18 }, // Cierre por
    { width: 16 }, // Fondo Inicial
    { width: 16 }, // Compras
    { width: 16 }, // Saldo Esperado
    { width: 16 }, // Saldo Contado
    { width: 16 }, // Diferencia
    { width: 16 }, // Diagnóstico
    { width: 28 }, // Notas
  ];

  ws.mergeCells('A1:J2');
  const title = ws.getCell('A1');
  title.value = `HISTORIAL DE CIERRES DE CAJA CHICA — RESTAURANTE EL BODEGÓN`;
  title.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = [
    'Fecha',
    'Apertura Por',
    'Cierre Por',
    'Fondo Inicial',
    'Compras',
    'Saldo Teórico',
    'Saldo Físico',
    'Diferencia',
    'Diagnóstico',
    'Notas',
  ];
  const hRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    c.alignment = { horizontal: i >= 3 && i <= 7 ? 'right' : 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  let rIdx = 5;
  shifts.forEach((s) => {
    const r = ws.getRow(rIdx);
    r.getCell(1).value = s.date;
    r.getCell(2).value = s.openedBy;
    r.getCell(3).value = s.closedBy || 'N/A';
    r.getCell(4).value = s.initialBalance;
    r.getCell(4).numFmt = '"C$"#,##0.00';
    r.getCell(5).value = s.totalExpenses || 0;
    r.getCell(5).numFmt = '"C$"#,##0.00';
    r.getCell(6).value = s.expectedBalance || 0;
    r.getCell(6).numFmt = '"C$"#,##0.00';
    r.getCell(7).value = s.actualCashCounted || 0;
    r.getCell(7).numFmt = '"C$"#,##0.00';
    r.getCell(8).value = s.difference || 0;
    r.getCell(8).numFmt = '"C$"#,##0.00';
    r.getCell(9).value = s.auditStatus === 'SQUARED' ? 'CUADRADO' : s.auditStatus === 'SHORTAGE' ? 'FALTANTE' : 'SOBRANTE';
    r.getCell(10).value = s.closingNotes || '';

    for (let c = 1; c <= 10; c++) {
      r.getCell(c).border = THIN_BORDER;
      r.getCell(c).font = { name: FONT_NAME, size: 9 };
    }
    if (rIdx % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA_LIGHT } };
    }
    rIdx++;
  });

  await saveWorkbook(wb, `Bodegon_Historial_Cierres_CajaChica.xlsx`);
}

// ============================================================================
// 5. REPORTE EXCEL: CONTROL DE MENAJE Y ROTURAS
// ============================================================================
export async function exportTablewareToExcel(
  items: TablewareItem[],
  losses: TablewareLoss[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón ERP';
  wb.created = new Date();

  const ws = wb.addWorksheet('Inventario Menaje', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { width: 12 },
    { width: 28 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
  ];

  ws.mergeCells('A1:H2');
  const title = ws.getCell('A1');
  title.value = `INVENTARIO DE CRISTALERÍA, LOZA Y UTENSILIOS — EL BODEGÓN`;
  title.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_WHITE } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BRAND_GREEN } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };

  const headers = ['Código', 'Artículo', 'Área', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Costo Unit. C$', 'Última Auditoría'];
  const hRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_SLATE } };
    c.alignment = { horizontal: i >= 4 && i <= 6 ? 'right' : 'center', vertical: 'middle' };
  });
  hRow.height = 24;

  let rIdx = 5;
  items.forEach((item) => {
    const r = ws.getRow(rIdx);
    r.getCell(1).value = item.id;
    r.getCell(2).value = item.name;
    r.getCell(3).value = item.area;
    r.getCell(4).value = item.unit;
    r.getCell(5).value = item.currentStock;
    r.getCell(6).value = item.minimumStock;
    r.getCell(7).value = item.unitCostNIO;
    r.getCell(7).numFmt = '"C$"#,##0.00';
    r.getCell(8).value = item.lastAuditDate;

    for (let c = 1; c <= 8; c++) {
      r.getCell(c).border = THIN_BORDER;
      r.getCell(c).font = { name: FONT_NAME, size: 9.5 };
    }
    rIdx++;
  });

  await saveWorkbook(wb, `Bodegon_Control_Menaje_${getLocalTodayStr()}.xlsx`);
}
