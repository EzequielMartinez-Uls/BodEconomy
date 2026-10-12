const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  const { data: jData, error: jErr } = await supabase.from('jornadas_diarias').select('*').order('fecha');
  if (jErr) {
    console.error('Error fetching jornadas:', jErr);
    return;
  }
  const jMap = new Map((jData || []).map(j => [j.id, j.fecha]));

  console.log('--- JORNADAS ---');
  for (const j of (jData || []).filter(j => j.fecha >= '2026-10-07')) {
    console.log(j.id, j.fecha, j.estado, 'fondo_ini:', j.fondo_inicial, 'gastos_ef:', j.total_gastos_efectivo, 'obs:', j.observaciones);
  }

  const { data: gastos, error: gErr } = await supabase.from('compras_gastos').select('*').gte('fecha_hora', '2026-10-08T00:00:00').order('id');
  if (gErr) {
    console.error('Error fetching gastos:', gErr);
    return;
  }
  console.log('--- COMPRAS Y GASTOS (' + (gastos ? gastos.length : 0) + ') ---');
  for (const g of (gastos || [])) {
    console.log(g.id, 'jornada_id:', g.jornada_id, 'fecha jornada:', jMap.get(g.jornada_id), '|', g.concepto, '|', g.categoria, '| C$', g.monto, '|', g.metodo_pago, '|', g.observaciones);
  }
})();
