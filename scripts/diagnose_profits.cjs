const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

// Verdad: hojas Excel impresas
const EXCEL = {
  '2026-10-01': { ingresos: 22547.50, reserva: 0, transf: 0, propina: 1260.00, efect: 18221.68, neto: 3065.82 },
  '2026-10-02': { ingresos: 59581.50, reserva: 10000, transf: 4090.03, propina: 4827.00, efect: 26289.50, neto: 14374.97 },
  '2026-10-03': { ingresos: 85457.30, reserva: 0, transf: 15968.33, propina: 5527.30, efect: 24894.50, neto: 39067.17 },
  '2026-10-04': { ingresos: 69067.50, reserva: 0, transf: 20475.73, propina: 4318.00, efect: 14388.50, neto: 29885.27 },
  '2026-10-05': { ingresos: 30212.00, reserva: 0, transf: 12822.62, propina: 2068.00, efect: 6964.23, neto: 8357.15 },
  '2026-10-06': { ingresos: 35911.16, reserva: 0, transf: 21226.00, propina: 1945.16, efect: 11849.79, neto: 890.21 },
};

function isFondeoHeuristic(g) {
  if (g.tipo === 'INGRESO_FONDEO' || g.tipo === 'INFLOW') return true;
  if (g.categoria === 'FONDEO') return true;
  if (g.observaciones && /\[TIPO:FONDEO\]|\[TYPE:INFLOW\]/i.test(g.observaciones)) return true;
  const t = `${g.concepto || ''} ${g.proveedor || ''}`.toLowerCase();
  return ['deposito', 'depósito', 'depositado', 'fondeo', 'traslado a caja chica', 'traspaso a caja chica',
    'aporte jefe', 'aporte de jefe', 'reembolso', 'inflow', 'correcion de saldo', 'correccion de saldo']
    .some((k) => t.includes(k));
}
const managuaDate = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
const r2 = (n) => Math.round(n * 100) / 100;

(async () => {
  const { data: jornadas } = await supabase.from('jornadas_diarias').select('*').order('fecha');
  const { data: gastos } = await supabase.from('compras_gastos').select('*').order('fecha_hora');
  console.log('Columnas compras_gastos:', Object.keys(gastos[0]).join(', '));
  const jById = new Map(jornadas.map((j) => [j.id, j.fecha]));

  let totExcel = 0, totStored = 0, totWeb = 0, totDesk = 0;
  for (const j of jornadas) {
    const ex = EXCEL[j.fecha];
    const v = JSON.parse(((j.observaciones || '').match(/\[VENTAS_DATA:(\{.*?\})\]/) || [])[1] || '{}');
    const a = JSON.parse(((j.observaciones || '').match(/\[CLOSING_AUDIT:(\{.*?\})\]/) || [])[1] || '{}');
    const dayG = gastos.filter((g) => (g.jornada_id && jById.get(g.jornada_id)) === j.fecha || (!g.jornada_id && managuaDate(g.fecha_hora) === j.fecha));
    const dayGByDate = gastos.filter((g) => managuaDate(g.fecha_hora) === j.fecha);

    let efect = 0, transf = 0, misclass = [];
    for (const g of dayG) {
      if (isFondeoHeuristic(g)) {
        if (!(g.observaciones || '').includes('FONDEO') && g.categoria !== 'FONDEO') misclass.push(`${g.concepto} (C$${g.monto})`);
        continue;
      }
      if (g.metodo_pago === 'TRANSFERENCIA' || g.metodo_pago === 'TARJETA') transf += Number(g.monto); else efect += Number(g.monto);
    }
    const gross = v.totalGrossSales || 0;
    const tips = v.tips || 0;
    const web = gross - efect - transf; // web: sin propina, sin reserva
    // escritorio (DailyEarningsView): por fecha local de la tx
    let dEf = 0, dTr = 0;
    for (const g of dayGByDate) { if (isFondeoHeuristic(g)) continue; if (g.metodo_pago === 'TRANSFERENCIA') dTr += +g.monto; else dEf += +g.monto; }
    const desk = gross - dEf - dTr;

    console.log(`\n===== ${j.fecha} (${j.estado}) =====`);
    if (ex) {
      console.log(`EXCEL     ingresos ${ex.ingresos} | efect ${ex.efect} | transf ${ex.transf} | propina ${ex.propina} | reserva ${ex.reserva} | NETO ${ex.neto}`);
      totExcel += ex.neto;
    }
    console.log(`SUPABASE  ingresos ${gross} | efect ${r2(efect)} | transf ${r2(transf)} | propina ${tips} | NETO guardado ${r2(a.dailyNetProfit || 0)}`);
    console.log(`WEB muestra NETO: ${r2(web)}   |   ESCRITORIO (Ganancias) muestra NETO: ${r2(desk)}`);
    if (misclass.length) console.log(`  ⚠ Gastos tratados como DEPÓSITO por la palabra en el concepto: ${misclass.join('; ')}`);
    totStored += a.dailyNetProfit || 0; totWeb += web; totDesk += desk;
  }
  console.log(`\nTOTAL Excel suma netos: ${r2(totExcel)} | Guardado: ${r2(totStored)} | Web: ${r2(totWeb)} | Escritorio: ${r2(totDesk)}`);
})();
