const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kwkyvdoacselhbrnvney.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3a3l2ZG9hY3NlbGhicm52bmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMjkzMDUsImV4cCI6MjEwMzgwNTMwNX0.rKU17TVTQkSqY0_Te-osW8EJhSBoYITEn9_Xug4dTAI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS_DATA = [
  // ────────────────────────────────────────────────────────────────
  // DÍA 1: JUEVES 01/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-01',
    fondo_inicial: 5058.50,
    total_gastos_efectivo: 18221.68,
    total_gastos_transferencia: 0.00,
    fondosComp: {
      previousDayRemaining: 258.50,
      generalCashTransfer: 4800.00,
      bossContribution: 0,
      initialBalance: 5058.50,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 10555.00,
      cardsBAC: 8657.50,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 8657.50,
      salesPedidosYa: 3335.00,
      otherIncome: 0,
      otherIncomeNotes: '',
      totalGrossSales: 22547.50,
      tips: 1260.00,
      updatedAt: '2026-10-01T23:30:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 10555.00,
      expectedCashNIO: 10555.00,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 3065.82,
      closedBy: 'Eddy',
      closedAt: '2026-10-01T23:30:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 986.82,
      expectedBalance: 986.82,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-01T23:30:00.000Z',
    },
    fecha_cierre: '2026-10-01T23:30:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 4800.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'INFLOW', monto: 11160.00, concepto: 'Depositado en efect. - Préstamo Eddy para pagos', prov: 'Eddy', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 6320.00, concepto: 'Prest. Eddy para pagos / Coca Cola', prov: 'Coca Cola', cat: 'BEBIDAS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 163.68, concepto: 'Coca Cola', prov: 'Coca Cola', cat: 'BEBIDAS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1250.00, concepto: 'Supermercado Bolsas de basura', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 2494.00, concepto: 'Camarones Pendientes de pago', prov: 'Camarones', cat: 'CARNES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 6666.00, concepto: 'Fuente Pura', prov: 'Fuente Pura', cat: 'BEBIDAS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 690.00, concepto: 'Pago a Doña Nelly / Reembolso', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'INFLOW', monto: 300.00, concepto: 'Depósito de Caja General', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 100.00, concepto: 'Depósito a caja chica / Gasto', prov: 'Varios', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 500.00, concepto: 'Pago propina de Tarjeta Eduardo / Reemb.', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 378.00, concepto: 'Depósito en caja chica / Gasto', prov: 'Varios', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 1500.00, concepto: 'Pago garrafones de agua / Reemb.', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 500.00, concepto: 'Sobrante de planilla / Ajuste', prov: 'Planilla', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 350.00, concepto: 'Gasto de Snyder', prov: 'Snyder', cat: 'OTROS', metodo: 'EFECTIVO' },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // DÍA 2: VIERNES 02/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-02',
    fondo_inicial: 5987.00,
    total_gastos_efectivo: 26289.50,
    total_gastos_transferencia: 4090.03,
    fondosComp: {
      previousDayRemaining: 987.00,
      generalCashTransfer: 5000.00,
      bossContribution: 0,
      initialBalance: 5987.00,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 25485.00,
      cardsBAC: 31167.50,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 31167.50,
      salesPedidosYa: 1030.00,
      otherIncome: 1899.00,
      otherIncomeNotes: 'Otros ingresos viernes',
      totalGrossSales: 59581.50,
      tips: 4827.00,
      updatedAt: '2026-10-02T23:45:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 25485.00,
      expectedCashNIO: 25485.00,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 14374.97,
      closedBy: 'Eddy',
      closedAt: '2026-10-02T23:45:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 42.00,
      expectedBalance: 42.00,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-02T23:45:00.000Z',
    },
    fecha_cierre: '2026-10-02T23:45:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 5000.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'INFLOW', monto: 2600.00, concepto: 'Depositado en efect.', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 160.00, concepto: 'Compra de Fresas', prov: 'Mercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 140.00, concepto: 'Compra de cuajada almuerzo', prov: 'Mercado', cat: 'LACTEOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 59.00, concepto: 'Compra comida gato', prov: 'Supermercado', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Compra tortillas almuerzo', prov: 'Tortillería', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 10000.00, concepto: 'Depositado en efect. / Reserva gastos', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 2640.00, concepto: 'Comercial Paniagua', prov: 'Comercial Paniagua', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery paniagua', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 27.00, concepto: 'Huevos', prov: 'Pulpería', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 2550.00, concepto: 'Gas de 100 lbs', prov: 'Gas', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 4500.00, concepto: 'Pago de quincena Yahaira', prov: 'Yhaira Rivas', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 500.00, concepto: 'Pago de queso quesillo 5lbs', prov: 'Quesillo', cat: 'LACTEOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery quesillo', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 4000.00, concepto: 'Depósito de general para pagos', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 700.00, concepto: 'Compra de hielo 5 bolsas de 50 lbs', prov: 'Hielo Olito', cat: 'HIELO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 4374.00, concepto: 'Carnic pedido', prov: 'CARNIC', cat: 'CARNES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 100.00, concepto: 'Delivery de carnic', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 400.00, concepto: 'Pago día laborado Ezequiel', prov: 'Ezequiel', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1000.00, concepto: 'Pago de 400 limones 5C/uno', prov: 'Mercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 2000.00, concepto: 'Pago de Basura', prov: 'Alcaldía', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 3040.00, concepto: 'Fact de Mercado 26/9/26', prov: 'Mercado', cat: 'MERCADO', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 2500.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 2500.00, concepto: 'Abono a Sandor Velasquez', prov: 'Sandor Velásquez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 131.50, concepto: 'Compra de Tajín', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 844.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 697.50, concepto: 'Compra de Lechugas', prov: 'Mercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 146.50, concepto: 'Super Pepinos y Tomates', prov: 'Supermercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 300.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 300.00, concepto: 'Pago de día trabajado a Álvaro Ramírez', prov: 'Álvaro Ramírez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 100.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 100.00, concepto: 'Pago de Delivery de Super', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 54.00, concepto: 'Propina de Álvaro en Tarjeta', prov: 'Álvaro Ramírez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 4090.03, concepto: 'Pago Flor de Caña / Proveedor', prov: 'Flor de Caña', cat: 'BEBIDAS_ALCOHOLICAS', metodo: 'TRANSFER' },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // DÍA 3: SÁBADO 03/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-03',
    fondo_inicial: 9642.00,
    total_gastos_efectivo: 24894.50,
    total_gastos_transferencia: 15968.33,
    fondosComp: {
      previousDayRemaining: 42.00,
      generalCashTransfer: 9600.00,
      bossContribution: 0,
      initialBalance: 9642.00,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 28778.00,
      cardsBAC: 46967.80,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 46967.80,
      salesPedidosYa: 5000.00,
      otherIncome: 4711.50,
      otherIncomeNotes: 'Otros ingresos sábado',
      totalGrossSales: 85457.30,
      tips: 5527.30,
      updatedAt: '2026-10-03T23:55:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 28778.00,
      expectedCashNIO: 28778.00,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 39067.17,
      closedBy: 'Eddy',
      closedAt: '2026-10-03T23:55:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 182.50,
      expectedBalance: 182.50,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-03T23:55:00.000Z',
    },
    fecha_cierre: '2026-10-03T23:55:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 9600.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 1774.00, concepto: 'Hielo Olito', prov: 'Hielo Olito', cat: 'HIELO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1200.00, concepto: 'Compra de chelinas', prov: 'Chelinas', cat: 'BEBIDAS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 70.00, concepto: 'Delivery de chelinas', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Delivery de carnic', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 6825.58, concepto: 'Carnic pedido', prov: 'CARNIC', cat: 'CARNES', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 399.00, concepto: 'Compra para almuerzo pollo', prov: 'Pollo', cat: 'POLLO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 9142.75, concepto: 'Compra SyM', prov: 'SyM', cat: 'SUPERMERCADO', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 2950.00, concepto: 'Compra cerro de oro', prov: 'Cerro de Oro', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 550.00, concepto: 'Delivery SyM', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 70.00, concepto: 'Cerro de oro', prov: 'Cerro de Oro', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1100.00, concepto: 'Compra de Tajín', prov: 'Tajín', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 90.00, concepto: 'Delivery tajín', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 500.00, concepto: 'Depósito a caja chica', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 1160.00, concepto: 'Compra de 1 balde de aceite', prov: 'Aceite', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery Aceite', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 2000.00, concepto: 'Depósito a caja chica', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Queso quesillo y fresco', prov: 'Quesillo', cat: 'LACTEOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 195.00, concepto: 'Delivery Queso', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1083.00, concepto: 'Delivery comida Francis', prov: 'Francis', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 582.00, concepto: 'Compra de rollos térmicos', prov: 'Papelería', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 400.00, concepto: 'Compra de supermercado barra', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 67.50, concepto: 'Pan y paz y delivery', prov: 'Pan y Paz', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 1365.00, concepto: 'Depósito a caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 1365.00, concepto: 'Factura de Supermercado', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 11570.00, concepto: 'Depósito de general para pagos de mercado', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 10170.00, concepto: 'Pago de Fact. de Mercado 29/9/26', prov: 'Mercado', cat: 'MERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1400.00, concepto: 'Compra de Servilletas', prov: 'Papelería', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 99.00, concepto: 'Gastos varios de caja', prov: 'Varios', cat: 'OTROS', metodo: 'EFECTIVO' },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // DÍA 4: DOMINGO 04/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-04',
    fondo_inicial: 6982.50,
    total_gastos_efectivo: 14388.50,
    total_gastos_transferencia: 20475.73,
    fondosComp: {
      previousDayRemaining: 182.50,
      generalCashTransfer: 6800.00,
      bossContribution: 0,
      initialBalance: 6982.50,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 14833.50,
      cardsBAC: 40594.00,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 40594.00,
      salesPedidosYa: 13230.00,
      otherIncome: 410.00,
      otherIncomeNotes: 'Otros ingresos domingo',
      totalGrossSales: 69067.50,
      tips: 4318.00,
      updatedAt: '2026-10-04T23:50:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 14833.50,
      expectedCashNIO: 14833.50,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 29885.27,
      closedBy: 'Eddy',
      closedAt: '2026-10-04T23:50:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 114.00,
      expectedBalance: 114.00,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-04T23:50:00.000Z',
    },
    fecha_cierre: '2026-10-04T23:50:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 6800.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery Carnic', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1100.00, concepto: 'Compra de 1 bidón de Aceite', prov: 'Aceite', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 80.00, concepto: 'Delivery de Aceite', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 221.00, concepto: 'Compras de Supermercado', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 173.00, concepto: 'Compra de Servilletas', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 648.00, concepto: 'Compras de Supermercado', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1250.00, concepto: 'Compra de 5lbs de Camarones', prov: 'Camarones', cat: 'CARNES', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 720.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 720.00, concepto: 'Cambio de $20 dollar a Snyder', prov: 'Snyder', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 5000.00, concepto: 'Reembolso a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 5426.50, concepto: 'Compras de Supermercado', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Triciclo', prov: 'Triciclo', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 1800.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 1800.00, concepto: 'Cambio de $50 dollar a Snyder', prov: 'Snyder', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 2500.00, concepto: 'Abono a Sandor Velásquez', prov: 'Sandor Velásquez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Pago de Delivery', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 300.00, concepto: 'Día trabajado de Álvaro Ramírez', prov: 'Álvaro Ramírez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 11160.00, concepto: 'Pago de préstamo a Eddy Martínez', prov: 'Eddy Martínez', cat: 'GASTOS ADMINISTRATIVOS', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 9315.73, concepto: 'CARNIC pedido', prov: 'CARNIC', cat: 'CARNES', metodo: 'TRANSFER' },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // DÍA 5: LUNES 05/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-05',
    fondo_inicial: 4814.00,
    total_gastos_efectivo: 6964.23,
    total_gastos_transferencia: 12822.62,
    fondosComp: {
      previousDayRemaining: 114.00,
      generalCashTransfer: 4700.00,
      bossContribution: 0,
      initialBalance: 4814.00,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 12631.50,
      cardsBAC: 12691.50,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 12691.50,
      salesPedidosYa: 4700.00,
      otherIncome: 189.00,
      otherIncomeNotes: 'Otros ingresos lunes',
      totalGrossSales: 30212.00,
      tips: 2068.00,
      updatedAt: '2026-10-05T23:30:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 12631.50,
      expectedCashNIO: 12631.50,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 8357.15,
      closedBy: 'Eddy',
      closedAt: '2026-10-05T23:30:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 674.77,
      expectedBalance: 674.77,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-05T23:30:00.000Z',
    },
    fecha_cierre: '2026-10-05T23:30:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 4700.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 740.00, concepto: 'Quesos', prov: 'Quesillo', cat: 'LACTEOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery Quesos', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1022.62, concepto: 'CARNIC', prov: 'CARNIC', cat: 'CARNES', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 60.00, concepto: 'Delivery CARNIC', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1109.23, concepto: 'Hielo Olito', prov: 'Hielo Olito', cat: 'HIELO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 80.00, concepto: 'Pan y Paz', prov: 'Pan y Paz', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 1250.00, concepto: 'Camarones', prov: 'Camarones', cat: 'CARNES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Tortillas para almuerzo', prov: 'Tortillería', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 6073.00, concepto: 'Carnicería SM', prov: 'Carnicería SM', cat: 'CARNES', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Rapivoy Delivery Chelinas', prov: 'Rapivoy', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 5727.00, concepto: 'Dokar', prov: 'Dokar', cat: 'SUPERMERCADO', metodo: 'TRANSFER' },
      { tipo: 'EXPENSE', monto: 50.00, concepto: 'Delivery Carnicería S.M', prov: 'Delivery', cat: 'DELIVERYS_ACARREOS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 390.00, concepto: 'Compra de bolsas de basura', prov: 'Supermercado', cat: 'SUPERMERCADO', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 2825.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 2825.00, concepto: 'Pago de Fact. de Mercado 30/9/26', prov: 'Mercado', cat: 'MERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 300.00, concepto: 'Pago de día trabajado de Álvaro Ramírez', prov: 'Álvaro Ramírez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
    ],
  },

  // ────────────────────────────────────────────────────────────────
  // DÍA 6: MARTES 06/10/2026
  // ────────────────────────────────────────────────────────────────
  {
    fecha: '2026-10-06',
    fondo_inicial: 6676.00,
    total_gastos_efectivo: 11849.79,
    total_gastos_transferencia: 21226.00,
    fondosComp: {
      previousDayRemaining: 676.00,
      generalCashTransfer: 6000.00,
      bossContribution: 0,
      initialBalance: 6676.00,
      openedBy: 'Eddy',
    },
    ventasData: {
      salesCash: 13923.00,
      cardsBAC: 16908.66,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 16908.66,
      salesPedidosYa: 3080.00,
      otherIncome: 1999.50,
      otherIncomeNotes: 'Otros ingresos martes',
      totalGrossSales: 35911.16,
      tips: 1945.16,
      updatedAt: '2026-10-06T23:30:00.000Z',
    },
    closingAudit: {
      actualCashNIO: 13923.00,
      expectedCashNIO: 13923.00,
      differenceNIO: 0,
      auditStatus: 'SQUARED',
      dailyNetProfit: 890.21,
      closedBy: 'Eddy',
      closedAt: '2026-10-06T23:30:00.000Z',
    },
    pettyClosing: {
      actualCashCounted: 886.21,
      expectedBalance: 886.21,
      difference: 0,
      auditStatus: 'SQUARED',
      closedBy: 'Eddy',
      closedAt: '2026-10-06T23:30:00.000Z',
    },
    fecha_cierre: '2026-10-06T23:30:00.000Z',
    transacciones: [
      { tipo: 'INFLOW', monto: 6000.00, concepto: 'Depósito por ingresos / Apertura', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[OPENING_TRANSFER:TRUE] [TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 5043.79, concepto: 'Pago a Martha', prov: 'Martha Patricia Meléndez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 2500.00, concepto: 'Compra de Limones', prov: 'Mercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 130.00, concepto: 'Supermercado Lechugas', prov: 'Supermercado', cat: 'FRUTAS_VEGETALES', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 21226.00, concepto: 'Pago café soluble / Proveedor', prov: 'Café Soluble', cat: 'SUPERMERCADO', metodo: 'TRANSFER' },
      { tipo: 'INFLOW', monto: 2500.00, concepto: 'Préstamo Eddy para pago de Limones', prov: 'Eddy', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 90.00, concepto: 'Propina tarjeta Oscar', prov: 'Oscar Vásquez Omeany', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 190.00, concepto: 'Pago de extensión y bujía para cocina', prov: 'Ferretería', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'INFLOW', monto: 3560.00, concepto: 'Depósito a Caja', prov: 'Caja General', cat: 'FONDEO', metodo: 'EFECTIVO', obs: '[TIPO:FONDEO]' },
      { tipo: 'EXPENSE', monto: 3560.00, concepto: 'Pago de Fact. de Mercado 27/09/26', prov: 'Mercado', cat: 'MERCADO', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 36.00, concepto: 'Devolución de propina', prov: 'Cliente', cat: 'OTROS', metodo: 'EFECTIVO' },
      { tipo: 'EXPENSE', monto: 300.00, concepto: 'Día trabajado de Álvaro Ramírez', prov: 'Álvaro Ramírez', cat: 'PAGOS_PERSONAL', metodo: 'EFECTIVO' },
    ],
  },
];

