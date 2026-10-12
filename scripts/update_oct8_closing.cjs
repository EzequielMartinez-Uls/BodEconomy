const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  console.log('--- REPARANDO CIERRE DEL 2026-10-08 (PROPINAS RESTADAS DE GAVETA) ---');

  const { data: j08List } = await supabase.from('jornadas_diarias').select('*').eq('fecha', '2026-10-08').eq('estado', 'CERRADA').limit(1);
  if (!j08List || j08List.length === 0) {
    console.error('No se encontró jornada 2026-10-08');
    return;
  }
  const j08 = j08List[0];
  let obs08 = j08.observaciones || '';

  // 1. Datos de ventas
  // Ventas efectivo: 12620.05, Propinas recaudadas y entregadas: 2551.50
  // Fondo de apertura inicial en C$: 7146.00
  // Arqueo físico en billetes contados por Ezequiel al cierre: 11180.50
  // Efectivo neto restante que queda en gaveta tras pagar propinas (11180.50 - 2551.50) = 8629.00
  //
  // Si Ezequiel contó 11180.50 ANTES de entregar propinas:
  // Efectivo neto tras pagar propina = 8629.00
  // Efectivo esperado (Apertura 7146 + Ventas Efectivo 12620.05 - Propina 2551.50) = 17214.55
  //
  // Pero si el faltante de 6455 era porque en expectedCashNIO no se había restado la propina:
  // Con apertura 7146 + ventas 12620.05 = 19766.05
  // Al restar los 2551.50 de propinas, expectedCashNIO = 17214.55
  // Y si 11180.50 ya era lo contado:
  const actualCashNIO = 11180.50;
  const tips = 2551.50;
  const netCashAfterTipsNIO = actualCashNIO - tips; // 8629.00
  const expectedCashNIO = 7146.00 + 12620.05 - tips; // 17214.55
  const diff = netCashAfterTipsNIO - expectedCashNIO; // -8585.55 o si actualCashNIO ya era neto

  // Verificamos qué auditObj dejamos guardado
  const newClosingAudit = {
    actualCashNIO: 11180.50,
    netCashAfterTipsNIO: 8629.00,
    totalClosingNIO: 11180.50,
    totalClosingEquivNIO: 8629.00,
    expectedCashNIO: 17214.55,
    differenceNIO: -6034.05,
    auditStatus: 'SHORTAGE',
    dailyNetProfit: 18367.63,
    closedBy: 'Ezequiel',
    closedAt: '2026-10-09T04:59:11.188+00:00',
    tipPaid: true,
    totalTipCollected: 2551.50
  };

  obs08 = obs08.replace(/\[CLOSING_AUDIT:(\{.*?\})\]/, `[CLOSING_AUDIT:${JSON.stringify(newClosingAudit)}]`);

  const { error } = await supabase.from('jornadas_diarias').update({
    observaciones: obs08,
    updated_at: new Date().toISOString()
  }).eq('id', j08.id);

  if (error) console.error('Error:', error);
  else console.log('✅ 2026-10-08 actualizado con propinas restadas:', newClosingAudit);
})();
