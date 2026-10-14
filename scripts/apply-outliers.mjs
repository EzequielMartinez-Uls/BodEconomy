import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const dotenv = fs.readFileSync('.env.local', 'utf8');
const url = dotenv.match(/VITE_SUPABASE_URL=([^\r\n]+)/)[1];
const key = dotenv.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/)[1];
const supabase = createClient(url, key);

async function runUpdates() {
  console.log('--- Iniciando actualizaciones en compras_gastos ---');

  // 1. Tortillería (131, 217) y Pulpería (135) -> Proveedor: 'Compras Locales (Cocina)', Categoria: 'GASTOS_COCINA'
  const r1 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Compras Locales (Cocina)', categoria: 'GASTOS_COCINA' })
    .in('id', [131, 135, 217]);
  if (r1.error) console.error('Error r1:', r1.error);
  else console.log('✅ IDs 131, 135, 217 actualizados a Compras Locales (Cocina) / GASTOS_COCINA');

  // 2. Mercado (367) -> Proveedor: 'Mercado Externo', Categoria: 'MERCADO'
  const r2 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Mercado Externo', categoria: 'MERCADO' })
    .eq('id', 367);
  if (r2.error) console.error('Error r2:', r2.error);
  else console.log('✅ ID 367 actualizado a Mercado Externo / MERCADO');

  // 3. Pago de Delivery (369) -> Proveedor: 'Delivery Particular', Categoria: 'DELIVERYS_ACARREOS'
  const r3 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Delivery Particular', categoria: 'DELIVERYS_ACARREOS' })
    .eq('id', 369);
  if (r3.error) console.error('Error r3:', r3.error);
  else console.log('✅ ID 369 actualizado a Delivery Particular / DELIVERYS_ACARREOS');

  // 4. Ferretería (233) -> Proveedor: 'Ferretería Particular', Categoria: 'SERVICIOS/REPARACIONES'
  const r4 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Ferretería Particular', categoria: 'SERVICIOS/REPARACIONES' })
    .eq('id', 233);
  if (r4.error) console.error('Error r4:', r4.error);
  else console.log('✅ ID 233 actualizado a Ferretería Particular / SERVICIOS/REPARACIONES');

  // 5. Hugo Barahona (336) -> Categoria: 'SERVICIOS/REPARACIONES'
  const r5 = await supabase.from('compras_gastos')
    .update({ categoria: 'SERVICIOS/REPARACIONES' })
    .eq('id', 336);
  if (r5.error) console.error('Error r5:', r5.error);
  else console.log('✅ ID 336 actualizado a SERVICIOS/REPARACIONES');

  // 6. Gabriel Carvajal (350) -> Categoria: 'SERVICIOS/REPARACIONES'
  const r6 = await supabase.from('compras_gastos')
    .update({ categoria: 'SERVICIOS/REPARACIONES' })
    .eq('id', 350);
  if (r6.error) console.error('Error r6:', r6.error);
  else console.log('✅ ID 350 actualizado a SERVICIOS/REPARACIONES');

  // 7. Varios (188) y Cliente (236) -> Proveedor: 'Gastos Varios', Categoria: 'OTROS'
  const r7 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Gastos Varios', categoria: 'OTROS' })
    .in('id', [188, 236]);
  if (r7.error) console.error('Error r7:', r7.error);
  else console.log('✅ IDs 188, 236 actualizados a Gastos Varios / OTROS');

  // 8. Fresas (128) -> Proveedor: 'Vendedor de fresas', Categoria: 'FRUTAS_VEGETALES'
  const r8 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Vendedor de fresas', categoria: 'FRUTAS_VEGETALES' })
    .eq('id', 128);
  if (r8.error) console.error('Error r8:', r8.error);
  else console.log('✅ ID 128 actualizado a Vendedor de fresas / FRUTAS_VEGETALES');

  // 9. Cuajada (129) -> Proveedor: 'Mercado Externo', Categoria: 'LACTEOS'
  const r9 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Mercado Externo', categoria: 'LACTEOS' })
    .eq('id', 129);
  if (r9.error) console.error('Error r9:', r9.error);
  else console.log('✅ ID 129 actualizado a Mercado Externo / LACTEOS');

  // 10. Lechugas (152) -> Proveedor: 'Supermercado (La Colonia)', Categoria: 'FRUTAS_VEGETALES'
  const r10 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Supermercado (La Colonia)', categoria: 'FRUTAS_VEGETALES' })
    .eq('id', 152);
  if (r10.error) console.error('Error r10:', r10.error);
  else console.log('✅ ID 152 actualizado a Supermercado (La Colonia) / FRUTAS_VEGETALES');

  // 11. Limones (145, 228, 347) -> Proveedor: 'Luma Limones', Categoria: 'FRUTAS_VEGETALES'
  const r11 = await supabase.from('compras_gastos')
    .update({ proveedor: 'Luma Limones', categoria: 'FRUTAS_VEGETALES' })
    .in('id', [145, 228, 347]);
  if (r11.error) console.error('Error r11:', r11.error);
  else console.log('✅ IDs 145, 228, 347 actualizados a Luma Limones / FRUTAS_VEGETALES');

  // 12. Limpieza de SUPERMERCADO
  // Carnicería SyM (167) -> CARNES
  await supabase.from('compras_gastos').update({ categoria: 'CARNES' }).eq('id', 167);
  // Pan y Paz (182, 215) -> PANADERIA
  await supabase.from('compras_gastos').update({ categoria: 'PANADERIA' }).in('id', [182, 215]);
  // DOKAR (220) -> RECIPIENTES/EMPAQUES_Y_OTROS
  await supabase.from('compras_gastos').update({ categoria: 'RECIPIENTES/EMPAQUES_Y_OTROS' }).eq('id', 220);
  // Café Soluble (230) -> SUMINISTRO_PARA_COCINA/BARRA
  await supabase.from('compras_gastos').update({ categoria: 'SUMINISTRO_PARA_COCINA/BARRA' }).eq('id', 230);
  // Cerro de Oro (168, 170) -> BEBIDAS_ALCOHOLICAS
  await supabase.from('compras_gastos').update({ categoria: 'BEBIDAS_ALCOHOLICAS' }).in('id', [168, 170]);
  // Dulce Explosión (171) -> SUMINISTRO_PARA_COCINA/BARRA
  await supabase.from('compras_gastos').update({ categoria: 'SUMINISTRO_PARA_COCINA/BARRA' }).eq('id', 171);
  // Librería (187) -> PAPELERIA_Y_MAS
  await supabase.from('compras_gastos').update({ categoria: 'PAPELERIA_Y_MAS' }).eq('id', 187);
  // Compras Locales (241, 269, 271, 313) -> GASTOS_COCINA
  await supabase.from('compras_gastos').update({ categoria: 'GASTOS_COCINA' }).in('id', [241, 269, 271, 313]);
  // Pollo de La Colonia (246, 327) -> POLLO
  await supabase.from('compras_gastos').update({ categoria: 'POLLO' }).in('id', [246, 327]);
  // Proveedor de Aceite (174, 191) -> GASTOS_COCINA
  await supabase.from('compras_gastos').update({ categoria: 'GASTOS_COCINA' }).in('id', [174, 191]);
  // Comercial Paniagua (133, 301) -> SUMINISTROS_DE_ARTICULOS_DE_LIMPIEZA
  await supabase.from('compras_gastos').update({ categoria: 'SUMINISTROS_DE_ARTICULOS_DE_LIMPIEZA' }).in('id', [133, 301]);

  // 13. Reclasificación Global de Todas las Categorías
  await supabase.from('compras_gastos').update({ categoria: 'GAS_Y_DEMAS' }).in('id', [136, 242, 243, 338, 356]);
  await supabase.from('compras_gastos').update({ categoria: 'MARISCOS/PESCADOS' }).in('id', [115, 196, 216, 253, 297, 339]);
  await supabase.from('compras_gastos').update({ categoria: 'SUMINISTRO_PARA_COCINA/BARRA' }).in('id', [357, 359]);
  await supabase.from('compras_gastos').update({ categoria: 'RECIPIENTES/EMPAQUES_Y_OTROS' }).eq('id', 335);
  await supabase.from('compras_gastos').update({ categoria: 'GASTOS ADMINISTRATIVOS' }).in('id', [146, 340]);
  await supabase.from('compras_gastos').update({ categoria: 'GASTOS_COCINA' }).in('id', [245, 261]);
  await supabase.from('compras_gastos').update({ categoria: 'FRUTAS_VEGETALES' }).eq('id', 303);
  await supabase.from('compras_gastos').update({ proveedor: 'Delivery Particular', concepto: 'Delivery de aguacate', categoria: 'DELIVERYS_ACARREOS' }).eq('id', 302);
  await supabase.from('compras_gastos').update({ proveedor: 'Fast Delivery', concepto: 'Delivery de aceite', categoria: 'DELIVERYS_ACARREOS' }).eq('id', 262);
  await supabase.from('compras_gastos').update({ proveedor: 'Mercado Externo', categoria: 'GASTOS_COCINA' }).eq('id', 319);
  await supabase.from('compras_gastos').update({ categoria: 'GASTOS_COCINA' }).eq('id', 263);
  await supabase.from('compras_gastos').update({ categoria: 'LACTEOS' }).eq('id', 284);
  await supabase.from('compras_gastos').update({ categoria: 'SUMINISTROS_DE_ARTICULOS_DE_LIMPIEZA' }).in('id', [343, 267]);
  await supabase.from('compras_gastos').update({ categoria: 'PAPELERIA_Y_MAS' }).in('id', [180, 307, 365, 366]);
  await supabase.from('compras_gastos').update({ categoria: 'SERVICIOS/REPARACIONES' }).eq('id', 337);

  // 8. Actualizar SYSTEM_CATALOGS para incluir 'GASTOS_COCINA' si no está
  const { data: catRows } = await supabase.from('jornadas_diarias').select('id, observaciones').eq('responsable', 'SYSTEM_CATALOGS');
  if (catRows && catRows.length > 0) {
    const raw = catRows[0].observaciones;
    const tag = '[SYSTEM_CATALOGS:';
    const startIdx = raw.indexOf(tag);
    if (startIdx !== -1) {
      const jsonStr = raw.substring(startIdx + tag.length, raw.lastIndexOf(']'));
      const parsed = JSON.parse(jsonStr);
      if (!parsed.categories.includes('GASTOS_COCINA')) {
        parsed.categories.push('GASTOS_COCINA');
        const updatedObs = `[SYSTEM_CATALOGS:${JSON.stringify(parsed)}]`;
        const { error: catErr } = await supabase.from('jornadas_diarias').update({ observaciones: updatedObs }).eq('id', catRows[0].id);
        if (catErr) console.error('Error updating SYSTEM_CATALOGS:', catErr);
        else console.log('✅ SYSTEM_CATALOGS actualizado con GASTOS_COCINA');
      } else {
        console.log('ℹ️ GASTOS_COCINA ya existía en SYSTEM_CATALOGS');
      }
    }
  }

  console.log('--- Actualizaciones finalizadas con éxito ---');
}
runUpdates();
