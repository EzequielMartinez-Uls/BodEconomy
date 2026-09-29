import { AppState, CashShift, PettyCashShift, PettyCashTransaction } from '../types';

export const MOCK_YESTERDAY_DATE = '2026-09-28';

export const MOCK_YESTERDAY_SHIFT: CashShift = {
  id: 'shift-2026-09-28-1',
  date: MOCK_YESTERDAY_DATE,
  status: 'CLOSED',
  exchangeRate: 36.80,

  // Apertura (08:30 AM)
  openedBy: 'Eddy',
  openedAt: '2026-09-28T08:30:00',
  verifiedPreviousClosingId: null,
  openingNotes: 'Apertura regular de jornada de lunes. Fondo base y gaveta verificados físicamente.',
  openingNIO: {
    1000: 0,
    500: 4,  // 2,000
    200: 3,  // 600
    100: 3,  // 300
    50: 1,   // 50
    20: 2,   // 40
    10: 1,   // 10
    5: 0,
    1: 0,
    0.5: 0,
  },
  openingUSD: {
    100: 0,
    50: 0,
    20: 2,   // 40
    10: 1,   // 10
    5: 0,
    2: 0,
    1: 0,
  },
  totalOpeningNIO: 3000.00,
  totalOpeningUSD: 50.00,
  totalOpeningEquivNIO: 4840.00, // 3000 + (50 * 36.80) = 4840

  // Validación Loyverse Apertura
  loyverseValidation: {
    validated: true,
    salesCashLoyverse: 18450.00,
    cardsBAC: 8240.00,
    cardsFicohsa: 4150.00,
    cardsBanpro: 3920.00,
    cardsLafise: 2190.00,
    totalCards: 18500.00,
    salesPedidosYa: 2450.00,
    totalLoyverseSales: 39400.00,
    notes: 'Reportes de cierre Loyverse y POS físicos conciliados satisfactoriamente.',
  },

  // Cierre de Turno (11:15 PM)
  closedBy: 'Xiomara',
  closedAt: '2026-09-28T23:15:00',
  closingNIO: {
    1000: 4, // 4,000
    500: 4,  // 2,000
    200: 5,  // 1,000
    100: 3,  // 300
    50: 2,   // 100
    20: 2,   // 40
    10: 1,   // 10
    5: 0,
    1: 0,
    0.5: 0,
  },
  closingUSD: {
    100: 0,
    50: 0,
    20: 2,   // 40
    10: 1,   // 10
    5: 0,
    2: 0,
    1: 0,
  },
  totalClosingNIO: 7450.00,
  totalClosingUSD: 50.00,
  totalClosingEquivNIO: 9290.00, // 7450 + (50 * 36.80) = 9290

  // Conciliación de Ventas
  salesCashSystem: 18450.00,
  cardsBAC: 8240.00,
  cardsFicohsa: 4150.00,
  cardsBanpro: 3920.00,
  cardsLafise: 2190.00,
  totalCards: 18500.00,
  salesPedidosYa: 2450.00,
  totalGrossSales: 39400.00,

  // Propinas
  totalTipCollected: 2800.00,
  staffCount: 7,
  individualTip: 400.00,
  tipPaid: true,
  tipNotes: 'Distribución en efectivo entregada a 7 colaboradores: Marlon, Sofía, Kevin, Carlos, Brenda, Deybin y Lester (C$ 400 c/u).',

  // Deducciones / Retiros de Caja
  transferToPettyCash: 2500.00,
  overtimePaidCash: 1200.00,
  extraDaysPaidCash: 0.00,
  reserveDGI: 1500.00,
  reservePayroll: 3000.00,
  reserveVacations: 800.00,
  reserveSnyder: 5000.00,
  totalWithdrawals: 14000.00, // 2500 + 1200 + 1500 + 3000 + 800 + 5000 = 14000

  // Utilidad Neta Diaria
  dailyNetProfit: 35380.00, // 39400 (Ventas) - 4020 (Gastos Totales Caja Chica)

  // Cuadre Matemático de Gaveta
  // Fondo Apertura (4,840) + Ventas Efectivo (18,450) - Deducciones (14,000) = 9,290.00
  expectedCashNIO: 9290.00,
  actualCashNIO: 9290.00,
  differenceNIO: 0.00,
  auditStatus: 'SQUARED',
  closingNotes: 'Jornada cerrada exitosamente sin faltantes ni sobrantes. Gaveta cuadrada al 100%.',
};

export const MOCK_YESTERDAY_PETTY_SHIFT: PettyCashShift = {
  id: 'pc-shift-2026-09-28-1',
  date: MOCK_YESTERDAY_DATE,
  status: 'CLOSED',
  openedBy: 'Eddy',
  openedAt: '2026-09-28T08:45:00',
  previousDayRemaining: 1500.00,
  generalCashTransfer: 2500.00,
  bossContribution: 0.00,
  initialBalance: 4000.00, // 1500 + 2500
  openingNotes: 'Fondo de Caja Chica aperturado con remanente de C$ 1,500 y traslado de C$ 2,500 desde Caja General.',
  closedBy: 'Xiomara',
  closedAt: '2026-09-28T23:10:00',
  totalExpenses: 4020.00, // Efectivo C$ 3,340.00 + Transferencia C$ 680.00
  totalInflows: 0.00,
  expectedBalance: 660.00, // 4000 - 3340 (Solo egresos en efectivo restan de la gaveta)
  actualCashCounted: 660.00,
  difference: 0.00,
  auditStatus: 'SQUARED',
  closingNotes: 'Arqueo de Caja Chica cuadrado con C$ 660.00 en gaveta. Todas las facturas y recibos archivados.',
};

