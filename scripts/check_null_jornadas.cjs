const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

async function checkNulls() {
  const { data: nulls } = await sb
    .from('compras_gastos')
    .select('id, jornada_id, fecha_hora, concepto, monto, metodo_pago, categoria')
    .is('jornada_id', null)
    .order('id', { ascending: true });

  console.log('Total nulls:', nulls.length);
  let totalEf = 0, totalTr = 0, totalTarjeta = 0, totalFondeo = 0;
  nulls.forEach(n => {
    const isFondeo = (n.categoria === 'FONDEO' || (n.concepto && /deposito|fondeo|traslado/i.test(n.concepto)));
    const m = Number(n.monto || 0);
    if (isFondeo) totalFondeo += m;
    else if (n.metodo_pago === 'TRANSFERENCIA') totalTr += m;
    else if (n.metodo_pago === 'TARJETA') totalTarjeta += m;
    else totalEf += m;
    console.log(`  ID ${n.id} | ${n.fecha_hora} | C$ ${n.monto} | ${n.metodo_pago} | ${n.concepto}`);
  });
  console.log(`Totales huérfanas: Ef = ${totalEf}, Tr = ${totalTr}, Tarjeta = ${totalTarjeta}, Fondeo = ${totalFondeo}`);

  const { data: j28 } = await sb.from('jornadas_diarias').select('*').eq('id', 28).single();
  console.log('Jornada 28 en base de datos:');
  console.log(`  Fecha: ${j28.fecha}`);
  console.log(`  Total Gastos Efec en Jornada 28: C$ ${j28.total_gastos_efectivo}`);
  console.log(`  Total Gastos Trans en Jornada 28: C$ ${j28.total_gastos_transferencia}`);
}
checkNulls();
