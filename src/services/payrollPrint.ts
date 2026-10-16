import {
  BiweeklyPayrollRow,
  SpecialPayrollRow,
  PayrollPeriod,
  calculateSpecialPayrollRow,
  calculateSpecialPayrollTotals,
} from '../types/payroll';

function getPeriodLabel(period: PayrollPeriod, month: number, year: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mName = months[month - 1] || `Mes ${month}`;
  const pName = period === 'FIRST_HALF' ? 'PRIMERA QUINCENA (01 AL 14)' : 'SEGUNDA QUINCENA (15 AL FIN)';
  return `${pName} DE ${mName.toUpperCase()} DEL AÑO ${year}`;
}

/**
 * Abre una ventana emergente de impresión optimizada 100% para impresoras Blanco y Negro (Tamaño Carta)
 * Sin escalas de grises, sin fondos grises (cero tramado/dithering) y con trazos gruesos de alto contraste.
 */
function openPrintWindow(htmlContent: string, title: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=850');
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
        /* ESTILOS DE NITIDEZ EXTREMA MONOCROMÁTICA (100% TINTA NEGRA PURA SOBRE BLANCO PURO) */
        * {
          box-sizing: border-box;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          -webkit-font-smoothing: none !important;
          text-rendering: geometricPrecision !important;
        }
        body {
          font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif;
          color: #000000 !important;
          background: #ffffff !important;
          margin: 0;
          padding: 0;
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1.3;
        }

        .print-btn-bar {
          position: fixed;
          top: 10px;
          right: 10px;
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #000000;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 900;
          cursor: pointer;
          font-size: 13px;
          z-index: 9999;
        }
        @media print {
          .print-btn-bar {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-btn-bar" style="color: #ffffff !important;" onclick="window.print()">🖨️ Mandar a Imprimir (1 Sola Hoja Carta)</button>
      ${htmlContent}
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.focus();
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
 * 1. IMPRESIÓN SÁBANA GENERAL QUINCENAL (Hoja Tamaño Carta Horizontal - Alto Contraste B/N)
 */
export function printBiweeklyPayrollGeneral(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: BiweeklyPayrollRow[],
  authorizedBy: string = 'Admon Bodegón'
) {
  const periodLabel = getPeriodLabel(period, month, year);

  let totalBase = 0;
  let totalHEHours = 0;
  let totalHEAmount = 0;
  let totalHolidaysAmount = 0;
  let totalINSS = 0;
  let totalLoans = 0;
  let totalRest = 0;
  let totalBreakage = 0;
  let grandTotal = 0;

  rows.forEach((r) => {
    totalBase += r.baseSalary || 0;
    totalHEHours += r.overtimeHours || 0;
    totalHEAmount += r.overtimeAmount || 0;
    totalHolidaysAmount += r.holidaysAmount || 0;
    totalINSS += Math.abs(r.inssDeduction !== undefined ? (r.inssDeduction || 0) : (r.bonuses || 0));
    totalLoans += r.loanDeduction || 0;
    totalRest += r.restaurantServiceDeduction || 0;
    totalBreakage += r.breakageDeduction || 0;
    grandTotal += r.totalPaid || 0;
  });

  const notesList = rows
    .filter((r) => r.breakageNotes && r.breakageNotes.trim().length > 0)
    .map((r) => `<li>• <strong>${r.name}:</strong> ${r.breakageNotes}</li>`)
    .join('');

  const html = `
    <style>
      @page {
        size: letter landscape;
        margin: 4mm 6mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif;
      }
      .sheet-container {
        width: 100%;
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .header-title {
        text-align: center;
        margin-bottom: 5px;
        border-bottom: 2px solid #000000;
        padding-bottom: 3px;
      }
      .header-title h1 {
        margin: 0;
        font-size: 14.5px;
        font-weight: 900;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .header-title h2 {
        margin: 2px 0 0 0;
        font-size: 11px;
        font-weight: 800;
      }
      table.payroll-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 5px;
        border: 1.5px solid #000000;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table.payroll-table th, table.payroll-table td {
        border: 1px solid #000000;
        padding: 2px 3.5px;
        text-align: left;
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 9px;
        line-height: 1.15;
        font-weight: 700;
      }
      table.payroll-table th {
        font-weight: 900;
        font-size: 8.5px;
        text-transform: uppercase;
        border-bottom: 2px solid #000000;
        text-align: center;
        padding: 2.5px 2px;
      }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .font-mono { font-family: "Courier New", Courier, monospace; font-weight: 800 !important; }
      .font-bold { font-weight: 900 !important; }
      .totals-row td {
        font-weight: 900 !important;
        background: #ffffff !important;
        border-top: 2px solid #000000 !important;
        border-bottom: 2px solid #000000 !important;
        font-size: 9.5px !important;
        padding: 2.5px 3.5px !important;
      }
      .notes-box {
        border: 1.5px solid #000000;
        padding: 4px 8px;
        margin-top: 4px;
        font-size: 8.5px;
        font-weight: 700;
        background: #ffffff;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .notes-box strong {
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.2px;
      }
      .notes-box ul {
        margin: 2px 0 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5px 14px;
      }
      .notes-box li {
        font-size: 8px;
        line-height: 1.15;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        padding: 0 40px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .signature-block {
        text-align: center;
        width: 230px;
        border-top: 1.5px solid #000000;
        padding-top: 3px;
        font-weight: 900;
        font-size: 10px;
        line-height: 1.2;
      }
      @media print {
        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .sheet-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    </style>

    <div class="sheet-container">
      <div class="header-title">
        <h1>RESTAURANTE EL BODEGÓN — PLANILLA GENERAL DE PAGO (TAMAÑO CARTA)</h1>
        <h2>CORRESPONDIENTE A LA ${periodLabel}</h2>
      </div>

      <table class="payroll-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 28px;">No</th>
            <th rowspan="2" style="width: 150px;">Empleado</th>
            <th rowspan="2" style="width: 100px;">Cargo</th>
            <th rowspan="2" style="width: 78px;">Salario<br>Quincenal</th>
            <th colspan="2" style="width: 80px;">Horas Extras</th>
            <th colspan="2" style="width: 80px;">Feriados</th>
            <th rowspan="2" style="width: 65px;">Ded. INSS</th>
            <th colspan="3">Deducciones</th>
            <th rowspan="2" style="width: 88px;">TOTAL<br>PAGADO</th>
            <th rowspan="2" style="width: 135px;">Firma del Empleado</th>
          </tr>
          <tr>
            <th style="font-size: 9.5px;">Hrs</th>
            <th style="font-size: 9.5px;">Valor</th>
            <th style="font-size: 9.5px;">Días</th>
            <th style="font-size: 9.5px;">Valor</th>
            <th style="font-size: 9.5px; width: 60px;">Préstamo</th>
            <th style="font-size: 9.5px; width: 62px;">Serv. Rest</th>
            <th style="font-size: 9.5px; width: 62px;">Vajilla/Otros</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, idx) => {
                const inssVal = Math.abs(r.inssDeduction !== undefined ? (r.inssDeduction || 0) : (r.bonuses || 0));
                return `
            <tr>
              <td class="text-center font-bold">${idx + 1}</td>
              <td class="font-bold">${r.name}</td>
              <td>${r.role}</td>
              <td class="text-right font-mono">C$ ${r.baseSalary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-center font-mono">${r.overtimeHours ? r.overtimeHours.toFixed(1) : '-'}</td>
              <td class="text-right font-mono">${r.overtimeAmount ? r.overtimeAmount.toFixed(2) : '-'}</td>
              <td class="text-center font-mono">${r.holidaysCount ? r.holidaysCount : '-'}</td>
              <td class="text-right font-mono">${r.holidaysAmount ? r.holidaysAmount.toFixed(2) : '-'}</td>
              <td class="text-right font-mono text-rose-700">${inssVal ? `- ${inssVal.toFixed(2)}` : '-'}</td>
              <td class="text-right font-mono">${r.loanDeduction ? r.loanDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.restaurantServiceDeduction ? r.restaurantServiceDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono">${r.breakageDeduction ? r.breakageDeduction.toFixed(2) : '-'}</td>
              <td class="text-right font-mono font-bold" style="font-size: 11.5px;">C$ ${r.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          `;
              }
            )
            .join('')}
          <tr class="totals-row">
            <td colspan="3" class="text-center">TOTALES GENERALES</td>
            <td class="text-right font-mono">C$ ${totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td class="text-center font-mono">${totalHEHours ? totalHEHours.toFixed(1) : '-'}</td>
            <td class="text-right font-mono">C$ ${totalHEAmount.toFixed(2)}</td>
            <td class="text-center font-mono">-</td>
            <td class="text-right font-mono">C$ ${totalHolidaysAmount.toFixed(2)}</td>
            <td class="text-right font-mono text-rose-300">- C$ ${totalINSS.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalLoans.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalRest.toFixed(2)}</td>
            <td class="text-right font-mono">C$ ${totalBreakage.toFixed(2)}</td>
            <td class="text-right font-mono font-bold" style="font-size: 12px;">C$ ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
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
          <span style="font-size: 10.5px; font-weight: 800;">ELABORADO POR</span>
        </div>
        <div class="signature-block">
          AUTORIZADO POR<br>
          <span style="font-size: 10.5px; font-weight: 800;">GERENCIA GENERAL EL BODEGÓN</span>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Planilla_${period}_${month}_${year}`);
}

/**
 * 2. IMPRESIÓN DE RECIBOS INDIVIDUALES DE PAGO (Hoja Tamaño Carta Vertical - 2 Vouchers por Hoja con Línea de Corte)
 */
export function printIndividualReceipts(
  period: PayrollPeriod,
  month: number,
  year: number,
  rows: BiweeklyPayrollRow[],
  authorizedBy: string = 'Admon Bodegón'
) {
  const periodLabel = getPeriodLabel(period, month, year);

  const pairs: BiweeklyPayrollRow[][] = [];
  for (let i = 0; i < rows.length; i += 2) {
    pairs.push(rows.slice(i, i + 2));
  }

  const pagesHtml = pairs
    .map((pair, pIdx) => {
      const renderReceipt = (r: BiweeklyPayrollRow) => {
        const inss = Math.abs(r.inssDeduction !== undefined ? (r.inssDeduction || 0) : (r.bonuses || 0));
        const totalEarnings = (r.baseSalary || 0) + (r.overtimeAmount || 0) + (r.holidaysAmount || 0);
        const totalDeductions = inss + (r.loanDeduction || 0) + (r.restaurantServiceDeduction || 0) + (r.breakageDeduction || 0);

        return `
          <div class="voucher-box">
            <div class="voucher-header">
              <div class="v-brand">RESTAURANTE EL BODEGÓN</div>
              <div class="v-subtitle">COMPROBANTE INDIVIDUAL DE PAGO DE NÓMINA</div>
              <div class="v-period">${periodLabel}</div>
            </div>

            <div class="employee-meta">
              <div><strong>COLABORADOR:</strong> ${r.name.toUpperCase()}</div>
              <div><strong>CARGO:</strong> ${r.role.toUpperCase()}</div>
            </div>

            <div class="breakdown-grid">
              <div class="col-half">
                <div class="col-title">1. INGRESOS Y HABERES</div>
                <div class="row-line"><span>Salario Quincenal:</span> <span class="font-mono">C$ ${r.baseSalary.toFixed(2)}</span></div>
                ${r.overtimeAmount > 0 ? `<div class="row-line"><span>Horas Extras (${r.overtimeHours.toFixed(1)}h):</span> <span class="font-mono">C$ ${r.overtimeAmount.toFixed(2)}</span></div>` : ''}
                ${r.holidaysAmount > 0 ? `<div class="row-line"><span>Feriados (${r.holidaysCount}d):</span> <span class="font-mono">C$ ${r.holidaysAmount.toFixed(2)}</span></div>` : ''}
                <div class="row-line subtotal"><span>TOTAL INGRESOS:</span> <span class="font-mono">C$ ${totalEarnings.toFixed(2)}</span></div>
              </div>

              <div class="col-half">
                <div class="col-title">2. DEDUCCIONES</div>
                ${inss > 0 ? `<div class="row-line"><span>Deducción INSS:</span> <span class="font-mono">- C$ ${inss.toFixed(2)}</span></div>` : ''}
                ${r.loanDeduction > 0 ? `<div class="row-line"><span>Préstamo:</span> <span class="font-mono">- C$ ${r.loanDeduction.toFixed(2)}</span></div>` : ''}
                ${r.restaurantServiceDeduction > 0 ? `<div class="row-line"><span>Servicio Restaurante:</span> <span class="font-mono">- C$ ${r.restaurantServiceDeduction.toFixed(2)}</span></div>` : ''}
                ${r.breakageDeduction > 0 ? `<div class="row-line"><span>Vajilla / Otros:</span> <span class="font-mono">- C$ ${r.breakageDeduction.toFixed(2)}</span></div>` : ''}
                ${r.breakageNotes ? `<div style="font-size: 10px; font-weight: 800; margin-top: 4px;">Nota: ${r.breakageNotes}</div>` : ''}
                <div class="row-line subtotal"><span>TOTAL DEDUCCIONES:</span> <span class="font-mono">- C$ ${totalDeductions.toFixed(2)}</span></div>
              </div>
            </div>

            <div class="net-banner">
              <span>TOTAL NETO A PAGAR:</span>
              <span class="font-mono font-bold" style="font-size: 18px;">C$ ${r.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div class="signatures-row">
              <div class="sig-col">
                <div class="sig-line"></div>
                <div>FIRMA DEL COLABORADOR</div>
                <div style="font-size: 10px; font-weight: 800;">RECIBÍ CONFORME</div>
              </div>
              <div class="sig-col">
                <div class="sig-line"></div>
                <div>${authorizedBy.toUpperCase()}</div>
                <div style="font-size: 10px; font-weight: 800;">ENTREGADO CONFORME</div>
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
              <span>✂ — — — — — — — — — — — — — — — — — — — LÍNEA DE CORTE — — — — — — — — — — — — — — — — — — — ✂</span>
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
        margin: 6mm 10mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif;
      }
      .letter-page {
        width: 100%;
        max-width: 720px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 6px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      .voucher-box {
        border: 2px solid #000000;
        padding: 10px 14px;
        background: #ffffff;
        height: 430px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .voucher-header {
        text-align: center;
        border-bottom: 2px solid #000000;
        padding-bottom: 4px;
      }
      .v-brand {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.4px;
      }
      .v-subtitle {
        font-size: 11px;
        font-weight: 800;
        margin-top: 1px;
      }
      .v-period {
        font-size: 10px;
        font-weight: 800;
        margin-top: 1px;
      }
      .employee-meta {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        padding: 5px 10px;
        background: #ffffff;
        border: 1.5px solid #000000;
        font-size: 11px;
        font-weight: 800;
      }
      .breakdown-grid {
        display: flex;
        gap: 10px;
        margin: 3px 0;
        flex: 1;
      }
      .col-half {
        flex: 1;
        border: 1.5px solid #000000;
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
      .col-title {
        font-size: 10px;
        font-weight: 900;
        text-align: center;
        border-bottom: 1.5px solid #000000;
        padding-bottom: 3px;
        margin-bottom: 5px;
        background: #ffffff;
      }
      .row-line {
        display: flex;
        justify-content: space-between;
        font-size: 10.5px;
        font-weight: 700;
        margin-bottom: 3px;
      }
      .row-line.subtotal {
        margin-top: auto;
        border-top: 1.5px solid #000000;
        padding-top: 3px;
        font-weight: 900;
        font-size: 11px;
      }
      .net-banner {
        border: 2px solid #000000;
        background: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        margin: 4px 0;
        font-weight: 900;
        font-size: 13px;
      }
      .signatures-row {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding: 0 24px;
      }
      .sig-col {
        width: 200px;
        text-align: center;
        font-size: 10.5px;
        font-weight: 900;
      }
      .sig-line {
        border-top: 1.5px solid #000000;
        margin-bottom: 3px;
      }
      .cut-divider {
        text-align: center;
        font-size: 9.5px;
        font-weight: 900;
        margin: 2px 0;
        user-select: none;
      }
      .font-mono { font-family: "Courier New", Courier, monospace; font-weight: 800; }
      .font-bold { font-weight: 900; }
    </style>

    ${pagesHtml}
  `;

  openPrintWindow(html, `Recibos_Nomina_${period}_${month}_${year}`);
}

/**
 * 3. IMPRESIÓN PLANILLA ESPECIAL (INSS - Hoja Tamaño Carta Horizontal - Alto Contraste B/N)
 */
export function printSpecialPayrollINSS(
  period: PayrollPeriod,
  month: number,
  year: number,
  rawRows: SpecialPayrollRow[]
) {
  const periodLabel = getPeriodLabel(period, month, year);
  const rows = rawRows.map(calculateSpecialPayrollRow);
  const {
    totalSalario,
    totalAguinaldo,
    totalINSSLaboral,
    totalINSSPatronal,
    totalINATEC,
    totalCotiz,
    totalIR,
    totalCostEmpresa,
    totalNeto,
  } = calculateSpecialPayrollTotals(rows);

  const html = `
    <style>
      @page {
        size: letter landscape;
        margin: 4mm 6mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif;
      }
      .sheet-container {
        width: 100%;
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .header-title {
        text-align: center;
        margin-bottom: 5px;
        border-bottom: 2px solid #000000;
        padding-bottom: 3px;
      }
      .header-title h1 {
        margin: 0;
        font-size: 14.5px;
        font-weight: 900;
        letter-spacing: 0.3px;
      }
      .header-title h2 {
        margin: 2px 0 0 0;
        font-size: 11px;
        font-weight: 800;
      }
      .header-title .patronal-badge {
        font-size: 11px;
        font-weight: 900;
        margin-top: 2px;
      }
      table.inss-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 5px;
        border: 1.5px solid #000000;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table.inss-table th, table.inss-table td {
        border: 1px solid #000000;
        padding: 2.5px 3.5px;
        font-size: 9px;
        line-height: 1.15;
        font-weight: 700;
        background: #ffffff !important;
        color: #000000 !important;
      }
      table.inss-table th {
        font-weight: 900;
        font-size: 8.5px;
        border-bottom: 2px solid #000000;
        text-align: center;
        text-transform: uppercase;
        padding: 2.5px 2px;
      }
      .text-right { text-align: right !important; }
      .text-center { text-align: center !important; }
      .font-mono { font-family: "Courier New", Courier, monospace; font-weight: 800 !important; }
      .font-bold { font-weight: 900 !important; }
      .totals-row td {
        font-weight: 900 !important;
        background: #ffffff !important;
        border-top: 2px solid #000000 !important;
        border-bottom: 2px solid #000000 !important;
        font-size: 9.5px !important;
        padding: 2.5px 3.5px !important;
      }
      .summary-box {
        border: 1.5px solid #000000;
        padding: 4px 10px;
        margin-top: 5px;
        font-size: 9.5px;
        font-weight: 800;
        display: flex;
        justify-content: space-around;
        background: #ffffff;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        padding: 0 40px;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .signature-block {
        text-align: center;
        width: 230px;
        border-top: 1.5px solid #000000;
        padding-top: 3px;
        font-weight: 900;
        font-size: 10px;
        line-height: 1.2;
      }
      @media print {
        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .sheet-container {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
    </style>

    <div class="sheet-container">
      <div class="header-title">
        <h1>RESTAURANTE EL BODEGÓN — PLANILLA ESPECIAL (INSS - TAMAÑO CARTA)</h1>
        <h2>CORRESPONDIENTE A LA ${periodLabel}</h2>
        <div class="patronal-badge">REGISTRO PATRONAL No 1550850</div>
      </div>

      <table class="inss-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 24px;">No</th>
            <th rowspan="2" style="width: 80px;">NSS</th>
            <th rowspan="2" style="width: 145px;">Nombres y Apellidos</th>
            <th rowspan="2" style="width: 95px;">Cargo</th>
            <th rowspan="2" style="width: 70px;">Fecha<br>Ingreso</th>
            <th rowspan="2" style="width: 70px;">Salario<br>C$</th>
            <th rowspan="2" style="width: 65px;">Aguinald.<br>(1/12)</th>
            <th colspan="4">Cotización INSS / INATEC</th>
            <th rowspan="2" style="width: 50px;">IR<br>Lab.</th>
            <th rowspan="2" style="width: 80px;">Total a Cargo<br>Bodegón</th>
            <th rowspan="2" style="width: 75px;">Neto a<br>Pagar</th>
            <th rowspan="2" style="width: 105px;">Firma</th>
          </tr>
          <tr>
            <th style="font-size: 9.5px;">Laboral<br>(7%)</th>
            <th style="font-size: 9.5px;">Patronal<br>(21.5%)</th>
            <th style="font-size: 9.5px;">INATEC<br>(2%)</th>
            <th style="font-size: 9.5px;">Total<br>Cotiz.</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, idx) => `
            <tr>
              <td class="text-center font-bold">${idx + 1}</td>
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
            <td class="text-center font-mono">${totalIR.toFixed(2)}</td>
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
          ADMON BODEGÓN<br>
          <span style="font-size: 10.5px; font-weight: 800;">REPRESENTANTE LEGAL / RRHH</span>
        </div>
        <div class="signature-block">
          AUTORIZADO POR<br>
          <span style="font-size: 10.5px; font-weight: 800;">GERENCIA GENERAL EL BODEGÓN</span>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Planilla_Especial_INSS_${period}_${month}_${year}`);
}
