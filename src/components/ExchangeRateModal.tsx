import React, { useState } from 'react';
import { CircleDollarSign, Check, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRate: number;
  onSaveRate: (rate: number) => void;
}

export const ExchangeRateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentRate,
  onSaveRate,
}) => {
  if (!isOpen) return null;

  const [rate, setRate] = useState(currentRate.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rate);
    if (!isNaN(val) && val > 0) {
      onSaveRate(val);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            Tasa de Cambio (T/C)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Córdobas (C$) por US$ 1.00
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono font-bold text-sm">C$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                autoFocus
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-2xl font-mono font-black text-center text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

