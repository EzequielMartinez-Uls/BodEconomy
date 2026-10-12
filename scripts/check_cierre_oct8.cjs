const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

(async () => {
  const { data: jList } = await supabase.from('jornadas_diarias').select('*').eq('fecha', '2026-10-08');
  for (const j of jList) {
    console.log('ID:', j.id, 'fecha:', j.fecha, 'estado:', j.estado);
    const obs = j.observaciones || '';
    const openMatch = obs.match(/\[OPENING_DATA:(\{.*?\})\]/);
    const ventasMatch = obs.match(/\[VENTAS_DATA:(\{.*?\})\]/);
    const auditMatch = obs.match(/\[CLOSING_AUDIT:(\{.*?\})\]/);
    console.log('OPENING_DATA:', openMatch ? openMatch[1] : 'null');
    console.log('VENTAS_DATA:', ventasMatch ? ventasMatch[1] : 'null');
    console.log('CLOSING_AUDIT:', auditMatch ? auditMatch[1] : 'null');
  }

  const { data: j09List } = await supabase.from('jornadas_diarias').select('*').eq('fecha', '2026-10-09');
  for (const j of j09List) {
    console.log('\nID 09:', j.id, 'fecha:', j.fecha, 'obs:', j.observaciones);
  }
})();
