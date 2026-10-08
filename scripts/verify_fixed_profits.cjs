const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

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
  const jById = new Map(jornadas.map((j) => [j.id, j.fecha]));

  console.log('=== VERIFICACIÓN DE FÓRMULA CORREGIDA (EXCEL vs SISTEMA) ===\n');
  let totExcel = 0, totNew = 0;
  for (const j of jornadas) {
    const ex = EXCEL[j.fecha];
    const v = JSON.parse(((j.observaciones || '').match(/\[VENTAS_DATA:(\{.*?\})\]/) || [])[1] || '{}');
    const a = JSON.parse(((j.observaciones || '').match(/\[CLOSING_AUDIT:(\{.*?\})\]/) || [])[1] || '{}');

    // Nueva fórmula unificada: si la jornada está cerrada con closingAudit, se toma el valor oficial liquidado; si no, Ventas - Gastos - Propinas
    let netoMostrado = 0;
    if (a.dailyNetProfit !== undefined && j.estado === 'CERRADA') {
      netoMostrado = a.dailyNetProfit;
    } else {
      const dayG = gastos.filter((g) => (g.jornada_id && jById.get(g.jornada_id)) === j.fecha || (!g.jornada_id && managuaDate(g.fecha_hora) === j.fecha));
      let totExp = 0;
      for (const g of dayG) {
        if (!isFondeoHeuristic(g)) totExp += Number(g.monto);
      }
      netoMostrado = (v.totalGrossSales || 0) - totExp - (v.tips || 0);
    }

    if (ex) {
      const diff = Math.abs(r2(netoMostrado) - ex.neto);
      const ok = diff < 0.05 ? '✅ EXACTO' : '❌ DIFERENCIA';
      console.log(`${j.fecha}: Excel = C$ ${ex.neto.toLocaleString('es-NI', {minimumFractionDigits: 2})} | Sistema = C$ ${r2(netoMostrado).toLocaleString('es-NI', {minimumFractionDigits: 2})} -> ${ok}`);
      totExcel += ex.neto;
      totNew += r2(netoMostrado);
    } else {
      console.log(`${j.fecha} (${j.estado}): En curso en vivo = C$ ${r2(netoMostrado)}`);
    }
  }

  console.log(`\nTOTAL Acumulado Excel: C$ ${r2(totExcel).toLocaleString('es-NI', {minimumFractionDigits: 2})}`);
  console.log(`TOTAL Acumulado Sistema: C$ ${r2(totNew).toLocaleString('es-NI', {minimumFractionDigits: 2})}`);
})();
