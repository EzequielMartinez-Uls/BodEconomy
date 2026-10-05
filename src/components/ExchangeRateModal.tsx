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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xs overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/90">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-[#1c6856]" />
            Tasa de Cambio (T/C)
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Córdobas (C$) por US$ 1.00
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono font-bold text-sm">C$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                autoFocus
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-2xl font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-[#1c6856] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1c6856] hover:bg-[#154f42] text-white font-bold text-xs shadow-sm transition cursor-pointer"
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

