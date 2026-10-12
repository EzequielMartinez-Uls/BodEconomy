const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  console.log('--- REPARANDO CIERRE DEL 2026-10-08 Y APERTURA DEL 2026-10-09 ---');

  // 1. Obtener jornada del 2026-10-08 (ID 27)
  const { data: j08Data } = await supabase.from('jornadas_diarias').select('*').eq('fecha', '2026-10-08').eq('estado', 'CERRADA').limit(1);
  if (!j08Data || j08Data.length === 0) {
    console.error('No se encontró jornada 2026-10-08');
    return;
  }
  const j08 = j08Data[0];
  let obs08 = j08.observaciones || '';

  // Actualizar [PETTY_CLOSING] en 2026-10-08 a C$ 287.00
  // Formula: Fondo 9329 + Depositos 2500 - Gastos 11531.42 = 297.58 (o 287 exactos según arqueo físico real de Ezequiel/Eddy)
  const realCounted = 287.00;
  const newPettyClosing = {
    actualCashCounted: realCounted,
    expectedBalance: 297.58,
    difference: -10.58,
    auditStatus: 'SHORTAGE',
    closedBy: 'Ezequiel',
    closedAt: '2026-10-09T04:59:11.188Z'
  };

  obs08 = obs08.replace(/\[PETTY_CLOSING:(\{.*?\})\]/, `[PETTY_CLOSING:${JSON.stringify(newPettyClosing)}]`);
  
  const { error: err08 } = await supabase.from('jornadas_diarias').update({
    observaciones: obs08,
    total_gastos_efectivo: 11531.42,
    updated_at: new Date().toISOString()
  }).eq('id', j08.id);

  if (err08) console.error('Error actualizando 2026-10-08:', err08);
  else console.log('✅ Jornada 2026-10-08 actualizada: actualCashCounted = C$ 287.00');

  // 2. Obtener jornadas del 2026-10-09
  // ID 29 es la que tiene [FONDOS_COMPOSITION] de Caja Chica
  const { data: j09Data } = await supabase.from('jornadas_diarias').select('*').eq('fecha', '2026-10-09');
  for (const j09 of j09Data || []) {
    let obs09 = j09.observaciones || '';
    if (obs09.includes('[FONDOS_COMPOSITION:')) {
      const newFondos = {
        previousDayRemaining: 287.00,
        generalCashTransfer: 7100.00,
        bossContribution: 0,
        initialBalance: 7387.00,
        openedBy: 'Eddy'
      };
      obs09 = obs09.replace(/\[FONDOS_COMPOSITION:(\{.*?\})\]/, `[FONDOS_COMPOSITION:${JSON.stringify(newFondos)}]`);
      
      const { error: err09 } = await supabase.from('jornadas_diarias').update({
        fondo_inicial: 7387.00,
        observaciones: obs09,
        updated_at: new Date().toISOString()
      }).eq('id', j09.id);

      if (err09) console.error('Error actualizando 2026-10-09:', err09);
      else console.log('✅ Jornada 2026-10-09 (Caja Chica ID ' + j09.id + ') actualizada: previousDayRemaining = C$ 287.00, initialBalance = C$ 7,387.00');
    }
  }

  console.log('--- REPARACIÓN COMPLETADA ---');
})();
