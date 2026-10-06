import React from 'react';
import { BiweeklyPayrollRow } from '../../types/payroll';
import { Plus, Trash2, Banknote, Clock, ArrowDownRight, Wallet } from 'lucide-react';

interface Props {
  rows: BiweeklyPayrollRow[];
  onRowChange: (index: number, updatedRow: BiweeklyPayrollRow) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  authorizedBy: string;
}

export const BiweeklyPayrollTable: React.FC<Props> = ({
  rows,
  onRowChange,
  onAddRow,
  onDeleteRow,
  authorizedBy,
}) => {
  // Manejador de cambio de texto (Nombre, Cargo, Notas)
  const handleTextChange = (
    index: number,
    field: keyof BiweeklyPayrollRow,
    value: string
  ) => {
    const current = rows[index];
    const updated = { ...current, [field]: value };
    onRowChange(index, updated);
  };

  // Manejador de cambio numérico en celdas monetarias y operativas
  const handleNumChange = (
    index: number,
    field: keyof BiweeklyPayrollRow,
    valueStr: string
  ) => {
    const num = parseFloat(valueStr) || 0;
    const current = rows[index];
    const updated = { ...current, [field]: num };

    // Si cambió salario o feriados, recalcular monto de feriado (Ley Laboral Nic: Salario Diario Doble)
    if (field === 'baseSalary' || field === 'holidaysCount') {
      const salary = field === 'baseSalary' ? num : (current.baseSalary || 0);
      const count = field === 'holidaysCount' ? num : (current.holidaysCount || 0);
      updated.holidaysAmount = parseFloat(((salary * 2 / 30) * count).toFixed(2));
    }

    // Recalcular Total Pagado
    const earnings =
      (updated.baseSalary || 0) +
      (updated.overtimeAmount || 0) +
      (updated.holidaysAmount || 0) +
      (updated.bonuses || 0);
    const deductions =
      (updated.loanDeduction || 0) +
      (updated.restaurantServiceDeduction || 0) +
      (updated.breakageDeduction || 0);
    updated.totalPaid = parseFloat((earnings - deductions).toFixed(2));

    onRowChange(index, updated);
  };

  // Totales de la sábana
  let totalBase = 0;
  let totalHEHours = 0;
  let totalHEAmount = 0;
  let totalHolidaysCount = 0;
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
    totalHolidaysCount += r.holidaysCount || 0;
    totalHolidaysAmount += r.holidaysAmount || 0;
    totalBonuses += r.bonuses || 0;
    totalLoans += r.loanDeduction || 0;
    totalRest += r.restaurantServiceDeduction || 0;
    totalBreakage += r.breakageDeduction || 0;
    grandTotal += r.totalPaid || 0;
  });

  const totalDeductions = totalLoans + totalRest + totalBreakage;
  const totalExtras = totalHEAmount + totalHolidaysAmount + totalBonuses;

  return (
    <div className="space-y-4">
      {/* 4 Tarjetas de Resumen Financiero de Nómina (Dinero Señalizado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Salario Base
            </span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <Banknote className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 font-mono">
            <span className="text-xs text-slate-400 font-bold mr-1">C$</span>
            {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{rows.length} colaboradores activos</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Total Extras & Feriados
            </span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-amber-800 font-mono">
            <span className="text-xs text-amber-600 font-bold mr-1">C$</span>
            {totalExtras.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">H.E ({totalHEHours.toFixed(1)}h) + {totalHolidaysCount} feriados</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              Total Deducciones
            </span>
            <span className="p-1 rounded-md bg-rose-50 text-rose-600">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-rose-700 font-mono">
            <span className="text-xs text-rose-400 font-bold mr-1">- C$</span>
            {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Préstamos, servicios y vajillas</span>
        </div>

        <div className="p-3.5 rounded-xl border border-[#1c6856]/40 bg-[#1c6856]/5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#1c6856] uppercase tracking-wider">
              Total Neto a Pagar
            </span>
            <span className="p-1 rounded-md bg-[#1c6856] text-white">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-black text-[#1c6856] font-mono">
            <span className="text-xs text-[#1c6856]/70 font-bold mr-1">C$</span>
            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#1c6856]/80 font-semibold">Desembolso quincenal oficial</span>
        </div>
      </div>

      {/* Barra de Acciones de la Tabla */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span>Planilla Quincenal 100% Editable</span>
          <span className="text-[10px] font-medium text-slate-400">(Haz clic en cualquier celda para modificar datos, montos o notas)</span>
        </div>
        {onAddRow && (
          <button
            type="button"
            onClick={onAddRow}
            className="px-3 py-1.5 rounded-lg bg-[#1c6856] hover:bg-[#165345] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Colaborador</span>
          </button>
        )}
      </div>

      {/* Sábana de Planilla Quincenal */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200 text-[11px]">
              <th rowSpan={2} className="p-2 text-center w-10 border-r border-slate-200">#</th>
              <th rowSpan={2} className="p-2 min-w-[170px] border-r border-slate-200">Colaborador</th>
              <th rowSpan={2} className="p-2 min-w-[120px] border-r border-slate-200">Cargo</th>
              <th rowSpan={2} className="p-2 min-w-[120px] text-right border-r border-slate-200 bg-emerald-50/60">Salario Q. (C$)</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-200 bg-amber-50/50">Horas Extras</th>
              <th colSpan={2} className="p-1.5 text-center border-r border-slate-200 bg-blue-50/50">Feriados</th>
              <th rowSpan={2} className="p-2 min-w-[100px] text-right border-r border-slate-200">Bonif. (C$)</th>
              <th colSpan={3} className="p-1.5 text-center border-r border-slate-200 bg-rose-50/50">Deducciones (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[130px] text-right border-r border-slate-200 bg-slate-900 text-white font-bold">TOTAL PAGADO (C$)</th>
              <th rowSpan={2} className="p-2 min-w-[160px] border-r border-slate-200">Concepto / Detalle Deducción</th>
              {onDeleteRow && <th rowSpan={2} className="p-2 text-center w-12">Acción</th>}
            </tr>
            <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-200">
              <th className="p-1 text-center w-16 border-r border-slate-200">Cant. (h)</th>
              <th className="p-1 text-right w-24 border-r border-slate-200">Monto C$</th>
              <th className="p-1 text-center w-16 border-r border-slate-200">Cant. (d)</th>
              <th className="p-1 text-right w-24 border-r border-slate-200">Monto C$</th>
              <th className="p-1 text-right w-22 border-r border-slate-200">Préstamo</th>
              <th className="p-1 text-right w-22 border-r border-slate-200">Serv. Rest</th>
              <th className="p-1 text-right w-22 border-r border-slate-200">Vajilla/Otro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.employeeId || idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-1.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                  {idx + 1}
                </td>

                {/* Nombre Colaborador (Editable Inline) */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => handleTextChange(idx, 'name', e.target.value)}
                    className="w-full font-bold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-[#1c6856] focus:bg-white rounded px-1.5 py-1 text-xs outline-none transition"
                    placeholder="Nombre colaborador..."
                  />
                </td>

                {/* Cargo (Editable Inline) */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    value={row.role}
                    onChange={(e) => handleTextChange(idx, 'role', e.target.value)}
                    className="w-full text-slate-600 font-medium bg-transparent border border-transparent hover:border-slate-300 focus:border-[#1c6856] focus:bg-white rounded px-1.5 py-1 text-xs outline-none transition"
                    placeholder="Cargo..."
                  />
                </td>

                {/* Salario Quincenal Señalizado en Dinero */}
                <td className="p-1 border-r border-slate-100 bg-emerald-50/20">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/30">
                    <span className="text-[10px] font-bold text-emerald-700 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={row.baseSalary || ''}
                      onChange={(e) => handleNumChange(idx, 'baseSalary', e.target.value)}
                      className="w-20 text-right font-mono font-bold text-emerald-950 bg-transparent outline-none text-xs"
                      placeholder="0.00"
                    />
                  </div>
                </td>

                {/* Horas Extras: Cantidad */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-center rounded-md bg-white border border-slate-200 px-1 py-0.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={row.overtimeHours || ''}
                      onChange={(e) => handleNumChange(idx, 'overtimeHours', e.target.value)}
                      className="w-10 text-center font-mono font-bold text-slate-800 bg-transparent outline-none text-xs"
                    />
                    <span className="text-[9px] font-bold text-amber-600 select-none ml-0.5">h</span>
                  </div>
                </td>

                {/* Horas Extras: Valor Señalizado */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/30">
                    <span className="text-[10px] font-bold text-amber-600 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.overtimeAmount || ''}
                      onChange={(e) => handleNumChange(idx, 'overtimeAmount', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-slate-900 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Feriados: Cantidad */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-center rounded-md bg-white border border-slate-200 px-1 py-0.5">
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={row.holidaysCount || ''}
                      onChange={(e) => handleNumChange(idx, 'holidaysCount', e.target.value)}
                      className="w-8 text-center font-mono font-bold text-slate-800 bg-transparent outline-none text-xs"
                    />
                    <span className="text-[9px] font-bold text-blue-600 select-none ml-0.5">d</span>
                  </div>
                </td>

                {/* Feriados: Valor Señalizado */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30">
                    <span className="text-[10px] font-bold text-blue-600 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.holidaysAmount || ''}
                      onChange={(e) => handleNumChange(idx, 'holidaysAmount', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-slate-900 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Bonificación Señalizada */}
                <td className="p-1 border-r border-slate-100">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500/30">
                    <span className="text-[10px] font-bold text-slate-400 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.bonuses || ''}
                      onChange={(e) => handleNumChange(idx, 'bonuses', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-slate-900 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Deducción: Préstamo Señalizada en Rojo */}
                <td className="p-1 border-r border-slate-100 bg-rose-50/20">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30">
                    <span className="text-[10px] font-bold text-rose-500 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.loanDeduction || ''}
                      onChange={(e) => handleNumChange(idx, 'loanDeduction', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-rose-700 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Deducción: Servicio Restaurante */}
                <td className="p-1 border-r border-slate-100 bg-rose-50/20">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30">
                    <span className="text-[10px] font-bold text-rose-500 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.restaurantServiceDeduction || ''}
                      onChange={(e) => handleNumChange(idx, 'restaurantServiceDeduction', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-rose-700 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* Deducción: Vajilla / Otros */}
                <td className="p-1 border-r border-slate-100 bg-rose-50/20">
                  <div className="flex items-center justify-end rounded-md bg-white border border-slate-200 px-1.5 py-0.5 focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500/30">
                    <span className="text-[10px] font-bold text-rose-500 select-none mr-1">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={row.breakageDeduction || ''}
                      onChange={(e) => handleNumChange(idx, 'breakageDeduction', e.target.value)}
                      className="w-16 text-right font-mono font-bold text-rose-700 bg-transparent outline-none text-xs"
                    />
                  </div>
                </td>

                {/* TOTAL PAGADO (Calculado Automático y Señalizado) */}
                <td className="p-1.5 text-right border-r border-slate-100 font-mono font-black text-slate-900 bg-slate-50 text-[12px] whitespace-nowrap">
                  <span className="text-[10px] text-slate-400 font-bold mr-1">C$</span>
                  {row.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Nota / Detalle de deducción */}
                <td className="p-1 border-r border-slate-100">
                  <input
                    type="text"
                    placeholder="Ej: Plato roto, cuota préstamo..."
                    value={row.breakageNotes || ''}
                    onChange={(e) => handleTextChange(idx, 'breakageNotes', e.target.value)}
                    className="w-full text-xs text-slate-600 placeholder:text-slate-300 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-500 focus:bg-white rounded px-2 py-1 outline-none transition"
                  />
                </td>

                {/* Eliminar Colaborador */}
                {onDeleteRow && (
                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(idx)}
                      className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Quitar de esta quincena"
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
              <td colSpan={3} className="p-2.5 text-center uppercase tracking-wider">Totales Generales</td>
              <td className="p-2.5 text-right font-mono text-emerald-300">C$ {totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td className="p-2.5 text-center font-mono">{totalHEHours ? `${totalHEHours.toFixed(1)}h` : '-'}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHEAmount.toFixed(2)}</td>
              <td className="p-2.5 text-center font-mono">{totalHolidaysCount ? `${totalHolidaysCount}d` : '-'}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalHolidaysAmount.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono">C$ {totalBonuses.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">- C$ {totalLoans.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">- C$ {totalRest.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-rose-300">- C$ {totalBreakage.toFixed(2)}</td>
              <td className="p-2.5 text-right font-mono text-emerald-400 text-sm">
                C$ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td colSpan={onDeleteRow ? 2 : 1} className="p-2.5 text-slate-400 text-[10px] italic">
                {rows.length} colaboradores incluidos • Autoriza: {authorizedBy}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
