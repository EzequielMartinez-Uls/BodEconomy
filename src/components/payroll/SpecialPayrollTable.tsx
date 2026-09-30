import React from 'react';
import { SpecialPayrollRow } from '../../types/payroll';

interface Props {
  rows: SpecialPayrollRow[];
  onRowChange: (index: number, updatedRow: SpecialPayrollRow) => void;
}

export const SpecialPayrollTable: React.FC<Props> = ({ rows, onRowChange }) => {
  const handleSalaryChange = (index: number, newSalaryStr: string) => {
    const salary = parseFloat(newSalaryStr) || 0;
    const current = rows[index];

    // Cálculos por ley de Nicaragua:
    const aguinaldo = parseFloat((salary / 12).toFixed(2));
    const inssLab = parseFloat((salary * 0.07).toFixed(2));
    const inssPat = parseFloat((salary * 0.215).toFixed(2));
    const inatec = parseFloat((salary * 0.02).toFixed(2));
    const cotizTotal = parseFloat((inssLab + inssPat + inatec).toFixed(2));
    const costTotal = parseFloat((salary + aguinaldo + inssPat + inatec).toFixed(2));
    const netPay = parseFloat((salary - inssLab - (current.irLaboral || 0) + (current.extraHolidayAmount || 0)).toFixed(2));

    const updated: SpecialPayrollRow = {
      ...current,
      reportedSalary: salary,
      aguinaldoProvision: aguinaldo,
      inssLaboral: inssLab,
      inssPatronal: inssPat,
      inatecPatronal: inatec,
      totalCotizacion: cotizTotal,
      totalCostBodegon: costTotal,
      netPayAsegurado: netPay,
    };

    onRowChange(index, updated);
  };

  // Totales
  let totalSalario = 0;
  let totalAguinaldo = 0;
  let totalINSSLaboral = 0;
  let totalINSSPatronal = 0;
  let totalINATEC = 0;
  let totalCotiz = 0;
  let totalCostEmpresa = 0;
  let totalNeto = 0;

  rows.forEach((r) => {
    totalSalario += r.reportedSalary || 0;
    totalAguinaldo += r.aguinaldoProvision || 0;
    totalINSSLaboral += r.inssLaboral || 0;
    totalINSSPatronal += r.inssPatronal || 0;
    totalINATEC += r.inatecPatronal || 0;
    totalCotiz += r.totalCotizacion || 0;
    totalCostEmpresa += r.totalCostBodegon || 0;
    totalNeto += r.netPayAsegurado || 0;
  });

  return (
    <div className="space-y-4">
      {/* Banner de Registro Patronal */}
      <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            INSS
          </div>
          <div>
            <div className="text-xs font-black text-indigo-950 uppercase tracking-wider">
              REGISTRO PATRONAL No 1550850
            </div>
            <div className="text-[11px] text-indigo-700">
              Cálculo formal de cargas sociales (INSS Laboral 7%, Patronal 21.5%, INATEC 2%, Provisión Aguinaldo 1/12)
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Asegurados Activos</span>
          <span className="text-sm font-black text-indigo-950 font-mono">{rows.length} colaboradores</span>
        </div>
      </div>

      {/* Tabla INSS */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
              <th rowSpan={2} className="p-2 text-center w-10 border-r border-slate-200">#</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-center border-r border-slate-200">NSS</th>
              <th rowSpan={2} className="p-2 min-w-[160px] border-r border-slate-200">Nombres y Apellidos</th>
              <th rowSpan={2} className="p-2 min-w-[110px] border-r border-slate-200">Cargo</th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-center border-r border-slate-200">Fecha Ing.</th>
              <th rowSpan={2} className="p-2 min-w-[100px] text-right border-r border-slate-200 bg-indigo-50/40">Salario C$</th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-right border-r border-slate-200">Aguinaldo (1/12)</th>
              <th colSpan={4} className="p-1.5 text-center border-r border-slate-200 bg-amber-50/50">Cotización INSS / INATEC</th>
              <th rowSpan={2} className="p-2 min-w-[65px] text-center border-r border-slate-200">IR Lab.</th>
              <th rowSpan={2} className="p-2 min-w-[115px] text-right border-r border-slate-200 bg-slate-100 font-bold">Total Costo Empresa</th>
              <th rowSpan={2} className="p-2 min-w-[110px] text-right bg-emerald-600 text-white font-bold">Neto Asegurado</th>
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
              <th className="p-1.5 text-right w-20 border-r border-slate-200">Laboral (7%)</th>
              <th className="p-1.5 text-right w-22 border-r border-slate-200">Patronal (21.5%)</th>
              <th className="p-1.5 text-right w-18 border-r border-slate-200">INATEC (2%)</th>
              <th className="p-1.5 text-right w-22 border-r border-slate-200 font-black text-slate-900">Total Cotiz.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.employeeId || idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                  {idx + 1}
                </td>
                <td className="p-2 font-mono text-center font-bold text-indigo-700 border-r border-slate-100">
                  {row.nss || '-'}
                </td>
                <td className="p-2 font-bold text-slate-900 border-r border-slate-100">
                  {row.name}
                </td>
                <td className="p-2 text-slate-600 border-r border-slate-100">
                  {row.role}
                </td>
                <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-100">
                  {row.hireDate || '-'}
                </td>
                <td className="p-1.5 text-right border-r border-slate-100 bg-indigo-50/20">
                  <input
                    type="number"
                    step="0.01"
                    value={row.reportedSalary || ''}
                    onChange={(e) => handleSalaryChange(idx, e.target.value)}
                    className="w-full text-right font-mono font-bold text-indigo-900 bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-600 focus:bg-white rounded px-1.5 py-1 outline-hidden"
                  />
                </td>
                <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-100">
                  C$ {row.aguinaldoProvision.toFixed(2)}
                </td>
                {/* 7% Laboral */}
                <td className="p-2 text-right font-mono text-rose-700 border-r border-slate-100">
                  C$ {row.inssLaboral.toFixed(2)}
                </td>
                {/* 21.5% Patronal */}
                <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-100">
                  C$ {row.inssPatronal.toFixed(2)}
                </td>
                {/* 2% INATEC */}
                <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-100">
                  C$ {row.inatecPatronal.toFixed(2)}
                </td>
                {/* Total Cotización */}
                <td className="p-2 text-right font-mono font-black text-slate-900 border-r border-slate-100 bg-amber-50/20">
                  C$ {row.totalCotizacion.toFixed(2)}
                </td>
                <td className="p-2 text-center font-mono text-slate-400 border-r border-slate-100">
                  {row.irLaboral ? `C$ ${row.irLaboral.toFixed(2)}` : '0.00'}
                </td>
                {/* Costo Empresa */}
                <td className="p-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100 bg-slate-50">
                  C$ {row.totalCostBodegon.toFixed(2)}
                </td>
                {/* Neto Asegurado */}
                <td className="p-2 text-right font-mono font-black text-emerald-800 bg-emerald-50/40 text-[12px]">
                  C$ {row.netPayAsegurado.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
              <td colSpan={5} className="p-2.5 text-center uppercase tracking-wider">Totales Consolidados INSS</td>
              <td className="p-2.5 text-right font-mono">C$ {totalSalario.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalAguinaldo.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">C$ {totalINSSLaboral.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalINSSPatronal.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalINATEC.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-amber-300">C$ {totalCotiz.toFixed(2)}</td>
              <td className="p-2.5 text-center font-mono">0.00</td>
              <td className="p-2.5 text-right font-mono text-slate-300">C$ {totalCostEmpresa.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-emerald-400 text-sm">C$ {totalNeto.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Tarjetas de Resumen Fiscal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Retención Laboral (7%)</span>
          <span className="text-lg font-black text-rose-700 font-mono">C$ {totalINSSLaboral.toFixed(2)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Deducido a colaboradores</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aporte Patronal (21.5% + 2%)</span>
          <span className="text-lg font-black text-slate-900 font-mono">C$ {(totalINSSPatronal + totalINATEC).toFixed(2)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Gasto asumido por El Bodegón</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Cheque / Transferencia INSS</span>
          <span className="text-lg font-black text-indigo-700 font-mono">C$ {totalCotiz.toFixed(2)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Monto total a pagar en banco al INSS</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Total Empresa</span>
          <span className="text-lg font-black text-[#1c6856] font-mono">C$ {totalCostEmpresa.toFixed(2)}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Salario + Aguinaldo + Cargas Sociales</span>
        </div>
      </div>
    </div>
  );
};
