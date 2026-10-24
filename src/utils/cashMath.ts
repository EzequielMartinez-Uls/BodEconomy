import { CashShift, PettyCashTransaction, isOpeningPettyCashTx } from '../types';
import { extractLocalDateStr } from './dateUtils';

/**
 * Fórmula única de ventas y ganancia del día (reglas confirmadas por Ezequiel, 2026-10-24).
 *
 *   Efectivo real   = dinero contado en gaveta al cierre (C$ + US$ a la tasa) + pagos y salidas del día (Loyverse)
 *   Ventas totales  = efectivo real + tarjetas + transferencias + PedidosYa + otros ingresos
 *   Ganancia        = ventas totales − gastos del día (efectivo + transferencia + tarjeta) − propina entregada
 *
 * El fondo de apertura no se resta: solo sirve de referencia para ver descuadres entre el
 * administrador de día y el de noche.
 *
 * Pantallas, actas impresas y reportes usan esta misma función para que nunca den números distintos.
 */
export interface DayExpenses {
  cash: number;
  transfer: number;
  card: number;
  total: number;
}

export interface DayProfitInput {
  efectivoContado: number; // C$ + US$ convertidos, contados en gaveta al cierre
  pagosSalidas: number; // "Pagos y salidas" de Loyverse del día
  tarjetas: number;
  transferencias: number;
  pedidosYa: number;
  otrosIngresos: number;
  gastos: DayExpenses;
  propinaEntregada: number; // propina que sale de Caja General para el personal (0 si no se pagó)
}

export interface DayProfit {
  efectivoReal: number;
  ventasTotales: number;
  totalGastos: number;
  propinaEntregada: number;
  ganancia: number;
  margen: number; // % de la ganancia sobre las ventas totales
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateDayProfit(input: DayProfitInput): DayProfit {
  const efectivoReal = round2((input.efectivoContado || 0) + (input.pagosSalidas || 0));
  const ventasTotales = round2(
    efectivoReal + (input.tarjetas || 0) + (input.transferencias || 0) + (input.pedidosYa || 0) + (input.otrosIngresos || 0)
  );
  const totalGastos = round2(input.gastos.total);
  const propinaEntregada = round2(input.propinaEntregada || 0);
  const ganancia = round2(ventasTotales - totalGastos - propinaEntregada);
  return {
    efectivoReal,
    ventasTotales,
    totalGastos,
    propinaEntregada,
    ganancia,
    margen: ventasTotales > 0 ? (ganancia / ventasTotales) * 100 : 0,
  };
}

/** Gastos de caja chica de una fecha, separados por medio de pago. */
export function sumDayExpenses(transactions: PettyCashTransaction[], date: string): DayExpenses {
  let cash = 0;
  let transfer = 0;
  let card = 0;
  for (const t of transactions || []) {
    if (t.type !== 'EXPENSE' || extractLocalDateStr(t.date) !== date) continue;
    if (t.method === 'TRANSFER') transfer += t.amount || 0;
    else if (t.method === 'CARD') card += t.amount || 0;
    else cash += t.amount || 0;
  }
  return { cash: round2(cash), transfer: round2(transfer), card: round2(card), total: round2(cash + transfer + card) };
}

/** Ganancia de un turno ya guardado, con los gastos de caja chica de ese día. */
export function calculateShiftProfit(shift: CashShift, transactions: PettyCashTransaction[]): DayProfit {
  return calculateDayProfit({
    efectivoContado: shift.actualCashNIO ?? shift.totalClosingEquivNIO ?? 0,
    pagosSalidas: shift.loyversePaidOut || 0,
    tarjetas: shift.totalCards ?? (shift.cardsBAC || 0) + (shift.cardsFicohsa || 0) + (shift.cardsBanpro || 0) + (shift.cardsLafise || 0),
    transferencias: shift.salesBankTransfers || 0,
    pedidosYa: shift.salesPedidosYa || 0,
    otrosIngresos: shift.otherIncome || 0,
    gastos: sumDayExpenses(transactions, shift.date),
    propinaEntregada: shift.tipPaid ? shift.tipDistributedTotal ?? shift.totalTipCollected ?? 0 : 0,
  });
}

export interface ActTransactionRow {
  id: string;
  hora: string;
  categoria: string;
  concepto: string;
  proveedor: string;
  metodo: string;
  monto: number;
  tipo: 'INGRESO' | 'GASTO';
}

/**
 * Filas de caja chica para la hoja 2 del acta de cierre: en orden de hora, sin el traslado de
 * apertura (ya va dentro del fondo inicial; contarlo otra vez inflaba el saldo) y sin repetir
 * el concepto cuando es igual al proveedor.
 */
export function buildActTransactions(transactions: PettyCashTransaction[], date: string): ActTransactionRow[] {
  return (transactions || [])
    .filter((t) => extractLocalDateStr(t.date) === date && !isOpeningPettyCashTx(t))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => {
      const notes = (t.notes || '').trim();
      const vendor = (t.vendor || '').trim();
      return {
        id: t.id,
        hora: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categoria: t.category,
        concepto: notes && notes !== vendor ? `${vendor} - ${notes}` : vendor,
        proveedor: t.vendor,
        metodo: t.method === 'CASH' || !t.method ? 'Efectivo' : t.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
        monto: t.amount,
        tipo: t.type === 'INFLOW' ? 'INGRESO' : 'GASTO',
      };
    });
}
