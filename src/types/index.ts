export type ShiftStatus = 'OPEN' | 'CLOSED';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

export type ExpenseCategory = 
  | 'CARNES'
  | 'POLLO'
  | 'HIELO'
  | 'BEBIDAS'
  | 'BEBIDAS_ALCOHOLICAS'
  | 'DELIVERYS_ACARREOS'
  | 'FRUTAS_VEGETALES'
  | 'SUPERMERCADO'
  | 'MERCADO'
  | 'LACTEOS'
  | 'PAGOS_PERSONAL'
  | 'OTROS';


export interface DenominationsNIO {
  1000: number;
  500: number;
  200: number;
  100: number;
  50: number;
  20: number;
  10: number;
  5: number;
  1: number;
  0.5: number;
}

export interface DenominationsUSD {
  100: number;
  50: number;
  20: number;
  10: number;
  5: number;
  2: number;
  1: number;
}

export interface CashShift {
  id: string;
  date: string; // YYYY-MM-DD
  status: ShiftStatus;
  exchangeRate: number; // e.g. 36.00

  // Apertura
  openedBy: string; // e.g. 'Eddy'
  openedAt: string; // ISO datetime
  verifiedPreviousClosingId: string | null;
  openingNotes: string;
  openingNIO: DenominationsNIO;
  openingUSD: DenominationsUSD;
  totalOpeningNIO: number; // Physical NIO
  totalOpeningUSD: number; // Physical USD
  totalOpeningEquivNIO: number; // totalOpeningNIO + (totalOpeningUSD * exchangeRate)
  openingCashCountedNIO?: number; // Total billetes/monedas contados físicamente antes de traspasos
  openingTransferToPettyCash?: number; // Monto trasladado a Caja Chica al abrir (se resta de la gaveta de caja general)

  // Validación de Ventas de Ayer (según reporte de Loyverse a la Apertura)
  loyverseValidation?: {
    validated: boolean;
    salesCashLoyverse: number;
    cardsBAC: number;
    cardsFicohsa: number;
    cardsBanpro: number;
    cardsLafise: number;
    totalCards: number;
    salesPedidosYa: number;
    totalLoyverseSales: number;
    notes?: string;
  };

  // Resumen de Ganancias de Ayer calculado en Apertura (Hoja Final del Acta de Apertura)
  openingEarningsSummary?: {
    cardsBAC: number;
    cardsFicohsa: number;
    cardsBanpro: number;
    cardsLafise: number;
    totalCards: number;
    salesPedidosYa: number;
    salesCashLoyverse: number;
    loyversePaidOut: number; // Pagos y Salidas Loyverse
    efectivoRealGenerado: number; // Ventas Efectivo + Pagos y Salidas
    otherIncome?: number;
    totalGenerado: number; // Tarjetas + PedidosYa + Efectivo Real + Otros
    gastosEfectivo: number; // Compras en efectivo Caja Chica
    gastosTransferencia: number; // Gastos bancarios/tarjeta Caja Chica
    propinasEntregadas: number; // Propinas pagadas de ayer
    totalGastos: number; // gastosEfectivo + gastosTransferencia + propinasEntregadas
    gananciaNeta: number; // totalGenerado - totalGastos
    margenPorcentaje: number;
  };

  // Cierre (populated when status === 'CLOSED')
  closedBy?: string; // e.g. 'Xiomara'
  closedAt?: string; // ISO datetime
  closingNIO?: DenominationsNIO;
  closingUSD?: DenominationsUSD;
  totalClosingNIO?: number;
  totalClosingUSD?: number;
  totalClosingEquivNIO?: number;

  // Conciliación de Ventas
  salesCashSystem?: number; // Ventas en efectivo según POS
  cardsBAC?: number;
  cardsFicohsa?: number;
  cardsBanpro?: number;
  cardsLafise?: number;
  totalCards?: number; // BAC + Ficohsa + Banpro + Lafise
  salesPedidosYa?: number;
  otherIncome?: number; // Otros Ingresos
  otherIncomeNotes?: string; // Concepto / Detalle de otros ingresos
  totalGrossSales?: number; // Efectivo + Tarjetas + PedidosYa + Otros Ingresos

