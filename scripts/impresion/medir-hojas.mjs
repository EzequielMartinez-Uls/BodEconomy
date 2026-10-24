// Mide cuántas hojas tamaño carta usa cada documento impreso, con un día realista de 25 compras.
// Falla si algún documento pasa de su límite de hojas. Uso: npm run medir-hojas
import { build } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = fs.mkdtempSync(path.join(os.tmpdir(), 'hojas-'));
const COMPRAS = Number(process.env.COMPRAS || 25);

// Máximo de hojas aceptado para cada documento con COMPRAS compras en el día.
const LIMITES = {
  'Acta de cierre completa': 2,
  'Apertura: fondo': 1,
  'Apertura: ganancias de ayer': 1,
  'Apertura: ambas hojas': 2,
  'Reporte de gastos del día': 2,
  'Recibo de una compra': 1,
  'Cierre de caja chica': 2,
  'Ticket de apertura': 1,
  'Ticket de cierre': 1,
  'Reporte de menaje': 2,
  'Planilla general': 1,
  'Recibo de planilla': 1,
};

await build({
  configFile: false,
  logLevel: 'error',
  build: {
    outDir: salida,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    lib: { entry: path.join(aqui, 'entrada.ts'), formats: ['iife'], name: 'Impresion', fileName: () => 'impresion.js' },
  },
});

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent('<html><body></body></html>');
await pagina.addScriptTag({ path: path.join(salida, 'impresion.js') });

