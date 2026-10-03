const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: g } = await sb.from('compras_gastos').select('*').eq('jornada_id', 10).order('id', { ascending: true });
  console.log('--- GASTOS EN J10 (2026-10-02) --- (' + g.length + ' filas)');
  g.forEach((x, i) => {
    console.log((i+1) + '. [' + x.id + '] ' + x.concepto + ' | Monto: C$ ' + x.monto + ' | Cat: ' + x.categoria + ' | Metodo: ' + x.metodo_pago);
  });
}
main();
