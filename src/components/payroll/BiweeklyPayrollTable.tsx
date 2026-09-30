import React from 'react';
import { BiweeklyPayrollRow } from '../../types/payroll';

interface Props {
  rows: BiweeklyPayrollRow[];
  onRowChange: (index: number, updatedRow: BiweeklyPayrollRow) => void;
  authorizedBy: string;
}

export const BiweeklyPayrollTable: React.FC<Props> = ({ rows, onRowChange, authorizedBy }) => {
  // Manejador de cambio numérico en celdas
  const handleNumChange = (
    index: number,
    field: keyof BiweeklyPayrollRow,
    valueStr: string
  ) => {
    const num = parseFloat(valueStr) || 0;
    const current = rows[index];
    const updated = { ...current, [field]: num };

    // Si cambió salario o feriados, recalcular monto de feriado
    if (field === 'baseSalary' || field === 'holidaysCount') {
      const salary = field === 'baseSalary' ? num : current.baseSalary;
      const count = field === 'holidaysCount' ? num : current.holidaysCount;
      updated.holidaysAmount = parseFloat(((salary * 2 / 30) * count).toFixed(2));
    }

    // Recalcular Total Pagado
    const earnings = (updated.baseSalary || 0) + (updated.overtimeAmount || 0) + (updated.holidaysAmount || 0) + (updated.bonuses || 0);
    const deductions = (updated.loanDeduction || 0) + (updated.restaurantServiceDeduction || 0) + (updated.breakageDeduction || 0);
    updated.totalPaid = parseFloat((earnings - deductions).toFixed(2));

    onRowChange(index, updated);
  };

  const handleNotesChange = (index: number, notes: string) => {
    onRowChange(index, { ...rows[index], breakageNotes: notes });
  };

  // Totales de la sábana
  let totalBase = 0;
  let totalHEHours = 0;
  let totalHEAmount = 0;
  let totalHolidaysAmount = 0;
  let totalBonuses = 0;
  let totalLoans = 0;
  let totalRest = 0;
  let totalBreakage = 0;
  let grandTotal = 0;

  rows.forEach((r) => {
    totalBase += r.baseSalary || 0;
    totalHEHours += r.overtimeHours || 0;
    totalHEAmount += r.overtimeAmount || 0;
    totalHolidaysAmount += r.holidaysAmount || 0;
    totalBonuses += r.bonuses || 0;
    totalLoans += r.loanDeduction || 0;
    totalRest += r.restaurantServiceDeduction || 0;
    totalBreakage += r.breakageDeduction || 0;
    grandTotal += r.totalPaid || 0;
  });

  return (
    <div className="space-y-4">
      {/* Contenedor con scroll horizontal para la tabla completa */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
              <th rowSpan={2} className="p-2.5 text-center w-10 border-r border-slate-200">#</th>
              <th rowSpan={2} className="p-2.5 min-w-[170px] border-r border-slate-200">Colaborador</th>
              <th rowSpan={2} className="p-2.5 min-w-[120px] border-r border-slate-200">Cargo</th>
              <th rowSpan={2} className="p-2.5 min-w-[110px] text-right border-r border-slate-200 bg-emerald-50/50">Salario Q. (C$)</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-200 bg-amber-50/40">Horas Extras</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-200 bg-blue-50/40">Feriados</th>
              <th rowSpan={2} className="p-2.5 min-w-[80px] text-right border-r border-slate-200">Bonif.</th>
              <th colSpan={3} className="p-1.5 text-center border-r border-slate-200 bg-rose-50/40">Deducciones</th>
              <th rowSpan={2} className="p-2.5 min-w-[125px] text-right border-r border-slate-200 bg-slate-900 text-white font-bold">TOTAL PAGADO</th>
              <th rowSpan={2} className="p-2.5 min-w-[180px]">Concepto / Detalle Deducción</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
              <th className="p-1.5 text-center w-14 border-r border-slate-200">No.</th>
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Valor C$</th>
              <th className="p-1.5 text-center w-14 border-r border-slate-200">No.</th>
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Valor C$</th>
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Préstamo</th>
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Serv. Rest</th>
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Vajilla/Otro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.employeeId || idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                  {idx + 1}
                </td>
                <td className="p-2 font-bold text-slate-900 border-r border-slate-100">
                  {row.name}
                </td>
                <td className="p-2 text-slate-600 border-r border-slate-100">
                  {row.role}
                </td>
                {/* Salario Quincenal */}
                <td className="p-1.5 text-right border-r border-slate-100 bg-emerald-50/20">
                  <input
                    type="number"
                    step="0.01"
                    value={row.baseSalary || ''}
                    onChange={(e) => handleNumChange(idx, 'baseSalary', e.target.value)}
                    className="w-full text-right font-mono font-bold text-emerald-800 bg-transparent border border-transparent hover:border-emerald-300 focus:border-emerald-600 focus:bg-white rounded px-1.5 py-1 outline-hidden"
                  />
                </td>
                {/* Horas Extras: Cantidad */}
                <td className="p-1.5 text-center border-r border-slate-100">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="-"
                    value={row.overtimeHours || ''}
                    onChange={(e) => handleNumChange(idx, 'overtimeHours', e.target.value)}
                    className="w-full text-center font-mono text-slate-800 bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Horas Extras: Valor */}
                <td className="p-1.5 text-right border-r border-slate-100">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.overtimeAmount || ''}
                    onChange={(e) => handleNumChange(idx, 'overtimeAmount', e.target.value)}
                    className="w-full text-right font-mono text-slate-800 bg-transparent border border-transparent hover:border-amber-300 focus:border-amber-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Feriados: Cantidad */}
                <td className="p-1.5 text-center border-r border-slate-100">
                  <input
                    type="number"
                    step="1"
                    placeholder="-"
                    value={row.holidaysCount || ''}
                    onChange={(e) => handleNumChange(idx, 'holidaysCount', e.target.value)}
                    className="w-full text-center font-mono text-slate-800 bg-transparent border border-transparent hover:border-blue-300 focus:border-blue-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Feriados: Valor (calculado auto pero editable) */}
                <td className="p-1.5 text-right border-r border-slate-100">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.holidaysAmount || ''}
                    onChange={(e) => handleNumChange(idx, 'holidaysAmount', e.target.value)}
                    className="w-full text-right font-mono text-slate-800 bg-transparent border border-transparent hover:border-blue-300 focus:border-blue-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Bonificación */}
                <td className="p-1.5 text-right border-r border-slate-100">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.bonuses || ''}
                    onChange={(e) => handleNumChange(idx, 'bonuses', e.target.value)}
                    className="w-full text-right font-mono text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Deducción: Préstamo */}
                <td className="p-1.5 text-right border-r border-slate-100 bg-rose-50/20">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.loanDeduction || ''}
                    onChange={(e) => handleNumChange(idx, 'loanDeduction', e.target.value)}
                    className="w-full text-right font-mono text-rose-700 bg-transparent border border-transparent hover:border-rose-300 focus:border-rose-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Deducción: Servicio Restaurante */}
                <td className="p-1.5 text-right border-r border-slate-100 bg-rose-50/20">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.restaurantServiceDeduction || ''}
                    onChange={(e) => handleNumChange(idx, 'restaurantServiceDeduction', e.target.value)}
                    className="w-full text-right font-mono text-rose-700 bg-transparent border border-transparent hover:border-rose-300 focus:border-rose-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* Deducción: Vajilla / Otros */}
                <td className="p-1.5 text-right border-r border-slate-100 bg-rose-50/20">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="-"
                    value={row.breakageDeduction || ''}
                    onChange={(e) => handleNumChange(idx, 'breakageDeduction', e.target.value)}
                    className="w-full text-right font-mono text-rose-700 bg-transparent border border-transparent hover:border-rose-300 focus:border-rose-600 focus:bg-white rounded px-1 py-1 outline-hidden"
                  />
                </td>
                {/* TOTAL PAGADO (Calculado) */}
                <td className="p-2 text-right border-r border-slate-100 font-mono font-black text-slate-900 bg-slate-50 text-[12px]">
                  C$ {row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {/* Nota / Detalle */}
                <td className="p-1.5">
                  <input
                    type="text"
                    placeholder="Ej: Plato roto C$90..."
                    value={row.breakageNotes || ''}
                    onChange={(e) => handleNotesChange(idx, e.target.value)}
                    className="w-full text-xs text-slate-600 placeholder:text-slate-300 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-500 focus:bg-white rounded px-2 py-1 outline-hidden"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
              <td colSpan={3} className="p-2.5 text-center uppercase tracking-wider">Totales Generales</td>
              <td className="p-2.5 text-right font-mono">C$ {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="p-2.5 text-center font-mono">{totalHEHours ? totalHEHours.toFixed(1) : '-'}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHEAmount.toFixed(2)}</td>
              <td className="p-2.5 text-center font-mono">-</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHolidaysAmount.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalBonuses.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">C$ {totalLoans.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">C$ {totalRest.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">C$ {totalBreakage.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-emerald-400 text-sm">
                C$ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="p-2.5 text-slate-400 text-[10px] italic">
                {rows.length} colaboradores
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tarjeta de Resumen Ejecutivo y Notas al pie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Desembolso Nómina</span>
          <span className="text-xl font-black text-slate-900 font-mono">
            C$ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Efectivo neto a pagar en sobres o transferencias</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Deducciones Aplicadas</span>
          <span className="text-xl font-black text-rose-700 font-mono">
            - C$ {(totalLoans + totalRest + totalBreakage).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Restaurante, vajillas y préstamos</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Elaborado y Verificado</span>
          <span className="text-base font-black text-[#1c6856] block mt-1">{authorizedBy}</span>
          <span className="text-[10px] text-slate-500 block">Autorización de administración El Bodegón</span>
        </div>
      </div>
    </div>
  );
};
