const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

async function check() {
  const today = '2026-10-10';
  console.log('=== 1. JORNADAS DIARIAS (' + today + ') ===');
  const { data: jData, error: jErr } = await sb.from('jornadas_diarias').select('*').eq('fecha', today);
  if (jErr) console.error('Error jornadas:', jErr);
  console.log('Total jornadas:', jData?.length || 0);
  jData?.forEach(j => {
    console.log(`ID: ${j.id} | Fecha: ${j.fecha} | Estado: ${j.estado} | Responsable: ${j.responsable} | Cierre: ${j.fecha_cierre || 'N/A'}`);
  });

  console.log('\n=== 2. COMPRAS Y GASTOS (' + today + ') ===');
  const jornadaIds = (jData || []).map(j => j.id);
  const { data: gData, error: gErr } = await sb
    .from('compras_gastos')
    .select('*')
    .in('jornada_id', jornadaIds.length > 0 ? jornadaIds : [-1])
    .order('id', { ascending: true });
  if (gErr) console.error('Error compras:', gErr);
  console.log('Total compras/gastos asociados a la jornada de hoy:', gData?.length || 0);

  const tracker = new Map();
  const duplicates = [];

  (gData || []).forEach(g => {
    const rawConcepto = (g.concepto || '').trim().toLowerCase();
    const monto = Number(g.monto);
    const metodo = (g.metodo_pago || '').toUpperCase();
    const signature = `${rawConcepto}__${monto}__${metodo}`;

    console.log(`[#${g.id}] Hora: ${g.hora || 'S/H'} | Concepto: "${g.concepto}" | Monto: C$ ${g.monto} | Método: ${g.metodo_pago} | Cat: ${g.categoria} | Resp: ${g.responsable}`);

    if (tracker.has(signature)) {
      duplicates.push({
        signature,
        first: tracker.get(signature),
        duplicate: g
      });
    } else {
      tracker.set(signature, g);
    }
  });

  console.log('\n=== 3. ANÁLISIS DE DUPLICADOS ===');
  if (duplicates.length === 0) {
    console.log('✅ CERO REGISTROS REPETIDOS: Todos los gastos registrados hoy tienen conceptos, montos o naturalezas únicas.');
  } else {
    console.log(`⚠️ Se encontraron ${duplicates.length} posibles duplicados exactos:`);
    duplicates.forEach(d => {
      console.log(`- Concepto/Monto: "${d.signature}"`);
      console.log(`   Original: ID #${d.first.id} (${d.first.hora})`);
      console.log(`   Repetido: ID #${d.duplicate.id} (${d.duplicate.hora})`);
    });
  }
}

check();
