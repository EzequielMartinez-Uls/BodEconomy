import React from 'react';
import {
  SpecialPayrollRow,
  calculateSpecialPayrollRow,
  calculateSpecialPayrollTotals,
} from '../../types/payroll';
import { Plus, Trash2 } from 'lucide-react';

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
    const updated = calculateSpecialPayrollRow({
      ...current,
      reportedSalary: salary,
    });
    onRowChange(index, updated);
  };

  const handleFieldChange = (
    index: number,
    field: keyof SpecialPayrollRow,
    value: string | number
  ) => {
    const current = rows[index];
    const updated = calculateSpecialPayrollRow({
      ...current,
      [field]: value,
    });
    onRowChange(index, updated);
  };

  // Totales por fórmula exacta (igual a Excel =SUM)
  const {
    totalSalario,
    totalAguinaldo,
    totalINSSLaboral,
    totalINSSPatronal,
    totalINATEC,
    totalCotiz,
    totalIR,
    totalCostEmpresa,
    totalNeto,
  } = calculateSpecialPayrollTotals(rows);

  return (
    <div className="space-y-3">
      {/* Banner de Registro Patronal y Resumen Fiscal: Diseño Rectangular Corporativo */}
      <div className="p-3 border border-indigo-300 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 border border-indigo-700 bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">
            INSS
          </div>
          <div>
            <div className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <span>REGISTRO PATRONAL No 1550850</span>
              <span className="px-1.5 py-0.2 border border-indigo-400 bg-indigo-100 text-indigo-900 text-[10px] font-bold uppercase">
                Oficial
              </span>
            </div>
            <div className="text-[11px] text-indigo-900 mt-0.5">
              Cálculo formal de cargas sociales (INSS Laboral 7%, Patronal 21.5%, INATEC 2%, Provisión Aguinaldo 1/12)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onAddRow && (
            <button
              type="button"
              onClick={onAddRow}
              className="px-3 py-1.5 border border-indigo-800 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Asegurado</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Tarjetas de Resumen Fiscal: Diseño Rectangular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 border border-slate-300 bg-white">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Salarios Declarados INSS
          </span>
          <span className="text-lg font-black text-indigo-950 font-mono block mt-0.5">
            <span className="text-xs text-slate-400 font-bold mr-1">C$</span>
            {totalSalario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{rows.length} colaboradores cotizantes</span>
        </div>

        <div className="p-3 border border-slate-300 bg-white">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            Retención Laboral (7%)
          </span>
          <span className="text-lg font-black text-rose-800 font-mono block mt-0.5">
            <span className="text-xs text-rose-400 font-bold mr-1">- C$</span>
            {totalINSSLaboral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Deducido en nómina quincenal</span>
        </div>

        <div className="p-3 border border-slate-300 bg-white">
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
            Total Cheque / Transferencia INSS
          </span>
          <span className="text-lg font-black text-indigo-900 font-mono block mt-0.5">
            <span className="text-xs text-indigo-400 font-bold mr-1">C$</span>
            {totalCotiz.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Laboral + Patronal (21.5%) + INATEC (2%)</span>
        </div>

        <div className="p-3 border-2 border-[#1c6856] bg-emerald-50/20">
          <span className="text-[10px] font-bold text-[#1c6856] uppercase tracking-wider block">
            Costo Total Empresa
          </span>
          <span className="text-lg font-black text-[#1c6856] font-mono block mt-0.5">
            <span className="text-xs text-[#1c6856]/60 font-bold mr-1">C$</span>
            {totalCostEmpresa.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-[#1c6856] font-bold uppercase tracking-wide block mt-0.5">Salario + Aguinaldo + Cargas</span>
        </div>
      </div>

      {/* Tabla INSS 100% Editable y Rectangular */}
      <div className="border border-slate-300 bg-white overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300 text-[11px] uppercase tracking-wider">
              <th rowSpan={2} className="p-2 text-center w-10 border-r border-slate-300">#</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-center border-r border-slate-300">NSS</th>
              <th rowSpan={2} className="p-2 min-w-[170px] border-r border-slate-300">Nombres y Apellidos</th>
              <th rowSpan={2} className="p-2 min-w-[120px] border-r border-slate-300">Cargo</th>
              <th rowSpan={2} className="p-2 min-w-[95px] text-center border-r border-slate-300">Fecha Ing.</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right border-r border-slate-300 bg-indigo-50/60">Salario C$</th>
              <th rowSpan={2} className="p-2 min-w-[100px] text-right border-r border-slate-300">Aguinaldo (1/12)</th>
              <th colSpan={4} className="p-1.5 text-center border-r border-slate-300 bg-amber-50/60">Cotización INSS / INATEC (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[85px] text-center border-r border-slate-300">IR Lab. C$</th>
              <th rowSpan={2} className="p-2 min-w-[125px] text-right border-r border-slate-300 bg-slate-100 font-bold">Total Costo Empresa</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right bg-emerald-700 text-white font-bold border-r border-slate-300">Neto Asegurado (C$)</th>
              {onDeleteRow && <th rowSpan={2} className="p-2 text-center w-12">Acción</th>}
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 border-b border-slate-300 uppercase">
              <th className="p-1 text-right w-22 border-r border-slate-300">Laboral (7%)</th>
              <th className="p-1 text-right w-24 border-r border-slate-300">Patronal (21.5%)</th>
              <th className="p-1 text-right w-20 border-r border-slate-300">INATEC (2%)</th>
              <th className="p-1 text-right w-24 border-r border-slate-300 font-black text-slate-900">Total Cotiz.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((rawRow, idx) => {
              const row = calculateSpecialPayrollRow(rawRow);
              return (
                <tr key={row.employeeId || idx} className="hover:bg-slate-50/90 transition-colors">
                  <td className="p-1.5 text-center text-slate-500 font-mono text-[11px] border-r border-slate-200 bg-slate-50/50">
                    {idx + 1}
                  </td>

                  {/* NSS (Editable) */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.nss || ''}
                      onChange={(e) => handleFieldChange(idx, 'nss', e.target.value)}
                      className="w-full text-center font-mono font-bold text-indigo-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1 py-0.5 text-xs outline-none transition"
                      placeholder="NSS..."
                    />
                  </td>

                  {/* Nombres y Apellidos (Editable) */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                      className="w-full font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1.5 py-0.5 text-xs outline-none transition"
                      placeholder="Nombre completo..."
                    />
                  </td>

                  {/* Cargo (Editable) */}
                  <td className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) => handleFieldChange(idx, 'role', e.target.value)}
                      className="w-full text-slate-700 font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1.5 py-0.5 text-xs outline-none transition"
                      placeholder="Cargo..."
                    />
                  </td>

                  {/* Fecha Ingreso (Editable) */}
                  <td className="p-1 border-r border-slate-200 text-center">
                    <input
                      type="text"
                      value={row.hireDate || ''}
                      onChange={(e) => handleFieldChange(idx, 'hireDate', e.target.value)}
                      className="w-20 text-center font-mono text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white px-1 py-0.5 text-xs outline-none transition"
                      placeholder="YYYY-MM-DD"
                    />
                  </td>

                  {/* Salario Declarado (Editable - Base de todas las fórmulas) */}
                  <td className="p-1 border-r border-slate-200 bg-indigo-50/20">
                    <div className="flex items-center justify-end bg-white border border-slate-300 px-1.5 py-0.5 focus-within:border-indigo-700">
                      <span className="text-[10px] font-bold text-indigo-800 select-none mr-1">C$</span>
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

                  {/* Aguinaldo Provisión (Fórmula Automática: Salario / 12) */}
                  <td className="p-1 border-r border-slate-200 bg-slate-50/40" title="Fórmula: Salario ÷ 12">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-slate-400 font-bold select-none mr-1">C$</span>
                      <span className="font-mono text-slate-700 font-semibold text-xs">
                        {row.aguinaldoProvision.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* 7% Laboral (Fórmula Automática: Salario * 7%) */}
                  <td className="p-1 border-r border-slate-200 bg-rose-50/20" title="Fórmula: Salario × 7%">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-rose-400 font-bold select-none mr-1">-C$</span>
                      <span className="font-mono font-bold text-rose-700 text-xs">
                        {row.inssLaboral.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* 21.5% Patronal (Fórmula Automática: Salario * 21.5%) */}
                  <td className="p-1 border-r border-slate-200 bg-slate-50/40" title="Fórmula: Salario × 21.5%">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-slate-400 font-bold select-none mr-1">C$</span>
                      <span className="font-mono text-slate-700 font-semibold text-xs">
                        {row.inssPatronal.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* 2% INATEC (Fórmula Automática: Salario * 2%) */}
                  <td className="p-1 border-r border-slate-200 bg-slate-50/40" title="Fórmula: Salario × 2%">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-slate-400 font-bold select-none mr-1">C$</span>
                      <span className="font-mono text-slate-700 font-semibold text-xs">
                        {row.inatecPatronal.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* Total Cotización INSS (Fórmula Automática: 7% + 21.5% + 2% = 30.5%) */}
                  <td className="p-1 border-r border-slate-200 bg-amber-50/30" title="Fórmula: Laboral (7%) + Patronal (21.5%) + INATEC (2%)">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-amber-700/70 font-bold select-none mr-1">C$</span>
                      <span className="font-mono font-black text-slate-900 text-xs">
                        {row.totalCotizacion.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* IR Laboral (Editable) */}
                  <td className="p-1 border-r border-slate-200">
                    <div className="flex items-center justify-center bg-white border border-slate-300 px-1 py-0.5">
                      <span className="text-[10px] font-bold text-slate-400 select-none mr-0.5">C$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.irLaboral || ''}
                        onChange={(e) => handleFieldChange(idx, 'irLaboral', parseFloat(e.target.value) || 0)}
                        className="w-14 text-right font-mono text-slate-800 bg-transparent outline-none text-xs"
                      />
                    </div>
                  </td>

                  {/* Costo Empresa (Fórmula Automática: Salario + Aguinaldo + Patronal + INATEC) */}
                  <td className="p-1 border-r border-slate-200 bg-slate-100/70" title="Fórmula: Salario + Aguinaldo + Patronal (21.5%) + INATEC (2%)">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-slate-500 font-bold select-none mr-1">C$</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {row.totalCostBodegon.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* Neto Asegurado (Fórmula Automática: Salario - INSS Laboral 7% - IR) */}
                  <td className="p-1 border-r border-slate-200 bg-emerald-50/50" title="Fórmula: Salario - INSS Laboral (7%) - IR">
                    <div className="flex items-center justify-end px-1.5 py-0.5">
                      <span className="text-[9px] text-emerald-600 font-bold select-none mr-1">C$</span>
                      <span className="font-mono font-black text-emerald-800 text-[12px]">
                        {row.netPayAsegurado.toFixed(2)}
                      </span>
                    </div>
                  </td>

                  {/* Acción Eliminar */}
                  {onDeleteRow && (
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                        title="Quitar de planilla especial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
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
              <td className="p-2.5 text-center font-mono">{totalIR.toFixed(2)}</td>
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
