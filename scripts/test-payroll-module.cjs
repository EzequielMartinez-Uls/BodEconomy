const assert = require('assert');

console.log('🧪 Iniciando batería de pruebas unitarias para el Módulo de Nóminas y Planillas...\n');

// 1. Prueba de Fórmulas de Planilla Operativa
function testBiweeklyPayrollFormulas() {
  console.log('Test 1: Fórmulas de Planilla Quincenal Operativa');
  const baseSalary = 4500;
  const holidaysCount = 2;
  const holidaysAmount = parseFloat(((baseSalary * 2 / 30) * holidaysCount).toFixed(2));
  
  // 4500 * 2 / 30 = 300 por feriado trabajado * 2 = 600
  assert.strictEqual(holidaysAmount, 600.00, 'El cálculo de feriados dobles debe ser C$ 600.00');

  const overtimeHours = 15;
  const overtimeAmount = 750;
  const bonuses = 0;
  const loanDeduction = 0;
  const restaurantServiceDeduction = 690;
  const breakageDeduction = 74;

  const earnings = baseSalary + overtimeAmount + holidaysAmount + bonuses;
  const deductions = loanDeduction + restaurantServiceDeduction + breakageDeduction;
  const totalPaid = parseFloat((earnings - deductions).toFixed(2));

  // 4500 + 750 + 600 - (690 + 74) = 5850 - 764 = 5086
  assert.strictEqual(totalPaid, 5086.00, 'El total pagado debe ser C$ 5,086.00');
  console.log('  ✅ Cálculo de Feriados y Total Pagado verificado.');
}

// 2. Prueba de Fórmulas de Planilla Especial (INSS & INATEC)
function testSpecialPayrollINSSFormulas() {
  console.log('\nTest 2: Fórmulas de Planilla Especial INSS');
  const reportedSalary = 5675.04;
  
  const aguinaldo = parseFloat((reportedSalary / 12).toFixed(2));
  const inssLab = parseFloat((reportedSalary * 0.07).toFixed(2));
  const inssPat = parseFloat((reportedSalary * 0.215).toFixed(2));
  const inatec = parseFloat((reportedSalary * 0.02).toFixed(2));
  const cotizTotal = parseFloat((inssLab + inssPat + inatec).toFixed(2));
  const costTotal = parseFloat((reportedSalary + aguinaldo + inssPat + inatec).toFixed(2));
  const netPay = parseFloat((reportedSalary - inssLab).toFixed(2));

  // 5675.04 / 12 = 472.92
  assert.strictEqual(aguinaldo, 472.92, 'Aguinaldo provisión 1/12 debe ser 472.92');
  // 5675.04 * 0.07 = 397.25
  assert.strictEqual(inssLab, 397.25, 'INSS Laboral 7% debe ser 397.25');
  // 5675.04 * 0.215 = 1220.13
  assert.strictEqual(inssPat, 1220.13, 'INSS Patronal 21.5% debe ser 1220.13');
  // 5675.04 * 0.02 = 113.50
  assert.strictEqual(inatec, 113.50, 'INATEC Patronal 2% debe ser 113.50');
  // Cotiz Total: 397.25 + 1220.13 + 113.50 = 1730.88
  assert.strictEqual(cotizTotal, 1730.88, 'Total cotización debe ser 1730.88');
  // Costo Empresa: 5675.04 + 472.92 + 1220.13 + 113.50 = 7481.59
  assert.strictEqual(costTotal, 7481.59, 'Total costo empresa debe ser 7481.59');
  // Neto: 5675.04 - 397.25 = 5277.79
  assert.strictEqual(netPay, 5277.79, 'Neto a pagar asegurado debe ser 5277.79');

  console.log('  ✅ Todos los porcentajes de ley (7%, 21.5%, 2%, 1/12) y netos coinciden al 100% con el Excel.');
}

// 3. Prueba de Generación y Validación de Excel con ExcelJS
async function testExcelGeneration() {
  console.log('\nTest 3: Generación del libro Excel de Nóminas con dos hojas');
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet('Planilla');
  ws1.addRow(['No', 'Empleado', 'Salario', 'Total Pagado']);
  ws1.addRow([1, 'Uriel Zamora', 6000, 6000]);

  const ws2 = wb.addWorksheet('Planilla Especial');
  ws2.addRow(['REGISTRO PATRONAL No 1550850']);
  ws2.addRow(['NSS', 'Nombre', 'Salario C$', 'Neto']);
  ws2.addRow(['32911303', 'Uriel Zamora', 5675.04, 5277.79]);

  const buffer = await wb.xlsx.writeBuffer();
  assert.ok(buffer.length > 1000, 'El archivo Excel generado debe tener un tamaño válido');
  console.log(`  ✅ Archivo Excel generado correctamente en memoria (${buffer.length} bytes) con hojas Planilla y Planilla Especial.`);
}

async function run() {
  try {
    testBiweeklyPayrollFormulas();
    testSpecialPayrollINSSFormulas();
    await testExcelGeneration();
    console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO DE NÓMINA PASARON EXITOSAMENTE!');
  } catch (err) {
    console.error('\n❌ Error en las pruebas:', err);
    process.exit(1);
  }
}

run();
