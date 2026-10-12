const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

function parseTag(obs, tagName) {
  if (!obs) return null;
  const regex = new RegExp(`\\[${tagName}:([^\\]]+)\\]`);
  const match = obs.match(regex);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function run() {
  // 1. Huérfanos
  const { data: nullJornadas } = await sb
    .from('compras_gastos')
    .select('id, jornada_id, fecha_hora, concepto, monto, metodo_pago, categoria, observaciones')
    .is('jornada_id', null);

  console.log('=== 1. COMPRAS SIN JORNADA_ID (HUÉRFANAS) ===');
  console.log('Total:', nullJornadas ? nullJornadas.length : 0);
  if (nullJornadas && nullJornadas.length > 0) {
    nullJornadas.forEach(g => {
      console.log(`  ID ${g.id} | ${g.fecha_hora} | C$ ${g.monto} | ${g.metodo_pago} | ${g.concepto}`);
    });
  }

  // 2. Traer todas las jornadas de Octubre
  const { data: jornadas } = await sb
    .from('jornadas_diarias')
    .select('*')
    .gte('fecha', '2026-10-01')
    .order('fecha', { ascending: true });

  console.log(`\n=== 2. AUDITORÍA DETALLADA JORNADAS DE OCTUBRE (${(jornadas||[]).length} DÍAS) ===`);

  for (const j of (jornadas || [])) {
    const { data: gastos } = await sb
      .from('compras_gastos')
      .select('id, jornada_id, fecha_hora, monto, metodo_pago, categoria, concepto, observaciones')
      .eq('jornada_id', j.id);

    let sumGastosEf = 0;
    let sumGastosTr = 0;
    let sumFondeos = 0;

    for (const g of (gastos || [])) {
      const isFondeo = (
        g.categoria === 'FONDEO' ||
        (g.observaciones && /\[TIPO:FONDEO\]/i.test(g.observaciones)) ||
        (g.concepto && /fondeo|deposito|depósito|traspaso/i.test(g.concepto))
      );

      const m = Number(g.monto || 0);
      if (isFondeo) {
        sumFondeos += m;
      } else if (g.metodo_pago === 'TRANSFERENCIA') {
        sumGastosTr += m;
      } else {
        sumGastosEf += m;
      }
    }

    const ventas = parseTag(j.observaciones, 'VENTAS_DATA');
    const closing = parseTag(j.observaciones, 'CLOSING_AUDIT');
    const pettyClosing = parseTag(j.observaciones, 'PETTY_CLOSING');
    const opening = parseTag(j.observaciones, 'OPENING_DATA');
    const fondos = parseTag(j.observaciones, 'FONDOS_COMPOSITION');

    console.log('======================================================================');
    console.log(`📅 JORNADA ID: ${j.id} | Fecha: ${j.fecha} | Estado: ${j.estado} | Resp: ${j.responsable}`);
    console.log(`   Fondo Inicial Caja Chica: C$ ${j.fondo_inicial || 0}`);
    
    if (opening) {
      console.log(`   Apertura General: C$ ${opening.totalOpeningEquivNIO || opening.totalOpeningNIO || 0} (${opening.openedBy || ''})`);
    }

    if (ventas) {
      console.log(`   💰 VENTAS: Brutas: C$ ${ventas.totalGrossSales} | Efectivo: C$ ${ventas.salesCash} | Tarjetas: C$ ${ventas.totalCards} | Transf: C$ ${ventas.salesBankTransfers || 0} | PedidosYa: C$ ${ventas.salesPedidosYa || 0} | Propinas: C$ ${ventas.tips || 0}`);
    } else {
      console.log(`   💰 VENTAS: [Sin registrar / Pendiente]`);
    }

    console.log(`   📦 GASTOS:`);
    console.log(`      • En jornadas_diarias:  Efectivo: C$ ${j.total_gastos_efectivo || 0} | Transf: C$ ${j.total_gastos_transferencia || 0}`);
    console.log(`      • Suma compras_gastos (${(gastos||[]).length} items): Efectivo: C$ ${sumGastosEf.toFixed(2)} | Transf: C$ ${sumGastosTr.toFixed(2)} | Fondeos: C$ ${sumFondeos.toFixed(2)}`);

    const diffEf = Math.abs((Number(j.total_gastos_efectivo || 0)) - sumGastosEf);
    const diffTr = Math.abs((Number(j.total_gastos_transferencia || 0)) - sumGastosTr);
    if (diffEf > 1 || diffTr > 1) {
      console.log(`      ⚠️ DESCUADRE EN GASTOS: Dif Ef = C$ ${diffEf.toFixed(2)}, Dif Tr = C$ ${diffTr.toFixed(2)}`);
    } else {
      console.log(`      ✅ Gastos 100% Cuadrados entre cabecera e historial`);
    }

    if (closing) {
      console.log(`   🔒 CIERRE GENERAL:`);
      console.log(`      Físico Contado: C$ ${closing.totalClosingEquivNIO || closing.actualCashNIO} (NIO: ${closing.totalClosingNIO || closing.actualCashNIO}, USD: $${closing.totalClosingUSD || 0})`);
      console.log(`      Efectivo Esperado: C$ ${closing.expectedCashNIO} | Diferencia: C$ ${closing.differenceNIO} | Estado: ${closing.auditStatus}`);
      console.log(`      Ganancia Neta Diaria: C$ ${closing.dailyNetProfit}`);
    } else {
      console.log(`   🔒 CIERRE GENERAL: [Pendiente de cierre]`);
    }

    if (pettyClosing) {
      console.log(`   🏷️ CIERRE CAJA CHICA:`);
      console.log(`      Saldo Esperado: C$ ${pettyClosing.expectedBalance} | Contado: C$ ${pettyClosing.actualCashCounted} | Dif: C$ ${pettyClosing.difference}`);
    } else {
      console.log(`   🏷️ CIERRE CAJA CHICA: [Pendiente o sin tag]`);
    }
  }
}

run();
