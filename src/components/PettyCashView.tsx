import React, { useState, useMemo, useEffect } from 'react';
import { AppState, ExpenseCategory, PaymentMethod, PettyCashShift, PettyCashTransaction } from '../types';
import {
  printThermalDailyExpensesTicket,
  printThermalSingleExpenseVoucher,
  printThermalPettyCashClosingAct,
  printOfficialActBN,
} from '../services/thermalPrint';
import {
  exportPettyCashExpensesToExcel,
  exportPettyCashClosingToExcel,
  exportPettyCashHistoryToExcel,
} from '../services/excelExport';
import { formatDateToFriendly } from '../services/storage';
import { getLocalTodayStr, addDaysToDateStr, getLocalDateTimeStr, extractLocalDateStr } from '../utils/dateUtils';
import {
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Calendar,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Unlock,
  History,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from 'lucide-react';

interface Props {
  state: AppState;
  onAddTransaction: (tx: PettyCashTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenPettyCashShift: (newShift: PettyCashShift) => void;
  onClosePettyCashShift: (closedShift: PettyCashShift) => void;
}

const CATEGORY_DEFINITIONS: {
  value: ExpenseCategory;
  label: string;
  emoji: string;
  badgeClass: string;
}[] = [
  { value: 'CARNES', label: 'Carnes', emoji: '🥩', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'POLLO', label: 'Pollo', emoji: '🍗', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'HIELO', label: 'Hielo', emoji: '🧊', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'BEBIDAS', label: 'Bebidas', emoji: '🥤', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'BEBIDAS_ALCOHOLICAS', label: 'Bebidas alcohólicas', emoji: '🍺', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'DELIVERYS_ACARREOS', label: 'Deliverys y acarreos', emoji: '🛵', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'FRUTAS_VEGETALES', label: 'Frutas / Vegetales', emoji: '🥗', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'SUPERMERCADO', label: 'Supermercado', emoji: '🛒', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'MERCADO', label: 'Mercado', emoji: '🏪', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'LACTEOS', label: 'Lácteos', emoji: '🧀', badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { value: 'PAGOS_PERSONAL', label: 'Pagos personal', emoji: '👥', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'OTROS', label: 'Otros', emoji: '📝', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
];

export const PettyCashView: React.FC<Props> = ({
  state,
  onAddTransaction,
  onDeleteTransaction,
  onOpenPettyCashShift,
  onClosePettyCashShift,
}) => {
  const todayStr = useMemo(() => getLocalTodayStr(), []);

  // Pestañas principales: Vista de Jornada Diaria vs Historial de Cierres
  const [activeTab, setActiveTab] = useState<'DAY_VIEW' | 'HISTORY'>('DAY_VIEW');

  // Jornada actualmente abierta (si existe)
  const currentOpenShift = state.currentPettyCashShift?.status === 'OPEN' ? state.currentPettyCashShift : null;

  // Fecha seleccionada para visualizar (por defecto la fecha del turno abierto de caja chica o general, o hoy)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (state.currentPettyCashShift && state.currentPettyCashShift.status === 'OPEN') {
      return state.currentPettyCashShift.date;
    }
    if (state.currentShift && state.currentShift.status === 'OPEN') {
      return state.currentShift.date;
    }
    return todayStr;
  });

  // Sincronizar fecha seleccionada cuando se abra o active un nuevo turno
  useEffect(() => {
    if (state.currentPettyCashShift?.status === 'OPEN') {
      setSelectedDate(state.currentPettyCashShift.date);
    } else if (state.currentShift?.status === 'OPEN') {
      setSelectedDate(state.currentShift.date);
    }
  }, [state.currentPettyCashShift?.status, state.currentPettyCashShift?.date, state.currentShift?.status, state.currentShift?.date]);

  // Identificar el turno correspondiente a la fecha seleccionada
  const selectedShift = useMemo<PettyCashShift | null>(() => {
    if (state.currentPettyCashShift && state.currentPettyCashShift.date === selectedDate) {
      return state.currentPettyCashShift;
    }
    return state.pettyCashShiftHistory.find((s) => s.date === selectedDate) || null;
  }, [state.currentPettyCashShift, state.pettyCashShiftHistory, selectedDate]);

  const isSelectedShiftOpen = selectedShift !== null && selectedShift.status === 'OPEN';
  const isSelectedShiftClosed = selectedShift !== null && selectedShift.status === 'CLOSED';

  // Navegación entre fechas
  const handlePrevDate = () => {
    setSelectedDate(addDaysToDateStr(selectedDate, -1));
  };

  const handleNextDate = () => {
    setSelectedDate(addDaysToDateStr(selectedDate, 1));
  };

  // Modales de ciclo diario
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);

  // Modales de movimientos
  const [modalType, setModalType] = useState<'EXPENSE' | 'INFLOW' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS');

  // Estado de Formulario de Apertura de Caja Chica
  const latestClosedShift = state.pettyCashShiftHistory[0] || null;
  const defaultPrevRemaining = useMemo(() => {
    if (latestClosedShift) {
      return latestClosedShift.actualCashCounted ?? latestClosedShift.expectedBalance ?? state.pettyCashBalance;
    }
    return state.pettyCashBalance || 0;
  }, [latestClosedShift, state.pettyCashBalance]);

  const [openShiftDate, setOpenShiftDate] = useState<string>(todayStr);
  const [openPreviousRemaining, setOpenPreviousRemaining] = useState<number>(0);
  const [openGeneralCashTransfer, setOpenGeneralCashTransfer] = useState<number>(0);
  const [openBossContribution, setOpenBossContribution] = useState<number>(0);
  const [openNotes, setOpenNotes] = useState<string>('');

  // Validar si la fecha a abrir ya tiene una jornada registrada
  const isDateAlreadyOpen = useMemo(() => {
    return state.currentPettyCashShift?.status === 'OPEN' && state.currentPettyCashShift.date === openShiftDate;
  }, [state.currentPettyCashShift, openShiftDate]);

  const isDateAlreadyClosed = useMemo(() => {
    return state.pettyCashShiftHistory.some((s) => s.date === openShiftDate);
  }, [state.pettyCashShiftHistory, openShiftDate]);

  // Estado de Formulario de Cierre de Caja Chica
  const [closingActualCash, setClosingActualCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Form State para Compra / Gasto
  const [amount, setAmount] = useState<number>(0);
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('CARNES');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [printVoucherOnSave, setPrintVoucherOnSave] = useState(false);

  // Form State para Fondeo / Ingreso
  const [inflowSource, setInflowSource] = useState<'TRASLADO_CAJA_GENERAL' | 'APORTE_JEFE'>('TRASLADO_CAJA_GENERAL');

  // Estados para Eliminación y Prevención de Duplicados
  const [txToDelete, setTxToDelete] = useState<PettyCashTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Transacciones de la fecha seleccionada
  const selectedDateTransactions = useMemo(() => {
    return state.pettyCashTransactions.filter((tx) => {
      if (tx.id.startsWith('pct-init-')) return false;
      if (selectedShift && tx.shiftId === selectedShift.id) return true;
      if (!tx.date) return false;
      return extractLocalDateStr(tx.date) === selectedDate;
    });
  }, [state.pettyCashTransactions, selectedShift, selectedDate]);

  // Totales de compras y fondeos de la fecha seleccionada
  const selectedDateCashExpenses = useMemo(() => {
    return selectedDateTransactions
      .filter((tx) => tx.type === 'EXPENSE' && (tx.method === 'CASH' || !tx.method))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedDateTransactions]);

  const selectedDateTransferExpenses = useMemo(() => {
    return selectedDateTransactions
      .filter((tx) => tx.type === 'EXPENSE' && tx.method === 'TRANSFER')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedDateTransactions]);

  const selectedDateCardExpenses = useMemo(() => {
    return selectedDateTransactions
      .filter((tx) => tx.type === 'EXPENSE' && tx.method === 'CARD')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedDateTransactions]);

  const selectedDateExpenses = useMemo(() => {
    return selectedDateCashExpenses + selectedDateTransferExpenses + selectedDateCardExpenses;
  }, [selectedDateCashExpenses, selectedDateTransferExpenses, selectedDateCardExpenses]);

  const selectedDateInflows = useMemo(() => {
    return selectedDateTransactions
      .filter((tx) => tx.type === 'INFLOW')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [selectedDateTransactions]);

  // Saldo inicial de la jornada seleccionada
  const selectedInitialBalance = selectedShift ? selectedShift.initialBalance : 0;

  // Saldo teórico esperado en la GAVETA FÍSICA (Fondo + Fondeos - Egresos Efectivo)
  const expectedSelectedBalance = useMemo(() => {
    if (!selectedShift) return 0;
    return parseFloat((selectedShift.initialBalance + selectedDateInflows - selectedDateCashExpenses).toFixed(2));
  }, [selectedShift, selectedDateInflows, selectedDateCashExpenses]);

  // Saldo físico en mano / al cierre de la jornada seleccionada
  const selectedFinalBalance = useMemo(() => {
    if (selectedShift?.status === 'CLOSED') {
      return selectedShift.actualCashCounted ?? selectedShift.expectedBalance ?? 0;
    }
    if (selectedShift?.status === 'OPEN') {
      return parseFloat((selectedShift.initialBalance + selectedDateInflows - selectedDateCashExpenses).toFixed(2));
    }
    return 0;
  }, [selectedShift, selectedDateInflows, selectedDateCashExpenses]);

  // Iniciar Apertura para una fecha específica
  const handleStartOpenShiftModal = (dateToOpen?: string) => {
    let targetDate = dateToOpen || todayStr;

    // Control de jornada previa huérfana
    if (currentOpenShift && currentOpenShift.date < targetDate) {
      alert(`Control Administrativo Obligatorio:\n\nLa jornada de Caja Chica de la fecha anterior (${currentOpenShift.date}) permanece abierta.\n\nPor favor realice el arqueo y cierre formal de esa jornada antes de abrir un nuevo día.`);
      setSelectedDate(currentOpenShift.date);
      return;
    }

    // Si la fecha ya está cerrada, sugerir la siguiente
    if (state.pettyCashShiftHistory.some((s) => s.date === targetDate)) {
      targetDate = addDaysToDateStr(targetDate, 1);
    }
    setOpenShiftDate(targetDate);
    setOpenPreviousRemaining(defaultPrevRemaining);
    setOpenGeneralCashTransfer(0);
    setOpenBossContribution(0);
    setOpenNotes('');
    setOpenShiftModalOpen(true);
  };

  // Confirmar Apertura Diaria
  const handleConfirmOpenShift = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDateAlreadyOpen) {
      alert(`Ya existe una jornada abierta para la fecha ${openShiftDate}. La regla de control es 1 apertura y 1 cierre por día.`);
      return;
    }

    if (isDateAlreadyClosed) {
      alert(`La fecha ${openShiftDate} ya cuenta con un cierre oficial registrado. Cada día comercial tiene 1 apertura y 1 cierre. Por favor selecciona una fecha posterior.`);
      return;
    }

    const totalInitial = parseFloat((openPreviousRemaining + openGeneralCashTransfer + openBossContribution).toFixed(2));
    if (totalInitial < 0) {
      alert('El fondo inicial de caja chica no puede ser negativo.');
      return;
    }

    const newShift: PettyCashShift = {
      id: `pc-shift-${openShiftDate}`,
      date: openShiftDate,
      status: 'OPEN',
      openedBy: state.activeAdminName,
      openedAt: new Date().toISOString(),
      previousDayRemaining: openPreviousRemaining,
      generalCashTransfer: openGeneralCashTransfer,
      bossContribution: openBossContribution,
      initialBalance: totalInitial,
      openingNotes: openNotes.trim() || undefined,
    };

    onOpenPettyCashShift(newShift);
    setSelectedDate(openShiftDate);
    setActiveTab('DAY_VIEW');
    setOpenShiftModalOpen(false);
  };

  // Iniciar Cierre de la Jornada
  const handleStartCloseShiftModal = () => {
    if (!selectedShift || selectedShift.status !== 'OPEN') return;
    setClosingActualCash(expectedSelectedBalance);
    setClosingNotes('');
    setCloseShiftModalOpen(true);
  };

  // Confirmar Cierre Diario de Caja Chica
  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    const diff = parseFloat((closingActualCash - expectedSelectedBalance).toFixed(2));
    const auditStatus = diff === 0 ? 'SQUARED' : diff < 0 ? 'SHORTAGE' : 'SURPLUS';

    const closedShift: PettyCashShift = {
      ...selectedShift,
      status: 'CLOSED',
      closedBy: state.activeAdminName,
      closedAt: new Date().toISOString(),
      totalExpenses: selectedDateExpenses,
      totalInflows: selectedDateInflows,
      expectedBalance: expectedSelectedBalance,
      actualCashCounted: closingActualCash,
      difference: diff,
      auditStatus,
      closingNotes: closingNotes.trim() || undefined,
    };

    onClosePettyCashShift(closedShift);
    printThermalPettyCashClosingAct(closedShift, selectedDateTransactions, state.activeAdminName);
    setCloseShiftModalOpen(false);
  };

  // Modales de Compra y Fondeo
  const handleOpenExpenseModal = () => {
    if (!isSelectedShiftOpen) {
      alert('Para registrar compras, la jornada debe estar abierta.');
      return;
    }
    setModalType('EXPENSE');
    setAmount(0);
    setVendor('');
    setCategory('CARNES');
    setMethod('CASH');
    setReceiptNumber('');
    setNotes('');
    setPrintVoucherOnSave(false);
  };

  const handleOpenInflowModal = () => {
    if (!isSelectedShiftOpen) {
      alert('Para ingresar fondos, la jornada debe estar abierta.');
      return;
    }
    setModalType('INFLOW');
    setAmount(0);
    setInflowSource('TRASLADO_CAJA_GENERAL');
    setNotes('');
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (amount <= 0) {
      alert('Por favor ingresa un monto mayor a C$ 0.00');
      return;
    }

    if (modalType === 'EXPENSE' && !vendor.trim()) {
      alert('Por favor indica qué se compró o a qué proveedor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalVendor =
        modalType === 'INFLOW'
          ? inflowSource === 'TRASLADO_CAJA_GENERAL'
            ? 'Traslado desde Caja General'
            : 'Depósito a Caja Chica (Aporte del Jefe)'
          : vendor.trim();

      const newTx: PettyCashTransaction = {
        id: `pct-${Date.now()}`,
        shiftId: selectedShift?.id || `pc-shift-${selectedDate}`,
        date: getLocalDateTimeStr(),
        type: modalType || 'EXPENSE',
        inflowSource: modalType === 'INFLOW' ? inflowSource : undefined,
        amount,
        method,
        vendor: finalVendor,
        category: modalType === 'INFLOW' ? 'OTROS' : category,
        receiptNumber: receiptNumber.trim() || undefined,
        registeredBy: state.activeAdminName,
        notes: notes.trim() || undefined,
      };

      onAddTransaction(newTx);

      if (modalType === 'EXPENSE' && printVoucherOnSave) {
        printThermalSingleExpenseVoucher(newTx);
      }

      setModalType(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteTx = () => {
    if (!txToDelete) return;
    onDeleteTransaction(txToDelete.id);
    setTxToDelete(null);
  };

  // Estructura de fila del Libro Diario Contable
  interface LedgerRow {
    id: string;
    isOpening?: boolean;
    date: string;
    hora: string;
    concepto: string;
    categoriaEmoji?: string;
    categoriaLabel?: string;
    vendor: string;
    notes?: string;
    receiptNumber?: string;
    tipoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | '-';
    montoTotalBanco: number | null;
    reembolsoCajaChica: number | null;
    gastosCajaChica: number | null;
    saldoGaveta: number;
    rawTx?: PettyCashTransaction;
  }

  // Transacciones con saldo acumulativo de gaveta calculado cronológicamente estilo Libro Diario
  const ledgerRows = useMemo(() => {
    const rows: LedgerRow[] = [];
    let runningSaldo = 0;

    // 1. Filas de Apertura de Caja
    if (selectedShift) {
      if (selectedShift.previousDayRemaining > 0) {
        runningSaldo = selectedShift.previousDayRemaining;
        rows.push({
          id: 'opening-prev-rem',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Fondo de caja anterior (Sobrante de ayer)',
          categoriaEmoji: '💼',
          vendor: 'Fondo de caja anterior (Sobrante de ayer)',
          tipoPago: '-',
          montoTotalBanco: null,
          reembolsoCajaChica: null,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });

        const depositoApertura = (selectedShift.bossContribution || 0) + (selectedShift.generalCashTransfer || 0);
        if (depositoApertura > 0) {
          runningSaldo += depositoApertura;
          rows.push({
            id: 'opening-deposito',
            isOpening: true,
            date: selectedShift.openedAt,
            hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
            concepto: 'Depósito a caja chica (Aporte inicial de apertura)',
            categoriaEmoji: '📥',
            vendor: 'Depósito a caja chica (Aporte inicial de apertura)',
            notes: selectedShift.openingNotes,
            tipoPago: 'EFECTIVO',
            montoTotalBanco: null,
            reembolsoCajaChica: depositoApertura,
            gastosCajaChica: null,
            saldoGaveta: runningSaldo,
          });
        }
      } else if (selectedShift.initialBalance > 0) {
        runningSaldo = selectedShift.initialBalance;
        rows.push({
          id: 'opening-initial',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Depósito / Fondo asignado de apertura',
          categoriaEmoji: '💼',
          vendor: 'Depósito / Fondo asignado de apertura',
          notes: selectedShift.openingNotes,
          tipoPago: 'EFECTIVO',
          montoTotalBanco: null,
          reembolsoCajaChica: selectedShift.initialBalance,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });
      }
    }

    // 2. Transacciones del día ordenadas cronológicamente
    const sorted = [...selectedDateTransactions]
      .filter((tx) => !tx.id.startsWith('pct-init-boss-') && !tx.id.startsWith('pct-init-gen-'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const tx of sorted) {
      const isExpense = tx.type === 'EXPENSE';
      const isTransfer = isExpense && tx.method === 'TRANSFER';
      const isCard = isExpense && tx.method === 'CARD';
      const isCashExpense = isExpense && (tx.method === 'CASH' || !tx.method);
      const isInflow = tx.type === 'INFLOW';

      let montoTotalBanco: number | null = null;
      let reembolsoCajaChica: number | null = null;
      let gastosCajaChica: number | null = null;

      if (isInflow) {
        reembolsoCajaChica = tx.amount;
        runningSaldo += tx.amount;
      } else if (isTransfer || isCard) {
        montoTotalBanco = tx.amount;
        // Transferencia bancaria y tarjeta no afectan la gaveta física
      } else if (isCashExpense) {
        gastosCajaChica = tx.amount;
        runningSaldo -= tx.amount;
      }

      const catDef = CATEGORY_DEFINITIONS.find((c) => c.value === tx.category);

      rows.push({
        id: tx.id,
        isOpening: false,
        date: tx.date,
        hora: new Date(tx.date).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
        concepto: tx.vendor,
        categoriaEmoji: catDef?.emoji || '📦',
        categoriaLabel: catDef?.label,
        vendor: tx.vendor,
        notes: tx.notes,
        receiptNumber: tx.receiptNumber,
        tipoPago: isTransfer ? 'TRANSFERENCIA' : isCard ? 'TARJETA' : 'EFECTIVO',
        montoTotalBanco,
        reembolsoCajaChica,
        gastosCajaChica,
        saldoGaveta: runningSaldo,
        rawTx: tx,
      });
    }

    return rows;
  }, [selectedShift, selectedDateTransactions]);

  // Filtrado de filas (incluyendo aperturas y movimientos)
  const filteredRows = useMemo(() => {
    return ledgerRows.filter((row) => {
      const matchSearch =
        !searchTerm.trim() ||
        row.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.notes && row.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (row.receiptNumber && row.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategoryFilter === 'TODOS' ||
        (row.isOpening && selectedCategoryFilter === 'INFLOW') ||
        (!row.isOpening && row.rawTx?.type === 'INFLOW' && selectedCategoryFilter === 'INFLOW') ||
        (!row.isOpening && row.rawTx?.type === 'EXPENSE' && row.rawTx.category === selectedCategoryFilter);

      return matchSearch && matchCategory;
    });
  }, [ledgerRows, searchTerm, selectedCategoryFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Principal */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Caja Chica
              </h1>
              {currentOpenShift ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Jornada Abierta • {currentOpenShift.date}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Sin Jornada Abierta Hoy
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Control diario estricto: 1 apertura y 1 cierre por cada día comercial.
            </p>
          </div>
        </div>

        {/* Botón de Apertura de Nuevo Día */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!currentOpenShift ? (
            <button
              onClick={() => handleStartOpenShiftModal()}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Unlock className="w-4 h-4 stroke-[2.5]" />
              <span>+ Abrir Nueva Jornada (Día)</span>
            </button>
          ) : (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fondo en Mano Hoy</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                C$ {state.pettyCashBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Selector de Pestañas Principales */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('DAY_VIEW')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'DAY_VIEW'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Vista por Día Comercial</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Cierres Diarios</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {state.pettyCashShiftHistory.length}
            </span>
          </button>
        </div>

        {/* Acciones de Reporte y Excel de la Fecha Seleccionada */}
        {activeTab === 'DAY_VIEW' && selectedShift && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                printThermalDailyExpensesTicket(
                  selectedDate,
                  selectedDateTransactions,
                  selectedFinalBalance,
                  selectedShift.closedBy || selectedShift.openedBy
                )
              }
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Imprimir resumen A4 de este día"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Reporte A4</span>
            </button>

            <button
              onClick={() =>
                exportPettyCashExpensesToExcel(
                  selectedDate,
                  selectedDateTransactions,
                  selectedFinalBalance,
                  selectedShift.closedBy || selectedShift.openedBy
                )
              }
              className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Descargar compras de este día en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. VISTA POR DÍA COMERCIAL */}
      {activeTab === 'DAY_VIEW' && (
        <div className="space-y-6">
          {/* Alerta Formal de Jornada Anterior Pendiente de Cierre */}
          {currentOpenShift && currentOpenShift.date < todayStr && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
                    <span>Control de Jornada: Cierre Pendiente del {currentOpenShift.date}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-200 text-amber-900 font-bold uppercase">
                      Obligatorio
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    La jornada comercial de Caja Chica del <strong>{currentOpenShift.date}</strong> no fue cerrada. Debe realizar el arqueo y cierre correspondiente para dar paso formal a las compras de hoy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(currentOpenShift.date);
                    handleStartCloseShiftModal();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Cerrar Jornada del {currentOpenShift.date}</span>
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE NAVEGACIÓN Y SELECCIÓN DE DÍAS */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePrevDate}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Ver día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-black text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDate}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Ver día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Ir a Hoy
                </button>
              )}
            </div>

            {/* Badge de Estado del Día Seleccionado */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500">
                {formatDateToFriendly(selectedDate)}:
              </span>
              {isSelectedShiftOpen && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Jornada en Operación (Abierta)
                </span>
              )}
              {isSelectedShiftClosed && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  Jornada Cerrada y Liquidada
                </span>
              )}
              {!selectedShift && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Sin Apertura Registrada
                </span>
              )}
            </div>
          </div>

          {/* CASO A: SI LA FECHA SELECCIONADA ESTÁ CERRADA */}
          {isSelectedShiftClosed && selectedShift && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        Jornada Cerrada del {selectedDate}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                          selectedShift.auditStatus === 'SQUARED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : selectedShift.auditStatus === 'SHORTAGE'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300'
                        }`}
                      >
                        {selectedShift.auditStatus === 'SQUARED'
                          ? 'CUADRADO EXACTO ✅'
                          : selectedShift.auditStatus === 'SHORTAGE'
                          ? `FALTANTE 🔴 (C$ ${Math.abs(selectedShift.difference || 0).toFixed(2)})`
                          : `SOBRANTE 🔵 (+C$ ${(selectedShift.difference || 0).toFixed(2)})`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Apertura por <strong className="text-slate-700">{selectedShift.openedBy}</strong> • Cierre por{' '}
                      <strong className="text-slate-800">{selectedShift.closedBy || 'N/A'}</strong> a las{' '}
                      {selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const dayTransactions = selectedDateTransactions
                        .filter((t) => t.type === 'EXPENSE')
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

                      const fondoInicial = selectedShift.initialBalance;
                      const expensesCash = dayTransactions.filter((t) => t.metodo === 'Efectivo').reduce((sum, t) => sum + t.monto, 0);
                      const expensesTransf = dayTransactions.filter((t) => t.metodo === 'Transferencia').reduce((sum, t) => sum + t.monto, 0);
                      const expensesTotal = expensesCash + expensesTransf;
                      const saldoRemanente = selectedShift.actualCashCounted ?? (fondoInicial - expensesCash);

                      printOfficialActBN({
                        date: selectedDate,
                        modo: 'CHICA',
                        salesCash: 0,
                        cardsBAC: 0,
                        cardsFicohsa: 0,
                        cardsBanpro: 0,
                        cardsLafise: 0,
                        totalCards: 0,
                        salesPedidosYa: 0,
                        totalGross: 0,
                        netProfit: 0,
                        marginPercent: 0,
                        responsableCaja: selectedShift.closedBy || selectedShift.openedBy || state.activeAdminName,
                        fondoInicial,
                        expensesCash,
                        expensesTransf,
                        expensesTotal,
                        saldoRemanente,
                        responsableCajaChica: selectedShift.closedBy || selectedShift.openedBy || state.activeAdminName,
                        transactions: dayTransactions,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-900 bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                    title="Imprimir Acta Oficial de Caja Chica y Compras en 1 Hoja B/N"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>🖨️ Acta Oficial B/N</span>
                  </button>

                  <button
                    onClick={() => printThermalPettyCashClosingAct(selectedShift, selectedDateTransactions, selectedShift.closedBy || state.activeAdminName)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Acta de Cierre A4</span>
                  </button>

                  <button
                    onClick={() => exportPettyCashClosingToExcel(selectedShift, selectedDateTransactions)}
                    className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar Acta Excel</span>
                  </button>

                  {!currentOpenShift && (
                    <button
                      onClick={() => handleStartOpenShiftModal()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/25 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>+ Abrir Nuevo Día</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Resumen del Arqueo de Cierre */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fondo Apertura</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    C$ {selectedShift.initialBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Compras del Día</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    - C$ {(selectedShift.totalExpenses || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Teórico Esperado</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    C$ {(selectedShift.expectedBalance || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Efectivo Físico Contado</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    C$ {(selectedShift.actualCashCounted || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CASO B: SI LA FECHA SELECCIONADA ESTÁ ABIERTA */}
          {isSelectedShiftOpen && selectedShift && (
            <div className="bg-gradient-to-r from-emerald-50 via-white to-amber-50 rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  Jornada en Operación Activa
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Caja Chica del {selectedDate} — Lista para compras
                </h3>
                <p className="text-xs text-slate-500">
                  Al terminar las compras del día, realiza el arqueo físico y cierre diario.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleStartCloseShiftModal}
                  className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs flex items-center gap-2 transition shadow-md shadow-rose-600/25 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Cerrar Caja Chica del Día</span>
                </button>
              </div>
            </div>
          )}

          {/* CASO C: SI LA FECHA NO TIENE NINGUNA JORNADA REGISTRADA */}
          {!selectedShift && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Sin Jornada Registrada para el {selectedDate}
                </h3>
                <p className="text-xs text-slate-500">
                  Cada día de trabajo tiene 1 apertura y 1 cierre. Puedes abrir la Caja Chica para este día comercial.
                </p>
              </div>
              <div>
                <button
                  onClick={() => handleStartOpenShiftModal(selectedDate)}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 mx-auto shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>+ Iniciar Apertura de Caja Chica para este Día</span>
                </button>
              </div>
            </div>
          )}

          {/* TARJETAS DE MÉTRICAS DEL DÍA (VISIBLES TANTO SI ESTÁ ABIERTO COMO SI ESTÁ CERRADO) */}
          {selectedShift && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Fondo Asignado */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      1. Fondo Asignado
                    </span>
                    <span className="text-xs font-bold text-slate-500">💵 Apertura</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    C$ {(selectedInitialBalance + selectedDateInflows).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    <span>Fondo Inicial: C$ {selectedInitialBalance.toFixed(0)}</span>
                    {selectedDateInflows > 0 && <span> + Inyecciones: C$ {selectedDateInflows.toFixed(0)}</span>}
                  </div>
                </div>

                {/* 2. Salidas de Gaveta (Efectivo) */}
                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                      2. Egresos en Efectivo
                    </span>
                    <span className="text-xs font-bold text-rose-600">🔴 Gaveta</span>
                  </div>
                  <div className="text-2xl font-black text-rose-600 font-mono">
                    - C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium">
                    {selectedDateTransactions.filter((t) => t.type === 'EXPENSE' && t.method === 'CASH').length} pagos en efectivo físico
                  </div>
                </div>

                {/* 3. Pagos por Banco y Tarjetas */}
                <div className="bg-white p-5 rounded-2xl border border-sky-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
                      3. Banco & Tarjetas
                    </span>
                    <span className="text-xs font-bold text-sky-700">💳 No Toca Gaveta</span>
                  </div>
                  <div className="text-2xl font-black text-sky-800 font-mono">
                    C$ {(selectedDateTransferExpenses + selectedDateCardExpenses).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-sky-600 font-medium">
                    Transf: C$ {selectedDateTransferExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} • Tarjeta: C$ {selectedDateCardExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* 4. Efectivo Físico en Gaveta */}
                <div className="bg-emerald-50/90 p-5 rounded-2xl border border-emerald-300 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      {isSelectedShiftClosed ? '4. Efectivo al Cierre' : '4. Efectivo en Gaveta'}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">✅ En Mano</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-950 font-mono">
                    C$ {selectedFinalBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-semibold">
                    {isSelectedShiftClosed ? 'Conteo físico verificado al cerrar' : 'Dinero físico actual en caja'}
                  </div>
                </div>
              </div>

              {/* Barra Informativa de Egresos Totales Consolidados */}
              <div className="bg-slate-100/90 rounded-xl px-4 py-2.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-800">Total Compras del Día:</span>
                  <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                    C$ {selectedDateExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    (C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} en Efectivo + C$ {selectedDateTransferExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} Transf. + C$ {selectedDateCardExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} Tarjeta)
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <span>💡</span>
                  <span>Pagos por banco y tarjeta no restan de la gaveta de billetes físicos.</span>
                </div>
              </div>
            </div>
          )}

          {/* BOTONES DE REGISTRO DE MOVIMIENTOS (SOLO CUANDO EL DÍA ESTÁ ABIERTO) */}
          {isSelectedShiftOpen && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-bold text-slate-700">
                Registrar movimientos para la jornada de hoy ({selectedDate}):
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOpenExpenseModal}
                  className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 transition cursor-pointer"
                >
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Registrar Compra / Gasto</span>
                </button>

                <button
                  onClick={handleOpenInflowModal}
                  className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Ingresar Dinero / Fondeo</span>
                </button>
              </div>
            </div>
          )}

          {/* TABLA DE COMPRAS Y MOVIMIENTOS DEL DÍA SELECCIONADO (PERMANECE SIEMPRE VISIBLE) */}
          {selectedShift && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>Listado de Compras del Día ({selectedDate})</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {selectedDateTransactions.length} registros
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const dayTransactions = selectedDateTransactions
                      .filter((t) => t.type === 'EXPENSE')
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

                    const fondoInicial = selectedShift?.initialBalance || 2000;
                    const expensesCash = dayTransactions.filter((t) => t.metodo === 'Efectivo').reduce((sum, t) => sum + t.monto, 0);
                    const expensesTransf = dayTransactions.filter((t) => t.metodo === 'Transferencia').reduce((sum, t) => sum + t.monto, 0);
                    const expensesTotal = expensesCash + expensesTransf;
                    const saldoRemanente = fondoInicial - expensesCash;

                    printOfficialActBN({
                      date: selectedDate,
                      modo: 'CHICA',
                      salesCash: 0,
                      cardsBAC: 0,
                      cardsFicohsa: 0,
                      cardsBanpro: 0,
                      cardsLafise: 0,
                      totalCards: 0,
                      salesPedidosYa: 0,
                      totalGross: 0,
                      netProfit: 0,
                      marginPercent: 0,
                      responsableCaja: selectedShift?.closedBy || selectedShift?.openedBy || state.activeAdminName,
                      fondoInicial,
                      expensesCash,
                      expensesTransf,
                      expensesTotal,
                      saldoRemanente,
                      responsableCajaChica: selectedShift?.closedBy || selectedShift?.openedBy || state.activeAdminName,
                      transactions: dayTransactions,
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-900 bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                  title="Imprimir Acta Oficial de Caja Chica y Detalle de Compras en 1 Hoja B/N"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>🖨️ Imprimir Caja Chica (1 Hoja B/N)</span>
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por proveedor, producto, factura o notas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedCategoryFilter('TODOS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                      selectedCategoryFilter === 'TODOS'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos ({selectedDateTransactions.length})
                  </button>
                  {CATEGORY_DEFINITIONS.slice(0, 5).map((cat) => {
                    const count = selectedDateTransactions.filter((tx) => tx.type === 'EXPENSE' && tx.category === cat.value).length;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategoryFilter(cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedCategoryFilter === cat.value
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.emoji} {cat.label} {count > 0 && `(${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabla Detallada Estilo Excel / Libro Diario */}
              <div className="overflow-x-auto border-2 border-slate-300 rounded-xl bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-black uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center w-14">Hora</th>
                      <th className="py-2.5 px-4 border-r border-slate-300 min-w-[230px]">Concepto</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-center min-w-[130px]">TIPO DE PAGO</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[125px] bg-sky-50/60">MONTO TOTAL</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[130px] bg-emerald-50/60">Reemb. A Caja Chica</th>
                      <th className="py-2.5 px-3 border-r border-slate-300 text-right min-w-[125px] bg-rose-50/60">Gastos Caja Ch.</th>
                      <th className="py-2.5 px-4 border-r border-slate-300 text-right min-w-[135px] bg-amber-50/70 font-black text-slate-900">Saldo</th>
                      <th className="py-2.5 px-3 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                          No hay movimientos registrados para este día.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isTransf = row.tipoPago === 'TRANSFERENCIA';
                        const isCard = row.tipoPago === 'TARJETA';

                        return (
                          <tr
                            key={row.id}
                            className={`transition-colors border-b border-slate-200 ${
                              row.isOpening
                                ? 'bg-amber-50/40 font-semibold'
                                : isTransf
                                ? 'bg-sky-50/20 hover:bg-sky-50/40'
                                : isCard
                                ? 'bg-purple-50/20 hover:bg-purple-50/40'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-center text-[11px] text-slate-500">
                              {row.hora}
                            </td>
                            <td className="py-2.5 px-4 border-r border-slate-200 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.categoriaEmoji && <span>{row.categoriaEmoji}</span>}
                                <span>{row.vendor}</span>
                              </div>
                              {row.notes && (
                                <div className="text-[10px] font-normal text-slate-500 mt-0.5 truncate max-w-xs">
                                  {row.notes}
                                  {row.receiptNumber && (
                                    <span className="ml-1.5 font-mono text-slate-400">Ref: #{row.receiptNumber}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-center font-bold text-[11px]">
                              {row.isOpening ? (
                                row.tipoPago === '-' ? (
                                  <span className="text-slate-400 font-mono">-</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                                    💵 Efectivo
                                  </span>
                                )
                              ) : isTransf ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300">
                                  <span>🏦</span>
                                  <span>Transferencia</span>
                                </span>
                              ) : isCard ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300">
                                  <span>💳</span>
                                  <span>Tarjeta</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                                  <span>💵</span>
                                  <span>Efectivo</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-[12px] bg-sky-50/20 text-sky-900">
                              {row.montoTotalBanco !== null ? (
                                `C$ ${row.montoTotalBanco.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-[12px] bg-emerald-50/20 text-emerald-800">
                              {row.reembolsoCajaChica !== null ? (
                                `C$ ${row.reembolsoCajaChica.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-[12px] bg-rose-50/20 text-rose-800">
                              {row.gastosCajaChica !== null ? (
                                `C$ ${row.gastosCajaChica.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 border-r border-slate-200 text-right font-mono font-black text-sm bg-amber-50/30 text-slate-900">
                              C$ {row.saldoGaveta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.isOpening ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-200">
                                  Apertura
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  {row.rawTx?.type === 'EXPENSE' && (
                                    <button
                                      onClick={() => row.rawTx && printThermalSingleExpenseVoucher(row.rawTx)}
                                      className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition inline-flex items-center gap-1 text-[10px] font-bold shadow-xs cursor-pointer"
                                      title="Imprimir Vale A4"
                                    >
                                      <Printer className="w-3 h-3 text-slate-500" />
                                      <span>Vale</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => row.rawTx && setTxToDelete(row.rawTx)}
                                    className="p-1 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition inline-flex items-center justify-center text-[11px] font-bold shadow-xs cursor-pointer"
                                    title="Eliminar este movimiento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Fila de Totales estilo Balance de Excel */}
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-400 text-slate-900 font-black text-xs">
                      <td colSpan={3} className="py-3 px-4 border-r border-slate-300 text-right uppercase tracking-wider">
                        TOTALES DEL DÍA:
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-mono text-[13px] bg-sky-100/70 text-sky-950 font-black">
                        C$ {selectedDateTransferExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-mono text-[13px] bg-emerald-100/70 text-emerald-950 font-black">
                        C$ {(selectedInitialBalance + selectedDateInflows).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-right font-mono text-[13px] bg-rose-100/70 text-rose-950 font-black">
                        C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-300 text-right font-mono text-base bg-emerald-200/90 text-emerald-950 font-black ring-2 ring-emerald-500/50">
                        C$ {expectedSelectedBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center bg-slate-100 text-[10px] text-slate-500 font-bold">
                        Arqueo
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. VISTA: HISTORIAL DE CIERRES DIARIOS */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Historial de Cierres Diarios de Caja Chica
              </h2>
              <p className="text-xs text-slate-500">
                Registro de cada jornada cerrada con su arqueo físico, diagnóstico y opción de ver compras detalladas.
              </p>
            </div>

            {state.pettyCashShiftHistory.length > 0 && (
              <button
                onClick={() => exportPettyCashHistoryToExcel(state.pettyCashShiftHistory)}
                className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Descargar historial completo de cierres en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Historial a Excel</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Fecha Jornada</th>
                  <th className="py-3 px-4">Apertura</th>
                  <th className="py-3 px-4">Cierre</th>
                  <th className="py-3 px-4 text-right">Fondo Inicial</th>
                  <th className="py-3 px-4 text-right">Compras Totales</th>
                  <th className="py-3 px-4 text-right">Saldo Final Físico</th>
                  <th className="py-3 px-4 text-center">Diagnóstico</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.pettyCashShiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                      Aún no hay jornadas cerradas en el historial. Al realizar el primer cierre diario aparecerá aquí.
                    </td>
                  </tr>
                ) : (
                  state.pettyCashShiftHistory.map((hShift) => {
                    const isSquared = hShift.auditStatus === 'SQUARED';
                    const isShortage = hShift.auditStatus === 'SHORTAGE';

                    return (
                      <tr key={hShift.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {hShift.date}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-bold text-slate-800">{hShift.openedBy}</span>
                          <div className="text-[10px] text-slate-400">
                            {new Date(hShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-bold text-slate-800">{hShift.closedBy || 'N/A'}</span>
                          <div className="text-[10px] text-slate-400">
                            {hShift.closedAt ? new Date(hShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          C$ {hShift.initialBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          - C$ {(hShift.totalExpenses || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          C$ {(hShift.actualCashCounted || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              isSquared
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : isShortage
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}
                          >
                            {isSquared
                              ? 'CUADRADO ✅'
                              : isShortage
                              ? `FALTANTE 🔴 (C$ ${Math.abs(hShift.difference || 0).toFixed(2)})`
                              : `SOBRANTE 🔵 (+C$ ${(hShift.difference || 0).toFixed(2)})`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Botón para abrir y ver ese día en la vista principal */}
                            <button
                              onClick={() => {
                                setSelectedDate(hShift.date);
                                setActiveTab('DAY_VIEW');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Ver compras y detalle completo de este día"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Ver Día</span>
                            </button>

                            <button
                              onClick={() => {
                                const shiftTxs = state.pettyCashTransactions.filter(
                                  (t) => t.shiftId === hShift.id || (t.date && extractLocalDateStr(t.date) === hShift.date)
                                );
                                printThermalPettyCashClosingAct(hShift, shiftTxs, hShift.closedBy || state.activeAdminName);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Reimprimir Acta A4 del cierre"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Acta A4</span>
                            </button>

                            <button
                              onClick={() => {
                                const shiftTxs = state.pettyCashTransactions.filter(
                                  (t) => t.shiftId === hShift.id || (t.date && extractLocalDateStr(t.date) === hShift.date)
                                );
                                exportPettyCashClosingToExcel(hShift, shiftTxs);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Descargar este cierre en Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Excel</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL: APERTURA DE CAJA CHICA DEL DÍA */}
      {openShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Apertura Diaria de Caja Chica</h3>
                  <p className="text-xs text-slate-500">Regla estricta: 1 apertura y 1 cierre por cada día comercial</p>
                </div>
              </div>
              <button
                onClick={() => setOpenShiftModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOpenShift} className="space-y-4">
              {/* Selección de Fecha y Responsable */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Fecha Comercial del Día *
                  </label>
                  <input
                    type="date"
                    required
                    value={openShiftDate}
                    onChange={(e) => setOpenShiftDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Abre la Jornada</span>
                  <span className="font-extrabold text-slate-800 text-sm block pt-1">{state.activeAdminName}</span>
                </div>
              </div>

              {/* Advertencia si la fecha ya está cerrada */}
              {isDateAlreadyClosed && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Fecha Ya Cerrada:</strong>
                    La fecha <strong>{openShiftDate}</strong> ya fue cerrada definitivamente. No se pueden duplicar aperturas en el mismo día. Por favor elige la siguiente fecha de trabajo.
                  </div>
                </div>
              )}

              {/* Advertencia si la fecha ya está abierta */}
              {isDateAlreadyOpen && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Jornada Ya Abierta:</strong>
                    La fecha <strong>{openShiftDate}</strong> ya se encuentra en operación activa.
                  </div>
                </div>
              )}

              {/* 1. Fondo del Día Anterior con Corroboración Obligatoria */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Fondo del Día Anterior (Conteo Físico) *
                  </label>
                  {latestClosedShift && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Esperado según cierre ({latestClosedShift.date}):{' '}
                      <strong className="font-mono text-slate-800">C$ {defaultPrevRemaining.toFixed(2)}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={openPreviousRemaining || ''}
                      onChange={(e) => setOpenPreviousRemaining(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                    />
                  </div>

                  {latestClosedShift && (
                    <button
                      type="button"
                      onClick={() => setOpenPreviousRemaining(defaultPrevRemaining)}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
                      title="Cargar saldo reportado en el cierre anterior como referencia"
                    >
                      Cargar C$ {defaultPrevRemaining.toFixed(2)}
                    </button>
                  )}
                </div>

                {/* Semáforo de Corroboración */}
                {openPreviousRemaining > 0 && latestClosedShift && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      Math.abs(openPreviousRemaining - defaultPrevRemaining) < 0.5
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : openPreviousRemaining < defaultPrevRemaining
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}
                  >
                    {Math.abs(openPreviousRemaining - defaultPrevRemaining) < 0.5 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Conteo físico conforme: Coincide exactamente con el cierre de ayer.</span>
                      </>
                    ) : openPreviousRemaining < defaultPrevRemaining ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Faltante al recibir: Faltan C$ {(defaultPrevRemaining - openPreviousRemaining).toFixed(2)} respecto al cierre anterior.
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Sobrante al recibir: Hay C$ {(openPreviousRemaining - defaultPrevRemaining).toFixed(2)} adicionales respecto al cierre anterior.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Traslado de General */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2. Traslado de General (Determinado por el Administrador)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openGeneralCashTransfer || ''}
                    onChange={(e) => setOpenGeneralCashTransfer(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Monto libre que define el administrador si se pasa dinero de las ventas de Caja General a Caja Chica (por defecto 0.00).
                </span>
              </div>

              {/* 3. Depósito a Caja Chica (lo del jefe) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3. Depósito a Caja Chica (es lo del jefe) [Opcional]
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openBossContribution || ''}
                    onChange={(e) => setOpenBossContribution(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Dinero aportado o depositado por el jefe para compras.
                </span>
              </div>

              {/* Resumen Total Fondo Inicial */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Fondo Inicial para Compras
                  </span>
                  <span className="text-xs text-emerald-700">Fondo Día Anterior + Traslado General + Depósito Caja Chica</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 font-mono">
                  C$ {(openPreviousRemaining + openGeneralCashTransfer + openBossContribution).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Observaciones de Apertura (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se inicia compras de fin de semana..."
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenShiftModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDateAlreadyClosed || isDateAlreadyOpen}
                  className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer ${
                    isDateAlreadyClosed || isDateAlreadyOpen
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                  }`}
                >
                  Confirmar Apertura de Caja Chica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CIERRE DIARIO DE CAJA CHICA */}
      {closeShiftModalOpen && selectedShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Cierre Diario de Caja Chica</h3>
                  <p className="text-xs text-slate-500">Conciliación de gastos y arqueo físico del {selectedShift.date}</p>
                </div>
              </div>
              <button
                onClick={() => setCloseShiftModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCloseShift} className="space-y-4">
              {/* Resumen Financiero del Día */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Fondo Inicial del Día:</span>
                  <span className="font-mono font-bold text-slate-800">
                    C$ {selectedShift.initialBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">(+) Fondeos Extras Hoy:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    + C$ {selectedDateInflows.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">(-) Total Compras Hoy ({selectedDateTransactions.filter((t) => t.type === 'EXPENSE').length}):</span>
                  <span className="font-mono font-bold text-rose-700">
                    - C$ {selectedDateExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm">
                  <span className="text-slate-900">Saldo Teórico en Gaveta:</span>
                  <span className="font-mono text-slate-900">
                    C$ {expectedSelectedBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Conteo Físico Real */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Efectivo Físico Contado en Gaveta de Compras (C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={closingActualCash || ''}
                    onChange={(e) => setClosingActualCash(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-black font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Diagnóstico de Cuadre en Vivo */}
              {(() => {
                const diff = parseFloat((closingActualCash - expectedSelectedBalance).toFixed(2));
                const isSquared = diff === 0;
                const isShortage = diff < 0;

                return (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isSquared
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : isShortage
                        ? 'bg-rose-50 border-rose-300 text-rose-900'
                        : 'bg-blue-50 border-blue-300 text-blue-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSquared ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {isSquared
                          ? 'Caja Chica Cuadrada Exacta'
                          : isShortage
                          ? 'Faltante en Gaveta'
                          : 'Sobrante en Gaveta'}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-black">
                      {isSquared ? 'C$ 0.00' : `${diff > 0 ? '+' : ''}C$ ${diff.toFixed(2)}`}
                    </span>
                  </div>
                );
              })()}

              {/* Notas de Cierre */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Observaciones de Cierre
                </label>
                <input
                  type="text"
                  placeholder="Ej: Saldo pasa intacto para compras de mañana..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-slate-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCloseShiftModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const diff = parseFloat((closingActualCash - expectedSelectedBalance).toFixed(2));
                      const auditStatus = diff === 0 ? 'SQUARED' : diff < 0 ? 'SHORTAGE' : 'SURPLUS';
                      const previewShift: PettyCashShift = {
                        ...selectedShift,
                        status: 'CLOSED',
                        closedBy: state.activeAdminName,
                        closedAt: new Date().toISOString(),
                        totalExpenses: selectedDateExpenses,
                        totalInflows: selectedDateInflows,
                        expectedBalance: expectedSelectedBalance,
                        actualCashCounted: closingActualCash,
                        difference: diff,
                        auditStatus,
                        closingNotes: closingNotes.trim() || undefined,
                      };
                      exportPettyCashClosingToExcel(previewShift, selectedDateTransactions);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Exportar acta de cierre actual a Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar a Excel</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Confirmar Cierre e Imprimir Acta A4</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: REGISTRAR COMPRA / GASTO */}
      {modalType === 'EXPENSE' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Registrar Compra / Gasto</h3>
                  <p className="text-xs text-slate-500">Jornada de {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* Monto */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Monto del Gasto (Córdobas C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-black font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Rubro / Categoría *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {CATEGORY_DEFINITIONS.map((cat) => (
                    <button
                      type="button"
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                        category === cat.value
                          ? 'bg-rose-50 border-rose-400 text-rose-900 font-extrabold ring-2 ring-rose-400/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-[11px] truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proveedor / Concepto */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  ¿Qué se compró o a quién? (Proveedor / Detalle) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lomo de res, 10 bolsas de hielo, Verduras del mercado..."
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              {/* Forma de Pago - Selector Visual de 3 Métodos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  ¿Cómo se pagó esta compra? (Método de Pago) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setMethod('CASH')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      method === 'CASH'
                        ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">💵</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">Efectivo</div>
                      <div className="text-[10px] text-rose-700 font-bold mt-0.5">🔴 Resta gaveta física</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('TRANSFER')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      method === 'TRANSFER'
                        ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">🏦</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">Transferencia</div>
                      <div className="text-[10px] text-sky-700 font-bold mt-0.5">🟢 Banco (no toca gaveta)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('CARD')}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      method === 'CARD'
                        ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">💳</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">Tarjeta</div>
                      <div className="text-[10px] text-purple-700 font-bold mt-0.5">🔵 POS/Banco (no toca gaveta)</div>
                    </div>
                  </button>
                </div>

                {/* Indicador de Impacto en Efectivo Físico */}
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between mb-3 ${
                    method === 'CASH'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : method === 'TRANSFER'
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-purple-50 border-purple-300 text-purple-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {method === 'CASH' ? '🔴 Impacto en gaveta física:' : '🟢 Impacto en gaveta física:'}
                  </span>
                  <span className="font-mono font-black text-sm">
                    {method === 'CASH' ? `- C$ ${amount.toFixed(2)}` : 'C$ 0.00 (Pago electrónico / banco)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    No. Factura / Recibo / Ref. Transf. / Voucher (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      method === 'TRANSFER'
                        ? 'Ej: Transf. #9482 o Factura #4821'
                        : method === 'CARD'
                        ? 'Ej: Voucher POS #8412 o Factura'
                        : 'Ej: #4821'
                    }
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              </div>

              {/* Selector de Recibo / Vale Impreso */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/90 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ¿Necesitas comprobante / Vale A4 impreso?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPrintVoucherOnSave(false)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      !printVoucherOnSave
                        ? 'bg-white border-slate-400 text-slate-900 shadow-xs ring-2 ring-slate-400/20'
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <span className="text-lg">📄</span>
                    <div>
                      <div className="text-xs font-black">No imprimir recibo</div>
                      <div className="text-[11px] text-slate-500 leading-tight">El proveedor ya trajo factura física</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintVoucherOnSave(true)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                      printVoucherOnSave
                        ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs ring-2 ring-rose-400/20'
                        : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <Printer className={`w-4 h-4 mt-0.5 ${printVoucherOnSave ? 'text-rose-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-black">🖨️ Sí, Imprimir Vale A4</div>
                      <div className="text-[11px] text-slate-500 leading-tight">Para respaldo físico</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setPrintVoucherOnSave(false)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      !printVoucherOnSave
                        ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar sin Recibo'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setPrintVoucherOnSave(true)}
                    className={`px-4 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      printVoucherOnSave
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 ring-2 ring-rose-600/30'
                        : 'bg-slate-600 hover:bg-slate-700'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Guardando...' : 'Guardar e Imprimir Vale A4'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: INGRESAR DINERO / FONDEO */}
      {modalType === 'INFLOW' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Ingresar Dinero / Fondeo</h3>
                  <p className="text-xs text-slate-500">Inyectar saldo para compras del {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Monto a Ingresar (Córdobas C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3.5 text-2xl font-black font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Selector de Origen */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  ¿De dónde proviene este dinero? *
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setInflowSource('TRASLADO_CAJA_GENERAL')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      inflowSource === 'TRASLADO_CAJA_GENERAL'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inflow_source"
                      checked={inflowSource === 'TRASLADO_CAJA_GENERAL'}
                      onChange={() => setInflowSource('TRASLADO_CAJA_GENERAL')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-extrabold text-xs block">
                        🏦 Traslado de General
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Dinero de ventas de Caja General trasladado para compras.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setInflowSource('APORTE_JEFE')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      inflowSource === 'APORTE_JEFE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inflow_source"
                      checked={inflowSource === 'APORTE_JEFE'}
                      onChange={() => setInflowSource('APORTE_JEFE')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-extrabold text-xs block">
                        👤 Depósito a Caja Chica (Aporte del Jefe)
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Dinero traído o depositado directamente por el jefe para compras.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notas / Observación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Inyección de fondo para abastecimiento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar Fondeo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: CONFIRMAR ELIMINACIÓN DE MOVIMIENTO */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ¿Eliminar este registro?
                </h3>
                <p className="text-xs text-slate-500">
                  Esta acción revertirá el balance en Caja Chica.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Tipo de Registro:</span>
                <span className="font-bold text-slate-800">
                  {txToDelete.type === 'EXPENSE' ? '🛒 Compra / Gasto' : '📥 Fondeo / Ingreso'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Concepto / Proveedor:</span>
                <span className="font-black text-slate-900 truncate max-w-[200px]">
                  {txToDelete.vendor}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Monto:</span>
                <span className="font-mono font-black text-sm text-slate-900">
                  C$ {txToDelete.amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Hora de Registro:</span>
                <span className="font-mono text-slate-700">
                  {new Date(txToDelete.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Forma de Pago:</span>
                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                  txToDelete.method === 'TRANSFER'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {txToDelete.method === 'TRANSFER' ? '🏦 Transferencia Bancaria' : '💵 Efectivo (Gaveta)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Registrado por:</span>
                <span className="font-bold text-slate-800">{txToDelete.registeredBy}</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
              txToDelete.type === 'EXPENSE'
                ? txToDelete.method === 'TRANSFER'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="font-bold mb-0.5">ℹ️ Impacto en Gaveta de Caja Chica:</div>
              {txToDelete.type === 'EXPENSE' ? (
                txToDelete.method === 'TRANSFER' ? (
                  <span>
                    Esta compra fue pagada por <strong>Transferencia Bancaria</strong> (vía cuenta bancaria de la empresa). Al eliminarla, se quitará del historial de compras y reportes pero <strong>NO alterará el saldo físico de tu gaveta</strong> (no restaura efectivo).
                  </span>
                ) : (
                  <span>
                    Al eliminar este gasto pagado en <strong>Efectivo</strong>, el monto de <strong>C$ {txToDelete.amount.toFixed(2)}</strong> será <strong>restaurado inmediatamente a tu saldo físico</strong> de gaveta.
                  </span>
                )
              ) : (
                <span>
                  Al eliminar este ingreso/fondeo, el saldo de gaveta se <strong>reducirá en C$ {txToDelete.amount.toFixed(2)}</strong>.
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
