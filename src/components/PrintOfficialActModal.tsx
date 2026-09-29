import React from 'react';
import { Printer, X, ChevronRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // YYYY-MM-DD
  onPrint: (modo: 'TODO' | 'GENERAL' | 'CHICA') => void;
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
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl shadow-md shrink-0">
              <Printer className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 leading-tight">
                Impresión Oficial en B/N
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                El Bodegón • Documentos para Archivo Físico & Firmas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Fecha Contable */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
              Fecha del Acta a Imprimir:
            </span>
            <span className="text-sm font-black text-slate-900 capitalize">
              {fechaLegible}
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-xl border border-amber-300 text-amber-950">
            {dateStr}
          </span>
        </div>

        {/* Opciones de Impresión */}
        <div className="space-y-3">
          {/* Opción 1: Acta Completa (2 Hojas) */}
          <button
            onClick={() => onPrint('TODO')}
            className="w-full text-left p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer flex items-center justify-between group shadow-sm active:scale-98"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">
                  📑 IMPRIMIR ACTA COMPLETA (2 HOJAS B/N)
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Recomendado
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                Hoja 1: Caja General & Ventas (Arqueo, Tarjetas POS, Margen)
                <br />
                Hoja 2: Caja Chica & Detalle Exhaustivo de Compras del Día
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition shrink-0" />
          </button>

          {/* Opción 2: Solo Hoja 1 */}
          <button
            onClick={() => onPrint('GENERAL')}
            className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-900 transition cursor-pointer flex items-center justify-between group active:scale-98"
          >
            <div>
              <span className="font-black text-sm text-slate-900">
                💵 SOLO HOJA 1: CAJA GENERAL & VENTAS (1 HOJA)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ingresos brutos, desglose BAC/Ficohsa/Banpro/Lafise, PedidosYa y utilidad líquida con firmas.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition shrink-0" />
          </button>

          {/* Opción 3: Solo Hoja 2 */}
          <button
            onClick={() => onPrint('CHICA')}
            className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-900 transition cursor-pointer flex items-center justify-between group active:scale-98"
          >
            <div>
              <span className="font-black text-sm text-slate-900">
                🛒 SOLO HOJA 2: CAJA CHICA & GASTOS DETALLADOS (1 HOJA)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Balance del fondo en gaveta y la relación detallada de cada compra/gasto individual con firmas.
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition shrink-0" />
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Diseño B/N estricto para impresoras láser / térmicas</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
