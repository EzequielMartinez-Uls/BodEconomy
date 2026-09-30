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

export type IncidentType = 'VAJILLA_PERDIDA' | 'SERVICIO_RESTAURANTE' | 'OTRO';

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
  bonuses: number; // Bonificaciones C$

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
