/**
 * Puente de solo lectura con TEGA (el punto de venta del Bodegón), en la misma base de Supabase.
 *
 * Control nunca escribe en TEGA. Lee con una sola función (public.tega_para_control, migración 25 de TEGA), con su llave:
 *   - turnos de los últimos 45 días con lo que TEGA dice que debería haber (efectivo, cada banco, PedidosYa…).
 *     Si el turno sigue abierto, los números son en vivo.
 *   - pagos y salidas de efectivo de la gaveta de TEGA → entran solos a caja chica como depósito desde caja general.
 *   - cuentas de colaborador "cargadas a quincena" → entran solas a Incidencias como Servicio de restaurante.
 *
 * Reglas de Ezequiel (2026-11-09): el cierre se cuenta físicamente siempre; TEGA solo es testigo. Toda salida de la
 * gaveta de TEGA pasa por caja chica. Lo gratis (Propietarios, Músicos, Uso de cocina y barra) no se carga a nadie.
 */
import { supabase } from './supabaseSync';
import { matchEmployeeName } from './bodegonPassSync';
import { extractLocalDateStr, getLocalDateTimeStr } from '../utils/dateUtils';
import { PettyCashTransaction } from '../types';
import { BiweeklyPayrollRecord, PayrollEmployee, PayrollIncident } from '../types/payroll';

export interface TegaTurno {
  id: string;
  estado: 'abierto' | 'cerrado' | string;
  abierto: number;
  cerrado?: number | null;
  fondo?: number | null;
  fondoUsd?: number | null;
  contado?: number | null;
  contadoUsd?: number | null;
  esperado: number; // efectivo C$ que debería haber en gaveta (incluye el fondo)
  esperadoUsd: number;
  metodos: Record<string, number>; // efectivo, dolares, tarjeta, transferencia, pedidosya, personal…
  bancos: Record<string, number>; // BAC, Banpro, Ficohsa, Lafise…
  propinas: number;
  ventas: number;
  salidasCS: number;
  salidasUSD: number;
  personal: number; // consumo de colaboradores cargado a quincena
}

export interface TegaSalida {
  id: string;
  turno: string;
  t: number;
  monto: number;
  moneda: 'CS' | 'USD';
  motivo: string;
  nota?: string;
  por?: string;
}

export interface TegaCredito {
  id: string;
  t: number;
  anulado: boolean;
  tipo: string;
  nombre: string | null;
  passId?: number | null;
  monto: number;
  lineas?: string | null;
}

export interface TegaDatos {
  ahora: number;
  turnos: TegaTurno[];
  salidas: TegaSalida[];
  creditos: TegaCredito[];
}

const n = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

function normalizar(raw: any): TegaDatos {
  const turnos: TegaTurno[] = (raw?.turnos || []).map((t: any) => ({
    ...t,
    abierto: n(t.abierto),
    esperado: n(t.esperado),
    esperadoUsd: n(t.esperadoUsd),
    metodos: t.metodos || {},
    bancos: t.bancos || {},
    propinas: n(t.propinas),
    ventas: n(t.ventas),
    salidasCS: n(t.salidasCS),
    salidasUSD: n(t.salidasUSD),
    personal: n(t.personal),
  }));
  const salidas: TegaSalida[] = (raw?.salidas || []).map((s: any) => ({ ...s, t: n(s.t), monto: n(s.monto), moneda: s.moneda === 'USD' ? 'USD' : 'CS' }));
  const creditos: TegaCredito[] = (raw?.creditos || []).map((c: any) => ({ ...c, t: n(c.t), monto: n(c.monto), anulado: Boolean(c.anulado) }));
  return { ahora: n(raw?.ahora) || Date.now(), turnos, salidas, creditos };
}

// Llave propia de Control (secreto VITE_TEGA_CONTROL_KEY de la acción "Publicar versión"): la llave anon sola no basta
// para leer TEGA, porque también la tienen las páginas web públicas.
const LLAVE = (import.meta.env.VITE_TEGA_CONTROL_KEY as string | undefined) || '';
export const tegaConfigurado = LLAVE.length >= 32;

/** Lee TEGA. Devuelve null sin internet, sin llave o si la función todavía no existe en Supabase. */
export async function fetchTega(desde = 0): Promise<TegaDatos | null> {
  if (!tegaConfigurado) return null;
  try {
    const { data, error } = await supabase.rpc('tega_para_control', { p_clave: LLAVE, p_desde: Math.max(0, Math.floor(desde)) });
    if (error || !data) return null;
    return normalizar(data);
  } catch {
    return null;
  }
}

/** Fecha comercial (día de Control) de un turno de TEGA: el día en que se abrió. */
export const fechaTurno = (t: TegaTurno) => extractLocalDateStr(new Date(t.abierto).toISOString());

/** El turno de TEGA que corresponde a una jornada de Control (si hubo varios ese día, el último). */
export function turnoDeFecha(datos: TegaDatos | null, fecha: string): TegaTurno | null {
  if (!datos) return null;
  const delDia = datos.turnos.filter((t) => fechaTurno(t) === fecha);
  return delDia.length ? delDia[delDia.length - 1] : null;
}

export const tarjetasTega = (t: TegaTurno) => r2(Object.values(t.bancos || {}).reduce((s, v) => s + n(v), 0));

/** Monto del banco de TEGA, sin importar mayúsculas ("BAC", "Bac"…). */
export function bancoTega(t: TegaTurno, banco: string): number {
  const k = Object.keys(t.bancos || {}).find((b) => b.trim().toLowerCase() === banco.toLowerCase());
  return k ? r2(n(t.bancos[k])) : 0;
}

/* ---------- Pagos y salidas de TEGA → caja chica ---------- */