export const MOCK_YESTERDAY_PETTY_TRANSACTIONS: PettyCashTransaction[] = [
  {
    id: 'pct-2026-09-28-1',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T09:30:00',
    type: 'EXPENSE',
    amount: 850.00,
    method: 'CASH',
    vendor: 'Distribuidora Avícola La Bendición',
    category: 'POLLO',
    receiptNumber: 'FAC-45821',
    registeredBy: 'Eddy',
    notes: 'Pechugas y alas frescas para preparación del menú del día',
  },
  {
    id: 'pct-2026-09-28-2',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T10:15:00',
    type: 'EXPENSE',
    amount: 240.00,
    method: 'CASH',
    vendor: 'Hielo Polar S.A.',
    category: 'HIELO',
    receiptNumber: 'REC-1092',
    registeredBy: 'Eddy',
    notes: '8 bolsas de hielo en cubo para barra y cocina',
  },
  {
    id: 'pct-2026-09-28-3',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T11:30:00',
    type: 'EXPENSE',
    amount: 480.00,
    method: 'CASH',
    vendor: 'Verdulería Doña Mary (Mercado)',
    category: 'FRUTAS_VEGETALES',
    receiptNumber: 'TIK-330',
    registeredBy: 'Eddy',
    notes: 'Tomate, cebolla, chiltoma, limón criollo y plátano maduro',
  },
  {
    id: 'pct-2026-09-28-4',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T14:45:00',
    type: 'EXPENSE',
    amount: 1250.00,
    method: 'CASH',
    vendor: 'Carnicería El Novillo',
    category: 'CARNES',
    receiptNumber: 'FAC-12044',
    registeredBy: 'Xiomara',
    notes: 'Cortes de lomo de res y posta de cerdo para la parrilla',
  },
  {
    id: 'pct-2026-09-28-5',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T16:30:00',
    type: 'EXPENSE',
    amount: 680.00,
    method: 'TRANSFER',
    vendor: 'Supermercado La Colonia',
    category: 'SUPERMERCADO',
    receiptNumber: 'FAC-89211',
    registeredBy: 'Xiomara',
    notes: 'Aceite vegetal, salsas, condimentos e insumos (Pagado por Transferencia BAC)',
  },
  {
    id: 'pct-2026-09-28-6',
    shiftId: 'pc-shift-2026-09-28-1',
    date: '2026-09-28T18:15:00',
    type: 'EXPENSE',
    amount: 520.00,
    method: 'CASH',
    vendor: "Distribuidora D'Sol",
    category: 'BEBIDAS',
    receiptNumber: 'FAC-6731',
    registeredBy: 'Xiomara',
    notes: 'Reposición de gaseosas retornables y agua purificada embotellada',
  },
];

export const MOCK_YESTERDAY_FULL_STATE: AppState = {
  currentShift: null,
  shiftHistory: [MOCK_YESTERDAY_SHIFT],
  currentPettyCashShift: null,
  pettyCashShiftHistory: [MOCK_YESTERDAY_PETTY_SHIFT],
  pettyCashTransactions: MOCK_YESTERDAY_PETTY_TRANSACTIONS,
  pettyCashBalance: 660.00,
  tablewareItems: [],
  tablewareLosses: [],
  auditLogs: [
    {
      id: 'log-mock-1',
      timestamp: '2026-09-28T08:30:00',
      user: 'Eddy',
      action: 'APERTURA_CAJA_GENERAL',
      details: 'Apertura de turno de lunes con fondo base de C$ 4,840.00 (C$ 3,000 NIO + $50 USD)',
    },
    {
      id: 'log-mock-2',
      timestamp: '2026-09-28T08:45:00',
      user: 'Eddy',
      action: 'APERTURA_CAJA_CHICA',
      details: 'Apertura de Caja Chica con fondo inicial de C$ 4,000.00 (C$ 1,500 remanente + C$ 2,500 traslado)',
    },
    {
      id: 'log-mock-3',
      timestamp: '2026-09-28T22:50:00',
      user: 'Xiomara',
      action: 'PAGO_PROPINAS',
      details: 'Distribución de propinas completada: C$ 2,800.00 entregado a 7 colaboradores (C$ 400 c/u)',
    },
    {
      id: 'log-mock-4',
      timestamp: '2026-09-28T23:10:00',
      user: 'Xiomara',
      action: 'CIERRE_CAJA_CHICA',
      details: 'Cierre de Caja Chica cuadrado con C$ 660.00 en efectivo físico y C$ 4,020.00 en compras registradas',
    },
    {
      id: 'log-mock-5',
      timestamp: '2026-09-28T23:15:00',
      user: 'Xiomara',
      action: 'CIERRE_CAJA_GENERAL',
      details: 'Cierre de Caja General cuadrado con C$ 9,290.00 en gaveta. Diferencia de C$ 0.00.',
    },
  ],
  defaultExchangeRate: 36.80,
  activeAdminName: 'Eddy',
  availableAdmins: ['Eddy', 'Xiomara', 'Maverick', 'Snyder'],
};
