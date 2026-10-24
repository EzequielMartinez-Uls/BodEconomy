import { CashShift, PettyCashShift, PettyCashTransaction } from '../types';
import { extractLocalDateStr } from './dateUtils';

/**
 * La nube solo entrega las compras y jornadas más recientes (hay un límite por consulta).
 * Cuando el límite se alcanza, lo que está más atrás de la fecha más vieja recibida no vino
 * en la respuesta, pero sigue siendo válido: se conserva la copia local para que los
 * reportes de meses anteriores no se queden sin gastos.
 */
export function keepOlderLocalTransactions(
  localTxs: PettyCashTransaction[],
  cloudGastos: { fecha_hora?: string; id?: number }[],
  limit: number
): PettyCashTransaction[] {
  if (cloudGastos.length < limit) return [];
  const oldestCloudDate = cloudGastos
    .map((g) => extractLocalDateStr(g.fecha_hora))
    .filter(Boolean)
    .sort()[0];
  if (!oldestCloudDate) return [];
  const cloudIds = new Set(cloudGastos.map((g) => g.id));
  return localTxs.filter(
    (t) => t.cloudId && !cloudIds.has(t.cloudId) && extractLocalDateStr(t.date) < oldestCloudDate
  );
}

export function keepOlderLocalShifts<T extends CashShift | PettyCashShift>(
  localShifts: T[],
  cloudShifts: T[],
  cloudJornadasCount: number,
  limit: number
): T[] {
  if (cloudJornadasCount < limit || cloudShifts.length === 0) return [];
  const oldestCloudDate = cloudShifts.map((s) => s.date).sort()[0];
  return localShifts.filter((s) => s.date < oldestCloudDate);
}
