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
  /** true cuando Bodegón Pass pide iniciar sesión con el PIN de gerencia */
  needsPin?: boolean;
}

type PassResponse = { ok: boolean; status: number; data: any; error?: string };

// Fuera de la app de escritorio (navegador) el token se guarda solo en memoria de la pestaña
let webToken: { base: string; token: string; expira: number } | null = null;

function cleanBaseUrl(baseUrl: string): string {
  return (baseUrl || DEFAULT_BODEGON_PASS_URL).trim().replace(/\/+$/, '');
}

/**
 * GET autenticado a Bodegón Pass. En escritorio la petición sale del proceso principal de Electron
 * (sin bloqueo CORS y sin exponer el token a la ventana); en navegador usa fetch normal.
 */
async function passGet(baseUrl: string, ruta: string): Promise<PassResponse> {
  const api = window.electronAPI;
  if (api?.passGet) return api.passGet(baseUrl, ruta);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (webToken && webToken.base === baseUrl && webToken.expira > Date.now()) {
    headers.Authorization = `Bearer ${webToken.token}`;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl}${ruta}`, { headers, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err?.name === 'AbortError' ? 'Tiempo de espera agotado' : err?.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** ¿Ya hay una sesión vigente con Bodegón Pass (PIN ingresado hace menos de 12 h)? */
export async function hasBodegonPassSession(baseUrl: string = DEFAULT_BODEGON_PASS_URL): Promise<boolean> {
  const base = cleanBaseUrl(baseUrl);
  const api = window.electronAPI;
  if (api?.passHasSession) return api.passHasSession(base);
  return Boolean(webToken && webToken.base === base && webToken.expira > Date.now());
}

/**
 * Inicia sesión en Bodegón Pass con el PIN de gerencia (el mismo del panel web).
 * El PIN no se guarda; solo el token temporal que devuelve el servidor, en memoria.
 */
export async function loginBodegonPass(
  baseUrl: string = DEFAULT_BODEGON_PASS_URL,
  pin: string
): Promise<{ ok: boolean; message: string }> {
  const base = cleanBaseUrl(baseUrl);
  const api = window.electronAPI;
  let res: { ok: boolean; status: number; error?: string };

  if (api?.passLogin) {
    res = await api.passLogin(base, pin);
  } else {
    try {
      const r = await fetch(`${base}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.token) {
        webToken = { base, token: data.token, expira: Date.now() + ((Number(data.expires_in) || 43200) - 300) * 1000 };
      }
      res = { ok: r.ok && Boolean(data?.token), status: r.status, error: data?.detail };
    } catch (err: any) {
      res = { ok: false, status: 0, error: err?.message };
    }
  }

  if (res.ok) return { ok: true, message: 'Sesión iniciada en Bodegón Pass.' };
  if (res.status === 401) return { ok: false, message: 'PIN incorrecto.' };
  if (res.status === 429) return { ok: false, message: res.error || 'Demasiados intentos. Espera 15 minutos.' };
  if (res.status === 0) return { ok: false, message: `No se pudo conectar con ${base} (${res.error || 'sin conexión'}).` };
  return { ok: false, message: res.error || `El servidor respondió con código ${res.status}.` };
}

/**
 * Normaliza una cadena de texto eliminando acentos, caracteres diacríticos y espacios extras
 */
export function normalizeEmployeeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/yahaira/g, 'yhaira')
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
): Promise<{ ok: boolean; message: string; employeeCount?: number; needsPin?: boolean }> {
  const cleanUrl = cleanBaseUrl(baseUrl);
  const res = await passGet(cleanUrl, '/api/empleados/');

  if (res.ok) {
    const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
    return {
      ok: true,
      message: `Servidor conectado correctamente (${list.length} colaboradores registrados en Bodegón Pass).`,
      employeeCount: list.length,
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      needsPin: true,
      message: 'El servidor responde, pero pide el PIN de gerencia de Bodegón Pass para entregar los datos.',
    };
  }
  if (res.status === 0) {
    return { ok: false, message: `No se pudo establecer conexión con ${cleanUrl} (${res.error || 'Tiempo de espera agotado'}).` };
  }
  return { ok: false, message: `El servidor respondió con código ${res.status}.` };
}

/**
 * Sincroniza horas extras y feriados laborados desde Bodegón Pass para un rango de fechas
 */
export async function syncFromBodegonPass(
  baseUrl: string = DEFAULT_BODEGON_PASS_URL,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<BodegonPassSyncResult> {
  const cleanUrl = cleanBaseUrl(baseUrl);
  const overtimeByEmployee: Record<string, { hours: number; amount: number }> = {};
  const holidaysByEmployee: Record<string, { count: number }> = {};

  try {
    // 1. Consultar empleados activos de Bodegón Pass
    const empRes = await passGet(cleanUrl, '/api/empleados/');

    if (empRes.status === 401 || empRes.status === 403) {
      return {
        success: false,
        needsPin: true,
        message: 'Bodegón Pass pide el PIN de gerencia para entregar las horas extras y feriados.',
        overtimeByEmployee: {},
        holidaysByEmployee: {},
        connectedEmployeesCount: 0,
      };
    }

    if (!empRes.ok) {
      return {
        success: false,
        message: `No se pudo conectar con el servidor de Bodegón Pass en ${cleanUrl}. Puedes ingresar los datos manualmente o verificar la URL en la configuración.`,
        overtimeByEmployee: {},
        holidaysByEmployee: {},
        connectedEmployeesCount: 0,
      };
    }

    const employees = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results || []);
    const connectedEmployeesCount = employees.length;

    // Si una de las dos consultas falla, no se presenta como sincronización exitosa
    const fallos: string[] = [];

    // 2. Consultar horas extras del período
    try {
      const heRes = await passGet(cleanUrl, '/api/horas-extra/');
      if (!heRes.ok) fallos.push(`horas extras (código ${heRes.status || 'sin conexión'})`);

      if (heRes.ok) {
        const heData = heRes.data || [];
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
      const ferRes = await passGet(cleanUrl, '/api/compensaciones-feriados/');
      if (!ferRes.ok) fallos.push(`feriados (código ${ferRes.status || 'sin conexión'})`);

      if (ferRes.ok) {
        const ferData = ferRes.data || [];
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

    if (fallos.length > 0) {
      return {
        success: false,
        message: `Bodegón Pass no entregó: ${fallos.join(' y ')}. No se cambió la planilla; intenta de nuevo en un momento.`,
        overtimeByEmployee: {},
        holidaysByEmployee: {},
        connectedEmployeesCount,
      };
    }

    const totalHeRecords = Object.keys(overtimeByEmployee).length;
    const totalFerRecords = Object.keys(holidaysByEmployee).length;

    const formatD = (dStr: string) => {
      const parts = dStr.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
    };

    return {
      success: true,
      message: `¡Sincronización exitosa con Bodegón Pass! (Corte: ${formatD(startDate)} al ${formatD(endDate)} • ${connectedEmployeesCount} colaboradores en línea, ${totalHeRecords} con horas extras, ${totalFerRecords} con feriados laborados).`,
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
