// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => ({}), channel: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
}));

import { calculateDayProfit, sumDayExpenses, buildActTransactions, calculateShiftProfit } from '../src/utils/cashMath';
import { parseShiftFromJornada } from '../src/services/supabaseSync';
import { computeYesterdayEarningsSummary } from '../src/services/thermalPrint';
import { loadState, INITIAL_STATE } from '../src/services/storage';
import type { CashShift, PettyCashTransaction } from '../src/types';

const tx = (over: Partial<PettyCashTransaction>): PettyCashTransaction => ({
  id: 'x',
  shiftId: 'pc-shift-2026-10-23',
  date: '2026-10-23T12:00:00-06:00',
  type: 'EXPENSE',
  amount: 100,
  method: 'CASH',
  vendor: 'Proveedor',
  category: 'OTROS',
  registeredBy: 'Eddy',
  ...over,
});

describe('fórmula única de ganancia (reglas de Ezequiel)', () => {
  test('efectivo = gaveta contada + pagos y salidas; ganancia = ventas − gastos − propina', () => {
    const r = calculateDayProfit({
      efectivoContado: 8705, // C$ 7,265 + US$ 40 a 36
      pagosSalidas: 1000,
      tarjetas: 9657.5,
      transferencias: 2000,
      pedidosYa: 3335,
      otrosIngresos: 0,
      gastos: { cash: 8000, transfer: 1500, card: 500, total: 10000 },
      propinaEntregada: 1260,
    });
    expect(r.efectivoReal).toBe(9705);
    expect(r.ventasTotales).toBe(24697.5);
    expect(r.ganancia).toBe(13437.5);
  });

  test('los gastos con tarjeta también cuentan como gasto', () => {
    const g = sumDayExpenses(
      [
        tx({ id: 'a', amount: 300, method: 'CASH' }),
        tx({ id: 'b', amount: 200, method: 'TRANSFER' }),
        tx({ id: 'c', amount: 50, method: 'CARD' }),
        tx({ id: 'd', amount: 999, type: 'INFLOW' }),
        tx({ id: 'e', amount: 777, date: '2026-10-22T12:00:00-06:00' }),
      ],
      '2026-10-23'
    );
    expect(g).toEqual({ cash: 300, transfer: 200, card: 50, total: 550 });
  });
});

describe('hoja 2 del acta de cierre', () => {
  test('no repite el traslado de apertura, va en orden de hora y no duplica el concepto', () => {
    const rows = buildActTransactions(
      [
        tx({ id: 'tarde', date: '2026-10-23T17:00:00-06:00', vendor: 'Pago a Nelly', notes: 'Pago a Nelly' }),
        tx({ id: 'pct-transfer-open-2026-10-23', type: 'INFLOW', amount: 9700, inflowSource: 'FONDO_INICIAL', vendor: 'Traslado desde Caja General' }),
        tx({ id: 'manana', date: '2026-10-23T09:00:00-06:00', vendor: 'Hielo Olito', notes: 'se compró al abrir' }),
      ],
      '2026-10-23'
    );
    expect(rows.map((r) => r.id)).toEqual(['manana', 'tarde']);
    expect(rows[1].concepto).toBe('Pago a Nelly');
    expect(rows[0].concepto).toBe('Hielo Olito - se compró al abrir');
  });
});

describe('lectura desde la nube', () => {
  test('conserva las transferencias y los pagos y salidas del día', () => {
    const shift = parseShiftFromJornada({
      id: 12,
      fecha: '2026-10-23',
      estado: 'CERRADA',
      observaciones:
        '[VENTAS_DATA:{"salesCash":10555,"totalCards":9657.5,"salesPedidosYa":3335,"salesBankTransfers":2000,"totalGrossSales":24697.5}] ' +
        '[CLOSING_AUDIT:{"actualCashNIO":8705,"dailyNetProfit":13437.5,"loyversePaidOut":1000,"formulaVersion":2}]',
    });
    expect(shift.salesBankTransfers).toBe(2000);
    expect(shift.loyversePaidOut).toBe(1000);
    expect(shift.formulaVersion).toBe(2);
  });
});

describe('ganancias de ayer', () => {
  const base: Partial<CashShift> = { status: 'CLOSED', exchangeRate: 36, openedBy: 'Eddy', openedAt: '', verifiedPreviousClosingId: null, openingNotes: '', openingNIO: {} as any, openingUSD: {} as any, totalOpeningNIO: 2000, totalOpeningUSD: 0, totalOpeningEquivNIO: 2000 };
  test('si ayer no hubo turno, usa el último cierre anterior y no el día de más ventas', () => {
    const state = {
      ...INITIAL_STATE,
      shiftHistory: [
        { ...base, id: 'record', date: '2026-10-10', totalGrossSales: 90000 } as CashShift,
        { ...base, id: 'sabado', date: '2026-10-18', totalGrossSales: 30000 } as CashShift,
      ],
    };
    const r = computeYesterdayEarningsSummary(state, '2026-10-20');
    expect(r?.totalGenerado).toBe(30000);
  });

  test('un cierre con la fórmula única se calcula igual que en la pantalla de cierre', () => {
    const shift = {
      ...base, id: 's', date: '2026-10-23', actualCashNIO: 8705, loyversePaidOut: 1000, totalCards: 9657.5,
      salesBankTransfers: 2000, salesPedidosYa: 3335, otherIncome: 0, tipPaid: true, tipDistributedTotal: 1260, formulaVersion: 2,
    } as CashShift;
    const gastos = [tx({ id: 'a', amount: 8000 }), tx({ id: 'b', amount: 1500, method: 'TRANSFER' }), tx({ id: 'c', amount: 500, method: 'CARD' })];
    expect(calculateShiftProfit(shift, gastos).ganancia).toBe(13437.5);
    const r = computeYesterdayEarningsSummary({ ...INITIAL_STATE, shiftHistory: [shift], pettyCashTransactions: gastos }, '2026-10-24');
    expect(r?.gananciaNeta).toBe(13437.5);
  });
});

test('la tasa de cambio editada se respeta al abrir la app', () => {
  localStorage.setItem('bodegon_control_state_v1', JSON.stringify({ ...INITIAL_STATE, defaultExchangeRate: 36.62 }));
  expect(loadState().defaultExchangeRate).toBe(36.62);
  localStorage.setItem('bodegon_control_state_v1', JSON.stringify({ ...INITIAL_STATE, defaultExchangeRate: 0 }));
  expect(loadState().defaultExchangeRate).toBe(36);
});
