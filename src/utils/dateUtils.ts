/**
 * Utilidades centralizadas para manejo de fechas en horario local (Nicaragua / Centroamérica).
 * Evita el problema de desfase con UTC donde a partir de las 6:00 PM toISOString() salta al día siguiente.
 */

/**
 * Retorna la fecha local en formato YYYY-MM-DD.
 */
export function getLocalTodayStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Suma o resta días a una fecha en formato YYYY-MM-DD sin alterar la zona horaria.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return getLocalTodayStr(date);
}

/**
 * Formato amigable en español (ej: "Lunes, 21 de septiembre de 2026").
 */
export function formatDateToFriendly(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString('es-NI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Retorna la fecha y hora local en formato ISO sin desfase UTC: YYYY-MM-DDTHH:mm:ss
 */
export function getLocalDateTimeStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Extrae la fecha local YYYY-MM-DD de cualquier string de fecha o timestamp.
 * Si el timestamp viene con Z o timezone UTC, lo convierte a la fecha local del navegador/dispositivo.
 */
export function extractLocalDateStr(dateStr?: string): string {
  if (!dateStr) return '';
  if (!dateStr.includes('Z') && !dateStr.includes('+')) {
    return dateStr.slice(0, 10);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return getLocalTodayStr(d);
}
