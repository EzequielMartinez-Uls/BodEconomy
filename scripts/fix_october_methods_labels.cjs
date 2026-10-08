const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kwkyvdoacselhbrnvney.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI'
);

// Jueves 01/10: en el Excel los montos están desfasados 1 fila respecto al concepto.
// La columna "Saldo" confirma la relación real concepto ↔ monto. Solo se cambian textos, no montos ni tipos.
const OCT1_RELABEL = [
  { monto: 11160, from: 'Depositado en efect. - Préstamo Eddy', concepto: 'Préstamo Eddy para pagos (depositado en efectivo)', proveedor: 'Eddy' },
  { monto: 6320, from: 'Prest. Eddy para pagos / Coca Cola', concepto: 'Coca Cola', proveedor: 'Coca Cola', categoria: 'BEBIDAS' },
  { monto: 163.68, from: 'Coca Cola', concepto: 'Supermercado bolsas de basura', proveedor: 'Supermercado', categoria: 'SUPERMERCADO' },
  { monto: 1250, from: 'Supermercado Bolsas de basura', concepto: 'Camarones (pendientes de pago)', proveedor: 'Camarones', categoria: 'CARNES' },
  { monto: 2494, from: 'Camarones Pendientes de pago', concepto: 'Fuente Pura', proveedor: 'Fuente Pura', categoria: 'BEBIDAS' },
  { monto: 6666, from: 'Fuente Pura', concepto: 'Pago a Doña Nelly', proveedor: 'Doña Nelly', categoria: 'OTROS' },
  { monto: 690, from: 'Pago a Doña Nelly / Reembolso', concepto: 'Depósito de Caja General', proveedor: 'Caja General' },
  { monto: 300, from: 'Depósito de Caja General', concepto: 'Depósito a caja chica', proveedor: 'Caja General' },
  { monto: 100, from: 'Depósito a caja chica / Gasto', concepto: 'Pago propina de tarjeta Eduardo', proveedor: 'Eduardo', categoria: 'PAGOS_PERSONAL' },
  { monto: 500, from: 'Pago propina de Tarjeta Eduardo', concepto: 'Depósito en caja chica', proveedor: 'Caja General' },
  { monto: 378, from: 'Depósito en caja chica / Gasto', concepto: 'Pago garrafones de agua', proveedor: 'Agua', categoria: 'BEBIDAS' },
  { monto: 1500, from: 'Pago garrafones de agua', concepto: 'Sobrante de planilla (reingreso)', proveedor: 'Planilla' },
  { monto: 500, from: 'Sobrante de planilla / Ajuste', concepto: 'Gasto de Snyder', proveedor: 'Snyder', categoria: 'OTROS' },
  { monto: 350, from: 'Gasto de Snyder', concepto: 'Día trabajado Ezequiel', proveedor: 'Ezequiel', categoria: 'PAGOS_PERSONAL' },
];

(async () => {
  // 1. Transferencias guardadas como 'TRANSFER' (valor inválido) → 'TRANSFERENCIA'
  const { data: badTx, error: e1 } = await supabase
    .from('compras_gastos')
    .update({ metodo_pago: 'TRANSFERENCIA', estado_pago: 'PAGADO' })
    .eq('metodo_pago', 'TRANSFER')
    .select('id, concepto, monto');
  console.log('1) Transferencias corregidas:', e1 || badTx.map((t) => `${t.concepto} C$${t.monto}`));

  // 2. Re-etiquetado del Jueves 01/10 (por id, resolviendo antes para evitar colisiones)
  const { data: oct1 } = await supabase.from('compras_gastos').select('*').eq('jornada_id', 17);
  const plan = [];
  for (const r of OCT1_RELABEL) {
    const row = oct1.find((g) => Number(g.monto) === r.monto && g.concepto.startsWith(r.from) && !plan.some((p) => p.id === g.id));
    if (!row) { console.log('   ⚠ No encontrado:', r.from, r.monto); continue; }
    plan.push({ id: row.id, ...r });
  }
  for (const p of plan) {
    const upd = { concepto: p.concepto, proveedor: p.proveedor };
    if (p.categoria) upd.categoria = p.categoria;
    const { error } = await supabase.from('compras_gastos').update(upd).eq('id', p.id);
    console.log(`2) #${p.id} C$${p.monto}: "${p.from}" → "${p.concepto}"`, error || 'OK');
  }
})();