const documentos = await pagina.evaluate((N) => {
  const capturados = [];
  let nombre = '';
  window.open = () => {
    let html = '';
    return {
      document: { open() {}, write: (h) => { html += h; }, close: () => capturados.push({ nombre, html }) },
      focus() {}, print() {}, close() {},
    };
  };
  window.alert = (m) => capturados.push({ nombre, html: '', alerta: m });
  const como = (n, fn) => { nombre = n; fn(); };

  const categorias = ['CARNES', 'HIELO', 'BEBIDAS', 'SUPERMERCADO', 'PAGOS_PERSONAL'];
  const filas = [];
  for (let i = 0; i < N; i++) {
    filas.push({
      hora: `${String(10 + (i % 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
      categoria: categorias[i % 5],
      concepto: `Comercial Paniagua - huevos, aceite y azúcar (${i + 1})`,
      proveedor: 'Paniagua',
      metodo: i % 4 === 0 ? 'Transferencia' : 'Efectivo',
      monto: 350 + i * 17,
      tipo: 'GASTO',
    });
  }
  const turno = {
    id: 's1', date: '2026-10-23', status: 'CLOSED', exchangeRate: 36, openedBy: 'Eddy', openedAt: '2026-10-23T10:00:00-06:00',
    verifiedPreviousClosingId: null, openingNotes: '', openingNIO: {}, openingUSD: {}, totalOpeningNIO: 2000, totalOpeningUSD: 0, totalOpeningEquivNIO: 2000,
    closingNIO: { 1000: 3, 500: 4, 200: 3, 100: 2, 50: 0, 20: 12, 10: 110, 5: 0, 1: 124, 0.5: 2 }, closingUSD: { 20: 2 },
    totalClosingNIO: 7265, totalClosingUSD: 40, totalClosingEquivNIO: 7505, actualCashNIO: 8705, expectedCashNIO: 7505, differenceNIO: 0,
    auditStatus: 'SQUARED', netCashAfterTipsNIO: 7505, salesCashSystem: 10555, cardsBAC: 1000, cardsFicohsa: 0, cardsBanpro: 8657.5, cardsLafise: 0,
    totalCards: 9657.5, salesPedidosYa: 3335, salesBankTransfers: 2000, totalGrossSales: 25547.5, totalTipCollected: 1260, staffCount: 10,
    individualTip: 116, tipPaid: true, tipYahairaWorked: true, tipYahairaAmount: 100, tipDistributedTotal: 1260, transferToPettyCash: 4800,
    closedBy: 'Ezequiel', closedAt: '2026-10-23T23:00:00-06:00', dailyNetProfit: 12000,
  };
  const resumen = {
    cardsBAC: 1000, cardsFicohsa: 0, cardsBanpro: 8657.5, cardsLafise: 0, totalCards: 9657.5, salesPedidosYa: 3335, salesBankTransfers: 2000,
    salesCashLoyverse: 10555, loyversePaidOut: 1000, efectivoRealGenerado: 11555, otherIncome: 0, totalGenerado: 25547.5, gastosEfectivo: 8000,
    gastosTransferencia: 2000, propinasEntregadas: 1260, totalGastos: 11260, gananciaNeta: 14287.5, margenPorcentaje: 56,
  };
  const apertura = {
    ...turno, status: 'OPEN', date: '2026-10-24', openingNIO: { 1000: 1, 500: 1, 200: 2, 100: 1 }, openingCashCountedNIO: 11481,
    openingTransferToPettyCash: 9700, openingNotes: '[Auditoría Apertura: BAC (+12.00)] • [Dólares apartados en sobre para Snyder: $40.00 USD]',
    loyverseValidation: { validated: true, salesCashLoyverse: 10555, cardsBAC: 1000, cardsFicohsa: 0, cardsBanpro: 8657.5, cardsLafise: 0, totalCards: 9657.5, salesPedidosYa: 3335, totalLoyverseSales: 23547.5, notes: 'ok' },
  };
  const compras = filas.map((f, i) => ({
    id: 'p' + i, shiftId: 'pc', date: `2026-10-23T${f.hora}:00-06:00`, type: 'EXPENSE', amount: f.monto, method: i % 4 === 0 ? 'TRANSFER' : 'CASH',
    vendor: 'Comercial Paniagua', category: f.categoria, registeredBy: 'Eddy', notes: f.concepto,
  }));
  const cajaChica = {
    id: 'pc', date: '2026-10-23', status: 'CLOSED', openedBy: 'Eddy', openedAt: '2026-10-23T10:00:00-06:00', previousDayRemaining: 42,
    generalCashTransfer: 9700, bossContribution: 0, initialBalance: 9742, totalExpenses: 10000, totalInflows: 0, expectedBalance: 1742,
    actualCashCounted: 1742, difference: 0, auditStatus: 'SQUARED',
  };
  const vajilla = [];
  for (let i = 0; i < 30; i++) vajilla.push({ id: 't' + i, name: 'Vaso ' + i, area: 'BARRA', unit: 'u', currentStock: 20, minimumStock: 5, unitCostNIO: 80, lastAuditDate: '2026-10-01' });
  const roturas = [];
  for (let i = 0; i < 10; i++) roturas.push({ id: 'l' + i, itemId: 't1', itemName: 'Vaso 1', date: '2026-10-02T10:00:00-06:00', quantity: 1, reason: 'ROTURA_SALON', registeredBy: 'Eddy', totalCostNIO: 80 });
  const empleados = [];
  for (let i = 0; i < 11; i++) empleados.push({ employeeId: 'e' + i, name: 'Empleado Número ' + i + ' Apellido Largo', role: 'Cocina', baseSalary: 5675, overtimeHours: 4, overtimeAmount: 300, holidaysCount: 1, holidaysAmount: 380, inssDeduction: -397, loanDeduction: 0, restaurantServiceDeduction: 0, breakageDeduction: 0, totalPaid: 5958 });

  const TP = window.TP, PP = window.PP;
  como('Acta de cierre completa', () => TP.printOfficialActBN({
    shift: turno, date: '2026-10-23', modo: 'TODO', salesCash: 10555, cardsBAC: 1000, cardsFicohsa: 0, cardsBanpro: 8657.5, cardsLafise: 0,
    totalCards: 9657.5, salesPedidosYa: 3335, salesBankTransfers: 2000, totalGross: 25547.5, netProfit: 12000, marginPercent: 40,
    responsableCaja: 'Ezequiel', observacionesGeneral: '', fondoInicial: 9742, expensesCash: 8000, expensesTransf: 2000, expensesTotal: 10000,
    saldoRemanente: 1742, transactions: filas,
  }));
  como('Apertura: fondo', () => TP.printOfficialOpeningActBN(apertura, 'Eddy', resumen, 'SOLO_FONDO'));
  como('Apertura: ganancias de ayer', () => TP.printOfficialOpeningActBN(apertura, 'Eddy', resumen, 'SOLO_GANANCIAS'));
  como('Apertura: ambas hojas', () => TP.printOfficialOpeningActBN(apertura, 'Eddy', resumen, 'AMBAS'));
  como('Reporte de gastos del día', () => TP.printThermalDailyExpensesTicket('2026-10-23', compras, 1742, 'Eddy'));
  como('Recibo de una compra', () => TP.printThermalSingleExpenseVoucher(compras[1]));
  como('Cierre de caja chica', () => TP.printThermalPettyCashClosingAct(cajaChica, compras, 'Eddy'));
  como('Ticket de apertura', () => TP.printThermalOpeningTicket({ ...turno, status: 'OPEN' }));
  como('Ticket de cierre', () => TP.printThermalClosingTicket(turno));
  como('Reporte de menaje', () => TP.printThermalTablewareReport(vajilla, roturas, 'Eddy'));
  como('Planilla general', () => PP.printBiweeklyPayrollGeneral('Q1', 10, 2026, empleados, 'Eddy'));
  como('Recibo de planilla', () => TP.printThermalIndividualPayrollReceipt(empleados[0], '1ra quincena', 'Octubre', 2026, 'Eddy'));
  return capturados;
}, COMPRAS);

let fallas = 0;
for (const doc of documentos) {
  if (doc.alerta) {
    console.log(`✗ ${doc.nombre}: mostró un error: ${doc.alerta}`);
    fallas++;
    continue;
  }
  const hoja = await navegador.newPage();
  // Se desactiva la impresión automática para medir el documento sin abrir el diálogo.
  await hoja.setContent(doc.html.replace(/window\.print\(\)/g, '0'), { waitUntil: 'load' });
  await hoja.emulateMedia({ media: 'print' });
  if (process.env.GUARDAR_PDF) fs.writeFileSync(path.join(process.env.GUARDAR_PDF, `${doc.nombre}.html`), doc.html);
  const pdf = await hoja.pdf({ preferCSSPageSize: true, printBackground: true });
  const hojas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (process.env.GUARDAR_PDF) fs.writeFileSync(path.join(process.env.GUARDAR_PDF, `${doc.nombre}.pdf`), pdf);
  const limite = LIMITES[doc.nombre];
  const bien = limite === undefined || hojas <= limite;
  if (!bien) fallas++;
  console.log(`${bien ? '✓' : '✗'} ${doc.nombre}: ${hojas} hoja(s)${limite ? ` (máximo ${limite})` : ''}`);
  await hoja.close();
}
await navegador.close();
fs.rmSync(salida, { recursive: true, force: true });
if (fallas) {
  console.log(`\n${fallas} documento(s) usan más hojas de las debidas.`);
  process.exit(1);
}
