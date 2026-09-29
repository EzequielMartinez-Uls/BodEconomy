import React, { useState } from 'react';
import { AppState } from '../types';
import {
  User,
  ChevronDown,
  Printer,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Cloud,
} from 'lucide-react';
import {
  printThermalOpeningTicket,
  printThermalClosingTicket,
  printThermalDailyExpensesTicket,
  printOfficialActBN,
  printOfficialOpeningActBN,
} from '../services/thermalPrint';
import { CloudSyncModal } from './CloudSyncModal';
import { PrintOfficialActModal } from './PrintOfficialActModal';
import { getLocalTodayStr, extractLocalDateStr } from '../utils/dateUtils';

interface Props {
  state: AppState;
  onSelectAdminClick: () => void;
  onOpenShiftClick?: () => void;
  onCloseShiftClick?: () => void;
}

export const TopBar: React.FC<Props> = ({
  state,
  onSelectAdminClick,
  onOpenShiftClick,
  onCloseShiftClick,
}) => {
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const isShiftOpen = state.currentShift?.status === 'OPEN';
  const todayDateStr = state.currentShift?.date || getLocalTodayStr();
  const today = new Date().toLocaleDateString('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handlePrintActaTopBar = (modo: 'TODO' | 'GENERAL' | 'CHICA' | 'APERTURA') => {
    const shift =
      state.currentShift?.date === todayDateStr
        ? state.currentShift
        : state.shiftHistory.find((s) => s.date === todayDateStr) || state.currentShift || state.shiftHistory[0];

    if (modo === 'APERTURA') {
      if (shift) {
        printOfficialOpeningActBN(shift, state.activeAdminName);
      } else {
        alert('No hay un turno de caja disponible para imprimir el acta de apertura.');
      }
      setPrintModalOpen(false);
      return;
    }

    const pettyShift =
      state.currentPettyCashShift?.date === todayDateStr
        ? state.currentPettyCashShift
        : state.pettyCashShiftHistory.find((s) => s.date === todayDateStr) || state.currentPettyCashShift;

    const dayTransactions = (state.pettyCashTransactions || [])
      .filter((t) => t.type === 'EXPENSE' && extractLocalDateStr(t.date) === todayDateStr)
      .map((t) => ({
        id: t.id,
        hora: new Date(t.date).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
        categoria: t.category,
        concepto: t.notes || t.vendor,
        proveedor: t.vendor,
        metodo: t.method === 'CASH' ? 'Efectivo' : 'Transferencia',
        estado: t.receiptNumber ? `#${t.receiptNumber}` : 'Comprobante',
        referencia: t.receiptNumber,
        monto: t.amount,
      }));

    const salesCash =
      shift?.salesCashSystem !== undefined
        ? shift.salesCashSystem
        : shift?.loyverseValidation?.salesCashLoyverse || 0;

    const cardsBAC =
      shift?.cardsBAC !== undefined
        ? shift.cardsBAC
        : shift?.loyverseValidation?.cardsBAC || 0;

    const cardsFicohsa =
      shift?.cardsFicohsa !== undefined
        ? shift.cardsFicohsa
        : shift?.loyverseValidation?.cardsFicohsa || 0;

    const cardsBanpro =
      shift?.cardsBanpro !== undefined
        ? shift.cardsBanpro
        : shift?.loyverseValidation?.cardsBanpro || 0;

    const cardsLafise =
      shift?.cardsLafise !== undefined
        ? shift.cardsLafise
        : shift?.loyverseValidation?.cardsLafise || 0;

    const totalCards =
      shift?.totalCards !== undefined
        ? shift.totalCards
        : cardsBAC + cardsFicohsa + cardsBanpro + cardsLafise;

    const salesPedidosYa =
      shift?.salesPedidosYa !== undefined
        ? shift.salesPedidosYa
        : shift?.loyverseValidation?.salesPedidosYa || 0;

    const totalGross =
      shift?.totalGrossSales !== undefined && shift.totalGrossSales > 0
        ? shift.totalGrossSales
        : salesCash + totalCards + salesPedidosYa;

    const expensesCash = dayTransactions
      .filter((t) => t.metodo === 'Efectivo')
      .reduce((acc, t) => acc + t.monto, 0);

    const expensesTransf = dayTransactions
      .filter((t) => t.metodo === 'Transferencia')
      .reduce((acc, t) => acc + t.monto, 0);

    const expensesTotal = expensesCash + expensesTransf;
    const netProfit = totalGross - expensesTotal;
    const marginPercent = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

    const fondoInicial =
      pettyShift?.initialBalance !== undefined
        ? pettyShift.initialBalance
        : 2000;

    const saldoRemanente = fondoInicial - expensesCash;

    printOfficialActBN({
      shift: shift || state.currentShift,
      date: todayDateStr,
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
      responsableCaja: shift?.closedBy || shift?.openedBy || state.activeAdminName,
      fondoInicial,
      expensesCash,
      expensesTransf,
      expensesTotal,
      saldoRemanente,
      responsableCajaChica: pettyShift?.closedBy || pettyShift?.openedBy || state.activeAdminName,
      transactions: dayTransactions,
    });

    setPrintModalOpen(false);
  };

  return (
    <>
      <header className="h-18 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)]">
        {/* Saludo y Fecha */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                ¡Hola, <span className="text-[#1c6856]">{state.activeAdminName}</span>!
              </h1>
              <button
                onClick={onSelectAdminClick}
                className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1c6856]/10 hover:bg-[#1c6856]/20 text-[#1c6856] border border-[#1c6856]/20 transition cursor-pointer"
                title="Haga clic para cambiar de administrador o turno"
              >
                {state.activeAdminName === 'Eddy' ? 'Apertura Habitual' : state.activeAdminName === 'Xiomara' ? 'Cierre Habitual' : 'Administrador'}
              </button>
            </div>
            <div className="text-xs text-slate-500 capitalize flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{today}</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">El Bodegón Restaurante</span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas del TopBar */}
        <div className="flex items-center gap-3">
          {/* Indicador / Botón de Estado de Caja */}
          {isShiftOpen ? (
            <button
              onClick={onCloseShiftClick}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs transition cursor-pointer"
              title="Caja Abierta - Clic para ver opciones de cierre"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-800">Caja Abierta:</span>
              <span className="font-mono font-bold text-emerald-900">
                C$ {state.currentShift?.totalOpeningEquivNIO.toFixed(2)}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftClick}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 text-xs text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition cursor-pointer"
              title="Caja Cerrada - Clic para abrir turno de hoy"
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Caja Cerrada • Clic para Abrir</span>
            </button>
          )}

          {/* Indicador / Botón de Conexión Nube Supabase */}
          <button
            onClick={() => setCloudModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-900 shadow-2xs transition cursor-pointer"
            title="Clic para verificar estado y probar conexión con Supabase"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Nube Sincronizada</span>
            <span className="sm:hidden">Nube</span>
          </button>

        {/* Botón Impresión Oficial B/N */}
        <button
          onClick={() => setPrintModalOpen(true)}
          title="Imprimir Acta Oficial en Blanco y Negro (1 o 2 Hojas)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">🖨️ Imprimir Acta (B/N)</span>
          <span className="md:hidden">Acta B/N</span>
        </button>

        {/* Acceso Rápido a Impresiones */}
        {isShiftOpen && state.currentShift && (
          <button
            onClick={() => printThermalOpeningTicket(state.currentShift!)}
            title="Imprimir Tique de Apertura (80mm)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5 text-[#1c6856]" />
            <span className="hidden md:inline">Tique Apertura</span>
          </button>
        )}

        {/* Botón Selector de Administrador */}
        <button
          onClick={onSelectAdminClick}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1c6856] text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-[#1c6856]/20">
            {state.activeAdminName.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <span className="block font-bold text-slate-900 text-xs leading-tight">
              {state.activeAdminName}
            </span>
            <span className="block text-[10px] text-slate-500 leading-tight">
              Cambiar Turno
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>
      </div>
    </header>

    <CloudSyncModal
      isOpen={cloudModalOpen}
      onClose={() => setCloudModalOpen(false)}
    />

    <PrintOfficialActModal
      isOpen={printModalOpen}
      onClose={() => setPrintModalOpen(false)}
      dateStr={todayDateStr}
      onPrint={handlePrintActaTopBar}
    />
  </>
  );
};
