import { createClient } from '@supabase/supabase-js';
import { CashShift, PettyCashShift, PettyCashTransaction, ExpenseCategory, isOpeningPettyCashTx, VendorItem } from '../types';
import { getLocalTodayStr, getLocalDateTimeStr } from '../utils/dateUtils';
import { DEFAULT_DENOMINATIONS_NIO, DEFAULT_DENOMINATIONS_USD, DEFAULT_VENDORS, DEFAULT_EXPENSE_CATEGORIES } from './storage';

const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Mapeo de categorías locales de Bodegón Control hacia categorías del portal web
 */
export function mapCategoryToCloud(cat: ExpenseCategory): string {
  switch (cat) {
    case 'CARNES':
    case 'POLLO':
    case 'HIELO':
    case 'BEBIDAS':
    case 'BEBIDAS_ALCOHOLICAS':
    case 'DELIVERYS_ACARREOS':
    case 'FRUTAS_VEGETALES':
    case 'SUPERMERCADO':
    case 'MERCADO':
    case 'LACTEOS':
    case 'PAGOS_PERSONAL':
    case 'OTROS':
      return cat;
    // Fallbacks para datos históricos / legados
    case ('CARNICERIA' as any):
      return 'CARNES';
    case ('VERDURAS_MERCADO' as any):
    case ('VERDURAS' as any):
      return 'FRUTAS_VEGETALES';
    case ('ENVIOS_FLETES' as any):
    case ('TRANSPORTE' as any):
    case ('SERVICIOS' as any):
      return 'DELIVERYS_ACARREOS';
    case ('ALIMENTOS' as any):
    case ('ABARROTES' as any):
      return 'SUPERMERCADO';
    default:
      return 'OTROS';
  }
}

export function mapCloudCategoryToLocal(cloudCat: string): ExpenseCategory {
  switch (cloudCat) {
    case 'CARNES':
    case 'POLLO':
    case 'HIELO':
    case 'BEBIDAS':
    case 'BEBIDAS_ALCOHOLICAS':
    case 'DELIVERYS_ACARREOS':
    case 'FRUTAS_VEGETALES':
    case 'SUPERMERCADO':
    case 'MERCADO':
    case 'LACTEOS':
    case 'PAGOS_PERSONAL':
    case 'OTROS':
      return cloudCat;
    // Compatibilidad retroactiva con categorías anteriores
    case 'CARNICERIA':
      return 'CARNES';
    case 'VERDURAS':
    case 'VERDURAS_MERCADO':
      return 'FRUTAS_VEGETALES';
    case 'ABARROTES':
    case 'ALIMENTOS':
      return 'SUPERMERCADO';
    case 'SERVICIOS':
    case 'ENVIOS_FLETES':
    case 'TRANSPORTE':
      return 'DELIVERYS_ACARREOS';
    default:
      return 'OTROS';
  }
}

/**
 * Detecta si una transacción de compras_gastos o de caja chica corresponde a un ingreso/fondeo
 */
export function isFondeoTransaction(g: any): boolean {
  if (!g) return false;
  if (g.tipo === 'INGRESO_FONDEO' || g.tipo === 'INFLOW') return true;
  if (g.categoria === 'FONDEO') return true;
  if (g.observaciones && (/\[TIPO:FONDEO\]/i.test(g.observaciones) || /\[TYPE:INFLOW\]/i.test(g.observaciones))) return true;
  const texto = `${g.concepto || ''} ${g.proveedor || ''}`.toLowerCase();
  if (
    texto.includes('deposito') ||
    texto.includes('depósito') ||
    texto.includes('depositado') ||
    texto.includes('fondeo') ||
    texto.includes('traslado a caja chica') ||
    texto.includes('traspaso a caja chica') ||
    texto.includes('aporte jefe') ||
    texto.includes('aporte de jefe') ||
    texto.includes('reembolso') ||
    texto.includes('inflow') ||
    texto.includes('correcion de saldo') ||
    texto.includes('correccion de saldo')
  ) {
    return true;
  }
  return false;
}

/**
 * Combina y actualiza las etiquetas estructuradas de observaciones de una jornada sin sobrescribir las demás
 */
export function mergeJornadaTags(
  currentObs: string = '',
  updates: {
    openingData?: any;
    fondosComposition?: any;
    ventasData?: any;
    closingAudit?: any;
    pettyClosing?: any;
    notesAppend?: string;
  }
): string {
  let obs = currentObs || '';

  let openingTag = '';
  if (updates.openingData !== undefined) {
    if (updates.openingData) openingTag = `[OPENING_DATA:${JSON.stringify(updates.openingData)}]`;
    obs = obs.replace(/\[OPENING_DATA:\{.*?\}\]\s*/g, '');
  } else {
    const m = obs.match(/\[OPENING_DATA:\{.*?\}\]/);
    if (m) openingTag = m[0];
  }

  let fondosTag = '';
  if (updates.fondosComposition !== undefined) {
    if (updates.fondosComposition) fondosTag = `[FONDOS_COMPOSITION:${JSON.stringify(updates.fondosComposition)}]`;
    obs = obs.replace(/\[FONDOS_COMPOSITION:\{.*?\}\]\s*/g, '');
  } else {
    const m = obs.match(/\[FONDOS_COMPOSITION:\{.*?\}\]/);
    if (m) fondosTag = m[0];
  }

  let ventasTag = '';
  if (updates.ventasData !== undefined) {
    if (updates.ventasData) ventasTag = `[VENTAS_DATA:${JSON.stringify(updates.ventasData)}]`;
    obs = obs.replace(/\[VENTAS_DATA:\{.*?\}\]\s*/g, '');
  } else {
    const m = obs.match(/\[VENTAS_DATA:\{.*?\}\]/);
    if (m) ventasTag = m[0];
  }

  let auditTag = '';
  if (updates.closingAudit !== undefined) {
    if (updates.closingAudit) auditTag = `[CLOSING_AUDIT:${JSON.stringify(updates.closingAudit)}]`;
    obs = obs.replace(/\[CLOSING_AUDIT:\{.*?\}\]\s*/g, '');
  } else {
    const m = obs.match(/\[CLOSING_AUDIT:\{.*?\}\]/);
    if (m) auditTag = m[0];
  }

  let pettyTag = '';
  if (updates.pettyClosing !== undefined) {
    if (updates.pettyClosing) pettyTag = `[PETTY_CLOSING:${JSON.stringify(updates.pettyClosing)}]`;
    obs = obs.replace(/\[PETTY_CLOSING:\{.*?\}\]\s*/g, '');
  } else {
    const m = obs.match(/\[PETTY_CLOSING:\{.*?\}\]/);
    if (m) pettyTag = m[0];
  }

  let cleanObs = obs
    .replace(/\[OPENING_DATA:\{.*?\}\]\s*/g, '')
    .replace(/\[FONDOS_COMPOSITION:\{.*?\}\]\s*/g, '')
    .replace(/\[VENTAS_DATA:\{.*?\}\]\s*/g, '')
    .replace(/\[CLOSING_AUDIT:\{.*?\}\]\s*/g, '')
    .replace(/\[PETTY_CLOSING:\{.*?\}\]\s*/g, '')
    .trim();

  if (updates.notesAppend) {
    cleanObs = cleanObs ? `${cleanObs} • ${updates.notesAppend}` : updates.notesAppend;
  }

  const parts = [openingTag, fondosTag, ventasTag, auditTag, pettyTag, cleanObs].filter(Boolean);
  return parts.join(' ').trim();
}

/**
 * Sincroniza la Apertura de Jornada de Caja Chica a Supabase
 */
