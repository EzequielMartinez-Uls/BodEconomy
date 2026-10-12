const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

async function check() {
  const { data: recent, error } = await sb
    .from('compras_gastos')
    .select('id, jornada_id, fecha_hora, concepto, monto, metodo_pago, categoria')
    .gte('id', 200)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total compras/gastos con ID >= 200:', (recent || []).length);
  const byJornada = {};
  (recent || []).forEach(r => {
    byJornada[r.jornada_id] = (byJornada[r.jornada_id] || 0) + 1;
  });
  console.log('Agrupados por jornada_id:', byJornada);

  console.log('\n--- COMPRAS DEL 2026-10-09 ---');
  const d9 = (recent || []).filter(r => (r.fecha_hora || '').startsWith('2026-10-09'));
  console.log(`Encontradas para 2026-10-09: ${d9.length}`);
  d9.forEach(r => {
    console.log(`  ID ${r.id} | JID: ${r.jornada_id} | ${r.fecha_hora} | C$ ${r.monto} | ${r.metodo_pago} | ${r.concepto}`);
  });

  console.log('\n--- COMPRAS DEL 2026-10-10 ---');
  const d10 = (recent || []).filter(r => (r.fecha_hora || '').startsWith('2026-10-10'));
  console.log(`Encontradas para 2026-10-10: ${d10.length}`);

  console.log('\n--- COMPRAS DEL 2026-10-11 (HOY) ---');
  const d11 = (recent || []).filter(r => (r.fecha_hora || '').startsWith('2026-10-11'));
  console.log(`Encontradas para 2026-10-11: ${d11.length}`);
  d11.forEach(r => {
    console.log(`  ID ${r.id} | JID: ${r.jornada_id} | ${r.fecha_hora} | C$ ${r.monto} | ${r.metodo_pago} | ${r.concepto}`);
  });
}
check();
