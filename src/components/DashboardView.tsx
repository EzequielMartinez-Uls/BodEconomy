import React from 'react';
import { AppState } from '../types';
import { printThermalOpeningTicket } from '../services/thermalPrint';
import { getLocalTodayStr, extractLocalDateStr } from '../utils/dateUtils';
import {
  Wallet,
  UtensilsCrossed,
  Clock,
  Banknote,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Printer,
  Power,
  Coins,
  CheckCircle2,
  TrendingDown,
  ShoppingBag,
  Flame,
} from 'lucide-react';

interface Props {
  state: AppState;
  onOpenShiftClick: () => void;
  onCloseShiftClick: () => void;
  onGoToPettyCash: () => void;
  onGoToTableware: () => void;
}

export const DashboardView: React.FC<Props> = ({
  state,
  onOpenShiftClick,
  onCloseShiftClick,
  onGoToPettyCash,
  onGoToTableware,
}) => {
  const shift = state.currentShift;
  const isShiftOpen = shift?.status === 'OPEN';
  const lastClosed = state.shiftHistory[0] || null;
  const isPettyCashLow = state.pettyCashBalance < 2000;
  const lowStockItems = state.tablewareItems.filter((i) => i.currentStock <= i.minimumStock);

  // Fecha operativa activa (del turno abierto, o hoy)
  const currentShiftDate = shift?.date || (state.currentPettyCashShift?.status === 'OPEN' ? state.currentPettyCashShift.date : getLocalTodayStr());

  // Gastos de caja chica durante este turno activo exclusivamente
  const currentShiftExpenses = (state.pettyCashTransactions || []).filter(
    (tx) => tx.type === 'EXPENSE' && (isShiftOpen ? extractLocalDateStr(tx.date) === currentShiftDate : false)
  );
  const currentShiftExpensesTotal = currentShiftExpenses.reduce((acc, t) => acc + t.amount, 0);

  // Movimientos recientes del turno activo (o de hoy si no hay turno abierto)
  const recentShiftTransactions = (state.pettyCashTransactions || [])
    .filter((tx) => !tx.id.startsWith('pct-init-') && (isShiftOpen ? extractLocalDateStr(tx.date) === currentShiftDate : extractLocalDateStr(tx.date) === getLocalTodayStr()))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Banner Principal de Turno */}
      {isShiftOpen ? (
        <div className="p-6 md:p-8 rounded-xl bg-white border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Jornada Activa en Curso
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Caja Abierta por <span className="text-[#1c6856]">{shift.openedBy}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Inició a las {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({shift.date})
                </span>
                <span>•</span>
                <span>T/C Aplicada: <strong className="text-slate-800">C$ {shift.exchangeRate.toFixed(2)}</strong></span>
                {shift.verifiedPreviousClosingId && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recepción conforme verificada
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-right flex-1 md:flex-none">
                <span className="text-xs text-slate-500 font-semibold block">Fondo de Apertura en Gaveta</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  C$ {shift.totalOpeningEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-500 block font-mono">
                  (C$ {shift.totalOpeningNIO.toFixed(2)} + ${shift.totalOpeningUSD.toFixed(2)} USD)
                </span>
              </div>

              <div className="flex flex-col gap-2 flex-1 md:flex-none">
                <button
                  onClick={onCloseShiftClick}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  <span>Proceder al Cierre de Turno</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => printThermalOpeningTicket(shift)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#1c6856]" />
                  <span>Imprimir Tique de Apertura (80mm)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 md:p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-slate-500 text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Caja Cerrada • Lista para Nueva Jornada
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Bienvenido a <span className="text-[#1c6856]">El Bodegón</span>
            </h1>
            <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
              {lastClosed
                ? `El último turno fue cerrado por ${lastClosed.closedBy} el ${lastClosed.date} dejando un saldo físico de C$ ${lastClosed.totalClosingEquivNIO?.toFixed(2)} en gaveta. Inicia la jornada realizando el arqueo físico conforme.`
                : 'Inicia la jornada de hoy realizando el arqueo físico del fondo de cambio recibido en gaveta para atención al cliente.'}
            </p>
          </div>

          <button
            onClick={onOpenShiftClick}
            className="flex items-center gap-3 px-8 py-3.5 rounded-lg bg-[#1c6856] hover:bg-[#155244] text-white font-black text-base shadow-sm transition active:scale-95 w-full md:w-auto justify-center cursor-pointer"
          >
            <Power className="w-5 h-5" />
            <span>Abrir Caja de Turno</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Grid de Métricas KPI Estilo Tarjetas de Restaurante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo Caja Chica */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Caja Chica (Saldo)
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              C$ {state.pettyCashBalance.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              {isPettyCashLow ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Fondo menor a C$ 2,000
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fondo suficiente
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#1c6856] flex items-center justify-center border border-emerald-200 shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Egresos del Turno Actual */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Compras Turno
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              C$ {currentShiftExpensesTotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {currentShiftExpenses.length} compras de emergencia
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Cristalería y Menaje */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Menaje en Servicio
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {state.tablewareItems.reduce((acc, i) => acc + i.currentStock, 0)} uds
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {lowStockItems.length > 0 ? (
                <span className="text-rose-600 font-bold">
                  {lowStockItems.length} alertas de reposición
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">Stock completo</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-[#1c6856] flex items-center justify-center border border-slate-200 shadow-sm">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Turnos Archivados */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Cierres Archivados
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {state.shiftHistory.length} días
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Actas conciliadas y firmadas
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Secciones de Trabajo Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Caja Chica Rápida */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#1c6856]" />
                Caja Chica & Compras del Día
              </h3>
              <span className="text-xs text-slate-400">
                Últimas compras operativas registradas
              </span>
            </div>
            <button
              onClick={onGoToPettyCash}
              className="text-xs font-bold text-[#1c6856] hover:text-[#155244] flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Todo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentShiftTransactions.length > 0 ? (
              recentShiftTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{tx.vendor}</div>
                    <div className="text-slate-400 text-[11px]">
                      {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      <span className="font-semibold text-slate-600">{tx.method === 'CASH' ? 'Efectivo' : 'Transferencia'}</span> • Por {tx.registeredBy}
                    </div>
                  </div>
                  <div className={`font-mono font-bold text-sm ${tx.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {tx.type === 'EXPENSE' ? '-' : '+'}C$ {tx.amount.toFixed(2)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                Sin movimientos registrados en este turno aún.
              </div>
            )}
          </div>
        </div>

        {/* Menaje y Cristalería Alerta */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-[#1c6856]" />
                Menaje & Alertas de Reposición
              </h3>
              <span className="text-xs text-slate-400">
                Control de cristalería para barra y asador
              </span>
            </div>
            <button
              onClick={onGoToTableware}
              className="text-xs font-bold text-[#1c6856] hover:text-[#155244] flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Todo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {state.tablewareItems.slice(0, 4).map((it) => {
              const isLow = it.currentStock <= it.minimumStock;
              return (
                <div key={it.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{it.name}</div>
                    <div className="text-slate-400 text-[11px] font-medium">
                      Área: {it.area} • Mínimo sugerido: {it.minimumStock} uds
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${isLow ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-800'}`}>
                      {it.currentStock} {it.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
