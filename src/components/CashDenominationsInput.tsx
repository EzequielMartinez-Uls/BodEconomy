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
    <div className="space-y-5">
      {/* Resumen Totalizador Tipo Tarjeta Bancaria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-sm">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Córdobas (C$)</div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              C$ {totalNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Dólares (US$)</div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              $ {totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Gran Total (Equiv. a T/C {exchangeRate.toFixed(2)})
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              C$ {totalEquivNIO.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Columnas de Billetes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Moneda Nacional C$ */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-600" /> Moneda Nacional (Córdobas C$)
            </span>
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-mono font-bold border border-amber-200/50">
              C$ {totalNIO.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {NIO_KEYS.map((denom) => {
              const count = denominationsNIO[denom] || 0;
              const subtotal = count * denom;
              const isCoin = denom <= 5;

              return (
                <div
                  key={denom}
                  className="flex items-center justify-between gap-3 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 hover:border-amber-300 hover:bg-white transition"
                >
                  <div className="w-28 text-xs font-bold text-slate-700">
                    {isCoin ? `Moneda C$ ${denom}` : `Billete C$ ${denom}`}
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={readOnly}
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => handleNIOChange(denom, e.target.value)}
                      className="w-20 h-9 text-center font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 text-base shadow-sm shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-slate-400 font-semibold w-7 shrink-0">uds</span>
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Moneda Extranjera (Dólares US$)
            </span>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-mono font-bold border border-emerald-200/50">
              $ {totalUSD.toFixed(2)} = C$ {(totalUSD * exchangeRate).toFixed(2)}
            </span>
          </div>

          <div className="space-y-2">
            {USD_KEYS.map((denom) => {
              const count = denominationsUSD[denom] || 0;
              const subtotal = count * denom;

              return (
                <div
                  key={denom}
                  className="flex items-center justify-between gap-3 p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/60 hover:border-emerald-300 hover:bg-white transition"
                >
                  <div className="w-28 text-xs font-bold text-slate-700">
                    Billete ${denom}
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={readOnly}
                      value={count === 0 ? '' : count}
                      placeholder="0"
                      onChange={(e) => handleUSDChange(denom, e.target.value)}
                      className="w-20 h-9 text-center font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 text-base shadow-sm shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-slate-400 font-semibold w-7 shrink-0">uds</span>
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
