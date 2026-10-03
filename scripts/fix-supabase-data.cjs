const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixData() {
  console.log('🔧 1. Eliminando registro duplicado de compras_gastos ID 85 (C$ 2,600)...');
  const { error: delErr } = await sb.from('compras_gastos').delete().eq('id', 85);
  if (delErr) {
    console.warn('Advertencia al borrar 85:', delErr.message);
  } else {
    console.log('✅ Registro ID 85 eliminado exitosamente.');
  }

  console.log('🔧 2. Asignando jornada_id: 11 al traslado de fondeo ID 84 (C$ 9,700)...');
  const { error: update84Err } = await sb
    .from('compras_gastos')
    .update({ jornada_id: 11 })
    .eq('id', 84);
  if (update84Err) {
    console.warn('Advertencia al actualizar 84:', update84Err.message);
  } else {
    console.log('✅ Registro ID 84 asignado a jornada_id: 11.');
  }

  console.log('🔧 3. Asegurando que las compras del viernes tengan jornada_id: 10...');
  const fridayIds = [49, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83];
  const { error: batchErr } = await sb
    .from('compras_gastos')
    .update({ jornada_id: 10 })
    .in('id', fridayIds);
  if (batchErr) {
    console.warn('Advertencia al asignar jornada_id 10:', batchErr.message);
  } else {
    console.log('✅ ' + fridayIds.length + ' compras del viernes confirmadas en jornada_id: 10.');
  }

  console.log('🔧 4. Corrigiendo Jornada 10 (Viernes 2026-10-02)...');
  const obsJ10 = [
    '[OPENING_DATA:{"totalOpeningNIO":1005,"totalOpeningUSD":40,"exchangeRate":36,"openingNotes":"","openedBy":"Ezequiel","totalOpeningEquivNIO":2445}]',
    '[FONDOS_COMPOSITION:{"previousDayRemaining":987,"generalCashTransfer":5000,"bossContribution":0,"initialBalance":5987,"openedBy":"Ezequiel"}]',
    '[VENTAS_DATA:{"salesCash":25485,"cardsBAC":11351,"cardsFicohsa":13780,"cardsBanpro":6036.5,"cardsLafise":0,"totalCards":31167.5,"salesPedidosYa":1030,"otherIncome":1899,"otherIncomeNotes":"Cuentas del personal","totalGrossSales":59581.5,"tips":4727,"updatedAt":"2026-10-03T17:51:34.367Z"}]',
    '[CLOSING_AUDIT:{"actualCashNIO":11481,"expectedCashNIO":11481,"differenceNIO":0,"auditStatus":"SQUARED","dailyNetProfit":14374.97,"closedBy":"Ezequiel","closedAt":"2026-10-03T02:30:00.000Z","totalClosingEquivNIO":11481,"totalClosingNIO":11481,"totalClosingUSD":40,"closingNIO":{"1":124,"5":1,"10":115,"20":25,"50":0,"100":0,"200":6,"500":15,"1000":1,"0.5":4},"closingUSD":{"20":2}}]',
    '[PETTY_CLOSING:{"actualCashCounted":42,"expectedBalance":42,"difference":0,"auditStatus":"SQUARED","closedBy":"Ezequiel","closedAt":"2026-10-03T02:30:00.000Z"}]',
    'Apertura realizada por Ezequiel con C$ 2445.00 • Cierre del día conciliado por Ezequiel (Total gastos: C$ 30,379.53 • Remanente Caja Chica: C$ 42.00 • Remanente Caja General: C$ 11,481.00 + $40 USD entregados a Snyder)'
  ].join(' ');

  const { error: j10Err } = await sb
    .from('jornadas_diarias')
    .update({
      estado: 'CERRADA',
      total_gastos_efectivo: 26289.50,
      total_gastos_transferencia: 4090.03,
      observaciones: obsJ10,
      fecha_cierre: '2026-10-03T02:30:00.000Z',
      updated_at: new Date().toISOString()
    })
    .eq('id', 10);

  if (j10Err) {
    console.error('Error al actualizar J10:', j10Err);
  } else {
    console.log('✅ Jornada 10 corregida exitosamente (Cuadrada, Gastos C$ 26,289.50 EFECTIVO / C$ 4,090.03 TRANSF, Saldo Caja Chica C$ 42.00, Efectivo Gaveta C$ 11,481.00).');
  }

  console.log('🔧 5. Corrigiendo Jornada 11 (Sábado 2026-10-03)...');
  const obsJ11 = [
    '[OPENING_DATA:{"totalOpeningNIO":1781,"totalOpeningUSD":0,"exchangeRate":36,"openingNotes":"Entrega de $40.00 USD al jefe (Snyder). Traslado a Caja Chica: C$ 9,700.00. Fondo gaveta Caja General: C$ 1,781.00","openedBy":"Ezequiel","totalOpeningEquivNIO":1781}]',
    '[FONDOS_COMPOSITION:{"previousDayRemaining":42,"generalCashTransfer":9700,"bossContribution":0,"initialBalance":9742,"openedBy":"Ezequiel"}]',
    'Apertura realizada por Ezequiel con C$ 1,781.00 en Caja General y C$ 9,742.00 en Caja Chica'
  ].join(' ');

  const { error: j11Err } = await sb
    .from('jornadas_diarias')
    .update({
      estado: 'ABIERTA',
      fondo_inicial: 1781.00,
      total_gastos_efectivo: 0,
      total_gastos_transferencia: 0,
      observaciones: obsJ11,
      fecha_cierre: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', 11);

  if (j11Err) {
    console.error('Error al actualizar J11:', j11Err);
  } else {
    console.log('✅ Jornada 11 corregida exitosamente (ABIERTA, Fondo Gaveta Caja General: C$ 1,781.00, Fondo Caja Chica: C$ 9,742.00, Gastos: 0).');
  }

  console.log('\n🎉 ¡Auditoría y corrección de datos en Supabase completada con éxito!');
}

fixData().catch(console.error);
