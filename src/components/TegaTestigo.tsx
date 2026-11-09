import React from 'react';
import { Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface FilaTestigo {
  label: string;
  contado: number; // lo que la persona contó o tecleó
  tega: number; // lo que TEGA dice
  moneda?: 'C$' | 'US$';
  total?: boolean; // fila de total (resaltada)
  usar?: () => void; // botón "Usar dato de TEGA" (solo donde no hay nada que contar, como Pagos y salidas)
}

interface Props {
  titulo: string;
  filas: FilaTestigo[];
  enVivo?: boolean; // el turno de TEGA sigue abierto
  nota?: string | null;
}

const fmt = (v: number) => v.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * TEGA como testigo: al lado de lo contado se ve lo que dice TEGA y la diferencia. El conteo físico manda;
 * TEGA solo ayuda a encontrar el error el mismo día (Ezequiel, 2026-11-09).
 */
export const TegaTestigo: React.FC<Props> = ({ titulo, filas, enVivo, nota }) => {
  const visibles = filas.filter((f) => !(f.contado === 0 && !f.usar && Math.abs(f.tega) >= 1));
  const descuadres = visibles.filter((f) => Math.abs(f.contado - f.tega) >= 1).length;
  const pendientes = filas.length - visibles.length;
  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
          <Eye className="w-4 h-4 text-bodegon" />
          <span>{titulo}</span>
          {enVivo && (
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Turno de TEGA sin cerrar
            </span>
          )}
        </div>
        {descuadres === 0 && pendientes > 0 ? (
          <span className="text-[11px] font-bold text-stone-500">Cuenta primero; TEGA se muestra después</span>
        ) : descuadres === 0 ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-bodegon">
            <CheckCircle2 className="w-3.5 h-3.5" /> Todo cuadra
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-barro">
            <AlertTriangle className="w-3.5 h-3.5" /> {descuadres} por revisar
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-stone-400">
            <th className="text-left font-bold px-4 py-1.5"></th>
            <th className="text-right font-bold px-2 py-1.5">Contado</th>
            <th className="text-right font-bold px-2 py-1.5">TEGA dice</th>
            <th className="text-right font-bold px-4 py-1.5">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const m = f.moneda || 'C$';
            const dif = Math.round((f.contado - f.tega) * 100) / 100;
            const ok = Math.abs(dif) < 1;
            // Conteo a ciegas: lo de TEGA no se ve hasta que se cuenta o se escribe esa fila.
            const ciego = f.contado === 0 && !f.usar && Math.abs(f.tega) >= 1;
            if (ciego) {
              return (
                <tr key={f.label} className={`border-t border-stone-100 ${f.total ? 'bg-stone-50 font-bold' : ''}`}>
                  <td className="px-4 py-1.5 text-stone-700">{f.label}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-stone-400">—</td>
                  <td colSpan={2} className="px-4 py-1.5 text-right text-[11px] text-stone-400">Se muestra al contar</td>
                </tr>
              );
            }
            return (
              <tr key={f.label} className={`border-t border-stone-100 ${f.total ? 'bg-stone-50 font-bold' : ''}`}>
                <td className="px-4 py-1.5 text-stone-700">{f.label}</td>
                <td className="px-2 py-1.5 text-right font-mono text-stone-900">{m} {fmt(f.contado)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-stone-500">
                  {m} {fmt(f.tega)}
                  {f.usar && !ok && (
                    <button
                      type="button"
                      onClick={f.usar}
                      className="ml-2 px-1.5 py-0.5 rounded border border-stone-300 text-[10px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      Usar
                    </button>
                  )}
                </td>
                <td className={`px-4 py-1.5 text-right font-mono font-bold ${ok ? 'text-bodegon' : 'text-barro'}`}>
                  {ok ? '✔ 0.00' : `${dif > 0 ? '+' : '−'} ${fmt(Math.abs(dif))} ⚠`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {nota && <p className="px-4 py-2 text-[11px] text-stone-600 border-t border-stone-100 bg-amber-50/50">{nota}</p>}
    </div>
  );
};

interface VivoProps {
  turno: import('../services/tegaBridge').TegaTurno | null;
  actualizado: number | null;
  cargando?: boolean;
  onActualizar: () => void;
}

/**
 * Cuadre en vivo: durante el turno, lo que TEGA dice que debería haber en gaveta y en cada datáfono, sin esperar al
 * cierre. Se actualiza solo cada 2 minutos.
 */
export const TegaEnVivo: React.FC<VivoProps> = ({ turno, actualizado, cargando, onActualizar }) => {
  const bancos = turno ? Object.entries(turno.bancos || {}).filter(([, v]) => Number(v) > 0) : [];
  const tarjetas = bancos.reduce((s, [, v]) => s + Number(v), 0);
  const Tile = ({ label, value, sub, fuerte }: { label: string; value: string; sub?: string; fuerte?: boolean }) => (
    <div className={`p-3 rounded-lg border ${fuerte ? 'border-bodegon/30 bg-bodegon/5' : 'border-stone-200 bg-stone-50'}`}>
      <span className="block text-[10px] font-bold uppercase text-stone-500">{label}</span>
      <span className={`block font-mono font-bold ${fuerte ? 'text-lg text-bodegon' : 'text-sm text-stone-900'}`}>{value}</span>
      {sub && <span className="block text-[10px] text-stone-500 mt-0.5">{sub}</span>}
    </div>
  );
  return (
    <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-bodegon" />
          <h3 className="text-sm font-bold text-stone-900">Cuadre en vivo · TEGA</h3>
          {turno && (
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${turno.estado === 'cerrado' ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-bodegon/5 text-bodegon border-bodegon/20'}`}>
              {turno.estado === 'cerrado' ? 'Turno de TEGA cerrado' : 'Turno abierto'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          {actualizado && <span>Actualizado {new Date(actualizado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            className="px-2 py-1 rounded border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
          >
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>
      {!turno ? (
        <p className="text-xs text-stone-500">
          {actualizado ? 'TEGA todavía no tiene un turno abierto hoy.' : 'Sin conexión con TEGA por ahora. Se vuelve a intentar solo.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Tile fuerte label="Efectivo que debe haber" value={`C$ ${fmt(turno.esperado)}`} sub={turno.esperadoUsd ? `+ US$ ${fmt(turno.esperadoUsd)}` : 'Incluye el fondo de apertura'} />
            <Tile label="Ventas (sin propina)" value={`C$ ${fmt(turno.ventas)}`} />
            <Tile label="Tarjetas" value={`C$ ${fmt(tarjetas)}`} sub={bancos.map(([b, v]) => `${b} ${fmt(Number(v))}`).join(' · ') || undefined} />
            <Tile label="PedidosYa" value={`C$ ${fmt(turno.metodos.pedidosya || 0)}`} />
            <Tile label="Transferencias" value={`C$ ${fmt(turno.metodos.transferencia || 0)}`} />
            <Tile label="Pagos y salidas" value={`C$ ${fmt(turno.salidasCS)}`} sub={turno.salidasUSD ? `+ US$ ${fmt(turno.salidasUSD)}` : 'Ya pasaron a caja chica'} />
            <Tile label="Propina" value={`C$ ${fmt(turno.propinas)}`} />
            <Tile label="Consumo de personal" value={`C$ ${fmt(turno.personal)}`} sub="Cargado a quincena" />
          </div>
          <p className="text-[11px] text-stone-500">
            Si cuentas la gaveta ahora, debería darte lo de arriba. Si no da, el error está en algo de este turno y todavía se puede encontrar.
          </p>
        </>
      )}
    </div>
  );
};
