import React, { useState, useMemo } from 'react';
import { AppState, DailyEarningsSummary, CashShift } from '../types';
import { printOfficialActBN, printOfficialOpeningActBN } from '../services/thermalPrint';
import { exportDailyEarningsToExcel, exportMonthlyEarningsToExcel } from '../services/excelExport';
import { PrintOfficialActModal } from './PrintOfficialActModal';
import { getLocalTodayStr, addDaysToDateStr, extractLocalDateStr } from '../utils/dateUtils';
import {
  TrendingUp,
  Calendar,
  CalendarDays,
  CreditCard,
  Banknote,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  Building2,
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  BarChart3,
  Layers,
  Edit3,
  X,
  Save,
  Check,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdateShiftSales?: (
    date: string,
    sales: {
      salesCash: number;
      cardsBAC: number;
      cardsFicohsa: number;
      cardsBanpro: number;
      cardsLafise: number;
      salesPedidosYa: number;
      tipsCollected?: number;
      notes?: string;
    }
  ) => void;
  onNavigateToTab?: (tab: 'generalCash' | 'pettyCash') => void;
}

type DetailModalType =
  | 'CASH'
  | 'CARDS'
  | 'DELIVERY'
  | 'GROSS'
  | 'NET'
  | 'BAC'
  | 'FICOHSA'
  | 'BANPRO'
  | 'LAFISE'
  | 'REGISTER_SALES'
  | null;

