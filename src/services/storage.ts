import { AppState, CashShift, DenominationsNIO, DenominationsUSD, PettyCashShift, PettyCashTransaction, TablewareItem, isOpeningPettyCashTx, VendorItem } from '../types';
import { calculateSpecialPayrollRow } from '../types/payroll';
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
  'GASTOS_COCINA',
  'OTROS',
];

export const DEFAULT_VENDORS: VendorItem[] = [
  { id: 'v-carnic', name: 'CARNIC', defaultCategory: 'CARNES', active: true },
  { id: 'v-carniceria-sm', name: 'Carnicería SM', defaultCategory: 'CARNES', active: true },
  { id: 'v-camarones', name: 'Camarones', defaultCategory: 'CARNES', active: true },
  { id: 'v-pollo', name: 'Pollo', defaultCategory: 'POLLO', active: true },
  { id: 'v-hielo-olito', name: 'Hielo Olito', defaultCategory: 'HIELO', active: true },
  { id: 'v-coca-cola', name: 'Coca Cola', defaultCategory: 'BEBIDAS', active: true },
  { id: 'v-fuente-pura', name: 'Fuente Pura', defaultCategory: 'BEBIDAS', active: true },
  { id: 'v-agua', name: 'Agua', defaultCategory: 'BEBIDAS', active: true },
  { id: 'v-chelinas', name: 'Chelinas', defaultCategory: 'BEBIDAS', active: true },
  { id: 'v-flor-de-cana', name: 'Flor de Caña', defaultCategory: 'BEBIDAS_ALCOHOLICAS', active: true },
  { id: 'v-cerveceria', name: 'Pago de cerveceria', defaultCategory: 'BEBIDAS_ALCOHOLICAS', active: true },
  { id: 'v-delivery', name: 'Delivery', defaultCategory: 'DELIVERYS_ACARREOS', active: true },
  { id: 'v-rapivoy', name: 'Rapivoy', defaultCategory: 'DELIVERYS_ACARREOS', active: true },
  { id: 'v-triciclo', name: 'Triciclo', defaultCategory: 'DELIVERYS_ACARREOS', active: true },
  { id: 'v-mercado', name: 'Mercado', defaultCategory: 'FRUTAS_VEGETALES', active: true },
  { id: 'v-supermercado', name: 'Supermercado', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-comercial-paniagua', name: 'Comercial Paniagua', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-sym', name: 'SyM', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-cerro-de-oro', name: 'Cerro de Oro', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-pan-y-paz', name: 'Pan y Paz', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-cafe-soluble', name: 'Café Soluble', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-dokar', name: 'Dokar', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-pulperia', name: 'Pulpería', defaultCategory: 'SUPERMERCADO', active: true },
  { id: 'v-quesillo', name: 'Quesillo', defaultCategory: 'LACTEOS', active: true },
  { id: 'v-gas', name: 'Gas', defaultCategory: 'OTROS', active: true },
  { id: 'v-tortilleria', name: 'Tortillería', defaultCategory: 'OTROS', active: true },
  { id: 'v-ferreteria', name: 'Ferretería', defaultCategory: 'OTROS', active: true },
  { id: 'v-alcaldia', name: 'Alcaldía', defaultCategory: 'OTROS', active: true },
  { id: 'v-eddy-martinez', name: 'Eddy Martínez', defaultCategory: 'GASTOS ADMINISTRATIVOS', active: true },
];

import { PayrollEmployee } from '../types/payroll';

export const DEFAULT_PAYROLL_EMPLOYEES: PayrollEmployee[] = [
  // --- 5 Colaboradores Asegurados en Planilla Especial (INSS) - C$ 5,675.04 c/u ---
  {
    id: 'emp-1',
    name: 'Julissa Lucero Ramírez Hernández',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '19915977',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-2',
    name: 'Martha Patricia Meléndez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '46236436',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-3',
    name: 'Marlon Joseph Narváez Camacho',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '29694792',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-4',
    name: 'Uriel de Jesús Zamora Salgado',
    role: 'Jefe de Cocina',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '32911303',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  {
    id: 'emp-5',
    name: 'Estefani de los Ángeles Padilla Urey',
    role: 'Atención al Cliente',
    baseSalaryBiweekly: 5675.04,
    isInsuredINSS: true,
    nss: '35137463',
    hireDate: '2025-11-01',
    reportedSalaryINSS: 5675.04,
    isActive: true,
  },
  // --- Colaboradores de Planilla Operativa Quincenal ---
  {
    id: 'emp-6',
    name: 'Nelly Delgado Escoto',
    role: 'Cocinera',
    baseSalaryBiweekly: 6250.00,
    isInsuredINSS: false,
    hireDate: '2026-09-01',
    isActive: true,
  },
  {
    id: 'emp-8',
    name: 'Eddy Bernardo Martínez Blanco',
    role: 'Admon',
    baseSalaryBiweekly: 6000.00,
    isInsuredINSS: false,
    hireDate: '2024-05-15',
    isActive: true,
  },
  {
    id: 'emp-9',
    name: 'Yhaira de Jesús Rivas',
    role: 'Limpieza',
    baseSalaryBiweekly: 4500.00,
    isInsuredINSS: false,
    hireDate: '2025-05-25',
    isActive: true,
  },
  {
    id: 'emp-10',
    name: 'Oscar Adolfo Vásquez Omeany',
    role: 'Barra',
    baseSalaryBiweekly: 5675.00,
    isInsuredINSS: false,
    hireDate: '2026-02-16',
    isActive: true,
  },
  {
    id: 'emp-11',
    name: 'Xiomara Castillo',
    role: 'Admon',
    baseSalaryBiweekly: 6500.00,
    isInsuredINSS: false,
    hireDate: '2026-07-15',
    isActive: true,
  },
  {
    id: 'emp-13',
    name: 'Yunieth Verónica Carmona Sánchez',
    role: 'Asistente de Cocina',
    baseSalaryBiweekly: 5675.00,
    isInsuredINSS: false,
    hireDate: '2026-04-17',
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
  vendorsList: DEFAULT_VENDORS,
  
  // Nóminas y Planillas
  payrollEmployees: DEFAULT_PAYROLL_EMPLOYEES,
  payrollIncidents: [],
  payrollHistory: [],
  bodegonPassUrl: 'https://asistenciabodegon-api.onrender.com',
};

const DELETED_PAYROLL_NAMES_KEY = 'bodegon_deleted_payroll_names_v1';

export function getDeletedPayrollNames(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_PAYROLL_NAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDeletedPayrollName(name: string): void {
  try {
    const norm = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!norm) return;
    const current = getDeletedPayrollNames();
    if (!current.includes(norm)) {
      localStorage.setItem(DELETED_PAYROLL_NAMES_KEY, JSON.stringify([...current, norm]));
    }
  } catch {}
}

export function removeDeletedPayrollName(name: string): void {
  try {
    const norm = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!norm) return;
    const current = getDeletedPayrollNames().filter((n) => n !== norm);
    localStorage.setItem(DELETED_PAYROLL_NAMES_KEY, JSON.stringify(current));
  } catch {}
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw);
    const loaded: AppState = { ...INITIAL_STATE, ...parsed };

    // Tasa de cambio: 36.00 por defecto, pero se respeta si se cambió en el sistema.
    if (!(Number(loaded.defaultExchangeRate) > 0)) {
      loaded.defaultExchangeRate = 36.00;
    }

    // Administradores autorizados estrictamente: Eddy, Xiomara, Ezequiel, Snyder
    loaded.availableAdmins = ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder'];
    if (loaded.activeAdminName && !loaded.availableAdmins.includes(loaded.activeAdminName)) {
      loaded.activeAdminName = 'Eddy';
    }

    // Categorías de gastos editables
    if (!loaded.expenseCategories || loaded.expenseCategories.length === 0) {
      loaded.expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
    }

    // Catálogo de proveedores
    if (!loaded.vendorsList || loaded.vendorsList.length === 0) {
      loaded.vendorsList = [...DEFAULT_VENDORS];
    }

    // Mapeo para actualizar nombres antiguos a los oficiales completos
    const normalizeStr = (s: string) =>
      (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const userDeletedNames = getDeletedPayrollNames();

    // Saneamiento de Nómina y Planillas (Excluyendo ex-colaboradores dados de baja y eliminados por el usuario):
    const isExcluded = (name: string) => {
      const n = normalizeStr(name);
      if (!n) return false;
      if (userDeletedNames.includes(n)) return true;
      return (
        n.includes('maverick') ||
        n.includes('sandor') ||
        n.includes('eliezer') ||
        n.includes('david quintero') ||
        n.includes('heiling') ||
        n.includes('lea calvo') ||
        n.includes('melvin ojeda') ||
        n.includes('zenon lopez') ||
        n.includes('carlos eduardo garcia')
      );
    };

    if (!Array.isArray(parsed.payrollEmployees)) {
      loaded.payrollEmployees = [...DEFAULT_PAYROLL_EMPLOYEES];
    } else {
      loaded.payrollEmployees = parsed.payrollEmployees.filter((e: PayrollEmployee) => !isExcluded(e.name));
    }

    if (!loaded.payrollIncidents) {
      loaded.payrollIncidents = [];
    }

    // Respetar el historial de planillas guardado por el usuario (limpiando ex-colaboradores y eliminados)
    if (!loaded.payrollHistory) {
      loaded.payrollHistory = [];
    } else {
      loaded.payrollHistory = loaded.payrollHistory.map((hist) => ({
        ...hist,
        rows: (hist.rows || []).filter((row) => !isExcluded(row.name)),
        specialRows: (hist.specialRows || []).filter((s) => !isExcluded(s.name)).map(calculateSpecialPayrollRow),
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

    // Respetar el inventario de vajilla y menaje registrado por el usuario (filtrando solo ítems demo iniciales antiguos)
    if (!Array.isArray(loaded.tablewareItems)) {
      loaded.tablewareItems = [];
    } else {
      loaded.tablewareItems = loaded.tablewareItems.filter((it) => !/^tw-[1-8]$/.test(it.id));
    }
    if (!Array.isArray(loaded.tablewareLosses)) {
      loaded.tablewareLosses = [];
    } else {
      loaded.tablewareLosses = loaded.tablewareLosses.filter((l) => !/^loss-[1-4]$/.test(l.id));
    }

    // Si no está definido el turno de caja chica, mantenerlo en null
    if (loaded.currentPettyCashShift === undefined) {
      loaded.currentPettyCashShift = null;
    }
    if (!loaded.pettyCashShiftHistory) {
      loaded.pettyCashShiftHistory = [];
    }

    // Nota: aquí antes se borraban compras "duplicadas" (mismo proveedor, monto y minuto).
    // Se quitó porque eliminaba compras reales repetidas (ej. dos bolsas de hielo seguidas).
    // Los duplicados reales de la nube se depuran por cloudId al sincronizar.

    // Limpiar transacciones demo residuales y duplicados conocidos (ej. ID 85 duplicado de C$ 2,600)
    loaded.pettyCashTransactions = (loaded.pettyCashTransactions || []).filter(
      (tx) =>
        !tx.id.startsWith('pct-init-') &&
        !tx.id.startsWith('pct-transfer-open-') &&
        !tx.id.startsWith('opening-') &&
        tx.cloudId !== 85 &&
        tx.id !== 'pct-cloud-85'
    );

    // Eliminar posible duplicado local de C$ 2,600 si ya existe registrado el fondeo oficial
    const hasOfficial2600 = loaded.pettyCashTransactions.some(
      (tx) => tx.amount === 2600 && tx.type === 'INFLOW' && (tx.cloudId === 59 || tx.id === 'pct-cloud-59')
    );
    if (hasOfficial2600) {
      loaded.pettyCashTransactions = loaded.pettyCashTransactions.filter(
        (tx) => !(tx.amount === 2600 && tx.type === 'INFLOW' && !tx.cloudId && (tx.notes || '').toLowerCase().includes('snyder'))
      );
    }

    // Recalcular con precisión estricta el saldo físico en gaveta de la jornada
    // Si la jornada está ABIERTA: saldo inicial + ingresos extra en efectivo - egresos en efectivo del turno
    // Si la jornada está CERRADA: saldo físico final del último cierre o 0 si no hay turnos
    if (loaded.currentPettyCashShift && loaded.currentPettyCashShift.status === 'OPEN') {
      const shiftId = loaded.currentPettyCashShift.id;
      const initial = Number(loaded.currentPettyCashShift.initialBalance) || 0;

      const shiftTxs = (loaded.pettyCashTransactions || []).filter((tx) => {
        if (tx.shiftId) return tx.shiftId === shiftId;
        if (tx.date && extractLocalDateStr(tx.date) === loaded.currentPettyCashShift!.date) return true;
        return false;
      });

      const totalInflows = shiftTxs
        .filter((t) => t.type === 'INFLOW' && !isOpeningPettyCashTx(t))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const cashExpenses = shiftTxs
        .filter((t) => t.type === 'EXPENSE' && (t.method === 'CASH' || !t.method))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      loaded.pettyCashBalance = Math.max(0, parseFloat((initial + totalInflows - cashExpenses).toFixed(2)));
    } else {
      const lastClosed = loaded.pettyCashShiftHistory?.[0];
      loaded.pettyCashBalance = lastClosed?.actualCashCounted ?? lastClosed?.expectedBalance ?? 0;
    }

    return loaded;
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
    return INITIAL_STATE;
  }
}

/**
 * Obtiene todas las transacciones de Caja Chica correspondientes a una fecha específica (YYYY-MM-DD)
 * Garantiza aislamiento absoluto por shiftId.
 */
export function getPettyCashTransactionsForDate(
  transactions: PettyCashTransaction[],
  dateStr: string,
  shiftId?: string
): PettyCashTransaction[] {
  return transactions.filter((tx) => {
    if (isOpeningPettyCashTx(tx)) {
      return false;
    }
    if (shiftId) {
      if (tx.shiftId) return tx.shiftId === shiftId;
      return tx.date ? extractLocalDateStr(tx.date) === dateStr : false;
    }
    if (tx.shiftId) return tx.shiftId === `pc-shift-${dateStr}`;
    if (!tx.date) return false;
    return extractLocalDateStr(tx.date) === dateStr;
  });
}


export const BACKUP_DAYS_TO_KEEP = 7;

function pruneOldBackups(today: string): void {
  const backupKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) backupKeys.push(key);
  }
  const keep = new Set(
    [...backupKeys, `${BACKUP_PREFIX}${today}`].sort().reverse().slice(0, BACKUP_DAYS_TO_KEEP)
  );
  backupKeys.filter((k) => !keep.has(k)).forEach((k) => localStorage.removeItem(k));
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Respaldo diario rotativo: se guardan solo los últimos días para no llenar el espacio local
    // (cuando se llena, el guardado principal falla en silencio).
    const today = getLocalTodayStr();
    pruneOldBackups(today);
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
