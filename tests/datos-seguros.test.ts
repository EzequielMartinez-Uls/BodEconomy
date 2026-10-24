// @vitest-environment jsdom
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Simula Supabase sin internet: igual que la librería real, no lanza error, devuelve data = null.
vi.mock('@supabase/supabase-js', () => {
  const offline = { data: null, error: { message: 'TypeError: Failed to fetch' } };
  const builder: any = {};
  for (const m of ['select', 'neq', 'eq', 'order', 'limit', 'gte', 'lte', 'in', 'update', 'insert', 'delete', 'is', 'ilike', 'or', 'single', 'maybeSingle', 'like', 'not']) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: any) => resolve(offline);
  return {
    createClient: () => ({
      from: () => builder,
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => {},
    }),
  };
});

import { fetchFullCloudState } from '../src/services/supabaseSync';
import { loadState, saveState, INITIAL_STATE, BACKUP_DAYS_TO_KEEP } from '../src/services/storage';
import { keepOlderLocalTransactions } from '../src/utils/cloudMerge';
import { isSameMinute } from '../src/utils/dateUtils';
import type { PettyCashTransaction } from '../src/types';

const compra = (over: Partial<PettyCashTransaction>): PettyCashTransaction => ({
  id: 'pct-local-1',
  shiftId: 'pc-shift-2026-10-24',
  date: '2026-10-24T14:05:10-06:00',
  type: 'EXPENSE',
  amount: 120,
  method: 'CASH',
  vendor: 'Hielo Olito',
  category: 'HIELO',
  registeredBy: 'Eddy',
  ...over,
});

beforeEach(() => localStorage.clear());

describe('sin internet no se borra nada', () => {
  test('la lectura de la nube falla en vez de devolver una nube vacía', async () => {
    await expect(fetchFullCloudState()).rejects.toThrow(/No se pudo leer la nube/);
  });
});

describe('al abrir la app', () => {
  test('una compra de hielo de hoy se queda en su fecha (no se mueve al 2 de octubre)', () => {
    localStorage.setItem(
      'bodegon_control_state_v1',
      JSON.stringify({ ...INITIAL_STATE, pettyCashTransactions: [compra({})] })
    );
    const [tx] = loadState().pettyCashTransactions;
    expect(tx.date).toBe('2026-10-24T14:05:10-06:00');
    expect(tx.shiftId).toBe('pc-shift-2026-10-24');
  });

  test('dos compras iguales en el mismo minuto se conservan las dos', () => {
    localStorage.setItem(
      'bodegon_control_state_v1',
      JSON.stringify({
        ...INITIAL_STATE,
        pettyCashTransactions: [compra({ id: 'a' }), compra({ id: 'b', date: '2026-10-24T14:05:40-06:00' })],
      })
    );
    expect(loadState().pettyCashTransactions).toHaveLength(2);
  });
});

describe('respaldos diarios', () => {
  test(`solo se guardan los últimos ${BACKUP_DAYS_TO_KEEP} días`, () => {
    for (let d = 1; d <= 20; d++) {
      localStorage.setItem(`bodegon_backup_2026-09-${String(d).padStart(2, '0')}`, '{}');
    }
    saveState(INITIAL_STATE);
    const backups = Object.keys(localStorage).filter((k) => k.startsWith('bodegon_backup_'));
    expect(backups).toHaveLength(BACKUP_DAYS_TO_KEEP);
    expect(backups.some((k) => k.endsWith('2026-09-01'))).toBe(false);
  });
});

describe('historial más viejo que lo que baja la nube', () => {
  test('se conservan las compras locales anteriores a la compra más vieja recibida', () => {
    const cloud = [
      { id: 900, fecha_hora: '2026-10-20T10:00:00-06:00' },
      { id: 901, fecha_hora: '2026-10-21T10:00:00-06:00' },
    ];
    const local = [
      compra({ id: 'pct-cloud-5', cloudId: 5, date: '2026-09-01T10:00:00-06:00' }),
      compra({ id: 'pct-cloud-900', cloudId: 900, date: '2026-10-20T10:00:00-06:00' }),
    ];
    expect(keepOlderLocalTransactions(local, cloud, 2).map((t) => t.cloudId)).toEqual([5]);
    // Si la nube no llegó al límite, ya trajo todo: no se guarda nada extra.
    expect(keepOlderLocalTransactions(local, cloud, 350)).toEqual([]);
  });
});

test('mismo minuto aunque una hora venga en UTC', () => {
  expect(isSameMinute('2026-10-24T14:05:10-06:00', '2026-10-24T20:05:50Z')).toBe(true);
  expect(isSameMinute('2026-10-24T14:05:10-06:00', '2026-10-24T14:06:10-06:00')).toBe(false);
});
