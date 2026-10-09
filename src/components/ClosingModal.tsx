import React, { useState, useMemo } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD, AppState } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { CashDenominationsInput } from './CashDenominationsInput';
import { printThermalClosingTicket, printOfficialActBN } from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import { extractLocalDateStr } from '../utils/dateUtils';
import { processOutboxQueue } from '../services/supabaseSync';
import confetti from 'canvas-confetti';
import {
  X,
  Banknote,
  Users,
  Coins,
  Printer,
  FileSpreadsheet,
  CheckCheck,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Truck,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Scale,
  Clock,
  Info,
  UserCheck,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shift: CashShift | null;
  state: AppState;
  activeAdminName: string;
  availableAdmins: string[];
  onConfirmClose: (closedShift: CashShift) => void;
}

export const ClosingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shift,
  state,
  activeAdminName,
  availableAdmins,
  onConfirmClose,
}) => {
  if (!isOpen || !shift) return null;

  // 4 Pasos Profesionales de Cierre:
  // 1. Arqueo de Efectivo en Gaveta
  // 2. Canales de Venta (Datáfonos + Delivery + Sistema)
  // 3. Propinas
  // 4. Auditoría, Cuadre Real & Acta
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [closedBy, setClosedBy] = useState(activeAdminName);

  // 1. Conteo Físico de Billetes y Monedas
  const [closingNIO, setClosingNIO] = useState<DenominationsNIO>(DEFAULT_DENOMINATIONS_NIO);
  const [closingUSD, setClosingUSD] = useState<DenominationsUSD>(DEFAULT_DENOMINATIONS_USD);

  // 2. Ventas del Turno (Datáfonos, Delivery, Efectivo de Sistema)
  const [cardsBAC, setCardsBAC] = useState<number>(shift.cardsBAC || 0);
  const [cardsFicohsa, setCardsFicohsa] = useState<number>(shift.cardsFicohsa || 0);
  const [cardsBanpro, setCardsBanpro] = useState<number>(shift.cardsBanpro || 0);
  const [cardsLafise, setCardsLafise] = useState<number>(shift.cardsLafise || 0);
  const [salesPedidosYa, setSalesPedidosYa] = useState<number>(shift.salesPedidosYa || 0);
  const [salesCashSystem, setSalesCashSystem] = useState<number>(shift.salesCashSystem || 0);
  const [otherIncome, setOtherIncome] = useState<number>(shift.otherIncome || 0);
  const [otherIncomeNotes, setOtherIncomeNotes] = useState<string>(shift.otherIncomeNotes || '');

  // Traspasos entre Cajas (Loyverse POS: Pagos/Salidas & Depositado)
  const [transferToPettyCash, setTransferToPettyCash] = useState<number>(shift.transferToPettyCash || 0);
  const [depositedFromPettyCash, setDepositedFromPettyCash] = useState<number>(shift.depositedFromPettyCash || 0);

  // 3. Propinas de la noche (Línea 'Impuestos' en Loyverse POS)
  const [totalTipCollected, setTotalTipCollected] = useState<number>(shift.totalTipCollected || 0);
  const [staffCount, setStaffCount] = useState<number>(shift.staffCount || 10);
  const [tipPaid, setTipPaid] = useState<boolean>(shift.tipPaid !== undefined ? shift.tipPaid : true);
  const [tipNotes, setTipNotes] = useState<string>(shift.tipNotes || '');
  const [tipYahairaWorked, setTipYahairaWorked] = useState<boolean>(
    shift.tipYahairaWorked !== undefined ? shift.tipYahairaWorked : true
  );
  const [tipYahairaAmount, setTipYahairaAmount] = useState<number>(
    shift.tipYahairaAmount !== undefined ? shift.tipYahairaAmount : 100
  );
  // Redondeo opcional a billetes de C$ 10 (Regla del Bodegón: <= 5 baja, >= 6 sube)
  const [tipIsRounded, setTipIsRounded] = useState<boolean>(
    shift.tipIsRounded !== undefined ? shift.tipIsRounded : false
  );
  const [manualIndividualTip, setManualIndividualTip] = useState<number | null>(
    shift.individualTip !== undefined && shift.tipIsRounded ? shift.individualTip : null
  );

  // 4. Observaciones
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Cálculos reactivos de Efectivo en Gaveta (100% Córdobas en gaveta física)
  const totalClosingNIO = calculateTotalNIO(closingNIO);
  const totalClosingUSD = calculateTotalUSD(closingUSD); // Dólares informativos que se entregan a Snyder
  const actualCashNIO = parseFloat(totalClosingNIO.toFixed(2)); // Total contado en gaveta

  // Cálculos de Ventas
  const totalCards = cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;
  const totalGrossSales = salesCashSystem + totalCards + salesPedidosYa + otherIncome;

  // Cálculos de Propinas (Acuerdo Laboral: Cuota Yahaira Rivas + Fondo Común Equipo)
  const actualYahairaTip = tipYahairaWorked ? Math.min(totalTipCollected, Math.max(0, tipYahairaAmount)) : 0;
  const tipTeamPool = parseFloat(Math.max(0, totalTipCollected - actualYahairaTip).toFixed(2));
  const rawIndividualTip = staffCount > 0 ? parseFloat((tipTeamPool / staffCount).toFixed(2)) : 0;

  // Regla del Bodegón: <= 5 baja a la decena anterior, >= 6 sube a la siguiente
  const calculateBodegonRound = (amt: number): number => {
    if (amt <= 0) return 0;
    const intVal = Math.floor(amt);
    const lastDigit = intVal % 10;
    return lastDigit <= 5 ? Math.floor(intVal / 10) * 10 : Math.ceil(intVal / 10) * 10;
  };
  const roundedCalculatedTip = calculateBodegonRound(rawIndividualTip);

  // Cuota individual efectiva
  const individualTip = manualIndividualTip !== null
    ? manualIndividualTip
    : tipIsRounded
    ? roundedCalculatedTip
    : rawIndividualTip;

  // Total Real de Propina a Distribuir en Mano (lo que físicamente se entrega al personal)
  const tipDistributedTotal = parseFloat(
    (actualYahairaTip + (staffCount * individualTip)).toFixed(2)
  );

  // Diferencia de ajuste por redondeo (propina recaudada en POS vs entregada real)
  const tipRoundingDiff = parseFloat((totalTipCollected - tipDistributedTotal).toFixed(2));

  // La propina que de verdad se declara y sale de la gaveta es la resultante del reparto real
  const tipsPaidAmount = tipPaid ? tipDistributedTotal : 0;

  // EFECTIVO NETO EN GAVETA TRAS RESTAR PROPINAS:
  // Al total contado en córdobas en caja general se le resta lo que se entrega en propina
  const netCashAfterTipsNIO = parseFloat(Math.max(0, actualCashNIO - tipsPaidAmount).toFixed(2));
  const totalClosingEquivNIO = netCashAfterTipsNIO; // Lo que realmente amanece en gaveta para la apertura

  // CÁLCULO REAL DE AUDITORÍA Y CUADRE DE CAJA (Idéntico a Loyverse POS)
  // Fondo Inicial de Gaveta (en Córdobas) + Ventas Efectivo POS - Propinas entregadas de gaveta
  const openingFloat = shift.totalOpeningNIO || shift.totalOpeningEquivNIO || 0;
  const expectedCashNIO = parseFloat(
    (openingFloat + salesCashSystem - tipsPaidAmount).toFixed(2)
  );
  const differenceNIO = parseFloat((netCashAfterTipsNIO - expectedCashNIO).toFixed(2));

  let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = 'SQUARED';
  if (Math.abs(differenceNIO) < 1.0) {
    auditStatus = 'SQUARED';
  } else if (differenceNIO > 0) {
    auditStatus = 'SURPLUS';
  } else {
    auditStatus = 'SHORTAGE';
  }

  // Gastos de Caja Chica del Día para ver la ganancia neta real
  const dayPettyExpensesCash = useMemo(() => {
    return (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === shift.date && (t.method === 'CASH' || !t.method))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [state.pettyCashTransactions, shift.date]);

  const dayPettyExpensesTransf = useMemo(() => {
    return (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === shift.date && (t.method === 'TRANSFER' || t.method === 'CARD'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [state.pettyCashTransactions, shift.date]);

  const dayPettyExpenses = dayPettyExpensesCash + dayPettyExpensesTransf;

  const dayTransactions = useMemo(() => {
    return (state.pettyCashTransactions || [])
      .filter((t) => extractLocalDateStr(t.date) === shift.date)
      .map((t) => ({
        id: t.id,
        hora: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        categoria: t.category,
        concepto: t.vendor + (t.notes ? ` - ${t.notes}` : ''),
        proveedor: t.vendor,
        metodo: t.method === 'CASH' ? 'Efectivo' : t.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
        monto: t.amount,
        tipo: t.type === 'INFLOW' ? ('INGRESO' as const) : ('GASTO' as const),
      }));
  }, [state.pettyCashTransactions, shift.date]);

  const pendingPettyTransactions = useMemo(() => {
    return (state.pettyCashTransactions || []).filter(
      (t) => !t.cloudId && !t.id.startsWith('pct-cloud-')
    );
  }, [state.pettyCashTransactions]);

  const isPettyCashOpen = state.currentPettyCashShift?.status === 'OPEN';

  // Rendimiento Financiero Consolidado (Idéntico a Excel: Total Ingresos - Compras Insumos - Propinas Entregadas)
  const dailyNetProfit = parseFloat((totalGrossSales - dayPettyExpenses - tipsPaidAmount).toFixed(2));

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleFinishClosing = () => {
    if (actualCashNIO <= 0) {
      const confirmZero = window.confirm(
        'El arqueo de efectivo en gaveta está en C$ 0.00.\n\n¿Estás seguro de cerrar la caja sin registrar billetes ni monedas?'
      );
      if (!confirmZero) return;
    }

    if (totalGrossSales <= 0) {
      const confirmNoSales = window.confirm(
        'Atención: No se registraron ventas en el turno (Efectivo, Tarjetas y PedidosYa están en C$ 0.00).\n\n¿Deseas continuar con el cierre?'
      );
      if (!confirmNoSales) return;
    }

    if (pendingPettyTransactions.length > 0) {
      processOutboxQueue(state.pettyCashTransactions).catch((err) => {
        console.warn('Advertencia al sincronizar cola outbox al cerrar:', err);
      });
    }

    const closedShift: CashShift = {
      ...shift,
      status: 'CLOSED',
      closedBy,
      closedAt: new Date().toISOString(),
      closingNIO,
      closingUSD,
      totalClosingNIO,
      totalClosingUSD,
      totalClosingEquivNIO,
      netCashAfterTipsNIO,

      // Ventas Reales del Turno
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      salesCashSystem,
      otherIncome,
      otherIncomeNotes,
      totalGrossSales,

      // Propinas
      totalTipCollected,
      staffCount,
      individualTip,
      tipPaid,
      tipNotes,
      tipYahairaWorked,
      tipYahairaAmount: actualYahairaTip,
      tipTeamPool,
      tipIsRounded,
      tipDistributedTotal,
      tipRoundingDiff,

      // Auditoría Real
      actualCashNIO,
      expectedCashNIO,
      differenceNIO,
      auditStatus,
      dailyNetProfit,
      closingNotes,

      // Traspasos entre Cajas
      transferToPettyCash,
      depositedFromPettyCash,
      overtimePaidCash: 0,
      extraDaysPaidCash: 0,
      reserveDGI: 0,
      reservePayroll: 0,
      reserveVacations: 0,
      reserveSnyder: 0,
      totalWithdrawals: transferToPettyCash + tipsPaidAmount,
    };

    onConfirmClose(closedShift);

    // 🖨️ Mandar obligatoriamente a imprimir el Acta Oficial Completa de Cierre del Día (2 Hojas B/N: General + Chica)
    printOfficialActBN({
      shift: closedShift,
      date: shift.date,
      modo: 'TODO',
      salesCash: salesCashSystem,
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      totalGross: totalGrossSales,
      netProfit: dailyNetProfit,
      marginPercent: totalGrossSales > 0 ? (dailyNetProfit / totalGrossSales) * 100 : 0,
      responsableCaja: closedBy,
      observacionesGeneral: closingNotes,
      fondoInicial: state.currentPettyCashShift?.initialBalance ?? 2000,
      expensesCash: dayPettyExpensesCash,
      expensesTransf: dayPettyExpensesTransf,
      expensesTotal: dayPettyExpenses,
      saldoRemanente: state.pettyCashBalance,
      responsableCajaChica: state.currentPettyCashShift?.openedBy || closedBy,
      transactions: dayTransactions,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
              <h2 className="text-base font-bold text-slate-900">Cierre Oficial de Caja General</h2>
            </div>
            <p className="text-xs text-slate-500">
              Jornada del <strong>{shift.date}</strong> • Apertura por {shift.openedBy} con C$ {shift.totalOpeningEquivNIO.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Cerrado por:</span>
              <select
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableAdmins.map((adm) => (
                  <option key={adm} value={adm}>
                    {adm}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper de 4 Pasos Claros */}
        <div className="grid grid-cols-4 border-b border-slate-200 text-xs font-bold bg-white divide-x divide-slate-100">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 1
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Banknote className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">1. Arqueo Gaveta</span>
            <span className="sm:hidden">1. Efectivo</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 2
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">2. Ventas & Tarjetas</span>
            <span className="sm:hidden">2. Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 3
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">3. Propinas</span>
            <span className="sm:hidden">3. Tips</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStep(4);
              triggerCelebration();
            }}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 4
                ? 'border-[#1c6856] text-[#1c6856] bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">4. Cuadre & Acta</span>
            <span className="sm:hidden">4. Cuadre</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/40">
          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 1: ARQUEO DE EFECTIVO EN GAVETA ───────────────────────── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 flex-wrap gap-3">
                <span className="text-xs text-slate-700 font-bold">
                  Administrador / Cajero que realiza el Cierre:
                </span>
                <div className="flex gap-2">
                  <select
                    value={closedBy}
                    onChange={(e) => setClosedBy(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:bg-white focus:outline-none focus:border-[#1c6856]"
                  >
                    {availableAdmins.map((adm) => (
                      <option key={adm} value={adm}>
                        {adm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-[#1c6856]" />
                    <span>Arqueo Físico de Gaveta al Cierre (Efectivo Contado)</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Tasa de cambio: <strong className="font-mono text-slate-900">C$ {shift.exchangeRate.toFixed(2)}</strong>
                  </span>
                </div>
                <CashDenominationsInput
                  denominationsNIO={closingNIO}
                  denominationsUSD={closingUSD}
                  exchangeRate={shift.exchangeRate}
                  onChangeNIO={setClosingNIO}
                  onChangeUSD={setClosingUSD}
                />
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Efectivo Físico Contado en Gaveta:</span>
                  <div className="text-2xl font-bold font-mono text-[#1c6856]">
                    C$ {actualCashNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
                >
                  <span>Continuar a Ventas</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 2: VENTAS DEL TURNO (DATÁFONOS, PEDIDOSYA, EFECTIVO) ──── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Tarjetas POS por Banco */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      <CreditCard className="w-4 h-4 text-[#1c6856]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        1. Cierres de Lote de Tarjetas POS (Datáfonos)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ingresa el monto total de los vouchers emitidos por cada datáfono esta noche.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal Tarjetas</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      C$ {totalCards.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* BAC */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      BAC Credomatic (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBAC === 0 ? '' : cardsBAC}
                        onChange={(e) => setCardsBAC(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                  </div>

                  {/* Ficohsa */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Banco Ficohsa (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsFicohsa === 0 ? '' : cardsFicohsa}
                        onChange={(e) => setCardsFicohsa(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                  </div>

                  {/* Banpro */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Banpro Grupo Promerica (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBanpro === 0 ? '' : cardsBanpro}
                        onChange={(e) => setCardsBanpro(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                  </div>

                  {/* Lafise */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                      Banco LAFISE Bancentro (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsLafise === 0 ? '' : cardsLafise}
                        onChange={(e) => setCardsLafise(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#1c6856]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery PedidosYa, Ventas Efectivo Sistema & Otros Ingresos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* PedidosYa */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      2. Delivery PedidosYa (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total vendido en la aplicación.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesPedidosYa === 0 ? '' : salesPedidosYa}
                      onChange={(e) => setSalesPedidosYa(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>
                </div>

                {/* Ventas en Efectivo del Sistema POS */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#1c6856]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      3. Ventas en Efectivo (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Total según sistema (Loyverse).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesCashSystem === 0 ? '' : salesCashSystem}
                      onChange={(e) => setSalesCashSystem(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-emerald-800 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>
                </div>

                {/* Otros Ingresos */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-slate-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      4. Otros Ingresos (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ingresos adicionales no estándar.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={otherIncome === 0 ? '' : otherIncome}
                      onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Concepto / Detalle (opcional)"
                    value={otherIncomeNotes}
                    onChange={(e) => setOtherIncomeNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-[#1c6856] mt-1"
                  />
                </div>
              </div>

              {/* Total Bruto Consolidado */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Ventas Brutas del Turno (Efectivo + Tarjetas + Delivery + Otros Ing.)
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    C$ {totalGrossSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
                >
                  <span>Continuar a Propinas</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 3: PROPINAS DE LA NOCHE ───────────────────────────────── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#1c6856]" /> Reparto de Propinas del Turno
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calcula la propina total del turno y la cuota individual para el personal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Total de Propina Recaudada (Línea 'Impuestos' en Loyverse POS) (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalTipCollected === 0 ? '' : totalTipCollected}
                      placeholder="0.00"
                      onChange={(e) => setTotalTipCollected(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-lg font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Personal para Reparto Común (sin Yahaira)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={staffCount}
                      onChange={(e) => setStaffCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-lg font-bold font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                    />
                  </div>
                </div>

                {/* ── APARTADO ESPECIAL: ACUERDO LABORAL YAHAIRA RIVAS ── */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-100 text-[#1c6856] rounded-lg">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">
                          Acuerdo Especial: Propina Yahaira Rivas
                        </span>
                        <span className="text-[11px] text-emerald-800">
                          Cuota fija acordada por el equipo si laboró en la jornada
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={tipYahairaWorked}
                        onChange={(e) => setTipYahairaWorked(e.target.checked)}
                        className="w-4 h-4 text-[#1c6856] rounded border-emerald-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {tipYahairaWorked ? '✓ Asistió a Trabajar' : '✗ No Asistió'}
                      </span>
                    </label>
                  </div>

                  {tipYahairaWorked ? (
                    <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-emerald-200/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium text-[11px]">Monto Fijo para Yahaira:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-500 text-xs">C$</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={tipYahairaAmount}
                            onChange={(e) => setTipYahairaAmount(parseFloat(e.target.value) || 0)}
                            className="w-20 bg-white border border-emerald-300 rounded px-2 py-0.5 font-mono font-bold text-emerald-900 text-xs text-right focus:outline-none focus:border-[#1c6856]"
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-900 font-semibold">
                        Descuento aplicado: C$ {totalTipCollected.toFixed(2)} - C$ {actualYahairaTip.toFixed(2)} = <strong>C$ {tipTeamPool.toFixed(2)} restantes</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-slate-600 border-t border-emerald-200/80">
                      Yahaira no laboró en el turno. El 100% de la propina recaudada (C$ {totalTipCollected.toFixed(2)}) se distribuye entre los {staffCount} compañeros de equipo.
                    </div>
                  )}
                </div>

                {/* Tarjeta de Resumen y Reparto Automático */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3.5">
                  {/* Barra de Herramienta de Redondeo (Evitar Monedas) */}
                  <div className="flex items-center justify-between flex-wrap gap-2.5 p-2.5 bg-white rounded-lg border border-amber-300 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-100 text-amber-800 rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Redondeo a Billetes de C$ 10 (Sin Monedas)
                        </span>
                        <span className="text-[10.5px] text-slate-500">
                          Regla Bodegón: terminación ≤ 5 baja (ej: 235 ➔ 230), ≥ 6 sube (ej: 236 ➔ 240)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!tipIsRounded && manualIndividualTip === null ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTipIsRounded(true);
                            setManualIndividualTip(null);
                          }}
                          className="px-3 py-1.5 bg-[#1c6856] hover:bg-[#154f42] text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Aplicar Redondeo Automático</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] border border-emerald-300">
                            ✓ Redondeo Activo (C$ {individualTip.toFixed(2)})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTipIsRounded(false);
                              setManualIndividualTip(null);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-slate-300"
                            title="Volver al cálculo exacto con centavos"
                          >
                            <RotateCcw className="w-3 h-3 text-slate-500" />
                            <span>Quitar Redondeo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid de Desglose de Reparto */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-amber-200/80 pb-3">
                    {tipYahairaWorked && (
                      <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          Cuota Yahaira Rivas
                        </span>
                        <div className="text-lg font-bold text-emerald-900 font-mono">
                          C$ {actualYahairaTip.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Monto fijo por acuerdo
                        </span>
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                        Fondo Restante Equipo
                      </span>
                      <div className="text-lg font-bold text-amber-900 font-mono">
                        C$ {tipTeamPool.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        A repartir entre {staffCount} personas
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-amber-200 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                          Cuota por Colaborador
                        </span>
                        {tipIsRounded && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                            Billetes
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono font-bold text-slate-400">C$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={individualTip}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setManualIndividualTip(val);
                            setTipIsRounded(true);
                          }}
                          className="w-24 font-bold text-lg text-amber-950 font-mono bg-amber-50/50 border border-amber-300 rounded px-1.5 py-0.5 focus:bg-white focus:outline-none focus:border-[#1c6856]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {tipIsRounded
                          ? `(Exacto era C$ ${rawIndividualTip.toFixed(2)})`
                          : `C$ ${tipTeamPool.toFixed(2)} ÷ ${staffCount} pers.`}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Final de Declaración y Gaveta */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
                    <div className="space-y-0.5">
                      <div className="text-slate-700">
                        <span>Total Real a Entregar de Gaveta: </span>
                        <strong className="font-mono text-slate-900 text-sm">
                          C$ {tipDistributedTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      {tipIsRounded && (
                        <div className="text-[11px] font-medium">
                          {tipRoundingDiff > 0 ? (
                            <span className="text-emerald-700">
                              + C$ {tipRoundingDiff.toFixed(2)} quedan en gaveta física (remanente de monedas no entregadas).
                            </span>
                          ) : tipRoundingDiff < 0 ? (
                            <span className="text-blue-700">
                              - C$ {Math.abs(tipRoundingDiff).toFixed(2)} se completaron de gaveta para redondear billetes.
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              El reparto coincide exactamente al centavo.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={tipPaid}
                        onChange={(e) => setTipPaid(e.target.checked)}
                        className="w-4 h-4 text-[#1c6856] rounded border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        ¿Se entregó en efectivo de la gaveta esta noche?
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombres del personal / Observaciones de propina
                  </label>
                  <input
                    type="text"
                    value={tipNotes}
                    onChange={(e) => setTipNotes(e.target.value)}
                    placeholder="Ej: Melvin, Nelly, Uriel, Sandor, Oscar..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-[#1c6856]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 4: AUDITORÍA, CUADRE REAL Y ACTA OFICIAL ──────────────── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Tarjeta de Diagnóstico de Cuadre */}
              <div
                className={`p-5 rounded-xl border text-center space-y-1.5 ${
                  auditStatus === 'SQUARED'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : auditStatus === 'SURPLUS'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                    : 'bg-rose-50/80 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {auditStatus === 'SQUARED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : auditStatus === 'SURPLUS' ? (
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  )}
                  <span className="text-xl font-bold">
                    {auditStatus === 'SQUARED'
                      ? 'CAJA CUADRADA EXACTA'
                      : auditStatus === 'SURPLUS'
                      ? 'SOBRANTE EN GAVETA'
                      : 'FALTANTE EN GAVETA'}
                  </span>
                </div>

                <div className="text-xs font-medium">
                  {auditStatus === 'SQUARED' && 'El efectivo físico coincide exactamente con las ventas y el fondo de apertura.'}
                  {auditStatus === 'SURPLUS' && `Hay un sobrante de + C$ ${differenceNIO.toFixed(2)} sobre lo esperado.`}
                  {auditStatus === 'SHORTAGE' && `Hay un faltante de - C$ ${Math.abs(differenceNIO).toFixed(2)} respecto al efectivo esperado.`}
                </div>
              </div>

              {/* Banners Informativos de Integridad Caja Chica / Sincronización */}
              {pendingPettyTransactions.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <strong className="block font-bold text-amber-900">
                        {pendingPettyTransactions.length} movimiento(s) de Caja Chica pendientes en esta PC
                      </strong>
                      <span className="text-[11px] text-amber-800">
                        Al confirmar el cierre, el sistema los enviará automáticamente a Supabase para mantener la web cuadrada.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200/80 font-mono font-bold text-amber-900 text-[10px]">
                    Auto-Sync
                  </span>
                </div>
              )}

              {isPettyCashOpen && (
                <div className="p-3 bg-sky-50 border border-sky-300 rounded-lg flex items-center justify-between text-xs text-sky-950">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-sky-700 shrink-0" />
                    <div>
                      <strong className="block font-bold text-sky-900">
                        Caja Chica permanece abierta
                      </strong>
                      <span className="text-[11px] text-sky-800">
                        Asegúrate de haber registrado todos los vales, compras y fondeos del día antes de archivar este cierre.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 font-bold text-sky-800 text-[10px]">
                    Turno Abierto
                  </span>
                </div>
              )}

              {/* Conciliación Matemática Transparente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Caja / Arqueo de Gaveta (Idéntico a Loyverse POS) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>1. Conciliación de Efectivo (Loyverse)</span>
                    <Banknote className="w-4 h-4 text-[#1c6856]" />
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>(+) Fondo Inicial de Apertura:</span>
                      <strong className="font-mono text-slate-900">C$ {openingFloat.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>(+) Cobros en Efectivo (Loyverse):</span>
                      <strong className="font-mono text-emerald-700">+ C$ {salesCashSystem.toFixed(2)}</strong>
                    </div>
                    {depositedFromPettyCash > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(+) Depositado desde Caja Chica:</span>
                        <strong className="font-mono text-emerald-700">+ C$ {depositedFromPettyCash.toFixed(2)}</strong>
                      </div>
                    )}
                    {tipsPaidAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Propinas Pagadas en Efectivo:</span>
                        <strong className="font-mono text-rose-600">- C$ {tipsPaidAmount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                      <span>(=) Efectivo Teórico que debe haber:</span>
                      <strong className="font-mono text-slate-900">C$ {expectedCashNIO.toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between text-xs text-slate-700">
                        <span>Total Contado en Gaveta:</span>
                        <strong className="font-mono text-slate-900">C$ {actualCashNIO.toFixed(2)}</strong>
                      </div>
                      {tipsPaidAmount > 0 && (
                        <div className="flex justify-between text-xs text-rose-600">
                          <span>(-) Menos Propinas a Entregar:</span>
                          <strong className="font-mono">- C$ {tipsPaidAmount.toFixed(2)}</strong>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm text-[#1c6856] border-t border-slate-200 pt-1">
                        <span>(=) Efectivo Físico Neto en Gaveta:</span>
                        <strong className="font-mono">C$ {netCashAfterTipsNIO.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>Diferencia de Cuadre:</span>
                      <span
                        className={`font-mono font-bold ${
                          differenceNIO === 0
                            ? 'text-emerald-600'
                            : differenceNIO > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {differenceNIO > 0 ? `+ C$ ${differenceNIO.toFixed(2)} (SOBRANTE)` : differenceNIO < 0 ? `- C$ ${Math.abs(differenceNIO).toFixed(2)} (FALTANTE)` : 'C$ 0.00 (EXACTO)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rendimiento Financiero del Turno (Idéntico a Excel) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>2. Estado Financiero Consolidado (Excel)</span>
                    <TrendingUp className="w-4 h-4 text-slate-700" />
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Ventas Efectivo:</span>
                      <span className="font-mono">C$ {salesCashSystem.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Ventas Tarjetas (BAC/Fic/Ban/Laf):</span>
                      <span className="font-mono">C$ {totalCards.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Ventas Delivery PedidosYa:</span>
                      <span className="font-mono">C$ {salesPedidosYa.toFixed(2)}</span>
                    </div>
                    {otherIncome > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Otros Ingresos:</span>
                        <span className="font-mono text-cyan-700 font-bold">+ C$ {otherIncome.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                      <span>Total Ingresos Facturados:</span>
                      <strong className="font-mono text-slate-900 text-sm">C$ {totalGrossSales.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>(-) Compras / Caja Chica (Pag. Efect.):</span>
                      <span className="font-mono text-rose-600">- C$ {dayPettyExpenses.toFixed(2)}</span>
                    </div>
                    {tipsPaidAmount > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>(-) Propinas Pagadas al Personal:</span>
                        <span className="font-mono text-rose-600">- C$ {tipsPaidAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 flex justify-between font-bold text-sm text-emerald-950">
                      <span>Total Neto / Utilidad Operativa:</span>
                      <strong className="font-mono text-emerald-800">C$ {dailyNetProfit.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saldo que queda en gaveta para apertura siguiente */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-amber-800">
                    Fondo Neto que queda en Gaveta para amanecer (Total Córdobas):
                  </span>
                  <div className="text-xl font-bold font-mono text-amber-900 mt-0.5">
                    C$ {netCashAfterTipsNIO.toFixed(2)}
                  </div>
                  {tipsPaidAmount > 0 && (
                    <div className="text-[11px] text-amber-900 font-medium mt-0.5">
                      (Conteo inicial C$ {actualCashNIO.toFixed(2)} menos C$ {tipsPaidAmount.toFixed(2)} entregados en propina)
                    </div>
                  )}
                  {totalClosingUSD > 0 && (
                    <div className="text-[11px] font-bold text-amber-800 mt-1 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 inline text-amber-800" />
                      <span>Moneda Extranjera: ${totalClosingUSD.toFixed(2)} USD (Apartados para Snyder • Quedan $0.00 en caja)</span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 max-w-xs text-right">
                  Fondo efectivo neto real que queda en caja general para la siguiente apertura.
                </span>
              </div>

              {/* Observaciones de Cierre */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Observaciones de Cierre (para la gerencia)
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ej: Se dejó C$ 922 + $180 en gaveta. Cierres de lote de datáfonos sin discrepancias..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              {/* Botones de Reimpresión y Exportación Rápida */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const previewShift: CashShift = {
                      ...shift,
                      closedBy,
                      closedAt: new Date().toISOString(),
                      closingNIO,
                      closingUSD,
                      totalClosingNIO,
                      totalClosingUSD,
                      totalClosingEquivNIO,
                      cardsBAC,
                      cardsFicohsa,
                      cardsBanpro,
                      cardsLafise,
                      totalCards,
                      salesPedidosYa,
                      salesCashSystem,
                      otherIncome,
                      otherIncomeNotes,
                      totalGrossSales,
                      totalTipCollected,
                      staffCount,
                      individualTip,
                      tipPaid,
                      tipNotes,
                      tipYahairaWorked,
                      tipYahairaAmount: actualYahairaTip,
                      tipTeamPool,
                      tipIsRounded,
                      tipDistributedTotal,
                      tipRoundingDiff,
                      transferToPettyCash,
                      depositedFromPettyCash,
                      totalWithdrawals: transferToPettyCash + tipsPaidAmount,
                      actualCashNIO,
                      expectedCashNIO,
                      differenceNIO,
                      auditStatus,
                      dailyNetProfit,
                      closingNotes,
                    };
                    printThermalClosingTicket(previewShift);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Ticket Cierre General A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const previewShift: CashShift = {
                      ...shift,
                      closedBy,
                      closedAt: new Date().toISOString(),
                      closingNIO,
                      closingUSD,
                      totalClosingNIO,
                      totalClosingUSD,
                      totalClosingEquivNIO,
                      cardsBAC,
                      cardsFicohsa,
                      cardsBanpro,
                      cardsLafise,
                      totalCards,
                      salesPedidosYa,
                      salesCashSystem,
                      otherIncome,
                      otherIncomeNotes,
                      totalGrossSales,
                      totalTipCollected,
                      staffCount,
                      individualTip,
                      tipPaid,
                      tipNotes,
                      tipYahairaWorked,
                      tipYahairaAmount: actualYahairaTip,
                      tipTeamPool,
                      tipIsRounded,
                      tipDistributedTotal,
                      tipRoundingDiff,
                      transferToPettyCash,
                      depositedFromPettyCash,
                      totalWithdrawals: transferToPettyCash + tipsPaidAmount,
                      actualCashNIO,
                      expectedCashNIO,
                      differenceNIO,
                      auditStatus,
                      dailyNetProfit,
                      closingNotes,
                    };
                    const dayTransactions = (state.pettyCashTransactions || [])
                      .filter((t) => extractLocalDateStr(t.date) === shift.date)
                      .map((t) => ({
                        id: t.id,
                        hora: new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        categoria: t.category,
                        concepto: t.vendor + (t.notes ? ` - ${t.notes}` : ''),
                        proveedor: t.vendor,
                        metodo: t.method === 'CASH' ? 'Efectivo' : t.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
                        monto: t.amount,
                        tipo: t.type === 'INFLOW' ? ('INGRESO' as const) : ('GASTO' as const),
                      }));
                    printOfficialActBN({
                      shift: previewShift,
                      date: shift.date,
                      modo: 'TODO',
                      salesCash: salesCashSystem,
                      cardsBAC,
                      cardsFicohsa,
                      cardsBanpro,
                      cardsLafise,
                      totalCards,
                      salesPedidosYa,
                      totalGross: totalGrossSales,
                      netProfit: dailyNetProfit,
                      marginPercent: totalGrossSales > 0 ? (dailyNetProfit / totalGrossSales) * 100 : 0,
                      responsableCaja: closedBy,
                      observacionesGeneral: closingNotes,
                      fondoInicial: shift.totalOpeningEquivNIO,
                      expensesCash: dayPettyExpenses,
                      expensesTransf: 0,
                      expensesTotal: dayPettyExpenses,
                      saldoRemanente: actualCashNIO,
                      responsableCajaChica: closedBy,
                      transactions: dayTransactions,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imprimir Acta Oficial B/N</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const previewShift: CashShift = {
                      ...shift,
                      closedBy,
                      closedAt: new Date().toISOString(),
                      closingNIO,
                      closingUSD,
                      totalClosingNIO,
                      totalClosingUSD,
                      totalClosingEquivNIO,
                      cardsBAC,
                      cardsFicohsa,
                      cardsBanpro,
                      cardsLafise,
                      totalCards,
                      salesPedidosYa,
                      salesCashSystem,
                      otherIncome,
                      otherIncomeNotes,
                      totalGrossSales,
                      totalTipCollected,
                      staffCount,
                      individualTip,
                      tipPaid,
                      tipNotes,
                      tipYahairaWorked,
                      tipYahairaAmount: actualYahairaTip,
                      tipTeamPool,
                      tipIsRounded,
                      tipDistributedTotal,
                      tipRoundingDiff,
                      actualCashNIO,
                      expectedCashNIO,
                      differenceNIO,
                      auditStatus,
                      dailyNetProfit,
                      closingNotes,
                    };
                    exportShiftToExcel(previewShift, state);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Exportar a Excel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Navegación de 4 Pasos */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Paso Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex gap-2.5">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) triggerCelebration();
                  setStep((s) => (s + 1) as any);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishClosing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-rose-200" />
                <span>Finalizar Cierre e Imprimir Acta Oficial Completa (2 Hojas)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