async function runInjection() {
  console.log('🚀 Iniciando purga total e inyección limpia de Octubre (01 al 06)...');

  // 1. Vaciar compras_gastos y jornadas_diarias existentes
  console.log('🧹 Vaciando registros anteriores en Supabase...');
  const { error: errDelGastos } = await supabase.from('compras_gastos').delete().neq('id', 0);
  if (errDelGastos) {
    console.error('Error al limpiar compras_gastos:', errDelGastos.message);
  }
  const { error: errDelJornadas } = await supabase.from('jornadas_diarias').delete().neq('id', 0);
  if (errDelJornadas) {
    console.error('Error al limpiar jornadas_diarias:', errDelJornadas.message);
  }

  console.log('✅ Supabase limpio. Insertando jornadas...');

  for (const day of DAYS_DATA) {
    const obsTag = [
      `[FONDOS_COMPOSITION:${JSON.stringify(day.fondosComp)}]`,
      `[VENTAS_DATA:${JSON.stringify(day.ventasData)}]`,
      `[CLOSING_AUDIT:${JSON.stringify(day.closingAudit)}]`,
      `[PETTY_CLOSING:${JSON.stringify(day.pettyClosing)}]`,
      `Jornada ${day.fecha} cerrada oficialmente con liquidación completa.`
    ].join(' ');

    const { data: jornada, error: errJ } = await supabase
      .from('jornadas_diarias')
      .insert({
        fecha: day.fecha,
        turno: 'COMPLETO',
        estado: 'CERRADA',
        fondo_inicial: day.fondo_inicial,
        total_gastos_efectivo: day.total_gastos_efectivo,
        total_gastos_transferencia: day.total_gastos_transferencia,
        responsable: 'Eddy',
        observaciones: obsTag,
        fecha_cierre: day.fecha_cierre,
      })
      .select('id')
      .single();

    if (errJ || !jornada) {
      console.error(`❌ Error al insertar jornada ${day.fecha}:`, errJ?.message);
      continue;
    }

    const jornadaId = jornada.id;
    console.log(`📅 Jornada ${day.fecha} creada con ID #${jornadaId}`);

    // Insertar transacciones
    let hour = 8;
    for (const tx of day.transacciones) {
      const timeStr = `${day.fecha}T${String(hour).padStart(2, '0')}:00:00+00:00`;
      hour = (hour + 1) > 22 ? 22 : hour + 1;

      const { error: errTx } = await supabase.from('compras_gastos').insert({
        jornada_id: jornadaId,
        fecha_hora: timeStr,
        concepto: tx.concepto,
        categoria: tx.cat,
        proveedor: tx.prov,
        monto: tx.monto,
        metodo_pago: tx.metodo,
        estado_pago: tx.metodo === 'TRANSFER' ? 'PAGADO' : 'PAGADO',
        registrado_por: 'Eddy',
        observaciones: tx.obs || null,
      });

      if (errTx) {
        console.error(`  ⚠️ Error al insertar tx "${tx.concepto}":`, errTx.message);
      }
    }
    console.log(`  ✅ ${day.transacciones.length} transacciones insertadas para ${day.fecha}`);
  }

  console.log('\n🎉 ¡Inyección completa con éxito!');
}

runInjection().catch(console.error);