  // Propinas
  totalTipCollected?: number;
  staffCount?: number;
  individualTip?: number;
  tipPaid?: boolean;
  tipNotes?: string;
  tipYahairaWorked?: boolean; // Acuerdo laboral: cuota especial fija si trabajó
  tipYahairaAmount?: number; // Monto asignado (por defecto C$ 100)
  tipTeamPool?: number; // Fondo restante a repartir entre el resto del equipo (totalTipCollected - tipYahairaAmount)
  tipIsRounded?: boolean; // Si se aplicó la regla de redondeo a billetes de C$ 10
  tipDistributedTotal?: number; // Total real de propina entregado en efectivo tras redondeo (staffCount * individualTip + tipYahairaAmount)
  tipRoundingDiff?: number; // Diferencia entre propina recaudada en POS y la entregada en físico (totalTipCollected - tipDistributedTotal)

  // Deducciones / Retiros de Caja
  transferToPettyCash?: number; // Pagos/Salidas hacia Caja Chica (traspasos en el turno)
  depositedFromPettyCash?: number; // Depositado desde Caja Chica hacia General (reintegros)
  overtimePaidCash?: number;
  extraDaysPaidCash?: number;
  reserveDGI?: number;
  reservePayroll?: number;
  reserveVacations?: number;
  reserveSnyder?: number;
  totalWithdrawals?: number;

  // Saldo al Cierre de Caja Grande (queda en gaveta para apertura siguiente)
  // No hay "Caja de Vueltos" separada: la Caja Grande es la misma gaveta que maneja
  // ventas, vueltos y el fondo operativo. El saldo al cierre = fondo apertura día siguiente.
  dailyNetProfit?: number; // Ingresos Totales - Egresos Totales (Utilidad neta de la jornada)

  // Cuadre
  expectedCashNIO?: number;
  actualCashNIO?: number;
  netCashAfterTipsNIO?: number; // Efectivo físico neto en gaveta tras descontar propinas entregadas
  differenceNIO?: number; // actual - expected
  auditStatus?: 'SQUARED' | 'SURPLUS' | 'SHORTAGE';
  closingNotes?: string;
}

export interface PettyCashTransaction {
  id: string;
  shiftId: string;
  date: string; // ISO datetime
  type: 'EXPENSE' | 'INFLOW'; // INFLOW = Reembolso / Traslado / Aporte
  inflowSource?: 'TRASLADO_CAJA_GENERAL' | 'APORTE_JEFE' | 'FONDO_INICIAL';
  amount: number;
  method: PaymentMethod;
  vendor: string; // Proveedor o Concepto
  category: ExpenseCategory;
  receiptNumber?: string;
  registeredBy: string;
  notes?: string;
  cloudId?: number;
  syncStatus?: 'SYNCED' | 'PENDING' | 'ERROR';
  syncError?: string;
}

/**
 * Determina si una transacción de caja chica corresponde al fondeo inicial o traspaso de apertura.
 * Estas transacciones forman parte del `initialBalance` de la jornada y NO deben contarse
 * como ingresos extras adicionales ni duplicarse como filas regulares en el arqueo.
 */
export function isOpeningPettyCashTx(tx: PettyCashTransaction): boolean {
  if (!tx) return false;
  const id = tx.id || '';
  if (
    id.startsWith('pct-init-') ||
    id.startsWith('pct-transfer-open-') ||
    id.startsWith('opening-')
  ) {
    return true;
  }
  if (tx.inflowSource === 'FONDO_INICIAL') {
    return true;
  }

  const notes = (tx.notes || '').toLowerCase();

  // Detección de tags o traspasos de apertura generados estrictamente al abrir jornada
  if (
    notes.includes('[opening_transfer:true]') ||
    notes.includes('traspaso al abrir') ||
    notes.includes('fondeo inicial')
  ) {
    return true;
  }

  return false;
}

