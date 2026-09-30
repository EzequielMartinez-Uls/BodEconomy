const ExcelJS = require('exceljs');

async function inspectSheet(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.log('Worksheet not found:', sheetName);
    return;
  }
  console.log(`\n======================================================`);
  console.log(`=== WORKSHEET: ${sheetName} (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ===`);
  console.log(`======================================================`);
  
  for (let r = 1; r <= Math.min(ws.rowCount, 45); r++) {
    const row = ws.getRow(r);
    const values = [];
    let hasValue = false;
    for (let c = 1; c <= Math.min(ws.columnCount, 35); c++) {
      const cell = row.getCell(c);
      let val = cell.value;
      if (val !== null && val !== undefined && val !== '') {
        hasValue = true;
        let strVal = '';
        if (typeof val === 'object') {
          if (val.result !== undefined) strVal = `[F: ${val.formula} => ${val.result}]`;
          else if (val.richText) strVal = val.richText.map(t => t.text).join('');
          else strVal = JSON.stringify(val);
        } else {
          strVal = String(val);
        }
        values.push(`[Col ${c}]: ${strVal}`);
      }
    }
    if (hasValue) {
      console.log(`Row ${r.toString().padStart(2, ' ')}: ${values.join(' | ')}`);
    }
  }
}

async function run() {
  const wb = new ExcelJS.Workbook();
  const filePath = 'C:/Users/EddyPolla/proyectos bodegón/Contabilidad, 1 sep. 26 (Autoguardado)(Recuperado automáticamente).xlsx';
  console.log('Cargando archivo Excel...');
  await wb.xlsx.readFile(filePath);
  console.log('Archivo cargado.');

  await inspectSheet(wb, 'Planilla');
  await inspectSheet(wb, 'Planilla Especial');
}

run().catch(console.error);
