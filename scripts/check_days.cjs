const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  const { data: jornadas } = await supabase.from('jornadas_diarias').select('*').in('fecha', ['2026-10-08', '2026-10-09']).order('fecha');
  console.log('--- JORNADAS ---');
  for (const j of jornadas || []) {
    console.log(j.fecha, j.estado, 'apertura:', j.fondo_apertura, 'cierre:', j.total_ventas, j.observaciones);
  }

  const { data: gastos } = await supabase.from('compras_gastos').select('*').gte('fecha_hora', '2026-10-07T20:00:00').order('fecha_hora');
  console.log('--- COMPRAS Y GASTOS (' + (gastos ? gastos.length : 0) + ') ---');
  for (const g of gastos || []) {
    console.log(g.id, g.fecha_hora, '|', g.concepto, '|', g.categoria, '|', g.monto, '|', g.metodo_pago, '|', g.observaciones);
  }
})();
