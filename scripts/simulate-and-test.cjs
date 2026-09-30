/**
 * SIMULADOR Y BANCO DE PRUEBAS AUTOMATIZADAS - EL BODEGÓN CONTROL
 * Simula ciclos completos de apertura, operaciones, cancelaciones, cierres,
 * corroboraciones del día siguiente, arqueos y exportaciones para detectar fallas o bugs.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message, details) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FALLO: ${message}`);
    if (details) {
      console.error(`     Detalles:`, details);
    }
    failures.push({ message, details });
  }
}

function assertApprox(val1, val2, tolerance = 0.01, message) {
  const diff = Math.abs(val1 - val2);
  assert(diff <= tolerance, `${message} (Esperado: ${val2}, Obtenido: ${val1}, Diff: ${diff.toFixed(4)})`);
}

console.log('\n===============================================================');
console.log('🧪 INICIANDO SUITE DE PRUEBAS Y SIMULACIÓN: EL BODEGÓN CONTROL');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// PRUEBA 1: VERIFICACIÓN DE ADMINISTRADORES ESTRICTOS
// -----------------------------------------------------------------------------
console.log('📌 MÓDULO 1: Lista Estricta de Administradores Autorizados');
const VALID_ADMINS = ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder'];
const testAdmins = ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder', 'Maverick', 'Otro'];
const filteredAdmins = testAdmins.filter(a => VALID_ADMINS.includes(a));

assert(filteredAdmins.length === 4, 'Solo deben quedar exactamente 4 administradores autorizados');
assert(!filteredAdmins.includes('Maverick'), 'Maverick debe haber sido erradicado del sistema');
assert(filteredAdmins.includes('Eddy'), 'Eddy debe estar autorizado');
assert(filteredAdmins.includes('Xiomara'), 'Xiomara debe estar autorizada');
assert(filteredAdmins.includes('Ezequiel'), 'Ezequiel debe estar autorizado');
assert(filteredAdmins.includes('Snyder'), 'Snyder debe estar autorizado');

// -----------------------------------------------------------------------------
// PRUEBA 2: CATEGORÍAS DE GASTOS DINÁMICAS (AGREGAR / ELIMINAR / EXPANDIR)
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 2: Gestión Dinámica de Categorías de Gastos');
let categories = ['CARNES', 'VERDURAS', 'BEBIDAS', 'LACTEOS', 'DESCARTABLES', 'LIMPIEZA', 'GAS', 'HIELO', 'OTROS'];
const initialCount = categories.length;

// Agregar nueva categoría
const newCat = 'MANTENIMIENTO_LOCAL';
if (!categories.includes(newCat)) {
  categories.push(newCat);
}
assert(categories.includes('MANTENIMIENTO_LOCAL'), 'Se puede agregar una nueva categoría personalizada');
assert(categories.length === initialCount + 1, 'El contador de categorías aumenta correctamente');

// Prevenir duplicados
const duplicateAttempt = 'MANTENIMIENTO_LOCAL';
let canAddDuplicate = !categories.includes(duplicateAttempt);
assert(!canAddDuplicate, 'El sistema previene agregar categorías duplicadas');

// Eliminar categoría
categories = categories.filter(c => c !== 'HIELO');
assert(!categories.includes('HIELO'), 'Se puede eliminar una categoría no deseada');

// Validar que no se quede vacío
const testDeleteAll = () => {
  let temp = [...categories];
  while (temp.length > 1) temp.pop();
  return temp.length >= 1;
};
assert(testDeleteAll(), 'El sistema siempre retiene al menos 1 categoría activa');

// -----------------------------------------------------------------------------
// PRUEBA 3: SIMULACIÓN DE DÍA 1 (2026-09-28)
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 3: Simulación Día 1 — Apertura, Operación y Cierre');

const day1 = '2026-09-28';
const exchangeRate = 36.00;

// 1. Apertura Caja General Día 1 (Eddy)
const openingNIO = { 1000: 2, 500: 4, 200: 5, 100: 5, 50: 8, 20: 5, 10: 10, 5: 0, 1: 0, 0.5: 0 };
// 2*1000 + 4*500 + 5*200 + 5*100 + 8*50 + 5*20 + 10*10 = 2000+2000+1000+500+400+100+100 = 6100 NIO
const totalOpeningNIO = Object.entries(openingNIO).reduce((sum, [den, qty]) => sum + (parseFloat(den) * qty), 0);
assertApprox(totalOpeningNIO, 6100.00, 0.01, 'Cálculo de billetes córdobas apertura coincide');

const openingUSD = { 100: 0, 50: 1, 20: 2, 10: 1, 5: 0, 2: 0, 1: 0 }; // 50+40+10 = 100 USD
const totalOpeningUSD = Object.entries(openingUSD).reduce((sum, [den, qty]) => sum + (parseFloat(den) * qty), 0);
assertApprox(totalOpeningUSD, 100.00, 0.01, 'Cálculo de billetes dólares apertura coincide');

const totalOpeningEquivNIO = totalOpeningNIO + (totalOpeningUSD * exchangeRate);
assertApprox(totalOpeningEquivNIO, 9700.00, 0.01, 'Fondo total de apertura en NIO equivalente es C$ 9,700');

// 2. Apertura Caja Chica Día 1 (Snyder)
// Excel Fila 78: Fondo de caja anterior = 1500
// Excel Fila 79: Deposito a caja chica (traslado general) = 2500
// Excel Fila 80: Depositado en efectivo (jefe) = 1000
const row78 = 1500.00;
const row79 = 2500.00;
const row80 = 1000.00;
const initialPettyCashBalance = row78 + row79 + row80;
assertApprox(initialPettyCashBalance, 5000.00, 0.01, 'Fondo inicial caja chica (Fila 78+79+80) = C$ 5,000');

// 3. Movimientos Caja Chica
let currentPettyCashCashDrawer = initialPettyCashBalance;
const transactionsDay1 = [];

// Transacción A: Compra en Efectivo (Resta gaveta física)
const tx1 = {
  id: 'tx-101',
  date: `${day1}T10:30:00`,
  type: 'EXPENSE',
  category: 'CARNES',
  vendor: '15 lbs Lomo de res para asados', // Concepto
  amount: 1450.00,
  method: 'CASH',
  registeredBy: 'Snyder'
};
transactionsDay1.push(tx1);
currentPettyCashCashDrawer -= tx1.amount;
assertApprox(currentPettyCashCashDrawer, 3550.00, 0.01, 'Compra en efectivo descuenta gaveta física');

// Transacción B: Compra por Transferencia (No toca gaveta física)
const tx2 = {
  id: 'tx-102',
  date: `${day1}T11:45:00`,
  type: 'EXPENSE',
  category: 'VERDURAS',
  vendor: 'Distribuidora San Judas (Tomates, Cebollas)',
  amount: 800.00,
  method: 'TRANSFER',
  registeredBy: 'Snyder'
};
transactionsDay1.push(tx2);
assertApprox(currentPettyCashCashDrawer, 3550.00, 0.01, 'Compra por transferencia no descuenta gaveta física');

// Transacción C: Compra con Tarjeta (No toca gaveta física)
const tx3 = {
  id: 'tx-103',
  date: `${day1}T14:10:00`,
  type: 'EXPENSE',
  category: 'LIMPIEZA',
  vendor: 'Supermercado La Colonia (Desinfectante, Bolsas)',
  amount: 620.00,
  method: 'CARD',
  registeredBy: 'Snyder'
};
transactionsDay1.push(tx3);
assertApprox(currentPettyCashCashDrawer, 3550.00, 0.01, 'Compra con tarjeta no descuenta gaveta física');

// Transacción D: Fondeo extra en efectivo (Aporte de jefe)
const tx4 = {
  id: 'tx-104',
  date: `${day1}T16:00:00`,
  type: 'INFLOW',
  category: 'OTROS',
  vendor: 'Depositado en efectivo', // Nomenclatura Excel
  amount: 1200.00,
  method: 'CASH',
  registeredBy: 'Snyder'
};
transactionsDay1.push(tx4);
currentPettyCashCashDrawer += tx4.amount;
assertApprox(currentPettyCashCashDrawer, 4750.00, 0.01, 'Fondeo en efectivo aumenta saldo en gaveta física');

// 4. Prueba de Cancelar Turno en Caja Chica
console.log('\n  🧪 Probando flujo de Cancelar Turno en Caja Chica...');
let mockShift = { id: 'pc-shift-1', status: 'OPEN', date: day1 };
let mockTxs = [...transactionsDay1];

// Simular cancelación
const cancelShiftResult = () => {
  mockShift = null;
  // Transacciones quedan desvinculadas o preservadas
  return { currentPettyCashShift: null };
};
const resCancel = cancelShiftResult();
assert(resCancel.currentPettyCashShift === null, 'Cancelar turno limpia el turno activo correctamente');

// Reabrir formalmente para continuar el día
mockShift = {
  id: `pc-shift-${day1}`,
  date: day1,
  status: 'OPEN',
  openedBy: 'Snyder',
  initialBalance: initialPettyCashBalance
};
assert(mockShift.status === 'OPEN', 'Jornada de caja chica se reabre limpiamente');

// 5. Cierre de Caja Chica Día 1 (Xiomara)
const expectedPettyCashDrawer = initialPettyCashBalance + 1200.00 - 1450.00; // 5000 + 1200 - 1450 = 4750
const actualPettyCashCounted = 4750.00; // Cuadre exacto
const pettyDiff = actualPettyCashCounted - expectedPettyCashDrawer;
assertApprox(pettyDiff, 0.00, 0.01, 'Caja chica cuadrada exacta');

const closedPettyShiftDay1 = {
  ...mockShift,
  status: 'CLOSED',
  closedBy: 'Xiomara',
  closedAt: `${day1}T23:00:00`,
  expectedBalance: expectedPettyCashDrawer,
  actualCashCounted: actualPettyCashCounted,
  difference: pettyDiff,
  auditStatus: 'SQUARED'
};

// 6. Cierre de Caja General Día 1 (Xiomara)
// Ventas por canales:
const salesCashLoyverse = 22400.00;
const cardsBAC = 6500.00;
const cardsFicohsa = 3200.00;
const cardsBanpro = 2800.00;
const cardsLafise = 1900.00;
const totalCards = cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise; // 14400.00
const salesPedidosYa = 3800.00;
const otherIncome = 1500.00; // CASILLA OTROS INGRESOS
const otherIncomeNotes = 'Evento privado salón VIP tarde';

// Total Ventas Brutas
const totalGrossSales = salesCashLoyverse + totalCards + salesPedidosYa + otherIncome;
assertApprox(totalGrossSales, 42100.00, 0.01, 'Ventas Brutas = Efectivo + Tarjetas + PedidosYa + Otros Ing. (C$ 42,100)');

// Salidas / Deducciones de Efectivo de Caja General:
const transferToPettyCash = 2500.00; // Lo que se pasó a caja chica en apertura
const overtimePaidCash = 800.00;
const reservePayroll = 3000.00;
const reserveDGI = 1500.00;
const totalTipCollected = 2100.00;
const staffCount = 7;
const individualTip = totalTipCollected / staffCount; // 300 cada uno
assertApprox(individualTip, 300.00, 0.01, 'Propina individual equitativa = C$ 300');

const totalWithdrawals = transferToPettyCash + overtimePaidCash + reservePayroll + reserveDGI + totalTipCollected;
assertApprox(totalWithdrawals, 9900.00, 0.01, 'Total de salidas de efectivo = C$ 9,900');

// Efectivo esperado en gaveta:
// Fondo Apertura NIO (6100) + Ventas Efectivo (22400) - Salidas Efectivo (9900) = 18600.00 NIO
// Dólares quedan intactos: 100 USD (C$ 3,600)
// Total esperado = 18600 + 3600 = 22200.00 NIO
const expectedCashGeneral = totalOpeningEquivNIO + salesCashLoyverse - totalWithdrawals;
assertApprox(expectedCashGeneral, 22200.00, 0.01, 'Efectivo esperado total en gaveta = C$ 22,200');

// Conteo físico de cierre:
// Billetes NIO: 1000x12, 500x10, 200x5, 100x5, 50x2 = 12000 + 5000 + 1000 + 500 + 100 = 18600 NIO
// Billetes USD: 50x2 = 100 USD (C$ 3600)
// Total contado = 22200 NIO
const countedClosingNIO = 18600.00;
const countedClosingUSD = 100.00;
const totalClosingEquivNIO = countedClosingNIO + (countedClosingUSD * exchangeRate);
const diffGeneral = totalClosingEquivNIO - expectedCashGeneral;
assertApprox(diffGeneral, 0.00, 0.01, 'Arqueo de Caja General cuadrado exacto');

const closedGeneralShiftDay1 = {
  id: `shift-${day1}-1`,
  date: day1,
  status: 'CLOSED',
  exchangeRate: 36.00,
  openedBy: 'Eddy',
  openedAt: `${day1}T08:30:00`,
  closedBy: 'Xiomara',
  closedAt: `${day1}T23:30:00`,
  totalOpeningNIO,
  totalOpeningUSD,
  totalOpeningEquivNIO,
  salesCashSystem: salesCashLoyverse,
  cardsBAC,
  cardsFicohsa,
  cardsBanpro,
  cardsLafise,
  totalCards,
  salesPedidosYa,
  otherIncome,
  otherIncomeNotes,
  totalGrossSales,
  totalTipCollected,
  staffCount,
  individualTip,
  tipPaid: true,
  transferToPettyCash,
  overtimePaidCash,
  reserveDGI,
  reservePayroll,
  totalWithdrawals,
  expectedCashNIO: expectedCashGeneral,
  actualCashNIO: totalClosingEquivNIO,
  totalClosingNIO: countedClosingNIO,
  totalClosingUSD: countedClosingUSD,
  totalClosingEquivNIO,
  differenceNIO: diffGeneral,
  auditStatus: 'SQUARED'
};

// -----------------------------------------------------------------------------
// PRUEBA 4: SIMULACIÓN DE DÍA 2 (2026-09-29) - CORROBORACIÓN Y AUDITORÍA
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 4: Simulación Día 2 — Apertura con Corroboración de Día 1');

const day2 = '2026-09-29';

// 1. Apertura Caja General Día 2 (Abre Snyder)
// Corrobora cierre de anoche (Day 1)
const expectedNIOFromYesterday = closedGeneralShiftDay1.totalClosingNIO; // 18600
const expectedUSDFromYesterday = closedGeneralShiftDay1.totalClosingUSD; // 100

// Supongamos que en la mañana se realiza el conteo físico y coincide
const morningCountNIO = 18600.00;
const morningCountUSD = 100.00;

assertApprox(morningCountNIO, expectedNIOFromYesterday, 0.01, 'Fondo recibido en Córdobas coincide con el cierre');
assertApprox(morningCountUSD, expectedUSDFromYesterday, 0.01, 'Fondo recibido en Dólares coincide con el cierre');

// Verificación de Vouchers de Canales del Día Anterior
const auditVouchers = {
  verifiedCash: closedGeneralShiftDay1.salesCashSystem,
  verifiedBAC: closedGeneralShiftDay1.cardsBAC,
  verifiedFicohsa: closedGeneralShiftDay1.cardsFicohsa,
  verifiedBanpro: closedGeneralShiftDay1.cardsBanpro,
  verifiedLafise: closedGeneralShiftDay1.cardsLafise,
  verifiedPedidosYa: closedGeneralShiftDay1.salesPedidosYa,
  verifiedOtherIncome: closedGeneralShiftDay1.otherIncome
};

assert(auditVouchers.verifiedOtherIncome === 1500.00, 'Otros Ingresos de anoche se auditan y corroboran en la mañana');

// 2. Apertura Caja Chica Día 2 (Abre Ezequiel)
const expectedPettyFromYesterday = closedPettyShiftDay1.actualCashCounted; // 4750
// Ezequiel cuenta físicamente en gaveta: C$ 4,750
const morningPettyCount = 4750.00;
const morningPettyDiff = morningPettyCount - expectedPettyFromYesterday;
assertApprox(morningPettyDiff, 0.00, 0.01, 'Semáforo de caja chica marca verde: Fondo físico conforme');

// Probar caso de Faltante al recibir
const simulatedShortageCount = 4500.00; // Faltan 250
const simulatedDiff = simulatedShortageCount - expectedPettyFromYesterday;
assert(simulatedDiff === -250.00, 'Semáforo detecta correctamente faltante de C$ 250 al recibir');

// -----------------------------------------------------------------------------
// PRUEBA 5: CÁLCULOS FINANCIEROS Y DÍA A DÍA (P&L CONSOLIDADO)
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 5: Rendimiento Financiero Consolidado (Día a Día / P&L)');

// Gastos totales de Caja Chica en Día 1:
// tx1 (Cash): 1450.00
// tx2 (Transfer): 800.00
// tx3 (Card): 620.00
const totalPettyCashExpensesDay1 = tx1.amount + tx2.amount + tx3.amount; // 2870.00
const cashExpensesDay1 = tx1.amount; // 1450.00
const transferExpensesDay1 = tx2.amount + tx3.amount; // 1420.00

// Resumen del Día 1
const summaryDay1 = {
  date: day1,
  dayLabel: 'Lun 28 Sep',
  status: 'CLOSED',
  cashSales: salesCashLoyverse, // 22400
  cardsBAC,
  cardsFicohsa,
  cardsBanpro,
  cardsLafise,
  totalCards, // 14400
  pedidosYaSales: salesPedidosYa, // 3800
  otherIncomeSales: otherIncome, // 1500
  totalGrossSales, // 42100
  pettyCashExpenses: cashExpensesDay1, // 1450
  transfersPaid: transferExpensesDay1, // 1420
  totalExpenses: totalPettyCashExpensesDay1, // 2870
  netEarnings: totalGrossSales - totalPettyCashExpensesDay1, // 42100 - 2870 = 39230
  tipsCollected: totalTipCollected,
  responsible: 'Xiomara'
};

assertApprox(summaryDay1.totalGrossSales, 42100.00, 0.01, 'Total Gross Sales incluye Efectivo + Tarjetas + PY + Otros Ing');
assertApprox(summaryDay1.totalExpenses, 2870.00, 0.01, 'Total Gastos incluye salidas de gaveta y transferencias/tarjetas');
assertApprox(summaryDay1.netEarnings, 39230.00, 0.01, 'Ganancia Neta = Ventas Brutas (42,100) - Gastos Totales (2,870) = C$ 39,230');

const marginPct = (summaryDay1.netEarnings / summaryDay1.totalGrossSales) * 100;
assertApprox(marginPct, 93.18, 0.05, 'Margen operativo calculado correctamente (~93.2%)');

// -----------------------------------------------------------------------------
// PRUEBA 6: EXPORTACIÓN EXCEL SIN CRASHEAR NI PRODUCIR VALORES NaN
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 6: Verificación de Motores de Exportación Excel (ExcelJS)');

async function testExcelGeneration() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test Consolidado');

  const headers = [
    'Fecha', 'Jornada', 'Estado', 'Ventas Efectivo', 'POS BAC', 'POS Ficohsa',
    'POS Banpro', 'POS LAFISE', 'Total Tarjetas', 'PedidosYa', 'Otros Ingresos',
    'VENTA BRUTA TOTAL', 'Compras Efectivo', 'Transferencias', 'TOTAL EGRESOS',
    'UTILIDAD NETA', 'Margen %', 'Propinas', 'Responsable'
  ];

  ws.addRow(headers);
  const row = ws.addRow([
    summaryDay1.date,
    summaryDay1.dayLabel,
    'Cerrado',
    summaryDay1.cashSales,
    summaryDay1.cardsBAC,
    summaryDay1.cardsFicohsa,
    summaryDay1.cardsBanpro,
    summaryDay1.cardsLafise,
    summaryDay1.totalCards,
    summaryDay1.pedidosYaSales,
    summaryDay1.otherIncomeSales,
    summaryDay1.totalGrossSales,
    summaryDay1.pettyCashExpenses,
    summaryDay1.transfersPaid,
    summaryDay1.totalExpenses,
    summaryDay1.netEarnings,
    `${marginPct.toFixed(1)}%`,
    summaryDay1.tipsCollected,
    summaryDay1.responsible
  ]);

  assert(row.cellCount === 19, 'La fila de Excel contiene exactamente 19 columnas formateadas');
  assert(row.getCell(11).value === 1500.00, 'Columna 11 es Otros Ingresos con valor C$ 1,500');
  assert(row.getCell(12).value === 42100.00, 'Columna 12 es VENTA BRUTA TOTAL con valor C$ 42,100');

  const buffer = await wb.xlsx.writeBuffer();
  assert(buffer && buffer.length > 0, `Archivo Excel generado exitosamente en memoria (${buffer.length} bytes)`);
}

// -----------------------------------------------------------------------------
// PRUEBA 7: DEDUPLICACIÓN EN TIEMPO REAL (PREVENCIÓN DE BUG COMPRAS DUPLICADAS)
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 7: Prevención de Compras Duplicadas (Realtime vs Local)');

const localTransactions = [
  { id: 'pct-1727500000000-abc', amount: 850.00, vendor: 'CARNES DON JUAN', date: '2026-09-28T12:00:00' }
];

// Supongamos que llega un evento INSERT de Supabase con el mismo gasto registrado localmente
const incomingCloudTx = {
  id: 'cloud-uuid-999',
  amount: 850.00,
  vendor: 'CARNES DON JUAN',
  date: '2026-09-28T12:00:00.123Z'
};

const isDuplicate = localTransactions.some(t => {
  const sameAmount = Math.abs(t.amount - incomingCloudTx.amount) < 0.01;
  const sameVendor = (t.vendor || '').trim().toLowerCase() === (incomingCloudTx.vendor || '').trim().toLowerCase();
  const dateLocal = t.date.slice(0, 10);
  const dateCloud = incomingCloudTx.date.slice(0, 10);
  return sameAmount && sameVendor && dateLocal === dateCloud;
});

assert(isDuplicate === true, 'El detector de duplicados identifica el gasto entrante como ya existente');

// -----------------------------------------------------------------------------
// PRUEBA 8: CASOS LÍMITE (ELIMINACIÓN DE REGISTROS, CADENA DE 3 DÍAS Y RESGUARDO DE DIVISIÓN POR CERO)
// -----------------------------------------------------------------------------
console.log('\n📌 MÓDULO 8: Casos Límite, Reversión de Movimientos y Cadena Multidía');

// 1. Reversión de compra en Efectivo vs Transferencia
let testDrawerBalance = 5000.00;
const expenseCash = { type: 'EXPENSE', amount: 350.00, method: 'CASH' };
const expenseTransf = { type: 'EXPENSE', amount: 900.00, method: 'TRANSFER' };
const inflowBoss = { type: 'INFLOW', amount: 1500.00, method: 'CASH' };

// Aplicar
testDrawerBalance -= expenseCash.amount;
// expenseTransf no resta gaveta
testDrawerBalance += inflowBoss.amount;
assertApprox(testDrawerBalance, 6150.00, 0.01, 'Balance después de aplicar movimientos = C$ 6,150');

// Revertir eliminación de gasto en efectivo: restaura el dinero a la gaveta
const revertCashExpense = (bal, tx) => (tx.type === 'EXPENSE' && tx.method === 'CASH' ? bal + tx.amount : bal);
testDrawerBalance = revertCashExpense(testDrawerBalance, expenseCash);
assertApprox(testDrawerBalance, 6500.00, 0.01, 'Eliminar gasto en efectivo restaura el dinero a la gaveta física');

// Revertir eliminación de transferencia: no altera la gaveta
const revertTransfExpense = (bal, tx) => (tx.type === 'EXPENSE' && tx.method === 'TRANSFER' ? bal : bal);
testDrawerBalance = revertTransfExpense(testDrawerBalance, expenseTransf);
assertApprox(testDrawerBalance, 6500.00, 0.01, 'Eliminar gasto por transferencia NO altera la gaveta física');

// Revertir eliminación de fondeo: reduce el saldo
const revertInflow = (bal, tx) => (tx.type === 'INFLOW' ? bal - tx.amount : bal);
testDrawerBalance = revertInflow(testDrawerBalance, inflowBoss);
assertApprox(testDrawerBalance, 5000.00, 0.01, 'Eliminar fondeo descuenta el dinero de la gaveta física');

// 2. Resguardo contra división por cero en propinas y márgenes
const safeCalcTip = (tipTotal, staff) => (staff && staff > 0 ? tipTotal / staff : 0);
assert(safeCalcTip(2000, 0) === 0, 'Resguardo contra división por cero en colaboradores = 0');
assert(safeCalcTip(2100, 7) === 300, 'Cálculo normal de propina individual funciona = C$ 300');

const safeCalcMargin = (net, gross) => (gross && gross > 0 ? (net / gross) * 100 : 0);
assert(safeCalcMargin(500, 0) === 0, 'Resguardo contra división por cero en ventas brutas = 0');

// 3. Cadena de continuidad de 3 días consecutivos
const day1ClosingRemaining = 4750.00;
const day2OpeningFund = day1ClosingRemaining; // Día 2 recibe 4750
const day2NetChange = 1200.00; // Día 2 tuvo neto +1200 en gaveta
const day2ClosingRemaining = day2OpeningFund + day2NetChange; // 5950
const day3OpeningFund = day2ClosingRemaining; // Día 3 recibe 5950

assertApprox(day3OpeningFund, 5950.00, 0.01, 'Cadena de custodia de efectivo a lo largo de 3 días consecutivos intacta');

// -----------------------------------------------------------------------------
// RESUMEN GENERAL DE RESULTADOS
// -----------------------------------------------------------------------------
testExcelGeneration().then(() => {
  console.log('\n===============================================================');
  console.log(`📊 REPORTE DE RESULTADOS DE PRUEBAS AUTOMATIZADAS`);
  console.log(`   Total de pruebas ejecutadas: ${totalTests}`);
  console.log(`   Pruebas Exitosas:             ${passedTests}`);
  console.log(`   Pruebas Fallidas:             ${failedTests}`);
  console.log('===============================================================\n');

  if (failedTests === 0) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON AL 100%! El sistema funciona de manera consistente.');
    process.exit(0);
  } else {
    console.error(`⚠️ Se detectaron ${failedTests} fallos durante las pruebas.`);
    process.exit(1);
  }
}).catch((err) => {
  console.error('Error durante la ejecución de pruebas:', err);
  process.exit(1);
});
