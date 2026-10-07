import React, { useState } from 'react';
import { AppState, CashShift } from '../types';
import { printThermalClosingTicket } from '../services/thermalPrint';
import { exportShiftToExcel } from '../services/excelExport';
import {
  History,
  Calendar,
  Printer,
  FileSpreadsheet,
  ChevronRight,
  X,
  CreditCard,
  Banknote,
  Receipt,
  Coins,
  CheckCheck,
} from 'lucide-react';

interface Props {
  state: AppState;
}

export const ShiftHistoryView: React.FC<Props> = ({ state }) => {
  const [selectedShift, setSelectedShift] = useState<CashShift | null>(null);

  const shifts = state.shiftHistory;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-[#1c6856]" />
            Histórico de Cierres de Turno & Conciliaciones
          </h2>
          <p className="text-xs text-slate-500">
            Consultas, actas firmadas, reimpresión de tiques térmicos de 80mm y exportación a Excel
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
          {shifts.length} cierres archivados
        </span>
      </div>

      {shifts.length === 0 ? (
        <div className="p-16 bg-white border border-slate-200 rounded-xl text-center space-y-3 shadow-sm">
          <History className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No hay turnos cerrados todavía</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cuando abras una jornada con Eddy y la cierres con Xiomara, cada acta de cierre quedará registrada aquí para siempre.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {shifts.map((shift) => {
              const isSquared = shift.auditStatus === 'SQUARED';
              const isSurplus = shift.auditStatus === 'SURPLUS';

              return (
                <div
                  key={shift.id}
                  className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer"
                  onClick={() => setSelectedShift(shift)}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#1c6856]" /> {shift.date}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isSquared
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isSurplus
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isSquared
                          ? 'Cuadrado Exacto'
                          : isSurplus
                          ? `Sobrante (+C$ ${shift.differenceNIO?.toFixed(2)})`
                          : `Faltante (-C$ ${Math.abs(shift.differenceNIO || 0).toFixed(2)})`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Apertura: <strong className="text-slate-800 font-semibold">{shift.openedBy}</strong> ({new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                      <span>•</span>
                      <span>Cierre: <strong className="text-slate-800 font-semibold">{shift.closedBy}</strong> ({shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})</span>
                      <span>•</span>
                      <span>T/C: <strong className="text-slate-800 font-semibold">C$ {shift.exchangeRate.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Ventas Brutas</div>
                      <div className="text-lg font-mono font-black text-slate-900">
                        C$ {(shift.totalGrossSales || 0).toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right border-l border-slate-100 pl-4">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Propina c/u</div>
                      <div className="text-sm font-mono font-bold text-[#1c6856]">
                        C$ {(shift.individualTip || 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Imprimir Tique 80mm"
                        onClick={(e) => {
                          e.stopPropagation();
                          printThermalClosingTicket(shift);
                        }}
                        className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-sm cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-[#1c6856]" />
                      </button>

                      <button
                        type="button"
                        title="Exportar a Excel"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportShiftToExcel(shift, state);
                        }}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition shadow-sm cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      </button>

                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Detalle de Cierre Pasado */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1c6856]" />
                  Acta de Cierre — {selectedShift.date}
                </h3>
                <p className="text-xs text-slate-500">
                  Apertura: {selectedShift.openedBy} • Cierre: {selectedShift.closedBy}
                </p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Resumen Cuadre */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedShift.auditStatus === 'SQUARED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : selectedShift.auditStatus === 'SURPLUS'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider block">Diagnóstico de Cuadre</span>
                  <span className="text-xl font-black font-mono">
                    Diferencia: {selectedShift.differenceNIO && selectedShift.differenceNIO >= 0 ? '+' : ''}C${' '}
                    {selectedShift.differenceNIO?.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Efectivo Físico vs Esperado</span>
                  <span className="font-mono text-sm font-bold">
                    C$ {selectedShift.actualCashNIO?.toFixed(2)} / C$ {selectedShift.expectedCashNIO?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Ventas y Vouchers */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Desglose de Ventas y Tarjetas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Efectivo:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.salesCashSystem?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">BAC Credomatic:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.cardsBAC?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ficohsa:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.cardsFicohsa?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Banpro:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.cardsBanpro?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Lafise:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.cardsLafise?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pedidos Ya:</span>
                    <span className="font-black text-slate-900 font-mono">C$ {selectedShift.salesPedidosYa?.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-slate-500 block">Total Ventas Brutas:</span>
                    <span className="font-black text-[#1c6856] font-mono text-base">C$ {selectedShift.totalGrossSales?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Propinas y Retiros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold uppercase text-[#1c6856] block">Propinas</span>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Recaudada:</span>
                    <span className="font-mono font-bold text-slate-800">C$ {selectedShift.totalTipCollected?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Personal:</span>
                    <span className="font-mono text-slate-800">{selectedShift.staffCount} personas</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-800 border-t border-slate-200 pt-1.5 font-bold">
                    <span>Individual:</span>
                    <span className="font-mono text-[#1c6856]">C$ {selectedShift.individualTip?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold uppercase text-rose-700 block">Retiros y Reservas</span>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>A Caja Chica:</span>
                    <span className="font-mono text-slate-800">C$ {selectedShift.transferToPettyCash?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>HE / Feriados:</span>
                    <span className="font-mono text-slate-800">C$ {((selectedShift.overtimePaidCash || 0) + (selectedShift.extraDaysPaidCash || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-800 border-t border-slate-200 pt-1.5 font-bold">
                    <span>Total Retiros:</span>
                    <span className="font-mono text-rose-600">C$ {selectedShift.totalWithdrawals?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedShift.closingNotes && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Notas de Cierre</span>
                  <p className="text-xs text-slate-700 italic">"{selectedShift.closingNotes}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => printThermalClosingTicket(selectedShift)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#1c6856]" />
                  <span>Imprimir Tique 80mm</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportShiftToExcel(selectedShift, state)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-sm cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Exportar a Excel</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
