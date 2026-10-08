import { AppState, CashShift, DenominationsNIO, DenominationsUSD, PettyCashShift, PettyCashTransaction, TablewareItem, isOpeningPettyCashTx, VendorItem } from '../types';
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
  vendorsList: DEFAULT_VENDORS,
  
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

    // Catálogo de proveedores
    if (!loaded.vendorsList || loaded.vendorsList.length === 0) {
      loaded.vendorsList = [...DEFAULT_VENDORS];
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

    const isMatch = (nameA: string, nameB: string): boolean => {
      const a = normalizeStr(nameA);
      const b = normalizeStr(nameB);
      if (!a || !b) return false;
      if (a === b || a.includes(b) || b.includes(a)) return true;
      const tokensB = b.split(/\s+/).filter((t) => t.length >= 3);
      if (tokensB.length >= 2 && tokensB.filter((t) => a.includes(t)).length >= 2) return true;
      const tokensA = a.split(/\s+/).filter((t) => t.length >= 3);
      if (tokensA.length >= 2 && tokensA.filter((t) => b.includes(t)).length >= 2) return true;
      return false;
    };

    const existingEmps = (loaded.payrollEmployees || []).filter((e) => !isExcluded(e.name));

    // 2. Mapear cada empleado oficial de DEFAULT_PAYROLL_EMPLOYEES preservando datos existentes si los hay
    const sanitizedEmps: PayrollEmployee[] = DEFAULT_PAYROLL_EMPLOYEES.map((defEmp) => {
      const found = existingEmps.find((e) => isMatch(defEmp.name, e.name));
      if (found) {
        return {
          ...defEmp,
          baseSalaryBiweekly: found.baseSalaryBiweekly || defEmp.baseSalaryBiweekly,
          reportedSalaryINSS: found.reportedSalaryINSS || defEmp.reportedSalaryINSS,
          nss: found.nss || defEmp.nss,
          hireDate: found.hireDate || defEmp.hireDate,
          isActive: found.isActive !== undefined ? found.isActive : defEmp.isActive,
        };
      }
      return { ...defEmp };
    });

    // 3. Agregar cualquier colaborador extra/personalizado que NO coincida con ninguno de la plantilla base
    for (const e of existingEmps) {
      const matchesOfficial = sanitizedEmps.some((def) => isMatch(def.name, e.name));
      if (!matchesOfficial) {
        const alreadyIn = sanitizedEmps.some((s) => normalizeStr(s.name) === normalizeStr(e.name));
        if (!alreadyIn) {
          sanitizedEmps.push({ ...e });
        }
      }
    }

    loaded.payrollEmployees = sanitizedEmps;

    if (!loaded.payrollIncidents) {
      loaded.payrollIncidents = [];
    }

    // 4. Limpiar historial de planillas (excluir Maverick y Sandor, deduplicar filas de cada período)
    if (!loaded.payrollHistory) {
      loaded.payrollHistory = [];
    } else {
      loaded.payrollHistory = loaded.payrollHistory.map((hist) => {
        const uniqueRows: import('../types/payroll').BiweeklyPayrollRow[] = [];
        for (const r of (hist.rows || []).filter((row) => !isExcluded(row.name))) {
          const def = DEFAULT_PAYROLL_EMPLOYEES.find((d) => isMatch(d.name, r.name));
          const canonicalName = def ? def.name : r.name;
          const canonicalRole = def ? def.role : r.role;
          const existingIndex = uniqueRows.findIndex((ur) => isMatch(ur.name, canonicalName));
          if (existingIndex === -1) {
            uniqueRows.push({ ...r, name: canonicalName, role: canonicalRole });
          } else {
            const existing = uniqueRows[existingIndex];
            uniqueRows[existingIndex] = {
              ...existing,
              name: canonicalName,
              role: canonicalRole,
              overtimeHours: existing.overtimeHours || r.overtimeHours || 0,
              overtimeAmount: existing.overtimeAmount || r.overtimeAmount || 0,
              holidaysCount: existing.holidaysCount || r.holidaysCount || 0,
              holidaysAmount: existing.holidaysAmount || r.holidaysAmount || 0,
              bonuses: existing.bonuses || r.bonuses || 0,
              loanDeduction: existing.loanDeduction || r.loanDeduction || 0,
              restaurantServiceDeduction: existing.restaurantServiceDeduction || r.restaurantServiceDeduction || 0,
              breakageDeduction: existing.breakageDeduction || r.breakageDeduction || 0,
              breakageNotes: existing.breakageNotes || r.breakageNotes || '',
              totalPaid: existing.totalPaid || r.totalPaid || (existing.baseSalary || 0),
            };
          }
        }

        const uniqueSpecial: import('../types/payroll').SpecialPayrollRow[] = [];
        for (const sr of (hist.specialRows || []).filter((s) => !isExcluded(s.name))) {
          const def = DEFAULT_PAYROLL_EMPLOYEES.find((d) => isMatch(d.name, sr.name));
          const canonicalName = def ? def.name : sr.name;
          const canonicalRole = def ? def.role : sr.role;
          const existingIndex = uniqueSpecial.findIndex((us) => isMatch(us.name, canonicalName));
          if (existingIndex === -1) {
            uniqueSpecial.push({
              ...sr,
              name: canonicalName,
              role: canonicalRole,
              nss: (def && def.nss) || sr.nss,
              hireDate: (def && def.hireDate) || sr.hireDate,
              reportedSalary: (def && def.reportedSalaryINSS) || sr.reportedSalary,
            });
          }
        }

        return {
          ...hist,
          rows: uniqueRows,
          specialRows: uniqueSpecial,
        };
      });
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

    // Saneamiento de movimientos de Caja Chica:
    // Asegurar que las compras pertenecientes al 2026-10-02 (o jornadas anteriores) queden estrictamente
    // aisladas en su shiftId correspondiente (pc-shift-2026-10-02) y no contaminen la jornada del 2026-10-03
    const FRIDAY_2026_10_02_CLOUD_IDS = new Set([
      49, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83
    ]);
    const FRIDAY_2026_10_02_KEYWORDS = [
      'gas de 100', 'yahaira', 'queso quesillo', 'delivery quesillo', 'hielo', 'carnic', 'delivery carnic',
      'dia completo laburado ezequiel', 'basura', 'limones', 'mercado', 'sandor', 'tajin', 'lechuga',
      'pepinos', 'alvaro', 'delivery super', 'flor de caña', 'fresas', 'comida de gato', 'cuajada',
      'tortillas', 'paniagua', 'huevos'
    ];

    if (loaded.pettyCashTransactions && loaded.pettyCashTransactions.length > 0) {
      loaded.pettyCashTransactions = loaded.pettyCashTransactions.map((tx) => {
        const isFridayCloud = tx.cloudId && FRIDAY_2026_10_02_CLOUD_IDS.has(tx.cloudId);
        const isFridayId = tx.id.startsWith('pct-cloud-') && FRIDAY_2026_10_02_CLOUD_IDS.has(Number(tx.id.replace('pct-cloud-', '')));
        const isFridayKeyword = FRIDAY_2026_10_02_KEYWORDS.some((kw) =>
          (tx.vendor || '').toLowerCase().includes(kw) || (tx.notes || '').toLowerCase().includes(kw)
        );

        if (isFridayCloud || isFridayId || isFridayKeyword) {
          const timePart = tx.date && tx.date.includes('T') ? tx.date.split('T')[1] : '12:00:00';
          return {
            ...tx,
            shiftId: 'pc-shift-2026-10-02',
            date: `2026-10-02T${timePart}`,
          };
        }
        return tx;
      });
    }

    // Saneamiento de turnos históricos y activos (Viernes 2026-10-02 y Sábado 2026-10-03)
    if (loaded.shiftHistory) {
      loaded.shiftHistory = loaded.shiftHistory.map((s) => {
        if (s.date === '2026-10-02') {
          return {
            ...s,
            actualCashNIO: 11481,
            expectedCashNIO: 11481,
            totalClosingNIO: 11481,
            totalClosingUSD: 40,
            totalClosingEquivNIO: 11481,
            differenceNIO: 0,
            auditStatus: 'SQUARED',
            dailyNetProfit: 14374.97,
          };
        }
        return s;
      });
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
