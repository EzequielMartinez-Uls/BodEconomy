import React from 'react';
import { AppState } from '../types';
import { printThermalClosingTicket, printThermalOpeningTicket } from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import { getLocalTodayStr, extractLocalDateStr } from '../utils/dateUtils';
import {
  FileSpreadsheet,
  Printer,
  Coins,
  CreditCard,
  Wallet,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  state: AppState;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onGoToPettyCash: () => void;
}

export const DailySpreadsheetView: React.FC<Props> = ({
  state,
  onOpenShiftClick,
  onCloseShiftClick,
  onGoToPettyCash,
}) => {
  const currentShift = state.currentShift;
  const lastClosedShift = state.shiftHistory[0] || null;
  const shiftToShow = currentShift || lastClosedShift;

  const isShiftOpen = currentShift !== null && currentShift.status === 'OPEN';

  // Gastos de Caja Chica del turno / día actual
  const todayExpenses = state.pettyCashTransactions.filter((tx) => {
    if (!tx.date) return false;
    const txDate = extractLocalDateStr(tx.date);
    const targetDate = shiftToShow ? shiftToShow.date : getLocalTodayStr();
    return txDate === targetDate && tx.type === 'EXPENSE';
  });

  const cashExpensesTotal = todayExpenses
    .filter((tx) => tx.method === 'CASH')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const transferExpensesTotal = todayExpenses
    .filter((tx) => tx.method === 'TRANSFER')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Valores de ventas e ingresos del turno visible
  const salesCash = shiftToShow?.salesCashSystem || 0;
  const bac = shiftToShow?.cardsBAC || 0;
  const ficohsa = shiftToShow?.cardsFicohsa || 0;
  const banpro = shiftToShow?.cardsBanpro || 0;
  const lafise = shiftToShow?.cardsLafise || 0;
  const totalCards = bac + ficohsa + banpro + lafise;
  const pedYa = shiftToShow?.salesPedidosYa || 0;
  const totalGrossIncome = salesCash + totalCards + pedYa;

  // Egresos del turno
  const tips = shiftToShow?.tipPaid ? (shiftToShow?.totalTipCollected || 0) : 0;
  const overtime = shiftToShow?.overtimePaidCash || 0;
  const extraDays = shiftToShow?.extraDaysPaidCash || 0;
  const dgi = shiftToShow?.reserveDGI || 0;
  const payroll = shiftToShow?.reservePayroll || 0;
  const vacations = shiftToShow?.reserveVacations || 0;
  const totalWithdrawals = (shiftToShow?.transferToPettyCash || 0) + overtime + extraDays + dgi + payroll + vacations;
  const totalEgress = cashExpensesTotal + transferExpensesTotal + tips + totalWithdrawals;

  // Utilidad neta del turno
  const netProfit = totalGrossIncome - totalEgress;

  return (
    <div className="space-y-6">
      {/* Header Estilo Planilla Contable */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/25">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Planilla Diaria & Hoja de Cuadre
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {shiftToShow ? shiftToShow.date : getLocalTodayStr()}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vista unificada de Caja Grande (Ventas), Caja Chica (Gastos) y Cuadre de Turno
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {shiftToShow && (
            <>
              <button
                onClick={() => {
                  if (shiftToShow.status === 'CLOSED') {
                    printThermalClosingTicket(shiftToShow);
                  } else {
                    printThermalOpeningTicket(shiftToShow);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                <Printer className="w-4 h-4 text-amber-600" />
                <span>Imprimir 80mm</span>
              </button>

              <button
                onClick={() => exportShiftToExcel(shiftToShow, state)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Excel (.xlsx)</span>
              </button>
            </>
          )}

          {isShiftOpen ? (
            <button
              onClick={onCloseShiftClick}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md shadow-rose-600/25 transition active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Turno & Liquidar</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftClick}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Turno de Hoy</span>
            </button>
          )}
        </div>
      </div>

      {/* Resumen Superior — 2 Cajas: Caja Grande y Caja Chica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. CAJA GRANDE (GAVETA DE VENTAS) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              Caja Grande (Gaveta de Ventas)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {isShiftOpen ? 'Turno Abierto' : 'Último Cierre'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              C$ {(isShiftOpen
                ? shiftToShow?.totalOpeningEquivNIO || 0
                : shiftToShow?.totalClosingEquivNIO || shiftToShow?.totalOpeningEquivNIO || 0
              ).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isShiftOpen
                ? `Fondo apertura contado por ${shiftToShow?.openedBy || 'Eddy'} · Ventas en efectivo: C$ ${(shiftToShow?.salesCashSystem || 0).toFixed(2)}`
                : `Saldo cierre contado · Fondo apertura mañana`}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Venta Bruta Acumulada</span>
              <span className="font-mono font-bold text-emerald-700">C$ {totalGrossIncome.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Retiros / Deducciones</span>
              <span className="font-mono font-bold text-rose-600">−C$ {totalWithdrawals.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 2. CAJA CHICA (FONDO OPERATIVO) */}
        <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-6 -mt-6"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-blue-600" />
              Caja Chica (Fondo Operativo)
            </span>
            <button
              onClick={onGoToPettyCash}
              className="text-[10px] font-bold text-blue-700 hover:underline"
            >
              Ver Movimientos →
            </button>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              C$ {state.pettyCashBalance.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Saldo disponible en fondo de compras y gastos operativos
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Gastos en Efectivo Hoy</span>
              <span className="font-mono font-bold text-rose-600">−C$ {cashExpensesTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Pagos por Transferencia</span>
              <span className="font-mono font-bold text-rose-600">−C$ {transferExpensesTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* LA PLANILLA MAESTRA INTEGRAL (TABLA ESTILO EXCEL CON SUPERPODERES) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
              Hoja de Trabajo y Cuadre de Turno (Auditoría Cruzada Eddy & Xiomara)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tasa de Cambio Oficial: <strong className="text-slate-800 font-mono">C$ {shiftToShow?.exchangeRate || state.defaultExchangeRate}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* COLUMNA IZQUIERDA: INGRESOS & VENTAS */}
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Ventas Registradas del Día (Ingresos)
              </h4>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Total: C$ {totalGrossIncome.toFixed(2)}
              </span>
            </div>

            <table className="w-full text-xs">
              <thead className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="text-left pb-2">Canal / Medio de Pago</th>
                  <th className="text-right pb-2">Monto (C$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ventas en Efectivo
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                    C$ {salesCash.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Vouchers Tarjetas BAC Credomatic
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-800">
                    C$ {bac.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Vouchers Tarjetas Ficohsa
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-800">
                    C$ {ficohsa.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Vouchers Tarjetas Banpro
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-800">
                    C$ {banpro.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    Vouchers Tarjetas Lafise
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-800">
                    C$ {lafise.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    PedidosYa (Ventas Plataforma)
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-800">
                    C$ {pedYa.toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t border-slate-200 font-extrabold text-slate-900 bg-slate-50/50">
                <tr>
                  <td className="py-2.5 px-2">Subtotal Venta Bruta</td>
                  <td className="py-2.5 px-2 text-right font-mono text-sm text-blue-900">
                    C$ {totalGrossIncome.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Arqueo de Apertura (Caja de Vueltos) */}
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  Fondo de Apertura (Caja de Vueltos Inicial)
                </span>
                <span className="font-mono">
                  C$ {shiftToShow?.totalOpeningEquivNIO.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="text-[11px] text-amber-800 flex justify-between">
                <span>Abierto por: <strong>{shiftToShow?.openedBy || 'Eddy'}</strong></span>
                <span className="font-mono">
                  C$ {shiftToShow?.totalOpeningNIO || 0} + US$ {shiftToShow?.totalOpeningUSD || 0}
                </span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: EGRESOS, CAJA GRANDE Y CUADRE */}
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-rose-600" />
                Gastos Operativos & Deducciones (Egresos)
              </h4>
              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                Total: C$ {totalEgress.toFixed(2)}
              </span>
            </div>

            <table className="w-full text-xs">
              <thead className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                <tr>
                  <th className="text-left pb-2">Concepto de Egreso</th>
                  <th className="text-right pb-2">Monto (C$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-2 text-slate-700">Gastos Caja Chica (Efectivo en gaveta)</td>
                  <td className="py-2 text-right font-mono font-bold text-slate-800">
                    C$ {cashExpensesTotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-700">Compras pagadas por Transferencia Bancaria</td>
                  <td className="py-2 text-right font-mono text-slate-800">
                    C$ {transferExpensesTotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-700">
                    Propinas Repartidas ({shiftToShow?.staffCount || 10} personas)
                  </td>
                  <td className="py-2 text-right font-mono text-slate-800">
                    C$ {tips.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-700">Horas Extras y Feriados en Efectivo</td>
                  <td className="py-2 text-right font-mono text-slate-800">
                    C$ {overtime.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-700">Reservas (DGI + Planilla + Vacaciones)</td>
                  <td className="py-2 text-right font-mono text-slate-800">
                    C$ {(dgi + payroll + vacations).toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t border-slate-200 font-extrabold text-slate-900 bg-slate-50/50">
                <tr>
                  <td className="py-2.5 px-2">Total Egresos del Día</td>
                  <td className="py-2.5 px-2 text-right font-mono text-sm text-rose-900">
                    C$ {totalEgress.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* RESUMEN CUADRE DE CAJA GRANDE */}
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-amber-900 font-extrabold text-sm border-b border-amber-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  Saldo al Cierre de Caja Grande
                </span>
                <span className="font-mono text-base">
                  C$ {(shiftToShow?.totalClosingEquivNIO || shiftToShow?.totalOpeningEquivNIO || 0).toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                <div>
                  <span className="block text-slate-400">Fondo Apertura Mañana:</span>
                  <span className="font-mono font-bold text-amber-800">
                    C$ {(shiftToShow?.totalClosingEquivNIO || shiftToShow?.totalOpeningEquivNIO || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Utilidad Neta de la Jornada:</span>
                  <span className={`font-mono font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    C$ {netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnóstico de Cuadre */}
            <div className="pt-2">
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                shiftToShow?.auditStatus === 'SQUARED' || !shiftToShow
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : shiftToShow.auditStatus === 'SURPLUS'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Estado de Cuadre: {shiftToShow?.auditStatus === 'SQUARED' ? 'CUADRADO EXACTO' : shiftToShow?.auditStatus === 'SURPLUS' ? 'SOBRANTE' : shiftToShow?.auditStatus === 'SHORTAGE' ? 'FALTANTE' : 'EN OPERACIÓN'}
                  </span>
                </div>
                <span className="font-mono text-sm">
                  {shiftToShow?.differenceNIO !== undefined
                    ? `${shiftToShow.differenceNIO >= 0 ? '+' : ''}C$ ${shiftToShow.differenceNIO.toFixed(2)}`
                    : 'C$ 0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