export interface PettyCashShift {
  id: string; // e.g. 'pc-shift-2026-09-21-1'
  date: string; // YYYY-MM-DD
  status: ShiftStatus; // 'OPEN' | 'CLOSED'

  // Apertura
  openedBy: string; // e.g. 'Eddy'
  openedAt: string; // ISO datetime
  previousDayRemaining: number; // Fondo restante del día anterior (sobrante de ayer)
  generalCashTransfer: number; // Traslado desde Caja General al abrir
  bossContribution: number; // Aporte directo inicial del jefe al abrir
  initialBalance: number; // previousDayRemaining + generalCashTransfer + bossContribution
  openingNotes?: string;

  // Cierre (poblado cuando status === 'CLOSED')
  closedBy?: string;
  closedAt?: string;
  totalExpenses?: number; // Suma de gastos de la jornada
  totalInflows?: number; // Fondeos extras recibidos durante el día
  expectedBalance?: number; // initialBalance + totalInflows - totalExpenses
  actualCashCounted?: number; // Efectivo real en mano contado al cerrar
  difference?: number; // actualCashCounted - expectedBalance
  auditStatus?: 'SQUARED' | 'SURPLUS' | 'SHORTAGE';
  closingNotes?: string;
}

export interface TablewareItem {
  id: string;
  name: string;
  area: 'BARRA' | 'SALON' | 'COCINA';
  unit: string;
  currentStock: number;
  minimumStock: number;
  unitCostNIO: number;
  lastAuditDate: string;
}

export interface TablewareLoss {
  id: string;
  itemId: string;
  itemName: string;
  date: string; // ISO
  quantity: number;
  reason: 'ROTURA_SALON' | 'ROTURA_BARRA' | 'RAJADO_CALOR' | 'EXTRAVIADO' | 'DESGASTE';
  registeredBy: string;
  totalCostNIO: number;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export * from './payroll';

export interface VendorItem {
  id: string;
  name: string;
  defaultCategory: ExpenseCategory | string;
  phone?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
}

export interface AppState {
  currentShift: CashShift | null;
  shiftHistory: CashShift[];
  currentPettyCashShift: PettyCashShift | null;
  pettyCashShiftHistory: PettyCashShift[];
  pettyCashTransactions: PettyCashTransaction[];
  pettyCashBalance: number;
  tablewareItems: TablewareItem[];
  tablewareLosses: TablewareLoss[];
  auditLogs: AuditLogEntry[];
  defaultExchangeRate: number;
  activeAdminName: string;
  availableAdmins: string[];
  expenseCategories: string[];
  vendorsList?: VendorItem[];
  
  // Módulo de Nóminas y Planillas
  payrollEmployees: import('./payroll').PayrollEmployee[];
  payrollIncidents: import('./payroll').PayrollIncident[];
  payrollHistory: import('./payroll').BiweeklyPayrollRecord[];
  bodegonPassUrl?: string;
}

export interface DailyEarningsSummary {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Lunes 22 Sep"
  status: ShiftStatus;
  cashSales: number;
  cardsBAC: number;
  cardsFicohsa: number;
  cardsBanpro: number;
  cardsLafise: number;
  totalCards: number;
  pedidosYaSales: number;
  otherIncomeSales?: number;
  totalGrossSales: number;
  pettyCashExpenses: number;
  transfersPaid: number;
  totalExpenses: number;
  netEarnings: number;
  tipsCollected: number;
  responsible: string;
  sourceShiftId?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      showSaveDialog: (options: any) => Promise<any>;
      checkForUpdates: () => Promise<any>;
      restartAndInstall: () => Promise<void>;
      onUpdateAvailable: (callback: (info: any) => void) => () => void;
      onUpdateProgress: (callback: (progress: { percent: number; bytesPerSecond: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: any) => void) => () => void;
      onUpdateStatus: (callback: (status: any) => void) => () => void;
      isDesktop: boolean;
    };
  }
}
