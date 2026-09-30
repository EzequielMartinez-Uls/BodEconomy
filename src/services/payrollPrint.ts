import { BiweeklyPayrollRow, SpecialPayrollRow, PayrollPeriod } from '../types/payroll';

function getPeriodLabel(period: PayrollPeriod, month: number, year: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mName = months[month - 1] || `Mes ${month}`;
  const pName = period === 'FIRST_HALF' ? 'PRIMERA QUINCENA' : 'SEGUNDA QUINCENA';
  return `${pName} DE ${mName.toUpperCase()} DEL AÑO ${year}`;
}

/**
 * Abre una ventana emergente de impresión optimizada para blanco y negro
 */
function openPrintWindow(htmlContent: string, title: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!printWindow) {
    alert('Por favor, permita las ventanas emergentes (pop-ups) para imprimir los reportes.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        /* ESTILOS DE ALTO RENDIMIENTO MONOCROMÁTICO (BLANCO Y NEGRO PURO) */
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.25;
        }

        .print-btn-bar {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 13px;
          z-index: 9999;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        @media print {
          .print-btn-bar {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-btn-bar" onclick="window.print()">🖨️ Mandar a Imprimir</button>
      ${htmlContent}
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * 1. IMPRESIÓN SÁBANA GENERAL QUINCENAL (Hoja Carta Horizontal)
 */
export function printBiweeklyPayrollGeneral(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: BiweeklyPayrollRow[],
  authorizedBy: string = 'Admon Bodegón'
) {
  const periodLabel = getPeriodLabel(period, month, year);

  // Totales
  let totalBase = 0;
  let totalHEHours = 0;
  let totalHEAmount = 0;
  let totalHolidaysAmount = 0;
  let totalBonuses = 0;
  let totalLoans = 0;
  let totalRest = 0;
  let totalBreakage = 0;
  let grandTotal = 0;

  rows.forEach((r) => {
    totalBase += r.baseSalary || 0;
    totalHEHours += r.overtimeHours || 0;
    totalHEAmount += r.overtimeAmount || 0;
    totalHolidaysAmount += r.holidaysAmount || 0;
    totalBonuses += r.bonuses || 0;
    totalLoans += r.loanDeduction || 0;
    totalRest += r.restaurantServiceDeduction || 0;
    totalBreakage += r.breakageDeduction || 0;
    grandTotal += r.totalPaid || 0;
  });

  const notesList = rows
    .filter((r) => r.breakageNotes && r.breakageNotes.trim().length > 0)
    .map((r) => `<li><strong>${r.name}:</strong> ${r.breakageNotes}</li>`)
    .join('');

  const html = `
    <style>
      @page {
        size: letter landscape;
        margin: 8mm 6mm;
      }
      .sheet-container {
        width: 100%;
        max-width: 1060px;
        margin: 0 auto;
      }
      .header-title {
        text-align: center;
        margin-bottom: 8px;
        border-bottom: 2px solid #000;
        padding-bottom: 4px;
      }
      .header-title h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .header-title h2 {
        margin: 2px 0 0 0;
        font-size: 11px;
        font-weight: 700;
      }
      table.payroll-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      table.payroll-table th, table.payroll-table td {
        border: 1px solid #000000;
        padding: 4px 4px;
        text-align: left;
      }
      table.payroll-table th {
        font-weight: 800;
        font-size: 9.5px;
        text-transform: uppercase;
        background: #f4f4f4;
        text-align: center;
      }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .font-mono { font-family: "Courier New", Courier, monospace; }
      .font-bold { font-weight: bold; }
      .totals-row td {
        font-weight: 900;
        background: #ebebeb;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        font-size: 10px;
      }
      .notes-box {
        border: 1px dashed #000;
        padding: 6px 10px;
        margin-top: 8px;
        font-size: 9.5px;
      }
      .notes-box ul {
        margin: 4px 0 0 16px;
        padding: 0;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 25px;
        padding: 0 40px;
      }
      .signature-block {
        text-align: center;
        width: 240px;
        border-top: 1px solid #000;
        padding-top: 4px;
        font-weight: bold;
        font-size: 10.5px;
      }
    </style>

    <div class="sheet-container">
      <div class="header-title">
        <h1>RESTAURANTE EL BODEGÓN — PLANILLA DE PAGO</h1>
        <h2>CORRESPONDIENTE A LA ${periodLabel}</h2>
      </div>

      <table class="payroll-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 25px;">No</th>
            <th rowspan="2" style="width: 140px;">Empleado</th>
            <th rowspan="2" style="width: 95px;">Cargo</th>
            <th rowspan="2" style="width: 70px;">Salario<br>Quincenal</th>
            <th colspan="2" style="width: 75px;">Horas Extras</th>
            <th colspan="2" style="width: 75px;">Feriados</th>
            <th rowspan="2" style="width: 55px;">Bonif.</th>
            <th colspan="3">Deducciones</th>
            <th rowspan="2" style="width: 80px;">TOTAL<br>PAGADO</th>
            <th rowspan="2" style="width: 130px;">Firma del Empleado</th>
          </tr>
          <tr>
            <th style="font-size: 8px;">No</th>
            <th style="font-size: 8px;">Valor</th>
            <th style="font-size: 8px;">No</th>
            <th style="font-size: 8px;">Valor</th>
            <th style="font-size: 8px; width: 55px;">Préstamo</th>
            <th style="font-size: 8px; width: 60px;">Serv. Rest</th>
            <th style="font-size: 8px; width: 60px;">Vajilla/Otros</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-bold">${r.name}</td>
              <td>${r.role}</td>
              <td class="text-right font-mono font-bold">C$ ${r.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-center font-mono">${r.overtimeHours ? r.overtimeHours.toFixed(1) : '-'}</td>
              <td class="text-right font-mono">${r.overtimeAmount ? r.overtimeAmount.toFixed(2) : '-'}</td>
              <td class="text-center font-mono">${r.holidaysCount ? r.holidaysCount : '-'}</td>
              <td class="text-right font-mono">${r.holidaysAmount ? r.holidaysAmount.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.bonuses ? r.bonuses.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.loanDeduction ? r.loanDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.restaurantServiceDeduction ? r.restaurantServiceDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.breakageDeduction ? r.breakageDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono font-bold" style="font-size: 10.5px;">C$ ${r.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          `
            )
            .join('')}
          <tr class="totals-row">
            <td colspan="3" class="text-center">TOTALES GENERALES</td>
            <td class="text-right font-mono">C$ ${totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-center font-mono">${totalHEHours ? totalHEHours.toFixed(1) : '-'}</td>
            <td class="text-right font-mono">C$ ${totalHEAmount.toFixed(2)}</td>
            <td class="text-center font-mono">-</td>
            <td class="text-right font-mono">C$ ${totalHolidaysAmount.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalBonuses.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalLoans.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalRest.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalBreakage.toFixed(2)}</td>
            <td class="text-right font-mono font-bold" style="font-size: 11px;">C$ ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      ${
        notesList
          ? `
        <div class="notes-box">
          <strong>NOTAS Y DETALLE DE CONCEPTOS DEDUCIDOS EN ESTA QUINCENA:</strong>
          <ul>${notesList}</ul>
        </div>
      `
          : ''
      }

      <div class="signature-section">
        <div class="signature-block">
          ${authorizedBy}<br>
          <span style="font-size: 9px; font-weight: normal;">Elaborado por</span>
        </div>
        <div class="signature-block">
          Autorizado: _________________________<br>
          <span style="font-size: 9px; font-weight: normal;">Gerencia General El Bodegón</span>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Planilla_${period}_${month}_${year}`);
}

/**
 * 2. IMPRESIÓN DE RECIBOS INDIVIDUALES DE PAGO (Hoja Carta Vertical - 2 Vouchers por Hoja con Línea de Corte)
 */
export function printIndividualReceipts(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: BiweeklyPayrollRow[],
  authorizedBy: string = 'Admon Bodegón'
) {
  const periodLabel = getPeriodLabel(period, month, year);

  // Agrupar en pares de 2 por hoja carta
  const pairs: BiweeklyPayrollRow[][] = [];
  for (let i = 0; i < rows.length; i += 2) {
    pairs.push(rows.slice(i, i + 2));
  }

  const pagesHtml = pairs
    .map((pair, pIdx) => {
      const renderReceipt = (r: BiweeklyPayrollRow) => {
        const totalEarnings = (r.baseSalary || 0) + (r.overtimeAmount || 0) + (r.holidaysAmount || 0) + (r.bonuses || 0);
        const totalDeductions = (r.loanDeduction || 0) + (r.restaurantServiceDeduction || 0) + (r.breakageDeduction || 0);

        return `
          <div class="voucher-box">
            <div class="voucher-header">
              <div class="v-brand">RESTAURANTE EL BODEGÓN</div>
              <div class="v-subtitle">COMPROBANTE INDIVIDUAL DE PAGO DE NÓMINA</div>
              <div class="v-period">${periodLabel}</div>
            </div>

            <div class="employee-meta">
              <div><strong>Colaborador:</strong> ${r.name}</div>
              <div><strong>Cargo:</strong> ${r.role}</div>
            </div>

            <div class="breakdown-grid">
              <div class="col-half">
                <div class="col-title">INGRESOS & HABERES</div>
                <div class="row-line"><span>Salario Quincenal:</span> <span class="font-mono">C$ ${r.baseSalary.toFixed(2)}</span></div>
                ${r.overtimeAmount > 0 ? `<div class="row-line"><span>Horas Extras (${r.overtimeHours.toFixed(1)}h):</span> <span class="font-mono">C$ ${r.overtimeAmount.toFixed(2)}</span></div>` : ''}
                ${r.holidaysAmount > 0 ? `<div class="row-line"><span>Feriados (${r.holidaysCount}d):</span> <span class="font-mono">C$ ${r.holidaysAmount.toFixed(2)}</span></div>` : ''}
                ${r.bonuses > 0 ? `<div class="row-line"><span>Bonificación:</span> <span class="font-mono">C$ ${r.bonuses.toFixed(2)}</span></div>` : ''}
                <div class="row-line subtotal"><span>Total Ingresos:</span> <span class="font-mono">C$ ${totalEarnings.toFixed(2)}</span></div>
              </div>

              <div class="col-half">
                <div class="col-title">DEDUCCIONES</div>
                ${r.loanDeduction > 0 ? `<div class="row-line"><span>Préstamo:</span> <span class="font-mono">- C$ ${r.loanDeduction.toFixed(2)}</span></div>` : ''}
                ${r.restaurantServiceDeduction > 0 ? `<div class="row-line"><span>Servicio Restaurante:</span> <span class="font-mono">- C$ ${r.restaurantServiceDeduction.toFixed(2)}</span></div>` : ''}
                ${r.breakageDeduction > 0 ? `<div class="row-line"><span>Vajilla / Otros:</span> <span class="font-mono">- C$ ${r.breakageDeduction.toFixed(2)}</span></div>` : ''}
                ${r.breakageNotes ? `<div style="font-size: 8px; color: #333; margin-top: 2px;"><em>(${r.breakageNotes})</em></div>` : ''}
                <div class="row-line subtotal"><span>Total Deducciones:</span> <span class="font-mono">- C$ ${totalDeductions.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="net-banner">
              <span>NETO A PAGAR:</span>
              <span class="font-mono font-bold" style="font-size: 15px;">C$ ${r.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div class="signatures-row">
              <div class="sig-col">
                <div class="sig-line"></div>
                <div>Firma del Colaborador</div>
                <div style="font-size: 8px; font-weight: normal;">Recibí Conforme</div>
              </div>
              <div class="sig-col">
                <div class="sig-line"></div>
                <div>${authorizedBy}</div>
                <div style="font-size: 8px; font-weight: normal;">Entregado Conforme</div>
              </div>
            </div>
          </div>
        `;
      };

      return `
        <div class="letter-page ${pIdx < pairs.length - 1 ? 'page-break' : ''}">
          ${renderReceipt(pair[0])}
          ${
            pair[1]
              ? `
            <div class="cut-divider">
              <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - LÍNEA DE CORTE - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
            </div>
            ${renderReceipt(pair[1])}
          `
              : ''
          }
        </div>
      `;
    })
    .join('');

  const html = `
    <style>
      @page {
        size: letter portrait;
        margin: 10mm 10mm;
      }
      .letter-page {
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
        height: 980px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .page-break {
        page-break-after: always;
      }
      .voucher-box {
        border: 1px solid #000;
        padding: 12px 14px;
        background: #fff;
        height: 460px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .voucher-header {
        text-align: center;
        border-bottom: 1.5px solid #000;
        padding-bottom: 4px;
      }
      .v-brand {
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
      .v-subtitle {
        font-size: 10px;
        font-weight: 700;
      }
      .v-period {
        font-size: 9px;
        font-weight: 600;
        color: #222;
      }
      .employee-meta {
        display: flex;
        justify-content: space-between;
        margin: 6px 0;
        padding: 4px 6px;
        background: #f4f4f4;
        border: 1px solid #000;
        font-size: 10.5px;
      }
      .breakdown-grid {
        display: flex;
        gap: 12px;
        margin: 4px 0;
        flex: 1;
      }
      .col-half {
        flex: 1;
        border: 1px solid #000;
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
      }
      .col-title {
        font-size: 9px;
        font-weight: 900;
        text-align: center;
        border-bottom: 1px solid #000;
        padding-bottom: 3px;
        margin-bottom: 4px;
        background: #fafafa;
      }
      .row-line {
        display: flex;
        justify-content: space-between;
        font-size: 9.5px;
        margin-bottom: 2px;
      }
      .row-line.subtotal {
        margin-top: auto;
        border-top: 1px dashed #000;
        padding-top: 3px;
        font-weight: bold;
      }
      .net-banner {
        border: 1.5px solid #000;
        background: #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        margin: 4px 0;
        font-weight: 900;
        font-size: 12px;
      }
      .signatures-row {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        padding: 0 20px;
      }
      .sig-col {
        width: 170px;
        text-align: center;
        font-size: 9.5px;
        font-weight: bold;
      }
      .sig-line {
        border-top: 1px solid #000;
        margin-bottom: 3px;
      }
      .cut-divider {
        text-align: center;
        font-size: 8px;
        color: #444;
        margin: 6px 0;
        user-select: none;
      }
      .font-mono { font-family: "Courier New", Courier, monospace; }
      .font-bold { font-weight: bold; }
    </style>

    ${pagesHtml}
  `;

  openPrintWindow(html, `Recibos_Nomina_${period}_${month}_${year}`);
}

/**
 * 3. IMPRESIÓN PLANILLA ESPECIAL (INSS - Hoja Carta Horizontal)
 */
export function printSpecialPayrollINSS(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: SpecialPayrollRow[]
) {
  const periodLabel = getPeriodLabel(period, month, year);

  let totalSalario = 0;
  let totalAguinaldo = 0;
  let totalINSSLaboral = 0;
  let totalINSSPatronal = 0;
  let totalINATEC = 0;
  let totalCotiz = 0;
  let totalCostEmpresa = 0;
  let totalNeto = 0;

  rows.forEach((r) => {
    totalSalario += r.reportedSalary || 0;
    totalAguinaldo += r.aguinaldoProvision || 0;
    totalINSSLaboral += r.inssLaboral || 0;
    totalINSSPatronal += r.inssPatronal || 0;
    totalINATEC += r.inatecPatronal || 0;
    totalCotiz += r.totalCotizacion || 0;
    totalCostEmpresa += r.totalCostBodegon || 0;
    totalNeto += r.netPayAsegurado || 0;
  });

  const html = `
    <style>
      @page {
        size: letter landscape;
        margin: 8mm 6mm;
      }
      .sheet-container {
        width: 100%;
        max-width: 1060px;
        margin: 0 auto;
      }
      .header-title {
        text-align: center;
        margin-bottom: 8px;
        border-bottom: 2px solid #000;
        padding-bottom: 4px;
      }
      .header-title h1 {
        margin: 0;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
      .header-title h2 {
        margin: 2px 0 0 0;
        font-size: 11px;
        font-weight: 700;
      }
      .header-title .patronal-badge {
        font-size: 11px;
        font-weight: 900;
        margin-top: 2px;
      }
      table.inss-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      table.inss-table th, table.inss-table td {
        border: 1px solid #000000;
        padding: 4px 4px;
        font-size: 9.5px;
      }
      table.inss-table th {
        font-weight: 800;
        font-size: 8.5px;
        background: #f4f4f4;
        text-align: center;
      }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .font-mono { font-family: "Courier New", Courier, monospace; }
      .font-bold { font-weight: bold; }
      .totals-row td {
        font-weight: 900;
        background: #ebebeb;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        font-size: 9.5px;
      }
      .summary-box {
        border: 1px solid #000;
        padding: 8px 12px;
        margin-top: 10px;
        font-size: 10px;
        display: flex;
        justify-content: space-around;
        background: #fafafa;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        padding: 0 40px;
      }
      .signature-block {
        text-align: center;
        width: 240px;
        border-top: 1px solid #000;
        padding-top: 4px;
        font-weight: bold;
        font-size: 10px;
      }
    </style>

    <div class="sheet-container">
      <div class="header-title">
        <h1>RESTAURANTE EL BODEGÓN — PLANILLA ESPECIAL (INSS)</h1>
        <h2>CORRESPONDIENTE A LA ${periodLabel}</h2>
        <div class="patronal-badge">REGISTRO PATRONAL No 1550850</div>
      </div>

      <table class="inss-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 20px;">No</th>
            <th rowspan="2" style="width: 75px;">NSS</th>
            <th rowspan="2" style="width: 140px;">Nombres y Apellidos</th>
            <th rowspan="2" style="width: 90px;">Cargo</th>
            <th rowspan="2" style="width: 65px;">Fecha<br>Ingreso</th>
            <th rowspan="2" style="width: 65px;">Salario<br>C$</th>
            <th rowspan="2" style="width: 60px;">Aguinald.<br>(1/12)</th>
            <th colspan="4">Cotización INSS / INATEC</th>
            <th rowspan="2" style="width: 45px;">IR<br>Lab.</th>
            <th rowspan="2" style="width: 75px;">Total a Cargo<br>Bodegón</th>
            <th rowspan="2" style="width: 70px;">Neto a<br>Pagar</th>
            <th rowspan="2" style="width: 100px;">Firma</th>
          </tr>
          <tr>
            <th style="font-size: 8px;">Laboral<br>(7%)</th>
            <th style="font-size: 8px;">Patronal<br>(21.5%)</th>
            <th style="font-size: 8px;">INATEC<br>(2%)</th>
            <th style="font-size: 8px;">Total<br>Cotiz.</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center">${idx + 1}</td>
              <td class="font-mono text-center font-bold">${r.nss}</td>
              <td class="font-bold">${r.name}</td>
              <td>${r.role}</td>
              <td class="text-center font-mono">${r.hireDate}</td>
              <td class="text-right font-mono font-bold">C$ ${r.reportedSalary.toFixed(2)}</td>
              <td class="text-right font-mono">C$ ${r.aguinaldoProvision.toFixed(2)}</td>
              <td class="text-right font-mono">C$ ${r.inssLaboral.toFixed(2)}</td>
              <td class="text-right font-mono">C$ ${r.inssPatronal.toFixed(2)}</td>
              <td class="text-right font-mono">C$ ${r.inatecPatronal.toFixed(2)}</td>
              <td class="text-right font-mono font-bold">C$ ${r.totalCotizacion.toFixed(2)}</td>
              <td class="text-center font-mono">${r.irLaboral ? r.irLaboral.toFixed(2) : '0.00'}</td>
              <td class="text-right font-mono font-bold">C$ ${r.totalCostBodegon.toFixed(2)}</td>
              <td class="text-right font-mono font-bold">C$ ${r.netPayAsegurado.toFixed(2)}</td>
              <td></td>
            </tr>
          `
            )
            .join('')}
          <tr class="totals-row">
            <td colspan="5" class="text-center">TOTALES GENERALES</td>
            <td class="text-right font-mono">C$ ${totalSalario.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalAguinaldo.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalINSSLaboral.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalINSSPatronal.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalINATEC.toFixed(2)}</td>
            <td class="text-right font-mono font-bold">C$ ${totalCotiz.toFixed(2)}</td>
            <td class="text-center font-mono">0.00</td>
            <td class="text-right font-mono font-bold">C$ ${totalCostEmpresa.toFixed(2)}</td>
            <td class="text-right font-mono font-bold">C$ ${totalNeto.toFixed(2)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="summary-box">
        <div><strong>Total Salarios Declarados:</strong> C$ ${totalSalario.toFixed(2)}</div>
        <div><strong>Aporte Patronal Total (23.5%):</strong> C$ ${(totalINSSPatronal + totalINATEC).toFixed(2)}</div>
        <div><strong>Retención Laboral (7%):</strong> C$ ${totalINSSLaboral.toFixed(2)}</div>
        <div><strong>Cheque / Transferencia INSS:</strong> C$ ${totalCotiz.toFixed(2)}</div>
      </div>

      <div class="signature-section">
        <div class="signature-block">
          Admon Bodegón<br>
          <span style="font-size: 8.5px; font-weight: normal;">Representante Legal / RRHH</span>
        </div>
        <div class="signature-block">
          Autorizado: _________________________<br>
          <span style="font-size: 8.5px; font-weight: normal;">Gerencia General El Bodegón</span>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Planilla_Especial_INSS_${period}_${month}_${year}`);
}
