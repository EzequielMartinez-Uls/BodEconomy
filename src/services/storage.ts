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

export const DEFAULT_EXPENSE_CATEGORIES = [
  'CARNES',
  'POLLO',
  'HIELO',
  'BEBIDAS',
  'BEBIDAS_ALCOHOLICAS',
  'DELIVERYS_ACARREOS',
  'FRUTAS_VEGETALES',
  'SUPERMERCADO',
  'MERCADO',
  'LACTEOS',
  'PAGOS_PERSONAL',
  'OTROS',
];

import { PayrollEmployee } from '../types/payroll';

export const DEFAULT_PAYROLL_EMPLOYEES: PayrollEmployee[] = [
  {
    id: 'emp-1',
    name: 'Uriel de Jesús Zamora Salgado',
    role: 'Jefe de Cocina',
    baseSalaryBiweekly: 6000,
    isInsuredINSS: true,
    nss: '32911303',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-2',
    name: 'Eddy Bernardo Martínez Blanco',
    role: 'Administración',
    baseSalaryBiweekly: 6000,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-3',
    name: 'Martha Patricia Meléndez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: true,
    nss: '46236436',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-4',
    name: 'Eliezer Ideaquez Ordoñez',
    role: 'Mesero',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-5',
    name: 'Marlon Joseph Narváez Camacho',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: true,
    nss: '29694792',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-6',
    name: 'Julissa Lucero Ramírez Hernández',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: true,
    nss: '19915977',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-7',
    name: 'Estefani de los Ángeles Padilla Urey',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: true,
    nss: '35137463',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-8',
    name: 'David Quintero Téllez',
    role: 'Cocinero',
    baseSalaryBiweekly: 5000,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-9',
    name: 'Nelly Delgado',
    role: 'Cocinera',
    baseSalaryBiweekly: 5000,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-10',
    name: 'Heiling Pérez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-11',
    name: 'Yhaira Rivas',
    role: 'Limpieza',
    baseSalaryBiweekly: 4000,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-12',
    name: 'Lea Calvo',
    role: 'Lavandería',
    baseSalaryBiweekly: 4000,
    isInsuredINSS: false,
    isActive: true,
  },
  {
    id: 'emp-13',
    name: 'Oscar Vásquez Omeany',
    role: 'Bartender',
    baseSalaryBiweekly: 4500,
    isInsuredINSS: false,
    isActive: true,
  },
];

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
  availableAdmins: ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder'],
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  
  // Nóminas y Planillas
  payrollEmployees: DEFAULT_PAYROLL_EMPLOYEES,
  payrollIncidents: [],
  payrollHistory: [],
  bodegonPassUrl: 'https://asistenciabodegon-api.onrender.com',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    const loaded: AppState = { ...INITIAL_STATE, ...parsed };

    // Tasa de cambio oficial fija en C$ 36.00 para todo el sistema
    loaded.defaultExchangeRate = 36.00;

    // Administradores autorizados estrictamente: Eddy, Xiomara, Ezequiel, Snyder
    loaded.availableAdmins = ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder'];
    if (loaded.activeAdminName && !loaded.availableAdmins.includes(loaded.activeAdminName)) {
      loaded.activeAdminName = 'Eddy';
    }

    // Categorías de gastos editables
    if (!loaded.expenseCategories || loaded.expenseCategories.length === 0) {
      loaded.expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
    }

    // Mapeo para actualizar nombres antiguos a los oficiales completos
    const normalizeStr = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Saneamiento estricto de Nómina y Planillas:
    // 1. Descartar Maverick y Sandor (ya no forman parte del equipo)
    const isExcluded = (name: string) => {
      const n = normalizeStr(name);
      return n.includes('maverick') || n.includes('sandor');
    };

    let emps = (loaded.payrollEmployees || []).filter((e) => !isExcluded(e.name));

    // 2. Actualizar nombres existentes a sus nombres oficiales completos
    emps = emps.map((emp) => {
      const match = DEFAULT_PAYROLL_EMPLOYEES.find((def) => {
        const dNorm = normalizeStr(def.name);
        const eNorm = normalizeStr(emp.name);
        return dNorm === eNorm || dNorm.includes(eNorm) || eNorm.includes(dNorm);
      });
      if (match) {
        return {
          ...emp,
          name: match.name,
          role: match.role,
          isInsuredINSS: match.isInsuredINSS,
          nss: match.nss ?? emp.nss,
          hireDate: match.hireDate ?? emp.hireDate,
          reportedSalaryINSS: match.reportedSalaryINSS ?? emp.reportedSalaryINSS,
        };
      }
      return emp;
    });

    // 3. Si falta algún empleado de la plantilla oficial de 13 integrantes, agregarlo
    for (const defEmp of DEFAULT_PAYROLL_EMPLOYEES) {
      const exists = emps.some((e) => {
        const dNorm = normalizeStr(defEmp.name);
        const eNorm = normalizeStr(e.name);
        return dNorm === eNorm || dNorm.includes(eNorm) || eNorm.includes(dNorm);
      });
      if (!exists) {
        emps.push({ ...defEmp });
      }
    }

    loaded.payrollEmployees = emps;

    if (!loaded.payrollIncidents) {
      loaded.payrollIncidents = [];
    }

    // 4. Limpiar historial de planillas (excluir Maverick y Sandor, actualizar nombres)
    if (!loaded.payrollHistory) {
      loaded.payrollHistory = [];
    } else {
      loaded.payrollHistory = loaded.payrollHistory.map((hist) => ({
        ...hist,
        rows: (hist.rows || [])
          .filter((r) => !isExcluded(r.name))
          .map((r) => {
            const match = DEFAULT_PAYROLL_EMPLOYEES.find((d) => {
              const dNorm = normalizeStr(d.name);
              const rNorm = normalizeStr(r.name);
              return dNorm === rNorm || dNorm.includes(rNorm) || rNorm.includes(dNorm);
            });
            return match ? { ...r, name: match.name, role: match.role } : r;
          }),
        specialRows: (hist.specialRows || [])
          .filter((sr) => !isExcluded(sr.name))
          .map((sr) => {
            const match = DEFAULT_PAYROLL_EMPLOYEES.find((d) => {
              const dNorm = normalizeStr(d.name);
              const sNorm = normalizeStr(sr.name);
              return dNorm === sNorm || dNorm.includes(sNorm) || sNorm.includes(dNorm);
            });
            return match
              ? {
                  ...sr,
                  name: match.name,
                  role: match.role,
                  nss: match.nss || sr.nss,
                  hireDate: match.hireDate || sr.hireDate,
                }
              : sr;
          }),
      }));
    }

    // 5. Configurar URL oficial de Bodegón Pass en Render
    if (
      !loaded.bodegonPassUrl ||
      loaded.bodegonPassUrl.includes('localhost:8000') ||
      loaded.bodegonPassUrl.includes('127.0.0.1:8000')
    ) {
      loaded.bodegonPassUrl = 'https://asistenciabodegon-api.onrender.com';
    }

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
