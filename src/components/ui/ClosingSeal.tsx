import React, { useEffect } from 'react';

export interface ClosingSealInfo {
  date: string; // YYYY-MM-DD
  ganancia: number | null;
  pettyDifference: number | null; // null = caja chica no se contó
}

interface Props {
  info: ClosingSealInfo | null;
  onDismiss: () => void;
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Sello que aparece al guardar el cierre: confirma que quedó guardado y cómo quedó la caja chica. */
export const ClosingSeal: React.FC<Props> = ({ info, onDismiss }) => {
  useEffect(() => {
    if (!info) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [info, onDismiss]);

  if (!info) return null;

  const diff = info.pettyDifference;
  const squared = diff === null || diff === 0;
  const color = squared ? '#135E4A' : '#A8432E';
  const [y, m, d] = info.date.split('-');
  const pettyLine =
    diff === null
      ? 'Caja chica cerrada sin conteo físico.'
      : diff === 0
      ? 'Caja chica cuadrada.'
      : diff < 0
      ? `Faltan C$ ${money(-diff)} en caja chica; queda anotado en el acta.`
      : `Sobran C$ ${money(diff)} en caja chica; queda anotado en el acta.`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/30 animate-in fade-in duration-200 print:hidden"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="closing-seal-title"
        className="bd-pop w-full max-w-md rounded-3xl bg-white p-8 flex flex-col items-center gap-3.5 text-center shadow-[0_24px_60px_rgba(26,21,18,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bd-stamp w-36 h-36 rounded-full flex flex-col items-center justify-center"
          style={{ border: `4px double ${color}`, color }}
          aria-hidden="true"
        >
          <div className="text-[10px] font-bold tracking-[0.14em]">EL BODEGÓN</div>
          <div className="font-display font-extrabold text-[28px] leading-[1.05]">
            {squared ? (
              <>
                CAJA
                <br />
                CUADRADA
              </>
            ) : (
              <>
                REVISAR
                <br />
                CAJA CHICA
              </>
            )}
          </div>
          <div className="text-[10px] font-semibold">
            {d} · {m} · {y}
          </div>
        </div>
        <h2 id="closing-seal-title" className="font-display font-extrabold text-[28px] text-stone-900 normal-case">
          Cierre guardado
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed">
          {info.ganancia !== null && (
            <>
              Ganancia del día <strong className="text-bodegon">C$ {money(info.ganancia)}</strong>.{' '}
            </>
          )}
          {pettyLine} El acta se mandó a imprimir.
        </p>
        <button
          autoFocus
          onClick={onDismiss}
          className="mt-2 h-10 px-6 rounded-xl bg-bodegon hover:bg-bodegon-noche text-white text-sm font-semibold transition cursor-pointer"
        >
          Listo
        </button>
      </div>
    </div>
  );
};
