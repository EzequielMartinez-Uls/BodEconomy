import React, { useState } from 'react';
import { AppState, CashShift, DenominationsNIO, DenominationsUSD, PettyCashTransaction } from '../types';
import {
  printThermalClosingTicket,
  printThermalOpeningTicket,
  printOfficialActBN,
  printOfficialOpeningActBN,
  printYesterdayEarningsActBN,
} from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import { extractLocalDateStr, getLocalTodayStr } from '../utils/dateUtils';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { CashDenominationsInput } from './CashDenominationsInput';
import { PrintOfficialActModal } from './PrintOfficialActModal';
import {
  Landmark,
  Lock,
  Unlock,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Search,
  Edit3,
  Trash2,
  Save,
  X,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';

interface Props {
  state: AppState;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onUpdateShift?: (updatedShift: CashShift) => void;
  onCancelOpenShift?: () => void;
  onAddPettyCashTransaction?: (tx: PettyCashTransaction) => void;
}

export const GeneralCashView: React.FC<Props> = ({
  state,
  onOpenShiftClick,
  onCloseShiftClick,
  onUpdateShift,
  onCancelOpenShift,
  onAddPettyCashTransaction,
}) => {
  const currentShift = state.currentShift;
  const isShiftOpen = currentShift !== null && currentShift.status === 'OPEN';
  const lastClosedShift = state.shiftHistory[0] || null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<CashShift | null>(null);

  // Modal para corregir / editar un cierre del historial
  const [editingShift, setEditingShift] = useState<CashShift | null>(null);
  const [editForm, setEditForm] = useState({
    cardsBAC: '',
    cardsFicohsa: '',
    cardsBanpro: '',
    cardsLafise: '',
    salesPedidosYa: '',
    salesCashSystem: '',
    totalTipCollected: '',
    closingNotes: '',
  });

  // Modal para ajustar el fondo de apertura del turno activo
  const [adjustingOpeningShift, setAdjustingOpeningShift] = useState<CashShift | null>(null);
  const [adjOpeningNIO, setAdjOpeningNIO] = useState<DenominationsNIO>(DEFAULT_DENOMINATIONS_NIO);
  const [adjOpeningUSD, setAdjOpeningUSD] = useState<DenominationsUSD>(DEFAULT_DENOMINATIONS_USD);
  const [adjExchangeRate, setAdjExchangeRate] = useState<number>(state.defaultExchangeRate);
  const [adjNotes, setAdjNotes] = useState('');

  const todayStr = getLocalTodayStr();

  // Modal para registrar Traspaso de Efectivo a Caja Chica (Punto 1)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');
  const [selectedShiftForActa, setSelectedShiftForActa] = useState<CashShift | null>(null);

  const handlePrintActaForShift = (modo: 'TODO' | 'GENERAL' | 'CHICA' | 'APERTURA') => {
    if (!selectedShiftForActa) return;
    const shift = selectedShiftForActa;
    const dateStr = shift.date;

    if (modo === 'APERTURA') {
      printOfficialOpeningActBN(shift, state.activeAdminName);
      setSelectedShiftForActa(null);
      return;
    }

    const pettyShift =
      (state.pettyCashShiftHistory || []).find((s) => s.date === dateStr) ||
      (state.currentPettyCashShift?.date === dateStr ? state.currentPettyCashShift : null);

    const dayTransactions = (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && (extractLocalDateStr(t.date) === dateStr || (pettyShift && t.shiftId === pettyShift.id)))
      .map((t) => ({
        id: t.id,
        hora: new Date(t.date).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
        categoria: t.category,
        concepto: t.notes || t.vendor,
        proveedor: t.vendor,
        metodo: t.method === 'CASH' ? 'Efectivo' : t.method === 'CARD' ? 'Tarjeta' : 'Transferencia',
        estado: t.receiptNumber ? `#${t.receiptNumber}` : 'Comprobante',
        referencia: t.receiptNumber,
        monto: t.amount,
      }));

    const salesCash =
      shift.salesCashSystem !== undefined
        ? shift.salesCashSystem
        : shift.loyverseValidation?.salesCashLoyverse || 0;

    const cardsBAC =
      shift.cardsBAC !== undefined ? shift.cardsBAC : shift.loyverseValidation?.cardsBAC || 0;
    const cardsFicohsa =
      shift.cardsFicohsa !== undefined ? shift.cardsFicohsa : shift.loyverseValidation?.cardsFicohsa || 0;
    const cardsBanpro =
      shift.cardsBanpro !== undefined ? shift.cardsBanpro : shift.loyverseValidation?.cardsBanpro || 0;
    const cardsLafise =
      shift.cardsLafise !== undefined ? shift.cardsLafise : shift.loyverseValidation?.cardsLafise || 0;
    const totalCards =
      shift.totalCards !== undefined ? shift.totalCards : cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;
    const salesPedidosYa =
      shift.salesPedidosYa !== undefined ? shift.salesPedidosYa : shift.loyverseValidation?.salesPedidosYa || 0;

    const totalGross =
      shift.totalGrossSales !== undefined && shift.totalGrossSales > 0
        ? shift.totalGrossSales
        : salesCash + totalCards + salesPedidosYa;

    const expensesCash = dayTransactions
      .filter((t) => t.metodo === 'Efectivo')
      .reduce((acc, t) => acc + t.monto, 0);
    const expensesTransf = dayTransactions
      .filter((t) => t.metodo === 'Transferencia')
      .reduce((acc, t) => acc + t.monto, 0);
    const expensesTotal = expensesCash + expensesTransf;
    const netProfit = shift.dailyNetProfit !== undefined ? shift.dailyNetProfit : (totalGross - expensesTotal);
    const marginPercent = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

    const fondoInicial =
      pettyShift?.initialBalance !== undefined
        ? pettyShift.initialBalance
        : 2000;

    const saldoRemanente =
      pettyShift?.actualCashCounted !== undefined
        ? pettyShift.actualCashCounted
        : (fondoInicial - expensesCash);

    printOfficialActBN({
      shift,
      date: dateStr,
      modo,
      salesCash,
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      totalGross,
      netProfit,
      marginPercent,
      responsableCaja: shift.closedBy || shift.openedBy || state.activeAdminName,
      fondoInicial,
      expensesCash,
      expensesTransf,
      expensesTotal,
      saldoRemanente,
      responsableCajaChica: pettyShift?.closedBy || pettyShift?.openedBy || state.activeAdminName,
      transactions: dayTransactions,
    });

    setSelectedShiftForActa(null);
  };

  const handleConfirmTransferToPetty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || transferAmount <= 0) return;

    const newTransferTotal = parseFloat(((currentShift.transferToPettyCash || 0) + transferAmount).toFixed(2));
    const updatedShift: CashShift = {
      ...currentShift,
      transferToPettyCash: newTransferTotal,
    };

    if (onUpdateShift) {
      onUpdateShift(updatedShift);
    }

    if (onAddPettyCashTransaction) {
      const tx: PettyCashTransaction = {
        id: `pct-transfer-gen-${Date.now()}`,
        shiftId: `pc-shift-${currentShift.date}`,
        date: new Date().toISOString(),
        type: 'INFLOW',
        inflowSource: 'TRASLADO_CAJA_GENERAL',
        amount: transferAmount,
        method: 'CASH',
        vendor: 'Traspaso desde Caja General',
        category: 'OTROS',
        registeredBy: state.activeAdminName,
        notes: transferNotes.trim() || 'Fondeo de efectivo desde gaveta general de ventas',
      };
      onAddPettyCashTransaction(tx);
    }

    setTransferModalOpen(false);
    setTransferAmount(0);
    setTransferNotes('');
  };

  // Filtrado del historial
  const filteredHistory = state.shiftHistory.filter((sh) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      sh.date.toLowerCase().includes(term) ||
      (sh.openedBy && sh.openedBy.toLowerCase().includes(term)) ||
      (sh.closedBy && sh.closedBy.toLowerCase().includes(term))
    );
  });

  // Abrir modal de edición para un cierre existente
  const handleOpenEditClosing = (shiftToEdit: CashShift) => {
    setEditForm({
      cardsBAC: shiftToEdit.cardsBAC ? String(shiftToEdit.cardsBAC) : '',
      cardsFicohsa: shiftToEdit.cardsFicohsa ? String(shiftToEdit.cardsFicohsa) : '',
      cardsBanpro: shiftToEdit.cardsBanpro ? String(shiftToEdit.cardsBanpro) : '',
      cardsLafise: shiftToEdit.cardsLafise ? String(shiftToEdit.cardsLafise) : '',
      salesPedidosYa: shiftToEdit.salesPedidosYa ? String(shiftToEdit.salesPedidosYa) : '',
      salesCashSystem: shiftToEdit.salesCashSystem ? String(shiftToEdit.salesCashSystem) : '',
      totalTipCollected: shiftToEdit.totalTipCollected ? String(shiftToEdit.totalTipCollected) : '',
      closingNotes: shiftToEdit.closingNotes || '',
    });
    setEditingShift(shiftToEdit);
  };

  // Guardar corrección del cierre
  const handleSaveEditClosing = () => {
    if (!editingShift || !onUpdateShift) return;

    const cardsBAC = parseFloat(editForm.cardsBAC) || 0;
    const cardsFicohsa = parseFloat(editForm.cardsFicohsa) || 0;
    const cardsBanpro = parseFloat(editForm.cardsBanpro) || 0;
    const cardsLafise = parseFloat(editForm.cardsLafise) || 0;
    const totalCards = cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;
    const salesPedidosYa = parseFloat(editForm.salesPedidosYa) || 0;
    const salesCashSystem = parseFloat(editForm.salesCashSystem) || 0;
    const totalGrossSales = salesCashSystem + totalCards + salesPedidosYa;
    const totalTipCollected = parseFloat(editForm.totalTipCollected) || 0;
    const staffCount = editingShift.staffCount || 10;
    const individualTip = staffCount > 0 ? parseFloat((totalTipCollected / staffCount).toFixed(2)) : 0;
    const tipsPaidAmount = editingShift.tipPaid ? totalTipCollected : 0;

    const openingFloat = editingShift.totalOpeningNIO || editingShift.totalOpeningEquivNIO || 0;
    const expectedCashNIO = parseFloat((openingFloat + salesCashSystem - tipsPaidAmount).toFixed(2));
    const actualCashNIO = editingShift.totalClosingNIO || editingShift.actualCashNIO || editingShift.totalClosingEquivNIO || 0;
    const differenceNIO = parseFloat((actualCashNIO - expectedCashNIO).toFixed(2));

    let auditStatus: 'SQUARED' | 'SURPLUS' | 'SHORTAGE' = 'SQUARED';
    if (Math.abs(differenceNIO) < 1.0) {
      auditStatus = 'SQUARED';
    } else if (differenceNIO > 0) {
      auditStatus = 'SURPLUS';
    } else {
      auditStatus = 'SHORTAGE';
    }

    // Calcular gastos de caja chica de esa fecha para la utilidad neta
    const dayPettyExpenses = (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === editingShift.date)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const dailyNetProfit = parseFloat((totalGrossSales - dayPettyExpenses - totalTipCollected).toFixed(2));

    const updated: CashShift = {
      ...editingShift,
      cardsBAC,
      cardsFicohsa,
      cardsBanpro,
      cardsLafise,
      totalCards,
      salesPedidosYa,
      salesCashSystem,
      totalGrossSales,
      totalTipCollected,
      individualTip,
      expectedCashNIO,
      differenceNIO,
      auditStatus,
      dailyNetProfit,
      closingNotes: editForm.closingNotes,
    };

    onUpdateShift(updated);
    if (selectedShiftDetails?.id === updated.id) {
      setSelectedShiftDetails(updated);
    }
    setEditingShift(null);
  };

  // Abrir modal para ajustar fondo de apertura activo
  const handleOpenAdjustOpening = () => {
    if (!currentShift) return;
    setAdjOpeningNIO(currentShift.openingNIO || DEFAULT_DENOMINATIONS_NIO);
    setAdjOpeningUSD(currentShift.openingUSD || DEFAULT_DENOMINATIONS_USD);
    setAdjExchangeRate(currentShift.exchangeRate || state.defaultExchangeRate);
    setAdjNotes(currentShift.openingNotes || '');
    setAdjustingOpeningShift(currentShift);
  };

  const handleSaveAdjustOpening = () => {
    if (!adjustingOpeningShift || !onUpdateShift) return;
    const totalNIO = calculateTotalNIO(adjOpeningNIO);
    const totalUSD = calculateTotalUSD(adjOpeningUSD);

    const updated: CashShift = {
      ...adjustingOpeningShift,
      exchangeRate: adjExchangeRate,
      openingNIO: adjOpeningNIO,
      openingUSD: adjOpeningUSD,
      totalOpeningNIO: totalNIO,
      totalOpeningUSD: totalUSD,
      totalOpeningEquivNIO: totalNIO,
      openingNotes: adjNotes,
    };

    onUpdateShift(updated);
    setAdjustingOpeningShift(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1c6856] text-white flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Caja General
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Ventas & Gaveta
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Control de fondo de caja, cobros en efectivo y conciliación de tarjetas y PedidosYa.
            </p>
          </div>
        </div>

        {/* Indicador de Tasa de Cambio */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
          <span>Tasa de Cambio:</span>
          <span className="font-mono font-bold text-slate-900">
            C$ {currentShift?.exchangeRate?.toFixed(2) || state.defaultExchangeRate.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Alerta de Cierre Pendiente de Jornada Anterior */}
      {isShiftOpen && currentShift && currentShift.date < todayStr && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                <span>Turno Anterior Pendiente de Liquidación: {currentShift.date}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200 text-amber-900 font-semibold uppercase">
                  Acción Requerida
                </span>
              </h4>
              <p className="text-amber-800 mt-0.5">
                El turno del <strong>{currentShift.date}</strong> permanece abierto. Debe liquidarse antes de abrir una nueva jornada.
              </p>
            </div>
          </div>

          <button
            onClick={onCloseShiftClick}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
          >
            <Lock className="w-4 h-4" />
            <span>Proceder al Cierre {currentShift.date}</span>
          </button>
        </div>
      )}

      {/* Tarjeta de Estado de Turno Actual */}
      {isShiftOpen ? (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                Turno de Ventas Abierto
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Gaveta Operativa Activa
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Abierto por <strong className="text-slate-700 font-semibold">{currentShift.openedBy}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Hora: {new Date(currentShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha: <strong className="font-mono">{currentShift.date}</strong>
                </span>
              </p>
            </div>

            {/* Acciones del Turno Abierto */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setTransferAmount(0);
                  setTransferNotes('');
                  setTransferModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Traspasar dinero en efectivo de las ventas a Caja Chica"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#1c6856]" />
                <span>Traspaso a Caja Chica</span>
              </button>

              <button
                onClick={handleOpenAdjustOpening}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Corregir billetes o tasa con que se abrió la caja"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Ajustar Fondo</span>
              </button>

              <button
                onClick={() => printThermalOpeningTicket(currentShift)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Imprimir comprobante de apertura en tique térmico (80mm)"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Ticket (80mm)</span>
              </button>

              <button
                onClick={() => printOfficialOpeningActBN(currentShift, state.activeAdminName)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Imprimir Acta Oficial de Apertura Completa (2 Hojas A4: Fondo + Ganancias de Ayer)"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Acta Apertura (B/N)</span>
              </button>

              <button
                onClick={() => printYesterdayEarningsActBN(currentShift, state.activeAdminName, currentShift.openingEarningsSummary)}
                className="px-3 py-1.5 rounded-lg border border-emerald-700 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Imprimir únicamente el Estado de Ganancias y Ventas de Ayer (Hoja 2 A4)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                <span>Ganancias de Ayer</span>
              </button>

              {onCancelOpenShift && (
                <button
                  onClick={onCancelOpenShift}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Cancelar turno si se abrió por error"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cancelar Turno</span>
                </button>
              )}

              <button
                onClick={onCloseShiftClick}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Turno (Noche)</span>
              </button>
            </div>
          </div>

          {/* Desglose del Fondo Inicial de Gaveta (Unified Financial KPI Bar) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-1 sm:grid-cols-3">
            <div className="p-4 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Fondo Córdobas (C$)
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                C$ {currentShift.totalOpeningNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400">Efectivo físico para vueltos</span>
            </div>

            <div className="p-4 space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Fondo Dólares (USD)
              </span>
              <div className="text-xl font-bold text-[#1c6856] font-mono">
                $ {currentShift.totalOpeningUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400">
                Equiv: C$ {(currentShift.totalOpeningUSD * currentShift.exchangeRate).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-4 space-y-1 bg-slate-50/70 sm:rounded-r-xl">
              <span className="text-[10px] font-semibold text-[#1c6856] uppercase tracking-wider block">
                Total Fondo Equivalente
              </span>
              <div className="text-xl font-bold text-[#1c6856] font-mono">
                C$ {currentShift.totalOpeningEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500">C$ + USD convertidos</span>
            </div>
          </div>

          {Boolean(currentShift.transferToPettyCash && currentShift.transferToPettyCash > 0) && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block">
                  Traspasos entregados a Caja Chica (Salidas de Gaveta):
                </span>
                <div className="text-base font-bold text-rose-700 font-mono mt-0.5">
                  - C$ {currentShift.transferToPettyCash?.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-[11px] text-slate-500">
                Deducido del arqueo nocturno para cuadre exacto de efectivo.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  {lastClosedShift ? `Jornada Cerrada • ${lastClosedShift.date}` : 'Caja General Cerrada'}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {lastClosedShift ? 'Gaveta Cuadrada y Liquidada' : 'No Hay Turno Activo'}
                </h2>
                {lastClosedShift && (
                  <p className="text-xs text-slate-500">
                    Cierre realizado por <strong className="text-slate-700">{lastClosedShift.closedBy}</strong>{' '}
                    {lastClosedShift.closedAt && `a las ${new Date(lastClosedShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {lastClosedShift && (
                <>
                  <button
                    onClick={() => printThermalClosingTicket(lastClosedShift)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Reimprimir ticket de cierre"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ticket Cierre</span>
                  </button>
                  <button
                    onClick={() => setSelectedShiftForActa(lastClosedShift)}
                    className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-black text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Imprimir Acta Oficial B/N de Cierre (1 o 2 Hojas)"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Acta B/N</span>
                  </button>
                  <button
                    onClick={() => exportShiftToExcel(lastClosedShift, state)}
                    className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Exportar cierre a Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditClosing(lastClosedShift)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Corregir datos de ventas o cuadre de este cierre"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Corregir Cierre</span>
                  </button>
                </>
              )}

              <button
                onClick={onOpenShiftClick}
                className="px-4 py-2 rounded-lg bg-[#1c6856] hover:bg-[#155344] text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Turno de la Nueva Jornada</span>
              </button>
            </div>
          </div>

          {lastClosedShift ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-1 sm:grid-cols-4">
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Ventas Brutas del Día
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  C$ {(lastClosedShift.totalGrossSales || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-400">Efectivo + Tarjetas + PedidosYa</span>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Efectivo Físico en Gaveta
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  C$ {(lastClosedShift.totalClosingNIO || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  {lastClosedShift.totalClosingUSD ? (
                    <span className="text-[#1c6856] text-xs ml-1">+${lastClosedShift.totalClosingUSD}</span>
                  ) : null}
                </div>
                <span className="text-[11px] text-slate-400">Fondo remanente al cerrar</span>
              </div>

              <div className="p-4 space-y-1">
                <span className="text-[10px] font-semibold text-[#1c6856] uppercase tracking-wider block">
                  Utilidad Neta de la Jornada
                </span>
                <div className="text-xl font-bold text-[#1c6856] font-mono">
                  C$ {(lastClosedShift.dailyNetProfit || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-400">Ventas Brutas − Gastos Insumos</span>
              </div>

              <div className="p-4 space-y-1 bg-slate-50/70 sm:rounded-r-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Diagnóstico de Cuadre
                  </span>
                  <div className="mt-1">
                    {lastClosedShift.auditStatus === 'SQUARED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Cuadrado Exacto
                      </span>
                    ) : lastClosedShift.auditStatus === 'SHORTAGE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Faltante C$ {Math.abs(lastClosedShift.differenceNIO || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                        + C$ {lastClosedShift.differenceNIO?.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedShiftDetails(lastClosedShift)}
                  className="text-[11px] font-semibold text-[#1c6856] hover:underline text-left mt-2 cursor-pointer"
                >
                  Ver arqueo completo →
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              No hay turnos registrados aún. Pulsa el botón de arriba para abrir el primer turno de ventas.
            </p>
          )}
        </div>
      )}

      {/* Historial de Cierres Anteriores */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Historial de Cierres de Ventas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registro auditable de cada jornada con cuadre de efectivo, vouchers y PedidosYa
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por fecha o admin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="text-sm font-medium">No se han registrado cierres de caja todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3.5 px-5">Fecha</th>
                  <th className="py-3.5 px-4">Apertura</th>
                  <th className="py-3.5 px-4">Cierre</th>
                  <th className="py-3.5 px-4 text-right">Ventas Brutas</th>
                  <th className="py-3.5 px-4 text-right">Efectivo Físico</th>
                  <th className="py-3.5 px-4 text-center">Diagnóstico</th>
                  <th className="py-3.5 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map((sh) => {
                  const isSquared = sh.auditStatus === 'SQUARED';
                  const isShortage = sh.auditStatus === 'SHORTAGE';
                  const isSurplus = sh.auditStatus === 'SURPLUS';

                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {sh.date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {sh.openedBy}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-bold">
                        {sh.closedBy || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        C$ {(sh.totalGrossSales || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                        C$ {(sh.totalClosingNIO || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        {sh.totalClosingUSD ? (
                          <span className="text-emerald-700 ml-1 text-[11px] font-bold">
                            +${sh.totalClosingUSD}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isSquared && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cuadrado
                          </span>
                        )}
                        {isShortage && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {sh.differenceNIO?.toFixed(2)} C$
                          </span>
                        )}
                        {isSurplus && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            +{sh.differenceNIO?.toFixed(2)} C$
                          </span>
                        )}
                        {!sh.auditStatus && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditClosing(sh)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-800 transition cursor-pointer"
                            title="Editar o corregir valores de este cierre"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => printThermalClosingTicket(sh)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Imprimir ticket térmico"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedShiftForActa(sh)}
                            className="p-1.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-black text-white transition cursor-pointer"
                            title="Imprimir Acta Oficial B/N de este turno"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => exportShiftToExcel(sh, state)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-emerald-700 transition cursor-pointer"
                            title="Exportar a Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedShiftDetails(sh)}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            Ver Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Cierre Seleccionado */}
      {selectedShiftDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-150 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Detalle del Cierre — {selectedShiftDetails.date}
                </h3>
                <p className="text-xs text-slate-500">
                  Apertura: {selectedShiftDetails.openedBy} • Cierre: {selectedShiftDetails.closedBy}
                </p>
              </div>
              <button
                onClick={() => setSelectedShiftDetails(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Resumen numérico */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Ventas Efectivo</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  C$ {(selectedShiftDetails.salesCashSystem || 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Tarjetas Datáfonos</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  C$ {(selectedShiftDetails.totalCards || 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Delivery PedidosYa</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  C$ {(selectedShiftDetails.salesPedidosYa || 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Ventas Brutas</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  C$ {(selectedShiftDetails.totalGrossSales || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Desglose de Bancos */}
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs space-y-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-900 block">
                Desglose de Datáfonos por Banco:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono font-bold text-slate-800">
                <div>BAC: C$ {selectedShiftDetails.cardsBAC || 0}</div>
                <div>Fico: C$ {selectedShiftDetails.cardsFicohsa || 0}</div>
                <div>Banpro: C$ {selectedShiftDetails.cardsBanpro || 0}</div>
                <div>Lafise: C$ {selectedShiftDetails.cardsLafise || 0}</div>
              </div>
            </div>

            {/* Cuadre Final */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 block">Efectivo Físico en Gaveta</span>
                <span className="font-mono text-xl font-black text-slate-900">
                  C$ {(selectedShiftDetails.totalClosingNIO || 0).toFixed(2)}
                  {selectedShiftDetails.totalClosingUSD ? ` + $${selectedShiftDetails.totalClosingUSD}` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 block">Diagnóstico de Cuadre</span>
                <span className="font-mono font-black text-base">
                  {selectedShiftDetails.auditStatus === 'SQUARED' ? (
                    <span className="text-emerald-700">Exacto ✅</span>
                  ) : (
                    <span className="text-rose-700">Dif: C$ {selectedShiftDetails.differenceNIO?.toFixed(2)}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-between items-center gap-2 pt-2 flex-wrap">
              <button
                onClick={() => {
                  handleOpenEditClosing(selectedShiftDetails);
                  setSelectedShiftDetails(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-2xs"
              >
                <Edit3 className="w-4 h-4 text-amber-700" />
                <span>Corregir Valores de este Cierre</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printThermalClosingTicket(selectedShiftDetails)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Tique</span>
                </button>
                <button
                  onClick={() => setSelectedShiftDetails(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar / Corregir Cierre */}
      {editingShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-150 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-[#1c6856] border border-emerald-200">
                  <Edit3 className="w-5 h-5 text-[#1c6856]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Corregir Cierre de Turno ({editingShift.date})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajusta los valores de datáfonos, pedidos o efectivo si hubo un error al digitar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingShift(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Tarjetas por banco */}
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                <span className="font-black text-indigo-900 block uppercase tracking-wider text-[10px]">
                  Datáfonos por Banco (C$)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-rose-800 font-bold mb-0.5">BAC Credomatic</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cardsBAC}
                      onChange={(e) => setEditForm({ ...editForm, cardsBAC: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-rose-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-sky-800 font-bold mb-0.5">Banco Ficohsa</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cardsFicohsa}
                      onChange={(e) => setEditForm({ ...editForm, cardsFicohsa: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-sky-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-800 font-bold mb-0.5">Banpro Promerica</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cardsBanpro}
                      onChange={(e) => setEditForm({ ...editForm, cardsBanpro: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-emerald-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-amber-800 font-bold mb-0.5">Banco LAFISE</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.cardsLafise}
                      onChange={(e) => setEditForm({ ...editForm, cardsLafise: e.target.value })}
                      className="w-full p-2 bg-white rounded-lg border border-amber-200 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery y Efectivo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery PedidosYa (C$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.salesPedidosYa}
                    onChange={(e) => setEditForm({ ...editForm, salesPedidosYa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ventas Efectivo Sistema (C$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.salesCashSystem}
                    onChange={(e) => setEditForm({ ...editForm, salesCashSystem: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Propinas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Propinas Recaudadas (C$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.totalTipCollected}
                  onChange={(e) => setEditForm({ ...editForm, totalTipCollected: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas de Cierre</label>
                <input
                  type="text"
                  value={editForm.closingNotes}
                  onChange={(e) => setEditForm({ ...editForm, closingNotes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingShift(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditClosing}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar y Re-Cuadrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ajustar Fondo de Apertura del Turno Activo */}
      {adjustingOpeningShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-150 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Ajustar Fondo Inicial de Apertura
                </h3>
                <p className="text-xs text-slate-500">
                  Modifica los billetes contados si hubo una equivocación al abrir la gaveta.
                </p>
              </div>
              <button
                onClick={() => setAdjustingOpeningShift(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <CashDenominationsInput
                denominationsNIO={adjOpeningNIO}
                denominationsUSD={adjOpeningUSD}
                exchangeRate={adjExchangeRate}
                onChangeNIO={setAdjOpeningNIO}
                onChangeUSD={setAdjOpeningUSD}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Notas de corrección</label>
              <input
                type="text"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="Ej: Se corrigió conteo inicial de monedas..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="text-xs">
                <span className="text-slate-500">Nuevo Fondo: </span>
                <strong className="font-mono font-black text-[#1c6856] text-base">
                  C$ {(calculateTotalNIO(adjOpeningNIO) + calculateTotalUSD(adjOpeningUSD) * adjExchangeRate).toFixed(2)}
                </strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingOpeningShift(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustOpening}
                  className="px-5 py-2 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Nuevo Fondo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registrar Traspaso a Caja Chica (Punto 1) */}
      {transferModalOpen && currentShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-[#1c6856] text-white flex items-center justify-center font-bold shadow-sm">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Traspaso a Caja Chica
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trasladar efectivo de ventas hacia el fondo de compras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmTransferToPetty} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monto a Traspasar (Córdobas C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={transferAmount || ''}
                    onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-black font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Este dinero saldrá de la gaveta de ventas y se sumará automáticamente a la Caja Chica.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Motivo / Observación (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Para compra de verduras y carnes..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#1c6856] text-slate-900"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                <span className="font-bold block mb-0.5 text-slate-900">Registro Contable Doble:</span>
                <span>
                  Al confirmar, se registrará una salida en Caja General (deducida del cuadre nocturno) y un ingreso equivalente en la Caja Chica del día.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferAmount <= 0}
                  className="px-5 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirmar Traspaso C$ {transferAmount.toFixed(2)}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedShiftForActa && (
        <PrintOfficialActModal
          isOpen={!!selectedShiftForActa}
          onClose={() => setSelectedShiftForActa(null)}
          dateStr={selectedShiftForActa.date}
          onPrint={handlePrintActaForShift}
        />
      )}
    </div>
  );
};
