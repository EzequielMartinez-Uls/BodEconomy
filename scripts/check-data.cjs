const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: jornadas } = await sb.from('jornadas_diarias').select('*').order('id', { ascending: false }).limit(5);
  console.log('=== JORNADAS ===');
  for (const j of jornadas || []) {
    console.log(`ID ${j.id} | Fecha ${j.fecha} | Estado ${j.estado} | Fondo Inicial ${j.fondo_inicial} | Responsable ${j.responsable}`);
    console.log(`Observaciones: ${j.observaciones}\n`);
  }

  const { data: gastos } = await sb.from('compras_gastos').select('*').order('id', { ascending: false }).limit(40);
  console.log('=== GASTOS (ultimos 40) ===');
  for (const g of gastos || []) {
    console.log(`ID ${g.id} | Jornada ${g.jornada_id} | Fecha ${g.fecha} | Metodo ${g.metodo_pago} | Monto ${g.monto} | Desc: ${g.descripcion} | Comprobante: ${g.comprobante}`);
  }
}
main();
