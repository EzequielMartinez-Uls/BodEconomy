import React from 'react';
import { Printer, X, ChevronRight, FileText, Sunrise, Banknote, ShoppingCart } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  onPrint: (modo: 'TODO' | 'GENERAL' | 'CHICA' | 'APERTURA') => void;
}

export const PrintOfficialActModal: React.FC<Props> = ({
  isOpen,
  onClose,
  dateStr,
  onPrint,
}) => {
  if (!isOpen) return null;

  let fechaLegible = dateStr;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    fechaLegible = dateObj.toLocaleDateString('es-NI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    // fallback
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1c6856] text-white flex items-center justify-center text-xl shadow-xs shrink-0">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                Impresión Oficial en B/N (Láser / A4)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                El Bodegón • Documentos para Archivo Físico & Firmas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Fecha Contable */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
              Fecha del Acta a Imprimir:
            </span>
            <span className="text-sm font-bold text-slate-900 capitalize">
              {fechaLegible}
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-800">
            {dateStr}
          </span>
        </div>

        {/* Opciones de Impresión */}
        <div className="space-y-2">
          {/* Opción 1: Acta Completa (2 Hojas) */}
          <button
            onClick={() => onPrint('TODO')}
            className="w-full text-left p-3.5 rounded-lg border border-slate-900 bg-slate-900 hover:bg-black text-white transition cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs text-white">
                  ACTA COMPLETA DE CIERRE (2 HOJAS B/N)
                </span>
                <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Recomendado
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 pl-6 leading-snug">
                Hoja 1: Arqueo Billetes, Ventas Multibanco, Retiros y Cuadre de Caja
                <br />
                Hoja 2: Caja Chica & Detalle Exhaustivo de Compras con Comprobantes
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition shrink-0" />
          </button>

          {/* Opción 2: Acta de Apertura */}
          <button
            onClick={() => onPrint('APERTURA')}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-[#1c6856] bg-slate-50 hover:bg-white text-slate-900 transition cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-[#1c6856] shrink-0" />
                <span className="font-bold text-xs text-slate-900">
                  ACTA OFICIAL DE APERTURA (1 HOJA B/N)
                </span>
                <span className="text-[9.5px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-[#1c6856] border border-emerald-200">
                  Apertura
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
                Desglose inicial de billetes NIO/USD, tasa oficial, checklist de gaveta y firmas.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0" />
          </button>

          {/* Opción 3: Solo Hoja 1 Cierre */}
          <button
            onClick={() => onPrint('GENERAL')}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-900 transition cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="font-bold text-xs text-slate-900">
                  SOLO CAJA GENERAL & VENTAS (HOJA 1 B/N)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
                Arqueo físico al cierre, ventas en efectivo, tarjetas Datafast, retiros y firmas.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0" />
          </button>

          {/* Opción 4: Solo Hoja 2 Caja Chica */}
          <button
            onClick={() => onPrint('CHICA')}
            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white text-slate-900 transition cursor-pointer flex items-center justify-between group shadow-2xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="font-bold text-xs text-slate-900">
                  SOLO CAJA CHICA & COMPRAS (HOJA 2 B/N)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
                Balance de fondo en gaveta y relación detallada de cada compra/gasto individual con firmas.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0" />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Diseño B/N estricto para impresoras láser / térmicas</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
