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

interface CuadreProps {
  tega: import('../services/tegaBridge').TegaDatos | null;
  shifts: import('../types').CashShift[];
  ventasControl: Record<string, number>; // fecha → ventas totales que da Control ese día
}

/**
 * Cuadre TEGA ↔ Control: cada día cerrado, lo cobrado según TEGA contra lo que quedó en Control, y dónde está la
 * diferencia (banco tecleado mal, salidas sin anotar, fondo sumado como venta…). Cada día debe quedar en verde o con motivo.
 */
export const TegaCuadre: React.FC<CuadreProps> = ({ tega, shifts, ventasControl }) => {
  if (!tega) return null;
  const filas = tega.turnos
    .filter((t) => t.estado === 'cerrado')
    .map((t) => {
      const fecha = new Date(t.abierto);
      const f = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      const m = t.metodos || {};
      const cobrado = Object.entries(m)
        .filter(([k]) => k !== 'personal' && k !== 'cortesia')
        .reduce((s, [, v]) => s + Number(v || 0), 0);
      const shift = shifts.find((s) => s.date === f && s.status === 'CLOSED');
      const control = ventasControl[f];
      const dif = control === undefined ? null : Math.round((control - cobrado) * 100) / 100;
      const pistas: string[] = [];
      if (shift) {
        const tasa = shift.exchangeRate || 36;
        const banco = (b: string) => {
          const k = Object.keys(t.bancos || {}).find((x) => x.trim().toLowerCase() === b.toLowerCase());
          return k ? Number(t.bancos[k]) || 0 : 0;
        };
        ([['BAC', shift.cardsBAC], ['Banpro', shift.cardsBanpro], ['Ficohsa', shift.cardsFicohsa], ['Lafise', shift.cardsLafise]] as [string, number | undefined][])
          .forEach(([b, v]) => {
            if (Math.abs((v || 0) - banco(b)) >= 1) pistas.push(`Tarjeta ${b}: TEGA ${fmt(banco(b))}, tecleado ${fmt(v || 0)}`);
          });
        if (Math.abs((shift.salesPedidosYa || 0) - (m.pedidosya || 0)) >= 1) pistas.push(`PedidosYa: TEGA ${fmt(m.pedidosya || 0)}, tecleado ${fmt(shift.salesPedidosYa || 0)}`);
        if (Math.abs((shift.salesBankTransfers || 0) - (m.transferencia || 0)) >= 1) pistas.push(`Transferencias: TEGA ${fmt(m.transferencia || 0)}, tecleado ${fmt(shift.salesBankTransfers || 0)}`);
        const salidas = t.salidasCS + t.salidasUSD * tasa;
        if (Math.abs((shift.loyversePaidOut || 0) - salidas) >= 1) pistas.push(`Pagos y salidas: TEGA ${fmt(salidas)}, anotado ${fmt(shift.loyversePaidOut || 0)}`);
        if ((shift.formulaVersion || 0) < 3 && (shift.totalOpeningEquivNIO || 0) > 0) pistas.push(`Fondo de apertura (${fmt(shift.totalOpeningEquivNIO || 0)}) sumado como venta`);
        if (Math.abs(shift.differenceNIO || 0) >= 1) pistas.push(`${(shift.differenceNIO || 0) < 0 ? 'Faltante' : 'Sobrante'} de gaveta ${fmt(Math.abs(shift.differenceNIO || 0))}`);
      }
      const conMotivo = Boolean(shift?.closingNotes && /Motivo del (faltante|sobrante)/.test(shift.closingNotes));
      const estado: 'Cuadra' | 'Con motivo' | 'Revisar' | 'Sin cierre' =
        dif === null ? 'Sin cierre' : Math.abs(dif) < 1 ? 'Cuadra' : conMotivo ? 'Con motivo' : 'Revisar';
      return { f, cobrado, control, dif, pistas, estado };
    })
    .reverse();
  if (!filas.length) return null;
  const totTega = filas.reduce((s, r) => s + r.cobrado, 0);
  const totControl = filas.reduce((s, r) => s + (r.control || 0), 0);
  const color = (e: string) =>
    e === 'Cuadra' ? 'bg-bodegon/5 text-bodegon border-bodegon/20' : e === 'Con motivo' ? 'bg-amber-50 text-amber-800 border-amber-200' : e === 'Revisar' ? 'bg-red-50 text-barro border-red-200' : 'bg-stone-100 text-stone-600 border-stone-200';
  const dia = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-bodegon" />
          <h3 className="text-sm font-bold text-stone-900">Cuadre TEGA ↔ Control</h3>
        </div>
        <span className="text-[11px] text-stone-500">
          TEGA C$ {fmt(totTega)} · Control C$ {fmt(totControl)} · Diferencia{' '}
          <strong className={Math.abs(totControl - totTega) < 1 ? 'text-bodegon' : 'text-barro'}>C$ {fmt(totControl - totTega)}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-stone-400">
              <th className="text-left font-bold px-2 py-1.5">Día</th>
              <th className="text-right font-bold px-2 py-1.5">TEGA</th>
              <th className="text-right font-bold px-2 py-1.5">Control</th>
              <th className="text-right font-bold px-2 py-1.5">Diferencia</th>
              <th className="text-left font-bold px-2 py-1.5">Dónde está</th>
              <th className="text-left font-bold px-2 py-1.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.f} className="border-t border-stone-100 align-top">
                <td className="px-2 py-2 font-bold text-stone-800 capitalize">{dia(r.f)}</td>
                <td className="px-2 py-2 text-right font-mono">{fmt(r.cobrado)}</td>
                <td className="px-2 py-2 text-right font-mono">{r.control === undefined ? '—' : fmt(r.control)}</td>
                <td className={`px-2 py-2 text-right font-mono font-bold ${r.dif !== null && Math.abs(r.dif) < 1 ? 'text-bodegon' : 'text-barro'}`}>
                  {r.dif === null ? '—' : `${r.dif > 0 ? '+' : r.dif < 0 ? '−' : ''}${fmt(Math.abs(r.dif))}`}
                </td>
                <td className="px-2 py-2 text-stone-600">{r.estado === 'Cuadra' ? '—' : r.pistas.join(' · ') || 'Revisar el conteo de gaveta'}</td>
                <td className="px-2 py-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color(r.estado)}`}>{r.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-stone-500">
        TEGA = todo lo cobrado (con propina), sin el consumo de personal. Cada día debe quedar en verde o con motivo.
      </p>
    </div>
  );
};
