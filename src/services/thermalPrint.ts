import { CashShift, PettyCashShift, PettyCashTransaction, TablewareItem, TablewareLoss } from '../types';

function openPrintWindow(title: string, bodyContent: string): void {
  const printWindow = window.open('', '_blank', 'width=1020,height=920,menubar=no,toolbar=no,location=no,status=no');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes en tu navegador para visualizar e imprimir el reporte A4.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} — Restaurante El Bodegón</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm 12mm 14mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #f1f5f9;
            margin: 0;
            padding: 68px 16px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 11.5px;
            line-height: 1.4;
          }

          /* Barra flotante superior para previsualización */
          .print-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 52px;
            background: #0f172a;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          .toolbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .toolbar-badge {
            background: #d97706;
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            padding: 2px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .toolbar-title {
            font-size: 13px;
            font-weight: 700;
            color: #f8fafc;
          }
          .toolbar-right {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .btn-print {
            background: #059669;
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.35);
            transition: background 0.15s ease;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .btn-print:hover {
            background: #047857;
          }
          .btn-close {
            background: #334155;
            color: #e2e8f0;
            border: none;
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.15s ease;
          }
          .btn-close:hover {
            background: #475569;
            color: #ffffff;
          }

          /* Hoja física A4 */
          .a4-sheet {
            background: #ffffff;
            width: 210mm;
            min-height: 297mm;
            padding: 16mm 18mm;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
            border-radius: 3px;
            position: relative;
            margin-bottom: 24px;
          }

          @media print {
            body {
              background: #ffffff !important;
              padding: 0 !important;
              display: block !important;
            }
            .print-toolbar {
              display: none !important;
            }
            .a4-sheet {
              width: 100% !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }
            table, tr, td, th {
              page-break-inside: avoid;
            }
          }

          /* Componentes de Documento */
          .header-container {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            margin: 0;
            line-height: 1.1;
          }
          .brand-sub {
            font-size: 10.5px;
            font-weight: 800;
            color: #d97706;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 3px;
          }
          .doc-header-right {
            text-align: right;
          }
          .doc-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 3px 8px;
            border-radius: 4px;
            margin-bottom: 4px;
          }
          .doc-title {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.2px;
          }
          .doc-meta {
            font-size: 10.5px;
            color: #475569;
            margin-top: 2px;
          }

          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 14px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 14px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 14px;
          }

          .info-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
          }
          .info-label {
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            display: block;
            margin-bottom: 2px;
          }
          .info-value {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            font-family: monospace;
          }

          .section-title {
            font-size: 11.5px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin: 0 0 6px 0;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            font-size: 10.5px;
          }
          th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.4px;
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            text-align: left;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; }
          .bold { font-weight: bold; }

          .total-card {
            background: #fffbeb;
            border: 1.5px solid #f59e0b;
            border-radius: 10px;
            padding: 12px 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }
          .total-label {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #92400e;
          }
          .total-sub {
            font-size: 10px;
            color: #78350f;
            margin-top: 1px;
          }
          .total-amount {
            font-size: 22px;
            font-weight: 900;
            color: #0f172a;
            font-family: monospace;
            letter-spacing: -0.5px;
          }

          .banner-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 14px;
          }

          .footer-note {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 9.5px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9.5px;
            font-weight: bold;
          }
          .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
          .badge-neutral { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
        </style>
      </head>
      <body>
        <!-- Barra de acciones en pantalla -->
        <div class="print-toolbar no-print">
          <div class="toolbar-left">
            <span class="toolbar-badge">HOJA A4</span>
            <span class="toolbar-title">${title}</span>
          </div>
          <div class="toolbar-right">
            <button onclick="window.print()" class="btn-print" title="Mandar directamente a imprimir en hoja de block A4">
              🖨️ Mandar a Imprimir (A4)
            </button>
            <button onclick="window.close()" class="btn-close">
              ✕ Cerrar
            </button>
          </div>
        </div>

        <!-- Contenedor Hoja A4 -->
        <div class="a4-sheet">
          ${bodyContent}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  // Auto-invocar el diálogo de impresión con un breve retardo para renderizado limpio
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

// ============================================================================
// 1. ACTA DE APERTURA DE CAJA GENERAL (FORMATO HOJA A4)
// ============================================================================
export function printThermalOpeningTicket(shift: CashShift): void {
  const nio = shift.openingNIO;
  const usd = shift.openingUSD;
  const loy = shift.loyverseValidation;

  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Control de Operaciones</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">DOCUMENTO OFICIAL A4</span>
        <h2 class="doc-title">Acta de Apertura de Caja General</h2>
        <div class="doc-meta">Auditoría Física de Gaveta & Conciliación</div>
      </div>
    </div>

    <!-- Parámetros del Turno -->
    <div class="grid-4">
      <div class="info-box">
        <span class="info-label">Fecha del Turno</span>
        <span class="info-value">${shift.date}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Hora de Apertura</span>
        <span class="info-value">${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Responsable que Abre</span>
        <span class="info-value">${shift.openedBy}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Tasa de Cambio Oficial</span>
        <span class="info-value">C$ ${shift.exchangeRate.toFixed(2)}</span>
      </div>
    </div>

    <!-- Tablas de Conteo Físico Simétricas (Córdobas y Dólares) -->
    <div class="grid-2">
      <!-- Moneda Nacional Córdobas -->
      <div>
        <div class="section-title">
          <span>💵</span> 1. Moneda Nacional (Córdobas C$)
        </div>
        <table>
          <thead>
            <tr>
              <th>Denominación</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Billete C$ 1,000</td><td class="text-center font-mono">${nio[1000] || 0}</td><td class="text-right font-mono">C$ ${((nio[1000] || 0) * 1000).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 500</td><td class="text-center font-mono">${nio[500] || 0}</td><td class="text-right font-mono">C$ ${((nio[500] || 0) * 500).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 200</td><td class="text-center font-mono">${nio[200] || 0}</td><td class="text-right font-mono">C$ ${((nio[200] || 0) * 200).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 100</td><td class="text-center font-mono">${nio[100] || 0}</td><td class="text-right font-mono">C$ ${((nio[100] || 0) * 100).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 50</td><td class="text-center font-mono">${nio[50] || 0}</td><td class="text-right font-mono">C$ ${((nio[50] || 0) * 50).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 20</td><td class="text-center font-mono">${nio[20] || 0}</td><td class="text-right font-mono">C$ ${((nio[20] || 0) * 20).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 10</td><td class="text-center font-mono">${nio[10] || 0}</td><td class="text-right font-mono">C$ ${((nio[10] || 0) * 10).toFixed(2)}</td></tr>
            <tr><td>Monedas C$ 5, 1, 0.50</td><td class="text-center font-mono">—</td><td class="text-right font-mono">C$ ${(((nio[5] || 0) * 5) + ((nio[1] || 0) * 1) + ((nio[0.5] || 0) * 0.5)).toFixed(2)}</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="2">TOTAL EFECTIVO C$</td>
              <td class="text-right font-mono" style="font-size: 12px;">C$ ${shift.totalOpeningNIO.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Moneda Extranjera Dólares -->
      <div>
        <div class="section-title">
          <span>💵</span> 2. Moneda Extranjera (Dólares USD)
        </div>
        <table>
          <thead>
            <tr>
              <th>Denominación</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Monto USD</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Billete $100</td><td class="text-center font-mono">${usd[100] || 0}</td><td class="text-right font-mono">$ ${((usd[100] || 0) * 100).toFixed(2)}</td></tr>
            <tr><td>Billete $50</td><td class="text-center font-mono">${usd[50] || 0}</td><td class="text-right font-mono">$ ${((usd[50] || 0) * 50).toFixed(2)}</td></tr>
            <tr><td>Billete $20</td><td class="text-center font-mono">${usd[20] || 0}</td><td class="text-right font-mono">$ ${((usd[20] || 0) * 20).toFixed(2)}</td></tr>
            <tr><td>Billete $10</td><td class="text-center font-mono">${usd[10] || 0}</td><td class="text-right font-mono">$ ${((usd[10] || 0) * 10).toFixed(2)}</td></tr>
            <tr><td>Billete $5, $2, $1</td><td class="text-center font-mono">—</td><td class="text-right font-mono">$ ${(((usd[5] || 0) * 5) + ((usd[2] || 0) * 2) + ((usd[1] || 0) * 1)).toFixed(2)}</td></tr>
            <tr style="color: #64748b;"><td>(Conversión a C$)</td><td class="text-center font-mono">x ${shift.exchangeRate.toFixed(2)}</td><td class="text-right font-mono">C$ ${(shift.totalOpeningUSD * shift.exchangeRate).toFixed(2)}</td></tr>
            <tr style="visibility: hidden;"><td>—</td><td>—</td><td>—</td></tr>
            <tr style="visibility: hidden;"><td>—</td><td>—</td><td>—</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="2">TOTAL EFECTIVO USD</td>
              <td class="text-right font-mono" style="font-size: 12px;">$ ${shift.totalOpeningUSD.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Total Gran Fondo Apertura en Gaveta -->
    <div class="total-card">
      <div>
        <div class="total-label">Fondo Neto de Apertura en Gaveta General</div>
        <div class="total-sub">
          ${(shift.openingTransferToPettyCash && shift.openingTransferToPettyCash > 0)
            ? `Conteo Inicial: C$ ${(shift.openingCashCountedNIO || (shift.totalOpeningEquivNIO + shift.openingTransferToPettyCash)).toLocaleString('es-NI', { minimumFractionDigits: 2 })} • (-) Traslado a Caja Chica: -C$ ${shift.openingTransferToPettyCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
            : 'Efectivo Físico Contado en Gaveta (Córdobas C$ + Dólares convertidos a Tasa Oficial)'
          }
        </div>
      </div>
      <div class="total-amount">
        C$ ${shift.totalOpeningEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>

    <!-- Conciliación de Ventas de Ayer según Loyverse POS (Si fue validada) -->
    ${loy && loy.validated ? `
      <div class="banner-box" style="border-color: #cbd5e1; background: #ffffff;">
        <div class="section-title" style="color: #92400e; margin-bottom: 8px;">
          <span>📊</span> 3. Conciliación de Ventas del Día Anterior (Reporte Loyverse POS)
        </div>
        <div class="grid-4" style="margin-bottom: 8px;">
          <div class="info-box">
            <span class="info-label">Efectivo Loyverse</span>
            <span class="info-value">C$ ${(loy.salesCashLoyverse || 0).toFixed(2)}</span>
          </div>
          <div class="info-box">
            <span class="info-label">Tarjetas (BAC, Fico, Banpro, Lafise)</span>
            <span class="info-value">C$ ${(loy.totalCards || 0).toFixed(2)}</span>
          </div>
          <div class="info-box">
            <span class="info-label">PedidosYa</span>
            <span class="info-value">C$ ${(loy.salesPedidosYa || 0).toFixed(2)}</span>
          </div>
          <div class="info-box" style="background: #ecfdf5; border-color: #a7f3d0;">
            <span class="info-label">Gran Total Loyverse</span>
            <span class="info-value" style="color: #065f46; font-size: 14px;">C$ ${(loy.totalLoyverseSales || 0).toFixed(2)}</span>
          </div>
        </div>
        <div style="font-size: 10.5px; color: #64748b;">
          <strong>Desglose Vouchers Tarjetas:</strong> BAC: C$ ${(loy.cardsBAC || 0).toFixed(2)} • Ficohsa: C$ ${(loy.cardsFicohsa || 0).toFixed(2)} • Banpro: C$ ${(loy.cardsBanpro || 0).toFixed(2)} • Lafise: C$ ${(loy.cardsLafise || 0).toFixed(2)}
          ${loy.notes ? `<div style="margin-top: 4px; color: #334155;"><strong>Notas Loyverse:</strong> ${loy.notes}</div>` : ''}
        </div>
      </div>
    ` : ''}

    ${shift.openingNotes ? `
      <div class="info-box" style="margin-bottom: 16px;">
        <span class="info-label">Observaciones de Apertura</span>
        <div style="font-size: 11px; color: #334155;">"${shift.openingNotes}"</div>
      </div>
    ` : ''}

    <div class="footer-note">
      <span>BodegónControl ERP • Documento oficial de apertura A4 • Responsable: ${shift.openedBy}</span>
      <span>Impreso el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow(`Acta de Apertura A4 - ${shift.date}`, content);
}

// ============================================================================
// 2. ACTA DE CIERRE DE CAJA GENERAL (FORMATO HOJA A4)
// ============================================================================
export function printThermalClosingTicket(shift: CashShift): void {
  const nio = shift.closingNIO || shift.openingNIO;
  const usd = shift.closingUSD || shift.openingUSD;

  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Control de Operaciones</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">DOCUMENTO OFICIAL A4</span>
        <h2 class="doc-title">Acta de Cierre de Caja General</h2>
        <div class="doc-meta">Jornada Comercial • Arqueo y Liquidación Nocturna</div>
      </div>
    </div>

    <!-- Metadatos de la Jornada -->
    <div class="grid-4">
      <div class="info-box">
        <span class="info-label">Fecha de Jornada</span>
        <span class="info-value">${shift.date}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Apertura</span>
        <span class="info-value">${shift.openedBy} (${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
      </div>
      <div class="info-box">
        <span class="info-label">Cierre de Caja</span>
        <span class="info-value">${shift.closedBy || 'N/A'} (${shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hora Cierre'})</span>
      </div>
      <div class="info-box">
        <span class="info-label">Tasa de Cambio</span>
        <span class="info-value">C$ ${shift.exchangeRate.toFixed(2)}</span>
      </div>
    </div>

    <!-- 1. Arqueo Físico de Gaveta al Cierre -->
    <div class="grid-2">
      <!-- Moneda Nacional Córdobas -->
      <div>
        <div class="section-title">
          <span>💵</span> 1. Moneda Nacional en Gaveta (C$)
        </div>
        <table>
          <thead>
            <tr>
              <th>Denominación</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Billete C$ 1,000</td><td class="text-center font-mono">${nio[1000] || 0}</td><td class="text-right font-mono">C$ ${((nio[1000] || 0) * 1000).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 500</td><td class="text-center font-mono">${nio[500] || 0}</td><td class="text-right font-mono">C$ ${((nio[500] || 0) * 500).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 200</td><td class="text-center font-mono">${nio[200] || 0}</td><td class="text-right font-mono">C$ ${((nio[200] || 0) * 200).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 100</td><td class="text-center font-mono">${nio[100] || 0}</td><td class="text-right font-mono">C$ ${((nio[100] || 0) * 100).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 50</td><td class="text-center font-mono">${nio[50] || 0}</td><td class="text-right font-mono">C$ ${((nio[50] || 0) * 50).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 20</td><td class="text-center font-mono">${nio[20] || 0}</td><td class="text-right font-mono">C$ ${((nio[20] || 0) * 20).toFixed(2)}</td></tr>
            <tr><td>Billete C$ 10</td><td class="text-center font-mono">${nio[10] || 0}</td><td class="text-right font-mono">C$ ${((nio[10] || 0) * 10).toFixed(2)}</td></tr>
            <tr><td>Monedas C$ 5, 1, 0.50</td><td class="text-center font-mono">—</td><td class="text-right font-mono">C$ ${(((nio[5] || 0) * 5) + ((nio[1] || 0) * 1) + ((nio[0.5] || 0) * 0.5)).toFixed(2)}</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="2">TOTAL EFECTIVO C$</td>
              <td class="text-right font-mono" style="font-size: 12px;">C$ ${(shift.totalClosingNIO || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Moneda Extranjera Dólares -->
      <div>
        <div class="section-title">
          <span>💵</span> 2. Moneda Extranjera en Gaveta ($)
        </div>
        <table>
          <thead>
            <tr>
              <th>Denominación</th>
              <th class="text-center">Cantidad</th>
              <th class="text-right">Monto USD</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Billete $100</td><td class="text-center font-mono">${usd[100] || 0}</td><td class="text-right font-mono">$ ${((usd[100] || 0) * 100).toFixed(2)}</td></tr>
            <tr><td>Billete $50</td><td class="text-center font-mono">${usd[50] || 0}</td><td class="text-right font-mono">$ ${((usd[50] || 0) * 50).toFixed(2)}</td></tr>
            <tr><td>Billete $20</td><td class="text-center font-mono">${usd[20] || 0}</td><td class="text-right font-mono">$ ${((usd[20] || 0) * 20).toFixed(2)}</td></tr>
            <tr><td>Billete $10</td><td class="text-center font-mono">${usd[10] || 0}</td><td class="text-right font-mono">$ ${((usd[10] || 0) * 10).toFixed(2)}</td></tr>
            <tr><td>Billete $5, $2, $1</td><td class="text-center font-mono">—</td><td class="text-right font-mono">$ ${(((usd[5] || 0) * 5) + ((usd[2] || 0) * 2) + ((usd[1] || 0) * 1)).toFixed(2)}</td></tr>
            <tr style="color: #64748b;"><td>(Conversión a C$)</td><td class="text-center font-mono">x ${shift.exchangeRate.toFixed(2)}</td><td class="text-right font-mono">C$ ${((shift.totalClosingUSD || 0) * shift.exchangeRate).toFixed(2)}</td></tr>
            <tr style="visibility: hidden;"><td>—</td><td>—</td><td>—</td></tr>
            <tr style="visibility: hidden;"><td>—</td><td>—</td><td>—</td></tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td colspan="2">TOTAL EFECTIVO USD</td>
              <td class="text-right font-mono" style="font-size: 12px;">$ ${(shift.totalClosingUSD || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- 2. Reparto de Propinas del Turno -->
    <div class="banner-box" style="background: #fff; border-color: #cbd5e1;">
      <div class="section-title" style="color: #d97706; margin-bottom: 8px;">
        <span>🪙</span> 2. Reparto de Propinas de la Noche
      </div>
      <div class="grid-4" style="margin-bottom: 0;">
        <div class="info-box">
          <span class="info-label">Total Propina Recaudada</span>
          <span class="info-value" style="color: #d97706;">C$ ${(shift.totalTipCollected || 0).toFixed(2)}</span>
        </div>
        <div class="info-box">
          <span class="info-label">Personal en Turno</span>
          <span class="info-value">${shift.staffCount || 1} colaboradores</span>
        </div>
        <div class="info-box">
          <span class="info-label">Cuota por Persona</span>
          <span class="info-value" style="color: #d97706;">C$ ${(shift.individualTip || 0).toFixed(2)}</span>
        </div>
        <div class="info-box" style="background: ${shift.tipPaid ? '#ecfdf5' : '#fffbeb'};">
          <span class="info-label">Entrega en Efectivo</span>
          <span class="info-value" style="font-size: 12px; color: ${shift.tipPaid ? '#065f46' : '#92400e'};">
            ${shift.tipPaid ? 'PAGADA EN EFECTIVO ✅' : 'PENDIENTE / APARTADA'}
          </span>
        </div>
      </div>
      ${shift.tipNotes ? `
        <div style="font-size: 10px; color: #475569; margin-top: 6px;">
          <strong>Colaboradores / Detalle:</strong> ${shift.tipNotes}
        </div>
      ` : ''}
    </div>

    <!-- 3. Fondo Final que queda en Gaveta para Mañana -->
    <div class="total-card" style="background: #f0fdf4; border-color: #10b981;">
      <div>
        <div class="total-label" style="color: #065f46;">Fondo Físico en Gaveta para Apertura de Mañana</div>
        <div class="total-sub" style="color: #047857;">Efectivo contado entregado en gaveta (Fondo que corroborará quien abra en el turno siguiente)</div>
      </div>
      <div class="total-amount" style="color: #065f46;">
        C$ ${(shift.actualCashNIO || shift.totalClosingEquivNIO || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>

    ${shift.closingNotes ? `
      <div class="info-box" style="margin-bottom: 16px;">
        <span class="info-label">Observaciones de Cierre</span>
        <div style="font-size: 11px; color: #334155;">"${shift.closingNotes}"</div>
      </div>
    ` : ''}

    <div class="footer-note">
      <span>BodegónControl ERP • Acta oficial de cierre A4 • Responsable: ${shift.closedBy || shift.openedBy}</span>
      <span>Impreso el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow(`Acta de Cierre A4 - ${shift.date}`, content);
}

// ============================================================================
// 3. REPORTE DE COMPRAS Y GASTOS DE CAJA CHICA (FORMATO HOJA A4)
// ============================================================================
export function printThermalDailyExpensesTicket(
  dateStr: string,
  transactions: PettyCashTransaction[],
  currentBalance: number,
  adminName: string
): void {
  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const inflows = transactions.filter((t) => t.type === 'INFLOW');

  const totalCashExpenses = expenses
    .filter((t) => t.method === 'CASH' || !t.method)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalTransferExpenses = expenses
    .filter((t) => t.method === 'TRANSFER')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCardExpenses = expenses
    .filter((t) => t.method === 'CARD')
    .reduce((acc, t) => acc + t.amount, 0);

  const grandTotalExpenses = totalCashExpenses + totalTransferExpenses + totalCardExpenses;
  const totalInflows = inflows.reduce((acc, t) => acc + t.amount, 0);

  // Ordenar cronológicamente para reconstruir el saldo en gaveta paso a paso
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const initialBaseBal = Math.max(0, currentBalance - totalInflows + totalCashExpenses);

  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Compras y Gastos Operativos</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">DOCUMENTO OFICIAL A4</span>
        <h2 class="doc-title">Reporte Diario de Caja Chica</h2>
        <div class="doc-meta">Control, Fondeos y Comprobación de Egresos</div>
      </div>
    </div>

    <!-- Parámetros del Reporte -->
    <div class="${totalInflows > 0 ? 'grid-4' : 'grid-3'}">
      <div class="info-box">
        <span class="info-label">Fecha Comercial</span>
        <span class="info-value">${dateStr}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Emitido por</span>
        <span class="info-value">${adminName}</span>
      </div>
      ${totalInflows > 0 ? `
      <div class="info-box" style="background: #f0fdf4; border-color: #86efac;">
        <span class="info-label">(+) Fondeos / Ingresos</span>
        <span class="info-value" style="color: #047857;">+C$ ${totalInflows.toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="info-box">
        <span class="info-label">(-) Compras / Egresos</span>
        <span class="info-value" style="color: #b91c1c;">-C$ ${grandTotalExpenses.toFixed(2)}</span>
      </div>
    </div>

    <div class="section-title" style="margin-top: 10px;">
      <span>🛒</span> Detalle de Movimientos de Caja Chica (${sorted.length})
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px;">#</th>
          <th style="width: 60px;">Hora</th>
          <th style="width: 130px;">Rubro / Categoría</th>
          <th>Proveedor / Detalle</th>
          <th style="width: 90px;">Comprobante</th>
          <th style="width: 70px;">Medio</th>
          <th style="width: 85px;" class="text-right">Entradas (+)</th>
          <th style="width: 85px;" class="text-right">Salidas (-)</th>
          <th style="width: 90px;" class="text-right">Saldo Gaveta</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.length === 0 ? '<tr><td colspan="9" class="text-center" style="padding: 16px; color: #94a3b8;">No se registraron movimientos en este día.</td></tr>' : ''}
        ${(() => {
          let runningBal = initialBaseBal;
          return sorted.map((tx, idx) => {
            const isIn = tx.type === 'INFLOW';
            const isCash = tx.method === 'CASH' || !tx.method;
            if (isIn) {
              runningBal += tx.amount;
            } else if (isCash) {
              runningBal -= tx.amount;
            }
            return `
              <tr style="${isIn ? 'background-color: #f0fdf4;' : ''}">
                <td class="font-mono text-center" style="color: #64748b;">${idx + 1}</td>
                <td class="font-mono text-center">${new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td><span class="badge badge-neutral">${tx.category}</span></td>
                <td>
                  <span class="bold">${tx.vendor}</span>
                  ${tx.notes ? `<div style="font-size: 9.5px; color: #64748b;">${tx.notes}</div>` : ''}
                </td>
                <td class="font-mono text-center">${tx.receiptNumber ? `<span class="badge" style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;">#${tx.receiptNumber}</span>` : '<span class="badge" style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;">Sin Recibo</span>'}</td>
                <td class="text-center">${isCash ? 'Efectivo' : tx.method === 'CARD' ? 'Tarjeta' : 'Transf.'}</td>
                <td class="text-right font-mono ${isIn ? 'bold' : ''}" style="${isIn ? 'color: #047857;' : 'color: #94a3b8;'}">${isIn ? `+C$ ${tx.amount.toFixed(2)}` : '—'}</td>
                <td class="text-right font-mono ${!isIn ? 'bold' : ''}" style="${!isIn ? 'color: #b91c1c;' : 'color: #94a3b8;'}">${!isIn ? `-C$ ${tx.amount.toFixed(2)}` : '—'}</td>
                <td class="text-right font-mono bold" style="background-color: #fafafa;">C$ ${runningBal.toFixed(2)}</td>
              </tr>
            `;
          }).join('');
        })()}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: bold; color: #334155;">
          <td colspan="6" style="font-size: 11px; text-align: right;">TOTALES ACUMULADOS:</td>
          <td class="text-right font-mono" style="color: #047857; font-size: 11.5px;">+C$ ${totalInflows.toFixed(2)}</td>
          <td class="text-right font-mono" style="color: #b91c1c; font-size: 11.5px;">-C$ ${grandTotalExpenses.toFixed(2)}</td>
          <td class="text-right font-mono bold" style="font-size: 12px; color: #0f172a;">C$ ${currentBalance.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="total-card" style="background: #f8fafc; border-color: #cbd5e1;">
      <div>
        <div class="total-label" style="color: #334155;">Saldo Disponible en Mano al Momento</div>
        <div class="total-sub">Dinero físico en gaveta listo para continuar operando en Caja Chica</div>
      </div>
      <div class="total-amount" style="color: #0f172a;">
        C$ ${currentBalance.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>

    <div class="footer-note">
      <span>BodegónControl ERP • Reporte Oficial A4 de Caja Chica • Responsable: ${adminName}</span>
      <span>Impreso el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow(`Reporte Caja Chica A4 - ${dateStr}`, content);
}

// ============================================================================
// 4. VALE INDIVIDUAL DE COMPRA / GASTO DE CAJA CHICA (FORMATO HOJA A4)
// ============================================================================
export function printThermalSingleExpenseVoucher(tx: PettyCashTransaction): void {
  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Compras y Gastos Operativos</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">COMPROBANTE OFICIAL</span>
        <h2 class="doc-title">Vale de Caja Chica</h2>
        <div class="doc-meta">Folio Único: #${tx.id.slice(-6).toUpperCase()}</div>
      </div>
    </div>

    <div class="total-card" style="margin: 20px 0;">
      <div>
        <div class="total-label">Monto del Comprobante</div>
        <div class="total-sub">Valor pagado y registrado en Caja Chica</div>
      </div>
      <div class="total-amount" style="font-size: 26px; color: #b91c1c;">
        C$ ${tx.amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>

    <div class="grid-2">
      <div class="info-box">
        <span class="info-label">Fecha y Hora</span>
        <span class="info-value">${new Date(tx.date).toLocaleDateString()} — ${new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Rubro / Categoría</span>
        <span class="info-value">${tx.category}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Concepto / Detalle</span>
        <span class="info-value">${tx.vendor}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Factura / Recibo</span>
        <span class="info-value">${tx.receiptNumber ? `#${tx.receiptNumber}` : 'Sin factura física (Compra directa)'}</span>
      </div>
    </div>

    ${tx.notes ? `
      <div class="info-box" style="margin-bottom: 20px;">
        <span class="info-label">Detalle / Justificación del Gasto</span>
        <div style="font-size: 12px; color: #1e293b; padding-top: 2px;">${tx.notes}</div>
      </div>
    ` : ''}

    <div style="margin-top: 40px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
      <div style="border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Entregado Por (Caja Chica)</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${tx.registeredBy}</div>
      </div>
      <div style="border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; color: #1e293b;">Recibido Conforme</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Firma y Cédula</div>
      </div>
    </div>

    <div class="footer-note">
      <span>BodegónControl ERP • Comprobante individual de caja chica • Registrado por: ${tx.registeredBy}</span>
      <span>Generado el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow(`Vale A4 #${tx.id.slice(-6)}`, content);
}

// ============================================================================
// 5. INFORME DE CONTROL DE MENAJE Y ROTURAS (FORMATO HOJA A4)
// ============================================================================
export function printThermalTablewareReport(
  items: TablewareItem[],
  losses: TablewareLoss[],
  adminName: string
): void {
  const totalStock = items.reduce((acc, i) => acc + i.currentStock, 0);
  const totalLossCost = losses.reduce((acc, l) => acc + l.totalCostNIO, 0);

  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Auditoría de Menaje</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">AUDITORÍA FÍSICA A4</span>
        <h2 class="doc-title">Control de Cristalería y Roturas</h2>
        <div class="doc-meta">Informe Periódico de Inventario</div>
      </div>
    </div>

    <div class="grid-3">
      <div class="info-box">
        <span class="info-label">Fecha de Informe</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Auditor Responsable</span>
        <span class="info-value">${adminName}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Total Piezas Físicas</span>
        <span class="info-value">${totalStock} unidades</span>
      </div>
    </div>

    <div class="section-title" style="margin-top: 10px;">
      <span>🍽️</span> Inventario Físico de Cristalería y Vajilla
    </div>
    <table>
      <thead>
        <tr>
          <th>Artículo / Descripción</th>
          <th>Área</th>
          <th class="text-center">Stock Actual</th>
          <th class="text-center">Stock Mínimo</th>
          <th class="text-right">Costo Unit.</th>
          <th class="text-right">Valor en Stock</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((i) => {
          const isLow = i.currentStock <= i.minimumStock;
          return `
            <tr>
              <td class="bold">${i.name}</td>
              <td>${i.area}</td>
              <td class="text-center font-mono bold" style="${isLow ? 'color: #b91c1c;' : ''}">${i.currentStock} ${i.unit}</td>
              <td class="text-center font-mono">${i.minimumStock}</td>
              <td class="text-right font-mono">C$ ${i.unitCostNIO.toFixed(2)}</td>
              <td class="text-right font-mono bold">C$ ${(i.currentStock * i.unitCostNIO).toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="section-title" style="margin-top: 16px; color: #991b1b;">
      <span>⚠️</span> Registro de Roturas y Bajas de Menaje
    </div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Artículo Quebrado</th>
          <th class="text-center">Cantidad</th>
          <th>Motivo</th>
          <th>Reportado por</th>
          <th class="text-right">Pérdida C$</th>
        </tr>
      </thead>
      <tbody>
        ${losses.length === 0 ? '<tr><td colspan="6" class="text-center" style="padding: 12px; color: #94a3b8;">No hay roturas reportadas en el período.</td></tr>' : ''}
        ${losses.map((l) => `
          <tr>
            <td class="font-mono">${new Date(l.date).toLocaleDateString()}</td>
            <td class="bold">${l.itemName}</td>
            <td class="text-center font-mono bold">-${l.quantity}</td>
            <td>${l.reason}</td>
            <td>${l.registeredBy}</td>
            <td class="text-right font-mono bold" style="color: #991b1b;">C$ ${l.totalCostNIO.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr style="background: #fef2f2; font-weight: bold; color: #991b1b;">
          <td colspan="5">TOTAL PÉRDIDA POR ROTURAS</td>
          <td class="text-right font-mono" style="font-size: 13px;">C$ ${totalLossCost.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-note">
      <span>BodegónControl ERP • Reporte de control de menaje A4 • Auditoría: ${adminName}</span>
      <span>Impreso el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow('Reporte de Menaje A4', content);
}

// ============================================================================
// 6. ACTA DE CIERRE DIARIO DE CAJA CHICA (FORMATO HOJA A4)
// ============================================================================
export function printThermalPettyCashClosingAct(
  shift: PettyCashShift,
  transactions: PettyCashTransaction[],
  closedByAdmin: string
): void {
  const isSquared = shift.auditStatus === 'SQUARED';
  const isShortage = shift.auditStatus === 'SHORTAGE';
  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const inflows = transactions.filter((t) => t.type === 'INFLOW');
  const totalInflows = shift.totalInflows !== undefined && shift.totalInflows > 0
    ? shift.totalInflows
    : inflows.reduce((acc, t) => acc + t.amount, 0);

  const cashExpenses = expenses.filter((t) => t.method === 'CASH' || !t.method).reduce((acc, t) => acc + t.amount, 0);
  const transferExpenses = expenses.filter((t) => t.method === 'TRANSFER').reduce((acc, t) => acc + t.amount, 0);
  const cardExpenses = expenses.filter((t) => t.method === 'CARD').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = shift.totalExpenses !== undefined ? shift.totalExpenses : (cashExpenses + transferExpenses + cardExpenses);

  const expectedBalance = shift.expectedBalance !== undefined && shift.expectedBalance > 0
    ? shift.expectedBalance
    : (shift.initialBalance + totalInflows - cashExpenses);

  const content = `
    <div class="header-container">
      <div>
        <h1 class="brand-title">RESTAURANTE EL BODEGÓN</h1>
        <div class="brand-sub">Asador Criollo & Bar • Compras y Gastos Operativos</div>
      </div>
      <div class="doc-header-right">
        <span class="doc-badge">DOCUMENTO OFICIAL A4</span>
        <h2 class="doc-title" style="color: #047857;">Acta de Cierre de Caja Chica</h2>
        <div class="doc-meta">Liquidación de Jornada Diaria</div>
      </div>
    </div>

    <!-- 1. Encabezado de la Jornada -->
    <div class="grid-4">
      <div class="info-box">
        <span class="info-label">Fecha de Jornada</span>
        <span class="info-value">${shift.date}</span>
      </div>
      <div class="info-box">
        <span class="info-label">Apertura por</span>
        <span class="info-value">${shift.openedBy} (${new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
      </div>
      <div class="info-box">
        <span class="info-label">Cierre por</span>
        <span class="info-value">${closedByAdmin || shift.closedBy || 'N/A'} (${shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hora Cierre'})</span>
      </div>
      <div class="info-box" style="${isSquared ? 'border-color: #86efac; background: #f0fdf4;' : 'border-color: #fca5a5; background: #fff1f2;'}">
        <span class="info-label">Diagnóstico de Cuadre</span>
        <span class="info-value" style="color: ${isSquared ? '#15803d' : '#b91c1c'}; font-size: 13px;">
          ${isSquared ? 'CUADRADO EXACTO ✅' : isShortage ? 'FALTANTE 🔴' : 'SOBRANTE 🔵'}
        </span>
      </div>
    </div>

    <!-- 2. Composición del Fondo de Apertura y Fondeos del Día -->
    <div class="banner-box" style="background: #ffffff;">
      <div class="section-title" style="color: #0f172a; margin-bottom: 8px;">
        <span>💼</span> 1. Balance y Liquidación del Fondo de Caja Chica
      </div>
      <div class="grid-3" style="margin-bottom: 8px;">
        <div class="info-box">
          <span class="info-label">1. Fondo Día Anterior</span>
          <div class="info-value">C$ ${shift.previousDayRemaining.toFixed(2)}</div>
          <span style="font-size: 9.5px; color: #64748b;">Sobrante contado de ayer</span>
        </div>
        <div class="info-box">
          <span class="info-label">2. Traslado de General</span>
          <div class="info-value" style="color: #047857;">+C$ ${shift.generalCashTransfer.toFixed(2)}</div>
          <span style="font-size: 9.5px; color: #64748b;">Traslado desde Caja General</span>
        </div>
        <div class="info-box">
          <span class="info-label">3. Aporte Extra de Apertura</span>
          <div class="info-value" style="color: #047857;">+C$ ${shift.bossContribution.toFixed(2)}</div>
          <span style="font-size: 9.5px; color: #64748b;">Aporte directo del Jefe</span>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 0;">
        <div class="info-box" style="background: #f8fafc;">
          <span class="info-label">Fondo Inicial Base</span>
          <div class="info-value">C$ ${shift.initialBalance.toFixed(2)}</div>
        </div>
        ${totalInflows > 0 ? `
        <div class="info-box" style="background: #f0fdf4; border-color: #86efac;">
          <span class="info-label">(+) Fondeos Extras Hoy</span>
          <div class="info-value" style="color: #047857;">+C$ ${totalInflows.toFixed(2)}</div>
          <span style="font-size: 9px; color: #065f46;">Ingresos extras a gaveta</span>
        </div>
        ` : `
        <div class="info-box" style="background: #f8fafc;">
          <span class="info-label">Total Ingresado</span>
          <div class="info-value">C$ ${(shift.initialBalance + totalInflows).toFixed(2)}</div>
        </div>
        `}
        <div class="info-box" style="background: #f8fafc;">
          <span class="info-label">(-) Egresos Efectivo</span>
          <div class="info-value" style="color: #b91c1c;">-C$ ${cashExpenses.toFixed(2)}</div>
          <span style="font-size: 9px; color: #64748b;">Salidas físicas gaveta</span>
        </div>
        <div class="info-box" style="background: #ecfdf5; border-color: #a7f3d0;">
          <span class="info-label">Saldo Teórico Gaveta</span>
          <div class="info-value" style="color: #065f46; font-size: 14px;">C$ ${expectedBalance.toFixed(2)}</div>
        </div>
      </div>
    </div>

    <!-- 3. Arqueo Físico de Gaveta -->
    <div class="banner-box" style="background: #f8fafc; border-color: #cbd5e1;">
      <div class="section-title" style="margin-bottom: 8px;">
        <span>🔍</span> 2. Arqueo Físico de Gaveta al Cierre
      </div>
      <div class="grid-3" style="margin-bottom: 6px;">
        <div class="info-box">
          <span class="info-label">Saldo Teórico Calculado</span>
          <div class="info-value">C$ ${expectedBalance.toFixed(2)}</div>
        </div>
        <div class="info-box" style="background: #eff6ff; border-color: #93c5fd;">
          <span class="info-label">Efectivo Físico Contado</span>
          <div class="info-value" style="color: #1d4ed8; font-size: 15px;">C$ ${(shift.actualCashCounted || 0).toFixed(2)}</div>
        </div>
        <div class="info-box" style="${isSquared ? 'border-color: #86efac; background: #f0fdf4;' : 'border-color: #fca5a5; background: #fff1f2;'}">
          <span class="info-label">Diferencia de Cuadre</span>
          <div class="info-value" style="color: ${isSquared ? '#15803d' : '#b91c1c'}; font-size: 14px;">
            ${isSquared ? 'C$ 0.00 (EXACTO)' : `C$ ${(shift.difference || 0).toFixed(2)} ${isShortage ? '(FALTANTE)' : '(SOBRANTE)'}`}
          </div>
        </div>
      </div>
      <div style="font-size: 10px; color: #475569;">
        📌 <strong>Importante:</strong> El efectivo físico de <strong>C$ ${(shift.actualCashCounted || 0).toFixed(2)}</strong> queda guardado como el saldo esperado para ser corroborado en la apertura de mañana.
      </div>
    </div>

    <!-- 4. Detalle Completo de Movimientos (Idéntico al Cuadro en Vivo) -->
    <div class="section-title">
      <span>📋</span> 3. Detalle Completo de Movimientos de la Jornada (${transactions.length})
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Hora</th>
          <th style="width: 32%;">Concepto / Detalle</th>
          <th style="width: 14%;">Rubro</th>
          <th style="width: 12%;">Medio</th>
          <th style="width: 11%;" class="text-right">Entradas (+)</th>
          <th style="width: 11%;" class="text-right">Salidas (-)</th>
          <th style="width: 10%;" class="text-right">Saldo (C$)</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.length === 0 ? '<tr><td colspan="7" class="text-center" style="padding: 14px; color: #94a3b8;">No hubo movimientos en esta jornada.</td></tr>' : ''}
        ${(() => {
          let runningSaldoAct = shift.initialBalance;
          const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          return sorted.map((tx) => {
            const isIn = tx.type === 'INFLOW';
            const isCash = tx.method === 'CASH' || !tx.method;
            if (isIn) {
              runningSaldoAct += tx.amount;
            } else if (isCash) {
              runningSaldoAct -= tx.amount;
            }
            return `
              <tr style="${isIn ? 'background-color: #f0fdf4;' : ''}">
                <td class="font-mono text-center">${new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="bold">${tx.vendor} ${tx.notes ? `<div style="font-size: 9.5px; font-weight: normal; color: #64748b;">${tx.notes}</div>` : ''}</td>
                <td><span class="badge badge-neutral">${tx.category}</span></td>
                <td>${isCash ? 'Efectivo' : tx.method === 'CARD' ? 'Tarjeta' : 'Transf.'}</td>
                <td class="text-right font-mono ${isIn ? 'bold' : ''}" style="${isIn ? 'color: #047857;' : 'color: #94a3b8;'}">${isIn ? `+C$ ${tx.amount.toFixed(2)}` : '—'}</td>
                <td class="text-right font-mono ${!isIn ? 'bold' : ''}" style="${!isIn ? 'color: #b91c1c;' : 'color: #94a3b8;'}">${!isIn ? `-C$ ${tx.amount.toFixed(2)}` : '—'}</td>
                <td class="text-right font-mono bold" style="background-color: #fafafa;">C$ ${runningSaldoAct.toFixed(2)}</td>
              </tr>
            `;
          }).join('');
        })()}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: bold; color: #475569; border-top: 1px solid #e2e8f0;">
          <td colspan="4" style="text-align: right;">TOTALES ACUMULADOS:</td>
          <td class="text-right font-mono" style="color: #047857;">+C$ ${totalInflows.toFixed(2)}</td>
          <td class="text-right font-mono" style="color: #b91c1c;">-C$ ${totalExpenses.toFixed(2)}</td>
          <td class="text-right font-mono bold" style="font-size: 11px;">C$ ${expectedBalance.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${shift.closingNotes ? `
      <div class="info-box" style="margin-bottom: 16px;">
        <span class="info-label">Observaciones de Cierre</span>
        <div style="font-size: 11px; color: #334155;">"${shift.closingNotes}"</div>
      </div>
    ` : ''}

    <div class="footer-note">
      <span>BodegónControl ERP • Acta formal de cierre diario de caja chica A4 • Responsable: ${closedByAdmin || shift.closedBy || shift.openedBy}</span>
      <span>Impreso el ${new Date().toLocaleString()}</span>
    </div>
  `;

  openPrintWindow(`Acta de Cierre Caja Chica - ${shift.date}`, content);
}

// ============================================================================
// 7. ACTA OFICIAL EN BLANCO Y NEGRO (B/N) EN 2 HOJAS PARA ARCHIVO Y FIRMAS
// ============================================================================
export interface OfficialActTransaction {
  id?: string;
  hora: string;
  categoria: string;
  concepto: string;
  proveedor: string;
  metodo: string;
  estado?: string;
  referencia?: string;
  monto: number;
  tipo?: 'GASTO' | 'INGRESO' | 'EXPENSE' | 'INFLOW';
  inflow?: number;
  outflow?: number;
  runningBalance?: number;
}

export interface OfficialActPrintData {
  date: string; // YYYY-MM-DD
  modo: 'TODO' | 'GENERAL' | 'CHICA';
  shift?: CashShift;
  // Caja General & Ventas
  salesCash: number;
  cardsBAC: number;
  cardsFicohsa: number;
  cardsBanpro: number;
  cardsLafise: number;
  totalCards: number;
  salesPedidosYa: number;
  totalGross: number;
  netProfit: number;
  marginPercent: number;
  responsableCaja: string;
  observacionesGeneral?: string;
  // Caja Chica & Egresos
  fondoInicial: number;
  totalInflows?: number; // Fondeos / depósitos adicionales en efectivo
  expensesCash: number;
  expensesTransf: number;
  expensesTotal: number;
  saldoRemanente: number;
  pendientesTransf?: number;
  responsableCajaChica?: string;
  observacionesCajaChica?: string;
  // Transacciones detalladas
  transactions: OfficialActTransaction[];
}

export function printOfficialActBN(data: OfficialActPrintData): void {
  try {
    const {
      date,
      modo,
      salesCash,
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      totalGross,
      netProfit,
      marginPercent,
      responsableCaja,
      observacionesGeneral,
      fondoInicial,
      totalInflows = 0,
      expensesCash,
      expensesTransf,
      expensesTotal,
      saldoRemanente,
      pendientesTransf = 0,
      responsableCajaChica = responsableCaja,
      transactions,
    } = data;

    const [y, m, d] = date.split('-').map(Number);
    const fechaObj = new Date(y, m - 1, d);
    const diaSemana = fechaObj.toLocaleDateString('es-NI', { weekday: 'long' });
    const fechaLarga = fechaObj.toLocaleDateString('es-NI', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    const horaEmision = new Date().toLocaleTimeString('es-NI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const cashPct = totalGross > 0 ? ((salesCash / totalGross) * 100).toFixed(1) : '0.0';
    const cardsPct = totalGross > 0 ? ((totalCards / totalGross) * 100).toFixed(1) : '0.0';
    const bacPct = totalGross > 0 ? ((cardsBAC / totalGross) * 100).toFixed(1) : '0.0';
    const ficoPct = totalGross > 0 ? ((cardsFicohsa / totalGross) * 100).toFixed(1) : '0.0';
    const banproPct = totalGross > 0 ? ((cardsBanpro / totalGross) * 100).toFixed(1) : '0.0';
    const lafisePct = totalGross > 0 ? ((cardsLafise / totalGross) * 100).toFixed(1) : '0.0';
    const pedidosYaPct = totalGross > 0 ? ((salesPedidosYa / totalGross) * 100).toFixed(1) : '0.0';

    // Generar filas de movimientos detallados para Hoja 2 (Idéntico al cuadro en vivo)
    let runningSaldoCounter = fondoInicial;
    let totalEntradasAcum = 0;
    let totalSalidasAcum = 0;

    const rowsGastosHtml =
      transactions.length === 0
        ? `<tr><td colspan="9" style="text-align: center; padding: 12px; font-style: italic;">No se registraron movimientos en Caja Chica para este día.</td></tr>`
        : transactions
            .map((g, idx) => {
              const raw = String(g.metodo || '').toUpperCase().trim();
              const isCash = raw === 'EFECTIVO' || raw === 'CASH';
              const isCard = raw === 'TARJETA' || raw === 'CARD';
              const metodoLabel = isCash ? 'Efectivo' : isCard ? 'Tarjeta' : raw === '-' ? '-' : 'Transferencia';
              const estadoLabel = g.estado || (g.referencia ? `#${g.referencia}` : 'Liquidado');

              const isIngreso =
                g.tipo === 'INGRESO' ||
                g.tipo === 'INFLOW' ||
                (g.inflow !== undefined && g.inflow > 0);

              const inflowVal =
                g.inflow !== undefined
                  ? g.inflow
                  : isIngreso
                  ? g.monto
                  : 0;

              const outflowVal =
                g.outflow !== undefined
                  ? g.outflow
                  : !isIngreso
                  ? g.monto
                  : 0;

              if (inflowVal > 0) {
                totalEntradasAcum += inflowVal;
                runningSaldoCounter += inflowVal;
              }

              if (outflowVal > 0) {
                totalSalidasAcum += outflowVal;
                // Sólo salidas en efectivo de gaveta reducen el saldo físico
                if (isCash) {
                  runningSaldoCounter -= outflowVal;
                }
              }

              const rowSaldo =
                g.runningBalance !== undefined ? g.runningBalance : runningSaldoCounter;

              const entradaText =
                inflowVal > 0
                  ? `+C$ ${inflowVal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                  : '—';

              const salidaText =
                outflowVal > 0
                  ? `-C$ ${outflowVal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                  : '—';

              return `
              <tr style="${isIngreso ? 'background-color: #f0fdf4;' : ''}">
                <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
                <td style="text-align: center; font-family: monospace;">${g.hora || '—'}</td>
                <td><strong>${g.concepto}</strong></td>
                <td>${g.categoria || '—'}</td>
                <td style="text-align: center;">${metodoLabel}</td>
                <td style="text-align: center; font-size: 8px;">${estadoLabel}</td>
                <td class="text-right font-mono ${inflowVal > 0 ? 'font-bold' : ''}" style="${inflowVal > 0 ? 'color: #047857;' : 'color: #94a3b8;'}">${entradaText}</td>
                <td class="text-right font-mono ${outflowVal > 0 ? 'font-bold' : ''}" style="${outflowVal > 0 ? 'color: #b91c1c;' : 'color: #94a3b8;'}">${salidaText}</td>
                <td class="text-right font-mono font-bold" style="background-color: #fafafa;">C$ ${Number(rowSaldo).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
            `;
            })
            .join('');

    const printStyles = `
      <style>
        @page {
          size: letter portrait;
          margin: 8mm 12mm 8mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 9.5px;
          line-height: 1.25;
        }
        .print-toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .sheet {
          width: 100%;
          min-height: 97vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          padding-top: 10px;
        }
        .sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .header-box {
          border-bottom: 2px solid #000000;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .brand {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .doc-title {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
          margin-top: 1px;
        }
        .doc-subtitle {
          font-size: 8.5px;
          color: #333333;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          border: 1px solid #000000;
        }
        .meta-table td {
          border: 1px solid #000000;
          padding: 3px 6px;
          font-size: 8.5px;
        }
        .section-title {
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border-bottom: 1px solid #000000;
          padding-bottom: 2px;
          margin: 7px 0 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 8.5px;
        }
        th {
          border: 1px solid #000000;
          background-color: #f2f2f2;
          padding: 3px 5px;
          font-weight: 900;
          font-size: 8.5px;
          text-align: left;
        }
        td {
          border: 1px solid #000000;
          padding: 2.5px 5px;
          font-size: 8.5px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: "Courier New", Courier, monospace; }
        .font-bold { font-weight: bold; }
        .highlight-row {
          background-color: #e6e6e6;
          font-weight: bold;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          gap: 30px;
        }
        .sig-box {
          flex: 1;
          border-top: 1px solid #000000;
          padding-top: 4px;
          text-align: center;
          font-size: 8.5px;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            padding: 0 !important;
          }
          .sheet {
            padding-top: 0 !important;
          }
        }
      </style>
    `;


    const shift = data.shift;
    const openingEquiv = shift?.totalOpeningEquivNIO || 0;
    const closingEquiv = shift?.totalClosingEquivNIO || shift?.actualCashNIO || 0;
    const expectedNIO = shift?.expectedCashNIO || 0;
    const actualNIO = shift?.actualCashNIO || closingEquiv;
    const diffNIO = shift?.differenceNIO !== undefined ? shift.differenceNIO : (actualNIO - expectedNIO);
    const auditStatus = shift?.auditStatus || (diffNIO === 0 ? 'SQUARED' : diffNIO > 0 ? 'SURPLUS' : 'SHORTAGE');

    const closingNIO = (shift?.closingNIO || {}) as Record<string | number, number>;
    const closingUSD = (shift?.closingUSD || {}) as Record<string | number, number>;

    const transferPetty = shift?.transferToPettyCash || 0;
    const overtimeCash = shift?.overtimePaidCash || 0;
    const extraDaysCash = shift?.extraDaysPaidCash || 0;
    const reserveDGI = shift?.reserveDGI || 0;
    const reservePayroll = shift?.reservePayroll || 0;
    const reserveVacations = shift?.reserveVacations || 0;
    const reserveSnyder = shift?.reserveSnyder || 0;
    const totalWithdrawals = shift?.totalWithdrawals || (transferPetty + overtimeCash + extraDaysCash + reserveDGI + reservePayroll + reserveVacations + reserveSnyder);

    const tipCollected = shift?.totalTipCollected || 0;
    const staffCount = shift?.staffCount || 0;
    const individualTip = shift?.individualTip || 0;
    const tipPaid = shift?.tipPaid;

    // Filas compactas de denominaciones de cierre
    const nioRows = [
      { l: '1000', v: 1000, q: closingNIO[1000] || 0 },
      { l: '500', v: 500, q: closingNIO[500] || 0 },
      { l: '200', v: 200, q: closingNIO[200] || 0 },
      { l: '100', v: 100, q: closingNIO[100] || 0 },
      { l: '50', v: 50, q: closingNIO[50] || 0 },
      { l: '20', v: 20, q: closingNIO[20] || 0 },
      { l: '10', v: 10, q: closingNIO[10] || 0 },
      { l: 'Monedas', v: 1, q: (closingNIO[5] || 0) * 5 + (closingNIO[1] || 0) + (closingNIO[0.5] || 0) * 0.5 },
    ];
    const usdRows = [
      { l: '100', v: 100, q: closingUSD[100] || 0 },
      { l: '50', v: 50, q: closingUSD[50] || 0 },
      { l: '20', v: 20, q: closingUSD[20] || 0 },
      { l: '10', v: 10, q: closingUSD[10] || 0 },
      { l: '5', v: 5, q: closingUSD[5] || 0 },
      { l: '2/1', v: 1, q: (closingUSD[2] || 0) * 2 + (closingUSD[1] || 0) },
    ];

    // HOJA 1: CAJA GENERAL & VENTAS
    const sheet1Html = `
      <div class="sheet">
        <div>
          <div class="header-box">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div class="brand">EL BODEGÓN RESTAURANTE & BAR</div>
                <div class="doc-title">ACTA OFICIAL DE CIERRE Y CONCILIACIÓN DE CAJA</div>
                <div class="doc-subtitle">ARQUEO FÍSICO, CONCILIACIÓN MULTIBANCO, DEDUCCIONES & AUDITORÍA</div>
              </div>
              <div style="text-align: right; font-size: 8.5px; font-family: monospace;">
                <div>DOC. OFICIAL N° <strong>CG-${date.replace(/-/g, '')}</strong></div>
                <div>EMISIÓN: ${horaEmision}</div>
              </div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 25%;"><strong>FECHA CONTABLE:</strong><br>${diaSemanaCap}, ${fechaLarga}</td>
              <td style="width: 25%;"><strong>RESP. CIERRE:</strong><br>${responsableCaja}</td>
              <td style="width: 25%;"><strong>FONDO APERTURA:</strong><br>C$ ${openingEquiv.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              <td style="width: 25%;"><strong>TOTAL POS DATAFAST:</strong><br>C$ ${totalCards.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td><strong>VENTAS EN EFECTIVO:</strong><br>C$ ${salesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              <td><strong>VENTAS BRUTAS TOTALES:</strong><br><strong>C$ ${totalGross.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
              <td><strong>EFECTIVO FÍSICO GAVETA:</strong><br><strong>C$ ${actualNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
              <td><strong>RESULTADO ARQUEO:</strong><br><strong style="font-size: 9.5px;">${auditStatus === 'SQUARED' || diffNIO === 0 ? '✓ CUADRADO EXACTO' : diffNIO > 0 ? `▲ SOBRANTE (+C$ ${diffNIO.toFixed(2)})` : `▼ FALTANTE (-C$ ${Math.abs(diffNIO).toFixed(2)})`}</strong></td>
            </tr>
          </table>

          <!-- 1. VENTAS POR CANAL -->
          <div class="section-title">1. VENTAS POR CANAL Y CONCILIACIÓN MULTIBANCO</div>
          <table>
            <thead>
              <tr>
                <th style="width: 24%;">CANAL DE PAGO</th>
                <th style="width: 44%;">ENTIDAD / DESGLOSE</th>
                <th style="width: 20%;" class="text-right">MONTO (C$)</th>
                <th style="width: 12%;" class="text-right">% TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>💵 Ventas en Efectivo</strong></td>
                <td>Recaudación física en gaveta de caja general</td>
                <td class="text-right font-mono">C$ ${salesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${cashPct}%</td>
              </tr>
              <tr>
                <td rowspan="4"><strong>💳 Tarjetas POS (Datafast)</strong></td>
                <td>POS BAC Credomatic</td>
                <td class="text-right font-mono">C$ ${cardsBAC.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${bacPct}%</td>
              </tr>
              <tr>
                <td>POS Banco Ficohsa</td>
                <td class="text-right font-mono">C$ ${cardsFicohsa.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${ficoPct}%</td>
              </tr>
              <tr>
                <td>POS Banpro Grupo Promerica</td>
                <td class="text-right font-mono">C$ ${cardsBanpro.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${banproPct}%</td>
              </tr>
              <tr>
                <td>POS Banco LAFISE Bancentro</td>
                <td class="text-right font-mono">C$ ${cardsLafise.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${lafisePct}%</td>
              </tr>
              <tr style="background-color: #fafafa;">
                <td colspan="2" style="text-align: right; padding-right: 8px;"><strong>SUBTOTAL TODAS LAS TARJETAS POS:</strong></td>
                <td class="text-right font-mono font-bold">C$ ${totalCards.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono font-bold">${cardsPct}%</td>
              </tr>
              <tr>
                <td><strong>🛵 Delivery PedidosYa</strong></td>
                <td>Despachos de pedidos por aplicación digital externa</td>
                <td class="text-right font-mono">C$ ${salesPedidosYa.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono">${pedidosYaPct}%</td>
              </tr>
              <tr class="highlight-row">
                <td colspan="2"><strong>TOTAL VENTAS BRUTAS FACTURADAS DEL DÍA</strong></td>
                <td class="text-right font-mono" style="font-size: 10px;"><strong>C$ ${totalGross.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
                <td class="text-right font-mono"><strong>100.0%</strong></td>
              </tr>
            </tbody>
          </table>

          <!-- 2 COLUMNAS: ARQUEO FÍSICO VS CONCILIACIÓN DE EFECTIVO -->
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <!-- Columna Izquierda: Arqueo Físico de Billetes -->
            <div style="flex: 1;">
              <div class="section-title">2. ARQUEO FÍSICO DE GAVETA AL CIERRE</div>
              <table>
                <thead>
                  <tr>
                    <th>DENOM.</th>
                    <th class="text-center">CANT</th>
                    <th class="text-right">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${nioRows
                    .map(
                      (r) => `
                    <tr>
                      <td>C$ ${r.l}</td>
                      <td class="text-center font-mono">${r.q}</td>
                      <td class="text-right font-mono">C$ ${(r.l === 'Monedas' ? r.q : r.q * r.v).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  <tr style="background-color: #fafafa; font-weight: bold;">
                    <td colspan="2">Subtotal Córdobas (NIO):</td>
                    <td class="text-right font-mono">C$ ${(shift?.totalClosingNIO || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  ${usdRows
                    .map(
                      (r) => `
                    <tr>
                      <td>US$ ${r.l}</td>
                      <td class="text-center font-mono">${r.q}</td>
                      <td class="text-right font-mono">$ ${(r.l === '2/1' ? r.q : r.q * r.v).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  <tr style="background-color: #fafafa; font-weight: bold;">
                    <td colspan="2">Subtotal Dólares (USD):</td>
                    <td class="text-right font-mono">$ ${(shift?.totalClosingUSD || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr class="highlight-row">
                    <td colspan="2"><strong>TOTAL FÍSICO GAVETA (C$)</strong></td>
                    <td class="text-right font-mono font-bold" style="font-size: 9.5px;">C$ ${actualNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Columna Derecha: Conciliación, Salidas y Propinas -->
            <div style="flex: 1.1;">
              <div class="section-title">3. CONCILIACIÓN DE EFECTIVO & AUDITORÍA</div>
              <table>
                <tbody>
                  <tr>
                    <td>(+) Fondo Inicial de Apertura</td>
                    <td class="text-right font-mono">C$ ${openingEquiv.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td>(+) Ventas en Efectivo del Día</td>
                    <td class="text-right font-mono">C$ ${salesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td>(-) Total Salidas y Deducciones</td>
                    <td class="text-right font-mono">- C$ ${totalWithdrawals.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style="background-color: #fafafa; font-weight: bold;">
                    <td>(=) Efectivo Teórico Esperado</td>
                    <td class="text-right font-mono">C$ ${expectedNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style="background-color: #fafafa; font-weight: bold;">
                    <td>Efectivo Físico Real Contado</td>
                    <td class="text-right font-mono">C$ ${actualNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr class="highlight-row" style="font-size: 9.5px;">
                    <td><strong>DIFERENCIA EXACTA DE CUADRE:</strong></td>
                    <td class="text-right font-mono font-bold">
                      ${diffNIO === 0 ? 'C$ 0.00 (EXACTO)' : diffNIO > 0 ? `+C$ ${diffNIO.toFixed(2)} (SOBRANTE)` : `-C$ ${Math.abs(diffNIO).toFixed(2)} (FALTANTE)`}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title" style="margin-top: 4px;">4. DEDUCCIONES, TRASLADOS Y RESERVAS</div>
              <table>
                <tbody>
                  <tr>
                    <td>Traslado a Caja Chica: C$ ${transferPetty.toFixed(2)}</td>
                    <td>Horas Extras Efectivo: C$ ${overtimeCash.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Reserva Tributaria DGI: C$ ${reserveDGI.toFixed(2)}</td>
                    <td>Reserva Planilla: C$ ${reservePayroll.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>Reserva Vacaciones: C$ ${reserveVacations.toFixed(2)}</td>
                    <td>Retiro Socios / Snyder: C$ ${reserveSnyder.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #fafafa; font-weight: bold;">
                    <td>TOTAL RETIROS Y RESERVAS:</td>
                    <td class="text-right font-mono">C$ ${totalWithdrawals.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              <div class="section-title" style="margin-top: 4px;">5. PROPINAS DEL TURNO</div>
              <table>
                <tbody>
                  <tr>
                    <td>Total Recaudado: <strong>C$ ${tipCollected.toFixed(2)}</strong></td>
                    <td>Personal: <strong>${staffCount} pers.</strong></td>
                    <td>Individual: <strong>C$ ${individualTip.toFixed(2)}</strong></td>
                    <td>Estado: <strong>${tipPaid ? 'PAGADA' : 'PENDIENTE'}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title" style="margin-top: 4px;">6. OBSERVACIONES / AUDITORÍA CONTABLE</div>
          <div style="border: 1px solid #000; padding: 3px 6px; font-size: 8px; min-height: 22px; background-color: #fff;">
            ${observacionesGeneral || shift?.closingNotes || 'Turno cerrado y conciliado conforme a los registros oficiales del sistema Bodegón Control.'}
          </div>
        </div>

        <div>
          <div style="font-size: 7.5px; color: #444; margin-bottom: 4px; text-align: center;">
            El presente documento constituye fe pública del cierre financiero del turno. Cualquier discrepancia debe reportarse a Gerencia de inmediato.
          </div>
          <div class="signatures">
            <div class="sig-box">
              <div style="height: 20px;"></div>
              <div>
                <strong>CAJERO(A) / ENTREGA TURNO</strong><br>
                <span style="font-size: 7.5px;">Nombre: ${responsableCaja}</span><br>
                <span style="font-size: 7.5px;">Firma: ________________________</span>
              </div>
            </div>
            <div class="sig-box">
              <div style="height: 20px;"></div>
              <div>
                <strong>ADMINISTRADOR(A) / AUDITOR</strong><br>
                <span style="font-size: 7.5px;">Revisado Conforme</span><br>
                <span style="font-size: 7.5px;">Firma: ________________________</span>
              </div>
            </div>
            <div class="sig-box">
              <div style="height: 20px;"></div>
              <div>
                <strong>GERENCIA GENERAL</strong><br>
                <span style="font-size: 7.5px;">Visto Bueno y Aprobación</span><br>
                <span style="font-size: 7.5px;">Firma y Sello: _________________</span>
              </div>
            </div>
          </div>
          <div style="font-size: 7.5px; color: #666; text-align: center; margin-top: 4px;">
            El Bodegón Restaurante & Bar • Documento Oficial B/N • ${modo === 'TODO' ? 'Página 1 de 2' : 'Página 1 de 1'}
          </div>
        </div>
      </div>
    `;

    // HOJA 2: CAJA CHICA & GASTOS DETALLADOS
    const sheet2Html = `
      <div class="sheet">
        <div>
          <div class="header-box">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div class="brand">EL BODEGÓN RESTAURANTE & BAR</div>
                <div class="doc-title">REPORTE DETALLADO DE COMPRAS, GASTOS & CAJA CHICA</div>
                <div class="doc-subtitle">CONTROL DIARIO DE INSUMOS, PROVEEDORES Y COMPROBANTES</div>
              </div>
              <div style="text-align: right; font-size: 8.5px; font-family: monospace;">
                <div>DOC. OFICIAL N° <strong>CC-${date.replace(/-/g, '')}</strong></div>
                <div>EMISIÓN: ${horaEmision}</div>
              </div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 25%;"><strong>FECHA CONTABLE:</strong><br>${diaSemanaCap}, ${fechaLarga}</td>
              <td style="width: 25%;"><strong>TOTAL MOVIMIENTOS:</strong><br>${transactions.length} registros contables</td>
              <td style="width: 25%;"><strong>RESPONSABLE:</strong><br>${responsableCajaChica}</td>
              <td style="width: 25%;"><strong>PAGOS EN EFECTIVO:</strong><br>C$ ${expensesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td><strong>FONDO INICIAL ASIGNADO:</strong><br>C$ ${fondoInicial.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              <td><strong>DEPÓSITOS / FONDEOS EXTRAS:</strong><br>C$ ${(totalInflows || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              <td><strong>TRANSFERENCIAS BANCARIAS:</strong><br>C$ ${expensesTransf.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              <td><strong>SALDO RESTANTE EN GAVETA:</strong><br><strong style="font-size: 10px;">C$ ${saldoRemanente.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          </table>

          <div class="section-title">1. BALANCE Y LIQUIDACIÓN DEL FONDO DE CAJA CHICA</div>
          <table>
            <thead>
              <tr>
                <th>CONCEPTO DE FONDO Y MOVIMIENTOS</th>
                <th style="width: 25%;" class="text-right">IMPORTE (C$)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>(+) Fondo Inicial de Caja Chica Asignado para el Turno</td>
                <td class="text-right font-mono">C$ ${fondoInicial.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${(totalInflows && totalInflows > 0) ? `
              <tr>
                <td>(+) Depósitos y Fondeos Adicionales en Efectivo (Ingresos a Gaveta)</td>
                <td class="text-right font-mono font-bold" style="color: #047857;">+ C$ ${totalInflows.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background-color: #f8fafc; font-weight: 600;">
                <td>(=) Total Efectivo Ingresado a Caja Chica (Fondo + Fondeos)</td>
                <td class="text-right font-mono">C$ ${(fondoInicial + totalInflows).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              <tr>
                <td>(-) Total Compras y Gastos Pagados en Efectivo (Salidas de Gaveta)</td>
                <td class="text-right font-mono">- C$ ${expensesCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style="background-color: #fafafa; font-weight: bold;">
                <td>(=) SALDO EFECTIVO RESTANTE EN GAVETA FÍSICA</td>
                <td class="text-right font-mono" style="font-size: 10px;">C$ ${saldoRemanente.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>(+) Facturas y Compras Pagadas mediante Transferencia Bancaria</td>
                <td class="text-right font-mono">C$ ${expensesTransf.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="highlight-row">
                <td><strong>TOTAL GENERAL DE EGRESOS DEL DÍA (EFECTIVO + TRANSFERENCIAS)</strong></td>
                <td class="text-right font-mono" style="font-size: 10px;"><strong>C$ ${expensesTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">2. RELACIÓN DETALLADA DE MOVIMIENTOS, COMPRAS Y GASTOS (CUADRO EN VIVO)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">#</th>
                <th style="width: 8%; text-align: center;">HORA</th>
                <th style="width: 28%;">CONCEPTO / DETALLE EXACTO</th>
                <th style="width: 14%;">CATEGORÍA</th>
                <th style="width: 10%; text-align: center;">MÉTODO</th>
                <th style="width: 9%; text-align: center;">COMPROBANTE</th>
                <th style="width: 9%;" class="text-right">ENTRADAS (+)</th>
                <th style="width: 9%;" class="text-right">SALIDAS (-)</th>
                <th style="width: 9%;" class="text-right">SALDO (C$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsGastosHtml}
              <tr class="highlight-row">
                <td colspan="6" style="text-align: right; font-weight: bold;">TOTALES DEL DÍA:</td>
                <td class="text-right font-mono font-bold" style="color: #047857; font-size: 9.5px;">+C$ ${(totalInflows || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono font-bold" style="color: #b91c1c; font-size: 9.5px;">-C$ ${expensesTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                <td class="text-right font-mono font-bold" style="font-size: 9.5px;">C$ ${saldoRemanente.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div style="font-size: 7.5px; color: #444; margin-bottom: 4px; text-align: center;">
            Certifico que cada una de las compras detalladas cuenta con factura, ticket o voucher bancario físico resguardado en archivo.
          </div>
          <div class="signatures">
            <div class="sig-box">
              <div style="height: 20px;"></div>
              <div>
                <strong>RESPONSABLE DE COMPRAS / CAJA CHICA</strong><br>
                <span style="font-size: 7.5px;">Elaborado por: ${responsableCajaChica}</span><br>
                <span style="font-size: 7.5px;">Firma de Conformidad: ___________________</span>
              </div>
            </div>
            <div class="sig-box">
              <div style="height: 20px;"></div>
              <div>
                <strong>GERENCIA / AUDITORÍA CONTABLE</strong><br>
                <span style="font-size: 7.5px;">Revisado y Aprobado</span><br>
                <span style="font-size: 7.5px;">Firma y Sello: ________________________</span>
              </div>
            </div>
          </div>
          <div style="font-size: 7.5px; color: #666; text-align: center; margin-top: 4px;">
            El Bodegón Restaurante & Bar • Documento Oficial B/N • ${modo === 'TODO' ? 'Página 2 de 2' : 'Página 1 de 1'}
          </div>
        </div>
      </div>
    `;

    let docBody = '';
    if (modo === 'TODO') {
      docBody = `${sheet1Html}${sheet2Html}`;
    } else if (modo === 'GENERAL') {
      docBody = sheet1Html;
    } else if (modo === 'CHICA') {
      docBody = sheet2Html;
    }

    const title =
      modo === 'TODO'
        ? `Acta Completa B/N - ${date}`
        : modo === 'GENERAL'
        ? `Acta Caja General B/N - ${date}`
        : `Acta Caja Chica B/N - ${date}`;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} — El Bodegón</title>
        ${printStyles}
      </head>
      <body>
        <div class="print-toolbar no-print">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #000; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 11px;">B/N OFICIAL</span>
            <span style="font-weight: bold; font-size: 13px; color: #fff;">${title}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="background: #059669; color: #fff; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Mandar a Imprimir</button>
            <button onclick="window.close()" style="background: #475569; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">✕ Cerrar</button>
          </div>
        </div>

        <div style="padding: 56px 16px 20px;" class="no-print-padding">
          ${docBody}
        </div>

        <script>
          setTimeout(function() {
            window.focus();
            window.print();
          }, 350);
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=900,menubar=no,toolbar=no,location=no,status=no');
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      window.print();
    }
  } catch (err: any) {
    alert('Error generando impresión oficial: ' + err.message);
  }
}

// ============================================================================
// ACTA OFICIAL DE APERTURA Y ENTREGA DE FONDO DE CAJA (A4 / B&N)
// ============================================================================
export function printOfficialOpeningActBN(shift: CashShift, adminName?: string): void {
  try {
    const date = shift.date;
    const [y, m, d] = date.split('-').map(Number);
    const fechaObj = new Date(y, m - 1, d);
    const diaSemana = fechaObj.toLocaleDateString('es-NI', { weekday: 'long' });
    const fechaLarga = fechaObj.toLocaleDateString('es-NI', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    const horaApertura = new Date(shift.openedAt).toLocaleTimeString('es-NI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const nioRows = [
      { l: '1,000', v: 1000, q: shift.openingNIO[1000] || 0 },
      { l: '500', v: 500, q: shift.openingNIO[500] || 0 },
      { l: '200', v: 200, q: shift.openingNIO[200] || 0 },
      { l: '100', v: 100, q: shift.openingNIO[100] || 0 },
      { l: '50', v: 50, q: shift.openingNIO[50] || 0 },
      { l: '20', v: 20, q: shift.openingNIO[20] || 0 },
      { l: '10', v: 10, q: shift.openingNIO[10] || 0 },
      { l: 'Monedas de 5', v: 5, q: shift.openingNIO[5] || 0 },
      { l: 'Monedas de 1', v: 1, q: shift.openingNIO[1] || 0 },
      { l: 'Monedas de 0.50', v: 0.5, q: shift.openingNIO[0.5] || 0 },
    ];

    const usdRows = [
      { l: '100', v: 100, q: shift.openingUSD[100] || 0 },
      { l: '50', v: 50, q: shift.openingUSD[50] || 0 },
      { l: '20', v: 20, q: shift.openingUSD[20] || 0 },
      { l: '10', v: 10, q: shift.openingUSD[10] || 0 },
      { l: '5', v: 5, q: shift.openingUSD[5] || 0 },
      { l: '2', v: 2, q: shift.openingUSD[2] || 0 },
      { l: '1', v: 1, q: shift.openingUSD[1] || 0 },
    ];

    const printStyles = `
      <style>
        @page {
          size: letter portrait;
          margin: 8mm 12mm 8mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 9.5px;
          line-height: 1.25;
        }
        .print-toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 48px;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .sheet {
          width: 100%;
          min-height: 97vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-top: 10px;
        }
        .header-box {
          border-bottom: 2px solid #000000;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .brand {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
        }
        .doc-title {
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
          margin-top: 1px;
        }
        .doc-subtitle {
          font-size: 8.5px;
          color: #333333;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          border: 1px solid #000000;
        }
        .meta-table td {
          border: 1px solid #000000;
          padding: 3.5px 6px;
          font-size: 8.5px;
        }
        .section-title {
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          border-bottom: 1px solid #000000;
          padding-bottom: 2px;
          margin: 7px 0 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
          font-size: 8.5px;
        }
        th {
          border: 1px solid #000000;
          background-color: #f2f2f2;
          padding: 3px 5px;
          font-weight: 900;
          font-size: 8.5px;
          text-align: left;
        }
        td {
          border: 1px solid #000000;
          padding: 2.5px 5px;
          font-size: 8.5px;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: "Courier New", Courier, monospace; }
        .font-bold { font-weight: bold; }
        .highlight-row {
          background-color: #e6e6e6;
          font-weight: bold;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          gap: 40px;
        }
        .sig-box {
          flex: 1;
          border-top: 1px solid #000000;
          padding-top: 4px;
          text-align: center;
          font-size: 8.5px;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0 !important; }
          .sheet { padding-top: 0 !important; }
        }
      </style>
    `;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Acta Oficial de Apertura — El Bodegón</title>
        ${printStyles}
      </head>
      <body>
        <div class="print-toolbar no-print">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #000; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 900; font-size: 11px;">B/N OFICIAL</span>
            <span style="font-weight: bold; font-size: 13px; color: #fff;">Acta Oficial de Apertura y Entrega de Caja</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="background: #059669; color: #fff; border: none; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Mandar a Imprimir</button>
            <button onclick="window.close()" style="background: #475569; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer;">✕ Cerrar</button>
          </div>
        </div>

        <div style="padding: 56px 16px 20px;" class="no-print-padding">
          <div class="sheet">
            <div>
              <div class="header-box">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <div class="brand">RESTAURANTE EL BODEGÓN</div>
                    <div class="doc-title">ACTA OFICIAL DE APERTURA Y ENTREGA DE FONDO DE CAJA</div>
                    <div class="doc-subtitle">ARQUEO INICIAL FÍSICO, RECEPCIÓN CONFORME Y ESTADO OPERATIVO</div>
                  </div>
                  <div style="text-align: right; font-size: 8.5px; font-family: monospace;">
                    <div>DOC. OFICIAL N° <strong>AP-${date.replace(/-/g, '')}</strong></div>
                    <div>HORA APERTURA: ${horaApertura}</div>
                  </div>
                </div>
              </div>

              <table class="meta-table">
                <tr>
                  <td style="width: 25%;"><strong>FECHA CONTABLE:</strong><br>${diaSemanaCap}, ${fechaLarga}</td>
                  <td style="width: 25%;"><strong>ENTREGADO POR:</strong><br>${adminName || shift.openedBy} (Administración)</td>
                  <td style="width: 25%;"><strong>RECIBIDO POR:</strong><br>${shift.openedBy} (Cajero/a en Turno)</td>
                  <td style="width: 25%;"><strong>TASA DE CAMBIO:</strong><br>C$ ${shift.exchangeRate.toFixed(2)} por US$ 1.00</td>
                </tr>
                <tr>
                  <td><strong>FONDO FÍSICO CÓRDOBAS:</strong><br>C$ ${shift.totalOpeningNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                  <td><strong>FONDO FÍSICO DÓLARES:</strong><br>US$ ${shift.totalOpeningUSD.toFixed(2)} (C$ ${(shift.totalOpeningUSD * shift.exchangeRate).toLocaleString('es-NI', { minimumFractionDigits: 2 })})</td>
                  <td colspan="2" style="background-color: #f2f2f2;"><strong>TOTAL FONDO DE APERTURA EN GAVETA:</strong><br><strong style="font-size: 11px;">C$ ${shift.totalOpeningEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</strong></td>
                </tr>
              </table>

              <!-- TABLA DENOMINACIONES 2 COLUMNAS -->
              <div class="section-title">1. DESGLOSE FÍSICO DE DENOMINACIONES RECIBIDAS EN GAVETA</div>
              <div style="display: flex; gap: 8px;">
                <!-- Córdobas -->
                <div style="flex: 1;">
                  <table>
                    <thead>
                      <tr>
                        <th colspan="3" style="text-align: center;">MONEDA NACIONAL — CÓRDOBAS (NIO)</th>
                      </tr>
                      <tr>
                        <th>DENOMINACIÓN</th>
                        <th class="text-center">CANTIDAD</th>
                        <th class="text-right">SUBTOTAL (C$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${nioRows
                        .map(
                          (r) => `
                        <tr>
                          <td>Billete/Moneda C$ ${r.l}</td>
                          <td class="text-center font-mono">${r.q}</td>
                          <td class="text-right font-mono">C$ ${(r.q * r.v).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `
                        )
                        .join('')}
                      <tr class="highlight-row">
                        <td colspan="2"><strong>SUBTOTAL CÓRDOBAS (NIO):</strong></td>
                        <td class="text-right font-mono font-bold">C$ ${shift.totalOpeningNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Dólares -->
                <div style="flex: 1;">
                  <table>
                    <thead>
                      <tr>
                        <th colspan="3" style="text-align: center;">MONEDA EXTRANJERA — DÓLARES (USD)</th>
                      </tr>
                      <tr>
                        <th>DENOMINACIÓN</th>
                        <th class="text-center">CANTIDAD</th>
                        <th class="text-right">SUBTOTAL (US$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${usdRows
                        .map(
                          (r) => `
                        <tr>
                          <td>Billete US$ ${r.l}</td>
                          <td class="text-center font-mono">${r.q}</td>
                          <td class="text-right font-mono">$ ${(r.q * r.v).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `
                        )
                        .join('')}
                      <tr class="highlight-row">
                        <td colspan="2"><strong>SUBTOTAL DÓLARES (USD):</strong></td>
                        <td class="text-right font-mono font-bold">$ ${shift.totalOpeningUSD.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr style="background-color: #fafafa;">
                        <td colspan="2">Equivalente en Córdobas:</td>
                        <td class="text-right font-mono font-bold">C$ ${(shift.totalOpeningUSD * shift.exchangeRate).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- TOTAL CONSOLIDADO -->
                  <div style="border: 2px solid #000; padding: 6px; text-align: center; margin-top: 6px; background-color: #f9f9f9;">
                    ${(shift.openingTransferToPettyCash && shift.openingTransferToPettyCash > 0) ? `
                    <div style="font-size: 8px; color: #555; text-transform: uppercase;">CONTEO FÍSICO EN GAVETA: C$ ${(shift.openingCashCountedNIO || (shift.totalOpeningEquivNIO + shift.openingTransferToPettyCash)).toLocaleString('es-NI', { minimumFractionDigits: 2 })}</div>
                    <div style="font-size: 8px; color: #b91c1c; font-weight: bold; text-transform: uppercase;">(-) TRASLADO A CAJA CHICA: - C$ ${shift.openingTransferToPettyCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}</div>
                    <div style="font-size: 8.5px; font-weight: bold; text-transform: uppercase; margin-top: 3px; border-top: 1px solid #ccc; padding-top: 2px;">(=) FONDO NETO OPERATIVO EN CAJA GENERAL:</div>
                    ` : `
                    <div style="font-size: 8px; font-weight: bold; text-transform: uppercase;">FONDO INICIAL CONSOLIDADO EN GAVETA:</div>
                    `}
                    <div style="font-size: 14px; font-weight: 900; font-family: monospace; margin-top: 2px;">
                      C$ ${shift.totalOpeningEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <!-- NOTAS -->
              <div class="section-title">2. OBSERVACIONES DE APERTURA</div>
              <div style="border: 1px solid #000; padding: 6px 8px; font-size: 9px; min-height: 35px;">
                ${shift.openingNotes || 'Fondo entregado conforme sin anomalías. Operación comercial iniciada con éxito.'}
              </div>
            </div>

            <!-- PIE DE DOCUMENTO -->
            <div style="margin-top: 15px; padding-top: 8px; border-top: 1px solid #ddd;">
              <div style="font-size: 8px; color: #666; text-align: center;">
                El Bodegón Restaurante & Bar • Documento Oficial de Apertura • Página 1 de 1
              </div>
            </div>
          </div>
        </div>

        <script>
          setTimeout(function() {
            window.focus();
            window.print();
          }, 350);
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=900,menubar=no,toolbar=no,location=no,status=no');
    if (printWindow) {
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      window.print();
    }
  } catch (err: any) {
    alert('Error imprimiendo acta de apertura: ' + err.message);
  }
}

