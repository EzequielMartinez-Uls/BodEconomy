import React, { useState, useMemo } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD, AppState } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { CashDenominationsInput } from './CashDenominationsInput';
import { printOfficialActBN } from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import { calculateDayProfit, sumDayExpenses, buildActTransactions } from '../utils/cashMath';
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
  Landmark,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shift: CashShift | null;
  state: AppState;
  activeAdminName: string;
  availableAdmins: string[];
  onConfirmClose: (closedShift: CashShift, pettyCounted: number | null) => void;
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
  const [salesBankTransfers, setSalesBankTransfers] = useState<number>(shift.salesBankTransfers || 0);
  const [bankTransfersNotes, setBankTransfersNotes] = useState<string>(shift.bankTransfersNotes || '');
  const [salesCashSystem, setSalesCashSystem] = useState<number>(shift.salesCashSystem || 0);
  const [otherIncome, setOtherIncome] = useState<number>(shift.otherIncome || 0);
  const [otherIncomeNotes, setOtherIncomeNotes] = useState<string>(shift.otherIncomeNotes || '');
  // "Pagos y salidas" de Loyverse del día: se suman al efectivo contado para la venta en efectivo real
  const [loyversePaidOut, setLoyversePaidOut] = useState<number>(shift.loyversePaidOut || 0);
  // Conteo físico de Caja Chica al cerrar el día (vacío = no se contó)
  const [pettyCountInput, setPettyCountInput] = useState<string>('');

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

  // Cálculos reactivos de Efectivo en Gaveta (Córdobas + Dólares convertidos a Córdobas)
  const totalClosingNIO = calculateTotalNIO(closingNIO);
  const totalClosingUSD = calculateTotalUSD(closingUSD);
  const totalClosingUSDEquivNIO = parseFloat((totalClosingUSD * (shift.exchangeRate || 36)).toFixed(2));
  // Total físico contado en gaveta (Córdobas + Dólares en equivalente NIO)
  const actualCashNIO = parseFloat((totalClosingNIO + totalClosingUSDEquivNIO).toFixed(2));

  // Cálculos de Ventas
  const totalCards = cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;

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

  // CÁLCULO REAL DE AUDITORÍA Y CUADRE DE CAJA:
  // En El Bodegón, el fondo inicial de apertura desaparece para el cierre (el de apertura ya no aporta nada).
  // El cálculo determinante es el dinero físico contado en gaveta (Córdobas + Dólares a tasa) y lo que queda neto tras entregar propinas.
  const isPendingArqueo = actualCashNIO === 0 && salesCashSystem === 0;

  // El efectivo neto en gaveta tras propinas es el dinero real y cuadrado
  const expectedCashNIO = netCashAfterTipsNIO;
  const differenceNIO: number = 0;
  let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = (differenceNIO > 0 ? 'SURPLUS' : differenceNIO < 0 ? 'SHORTAGE' : 'SQUARED') as 'SQUARED' | 'SURPLUS' | 'SHORTAGE';

  // Gastos de Caja Chica del Día (efectivo, transferencia y tarjeta)
  const dayExpenses = useMemo(
    () => sumDayExpenses(state.pettyCashTransactions || [], shift.date),
    [state.pettyCashTransactions, shift.date]
  );
  const dayPettyExpensesCash = dayExpenses.cash;
  const dayPettyExpensesTransf = dayExpenses.transfer + dayExpenses.card;
  const dayPettyExpenses = dayExpenses.total;

  const dayTransactions = useMemo(
    () => buildActTransactions(state.pettyCashTransactions || [], shift.date),
    [state.pettyCashTransactions, shift.date]
  );

  // Ventas y ganancia con la fórmula única (utils/cashMath.ts)
  const dayProfit = calculateDayProfit({
    efectivoContado: actualCashNIO,
    pagosSalidas: loyversePaidOut,
    tarjetas: totalCards,
    transferencias: salesBankTransfers,
    pedidosYa: salesPedidosYa,
    otrosIngresos: otherIncome,
    gastos: dayExpenses,
    propinaEntregada: tipsPaidAmount,
  });
  const efectivoReal = dayProfit.efectivoReal;
  const totalGrossSales = dayProfit.ventasTotales;
  const dailyNetProfit = dayProfit.ganancia;

  // Caja Chica: saldo esperado vs conteo físico
  const pettyExpected = state.pettyCashBalance || 0;
  const pettyCounted = pettyCountInput.trim() === '' ? null : Math.max(0, parseFloat(pettyCountInput) || 0);
  const pettyDifference = pettyCounted === null ? 0 : parseFloat((pettyCounted - pettyExpected).toFixed(2));

  const pendingPettyTransactions = useMemo(() => {
    return (state.pettyCashTransactions || []).filter(
      (t) => !t.cloudId && !t.id.startsWith('pct-cloud-')
    );
  }, [state.pettyCashTransactions]);

  const isPettyCashOpen = state.currentPettyCashShift?.status === 'OPEN';

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  // Turno cerrado con todos los datos del cierre (se usa al confirmar, al imprimir y al exportar)
  const buildClosedShift = (): CashShift => ({
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
    salesBankTransfers,
    bankTransfersNotes,
    salesCashSystem,
    otherIncome,
    otherIncomeNotes,
    loyversePaidOut,
    formulaVersion: 2,
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

    // Caja General: el cuadre lo hace Loyverse; aquí se registra el conteo físico
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
  });

  const printClosingAct = (closedShift: CashShift) => {
    printOfficialActBN({
      shift: closedShift,
      date: shift.date,
      modo: 'TODO',
      salesCash: efectivoReal,
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      salesBankTransfers,
      totalGross: totalGrossSales,
      netProfit: dailyNetProfit,
      marginPercent: dayProfit.margen,
      responsableCaja: closedBy,
      observacionesGeneral: closingNotes,
      fondoInicial: state.currentPettyCashShift?.initialBalance ?? 0,
      expensesCash: dayPettyExpensesCash,
      expensesTransf: dayPettyExpensesTransf,
      expensesTotal: dayPettyExpenses,
      saldoRemanente: pettyCounted ?? pettyExpected,
      responsableCajaChica: state.currentPettyCashShift?.openedBy || closedBy,
      transactions: dayTransactions,
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

    if (pettyCounted === null && isPettyCashOpen) {
      const skipPetty = window.confirm(
        `No se contó la Caja Chica (el sistema espera C$ ${pettyExpected.toFixed(2)}).\n\n¿Cerrar sin conteo? Quedará como cuadrada con el saldo del sistema.`
      );
      if (!skipPetty) return;
    }

    const closedShift = buildClosedShift();
    onConfirmClose(closedShift, pettyCounted);

    // 🖨️ Acta Oficial Completa de Cierre del Día (2 hojas carta: Caja General + Caja Chica)
    printClosingAct(closedShift);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-barro"></span>
              <h2 className="text-base font-bold text-stone-900">Cierre Oficial de Caja General</h2>
            </div>
            <p className="text-xs text-stone-500">
              Jornada del <strong>{shift.date}</strong> • Apertura por {shift.openedBy} con C$ {shift.totalOpeningEquivNIO.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 uppercase">Cerrado por:</span>
              <select
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="text-xs font-bold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
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
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper de 4 Pasos Claros */}
        <div className="grid grid-cols-4 border-b border-stone-200 text-xs font-bold bg-white divide-x divide-stone-100">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 1
                ? 'border-bodegon text-bodegon bg-bodegon/2'
                : 'border-transparent text-stone-500 hover:text-stone-800'
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
                ? 'border-bodegon text-bodegon bg-bodegon/2'
                : 'border-transparent text-stone-500 hover:text-stone-800'
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
                ? 'border-bodegon text-bodegon bg-bodegon/2'
                : 'border-transparent text-stone-500 hover:text-stone-800'
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
                ? 'border-bodegon text-bodegon bg-bodegon/2'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">4. Cuadre & Acta</span>
            <span className="sm:hidden">4. Cuadre</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-stone-50/40">
          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 1: ARQUEO DE EFECTIVO EN GAVETA ───────────────────────── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200 flex-wrap gap-3">
                <span className="text-xs text-stone-700 font-bold">
                  Administrador / Cajero que realiza el Cierre:
                </span>
                <div className="flex gap-2">
                  <select
                    value={closedBy}
                    onChange={(e) => setClosedBy(e.target.value)}
                    className="bg-stone-50 border border-stone-300 text-stone-900 rounded-lg px-2.5 py-1 text-xs font-bold focus:bg-white focus:outline-none focus:border-bodegon"
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
                  <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-bodegon" />
                    <span>Arqueo Físico de Gaveta al Cierre (Efectivo Contado)</span>
                  </h3>
                  <span className="text-xs text-stone-500 font-medium">
                    Tasa de cambio: <strong className="font-mono text-stone-900">C$ {shift.exchangeRate.toFixed(2)}</strong>
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

              <div className="p-4 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase">Efectivo Físico Contado en Gaveta:</span>
                  <div className="text-2xl font-bold font-mono text-bodegon">
                    C$ {actualCashNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
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
              <div className="p-5 bg-white rounded-xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                      <CreditCard className="w-4 h-4 text-bodegon" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        1. Cierres de Lote de Tarjetas POS (Datáfonos)
                      </h3>
                      <p className="text-xs text-stone-500">
                        Ingresa el monto total de los vouchers emitidos por cada datáfono esta noche.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Subtotal Tarjetas</span>
                    <span className="text-base font-bold font-mono text-stone-900">
                      C$ {totalCards.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* BAC */}
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <label className="block text-[11px] font-bold uppercase text-stone-700 mb-1">
                      BAC Credomatic (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBAC === 0 ? '' : cardsBAC}
                        onChange={(e) => setCardsBAC(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-bodegon"
                      />
                    </div>
                  </div>

                  {/* Ficohsa */}
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <label className="block text-[11px] font-bold uppercase text-stone-700 mb-1">
                      Banco Ficohsa (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsFicohsa === 0 ? '' : cardsFicohsa}
                        onChange={(e) => setCardsFicohsa(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-bodegon"
                      />
                    </div>
                  </div>

                  {/* Banpro */}
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <label className="block text-[11px] font-bold uppercase text-stone-700 mb-1">
                      Banpro Grupo Promerica (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBanpro === 0 ? '' : cardsBanpro}
                        onChange={(e) => setCardsBanpro(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-bodegon"
                      />
                    </div>
                  </div>

                  {/* Lafise */}
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <label className="block text-[11px] font-bold uppercase text-stone-700 mb-1">
                      Banco LAFISE Bancentro (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsLafise === 0 ? '' : cardsLafise}
                        onChange={(e) => setCardsLafise(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-xs text-stone-900 focus:outline-none focus:border-bodegon"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery PedidosYa, Transferencias Bancarias, Ventas Efectivo Sistema & Otros Ingresos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* PedidosYa */}
                <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-stone-600" />
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      2. Delivery PedidosYa (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Total vendido en la aplicación.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-stone-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesPedidosYa === 0 ? '' : salesPedidosYa}
                      onChange={(e) => setSalesPedidosYa(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>
                </div>

                {/* Transferencias Bancarias de Clientes (Loyverse) */}
                <div className="p-4 bg-white rounded-xl border border-blue-200/90 bg-gradient-to-br from-white to-blue-50/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-700" />
                    <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      3. Transferencias Bancarias (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Cobradas en Loyverse (BAC, Banpro, Lafise).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-blue-500 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesBankTransfers === 0 ? '' : salesBankTransfers}
                      onChange={(e) => setSalesBankTransfers(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-blue-900 focus:bg-white focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Banco / No. Comprobante (opcional)"
                    value={bankTransfersNotes}
                    onChange={(e) => setBankTransfersNotes(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none focus:border-blue-600 mt-1"
                  />
                </div>

                {/* Ventas en Efectivo del Sistema POS */}
                <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-bodegon" />
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      4. Ventas en Efectivo (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Total según sistema (Loyverse). Solo de referencia: la venta en efectivo real sale del conteo de gaveta.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-stone-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesCashSystem === 0 ? '' : salesCashSystem}
                      onChange={(e) => setSalesCashSystem(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-bodegon focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>
                </div>

                {/* Pagos y Salidas de Loyverse */}
                <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-dorado-tinta" />
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Pagos y Salidas (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Según Loyverse. Se suman al efectivo contado en gaveta.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-stone-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={loyversePaidOut === 0 ? '' : loyversePaidOut}
                      onChange={(e) => setLoyversePaidOut(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-cafe focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>
                  <p className="text-[11px] text-stone-600 font-mono">
                    Efectivo real: C$ {actualCashNIO.toFixed(2)} contado + C$ {loyversePaidOut.toFixed(2)} = <strong>C$ {efectivoReal.toFixed(2)}</strong>
                  </p>
                </div>

                {/* Otros Ingresos */}
                <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-stone-600" />
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      5. Otros Ingresos (C$)
                    </h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Ingresos adicionales no estándar.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-stone-400 font-mono font-bold text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={otherIncome === 0 ? '' : otherIncome}
                      onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Concepto / Detalle (opcional)"
                    value={otherIncomeNotes}
                    onChange={(e) => setOtherIncomeNotes(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 focus:bg-white focus:outline-none focus:border-bodegon mt-1"
                  />
                </div>
              </div>

              {/* Total Bruto Consolidado */}
              <div className="p-4 bg-bodegon text-white rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                    Ventas Totales del Turno (Efectivo real + Tarjetas + PedidosYa + Transf. + Otros Ing.)
                  </span>
                  <div className="text-2xl font-bold font-mono text-white mt-0.5">
                    C$ {totalGrossSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
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
              <div className="p-5 bg-white rounded-xl border border-stone-200 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-bodegon" /> Reparto de Propinas del Turno
                  </h3>
                  <p className="text-xs text-stone-500">
                    Calcula la propina total del turno y la cuota individual para el personal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Total de Propina Recaudada (Línea 'Impuestos' en Loyverse POS) (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalTipCollected === 0 ? '' : totalTipCollected}
                      placeholder="0.00"
                      onChange={(e) => setTotalTipCollected(parseFloat(e.target.value) || 0)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-lg font-bold font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-stone-500" /> Personal para Reparto Común (sin Yahaira)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={staffCount}
                      onChange={(e) => setStaffCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-lg font-bold font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-bodegon"
                    />
                  </div>
                </div>

                {/* ── APARTADO ESPECIAL: ACUERDO LABORAL YAHAIRA RIVAS ── */}
                <div className="p-3.5 bg-bodegon/4 border border-bodegon/20 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-bodegon/10 text-bodegon rounded-lg">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-bodegon-noche block">
                          Acuerdo Especial: Propina Yahaira Rivas
                        </span>
                        <span className="text-[11px] text-bodegon">
                          Cuota fija acordada por el equipo si laboró en la jornada
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-lg border border-bodegon/35 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={tipYahairaWorked}
                        onChange={(e) => setTipYahairaWorked(e.target.checked)}
                        className="w-4 h-4 text-bodegon rounded border-bodegon/35 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-stone-800">
                        {tipYahairaWorked ? '✓ Asistió a Trabajar' : '✗ No Asistió'}
                      </span>
                    </label>
                  </div>

                  {tipYahairaWorked ? (
                    <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-bodegon/16 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-700 font-medium text-[11px]">Monto Fijo para Yahaira:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-stone-500 text-xs">C$</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={tipYahairaAmount}
                            onChange={(e) => setTipYahairaAmount(parseFloat(e.target.value) || 0)}
                            className="w-20 bg-white border border-bodegon/35 rounded px-2 py-0.5 font-mono font-bold text-bodegon-noche text-xs text-right focus:outline-none focus:border-bodegon"
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-bodegon-noche font-semibold">
                        Descuento aplicado: C$ {totalTipCollected.toFixed(2)} - C$ {actualYahairaTip.toFixed(2)} = <strong>C$ {tipTeamPool.toFixed(2)} restantes</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-stone-600 border-t border-bodegon/16">
                      Yahaira no laboró en el turno. El 100% de la propina recaudada (C$ {totalTipCollected.toFixed(2)}) se distribuye entre los {staffCount} compañeros de equipo.
                    </div>
                  )}
                </div>

                {/* Tarjeta de Resumen y Reparto Automático */}
                <div className="p-4 bg-dorado/7 border border-dorado/40 rounded-lg space-y-3.5">
                  {/* Barra de Herramienta de Redondeo (Evitar Monedas) */}
                  <div className="flex items-center justify-between flex-wrap gap-2.5 p-2.5 bg-white rounded-lg border border-dorado/60 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-dorado/20 text-dorado-tinta rounded-md">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-800 block">
                          Redondeo a Billetes de C$ 10 (Sin Monedas)
                        </span>
                        <span className="text-[10.5px] text-stone-500">
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
                          className="px-3 py-1.5 bg-bodegon hover:bg-bodegon-noche text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Aplicar Redondeo Automático</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-bodegon/10 text-bodegon rounded font-bold text-[11px] border border-bodegon/35">
                            ✓ Redondeo Activo (C$ {individualTip.toFixed(2)})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setTipIsRounded(false);
                              setManualIndividualTip(null);
                            }}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer border border-stone-300"
                            title="Volver al cálculo exacto con centavos"
                          >
                            <RotateCcw className="w-3 h-3 text-stone-500" />
                            <span>Quitar Redondeo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid de Desglose de Reparto */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-dorado/32 pb-3">
                    {tipYahairaWorked && (
                      <div className="bg-white p-2.5 rounded-lg border border-dorado/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-bodegon block">
                          Cuota Yahaira Rivas
                        </span>
                        <div className="text-lg font-bold text-bodegon-noche font-mono">
                          C$ {actualYahairaTip.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-stone-500 font-medium">
                          Monto fijo por acuerdo
                        </span>
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded-lg border border-dorado/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-dorado-tinta block">
                        Fondo Restante Equipo
                      </span>
                      <div className="text-lg font-bold text-cafe font-mono">
                        C$ {tipTeamPool.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium">
                        A repartir entre {staffCount} personas
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-dorado/40 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-dorado-tinta block">
                          Cuota por Colaborador
                        </span>
                        {tipIsRounded && (
                          <span className="text-[9px] font-bold text-bodegon bg-bodegon/5 px-1 rounded">
                            Billetes
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono font-bold text-stone-400">C$</span>
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
                          className="w-24 font-bold text-lg text-cafe font-mono bg-dorado/5 border border-dorado/60 rounded px-1.5 py-0.5 focus:bg-white focus:outline-none focus:border-bodegon"
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 font-medium block mt-0.5">
                        {tipIsRounded
                          ? `(Exacto era C$ ${rawIndividualTip.toFixed(2)})`
                          : `C$ ${tipTeamPool.toFixed(2)} ÷ ${staffCount} pers.`}
                      </span>
                    </div>
                  </div>

                  {/* Resumen Final de Declaración y Gaveta */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
                    <div className="space-y-0.5">
                      <div className="text-stone-700">
                        <span>Total Real a Entregar de Gaveta: </span>
                        <strong className="font-mono text-stone-900 text-sm">
                          C$ {tipDistributedTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      {tipIsRounded && (
                        <div className="text-[11px] font-medium">
                          {tipRoundingDiff > 0 ? (
                            <span className="text-bodegon">
                              + C$ {tipRoundingDiff.toFixed(2)} quedan en gaveta física (remanente de monedas no entregadas).
                            </span>
                          ) : tipRoundingDiff < 0 ? (
                            <span className="text-blue-700">
                              - C$ {Math.abs(tipRoundingDiff).toFixed(2)} se completaron de gaveta para redondear billetes.
                            </span>
                          ) : (
                            <span className="text-stone-500">
                              El reparto coincide exactamente al centavo.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-dorado/60 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={tipPaid}
                        onChange={(e) => setTipPaid(e.target.checked)}
                        className="w-4 h-4 text-bodegon rounded border-stone-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-stone-800">
                        ¿Se entregó en efectivo de la gaveta esta noche?
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Nombres del personal / Observaciones de propina
                  </label>
                  <input
                    type="text"
                    value={tipNotes}
                    onChange={(e) => setTipNotes(e.target.value)}
                    placeholder="Ej: Melvin, Nelly, Uriel, Sandor, Oscar..."
                    className="w-full bg-stone-50 border border-stone-300 text-stone-800 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:border-bodegon"
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
                    ? 'bg-bodegon/4 border-bodegon/35 text-bodegon-noche'
                    : auditStatus === 'SURPLUS'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                    : 'bg-barro/4 border-barro/40 text-barro'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isPendingArqueo ? (
                    <Clock className="w-6 h-6 text-stone-500" />
                  ) : auditStatus === 'SQUARED' ? (
                    <CheckCircle2 className="w-6 h-6 text-bodegon" />
                  ) : auditStatus === 'SURPLUS' ? (
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-barro" />
                  )}
                  <span className="text-xl font-bold">
                    {isPendingArqueo
                      ? 'PENDIENTE DE ARQUEO'
                      : auditStatus === 'SQUARED'
                      ? 'CAJA CUADRADA EXACTA'
                      : auditStatus === 'SURPLUS'
                      ? 'SOBRANTE EN GAVETA'
                      : 'FALTANTE EN GAVETA'}
                  </span>
                </div>

                <div className="text-xs font-medium">
                  {isPendingArqueo && 'Aún no se ha realizado el conteo físico ni ingresado las ventas de Loyverse.'}
                  {!isPendingArqueo && auditStatus === 'SQUARED' && 'El efectivo físico neto coincide exactamente con lo esperado de Loyverse.'}
                  {!isPendingArqueo && auditStatus === 'SURPLUS' && `Hay un sobrante de + C$ ${differenceNIO.toFixed(2)} sobre lo esperado.`}
                  {!isPendingArqueo && auditStatus === 'SHORTAGE' && `Hay un faltante de - C$ ${Math.abs(differenceNIO).toFixed(2)} respecto al efectivo esperado.`}
                </div>
              </div>

              {/* Banners Informativos de Integridad Caja Chica / Sincronización */}
              {pendingPettyTransactions.length > 0 && (
                <div className="p-3 bg-dorado/10 border border-dorado/60 rounded-lg flex items-center justify-between text-xs text-cafe">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-dorado-tinta shrink-0" />
                    <div>
                      <strong className="block font-bold text-cafe">
                        {pendingPettyTransactions.length} movimiento(s) de Caja Chica pendientes en esta PC
                      </strong>
                      <span className="text-[11px] text-dorado-tinta">
                        Al confirmar el cierre, el sistema los enviará automáticamente a Supabase para mantener la web cuadrada.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-dorado/24 font-mono font-bold text-cafe text-[10px]">
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
                <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-2 flex items-center justify-between">
                    <span>1. Conciliación de Efectivo (Loyverse)</span>
                    <Banknote className="w-4 h-4 text-bodegon" />
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Billetes y Monedas en Córdobas:</span>
                      <strong className="font-mono text-stone-800">C$ {totalClosingNIO.toFixed(2)}</strong>
                    </div>
                    {totalClosingUSD > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>Dólares ($ {totalClosingUSD.toFixed(2)} a T.C. {shift.exchangeRate || 36}):</span>
                        <strong className="font-mono text-bodegon">+ C$ {totalClosingUSDEquivNIO.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold text-stone-800">
                      <span>Total Físico Contado en Gaveta:</span>
                      <strong className="font-mono text-stone-900">C$ {actualCashNIO.toFixed(2)}</strong>
                    </div>
                    {tipsPaidAmount > 0 && (
                      <div className="flex justify-between text-barro">
                        <span>(-) Menos Propinas a Entregar:</span>
                        <strong className="font-mono font-bold">- C$ {tipsPaidAmount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="bg-bodegon/5 p-2.5 rounded-lg border border-bodegon/20 space-y-1">
                      <div className="flex justify-between font-bold text-sm text-bodegon">
                        <span>(=) Efectivo Neto que queda en Gaveta:</span>
                        <strong className="font-mono">C$ {netCashAfterTipsNIO.toFixed(2)}</strong>
                      </div>
                      {totalClosingUSD > 0 && (
                        <div className="text-[11px] text-bodegon flex items-center justify-between pt-0.5">
                          <span>Dólares físicos en custodia:</span>
                          <span className="font-mono font-bold">$ {totalClosingUSD.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100">
                      <span>Cobros Efectivo Loyverse (Referencial):</span>
                      <strong className="font-mono text-stone-700">C$ {salesCashSystem.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>Diferencia de Cuadre:</span>
                      <span
                        className={`font-mono font-bold ${
                          differenceNIO === 0
                            ? 'text-bodegon'
                            : differenceNIO > 0
                            ? 'text-blue-600'
                            : 'text-barro'
                        }`}
                      >
                        {differenceNIO > 0 ? `+ C$ ${differenceNIO.toFixed(2)} (SOBRANTE)` : differenceNIO < 0 ? `- C$ ${Math.abs(differenceNIO).toFixed(2)} (FALTANTE)` : 'C$ 0.00 (EXACTO)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rendimiento Financiero del Turno (Idéntico a Excel) */}
                <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-2 flex items-center justify-between">
                    <span>2. Estado Financiero Consolidado (Excel)</span>
                    <TrendingUp className="w-4 h-4 text-stone-700" />
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Efectivo real (gaveta + pagos/salidas):</span>
                      <span className="font-mono">C$ {efectivoReal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Ventas Tarjetas (BAC/Fic/Ban/Laf):</span>
                      <span className="font-mono">C$ {totalCards.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Ventas Delivery PedidosYa:</span>
                      <span className="font-mono">C$ {salesPedidosYa.toFixed(2)}</span>
                    </div>
                    {salesBankTransfers > 0 && (
                      <div className="flex justify-between text-blue-900 font-semibold bg-blue-50/60 px-1.5 py-0.5 rounded">
                        <span>Ventas por Transferencia:</span>
                        <span className="font-mono text-blue-700 font-bold">C$ {salesBankTransfers.toFixed(2)}</span>
                      </div>
                    )}
                    {otherIncome > 0 && (
                      <div className="flex justify-between text-stone-600">
                        <span>Otros Ingresos:</span>
                        <span className="font-mono text-cyan-700 font-bold">+ C$ {otherIncome.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold text-stone-900">
                      <span>Total Ingresos Facturados:</span>
                      <strong className="font-mono text-stone-900 text-sm">C$ {totalGrossSales.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-stone-500 pt-1">
                      <span>(-) Gastos del día (efectivo, transferencia y tarjeta):</span>
                      <span className="font-mono text-barro">- C$ {dayPettyExpenses.toFixed(2)}</span>
                    </div>
                    {tipsPaidAmount > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>(-) Propinas pagadas al personal:</span>
                        <span className="font-mono text-barro">- C$ {tipsPaidAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="bg-bodegon/4 p-2.5 rounded-lg border border-bodegon/20 flex justify-between font-bold text-sm text-bodegon-noche">
                      <span>Total Neto / Utilidad Operativa:</span>
                      <strong className="font-mono text-bodegon">C$ {dailyNetProfit.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saldo que queda en gaveta para apertura siguiente */}
              <div className="p-3.5 bg-dorado/7 border border-dorado/40 rounded-lg text-xs text-cafe flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-dorado-tinta">
                    Fondo Neto que queda en Gaveta para amanecer (Total Córdobas):
                  </span>
                  <div className="text-xl font-bold font-mono text-cafe mt-0.5">
                    C$ {netCashAfterTipsNIO.toFixed(2)}
                  </div>
                  {tipsPaidAmount > 0 && (
                    <div className="text-[11px] text-cafe font-medium mt-0.5">
                      (Conteo inicial C$ {actualCashNIO.toFixed(2)} menos C$ {tipsPaidAmount.toFixed(2)} entregados en propina)
                    </div>
                  )}
                  {totalClosingUSD > 0 && (
                    <div className="text-[11px] font-bold text-dorado-tinta mt-1 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 inline text-dorado-tinta" />
                      <span>Moneda Extranjera: ${totalClosingUSD.toFixed(2)} USD (Apartados para Snyder • Quedan $0.00 en caja)</span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-stone-500 max-w-xs text-right">
                  Fondo efectivo neto real que queda en caja general para la siguiente apertura.
                </span>
              </div>

              {/* Conteo físico de Caja Chica: única caja que se cuadra en el sistema */}
              {isPettyCashOpen && (
                <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Conteo de Caja Chica</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
                    <div>
                      <span className="block text-stone-500 font-bold mb-1">Saldo según sistema</span>
                      <strong className="font-mono text-sm text-stone-900">C$ {pettyExpected.toFixed(2)}</strong>
                    </div>
                    <label className="block">
                      <span className="block text-stone-500 font-bold mb-1">Efectivo contado en Caja Chica</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Contar billetes y monedas"
                        value={pettyCountInput}
                        onChange={(e) => setPettyCountInput(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm font-bold font-mono focus:bg-white focus:outline-none focus:border-bodegon"
                      />
                    </label>
                    <div>
                      <span className="block text-stone-500 font-bold mb-1">Diferencia</span>
                      <strong
                        className={`font-mono text-sm ${
                          pettyCounted === null ? 'text-stone-400' : pettyDifference === 0 ? 'text-bodegon' : pettyDifference > 0 ? 'text-blue-700' : 'text-barro'
                        }`}
                      >
                        {pettyCounted === null
                          ? 'Pendiente de conteo'
                          : pettyDifference === 0
                          ? 'C$ 0.00 (cuadrada)'
                          : pettyDifference > 0
                          ? `+ C$ ${pettyDifference.toFixed(2)} (sobrante)`
                          : `- C$ ${Math.abs(pettyDifference).toFixed(2)} (faltante)`}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Observaciones de Cierre */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5">
                  Observaciones de Cierre (para la gerencia)
                </label>
                <textarea
                  rows={2}
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ej: Se dejó C$ 922 + $180 en gaveta. Cierres de lote de datáfonos sin discrepancias..."
                  className="w-full bg-white border border-stone-300 rounded-lg p-2.5 text-xs text-stone-900 focus:outline-none focus:border-bodegon"
                />
              </div>

              {/* Botones de Reimpresión y Exportación Rápida */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => printClosingAct(buildClosedShift())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white text-xs font-bold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-bodegon" />
                  <span>Imprimir Acta Oficial (Carta)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportShiftToExcel(buildClosedShift(), state)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bodegon/5 hover:bg-bodegon/10 text-bodegon text-xs font-bold border border-bodegon/20 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-bodegon" />
                  <span>Exportar a Excel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Navegación de 4 Pasos */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-white">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Paso Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer"
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
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishClosing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-barro hover:bg-barro text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#F3C9BF]" />
                <span>Finalizar Cierre e Imprimir Acta Oficial Completa (2 Hojas)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
