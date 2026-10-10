const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  const opening = JSON.stringify({
    totalOpeningNIO: 0,
    totalOpeningUSD: 0,
    exchangeRate: 36,
    openingNotes: 'Jornada anulada / No declarada',
    openedBy: 'Eddy',
    totalOpeningEquivNIO: 0
  });

  const ventas = JSON.stringify({
    salesCash: 0,
    cardsBAC: 0,
    cardsFicohsa: 0,
    cardsBanpro: 0,
    cardsLafise: 0,
    totalCards: 0,
    salesPedidosYa: 0,
    otherIncome: 0,
    totalGrossSales: 0,
    tips: 0
  });

  const audit = JSON.stringify({
    actualCashNIO: 0,
    netCashAfterTipsNIO: 0,
    expectedCashNIO: 0,
    differenceNIO: 0,
    auditStatus: 'SQUARED',
    dailyNetProfit: 0,
    notes: 'Día nulo - No se había dado capacitación previa al encargado'
  });

  const pettyClosing = JSON.stringify({
    actualCashCounted: 0,
    expectedBalance: 0,
    difference: 0,
    auditStatus: 'SQUARED',
    notes: 'Cierre nulo por falta de capacitación'
  });

  const obs = `[OPENING_DATA:${opening}] [VENTAS_DATA:${ventas}] [CLOSING_AUDIT:${audit}] [PETTY_CLOSING:${pettyClosing}] [DIA_NULO:TRUE] [MOTIVO_NULO:No se había dado capacitación al encargado] Jornada anulada/sin declarar por falta de capacitación previa`;

  const { data, error } = await supabase
    .from('jornadas_diarias')
    .update({
      estado: 'CERRADA',
      total_gastos_efectivo: 0,
      total_gastos_transferencia: 0,
      fecha_cierre: '2026-10-07T23:59:59.000Z',
      observaciones: obs
    })
    .eq('fecha', '2026-10-07')
    .select();

  console.log('Update result:', { data, error });
})();
