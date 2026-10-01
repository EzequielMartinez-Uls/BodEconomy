import React, { useState, useMemo } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD, AppState } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { CashDenominationsInput } from './CashDenominationsInput';
import { printThermalClosingTicket } from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import { extractLocalDateStr } from '../utils/dateUtils';
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

  // 3. Propinas de la noche
  const [totalTipCollected, setTotalTipCollected] = useState<number>(shift.totalTipCollected || 0);
  const [staffCount, setStaffCount] = useState<number>(shift.staffCount || 10);
  const [tipPaid, setTipPaid] = useState<boolean>(shift.tipPaid !== undefined ? shift.tipPaid : true);
  const [tipNotes, setTipNotes] = useState<string>(shift.tipNotes || '');

  // 4. Observaciones
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Cálculos reactivos de Efectivo en Gaveta
  const totalClosingNIO = calculateTotalNIO(closingNIO);
  const totalClosingUSD = calculateTotalUSD(closingUSD);
  const totalClosingEquivNIO = totalClosingNIO + totalClosingUSD * shift.exchangeRate;

  // Cálculos de Ventas
  const totalCards = cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;
  const totalGrossSales = salesCashSystem + totalCards + salesPedidosYa + otherIncome;

  // Cálculos de Propinas
  const individualTip = staffCount > 0 ? parseFloat((totalTipCollected / staffCount).toFixed(2)) : 0;
  const tipsPaidAmount = tipPaid ? totalTipCollected : 0;

  // Saldo real contado en gaveta al cierre
  const actualCashNIO = parseFloat(totalClosingEquivNIO.toFixed(2));

  // CÁLCULO REAL DE AUDITORÍA Y CUADRE DE CAJA (Sin hardcodes)
  // Lo que DEBERÍA haber en la gaveta física:
  // Fondo Inicial + Ventas en Efectivo cobradas - Propinas entregadas en efectivo
  const openingFloat = shift.totalOpeningEquivNIO || 0;
  // Traslado a caja chica: si ya fue deducido del fondo de apertura, no se vuelve a restar
  const additionalTransferOut = shift.openingTransferToPettyCash
    ? Math.max(0, (shift.transferToPettyCash || 0) - shift.openingTransferToPettyCash)
    : (shift.transferToPettyCash || 0);
  const expectedCashNIO = parseFloat((openingFloat + salesCashSystem - tipsPaidAmount - additionalTransferOut).toFixed(2));
  const differenceNIO = parseFloat((actualCashNIO - expectedCashNIO).toFixed(2));

  let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = 'SQUARED';
  if (Math.abs(differenceNIO) < 1.0) {
    auditStatus = 'SQUARED';
  } else if (differenceNIO > 0) {
    auditStatus = 'SURPLUS';
  } else {
    auditStatus = 'SHORTAGE';
  }

  // Gastos de Caja Chica del Día para ver la ganancia neta real
  const dayPettyExpenses = useMemo(() => {
    return (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === shift.date)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [state.pettyCashTransactions, shift.date]);

  const dailyNetProfit = parseFloat((totalGrossSales - dayPettyExpenses).toFixed(2));

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

      // Auditoría Real
      actualCashNIO,
      expectedCashNIO,
      differenceNIO,
      auditStatus,
      dailyNetProfit,
      closingNotes,

      transferToPettyCash: 0,
      overtimePaidCash: 0,
      extraDaysPaidCash: 0,
      reserveDGI: 0,
      reservePayroll: 0,
      reserveVacations: 0,
      reserveSnyder: 0,
      totalWithdrawals: 0,
    };

    onConfirmClose(closedShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <h2 className="text-xl font-black text-slate-900">Cierre Oficial de Caja General</h2>
            </div>
            <p className="text-xs text-slate-500">
              Jornada del <strong>{shift.date}</strong> • Apertura por {shift.openedBy} con C$ {shift.totalOpeningEquivNIO.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Cerrado por:</span>
              <select
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper de 4 Pasos Claros */}
        <div className="grid grid-cols-4 border-b border-slate-100 text-xs font-bold bg-white">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-3 px-2 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              step === 1
                ? 'border-amber-500 text-amber-700 bg-amber-50/40'
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
                ? 'border-indigo-500 text-indigo-700 bg-indigo-50/40'
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
                ? 'border-amber-500 text-amber-700 bg-amber-50/40'
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
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/40'
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
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-3">
                <span className="text-sm text-slate-700 font-bold">
                  Administrador / Cajero que realiza el Cierre:
                </span>
                <div className="flex gap-2">
                  <select
                    value={closedBy}
                    onChange={(e) => setClosedBy(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-sm font-bold focus:bg-white focus:outline-none focus:border-amber-500"
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
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-600" />
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

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Efectivo Físico Contado en Gaveta:</span>
                  <div className="text-2xl font-black font-mono text-emerald-700">
                    C$ {actualCashNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
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
            <div className="space-y-5">
              {/* Tarjetas POS por Banco */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        1. Cierres de Lote de Tarjetas POS (Datáfonos)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ingresa el monto total de los vouchers emitidos por cada datáfono esta noche.
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal Tarjetas</span>
                    <span className="text-lg font-black font-mono text-indigo-700">
                      C$ {totalCards.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BAC */}
                  <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/80">
                    <label className="block text-xs font-black uppercase text-rose-800 mb-1">
                      BAC Credomatic (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBAC === 0 ? '' : cardsBAC}
                        onChange={(e) => setCardsBAC(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Ficohsa */}
                  <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200/80">
                    <label className="block text-xs font-black uppercase text-sky-800 mb-1">
                      Banco Ficohsa (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsFicohsa === 0 ? '' : cardsFicohsa}
                        onChange={(e) => setCardsFicohsa(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-sky-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {/* Banpro */}
                  <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                    <label className="block text-xs font-black uppercase text-emerald-800 mb-1">
                      Banpro Grupo Promerica (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsBanpro === 0 ? '' : cardsBanpro}
                        onChange={(e) => setCardsBanpro(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Lafise */}
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                    <label className="block text-xs font-black uppercase text-amber-800 mb-1">
                      Banco LAFISE Bancentro (C$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cardsLafise === 0 ? '' : cardsLafise}
                        onChange={(e) => setCardsLafise(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery PedidosYa, Ventas Efectivo Sistema & Otros Ingresos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PedidosYa */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      2. Delivery PedidosYa (C$)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Total vendido en la aplicación de PedidosYa.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesPedidosYa === 0 ? '' : salesPedidosYa}
                      onChange={(e) => setSalesPedidosYa(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-lg font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Ventas en Efectivo del Sistema POS */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      3. Ventas Efectivo POS (C$)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Total efectivo según sistema (Loyverse).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={salesCashSystem === 0 ? '' : salesCashSystem}
                      onChange={(e) => setSalesCashSystem(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-lg font-black font-mono text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Otros Ingresos */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-cyan-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      4. Otros Ingresos (C$)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ingresos adicionales no estándar.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-400 font-mono font-bold">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={otherIncome === 0 ? '' : otherIncome}
                      onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-lg font-black font-mono text-cyan-700 focus:bg-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Concepto / Detalle (opcional)"
                    value={otherIncomeNotes}
                    onChange={(e) => setOtherIncomeNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-cyan-500 mt-1"
                  />
                </div>
              </div>

              {/* Total Bruto Consolidado */}
              <div className="p-5 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Total Ventas Brutas del Turno (Efectivo + Tarjetas + Delivery + Otros Ing.)
                  </span>
                  <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                    C$ {totalGrossSales.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm transition"
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
            <div className="space-y-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" /> Reparto de Propinas del Turno
                </h3>
                <p className="text-xs text-slate-500">
                  Calcula la propina total del turno y la cuota individual para el personal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Total de Propina Recaudada (C$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={totalTipCollected === 0 ? '' : totalTipCollected}
                      placeholder="0.00"
                      onChange={(e) => setTotalTipCollected(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xl font-black font-mono text-amber-700 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Total de Personal en Turno
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={staffCount}
                      onChange={(e) => setStaffCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xl font-black font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Tarjeta de Cálculo Automático */}
                <div className="p-5 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl flex items-center justify-between shadow-xs flex-wrap gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Propina Individual Calculada
                    </span>
                    <div className="text-3xl font-black text-amber-700 font-mono">
                      C$ {individualTip.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      (Para cada uno de los {staffCount} colaboradores)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-amber-300 shadow-xs">
                      <input
                        type="checkbox"
                        checked={tipPaid}
                        onChange={(e) => setTipPaid(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        ¿Se entregó en efectivo de la gaveta esta noche?
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nombres del personal / Observaciones de propina
                  </label>
                  <input
                    type="text"
                    value={tipNotes}
                    onChange={(e) => setTipNotes(e.target.value)}
                    placeholder="Ej: Melvin, Nelly, Uriel, Sandor, Oscar..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* PASO 4: AUDITORÍA, CUADRE REAL Y ACTA OFICIAL ──────────────── */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Tarjeta de Diagnóstico de Cuadre */}
              <div
                className={`p-6 rounded-3xl border shadow-xs text-center space-y-2 ${
                  auditStatus === 'SQUARED'
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : auditStatus === 'SURPLUS'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                    : 'bg-rose-50/80 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {auditStatus === 'SQUARED' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  ) : auditStatus === 'SURPLUS' ? (
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-rose-600" />
                  )}
                  <span className="text-2xl font-black">
                    {auditStatus === 'SQUARED'
                      ? 'CAJA CUADRADA EXACTA'
                      : auditStatus === 'SURPLUS'
                      ? 'SOBRANTE EN GAVETA'
                      : 'FALTANTE EN GAVETA'}
                  </span>
                </div>

                <div className="text-sm font-semibold">
                  {auditStatus === 'SQUARED' && 'El efectivo físico coincide exactamente con las ventas y el fondo de apertura.'}
                  {auditStatus === 'SURPLUS' && `Hay un sobrante de + C$ ${differenceNIO.toFixed(2)} sobre lo esperado.`}
                  {auditStatus === 'SHORTAGE' && `Hay un faltante de - C$ ${Math.abs(differenceNIO).toFixed(2)} respecto al efectivo esperado.`}
                </div>
              </div>

              {/* Conciliación Matemática Transparente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Caja / Arqueo de Gaveta */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>1. Conciliación de Efectivo Físico</span>
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>(+) Fondo Inicial de Apertura:</span>
                      <strong className="font-mono text-slate-900">C$ {openingFloat.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>(+) Ventas Efectivo según Sistema:</span>
                      <strong className="font-mono text-emerald-700">+ C$ {salesCashSystem.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>(-) Propinas Pagadas en Efectivo:</span>
                      <strong className="font-mono text-rose-600">- C$ {tipsPaidAmount.toFixed(2)}</strong>
                    </div>
                    {additionalTransferOut > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>(-) Traspasos a Caja Chica:</span>
                        <strong className="font-mono text-rose-600">- C$ {additionalTransferOut.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
                      <span>(=) Efectivo Teórico que debe haber:</span>
                      <strong className="font-mono text-slate-900">C$ {expectedCashNIO.toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between font-black text-sm">
                      <span>Efectivo Físico Real Contado:</span>
                      <strong className="font-mono text-emerald-700">C$ {actualCashNIO.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>Diferencia de Cuadre:</span>
                      <span
                        className={`font-mono font-black ${
                          differenceNIO === 0
                            ? 'text-emerald-600'
                            : differenceNIO > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {differenceNIO > 0 ? `+ C$ ${differenceNIO.toFixed(2)}` : `C$ ${differenceNIO.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rendimiento Financiero del Turno */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>2. Rendimiento Financiero del Día</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
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
                      <span>Total Ventas Brutas:</span>
                      <strong className="font-mono text-indigo-700 text-sm">C$ {totalGrossSales.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>(-) Compras / Caja Chica de hoy:</span>
                      <span className="font-mono text-rose-600">- C$ {dayPettyExpenses.toFixed(2)}</span>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex justify-between font-black text-sm text-emerald-950">
                      <span>Utilidad Neta de la Jornada:</span>
                      <strong className="font-mono text-emerald-700">C$ {dailyNetProfit.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saldo que queda en gaveta para apertura siguiente */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-center justify-between">
                <div>
                  <span className="font-black uppercase tracking-wider block text-[10px] text-amber-800">
                    Fondo que queda en Gaveta para la Apertura de Mañana:
                  </span>
                  <div className="text-xl font-black font-mono text-amber-900 mt-0.5">
                    C$ {actualCashNIO.toFixed(2)}
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 max-w-xs text-right">
                  Quien abra mañana podrá cargar este saldo como referencia inicial con un solo clic.
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
                  className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-sm text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                />
              </div>

              {/* Botones de Reimpresión y Exportación Rápida */}
              <div className="flex flex-wrap gap-3 pt-2">
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
                      actualCashNIO,
                      expectedCashNIO,
                      differenceNIO,
                      auditStatus,
                      dailyNetProfit,
                      closingNotes,
                    };
                    printThermalClosingTicket(previewShift);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-600" />
                  <span>Imprimir Ticket Térmico / A4</span>
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
                      actualCashNIO,
                      expectedCashNIO,
                      differenceNIO,
                      auditStatus,
                      dailyNetProfit,
                      closingNotes,
                    };
                    exportShiftToExcel(previewShift, state);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar a Excel</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Navegación de 4 Pasos */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-slate-900 transition text-sm font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Paso Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) triggerCelebration();
                  setStep((s) => (s + 1) as any);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishClosing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black shadow-md shadow-rose-600/25 transition active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Finalizar y Cerrar Turno</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
