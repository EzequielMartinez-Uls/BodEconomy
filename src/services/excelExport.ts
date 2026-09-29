import * as XLSX from 'xlsx';
import { AppState, CashShift, PettyCashShift, PettyCashTransaction, TablewareItem, TablewareLoss } from '../types';
import { getLocalTodayStr } from '../utils/dateUtils';

export function exportShiftToExcel(shift: CashShift, state: AppState): void {
  const wb = XLSX.utils.book_new();

  // 1. Resumen General del Turno
  const summaryData = [
    ['RESTAURANTE EL BODEGÓN — ACTA DE CIERRE Y CONCILIACIÓN DE CAJA'],
    ['Fecha del Turno:', shift.date],
    ['Estado:', shift.status === 'CLOSED' ? 'CERRADO Y CONCILIADO' : 'ABIERTO'],
    ['Tasa de Cambio (T/C):', `C$ ${shift.exchangeRate.toFixed(2)} por US$ 1.00`],
    [],
    ['--- APERTURA DE CAJA ---'],
    ['Responsable Apertura:', shift.openedBy],
    ['Hora Apertura:', new Date(shift.openedAt).toLocaleTimeString()],
    ['Efectivo Físico C$:', shift.totalOpeningNIO],
    ['Efectivo Físico US$:', shift.totalOpeningUSD],
    ['Total Fondo Apertura (Equiv C$):', shift.totalOpeningEquivNIO],
    ['Notas Apertura:', shift.openingNotes || 'Sin notas'],
    [],
    ['--- CIERRE DE CAJA ---'],
    ['Responsable Cierre:', shift.closedBy || 'N/A'],
    ['Hora Cierre:', shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString() : 'N/A'],
    ['Efectivo Físico C$:', shift.totalClosingNIO || 0],
    ['Efectivo Físico US$:', shift.totalClosingUSD || 0],
    ['Total Cierre (Equiv C$):', shift.totalClosingEquivNIO || 0],
    [],
    ['--- VENTAS Y CONCILIACIÓN MULTIBANCO ---'],
    ['Ventas Efectivo (POS):', shift.salesCashSystem || 0],
    ['Tarjetas BAC:', shift.cardsBAC || 0],
    ['Tarjetas FICOHSA:', shift.cardsFicohsa || 0],
    ['Tarjetas BANPRO:', shift.cardsBanpro || 0],
    ['Tarjetas LAFISE:', shift.cardsLafise || 0],
    ['SUBTOTAL TARJETAS:', shift.totalCards || 0],
    ['Ventas Pedidos Ya:', shift.salesPedidosYa || 0],
    ['TOTAL VENTAS BRUTAS:', shift.totalGrossSales || 0],
    [],
    ['--- PROPINAS ---'],
    ['Total Propina Recaudada:', shift.totalTipCollected || 0],
    ['Personal en Turno:', shift.staffCount || 0],
    ['Propina Individual:', shift.individualTip || 0],
    ['Estado de Pago:', shift.tipPaid ? 'PAGADA EN EFECTIVO' : 'NO PAGADA'],
    [],
    ['--- DEDUCCIONES Y RETIROS ---'],
    ['Traslado a Caja Chica:', shift.transferToPettyCash || 0],
    ['Horas Extras en Efectivo:', shift.overtimePaidCash || 0],
    ['Días Extraordinarios en Efectivo:', shift.extraDaysPaidCash || 0],
    ['Reserva DGI:', shift.reserveDGI || 0],
    ['Reserva Planilla:', shift.reservePayroll || 0],
    ['Reserva Vacaciones:', shift.reserveVacations || 0],
    ['Depósito Snyder / Socios:', shift.reserveSnyder || 0],
    ['TOTAL RETIROS:', shift.totalWithdrawals || 0],
    [],
    ['--- SALDO AL CIERRE DE CAJA GRANDE ---'],
    ['Saldo Físico en Gaveta (Fondo Apertura Mañana):', shift.actualCashNIO || shift.totalClosingEquivNIO || 0],
    ['Utilidad Neta de la Jornada (Ingresos - Egresos):', shift.dailyNetProfit || 0],
    [],
    ['--- RESULTADO DEL ARQUEO ---'],
    ['Efectivo Físico Contado:', shift.actualCashNIO || 0],
    ['Efectivo Esperado según Sistema:', shift.expectedCashNIO || 0],
    ['DIFERENCIA (Faltante / Sobrante):', shift.differenceNIO || 0],
    ['DIAGNÓSTICO:', shift.auditStatus === 'SQUARED' ? 'CUADRADO PERFECTO' : shift.auditStatus === 'SURPLUS' ? 'SOBRANTE' : 'FALTANTE'],
    ['Notas de Cierre:', shift.closingNotes || 'Sin notas'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Cierre');

  // 2. Desglose de Billetes Apertura y Cierre
  const denomData = [
    ['DENOMINACIONES DE BILLETES — APERTURA Y CIERRE'],
    [],
    ['MONEDA NACIONAL (C$)', 'VALOR', 'CANT. APERTURA', 'TOTAL APERTURA', 'CANT. CIERRE', 'TOTAL CIERRE'],
    ['Billetes de 1000', 1000, shift.openingNIO[1000], shift.openingNIO[1000] * 1000, shift.closingNIO?.[1000] || 0, (shift.closingNIO?.[1000] || 0) * 1000],
    ['Billetes de 500', 500, shift.openingNIO[500], shift.openingNIO[500] * 500, shift.closingNIO?.[500] || 0, (shift.closingNIO?.[500] || 0) * 500],
    ['Billetes de 200', 200, shift.openingNIO[200], shift.openingNIO[200] * 200, shift.closingNIO?.[200] || 0, (shift.closingNIO?.[200] || 0) * 200],
    ['Billetes de 100', 100, shift.openingNIO[100], shift.openingNIO[100] * 100, shift.closingNIO?.[100] || 0, (shift.closingNIO?.[100] || 0) * 100],
    ['Billetes de 50', 50, shift.openingNIO[50], shift.openingNIO[50] * 50, shift.closingNIO?.[50] || 0, (shift.closingNIO?.[50] || 0) * 50],
    ['Billetes de 20', 20, shift.openingNIO[20], shift.openingNIO[20] * 20, shift.closingNIO?.[20] || 0, (shift.closingNIO?.[20] || 0) * 20],
    ['Billetes de 10', 10, shift.openingNIO[10], shift.openingNIO[10] * 10, shift.closingNIO?.[10] || 0, (shift.closingNIO?.[10] || 0) * 10],
    ['Monedas de 5', 5, shift.openingNIO[5], shift.openingNIO[5] * 5, shift.closingNIO?.[5] || 0, (shift.closingNIO?.[5] || 0) * 5],
    ['Monedas de 1', 1, shift.openingNIO[1], shift.openingNIO[1] * 1, shift.closingNIO?.[1] || 0, (shift.closingNIO?.[1] || 0) * 1],
    ['Monedas de 0.50', 0.5, shift.openingNIO[0.5], shift.openingNIO[0.5] * 0.5, shift.closingNIO?.[0.5] || 0, (shift.closingNIO?.[0.5] || 0) * 0.5],
    [],
    ['MONEDA EXTRANJERA (US$)', 'VALOR', 'CANT. APERTURA', 'TOTAL APERTURA', 'CANT. CIERRE', 'TOTAL CIERRE'],
    ['Billetes de 100', 100, shift.openingUSD[100], shift.openingUSD[100] * 100, shift.closingUSD?.[100] || 0, (shift.closingUSD?.[100] || 0) * 100],
    ['Billetes de 50', 50, shift.openingUSD[50], shift.openingUSD[50] * 50, shift.closingUSD?.[50] || 0, (shift.closingUSD?.[50] || 0) * 50],
    ['Billetes de 20', 20, shift.openingUSD[20], shift.openingUSD[20] * 20, shift.closingUSD?.[20] || 0, (shift.closingUSD?.[20] || 0) * 20],
    ['Billetes de 10', 10, shift.openingUSD[10], shift.openingUSD[10] * 10, shift.closingUSD?.[10] || 0, (shift.closingUSD?.[10] || 0) * 10],
    ['Billetes de 5', 5, shift.openingUSD[5], shift.openingUSD[5] * 5, shift.closingUSD?.[5] || 0, (shift.closingUSD?.[5] || 0) * 5],
    ['Billetes de 2', 2, shift.openingUSD[2], shift.openingUSD[2] * 2, shift.closingUSD?.[2] || 0, (shift.closingUSD?.[2] || 0) * 2],
    ['Billetes de 1', 1, shift.openingUSD[1], shift.openingUSD[1] * 1, shift.closingUSD?.[1] || 0, (shift.closingUSD?.[1] || 0) * 1],
  ];

  const wsDenom = XLSX.utils.aoa_to_sheet(denomData);
  XLSX.utils.book_append_sheet(wb, wsDenom, 'Arqueo Billetes');

  // 3. Movimientos de Caja Chica
  const pettyRows = [
    ['HISTORIAL DE CAJA CHICA — GASTOS Y REEMBOLSOS'],
    ['Fecha/Hora', 'Tipo', 'Monto C$', 'Método', 'Proveedor / Concepto', 'Categoría', 'Comprobante', 'Registrado Por', 'Notas'],
    ...state.pettyCashTransactions.map((tx) => [
      new Date(tx.date).toLocaleString(),
      tx.type === 'INFLOW' ? 'REEMBOLSO / INGRESO' : 'GASTO',
      tx.amount,
      tx.method === 'CASH' ? 'EFECTIVO' : tx.method === 'CARD' ? 'TARJETA' : 'TRANSFERENCIA',
      tx.vendor,
      tx.category,
      tx.receiptNumber || 'N/A',
      tx.registeredBy,
      tx.notes || '',
    ]),
  ];
  const wsPetty = XLSX.utils.aoa_to_sheet(pettyRows);
  XLSX.utils.book_append_sheet(wb, wsPetty, 'Caja Chica');

  // 4. Inventario de Menaje y Roturas
  const tablewareRows = [
    ['INVENTARIO DE CRISTALERÍA, LOZA Y UTENSILIOS'],
    ['Código', 'Artículo', 'Área', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Costo Unit. C$', 'Última Auditoría'],
    ...state.tablewareItems.map((item) => [
      item.id,
      item.name,
      item.area,
      item.unit,
      item.currentStock,
      item.minimumStock,
      item.unitCostNIO,
      item.lastAuditDate,
    ]),
    [],
    ['REGISTRO DE ROTURAS Y BAJAS'],
    ['Fecha/Hora', 'Artículo', 'Cantidad', 'Motivo', 'Costo Total C$', 'Registrado Por', 'Notas'],
    ...state.tablewareLosses.map((l) => [
      new Date(l.date).toLocaleString(),
      l.itemName,
      l.quantity,
      l.reason,
      l.totalCostNIO,
      l.registeredBy,
      l.notes || '',
    ]),
  ];
  const wsTableware = XLSX.utils.aoa_to_sheet(tablewareRows);
  XLSX.utils.book_append_sheet(wb, wsTableware, 'Menaje y Bajas');

  // Descargar archivo
  XLSX.writeFile(wb, `Bodegon_Cierre_${shift.date}_${shift.openedBy}_${shift.closedBy || 'Pendiente'}.xlsx`);
}

// ============================================================================
// EXCEL: REPORTE DIARIO DE CAJA CHICA (GASTOS Y COMPRAS)
// ============================================================================
export function exportPettyCashExpensesToExcel(
  dateStr: string,
  transactions: PettyCashTransaction[],
  currentBalance: number,
  adminName: string
): void {
  const wb = XLSX.utils.book_new();

  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const inflows = transactions.filter((t) => t.type === 'INFLOW');
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalInflows = inflows.reduce((s, t) => s + t.amount, 0);

  const headerRows = [
    ['RESTAURANTE EL BODEGÓN — REPORTE DE CAJA CHICA (COMPRAS Y GASTOS)'],
    ['Fecha:', dateStr],
    ['Generado por:', adminName],
    ['Saldo en Mano Disponible (C$):', currentBalance],
    ['Total Compras Realizadas (C$):', totalExpenses],
    ['Total Fondeos / Ingresos (C$):', totalInflows],
    [],
    ['DETALLE DE MOVIMIENTOS'],
    ['Hora', 'Tipo', 'Categoría', 'Proveedor / Concepto', 'No. Comprobante', 'Forma de Pago', 'Registrado Por', 'Monto C$', 'Notas'],
    ...transactions.map((tx) => [
      new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tx.type === 'EXPENSE' ? 'COMPRA / GASTO' : 'FONDEO / INGRESO',
      tx.category,
      tx.vendor,
      tx.receiptNumber || 'Sin factura',
      tx.method === 'CASH' ? 'Efectivo' : tx.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
      tx.registeredBy,
      tx.type === 'EXPENSE' ? -tx.amount : tx.amount,
      tx.notes || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

  // Resumen por Categoría
  const catTotals: Record<string, number> = {};
  expenses.forEach((tx) => {
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  });

  const catRows = [
    ['RESUMEN DE GASTOS POR RUBRO / CATEGORÍA'],
    ['Categoría', 'Total Gastado C$'],
    ...Object.entries(catTotals).map(([cat, tot]) => [cat, tot]),
    [],
    ['TOTAL COMPRAS:', totalExpenses],
  ];

  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categorías');

  XLSX.writeFile(wb, `Bodegon_CajaChica_${dateStr}.xlsx`);
}

// ============================================================================
// EXCEL: ACTA DE CIERRE DIARIO DE CAJA CHICA
// ============================================================================
export function exportPettyCashClosingToExcel(
  shift: PettyCashShift,
  transactions: PettyCashTransaction[]
): void {
  const wb = XLSX.utils.book_new();

  const closingData = [
    ['RESTAURANTE EL BODEGÓN — ACTA DE CIERRE DIARIO DE CAJA CHICA'],
    ['Fecha de Jornada:', shift.date],
    ['Apertura por:', shift.openedBy],
    ['Hora Apertura:', new Date(shift.openedAt).toLocaleTimeString()],
    ['Cierre por:', shift.closedBy || 'N/A'],
    ['Hora Cierre:', shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString() : 'N/A'],
    [],
    ['--- COMPOSICIÓN DEL FONDO DE APERTURA ---'],
    ['1. Fondo del Día Anterior:', shift.previousDayRemaining],
    ['2. Traslado de General:', shift.generalCashTransfer],
    ['3. Depósito a Caja Chica (Aporte del Jefe):', shift.bossContribution],
    ['TOTAL FONDO INICIAL:', shift.initialBalance],
    [],
    ['--- MOVIMIENTOS DE LA JORNADA ---'],
    ['(+) Fondeos Extras Hoy:', shift.totalInflows || 0],
    ['(-) Total Compras Hoy:', shift.totalExpenses || 0],
    ['(=) Saldo Teórico en Gaveta:', shift.expectedBalance || 0],
    [],
    ['--- ARQUEO FÍSICO Y AUDITORÍA ---'],
    ['Efectivo Real Contado en Gaveta:', shift.actualCashCounted || 0],
    ['Diferencia de Cuadre:', shift.difference || 0],
    ['Diagnóstico:', shift.auditStatus === 'SQUARED' ? 'CUADRADO EXACTO' : shift.auditStatus === 'SHORTAGE' ? 'FALTANTE' : 'SOBRANTE'],
    ['Observaciones de Cierre:', shift.closingNotes || 'Sin notas'],
    [],
    ['DETALLE DE COMPRAS Y GASTOS DE LA JORNADA'],
    ['Hora', 'Rubro / Categoría', 'Proveedor / Concepto', 'Factura / Recibo', 'Forma de Pago', 'Monto C$', 'Notas'],
    ...transactions.filter((t) => t.type === 'EXPENSE').map((tx) => [
      new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tx.category,
      tx.vendor,
      tx.receiptNumber || 'Sin factura',
      tx.method === 'CASH' ? 'Efectivo' : tx.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
      tx.amount,
      tx.notes || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(closingData);
  XLSX.utils.book_append_sheet(wb, ws, 'Acta Cierre');

  XLSX.writeFile(wb, `Bodegon_CierreCajaChica_${shift.date}.xlsx`);
}

// ============================================================================
// EXCEL: HISTORIAL DE CIERRES DE CAJA CHICA
// ============================================================================
export function exportPettyCashHistoryToExcel(shifts: PettyCashShift[]): void {
  const wb = XLSX.utils.book_new();

  const historyRows = [
    ['HISTORIAL DE CIERRES DIARIOS DE CAJA CHICA — EL BODEGÓN'],
    [],
    [
      'Fecha',
      'Abierta Por',
      'Hora Apertura',
      'Cerrada Por',
      'Hora Cierre',
      'Fondo del Día Anterior',
      'Traslado de General',
      'Depósito a Caja Chica',
      'Fondo Inicial',
      'Fondeos Extras',
      'Compras Totales',
      'Saldo Teórico',
      'Saldo Físico Contado',
      'Diferencia',
      'Diagnóstico',
      'Observaciones',
    ],
    ...shifts.map((s) => [
      s.date,
      s.openedBy,
      new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      s.closedBy || 'N/A',
      s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      s.previousDayRemaining,
      s.generalCashTransfer,
      s.bossContribution,
      s.initialBalance,
      s.totalInflows || 0,
      s.totalExpenses || 0,
      s.expectedBalance || 0,
      s.actualCashCounted || 0,
      s.difference || 0,
      s.auditStatus === 'SQUARED' ? 'CUADRADO' : s.auditStatus === 'SHORTAGE' ? 'FALTANTE' : 'SOBRANTE',
      s.closingNotes || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(historyRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Historial Cierres');

  XLSX.writeFile(wb, 'Bodegon_Historial_Cierres_CajaChica.xlsx');
}

// ============================================================================
// EXCEL: INVENTARIO DE MENAJE Y ROTURAS
// ============================================================================
export function exportTablewareToExcel(items: TablewareItem[], losses: TablewareLoss[]): void {
  const wb = XLSX.utils.book_new();

  const tablewareRows = [
    ['INVENTARIO DE CRISTALERÍA, LOZA Y UTENSILIOS — EL BODEGÓN'],
    ['Código', 'Artículo', 'Área', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Costo Unit. C$', 'Última Auditoría'],
    ...items.map((item) => [
      item.id,
      item.name,
      item.area,
      item.unit,
      item.currentStock,
      item.minimumStock,
      item.unitCostNIO,
      item.lastAuditDate,
    ]),
  ];
  const wsTableware = XLSX.utils.aoa_to_sheet(tablewareRows);
  XLSX.utils.book_append_sheet(wb, wsTableware, 'Menaje');

  const lossRows = [
    ['REGISTRO DE ROTURAS Y BAJAS — EL BODEGÓN'],
    ['Fecha/Hora', 'Artículo', 'Cantidad', 'Motivo', 'Costo Total C$', 'Registrado Por', 'Notas'],
    ...losses.map((l) => [
      new Date(l.date).toLocaleString(),
      l.itemName,
      l.quantity,
      l.reason,
      l.totalCostNIO,
      l.registeredBy,
      l.notes || '',
    ]),
  ];
  const wsLoss = XLSX.utils.aoa_to_sheet(lossRows);
  XLSX.utils.book_append_sheet(wb, wsLoss, 'Roturas y Bajas');

  XLSX.writeFile(wb, `Bodegon_Control_Menaje_${getLocalTodayStr()}.xlsx`);
}
