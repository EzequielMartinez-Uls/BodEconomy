const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

async function linkJornada28() {
  const ids = [258, 259, 260, 261, 262, 263, 264, 265, 267, 268, 269, 270, 271, 272, 273, 275, 276, 277];
  
  console.log(`Asignando jornada_id = 28 a ${ids.length} registros huérfanos...`);
  
  const { data, error } = await sb
    .from('compras_gastos')
    .update({ jornada_id: 28 })
    .in('id', ids)
    .select();

  if (error) {
    console.error('Error al actualizar:', error);
  } else {
    console.log(`¡Éxito! ${data ? data.length : 0} compras y gastos vinculados correctamente a Jornada 28 (2026-10-09).`);
  }
}

linkJornada28();