export const DailyEarningsView: React.FC<Props> = ({
  state,
  onUpdateShiftSales,
  onNavigateToTab,
}) => {
  // Fecha seleccionada (por defecto hoy en YYYY-MM-DD local)
  const todayStr = useMemo(() => getLocalTodayStr(), []);
  const yesterdayStr = useMemo(() => addDaysToDateStr(todayStr, -1), [todayStr]);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [timeFilter, setTimeFilter] = useState<'7days' | '14days' | '30days' | 'all'>('7days');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Estado del modal de detalle interactivo
  const [activeModal, setActiveModal] = useState<DetailModalType>(null);
  const [showPrintActaModal, setShowPrintActaModal] = useState(false);

  // Estado para el modal de edición / ingreso de ventas
  const [editForm, setEditForm] = useState({
    salesCash: '',
    cardsBAC: '',
    cardsFicohsa: '',
    cardsBanpro: '',
    cardsLafise: '',
    salesPedidosYa: '',
    tipsCollected: '',
    notes: '',
  });

  // 1. Consolidación de datos históricos día por día
  const dailySummaries = useMemo<DailyEarningsSummary[]>(() => {
    const map = new Map<string, DailyEarningsSummary>();

    // Helper para formatear etiqueta legible "Lunes 22 Sep"
    const formatDayLabel = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return d.toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' });
        }
      } catch (e) {
        // fallback
      }
      return dateStr;
    };

    // Agregar turnos cerrados del historial
    (state.shiftHistory || []).forEach((shift) => {
      if (!shift || !shift.date) return;
      const d = shift.date;

      const cashSales =
        shift.salesCashSystem !== undefined
          ? shift.salesCashSystem
          : shift.loyverseValidation?.salesCashLoyverse || 0;

      const cardsBAC =
        shift.cardsBAC !== undefined
          ? shift.cardsBAC
          : shift.loyverseValidation?.cardsBAC || 0;

      const cardsFicohsa =
        shift.cardsFicohsa !== undefined
          ? shift.cardsFicohsa
          : shift.loyverseValidation?.cardsFicohsa || 0;

      const cardsBanpro =
        shift.cardsBanpro !== undefined
          ? shift.cardsBanpro
          : shift.loyverseValidation?.cardsBanpro || 0;

      const cardsLafise =
        shift.cardsLafise !== undefined
          ? shift.cardsLafise
          : shift.loyverseValidation?.cardsLafise || 0;

      const totalCards =
        shift.totalCards !== undefined
          ? shift.totalCards
          : cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;

      const pedidosYaSales =
        shift.salesPedidosYa !== undefined
          ? shift.salesPedidosYa
          : shift.loyverseValidation?.salesPedidosYa || 0;

      const otherIncomeSales = shift.otherIncome || 0;

      const totalGrossSales =
        shift.totalGrossSales !== undefined && shift.totalGrossSales > 0
          ? shift.totalGrossSales
          : cashSales + totalCards + pedidosYaSales + otherIncomeSales;

      map.set(d, {
        date: d,
        dayLabel: formatDayLabel(d),
        status: shift.status,
        cashSales,
        cardsBAC,
        cardsFicohsa,
        cardsBanpro,
        cardsLafise,
        totalCards,
        pedidosYaSales,
        otherIncomeSales,
        totalGrossSales,
        pettyCashExpenses: 0,
        transfersPaid: 0,
        totalExpenses: 0,
        netEarnings: totalGrossSales,
        tipsCollected: shift.totalTipCollected || 0,
        responsible: shift.closedBy || shift.openedBy || 'Administrador',
        sourceShiftId: shift.id,
      });
    });

    // Agregar turno actual abierto si existe
    if (state.currentShift && state.currentShift.date) {
      const shift = state.currentShift;
      const d = shift.date;

      const cashSales =
        shift.salesCashSystem !== undefined
          ? shift.salesCashSystem
          : shift.loyverseValidation?.salesCashLoyverse || 0;

      const cardsBAC =
        shift.cardsBAC !== undefined
          ? shift.cardsBAC
          : shift.loyverseValidation?.cardsBAC || 0;

      const cardsFicohsa =
        shift.cardsFicohsa !== undefined
          ? shift.cardsFicohsa
          : shift.loyverseValidation?.cardsFicohsa || 0;

      const cardsBanpro =
        shift.cardsBanpro !== undefined
          ? shift.cardsBanpro
          : shift.loyverseValidation?.cardsBanpro || 0;

      const cardsLafise =
        shift.cardsLafise !== undefined
          ? shift.cardsLafise
          : shift.loyverseValidation?.cardsLafise || 0;

      const totalCards =
        shift.totalCards !== undefined
          ? shift.totalCards
          : cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;

      const pedidosYaSales =
        shift.salesPedidosYa !== undefined
          ? shift.salesPedidosYa
          : shift.loyverseValidation?.salesPedidosYa || 0;

      const otherIncomeSales = shift.otherIncome || 0;

      const totalGrossSales = cashSales + totalCards + pedidosYaSales + otherIncomeSales;

      map.set(d, {
        date: d,
        dayLabel: formatDayLabel(d),
        status: shift.status,
        cashSales,
        cardsBAC,
        cardsFicohsa,
        cardsBanpro,
        cardsLafise,
        totalCards,
        pedidosYaSales,
        otherIncomeSales,
        totalGrossSales,
        pettyCashExpenses: 0,
        transfersPaid: 0,
        totalExpenses: 0,
        netEarnings: totalGrossSales,
        tipsCollected: shift.totalTipCollected || 0,
        responsible: shift.openedBy || 'Turno Abierto',
        sourceShiftId: shift.id,
      });
    }

    // Agregar gastos de Caja Chica por fecha
    (state.pettyCashTransactions || []).forEach((tx) => {
      if (tx.type !== 'EXPENSE') return;
      const txDate = extractLocalDateStr(tx.date);
      if (!txDate) return;

      if (!map.has(txDate)) {
        map.set(txDate, {
          date: txDate,
          dayLabel: formatDayLabel(txDate),
          status: 'CLOSED',
          cashSales: 0,
          cardsBAC: 0,
          cardsFicohsa: 0,
          cardsBanpro: 0,
          cardsLafise: 0,
          totalCards: 0,
          pedidosYaSales: 0,
          otherIncomeSales: 0,
          totalGrossSales: 0,
          pettyCashExpenses: 0,
          transfersPaid: 0,
          totalExpenses: 0,
          netEarnings: 0,
          tipsCollected: 0,
          responsible: tx.registeredBy || 'Bodegón',
        });
      }

      const item = map.get(txDate)!;
      if (tx.method === 'TRANSFER') {
        item.transfersPaid += tx.amount || 0;
      } else {
        item.pettyCashExpenses += tx.amount || 0;
      }
      item.totalExpenses = item.pettyCashExpenses + item.transfersPaid;
    });

    // Calcular ganancia neta para cada día: si está cerrado, usar el valor auditado oficial de cierre (Excel); si está abierto, restar gastos y propinas
    map.forEach((item) => {
      const shift = (state.shiftHistory || []).find((s) => s.date === item.date) ||
        (state.currentShift?.date === item.date ? state.currentShift : null);
      if (shift?.dailyNetProfit !== undefined && shift.dailyNetProfit !== null && shift.status === 'CLOSED') {
        item.netEarnings = Number(shift.dailyNetProfit);
      } else {
        item.netEarnings = item.totalGrossSales - item.totalExpenses - (item.tipsCollected || 0);
      }
    });

    // Ordenar cronológicamente descendente (más reciente primero)
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.shiftHistory, state.currentShift, state.pettyCashTransactions]);

  // Resumen del día seleccionado
  const activeDaySummary: DailyEarningsSummary = useMemo(() => {
    const found = dailySummaries.find((d) => d.date === selectedDate);
    if (found) return found;

    return {
      date: selectedDate,
      dayLabel: selectedDate,
      status: state.currentShift?.date === selectedDate ? 'OPEN' : 'CLOSED',
      cashSales: 0,
      cardsBAC: 0,
      cardsFicohsa: 0,
      cardsBanpro: 0,
      cardsLafise: 0,
      totalCards: 0,
      pedidosYaSales: 0,
      otherIncomeSales: 0,
      totalGrossSales: 0,
      pettyCashExpenses: 0,
      transfersPaid: 0,
      totalExpenses: 0,
      netEarnings: 0,
      tipsCollected: 0,
      responsible: state.activeAdminName,
    };
  }, [dailySummaries, selectedDate, state.currentShift, state.activeAdminName]);

  // Cargar datos en el formulario de edición al abrirlo
  const handleOpenEditForm = (dayToEdit = activeDaySummary) => {
    setEditForm({
      salesCash: dayToEdit.cashSales > 0 ? String(dayToEdit.cashSales) : '',
      cardsBAC: dayToEdit.cardsBAC > 0 ? String(dayToEdit.cardsBAC) : '',
      cardsFicohsa: dayToEdit.cardsFicohsa > 0 ? String(dayToEdit.cardsFicohsa) : '',
      cardsBanpro: dayToEdit.cardsBanpro > 0 ? String(dayToEdit.cardsBanpro) : '',
      cardsLafise: dayToEdit.cardsLafise > 0 ? String(dayToEdit.cardsLafise) : '',
      salesPedidosYa: dayToEdit.pedidosYaSales > 0 ? String(dayToEdit.pedidosYaSales) : '',
      tipsCollected: dayToEdit.tipsCollected > 0 ? String(dayToEdit.tipsCollected) : '',
      notes: '',
    });
    setActiveModal('REGISTER_SALES');
  };

  // Guardar ventas editadas
  const handleSaveSales = () => {
    if (onUpdateShiftSales) {
      onUpdateShiftSales(selectedDate, {
        salesCash: Number(editForm.salesCash) || 0,
        cardsBAC: Number(editForm.cardsBAC) || 0,
        cardsFicohsa: Number(editForm.cardsFicohsa) || 0,
        cardsBanpro: Number(editForm.cardsBanpro) || 0,
        cardsLafise: Number(editForm.cardsLafise) || 0,
        salesPedidosYa: Number(editForm.salesPedidosYa) || 0,
        tipsCollected: Number(editForm.tipsCollected) || 0,
        notes: editForm.notes,
      });
    }
    setActiveModal(null);
  };

  // Navegación día anterior y posterior
  const handlePrevDay = () => {
    setSelectedDate(addDaysToDateStr(selectedDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDaysToDateStr(selectedDate, 1));
  };

  // Días a graficar según el filtro de tiempo
  const chartDays = useMemo(() => {
    let list = [...dailySummaries].sort((a, b) => a.date.localeCompare(b.date));
    const limit = timeFilter === '7days' ? 7 : timeFilter === '14days' ? 14 : timeFilter === '30days' ? 30 : 999;
    if (list.length > limit) {
      list = list.slice(list.length - limit);
    }
    return list;
  }, [dailySummaries, timeFilter]);

  // Valor máximo para normalizar la escala de la gráfica
  const maxSales = useMemo(() => {
    const maxVal = Math.max(...chartDays.map((d) => Math.max(d.totalGrossSales, d.totalExpenses)), 1000);
    return maxVal;
  }, [chartDays]);

  // Cálculo de porcentajes para el día activo
  const cashPercent =
    activeDaySummary.totalGrossSales > 0
      ? (activeDaySummary.cashSales / activeDaySummary.totalGrossSales) * 100
      : 0;

  const cardsPercent =
    activeDaySummary.totalGrossSales > 0
      ? (activeDaySummary.totalCards / activeDaySummary.totalGrossSales) * 100
      : 0;

  const pedidosYaPercent =
    activeDaySummary.totalGrossSales > 0
      ? (activeDaySummary.pedidosYaSales / activeDaySummary.totalGrossSales) * 100
      : 0;

  // Manejador para imprimir el acta oficial en Blanco y Negro (1 o 2 Hojas)
  const handlePrintActa = (modo: 'TODO' | 'GENERAL' | 'CHICA' | 'APERTURA') => {
    const shift =
      (state.shiftHistory || []).find((s) => s.date === selectedDate) ||
      (state.currentShift?.date === selectedDate ? state.currentShift : null);

    if (modo === 'APERTURA') {
      if (shift) {
        printOfficialOpeningActBN(shift, state.activeAdminName);
      } else {
        alert('No se encontró un turno de caja registrado para esta fecha para imprimir el acta de apertura.');
      }
      setShowPrintActaModal(false);
      return;
    }

    const day = activeDaySummary;

    // Obtener transacciones detalladas de Caja Chica de este día
    const dayTransactions = (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === selectedDate)
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

    // Determinar fondo inicial de caja chica para la fecha
    const pettyShift =
      (state.pettyCashShiftHistory || []).find((s) => s.date === selectedDate) ||
      (state.currentPettyCashShift?.date === selectedDate ? state.currentPettyCashShift : null);

    const fondoInicial =
      pettyShift?.initialBalance !== undefined
        ? pettyShift.initialBalance
        : 2000;

    const expensesCash = dayTransactions
      .filter((t) => t.metodo === 'Efectivo')
      .reduce((acc, t) => acc + t.monto, 0);

    const expensesTransf = dayTransactions
      .filter((t) => t.metodo === 'Transferencia')
      .reduce((acc, t) => acc + t.monto, 0);

    const expensesTotal = expensesCash + expensesTransf;
    const saldoRemanente =
      pettyShift?.actualCashCounted !== undefined
        ? pettyShift.actualCashCounted
        : (fondoInicial - expensesCash);

    const marginPercent =
      day.totalGrossSales > 0 ? (day.netEarnings / day.totalGrossSales) * 100 : 0;

    printOfficialActBN({
      shift: shift || undefined,
      date: selectedDate,
      modo,
      salesCash: day.cashSales,
      cardsBAC: day.cardsBAC,
      cardsFicohsa: day.cardsFicohsa,
      cardsBanpro: day.cardsBanpro,
      cardsLafise: day.cardsLafise,
      totalCards: day.totalCards,
      salesPedidosYa: day.pedidosYaSales,
      totalGross: day.totalGrossSales,
      netProfit: day.netEarnings,
      marginPercent,
      responsableCaja: day.responsible || state.activeAdminName,
      observacionesGeneral: undefined,
      fondoInicial,
      expensesCash,
      expensesTransf,
      expensesTotal,
      saldoRemanente,
      responsableCajaChica: day.responsible || state.activeAdminName,
      transactions: dayTransactions,
    });

    setShowPrintActaModal(false);
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* 1. Header con Filtros Rápidos, Acciones y Selector de Día */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Ganancias & Ventas Diarias
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Interactivo
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Haz clic en cualquier tarjeta, banco o botón para ver detalles o registrar ventas
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Selección de Día y Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botones Rápidos de Fecha */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ayer
            </button>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold font-mono text-slate-800 bg-transparent border-none outline-none cursor-pointer"
            />
          </div>

          {/* Botón Registrar / Editar Ventas de Este Día */}
          <button
            onClick={() => handleOpenEditForm(activeDaySummary)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-extrabold transition shadow-xs cursor-pointer"
            title="Ingresar o ajustar las ventas de este día"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar / Cargar Ventas</span>
          </button>

          {/* Botón Exportar Día a Excel */}
          <button
            onClick={() => exportDailyEarningsToExcel(activeDaySummary, state)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Descargar Estado de Resultados y Auditoría de este día en Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>Excel Día</span>
          </button>

          {/* Botón Imprimir Acta B/N */}
          <button
            onClick={() => setShowPrintActaModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer shadow-xs"
            title="Imprimir Acta Oficial en Blanco y Negro (1 o 2 Hojas)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimir Acta (B/N)</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Información del Día Seleccionado con Navegación ◀ ▶ */}
      <div className="bg-slate-900 rounded-xl p-4 text-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            <span>Jornada Seleccionada</span>
            <span>•</span>
            <button
              onClick={() => {
                if (onNavigateToTab) onNavigateToTab('generalCash');
              }}
              className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 text-[10px] cursor-pointer transition"
              title="Haga clic para ir a Caja General"
            >
              {activeDaySummary.status === 'OPEN' ? 'Turno En Curso' : 'Turno Cerrado'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Flecha Día Anterior */}
            <button
              onClick={handlePrevDay}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Ir al día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-NI', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>

            {/* Flecha Día Siguiente */}
            <button
              onClick={handleNextDay}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Ir al día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>
              Responsable: <strong className="text-white">{activeDaySummary.responsible}</strong>
            </span>
            {activeDaySummary.tipsCollected > 0 && (
              <>
                <span>•</span>
                <span>
                  Propinas Recaudadas:{' '}
                  <strong className="text-amber-400 font-mono">
                    C$ {activeDaySummary.tipsCollected.toFixed(2)}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Resumen Compacto de Ganancia Neta — Clickable */}
        <button
          onClick={() => setActiveModal('NET')}
          className="flex items-center gap-3 bg-white/10 hover:bg-white/15 px-4 py-2.5 rounded-xl border border-white/10 transition text-left cursor-pointer"
          title="Haga clic para ver el desglose financiero de ganancia neta"
        >
          <div>
            <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span>Ganancia Neta</span>
              <span className="text-[9px] text-emerald-400 font-normal underline">
                (Ver fórmula)
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              C$ {activeDaySummary.netEarnings.toFixed(2)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 3. Cuadrícula de KPIs Separados por Tipo de Ingreso — Todos Clickables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Apartado 1: Ganancia en Efectivo */}
        <div
          onClick={() => setActiveModal('CASH')}
          className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-2xs transition cursor-pointer"
          title="Haga clic para ver el detalle de ventas en efectivo"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Efectivo en Caja
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            C$ {activeDaySummary.cashSales.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Participación:</span>
            <span className="font-semibold text-emerald-800 font-mono text-[11px]">
              {cashPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-[#1c6856] font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              <span>Ver arqueo y desglose</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Apartado 2: Ganancia en Tarjetas (Total + Bancos) */}
        <div
          onClick={() => setActiveModal('CARDS')}
          className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-2xs transition cursor-pointer"
          title="Haga clic para ver el desglose de tarjetas por banco"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Tarjetas POS (Datáfonos)
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            C$ {activeDaySummary.totalCards.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Participación:</span>
            <span className="font-semibold text-sky-800 font-mono text-[11px]">
              {cardsPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-sky-700 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Ver 4 bancos</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Apartado 3: PedidosYa & Delivery */}
        <div
          onClick={() => setActiveModal('DELIVERY')}
          className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-2xs transition cursor-pointer"
          title="Haga clic para ver el detalle de pedidos y delivery"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Delivery / PedidosYa
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            C$ {activeDaySummary.pedidosYaSales.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Participación:</span>
            <span className="font-semibold text-amber-800 font-mono text-[11px]">
              {pedidosYaPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              <span>Ver detalle delivery</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Apartado 4: Total Ventas Brutas */}
        <div
          onClick={() => setActiveModal('GROSS')}
          className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-2xs transition cursor-pointer"
          title="Haga clic para ver el resumen consolidado de ventas"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Ventas Totales Brutas
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            C$ {activeDaySummary.totalGrossSales.toFixed(2)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Compras Insumos:</span>
            <span className="font-semibold text-rose-700 font-mono text-[11px]">
              - C$ {activeDaySummary.totalExpenses.toFixed(2)}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700 font-medium flex items-center justify-between">
            <span>Ver consolidado completo</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* 4. Desglose Específico de Tarjetas por Banco — Todos los Bancos Clickables */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Desglose Individual de Tarjetas por Banco
            </h3>
          </div>
          <button
            onClick={() => setActiveModal('CARDS')}
            className="text-xs font-mono font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl border border-indigo-200 transition cursor-pointer"
            title="Haga clic para ver resumen de tarjetas"
          >
            Total Tarjetas: C$ {activeDaySummary.totalCards.toFixed(2)}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* BAC */}
          <div
            onClick={() => setActiveModal('BAC')}
            className="p-4 rounded-xl bg-rose-50/60 hover:bg-rose-50 border border-rose-200/80 hover:border-rose-300 flex items-center justify-between transition cursor-pointer group shadow-2xs"
            title="Haga clic para ver el detalle de BAC Credomatic"
          >
            <div>
              <div className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider">
                BAC Credomatic
              </div>
              <div className="text-lg font-black font-mono text-slate-900 group-hover:text-rose-700 transition-colors mt-1">
                C$ {activeDaySummary.cardsBAC.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {activeDaySummary.totalCards > 0
                  ? ((activeDaySummary.cardsBAC / activeDaySummary.totalCards) * 100).toFixed(1)
                  : 0}% del datáfono
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-rose-600 font-black flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition-transform">
              BAC
            </div>
          </div>

          {/* FICOHSA */}
          <div
            onClick={() => setActiveModal('FICOHSA')}
            className="p-4 rounded-xl bg-purple-50/60 hover:bg-purple-50 border border-purple-200/80 hover:border-purple-300 flex items-center justify-between transition cursor-pointer group shadow-2xs"
            title="Haga clic para ver el detalle de Banco Ficohsa"
          >
            <div>
              <div className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                Banco Ficohsa
              </div>
              <div className="text-lg font-black font-mono text-slate-900 group-hover:text-purple-700 transition-colors mt-1">
                C$ {activeDaySummary.cardsFicohsa.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {activeDaySummary.totalCards > 0
                  ? ((activeDaySummary.cardsFicohsa / activeDaySummary.totalCards) * 100).toFixed(1)
                  : 0}% del datáfono
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-purple-200 text-purple-600 font-black flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition-transform">
              FICO
            </div>
          </div>

          {/* BANPRO */}
          <div
            onClick={() => setActiveModal('BANPRO')}
            className="p-4 rounded-xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/80 hover:border-emerald-300 flex items-center justify-between transition cursor-pointer group shadow-2xs"
            title="Haga clic para ver el detalle de Banpro Promerica"
          >
            <div>
              <div className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                Banpro Promerica
              </div>
              <div className="text-lg font-black font-mono text-slate-900 group-hover:text-emerald-700 transition-colors mt-1">
                C$ {activeDaySummary.cardsBanpro.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {activeDaySummary.totalCards > 0
                  ? ((activeDaySummary.cardsBanpro / activeDaySummary.totalCards) * 100).toFixed(1)
                  : 0}% del datáfono
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 text-emerald-600 font-black flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition-transform">
              BAN
            </div>
          </div>

          {/* LAFISE */}
          <div
            onClick={() => setActiveModal('LAFISE')}
            className="p-4 rounded-xl bg-blue-50/60 hover:bg-blue-50 border border-blue-200/80 hover:border-blue-300 flex items-center justify-between transition cursor-pointer group shadow-2xs"
            title="Haga clic para ver el detalle de Banco LAFISE"
          >
            <div>
              <div className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                Banco LAFISE
              </div>
              <div className="text-lg font-black font-mono text-slate-900 group-hover:text-blue-700 transition-colors mt-1">
                C$ {activeDaySummary.cardsLafise.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {activeDaySummary.totalCards > 0
                  ? ((activeDaySummary.cardsLafise / activeDaySummary.totalCards) * 100).toFixed(1)
                  : 0}% del datáfono
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 text-blue-600 font-black flex items-center justify-center text-xs shadow-2xs group-hover:scale-105 transition-transform">
              LAF
            </div>
          </div>
        </div>
      </div>

      {/* 5. Gráfica Visual de Ganancias & Evolución Temporal */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Línea de Tiempo & Comparativa Visual de Ganancias
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativa día a día: Lo Generado (Ventas) vs Gastos de Caja Chica (barras a la par)
            </p>
          </div>

          {/* Filtro de Rango para la Gráfica */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start">
            <button
              onClick={() => setTimeFilter('7days')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                timeFilter === '7days' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setTimeFilter('14days')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                timeFilter === '14days' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 Días
            </button>
            <button
              onClick={() => setTimeFilter('30days')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                timeFilter === '30days' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Días
            </button>
          </div>
        </div>

        {/* Leyenda de la Gráfica */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
            <span className="text-slate-700">Efectivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-600 inline-block" />
            <span className="text-slate-700">Tarjetas POS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
            <span className="text-slate-700">PedidosYa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-500 inline-block" />
            <span className="text-slate-700">Otros Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
            <span className="text-slate-900 font-extrabold">Gastos Caja Chica (A la par)</span>
          </div>
        </div>

        {/* Contenedor Gráfico Interactivo de Barras */}
        {chartDays.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No hay datos suficientes registrados para mostrar la gráfica
          </div>
        ) : (
          <div className="relative pt-6 pb-2">
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-3 px-2">
              {chartDays.map((d, idx) => {
                const salesTotal = d.totalGrossSales;
                const expensesTotal = d.totalExpenses;
                const isSelected = d.date === selectedDate;
                const isHovered = hoveredBarIndex === idx;

                const salesHeightPct = maxSales > 0 ? (salesTotal / maxSales) * 100 : 0;
                const expensesHeightPct = maxSales > 0 ? (expensesTotal / maxSales) * 100 : 0;

                const cashPctOfSales = salesTotal > 0 ? (d.cashSales / salesTotal) * 100 : 0;
                const cardPctOfSales = salesTotal > 0 ? (d.totalCards / salesTotal) * 100 : 0;
                const pedidosYaPctOfSales = salesTotal > 0 ? (d.pedidosYaSales / salesTotal) * 100 : 0;
                const otherPctOfSales = salesTotal > 0 ? ((d.otherIncomeSales || 0) / salesTotal) * 100 : 0;

                return (
                  <div
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Tooltip Emergente */}
                    {isHovered && (
                      <div className="absolute -top-36 z-30 bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl shadow-2xl text-left whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95 pointer-events-none">
                        <div className="font-extrabold text-xs text-amber-400 capitalize flex items-center justify-between gap-3">
                          <span>{d.dayLabel}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{d.date}</span>
                        </div>
                        <div className="text-[11px] font-mono mt-2 space-y-1">
                          <div className="text-emerald-300 flex items-center justify-between gap-4">
                            <span>Efectivo:</span>
                            <span className="font-bold">C$ {d.cashSales.toFixed(2)}</span>
                          </div>
                          <div className="text-indigo-300 flex items-center justify-between gap-4">
                            <span>Tarjetas:</span>
                            <span className="font-bold">C$ {d.totalCards.toFixed(2)}</span>
                          </div>
                          {d.pedidosYaSales > 0 && (
                            <div className="text-amber-300 flex items-center justify-between gap-4">
                              <span>PedidosYa:</span>
                              <span className="font-bold">C$ {d.pedidosYaSales.toFixed(2)}</span>
                            </div>
                          )}
                          {(d.otherIncomeSales || 0) > 0 && (
                            <div className="text-purple-300 flex items-center justify-between gap-4">
                              <span>Otros Ingresos:</span>
                              <span className="font-bold">C$ {(d.otherIncomeSales || 0).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="text-slate-100 font-extrabold pt-1 border-t border-slate-700 flex items-center justify-between gap-4">
                            <span>Total Generado:</span>
                            <span className="text-white">C$ {salesTotal.toFixed(2)}</span>
                          </div>
                          <div className="text-rose-300 pt-1 border-t border-slate-800 flex items-center justify-between gap-4">
                            <span>Gastos Caja:</span>
                            <span className="font-bold">- C$ {expensesTotal.toFixed(2)}</span>
                          </div>
                          <div className="text-emerald-400 font-black pt-1 border-t border-slate-700 flex items-center justify-between gap-4">
                            <span>Ganancia Neta:</span>
                            <span>C$ {d.netEarnings.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Badge numérico encima de las barras si está seleccionada */}
                    {isSelected && (
                      <div className="flex items-center gap-1 mb-1 animate-bounce">
                        <span className="text-[9px] font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded shadow-2xs">
                          C$ {Math.round(salesTotal)}
                        </span>
                      </div>
                    )}

                    {/* Contenedor de las dos barras A LA PAR (Generado vs Gastos) */}
                    <div
                      className={`w-full max-w-[52px] h-full flex items-end justify-center gap-1 sm:gap-1.5 p-1 rounded-xl transition-all duration-300 ${
                        isSelected
                          ? 'bg-indigo-50/70 ring-2 ring-indigo-600 ring-offset-2 shadow-sm'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Barra 1: Lo Generado (Ventas Apiladas) */}
                      <div
                        className="w-1/2 max-w-[20px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 shadow-2xs"
                        style={{ height: `${Math.max(salesHeightPct, salesTotal > 0 ? 5 : 2)}%` }}
                        title={`Generado: C$ ${salesTotal.toFixed(2)}`}
                      >
                        {salesTotal === 0 ? (
                          <div className="w-full h-[2px] bg-slate-200 rounded-full" />
                        ) : (
                          <>
                            {otherPctOfSales > 0 && (
                              <div
                                className="w-full bg-purple-500"
                                style={{ height: `${otherPctOfSales}%` }}
                              />
                            )}
                            {pedidosYaPctOfSales > 0 && (
                              <div
                                className="w-full bg-amber-500"
                                style={{ height: `${pedidosYaPctOfSales}%` }}
                              />
                            )}
                            {cardPctOfSales > 0 && (
                              <div
                                className="w-full bg-indigo-600"
                                style={{ height: `${cardPctOfSales}%` }}
                              />
                            )}
                            {cashPctOfSales > 0 && (
                              <div
                                className="w-full bg-emerald-500"
                                style={{ height: `${cashPctOfSales}%` }}
                              />
                            )}
                          </>
                        )}
                      </div>

                      {/* Barra 2: Gastos de Caja Chica (A LA PAR) */}
                      <div
                        className="w-1/2 max-w-[20px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 shadow-2xs"
                        style={{ height: `${Math.max(expensesHeightPct, expensesTotal > 0 ? 5 : 2)}%` }}
                        title={`Gastos Caja Chica: C$ ${expensesTotal.toFixed(2)}`}
                      >
                        {expensesTotal === 0 ? (
                          <div className="w-full h-[2px] bg-slate-200 rounded-full" />
                        ) : (
                          <div className="w-full h-full bg-rose-500 hover:bg-rose-600 transition-colors" />
                        )}
                      </div>
                    </div>

                    {/* Etiqueta del Eje X */}
                    <div
                      className={`mt-2 text-[10px] font-bold truncate max-w-full text-center ${
                        isSelected ? 'text-indigo-700 font-black' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    >
                      {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Tabla del Tiempo Cronológica (Historial Día a Día) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Tabla del Tiempo • Registro Cronológico Completo
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier día para inspeccionar su desglose exacto o imprimir su reporte
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportMonthlyEarningsToExcel(dailySummaries, state)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition cursor-pointer"
              title="Exportar consolidado histórico completo a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Consolidado en Excel</span>
            </button>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {dailySummaries.length} Jornadas Registradas
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha / Día</th>
                <th className="py-3 px-4 text-right">Efectivo</th>
                <th className="py-3 px-4 text-right">Tarjetas</th>
                <th className="py-3 px-4 text-right">PedidosYa</th>
                <th className="py-3 px-4 text-right">Otros Ing.</th>
                <th className="py-3 px-4 text-right">Total Ventas</th>
                <th className="py-3 px-4 text-right">Gastos Caja</th>
                <th className="py-3 px-4 text-right">Ganancia Neta</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {dailySummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400">
                    No se han registrado turnos ni ventas todavía
                  </td>
                </tr>
              ) : (
                dailySummaries.map((row) => {
                  const isSelected = row.date === selectedDate;
                  return (
                    <tr
                      key={row.date}
                      onClick={() => setSelectedDate(row.date)}
                      className={`hover:bg-indigo-50/40 transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 capitalize flex items-center gap-1.5">
                          {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                          <span>{row.dayLabel}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{row.date}</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        C$ {row.cashSales.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                        C$ {row.totalCards.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-amber-700">
                        C$ {row.pedidosYaSales.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-purple-700">
                        C$ {(row.otherIncomeSales || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        C$ {row.totalGrossSales.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-rose-600">
                        - C$ {row.totalExpenses.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                        C$ {row.netEarnings.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-slate-700 truncate max-w-[120px]">
                        {row.responsible}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {row.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Abierto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Cerrado
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(row.date);
                              setActiveModal('GROSS');
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                            title="Ver resumen completo"
                          >
                            Detalle
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportDailyEarningsToExcel(row, state);
                            }}
                            className="p-1 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition cursor-pointer"
                            title="Descargar Estado de Resultados de este día en Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(row.date);
                              setShowPrintActaModal(true);
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Imprimir Acta Oficial B/N de este día"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(row.date);
                              handleOpenEditForm(row);
                            }}
                            className="p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                            title="Editar ventas de este día"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

      {/* ======================================================== */}
      {/* MODALES INTERACTIVOS DE DETALLE (TODOS LOS BOTONES VIVOS) */}
      {/* ======================================================== */}

      {/* Modal 1: Detalle de Efectivo en Caja */}
      {activeModal === 'CASH' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-[#1c6856] border border-emerald-200">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Efectivo de Ventas en Caja
                  </h3>
                  <p className="text-xs text-slate-500">{activeDaySummary.dayLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Efectivo Recaudado
              </span>
              <span className="text-3xl font-black font-mono text-[#1c6856] mt-1 block">
                C$ {activeDaySummary.cashSales.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
                Representa el {cashPercent.toFixed(1)}% de las ventas brutas
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Origen del Dinero:</span>
                <span className="font-bold text-slate-800">Ventas en Sala / Barra Restaurante</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Estado de Caja General:</span>
                <span className="font-bold text-slate-800">
                  {activeDaySummary.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Responsable:</span>
                <span className="font-bold text-slate-800">{activeDaySummary.responsible}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  handleOpenEditForm(activeDaySummary);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Monto</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Detalle de Tarjetas POS por Banco */}
      {(activeModal === 'CARDS' ||
        activeModal === 'BAC' ||
        activeModal === 'FICOHSA' ||
        activeModal === 'BANPRO' ||
        activeModal === 'LAFISE') && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {activeModal === 'BAC'
                      ? 'BAC Credomatic'
                      : activeModal === 'FICOHSA'
                      ? 'Banco Ficohsa'
                      : activeModal === 'BANPRO'
                      ? 'Banpro Promerica'
                      : activeModal === 'LAFISE'
                      ? 'Banco LAFISE'
                      : 'Tarjetas POS (Datáfonos)'}
                  </h3>
                  <p className="text-xs text-slate-500">{activeDaySummary.dayLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {activeModal === 'BAC'
                  ? 'Ventas BAC'
                  : activeModal === 'FICOHSA'
                  ? 'Ventas Ficohsa'
                  : activeModal === 'BANPRO'
                  ? 'Ventas Banpro'
                  : activeModal === 'LAFISE'
                  ? 'Ventas Lafise'
                  : 'Total Tarjetas POS'}
              </span>
              <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">
                C${' '}
                {activeModal === 'BAC'
                  ? activeDaySummary.cardsBAC.toFixed(2)
                  : activeModal === 'FICOHSA'
                  ? activeDaySummary.cardsFicohsa.toFixed(2)
                  : activeModal === 'BANPRO'
                  ? activeDaySummary.cardsBanpro.toFixed(2)
                  : activeModal === 'LAFISE'
                  ? activeDaySummary.cardsLafise.toFixed(2)
                  : activeDaySummary.totalCards.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
                Representa el {cardsPercent.toFixed(1)}% de las ventas brutas
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-rose-800">BAC Credomatic</span>
                <span className="font-mono font-bold text-slate-900">
                  C$ {activeDaySummary.cardsBAC.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-purple-800">Banco Ficohsa</span>
                <span className="font-mono font-bold text-slate-900">
                  C$ {activeDaySummary.cardsFicohsa.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-emerald-800">Banpro Promerica</span>
                <span className="font-mono font-bold text-slate-900">
                  C$ {activeDaySummary.cardsBanpro.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-blue-800">Banco LAFISE</span>
                <span className="font-mono font-bold text-slate-900">
                  C$ {activeDaySummary.cardsLafise.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  handleOpenEditForm(activeDaySummary);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ajustar Vouchers</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Detalle de PedidosYa / Delivery */}
      {activeModal === 'DELIVERY' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Delivery / PedidosYa</h3>
                  <p className="text-xs text-slate-500">{activeDaySummary.dayLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Facturado en Plataforma
              </span>
              <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">
                C$ {activeDaySummary.pedidosYaSales.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
                Representa el {pedidosYaPercent.toFixed(1)}% de las ventas brutas
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Plataforma:</span>
                <span className="font-bold text-slate-800">PedidosYa Nicaragua</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Cobro:</span>
                <span className="font-bold text-slate-800">Liquidación bancaria quincenal</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  handleOpenEditForm(activeDaySummary);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modificar Monto</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Resumen de Ventas Brutas */}
      {activeModal === 'GROSS' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Consolidado de Ventas Brutas
                  </h3>
                  <p className="text-xs text-slate-500">{activeDaySummary.dayLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Ventas Brutas
              </span>
              <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">
                C$ {activeDaySummary.totalGrossSales.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700 font-bold">Efectivo en Caja:</span>
                <span className="font-mono font-bold">C$ {activeDaySummary.cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700 font-bold">Tarjetas POS (4 Bancos):</span>
                <span className="font-mono font-bold">C$ {activeDaySummary.totalCards.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-700 font-bold">Delivery / PedidosYa:</span>
                <span className="font-mono font-bold">C$ {activeDaySummary.pedidosYaSales.toFixed(2)}</span>
              </div>
              {(activeDaySummary.otherIncomeSales || 0) > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-700 font-bold">Otros Ingresos:</span>
                  <span className="font-mono font-bold">C$ {(activeDaySummary.otherIncomeSales || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  setShowPrintActaModal(true);
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Acta Oficial (B/N)</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Estado de Resultados & Utilidad Neta (Fórmula Financiera) */}
      {activeModal === 'NET' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-[#1c6856] border border-emerald-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Balance Financiero & Utilidad Neta
                  </h3>
                  <p className="text-xs text-slate-500">{activeDaySummary.dayLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Ganancia Neta Disponible
              </span>
              <span className="text-3xl font-black font-mono text-[#1c6856] mt-1 block">
                C$ {activeDaySummary.netEarnings.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1 inline-block">
                Utilidad calculada restando todos los gastos operativos del día
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 font-bold text-slate-800">
                <span>(+) Ventas Totales Brutas</span>
                <span className="font-mono text-[#1c6856]">
                  + C$ {activeDaySummary.totalGrossSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>(-) Compras Caja Chica (Efectivo)</span>
                <span className="font-mono text-rose-600">
                  - C$ {activeDaySummary.pettyCashExpenses.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>(-) Pagos / Transferencias a Proveedores</span>
                <span className="font-mono text-rose-600">
                  - C$ {activeDaySummary.transfersPaid.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-100 font-black text-slate-900 text-sm border border-slate-200">
                <span>(=) GANANCIA NETA FINAL</span>
                <span className="font-mono text-[#1c6856]">C$ {activeDaySummary.netEarnings.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  if (onNavigateToTab) onNavigateToTab('pettyCash');
                }}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Ver Gastos en Caja Chica</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Formulario Completo de Ingreso / Edición de Ventas del Día */}
      {activeModal === 'REGISTER_SALES' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-y-auto max-h-[92vh] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-[#1c6856] border border-emerald-200">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Registrar / Ajustar Ventas del Día
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fecha: <strong>{selectedDate}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ingresa los montos correspondientes a cada método de pago. Al guardar se actualizarán
              los gráficos, tarjetas y reportes inmediatamente.
            </p>

            <div className="space-y-3 text-xs">
              {/* Efectivo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ventas en Efectivo (C$)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={editForm.salesCash}
                  onChange={(e) => setEditForm({ ...editForm, salesCash: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              {/* Tarjetas por Banco */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-rose-700 block mb-1">BAC Credomatic (C$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editForm.cardsBAC}
                    onChange={(e) => setEditForm({ ...editForm, cardsBAC: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                  />
                </div>
                <div>
                  <label className="font-bold text-purple-700 block mb-1">Banco Ficohsa (C$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editForm.cardsFicohsa}
                    onChange={(e) => setEditForm({ ...editForm, cardsFicohsa: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-700 block mb-1">Banpro (C$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editForm.cardsBanpro}
                    onChange={(e) => setEditForm({ ...editForm, cardsBanpro: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                  />
                </div>
                <div>
                  <label className="font-bold text-blue-700 block mb-1">Banco LAFISE (C$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editForm.cardsLafise}
                    onChange={(e) => setEditForm({ ...editForm, cardsLafise: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                  />
                </div>
              </div>

              {/* PedidosYa */}
              <div className="pt-1">
                <label className="font-bold text-slate-700 block mb-1">
                  Delivery / PedidosYa (C$)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={editForm.salesPedidosYa}
                  onChange={(e) => setEditForm({ ...editForm, salesPedidosYa: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                />
              </div>

              {/* Propinas */}
              <div className="pt-1">
                <label className="font-bold text-slate-700 block mb-1">
                  Propinas Recaudadas (10%) (C$)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={editForm.tipsCollected}
                  onChange={(e) => setEditForm({ ...editForm, tipsCollected: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1c6856]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveSales}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar y Actualizar Día</span>
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold transition hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impresión Oficial B/N (1 o 2 Hojas) */}
      <PrintOfficialActModal
        isOpen={showPrintActaModal}
        onClose={() => setShowPrintActaModal(false)}
        dateStr={selectedDate}
        onPrint={handlePrintActa}
      />
    </div>
  );
};
