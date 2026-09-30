/**
 * Servicio de sincronización entre Bodegón Control y Bodegón Pass (Kiosco / SGP Asistencia)
 */

export interface BodegonPassSyncResult {
  success: boolean;
  message: string;
  overtimeByEmployee: Record<string, { hours: number; amount: number }>;
  holidaysByEmployee: Record<string, { count: number }>;
  connectedEmployeesCount: number;
}

export async function syncFromBodegonPass(
  baseUrl: string = 'http://localhost:8000',
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<BodegonPassSyncResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const overtimeByEmployee: Record<string, { hours: number; amount: number }> = {};
  const holidaysByEmployee: Record<string, { count: number }> = {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    // 1. Consultar empleados activos de Bodegón Pass
    const empRes = await fetch(`${cleanUrl}/api/empleados/`, {
      signal: controller.signal,
    }).catch(() => null);

    if (!empRes || !empRes.ok) {
      clearTimeout(timeoutId);
      return {
        success: false,
        message: `No se pudo conectar con el servidor de Bodegón Pass en ${cleanUrl}. Puedes ingresar los datos manualmente.`,
        overtimeByEmployee: {},
        holidaysByEmployee: {},
        connectedEmployeesCount: 0,
      };
    }

    const employees = await empRes.json();
    const connectedEmployeesCount = Array.isArray(employees) ? employees.length : 0;

    // 2. Consultar horas extras autorizadas del período
    try {
      const heUrl = `${cleanUrl}/api/horas-extra/?fecha__gte=${startDate}&fecha__lte=${endDate}&estado=APROBADO`;
      const heRes = await fetch(heUrl, { signal: controller.signal });
      if (heRes.ok) {
        const heData = await heRes.json();
        const records = Array.isArray(heData) ? heData : (heData.results || []);
        for (const r of records) {
          const empName = `${r.empleado_nombre || ''} ${r.empleado_apellido || ''}`.trim() || String(r.empleado);
          const hours = Number(r.horas_extra_autorizadas) || 0;
          const amount = Number(r.monto_pagado) || 0;
          
          if (!overtimeByEmployee[empName]) {
            overtimeByEmployee[empName] = { hours: 0, amount: 0 };
          }
          overtimeByEmployee[empName].hours += hours;
          overtimeByEmployee[empName].amount += amount;
        }
      }
    } catch (e) {
      console.warn('Advertencia al consultar horas extras:', e);
    }

    // 3. Consultar feriados laborados del período
    try {
      const ferUrl = `${cleanUrl}/api/compensaciones-feriados/?fecha_feriado__gte=${startDate}&fecha_feriado__lte=${endDate}`;
      const ferRes = await fetch(ferUrl, { signal: controller.signal });
      if (ferRes.ok) {
        const ferData = await ferRes.json();
        const ferRecords = Array.isArray(ferData) ? ferData : (ferData.results || []);
        for (const f of ferRecords) {
          const empName = `${f.empleado_nombre || ''} ${f.empleado_apellido || ''}`.trim() || String(f.empleado);
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

    return {
      success: true,
      message: `¡Sincronización exitosa con Bodegón Pass! Se detectaron ${connectedEmployeesCount} colaboradores.`,
      overtimeByEmployee,
      holidaysByEmployee,
      connectedEmployeesCount,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error de red al conectar con Bodegón Pass: ${error?.message || 'Servidor no disponible'}.`,
      overtimeByEmployee: {},
      holidaysByEmployee: {},
      connectedEmployeesCount: 0,
    };
  }
}