export const TEGA_VENDOR_SALIDA = 'Depósito a caja chica (TEGA)';
const refSalida = (id: string) => `ref TEGA ${id}`;
const idSalida = (id: string) => `pct-tega-${id}`;

/** ¿Esta salida de TEGA ya está en caja chica (subida o no)? */
export function salidaYaImportada(s: TegaSalida, txs: PettyCashTransaction[]): boolean {
  const ref = refSalida(s.id);
  return txs.some((t) => t.id === idSalida(s.id) || (t.notes || '').includes(ref) || (t.receiptNumber || '') === `TEGA-${s.id}`);
}

export function salidaComoTraslado(
  s: TegaSalida,
  datos: TegaDatos,
  tasa: number,
  registradoPor: string
): PettyCashTransaction {
  const turno = datos.turnos.find((t) => t.id === s.turno);
  const fecha = turno ? fechaTurno(turno) : extractLocalDateStr(new Date(s.t).toISOString());
  const usd = s.moneda === 'USD';
  const monto = usd ? r2(s.monto * (tasa || 36)) : r2(s.monto);
  const detalle = [
    'Salida de caja general en TEGA',
    s.motivo && s.motivo !== 'Traspaso a caja chica' ? s.motivo : '',
    s.nota || '',
    usd ? `US$ ${s.monto.toFixed(2)} × ${tasa || 36}` : '',
    s.por ? `por ${s.por}` : '',
    refSalida(s.id),
  ].filter(Boolean);
  return {
    id: idSalida(s.id),
    shiftId: `pc-shift-${fecha}`,
    date: getLocalDateTimeStr(new Date(s.t)),
    type: 'INFLOW',
    inflowSource: 'TRASLADO_CAJA_GENERAL',
    amount: monto,
    method: 'CASH',
    vendor: TEGA_VENDOR_SALIDA,
    category: 'OTROS' as PettyCashTransaction['category'],
    receiptNumber: `TEGA-${s.id}`,
    registeredBy: s.por || registradoPor,
    notes: detalle.join(' · '),
  };
}

/* ---------- Cuentas de colaborador cargadas a quincena → Incidencias ---------- */

export const idIncidenciaTega = (pagoId: string) => `tega-pago-${pagoId}`;

export function creditoComoIncidencia(c: TegaCredito, empleados: PayrollEmployee[]): PayrollIncident {
  const nombre = c.nombre || 'Colaborador';
  const emp = (empleados || []).find((e) => e.isActive && matchEmployeeName(e.name, nombre)) ||
    (empleados || []).find((e) => matchEmployeeName(e.name, nombre));
  return {
    id: idIncidenciaTega(c.id),
    employeeId: emp ? emp.id : c.passId != null ? `pass:${c.passId}` : `tega:${nombre}`,
    employeeName: emp ? emp.name : nombre,
    date: extractLocalDateStr(new Date(c.t).toISOString()),
    type: 'SERVICIO_RESTAURANTE',
    concept: `Consumo en TEGA${c.lineas ? `: ${c.lineas}` : ''}`.slice(0, 160),
    amount: r2(c.monto),
    createdAt: new Date().toISOString(),
  };
}

/** Rango de fechas (YYYY-MM-DD) de una quincena guardada. */
export function rangoQuincena(h: Pick<BiweeklyPayrollRecord, 'year' | 'month' | 'period'>): [string, string] {
  const mm = String(h.month).padStart(2, '0');
  const ultimo = new Date(h.year, h.month, 0).getDate();
  return h.period === 'FIRST_HALF'
    ? [`${h.year}-${mm}-01`, `${h.year}-${mm}-15`]
    : [`${h.year}-${mm}-16`, `${h.year}-${mm}-${String(ultimo).padStart(2, '0')}`];
}

/**
 * Vuelve a sumar "Servicio de restaurante" en las quincenas en borrador, con las incidencias actuales.
 * Las quincenas ya finalizadas no se tocan.
 */
export function recalcularServicioEnBorradores(
  historial: BiweeklyPayrollRecord[],
  incidencias: PayrollIncident[]
): BiweeklyPayrollRecord[] {
  return (historial || []).map((h) => {
    if (h.status !== 'DRAFT') return h;
    const [ini, fin] = rangoQuincena(h);
    let cambio = false;
    const rows = (h.rows || []).map((r) => {
      const rest = r2(
        incidencias
          .filter((i) => i.type === 'SERVICIO_RESTAURANTE' && i.date >= ini && i.date <= fin &&
            (i.employeeId === r.employeeId || matchEmployeeName(r.name, i.employeeName)))
          .reduce((s, i) => s + (i.amount || 0), 0)
      );
      if (Math.abs(rest - (r.restaurantServiceDeduction || 0)) < 0.005) return r;
      cambio = true;
      const inss = Math.abs(r.inssDeduction !== undefined ? r.inssDeduction || 0 : r.bonuses || 0);
      const ingresos = (r.baseSalary || 0) + (r.overtimeAmount || 0) + (r.holidaysAmount || 0);
      const deducciones = inss + (r.loanDeduction || 0) + rest + (r.breakageDeduction || 0);
      return { ...r, restaurantServiceDeduction: rest, totalPaid: r2(ingresos - deducciones) };
    });
    return cambio ? { ...h, rows, updatedAt: new Date().toISOString() } : h;
  });
}

/** Desde cuándo traer de TEGA: la primera vez que esta computadora corre la versión con el puente. */
export function tegaDesde(): number {
  const k = 'bodeconomy-tega-desde';
  try {
    const v = Number(localStorage.getItem(k));
    if (v > 0) return v;
    const ahora = Date.now();
    localStorage.setItem(k, String(ahora));
    return ahora;
  } catch {
    return Date.now();
  }
}
