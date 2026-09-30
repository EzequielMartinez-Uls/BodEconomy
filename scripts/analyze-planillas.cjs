const ExcelJS = require('exceljs');

function safeStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.result !== undefined) return String(val.result);
    if (val.richText) return val.richText.map(t => t.text).join('');
    if (val.text) return String(val.text);
    return '';
  }
  return String(val);
}

async function scanSheet(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.log(`Hoja ${sheetName} no encontrada.`);
    return;
  }
  console.log(`\n======================================================`);
  console.log(`=== HOJA: ${sheetName} (Filas: ${ws.rowCount}, Cols: ${ws.columnCount}) ===`);
  console.log(`======================================================`);

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const lineParts = [];
    let match = false;
    for (let c = 1; c <= Math.min(ws.columnCount, 25); c++) {
      const v = safeStr(row.getCell(c).value).trim();
      if (v) {
        lineParts.push(`C${c}: ${v}`);
        const low = v.toLowerCase();
        if (low.includes('quincena') || low.includes('planilla') || low.includes('totales') || low.includes('inss') || low.includes('deducciones') || low.includes('registro patronal') || low.includes('prestamo')) {
          match = true;
        }
      }
    }
    if (match && lineParts.length > 0) {
      console.log(`Fila ${r.toString().padStart(3, ' ')}: ${lineParts.slice(0, 8).join(' | ')}`);
    }
  }
}

async function main() {
  const wb = new ExcelJS.Workbook();
  const filePath = 'C:/Users/EddyPolla/proyectos bodegón/Contabilidad, 1 sep. 26 (Autoguardado)(Recuperado automáticamente).xlsx';
  await wb.xlsx.readFile(filePath);

  for (const s of ['Planilla', 'Planilla Especial', 'Prst. Per', 'Horas Extras', 'No de cuentas del personal']) {
    await scanSheet(wb, s);
  }
}

main().catch(console.error);
