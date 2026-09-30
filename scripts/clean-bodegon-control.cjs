const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanData() {
  console.log('🧹 Limpiando datos de prueba de Bodegón Control...');

  // 1. Limpiar compras_gastos de prueba en Supabase
  const { data: delCompras, error: cErr } = await supabase
    .from('compras_gastos')
    .delete()
    .gte('id', 0)
    .select();

  if (cErr) {
    console.error('⚠️ Error limpiando compras_gastos:', cErr.message);
  } else {
    console.log(`✅ compras_gastos limpio: ${delCompras ? delCompras.length : 0} registros eliminados.`);
  }

  // 2. Limpiar jornadas_diarias de prueba en Supabase
  const { data: delJornadas, error: jErr } = await supabase
    .from('jornadas_diarias')
    .delete()
    .gte('id', 0)
    .select();

  if (jErr) {
    console.error('⚠️ Error limpiando jornadas_diarias:', jErr.message);
  } else {
    console.log(`✅ jornadas_diarias limpio: ${delJornadas ? delJornadas.length : 0} registros eliminados.`);
  }

  // 3. Limpiar Local Storage local de la app en AppData de Windows
  const appDataRoaming = process.env.APPDATA;
  if (appDataRoaming) {
    const lsPath = path.join(appDataRoaming, 'bodegon-control', 'Local Storage');
    if (fs.existsSync(lsPath)) {
      try {
        fs.rmSync(lsPath, { recursive: true, force: true });
        console.log(`✅ Local Storage local eliminado: ${lsPath}`);
      } catch (e) {
        console.warn('Nota sobre Local Storage en uso:', e.message);
      }
    }
  }

  // 4. Verificación final de estado limpio
  const { data: checkJ } = await supabase.from('jornadas_diarias').select('id');
  const { data: checkC } = await supabase.from('compras_gastos').select('id');

  console.log('\n--- VERIFICACIÓN POST-LIMPIEZA ---');
  console.log(`jornadas_diarias restantes: ${checkJ ? checkJ.length : 0}`);
  console.log(`compras_gastos restantes:    ${checkC ? checkC.length : 0}`);

  if ((checkJ?.length || 0) === 0 && (checkC?.length || 0) === 0) {
    console.log('\n✨ ¡Bodegón Control está 100% LIMPIO para la apertura de mañana!');
  } else {
    console.warn('\n⚠️ Quedaron registros por limpiar.');
  }
}

cleanData();
