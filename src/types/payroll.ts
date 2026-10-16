export type PayrollPeriod = 'FIRST_HALF' | 'SECOND_HALF'; // 01 al 15 o 16 al fin de mes

export interface PayrollEmployee {
  id: string;
  name: string;
  role: string;
  baseSalaryBiweekly: number; // Salario base acordado por quincena (C$)
  cedula?: string;
  phone?: string;
  isActive: boolean;

  // Seguro Social INSS (Planilla Especial)
  isInsuredINSS: boolean;
  nss?: string; // Número de Seguro Social
  hireDate?: string; // Fecha de Ingreso (YYYY-MM-DD)
  reportedSalaryINSS?: number; // Salario base quincenal reportado al INSS (C$)
}

export type IncidentType = 'VAJILLA_PERDIDA' | 'SERVICIO_RESTAURANTE' | 'PRESTAMO_ADELANTO' | 'OTRO';

export interface PayrollIncident {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  type: IncidentType;
  concept: string; // Ej: "Vaso cervecero quebrado", "Salsero", "Consumo almuerzo"
  amount: number; // C$
  createdAt: string;
}

export interface BiweeklyPayrollRow {
  employeeId: string;
  name: string;
  role: string;
  baseSalary: number; // Salario Quincenal C$

  // Extras
  overtimeHours: number; // Horas Extras (No)
  overtimeAmount: number; // Horas Extras (Valor C$)
  holidaysCount: number; // Feriados (No)
  holidaysAmount: number; // Feriados (Valor C$: Salario * 2 / 30 * Feriados)
  inssDeduction?: number; // Deducción INSS C$ (Resta del monto a pagar)
  bonuses?: number; // (Legado / Bonificaciones C$)

  // Deducciones
  loanDeduction: number; // Préstamos del personal (cuota simple en quincena C$)
  restaurantServiceDeduction: number; // Servicio de restaurante C$
  breakageDeduction: number; // Vajilla rota / pérdidas de cocina / otros C$
  breakageNotes: string; // Concepto/detalle de la deducción (ej. "Plato roto C$ 90")

  // Total
  totalPaid: number; // Neto a pagar en sobre o transferencia
}

export interface SpecialPayrollRow {
  employeeId: string;
  nss: string;
  name: string;
  role: string;
  hireDate: string;
  reportedSalary: number; // Salario C$
  extraHolidayAmount: number; // H.E Vac. y Feriad.
  aguinaldoProvision: number; // Salario / 12 (8.33%)
  inssLaboral: number; // Salario * 0.07 (7%)
  inssPatronal: number; // Salario * 0.215 (21.5%)
  inatecPatronal: number; // Salario * 0.02 (2%)
  totalCotizacion: number; // inssLaboral + inssPatronal + inatecPatronal
  irLaboral: number; // Retención de IR si aplica
  totalCostBodegon: number; // Salario + Aguinaldo + inssPatronal + inatecPatronal
  netPayAsegurado: number; // Salario - inssLaboral - irLaboral (+ extras si hubiere)
}

export interface BiweeklyPayrollRecord {
  id: string; // Ej: "2026-09-FIRST_HALF"
  year: number;
  month: number; // 1-12
  period: PayrollPeriod;
  status: 'DRAFT' | 'FINALIZED';
  rows: BiweeklyPayrollRow[];
  specialRows: SpecialPayrollRow[];
  authorizedBy: string; // Ej: "Admon Bodegón"
  createdAt: string;
  updatedAt: string;
}

/**
 * Calcula por fórmula exacta (idéntica a Excel) todos los campos derivados de una fila de Planilla Especial INSS
 * a partir del Salario C$ (reportedSalary) y la retención IR Laboral (irLaboral):
 * - Aguinaldo (1/12): Salario / 12
 * - INSS Laboral (7%): Salario * 0.07
 * - INSS Patronal (21.5%): Salario * 0.215
 * - INATEC (2%): Salario * 0.02
 * - Total Cotización (30.5%): Laboral + Patronal + INATEC
 * - Total Costo Bodegón: Salario + Aguinaldo + Patronal + INATEC
 * - Neto a Pagar: Salario - Laboral - IR Laboral
 */
export function calculateSpecialPayrollRow(row: SpecialPayrollRow): SpecialPayrollRow {
  const sal = Number(row.reportedSalary) || 0;
  const ir = Number(row.irLaboral) || 0;

  const aguinaldoRaw = sal / 12;
  const inssLabRaw = sal * 0.07;
  const inssPatRaw = sal * 0.215;
  const inatecRaw = sal * 0.02;
  const cotizRaw = inssLabRaw + inssPatRaw + inatecRaw;
  const costRaw = sal + aguinaldoRaw + inssPatRaw + inatecRaw;
  const netRaw = sal - inssLabRaw - ir;

  return {
    ...row,
    reportedSalary: sal,
    extraHolidayAmount: 0,
    aguinaldoProvision: parseFloat(aguinaldoRaw.toFixed(2)),
    inssLaboral: parseFloat(inssLabRaw.toFixed(2)),
    inssPatronal: parseFloat(inssPatRaw.toFixed(2)),
    inatecPatronal: parseFloat(inatecRaw.toFixed(2)),
    totalCotizacion: parseFloat(cotizRaw.toFixed(2)),
    irLaboral: ir,
    totalCostBodegon: parseFloat(costRaw.toFixed(2)),
    netPayAsegurado: parseFloat(netRaw.toFixed(2)),
  };
}

/**
 * Calcula los totales consolidados de la Planilla Especial INSS sumando las fórmulas exactas (igual que =SUM() en Excel)
 */
export function calculateSpecialPayrollTotals(rows: SpecialPayrollRow[]) {
  let totalSalario = 0;
  let totalAguinaldo = 0;
  let totalINSSLaboral = 0;
  let totalINSSPatronal = 0;
  let totalINATEC = 0;
  let totalCotiz = 0;
  let totalIR = 0;
  let totalCostEmpresa = 0;
  let totalNeto = 0;

  rows.forEach((r) => {
    const sal = Number(r.reportedSalary) || 0;
    const ir = Number(r.irLaboral) || 0;
    const aguinaldoRaw = sal / 12;
    const inssLabRaw = sal * 0.07;
    const inssPatRaw = sal * 0.215;
    const inatecRaw = sal * 0.02;
    const cotizRaw = inssLabRaw + inssPatRaw + inatecRaw;
    const costRaw = sal + aguinaldoRaw + inssPatRaw + inatecRaw;
    const netRaw = sal - inssLabRaw - ir;

    totalSalario += sal;
    totalAguinaldo += aguinaldoRaw;
    totalINSSLaboral += inssLabRaw;
    totalINSSPatronal += inssPatRaw;
    totalINATEC += inatecRaw;
    totalCotiz += cotizRaw;
    totalIR += ir;
    totalCostEmpresa += costRaw;
    totalNeto += netRaw;
  });

  return {
    totalSalario: parseFloat(totalSalario.toFixed(2)),
    totalAguinaldo: parseFloat(totalAguinaldo.toFixed(2)),
    totalINSSLaboral: parseFloat(totalINSSLaboral.toFixed(2)),
    totalINSSPatronal: parseFloat(totalINSSPatronal.toFixed(2)),
    totalINATEC: parseFloat(totalINATEC.toFixed(2)),
    totalCotiz: parseFloat(totalCotiz.toFixed(2)),
    totalIR: parseFloat(totalIR.toFixed(2)),
    totalCostEmpresa: parseFloat(totalCostEmpresa.toFixed(2)),
    totalNeto: parseFloat(totalNeto.toFixed(2)),
  };
}
