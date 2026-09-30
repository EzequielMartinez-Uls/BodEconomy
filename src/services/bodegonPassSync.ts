/**
 * Servicio de sincronización entre Bodegón Control y Bodegón Pass (Kiosco / SGP Asistencia)
 */

export const DEFAULT_BODEGON_PASS_URL = 'https://asistenciabodegon-api.onrender.com';

export interface BodegonPassSyncResult {
  success: boolean;
  message: string;
  overtimeByEmployee: Record<string, { hours: number; amount: number }>;
  holidaysByEmployee: Record<string, { count: number }>;
  connectedEmployeesCount: number;
}

/**
 * Normaliza una cadena de texto eliminando acentos, caracteres diacríticos y espacios extras
 */
export function normalizeEmployeeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Compara y empareja de forma flexible el nombre de Bodegón Control con el de Bodegón Pass.
 * Ej: "Julissa Lucero Ramírez Hernández" empareja con "Lucero Ramírez"
 * "Uriel de Jesús Zamora Salgado" empareja con "Uriel Zamora"
 * "Eddy Bernardo Martínez Blanco" empareja con "Eddy Martínez"
 */
export function matchEmployeeName(controlName: string, passName: string): boolean {
  const cNorm = normalizeEmployeeName(controlName);
  const pNorm = normalizeEmployeeName(passName);

  if (!cNorm || !pNorm) return false;
  if (cNorm === pNorm || cNorm.includes(pNorm) || pNorm.includes(cNorm)) return true;

  const pTokens = pNorm.split(/\s+/).filter((t) => t.length >= 3);
  if (pTokens.length === 0) return false;

  // Si tiene al menos 2 tokens significativos (ej. "lucero ramirez"), que ambos estén presentes
  const matches = pTokens.filter((t) => cNorm.includes(t));
  if (pTokens.length >= 2 && matches.length >= 2) return true;
  if (pTokens.length === 1 && matches.length === 1) return true;

  return false;
}

/**
 * Comprueba el estado de la conexión con el servidor de Bodegón Pass
 */
export async function testBodegonPassConnection(
  baseUrl: string = DEFAULT_BODEGON_PASS_URL
): Promise<{ ok: boolean; message: string; employeeCount?: number }> {
  const cleanUrl = (baseUrl || DEFAULT_BODEGON_PASS_URL).replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${cleanUrl}/api/empleados/`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;
      return {
        ok: true,
        message: `Servidor conectado correctamente (${count} colaboradores registrados en Bodegón Pass).`,
        employeeCount: count,
      };
    } else {
      return {
        ok: false,
        message: `El servidor respondió con código ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      message: `No se pudo establecer conexión con ${cleanUrl} (${err?.message || 'Tiempo de espera agotado'}).`,
    };
  }
}

/**
 * Sincroniza horas extras y feriados laborados desde Bodegón Pass para un rango de fechas
 */
export async function syncFromBodegonPass(
  baseUrl: string = DEFAULT_BODEGON_PASS_URL,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<BodegonPassSyncResult> {
  const cleanUrl = (baseUrl || DEFAULT_BODEGON_PASS_URL).replace(/\/+$/, '');
  const overtimeByEmployee: Record<string, { hours: number; amount: number }> = {};
  const holidaysByEmployee: Record<string, { count: number }> = {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s para soportar latencia en Render

    // 1. Consultar empleados activos de Bodegón Pass
    const empRes = await fetch(`${cleanUrl}/api/empleados/`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).catch(() => null);

    if (!empRes || !empRes.ok) {
      clearTimeout(timeoutId);
      return {
        success: false,
        message: `No se pudo conectar con el servidor de Bodegón Pass en ${cleanUrl}. Puedes ingresar los datos manualmente o verificar la URL en la configuración.`,
        overtimeByEmployee: {},
        holidaysByEmployee: {},
        connectedEmployeesCount: 0,
      };
    }

    const employees = await empRes.json();
    const connectedEmployeesCount = Array.isArray(employees) ? employees.length : 0;

    // 2. Consultar horas extras del período
    try {
      const heUrl = `${cleanUrl}/api/horas-extra/`;
      const heRes = await fetch(heUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (heRes.ok) {
        const heData = await heRes.json();
        const records = Array.isArray(heData) ? heData : (heData.results || []);

        for (const r of records) {
          // Filtrar por rango de fechas de la quincena
          if (r.fecha && (r.fecha < startDate || r.fecha > endDate)) {
            continue;
          }

          const authorized = Number(r.horas_extra_autorizadas) || 0;
          const requested = Number(r.horas_extra_solicitadas) || 0;
          const hours = authorized > 0 ? authorized : (r.estado === 'APROBADO' ? requested : 0);

          if (hours <= 0) continue;

          // Extraer nombre del colaborador
          const empDetail = r.empleado_detalle;
          const empName = empDetail
            ? `${empDetail.nombre || ''} ${empDetail.apellido || ''}`.trim()
            : (r.empleado_nombre ? `${r.empleado_nombre} ${r.empleado_apellido || ''}`.trim() : String(r.empleado));

          if (!empName) continue;

          const amount = Number(r.monto_pagado) || 0;

          if (!overtimeByEmployee[empName]) {
            overtimeByEmployee[empName] = { hours: 0, amount: 0 };
          }
          overtimeByEmployee[empName].hours = parseFloat((overtimeByEmployee[empName].hours + hours).toFixed(2));
          overtimeByEmployee[empName].amount = parseFloat((overtimeByEmployee[empName].amount + amount).toFixed(2));
        }
      }
    } catch (e) {
      console.warn('Advertencia al consultar horas extras:', e);
    }

    // 3. Consultar compensaciones de feriados laborados del período
    try {
      const ferUrl = `${cleanUrl}/api/compensaciones-feriados/`;
      const ferRes = await fetch(ferUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (ferRes.ok) {
        const ferData = await ferRes.json();
        const ferRecords = Array.isArray(ferData) ? ferData : (ferData.results || []);

        for (const f of ferRecords) {
          // Filtrar por rango de fechas
          if (f.fecha_feriado && (f.fecha_feriado < startDate || f.fecha_feriado > endDate)) {
            continue;
          }

          const empDetail = f.empleado_detalle;
          const empName = empDetail
            ? `${empDetail.nombre || ''} ${empDetail.apellido || ''}`.trim()
            : (f.empleado_nombre ? `${f.empleado_nombre} ${f.empleado_apellido || ''}`.trim() : String(f.empleado));

          if (!empName) continue;

          if (!holidaysByEmployee[empName]) {
            holidaysByEmployee[empName] = { count: 0 };
          }
          holidaysByEmployee[empName].count += 1;
        }
      }
    } catch (e) {
      console.warn('Advertencia al consultar compensaciones de feriados:', e);
    }

    clearTimeout(timeoutId);

    const totalHeRecords = Object.keys(overtimeByEmployee).length;
    const totalFerRecords = Object.keys(holidaysByEmployee).length;

    return {
      success: true,
      message: `¡Sincronización exitosa con Bodegón Pass! (${connectedEmployeesCount} colaboradores en línea, ${totalHeRecords} con horas extras, ${totalFerRecords} con feriados laborados en la quincena).`,
      overtimeByEmployee,
      holidaysByEmployee,
      connectedEmployeesCount,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error de red al conectar con Bodegón Pass: ${error?.message || 'Servidor no disponible'}. Puedes ingresar los datos manualmente.`,
      overtimeByEmployee: {},
      holidaysByEmployee: {},
      connectedEmployeesCount: 0,
    };
  }
}
