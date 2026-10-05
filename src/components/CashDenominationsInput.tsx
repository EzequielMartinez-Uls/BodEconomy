import React from 'react';
import { DenominationsNIO, DenominationsUSD } from '../types';
import { calculateTotalNIO, calculateTotalUSD } from '../services/storage';
import { Banknote, DollarSign } from 'lucide-react';

interface Props {
  denominationsNIO: DenominationsNIO;
  denominationsUSD: DenominationsUSD;
  exchangeRate: number;
  onChangeNIO: (denominations: DenominationsNIO) => void;
  onChangeUSD: (denominations: DenominationsUSD) => void;
  readOnly?: boolean;
  previousClosingNIO?: DenominationsNIO | null;
  previousClosingUSD?: DenominationsUSD | null;
  expectedTotalEquivNIO?: number;
}

const NIO_KEYS: (keyof DenominationsNIO)[] = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.5];
const USD_KEYS: (keyof DenominationsUSD)[] = [100, 50, 20, 10, 5, 2, 1];

export const CashDenominationsInput: React.FC<Props> = ({
  denominationsNIO,
  denominationsUSD,
  exchangeRate,
  onChangeNIO,
  onChangeUSD,
  readOnly = false,
  previousClosingNIO,
  previousClosingUSD,
  expectedTotalEquivNIO,
}) => {
  const totalNIO = calculateTotalNIO(denominationsNIO);
  const totalUSD = calculateTotalUSD(denominationsUSD);
  const totalEquivNIO = totalNIO + totalUSD * exchangeRate;

  const handleNIOChange = (key: keyof DenominationsNIO, valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    onChangeNIO({
      ...denominationsNIO,
      [key]: Math.max(0, val),
    });
  };

  const handleUSDChange = (key: keyof DenominationsUSD, valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    onChangeUSD({
      ...denominationsUSD,
      [key]: Math.max(0, val),
    });
  };

  return (
    <div className="space-y-4">
      {/* Resumen Totalizador Tipo Tarjeta Bancaria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#1c6856] flex items-center justify-center border border-slate-200">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Córdobas (C$)</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              C$ {totalNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Dólares (US$)</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              $ {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Gran Total (Equiv. a T/C {exchangeRate.toFixed(2)})
            </div>
            <div className="text-xl font-bold text-[#1c6856] font-mono">
              C$ {totalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Corroboración Físico con Cierre Anterior */}
      {expectedTotalEquivNIO !== undefined && expectedTotalEquivNIO > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Efectivo de Cierre Anterior:</span>
            <strong className="font-mono text-slate-900 font-bold text-sm">
              C$ {expectedTotalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">Contado Físicamente:</span>
            <strong className="font-mono text-[#1c6856] font-bold text-sm">
              C$ {totalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className={`px-2.5 py-1 rounded-md font-bold font-mono text-xs border ${
            totalEquivNIO === 0
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : Math.abs(totalEquivNIO - expectedTotalEquivNIO) < 1.0
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : totalEquivNIO - expectedTotalEquivNIO < 0
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}>
            {totalEquivNIO === 0 ? (
              <span>Pendiente de conteo</span>
            ) : Math.abs(totalEquivNIO - expectedTotalEquivNIO) < 1.0 ? (
              <span>Cuadrado con anoche</span>
            ) : totalEquivNIO - expectedTotalEquivNIO < 0 ? (
              <span>Faltante: -C$ {Math.abs(totalEquivNIO - expectedTotalEquivNIO).toFixed(2)}</span>
            ) : (
              <span>Sobrante: +C$ {(totalEquivNIO - expectedTotalEquivNIO).toFixed(2)}</span>
            )}
          </div>
        </div>
      )}

      {/* Columnas de Billetes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Moneda Nacional C$ */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Banknote className="w-4 h-4 text-[#1c6856]" /> Moneda Nacional (Córdobas C$)
            </span>
            <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono font-bold border border-slate-200">
              C$ {totalNIO.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            {NIO_KEYS.map((denom) => {
              const count = denominationsNIO[denom] || 0;
              const subtotal = count * denom;
              const isCoin = denom <= 5;
              const prevUds = previousClosingNIO ? previousClosingNIO[denom] : undefined;

              return (
                <div
                  key={denom}
                  className="flex items-center justify-between gap-3 p-2 bg-slate-50/70 rounded-lg border border-slate-200/60 hover:border-slate-300 hover:bg-white transition"
                >
                  <div className="w-28 text-xs font-bold text-slate-700">
                    <div>{isCoin ? `Moneda C$ ${denom}` : `Billete C$ ${denom}`}</div>
                    {prevUds !== undefined && prevUds > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Ayer: {prevUds} uds
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={readOnly}
                      value={count === 0 ? '' : count}
                      placeholder={prevUds !== undefined && prevUds > 0 ? String(prevUds) : '0'}
                      onChange={(e) => handleNIOChange(denom, e.target.value)}
                      className="w-20 h-8 text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#1c6856] disabled:opacity-50 text-sm shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[11px] text-slate-400 font-semibold w-7 shrink-0">uds</span>
                  </div>

                  <div className="w-28 text-right font-mono text-xs font-bold text-slate-800">
                    C$ {subtotal.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Moneda Extranjera US$ */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-700" /> Moneda Extranjera (Dólares US$)
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-mono font-bold border border-emerald-200">
              $ {totalUSD.toFixed(2)} = C$ {(totalUSD * exchangeRate).toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            {USD_KEYS.map((denom) => {
              const count = denominationsUSD[denom] || 0;
              const subtotal = count * denom;
              const prevUds = previousClosingUSD ? previousClosingUSD[denom] : undefined;

              return (
                <div
                  key={denom}
                  className="flex items-center justify-between gap-3 p-2 bg-slate-50/70 rounded-lg border border-slate-200/60 hover:border-slate-300 hover:bg-white transition"
                >
                  <div className="w-28 text-xs font-bold text-slate-700">
                    <div>Billete ${denom}</div>
                    {prevUds !== undefined && prevUds > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium block">
                        Ayer: {prevUds} uds
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={readOnly}
                      value={count === 0 ? '' : count}
                      placeholder={prevUds !== undefined && prevUds > 0 ? String(prevUds) : '0'}
                      onChange={(e) => handleUSDChange(denom, e.target.value)}
                      className="w-20 h-8 text-center font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#1c6856] disabled:opacity-50 text-sm shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[11px] text-slate-400 font-semibold w-7 shrink-0">uds</span>
                  </div>

                  <div className="w-28 text-right font-mono text-xs font-bold text-slate-800">
                    $ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
