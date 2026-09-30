import ExcelJS from 'exceljs';
import { BiweeklyPayrollRow, SpecialPayrollRow, PayrollPeriod } from '../types/payroll';

function getPeriodLabel(period: PayrollPeriod, month: number, year: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mName = months[month - 1] || `Mes ${month}`;
  const pName = period === 'FIRST_HALF' ? 'PRIMERA QUINCENA' : 'SEGUNDA QUINCENA';
  return `CORRESPONDIENTE A LA ${pName} DE ${mName.toUpperCase()} DEL AÑO ${year}`;
}

export async function exportPayrollToExcel(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: BiweeklyPayrollRow[],
  specialRows: SpecialPayrollRow[],
  authorizedBy: string = 'Admon Bodegón'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Restaurante El Bodegón';
  wb.created = new Date();

  const periodTitle = getPeriodLabel(period, month, year);

  // ==========================================
  // HOJA 1: PLANILLA (OPERATIVA)
  // ==========================================
  const ws1 = wb.addWorksheet('Planilla', {
    pageSetup: { orientation: 'landscape', paperSize: 1 }, // Letter
  });

  // Título
  ws1.mergeCells('A1:R1');
  ws1.getCell('A1').value = `PLANILLA ${periodTitle}`;
  ws1.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FF000000' } };
  ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 24;

  // Encabezados
  const h1 = [
    'No', 'Empleado', '', 'Cargo', '', 'Salario Quincenal', '', 
    'Horas Extras', '', 'Feriados', '', 'Deducciones', '', '', '', 'TOTAL PAGADO', 'Firma', ''
  ];
  const h2 = [
    '', '', '', '', '', '', '', 
    'No', 'Valor', 'No', 'Valor', 'Prestamos', 'Servicio Rest.', '', 'Otros', '', '', ''
  ];

  ws1.addRow(h1);
  ws1.addRow(h2);

  // Merges de encabezado
  ws1.mergeCells('A2:A3');
  ws1.mergeCells('B2:C3');
  ws1.mergeCells('D2:E3');
  ws1.mergeCells('F2:G3');
  ws1.mergeCells('H2:I2'); // Horas Extras
  ws1.mergeCells('J2:K2'); // Feriados
  ws1.mergeCells('L2:O2'); // Deducciones
  ws1.mergeCells('P2:P3'); // TOTAL PAGADO
  ws1.mergeCells('Q2:R3'); // Firma

  // Estilo de encabezados
  for (let r = 2; r <= 3; r++) {
    const row = ws1.getRow(r);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
      cell.font = { bold: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // Filas de Datos
  const startRow = 4;
  rows.forEach((r, idx) => {
    const currRow = startRow + idx;
    const rowValues = [
      idx + 1,
      r.name,
      '',
      r.role,
      '',
      r.baseSalary,
      '',
      r.overtimeHours || null,
      r.overtimeAmount || null,
      r.holidaysCount || null,
      { formula: `F${currRow}*2/30*J${currRow}`, result: r.holidaysAmount },
      r.loanDeduction || null,
      r.restaurantServiceDeduction || null,
      '',
      r.breakageDeduction || null,
      { formula: `F${currRow}+IF(I${currRow},I${currRow},0)+IF(K${currRow},K${currRow},0)-IF(L${currRow},L${currRow},0)-IF(M${currRow},M${currRow},0)-IF(O${currRow},O${currRow},0)`, result: r.totalPaid },
      '',
      ''
    ];
    ws1.addRow(rowValues);
    ws1.mergeCells(`B${currRow}:C${currRow}`);
    ws1.mergeCells(`D${currRow}:E${currRow}`);
    ws1.mergeCells(`F${currRow}:G${currRow}`);
    ws1.mergeCells(`Q${currRow}:R${currRow}`);

    const row = ws1.getRow(currRow);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.font = { size: 9 };
      if ([6, 9, 11, 12, 13, 15, 16].includes(colNumber)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if ([1, 8, 10].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      if (colNumber === 16) {
        cell.font = { bold: true, size: 9.5 };
      }
    });
  });

  // Fila de Totales
  const endDataRow = startRow + rows.length - 1;
  const totalRow = endDataRow + 1;
  const totValues = [
    '',
    'Totales',
    '',
    '',
    '',
    { formula: `SUM(F${startRow}:F${endDataRow})` },
    '',
    { formula: `SUM(H${startRow}:H${endDataRow})` },
    { formula: `SUM(I${startRow}:I${endDataRow})` },
    { formula: `SUM(J${startRow}:J${endDataRow})` },
    { formula: `SUM(K${startRow}:K${endDataRow})` },
    { formula: `SUM(L${startRow}:L${endDataRow})` },
    { formula: `SUM(M${startRow}:M${endDataRow})` },
    '',
    { formula: `SUM(O${startRow}:O${endDataRow})` },
    { formula: `SUM(P${startRow}:P${endDataRow})` },
    '',
    ''
  ];
  ws1.addRow(totValues);
  ws1.mergeCells(`B${totalRow}:E${totalRow}`);
  ws1.mergeCells(`F${totalRow}:G${totalRow}`);
  ws1.mergeCells(`Q${totalRow}:R${totalRow}`);

  const totRow = ws1.getRow(totalRow);
  totRow.height = 22;
  totRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { bold: true, size: 9.5 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };
    if ([6, 9, 11, 12, 13, 15, 16].includes(colNumber)) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // Ajuste de Anchos de Columna en Hoja 1
  ws1.getColumn(1).width = 5;
  ws1.getColumn(2).width = 16;
  ws1.getColumn(3).width = 16;
  ws1.getColumn(4).width = 10;
  ws1.getColumn(5).width = 10;
  ws1.getColumn(6).width = 8;
  ws1.getColumn(7).width = 8;
  ws1.getColumn(8).width = 6;
  ws1.getColumn(9).width = 11;
  ws1.getColumn(10).width = 6;
  ws1.getColumn(11).width = 11;
  ws1.getColumn(12).width = 12;
  ws1.getColumn(13).width = 14;
  ws1.getColumn(14).width = 2;
  ws1.getColumn(15).width = 11;
  ws1.getColumn(16).width = 16;
  ws1.getColumn(17).width = 12;
  ws1.getColumn(18).width = 12;

  // ==========================================
  // HOJA 2: PLANILLA ESPECIAL (INSS)
  // ==========================================
  const ws2 = wb.addWorksheet('Planilla Especial', {
    pageSetup: { orientation: 'landscape', paperSize: 1 },
  });

  // Encabezado
  ws2.mergeCells('A1:Q1');
  ws2.getCell('A1').value = 'PLANILLA DE PAGO';
  ws2.getCell('A1').font = { bold: true, size: 14 };
  ws2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws2.mergeCells('A2:Q2');
  ws2.getCell('A2').value = periodTitle;
  ws2.getCell('A2').font = { bold: true, size: 10 };
  ws2.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws2.mergeCells('A3:Q3');
  ws2.getCell('A3').value = 'REGISTRO PATRONAL No 1550850';
  ws2.getCell('A3').font = { bold: true, size: 10 };
  ws2.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  // Encabezados de tabla INSS
  const eh1 = ['No', 'NSS', 'Nombres y apellidos', '', 'Cargos', 'Fecha Ingreso', 'Salario C$', 'H.E Vac. y Feriad.', 'Aguinald.', 'COTIZACION INSS', '', '', '', 'DEDUCCION', 'Total a Cargo/ Bodeg.', 'Neto a Pagar', 'Firmas'];
  const eh2 = ['', '', '', '', '', '', '', '', '', 'Laboral', 'Emplead.', 'INATEC', 'Total Cotiz.', 'IR Laboral', '', '', ''];
  const eh3 = ['', '', '', '', '', '', '', '', '', 'Pers. (7%)', 'BOD (21.5%)', 'BOD (2%)', '', '', '', '', ''];

  ws2.addRow(eh1);
  ws2.addRow(eh2);
  ws2.addRow(eh3);

  ws2.mergeCells('A4:A6');
  ws2.mergeCells('B4:B6');
  ws2.mergeCells('C4:D6');
  ws2.mergeCells('E4:E6');
  ws2.mergeCells('F4:F6');
  ws2.mergeCells('G4:G6');
  ws2.mergeCells('H4:H6');
  ws2.mergeCells('I4:I6');
  ws2.mergeCells('J4:M4'); // COTIZACION INSS
  ws2.mergeCells('N4:N6'); // DEDUCCION IR
  ws2.mergeCells('O4:O6'); // Total a Cargo
  ws2.mergeCells('P4:P6'); // Neto a Pagar
  ws2.mergeCells('Q4:Q6'); // Firmas

  for (let r = 4; r <= 6; r++) {
    const row = ws2.getRow(r);
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.font = { bold: true, size: 8.5 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  }

  // Filas de Datos Especial
  const spStartRow = 7;
  specialRows.forEach((r, idx) => {
    const currRow = spStartRow + idx;
    const rowValues = [
      idx + 1,
      r.nss,
      r.name,
      '',
      r.role,
      r.hireDate,
      r.reportedSalary,
      r.extraHolidayAmount || 0,
      { formula: `G${currRow}/12`, result: r.aguinaldoProvision },
      { formula: `G${currRow}*0.07`, result: r.inssLaboral },
      { formula: `G${currRow}*0.215`, result: r.inssPatronal },
      { formula: `G${currRow}*0.02`, result: r.inatecPatronal },
      { formula: `J${currRow}+K${currRow}+L${currRow}`, result: r.totalCotizacion },
      r.irLaboral || 0,
      { formula: `G${currRow}+I${currRow}+K${currRow}+L${currRow}`, result: r.totalCostBodegon },
      { formula: `G${currRow}-J${currRow}-N${currRow}+H${currRow}`, result: r.netPayAsegurado },
      ''
    ];
    ws2.addRow(rowValues);
    ws2.mergeCells(`C${currRow}:D${currRow}`);

    const row = ws2.getRow(currRow);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 9 };
      if ([7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(colNumber)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if ([1, 2, 6].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
      if ([15, 16].includes(colNumber)) {
        cell.font = { bold: true, size: 9 };
      }
    });
  });

  // Totales de Hoja 2
  const spEndDataRow = spStartRow + specialRows.length - 1;
  const spTotalRow = spEndDataRow + 1;
  const spTotValues = [
    '',
    '',
    'Total',
    '',
    '',
    '',
    { formula: `SUM(G${spStartRow}:G${spEndDataRow})` },
    { formula: `SUM(H${spStartRow}:H${spEndDataRow})` },
    { formula: `SUM(I${spStartRow}:I${spEndDataRow})` },
    { formula: `SUM(J${spStartRow}:J${spEndDataRow})` },
    { formula: `SUM(K${spStartRow}:K${endDataRow})` },
    { formula: `SUM(L${spStartRow}:L${spEndDataRow})` },
    { formula: `SUM(M${spStartRow}:M${spEndDataRow})` },
    { formula: `SUM(N${spStartRow}:N${spEndDataRow})` },
    { formula: `SUM(O${spStartRow}:O${spEndDataRow})` },
    { formula: `SUM(P${spStartRow}:P${spEndDataRow})` },
    ''
  ];
  ws2.addRow(spTotValues);
  ws2.mergeCells(`C${spTotalRow}:F${spTotalRow}`);

  const spTotRow = ws2.getRow(spTotalRow);
  spTotRow.height = 22;
  spTotRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
    if ([7, 8, 9, 10, 11, 12, 13, 14, 15, 16].includes(colNumber)) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // Anchos de Hoja 2
  ws2.getColumn(1).width = 4;
  ws2.getColumn(2).width = 11;
  ws2.getColumn(3).width = 16;
  ws2.getColumn(4).width = 16;
  ws2.getColumn(5).width = 16;
  ws2.getColumn(6).width = 12;
  ws2.getColumn(7).width = 12;
  ws2.getColumn(8).width = 11;
  ws2.getColumn(9).width = 11;
  ws2.getColumn(10).width = 11;
  ws2.getColumn(11).width = 12;
  ws2.getColumn(12).width = 10;
  ws2.getColumn(13).width = 12;
  ws2.getColumn(14).width = 10;
  ws2.getColumn(15).width = 16;
  ws2.getColumn(16).width = 14;
  ws2.getColumn(17).width = 16;

  // Descarga del archivo en navegador o Electron
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Planilla_Bodegon_${year}_${String(month).padStart(2, '0')}_${period === 'FIRST_HALF' ? 'Q1' : 'Q2'}.xlsx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