export async function syncOpenShiftToCloud(shift: PettyCashShift): Promise<number | null> {
  try {
    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones, fondo_inicial')
      .eq('fecha', shift.date)
      .limit(1);

    const fondosComp = {
      previousDayRemaining: shift.previousDayRemaining,
      generalCashTransfer: shift.generalCashTransfer,
      bossContribution: shift.bossContribution,
      initialBalance: shift.initialBalance,
      openedBy: shift.openedBy,
    };

    if (existing && existing.length > 0) {
      const jornadaId = existing[0].id;
      const finalObs = mergeJornadaTags(existing[0].observaciones, {
        fondosComposition: fondosComp,
      });

      await supabase
        .from('jornadas_diarias')
        .update({
          estado: 'ABIERTA',
          responsable: shift.openedBy,
          observaciones: finalObs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jornadaId);
      return jornadaId;
    } else {
      const finalObs = mergeJornadaTags('', {
        fondosComposition: fondosComp,
        notesAppend: `Apertura Caja Chica por ${shift.openedBy}`,
      });

      const { data, error } = await supabase
        .from('jornadas_diarias')
        .insert({
          fecha: shift.date,
          turno: 'COMPLETO',
          estado: 'ABIERTA',
          fondo_inicial: shift.initialBalance,
          total_gastos_efectivo: 0,
          total_gastos_transferencia: 0,
          responsable: shift.openedBy,
          observaciones: finalObs,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo sincronizar apertura de caja chica con la nube:', err);
    return null;
  }
}

/**
 * Sincroniza el Cierre de Jornada de Caja Chica a Supabase
 */
export async function syncCloseShiftToCloud(shift: PettyCashShift): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones')
      .eq('fecha', shift.date)
      .limit(1);

    const pettyClosing = {
      actualCashCounted: shift.actualCashCounted || 0,
      expectedBalance: shift.expectedBalance || 0,
      difference: shift.difference || 0,
      auditStatus: shift.auditStatus || 'SQUARED',
      closedBy: shift.closedBy,
      closedAt: shift.closedAt || new Date().toISOString(),
    };

    const prevObs = existing && existing.length > 0 ? existing[0].observaciones : '';
    const finalObs = mergeJornadaTags(prevObs, {
      pettyClosing,
      notesAppend: `Cierre Caja Chica liquidado. Conteo físico: C$ ${(shift.actualCashCounted || 0).toFixed(2)}`,
    });

    if (existing && existing.length > 0) {
      await supabase
        .from('jornadas_diarias')
        .update({
          total_gastos_efectivo: shift.totalExpenses || 0,
          observaciones: finalObs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    }
  } catch (err) {
    console.warn('⚠️ No se pudo sincronizar cierre de caja chica:', err);
  }
}

/**
 * Sincroniza una transacción (gasto o fondeo/depósito) de Caja Chica a Supabase
 */
export async function syncTransactionToCloud(tx: PettyCashTransaction): Promise<number | null> {
  try {
    const isExpense = tx.type === 'EXPENSE';
    const isTransfer = tx.method === 'TRANSFER';
    const isCard = tx.method === 'CARD';
    const metodoPago = isTransfer ? 'TRANSFERENCIA' : isCard ? 'TARJETA' : 'EFECTIVO';
    const estadoPago = isTransfer ? 'PENDIENTE_TRANSFERENCIA' : 'PAGADO';

    const cloudCategory = isExpense ? mapCategoryToCloud(tx.category) : 'FONDEO';
    const cleanNotes = tx.notes?.trim();
    const cleanVendor = tx.vendor?.trim() || (isExpense ? 'Proveedor' : 'Gerencia / Caja General');
    const concepto =
      cleanNotes && cleanNotes.toLowerCase() !== cleanVendor.toLowerCase()
        ? `${cleanVendor} - ${cleanNotes}`
        : cleanVendor;
    const isOpeningTransfer =
      tx.id?.startsWith('pct-transfer-open-') ||
      isOpeningPettyCashTx(tx);

    const clientIdTag = tx.id ? `[CLIENT_ID:${tx.id}]` : '';
    let baseObs = isExpense
      ? (tx.receiptNumber ? `Doc: ${tx.receiptNumber}` : '')
      : isOpeningTransfer
        ? (tx.receiptNumber ? `[OPENING_TRANSFER:TRUE] [TIPO:FONDEO] Doc: ${tx.receiptNumber}` : '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO] Traspaso desde Caja General')
        : (tx.receiptNumber ? `[TIPO:FONDEO] Doc: ${tx.receiptNumber}` : '[TIPO:FONDEO] Depósito a caja chica');

    const observaciones = clientIdTag ? (baseObs ? `${baseObs} ${clientIdTag}` : clientIdTag) : (baseObs || null);

    let cloudJornadaId: number | null = null;
    // 1. Extraer fecha comercial desde shiftId prioritariamente (ej: pc-shift-2026-10-02) para respetar el turno abierto
    let commercialDate = '';
    if (tx.shiftId && tx.shiftId.startsWith('pc-shift-')) {
      commercialDate = tx.shiftId.replace('pc-shift-', '');
    } else if (tx.date) {
      commercialDate = tx.date.slice(0, 10);
    }

    if (commercialDate) {
      const { data: jData } = await supabase
        .from('jornadas_diarias')
        .select('id')
        .eq('fecha', commercialDate)
        .order('id', { ascending: false })
        .limit(1);
      if (jData && jData.length > 0) {
        cloudJornadaId = jData[0].id;
      }
    }

    // Si aún no se encontró jornada y hay una ABIERTA, asociar a la jornada abierta activa
    if (!cloudJornadaId) {
      const { data: openJornada } = await supabase
        .from('jornadas_diarias')
        .select('id')
        .eq('estado', 'ABIERTA')
        .order('id', { ascending: false })
        .limit(1);
      if (openJornada && openJornada.length > 0) {
        cloudJornadaId = openJornada[0].id;
      }
    }

    // 2. Blindaje Anti-Duplicados (Idempotencia Fuerte):
    // Paso A: Verificar por CLIENT_ID único si ya fue insertado en Supabase
    if (tx.id) {
      const { data: existingByClientId } = await supabase
        .from('compras_gastos')
        .select('id')
        .ilike('observaciones', `%[CLIENT_ID:${tx.id}]%`)
        .limit(1);
      if (existingByClientId && existingByClientId.length > 0) {
        console.log(`ℹ️ Transacción ya existía en la nube por CLIENT_ID (${existingByClientId[0].id}). Se vincula sin duplicar.`);
        return existingByClientId[0].id;
      }
    }

    // Paso B: Verificar si ya existe en Supabase una idéntica reciente (monto, forma de pago y proveedor en los últimos 3 min)
    if (cloudJornadaId) {
      const { data: existingDup } = await supabase
        .from('compras_gastos')
        .select('id, concepto, proveedor, created_at')
        .eq('jornada_id', cloudJornadaId)
        .eq('monto', tx.amount)
        .eq('metodo_pago', metodoPago)
        .order('id', { ascending: false })
        .limit(5);

      if (existingDup && existingDup.length > 0) {
        const targetVendorLower = (tx.vendor || cleanVendor).trim().toLowerCase();
        const match = existingDup.find((ed) => {
          const prov = (ed.proveedor || '').trim().toLowerCase();
          const conc = (ed.concepto || '').trim().toLowerCase();
          const isSameParty = prov === targetVendorLower || conc.includes(targetVendorLower) || prov.includes(targetVendorLower);
          const timeDiff = Math.abs(Date.now() - new Date(ed.created_at).getTime());
          return isSameParty && timeDiff < 180000; // 3 minutos
        });
        if (match) {
          console.log(`ℹ️ Transacción idéntica reciente detectada en la nube (#${match.id}). Se vincula sin duplicar.`);
          return match.id;
        }
      }
    }

    const { data, error } = await supabase
      .from('compras_gastos')
      .insert({
        jornada_id: cloudJornadaId,
        fecha_hora: tx.date || new Date().toISOString(),
        concepto: concepto || (isExpense ? 'Gasto Caja Chica' : 'Depósito a caja chica'),
        categoria: cloudCategory,
        proveedor: tx.vendor || (isExpense ? 'Proveedor' : 'Gerencia / Caja General'),
        monto: tx.amount,
        metodo_pago: metodoPago,
        estado_pago: isExpense ? estadoPago : 'PAGADO',
        registrado_por: tx.registeredBy || 'Bodegón Control PC',
        observaciones: observaciones,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.warn('⚠️ No se pudo registrar transacción en la nube (quedará en bandeja de reintento):', err);
    return null;
  }
}

/**
 * Actualiza una transacción existente (gasto o fondeo) en Supabase
 */
export async function updateTransactionInCloud(tx: PettyCashTransaction): Promise<boolean> {
  try {
    let targetId: number | null = null;
    if (tx.cloudId) {
      targetId = tx.cloudId;
    } else if (tx.id.startsWith('pct-cloud-')) {
      const parsed = parseInt(tx.id.replace('pct-cloud-', ''), 10);
      if (!isNaN(parsed)) targetId = parsed;
    }

    if (!targetId) {
      console.warn('⚠️ Transacción sin cloudId para actualizar en la nube:', tx.id);
      return false;
    }

    const isExpense = tx.type === 'EXPENSE';
    const isTransfer = tx.method === 'TRANSFER';
    const isCard = tx.method === 'CARD';
    const metodoPago = isTransfer ? 'TRANSFERENCIA' : isCard ? 'TARJETA' : 'EFECTIVO';
    const estadoPago = isTransfer ? 'PENDIENTE_TRANSFERENCIA' : 'PAGADO';
    const cloudCategory = isExpense ? mapCategoryToCloud(tx.category) : 'FONDEO';
    const cleanNotes = tx.notes?.trim();
    const cleanVendor = tx.vendor?.trim() || (isExpense ? 'Proveedor' : 'Gerencia / Caja General');
    const concepto =
      cleanNotes && cleanNotes.toLowerCase() !== cleanVendor.toLowerCase()
        ? `${cleanVendor} - ${cleanNotes}`
        : cleanVendor;
    const observaciones = isExpense
      ? (tx.receiptNumber ? `Doc: ${tx.receiptNumber}` : null)
      : (tx.receiptNumber ? `[TIPO:FONDEO] Doc: ${tx.receiptNumber}` : '[TIPO:FONDEO] Depósito a caja chica');

    const updatePayload: any = {
      monto: tx.amount,
      concepto,
      proveedor: tx.vendor,
      categoria: cloudCategory,
      metodo_pago: metodoPago,
      estado_pago: isExpense ? estadoPago : 'PAGADO',
      observaciones,
      updated_at: new Date().toISOString(),
    };
    if (tx.date) updatePayload.fecha_hora = tx.date;

    const { error } = await supabase
      .from('compras_gastos')
      .update(updatePayload)
      .eq('id', targetId);

    if (error) throw error;
    console.log(`✅ Transacción ID #${targetId} actualizada exitosamente en Supabase.`);
    return true;
  } catch (err) {
    console.warn('⚠️ Error al actualizar transacción en Supabase:', err);
    return false;
  }
}

/**
 * Procesa la bandeja de transacciones pendientes (Outbox Queue)
 * Retorna las transacciones actualizadas con su nuevo cloudId y syncStatus.
 */
export async function processOutboxQueue(
  transactions: PettyCashTransaction[]
): Promise<{ updated: PettyCashTransaction[]; syncedCount: number }> {
  let syncedCount = 0;
  const updated = [...transactions];

  for (let i = 0; i < updated.length; i++) {
    const tx = updated[i];
    // Sincronizar si no tiene cloudId oficial y no es una fila sintética de apertura
    if (!tx.cloudId && !tx.id.startsWith('pct-cloud-') && !tx.id.startsWith('opening-') && !tx.id.startsWith('pct-init-')) {
      try {
        const newCloudId = await syncTransactionToCloud(tx);
        if (newCloudId) {
          syncedCount++;
          updated[i] = {
            ...tx,
            id: `pct-cloud-${newCloudId}`,
            cloudId: newCloudId,
            syncStatus: 'SYNCED',
            syncError: undefined,
          };
        } else {
          updated[i] = {
            ...tx,
            syncStatus: 'PENDING',
            syncError: 'Pendiente de conexión con la nube',
          };
        }
      } catch {
        updated[i] = {
          ...tx,
          syncStatus: 'PENDING',
          syncError: 'Pendiente de conexión con la nube',
        };
      }
    }
  }

  return { updated, syncedCount };
}

/**
 * Elimina una transacción (gasto o fondeo/depósito) de Caja Chica en Supabase
 */
export async function deleteTransactionFromCloud(tx: PettyCashTransaction): Promise<boolean> {
  try {
    let targetId: number | null = null;
    if (tx.cloudId) {
      targetId = tx.cloudId;
    } else if (tx.id.startsWith('pct-cloud-')) {
      const parsed = parseInt(tx.id.replace('pct-cloud-', ''), 10);
      if (!isNaN(parsed)) targetId = parsed;
    }

    if (targetId) {
      const { error } = await supabase.from('compras_gastos').delete().eq('id', targetId);
      if (error) throw error;
      return true;
    }

    // Fallback: si no tiene cloudId directo, buscar por proveedor, monto y fecha del día
    const datePrefix = (tx.date || '').slice(0, 10);
    const { data: matches } = await supabase
      .from('compras_gastos')
      .select('id, fecha_hora, monto, proveedor')
      .eq('proveedor', tx.vendor)
      .eq('monto', tx.amount)
      .gte('fecha_hora', `${datePrefix}T00:00:00`)
      .lte('fecha_hora', `${datePrefix}T23:59:59`)
      .order('id', { ascending: false })
      .limit(1);

    if (matches && matches.length > 0) {
      const { error: delError } = await supabase.from('compras_gastos').delete().eq('id', matches[0].id);
      if (delError) throw delError;
      return true;
    }

    return true;
  } catch (err) {
    console.warn('⚠️ No se pudo eliminar transacción en la nube:', err);
    return false;
  }
}

/**
 * Carga el estado actual de la nube para inicializar el sistema al abrir el .exe
 */
export async function fetchCloudActiveShift(): Promise<{
  isOpen: boolean;
  jornada: any | null;
  gastos: any[];
}> {
  try {
    const [{ data: jData }, { data: gData }] = await Promise.all([
      supabase.from('jornadas_diarias').select('*').neq('turno', 'CONFIG').order('id', { ascending: false }).limit(1),
      supabase.from('compras_gastos').select('*').order('fecha_hora', { ascending: false }).limit(200),
    ]);

    const ultimaJornada = jData && jData.length > 0 ? jData[0] : null;
    const today = getLocalTodayStr();
    // Solo se considera abierta si su estado es ABIERTA y corresponde al día actual de hoy
    const isOpen = ultimaJornada?.estado === 'ABIERTA' && ultimaJornada?.fecha === today;

    return {
      isOpen,
      jornada: ultimaJornada,
      gastos: gData || [],
    };
  } catch (err) {
    console.warn('⚠️ Error al consultar la nube al inicio (usando local):', err);
    return { isOpen: false, jornada: null, gastos: [] };
  }
}

/**
 * Sincroniza las ventas y ganancias del Cierre de Caja General a Supabase
 */
export async function syncGeneralCashShiftToCloud(shift: CashShift): Promise<void> {
  try {
    const cash = shift.salesCashSystem ?? shift.loyverseValidation?.salesCashLoyverse ?? 0;
    const cards = shift.totalCards ?? (
      (shift.cardsBAC || 0) + (shift.cardsFicohsa || 0) + (shift.cardsBanpro || 0) + (shift.cardsLafise || 0)
    );
    const pedidosYa = shift.salesPedidosYa ?? shift.loyverseValidation?.salesPedidosYa ?? 0;
    const otherIncome = shift.otherIncome || 0;
    const gross = shift.totalGrossSales ?? (cash + cards + pedidosYa + otherIncome);

    const salesDataObj = {
      salesCash: cash,
      cardsBAC: shift.cardsBAC || 0,
      cardsFicohsa: shift.cardsFicohsa || 0,
      cardsBanpro: shift.cardsBanpro || 0,
      cardsLafise: shift.cardsLafise || 0,
      totalCards: cards,
      salesPedidosYa: pedidosYa,
      otherIncome: otherIncome,
      otherIncomeNotes: shift.otherIncomeNotes || '',
      totalGrossSales: gross,
      tips: shift.totalTipCollected || 0,
      updatedAt: new Date().toISOString(),
    };

    const auditObj = {
      actualCashNIO: shift.actualCashNIO || 0,
      netCashAfterTipsNIO: shift.netCashAfterTipsNIO || (shift.totalTipCollected ? Math.max(0, (shift.actualCashNIO || 0) - shift.totalTipCollected) : shift.actualCashNIO || 0),
      expectedCashNIO: shift.expectedCashNIO || 0,
      differenceNIO: shift.differenceNIO || 0,
      auditStatus: shift.auditStatus || 'SQUARED',
      dailyNetProfit: shift.dailyNetProfit || 0,
      closedBy: shift.closedBy,
      closedAt: shift.closedAt,
    };

    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones')
      .eq('fecha', shift.date)
      .limit(1);

    const prevObs = existing && existing.length > 0 ? existing[0].observaciones : '';
    const finalObs = mergeJornadaTags(prevObs, {
      ventasData: salesDataObj,
      closingAudit: shift.status === 'CLOSED' ? auditObj : undefined,
    });

    const updateData: any = {
      observaciones: finalObs,
      updated_at: new Date().toISOString(),
    };
    if (shift.status === 'CLOSED') {
      updateData.estado = 'CERRADA';
      updateData.fecha_cierre = shift.closedAt || new Date().toISOString();
    }

    if (existing && existing.length > 0) {
      await supabase
        .from('jornadas_diarias')
        .update(updateData)
        .eq('id', existing[0].id);
    } else {
      await supabase.from('jornadas_diarias').insert({
        fecha: shift.date,
        turno: 'COMPLETO',
        estado: shift.status === 'CLOSED' ? 'CERRADA' : 'ABIERTA',
        fondo_inicial: shift.totalOpeningEquivNIO || 0,
        responsable: shift.closedBy || shift.openedBy || 'Caja Principal',
        observaciones: finalObs,
        fecha_cierre: shift.status === 'CLOSED' ? (shift.closedAt || new Date().toISOString()) : null,
      });
    }
  } catch (err) {
    console.warn('⚠️ No se pudo respaldar ventas de Caja General en Supabase (modo offline):', err);
  }
}

/**
 * Sincroniza la Apertura Unificada de la Jornada (General + Caja Chica)
 * Evita la condición de carrera de crear dos filas separadas en jornadas_diarias
 */
export async function syncUnifiedDayOpeningToCloud(
  generalShift: CashShift,
  pettyShift?: PettyCashShift | null
): Promise<void> {
  try {
    const openingData = {
      totalOpeningNIO: generalShift.totalOpeningNIO,
      totalOpeningUSD: generalShift.totalOpeningUSD,
      exchangeRate: generalShift.exchangeRate,
      openingNotes: generalShift.openingNotes || '',
      openedBy: generalShift.openedBy,
      totalOpeningEquivNIO: generalShift.totalOpeningEquivNIO,
      openingNIO: generalShift.openingNIO,
      openingUSD: generalShift.openingUSD,
      openingCashCountedNIO: generalShift.openingCashCountedNIO,
      openingTransferToPettyCash: generalShift.openingTransferToPettyCash || generalShift.transferToPettyCash,
    };

    const fondosComp = pettyShift
      ? {
          previousDayRemaining: pettyShift.previousDayRemaining,
          generalCashTransfer: pettyShift.generalCashTransfer,
          bossContribution: pettyShift.bossContribution,
          initialBalance: pettyShift.initialBalance,
          openedBy: pettyShift.openedBy,
        }
      : undefined;

    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones, fondo_inicial')
      .eq('fecha', generalShift.date)
      .limit(1);

    if (existing && existing.length > 0) {
      const finalObs = mergeJornadaTags(existing[0].observaciones, {
        openingData,
        fondosComposition: fondosComp,
      });

      await supabase
        .from('jornadas_diarias')
        .update({
          estado: 'ABIERTA',
          responsable: generalShift.openedBy,
          fondo_inicial: pettyShift?.initialBalance ?? existing[0].fondo_inicial ?? generalShift.totalOpeningEquivNIO,
          observaciones: finalObs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      const finalObs = mergeJornadaTags('', {
        openingData,
        fondosComposition: fondosComp,
        notesAppend: `Apertura realizada por ${generalShift.openedBy} con C$ ${generalShift.totalOpeningEquivNIO.toFixed(2)} en General` +
          (pettyShift ? ` y C$ ${pettyShift.initialBalance.toFixed(2)} en Caja Chica` : ''),
      });

      await supabase.from('jornadas_diarias').insert({
        fecha: generalShift.date,
        turno: 'COMPLETO',
        estado: 'ABIERTA',
        fondo_inicial: pettyShift?.initialBalance ?? generalShift.totalOpeningEquivNIO,
        total_gastos_efectivo: 0,
        total_gastos_transferencia: 0,
        responsable: generalShift.openedBy,
        observaciones: finalObs,
      });
    }
  } catch (err) {
    console.warn('⚠️ No se pudo respaldar apertura unificada en Supabase:', err);
  }
}

/**
 * Sincroniza la Apertura de Caja General a Supabase (notifica a otras PCs y a la web)
 */
export async function syncGeneralCashOpeningToCloud(shift: CashShift): Promise<void> {
  return syncUnifiedDayOpeningToCloud(shift, null);
}

/**
 * Cierre unificado y atómico de la jornada completa (Caja General + Caja Chica)
 * Evita condiciones de carrera y sobrescritura de observaciones.
 */
export async function syncFullDayClosureToCloud({
  generalShift,
  pettyShift,
}: {
  generalShift: CashShift;
  pettyShift?: PettyCashShift | null;
}): Promise<void> {
  try {
    const cash = generalShift.salesCashSystem ?? generalShift.loyverseValidation?.salesCashLoyverse ?? 0;
    const cards = generalShift.totalCards ?? (
      (generalShift.cardsBAC || 0) + (generalShift.cardsFicohsa || 0) + (generalShift.cardsBanpro || 0) + (generalShift.cardsLafise || 0)
    );
    const pedidosYa = generalShift.salesPedidosYa ?? generalShift.loyverseValidation?.salesPedidosYa ?? 0;
    const otherIncome = generalShift.otherIncome || 0;
    const gross = generalShift.totalGrossSales ?? (cash + cards + pedidosYa + otherIncome);

    const salesDataObj = {
      salesCash: cash,
      cardsBAC: generalShift.cardsBAC || 0,
      cardsFicohsa: generalShift.cardsFicohsa || 0,
      cardsBanpro: generalShift.cardsBanpro || 0,
      cardsLafise: generalShift.cardsLafise || 0,
      totalCards: cards,
      salesPedidosYa: pedidosYa,
      otherIncome: otherIncome,
      otherIncomeNotes: generalShift.otherIncomeNotes || '',
      totalGrossSales: gross,
      tips: generalShift.totalTipCollected || 0,
      updatedAt: new Date().toISOString(),
    };

    const auditObj = {
      actualCashNIO: generalShift.actualCashNIO || 0,
      expectedCashNIO: generalShift.expectedCashNIO || 0,
      differenceNIO: generalShift.differenceNIO || 0,
      auditStatus: generalShift.auditStatus || 'SQUARED',
      dailyNetProfit: generalShift.dailyNetProfit || 0,
      closedBy: generalShift.closedBy,
      closedAt: generalShift.closedAt || new Date().toISOString(),
      totalClosingEquivNIO: generalShift.totalClosingEquivNIO || generalShift.actualCashNIO || 0,
      totalClosingNIO: generalShift.totalClosingNIO || 0,
      totalClosingUSD: generalShift.totalClosingUSD || 0,
      closingNIO: generalShift.closingNIO,
      closingUSD: generalShift.closingUSD,
    };

    let pettyClosing: any = undefined;
    if (pettyShift) {
      pettyClosing = {
        actualCashCounted: pettyShift.actualCashCounted || 0,
        expectedBalance: pettyShift.expectedBalance || 0,
        difference: pettyShift.difference || 0,
        auditStatus: pettyShift.auditStatus || 'SQUARED',
        closedBy: pettyShift.closedBy || generalShift.closedBy,
        closedAt: pettyShift.closedAt || generalShift.closedAt || new Date().toISOString(),
      };
    }

    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones')
      .eq('fecha', generalShift.date)
      .limit(1);

    const prevObs = existing && existing.length > 0 ? existing[0].observaciones : '';
    const finalObs = mergeJornadaTags(prevObs, {
      ventasData: salesDataObj,
      closingAudit: auditObj,
      pettyClosing,
      notesAppend: `Cierre del día conciliado por ${generalShift.closedBy || 'Admin'}`,
    });

    const updatePayload: any = {
      estado: 'CERRADA',
      fecha_cierre: generalShift.closedAt || new Date().toISOString(),
      observaciones: finalObs,
      updated_at: new Date().toISOString(),
    };
    if (pettyShift?.totalExpenses !== undefined) {
      updatePayload.total_gastos_efectivo = pettyShift.totalExpenses;
    }

    if (existing && existing.length > 0) {
      await supabase
        .from('jornadas_diarias')
        .update(updatePayload)
        .eq('id', existing[0].id);
    } else {
      await supabase.from('jornadas_diarias').insert({
        fecha: generalShift.date,
        turno: 'COMPLETO',
        estado: 'CERRADA',
        fondo_inicial: generalShift.totalOpeningEquivNIO || 0,
        total_gastos_efectivo: pettyShift?.totalExpenses || 0,
        responsable: generalShift.closedBy || 'Admin',
        observaciones: finalObs,
        fecha_cierre: generalShift.closedAt || new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('⚠️ Error sincronizando cierre unificado del día:', err);
  }
}

/**
 * Elimina de compras_gastos cualquier traspaso o fondeo de apertura residual al cancelar jornada
 */
export async function syncDeleteOpeningTransfersFromCloud(shiftDate: string): Promise<void> {
  try {
    // 1. Buscar jornadas correspondientes a la fecha
    const { data: jornadas } = await supabase
      .from('jornadas_diarias')
      .select('id')
      .eq('fecha', shiftDate);

    const jornadaIds = (jornadas || []).map((j) => j.id);

    // 2. Borrar por jornada_id
    for (const jId of jornadaIds) {
      await supabase
        .from('compras_gastos')
        .delete()
        .eq('jornada_id', jId)
        .or('proveedor.ilike.%Caja General%,observaciones.ilike.%OPENING_TRANSFER%,observaciones.ilike.%deducido al abrir%');
    }

    // 3. Borrar por rango de fecha_hora
    await supabase
      .from('compras_gastos')
      .delete()
      .gte('fecha_hora', `${shiftDate}T00:00:00`)
      .lte('fecha_hora', `${shiftDate}T23:59:59`)
      .or('proveedor.ilike.%Caja General%,observaciones.ilike.%OPENING_TRANSFER%,observaciones.ilike.%deducido al abrir%');

    console.log(`🧹 Fondeos/traspasos de apertura cancelados purgados en la nube para ${shiftDate}`);
  } catch (err) {
    console.warn('⚠️ No se pudieron purgar fondeos de apertura cancelados en Supabase:', err);
  }
}

/**
 * Cancela una jornada abierta en Supabase (alertando a las demás PCs y a la web)
 */
export async function syncCancelShiftToCloud(shiftDate: string): Promise<void> {
  try {
    await supabase
      .from('jornadas_diarias')
      .update({
        estado: 'CANCELADA',
        observaciones: `Apertura cancelada el ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('fecha', shiftDate)
      .eq('estado', 'ABIERTA');

    // Purgar transferencias de apertura huérfanas
    await syncDeleteOpeningTransfersFromCloud(shiftDate);
  } catch (err) {
    console.warn('⚠️ No se pudo cancelar jornada en Supabase:', err);
  }
}

/**
 * Cancela una apertura de Caja Chica en Supabase
 */
export async function syncCancelPettyCashShiftToCloud(shiftDate: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones, estado')
      .eq('fecha', shiftDate)
      .limit(1);

    if (existing && existing.length > 0) {
      const row = existing[0];
      const hasGeneralOpening = (row.observaciones || '').includes('[OPENING_DATA:');
      const finalObs = mergeJornadaTags(row.observaciones, {
        fondosComposition: null,
        notesAppend: `Turno de Caja Chica cancelado el ${new Date().toISOString()}`,
      });

      const updatePayload: any = {
        observaciones: finalObs,
        updated_at: new Date().toISOString(),
      };
      if (!hasGeneralOpening && row.estado === 'ABIERTA') {
        updatePayload.estado = 'CANCELADA';
      }

      await supabase
        .from('jornadas_diarias')
        .update(updatePayload)
        .eq('id', row.id);
    }

    // Purgar transferencias de apertura huérfanas
    await syncDeleteOpeningTransfersFromCloud(shiftDate);
  } catch (err) {
    console.warn('⚠️ No se pudo cancelar turno de caja chica en la nube:', err);
  }
}

/**
 * Reconstruye un objeto CashShift a partir de una fila de Supabase jornadas_diarias
 */
export function parseShiftFromJornada(j: any, existingShift?: CashShift | null): CashShift {
  const date = j.fecha;
  const isClosed = j.estado === 'CERRADA';
  const obs = j.observaciones || '';

  // 1. Datos de apertura
  let totalOpeningNIO = existingShift?.totalOpeningNIO || Number(j.fondo_inicial) || 0;
  let totalOpeningUSD = existingShift?.totalOpeningUSD || 0;
  let exchangeRate = existingShift?.exchangeRate || 36.0;
  let openingNotes = existingShift?.openingNotes || '';
  let openingNIO = existingShift?.openingNIO || DEFAULT_DENOMINATIONS_NIO;
  let openingUSD = existingShift?.openingUSD || DEFAULT_DENOMINATIONS_USD;
  let openingCashCountedNIO = existingShift?.openingCashCountedNIO || 0;
  let openingTransferToPettyCash = existingShift?.openingTransferToPettyCash || existingShift?.transferToPettyCash || 0;

  const fondosMatch = obs.match(/\[FONDOS_COMPOSITION:(\{.*?\})\]/);
  if (fondosMatch && fondosMatch[1]) {
    try {
      const fc = JSON.parse(fondosMatch[1]);
      if (fc.generalCashTransfer) {
        openingTransferToPettyCash = Number(fc.generalCashTransfer) || openingTransferToPettyCash;
      }
    } catch {}
  }

  const openMatch = obs.match(/\[OPENING_DATA:(\{.*?\})\]/);
  if (openMatch && openMatch[1]) {
    try {
      const p = JSON.parse(openMatch[1]);
      totalOpeningNIO = Number(p.totalOpeningNIO) || totalOpeningNIO;
      totalOpeningUSD = Number(p.totalOpeningUSD) || totalOpeningUSD;
      exchangeRate = Number(p.exchangeRate) || exchangeRate;
      if (p.openingNotes) openingNotes = p.openingNotes;
      if (p.openingNIO) openingNIO = p.openingNIO;
      if (p.openingUSD) openingUSD = p.openingUSD;
      if (p.openingCashCountedNIO) openingCashCountedNIO = Number(p.openingCashCountedNIO);
      if (p.openingTransferToPettyCash) openingTransferToPettyCash = Number(p.openingTransferToPettyCash);
    } catch {}
  }

  if (!openingCashCountedNIO && openingTransferToPettyCash > 0) {
    openingCashCountedNIO = totalOpeningNIO + openingTransferToPettyCash;
  }

  // El fondo de gaveta física de apertura es estrictamente en Córdobas (los dólares se entregan al jefe Snyder)
  const totalOpeningEquivNIO = totalOpeningNIO > 0 ? totalOpeningNIO : (Number(j.fondo_inicial) || 0);

  // 2. Datos de ventas
  let salesCash = existingShift?.salesCashSystem || 0;
  let cardsBAC = existingShift?.cardsBAC || 0;
  let cardsFicohsa = existingShift?.cardsFicohsa || 0;
  let cardsBanpro = existingShift?.cardsBanpro || 0;
  let cardsLafise = existingShift?.cardsLafise || 0;
  let totalCards = existingShift?.totalCards || 0;
  let salesPedidosYa = existingShift?.salesPedidosYa || 0;
  let otherIncome = existingShift?.otherIncome || 0;
  let otherIncomeNotes = existingShift?.otherIncomeNotes || '';
  let totalGrossSales = existingShift?.totalGrossSales || 0;
  let totalTipCollected = existingShift?.totalTipCollected || 0;
  let tipPaid = existingShift?.tipPaid;
  let tipDistributedTotal = existingShift?.tipDistributedTotal;

  const salesMatch = obs.match(/\[VENTAS_DATA:(\{.*?\})\]/);
  if (salesMatch && salesMatch[1]) {
    try {
      const s = JSON.parse(salesMatch[1]);
      salesCash = Number(s.salesCash) || 0;
      cardsBAC = Number(s.cardsBAC) || 0;
      cardsFicohsa = Number(s.cardsFicohsa) || 0;
      cardsBanpro = Number(s.cardsBanpro) || 0;
      cardsLafise = Number(s.cardsLafise) || 0;
      totalCards = Number(s.totalCards) || (cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise);
      salesPedidosYa = Number(s.salesPedidosYa) || 0;
      otherIncome = Number(s.otherIncome) || 0;
      if (s.otherIncomeNotes) otherIncomeNotes = s.otherIncomeNotes;
      totalGrossSales = Number(s.totalGrossSales) || (salesCash + totalCards + salesPedidosYa + otherIncome);
      totalTipCollected = Number(s.tips) || Number(s.totalTipCollected) || 0;
      if (s.tipPaid !== undefined) tipPaid = Boolean(s.tipPaid);
      if (s.tipDistributedTotal !== undefined) tipDistributedTotal = Number(s.tipDistributedTotal);
    } catch {}
  }

  // 3. Datos de auditoría de cierre
  const auditMatch = obs.match(/\[CLOSING_AUDIT:(\{.*?\})\]/);
  let actualCashNIO = existingShift?.actualCashNIO || totalOpeningEquivNIO + salesCash - totalTipCollected;
  let netCashAfterTipsNIO = existingShift?.netCashAfterTipsNIO || (totalTipCollected > 0 ? Math.max(0, actualCashNIO - totalTipCollected) : actualCashNIO);
  let expectedCashNIO = existingShift?.expectedCashNIO || Math.max(0, salesCash - totalTipCollected);
  let differenceNIO = existingShift?.differenceNIO || 0;
  let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = existingShift?.auditStatus || 'SQUARED';
  let dailyNetProfit = existingShift?.dailyNetProfit || totalGrossSales;
  let totalClosingEquivNIO = existingShift?.totalClosingEquivNIO || (isClosed ? netCashAfterTipsNIO : undefined);
  let totalClosingNIO = existingShift?.totalClosingNIO || (isClosed ? actualCashNIO : undefined);
  let totalClosingUSD = existingShift?.totalClosingUSD || (isClosed ? 0 : undefined);
  let closingNIO = existingShift?.closingNIO;
  let closingUSD = existingShift?.closingUSD;

  if (auditMatch && auditMatch[1]) {
    try {
      const a = JSON.parse(auditMatch[1]);
      if (a.actualCashNIO !== undefined) actualCashNIO = Number(a.actualCashNIO);
      if (a.netCashAfterTipsNIO !== undefined) {
        netCashAfterTipsNIO = Number(a.netCashAfterTipsNIO);
      } else if (totalTipCollected > 0) {
        netCashAfterTipsNIO = Math.max(0, actualCashNIO - totalTipCollected);
      }
      if (a.expectedCashNIO !== undefined) expectedCashNIO = Number(a.expectedCashNIO);
      if (a.differenceNIO !== undefined) differenceNIO = Number(a.differenceNIO);
      if (a.auditStatus) auditStatus = a.auditStatus;
      if (a.dailyNetProfit !== undefined) dailyNetProfit = Number(a.dailyNetProfit);
      if (a.totalClosingEquivNIO !== undefined) totalClosingEquivNIO = Number(a.totalClosingEquivNIO);
      if (a.totalClosingNIO !== undefined) totalClosingNIO = Number(a.totalClosingNIO);
      if (a.totalClosingUSD !== undefined) totalClosingUSD = Number(a.totalClosingUSD);
      if (a.closingNIO) closingNIO = a.closingNIO;
      if (a.closingUSD) closingUSD = a.closingUSD;
      if (a.tipPaid !== undefined) tipPaid = Boolean(a.tipPaid);
      if (a.totalTipCollected !== undefined) totalTipCollected = Number(a.totalTipCollected);
      if (a.tipDistributedTotal !== undefined) tipDistributedTotal = Number(a.tipDistributedTotal);
    } catch {}
  }

  if (isClosed && totalTipCollected > 0 && tipPaid === undefined) {
    tipPaid = true;
  }

  if (isClosed && (!totalClosingEquivNIO || totalClosingEquivNIO === 0) && netCashAfterTipsNIO > 0) {
    totalClosingEquivNIO = netCashAfterTipsNIO;
    totalClosingNIO = actualCashNIO;
  }

  return {
    id: existingShift?.id || `shift-${date}-${j.id}`,
    date,
    status: isClosed ? 'CLOSED' : 'OPEN',
    exchangeRate,
    openedBy: j.responsable || existingShift?.openedBy || 'Caja Principal',
    openedAt: j.created_at || existingShift?.openedAt || new Date().toISOString(),
    closedBy: isClosed ? (existingShift?.closedBy || j.responsable || 'Admin') : undefined,
    closedAt: j.fecha_cierre || existingShift?.closedAt || undefined,
    verifiedPreviousClosingId: existingShift?.verifiedPreviousClosingId || null,
    openingNotes,
    openingNIO,
    openingUSD,
    totalOpeningNIO,
    totalOpeningUSD,
    totalOpeningEquivNIO,
    openingCashCountedNIO: openingCashCountedNIO > 0 ? openingCashCountedNIO : undefined,
    openingTransferToPettyCash: openingTransferToPettyCash > 0 ? openingTransferToPettyCash : undefined,
    transferToPettyCash: openingTransferToPettyCash > 0 ? openingTransferToPettyCash : existingShift?.transferToPettyCash,
    closingNIO,
    closingUSD,
    totalClosingNIO,
    totalClosingUSD,
    totalClosingEquivNIO,
    salesCashSystem: salesCash,
    cardsBAC,
    cardsFicohsa,
    cardsBanpro,
    cardsLafise,
    totalCards,
    salesPedidosYa,
    otherIncome,
    otherIncomeNotes,
    totalGrossSales,
    totalTipCollected,
    tipPaid,
    tipDistributedTotal: tipDistributedTotal || (totalTipCollected > 0 ? totalTipCollected : undefined),
    actualCashNIO,
    netCashAfterTipsNIO,
    expectedCashNIO,
    differenceNIO,
    auditStatus,
    dailyNetProfit,
  };
}

/**
 * Consulta el estado completo de la nube para mantener sincronizadas múltiples computadoras y la web
 */
export async function fetchFullCloudState(): Promise<{
  activeShift: CashShift | null;
  activePettyShift: PettyCashShift | null;
  shiftHistory: CashShift[];
  pettyCashShiftHistory: PettyCashShift[];
  gastos: any[];
}> {
  try {
    const today = getLocalTodayStr();
    const [{ data: jData }, { data: gData }] = await Promise.all([
      supabase.from('jornadas_diarias').select('*').neq('turno', 'CONFIG').order('fecha', { ascending: false }).limit(45),
      supabase.from('compras_gastos').select('*').order('fecha_hora', { ascending: false }).limit(350),
    ]);

    const jornadas = (jData || []) as any[];
    let activeShift: CashShift | null = null;
    let activePettyShift: PettyCashShift | null = null;
    const shiftHistory: CashShift[] = [];
    const pettyCashShiftHistory: PettyCashShift[] = [];

    for (const j of jornadas) {
      const obs = j.observaciones || '';
      const hasGeneralOpening = /\[OPENING_DATA:\{.*?\}\]/.test(obs);
      const hasPettyOpening = /\[FONDOS_COMPOSITION:\{.*?\}\]/.test(obs);
      const hasPettyClosing = /\[PETTY_CLOSING:\{.*?\}\]/.test(obs) || /Cierre liquidado/.test(obs);

      if (j.estado === 'ABIERTA' && j.fecha === today) {
        if (hasGeneralOpening) {
          activeShift = parseShiftFromJornada(j);
        }
        if (hasPettyOpening && !hasPettyClosing) {
          let prevDay = Number(j.fondo_inicial) || 0;
          let genTrans = 0;
          let bossCont = 0;
          let initBal = Number(j.fondo_inicial) || 0;
          const match = obs.match(/\[FONDOS_COMPOSITION:(\{.*?\})\]/);
          if (match && match[1]) {
            try {
              const p = JSON.parse(match[1]);
              prevDay = Number(p.previousDayRemaining) || 0;
              genTrans = Number(p.generalCashTransfer) || 0;
              bossCont = Number(p.bossContribution) || 0;
              initBal = Number(p.initialBalance) || (prevDay + genTrans + bossCont);
            } catch {}
          }
          activePettyShift = {
            id: `pc-shift-${j.fecha}`,
            date: j.fecha,
            status: 'OPEN',
            openedBy: j.responsable || 'Caja Principal',
            openedAt: j.created_at || new Date().toISOString(),
            previousDayRemaining: prevDay,
            generalCashTransfer: genTrans,
            bossContribution: bossCont,
            initialBalance: initBal,
            openingNotes: obs,
          };
        }
      } else if (j.estado === 'CERRADA') {
        const parsedShift = parseShiftFromJornada(j);
        const existingIdx = shiftHistory.findIndex((s) => s.date === j.fecha);
        if (existingIdx >= 0) {
          if ((parsedShift.totalGrossSales || 0) > (shiftHistory[existingIdx].totalGrossSales || 0)) {
            shiftHistory[existingIdx] = parsedShift;
          }
        } else {
          shiftHistory.push(parsedShift);
        }

        if (hasPettyClosing) {
          const matchClose = obs.match(/\[PETTY_CLOSING:(\{.*?\})\]/);
          let actualCounted = 0;
          let expBal = 0;
          let diff = 0;
          let auditStat: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = 'SQUARED';
          let closedByStr = j.responsable || 'Eddy';
          let closedAtStr = j.fecha_cierre || new Date().toISOString();
          if (matchClose && matchClose[1]) {
            try {
              const pc = JSON.parse(matchClose[1]);
              actualCounted = Number(pc.actualCashCounted) || 0;
              expBal = Number(pc.expectedBalance) || actualCounted;
              diff = Number(pc.difference) || 0;
              auditStat = pc.auditStatus || 'SQUARED';
              if (pc.closedBy) closedByStr = pc.closedBy;
              if (pc.closedAt) closedAtStr = pc.closedAt;
            } catch {}
          }
          let prevDay = 0;
          let genTrans = 0;
          let bossCont = 0;
          let initBal = Number(j.fondo_inicial) || 0;
          const matchOpen = obs.match(/\[FONDOS_COMPOSITION:(\{.*?\})\]/);
          if (matchOpen && matchOpen[1]) {
            try {
              const p = JSON.parse(matchOpen[1]);
              prevDay = Number(p.previousDayRemaining) || 0;
              genTrans = Number(p.generalCashTransfer) || 0;
              bossCont = Number(p.bossContribution) || 0;
              initBal = Number(p.initialBalance) || (prevDay + genTrans + bossCont);
            } catch {}
          }
          const parsedPetty: PettyCashShift = {
            id: `pc-shift-${j.fecha}`,
            date: j.fecha,
            status: 'CLOSED',
            openedBy: j.responsable || 'Eddy',
            openedAt: j.created_at || new Date().toISOString(),
            closedBy: closedByStr,
            closedAt: closedAtStr,
            previousDayRemaining: prevDay,
            generalCashTransfer: genTrans,
            bossContribution: bossCont,
            initialBalance: initBal,
            actualCashCounted: actualCounted,
            expectedBalance: expBal,
            difference: diff,
            auditStatus: auditStat,
            closingNotes: obs,
          };
          const existingPettyIdx = pettyCashShiftHistory.findIndex((ps) => ps.date === j.fecha);
          if (existingPettyIdx >= 0) {
            pettyCashShiftHistory[existingPettyIdx] = parsedPetty;
          } else {
            pettyCashShiftHistory.push(parsedPetty);
          }
        }
      }
    }

    pettyCashShiftHistory.sort((a, b) => b.date.localeCompare(a.date));
    shiftHistory.sort((a, b) => b.date.localeCompare(a.date));

    return {
      activeShift,
      activePettyShift,
      shiftHistory,
      pettyCashShiftHistory,
      gastos: gData || [],
    };
  } catch (err) {
    console.warn('⚠️ Error al consultar estado completo de la nube:', err);
    return { activeShift: null, activePettyShift: null, shiftHistory: [], pettyCashShiftHistory: [], gastos: [] };
  }
}

/**
 * Consulta y sincroniza el catálogo de Proveedores y Categorías desde Supabase
 */
export async function fetchCloudCatalogs(): Promise<{
  vendors: VendorItem[];
  categories: string[];
}> {
  try {
    // 1. Obtener registro de configuración del catálogo
    const { data: configRows } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones')
      .eq('responsable', 'SYSTEM_CATALOGS')
      .limit(1);

    let cloudVendors: VendorItem[] = [];
    let cloudCategories: string[] = [];

    if (configRows && configRows.length > 0) {
      const obs = configRows[0].observaciones || '';
      const tag = '[SYSTEM_CATALOGS:';
      const start = obs.indexOf(tag);
      if (start !== -1) {
        const lastBracket = obs.lastIndexOf(']');
        const jsonStr = obs.substring(start + tag.length, lastBracket);
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed.vendors)) cloudVendors = parsed.vendors;
          if (Array.isArray(parsed.categories)) cloudCategories = parsed.categories;
        } catch (e) {
          console.warn('Error parsing SYSTEM_CATALOGS json:', e);
        }
      }
    }

    // 2. Extraer proveedores y categorías históricas de compras_gastos para asegurar que no falte ninguno
    const { data: gastosRows } = await supabase
      .from('compras_gastos')
      .select('proveedor, categoria');

    const historicalVendorsMap = new Map<string, string>();
    const historicalCategoriesSet = new Set<string>();

    if (gastosRows) {
      for (const row of gastosRows) {
        if (row.proveedor && row.proveedor.trim()) {
          const p = row.proveedor.trim();
          if (!historicalVendorsMap.has(p.toLowerCase())) {
            historicalVendorsMap.set(p.toLowerCase(), row.categoria || 'OTROS');
          }
        }
        if (row.categoria && row.categoria.trim()) {
          historicalCategoriesSet.add(row.categoria.trim());
        }
      }
    }

    // Fusionar proveedores
    const finalVendors: VendorItem[] = cloudVendors.length > 0 ? [...cloudVendors] : [...DEFAULT_VENDORS];
    const existingNames = new Set(finalVendors.map(v => v.name.toLowerCase().trim()));

    // Agregar proveedores de compras_gastos que no estuvieran en la lista
    historicalVendorsMap.forEach((cat, name) => {
      if (!existingNames.has(name)) {
        const origRow = gastosRows?.find(r => r.proveedor?.toLowerCase().trim() === name);
        const origName = origRow?.proveedor?.trim() || name;
        finalVendors.push({
          id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: origName,
          defaultCategory: cat,
          active: true,
        });
        existingNames.add(name);
      }
    });

    // Fusionar categorías
    const finalCategoriesSet = new Set<string>([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...cloudCategories,
      ...historicalCategoriesSet,
    ]);
    finalCategoriesSet.delete('FONDEO'); // 'FONDEO' es tipo de movimiento, no categoría de gasto operativo
    const finalCategories = Array.from(finalCategoriesSet);

    return {
      vendors: finalVendors,
      categories: finalCategories,
    };
  } catch (err) {
    console.warn('⚠️ Error al consultar catálogos en la nube (usando locales):', err);
    return {
      vendors: [...DEFAULT_VENDORS],
      categories: [...DEFAULT_EXPENSE_CATEGORIES],
    };
  }
}

/**
 * Guarda y actualiza el catálogo oficial de Proveedores y Categorías en Supabase
 */
export async function syncCatalogsToCloud(
  vendors: VendorItem[],
  categories: string[]
): Promise<boolean> {
  try {
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      vendors,
      categories,
    };

    const obsString = `[SYSTEM_CATALOGS:${JSON.stringify(payload)}]`;

    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id')
      .eq('responsable', 'SYSTEM_CATALOGS')
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('jornadas_diarias')
        .update({
          observaciones: obsString,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('jornadas_diarias')
        .insert({
          fecha: '1999-01-01',
          turno: 'CONFIG',
          estado: 'CERRADA',
          fondo_inicial: 0,
          total_gastos_efectivo: 0,
          total_gastos_transferencia: 0,
          responsable: 'SYSTEM_CATALOGS',
          observaciones: obsString,
          fecha_cierre: '1999-01-01T00:00:00Z',
        });

      if (error) throw error;
    }

    console.log(`✅ Catálogo de ${vendors.length} proveedores y ${categories.length} categorías guardado en Supabase.`);
    return true;
  } catch (err) {
    console.warn('⚠️ Error al guardar catálogo en Supabase:', err);
    return false;
  }
}

export interface ExpenseAnalyticsData {
  totalAmount: number;
  cashAmount: number;
  cashPercent: number;
  transferAmount: number;
  transferPercent: number;
  byCategory: {
    category: string;
    label: string;
    total: number;
    count: number;
    percent: number;
  }[];
  byVendor: {
    vendor: string;
    total: number;
    count: number;
    percent: number;
    mainCategory: string;
  }[];
  totalTransactionsCount: number;
}

/**
 * Consulta todas las compras/gastos de Supabase y calcula estadísticas y distribución
 */
export async function fetchCloudExpensesAnalytics(
  dateFilter: 'ALL' | 'MONTH' | 'WEEK' = 'ALL'
): Promise<ExpenseAnalyticsData> {
  try {
    let query = supabase
      .from('compras_gastos')
      .select('*')
      .order('fecha_hora', { ascending: false });

    const todayStr = getLocalTodayStr();
    if (dateFilter === 'MONTH') {
      const monthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'
      query = query.gte('fecha_hora', `${monthPrefix}-01T00:00:00`);
    } else if (dateFilter === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const weekAgoStr = d.toISOString().slice(0, 10);
      query = query.gte('fecha_hora', `${weekAgoStr}T00:00:00`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const realExpenses = rows.filter((r) => !isFondeoTransaction(r));

    let totalAmount = 0;
    let cashAmount = 0;
    let transferAmount = 0;

    const catMap = new Map<string, { total: number; count: number }>();
    const vendorMap = new Map<string, { total: number; count: number; catCounts: Map<string, number> }>();

    for (const item of realExpenses) {
      const monto = Number(item.monto) || 0;
      totalAmount += monto;

      if (item.metodo_pago === 'TRANSFERENCIA') {
        transferAmount += monto;
      } else {
        cashAmount += monto;
      }

      // Por Categoría
      const cat = item.categoria || 'OTROS';
      const curCat = catMap.get(cat) || { total: 0, count: 0 };
      curCat.total += monto;
      curCat.count += 1;
      catMap.set(cat, curCat);

      // Por Proveedor
      const vendorName = item.proveedor ? item.proveedor.trim() : 'Sin Proveedor';
      const curVendor = vendorMap.get(vendorName) || {
        total: 0,
        count: 0,
        catCounts: new Map<string, number>(),
      };
      curVendor.total += monto;
      curVendor.count += 1;
      curVendor.catCounts.set(cat, (curVendor.catCounts.get(cat) || 0) + 1);
      vendorMap.set(vendorName, curVendor);
    }

    const cashPercent = totalAmount > 0 ? (cashAmount / totalAmount) * 100 : 0;
    const transferPercent = totalAmount > 0 ? (transferAmount / totalAmount) * 100 : 0;

    const byCategory = Array.from(catMap.entries())
      .map(([category, info]) => ({
        category,
        label: category.replace(/_/g, ' '),
        total: info.total,
        count: info.count,
        percent: totalAmount > 0 ? (info.total / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const byVendor = Array.from(vendorMap.entries())
      .map(([vendor, info]) => {
        let topCat = 'OTROS';
        let topCount = -1;
        info.catCounts.forEach((cnt, c) => {
          if (cnt > topCount) {
            topCount = cnt;
            topCat = c;
          }
        });

        return {
          vendor,
          total: info.total,
          count: info.count,
          percent: totalAmount > 0 ? (info.total / totalAmount) * 100 : 0,
          mainCategory: topCat,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      totalAmount,
      cashAmount,
      cashPercent,
      transferAmount,
      transferPercent,
      byCategory,
      byVendor,
      totalTransactionsCount: realExpenses.length,
    };
  } catch (err) {
    console.warn('⚠️ Error al calcular análisis de gastos en Supabase:', err);
    return {
      totalAmount: 0,
      cashAmount: 0,
      cashPercent: 0,
      transferAmount: 0,
      transferPercent: 0,
      byCategory: [],
      byVendor: [],
      totalTransactionsCount: 0,
    };
  }
}

