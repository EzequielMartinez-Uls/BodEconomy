import React from 'react';
import { SpecialPayrollRow } from '../../types/payroll';
import { Plus, Trash2, Building2, ShieldCheck, Banknote, DollarSign } from 'lucide-react';

interface Props {
  rows: SpecialPayrollRow[];
  onRowChange: (index: number, updatedRow: SpecialPayrollRow) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
}

export const SpecialPayrollTable: React.FC<Props> = ({
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
}) => {
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
    const netPay = parseFloat(
      (salary - inssLab - (current.irLaboral || 0) + (current.extraHolidayAmount || 0)).toFixed(2)
    );

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

  const handleFieldChange = (
    index: number,
    field: keyof SpecialPayrollRow,
    value: string | number
  ) => {
    const current = rows[index];
    const updated = { ...current, [field]: value };

    // Si cambió IR laboral o horas extras, recalcular neto
    if (field === 'irLaboral' || field === 'extraHolidayAmount') {
      const ir = field === 'irLaboral' ? (Number(value) || 0) : (current.irLaboral || 0);
      const extra = field === 'extraHolidayAmount' ? (Number(value) || 0) : (current.extraHolidayAmount || 0);
      updated.netPayAsegurado = parseFloat(
        ((current.reportedSalary || 0) - (current.inssLaboral || 0) - ir + extra).toFixed(2)
      );
    }

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
      {/* Banner de Registro Patronal y Resumen Fiscal */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
            INSS
          </div>
          <div>
            <div className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <span>REGISTRO PATRONAL No 1550850</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">Oficial</span>
            </div>
            <div className="text-[11px] text-indigo-800 mt-0.5">
              Cálculo formal de cargas sociales (INSS Laboral 7%, Patronal 21.5%, INATEC 2%, Provisión Aguinaldo 1/12)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Asegurado</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Tarjetas de Resumen Fiscal Señalizadas como Dinero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Salarios Declarados INSS
          </span>
          <span className="text-lg font-black text-indigo-950 font-mono">
            <span className="text-xs text-slate-400 font-bold mr-1">C$</span>
            {totalSalario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{rows.length} colaboradores cotizantes</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Retención Laboral (7%)
          </span>
          <span className="text-lg font-black text-rose-700 font-mono">
            <span className="text-xs text-rose-400 font-bold mr-1">- C$</span>
            {totalINSSLaboral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Deducido en nómina quincenal</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
            Total Cheque / Transferencia INSS
          </span>
          <span className="text-lg font-black text-indigo-700 font-mono">
            <span className="text-xs text-indigo-400 font-bold mr-1">C$</span>
            {totalCotiz.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Laboral + Patronal (21.5%) + INATEC (2%)</span>
        </div>

        <div className="p-3.5 rounded-xl border border-[#1c6856]/40 bg-[#1c6856]/5 shadow-2xs">
          <span className="text-[10px] font-bold text-[#1c6856] uppercase tracking-wider block">
            Costo Total Empresa
          </span>
          <span className="text-lg font-black text-[#1c6856] font-mono">
            <span className="text-xs text-[#1c6856]/60 font-bold mr-1">C$</span>
            {totalCostEmpresa.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#1c6856]/80 block mt-0.5">Salario + Aguinaldo + Cargas</span>
        </div>
      </div>

      {/* Tabla INSS 100% Editable y Señalizada */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
              <th rowSpan={2} className="p-2 text-center w-10 border-r border-slate-200">#</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-center border-r border-slate-200">NSS</th>
              <th rowSpan={2} className="p-2 min-w-[170px] border-r border-slate-200">Nombres y Apellidos</th>
              <th rowSpan={2} className="p-2 min-w-[120px] border-r border-slate-200">Cargo</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-center border-r border-slate-200">Fecha Ing.</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right border-r border-slate-200 bg-indigo-50/50">Salario C$</th>
              <th rowSpan={2} className="p-2 min-w-[100px] text-right border-r border-slate-200">Aguinaldo (1/12)</th>
              <th colSpan={4} className="p-1.5 text-center border-r border-slate-200 bg-amber-50/50">Cotización INSS / INATEC (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-center border-r border-slate-200">IR Lab. C$</th>
              <th rowSpan={2} className="p-2 min-w-[125px] text-right border-r border-slate-200 bg-slate-100 font-bold">Total Costo Empresa</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right bg-emerald-600 text-white font-bold border-r border-slate-200">Neto Asegurado (C$)</th>
              {onDeleteRow && <th rowSpan={2} className="p-2 text-center w-12">Acción</th>}
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
              <th className="p-1 text-right w-22 border-r border-slate-200">Laboral (7%)</th>
              <th className="p-1 text-right w-24 border-r border-slate-200">Patronal (21.5%)</th>
              <th className="p-1 text-right w-20 border-r border-slate-200">INATEC (2%)</th>
              <th className="p-1 text-right w-24 border-r border-slate-200 font-black text-slate-900">Total Cotiz.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.employeeId || idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-1.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                  {idx + 1}
                </td>

                {/* NSS (Editable) */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.nss || ''}
                    onChange={(e) => handleFieldChange(idx, 'nss', e.target.value)}
                    className="w-full text-center font-mono font-bold text-indigo-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded px-1 py-0.5 text-xs outline-none transition"
                    placeholder="NSS..."
                  />
                </td>

                {/* Nombres y Apellidos (Editable) */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                    className="w-full font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded px-1.5 py-0.5 text-xs outline-none transition"
                    placeholder="Nombre completo..."
                  />
                </td>

                {/* Cargo (Editable) */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) => handleFieldChange(idx, 'role', e.target.value)}
                    className="w-full text-slate-600 font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded px-1.5 py-0.5 text-xs outline-none transition"
                    placeholder="Cargo..."
                  />
                </td>

                {/* Fecha Ingreso (Editable) */}
                <td className="p-1 border-r border-slate-100 text-center">
                  <input
                    type="text"
                    value={row.hireDate || ''}
                    onChange={(e) => handleFieldChange(idx, 'hireDate', e.target.value)}
                    className="w-20 text-center font-mono text-slate-500 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white rounded px-1 py-0.5 text-xs outline-none transition"
                    placeholder="YYYY-MM-DD"
                  />
                </td>

                {/* Salario Declarado (Editable y Señalizado como Dinero) */}
                <td className="p-1 border-r border-slate-100 bg-indigo-50/20">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600/30">
                    <span className="text-[10px] font-bold text-indigo-700 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={row.reportedSalary || ''}
                      onChange={(e) => handleSalaryChange(idx, e.target.value)}
                      className="w-20 text-right font-mono font-bold text-indigo-950 bg-transparent outline-none text-xs"
                      placeholder="0.00"
                    />
                  </div>
                </td>

                {/* Aguinaldo Provisión (1/12) */}
                <td className="p-1.5 text-right font-mono text-slate-700 border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.aguinaldoProvision.toFixed(2)}
                </td>

                {/* 7% Laboral Señalizado */}
                <td className="p-1.5 text-right font-mono text-rose-700 border-r border-slate-100 font-bold">
                  <span className="text-[10px] text-rose-400 font-bold mr-1">- C$</span>
                  {row.inssLaboral.toFixed(2)}
                </td>

                {/* 21.5% Patronal */}
                <td className="p-1.5 text-right font-mono text-slate-700 border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.inssPatronal.toFixed(2)}
                </td>

                {/* 2% INATEC */}
                <td className="p-1.5 text-right font-mono text-slate-700 border-r border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.inatecPatronal.toFixed(2)}
                </td>

                {/* Total Cotización INSS */}
                <td className="p-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-100 bg-amber-50/20">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.totalCotizacion.toFixed(2)}
                </td>

                {/* IR Laboral (Editable) */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-center rounded-md bg-white border border-slate-200 px-1 py-0.5">
                    <span className="text-[10px] font-bold text-slate-400 select-none mr-0.5">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.irLaboral || ''}
                      onChange={(e) => handleFieldChange(idx, 'irLaboral', parseFloat(e.target.value) || 0)}
                      className="w-14 text-right font-mono text-slate-700 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Costo Empresa */}
                <td className="p-1.5 text-right font-mono font-bold text-slate-800 border-r border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.totalCostBodegon.toFixed(2)}
                </td>

                {/* Neto Asegurado */}
                <td className="p-1.5 text-right font-mono font-black text-emerald-800 bg-emerald-50/40 text-[12px] border-r border-slate-200">
                  <span className="text-[10px] text-emerald-600 font-bold mr-1">C$</span>
                  {row.netPayAsegurado.toFixed(2)}
                </td>

                {/* Acción Eliminar */}
                {onDeleteRow && (
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(idx)}
                      className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Quitar de planilla especial"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-900">
              <td colSpan={5} className="p-2.5 text-center uppercase tracking-wider">Totales Consolidados INSS</td>
              <td className="p-2.5 text-right font-mono text-indigo-300">C$ {totalSalario.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalAguinaldo.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">- C$ {totalINSSLaboral.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalINSSPatronal.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalINATEC.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-amber-300">C$ {totalCotiz.toFixed(2)}</td>
              <td className="p-2.5 text-center font-mono">0.00</td>
              <td className="p-2.5 text-right font-mono text-slate-300">C$ {totalCostEmpresa.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-emerald-400 text-sm">C$ {totalNeto.toFixed(2)}</td>
              {onDeleteRow && <td className="p-2.5 text-center font-mono">-</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
