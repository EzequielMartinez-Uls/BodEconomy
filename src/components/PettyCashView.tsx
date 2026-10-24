import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppState, ExpenseCategory, PaymentMethod, PettyCashShift, PettyCashTransaction, isOpeningPettyCashTx } from '../types';
import {
  printThermalDailyExpensesTicket,
  printThermalSingleExpenseVoucher,
  printThermalPettyCashClosingAct,
  printOfficialActBN,
  OfficialActTransaction,
} from '../services/thermalPrint';
import {
  exportPettyCashExpensesToExcel,
  exportPettyCashClosingToExcel,
  exportPettyCashHistoryToExcel,
} from '../services/excelExport';
import { formatDateToFriendly } from '../services/storage';
import { getLocalTodayStr, addDaysToDateStr, getLocalDateTimeStr, extractLocalDateStr, isSameMinute } from '../utils/dateUtils';
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
  Edit2,
  Trash2,
  Settings,
  Plus,
  X,
  XCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Banknote,
  Building2,
  CreditCard,
} from 'lucide-react';

interface Props {
  state: AppState;
  onAddTransaction: (tx: PettyCashTransaction) => void;
  onEditTransaction?: (tx: PettyCashTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenPettyCashShift: (newShift: PettyCashShift) => void;
  onClosePettyCashShift: (closedShift: PettyCashShift) => void;
  onCancelPettyCashShift?: () => void;
  onUpdateExpenseCategories?: (categories: string[]) => void;
  onForceSyncClick?: () => void;
  onOpenShiftClick?: () => void;
}

const BUILTIN_CATEGORY_METADATA: Record<string, { label: string; emoji: string; badgeClass: string }> = {
  CARNES: { label: 'Carnes', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  POLLO: { label: 'Pollo', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  HIELO: { label: 'Hielo', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  BEBIDAS: { label: 'Bebidas', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  BEBIDAS_ALCOHOLICAS: { label: 'Bebidas alcohólicas', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  DELIVERYS_ACARREOS: { label: 'Deliverys y acarreos', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  FRUTAS_VEGETALES: { label: 'Frutas / Vegetales', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  SUPERMERCADO: { label: 'Supermercado', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  MERCADO: { label: 'Mercado', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  LACTEOS: { label: 'Lácteos', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  PAGOS_PERSONAL: { label: 'Pagos personal', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  OTROS: { label: 'Otros', emoji: '', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' },
  FONDEO: { label: 'Depósito / Fondeo', emoji: '', badgeClass: 'bg-bodegon/5 text-bodegon border-bodegon/20' },
};

export function getCategoryInfo(catValue: string) {
  if (BUILTIN_CATEGORY_METADATA[catValue]) {
    return BUILTIN_CATEGORY_METADATA[catValue];
  }
  const formatted = catValue.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label: formatted,
    emoji: '',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
  };
}

export const PettyCashView: React.FC<Props> = ({
  state,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenPettyCashShift,
  onClosePettyCashShift,
  onCancelPettyCashShift,
  onUpdateExpenseCategories,
  onForceSyncClick,
  onOpenShiftClick,
}) => {
  const todayStr = getLocalTodayStr();

  const activeCategories = useMemo(() => {
    return state.expenseCategories && state.expenseCategories.length > 0
      ? state.expenseCategories
      : Object.keys(BUILTIN_CATEGORY_METADATA);
  }, [state.expenseCategories]);

  const categoryDefs = useMemo(() => {
    return activeCategories.map((catKey) => ({
      value: catKey as ExpenseCategory,
      ...getCategoryInfo(catKey),
    }));
  }, [activeCategories]);

  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryInput, setEditingCategoryInput] = useState('');
  const [openResponsible, setOpenResponsible] = useState<string>(state.activeAdminName);
  const [closeResponsible, setCloseResponsible] = useState<string>(state.activeAdminName);

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
    const foundPetty = state.pettyCashShiftHistory.find((s) => s.date === selectedDate);
    if (foundPetty) return foundPetty;

    // Fallback de contingencia: si la jornada general de este día ya fue cerrada formalmente
    const generalShift = state.shiftHistory.find((s) => s.date === selectedDate && s.status === 'CLOSED');
    if (generalShift) {
      const initBal = generalShift.openingTransferToPettyCash || 25900;
      return {
        id: `pc-shift-${selectedDate}`,
        date: selectedDate,
        status: 'CLOSED',
        openedBy: generalShift.openedBy || 'Caja Principal',
        openedAt: generalShift.openedAt || new Date().toISOString(),
        closedBy: generalShift.closedBy || 'Admin',
        closedAt: generalShift.closedAt || new Date().toISOString(),
        previousDayRemaining: initBal,
        generalCashTransfer: 0,
        bossContribution: 0,
        initialBalance: initBal,
        totalExpenses: 0,
        expectedBalance: 0,
        actualCashCounted: 0,
        difference: 0,
        auditStatus: 'SQUARED',
        closingNotes: 'Jornada cerrada sincronizada con caja general',
      };
    }

    return null;
  }, [state.currentPettyCashShift, state.pettyCashShiftHistory, state.shiftHistory, selectedDate]);

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
  const [expenseTargetDate, setExpenseTargetDate] = useState<string>(selectedDate);
  const [amount, setAmount] = useState<number>(0);
  const [vendor, setVendor] = useState('');
  const [concept, setConcept] = useState('');
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
  const isSubmittingRef = useRef<boolean>(false);

  // Estados para Edición de Transacción
  const [editingTx, setEditingTx] = useState<PettyCashTransaction | null>(null);
  const [editVendor, setEditVendor] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('OTROS');
  const [editMethod, setEditMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReceiptNumber, setEditReceiptNumber] = useState('');

  const selectedDateTransactions = useMemo(() => {
    const rawTxs = state.pettyCashTransactions.filter((tx) => {
      if (isOpeningPettyCashTx(tx)) {
        return false;
      }
      if (selectedShift) {
        if (tx.shiftId) {
          return tx.shiftId === selectedShift.id;
        }
        return tx.date ? extractLocalDateStr(tx.date) === selectedShift.date : false;
      }
      if (tx.shiftId) {
        return tx.shiftId === `pc-shift-${selectedDate}`;
      }
      if (!tx.date) return false;
      return extractLocalDateStr(tx.date) === selectedDate;
    });

    // Escudo Desduplicador Automático en memoria (Nivel Pantalla):
    // 1. Conservar solo una copia por cloudId oficial de Supabase
    const deduped: PettyCashTransaction[] = [];
    const seenCloudIds = new Set<number>();
    const seenLocalIds = new Set<string>();

    for (const tx of rawTxs) {
      if (tx.cloudId) {
        if (seenCloudIds.has(tx.cloudId)) continue;
        seenCloudIds.add(tx.cloudId);
      }
      if (tx.id && seenLocalIds.has(tx.id)) continue;
      if (tx.id) seenLocalIds.add(tx.id);
      deduped.push(tx);
    }

    // 2. Si un registro local sin cloudId tiene su gemelo ya confirmado de la nube, descartar el local
    return deduped.filter((tx) => {
      if (tx.cloudId) return true;
      const hasCloudTwin = deduped.some((other) => {
        if (!other.cloudId) return false;
        if (other.type !== tx.type) return false;
        if (Math.abs(other.amount - tx.amount) >= 0.01) return false;
        // Solo es gemelo si coincide también el minuto del registro: dos compras iguales
        // hechas en distintos momentos (ej. dos bolsas de hielo) son compras distintas.
        if (!isSameMinute(other.date, tx.date)) return false;
        const v1 = (tx.vendor || '').trim().toLowerCase();
        const v2 = (other.vendor || '').trim().toLowerCase();
        return v1 !== '' && v1 === v2;
      });
      return !hasCloudTwin;
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
      const counted = selectedShift.actualCashCounted ?? selectedShift.expectedBalance;
      if (counted !== undefined && counted !== null && counted > 0) return counted;
      if (expectedSelectedBalance > 0) return expectedSelectedBalance;
      return counted ?? 0;
    }
    if (selectedShift?.status === 'OPEN') {
      return parseFloat((selectedShift.initialBalance + selectedDateInflows - selectedDateCashExpenses).toFixed(2));
    }
    return 0;
  }, [selectedShift, selectedDateInflows, selectedDateCashExpenses, expectedSelectedBalance]);

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
    setOpenResponsible(state.activeAdminName);
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
      openedBy: openResponsible || state.activeAdminName,
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
    setCloseResponsible(state.activeAdminName);
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
      closedBy: closeResponsible || state.activeAdminName,
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
  const handleOpenExpenseModal = (targetDateOverride?: string) => {
    const target = targetDateOverride || selectedDate;
    setExpenseTargetDate(target);
    setModalType('EXPENSE');
    setAmount(0);
    setVendor('');
    setConcept('');
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

  const handleSaveEditCategory = (oldKey: string) => {
    const trimmed = editingCategoryInput.trim();
    if (!trimmed) {
      alert('El nombre de la categoría no puede estar vacío.');
      return;
    }
    const newKey = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (newKey !== oldKey && activeCategories.includes(newKey)) {
      alert(`Ya existe una categoría llamada "${trimmed}".`);
      return;
    }
    const updated = activeCategories.map((c) => (c === oldKey ? newKey : c));
    onUpdateExpenseCategories?.(updated);

    if (onEditTransaction && oldKey !== newKey) {
      state.pettyCashTransactions.forEach((tx) => {
        if (tx.category === oldKey) {
          onEditTransaction({ ...tx, category: newKey as ExpenseCategory });
        }
      });
    }

    setEditingCategoryKey(null);
    setEditingCategoryInput('');
  };

  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    // Candado Síncrono Inmediato (Nivel Interfaz): rebotar cualquier segundo clic o enter en microsegundos
    if (isSubmittingRef.current || isSubmitting) return;

    if (amount <= 0) {
      alert('Por favor ingresa un monto mayor a C$ 0.00');
      return;
    }

    if (modalType === 'EXPENSE' && !concept.trim() && !vendor.trim()) {
      alert('Por favor indica el concepto o detalle de la compra.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const finalConcept = concept.trim() || vendor.trim();
      const finalVendor =
        modalType === 'INFLOW'
          ? inflowSource === 'TRASLADO_CAJA_GENERAL'
            ? 'Deposito a caja chica'
            : 'Depositado en efectivo'
          : vendor.trim() || finalConcept;

      const assignedShiftDate = modalType === 'EXPENSE' ? (expenseTargetDate || selectedDate) : selectedDate;
      const assignedShiftId = `pc-shift-${assignedShiftDate}`;

      // Escudo anti-duplicados: advertir si ya existe un movimiento idéntico en este turno
      const isDuplicate = state.pettyCashTransactions.some(
        (t) =>
          t.shiftId === assignedShiftId &&
          t.type === (modalType || 'EXPENSE') &&
          Math.abs(t.amount - amount) < 0.01 &&
          (t.vendor.toLowerCase().trim() === finalVendor.toLowerCase().trim() ||
            (finalConcept && t.notes?.toLowerCase().trim() === finalConcept.toLowerCase().trim()))
      );
      if (isDuplicate) {
        const confirmDup = window.confirm(
          `⚠️ ADVERTENCIA DE DUPLICADO:\n\nYa existe un movimiento de C$ ${amount.toFixed(2)} registrado para "${finalVendor}" en la jornada del ${assignedShiftDate}.\n\n¿Estás seguro de que deseas registrar este monto OTRA VEZ, o se trata de una duplicación accidental?`
        );
        if (!confirmDup) {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }

      // Asegurar fecha y hora estricta perteneciente al día asignado
      const actualToday = getLocalTodayStr();
      let txDate = new Date().toISOString();
      if (assignedShiftDate && assignedShiftDate !== actualToday && assignedShiftDate !== selectedDate) {
        txDate = `${assignedShiftDate}T12:00:00-06:00`;
      }

      const newTx: PettyCashTransaction = {
        id: `pct-${Date.now()}`,
        shiftId: assignedShiftId,
        date: txDate,
        type: modalType || 'EXPENSE',
        inflowSource: modalType === 'INFLOW' ? inflowSource : undefined,
        amount,
        method,
        vendor: finalVendor,
        category: (modalType === 'INFLOW' ? 'OTROS' : category) as ExpenseCategory,
        receiptNumber: receiptNumber.trim() || undefined,
        registeredBy: state.activeAdminName,
        notes: modalType === 'INFLOW' ? (notes.trim() || undefined) : finalConcept,
      };

      onAddTransaction(newTx);

      if (modalType === 'EXPENSE' && printVoucherOnSave) {
        printThermalSingleExpenseVoucher(newTx);
      }

      setModalType(null);
      // Liberar el candado tras cerrar el modal
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 400);
    } catch (err) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteTx = () => {
    if (!txToDelete) return;
    onDeleteTransaction(txToDelete.id);
    setTxToDelete(null);
  };

  const handleStartEditTx = (tx: PettyCashTransaction) => {
    setEditingTx(tx);
    setEditVendor(tx.vendor);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category || 'OTROS');
    setEditMethod(tx.method || 'CASH');
    setEditDate(tx.date ? tx.date.slice(0, 10) : selectedDate);
    setEditNotes(tx.notes || tx.vendor || '');
    setEditReceiptNumber(tx.receiptNumber || '');
  };

  const handleSaveEditTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    const cleanVendor = editVendor.trim() || editNotes.trim() || editingTx.vendor;
    const cleanNotes = editNotes.trim() || cleanVendor;
    const timePart = editingTx.date && editingTx.date.includes('T') ? editingTx.date.split('T')[1] : '12:00:00';
    const updatedDate = editDate ? `${editDate}T${timePart}` : editingTx.date;
    const assignedShiftId = editDate ? `pc-shift-${editDate}` : editingTx.shiftId;

    const updatedTx: PettyCashTransaction = {
      ...editingTx,
      vendor: cleanVendor,
      amount: numAmount,
      category: editCategory,
      method: editMethod,
      date: updatedDate,
      shiftId: assignedShiftId,
      notes: cleanNotes,
      receiptNumber: editReceiptNumber.trim() || undefined,
    };

    if (onEditTransaction) {
      onEditTransaction(updatedTx);
    }
    setEditingTx(null);
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

    // 1. Filas de Apertura de Caja (Excel Rows 78, 79, 80)
    if (selectedShift) {
      // Row 78: Fondo de caja anterior
      if (selectedShift.previousDayRemaining > 0) {
        runningSaldo = selectedShift.previousDayRemaining;
        rows.push({
          id: 'opening-prev-rem',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Fondo de caja anterior',
          categoriaEmoji: '💼',
          vendor: 'Fondo de caja anterior',
          tipoPago: '-',
          montoTotalBanco: null,
          reembolsoCajaChica: selectedShift.previousDayRemaining,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });
      } else if (selectedShift.initialBalance > 0 && !selectedShift.generalCashTransfer && !selectedShift.bossContribution) {
        runningSaldo = selectedShift.initialBalance;
        rows.push({
          id: 'opening-initial',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Fondo de caja anterior',
          categoriaEmoji: '💼',
          vendor: 'Fondo de caja anterior',
          notes: selectedShift.openingNotes,
          tipoPago: 'EFECTIVO',
          montoTotalBanco: null,
          reembolsoCajaChica: selectedShift.initialBalance,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });
      }

      // Row 79: Deposito a caja chica (Traspaso proveniente de Caja General)
      if (selectedShift.generalCashTransfer && selectedShift.generalCashTransfer > 0) {
        runningSaldo += selectedShift.generalCashTransfer;
        rows.push({
          id: 'opening-deposito-general',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Deposito a caja chica',
          categoriaEmoji: '🏦',
          vendor: 'Deposito a caja chica',
          notes: 'Traspaso desde Caja General',
          tipoPago: 'EFECTIVO',
          montoTotalBanco: null,
          reembolsoCajaChica: selectedShift.generalCashTransfer,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });
      }

      // Row 80: Depositado en efectivo (Aporte del Jefe)
      if (selectedShift.bossContribution && selectedShift.bossContribution > 0) {
        runningSaldo += selectedShift.bossContribution;
        rows.push({
          id: 'opening-deposito-jefe',
          isOpening: true,
          date: selectedShift.openedAt,
          hora: new Date(selectedShift.openedAt).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
          concepto: 'Depositado en efectivo',
          categoriaEmoji: '💵',
          vendor: 'Depositado en efectivo',
          notes: 'Aporte en efectivo del jefe',
          tipoPago: 'EFECTIVO',
          montoTotalBanco: null,
          reembolsoCajaChica: selectedShift.bossContribution,
          gastosCajaChica: null,
          saldoGaveta: runningSaldo,
        });
      }
    }

    // 2. Transacciones del día ordenadas cronológicamente
    const sorted = [...selectedDateTransactions]
      .filter((tx) => !isOpeningPettyCashTx(tx))
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

      const catDef = getCategoryInfo(tx.category);

      rows.push({
        id: tx.id,
        isOpening: false,
        date: tx.date,
        hora: new Date(tx.date).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
        concepto: tx.vendor,
        categoriaEmoji: catDef.emoji,
        categoriaLabel: catDef.label,
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

  const pendingTransactionsCount = useMemo(() => {
    return (state.pettyCashTransactions || []).filter(
      (t) => !t.cloudId && !t.id.startsWith('pct-cloud-') && !t.id.startsWith('opening-') && !t.id.startsWith('pct-init-')
    ).length;
  }, [state.pettyCashTransactions]);

  return (
    <div className="space-y-6">
      {/* Banner de Sincronización Pendiente */}
      {pendingTransactionsCount > 0 && (
        <div className="bg-dorado/10 border border-dorado/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-cafe">
            <RefreshCw className="w-4 h-4 text-dorado-tinta animate-spin shrink-0" />
            <div>
              <span className="font-semibold">{pendingTransactionsCount} movimiento(s) guardados en PC pendientes de sincronización.</span>
              <span className="text-dorado-tinta ml-1">Se enviarán automáticamente a Supabase o puedes forzar la sincronización.</span>
            </div>
          </div>
          {onForceSyncClick && (
            <button
              onClick={onForceSyncClick}
              className="px-3 py-1.5 rounded-lg bg-dorado-tinta hover:bg-dorado-tinta text-white text-xs font-semibold transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Sincronizar ahora
            </button>
          )}
        </div>
      )}

      {/* 1. Header Principal */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bodegon text-white flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                Caja Chica
              </h1>
              {currentOpenShift ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bodegon/5 text-bodegon border border-bodegon/20">
                  <span className="w-2 h-2 rounded-full bg-bodegon"></span>
                  Jornada Abierta • {currentOpenShift.date}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  Sin Jornada Abierta Hoy
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Control operativo diario: 1 apertura y 1 cierre por cada día comercial.
            </p>
          </div>
        </div>

        {/* Resumen de Fondo en Mano */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-right">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
              {currentOpenShift ? 'Fondo en Mano Hoy' : 'Saldo Caja Chica'}
            </span>
            <span className="text-lg font-bold text-bodegon font-mono">
              C$ {state.pettyCashBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Selector de Pestañas Principales */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2 flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('DAY_VIEW')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'DAY_VIEW'
                ? 'bg-bodegon text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Vista por Día Comercial</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-bodegon text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Cierres Diarios</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'HISTORY' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}>
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
              className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Imprimir reporte de este día en Hoja Tamaño Carta (B/N)"
            >
              <Printer className="w-4 h-4 text-stone-500" />
              <span>Imprimir Reporte (Carta)</span>
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
              className="px-3.5 py-2 rounded-xl border border-bodegon/35 bg-bodegon/5 hover:bg-bodegon/10 text-bodegon font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Descargar compras de este día en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-bodegon" />
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
            <div className="bg-dorado/10 border border-dorado/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-dorado-tinta text-white flex items-center justify-center font-bold shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-cafe flex items-center gap-2">
                    <span>Jornada Anterior Pendiente de Cierre: {currentOpenShift.date}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-dorado/30 text-cafe font-semibold uppercase">
                      Obligatorio
                    </span>
                  </h4>
                  <p className="text-dorado-tinta mt-0.5">
                    La jornada comercial del <strong>{currentOpenShift.date}</strong> debe cerrarse formalmente usando el botón <strong>Cerrar Jornada</strong> en la barra superior antes de operar hoy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BARRA DE NAVEGACIÓN Y SELECCIÓN DE DÍAS */}
          <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePrevDate}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition cursor-pointer"
                title="Ver día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50">
                <Calendar className="w-4 h-4 text-bodegon" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-stone-900 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDate}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 transition cursor-pointer"
                title="Ver día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
                >
                  Ir a Hoy
                </button>
              )}
            </div>

            {/* Badge de Estado del Día Seleccionado */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">
                {formatDateToFriendly(selectedDate)}:
              </span>
              {isSelectedShiftOpen && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bodegon/5 text-bodegon border border-bodegon/20">
                  <span className="w-2 h-2 rounded-full bg-bodegon"></span>
                  Jornada Abierta
                </span>
              )}
              {isSelectedShiftClosed && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200">
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  Jornada Cerrada y Liquidada
                </span>
              )}
              {!selectedShift && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-dorado/10 text-dorado-tinta border border-dorado/40">
                  Sin Apertura Registrada
                </span>
              )}
            </div>
          </div>

          {/* CASO A: SI LA FECHA SELECCIONADA ESTÁ CERRADA */}
          {isSelectedShiftClosed && selectedShift && (
            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900">
                        Jornada Cerrada del {selectedDate}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          selectedShift.auditStatus === 'SQUARED'
                            ? 'bg-bodegon/5 text-bodegon border-bodegon/20'
                            : selectedShift.auditStatus === 'SHORTAGE'
                            ? 'bg-barro/5 text-barro border-barro/25'
                            : 'bg-stone-50 text-stone-800 border-stone-200'
                        }`}
                      >
                        {selectedShift.auditStatus === 'SQUARED'
                          ? 'CUADRADO EXACTO'
                          : selectedShift.auditStatus === 'SHORTAGE'
                          ? `FALTANTE (-C$ ${Math.abs(selectedShift.difference || 0).toFixed(2)})`
                          : `SOBRANTE (+C$ ${(selectedShift.difference || 0).toFixed(2)})`}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Apertura: <strong className="text-stone-700">{selectedShift.openedBy}</strong> • Cierre:{' '}
                      <strong className="text-stone-800">{selectedShift.closedBy || 'N/A'}</strong> a las{' '}
                      {selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const dayTransactions: OfficialActTransaction[] = ledgerRows.map((r) => ({
                        id: r.id,
                        hora: r.hora,
                        categoria: r.categoriaLabel || 'General',
                        concepto: r.notes ? `${r.concepto} (${r.notes})` : r.concepto,
                        proveedor: r.vendor,
                        metodo: r.tipoPago === 'EFECTIVO' ? 'Efectivo' : r.tipoPago === 'TRANSFERENCIA' ? 'Transferencia' : r.tipoPago === 'TARJETA' ? 'Tarjeta' : '-',
                        estado: r.receiptNumber ? `#${r.receiptNumber}` : r.isOpening ? 'Apertura' : 'Liquidado',
                        referencia: r.receiptNumber,
                        monto: (r.reembolsoCajaChica || 0) + (r.gastosCajaChica || 0) + (r.montoTotalBanco || 0),
                        tipo: (r.reembolsoCajaChica && r.reembolsoCajaChica > 0) ? 'INGRESO' : 'GASTO',
                        inflow: r.reembolsoCajaChica || 0,
                        outflow: (r.gastosCajaChica || 0) + (r.montoTotalBanco || 0),
                        runningBalance: r.saldoGaveta,
                      }));

                      const fondoInicial = selectedShift?.initialBalance || 0;
                      const totalInflows = selectedDateInflows;
                      const expensesCash = selectedDateCashExpenses;
                      const expensesTransf = selectedDateTransferExpenses + selectedDateCardExpenses;
                      const expensesTotal = selectedDateExpenses;
                      const saldoRemanente = selectedShift?.actualCashCounted ?? expectedSelectedBalance;

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
                        totalInflows,
                        expensesCash,
                        expensesTransf,
                        expensesTotal,
                        saldoRemanente,
                        responsableCajaChica: selectedShift?.closedBy || selectedShift?.openedBy || state.activeAdminName,
                        transactions: dayTransactions,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-bodegon bg-bodegon hover:bg-bodegon-noche text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Imprimir Acta Oficial de Caja Chica en Hoja Tamaño Carta (B/N)"
                  >
                    <Printer className="w-3.5 h-3.5 text-dorado-vivo" />
                    <span>Imprimir Cierre (Carta)</span>
                  </button>

                  <button
                    onClick={() => exportPettyCashClosingToExcel(selectedShift, selectedDateTransactions)}
                    className="px-3 py-1.5 rounded-lg border border-bodegon/35 bg-bodegon/5 hover:bg-bodegon/10 text-bodegon font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-bodegon" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Resumen del Arqueo de Cierre */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Fondo Apertura</span>
                  <span className="font-mono font-bold text-stone-800 text-sm">
                    C$ {selectedShift.initialBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Total Compras del Día</span>
                  <span className="font-mono font-bold text-barro text-sm">
                    - C$ {((selectedShift.totalExpenses && selectedShift.totalExpenses > 0) ? selectedShift.totalExpenses : selectedDateExpenses).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">Saldo Teórico Esperado</span>
                  <span className="font-mono font-bold text-stone-800 text-sm">
                    C$ {((selectedShift.expectedBalance && selectedShift.expectedBalance > 0) ? selectedShift.expectedBalance : expectedSelectedBalance).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-bodegon uppercase tracking-wider block">Efectivo Físico Contado</span>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    C$ {((selectedShift.actualCashCounted && selectedShift.actualCashCounted > 0) ? selectedShift.actualCashCounted : ((selectedShift.expectedBalance && selectedShift.expectedBalance > 0) ? selectedShift.expectedBalance : expectedSelectedBalance)).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CASO B: SI LA FECHA SELECCIONADA ESTÁ ABIERTA */}
          {isSelectedShiftOpen && selectedShift && (
            <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-bodegon uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-bodegon"></span>
                  Jornada Activa
                </div>
                <h3 className="text-sm font-bold text-stone-900">
                  Caja Chica del {selectedDate} — Compras y movimientos habilitados
                </h3>
                <p className="text-xs text-stone-500">
                  Registra compras del día. Para cerrar la jornada, utiliza el botón <strong>Cerrar Jornada</strong> en la barra superior.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onCancelPettyCashShift && (
                  <button
                    type="button"
                    onClick={() => {
                      const confirmCancel = window.confirm(
                        `¿Estás seguro de cancelar la jornada de Caja Chica del día ${selectedShift.date}?\n\nEsta acción cancelará la apertura y devolverá la caja chica a estado cerrado.`
                      );
                      if (confirmCancel) {
                        onCancelPettyCashShift();
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Cancelar Turno</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CASO C: SI LA FECHA NO TIENE NINGUNA JORNADA REGISTRADA */}
          {!selectedShift && (
            <div className="bg-white rounded-xl p-8 border border-stone-200 text-center space-y-3 max-w-md mx-auto shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto border border-stone-200">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">
                  Sin Jornada Registrada para el {selectedDate}
                </h3>
                <p className="text-xs text-stone-500">
                  Para abrir la jornada de hoy, utiliza el botón <strong>Abrir Jornada</strong> ubicado en la barra superior.
                </p>
              </div>
            </div>
          )}

          {/* TARJETAS DE MÉTRICAS DEL DÍA (UNIFIED FINANCIAL KPI BAR) */}
          {selectedShift && (
            <div className="space-y-2">
              <div className="bg-white rounded-xl border border-stone-200 shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-stone-100 grid grid-cols-2 lg:grid-cols-4">
                {/* 1. Fondo Asignado */}
                <div className="p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Fondo Asignado
                  </span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    C$ {(selectedInitialBalance + selectedDateInflows).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-stone-400 truncate">
                    Inicial: C$ {selectedInitialBalance.toFixed(0)} {selectedDateInflows > 0 && `+ Inyecciones: C$ ${selectedDateInflows.toFixed(0)}`}
                  </div>
                </div>

                {/* 2. Salidas de Gaveta (Efectivo) */}
                <div className="p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-barro uppercase tracking-wider block">
                    Egresos Efectivo (Gaveta)
                  </span>
                  <div className="text-xl font-bold font-mono text-barro">
                    - C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {selectedDateTransactions.filter((t) => t.type === 'EXPENSE' && t.method === 'CASH').length} compras en efectivo
                  </div>
                </div>

                {/* 3. Pagos por Banco y Tarjetas */}
                <div className="p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Banco & Tarjetas
                  </span>
                  <div className="text-xl font-bold font-mono text-stone-900">
                    C$ {(selectedDateTransferExpenses + selectedDateCardExpenses).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Transf: C$ {selectedDateTransferExpenses.toLocaleString('es-NI', { minimumFractionDigits: 0 })} · Tarjeta: C$ {selectedDateCardExpenses.toLocaleString('es-NI', { minimumFractionDigits: 0 })}
                  </div>
                </div>

                {/* 4. Efectivo Físico en Gaveta */}
                <div className="p-4 space-y-1 bg-stone-50/70 sm:rounded-r-xl">
                  <span className="text-[10px] font-semibold text-bodegon uppercase tracking-wider block">
                    {isSelectedShiftClosed ? 'Efectivo al Cierre' : 'Saldo Físico Gaveta'}
                  </span>
                  <div className="text-2xl font-bold font-mono text-bodegon">
                    C$ {selectedFinalBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {isSelectedShiftClosed ? 'Conteo físico verificado' : 'Dinero físico actual en caja'}
                  </div>
                </div>
              </div>

              {/* Barra Informativa de Egresos Totales Consolidados */}
              <div className="bg-stone-50 rounded-lg px-3.5 py-2 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 flex-wrap text-stone-700">
                  <span className="font-semibold">Total Compras del Día:</span>
                  <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                    C$ {selectedDateExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    (C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} Efectivo + C$ {selectedDateTransferExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} Transf. + C$ {selectedDateCardExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })} Tarjeta)
                  </span>
                </div>
                <div className="text-[11px] text-stone-500">
                  Transferencias y tarjetas no descuentan billetes físicos de gaveta.
                </div>
              </div>
            </div>
          )}

          {/* BOTONES DE REGISTRO DE MOVIMIENTOS (SOLO CUANDO EL DÍA ESTÁ ABIERTO) */}
          {isSelectedShiftOpen && (
            <div className="bg-white rounded-xl p-3.5 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-semibold text-stone-700">
                Registrar compras y movimientos de hoy ({selectedDate}):
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleOpenExpenseModal(selectedDate)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-bodegon hover:bg-bodegon-noche active:bg-bodegon-noche text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Registrar Compra / Gasto</span>
                </button>

                <button
                  onClick={handleOpenInflowModal}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-bodegon" />
                  <span>Ingresar Fondeo</span>
                </button>
              </div>
            </div>
          )}

          {/* BOTÓN PARA REGISTRAR FACTURAS REZAGADAS EN JORNADAS CERRADAS */}
          {!isSelectedShiftOpen && selectedShift?.status === 'CLOSED' && (
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-stone-600">
                <strong>Jornada cerrada:</strong> Puedes incorporar facturas rezagadas de este día sin alterar turnos posteriores.
              </div>
              <button
                onClick={() => handleOpenExpenseModal(selectedDate)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-barro" />
                <span>Agregar Factura Rezagada</span>
              </button>
            </div>
          )}

          {/* TABLA DE COMPRAS Y MOVIMIENTOS DEL DÍA SELECCIONADO (PERMANECE SIEMPRE VISIBLE) */}
          {selectedShift && (
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                <div className="text-sm font-black text-stone-800 flex items-center gap-2">
                  <span>Listado de Compras del Día ({selectedDate})</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-stone-100 text-stone-600 border border-stone-200">
                    {selectedDateTransactions.length} registros
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const dayTransactions: OfficialActTransaction[] = ledgerRows.map((r) => ({
                      id: r.id,
                      hora: r.hora,
                      categoria: r.categoriaLabel || 'General',
                      concepto: r.notes ? `${r.concepto} (${r.notes})` : r.concepto,
                      proveedor: r.vendor,
                      metodo: r.tipoPago === 'EFECTIVO' ? 'Efectivo' : r.tipoPago === 'TRANSFERENCIA' ? 'Transferencia' : r.tipoPago === 'TARJETA' ? 'Tarjeta' : '-',
                      estado: r.receiptNumber ? `#${r.receiptNumber}` : r.isOpening ? 'Apertura' : 'Liquidado',
                      referencia: r.receiptNumber,
                      monto: (r.reembolsoCajaChica || 0) + (r.gastosCajaChica || 0) + (r.montoTotalBanco || 0),
                      tipo: (r.reembolsoCajaChica && r.reembolsoCajaChica > 0) ? 'INGRESO' : 'GASTO',
                      inflow: r.reembolsoCajaChica || 0,
                      outflow: (r.gastosCajaChica || 0) + (r.montoTotalBanco || 0),
                      runningBalance: r.saldoGaveta,
                    }));

                    const fondoInicial = selectedShift?.initialBalance || 0;
                    const totalInflows = selectedDateInflows;
                    const expensesCash = selectedDateCashExpenses;
                    const expensesTransf = selectedDateTransferExpenses + selectedDateCardExpenses;
                    const expensesTotal = selectedDateExpenses;
                    const saldoRemanente = selectedShift?.actualCashCounted ?? expectedSelectedBalance;

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
                      totalInflows,
                      expensesCash,
                      expensesTransf,
                      expensesTotal,
                      saldoRemanente,
                      responsableCajaChica: selectedShift?.closedBy || selectedShift?.openedBy || state.activeAdminName,
                      transactions: dayTransactions,
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-bodegon bg-bodegon hover:bg-bodegon-noche text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Imprimir Acta Oficial de Caja Chica y Detalle de Compras en Hoja Tamaño Carta (B/N)"
                >
                  <Printer className="w-3.5 h-3.5 text-dorado-vivo" />
                  <span>Imprimir Acta Oficial (Carta)</span>
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar por concepto, producto, factura o notas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-bodegon font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCategoriesModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                  title="Administrar categorías de gastos"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-500" />
                  <span>Categorías</span>
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <button
                    onClick={() => setSelectedCategoryFilter('TODOS')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategoryFilter === 'TODOS'
                        ? 'bg-bodegon text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Todos ({selectedDateTransactions.length})
                  </button>
                  {(() => {
                    const inflowsCount = selectedDateTransactions.filter((tx) => tx.type === 'INFLOW').length;
                    return (
                      <button
                        onClick={() => setSelectedCategoryFilter('INFLOW')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          selectedCategoryFilter === 'INFLOW'
                            ? 'bg-bodegon text-white shadow-xs'
                            : 'bg-bodegon/5 text-bodegon border border-bodegon/20 hover:bg-bodegon/10'
                        }`}
                      >
                        Depositos / Fondeos {inflowsCount > 0 && `(${inflowsCount})`}
                      </button>
                    );
                  })()}
                  {categoryDefs.map((cat) => {
                    const count = selectedDateTransactions.filter((tx) => tx.type === 'EXPENSE' && tx.category === cat.value).length;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategoryFilter(cat.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          selectedCategoryFilter === cat.value
                            ? 'bg-bodegon text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat.label} {count > 0 && `(${count})`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tabla Detallada Estilo Excel / Libro Diario */}
              <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 border-r border-stone-200 text-center w-14">Hora</th>
                      <th className="py-2.5 px-3.5 border-r border-stone-200 min-w-[220px]">Concepto</th>
                      <th className="py-2.5 px-3 border-r border-stone-200 text-center min-w-[120px]">Forma de Pago</th>
                      <th className="py-2.5 px-3 border-r border-stone-200 text-right min-w-[120px]">Banco / Tarjeta</th>
                      <th className="py-2.5 px-3 border-r border-stone-200 text-right min-w-[120px]">Reembolso</th>
                      <th className="py-2.5 px-3 border-r border-stone-200 text-right min-w-[120px]">Gasto Efectivo</th>
                      <th className="py-2.5 px-3.5 border-r border-stone-200 text-right min-w-[130px] font-bold text-stone-800">Saldo</th>
                      <th className="py-2.5 px-2.5 text-center w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-400 font-medium">
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
                            className={`transition-colors border-b border-stone-100 ${
                              row.isOpening
                                ? 'bg-dorado/3 font-medium'
                                : 'hover:bg-stone-50/80'
                            }`}
                          >
                            <td className="py-2 px-3 border-r border-stone-100 font-mono text-center text-[11px] text-stone-500">
                              {row.hora}
                            </td>
                            <td className="py-2 px-3.5 border-r border-stone-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-stone-900">{row.vendor}</span>
                                {row.rawTx?.type === 'INFLOW' && !row.isOpening && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-bodegon/5 text-bodegon border border-bodegon/20">
                                    Fondeo
                                  </span>
                                )}
                              </div>
                              {row.notes && (
                                <div className="text-[10px] text-stone-500 mt-0.5 truncate max-w-xs">
                                  {row.notes}
                                  {row.receiptNumber && (
                                    <span className="ml-1.5 font-mono text-stone-400">Ref: #{row.receiptNumber}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-stone-100 text-center text-[11px]">
                              {row.isOpening ? (
                                row.tipoPago === '-' ? (
                                  <span className="text-stone-400 font-mono">-</span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 font-mono font-medium">
                                    Efectivo
                                  </span>
                                )
                              ) : isTransf ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-50 text-stone-800 border border-stone-200 font-medium">
                                  Transferencia
                                </span>
                              ) : isCard ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200 font-medium">
                                  Tarjeta
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 font-mono font-medium">
                                  Efectivo
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-stone-100 text-right font-mono font-semibold text-[11.5px] text-stone-800">
                              {row.montoTotalBanco !== null ? (
                                `C$ ${row.montoTotalBanco.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-stone-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-stone-100 text-right font-mono font-semibold text-[11.5px] text-bodegon">
                              {row.reembolsoCajaChica !== null ? (
                                `C$ ${row.reembolsoCajaChica.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-stone-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-stone-100 text-right font-mono font-semibold text-[11.5px] text-barro">
                              {row.gastosCajaChica !== null ? (
                                `C$ ${row.gastosCajaChica.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
                              ) : (
                                <span className="text-stone-300 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3.5 border-r border-stone-100 text-right font-mono font-bold text-xs text-stone-900 bg-stone-50/50">
                              C$ {row.saldoGaveta.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              {row.isOpening ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-dorado/10 text-dorado-tinta border border-dorado/40">
                                  Apertura
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  {row.rawTx && (
                                    (row.rawTx.cloudId || row.rawTx.id.startsWith('pct-cloud-')) ? (
                                      <span
                                        className="p-1 rounded text-bodegon"
                                        title="Sincronizado con Supabase Cloud"
                                      >
                                        <Cloud className="w-3.5 h-3.5" />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => onForceSyncClick && onForceSyncClick()}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-dorado/10 text-dorado-tinta border border-dorado/40 hover:bg-dorado/20 cursor-pointer"
                                        title="Pendiente de sincronizar. Clic para enviar."
                                      >
                                        <CloudOff className="w-3 h-3 text-dorado-tinta" />
                                        <span>PC</span>
                                      </button>
                                    )
                                  )}
                                  {row.rawTx?.type === 'EXPENSE' && (
                                    <button
                                      onClick={() => row.rawTx && printThermalSingleExpenseVoucher(row.rawTx)}
                                      className="px-1.5 py-0.5 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition inline-flex items-center gap-1 text-[10px] font-medium cursor-pointer"
                                      title="Imprimir Vale de Compra en Hoja Tamaño Carta (B/N)"
                                    >
                                      <Printer className="w-3 h-3 text-stone-500" />
                                      <span>Vale (Carta)</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => row.rawTx && handleStartEditTx(row.rawTx)}
                                    className="p-1 rounded border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition inline-flex items-center justify-center cursor-pointer"
                                    title="Editar este movimiento"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => row.rawTx && setTxToDelete(row.rawTx)}
                                    className="p-1 rounded border border-stone-200 bg-white hover:bg-barro/5 text-stone-600 hover:text-barro transition inline-flex items-center justify-center cursor-pointer"
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
                    <tr className="bg-stone-50 border-t-2 border-stone-300 text-stone-900 font-bold text-xs">
                      <td colSpan={3} className="py-2.5 px-3.5 border-r border-stone-200 text-right uppercase tracking-wider text-[11px] text-stone-600">
                        Totales:
                      </td>
                      <td className="py-2.5 px-3 border-r border-stone-200 text-right font-mono text-xs text-stone-900 font-bold">
                        C$ {(selectedDateTransferExpenses + selectedDateCardExpenses).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 border-r border-stone-200 text-right font-mono text-xs text-bodegon font-bold">
                        C$ {(selectedInitialBalance + selectedDateInflows).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 border-r border-stone-200 text-right font-mono text-xs text-barro font-bold">
                        C$ {selectedDateCashExpenses.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3.5 border-r border-stone-200 text-right font-mono text-sm bg-stone-100 text-stone-900 font-extrabold">
                        C$ {expectedSelectedBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[10px] text-stone-500 font-medium">
                        Balance
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
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-black text-stone-900">
                Historial de Cierres Diarios de Caja Chica
              </h2>
              <p className="text-xs text-stone-500">
                Registro de cada jornada cerrada con su arqueo físico, diagnóstico y opción de ver compras detalladas.
              </p>
            </div>

            {state.pettyCashShiftHistory.length > 0 && (
              <button
                onClick={() => exportPettyCashHistoryToExcel(state.pettyCashShiftHistory)}
                className="px-3.5 py-2 rounded-xl border border-bodegon/35 bg-bodegon/5 hover:bg-bodegon/10 text-bodegon font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                title="Descargar historial completo de cierres en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-bodegon" />
                <span>Exportar Historial a Excel</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-stone-100">
                {state.pettyCashShiftHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-400 font-medium">
                      Aún no hay jornadas cerradas en el historial. Al realizar el primer cierre diario aparecerá aquí.
                    </td>
                  </tr>
                ) : (
                  state.pettyCashShiftHistory.map((hShift) => {
                    const isSquared = hShift.auditStatus === 'SQUARED';
                    const isShortage = hShift.auditStatus === 'SHORTAGE';

                    return (
                      <tr key={hShift.id} className="hover:bg-stone-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {hShift.date}
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          <span className="font-bold text-stone-800">{hShift.openedBy}</span>
                          <div className="text-[10px] text-stone-400">
                            {new Date(hShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          <span className="font-bold text-stone-800">{hShift.closedBy || 'N/A'}</span>
                          <div className="text-[10px] text-stone-400">
                            {hShift.closedAt ? new Date(hShift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-700">
                          C$ {hShift.initialBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-barro">
                          - C$ {(hShift.totalExpenses || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-stone-900 text-sm">
                          C$ {(hShift.actualCashCounted || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              isSquared
                                ? 'bg-bodegon/5 text-bodegon border-bodegon/35'
                                : isShortage
                                ? 'bg-barro/5 text-barro border-barro/40'
                                : 'bg-stone-50 text-stone-800 border-stone-300'
                            }`}
                          >
                            {isSquared
                              ? 'CUADRADO'
                              : isShortage
                              ? `FALTANTE (C$ ${Math.abs(hShift.difference || 0).toFixed(2)})`
                              : `SOBRANTE (+C$ ${(hShift.difference || 0).toFixed(2)})`}
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
                              className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Ver compras y detalle completo de este día"
                            >
                              <Eye className="w-3.5 h-3.5 text-bodegon" />
                              <span>Ver Día</span>
                            </button>

                            <button
                              onClick={() => {
                                const shiftTxs = state.pettyCashTransactions.filter(
                                  (t) => t.shiftId === hShift.id || (t.date && extractLocalDateStr(t.date) === hShift.date)
                                );
                                printThermalPettyCashClosingAct(hShift, shiftTxs, hShift.closedBy || state.activeAdminName);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Reimprimir Acta de Cierre en Hoja Tamaño Carta (B/N)"
                            >
                              <Printer className="w-3.5 h-3.5 text-stone-500" />
                              <span>Imprimir (Carta)</span>
                            </button>

                            <button
                              onClick={() => {
                                const shiftTxs = state.pettyCashTransactions.filter(
                                  (t) => t.shiftId === hShift.id || (t.date && extractLocalDateStr(t.date) === hShift.date)
                                );
                                exportPettyCashClosingToExcel(hShift, shiftTxs);
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-bodegon/35 bg-bodegon/5 hover:bg-bodegon/10 text-bodegon font-bold text-xs inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Descargar este cierre en Excel (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-bodegon" />
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
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-bodegon text-white flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Apertura Diaria de Caja Chica</h3>
                  <p className="text-xs text-stone-500">Regla estricta: 1 apertura y 1 cierre por cada día comercial</p>
                </div>
              </div>
              <button
                onClick={() => setOpenShiftModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOpenShift} className="space-y-4">
              {/* Selección de Fecha y Responsable */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block mb-1">
                    Fecha Comercial del Día *
                  </label>
                  <input
                    type="date"
                    required
                    value={openShiftDate}
                    onChange={(e) => setOpenShiftDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-bodegon"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Abre la Jornada</label>
                  <select
                    value={openResponsible}
                    onChange={(e) => setOpenResponsible(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:border-bodegon"
                  >
                    {(state.availableAdmins || ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder']).map((admin) => (
                      <option key={admin} value={admin}>
                        {admin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advertencia si la fecha ya está cerrada */}
              {isDateAlreadyClosed && (
                <div className="p-3 bg-barro/5 border border-barro/40 rounded-xl text-xs text-barro flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-barro shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Fecha Ya Cerrada:</strong>
                    La fecha <strong>{openShiftDate}</strong> ya fue cerrada definitivamente. No se pueden duplicar aperturas en el mismo día. Por favor elige la siguiente fecha de trabajo.
                  </div>
                </div>
              )}

              {/* Advertencia si la fecha ya está abierta */}
              {isDateAlreadyOpen && (
                <div className="p-3 bg-dorado/10 border border-dorado/60 rounded-xl text-xs text-cafe flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-dorado-tinta shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Jornada Ya Abierta:</strong>
                    La fecha <strong>{openShiftDate}</strong> ya se encuentra en operación activa.
                  </div>
                </div>
              )}

              {/* 1. Fondo de caja anterior con Corroboración Obligatoria */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-black text-stone-800 uppercase tracking-wider">
                    1. Fondo de caja anterior (Conteo Físico) *
                  </label>
                  {latestClosedShift && (
                    <span className="text-[11px] text-stone-500 font-medium">
                      Esperado según cierre ({latestClosedShift.date}):{' '}
                      <strong className="font-mono text-stone-800">C$ {defaultPrevRemaining.toFixed(2)}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={openPreviousRemaining || ''}
                      onChange={(e) => setOpenPreviousRemaining(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-bodegon/30 bg-white"
                    />
                  </div>

                  {latestClosedShift && (
                    <button
                      type="button"
                      onClick={() => setOpenPreviousRemaining(defaultPrevRemaining)}
                      className="px-3 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
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
                        ? 'bg-bodegon/5 border-bodegon/35 text-bodegon-noche'
                        : openPreviousRemaining < defaultPrevRemaining
                        ? 'bg-barro/5 border-barro/40 text-barro'
                        : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  >
                    {Math.abs(openPreviousRemaining - defaultPrevRemaining) < 0.5 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-bodegon shrink-0" />
                        <span>Conteo físico conforme: Coincide exactamente con el cierre de ayer.</span>
                      </>
                    ) : openPreviousRemaining < defaultPrevRemaining ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-barro shrink-0" />
                        <span>
                          Faltante al recibir: Faltan C$ {(defaultPrevRemaining - openPreviousRemaining).toFixed(2)} respecto al cierre anterior.
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-stone-600 shrink-0" />
                        <span>
                          Sobrante al recibir: Hay C$ {(openPreviousRemaining - defaultPrevRemaining).toFixed(2)} adicionales respecto al cierre anterior.
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Deposito a caja chica (Traspaso de Caja General) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  2. Deposito a caja chica (Traspaso proveniente de Caja General)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openGeneralCashTransfer || ''}
                    onChange={(e) => setOpenGeneralCashTransfer(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-bodegon/30 bg-white"
                  />
                </div>
                <span className="text-[11px] text-stone-500 block mt-1">
                  Monto libre que define el administrador si se pasa dinero de las ventas de Caja General a Caja Chica (por defecto 0.00).
                </span>
              </div>

              {/* 3. Depositado en efectivo (lo del jefe) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  3. Depositado en efectivo (Aporte en efectivo del jefe) [Opcional]
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openBossContribution || ''}
                    onChange={(e) => setOpenBossContribution(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-bodegon/30 bg-white"
                  />
                </div>
                <span className="text-[11px] text-stone-500 block mt-1">
                  Dinero aportado o depositado por el jefe para compras.
                </span>
              </div>

              {/* Resumen Total Fondo Inicial */}
              <div className="p-4 rounded-xl bg-bodegon/5 border border-bodegon/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-bodegon uppercase tracking-wider block">
                    Total Fondo Inicial para Compras
                  </span>
                  <span className="text-xs text-bodegon">Fondo de caja anterior + Deposito a caja chica + Depositado en efectivo</span>
                </div>
                <div className="text-2xl font-black text-bodegon-noche font-mono">
                  C$ {(openPreviousRemaining + openGeneralCashTransfer + openBossContribution).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Observaciones de Apertura (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Se inicia compras de fin de semana..."
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-bodegon/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOpenShiftModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDateAlreadyClosed || isDateAlreadyOpen}
                  className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer ${
                    isDateAlreadyClosed || isDateAlreadyOpen
                      ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                      : 'bg-bodegon hover:bg-bodegon text-white shadow-bodegon/25'
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
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-barro text-white flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Cierre Diario de Caja Chica</h3>
                  <p className="text-xs text-stone-500">Conciliación de gastos y arqueo físico del {selectedShift.date}</p>
                </div>
              </div>
              <button
                onClick={() => setCloseShiftModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCloseShift} className="space-y-4">
              {/* Responsable del Cierre */}
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Responsable del Cierre *
                </label>
                <select
                  value={closeResponsible}
                  onChange={(e) => setCloseResponsible(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-barro"
                >
                  {(state.availableAdmins || ['Eddy', 'Xiomara', 'Ezequiel', 'Snyder']).map((admin) => (
                    <option key={admin} value={admin}>
                      {admin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumen Financiero del Día */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-stone-600">Fondo Inicial del Día:</span>
                  <span className="font-mono font-bold text-stone-800">
                    C$ {selectedShift.initialBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-stone-600">(+) Fondeos Extras Hoy:</span>
                  <span className="font-mono font-bold text-bodegon">
                    + C$ {selectedDateInflows.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-stone-600">(-) Total Compras Hoy ({selectedDateTransactions.filter((t) => t.type === 'EXPENSE').length}):</span>
                  <span className="font-mono font-bold text-barro">
                    - C$ {selectedDateExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between font-extrabold text-sm">
                  <span className="text-stone-900">Saldo Teórico en Gaveta:</span>
                  <span className="font-mono text-stone-900">
                    C$ {expectedSelectedBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Conteo Físico Real */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Efectivo Físico Contado en Gaveta de Compras (C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={closingActualCash || ''}
                    onChange={(e) => setClosingActualCash(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 text-2xl font-black font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-barro/30 text-stone-900 bg-white"
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
                        ? 'bg-bodegon/5 border-bodegon/35 text-bodegon-noche'
                        : isShortage
                        ? 'bg-barro/5 border-barro/40 text-barro'
                        : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSquared ? (
                        <CheckCircle2 className="w-4 h-4 text-bodegon" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-barro" />
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
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Observaciones de Cierre
                </label>
                <input
                  type="text"
                  placeholder="Ej: Saldo pasa intacto para compras de mañana..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-barro/30"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-stone-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCloseShiftModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
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
                        closedBy: closeResponsible || state.activeAdminName,
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
                    className="px-4 py-2.5 rounded-xl border border-bodegon/35 bg-bodegon/5 hover:bg-bodegon/10 text-bodegon font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Exportar acta de cierre actual a Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-bodegon" />
                    <span>Exportar a Excel</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-barro hover:bg-barro text-white font-extrabold text-xs shadow-md shadow-barro/25 flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full border border-stone-200 shadow-xl overflow-y-auto max-h-[90vh] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-bodegon text-white flex items-center justify-center font-bold">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Registrar Compra / Gasto</h3>
                  <p className="text-xs text-stone-500">
                    Jornada asignada: <strong className="font-mono text-stone-700">{expenseTargetDate || selectedDate}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* Fecha / Jornada de Imputación del Gasto */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Fecha / Jornada de la Compra *
                  </label>
                  {expenseTargetDate !== selectedDate && (
                    <button
                      type="button"
                      onClick={() => setExpenseTargetDate(selectedDate)}
                      className="text-[11px] font-semibold text-bodegon hover:underline cursor-pointer"
                    >
                      Asignar a hoy ({selectedDate})
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  required
                  value={expenseTargetDate}
                  onChange={(e) => setExpenseTargetDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-bodegon"
                />
                {expenseTargetDate !== selectedDate ? (
                  <p className="text-[11px] text-cafe bg-dorado/10 p-2 rounded-lg mt-2 font-medium border border-dorado/40">
                    <strong>Comprobante Rezagado:</strong> Se registrará en la jornada del {expenseTargetDate}. No altera el saldo de gaveta de hoy.
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 mt-1">
                    Se computará en la jornada del {selectedDate}.
                  </p>
                )}
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Monto del Gasto (Córdobas C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-base">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-11 pr-3 py-2 text-xl font-bold font-mono rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-bodegon text-stone-900 bg-white"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Rubro / Categoría *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                  {categoryDefs.map((cat) => (
                    <button
                      type="button"
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`p-2 rounded-lg border text-left transition cursor-pointer text-xs ${
                        category === cat.value
                          ? 'bg-bodegon text-white border-bodegon font-semibold shadow-xs'
                          : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span className="truncate block">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proveedor / Comercio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    Proveedor / Establecimiento (Opcional)
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">Ej: CARNIC, Palí, Mercado...</span>
                </div>
                <input
                  type="text"
                  list="registered-vendors-list"
                  placeholder="Nombre del proveedor o negocio (opcional)..."
                  value={vendor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVendor(val);
                    const matched = (state.vendorsList || []).find(
                      (v) => v.name.toLowerCase().trim() === val.toLowerCase().trim()
                    );
                    if (matched && matched.defaultCategory) {
                      setCategory(matched.defaultCategory as ExpenseCategory);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-bodegon"
                />
                <datalist id="registered-vendors-list">
                  {(state.vendorsList || []).map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>

              {/* Concepto / Detalle de la Compra */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Concepto / Detalle de la Compra *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Compra de aguacates y chiltomos, 10 bolsas de hielo..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-bodegon"
                />
              </div>

              {/* Forma de Pago */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Método de Pago *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setMethod('CASH')}
                    className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer ${
                      method === 'CASH'
                        ? 'bg-bodegon/5 border-bodegon text-bodegon-noche ring-1 ring-bodegon shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-bodegon mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">Efectivo</div>
                      <div className="text-[10px] text-bodegon font-medium">Resta gaveta física</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('TRANSFER')}
                    className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer ${
                      method === 'TRANSFER'
                        ? 'bg-stone-50 border-stone-500 text-stone-950 ring-1 ring-stone-500 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-stone-700 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">Transferencia</div>
                      <div className="text-[10px] text-stone-800 font-medium">Cuenta bancaria</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('CARD')}
                    className={`p-2.5 rounded-lg border text-left transition flex items-start gap-2 cursor-pointer ${
                      method === 'CARD'
                        ? 'bg-stone-50 border-stone-500 text-stone-950 ring-1 ring-stone-500 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-stone-700 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-stone-900">Tarjeta</div>
                      <div className="text-[10px] text-stone-800 font-medium">POS / Tarjeta corporativa</div>
                    </div>
                  </button>
                </div>

                {/* Indicador de Impacto en Efectivo Físico */}
                <div className="p-2.5 rounded-lg border border-stone-200 bg-stone-50 text-xs flex items-center justify-between mb-2.5">
                  <span className="text-stone-600 font-medium">
                    Impacto en gaveta física:
                  </span>
                  <span className="font-mono font-bold text-xs text-stone-900">
                    {method === 'CASH' ? `- C$ ${amount.toFixed(2)}` : 'C$ 0.00 (Pago bancario / electrónico)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    No. Factura / Recibo / Ref. Transf. (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Transf. #9482 o Factura #4821"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 font-mono focus:outline-none focus:ring-1 focus:ring-bodegon"
                  />
                </div>
              </div>

              {/* Selector de Recibo / Vale Impreso */}
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 space-y-2">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  ¿Comprobante / Vale A4 impreso?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintVoucherOnSave(false)}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      !printVoucherOnSave
                        ? 'bg-white border-stone-400 text-stone-900 shadow-2xs font-semibold'
                        : 'bg-white/60 border-stone-200 text-stone-500 hover:bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">No imprimir recibo</div>
                    <div className="text-[10px] text-stone-500">Proveedor con factura física</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintVoucherOnSave(true)}
                    className={`p-2.5 rounded-lg border text-left transition flex items-start gap-1.5 cursor-pointer ${
                      printVoucherOnSave
                        ? 'bg-bodegon text-white border-bodegon shadow-2xs font-semibold'
                        : 'bg-white/60 border-stone-200 text-stone-500 hover:bg-white'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Imprimir Vale A4</div>
                      <div className={`text-[10px] ${printVoucherOnSave ? 'text-stone-300' : 'text-stone-500'}`}>Respaldo físico</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setPrintVoucherOnSave(false)}
                    className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => setPrintVoucherOnSave(true)}
                    className="px-4 py-2 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Guardando...' : 'Guardar e Imprimir Vale'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: INGRESAR DINERO / FONDEO */}
      {modalType === 'INFLOW' && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-bodegon text-white flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Ingresar Dinero / Fondeo</h3>
                  <p className="text-xs text-stone-500">Inyectar saldo para compras del {selectedDate}</p>
                </div>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Monto a Ingresar (Córdobas C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-stone-400 text-lg">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3.5 text-2xl font-black font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-bodegon/30 text-stone-900 bg-white"
                  />
                </div>
              </div>

              {/* Selector de Origen */}
              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
                  ¿De dónde proviene este dinero? *
                </label>
                <div className="space-y-2">
                  <label
                    onClick={() => setInflowSource('TRASLADO_CAJA_GENERAL')}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      inflowSource === 'TRASLADO_CAJA_GENERAL'
                        ? 'bg-bodegon/5 border-bodegon/35 text-bodegon-noche ring-2 ring-bodegon/12'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inflow_source"
                      checked={inflowSource === 'TRASLADO_CAJA_GENERAL'}
                      onChange={() => setInflowSource('TRASLADO_CAJA_GENERAL')}
                      className="mt-0.5 text-bodegon focus:ring-bodegon"
                    />
                    <div>
                      <span className="font-extrabold text-xs block">
                        Depósito a caja chica
                      </span>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        Traspaso proveniente de Caja General.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setInflowSource('APORTE_JEFE')}
                    className={`p-3.5 rounded-lg border flex items-start gap-3 cursor-pointer transition ${
                      inflowSource === 'APORTE_JEFE'
                        ? 'bg-bodegon/5 border-bodegon/35 text-bodegon-noche ring-2 ring-bodegon/12'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inflow_source"
                      checked={inflowSource === 'APORTE_JEFE'}
                      onChange={() => setInflowSource('APORTE_JEFE')}
                      className="mt-0.5 text-bodegon focus:ring-bodegon"
                    />
                    <div>
                      <span className="font-extrabold text-xs block">
                        Depositado en efectivo
                      </span>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        Aporte en efectivo del jefe.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  Notas / Observación
                </label>
                <input
                  type="text"
                  placeholder="Ej: Inyección de fondo para abastecimiento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-bodegon"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-barro/10 text-barro flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  ¿Eliminar este registro?
                </h3>
                <p className="text-xs text-stone-500">
                  Esta acción revertirá el balance en Caja Chica.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-500">
                <span>Tipo de Registro:</span>
                <span className="font-bold text-stone-800">
                  {txToDelete.type === 'EXPENSE' ? 'Compra / Gasto' : 'Fondeo / Ingreso'}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Concepto / Proveedor:</span>
                <span className="font-black text-stone-900 truncate max-w-[200px]">
                  {txToDelete.vendor}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Monto:</span>
                <span className="font-mono font-black text-sm text-stone-900">
                  C$ {txToDelete.amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Hora de Registro:</span>
                <span className="font-mono text-stone-700">
                  {new Date(txToDelete.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Forma de Pago:</span>
                <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                  txToDelete.method === 'TRANSFER'
                    ? 'bg-stone-50 text-stone-800 border border-stone-200'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}>
                  {txToDelete.method === 'TRANSFER' ? 'Transferencia Bancaria' : 'Efectivo (Gaveta)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500">
                <span>Registrado por:</span>
                <span className="font-bold text-stone-800">{txToDelete.registeredBy}</span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
              txToDelete.type === 'EXPENSE'
                ? txToDelete.method === 'TRANSFER'
                  ? 'bg-stone-50 border-stone-200 text-stone-900'
                  : 'bg-bodegon/5 border-bodegon/20 text-bodegon'
                : 'bg-dorado/10 border-dorado/40 text-dorado-tinta'
            }`}>
              <div className="font-semibold mb-0.5">Impacto en Gaveta de Caja Chica:</div>
              {txToDelete.type === 'EXPENSE' ? (
                txToDelete.method === 'TRANSFER' ? (
                  <span>
                    Esta compra fue pagada por <strong>Transferencia Bancaria</strong>. Al eliminarla, se removerá del historial pero <strong>no alterará el saldo físico de tu gaveta</strong>.
                  </span>
                ) : (
                  <span>
                    Al eliminar este gasto pagado en <strong>Efectivo</strong>, el monto de <strong>C$ {txToDelete.amount.toFixed(2)}</strong> se <strong>restaurará a tu saldo físico</strong> de gaveta.
                  </span>
                )
              ) : (
                <span>
                  Al eliminar este fondeo, el saldo de gaveta se <strong>reducirá en C$ {txToDelete.amount.toFixed(2)}</strong>.
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-3.5 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-4 py-2 rounded-lg bg-barro hover:bg-barro text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9.1 MODAL: EDITAR / MODIFICAR REGISTRO O GASTO */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden">
            {/* Header del Modal */}
            <div className="px-5 py-4 bg-bodegon text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {editingTx.type === 'EXPENSE' ? 'Editar Gasto / Compra' : 'Editar Fondeo / Ingreso'}
                  </h3>
                  <p className="text-[11px] text-[#CFE3DC] font-medium">
                    Modifica los datos sin necesidad de borrar y reescribir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario de Edición */}
            <form onSubmit={handleSaveEditTx} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Proveedor / Origen */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    {editingTx.type === 'EXPENSE' ? 'Proveedor / Establecimiento (Opcional)' : 'Origen / Depositado por'}
                  </label>
                  <input
                    type="text"
                    list="registered-vendors-list"
                    value={editVendor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditVendor(val);
                      const matched = (state.vendorsList || []).find(
                        (v) => v.name.toLowerCase().trim() === val.toLowerCase().trim()
                      );
                      if (matched && matched.defaultCategory) {
                        setEditCategory(matched.defaultCategory as ExpenseCategory);
                      }
                    }}
                    placeholder="Ej: CARNIC, Palí, Mercado, Hielo Olito..."
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-bodegon"
                  />
                </div>

                {/* Monto en Córdobas */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    Monto (C$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-bodegon"
                    />
                  </div>
                </div>

                {/* Fecha Comercial */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    Fecha del Registro *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-bodegon"
                  />
                </div>

                {/* Categoría (solo para gastos) */}
                {editingTx.type === 'EXPENSE' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                      Categoría del Gasto *
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-bodegon bg-white"
                    >
                      {categoryDefs.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Método de Pago */}
                <div className={editingTx.type === 'EXPENSE' ? 'space-y-1' : 'md:col-span-2 space-y-1'}>
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    Método de Pago *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditMethod('CASH')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editMethod === 'CASH'
                          ? 'bg-bodegon text-white border-bodegon shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMethod('TRANSFER')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editMethod === 'TRANSFER'
                          ? 'bg-stone-700 text-white border-stone-800 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                {/* N° Comprobante */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    N° Factura / Comprobante (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editReceiptNumber}
                    onChange={(e) => setEditReceiptNumber(e.target.value)}
                    placeholder="Ej: FAC-0492 o N° Referencia"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-bodegon"
                  />
                </div>

                {/* Concepto / Detalle de la Compra */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-stone-600 tracking-wider">
                    {editingTx.type === 'EXPENSE' ? 'Concepto / Detalle de la Compra *' : 'Notas / Justificación'}
                  </label>
                  <textarea
                    rows={2}
                    required={editingTx.type === 'EXPENSE'}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={editingTx.type === 'EXPENSE' ? 'Ej: Compra de aguacates y chiltomos, 10 bolsas de hielo...' : 'Detalles adicionales sobre este movimiento...'}
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-bodegon resize-none"
                  />
                </div>
              </div>

              {/* Impacto informativo en gaveta */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-[11px] text-stone-600 leading-relaxed">
                <strong>Impacto automático:</strong> Si cambias el monto o la forma de pago (Efectivo vs Transferencia), el saldo de la gaveta se recalculará instantáneamente.
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-bodegon hover:bg-bodegon-noche text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 10. MODAL: GESTIÓN DE CATEGORÍAS DE GASTOS */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-600 text-white flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900">Categorías de Gastos</h3>
                  <p className="text-xs text-stone-500">Agrega o elimina rubros para clasificar compras</p>
                </div>
              </div>
              <button
                onClick={() => setCategoriesModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Agregar nueva categoría */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newCategoryInput.trim().toUpperCase();
                if (!trimmed) return;
                if (activeCategories.includes(trimmed)) {
                  alert(`La categoría "${trimmed}" ya existe.`);
                  return;
                }
                const updated = [...activeCategories, trimmed];
                onUpdateExpenseCategories?.(updated);
                setNewCategoryInput('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Nueva categoría (ej: MANTENIMIENTO)"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-500/30 uppercase"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-stone-600 hover:bg-stone-700 text-white font-extrabold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </form>

            {/* Lista de categorías activas */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {activeCategories.map((catKey) => {
                const info = getCategoryInfo(catKey);
                const isEditing = editingCategoryKey === catKey;

                if (isEditing) {
                  return (
                    <div
                      key={catKey}
                      className="flex items-center gap-1.5 p-2 rounded-xl border border-stone-300 bg-stone-50/40"
                    >
                      <input
                        type="text"
                        value={editingCategoryInput}
                        onChange={(e) => setEditingCategoryInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-400 bg-white text-stone-900 focus:outline-none uppercase"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEditCategory(catKey);
                          } else if (e.key === 'Escape') {
                            setEditingCategoryKey(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(catKey)}
                        className="p-1.5 rounded-lg bg-bodegon hover:bg-bodegon text-white transition cursor-pointer"
                        title="Guardar cambio"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryKey(null)}
                        className="p-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 transition cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={catKey}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-stone-800 truncate">{info.label}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryKey(catKey);
                          setEditingCategoryInput(info.label);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                        title="Editar nombre"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {activeCategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar la categoría "${info.label}"?`)) {
                              const updated = activeCategories.filter((c) => c !== catKey);
                              onUpdateExpenseCategories?.(updated);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-barro hover:bg-barro/5 transition cursor-pointer"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCategoriesModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-bodegon hover:bg-bodegon-noche text-white font-extrabold text-xs transition cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
