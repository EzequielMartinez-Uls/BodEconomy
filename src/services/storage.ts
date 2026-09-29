import { AppState, CashShift, DenominationsNIO, DenominationsUSD, PettyCashShift, PettyCashTransaction, TablewareItem } from '../types';
import { getLocalTodayStr, addDaysToDateStr, formatDateToFriendly, getLocalDateTimeStr, extractLocalDateStr } from '../utils/dateUtils';

export { formatDateToFriendly, getLocalTodayStr, addDaysToDateStr, getLocalDateTimeStr, extractLocalDateStr };

const STORAGE_KEY = 'bodegon_control_state_v1';
const BACKUP_PREFIX = 'bodegon_backup_';

export const DEFAULT_DENOMINATIONS_NIO: DenominationsNIO = {
  1000: 0,
  500: 0,
  200: 0,
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  1: 0,
  0.5: 0,
};

export const DEFAULT_DENOMINATIONS_USD: DenominationsUSD = {
  100: 0,
  50: 0,
  20: 0,
  10: 0,
  5: 0,
  2: 0,
  1: 0,
};

export function calculateTotalNIO(denom: DenominationsNIO): number {
  return (
    (denom[1000] || 0) * 1000 +
    (denom[500] || 0) * 500 +
    (denom[200] || 0) * 200 +
    (denom[100] || 0) * 100 +
    (denom[50] || 0) * 50 +
    (denom[20] || 0) * 20 +
    (denom[10] || 0) * 10 +
    (denom[5] || 0) * 5 +
    (denom[1] || 0) * 1 +
    (denom[0.5] || 0) * 0.5
  );
}

export function calculateTotalUSD(denom: DenominationsUSD): number {
  return (
    (denom[100] || 0) * 100 +
    (denom[50] || 0) * 50 +
    (denom[20] || 0) * 20 +
    (denom[10] || 0) * 10 +
    (denom[5] || 0) * 5 +
    (denom[2] || 0) * 2 +
    (denom[1] || 0) * 1
  );
}

const INITIAL_TABLEWARE: TablewareItem[] = [];

const INITIAL_PETTY_CASH: PettyCashTransaction[] = [];

export const INITIAL_STATE: AppState = {
  currentShift: null,
  shiftHistory: [],
  currentPettyCashShift: null,
  pettyCashShiftHistory: [],
  pettyCashTransactions: [],
  pettyCashBalance: 0,
  tablewareItems: [],
  tablewareLosses: [],
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      user: 'Sistema',
      action: 'INICIO_SISTEMA',
      details: 'Inicialización de BodegónControl con datos maestros',
    },
  ],
  defaultExchangeRate: 36.00,
  activeAdminName: 'Eddy',
  availableAdmins: ['Eddy', 'Xiomara', 'Maverick', 'Snyder'],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    const loaded: AppState = { ...INITIAL_STATE, ...parsed };

    // Limpiar inventario residual de menaje si existía en versiones anteriores
    loaded.tablewareItems = [];
    loaded.tablewareLosses = [];

    // Si no está definido el turno de caja chica, mantenerlo en null
    if (loaded.currentPettyCashShift === undefined) {
      loaded.currentPettyCashShift = null;
    }
    if (!loaded.pettyCashShiftHistory) {
      loaded.pettyCashShiftHistory = [];
    }

    // Auto-saneamiento de compras duplicadas accidentales (ej: eco de red local vs Supabase)
    if (loaded.pettyCashTransactions && loaded.pettyCashTransactions.length > 1) {
      const seen = new Map<string, PettyCashTransaction>();
      const deduped: PettyCashTransaction[] = [];
      let restoredBalance = 0;

      for (const tx of loaded.pettyCashTransactions) {
        const minuteKey = `${tx.vendor.trim().toLowerCase()}_${tx.amount.toFixed(2)}_${(tx.date || '').slice(0, 16)}`;
        if (seen.has(minuteKey)) {
          const prevTx = seen.get(minuteKey)!;
          // Preferir conservar el ID oficial de la nube
          if (!prevTx.id.startsWith('pct-cloud-') && tx.id.startsWith('pct-cloud-')) {
            const idx = deduped.indexOf(prevTx);
            if (idx !== -1) deduped[idx] = tx;
            seen.set(minuteKey, tx);
          }
          if (tx.type === 'EXPENSE' && tx.method === 'CASH') {
            restoredBalance += tx.amount;
          }
        } else {
          seen.set(minuteKey, tx);
          deduped.push(tx);
        }
      }

      if (restoredBalance > 0) {
        loaded.pettyCashTransactions = deduped;
      }
    }

    // Limpiar transacciones demo residuales de versiones previas
    loaded.pettyCashTransactions = (loaded.pettyCashTransactions || []).filter(
      (tx) => !tx.id.startsWith('pct-init-')
    );

    // Recalcular con precisión estricta el saldo físico en gaveta de la jornada abierta
    // REGLA FUNDAMENTAL: Solo los egresos en EFECTIVO salen de la gaveta física.
    // Las transferencias se pagan desde el banco y NO tocan el dinero físico.
    if (loaded.currentPettyCashShift && loaded.currentPettyCashShift.status === 'OPEN') {
      const shiftId = loaded.currentPettyCashShift.id;
      const shiftDate = loaded.currentPettyCashShift.date;
      const initial = Number(loaded.currentPettyCashShift.initialBalance) || 0;

      const shiftTxs = (loaded.pettyCashTransactions || []).filter((tx) => {
        if (tx.shiftId && tx.shiftId === shiftId) return true;
        if (tx.date && extractLocalDateStr(tx.date) === shiftDate) return true;
        return false;
      });

      const totalInflows = shiftTxs
        .filter((t) => t.type === 'INFLOW')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const cashExpenses = shiftTxs
        .filter((t) => t.type === 'EXPENSE' && t.method === 'CASH')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      loaded.pettyCashBalance = Math.max(0, parseFloat((initial + totalInflows - cashExpenses).toFixed(2)));
    }

    return loaded;
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    return INITIAL_STATE;
  }
}

/**
 * Obtiene todas las transacciones de Caja Chica correspondientes a una fecha específica (YYYY-MM-DD)
 */
export function getPettyCashTransactionsForDate(
  transactions: PettyCashTransaction[],
  dateStr: string,
  shiftId?: string
): PettyCashTransaction[] {
  return transactions.filter((tx) => {
    if (shiftId && tx.shiftId === shiftId) return true;
    if (!tx.date) return false;
    return extractLocalDateStr(tx.date) === dateStr;
  });
}


export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Automatic daily rotating backup
    const today = getLocalTodayStr();
    localStorage.setItem(`${BACKUP_PREFIX}${today}`, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
}

export function exportBackupJSON(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
  downloadAnchor.setAttribute('download', `BodegonControl_Respaldo_${nowStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
