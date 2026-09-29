import React, { useState } from 'react';
import { CashShift, DenominationsNIO, DenominationsUSD } from '../types';
import {
  DEFAULT_DENOMINATIONS_NIO,
  DEFAULT_DENOMINATIONS_USD,
  calculateTotalNIO,
  calculateTotalUSD,
} from '../services/storage';
import { getLocalTodayStr, formatDateToFriendly } from '../utils/dateUtils';
import { CashDenominationsInput } from './CashDenominationsInput';
import {
  X,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Banknote,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lastClosedShift: CashShift | null;
  shiftHistory?: CashShift[];
  activeAdminName: string;
  defaultExchangeRate: number;
  availableAdmins: string[];
  onConfirmOpen: (shift: CashShift) => void;
}

export const OpeningModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lastClosedShift,
  shiftHistory = [],
  activeAdminName,
  defaultExchangeRate,
  availableAdmins,
  onConfirmOpen,
}) => {
  if (!isOpen) return null;

  const todayStr = getLocalTodayStr();

  const [shiftDate, setShiftDate] = useState<string>(todayStr);
  const [openerName, setOpenerName] = useState(activeAdminName);
  const [exchangeRate, setExchangeRate] = useState(defaultExchangeRate);

  // 1. Conteo Físico Real de Gaveta al Abrir
  const [denominationsNIO, setDenominationsNIO] = useState<DenominationsNIO>(DEFAULT_DENOMINATIONS_NIO);
  const [denominationsUSD, setDenominationsUSD] = useState<DenominationsUSD>(DEFAULT_DENOMINATIONS_USD);
  const [notes, setNotes] = useState('');

  // Cálculos de Conteo Físico
  const totalNIO = calculateTotalNIO(denominationsNIO);
  const totalUSD = calculateTotalUSD(denominationsUSD);
  const totalEquivNIO = totalNIO + totalUSD * exchangeRate;

  // Corroboración contra el cierre anterior
  const expectedFromPrevious = lastClosedShift?.totalClosingEquivNIO || 0;
  const differenceWithPrevious = totalEquivNIO - expectedFromPrevious;
  const isCountInitiated = totalEquivNIO > 0;
  const isMatchWithPrevious = lastClosedShift ? Math.abs(differenceWithPrevious) < 1.0 : true;

  const isSelectedDateClosed = shiftHistory.some((s) => s.date === shiftDate);

  const handleCopyFromPrevious = () => {
    if (lastClosedShift?.closingNIO && lastClosedShift?.closingUSD) {
      setDenominationsNIO({ ...lastClosedShift.closingNIO });
      setDenominationsUSD({ ...lastClosedShift.closingUSD });
    }
  };

  const handleResetCount = () => {
    setDenominationsNIO(DEFAULT_DENOMINATIONS_NIO);
    setDenominationsUSD(DEFAULT_DENOMINATIONS_USD);
  };

  const handleConfirm = () => {
    if (shiftDate > todayStr) {
      alert(`No es posible abrir un turno con fecha futura (${shiftDate}). Selecciona la fecha de hoy (${todayStr}) o un día anterior.`);
      return;
    }

    if (totalEquivNIO <= 0) {
      const confirmZero = window.confirm(
        'El fondo de apertura está en C$ 0.00.\n\n¿Estás seguro de abrir la gaveta sin fondo de vuelto inicial?'
      );
      if (!confirmZero) return;
    }

    if (isSelectedDateClosed) {
      const confirmDup = window.confirm(
        `Atención: La fecha ${shiftDate} ya cuenta con un cierre oficial registrado en el sistema.\n\n¿Estás seguro de que deseas forzar una nueva apertura para esta misma fecha?`
      );
      if (!confirmDup) return;
    }

    const newShift: CashShift = {
      id: `shift-${shiftDate}-${Date.now()}`,
      date: shiftDate,
      status: 'OPEN',
      exchangeRate,
      openedBy: openerName,
      openedAt: new Date().toISOString(),
      verifiedPreviousClosingId: lastClosedShift?.id || null,
      openingNotes: notes,
      openingNIO: denominationsNIO,
      openingUSD: denominationsUSD,
      totalOpeningNIO: totalNIO,
      totalOpeningUSD: totalUSD,
      totalOpeningEquivNIO: totalEquivNIO,
    };

    onConfirmOpen(newShift);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Apertura de Caja General
              </h2>
              <p className="text-xs text-slate-500">
                Conteo físico del fondo para vueltos y corroboración de gaveta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
          {/* Tarjeta de Corroboración con el Cierre Anterior */}
          {lastClosedShift ? (
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Fondo dejado en el Cierre Anterior ({lastClosedShift.date})
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Cerrado por: <strong className="text-slate-800">{lastClosedShift.closedBy}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Saldo Entregado en Cierre
                  </span>
                  <strong className="text-base font-black text-slate-900 font-mono">
                    C$ {expectedFromPrevious.toFixed(2)}
                  </strong>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Tu Conteo Físico Real
                  </span>
                  <strong className="text-base font-black text-emerald-700 font-mono">
                    C$ {totalEquivNIO.toFixed(2)}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFromPrevious}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                    title="Copiar las denominaciones del cierre anterior como referencia inicial"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cargar fondo de ayer</span>
                  </button>

                  {totalEquivNIO > 0 && (
                    <button
                      type="button"
                      onClick={handleResetCount}
                      className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-xl transition border border-slate-200 cursor-pointer"
                      title="Limpiar conteo a cero"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Semáforo de Corroboración */}
              {isCountInitiated && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                    isMatchWithPrevious
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : differenceWithPrevious < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}
                >
                  {isMatchWithPrevious ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Fondo verificado: Coincide exactamente con el efectivo dejado en el cierre anterior (C$ {expectedFromPrevious.toFixed(2)}).
                      </span>
                    </>
                  ) : differenceWithPrevious < 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Diferencia detectada (Faltante): Faltan C$ {Math.abs(differenceWithPrevious).toFixed(2)} respecto al cierre anterior. Detállalo en las notas de apertura.
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Diferencia detectada (Sobrante): Hay C$ {differenceWithPrevious.toFixed(2)} más de lo dejado en el cierre anterior.
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
              ℹ️ Primer turno en registrarse. Realiza el conteo de billetes y monedas que conformarán el fondo inicial para vueltos.
            </div>
          )}

          {/* Parámetros Generales */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha de la Jornada</span>
                </label>
                <input
                  type="date"
                  required
                  max={todayStr}
                  value={shiftDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > todayStr) {
                      alert(`No puedes seleccionar una fecha futura (${val}).`);
                      setShiftDate(todayStr);
                    } else {
                      setShiftDate(val);
                    }
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                    isSelectedDateClosed
                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-500/20'
                      : 'border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'
                  }`}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  {formatDateToFriendly(shiftDate)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Administrador / Cajero
                </label>
                <select
                  value={openerName}
                  onChange={(e) => setOpenerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm focus:bg-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {availableAdmins.map((adm) => (
                    <option key={adm} value={adm}>
                      {adm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Tasa de Cambio (C$ / US$)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-mono font-bold">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || defaultExchangeRate)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm font-mono font-black focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {isSelectedDateClosed && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <span className="text-base">⚠️</span>
                <div>
                  <strong className="block font-black">Aviso de Jornada Previa:</strong>
                  La fecha <strong>{shiftDate}</strong> ya cuenta con un cierre registrado en el historial. El sistema está diseñado para 1 apertura y 1 cierre por día comercial.
                </div>
              </div>
            )}
          </div>

          {/* Conteo de Billetes y Monedas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Conteo Físico de Billetes y Monedas en Gaveta</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Digita lo que recibes físicamente en mano
              </span>
            </div>
            <CashDenominationsInput
              denominationsNIO={denominationsNIO}
              denominationsUSD={denominationsUSD}
              exchangeRate={exchangeRate}
              onChangeNIO={setDenominationsNIO}
              onChangeUSD={setDenominationsUSD}
            />
          </div>

          {/* Notas de Apertura */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Observaciones de Apertura (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Se recibe gaveta en orden con C$ 2,000 en sencillo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium shadow-2xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-sm">
            <span className="text-slate-500 font-medium">Fondo Apertura Contado: </span>
            <strong className="text-xl font-black text-emerald-600 font-mono">
              C$ {totalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar y Abrir Turno</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
