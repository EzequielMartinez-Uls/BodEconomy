const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function mergeJornadas() {
  const { data: j24 } = await supabase.from('jornadas_diarias').select('*').eq('id', 24).single();
  const { data: j23 } = await supabase.from('jornadas_diarias').select('*').eq('id', 23).single();

  const openDataMatch = (j24?.observaciones || '').match(/\[OPENING_DATA:\{.*?\}\]/);
  const fondosMatch = (j23?.observaciones || '').match(/\[FONDOS_COMPOSITION:\{.*?\}\]/);

  const finalObs = ((openDataMatch ? openDataMatch[0] : '') + ' ' + (fondosMatch ? fondosMatch[0] : '') + ' Apertura realizada por Eddy con C$ 623.00 en General y C$ 6,386.21 en Caja Chica').trim();

  console.log('Final Obs:', finalObs);

  const { error: updErr } = await supabase.from('jornadas_diarias').update({
    fondo_inicial: 6386.21,
    observaciones: finalObs
  }).eq('id', 24);
  console.log('Update 24 Error:', updErr);

  const { error: delErr } = await supabase.from('jornadas_diarias').delete().eq('id', 23);
  console.log('Delete 23 Error:', delErr);

  console.log('Merge complete!');
}

mergeJornadas();
