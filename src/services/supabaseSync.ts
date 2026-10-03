import { createClient } from '@supabase/supabase-js';
import { CashShift, PettyCashShift, PettyCashTransaction, ExpenseCategory } from '../types';
import { getLocalTodayStr, getLocalDateTimeStr } from '../utils/dateUtils';
import { DEFAULT_DENOMINATIONS_NIO, DEFAULT_DENOMINATIONS_USD } from './storage';

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
    const observaciones = isExpense
      ? (tx.receiptNumber ? `Doc: ${tx.receiptNumber}` : null)
      : (tx.receiptNumber ? `[TIPO:FONDEO] Doc: ${tx.receiptNumber}` : '[TIPO:FONDEO] Depósito a caja chica');

    let cloudJornadaId: number | null = null;
    const txDateStr = (tx.date || '').slice(0, 10);
    if (txDateStr) {
      const { data: jData } = await supabase
        .from('jornadas_diarias')
        .select('id')
        .eq('fecha', txDateStr)
        .order('id', { ascending: false })
        .limit(1);
      if (jData && jData.length > 0) {
        cloudJornadaId = jData[0].id;
      }
    }

    const { data, error } = await supabase
      .from('compras_gastos')
      .insert({
        jornada_id: cloudJornadaId,
        fecha_hora: tx.date || getLocalDateTimeStr(),
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
      supabase.from('jornadas_diarias').select('*').order('id', { ascending: false }).limit(1),
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
 * Sincroniza la Apertura de Caja General a Supabase (notifica a otras PCs y a la web)
 */
export async function syncGeneralCashOpeningToCloud(shift: CashShift): Promise<void> {
  try {
    const openingData = {
      totalOpeningNIO: shift.totalOpeningNIO,
      totalOpeningUSD: shift.totalOpeningUSD,
      exchangeRate: shift.exchangeRate,
      openingNotes: shift.openingNotes || '',
      openedBy: shift.openedBy,
      totalOpeningEquivNIO: shift.totalOpeningEquivNIO,
    };

    const { data: existing } = await supabase
      .from('jornadas_diarias')
      .select('id, observaciones')
      .eq('fecha', shift.date)
      .limit(1);

    if (existing && existing.length > 0) {
      const finalObs = mergeJornadaTags(existing[0].observaciones, {
        openingData,
      });

      await supabase
        .from('jornadas_diarias')
        .update({
          estado: 'ABIERTA',
          responsable: shift.openedBy,
          observaciones: finalObs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      const finalObs = mergeJornadaTags('', {
        openingData,
        notesAppend: `Apertura realizada por ${shift.openedBy} con C$ ${shift.totalOpeningEquivNIO.toFixed(2)}`,
      });

      await supabase.from('jornadas_diarias').insert({
        fecha: shift.date,
        turno: 'COMPLETO',
        estado: 'ABIERTA',
        fondo_inicial: shift.totalOpeningEquivNIO,
        responsable: shift.openedBy,
        observaciones: finalObs,
      });
    }
  } catch (err) {
    console.warn('⚠️ No se pudo respaldar apertura en Supabase (modo offline):', err);
  }
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

  const openMatch = obs.match(/\[OPENING_DATA:(\{.*?\})\]/);
  if (openMatch && openMatch[1]) {
    try {
      const p = JSON.parse(openMatch[1]);
      totalOpeningNIO = Number(p.totalOpeningNIO) || totalOpeningNIO;
      totalOpeningUSD = Number(p.totalOpeningUSD) || totalOpeningUSD;
      exchangeRate = Number(p.exchangeRate) || exchangeRate;
      if (p.openingNotes) openingNotes = p.openingNotes;
    } catch {}
  }

  const totalOpeningEquivNIO = parseFloat((totalOpeningNIO + totalOpeningUSD * exchangeRate).toFixed(2)) || Number(j.fondo_inicial) || 0;

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
    } catch {}
  }

  // 3. Datos de auditoría de cierre
  const auditMatch = obs.match(/\[CLOSING_AUDIT:(\{.*?\})\]/);
  let actualCashNIO = existingShift?.actualCashNIO || totalOpeningEquivNIO + salesCash - totalTipCollected;
  let expectedCashNIO = existingShift?.expectedCashNIO || totalOpeningEquivNIO + salesCash - totalTipCollected;
  let differenceNIO = existingShift?.differenceNIO || 0;
  let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = existingShift?.auditStatus || 'SQUARED';
  let dailyNetProfit = existingShift?.dailyNetProfit || totalGrossSales;
  let totalClosingEquivNIO = existingShift?.totalClosingEquivNIO || (isClosed ? actualCashNIO : undefined);
  let totalClosingNIO = existingShift?.totalClosingNIO || (isClosed ? actualCashNIO : undefined);
  let totalClosingUSD = existingShift?.totalClosingUSD || (isClosed ? 0 : undefined);
  let closingNIO = existingShift?.closingNIO;
  let closingUSD = existingShift?.closingUSD;

  if (auditMatch && auditMatch[1]) {
    try {
      const a = JSON.parse(auditMatch[1]);
      if (a.actualCashNIO !== undefined) actualCashNIO = Number(a.actualCashNIO);
      if (a.expectedCashNIO !== undefined) expectedCashNIO = Number(a.expectedCashNIO);
      if (a.differenceNIO !== undefined) differenceNIO = Number(a.differenceNIO);
      if (a.auditStatus) auditStatus = a.auditStatus;
      if (a.dailyNetProfit !== undefined) dailyNetProfit = Number(a.dailyNetProfit);
      if (a.totalClosingEquivNIO !== undefined) totalClosingEquivNIO = Number(a.totalClosingEquivNIO);
      if (a.totalClosingNIO !== undefined) totalClosingNIO = Number(a.totalClosingNIO);
      if (a.totalClosingUSD !== undefined) totalClosingUSD = Number(a.totalClosingUSD);
      if (a.closingNIO) closingNIO = a.closingNIO;
      if (a.closingUSD) closingUSD = a.closingUSD;
    } catch {}
  }

  if (isClosed && (!totalClosingEquivNIO || totalClosingEquivNIO === 0) && actualCashNIO > 0) {
    totalClosingEquivNIO = actualCashNIO;
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
    openingNIO: existingShift?.openingNIO || DEFAULT_DENOMINATIONS_NIO,
    openingUSD: existingShift?.openingUSD || DEFAULT_DENOMINATIONS_USD,
    totalOpeningNIO,
    totalOpeningUSD,
    totalOpeningEquivNIO,
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
    actualCashNIO,
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
  gastos: any[];
}> {
  try {
    const today = getLocalTodayStr();
    const [{ data: jData }, { data: gData }] = await Promise.all([
      supabase.from('jornadas_diarias').select('*').order('fecha', { ascending: false }).limit(45),
      supabase.from('compras_gastos').select('*').order('fecha_hora', { ascending: false }).limit(350),
    ]);

    const jornadas = (jData || []) as any[];
    let activeShift: CashShift | null = null;
    let activePettyShift: PettyCashShift | null = null;
    const shiftHistory: CashShift[] = [];

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
        shiftHistory.push(parseShiftFromJornada(j));
      }
    }

    return {
      activeShift,
      activePettyShift,
      shiftHistory,
      gastos: gData || [],
    };
  } catch (err) {
    console.warn('⚠️ Error al consultar estado completo de la nube:', err);
    return { activeShift: null, activePettyShift: null, shiftHistory: [], gastos: [] };
  }
}
